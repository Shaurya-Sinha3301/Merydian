"""
Flights API — TBO Air API Integration

Provides endpoints for:
- Searching flights (oneway + return, GDS + LCC)
- Getting fare quotes and fare rules
- SSR options (baggage, seats, meals)
- Booking flights (PNR creation)
- Issuing tickets

All operations use the TBO Air API via TBOAirClient.
"""

import logging
from typing import Any
from uuid import UUID, uuid4
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from app.core.dependencies import get_current_agent
from app.schemas.auth import TokenPayload
from app.schemas.flight import (
    FlightSearchRequest,
    FlightSearchResponse,
    FlightResult,
    FlightSegmentResult,
    FareQuoteRequest,
    FareQuoteResponse,
    FareRuleRequest,
    FareRuleResponse,
    SSRRequest,
    SSRResponse,
    BaggageOption,
    MealOption,
    FlightBookingRequest,
    FlightBookingResponse,
    TicketRequest,
    TicketResponse,
)
from app.services.tbo_air_service import TBOAirClient

logger = logging.getLogger(__name__)

router = APIRouter()


# ------------------------------------------------------------------ #
#  Flight Search
# ------------------------------------------------------------------ #

@router.post("/search", response_model=FlightSearchResponse)
async def search_flights(
    request: FlightSearchRequest,
    current_agent: TokenPayload = Depends(get_current_agent),
) -> Any:
    """
    Search flights via TBO Air API.

    Supports oneway and return journeys, GDS and LCC sources.
    Returns available flights with fares and segments.
    """
    try:
        tbo = TBOAirClient()
        search_data = tbo.search_flights(
            origin=request.origin,
            destination=request.destination,
            departure_date=request.departure_date,
            return_date=request.return_date,
            adults=request.adults,
            children=request.children,
            infants=request.infants,
            cabin_class=request.cabin_class,
            preferred_airlines=request.preferred_airlines,
            sources=request.sources,
            direct_flight=request.direct_flight,
            one_stop_flight=request.one_stop_flight,
            is_domestic=request.is_domestic,
            preferred_currency=request.preferred_currency,
        )

        # Parse response
        response_data = search_data.get("Response", {})
        trace_id = response_data.get("TraceId")
        results_array = response_data.get("Results", [[]])

        flights = []
        for results_group in results_array:
            if not isinstance(results_group, list):
                continue
            for result in results_group:
                # Extract segments
                segments = []
                for seg_group in result.get("Segments", []):
                    if isinstance(seg_group, list):
                        for seg in seg_group:
                            airline_info = seg.get("Airline", {})
                            origin_info = seg.get("Origin", {})
                            dest_info = seg.get("Destination", {})
                            segments.append(FlightSegmentResult(
                                airline=airline_info.get("AirlineName", ""),
                                flight_number=f"{airline_info.get('AirlineCode', '')}-{airline_info.get('FlightNumber', '')}",
                                origin=origin_info.get("Airport", {}).get("AirportCode", ""),
                                destination=dest_info.get("Airport", {}).get("AirportCode", ""),
                                departure_time=origin_info.get("DepTime", ""),
                                arrival_time=dest_info.get("ArrTime", ""),
                                duration=seg.get("Duration"),
                                stops=seg.get("StopOver", 0) if seg.get("StopOver") else 0,
                                raw_data=seg,
                            ))

                fare_info = result.get("Fare", {})
                flights.append(FlightResult(
                    result_index=result.get("ResultIndex", ""),
                    fare=fare_info.get("PublishedFare") or fare_info.get("OfferedFare"),
                    currency=fare_info.get("Currency", "USD"),
                    airline=result.get("ValidatingAirline", ""),
                    is_lcc=result.get("IsLCC", False),
                    segments=segments,
                    raw_data=result,
                ))

        return FlightSearchResponse(
            status="success" if flights else "no_flights",
            trace_id=trace_id,
            flights_found=len(flights),
            results=flights,
        )

    except Exception as e:
        logger.error("Flight search failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Flight search failed: {str(e)}",
        )


# ------------------------------------------------------------------ #
#  Fare Quote
# ------------------------------------------------------------------ #

@router.post("/fare-quote", response_model=FareQuoteResponse)
async def get_fare_quote(
    request: FareQuoteRequest,
    current_agent: TokenPayload = Depends(get_current_agent),
) -> Any:
    """
    Get exact fare for a specific flight from search results.

    Returns fare details, segments, validating airline, and last ticket date.
    """
    try:
        tbo = TBOAirClient()
        data = tbo.get_fare_quote(
            trace_id=request.trace_id,
            result_index=request.result_index,
        )

        response = data.get("Response", {})
        results = response.get("Results", {})

        return FareQuoteResponse(
            status="success",
            fare=results.get("Fare"),
            segments=results.get("Segments"),
            validating_airline=results.get("ValidatingAirline"),
            last_ticket_date=results.get("LastTicketDate"),
            mini_fare_rules=results.get("MiniFareRules"),
            fare_classification=results.get("FareClassification"),
            fare_rules=results.get("FareRules"),
            raw_data=data,
        )

    except Exception as e:
        logger.error("Fare quote failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Fare quote failed: {str(e)}")


# ------------------------------------------------------------------ #
#  Fare Rules
# ------------------------------------------------------------------ #

@router.post("/fare-rules", response_model=FareRuleResponse)
async def get_fare_rules(
    request: FareRuleRequest,
    current_agent: TokenPayload = Depends(get_current_agent),
) -> Any:
    """Get cancellation/change rules for a flight."""
    try:
        tbo = TBOAirClient()
        data = tbo.get_fare_rules(
            trace_id=request.trace_id,
            result_index=request.result_index,
        )

        response = data.get("Response", {})

        return FareRuleResponse(
            status="success",
            fare_rules=response.get("FareRules"),
            raw_data=data,
        )

    except Exception as e:
        logger.error("Fare rules failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Fare rules failed: {str(e)}")


# ------------------------------------------------------------------ #
#  SSR (Special Service Requests)
# ------------------------------------------------------------------ #

@router.post("/ssr", response_model=SSRResponse)
async def get_ssr_options(
    request: SSRRequest,
    current_agent: TokenPayload = Depends(get_current_agent),
) -> Any:
    """Get baggage, seat, and meal options for a flight."""
    try:
        tbo = TBOAirClient()
        data = tbo.get_ssr(
            trace_id=request.trace_id,
            result_index=request.result_index,
        )

        response = data.get("Response", {})

        # Parse baggage options
        baggage_list = []
        for bag_group in (response.get("Baggage") or []):
            if isinstance(bag_group, list):
                for bag in bag_group:
                    baggage_list.append(BaggageOption(
                        code=bag.get("Code"),
                        description=bag.get("Description"),
                        weight=bag.get("Weight"),
                        price=bag.get("Price"),
                        currency=bag.get("Currency"),
                    ))

        # Parse meal options
        meal_list = []
        for meal_group in (response.get("MealDynamic") or []):
            if isinstance(meal_group, list):
                for meal in meal_group:
                    meal_list.append(MealOption(
                        code=meal.get("Code"),
                        description=meal.get("Description"),
                        price=meal.get("Price"),
                        currency=meal.get("Currency"),
                    ))

        return SSRResponse(
            status="success",
            baggage=baggage_list if baggage_list else None,
            meals=meal_list if meal_list else None,
            seat_dynamic=response.get("SeatDynamic"),
            raw_data=data,
        )

    except Exception as e:
        logger.error("SSR options failed: %s", e)
        raise HTTPException(status_code=500, detail=f"SSR options failed: {str(e)}")


# ------------------------------------------------------------------ #
#  Flight Booking
# ------------------------------------------------------------------ #

@router.post("/book", response_model=FlightBookingResponse)
async def book_flight(
    request: FlightBookingRequest,
    current_agent: TokenPayload = Depends(get_current_agent),
) -> Any:
    """
    Book a flight via TBO Air API.

    Creates a PNR with passenger details. Supports both GDS and LCC,
    with or without passport details.
    """
    try:
        tbo = TBOAirClient()

        # Build passenger list for TBO API
        tbo_passengers = []
        for i, pax in enumerate(request.passengers):
            passenger = {
                "PaxId": i,
                "Title": pax.title,
                "FirstName": pax.first_name,
                "LastName": pax.last_name,
                "DateOfBirth": pax.date_of_birth,
                "Gender": pax.gender,
                "ContactNo": pax.contact_no,
                "Email": pax.email,
                "Nationality": pax.nationality,
                "Country": pax.country,
                "City": pax.city,
                "Address1": pax.address,
                "PaxType": 1,  # Adult
                "LeadPassenger": i == 0,
                "Fare_BE": request.fare,
            }

            # Passport details for international
            if pax.passport_number:
                passenger["IdDetails"] = [{
                    "IdType": 1,
                    "IdNumber": pax.passport_number,
                    "ExpiryDate": pax.passport_expiry or "",
                }]
            else:
                passenger["IdDetails"] = None

            # SSR selections
            if pax.baggage_code:
                passenger["PaxBaggage"] = pax.baggage_code
            if pax.meal_code:
                passenger["PaxMeal"] = pax.meal_code
            if pax.seat_code:
                passenger["PaxSeat"] = pax.seat_code

            tbo_passengers.append(passenger)

        # Call TBO Book API
        book_data = tbo.book_flight(
            result_index=request.result_index,
            trace_id=request.trace_id,
            passengers=tbo_passengers,
            segments_be=request.segments_be,
            fare_rules=request.fare_rules,
            fare=request.fare,
            mini_fare_rules=request.mini_fare_rules,
            fare_classification=request.fare_classification,
            is_lcc=request.is_lcc,
            source_session_id=request.source_session_id,
            order_key=request.order_key,
        )

        # Extract booking result
        response = book_data.get("Response", book_data)
        pnr = response.get("PNR", "")
        booking_id_tbo = response.get("BookingId", "")
        status_val = response.get("ResponseStatus", 1)

        # Save to DB
        from app.models.flight_booking import FlightBooking, FlightBookingStatus
        from sqlmodel import Session
        from app.core.db import engine

        flight_booking = FlightBooking(
            pnr=pnr,
            booking_id=str(booking_id_tbo),
            trace_id=request.trace_id,
            result_index=request.result_index,
            status=FlightBookingStatus.BOOKED.value if pnr else FlightBookingStatus.FAILED.value,
            is_lcc=request.is_lcc,
            passenger_details={"passengers": [p.model_dump() for p in request.passengers]},
            booking_response=book_data,
        )

        with Session(engine) as session:
            session.add(flight_booking)
            session.commit()
            session.refresh(flight_booking)

        logger.info("Flight booked: PNR=%s, BookingId=%s", pnr, booking_id_tbo)

        return FlightBookingResponse(
            status="booked" if pnr else "failed",
            booking_id=str(flight_booking.id),
            pnr=pnr,
            message=f"Flight booked successfully. PNR: {pnr}" if pnr else "Booking failed",
            raw_data=book_data,
        )

    except Exception as e:
        logger.error("Flight booking failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Flight booking failed: {str(e)}")


# ------------------------------------------------------------------ #
#  Ticketing
# ------------------------------------------------------------------ #

@router.post("/ticket", response_model=TicketResponse)
async def issue_ticket(
    request: TicketRequest,
    current_agent: TokenPayload = Depends(get_current_agent),
) -> Any:
    """
    Issue e-ticket for a booked flight.

    For GDS: Two-step (Book → Ticket).
    For LCC: Ticket call issues immediately.
    """
    try:
        from app.models.flight_booking import FlightBooking, FlightBookingStatus
        from sqlmodel import Session
        from app.core.db import engine

        # 1. Look up flight booking
        with Session(engine) as session:
            booking = session.get(FlightBooking, UUID(request.flight_booking_id))
            if not booking:
                raise HTTPException(
                    status_code=404,
                    detail=f"Flight booking '{request.flight_booking_id}' not found",
                )

            if not booking.pnr:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot ticket — no PNR exists for this booking",
                )

            if booking.ticket_status == "ticketed":
                return TicketResponse(
                    status="already_ticketed",
                    booking_id=request.flight_booking_id,
                    pnr=booking.pnr,
                    ticket_number=booking.ticket_number,
                    message="This flight is already ticketed.",
                )

            # 2. Call TBO Ticket API
            tbo = TBOAirClient()
            booking_resp = booking.booking_response or {}

            ticket_data = tbo.issue_ticket(
                result_index=booking.result_index or "",
                trace_id=booking.trace_id or "",
                pnr=booking.pnr,
                passengers=booking_resp.get("Response", {}).get("Itinerary", {}).get("Passenger", []),
                segments_be=booking_resp.get("Response", {}).get("Itinerary", {}).get("Segments_BE", []),
                fare_rules=booking_resp.get("Response", {}).get("Itinerary", {}).get("FareRules", []),
                fare=booking_resp.get("Response", {}).get("Itinerary", {}).get("Fare", {}),
                is_lcc=booking.is_lcc,
            )

            # 3. Extract ticket info
            ticket_response = ticket_data.get("Response", ticket_data)
            ticket_status_val = ticket_response.get("ResponseStatus", 0)

            # Update DB
            booking.ticket_response = ticket_data
            booking.ticket_status = "ticketed" if ticket_status_val == 1 else "ticket_failed"
            booking.ticketed_at = datetime.utcnow() if ticket_status_val == 1 else None
            booking.status = FlightBookingStatus.TICKETED.value if ticket_status_val == 1 else booking.status
            booking.updated_at = datetime.utcnow()

            session.add(booking)
            session.commit()
            session.refresh(booking)

            logger.info("Flight ticketed: PNR=%s, Status=%s", booking.pnr, booking.ticket_status)

            return TicketResponse(
                status=booking.ticket_status,
                booking_id=request.flight_booking_id,
                pnr=booking.pnr,
                ticket_number=booking.ticket_number,
                message="Ticket issued successfully" if ticket_status_val == 1 else "Ticketing failed",
                raw_data=ticket_data,
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Ticketing failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Ticketing failed: {str(e)}")
