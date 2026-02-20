"""
Database migration to add trip_sessions table

Run this script to create the trip_sessions table in the database.
"""

import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlmodel import SQLModel, create_engine
from app.core.config import settings
from app.models.trip_session import TripSession

def run_migration():
    """Create trip_sessions table"""
    print("Running database migration: Adding trip_sessions table...")
    
    # Create engine
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI, echo=True)
    
    # Create tables
    SQLModel.metadata.create_all(engine, tables=[TripSession.__table__])
    
    print("✓ Migration completed successfully!")
    print("  - trip_sessions table created")

if __name__ == "__main__":
    run_migration()
