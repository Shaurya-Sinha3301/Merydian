"""
Migration: Create itinerary_explanations table

Run this script to add the ItineraryExplanation table to the database.
Usage: python migrate_itinerary_explanations.py
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.core.db import engine
from app.models.itinerary_explanation import ItineraryExplanation
from sqlmodel import SQLModel


def migrate():
    print("Creating itinerary_explanations table...")

    # Create via SQLModel metadata
    SQLModel.metadata.create_all(engine, tables=[ItineraryExplanation.__table__])
    print("✓ itinerary_explanations table created (or already exists).")

    # Verify
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_name = 'itinerary_explanations'"
        ))
        count = result.scalar()
        if count:
            print("✓ Verified: itinerary_explanations table exists.")
        else:
            print("✗ Warning: table may not have been created.")


if __name__ == "__main__":
    migrate()
