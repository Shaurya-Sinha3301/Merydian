"""
Flight Booking Database Model

Represents an individual flight booking made through the TBO Air API.
Each booking tracks the full lifecycle: search → fare quote → book → ticket.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Column
from sqlalchemy.dialects.postgresql import JSONB


class FlightBookingStatus(str, Enum):
    SEARCHING = "searching"
    FARE_QUOTED = "fare_quoted"
    BOOKED = "booked"
    TICKETED = "ticketed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class FlightBooking(SQLModel, table=True):
    """
    Individual flight booking record from TBO Air API.

    Stores the full booking lifecycle: search → fare quote → book → ticket.
    """
    __tablename__ = "flight_bookings"

    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Parent job (optional — can also be standalone)
    job_id: Optional[UUID] = Field(default=None, foreign_key="booking_jobs.id", index=True)

    # Flight identification
    airline: Optional[str] = Field(default=None, max_length=100)
    flight_number: Optional[str] = Field(default=None, max_length=50)
    origin: Optional[str] = Field(default=None, max_length=10)
    destination: Optional[str] = Field(default=None, max_length=10)

    # TBO booking references
    pnr: Optional[str] = Field(default=None, max_length=100)
    booking_id: Optional[str] = Field(default=None, max_length=255)
    trace_id: Optional[str] = Field(default=None, max_length=255)
    result_index: Optional[str] = Field(default=None, max_length=255)

    # Status
    status: str = Field(
        default=FlightBookingStatus.SEARCHING.value, max_length=50, index=True
    )

    # Journey details
    journey_type: Optional[str] = Field(default=None, max_length=20)  # oneway / return
    departure_time: Optional[str] = Field(default=None, max_length=50)
    arrival_time: Optional[str] = Field(default=None, max_length=50)
    return_departure_time: Optional[str] = Field(default=None, max_length=50)
    return_arrival_time: Optional[str] = Field(default=None, max_length=50)
    cabin_class: Optional[str] = Field(default=None, max_length=50)

    # Fare details
    total_fare: Optional[float] = Field(default=None)
    currency: Optional[str] = Field(default=None, max_length=10)
    is_lcc: bool = Field(default=False)

    # Ticketing
    ticket_number: Optional[str] = Field(default=None, max_length=255)
    ticketed_at: Optional[datetime] = Field(default=None)
    ticket_status: Optional[str] = Field(default=None, max_length=50)

    # Passenger details
    passenger_details: dict = Field(default={}, sa_column=Column(JSONB))

    # Full TBO API responses (for debugging / audit)
    search_response: dict = Field(default={}, sa_column=Column(JSONB))
    fare_quote_response: dict = Field(default={}, sa_column=Column(JSONB))
    booking_response: dict = Field(default={}, sa_column=Column(JSONB))
    ticket_response: dict = Field(default={}, sa_column=Column(JSONB))

    # Error tracking
    error_message: Optional[str] = Field(default=None, max_length=2000)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
