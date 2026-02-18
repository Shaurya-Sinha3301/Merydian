"""
Migration: Create itinerary_options table

Run: python migrate_itinerary_options.py
"""

import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from sqlmodel import SQLModel
from app.core.db import engine

# Import the model so SQLModel registers it
from app.models.itinerary_option import ItineraryOptionDB  # noqa: F401


def migrate():
    """Create the itinerary_options table and indexes."""
    print("Creating itinerary_options table...")
    SQLModel.metadata.create_all(engine, tables=[ItineraryOptionDB.__table__])
    print("✅ itinerary_options table created successfully!")


if __name__ == "__main__":
    migrate()
