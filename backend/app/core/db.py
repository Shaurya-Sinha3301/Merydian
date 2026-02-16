"""
Database configuration and initialization.
"""

from sqlmodel import SQLModel, create_engine
from app.core.config import settings

# Import all models to ensure they are registered with SQLModel
from app.models.user import User
from app.models.family import Family
from app.models.itinerary import Itinerary
from app.models.event import Event
from app.models.preference import Preference
from app.models.trip_session import TripSession

# Create engine with connection pooling
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI, 
    echo=True,
    pool_pre_ping=True,  # Verify connections before using them
)

def init_db():
    """
    Create all database tables.
    
    This should be called on application startup or via migration tools.
    """
    SQLModel.metadata.create_all(engine)
    print("✅ Database tables created successfully!")


def get_engine():
    """Get the database engine instance."""
    return engine
