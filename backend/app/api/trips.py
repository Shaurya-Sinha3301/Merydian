"""
Trip API - Endpoints for trip initialization and management

Provides endpoints for:
- Creating trips with initial family preferences
- Getting trip summaries
- Updating family preferences
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
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

class InitializeTripWithOptiRequest(BaseModel):
    """Simplified request — only basics + family IDs. Preferences auto-fetched from DB."""

    trip_name: str = Field(..., min_length=1, max_length=200, description="Name of the trip")
    destination: str = Field(..., min_length=1, max_length=100, description="Trip destination")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD)")
    family_ids: List[str] = Field(
        ..., min_items=1, description="Family codes (e.g. ['FAM_A', 'FAM_B'])"
    )
    num_travellers: Optional[int] = Field(
        default=None, ge=1, description="Total traveller count (informational)"
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


class TripDetailResponse(BaseModel):
    """Detailed trip information"""
    trip_id: str
    trip_name: Optional[str]
    destination: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    families: List[str]
    iteration_count: int
    initial_preferences: Dict[str, Any]
    current_preferences: Dict[str, Any]
    feedback_count: int
    last_updated: Optional[str]


class PreferenceUpdateRequest(BaseModel):
    """Request to update family preferences"""
    preference_updates: Dict[str, Any] = Field(
        ...,
        description="Dictionary of preference fields to update"
    )


# ============================================================================
# Endpoints
# ============================================================================

from app.core.dependencies import get_current_user
from app.schemas.auth import TokenPayload

@router.post("/initialize", response_model=InitializeTripResponse, status_code=status.HTTP_201_CREATED)
async def initialize_trip(
    request: InitializeTripRequest,
    current_user: Optional[TokenPayload] = Depends(lambda: None)  # Make auth optional for testing
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
    current_user: Optional[TokenPayload] = Depends(lambda: None),
):
    """
    Initialize a trip with automatic optimizer run.

    This endpoint:
    1. Auto-fetches family preferences from the database
    2. Creates a TripSession
    3. Runs the ML optimizer iteration 0 (falls back to baseline if unavailable)
    4. Creates an ItineraryOption for the agent to review/approve

    The agent can then approve the option via `POST /agent/itinerary/approve`.
    """
    try:
        result = TripService.initialize_trip_with_optimization(
            trip_name=request.trip_name,
            destination=request.destination,
            start_date=request.start_date,
            end_date=request.end_date,
            family_ids=request.family_ids,
            num_travellers=request.num_travellers,
        )

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
