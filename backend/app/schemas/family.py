"""
Family & Member Management Schemas

Pydantic models for family and member management API endpoints.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, validator


class FamilyMemberResponse(BaseModel):
    """Response model for a family member."""
    id: UUID
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FamilyDetailResponse(BaseModel):
    """Response model for family details with members."""
    id: UUID
    family_code: str
    family_name: str
    trip_name: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    preferences: dict = {}
    is_active: bool
    created_at: datetime
    updated_at: datetime
    members: List[FamilyMemberResponse] = []

    class Config:
        from_attributes = True


class AddFamilyMemberRequest(BaseModel):
    """Request model for adding a member to a family."""
    email: EmailStr = Field(..., description="Email of the user to add")


class FamilyUpdateRequest(BaseModel):
    """Request model for updating family details."""

    family_name: Optional[str] = Field(None, max_length=255)
    trip_name: Optional[str] = Field(None, max_length=255)
    destination: Optional[str] = Field(None, max_length=255)

    @validator('family_name', 'trip_name', 'destination')
    def strip_whitespace(cls, v):
        if v:
            return v.strip()
        return v
