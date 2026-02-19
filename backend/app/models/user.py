"""
User Database Model

Represents authenticated users in the system (travellers and agents).
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Relationship


class User(SQLModel, table=True):
    """
    User model for authentication and authorization.
    
    Supports two roles:
    - traveller: Can view itineraries, submit feedback, request POIs
    - agent: Can view options, approve decisions, execute bookings
    """
    __tablename__ = "users"
    
    # Primary Key
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Authentication
    email: str = Field(unique=True, index=True, max_length=255)
    hashed_password: str = Field(max_length=255)
    
    # Profile
    full_name: Optional[str] = Field(default=None, max_length=255)
    role: str = Field(max_length=50)  # 'traveller' or 'agent'
    
    # Family Association (for travellers)
    # Note: Not a foreign key to avoid circular reference
    # Family membership is managed through the families table
    family_id: Optional[UUID] = Field(default=None, index=True)
    
    # Status
    is_active: bool = Field(default=True)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    # family: Optional["Family"] = Relationship(back_populates="members")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "traveller@example.com",
                "full_name": "John Doe",
                "role": "traveller",
                "is_active": True
            }
        }
