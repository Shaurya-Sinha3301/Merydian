"""
User Profile API Router

Endpoints for viewing and updating user profiles.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID

from app.core.dependencies import get_current_user
from app.schemas.auth import TokenPayload
from app.schemas.user import UserProfileResponse, UserProfileUpdate
from app.services.user_service import UserService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    current_user: Annotated[TokenPayload, Depends(get_current_user)],
):
    """Get the current user's profile."""
    user = UserService.get_user(UUID(current_user.sub))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        family_id=user.family_id,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.patch("/me", response_model=UserProfileResponse)
async def update_my_profile(
    update_data: UserProfileUpdate,
    current_user: Annotated[TokenPayload, Depends(get_current_user)],
):
    """
    Update the current user's profile.

    Only `full_name` can be updated via self-service.
    Email and role changes require admin action.
    """
    user_id = UUID(current_user.sub)
    user = UserService.update_user_profile(user_id, update_data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        family_id=user.family_id,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )
