from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.core.dependencies import get_current_user
from app.schemas.auth import TokenPayload
from app.schemas.events import EventCreate, EventType, EventResponse
from app.services.itinerary_service import ItineraryService
from app.services.event_service import EventService
from app.services.preference_service import PreferenceService
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
        
        # Get current itinerary from database
        itinerary_data = ItineraryService.get_current_itinerary(family_id)
        
        if not itinerary_data:
            raise HTTPException(
                status_code=404,
                detail="No active itinerary found for this family"
            )
        
        return itinerary_data
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid family ID: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve itinerary: {str(e)}"
        )




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
        
        # TODO: Trigger agentic processing
        # from app.services.agent_service import AgentService
        # AgentService.process_feedback(db_event.id)
        
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
    current_user: Optional[TokenPayload] = Depends(lambda: None)  # Make auth optional for testing
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
        
        # TODO: Trigger agentic processing
        # from app.services.agent_service import AgentService
        # AgentService.process_poi_request(db_event.id)
        
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
