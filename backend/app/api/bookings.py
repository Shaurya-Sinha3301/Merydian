"""
Bookings API — Real-Time TBO Integration

Provides endpoints for:
- Executing bookings (async via Celery)
- Checking booking status (from DB)
- Searching hotels directly (sync via TBO API)
- Cancelling hotel bookings
- Retrieving bookings by date range

All mock code has been removed — this is fully production-ready.
"""

import logging
from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from app.core.dependencies import get_current_agent, get_current_user
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
    CancelBookingRequest,
    CancelBookingResponse,
    BookingsByDateRequest,
    BookingsByDateResponse,
    TBOBookingSummary,
)
from app.services.booking_service import BookingService
from app.services.tbo_service import TBOHotelClient
from app.models.booking_job import JobStatus

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/me")
async def get_my_bookings(
    current_user: TokenPayload = Depends(get_current_user),
) -> Any:
    """
    Get all bookings for the authenticated customer's family.
    Returns hotel and flight bookings grouped by type.
    Available to travellers (customers) as well as agents.
    """
    from sqlmodel import Session, select
    from app.core.db import engine
    from app.models.hotel_booking import HotelBooking
    from app.models.flight_booking import FlightBooking
    from app.models.itinerary import Itinerary
    from app.models.booking_job import BookingJob
    from uuid import UUID

    family_id_str = current_user.family_id
    if not family_id_str:
        return {"hotels": [], "flights": [], "total": 0}

    try:
        family_uuid = UUID(family_id_str)
    except ValueError:
        return {"hotels": [], "flights": [], "total": 0}

    with Session(engine) as session:
        # 1. Get all itinerary IDs for this family
        itineraries = session.exec(
            select(Itinerary).where(Itinerary.family_id == family_uuid)
        ).all()
        itinerary_ids = [str(itin.id) for itin in itineraries]

        if not itinerary_ids:
            return {"hotels": [], "flights": [], "total": 0}

        # 2. Get all booking job IDs for these itineraries
        jobs = session.exec(
            select(BookingJob).where(BookingJob.itinerary_id.in_(itinerary_ids))
        ).all()
        job_ids = [job.id for job in jobs]

        if not job_ids:
            return {"hotels": [], "flights": [], "total": 0}

        # 3. Get hotel and flight bookings for these jobs
        hotels = session.exec(
            select(HotelBooking).where(HotelBooking.job_id.in_(job_ids))
        ).all()

        flights = session.exec(
            select(FlightBooking).where(FlightBooking.job_id.in_(job_ids))
        ).all()

    hotel_list = [
        {
            "id": str(h.id),
            "type": "hotel",
            "icon": "\U0001f3e8",
            "code": h.hotel_name or "Hotel",
            "detail": f"{h.room_name or 'Room'} · Check-in {h.checkin}",
            "status": (h.status or "confirmed").upper(),
            "confirmation_no": h.confirmation_no,
            "total_fare": h.total_fare,
            "currency": h.currency,
            "checkin": str(h.checkin) if h.checkin else None,
            "checkout": str(h.checkout) if h.checkout else None,
        }
        for h in hotels
    ]

    flight_list = [
        {
            "id": str(f.id),
            "type": "flight",
            "icon": "\u2708",
            "code": f.flight_number or "Flight",
            "detail": f"{f.origin or ''} → {f.destination or ''} · {f.cabin_class or 'Economy'}",
            "status": (f.status or "confirmed").upper(),
            "confirmation_no": f.booking_reference,
            "departure_date": str(f.departure_date) if f.departure_date else None,
        }
        for f in flights
    ]

    return {
        "hotels": hotel_list,
        "flights": flight_list,
        "total": len(hotel_list) + len(flight_list),
    }



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
            "flight_params": {
                "origin": request.flight_origin,
                "destination": request.flight_destination,
                "departure_date": request.flight_departure_date,
                "return_date": request.flight_return_date,
                "cabin_class": request.flight_cabin_class,
                "preferred_airlines": request.flight_preferred_airlines,
                "direct_only": request.flight_direct_only,
            },
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

    Supports optional filters: refundable, meal_type, star_rating, hotel_name, order_by.
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

        # 2. Search for availability with optional filters
        search_data = tbo.search_hotels(
            hotel_codes=hotel_codes,
            checkin=request.checkin,
            checkout=request.checkout,
            rooms=request.rooms,
            adults=request.adults,
            children=request.children,
            children_ages=request.children_ages,
            nationality=request.nationality,
            refundable=request.refundable,
            meal_type=request.meal_type,
            star_rating=request.star_rating,
            hotel_name=request.hotel_name,
            order_by=request.order_by,
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


# ------------------------------------------------------------------ #
#  P0: Cancel Booking
# ------------------------------------------------------------------ #

@router.post("/cancel", response_model=CancelBookingResponse)
async def cancel_booking(
    request: CancelBookingRequest,
    current_agent: TokenPayload = Depends(get_current_agent),
) -> Any:
    """
    Cancel a confirmed hotel booking via TBO API.

    Looks up the booking in the database, calls TBO Cancel API,
    and updates the booking record with cancellation details.
    """
    try:
        # 1. Look up booking in DB
        booking = BookingService.get_hotel_booking(UUID(request.booking_id))
        if not booking:
            raise HTTPException(
                status_code=404,
                detail=f"Hotel booking '{request.booking_id}' not found",
            )

        # 2. Verify the booking has a confirmation number
        if not booking.confirmation_no:
            raise HTTPException(
                status_code=400,
                detail="Booking has no confirmation number — cannot cancel an unconfirmed booking",
            )

        # 3. Check booking isn't already cancelled
        if booking.status == "cancelled":
            return CancelBookingResponse(
                booking_id=request.booking_id,
                status="already_cancelled",
                confirmation_no=booking.confirmation_no,
                cancellation_charges=booking.cancellation_charges,
                refund_amount=booking.refund_amount,
                message="This booking was already cancelled.",
            )

        # 4. Call TBO Cancel API
        tbo = TBOHotelClient()
        cancel_response = tbo.cancel(booking.confirmation_no)

        # 5. Extract cancellation details from response
        cancel_result = cancel_response.get("CancelResult", {})
        booking_status = cancel_result.get("BookingStatus", "")
        cancellation_charges = cancel_result.get("CancellationCharges", 0.0)
        refund_amount = cancel_result.get("RefundAmount", 0.0)

        if booking_status.lower() in ("cancelled", "success", "vouchercancelled"):
            # 6a. Successful cancellation — update DB
            BookingService.cancel_hotel_booking(
                booking_id=booking.id,
                refund_amount=refund_amount,
                cancellation_charges=cancellation_charges,
                cancel_response=cancel_response,
            )

            logger.info("Hotel booking %s cancelled. Refund: %.2f, Charges: %.2f",
                        request.booking_id, refund_amount, cancellation_charges)

            return CancelBookingResponse(
                booking_id=request.booking_id,
                status="cancelled",
                confirmation_no=booking.confirmation_no,
                cancellation_charges=cancellation_charges,
                refund_amount=refund_amount,
                message=f"Booking cancelled successfully. Refund: {refund_amount}, Charges: {cancellation_charges}",
            )
        else:
            # 6b. Cancellation failed or unexpected status
            BookingService.cancel_hotel_booking(
                booking_id=booking.id,
                cancel_response=cancel_response,
                error_message=f"TBO Cancel returned status: {booking_status}",
            )

            return CancelBookingResponse(
                booking_id=request.booking_id,
                status="cancel_failed",
                confirmation_no=booking.confirmation_no,
                message=f"Cancellation returned unexpected status: {booking_status}",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to cancel booking %s: %s", request.booking_id, e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cancel booking: {str(e)}",
        )


# ------------------------------------------------------------------ #
#  P0: Bookings by Date Range
# ------------------------------------------------------------------ #

@router.post("/by-date", response_model=BookingsByDateResponse)
async def get_bookings_by_date(
    request: BookingsByDateRequest,
    current_agent: TokenPayload = Depends(get_current_agent),
) -> Any:
    """
    Retrieve all TBO bookings in a date range.

    Calls the TBO BookingDetailsBasedOnDate API and returns
    a summary of each booking found within the specified dates.
    """
    try:
        tbo = TBOHotelClient()
        response = tbo.get_bookings_by_date(request.from_date, request.to_date)

        booking_details = response.get("BookingDetails", [])
        if not isinstance(booking_details, list):
            booking_details = []

        bookings = [
            TBOBookingSummary(
                confirmation_no=bd.get("ConfirmationNo") or bd.get("ConfirmationNumber"),
                booking_id=str(bd.get("BookingId", "")),
                hotel_name=bd.get("HotelName", ""),
                status=bd.get("BookingStatus", ""),
                checkin=bd.get("CheckIn", ""),
                checkout=bd.get("CheckOut", ""),
                total_fare=bd.get("TotalFare"),
                currency=bd.get("Currency", ""),
                raw_data=bd,
            )
            for bd in booking_details
        ]

        return BookingsByDateResponse(
            status="success",
            from_date=request.from_date,
            to_date=request.to_date,
            total_bookings=len(bookings),
            bookings=bookings,
        )

    except Exception as e:
        logger.error("Failed to retrieve bookings by date: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve bookings: {str(e)}",
        )
