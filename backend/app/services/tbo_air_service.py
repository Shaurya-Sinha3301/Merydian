"""
TBO Air API Service — REST Client

Production-ready REST client for TBO Air API.
Handles token-based authentication, flight search, fare quoting,
fare rules, SSR (baggage/seats/meals), booking, and ticketing.

Follows the same pattern as tbo_service.py (Hotel API client).
"""

import logging
import time
from typing import Optional, List, Dict, Any

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)


class TBOAirClient:
    """
    REST client for TBO Air API.

    Uses token-based authentication (via Authenticate/ValidateAgency).
    Two base URLs:
        - booking_url: for Auth, Book, Ticket
        - search_url: for Search, FareQuote, FareRule, SSR
    """

    def __init__(
        self,
        auth_url: Optional[str] = None,
        service_url: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
    ):
        self.auth_url = (auth_url or getattr(settings, 'TBO_AIR_AUTHENTICATE_URL', 'http://Sharedapi.tektravels.com/SharedData.svc/rest')).rstrip("/")
        self.service_url = (service_url or getattr(settings, 'TBO_AIR_SERVICE_URL', 'http://api.tektravels.com/BookingEngineService_Air/AirService.svc/rest')).rstrip("/")
        self.username = username or settings.TBO_AIR_USERNAME
        self.password = password or settings.TBO_AIR_PASSWORD
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
        }

        # Token cache
        self._token_id: Optional[str] = None
        self._token_timestamp: float = 0
        self._token_ttl: float = 3600  # 1 hour default TTL

    # ------------------------------------------------------------------ #
    #  HTTP helpers
    # ------------------------------------------------------------------ #

    def _post(self, base_url: str, endpoint: str, payload: dict) -> dict:
        url = f"{base_url}/{endpoint}"
        logger.info("TBO Air POST %s", url)
        resp = requests.post(
            url, json=payload, headers=self.headers, timeout=60
        )
        logger.info("TBO Air HTTP %d", resp.status_code)
        if resp.status_code >= 400:
            logger.error("TBO Air Error: %s", resp.text[:1000])
        resp.raise_for_status()
        return resp.json()

    def _auth_post(self, endpoint: str, payload: dict) -> dict:
        """POST to the authentication base URL."""
        return self._post(self.auth_url, endpoint, payload)

    def _service_post(self, endpoint: str, payload: dict) -> dict:
        """POST to the air service base URL (Search, Booking, SSR, etc.)."""
        return self._post(self.service_url, endpoint, payload)

    # ------------------------------------------------------------------ #
    #  Task 3: Authentication & Token Management
    # ------------------------------------------------------------------ #

    def authenticate(self) -> str:
        """
        POST /Authenticate → Get auth token.

        Returns:
            TokenId string for use in all subsequent API calls.
        """
        payload = {
            "ClientId": "ApiIntegrationNew",
            "UserName": self.username,
            "Password": self.password,
            "EndUserIp": "192.168.10.36",
        }
        data = self._auth_post("Authenticate", payload)

        token_id = data.get("TokenId")
        if not token_id:
            error = data.get("Error", {})
            raise ValueError(
                f"TBO Air authentication failed: {error.get('ErrorMessage', 'Unknown error')}"
            )

        self._token_id = token_id
        self._token_timestamp = time.time()
        logger.info("TBO Air authenticated. TokenId: %s...", token_id[:20])
        return token_id

    def get_token(self) -> str:
        """Get a valid token, auto-refreshing if expired."""
        if (
            not self._token_id
            or (time.time() - self._token_timestamp) > self._token_ttl
        ):
            self.authenticate()
        return self._token_id

    # ------------------------------------------------------------------ #
    #  Task 4: Flight Search
    # ------------------------------------------------------------------ #

    def search_flights(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        return_date: Optional[str] = None,
        adults: int = 1,
        children: int = 0,
        infants: int = 0,
        cabin_class: int = 1,
        preferred_airlines: Optional[List[str]] = None,
        sources: Optional[List[str]] = None,
        direct_flight: bool = False,
        one_stop_flight: bool = False,
        is_domestic: bool = True,
        preferred_currency: str = "USD",
        end_user_ip: str = "192.168.10.36",
    ) -> Dict[str, Any]:
        """
        POST /Search/ → Search available flights.

        Args:
            origin: Airport code (e.g., "DEL")
            destination: Airport code (e.g., "BOM")
            departure_date: YYYY-MM-DDTHH:MM:SS format
            return_date: For round-trip, YYYY-MM-DDTHH:MM:SS format (None = oneway)
            adults: Number of adult passengers
            children: Number of child passengers
            infants: Number of infant passengers
            cabin_class: 1=Economy, 2=PremiumEconomy, 3=Business, 4=First
            preferred_airlines: List of airline codes (e.g., ["AI", "UK"])
            sources: List of sources (e.g., ["1AA"] for Amadeus, ["SG"] for SpiceJet)
            direct_flight: Only show direct flights
            one_stop_flight: Only show one-stop flights
            is_domestic: True for domestic, False for international
            preferred_currency: Currency code
            end_user_ip: End user IP address

        Returns:
            Full search response with Results[][] and TraceId
        """
        token_id = self.get_token()
        journey_type = 2 if return_date else 1  # 1=Oneway, 2=Return

        segments = [
            {
                "Origin": origin,
                "Destination": destination,
                "PreferredDepartureTime": departure_date,
                "PreferredArrivalTime": departure_date,
                "FlightCabinClass": cabin_class,
            }
        ]

        # Add return segment for round-trip
        if return_date:
            segments.append({
                "Origin": destination,
                "Destination": origin,
                "PreferredDepartureTime": return_date,
                "PreferredArrivalTime": return_date,
                "FlightCabinClass": cabin_class,
            })

        payload = {
            "AdultCount": str(adults),
            "ChildCount": str(children),
            "InfantCount": str(infants),
            "IsDomestic": str(is_domestic).lower(),
            "BookingMode": "5",
            "DirectFlight": str(direct_flight).lower(),
            "OneStopFlight": str(one_stop_flight).lower(),
            "JourneyType": str(journey_type),
            "EndUserIp": end_user_ip,
            "TokenId": token_id,
            "PreferredAirlines": preferred_airlines or [],
            "Sources": sources or ["1AA"],
            "Segments": segments,
            "ResultFareType": 0,
            "PreferredCurrency": preferred_currency,
        }
        return self._service_post("Search", payload)

    # ------------------------------------------------------------------ #
    #  Task 5: Fare Quote & Fare Rules
    # ------------------------------------------------------------------ #

    def get_fare_quote(
        self,
        trace_id: str,
        result_index: str,
        end_user_ip: str = "192.168.10.36",
    ) -> Dict[str, Any]:
        """
        POST /FareQuote/ → Get exact fare for a search result.

        Returns:
            Fare, Segments, ValidatingAirline, LastTicketDate,
            MiniFareRules, FareClassification
        """
        token_id = self.get_token()
        payload = {
            "EndUserIp": end_user_ip,
            "TraceId": trace_id,
            "TokenId": token_id,
            "ResultIndex": result_index,
        }
        return self._service_post("FareQuote", payload)

    def get_fare_rules(
        self,
        trace_id: str,
        result_index: str,
        end_user_ip: str = "192.168.10.36",
    ) -> Dict[str, Any]:
        """
        POST /FareRule/ → Get cancellation/change rules.

        Returns:
            Detailed FareRules array with cancellation policies, date change fees, etc.
        """
        token_id = self.get_token()
        payload = {
            "EndUserIp": end_user_ip,
            "TraceId": trace_id,
            "TokenId": token_id,
            "ResultIndex": result_index,
        }
        return self._service_post("FareRule", payload)

    # ------------------------------------------------------------------ #
    #  Task 6: SSR (Special Service Requests)
    # ------------------------------------------------------------------ #

    def get_ssr(
        self,
        trace_id: str,
        result_index: str,
        end_user_ip: str = "192.168.10.36",
    ) -> Dict[str, Any]:
        """
        POST /SSR/ → Get Special Service Request options.

        Returns:
            Baggage options, SeatDynamic (seat maps), Meal options
        """
        token_id = self.get_token()
        payload = {
            "EndUserIp": end_user_ip,
            "TraceId": trace_id,
            "TokenId": token_id,
            "ResultIndex": result_index,
        }
        return self._service_post("SSR", payload)

    # ------------------------------------------------------------------ #
    #  Task 7: Flight Booking (PNR Creation)
    # ------------------------------------------------------------------ #

    def book_flight(
        self,
        result_index: str,
        trace_id: str,
        passengers: List[Dict[str, Any]],
        segments_be: Any,
        fare_rules: Any,
        fare: Any,
        mini_fare_rules: Any = None,
        fare_classification: Any = None,
        is_lcc: bool = False,
        source_session_id: Optional[str] = None,
        order_key: Optional[str] = None,
        end_user_ip: str = "192.168.10.36",
    ) -> Dict[str, Any]:
        """
        POST /Booking/Book → Create PNR / book flight.

        Args:
            result_index: ResultIndex from search
            trace_id: TraceId from search
            passengers: List of passenger dicts with:
                - Title, FirstName, LastName, DateOfBirth, Gender
                - ContactNo, Email, Nationality, Country, City, Address
                - Fare_BE (fare object per passenger)
                - Optional: IdDetails for passport (IdType=1, IdNumber, ExpiryDate)
                - Optional: PaxBaggage, PaxMeal, PaxSeat for SSR selections
            segments_be: Segments from FareQuote response
            fare_rules: FareRules from FareRule response
            fare: Fare object from FareQuote response
            mini_fare_rules: MiniFareRules from FareQuote
            fare_classification: FareClassification from FareQuote
            is_lcc: True for LCC carriers (different FlightBookingSource)
            source_session_id: Required for LCC bookings
            order_key: Required for LCC bookings

        Returns:
            PNR, Itinerary, BookingId
        """
        token_id = self.get_token()

        itinerary = {
            "AgencySalesRepresentative": 0,
            "IsHoldEligibleForLcc": False,
            "IsManual": False,
            "IssuancePCC": None,
            "FlightId": 0,
            "Segments_BE": segments_be,
            "Passenger": passengers,
            "FareRules": fare_rules,
        }

        # LCC vs GDS specific fields
        if is_lcc:
            itinerary["FlightBookingSource"] = 100
            itinerary["IsLcc"] = True
            if source_session_id:
                itinerary["SourceSessionId"] = source_session_id
            if order_key:
                itinerary["OrderKey"] = order_key
        else:
            itinerary["FlightBookingSource"] = 72
            itinerary["IsLcc"] = False

        payload = {
            "ResultId": result_index,
            "Itinerary": itinerary,
            "EndUserIp": end_user_ip,
            "TraceId": trace_id,
            "TokenId": token_id,
        }

        if mini_fare_rules:
            payload["MiniFareRules"] = mini_fare_rules
        if fare_classification:
            payload["FareClassification"] = fare_classification

        return self._service_post("Booking/Book", payload)

    # ------------------------------------------------------------------ #
    #  Task 8: Ticketing (E-Ticket Issuance)
    # ------------------------------------------------------------------ #

    def issue_ticket(
        self,
        result_index: str,
        trace_id: str,
        pnr: str,
        passengers: List[Dict[str, Any]],
        segments_be: Any,
        fare_rules: Any,
        fare: Any,
        mini_fare_rules: Any = None,
        fare_classification: Any = None,
        is_lcc: bool = False,
        source_session_id: Optional[str] = None,
        order_key: Optional[str] = None,
        end_user_ip: str = "192.168.10.36",
    ) -> Dict[str, Any]:
        """
        POST /Booking/Ticket → Issue actual e-ticket on a confirmed PNR.

        Same payload as book_flight but includes the PNR from booking response.
        For GDS: Two-step flow (Book creates PNR → Ticket issues e-ticket)
        For LCC: Single-step (Ticket call does both)

        Returns:
            Ticketed itinerary with ticket numbers
        """
        token_id = self.get_token()

        itinerary = {
            "AgencySalesRepresentative": 0,
            "IsHoldEligibleForLcc": False,
            "IsManual": False,
            "IssuancePCC": None,
            "FlightId": 0,
            "Segments_BE": segments_be,
            "Passenger": passengers,
            "FareRules": fare_rules,
            "PNR": pnr,
        }

        if is_lcc:
            itinerary["FlightBookingSource"] = 100
            itinerary["IsLcc"] = True
            if source_session_id:
                itinerary["SourceSessionId"] = source_session_id
            if order_key:
                itinerary["OrderKey"] = order_key
        else:
            itinerary["FlightBookingSource"] = 72
            itinerary["IsLcc"] = False

        payload = {
            "ResultId": result_index,
            "Itinerary": itinerary,
            "EndUserIp": end_user_ip,
            "TraceId": trace_id,
            "TokenId": token_id,
        }

        if mini_fare_rules:
            payload["MiniFareRules"] = mini_fare_rules
        if fare_classification:
            payload["FareClassification"] = fare_classification

        return self._service_post("Booking/Ticket", payload)

    # ------------------------------------------------------------------ #
    #  Task 9: Get Booking Details
    # ------------------------------------------------------------------ #

    def get_booking_details(
        self,
        pnr: str,
        booking_id: str,
        end_user_ip: str = "192.168.10.36",
    ) -> Dict[str, Any]:
        """
        POST /Booking/GetBookingDetails → Retrieve latest status of PNR.

        Returns:
            Booking details including TicketStatus, PNR, Itinerary.
        """
        token_id = self.get_token()
        payload = {
            "EndUserIp": end_user_ip,
            "TokenId": token_id,
            "PNR": pnr,
            "BookingId": booking_id
        }
        return self._service_post("Booking/GetBookingDetails", payload)

    # ------------------------------------------------------------------ #
    #  Task 10: Cancellations
    # ------------------------------------------------------------------ #

    def cancel_booking(
        self,
        booking_id: str,
        request_type: int = 1,
        cancellation_type: int = 3,
        remarks: str = "Customer requested cancellation",
        end_user_ip: str = "192.168.10.36",
    ) -> Dict[str, Any]:
        """
        POST /Booking/SendChangeRequest → Cancel a PNR/Booking.

        Args:
            booking_id: The TBO BookingId
            request_type: 1=Cancellation, 2=Amendment
            cancellation_type: 1=NoShow, 2=FlightCancelled, 3=ChangedMind
        """
        token_id = self.get_token()
        payload = {
            "EndUserIp": end_user_ip,
            "TokenId": token_id,
            "BookingId": booking_id,
            "RequestType": request_type,
            "CancellationType": cancellation_type,
            "Remarks": remarks
        }
        return self._service_post("Booking/SendChangeRequest", payload)


# Module-level singleton
tbo_air_client = TBOAirClient()
