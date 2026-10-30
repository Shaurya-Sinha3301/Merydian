"""
Trip API - Endpoints for trip initialization and management

Provides endpoints for:
- Creating trips with initial family preferences
- Getting trip summaries
- Updating family preferences
"""

import logging

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Annotated
from datetime import date

from app.services.trip_service import TripService

logger = logging.getLogger(__name__)

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
    last_updated: Optional[str] = None
    status: Optional[str] = None
    latest_itinerary_path: Optional[str] = None
    created_at: Optional[str] = None
    family_id: Optional[str] = None
    current_version: Optional[int] = None
    total_cost: Optional[float] = None
    total_satisfaction: Optional[float] = None
    duration_days: Optional[int] = None
    feedback_history: List[Dict[str, Any]] = []


class PreferenceUpdateRequest(BaseModel):
    """Request to update family preferences"""
    preference_updates: Dict[str, Any] = Field(
        ...,
        description="Dictionary of preference fields to update"
    )


# ============================================================================
# Endpoints
# ============================================================================

from app.core.dependencies import get_current_agent, get_current_user, verify_trip_access
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
    current_user: TokenPayload = Depends(get_current_agent),
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
        from app.core.db import engine as _engine
        from app.services import notification_service as ns
        from app.services.agency_service import agency_of, set_trip_agency
        from sqlmodel import Session as _Session

        with _Session(_engine) as _s:
            set_trip_agency(result["trip_id"], agency_of(_s, current_user.sub))
        ns.notify_agents("decision.created", f"First plan ready: {request.trip_name}", "Waiting for approval", "/app/desk", {"trip_id": result.get("trip_id"), "option_id": result.get("option_id")})

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
async def get_trip_summary(trip_id: str, _: Any = Depends(verify_trip_access), current_user: TokenPayload = Depends(get_current_user)):
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
        if current_user.role != "agent" and current_user.family_id:
            trip = TripService.get_trip(trip_id)
            summary.update({k: v for k, v in TripService.itinerary_stats(trip, current_user.family_id).items() if k != "feedback_history"})
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
async def get_trip_itinerary(trip_id: str, _: Any = Depends(verify_trip_access)):
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




@router.patch("/{trip_id}/families/{family_id}/preferences")
async def update_family_preferences(
    trip_id: str,
    family_id: str,
    request: PreferenceUpdateRequest,
    _: Any = Depends(verify_trip_access)
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
        # Currently the TripService list_trips doesn't filter by family_id efficiently in its signature.
        # But we can reuse TripService._get_... or manually query here.
        from sqlmodel import select, func, col
        from sqlalchemy.dialects.postgresql import JSONB
        from app.services.optimizer_service import get_db_session
        from app.models.trip_session import TripSession
        
        with get_db_session() as session:
            statement = select(TripSession).where(
                col(TripSession.family_ids).cast(JSONB).contains([current_user.family_id])
            ).order_by(TripSession.created_at.desc())

            if trip_status:
                statement = statement.where(TripSession.status == trip_status)

            # Counter
            count_stmt = select(func.count()).select_from(TripSession).where(
                col(TripSession.family_ids).cast(JSONB).contains([current_user.family_id])
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
                    "last_updated": trip.updated_at.isoformat() if trip.updated_at else None,
                    **TripService.itinerary_stats(trip, current_user.family_id),
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
    agent: TokenPayload = Depends(get_current_agent),
):
    """
    List the trips of the agent's agency (with pagination).
    """
    try:
        from app.core.db import engine as _engine
        from app.services.agency_service import agency_of, trip_ids_in
        from sqlmodel import Session as _Session

        trips, _ = TripService.list_trips(limit=1000, offset=0, status_filter=trip_status)
        with _Session(_engine) as _s:
            visible = trip_ids_in(_s, agency_of(_s, agent.sub))
        trips = [t for t in trips if t["trip_id"] in visible]
        total = len(trips)
        trips = trips[pagination.skip:pagination.skip + pagination.limit]
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
async def delete_trip(trip_id: str, _: Any = Depends(verify_trip_access)):
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



class TripRequest(BaseModel):
    """A traveller asking for their own trip."""
    trip_name: str = Field(..., min_length=2, max_length=120)
    destination: str = "Delhi, India"
    start_date: date
    end_date: date
    members: int = Field(default=2, ge=1, le=20)
    children: int = Field(default=0, ge=0, le=20)
    interests: Dict[str, float] = Field(default_factory=dict, description="Interest weights 0 to 1 by category")
    pace: str = Field(default="moderate", description="relaxed, moderate or fast")
    budget_sensitivity: float = Field(default=0.5, ge=0.0, le=1.0)
    energy_level: float = Field(default=0.5, ge=0.0, le=1.0)
    must_visit: List[str] = Field(default_factory=list)


class TripRequestResponse(BaseModel):
    trip_id: str
    option_id: str
    published: bool
    message: str


@router.post("/request", response_model=TripRequestResponse, status_code=status.HTTP_201_CREATED)
async def request_trip(
    body: TripRequest,
    current_user: Annotated[TokenPayload, Depends(get_current_user)],
):
    """
    A traveller plans their own trip: saves the family's preferences, runs the optimizer and, when
    SELF_SERVE_AUTO_APPROVE is on, publishes the first plan so they can read it and send feedback.
    Later changes still go to a travel agent for approval.
    """
    from uuid import UUID

    from app.core.config import settings
    from app.services.family_service import FamilyService
    from app.services.itinerary_option_service import ItineraryOptionService
    from app.services.itinerary_service import ItineraryService

    if current_user.role != "traveller" or not current_user.family_id:
        raise HTTPException(status_code=403, detail="Only travellers with a family can request a trip")
    if body.end_date < body.start_date:
        raise HTTPException(status_code=400, detail="The end date is before the start date")
    if (body.end_date - body.start_date).days > 9:
        raise HTTPException(status_code=400, detail="Trips are limited to 10 days")

    family = FamilyService.get_family(UUID(current_user.family_id))
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    interests = {
        "history": 0.5, "architecture": 0.5, "food": 0.5, "nature": 0.5,
        "nightlife": 0.3, "shopping": 0.3, "religious": 0.3,
    }
    interests.update({k: max(0.0, min(1.0, float(v))) for k, v in body.interests.items()})
    prefs = dict(family.preferences or {})
    prefs.update(
        members=body.members,
        children=body.children,
        interest_vector=interests,
        pace_preference=body.pace,
        budget_sensitivity=body.budget_sensitivity,
        energy_level=body.energy_level,
        must_visit_locations=body.must_visit,
    )
    FamilyService.update_preferences(family.id, prefs)

    try:
        result = TripService.initialize_trip_with_optimization(
            trip_name=body.trip_name.strip(),
            destination=body.destination,
            start_date=body.start_date.isoformat(),
            end_date=body.end_date.isoformat(),
            family_ids=[family.family_code],
            num_travellers=body.members,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Trip request failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="We could not build that plan. Please try again.")

    published = False
    if settings.SELF_SERVE_AUTO_APPROVE:
        try:
            option = ItineraryOptionService.approve_option(option_id=UUID(result["option_id"]), agent_id=None)
            details = option.details or {}
            if details.get("itinerary"):
                ItineraryService.publish_base_itinerary(
                    trip_id=option.trip_id,
                    family_ids=details.get("family_ids", [family.family_code]),
                    itinerary_data=details["itinerary"],
                    created_reason="First plan published automatically for the traveller's own request",
                )
                published = True
        except Exception as e:
            logger.error(f"Auto-publish failed for {result['trip_id']}: {e}", exc_info=True)

    from app.core.db import engine as _engine
    from app.services import notification_service as ns
    from app.services.agency_service import agency_of, set_trip_agency
    from sqlmodel import Session as _Session

    with _Session(_engine) as _s:
        set_trip_agency(result["trip_id"], agency_of(_s, current_user.sub))
    ns.notify_agents(
        "plan.published" if published else "decision.created",
        f"New trip: {body.trip_name.strip()}",
        f"{body.members} travellers, {body.start_date} to {body.end_date}",
        f"/app/trip/{result['trip_id']}",
        {"trip_id": result["trip_id"], "published": published},
    )
    return TripRequestResponse(
        trip_id=result["trip_id"],
        option_id=result["option_id"],
        published=published,
        message="Your plan is ready." if published else "Your plan is with a travel agent for approval.",
    )



class VersionDTO(BaseModel):
    version: int
    created_at: Optional[str] = None
    created_reason: Optional[str] = None
    created_by: Optional[str] = None
    total_cost: Optional[float] = None
    total_satisfaction: Optional[float] = None
    duration_days: Optional[int] = None


class FeedbackEntryDTO(BaseModel):
    iteration: Optional[int] = None
    timestamp: Optional[str] = None
    message: Optional[str] = None
    event_type: Optional[str] = None
    action: Optional[str] = None


class TripHistoryResponse(BaseModel):
    trip_id: str
    versions: List[VersionDTO]
    feedback: List[FeedbackEntryDTO]


@router.get("/{trip_id}/history", response_model=TripHistoryResponse)
async def get_trip_history(trip_id: str, _: Any = Depends(verify_trip_access)):
    """Every itinerary version of a trip, oldest first, and the feedback that led to them."""
    from uuid import UUID

    from sqlmodel import Session, select

    from app.core.db import engine
    from app.models.itinerary import Itinerary
    from app.services.family_service import FamilyService
    from app.services.optimizer_service import OptimizerService

    trip = OptimizerService.get_trip_session(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    family_uuid = None
    for fid in trip.family_ids or []:
        try:
            family_uuid = UUID(str(fid))
            break
        except ValueError:
            family = FamilyService.get_family_by_code(str(fid))
            if family:
                family_uuid = family.id
                break

    versions: List[VersionDTO] = []
    if family_uuid:
        with Session(engine) as session:
            rows = session.exec(
                select(Itinerary).where(Itinerary.family_id == family_uuid).order_by(Itinerary.version)
            ).all()
            versions = [
                VersionDTO(
                    version=r.version,
                    created_at=r.created_at.isoformat() if r.created_at else None,
                    created_reason=r.created_reason,
                    created_by=r.created_by,
                    total_cost=r.total_cost,
                    total_satisfaction=r.total_satisfaction,
                    duration_days=r.duration_days,
                )
                for r in rows
            ]

    feedback = [
        FeedbackEntryDTO(
            iteration=f.get("iteration"),
            timestamp=f.get("timestamp"),
            message=f.get("message"),
            event_type=f.get("event_type"),
            action=f.get("action"),
        )
        for f in (trip.feedback_history or [])
        if isinstance(f, dict)
    ]
    return TripHistoryResponse(trip_id=trip_id, versions=versions, feedback=feedback)
