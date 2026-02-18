"""
Booking Schemas

Pydantic models for booking API request/response payloads.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import date

from pydantic import BaseModel, Field


# ------------------------------------------------------------------ #
#  Enums
# ------------------------------------------------------------------ #

class BookingItemType(str, Enum):
    HOTEL = "hotel"
    FLIGHT = "flight"
    BUS = "bus"
    TRAIN = "train"
    RESTAURANT = "restaurant"
    ACTIVITY = "activity"
    TRANSFER = "transfer"


class BookingStatusEnum(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    PARTIAL_FAILURE = "partial_failure"
    FAILED = "failed"


# ------------------------------------------------------------------ #
#  Guest / Passenger
# ------------------------------------------------------------------ #

class GuestDetail(BaseModel):
    """Passenger/guest details for hotel booking."""
    Title: str = Field(default="Mr", description="Mr, Mrs, Ms, Miss")
    FirstName: str = Field(..., description="Guest first name")
    MiddleName: str = Field(default="")
    LastName: str = Field(..., description="Guest last name")
    Phoneno: str = Field(..., description="Phone number")
    Email: str = Field(..., description="Email address")
    PaxType: int = Field(default=1, description="1=Adult, 2=Child")
    LeadPassenger: bool = Field(default=True)
    Age: int = Field(default=30)
    PassportNo: str = Field(default="")
    PassportIssueDate: str = Field(default="")
    PassportExpDate: str = Field(default="")
    PAN: str = Field(default="")


# ------------------------------------------------------------------ #
#  Execute Booking
# ------------------------------------------------------------------ #

class BookingExecuteRequest(BaseModel):
    """Request to execute a booking for an itinerary."""
    itinerary_id: str = Field(..., description="ID of the itinerary to book")
    items: List[BookingItemType] = Field(..., description="Item types to book")

    # Hotel search parameters
    city_code: str = Field(default="418069", description="TBO city code (default: Delhi NCR)")
    checkin: str = Field(..., description="Check-in date (YYYY-MM-DD)")
    checkout: str = Field(..., description="Check-out date (YYYY-MM-DD)")
    rooms: int = Field(default=1, ge=1, le=10)
    adults: int = Field(default=2, ge=1, le=10)
    children: int = Field(default=0, ge=0, le=6)
    nationality: str = Field(default="IN", max_length=2)

    # Guest details
    guests: List[GuestDetail] = Field(default=[], description="Guest details for booking")


class BookingExecuteResponse(BaseModel):
    """Response after initiating a booking."""
    job_id: str = Field(..., description="Booking job UUID for tracking")
    status: BookingStatusEnum = Field(..., description="Initial job status")
    message: str = Field(..., description="Status message")


# ------------------------------------------------------------------ #
#  Job Status
# ------------------------------------------------------------------ #

class HotelBookingDetail(BaseModel):
    """Details of a single hotel booking within a job."""
    id: str
    hotel_code: Optional[str] = None
    hotel_name: Optional[str] = None
    room_name: Optional[str] = None
    status: str
    checkin: Optional[str] = None
    checkout: Optional[str] = None
    total_fare: Optional[float] = None
    currency: Optional[str] = None
    confirmation_no: Optional[str] = None
    tbo_booking_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[str] = None


class BookingJobStatusResponse(BaseModel):
    """Full status of a booking job including hotel booking details."""
    job_id: str
    itinerary_id: str
    agent_id: str
    status: str
    items_requested: List[str] = []
    items_completed: Dict[str, Any] = {}
    error_message: Optional[str] = None
    hotel_bookings: List[HotelBookingDetail] = []
    created_at: str
    updated_at: str


# ------------------------------------------------------------------ #
#  Hotel Search (Direct)
# ------------------------------------------------------------------ #

class HotelSearchRequest(BaseModel):
    """Request for direct hotel search via TBO API."""
    city_code: str = Field(..., description="TBO city code")
    checkin: str = Field(..., description="YYYY-MM-DD")
    checkout: str = Field(..., description="YYYY-MM-DD")
    rooms: int = Field(default=1, ge=1, le=10)
    adults: int = Field(default=2, ge=1, le=10)
    children: int = Field(default=0, ge=0, le=6)
    children_ages: Optional[List[int]] = Field(default=None)
    nationality: str = Field(default="IN", max_length=2)
    max_hotels: int = Field(default=50, ge=1, le=200, description="Max hotel codes to search")


class HotelResult(BaseModel):
    """Single hotel in search results."""
    hotel_code: str
    currency: str = "USD"
    rooms: List[Dict[str, Any]] = []


class HotelSearchResponse(BaseModel):
    """Response from hotel search."""
    status: str
    trace_id: Optional[str] = None
    hotels_found: int = 0
    results: List[HotelResult] = []
