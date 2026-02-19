"""
Bookings API — Real-Time TBO Integration

Provides endpoints for:
- Executing bookings (async via Celery)
- Checking booking status (from DB)
- Searching hotels directly (sync via TBO API)

All mock code has been removed — this is fully production-ready.
"""

import logging
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from app.core.dependencies import get_current_agent
from app.schemas.auth import TokenPayload
from app.schemas.booking import (
    BookingExecuteRequest,
    BookingExecuteResponse,
    BookingJobStatusResponse,
    BookingStatusEnum,
    HotelBookingDetail,
    HotelSearchRequest,
    HotelSearchResponse,
    HotelResult,
)
from app.services.booking_service import BookingService
from app.services.tbo_service import TBOHotelClient
from app.models.booking_job import JobStatus

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/execute", response_model=BookingExecuteResponse)
async def execute_booking(
    request: BookingExecuteRequest,
    current_agent: TokenPayload = Depends(get_current_agent),
) -> Any:
    """
    Execute bookings for an itinerary.

    Creates a booking job in the database and dispatches
    a Celery task to process the booking asynchronously via TBO API.

    The agent will receive real-time WebSocket notifications as each
    booking step completes.
    """
    try:
        # 1. Create booking job in DB
        items_list = [item.value for item in request.items]
        job = BookingService.create_job(
            itinerary_id=request.itinerary_id,
            agent_id=current_agent.sub,
            items=items_list,
        )

        # 2. Prepare search params for the worker
        search_params = {
            "city_code": request.city_code,
            "checkin": request.checkin,
            "checkout": request.checkout,
            "rooms": request.rooms,
            "adults": request.adults,
            "children": request.children,
            "nationality": request.nationality,
            "guest_details": [g.model_dump() for g in request.guests] if request.guests else [],
        }

        # 3. Dispatch Celery task
        from app.worker import process_hotel_booking

        task = process_hotel_booking.delay(
            job_id=str(job.id),
            itinerary_id=request.itinerary_id,
            agent_id=current_agent.sub,
            items=items_list,
            search_params=search_params,
        )

        # 4. Store Celery task ID
        BookingService.update_job_status(
            job.id,
            JobStatus.PENDING,
            celery_task_id=task.id,
        )

        logger.info(
            "Booking job %s created → Celery task %s dispatched",
            job.id, task.id,
        )

        return BookingExecuteResponse(
            job_id=str(job.id),
            status=BookingStatusEnum.PENDING,
            message=f"Booking job created for {len(items_list)} items: {', '.join(items_list)}. "
                    f"Track via WebSocket or GET /bookings/status/{job.id}",
        )

    except Exception as e:
        logger.error("Failed to create booking job: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initiate booking: {str(e)}",
        )


@router.get("/status/{job_id}", response_model=BookingJobStatusResponse)
async def get_booking_status(
    job_id: str,
    current_agent: TokenPayload = Depends(get_current_agent),
) -> Any:
    """
    Get real-time status of a booking job.

    Returns the job details along with all associated hotel bookings
    and their current status.
    """
    # Fetch job from DB
    job = BookingService.get_job_by_id_str(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Booking job '{job_id}' not found")

    # Verify agent has access
    if job.agent_id != current_agent.sub:
        raise HTTPException(status_code=403, detail="Access denied to this booking job")

    # Fetch associated hotel bookings
    from uuid import UUID
    hotel_bookings = BookingService.get_hotel_bookings_for_job(UUID(job_id))

    hotel_details = [
        HotelBookingDetail(
            id=str(hb.id),
            hotel_code=hb.hotel_code,
            hotel_name=hb.hotel_name,
            room_name=hb.room_name,
            status=hb.status,
            checkin=str(hb.checkin) if hb.checkin else None,
            checkout=str(hb.checkout) if hb.checkout else None,
            total_fare=hb.total_fare,
            currency=hb.currency,
            confirmation_no=hb.confirmation_no,
            tbo_booking_id=hb.tbo_booking_id,
            error_message=hb.error_message,
            created_at=hb.created_at.isoformat() if hb.created_at else None,
        )
        for hb in hotel_bookings
    ]

    return BookingJobStatusResponse(
        job_id=str(job.id),
        itinerary_id=job.itinerary_id,
        agent_id=job.agent_id,
        status=job.status,
        items_requested=job.items_requested or [],
        items_completed=job.items_completed or {},
        error_message=job.error_message,
        hotel_bookings=hotel_details,
        created_at=job.created_at.isoformat(),
        updated_at=job.updated_at.isoformat(),
    )


@router.post("/hotels/search", response_model=HotelSearchResponse)
async def search_hotels(
    request: HotelSearchRequest,
    current_agent: TokenPayload = Depends(get_current_agent),
) -> Any:
    """
    Search hotels directly via TBO API (synchronous).

    Returns available hotels with room details and pricing.
    Use the returned TraceId and BookingCode to initiate a booking.
    """
    try:
        tbo = TBOHotelClient()

        # 1. Get hotel codes for the city
        hotels_list = tbo.get_hotel_codes(request.city_code)
        if not hotels_list:
            return HotelSearchResponse(
                status="no_hotels",
                hotels_found=0,
                results=[],
            )

        hotel_codes = [h["HotelCode"] for h in hotels_list[: request.max_hotels]]

        # 2. Search for availability
        search_data = tbo.search_hotels(
            hotel_codes=hotel_codes,
            checkin=request.checkin,
            checkout=request.checkout,
            rooms=request.rooms,
            adults=request.adults,
            children=request.children,
            children_ages=request.children_ages,
            nationality=request.nationality,
        )

        status_code = search_data.get("Status", {}).get("Code")
        trace_id = search_data.get("TraceId")
        hotel_results = search_data.get("HotelResult", [])

        if not isinstance(hotel_results, list):
            hotel_results = []

        results = [
            HotelResult(
                hotel_code=str(hr.get("HotelCode", "")),
                currency=hr.get("Currency", "USD"),
                rooms=hr.get("Rooms", []),
            )
            for hr in hotel_results
        ]

        return HotelSearchResponse(
            status="success" if hotel_results else "no_availability",
            trace_id=trace_id,
            hotels_found=len(results),
            results=results,
        )

    except Exception as e:
        logger.error("Hotel search failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Hotel search failed: {str(e)}",
        )
