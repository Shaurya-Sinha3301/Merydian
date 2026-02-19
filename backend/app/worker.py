"""
Celery Worker — Hotel Booking Task

Processes hotel bookings asynchronously via the TBO API.
Sends real-time notifications to agents via Redis pub/sub → WebSocket.

Run: celery -A app.worker worker -Q booking_queue -l info
"""

import json
import logging
from datetime import datetime
from uuid import UUID

import redis

from app.core.celery_app import celery_app
from app.core.config import settings
from app.services.tbo_service import TBOHotelClient
from app.services.booking_service import BookingService
from app.models.booking_job import JobStatus
from app.models.hotel_booking import HotelBookingStatus

logger = logging.getLogger(__name__)

# Redis client for pub/sub notifications (sync, used from Celery worker)
_redis_client = None


def get_redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


def notify_agent(agent_id: str, payload: dict):
    """Publish notification to Redis pub/sub for WebSocket delivery."""
    try:
        message = {
            "agent_id": agent_id,
            "timestamp": datetime.utcnow().isoformat(),
            **payload,
        }
        get_redis().publish("booking_notifications", json.dumps(message, default=str))
        logger.info("Notification sent to agent=%s: %s", agent_id, payload.get("type", "unknown"))
    except Exception as e:
        logger.error("Failed to send notification: %s", e)


@celery_app.task(name="app.worker.process_hotel_booking", bind=True, max_retries=2)
def process_hotel_booking(
    self,
    job_id: str,
    itinerary_id: str,
    agent_id: str,
    items: list,
    search_params: dict,
):
    """
    Process a hotel booking async via TBO API.

    Full pipeline:
    1. Get hotel codes for city
    2. Search available hotels
    3. PreBook selected room
    4. Book with guest details
    5. Update DB + notify agent at each step

    Args:
        job_id: UUID string of the booking job
        itinerary_id: Itinerary being booked
        agent_id: Agent who triggered booking
        items: List of booking item types
        search_params: Dict with keys:
            - city_code: TBO city code
            - checkin: YYYY-MM-DD
            - checkout: YYYY-MM-DD
            - rooms: int (default 1)
            - adults: int (default 2)
            - children: int (default 0)
            - nationality: str (default "IN")
            - guest_details: list of passenger dicts
    """
    job_uuid = UUID(job_id)
    tbo = TBOHotelClient()
    results = {}
    has_failure = False

    # --- Update job → processing ---
    BookingService.update_job_status(
        job_uuid, JobStatus.PROCESSING, celery_task_id=self.request.id
    )
    notify_agent(agent_id, {
        "type": "booking_status",
        "job_id": job_id,
        "status": "processing",
        "message": "Booking job started — searching hotels...",
    })

    # Process hotel bookings
    if "hotel" in items:
        try:
            hotel_result = _process_single_hotel(
                tbo, job_uuid, agent_id, job_id, search_params
            )
            results["hotel"] = hotel_result
        except Exception as e:
            logger.error("Hotel booking failed: %s", e)
            has_failure = True
            results["hotel"] = {"status": "failed", "error": str(e)}
            notify_agent(agent_id, {
                "type": "booking_step",
                "job_id": job_id,
                "step": "hotel",
                "status": "failed",
                "error": str(e),
            })

    # --- Determine final status ---
    total_items = len(items)
    failed_items = sum(1 for v in results.values() if isinstance(v, dict) and v.get("status") == "failed")

    if failed_items == 0:
        final_status = JobStatus.COMPLETED
    elif failed_items == total_items:
        final_status = JobStatus.FAILED
    else:
        final_status = JobStatus.PARTIAL_FAILURE

    # --- Update job → final ---
    BookingService.update_job_status(
        job_uuid,
        final_status,
        items_completed=results,
    )

    notify_agent(agent_id, {
        "type": "booking_complete",
        "job_id": job_id,
        "status": final_status.value,
        "results": results,
        "message": f"Booking {final_status.value}: {len(results)} items processed",
    })

    logger.info("Booking job %s completed: %s", job_id, final_status.value)
    return {"job_id": job_id, "status": final_status.value, "results": results}


def _process_single_hotel(
    tbo: TBOHotelClient,
    job_uuid: UUID,
    agent_id: str,
    job_id: str,
    params: dict,
) -> dict:
    """
    Process a single hotel booking through TBO API pipeline.

    Returns dict with booking result details.
    """
    city_code = params.get("city_code", "418069")  # Default to Delhi NCR
    checkin = params.get("checkin")
    checkout = params.get("checkout")
    rooms = params.get("rooms", 1)
    adults = params.get("adults", 2)
    children = params.get("children", 0)
    nationality = params.get("nationality", "IN")
    guest_details = params.get("guest_details", [])

    if not checkin or not checkout:
        raise ValueError("checkin and checkout dates are required")

    # --- Step 1: Create hotel booking record ---
    hotel_booking = BookingService.create_hotel_booking(
        job_id=job_uuid,
        status=HotelBookingStatus.SEARCHING,
        checkin=checkin,
        checkout=checkout,
        guest_details={"passengers": guest_details},
    )
    booking_uuid = hotel_booking.id

    # --- Step 2: Get hotel codes for city ---
    notify_agent(agent_id, {
        "type": "booking_step",
        "job_id": job_id,
        "step": "hotel_code_list",
        "status": "in_progress",
        "message": f"Fetching hotel codes for city {city_code}...",
    })

    hotels_list = tbo.get_hotel_codes(city_code)
    if not hotels_list:
        BookingService.update_hotel_booking(
            booking_uuid,
            status=HotelBookingStatus.FAILED.value,
            error_message="No hotel codes found for city",
        )
        raise ValueError(f"No hotel codes found for city {city_code}")

    hotel_codes = [h["HotelCode"] for h in hotels_list[:50]]
    logger.info("Found %d hotel codes, using first %d", len(hotels_list), len(hotel_codes))

    # --- Step 3: Search hotels ---
    notify_agent(agent_id, {
        "type": "booking_step",
        "job_id": job_id,
        "step": "search",
        "status": "in_progress",
        "message": f"Searching {len(hotel_codes)} hotels ({checkin} → {checkout})...",
    })

    search_result = tbo.search_hotels(
        hotel_codes=hotel_codes,
        checkin=checkin,
        checkout=checkout,
        rooms=rooms,
        adults=adults,
        children=children,
        nationality=nationality,
    )

    status_code = search_result.get("Status", {}).get("Code")
    hotel_results = search_result.get("HotelResult", [])

    if not isinstance(hotel_results, list) or not hotel_results:
        BookingService.update_hotel_booking(
            booking_uuid,
            status=HotelBookingStatus.FAILED.value,
            error_message=f"No available hotels (status: {status_code})",
            tbo_response=search_result,
        )
        raise ValueError("No hotels with availability found")

    # Pick best (first) hotel with rooms
    selected_hotel = hotel_results[0]
    hotel_rooms = selected_hotel.get("Rooms", [])
    if not hotel_rooms:
        raise ValueError("Selected hotel has no available rooms")

    selected_room = hotel_rooms[0]
    trace_id = search_result.get("TraceId", "")
    booking_code = selected_room.get("BookingCode", "")
    room_name = selected_room.get("Name", ["Unknown"])[0] if isinstance(selected_room.get("Name"), list) else selected_room.get("Name", "Unknown")

    BookingService.update_hotel_booking(
        booking_uuid,
        status=HotelBookingStatus.SEARCHED.value,
        hotel_code=str(selected_hotel.get("HotelCode", "")),
        hotel_name=selected_hotel.get("HotelName", ""),
        booking_code=booking_code,
        trace_id=trace_id,
        room_name=room_name,
        total_fare=selected_room.get("TotalFare"),
        currency=selected_hotel.get("Currency", "USD"),
    )

    notify_agent(agent_id, {
        "type": "booking_step",
        "job_id": job_id,
        "step": "search",
        "status": "completed",
        "message": f"Found hotel: {selected_hotel.get('HotelCode')} | Room: {room_name} | Fare: {selected_room.get('TotalFare')} {selected_hotel.get('Currency', 'USD')}",
        "hotel_code": str(selected_hotel.get("HotelCode", "")),
        "room_name": room_name,
        "total_fare": selected_room.get("TotalFare"),
    })

    # --- Step 4: PreBook ---
    notify_agent(agent_id, {
        "type": "booking_step",
        "job_id": job_id,
        "step": "prebook",
        "status": "in_progress",
        "message": "Confirming pricing (PreBook)...",
    })

    try:
        prebook_result = tbo.pre_book(booking_code, trace_id)
        prebook_status = prebook_result.get("Status", {}).get("Code")

        BookingService.update_hotel_booking(
            booking_uuid,
            status=HotelBookingStatus.PREBOOKED.value,
        )

        notify_agent(agent_id, {
            "type": "booking_step",
            "job_id": job_id,
            "step": "prebook",
            "status": "completed",
            "message": f"Pricing confirmed (status: {prebook_status})",
        })
    except Exception as e:
        logger.warning("PreBook failed (continuing to book): %s", e)

    # --- Step 5: Book ---
    notify_agent(agent_id, {
        "type": "booking_step",
        "job_id": job_id,
        "step": "book",
        "status": "in_progress",
        "message": "Creating hotel booking...",
    })

    # Default guest if none provided
    if not guest_details:
        guest_details = [{
            "Title": "Mr",
            "FirstName": "Test",
            "MiddleName": "",
            "LastName": "User",
            "Phoneno": "9999999999",
            "Email": "test@meili.ai",
            "PaxType": 1,
            "LeadPassenger": True,
            "Age": 30,
            "PassportNo": "",
            "PassportIssueDate": "",
            "PassportExpDate": "",
            "PAN": "",
        }]

    book_result = tbo.book(booking_code, trace_id, guest_details)
    book_status = book_result.get("Status", {}).get("Code")
    booking_detail = book_result.get("BookResult", {})

    confirmation_no = booking_detail.get("ConfirmationNo", "")
    tbo_booking_id = str(booking_detail.get("BookingId", ""))
    booking_status_text = booking_detail.get("BookingStatus", "")

    if booking_status_text in ("Confirmed", "Vouchered"):
        final_booking_status = HotelBookingStatus.CONFIRMED
    else:
        final_booking_status = HotelBookingStatus.FAILED

    BookingService.update_hotel_booking(
        booking_uuid,
        status=final_booking_status.value,
        confirmation_no=confirmation_no,
        tbo_booking_id=tbo_booking_id,
        tbo_response=book_result,
    )

    notify_agent(agent_id, {
        "type": "booking_step",
        "job_id": job_id,
        "step": "book",
        "status": "completed" if final_booking_status == HotelBookingStatus.CONFIRMED else "failed",
        "message": f"Booking {booking_status_text} | Confirmation: {confirmation_no}",
        "confirmation_no": confirmation_no,
        "tbo_booking_id": tbo_booking_id,
    })

    return {
        "status": final_booking_status.value,
        "hotel_code": str(selected_hotel.get("HotelCode", "")),
        "hotel_name": selected_hotel.get("HotelName", ""),
        "room_name": room_name,
        "confirmation_no": confirmation_no,
        "tbo_booking_id": tbo_booking_id,
        "total_fare": selected_room.get("TotalFare"),
        "currency": selected_hotel.get("Currency", "USD"),
    }
