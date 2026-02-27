"""
Celery Worker — Hotel & Flight Booking Tasks

Processes bookings asynchronously via TBO Hotel and Air APIs.
Sends real-time notifications to agents via Redis pub/sub → WebSocket.

Run: celery -A app.worker worker -Q booking_queue -l info
"""

import json
import logging
from datetime import datetime
from uuid import UUID, uuid4

import redis

from app.core.celery_app import celery_app
from app.core.config import settings
from app.services.tbo_service import TBOHotelClient
from app.services.tbo_air_service import TBOAirClient
from app.services.booking_service import BookingService
from app.models.booking_job import JobStatus
from app.models.hotel_booking import HotelBookingStatus
from app.models.flight_booking import FlightBooking, FlightBookingStatus

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

    # Process flight bookings
    if "flight" in items:
        flight_params = search_params.get("flight_params", {})
        try:
            flight_result = _process_single_flight(
                job_uuid, agent_id, job_id, flight_params, search_params
            )
            results["flight"] = flight_result
        except Exception as e:
            logger.error("Flight booking failed: %s", e)
            has_failure = True
            results["flight"] = {"status": "failed", "error": str(e)}
            notify_agent(agent_id, {
                "type": "booking_step",
                "job_id": job_id,
                "step": "flight",
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
            "Email": "test@merydian.ai",
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


def _process_single_flight(\r\n    job_uuid: UUID,\r\n    agent_id: str,\r\n    job_id: str,\r\n    flight_params: dict,\r\n    search_params: dict,\r\n) -> dict:\r\n    """\r\n    Process a single flight booking through TBO Air API pipeline.\r\n\r\n    Pipeline: Search → FareQuote → Book\r\n    Returns dict with flight booking result details.\r\n    """\r\n    tbo_air = TBOAirClient()\r\n\r\n    origin = flight_params.get("origin")\r\n    destination = flight_params.get("destination")\r\n    departure_date = flight_params.get("departure_date")\r\n    return_date = flight_params.get("return_date")\r\n    adults = search_params.get("adults", 1)\r\n    children = search_params.get("children", 0)\r\n    cabin_class = flight_params.get("cabin_class", 1)\r\n    preferred_airlines = flight_params.get("preferred_airlines")\r\n    direct_flight = flight_params.get("direct_only", False)\r\n    guest_details = search_params.get("guest_details", [])\r\n\r\n    if not origin or not destination or not departure_date:\r\n        raise ValueError("origin, destination, and departure_date are required for flight booking")\r\n\r\n    # --- Step 1: Create flight booking record ---\r\n    from sqlmodel import Session\r\n    from app.core.db import engine\r\n\r\n    flight_booking = FlightBooking(\r\n        job_id=job_uuid,\r\n        origin=origin,\r\n        destination=destination,\r\n        status=FlightBookingStatus.SEARCHING.value,\r\n        journey_type="return" if return_date else "oneway",\r\n        cabin_class=str(cabin_class),\r\n        passenger_details={"passengers": guest_details},\r\n    )\r\n    with Session(engine) as session:\r\n        session.add(flight_booking)\r\n        session.commit()\r\n        session.refresh(flight_booking)\r\n    booking_id = flight_booking.id\r\n\r\n    # --- Step 2: Search flights ---\r\n    notify_agent(agent_id, {\r\n        "type": "booking_step",\r\n        "job_id": job_id,\r\n        "step": "flight_search",\r\n        "status": "in_progress",\r\n        "message": f"Searching flights {origin} → {destination} ({departure_date})...",\r\n    })\r\n\r\n    search_data = tbo_air.search_flights(\r\n        origin=origin,\r\n        destination=destination,\r\n        departure_date=departure_date,\r\n        return_date=return_date,\r\n        adults=adults,\r\n        children=children,\r\n        cabin_class=cabin_class,\r\n        preferred_airlines=preferred_airlines,\r\n        direct_flight=direct_flight,\r\n    )\r\n\r\n    response = search_data.get("Response", {})\r\n    trace_id = response.get("TraceId")\r\n    results_array = response.get("Results", [[]])\r\n\r\n    # Flatten results\r\n    all_flights = []\r\n    for group in results_array:\r\n        if isinstance(group, list):\r\n            all_flights.extend(group)\r\n\r\n    if not all_flights:\r\n        with Session(engine) as session:\r\n            fb = session.get(FlightBooking, booking_id)\r\n            fb.status = FlightBookingStatus.FAILED.value\r\n            fb.error_message = "No flights found"\r\n            fb.search_response = search_data\r\n            session.add(fb)\r\n            session.commit()\r\n        raise ValueError("No flights found")\r\n\r\n    # Pick best (cheapest) flight\r\n    selected = min(all_flights, key=lambda r: (r.get("Fare", {}).get("PublishedFare") or 999999))\r\n    result_index = selected.get("ResultIndex", "")\r\n    fare_info = selected.get("Fare", {})\r\n    airline = selected.get("ValidatingAirline", "")\r\n    is_lcc = selected.get("IsLCC", False)\r\n\r\n    with Session(engine) as session:\r\n        fb = session.get(FlightBooking, booking_id)\r\n        fb.trace_id = trace_id\r\n        fb.result_index = result_index\r\n        fb.airline = airline\r\n        fb.is_lcc = is_lcc\r\n        fb.total_fare = fare_info.get("PublishedFare")\r\n        fb.currency = fare_info.get("Currency", "USD")\r\n        fb.search_response = search_data\r\n        session.add(fb)\r\n        session.commit()\r\n\r\n    notify_agent(agent_id, {\r\n        "type": "booking_step",\r\n        "job_id": job_id,\r\n        "step": "flight_search",\r\n        "status": "completed",\r\n        "message": f"Found flight: {airline} | Fare: {fare_info.get('PublishedFare')} {fare_info.get('Currency', 'USD')}",\r\n        "airline": airline,\r\n        "total_fare": fare_info.get("PublishedFare"),\r\n    })\r\n\r\n    # --- Step 3: Fare Quote ---\r\n    notify_agent(agent_id, {\r\n        "type": "booking_step",\r\n        "job_id": job_id,\r\n        "step": "fare_quote",\r\n        "status": "in_progress",\r\n        "message": "Getting exact fare quote...",\r\n    })\r\n\r\n    fq_data = tbo_air.get_fare_quote(trace_id=trace_id, result_index=result_index)\r\n    fq_response = fq_data.get("Response", {})\r\n    fq_results = fq_response.get("Results", {})\r\n\r\n    with Session(engine) as session:\r\n        fb = session.get(FlightBooking, booking_id)\r\n        fb.status = FlightBookingStatus.FARE_QUOTED.value\r\n        fb.fare_quote_response = fq_data\r\n        session.add(fb)\r\n        session.commit()\r\n\r\n    notify_agent(agent_id, {\r\n        "type": "booking_step",\r\n        "job_id": job_id,\r\n        "step": "fare_quote",\r\n        "status": "completed",\r\n        "message": "Fare quote confirmed",\r\n    })\r\n\r\n    # --- Step 4: Book flight ---\r\n    notify_agent(agent_id, {\r\n        "type": "booking_step",\r\n        "job_id": job_id,\r\n        "step": "flight_book",\r\n        "status": "in_progress",\r\n        "message": "Creating flight booking (PNR)...",\r\n    })\r\n\r\n    # Build passenger list for TBO\r\n    tbo_passengers = []\r\n    for i, g in enumerate(guest_details):\r\n        tbo_passengers.append({\r\n            "PaxId": i,\r\n            "Title": g.get("Title", "Mr"),\r\n            "FirstName": g.get("FirstName", "Test"),\r\n            "LastName": g.get("LastName", "User"),\r\n            "DateOfBirth": g.get("DateOfBirth", "1990-01-01"),\r\n            "Gender": g.get("Gender", 1),\r\n            "ContactNo": g.get("Phoneno", "9999999999"),\r\n            "Email": g.get("Email", "test@meili.ai"),\r\n            "Nationality": g.get("Nationality", "IN"),\r\n            "Country": g.get("Country", "IN"),\r\n            "City": g.get("City", ""),\r\n            "Address1": g.get("Address", ""),\r\n            "PaxType": 1,\r\n            "LeadPassenger": i == 0,\r\n            "Fare_BE": fq_results.get("Fare", {}),\r\n            "IdDetails": None,\r\n        })\r\n\r\n    if not tbo_passengers:\r\n        tbo_passengers = [{\r\n            "PaxId": 0,\r\n            "Title": "Mr", "FirstName": "Test", "LastName": "User",\r\n            "DateOfBirth": "1990-01-01", "Gender": 1,\r\n            "ContactNo": "9999999999", "Email": "test@meili.ai",\r\n            "Nationality": "IN", "Country": "IN", "City": "", "Address1": "",\r\n            "PaxType": 1, "LeadPassenger": True,\r\n            "Fare_BE": fq_results.get("Fare", {}),\r\n            "IdDetails": None,\r\n        }]\r\n\r\n    book_data = tbo_air.book_flight(\r\n        result_index=result_index,\r\n        trace_id=trace_id,\r\n        passengers=tbo_passengers,\r\n        segments_be=fq_results.get("Segments", []),\r\n        fare_rules=fq_results.get("FareRules", []),\r\n        fare=fq_results.get("Fare", {}),\r\n        mini_fare_rules=fq_results.get("MiniFareRules"),\r\n        fare_classification=fq_results.get("FareClassification"),\r\n        is_lcc=is_lcc,\r\n    )\r\n\r\n    book_response = book_data.get("Response", book_data)\r\n    pnr = book_response.get("PNR", "")\r\n    tbo_booking_id = str(book_response.get("BookingId", ""))\r\n\r\n    final_status = FlightBookingStatus.BOOKED if pnr else FlightBookingStatus.FAILED\r\n\r\n    with Session(engine) as session:\r\n        fb = session.get(FlightBooking, booking_id)\r\n        fb.pnr = pnr\r\n        fb.booking_id = tbo_booking_id\r\n        fb.status = final_status.value\r\n        fb.booking_response = book_data\r\n        fb.updated_at = datetime.utcnow()\r\n        session.add(fb)\r\n        session.commit()\r\n\r\n    notify_agent(agent_id, {\r\n        "type": "booking_step",\r\n        "job_id": job_id,\r\n        "step": "flight_book",\r\n        "status": "completed" if pnr else "failed",\r\n        "message": f"Flight booking {final_status.value} | PNR: {pnr}" if pnr else "Flight booking failed",\r\n        "pnr": pnr,\r\n        "booking_id": tbo_booking_id,\r\n    })\r\n\r\n    return {\r\n        "status": final_status.value,\r\n        "origin": origin,\r\n        "destination": destination,\r\n        "airline": airline,\r\n        "pnr": pnr,\r\n        "booking_id": tbo_booking_id,\r\n        "total_fare": fare_info.get("PublishedFare"),\r\n        "currency": fare_info.get("Currency", "USD"),\r\n    }\r\n\r\n\r\n@celery_app.task(name="app.worker.process_event_task", bind=True, max_retries=3)
def process_event_task(self, event_id: str):
    """
    Async task to process a system event (e.g., feedback, POI request).
    Dispatches to AgentService.
    """
    from app.services.agent_service import AgentService
    from app.services.event_service import EventService
    from app.models.event import EventType, EventStatus

    try:
        # Get event
        event = EventService.get_event_by_id(UUID(event_id))
        if not event:
            logger.error(f"Event {event_id} not found during async processing")
            return

        # Double check status to avoid reprocessing
        if event.status in (EventStatus.COMPLETED, EventStatus.FAILED):
            return

        logger.info(f"Processing event {event_id} (type={event.event_type})")

        # Dispatch based on type
        if event.event_type == EventType.FEEDBACK:
            AgentService.process_feedback_event(event_id)
        elif event.event_type == EventType.POI_REQUEST:
            AgentService.process_poi_request_event(event_id)
        elif event.event_type == EventType.INCIDENT:
            AgentService.process_incident_event(UUID(event_id))
        else:
            logger.warning(f"Unknown event type {event.event_type} for event {event_id}")

    except Exception as e:
        logger.error(f"Failed to process event {event_id}: {e}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=2 ** self.request.retries)


@celery_app.task(name="app.worker.process_notification_task")
def process_notification_task(
    notification_type: str,
    payload: dict,
    target_users: list = None,
    target_agents: list = None
):
    """
    Async task to send notifications via Redis pub/sub → WebSocket.
    
    Args:
        notification_type: Type identifier (e.g., 'itinerary_update')
        payload: Data content
        target_users: List of user_ids to notify via 'traveller_notifications'
        target_agents: List of agent_ids to notify via 'booking_notifications'
    """
    try:
        redis = get_redis()
        timestamp = datetime.utcnow().isoformat()
        
        # 1. Notify Travellers
        if target_users:
            for user_id in target_users:
                msg = {
                    "type": notification_type,
                    "user_id": str(user_id),
                    "timestamp": timestamp,
                    **payload
                }
                redis.publish("traveller_notifications", json.dumps(msg, default=str))
                logger.info(f"Notification sent to traveller {user_id}: {notification_type}")
        
        # 2. Notify Agents
        if target_agents:
            for agent_id in target_agents:
                msg = {
                    "type": notification_type,
                    "agent_id": str(agent_id),
                    "timestamp": timestamp,
                    **payload
                }
                redis.publish("booking_notifications", json.dumps(msg, default=str))
                logger.info(f"Notification sent to agent {agent_id}: {notification_type}")
                
        # 3. Broadcast if no targets specified (optional, handle with care)
        if not target_users and not target_agents:
            # Broadcast to all travellers associated with the payload's family?
            # For now, just log warning
            logger.warning("Notification task received with no targets")

    except Exception as e:
        logger.error(f"Failed to process notification task: {e}")
