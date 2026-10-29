from typing import Any, List, Optional, Dict
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_agent, get_agent_workflow_service
from app.schemas.auth import TokenPayload
from app.services.itinerary_option_service import ItineraryOptionService
from app.models.itinerary_option import OptionStatus

import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# --------------- Schemas ---------------

class ItineraryOption(BaseModel):
    option_id: str = Field(..., description="Unique identifier for the option")
    summary: str = Field(..., description="Brief description of the option")
    cost: float = Field(..., description="Cost associated with this option")
    satisfaction: float = Field(..., ge=0.0, le=1.0, description="Predicted satisfaction score (0.0 to 1.0)")
    status: str = Field(default="PENDING", description="Current status of the option")
    details: dict = Field(default_factory=dict, description="Full option details (itinerary diff, POIs, etc.)")


class ItineraryOptionsResponse(BaseModel):
    options: List[ItineraryOption] = Field(..., description="List of available itinerary options")


class ApproveRequest(BaseModel):
    option_id: str = Field(..., description="ID of the option to approve")


class ApproveResponse(BaseModel):
    message: str = Field(..., description="Confirmation message")
    option_id: str = Field(..., description="Approved option ID")
    status: str = Field(default="QUEUED", description="Status of the dispatched background jobs")
    tools_job_id: Optional[str] = Field(default=None, description="Job ID for the Tools Agent")
    communication_job_id: Optional[str] = Field(default=None, description="Job ID for the Communication Agent")


class AgentJobStatusResponse(BaseModel):
    job_id: str
    status: str
    job_type: Optional[str] = None
    trip_id: Optional[str] = None
    itinerary_id: Optional[str] = None
    attempt_count: Optional[int] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class CustomerRegistrationRequest(BaseModel):
    email: str = Field(..., description="Email address for the family's primary contact")
    members: int = Field(default=1, description="Number of members in the family")
    children: int = Field(default=0, description="Number of children in the family")
    initial_location: str = Field(default="", description="Initial location of the family")


class CustomerRegistrationResponse(BaseModel):
    message: str = Field(..., description="Registration result message")
    family_code: str = Field(..., description="Auto-generated family code")
    user_id: str = Field(..., description="Created user ID")
    family_id: str = Field(..., description="Created family ID")


# --------------- Endpoints ---------------

@router.get("/itinerary/options", response_model=ItineraryOptionsResponse)
async def get_itinerary_options(
    event_id: str = Query(..., description="Event ID to get options for"),
    current_agent: TokenPayload = Depends(get_current_agent)
) -> Any:
    """
    Get itinerary options for a specific event (Human-in-the-loop).
    Queries the itinerary_options table for options related to this event.
    Only accessible by travel agents.
    """
    try:
        # Query DB for options assigned to this agent (or unassigned) for the event
        agent_uuid = UUID(current_agent.sub) if current_agent.sub else None

        options = ItineraryOptionService.get_options_for_event(
            event_id=event_id,
            agent_id=agent_uuid,
        )

        # Also include unassigned options (agent_id is NULL)
        if agent_uuid:
            unassigned = ItineraryOptionService.get_options_for_event(
                event_id=event_id,
                agent_id=None,
            )
            # Merge, deduplicate by id
            seen_ids = {o.id for o in options}
            for opt in unassigned:
                if opt.id not in seen_ids:
                    options.append(opt)

        if not options:
            raise HTTPException(
                status_code=404,
                detail=f"No itinerary options found for event '{event_id}'"
            )

        return ItineraryOptionsResponse(
            options=[
                ItineraryOption(
                    option_id=str(opt.id),
                    summary=opt.summary,
                    cost=opt.cost,
                    satisfaction=opt.satisfaction,
                    status=opt.status.value,
                    details=opt.details or {},
                )
                for opt in options
            ]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve itinerary options: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve itinerary options: {str(e)}"
        )


@router.post("/itinerary/approve", response_model=ApproveResponse)
async def approve_itinerary_option(
    approve_request: ApproveRequest,
    current_agent: TokenPayload = Depends(get_current_agent),
    workflow_service: Any = Depends(get_agent_workflow_service)
) -> Any:
    """
    Approve an itinerary option (Human-in-the-loop decision).
    Updates DB status and triggers Tools Agent + Communication Agent.
    Only accessible by travel agents.
    """
    try:
        agent_uuid = UUID(current_agent.sub) if current_agent.sub else None

        # 1. Approve in DB (also auto-rejects sibling options)
        option_uuid = UUID(approve_request.option_id)
        approved_option = ItineraryOptionService.approve_option(
            option_id=option_uuid,
            agent_id=agent_uuid,
        )

        # 1b. Publish itinerary to customer tables for any option type that
        #     carries itinerary data (base_itinerary OR re-optimization results).
        option_details = approved_option.details or {}
        itinerary_data = option_details.get("itinerary", {})
        option_type = option_details.get("type", "")

        if itinerary_data:
            try:
                from app.services.itinerary_service import ItineraryService
                family_ids = option_details.get("family_ids", [])

                reason_prefix = (
                    "Base itinerary approved by agent"
                    if option_type == "base_itinerary"
                    else "Re-optimized itinerary approved by agent"
                )

                ItineraryService.publish_base_itinerary(
                    trip_id=approved_option.trip_id,
                    family_ids=family_ids,
                    itinerary_data=itinerary_data,
                    created_reason=f"{reason_prefix} (option {approve_request.option_id})",
                )
                logger.info(
                    f"Published itinerary (type='{option_type}') for trip {approved_option.trip_id}"
                )
            except Exception as e:
                logger.error(
                    f"Failed to publish itinerary (non-blocking): {e}",
                    exc_info=True,
                )

        # 2. Trigger downstream agents via Workflow Service
        tools_job_id = None
        communication_job_id = None

        try:
            tools_job_id = workflow_service.enqueue_tools_agent(
                option_id=str(approved_option.id),
                event_id=approved_option.event_id,
                trip_id=approved_option.trip_id,
                details=approved_option.details,
            )
        except Exception as e:
            # The workflow service will have logged and saved the FAILED state.
            # We log locally just for the API boundary.
            logger.warning(f"Tools Agent workflow failed: {e}")

        try:
            communication_job_id = workflow_service.enqueue_communication_agent(
                option_id=str(approved_option.id),
                event_id=approved_option.event_id,
                trip_id=approved_option.trip_id,
                agent_id=str(agent_uuid) if agent_uuid else None,
            )
        except Exception as e:
            logger.warning(f"Communication Agent workflow failed: {e}")

        return ApproveResponse(
            message=f"Option '{approve_request.option_id}' approved successfully. Jobs queued.",
            option_id=approve_request.option_id,
            status="QUEUED",
            tools_job_id=str(tools_job_id) if tools_job_id else None,
            communication_job_id=str(communication_job_id) if communication_job_id else None,
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to approve option: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to approve option: {str(e)}"
        )


class AgentJobListResponse(BaseModel):
    jobs: List[AgentJobStatusResponse]

@router.get("/jobs", response_model=AgentJobListResponse)
async def list_agent_jobs(
    limit: int = 50,
    offset: int = 0,
    current_agent: TokenPayload = Depends(get_current_agent)
) -> Any:
    """
    List all agent jobs (for agent dashboard).
    """
    try:
        from sqlmodel import Session, select
        from app.core.db import engine
        from app.models.agent_job import AgentJob
        
        with Session(engine) as session:
            stmt = select(AgentJob).order_by(AgentJob.created_at.desc()).offset(offset).limit(limit)
            jobs = session.exec(stmt).all()
            
            return AgentJobListResponse(
                jobs=[
                    AgentJobStatusResponse(
                        job_id=str(j.id),
                        status=j.status.value,
                        job_type=j.job_type.value,
                        trip_id=j.trip_id,
                        itinerary_id=j.itinerary_id,
                        attempt_count=j.attempt_count,
                        result=j.result_payload,
                        error=j.error_message,
                        created_at=j.created_at,
                        updated_at=j.updated_at,
                        started_at=j.started_at,
                        completed_at=j.completed_at
                    ) for j in jobs
                ]
            )
    except Exception as e:
        logger.error(f"Failed to list jobs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list jobs: {str(e)}")


@router.get("/jobs/{job_id}", response_model=AgentJobStatusResponse)
async def get_agent_job_status(
    job_id: str,
    current_agent: TokenPayload = Depends(get_current_agent)
) -> Any:
    """
    Get the status and result of an asynchronous agent job.
    """
    try:
        from app.services.agent_job_service import AgentJobService
        job_uuid = UUID(job_id)
        job = AgentJobService.get_job(job_uuid)
        
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
            
        return AgentJobStatusResponse(
            job_id=str(job.id),
            status=job.status.value,
            job_type=job.job_type.value,
            trip_id=job.trip_id,
            itinerary_id=job.itinerary_id,
            attempt_count=job.attempt_count,
            result=job.result_payload,
            error=job.error_message,
            created_at=job.created_at,
            updated_at=job.updated_at,
            started_at=job.started_at,
            completed_at=job.completed_at
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve job status: {str(e)}"
        )

@router.post("/customers", response_model=CustomerRegistrationResponse)
async def register_customer(
    request: CustomerRegistrationRequest,
    current_agent: TokenPayload = Depends(get_current_agent)
) -> Any:
    """
    Register a new customer (Traveller) and automatically create their family profile.
    Only accessible by travel agents.
    """
    try:
        from app.services.user_service import UserService
        
        # Check if user already exists
        existing_user = UserService.get_user_by_email(request.email)
        if existing_user:
            # If user exists, just return their underlying family code
            if not existing_user.family_id:
                raise HTTPException(status_code=400, detail="User exists but has no family associated.")
            
            from app.services.family_service import FamilyService
            fam = FamilyService.get_family(existing_user.family_id)
            if not fam:
                raise HTTPException(status_code=404, detail="Family not found for existing user")
                
            return CustomerRegistrationResponse(
                message="User already registered",
                family_code=fam.family_code,
                user_id=str(existing_user.id),
                family_id=str(fam.id)
            )

        import secrets
        # Secure default password for auto-generated customers
        default_password = secrets.token_urlsafe(16)
        
        # Create user (this auto-creates the Family because role = "traveller")
        new_user = UserService.create_user(
            email=request.email,
            password=default_password,
            role="traveller",
            full_name=request.email.split("@")[0]  # simple default name
        )
        
        from app.services.family_service import FamilyService
        fam = FamilyService.get_family(new_user.family_id)
        
        # We optionally save extra info (like family members) into preferences
        if fam:
            prefs = fam.preferences or {}
            prefs["members"] = request.members
            prefs["children"] = request.children
            if request.initial_location:
                prefs["initial_location"] = request.initial_location
            FamilyService.update_preferences(fam.id, prefs)

        return CustomerRegistrationResponse(
            message="Customer registered successfully",
            family_code=fam.family_code,
            user_id=str(new_user.id),
            family_id=str(fam.id)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to register customer: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to register customer: {str(e)}"
        )