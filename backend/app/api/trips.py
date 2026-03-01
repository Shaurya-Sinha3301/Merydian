"""
Trip API - Endpoints for trip initialization and management

Provides endpoints for:
- Creating trips with initial family preferences
- Getting trip summaries
- Updating family preferences
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Annotated
from datetime import date

from app.services.trip_service import TripService

router = APIRouter(prefix="/trips", tags=["trips"])


# ============================================================================
# Request/Response Models
# ============================================================================

class InterestVector(BaseModel):
    """Interest weights for different POI categories (0.0-1.0)"""
    history: float = Field(ge=0.0, le=1.0, description="Interest in historical sites")
    architecture: float = Field(ge=0.0, le=1.0, description="Interest in architectural landmarks")
    food: float = Field(ge=0.0, le=1.0, description="Interest in food experiences")
    nature: float = Field(ge=0.0, le=1.0, description="Interest in natural attractions")
    nightlife: float = Field(ge=0.0, le=1.0, description="Interest in nightlife")
    shopping: float = Field(ge=0.0, le=1.0, description="Interest in shopping")
    religious: float = Field(ge=0.0, le=1.0, description="Interest in religious sites")
    adventure: Optional[float] = Field(default=0.5, ge=0.0, le=1.0, description="Interest in adventure activities")
    culture: Optional[float] = Field(default=0.5, ge=0.0, le=1.0, description="Interest in cultural experiences")


class FamilyPreference(BaseModel):
    """Complete preference profile for a family"""
    
    # Identification
    family_id: str = Field(..., description="Unique family identifier (e.g., 'FAM_A')")
    family_name: Optional[str] = Field(None, description="Human-readable family name")
    
    # Demographics
    members: int = Field(..., gt=0, description="Total number of family members")
    children: int = Field(default=0, ge=0, description="Number of children in family")
    
    # Behavioral preferences
    budget_sensitivity: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="How cost-conscious (0.0=unlimited budget, 1.0=very budget conscious)"
    )
    energy_level: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Energy level (0.0=low energy, 1.0=very energetic)"
    )
    pace_preference: str = Field(
        default="moderate",
        description="Trip pacing preference"
    )
    
    # Interests
    interest_vector: InterestVector = Field(..., description="Interest weights for POI categories")
    
    # Hard constraints
    must_visit_locations: List[str] = Field(
        default_factory=list,
        description="POI IDs that MUST be included in itinerary"
    )
    never_visit_locations: List[str] = Field(
        default_factory=list,
        description="POI IDs that MUST NOT be included in itinerary"
    )
    
    # Optional metadata
    notes: Optional[str] = Field(None, description="Additional notes about family preferences")
    dietary_restrictions: List[str] = Field(default_factory=list, description="Dietary restrictions")
    accessibility_needs: List[str] = Field(default_factory=list, description="Accessibility requirements")
    
    @validator("pace_preference")
    def validate_pace(cls, v):
        """Ensure pace is valid"""
        valid_paces = ["relaxed", "moderate", "fast"]
        if v not in valid_paces:
            raise ValueError(f"pace_preference must be one of {valid_paces}")
        return v
    
    @validator("children")
    def validate_children(cls, v, values):
        """Ensure children count doesn't exceed total members"""
        if "members" in values and v > values["members"]:
            raise ValueError("children cannot exceed total members")
        return v


class InitializeTripRequest(BaseModel):
    """Request to initialize a new trip"""
    
    trip_name: str = Field(..., min_length=1, max_length=200, description="Name of the trip")
    destination: str = Field(..., min_length=1, max_length=100, description="Trip destination")
    start_date: str = Field(..., description="Start date in ISO 8601 format (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date in ISO 8601 format (YYYY-MM-DD)")
    baseline_itinerary: str = Field(
        ...,
        description="Baseline itinerary name (e.g., 'delhi_3day_skeleton') or path"
    )
    families: List[FamilyPreference] = Field(
        ...,
        min_items=1,
        description="List of family preference profiles"
    )
    
    @validator("end_date")
    def validate_dates(cls, v, values):
        """Ensure end date is after start date"""
        if "start_date" in values:
            from datetime import datetime
            try:
                start = datetime.fromisoformat(values["start_date"])
                end = datetime.fromisoformat(v)
                if end < start:
                    raise ValueError("end_date must be after start_date")
            except ValueError as e:
                if "must be after" not in str(e):
                    raise ValueError(f"Invalid date format: {e}")
                raise
        return v


class TripSummary(BaseModel):
    """Summary of trip metrics"""
    families_registered: int
    total_members: int
    total_children: int
    trip_duration_days: int
    baseline_itinerary: str


class InitializeTripResponse(BaseModel):
    """Response after successful trip initialization"""
    success: bool
    trip_id: str
    trip_session_id: str
    message: str
    summary: TripSummary
    next_steps: List[str]


# ---------- New: Initialize with optimizer ----------

class TravellerEmailEntry(BaseModel):
    """Email entry for a traveller to be registered during trip init."""
    email: str = Field(..., description="Email address of the traveller")
    full_name: Optional[str] = Field(None, description="Full name of the traveller")
    members: int = Field(default=2, ge=1, description="Number of family members")
    children: int = Field(default=0, ge=0, description="Number of children")


class InitializeTripWithOptiRequest(BaseModel):
    """Simplified request — only basics + family IDs. Preferences auto-fetched from DB."""

    trip_name: str = Field(..., min_length=1, max_length=200, description="Name of the trip")
    destination: str = Field(..., min_length=1, max_length=100, description="Trip destination")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD)")
    family_ids: List[str] = Field(
        default_factory=list, description="Family codes (e.g. ['FAM_A', 'FAM_B']). Can be empty if emails are provided."
    )
    traveller_emails: List[TravellerEmailEntry] = Field(
        default_factory=list,
        description="List of traveller emails to auto-register. Creates users + families if they don't exist."
    )
    num_travellers: Optional[int] = Field(
        default=None, ge=1, description="Total traveller count (informational)"
    )
    auto_approve: bool = Field(
        default=False,
        description="If true, automatically approve the generated itinerary without agent review"
    )
    custom_baseline: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional custom baseline itinerary built by the agent in Activity Architect. "
                    "When provided, this overrides the default static skeleton lookup."
    )

    @validator("end_date")
    def validate_dates(cls, v, values):
        if "start_date" in values:
            from datetime import datetime
            try:
                start = datetime.fromisoformat(values["start_date"])
                end = datetime.fromisoformat(v)
                if end < start:
                    raise ValueError("end_date must be after start_date")
            except ValueError as e:
                if "must be after" not in str(e):
                    raise ValueError(f"Invalid date format: {e}")
                raise
        return v


class OptiSummary(BaseModel):
    """Summary returned from optimizer-backed initialization"""
    families_registered: int
    total_members: int
    total_children: int
    trip_duration_days: int
    baseline_itinerary: str
    estimated_cost: float
    predicted_satisfaction: float


class RegisteredFamilyInfo(BaseModel):
    """Info about a registered family from email."""
    family_code: str
    user_id: str
    family_id: str
    email: str
    status: str  # "existing" or "created"


class InitializeTripWithOptiResponse(BaseModel):
    """Response after optimizer-backed trip initialization"""
    success: bool
    trip_id: str
    trip_session_id: str
    option_id: str
    event_id: str
    optimizer_ran: bool
    message: str
    summary: OptiSummary
    registered_families: List[RegisteredFamilyInfo] = Field(default_factory=list)
    auto_approved: bool = False


class TripDetailResponse(BaseModel):
    """Detailed trip information"""
    trip_id: str
    trip_name: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    families: List[str] = Field(default_factory=list)
    iteration_count: int = 0
    initial_preferences: Dict[str, Any] = Field(default_factory=dict)
    current_preferences: Dict[str, Any] = Field(default_factory=dict)
    feedback_count: int = 0
    last_updated: Optional[str] = None
    status: Optional[str] = None
    latest_itinerary_path: Optional[str] = None
    created_at: Optional[str] = None


class PreferenceUpdateRequest(BaseModel):
    """Request to update family preferences"""
    preference_updates: Dict[str, Any] = Field(
        ...,
        description="Dictionary of preference fields to update"
    )


# ============================================================================
# Endpoints
# ============================================================================

from app.core.dependencies import get_current_user, get_optional_user
from app.schemas.auth import TokenPayload

@router.post("/initialize", response_model=InitializeTripResponse, status_code=status.HTTP_201_CREATED)
async def initialize_trip(
    request: InitializeTripRequest,
    current_user: Optional[TokenPayload] = Depends(get_optional_user),
):
    """
    Initialize a new trip with family preferences.
    
    This endpoint:
    1. Validates all family preferences
    2. Creates a TripSession in the database
    3. Stores initial preferences in optimizer format
    4. Returns trip_id for subsequent operations
    
    **Example Request:**
    ```json
    {
      "trip_name": "Delhi Adventure",
      "destination": "Delhi, India",
      "start_date": "2026-03-15",
      "end_date": "2026-03-18",
      "baseline_itinerary": "delhi_3day_skeleton",
      "families": [
        {
          "family_id": "FAM_A",
          "members": 4,
          "interest_vector": {"history": 0.9, "food": 0.4, ...},
          "must_visit_locations": ["LOC_008"]
        }
      ]
    }
    ```
    
    **Returns:**
    - `trip_id`: Use this for all subsequent operations
    - `summary`: Trip metrics
    - `next_steps`: Suggested next actions
    
    **Note:** Authentication is optional for testing. In production, this should require auth.
    """
    try:
        # Override family_id with the one from the token to ensure security (if authenticated)
        if current_user and current_user.family_id:
            for family in request.families:
                # We overwrite the family_id to ensure the trip is linked to the authenticated user's family
                family.family_id = current_user.family_id
                
        # Convert Pydantic models to dicts for service layer
        families = [f.dict() for f in request.families]
        
        # Initialize trip
        result = TripService.initialize_trip(
            trip_name=request.trip_name,
            destination=request.destination,
            start_date=request.start_date,
            end_date=request.end_date,
            baseline_itinerary=request.baseline_itinerary,
            families=families
        )
        
        return InitializeTripResponse(**result)
        
    except ValueError as e:
        # Validation errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # Unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize trip: {str(e)}"
        )


@router.post(
    "/initialize-with-optimization",
    response_model=InitializeTripWithOptiResponse,
    status_code=status.HTTP_201_CREATED,
)
async def initialize_trip_with_optimization(
    request: InitializeTripWithOptiRequest,
    current_user: Optional[TokenPayload] = Depends(get_optional_user),
):
    """
    Initialize a trip with automatic optimizer run.

    This endpoint:
    1. Auto-registers traveller emails as users (creates families for each)
    2. Auto-fetches family preferences from the database
    3. Creates a TripSession
    4. Runs the ML optimizer iteration 0 (falls back to baseline if unavailable)
    5. Creates an ItineraryOption for the agent to review/approve
    6. If auto_approve=true, automatically approves and publishes the itinerary

    The agent can also approve the option via `POST /agent/itinerary/approve`.
    """
    try:
        # Step 1: Auto-register traveller emails and collect family_ids
        registered_families = []
        if request.traveller_emails:
            from app.services.user_service import UserService
            from app.services.family_service import FamilyService

            for entry in request.traveller_emails:
                try:
                    existing_user = UserService.get_user_by_email(entry.email)
                    if existing_user:
                        if existing_user.family_id:
                            fam = FamilyService.get_family(existing_user.family_id)
                            if fam:
                                registered_families.append({
                                    "family_code": fam.family_code,
                                    "user_id": str(existing_user.id),
                                    "family_id": str(fam.id),
                                    "email": entry.email,
                                    "status": "existing"
                                })
                    else:
                        default_password = "VoyageurDefault2026!"
                        full_name = entry.full_name or entry.email.split("@")[0]
                        new_user = UserService.create_user(
                            email=entry.email,
                            password=default_password,
                            role="traveller",
                            full_name=full_name
                        )
                        fam = FamilyService.get_family(new_user.family_id)
                        if fam:
                            # Update family with member info
                            prefs = fam.preferences or {}
                            prefs["members"] = entry.members
                            prefs["children"] = entry.children
                            FamilyService.update_preferences(fam.id, prefs)

                            registered_families.append({
                                "family_code": fam.family_code,
                                "user_id": str(new_user.id),
                                "family_id": str(fam.id),
                                "email": entry.email,
                                "status": "created"
                            })
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Failed to register {entry.email}: {e}")

        # Merge registered family codes with any explicit family_ids
        all_family_ids = list(request.family_ids)
        for rf in registered_families:
            if rf["family_code"] not in all_family_ids:
                all_family_ids.append(rf["family_code"])

        if not all_family_ids:
            raise ValueError("No families to initialize. Provide family_ids or traveller_emails.")

        # Step 2: Initialize trip with optimization
        result = TripService.initialize_trip_with_optimization(
            trip_name=request.trip_name,
            destination=request.destination,
            start_date=request.start_date,
            end_date=request.end_date,
            family_ids=all_family_ids,
            num_travellers=request.num_travellers,
            custom_baseline=request.custom_baseline,
        )

        # Include registered families info in result
        result["registered_families"] = registered_families

        # Step 3: Auto-approve if requested
        if request.auto_approve and result.get("option_id"):
            try:
                from app.services.itinerary_option_service import ItineraryOptionService
                from app.services.itinerary_service import ItineraryService
                from uuid import UUID

                option_uuid = UUID(result["option_id"])
                # Use the calling agent's ID if available, else system agent
                if current_user and current_user.sub:
                    agent_id = UUID(current_user.sub)
                else:
                    agent_id = UUID("00000000-0000-0000-0000-000000000001")

                approved_option = ItineraryOptionService.approve_option(
                    option_id=option_uuid,
                    agent_id=agent_id,
                )

                # Publish itinerary to customer tables
                option_details = approved_option.details or {}
                itinerary_data = option_details.get("itinerary", {})
                if itinerary_data:
                    ItineraryService.publish_base_itinerary(
                        trip_id=result["trip_id"],
                        family_ids=all_family_ids,
                        itinerary_data=itinerary_data,
                        created_reason="Base itinerary auto-approved by agent",
                    )

                result["auto_approved"] = True
                result["message"] = (
                    f"Trip initialized, optimized, and auto-approved. "
                    f"Itinerary published to {len(all_family_ids)} families."
                )

                # Send WebSocket notification to all registered travellers
                try:
                    from app.core.websocket import ws_manager
                    import asyncio
                    for rf in registered_families:
                        await ws_manager.send_to_user(rf["user_id"], {
                            "type": "itinerary_published",
                            "trip_id": result["trip_id"],
                            "message": "Your itinerary is ready! Check your dashboard.",
                        })
                except Exception:
                    pass  # Non-blocking

            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Auto-approve failed: {e}")
                result["auto_approved"] = False

        return InitializeTripWithOptiResponse(**result)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize trip with optimization: {str(e)}",
        )


@router.get("/{trip_id}/summary", response_model=TripDetailResponse)
async def get_trip_summary(trip_id: str):
    """
    Get detailed summary of a trip including current state.
    
    Returns:
    - Trip metadata (name, destination, dates)
    - Family IDs
    - Initial and current preferences
    - Optimization iteration count
    - Feedback history count
    
    **Example:**
    ```
    GET /api/v1/trips/delhi_20260315_1234/summary
    ```
    """
    try:
        summary = TripService.get_trip_summary(trip_id)
        return TripDetailResponse(**summary)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trip summary: {str(e)}"
        )


@router.get("/{trip_id}/itinerary")
async def get_trip_itinerary(trip_id: str):
    """
    Get the full latest optimized itinerary for a trip.
    Reads the actual JSON file specified in the TripSession.
    
    **Example:**
    ```
    GET /api/v1/trips/delhi_20260315_1234/itinerary
    ```
    """
    import os
    import json
    from app.services.optimizer_service import OptimizerService
    
    try:
        session = OptimizerService.get_trip_session(trip_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip session for ID {trip_id} not found"
            )
            
        itinerary_path = session.latest_itinerary_path or session.baseline_itinerary_path
        
        if not itinerary_path or not os.path.exists(itinerary_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Itinerary JSON file not found at path: {itinerary_path}"
            )
            
        with open(itinerary_path, 'r') as f:
            data = json.load(f)
            return data
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load itinerary: {str(e)}"
        )


@router.get("/{trip_id}/bookings")
async def get_trip_bookings(trip_id: str):
    """
    Extract bookable items (hotels, dining, CAB/CAB_FALLBACK transport) from
    the optimizer output files and return a day-grouped booking manifest.

    Data sources:
      - optimized_backbone.json  → hotel_assignments, daily_restaurants
      - optimized_itinerary.json → CAB/CAB_FALLBACK transport, restaurant POI names & times
    """
    import os
    import json
    from pathlib import Path
    from app.services.optimizer_service import OptimizerService
    from app.services.booking_extraction_service import BookingExtractionService

    try:
        session = OptimizerService.get_trip_session(trip_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip session for ID {trip_id} not found",
            )

        itinerary_path = session.latest_itinerary_path or session.baseline_itinerary_path
        if not itinerary_path or not os.path.exists(itinerary_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Itinerary file not found at: {itinerary_path}",
            )

        # Derive backbone path (same directory, different filename)
        backbone_path = str(Path(itinerary_path).parent / "optimized_backbone.json")

        with open(itinerary_path, "r") as f:
            itinerary_data = json.load(f)

        backbone_data = {}
        if os.path.exists(backbone_path):
            with open(backbone_path, "r") as f:
                backbone_data = json.load(f)

        # Resolve start_date from session
        start_date = session.start_date.isoformat() if session.start_date else "2026-01-01"

        result = BookingExtractionService.extract(
            itinerary=itinerary_data,
            backbone=backbone_data,
            start_date=start_date,
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract bookings: {str(e)}",
        )


@router.patch("/{trip_id}/families/{family_id}/preferences")
async def update_family_preferences(
    trip_id: str,
    family_id: str,
    request: PreferenceUpdateRequest
):
    """
    Update preferences for a specific family.
    
    Use this endpoint to manually edit preferences before running optimization.
    For processing user feedback, use `/api/v1/itinerary/feedback/agent` instead.
    
    **Example:**
    ```json
    {
      "preference_updates": {
        "budget_sensitivity": 0.8,
        "must_visit_locations": ["LOC_006", "LOC_010"]
      }
    }
    ```
    
    **Returns:** Updated preference object for the family
    """
    try:
        updated_prefs = TripService.update_family_preferences(
            trip_id=trip_id,
            family_id=family_id,
            preference_updates=request.preference_updates
        )
        
        return {
            "success": True,
            "trip_id": trip_id,
            "family_id": family_id,
            "updated_preferences": updated_prefs,
            "message": f"Preferences updated for {family_id}"
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update preferences: {str(e)}"
        )


from app.core.pagination import PaginationParams, PaginatedResponse
from app.core.dependencies import get_current_user

@router.get("/me", response_model=PaginatedResponse[TripDetailResponse])
async def get_my_trips(
    current_user: Annotated[Any, Depends(get_current_user)],
    pagination: PaginationParams = Depends(),
    trip_status: str = None,
):
    """
    Get trips belonging to the currently authenticated user's family.
    """
    if not current_user.family_id:
        # A user might not be assigned to a family yet
        return PaginatedResponse(
            items=[],
            total=0,
            skip=pagination.skip,
            limit=pagination.limit
        )

    try:
        # Resolve the user's family UUID → family_code, because trip_sessions
        # stores family_codes (e.g. "698199C3") not family UUIDs in family_ids.
        from app.services.family_service import FamilyService
        family = FamilyService.get_family(current_user.family_id)
        if not family:
            return PaginatedResponse(items=[], total=0, skip=pagination.skip, limit=pagination.limit)
        family_code = family.family_code

        from sqlmodel import select, func, col, Session as DBSession
        from sqlalchemy.dialects.postgresql import JSONB
        from app.core.db import engine
        from app.models.trip_session import TripSession
        
        with DBSession(engine) as session:
            statement = select(TripSession).where(
                col(TripSession.family_ids).cast(JSONB).contains([family_code])
            ).order_by(TripSession.created_at.desc())

            if trip_status:
                statement = statement.where(TripSession.status == trip_status)

            # Counter
            count_stmt = select(func.count()).select_from(TripSession).where(
                col(TripSession.family_ids).cast(JSONB).contains([family_code])
            )
            if trip_status:
                count_stmt = count_stmt.where(TripSession.status == trip_status)

            total = session.exec(count_stmt).one()
            
            statement = statement.offset(pagination.skip).limit(pagination.limit)
            trips = session.exec(statement).all()
            
            results = []
            for trip in trips:
                _ = trip.family_ids
                _ = trip.initial_preferences
                _ = trip.current_preferences
                _ = trip.feedback_history
                
                results.append({
                    "trip_id": trip.trip_id,
                    "trip_name": trip.trip_name,
                    "destination": trip.destination,
                    "start_date": trip.start_date.isoformat() if trip.start_date else None,
                    "end_date": trip.end_date.isoformat() if trip.end_date else None,
                    "families": trip.family_ids,
                    "iteration_count": trip.iteration_count,
                    "initial_preferences": trip.initial_preferences,
                    "current_preferences": trip.current_preferences,
                    "feedback_count": len(trip.feedback_history) if trip.feedback_history else 0,
                    "latest_itinerary_path": trip.latest_itinerary_path,
                    "status": trip.status,
                    "created_at": trip.created_at.isoformat() if trip.created_at else None,
                })

        return PaginatedResponse(
            items=[TripDetailResponse(**t) for t in results],
            total=total,
            skip=pagination.skip,
            limit=pagination.limit
        )
    except Exception as e:
        logger.error(f"Failed to get user trips: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list trips: {str(e)}"
        )

@router.get("/", response_model=PaginatedResponse[TripDetailResponse])
async def list_trips(
    pagination: PaginationParams = Depends(),
    trip_status: str = None,
):
    """
    List all trips (with pagination).
    """
    try:
        trips, total = TripService.list_trips(
            limit=pagination.limit,
            offset=pagination.skip,
            status_filter=trip_status,
        )
        return PaginatedResponse(
            items=[TripDetailResponse(**t) for t in trips],
            total=total,
            skip=pagination.skip,
            limit=pagination.limit
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list trips: {str(e)}"
        )



@router.delete("/{trip_id}")
async def delete_trip(trip_id: str):
    """
    Archive a trip (soft delete).

    Sets trip status to 'archived'. The trip data is preserved in the database
    but will no longer appear in active trip listings.
    """
    try:
        result = TripService.delete_trip(trip_id)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to archive trip: {str(e)}"
        )
