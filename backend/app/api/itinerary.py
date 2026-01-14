from typing import Any, Dict, List
from datetime import datetime
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.core.dependencies import get_current_user
from app.schemas.auth import TokenPayload
from app.schemas.events import EventCreate, EventType, EventResponse

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
    Get the current active itinerary for the authenticated user.
    """
    
    # ---------------------------------------------------------
    # TODO: Database Implementation
    # ---------------------------------------------------------
    # In the future, this should:
    # 1. Query the 'itineraries' table filtering by:
    #    - status='live'
    #    - User relevance (e.g., if user is a traveller, check if they belong to a family in the itinerary)
    #    - If user is an agent, check if they are assigned to this itinerary
    #
    # Example DB Call:
    # stmt = select(Itinerary).where(Itinerary.status == 'live', ...)
    # itinerary = session.exec(stmt).first()
    # ---------------------------------------------------------

    # Flow: Read DB -> No agent triggered
    
    # Mock Response
    return {
        "itinerary_id": "it_001",
        "status": "live",
        "subgroups": [
            {
                "subgroup_id": "sg_1",
                "families": ["A", "B"],
                "timeline": [
                    {
                        "id": "event_1",
                        "type": "FLIGHT",
                        "time": "2024-05-20T10:00:00Z",
                        "description": "Flight to Paris"
                    },
                    {
                        "id": "event_2",
                        "type": "HOTEL_CHECKIN",
                        "time": "2024-05-20T14:00:00Z",
                        "description": "Check-in at Hotel Ritz"
                    }
                ]
            }
        ]
    }


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    feedback: FeedbackRequest,
    current_user: TokenPayload = Depends(get_current_user)
) -> Any:
    """
    Submit traveller feedback for a specific itinerary node.
    Converts feedback into an internal EVENT for processing.
    """
    
    # ---------------------------------------------------------
    # TODO: Database Implementation
    # ---------------------------------------------------------
    # In the future, this should:
    # 1. Validate that the node_id exists in the current itinerary
    # 2. Store the feedback in a 'feedback' table
    # 3. Create an event record in the 'events' table
    # 4. Trigger any necessary agent workflows based on feedback severity
    # ---------------------------------------------------------
    
    try:
        # Convert feedback to event
        event_create = EventCreate(
            event_type=EventType.FEEDBACK,
            entity_id=feedback.node_id,
            reported_by=f"traveller_{current_user.sub}"
        )
        
        # ---------------------------------------------------------
        # TODO: Event Service Integration
        # ---------------------------------------------------------
        # This should call an event service to:
        # 1. Create the event record
        # 2. Queue it for processing
        # 3. Return the event ID and status
        # 
        # Example:
        # event_service = EventService()
        # event_response = await event_service.create_event(event_create)
        # ---------------------------------------------------------
        
        # Mock event creation response
        event_response = EventResponse(
            event_id=f"evt_{feedback.node_id}_{int(datetime.utcnow().timestamp())}",
            status="queued"
        )
        
        # Determine feedback sentiment for response message
        if feedback.rating <= 2:
            message = "Thank you for your feedback. We're looking into this concern."
        elif feedback.rating == 3:
            message = "Thank you for your feedback. We'll work to improve your experience."
        else:
            message = "Thank you for your positive feedback!"
        
        return FeedbackResponse(
            message=message,
            event_created=event_response
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process feedback: {str(e)}"
        )


@router.post("/poi-request", response_model=POIRequestResponse)
async def submit_poi_request(
    poi_request: POIRequest,
    current_user: TokenPayload = Depends(get_current_user)
) -> Any:
    """
    Submit a POI (Point of Interest) request during mid-trip.
    Stores the request, broadcasts to other families, and triggers Decision Agent.
    """
    
    # ---------------------------------------------------------
    # TODO: Database Implementation
    # ---------------------------------------------------------
    # In the future, this should:
    # 1. Store the POI request in a 'poi_requests' table
    # 2. Broadcast the request to other families in the same itinerary
    # 3. Create an event record to trigger the Decision Agent
    # 4. Return the request ID for tracking
    # ---------------------------------------------------------
    
    try:
        # Generate unique request ID
        request_id = f"poi_req_{current_user.family_id}_{int(datetime.utcnow().timestamp())}"
        
        # Create event for Decision Agent processing
        event_create = EventCreate(
            event_type=EventType.POI_REQUEST,
            entity_id=request_id,
            reported_by=f"family_{current_user.family_id}"
        )
        
        # ---------------------------------------------------------
        # TODO: Service Integration
        # ---------------------------------------------------------
        # This should:
        # 1. Store POI request in database
        # 2. Broadcast to other families via WebSocket/notification service
        # 3. Queue event for Decision Agent processing
        # 4. Return proper response with tracking info
        # 
        # Example:
        # poi_service = POIRequestService()
        # await poi_service.store_request(request_id, poi_request, current_user.family_id)
        # await poi_service.broadcast_to_families(request_id, poi_request)
        # event_response = await event_service.create_event(event_create)
        # ---------------------------------------------------------
        
        # Mock event creation response
        event_response = EventResponse(
            event_id=f"evt_{request_id}",
            status="queued"
        )
        
        # Determine response message based on urgency
        if poi_request.urgency == UrgencyLevel.HIGH:
            message = f"High priority POI request for '{poi_request.poi_name}' submitted. Other families will be notified immediately."
        elif poi_request.urgency == UrgencyLevel.MEDIUM:
            message = f"POI request for '{poi_request.poi_name}' submitted. Checking with other families."
        else:  # SOFT
            message = f"POI suggestion for '{poi_request.poi_name}' submitted. Will coordinate with other families when convenient."
        
        return POIRequestResponse(
            message=message,
            request_id=request_id,
            event_created=event_response
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process POI request: {str(e)}"
        )
