"""
Hotel Booking Database Model

Represents an individual hotel booking made through the TBO API.
Each booking is linked to a parent BookingJob.
"""

from datetime import datetime, date
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Column
from sqlalchemy.dialects.postgresql import JSONB


class HotelBookingStatus(str, Enum):
    SEARCHING = "searching"
    SEARCHED = "searched"
    PREBOOKED = "prebooked"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    CANCEL_FAILED = "cancel_failed"
    FAILED = "failed"


class HotelBooking(SQLModel, table=True):
    """
    Individual hotel booking record from TBO API.

    Stores the full booking lifecycle: search → pre-book → book → confirmed.
    """
    __tablename__ = "hotel_bookings"

    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Parent job
    job_id: UUID = Field(foreign_key="booking_jobs.id", index=True)

    # Hotel identification
    hotel_code: Optional[str] = Field(default=None, max_length=50)
    hotel_name: Optional[str] = Field(default=None, max_length=500)

    # TBO booking references
    booking_code: Optional[str] = Field(default=None, max_length=1000)
    trace_id: Optional[str] = Field(default=None, max_length=255)
    confirmation_no: Optional[str] = Field(default=None, max_length=255)
    tbo_booking_id: Optional[str] = Field(default=None, max_length=255)

    # Status
    status: str = Field(
        default=HotelBookingStatus.SEARCHING.value, max_length=50, index=True
    )

    # Stay details
    checkin: Optional[date] = Field(default=None)
    checkout: Optional[date] = Field(default=None)
    room_name: Optional[str] = Field(default=None, max_length=500)
    total_fare: Optional[float] = Field(default=None)
    currency: Optional[str] = Field(default=None, max_length=10)

    # Guest details
    guest_details: dict = Field(default={}, sa_column=Column(JSONB))

    # Full TBO API response (for debugging / audit)
    tbo_response: dict = Field(default={}, sa_column=Column(JSONB))

    # Cancellation tracking
    cancelled_at: Optional[datetime] = Field(default=None)
    refund_amount: Optional[float] = Field(default=None)
    cancellation_charges: Optional[float] = Field(default=None)
    tbo_cancel_response: dict = Field(default={}, sa_column=Column(JSONB))

    # Error tracking
    error_message: Optional[str] = Field(default=None, max_length=2000)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
