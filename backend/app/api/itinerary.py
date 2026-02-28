from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum
import uuid as uuid_lib
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from app.core.dependencies import get_current_user, get_optional_user
from app.schemas.auth import TokenPayload
from app.schemas.events import EventCreate, EventType, EventResponse
from app.services.itinerary_service import ItineraryService
from app.services.event_service import EventService
from app.services.preference_service import PreferenceService
from app.services.explanation_service import ExplanationService
from app.models.preference import PreferenceType
from app.models.event import EventType as ModelEventType

router = APIRouter()


class UrgencyLevel(str, Enum):
    SOFT = "soft"
    MEDIUM = "medium"
    HIGH = "high"


class POIRequest(BaseModel):
    poi_name: str = Field(..., description="Name of the Point of Interest")
    urgency: UrgencyLevel = Field(..., description="Urgency level of the request")


class POIRequestResponse(BaseModel):
    message: str
    request_id: str
    event_created: EventResponse


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
            print(f"[Itinerary API] No active itinerary found for {family_id}. Returning Delhi fallback.")
            
            # Base Delhi itinerary fallback
            itinerary_data = {
                "id": str(uuid_lib.uuid4()),
                "trip_id": str(uuid_lib.uuid4()),
                "family_id": str(family_id),
                "destination": "Delhi, India",
                "start_date": "2026-03-15",
                "end_date": "2026-03-18",
                "status": "draft",
                "version": 1,
                "days": [
                    {
                        "day_number": 1,
                        "date": "2026-03-15",
                        "total_day_cost": 50.0,
                        "activities": [
                            {
                                "poi_id": "POI_RED_FORT",
                                "time": "09:00",
                                "title": "Red Fort",
                                "location": "Netaji Subhash Marg, Chandni Chowk, New Delhi",
                                "description": "Historic fort complex built by Mughal Emperor Shah Jahan.",
                                "duration": 120,
                                "cost": 10.0,
                                "image": "https://images.unsplash.com/photo-1587474260584-136574528ed5",
                                "alt": "Red Fort, Delhi",
                                "is_must_visit": True,
                                "travel_time": "30 mins",
                                "highlights": ["Mughal Architecture", "History", "Photography"]
                            },
                            {
                                "poi_id": "POI_JAMA_MASJID",
                                "time": "11:30",
                                "title": "Jama Masjid",
                                "location": "Jama Masjid Rd, Jama Masjid, Chandni Chowk, New Delhi",
                                "description": "One of the largest mosques in India.",
                                "duration": 60,
                                "cost": 0.0,
                                "image": "https://images.unsplash.com/photo-1701336049285-d867c29beaba",
                                "alt": "Jama Masjid, Delhi",
                                "is_must_visit": False,
                                "travel_time": "15 mins",
                                "highlights": ["Islamic Architecture", "Culture"]
                            }
                        ]
                    },
                    {
                        "day_number": 2,
                        "date": "2026-03-16",
                        "total_day_cost": 80.0,
                        "activities": [
                            {
                                "poi_id": "POI_QUTUB_MINAR",
                                "time": "10:00",
                                "title": "Qutub Minar",
                                "location": "Seth Sarai, Mehrauli, New Delhi",
                                "description": "UNESCO World Heritage Site and the tallest brick minaret in the world.",
                                "duration": 90,
                                "cost": 15.0,
                                "image": "https://images.unsplash.com/photo-1563851508210-b9cc65882cd8",
                                "alt": "Qutub Minar, Delhi",
                                "is_must_visit": True,
                                "travel_time": "45 mins",
                                "highlights": ["Ancient Architecture", "History"]
                            },
                             {
                                "poi_id": "POI_LOTUS_TEMPLE",
                                "time": "14:00",
                                "title": "Lotus Temple",
                                "location": "Lotus Temple Rd, Bahapur, Shambhu Dayal Bagh, Kalkaji, New Delhi",
                                "description": "Bahá'í House of Worship notable for its flowerlike shape.",
                                "duration": 60,
                                "cost": 0.0,
                                "image": "https://images.unsplash.com/photo-1598324789736-4861f89564a9",
                                "alt": "Lotus Temple, Delhi",
                                "is_must_visit": False,
                                "travel_time": "30 mins",
                                "highlights": ["Modern Architecture", "Peaceful"]
                            }
                        ]
                    },
                    {
                        "day_number": 3,
                        "date": "2026-03-17",
                        "total_day_cost": 30.0,
                        "activities": [
                           {
                                "poi_id": "POI_INDIA_GATE",
                                "time": "17:00",
                                "title": "India Gate & Rajpath",
                                "location": "Kartavya Path, India Gate, New Delhi",
                                "description": "War memorial located astride the Rajpath.",
                                "duration": 90,
                                "cost": 0.0,
                                "image": "https://images.unsplash.com/photo-1585084335487-f653d0859c14",
                                "alt": "India Gate, Delhi",
                                "is_must_visit": True,
                                "travel_time": "20 mins",
                                "highlights": ["Monument", "Evening Walk", "Photography"]
                            }
                        ]
                    }
                ]
            }
        
        # Set Cache (expire in 60 seconds)
        try:
            await redis.setex(cache_key, 60, json.dumps(itinerary_data, default=str))
        except Exception as e:
            print(f"Failed to cache itinerary: {e}")

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


@router.get("/diff")
async def get_itinerary_diff(
    version_a: int,
    version_b: int,
    current_user: TokenPayload = Depends(get_current_user),
) -> Any:
    """
    Get a structured diff between two itinerary versions.

    Compares POIs, costs, and satisfaction scores between versions.
    """
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User is not associated with a family")

    family_id = uuid_lib.UUID(current_user.family_id)
    diff = ItineraryService.diff_itineraries(family_id, version_a, version_b)
    if diff is None:
        raise HTTPException(
            status_code=404,
            detail=f"One or both itinerary versions not found (v{version_a}, v{version_b})",
        )
    return diff




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
        
        print(f"[Itinerary API] Created feedback event: {db_event.id} for POI {feedback.node_id}")
        
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
    """Response model for agent-based feedback processing"""
    success: bool
    event_type: str
    action_taken: str
    explanations: List[str]
    itinerary_updated: bool
    iteration: int
    cost_analysis: Optional[Dict[str, Any]] = None


@router.post("/feedback/agent", response_model=AgentFeedbackResponse)
async def process_agent_feedback(
    feedback: AgentFeedbackRequest,
    current_user: Optional[TokenPayload] = Depends(get_optional_user)
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
        from app.services.optimizer_service import OptimizerService
        from app.services.trip_service import TripService
        
        # Use default test family if not authenticated
        if not current_user or not current_user.family_id:
            # Default test family for demo/testing
            family_id = "FAM_A"
            print(f"[Agent Feedback API] Using default test family: {family_id}")
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
        
        print(f"[Agent Feedback API] Processing: '{feedback.message}' for family {family_id}, trip {trip_id}")
        
        # Process through agent pipeline
        # NOTE: This handles the full workflow: agents → optimizer → session update
        result = OptimizerService.process_feedback_with_agents(
            trip_id=trip_id,
            family_id=family_id,
            message=feedback.message
        )
        
        # Session update is already handled inside process_feedback_with_agents
        # No need to modify trip_session here (would cause detached instance error)
        
        print(f"[Agent Feedback API] Result: {result['action_taken']}, Updated: {result['itinerary_updated']}")
        
        return AgentFeedbackResponse(
            success=result["success"],
            event_type=result["event_type"],
            action_taken=result["action_taken"],
            explanations=result["explanations"],
            itinerary_updated=result["itinerary_updated"],
            iteration=result["iteration"],
            cost_analysis=result.get("cost_analysis")
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
        print(f"[Agent Feedback API] Error: {str(e)}")
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
    Submit a POI (Point of Interest) request.
    Creates event and adds preference for agentic processing.
    """
    try:
        # Get user and family context
        user_id = uuid_lib.UUID(current_user.sub) if current_user.sub else None
        family_id = uuid_lib.UUID(current_user.family_id) if current_user.family_id else None
        
        if not family_id:
            raise HTTPException(status_code=400, detail="User not associated with a family")
        
        # Generate request ID
        request_id = f"poi_req_{family_id}_{int(datetime.utcnow().timestamp())}"
        
        # Create POI request event
        event_create = EventCreate(
            event_type=ModelEventType.POI_REQUEST,
            entity_type="poi",
            entity_id=request_id,
            source="ui",
            payload={
                "poi_name": poi_request.poi_name,
                "urgency": poi_request.urgency.value,
                "request_id": request_id
            }
        )
        
        # Store event
        db_event = EventService.create_event(
            event_data=event_create,
            user_id=user_id,
            family_id=family_id
        )
        
        # Add preference based on urgency
        # High urgency = MUST_VISIT, else PREFER_VISIT
        pref_type = PreferenceType.MUST_VISIT if poi_request.urgency == UrgencyLevel.HIGH else PreferenceType.PREFER_VISIT
        strength = 1.0 if poi_request.urgency == UrgencyLevel.HIGH else 0.8
        
        PreferenceService.add_preference(
            family_id=family_id,
            poi_id=f"POI_{poi_request.poi_name.upper().replace(' ', '_')}",
            poi_name=poi_request.poi_name,
            preference_type=pref_type,
            strength=strength,
            reason=f"User requested via POI request (urgency: {poi_request.urgency.value})",
            created_by=str(user_id) if user_id else "system",
            event_id=db_event.id
        )
        
        print(f"[Itinerary API] Created POI request: {request_id} for {poi_request.poi_name}")
        
        # Trigger agentic processing async
        from app.worker import process_event_task
        process_event_task.delay(str(db_event.id))
        
        # Response message based on urgency
        if poi_request.urgency == UrgencyLevel.HIGH:
            message = f"High priority request for '{poi_request.poi_name}' submitted and added to must-visit list."
        elif poi_request.urgency == UrgencyLevel.MEDIUM:
            message = f"POI request for '{poi_request.poi_name}' submitted. Checking feasibility."
        else:
            message = f"POI suggestion for '{poi_request.poi_name}' noted for future planning."
        
        return POIRequestResponse(
            message=message,
            request_id=request_id,
            event_created=EventResponse(event_id=db_event.id, status=db_event.status)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process POI request: {str(e)}"
        )


# ---------------------------------------------------------------------------
#  Explainability endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/explanations/{itinerary_id}",
    summary="Get LLM explanations for an itinerary version",
    tags=["Explanations"],
)
async def get_itinerary_explanations(
    itinerary_id: UUID,
    family_id: Optional[UUID] = Query(default=None, description="Filter by family UUID"),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Return all per-POI explanations stored for the given itinerary version.
    Each entry describes why a POI was added, removed, or rerouted.

    Grouped output: {"by_day": {"1": [...], "2": [...]}, "total": N}
    """
    try:
        records = ExplanationService.get_explanations(
            itinerary_id=itinerary_id,
            family_id=family_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    by_day: Dict[str, List[Dict]] = {}
    for rec in records:
        day_key = str(rec.day_number)
        by_day.setdefault(day_key, []).append({
            "id": str(rec.id),
            "family_id": str(rec.family_id),
            "poi_id": rec.poi_id,
            "poi_name": rec.poi_name,
            "change_type": rec.change_type,
            "causal_tags": rec.causal_tags or [],
            "cost_delta": rec.cost_delta or {},
            "satisfaction_delta": rec.satisfaction_delta or {},
            "explanation": rec.llm_explanation,
            "trigger_message": rec.trigger_message,
            "created_at": rec.created_at.isoformat() if rec.created_at else None,
        })

    return {"itinerary_id": str(itinerary_id), "by_day": by_day, "total": len(records)}


@router.get(
    "/explanations/trip/{trip_id}",
    summary="Get all LLM explanations for a trip",
    tags=["Explanations"],
)
async def get_trip_explanations(
    trip_id: str,
    family_id: Optional[UUID] = Query(default=None, description="Filter by family UUID"),
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Return all stored explanations for a trip across all itinerary versions,
    ordered most-recent first.
    """
    try:
        records = ExplanationService.get_trip_explanations(
            trip_id=trip_id,
            family_id=family_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "trip_id": trip_id,
        "explanations": [
            {
                "id": str(rec.id),
                "itinerary_id": str(rec.itinerary_id),
                "prev_itinerary_id": str(rec.prev_itinerary_id) if rec.prev_itinerary_id else None,
                "family_id": str(rec.family_id),
                "day": rec.day_number,
                "poi_id": rec.poi_id,
                "poi_name": rec.poi_name,
                "change_type": rec.change_type,
                "causal_tags": rec.causal_tags or [],
                "cost_delta": rec.cost_delta or {},
                "satisfaction_delta": rec.satisfaction_delta or {},
                "explanation": rec.llm_explanation,
                "trigger_message": rec.trigger_message,
                "created_at": rec.created_at.isoformat() if rec.created_at else None,
            }
            for rec in records
        ],
        "total": len(records),
    }
