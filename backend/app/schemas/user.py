"""
User Profile Schemas

Pydantic models for user profile API endpoints.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, validator


class UserProfileResponse(BaseModel):
    """Response model for user profile."""
    id: UUID
    email: str
    full_name: Optional[str] = None
    role: str
    family_id: Optional[UUID] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    """Request model for updating user profile."""

    full_name: Optional[str] = Field(None, max_length=255)

    @validator('full_name')
    def strip_whitespace(cls, v):
        if v:
            return v.strip()
        return v
