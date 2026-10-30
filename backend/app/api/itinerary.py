import logging
from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum
import uuid as uuid_lib
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from pydantic import BaseModel, Field
from app.core.dependencies import get_current_user, get_optional_user, get_agent_workflow_service, verify_trip_access
from app.schemas.auth import TokenPayload
from app.schemas.events import EventCreate, EventType, EventResponse
from app.schemas.frontend_dto import TimelineDTO, TimelineDayDTO, TimelineActivityDTO, DiffDTO, DiffItemDTO, ExplanationDTO
from app.services.itinerary_service import ItineraryService
from app.services.event_service import EventService
from app.services.preference_service import PreferenceService
from app.services.explanation_service import ExplanationService
from app.models.preference import PreferenceType
from app.models.event import EventType as ModelEventType

logger = logging.getLogger(__name__)

router = APIRouter()


class UrgencyLevel(str, Enum):
    SOFT = "soft"
    MEDIUM = "medium"
    HIGH = "high"


class POIRequest(BaseModel):
    poi_name: str = Field(..., description="Name of the Point of Interest")
    urgency: UrgencyLevel = Field(default=UrgencyLevel.MEDIUM, description="Urgency level of the request")
    note: Optional[str] = Field(default=None, max_length=200, description="Why they want it")


class POIRequestResponse(BaseModel):
    message: str
    request_id: str
    event_created: Optional[EventResponse] = None


class FeedbackRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: str = Field(..., description="Feedback comment")
    node_id: str = Field(..., description="ID of the POI or itinerary node")


class FeedbackResponse(BaseModel):
    message: str
    event_created: EventResponse

from app.core.redis import get_redis
import json

@router.get("/current", response_model=Dict[str, Any])
async def get_current_itinerary(
    current_user: TokenPayload = Depends(get_current_user)
) -> Any:
    """
    Get the current active itinerary for the authenticated user's family.
    """
    try:
        # Get family ID from token
        if not current_user.family_id:
            raise HTTPException(
                status_code=400,
                detail="User is not associated with a family"
            )
        
        family_id = uuid_lib.UUID(current_user.family_id)
        
        # Check Cache
        redis = await get_redis()
        cache_key = f"itinerary:current:{family_id}"
        cached_data = await redis.get(cache_key)
        
        if cached_data:
            try:
                return json.loads(cached_data)
            except:
                pass # Fallback to DB if cache corrupted

        # Get current itinerary from database
        itinerary_data = ItineraryService.get_current_itinerary(family_id)
        
        if not itinerary_data:
            logger.info(f"No active itinerary found for {family_id}. Returning empty state.")
            
            return {
                "status": "NO_ACTIVE_ITINERARY",
                "trip_id": None, # We don't have trip_id in this context natively unless we look it up from the family, but the spec says "trip_id": "...", let's try to get it if we can, else null.
                "current_itinerary": None,
                "message": "No itinerary has been generated yet."
            }
        
        # Set Cache (expire in 60 seconds)
        try:
            await redis.setex(cache_key, 60, json.dumps(itinerary_data, default=str))
        except Exception as e:
            logger.error(f"Failed to cache itinerary: {e}")

        return itinerary_data
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid family ID: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve itinerary: {str(e)}"
        )


@router.get(
    "/diff",
    response_model=DiffDTO,
    summary="Get itinerary diff",
    description="Get a categorized diff between two itinerary versions for UI presentation.",
    responses={
        200: {"description": "Diff retrieved successfully"},
        404: {"description": "Itinerary versions not found"}
    }
)
async def get_itinerary_diff(
    version_a: int,
    version_b: int,
    family_id: Optional[UUID] = Query(default=None, description="Agents only: family to diff"),
    current_user: TokenPayload = Depends(get_current_user),
) -> Any:
    """
    Get a structured diff between two itinerary versions.
    """
    if current_user.role == "agent" and family_id:
        pass  # agents have global access
    elif current_user.family_id:
        family_id = uuid_lib.UUID(current_user.family_id)
    else:
        raise HTTPException(status_code=400, detail="User is not associated with a family")
    diff_raw = ItineraryService.diff_itineraries(family_id, version_a, version_b)
    if diff_raw is None:
        raise HTTPException(
            status_code=404,
            detail=f"One or both itinerary versions not found (v{version_a}, v{version_b})",
        )
    
    # Transform raw diff into DiffDTO
    added = []
    removed = []
    modified = []
    
    # diff_itineraries returns a plain dict of day changes
    for dc in diff_raw.get("day_changes", []):
        for pc in dc.get("poi_changes", []):
            change_type = pc.get("change_type")
            item = DiffItemDTO(
                before=pc.get("old_values") or None,
                after=pc.get("new_values") or None,
                reason=f"{change_type} {pc.get('poi_name', '')} (day {pc.get('day', dc.get('day'))})",
                importance="medium"
            )
            if change_type == "added":
                added.append(item)
            elif change_type == "removed":
                removed.append(item)
            else:
                modified.append(item)
    
    return DiffDTO(
        trip_id=str(family_id),
        version_a=version_a,
        version_b=version_b,
        added_activities=added,
        removed_activities=removed,
        moved_activities=[],
        time_changes=modified,
        hotel_changes=[],
        transport_changes=[],
        summary=diff_raw.get("summary"),
        cost_delta=(diff_raw.get("cost_diff") or {}).get("delta"),
        satisfaction_delta=(diff_raw.get("satisfaction_diff") or {}).get("delta"),
    )


@router.get(
    "/{trip_id}/timeline",
    response_model=TimelineDTO,
    summary="Get itinerary timeline",
    description="Get the current itinerary transformed into flat DTOs for the UI timeline."
)
async def get_itinerary_timeline(
    trip_id: str = Path(..., description="The ID of the trip"),
    _access: Any = Depends(verify_trip_access),
) -> Any:
    try:
        from app.services.optimizer_service import OptimizerService
        from app.models.itinerary import Itinerary
        from app.services.optimizer_service import get_db_session
        import json, os
        session = OptimizerService.get_trip_session(trip_id)
        if not session:
            raise HTTPException(status_code=404, detail="Trip not found")

        # The database copy is the source of truth; the optimizer's JSON file is a fallback
        data = None
        if session.current_itinerary_id:
            with get_db_session() as db:
                itin = db.get(Itinerary, session.current_itinerary_id)
                data = itin.data if itin else None
        if not data:
            itinerary_path = session.latest_itinerary_path or session.baseline_itinerary_path
            if itinerary_path and os.path.exists(itinerary_path):
                with open(itinerary_path, 'r') as f:
                    data = json.load(f)
        if not data:
            raise HTTPException(status_code=404, detail="Itinerary not generated yet")
        from app.services.itinerary_format import normalize_itinerary
        data = normalize_itinerary(data)

        days_dto = []
        for day in data.get("days", []):
            acts_dto = []
            for poi in day.get("pois", []):
                acts_dto.append(TimelineActivityDTO(
                    id=poi.get("location_id", "unknown"),
                    title=poi.get("name") or poi.get("location_id", "unknown").replace("_", " ").title(),
                    location=session.destination or "",
                    category=poi.get("category") or poi.get("role", "SKELETON"),
                    start_time=poi.get("time_window_start"),
                    end_time=poi.get("time_window_end"),
                    duration_min=poi.get("planned_visit_time_min", 60),
                    travel_time_min=0,
                    reason_added=poi.get("reason_added"),
                    notes=poi.get("comment")
                ))
            days_dto.append(TimelineDayDTO(day=day.get("day", 1), activities=acts_dto))

        return TimelineDTO(trip_id=trip_id, days=days_dto)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    feedback: FeedbackRequest,
    current_user: TokenPayload = Depends(get_current_user)
) -> Any:
    """
    Submit traveller feedback for a specific itinerary node.
    Creates an event for agentic processing.
    """
    try:
        # Get user and family context
        user_id = uuid_lib.UUID(current_user.sub) if current_user.sub else None
        family_id = uuid_lib.UUID(current_user.family_id) if current_user.family_id else None
        
        # Create feedback event with payload
        event_create = EventCreate(
            event_type=ModelEventType.FEEDBACK,
            entity_type="poi",
            entity_id=feedback.node_id,
            source="ui",
            payload={
                "rating": feedback.rating,
                "comment": feedback.comment,
                "node_id": feedback.node_id
            }
        )
        
        # Store event in database
        db_event = EventService.create_event(
            event_data=event_create,
            user_id=user_id,
            family_id=family_id
        )
        
        logger.info(f"Created feedback event: {db_event.id} for POI {feedback.node_id}")
        
        # Trigger agentic processing async
        from app.worker import process_event_task
        process_event_task.delay(str(db_event.id))
        
        # Determine feedback sentiment for response message
        if feedback.rating <= 2:
            message = "Thank you for your feedback. We're looking into this concern."
        elif feedback.rating == 3:
            message = "Thank you for your feedback. We'll work to improve your experience."
        else:
            message = "Thank you for your positive feedback!"
        
        return FeedbackResponse(
            message=message,
            event_created=EventResponse(event_id=db_event.id, status=db_event.status)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process feedback: {str(e)}"
        )


class AgentFeedbackRequest(BaseModel):
    """Request model for agent-based feedback processing"""
    message: str = Field(..., description="Natural language feedback message")


class AgentFeedbackResponse(BaseModel):
    """Response model for asynchronous agent-based feedback processing"""
    job_id: str
    status: str
    message: str


@router.post("/feedback/agent", response_model=AgentFeedbackResponse)
async def process_agent_feedback(
    feedback: AgentFeedbackRequest,
    current_user: Optional[TokenPayload] = Depends(get_optional_user),
    workflow_service: Any = Depends(get_agent_workflow_service)
) -> Any:
    """
    Process feedback through the agent pipeline.
    
    This endpoint uses the full agentic workflow:
    - FeedbackAgent parses natural language
    - DecisionPolicyAgent determines action
    - OptimizerAgent runs ML optimizer if needed
    - ExplainabilityAgent generates explanations
    
    Returns optimized itinerary + explanations + cost analysis.
    
    Note: Authentication is optional for testing. In production, this should require auth.
    """
    try:
        from app.services.trip_service import TripService
        
        # Use default test family if not authenticated
        if not current_user or not current_user.family_id:
            # Default test family for demo/testing
            family_id = "FAM_A"
            logger.info(f"Using default test family: {family_id}")
        else:
            family_id = current_user.family_id
        
        # Get active trip for this family (instead of requiring trip_id in request)
        trip_session = TripService.get_active_trip_for_family(family_id)
        
        if not trip_session:
            raise HTTPException(
                status_code=404,
                detail=f"No active trip found for family {family_id}. Please initialize a trip first."
            )
        
        trip_id = trip_session.trip_id
        
        logger.info(f"Processing: '{feedback.message}' for family {family_id}, trip {trip_id}")
        
        # Process through agent pipeline via Workflow Service
        # NOTE: This handles the full workflow: agents → optimizer → session update
        result = workflow_service.enqueue_feedback_optimization(
            trip_id=trip_id,
            family_id=str(family_id),
            message=feedback.message,
            agent_id=current_user.sub if current_user else None
        )
        
        logger.info("Queued feedback optimization job_id=%s status=%s", result.get("job_id"), result.get("status"))
        
        return AgentFeedbackResponse(
            job_id=result["job_id"],
            status=result["status"],
            message=result["message"]
        )
        
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Agent system not available: {str(e)}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Trip session error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error processing agent feedback: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process agent feedback: {str(e)}"
        )



@router.post("/poi-request", response_model=POIRequestResponse)
async def submit_poi_request(
    poi_request: POIRequest,
    current_user: TokenPayload = Depends(get_current_user)
) -> Any:
    """
    Ask for a specific place. The optimizer builds an "add it" option and a "keep the plan" option,
    and a travel agent accepts or declines. Nothing changes for the traveller until then.
    """
    from app.services.poi_proposal_service import find_place, propose_place
    from app.services.trip_service import TripService

    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User not associated with a family")
    family_id = uuid_lib.UUID(current_user.family_id)

    place = find_place(poi_request.poi_name)
    if not place:
        raise HTTPException(status_code=404, detail=f"We do not have '{poi_request.poi_name}' in our list of places")
    trip = TripService.get_active_trip_for_family(str(family_id))
    if not trip:
        raise HTTPException(status_code=404, detail="You do not have a trip to add this to yet")

    try:
        proposal = propose_place(trip.trip_id, family_id, place, note=poi_request.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"POI proposal failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="We could not prepare that request. Please try again.")

    return POIRequestResponse(
        message=f"Your request for {place['name']} is with your travel agent.",
        request_id=proposal["event_id"],
    )


# ---------------------------------------------------------------------------
#  Explainability endpoints
# ---------------------------------------------------------------------------

def _explanation_dto(rec) -> ExplanationDTO:
    return ExplanationDTO(
        id=str(rec.id),
        day=rec.day_number,
        activity_changed=rec.poi_name or rec.poi_id or "Unknown",
        reason=rec.change_type or "modified",
        affected_constraints=rec.causal_tags or [],
        confidence=1.0,
        human_explanation=rec.llm_explanation or "No explanation provided",
        change_type=rec.change_type,
        cost_delta=rec.cost_delta,
        satisfaction_delta=rec.satisfaction_delta,
        trigger_message=rec.trigger_message,
        itinerary_id=str(rec.itinerary_id),
    )


@router.get(
    "/explanations/{itinerary_id}",
    summary="Get LLM explanations for an itinerary version",
    description="Returns display-ready explanation payloads mapped to frontend DTOs.",
    tags=["Explanations"],
)
async def get_itinerary_explanations(
    itinerary_id: UUID,
    family_id: Optional[UUID] = Query(default=None, description="Filter by family UUID"),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Return all per-POI explanations stored for the given itinerary version.
    """
    try:
        records = ExplanationService.get_explanations(
            itinerary_id=itinerary_id,
            family_id=family_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    dto_list = []
    for rec in records:
        dto_list.append(_explanation_dto(rec))

    return {"itinerary_id": str(itinerary_id), "explanations": dto_list, "total": len(dto_list)}


@router.get(
    "/explanations/trip/{trip_id}",
    summary="Get all LLM explanations for a trip",
    description="Returns display-ready explanation payloads mapped to frontend DTOs.",
    tags=["Explanations"],
)
async def get_trip_explanations(
    trip_id: str,
    family_id: Optional[UUID] = Query(default=None, description="Filter by family UUID"),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Return all stored explanations for a trip across all itinerary versions.
    """
    try:
        records = ExplanationService.get_trip_explanations(
            trip_id=trip_id,
            family_id=family_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    dto_list = []
    for rec in records:
        dto_list.append(_explanation_dto(rec))

    return {
        "trip_id": trip_id,
        "explanations": dto_list,
        "total": len(records),
    }
