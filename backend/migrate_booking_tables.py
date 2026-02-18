"""
Migration script to create booking tables.

Run: python migrate_booking_tables.py
"""

from sqlmodel import SQLModel

from app.core.db import engine
from app.models.booking_job import BookingJob
from app.models.hotel_booking import HotelBooking


def migrate():
    """Create booking_jobs and hotel_bookings tables."""
    print("Creating booking tables...")
    SQLModel.metadata.create_all(engine, tables=[
        BookingJob.__table__,
        HotelBooking.__table__,
    ])
    print("✅ booking_jobs and hotel_bookings tables created successfully!")


if __name__ == "__main__":
    migrate()
