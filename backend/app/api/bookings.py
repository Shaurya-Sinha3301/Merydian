from typing import Any, List
from enum import Enum
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_agent
from app.schemas.auth import TokenPayload

router = APIRouter()


class BookingItem(str, Enum):
    FLIGHT = "flight"
    BUS = "bus"
    TRAIN = "train"
    HOTEL = "hotel"
    RESTAURANT = "restaurant"
    ACTIVITY = "activity"
    TRANSFER = "transfer"


class BookingStatus(str, Enum):
    BOOKING_IN_PROGRESS = "booking_in_progress"
    COMPLETED = "completed"
    PARTIAL_FAILURE = "partial_failure"
    FAILED = "failed"


class BookingExecuteRequest(BaseModel):
    itinerary_id: str = Field(..., description="ID of the itinerary to book")
    items: List[BookingItem] = Field(..., description="List of items to book")


class BookingExecuteResponse(BaseModel):
    status: BookingStatus = Field(..., description="Current booking status")
    job_id: str = Field(..., description="Async job ID for tracking")
    message: str = Field(..., description="Status message")


@router.post("/execute", response_model=BookingExecuteResponse)
async def execute_booking(
    booking_request: BookingExecuteRequest,
    current_agent: TokenPayload = Depends(get_current_agent)
) -> Any:
    """
    Execute bookings for an itinerary.
    Triggers async job to call external APIs for actual bookings.
    Used by Agent UI and Tools Agent.
    """
    
    # ---------------------------------------------------------
    # TODO: Database Implementation
    # ---------------------------------------------------------
    # In the future, this should:
    # 1. Validate itinerary_id exists and agent has permission
    # 2. Create booking job record in 'booking_jobs' table
    # 3. Queue async job for external API calls
    # 4. Return job ID for status tracking
    #
    # Example:
    # job = BookingJob(
    #     itinerary_id=booking_request.itinerary_id,
    #     items=booking_request.items,
    #     agent_id=current_agent.sub,
    #     status=BookingStatus.BOOKING_IN_PROGRESS
    # )
    # session.add(job)
    # session.commit()
    # ---------------------------------------------------------
    
    try:
        # Generate job ID
        job_id = f"job_{booking_request.itinerary_id}_{int(datetime.utcnow().timestamp())}"
        
        # ---------------------------------------------------------
        # TODO: Async Job Integration
        # ---------------------------------------------------------
        # This should:
        # 1. Queue booking job to background worker (Celery/RQ/etc.)
        # 2. Worker calls external APIs (flight, hotel, restaurant APIs)
        # 3. Update booking status as each item completes
        # 4. Notify agent via WebSocket when complete
        # 
        # Example:
        # booking_task.delay(job_id, booking_request.itinerary_id, booking_request.items)
        # ---------------------------------------------------------
        
        items_str = ", ".join([item.value for item in booking_request.items])
        
        return BookingExecuteResponse(
            status=BookingStatus.BOOKING_IN_PROGRESS,
            job_id=job_id,
            message=f"Booking started for {len(booking_request.items)} items: {items_str}"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initiate booking: {str(e)}"
        )
