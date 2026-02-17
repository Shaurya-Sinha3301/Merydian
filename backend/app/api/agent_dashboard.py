from typing import Any, List
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_agent
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
    tools_agent_triggered: bool = Field(..., description="Whether Tools Agent was triggered")
    communication_agent_triggered: bool = Field(..., description="Whether Communication Agent was triggered")


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
    current_agent: TokenPayload = Depends(get_current_agent)
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

        # 1b. If this is a base itinerary approval, publish to customer tables
        option_details = approved_option.details or {}
        if option_details.get("type") == "base_itinerary":
            try:
                from app.services.itinerary_service import ItineraryService
                family_ids = option_details.get("family_ids", [])
                itinerary_data = option_details.get("itinerary", {})

                ItineraryService.publish_base_itinerary(
                    trip_id=approved_option.trip_id,
                    family_ids=family_ids,
                    itinerary_data=itinerary_data,
                    created_reason=f"Base itinerary approved by agent (option {approve_request.option_id})",
                )
                logger.info(
                    f"Published base itinerary for trip {approved_option.trip_id}"
                )
            except Exception as e:
                logger.error(
                    f"Failed to publish base itinerary (non-blocking): {e}",
                    exc_info=True,
                )

        # 2. Trigger downstream agents (fire-and-forget, failures logged)
        tools_triggered = False
        comm_triggered = False

        try:
            from app.services.agent_service import AgentService
            tools_triggered = AgentService.trigger_tools_agent(
                option_id=str(approved_option.id),
                event_id=approved_option.event_id,
                trip_id=approved_option.trip_id,
                details=approved_option.details,
            )
        except Exception as e:
            logger.warning(f"Tools Agent trigger failed (non-blocking): {e}")

        try:
            from app.services.agent_service import AgentService
            comm_triggered = AgentService.trigger_communication_agent(
                option_id=str(approved_option.id),
                event_id=approved_option.event_id,
                trip_id=approved_option.trip_id,
                agent_id=str(agent_uuid) if agent_uuid else None,
            )
        except Exception as e:
            logger.warning(f"Communication Agent trigger failed (non-blocking): {e}")

        return ApproveResponse(
            message=f"Option '{approve_request.option_id}' approved successfully.",
            option_id=approve_request.option_id,
            tools_agent_triggered=tools_triggered,
            communication_agent_triggered=comm_triggered,
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