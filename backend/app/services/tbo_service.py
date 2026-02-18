"""
TBO Hotel API Service — REST Client

Production-ready REST client for TBO Holidays Hotel API.
Replaces the previous SOAP/WSDL implementation with the proven REST approach.

API Docs: backend/test/TBO_HOTEL_API_DOCS.md
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import date

import requests
from requests.auth import HTTPBasicAuth

from app.core.config import settings

logger = logging.getLogger(__name__)


class TBOHotelClient:
    """
    REST client for TBO Holidays Hotel API.

    All endpoints use HTTP Basic Auth and JSON payloads.
    Base URL: http://api.tbotechnology.in/TBOHolidays_HotelAPI
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
    ):
        self.base_url = base_url or settings.TBO_API_URL
        self.auth = HTTPBasicAuth(
            username or settings.TBO_USERNAME,
            password or settings.TBO_PASSWORD,
        )
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    # ------------------------------------------------------------------ #
    #  HTTP helpers
    # ------------------------------------------------------------------ #

    def _get(self, endpoint: str) -> dict:
        url = f"{self.base_url}/{endpoint}"
        logger.info("TBO GET %s", url)
        resp = requests.get(url, auth=self.auth, headers=self.headers, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def _post(self, endpoint: str, payload: dict) -> dict:
        url = f"{self.base_url}/{endpoint}"
        logger.info("TBO POST %s", url)
        resp = requests.post(
            url, json=payload, auth=self.auth, headers=self.headers, timeout=60
        )
        logger.info("TBO HTTP %d", resp.status_code)
        if resp.status_code >= 400:
            logger.error("TBO Error: %s", resp.text[:1000])
        resp.raise_for_status()
        return resp.json()

    # ------------------------------------------------------------------ #
    #  Discovery
    # ------------------------------------------------------------------ #

    def get_countries(self) -> List[Dict[str, Any]]:
        """GET /CountryList → [{"Code": "IN", "Name": "India"}, ...]"""
        return self._get("CountryList").get("CountryList", [])

    def get_cities(self, country_code: str) -> List[Dict[str, Any]]:
        """POST /CityList → [{"Code": "418069", "Name": "Delhi NCR"}, ...]"""
        data = self._post("CityList", {"CountryCode": country_code})
        return data.get("CityList", [])

    def get_hotel_codes(
        self, city_code: str, detailed: bool = True
    ) -> List[Dict[str, Any]]:
        """
        POST /TBOHotelCodeList → hotel codes + metadata for a city.

        Returns list of dicts with HotelCode, HotelName, HotelRating, etc.
        """
        data = self._post(
            "TBOHotelCodeList",
            {"CityCode": city_code, "IsDetailedResponse": detailed},
        )
        return data.get("Hotels", [])

    # ------------------------------------------------------------------ #
    #  Search
    # ------------------------------------------------------------------ #

    def search_hotels(
        self,
        hotel_codes: List[str],
        checkin: str,
        checkout: str,
        rooms: int = 1,
        adults: int = 2,
        children: int = 0,
        children_ages: Optional[List[int]] = None,
        nationality: str = "IN",
    ) -> Dict[str, Any]:
        """
        POST /Search → Full search response with HotelResult and TraceId.

        Args:
            hotel_codes: List of hotel code strings from get_hotel_codes()
            checkin: YYYY-MM-DD format
            checkout: YYYY-MM-DD format
            rooms: Number of rooms
            adults: Adults per room
            children: Children per room
            children_ages: Ages of children (if any)
            nationality: ISO 2-letter country code

        Returns:
            Full API response with Status, TraceId, HotelResult[]
        """
        payload = {
            "CheckIn": checkin,
            "CheckOut": checkout,
            "NoOfRooms": str(rooms),
            "GuestNationality": nationality,
            "PaxRooms": [
                {
                    "Adults": adults,
                    "Children": children,
                    "ChildrenAges": children_ages,
                }
                for _ in range(rooms)
            ],
            "ResponseTime": 23.0,
            "IsDetailedResponse": True,
            "Filters": {"Refundable": False, "NoOfRooms": 0, "MealType": 0},
            "HotelCodes": ",".join(hotel_codes),
        }
        return self._post("Search", payload)

    # ------------------------------------------------------------------ #
    #  Hotel Details
    # ------------------------------------------------------------------ #

    def get_hotel_details(
        self, hotel_codes: str, language: str = "EN"
    ) -> List[Dict[str, Any]]:
        """POST /Hoteldetails → rich hotel metadata (name, address, images, facilities)."""
        data = self._post(
            "Hoteldetails", {"Hotelcodes": hotel_codes, "Language": language}
        )
        return data.get("HotelDetails", [])

    # ------------------------------------------------------------------ #
    #  Booking Flow
    # ------------------------------------------------------------------ #

    def pre_book(self, booking_code: str, trace_id: str) -> Dict[str, Any]:
        """POST /PreBook → Confirm current pricing before final booking."""
        return self._post(
            "PreBook", {"BookingCode": booking_code, "TraceId": trace_id}
        )

    def book(
        self, booking_code: str, trace_id: str, passengers: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        POST /Book → Create confirmed hotel booking.

        Args:
            booking_code: From Search → Rooms[].BookingCode
            trace_id: From Search → TraceId
            passengers: List of guest details:
                - Title, FirstName, LastName, Phoneno, Email
                - PaxType (1=Adult, 2=Child), LeadPassenger (bool)
                - Optional: Age, PassportNo, PAN

        Returns:
            Full response with BookResult containing:
            BookingStatus, ConfirmationNo, BookingId, TotalFare, etc.
        """
        return self._post(
            "Book",
            {
                "BookingCode": booking_code,
                "TraceId": trace_id,
                "Passengers": passengers,
            },
        )

    def get_booking_detail(self, booking_id: str) -> Dict[str, Any]:
        """POST /BookingDetail → Retrieve confirmed booking details."""
        return self._post("BookingDetail", {"BookingId": booking_id})


# Module-level singleton
tbo_client = TBOHotelClient()
