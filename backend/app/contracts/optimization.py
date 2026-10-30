"""
Architecture Contracts for the Optimization Pipeline.

These are the ONLY types that cross the boundary between:
    Backend Services → AgentRuntime → OptimizerAgent → ML/OR Engine

No filesystem paths. No raw dicts. No implicit contracts.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum


# ═══════════════════════════════════════════════════════════════
# TravelDataset: What the optimizer needs to know about the world
# ═══════════════════════════════════════════════════════════════

class LocationData(BaseModel):
    """A single geographic location (POI or Hotel)."""
    location_id: str
    name: str
    lat: float
    lon: float
    category: Optional[str] = None
    visit_duration_min: Optional[int] = None
    entry_fee: Optional[float] = None
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TransportEdgeData(BaseModel):
    """A single transport edge between two locations."""
    from_location: str
    to_location: str
    mode: str  # BUS, METRO, AUTO, CAB, WALK
    duration_min: float
    cost: float
    distance_km: float
    available: bool = True


class BaseItineraryData(BaseModel):
    """The skeleton/backbone itinerary structure."""
    days: List[Dict[str, Any]]
    metadata: Dict[str, Any] = Field(default_factory=dict)


class FamilyPreferenceData(BaseModel):
    """Structured family preference for the optimizer."""
    family_id: str
    must_visit_locations: List[str] = Field(default_factory=list)
    never_visit_locations: List[str] = Field(default_factory=list)
    prefer_visit: Dict[str, float] = Field(default_factory=dict)
    avoid_visit: Dict[str, float] = Field(default_factory=dict)
    interests: List[str] = Field(default_factory=list)
    members: int = 1
    budget_sensitivity: float = 0.5


class TravelDataset(BaseModel):
    """
    Complete geographic and structural dataset for the optimizer.
    The optimizer MUST NOT load files. It receives this object.
    """
    locations: Dict[str, LocationData]
    hotels: Dict[str, LocationData]
    transport_edges: List[TransportEdgeData]
    base_itinerary: BaseItineraryData
    family_preferences: Dict[str, FamilyPreferenceData]


# ═══════════════════════════════════════════════════════════════
# TravelConstraints: What the user wants changed
# ═══════════════════════════════════════════════════════════════

class PaceLevel(str, Enum):
    VERY_RELAXED = "very_relaxed"
    RELAXED = "relaxed"
    MODERATE = "moderate"
    ACTIVE = "active"
    INTENSIVE = "intensive"


class BudgetLevel(str, Enum):
    BUDGET = "budget"
    MODERATE = "moderate"
    PREMIUM = "premium"
    LUXURY = "luxury"


class HotelQuality(str, Enum):
    BUDGET = "budget"
    STANDARD = "standard"
    PREMIUM = "premium"
    LUXURY = "luxury"


class ConstraintPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ConstraintMetadata(BaseModel):
    """Metadata attached to constraints for the optimizer to reason about relaxations."""
    priority: ConstraintPriority = ConstraintPriority.MEDIUM
    confidence: float = 1.0
    source: str = "system"
    timestamp: Optional[str] = None


class TravelConstraints(BaseModel):
    """
    Structured constraints produced by the DecisionPolicyAgent.
    These directly influence optimizer weights and bounds.
    """
    # Hard constraints (boolean / list)
    must_visit: List[str] = Field(default_factory=list, description="POI IDs that must appear")
    never_visit: List[str] = Field(default_factory=list, description="POI IDs that must not appear")
    
    # Soft constraints (influence weights)
    pace: Optional[PaceLevel] = Field(default=None, description="Desired trip pacing")
    budget_level: Optional[BudgetLevel] = Field(default=None, description="Budget preference")
    hotel_quality: Optional[HotelQuality] = Field(default=None, description="Hotel quality preference")
    max_activities_per_day: Optional[int] = Field(default=None, description="Cap on POIs per day")
    
    # Accessibility
    wheelchair_accessible: bool = Field(default=False)
    avoid_stairs: bool = Field(default=False)
    
    # Transport preferences
    preferred_transport_modes: List[str] = Field(default_factory=list)
    avoid_transport_modes: List[str] = Field(default_factory=list)
    
    # Day-specific overrides
    day_constraints: Dict[int, Dict[str, Any]] = Field(
        default_factory=dict,
        description="Per-day force_include/force_exclude overrides"
    )
    
    # Transport disruptions
    transport_disruptions: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Active transport disruptions (mode, from, to)"
    )
    
    # Metadata map
    metadata_map: Dict[str, ConstraintMetadata] = Field(
        default_factory=dict,
        description="Map of constraint field names to their metadata (e.g. 'budget_level' -> ConstraintMetadata)"
    )


class ValidationResult(BaseModel):
    """Result of pre-optimization constraint validation."""
    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    feasibility_score: float = 1.0


# ═══════════════════════════════════════════════════════════════
# OptimizationRequest: The full input to the optimizer
# ═══════════════════════════════════════════════════════════════

class OptimizationRequest(BaseModel):
    """
    Complete, self-contained request to the optimization engine.
    Contains everything needed to produce a new itinerary.
    """
    trip_id: str
    family_ids: List[str]
    num_days: int
    
    # The world
    dataset: TravelDataset
    
    # What the user wants
    constraints: TravelConstraints
    
    # Re-optimization context
    current_solution: Optional[Dict[str, Any]] = Field(
        default=None, description="Existing solution for incremental re-optimization"
    )
    start_day_index: int = Field(default=0, description="Day to start optimizing from (freeze prior)")
    
    # Tuning
    lambda_divergence: float = Field(default=0.05)
    user_input: str = Field(default="", description="Original user text for explainability")


# ═══════════════════════════════════════════════════════════════
# OptimizationResult: What the optimizer returns
# ═══════════════════════════════════════════════════════════════

class OptimizationResult(BaseModel):
    """
    Complete result from the optimization engine.
    Contains the solution and all explainability artifacts.
    No file paths. Pure data.
    """
    success: bool
    solution: Dict[str, Any] = Field(default_factory=dict, description="The optimized itinerary JSON")
    
    # New Phase 2B fields
    solver_status: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict, description="e.g. solver runtime, objective score, estimated cost, etc.")
    diagnostics: Dict[str, Any] = Field(default_factory=dict, description="e.g. why optimization failed, why hotels changed, constraints relaxed")
    validation_report: Dict[str, Any] = Field(default_factory=dict, description="Result from ConstraintValidator if failed")
    warnings: List[str] = Field(default_factory=list, description="Warnings like dense itinerary, missing POIs, etc.")
    human_explanation: Optional[str] = Field(default=None, description="Human readable explanation from ExplainabilityService")
    
    # Existing fields
    decision_traces: Dict[Any, Any] = Field(default_factory=dict)  # keyed by day index (int)
    enriched_diffs: Dict[str, Any] = Field(default_factory=dict)
    llm_payloads: List[Dict[str, Any]] = Field(default_factory=list)
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
