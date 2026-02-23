"""
Flight Schemas

Pydantic models for flight API request/response payloads.
Covers search, fare quote, fare rules, SSR, booking, and ticketing.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ------------------------------------------------------------------ #
#  Flight Search
# ------------------------------------------------------------------ #

class FlightSearchRequest(BaseModel):
    """Request for flight search via TBO Air API."""
    origin: str = Field(..., description="Origin airport code (e.g., DEL)")
    destination: str = Field(..., description="Destination airport code (e.g., BOM)")
    departure_date: str = Field(..., description="Departure date YYYY-MM-DDTHH:MM:SS")
    return_date: Optional[str] = Field(default=None, description="Return date for round-trip")
    adults: int = Field(default=1, ge=1, le=9)
    children: int = Field(default=0, ge=0, le=6)
    infants: int = Field(default=0, ge=0, le=4)
    cabin_class: int = Field(default=1, description="1=Economy, 2=PremEcon, 3=Business, 4=First")
    preferred_airlines: Optional[List[str]] = Field(default=None, description="e.g. ['AI', 'UK']")
    sources: Optional[List[str]] = Field(default=None, description="e.g. ['1AA'] for Amadeus")
    direct_flight: bool = Field(default=False)
    one_stop_flight: bool = Field(default=False)
    is_domestic: bool = Field(default=True)
    preferred_currency: str = Field(default="USD")


class FlightSegmentResult(BaseModel):
    """A flight segment in search results."""
    airline: Optional[str] = None
    flight_number: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    duration: Optional[int] = None
    stops: Optional[int] = None
    raw_data: Dict[str, Any] = {}


class FlightResult(BaseModel):
    """Single flight option in search results."""
    result_index: str
    fare: Optional[float] = None
    currency: str = "USD"
    airline: Optional[str] = None
    is_lcc: bool = False
    segments: List[FlightSegmentResult] = []
    raw_data: Dict[str, Any] = {}


class FlightSearchResponse(BaseModel):
    """Response from flight search."""
    status: str
    trace_id: Optional[str] = None
    flights_found: int = 0
    results: List[FlightResult] = []


# ------------------------------------------------------------------ #
#  Fare Quote
# ------------------------------------------------------------------ #

class FareQuoteRequest(BaseModel):
    """Request for fare quote."""
    trace_id: str = Field(..., description="TraceId from search")
    result_index: str = Field(..., description="ResultIndex from search")


class FareQuoteResponse(BaseModel):
    """Response from fare quote."""
    status: str
    fare: Optional[Dict[str, Any]] = None
    segments: Optional[List[Dict[str, Any]]] = None
    validating_airline: Optional[str] = None
    last_ticket_date: Optional[str] = None
    mini_fare_rules: Optional[Any] = None
    fare_classification: Optional[Any] = None
    fare_rules: Optional[Any] = None
    raw_data: Dict[str, Any] = {}


# ------------------------------------------------------------------ #
#  Fare Rules
# ------------------------------------------------------------------ #

class FareRuleRequest(BaseModel):
    """Request for fare rules."""
    trace_id: str = Field(..., description="TraceId from search")
    result_index: str = Field(..., description="ResultIndex from search")


class FareRuleResponse(BaseModel):
    """Response from fare rules."""
    status: str
    fare_rules: Optional[List[Dict[str, Any]]] = None
    raw_data: Dict[str, Any] = {}


# ------------------------------------------------------------------ #
#  SSR (Special Service Requests)
# ------------------------------------------------------------------ #

class SSRRequest(BaseModel):
    """Request for SSR options."""
    trace_id: str = Field(..., description="TraceId from search")
    result_index: str = Field(..., description="ResultIndex from search")


class BaggageOption(BaseModel):
    """Baggage add-on option."""
    code: Optional[str] = None
    description: Optional[str] = None
    weight: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None


class MealOption(BaseModel):
    """Meal add-on option."""
    code: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None


class SSRResponse(BaseModel):
    """Response from SSR options."""
    status: str
    baggage: Optional[List[BaggageOption]] = None
    meals: Optional[List[MealOption]] = None
    seat_dynamic: Optional[List[Dict[str, Any]]] = None
    raw_data: Dict[str, Any] = {}


# ------------------------------------------------------------------ #
#  Flight Booking
# ------------------------------------------------------------------ #

class PassengerDetail(BaseModel):
    """Passenger details for flight booking."""
    title: str = Field(..., description="Mr, Mrs, Ms, Miss")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    date_of_birth: str = Field(..., description="YYYY-MM-DD")
    gender: int = Field(default=1, description="1=Male, 2=Female")
    contact_no: str = Field(..., description="Phone number")
    email: str = Field(..., description="Email address")
    nationality: str = Field(default="IN", description="Country code")
    country: str = Field(default="IN")
    city: str = Field(default="")
    address: str = Field(default="")

    # Passport (for international flights)
    passport_number: Optional[str] = Field(default=None)
    passport_expiry: Optional[str] = Field(default=None)

    # SSR selections
    baggage_code: Optional[str] = Field(default=None)
    meal_code: Optional[str] = Field(default=None)
    seat_code: Optional[str] = Field(default=None)


class FlightBookingRequest(BaseModel):
    """Request to book a flight."""
    trace_id: str = Field(..., description="TraceId from search")
    result_index: str = Field(..., description="ResultIndex from search")
    passengers: List[PassengerDetail] = Field(..., description="Passenger details")

    # These come from FareQuote response
    segments_be: Any = Field(..., description="Segments from FareQuote")
    fare: Any = Field(..., description="Fare from FareQuote")
    fare_rules: Any = Field(default=None, description="FareRules from FareRule")
    mini_fare_rules: Any = Field(default=None)
    fare_classification: Any = Field(default=None)

    # LCC-specific
    is_lcc: bool = Field(default=False)
    source_session_id: Optional[str] = Field(default=None)
    order_key: Optional[str] = Field(default=None)


class FlightBookingResponse(BaseModel):
    """Response from flight booking."""
    status: str
    booking_id: Optional[str] = None
    pnr: Optional[str] = None
    message: str
    raw_data: Dict[str, Any] = {}


# ------------------------------------------------------------------ #
#  Ticketing
# ------------------------------------------------------------------ #

class TicketRequest(BaseModel):
    """Request to issue ticket for a booked flight."""
    flight_booking_id: str = Field(..., description="UUID of the FlightBooking record")


class TicketResponse(BaseModel):
    """Response from ticketing."""
    status: str
    booking_id: Optional[str] = None
    pnr: Optional[str] = None
    ticket_number: Optional[str] = None
    message: str
    raw_data: Dict[str, Any] = {}
