"""
Family & Member Management API Router

Endpoints for managing family details and members.
"""

import logging
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID

from app.core.dependencies import get_current_user
from app.schemas.auth import TokenPayload
from app.schemas.family import (
    FamilyDetailResponse,
    FamilyMemberResponse,
    AddFamilyMemberRequest,
    FamilyUpdateRequest,
)
from app.services.family_service import FamilyService
from app.services.user_service import UserService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/me", response_model=FamilyDetailResponse)
async def get_my_family(
    current_user: Annotated[TokenPayload, Depends(get_current_user)],
):
    """Get the current user's family details including member list."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No family associated with this account",
        )

    family_id = UUID(current_user.family_id)
    family = FamilyService.get_family(family_id)
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found",
        )

    members = FamilyService.get_family_members(family_id)
    member_responses = [
        FamilyMemberResponse(
            id=m.id,
            email=m.email,
            full_name=m.full_name,
            role=m.role,
            is_active=m.is_active,
            created_at=m.created_at,
        )
        for m in members
    ]

    return FamilyDetailResponse(
        id=family.id,
        family_code=family.family_code,
        family_name=family.family_name,
        trip_name=family.trip_name,
        destination=family.destination,
        start_date=family.start_date,
        end_date=family.end_date,
        preferences=family.preferences,
        is_active=family.is_active,
        created_at=family.created_at,
        updated_at=family.updated_at,
        members=member_responses,
    )


@router.get("/me/members", response_model=List[FamilyMemberResponse])
async def list_family_members(
    current_user: Annotated[TokenPayload, Depends(get_current_user)],
):
    """List all members of the current user's family."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No family associated with this account",
        )

    family_id = UUID(current_user.family_id)
    members = FamilyService.get_family_members(family_id)
    return [
        FamilyMemberResponse(
            id=m.id,
            email=m.email,
            full_name=m.full_name,
            role=m.role,
            is_active=m.is_active,
            created_at=m.created_at,
        )
        for m in members
    ]


@router.post("/me/members", response_model=FamilyMemberResponse, status_code=201)
async def add_family_member(
    request: AddFamilyMemberRequest,
    current_user: Annotated[TokenPayload, Depends(get_current_user)],
):
    """
    Add a user to the current user's family by email.

    The target user must already have an account
    and must not belong to another family.
    """
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No family associated with this account",
        )

    family_id = UUID(current_user.family_id)

    # Find user by email
    target_user = UserService.get_user_by_email(request.email)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No user found with email {request.email}",
        )

    # Check if already in a family
    if target_user.family_id and target_user.family_id != family_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already belongs to another family",
        )

    if target_user.family_id == family_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this family",
        )

    updated = FamilyService.add_member(family_id, target_user.id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add member",
        )

    return FamilyMemberResponse(
        id=updated.id,
        email=updated.email,
        full_name=updated.full_name,
        role=updated.role,
        is_active=updated.is_active,
        created_at=updated.created_at,
    )


@router.delete("/me/members/{user_id}", status_code=200)
async def remove_family_member(
    user_id: UUID,
    current_user: Annotated[TokenPayload, Depends(get_current_user)],
):
    """
    Remove a member from the current user's family.

    Cannot remove yourself.
    """
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No family associated with this account",
        )

    if str(user_id) == current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself from the family",
        )

    family_id = UUID(current_user.family_id)
    success = FamilyService.remove_member(family_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in your family",
        )

    return {"message": "Member removed successfully"}
