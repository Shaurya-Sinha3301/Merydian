"""
Input/Output validation schemas for the Optimization Agent.
Uses Pydantic for type-safe validation and serialization.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any
from enum import Enum


class TransportOption(BaseModel):
    """A single transport option for a leg of the journey."""
    leg_id: str = Field(..., description="Unique identifier for this transport option")
    from_location: str = Field(..., alias="from", description="Origin location code")
    to_location: str = Field(..., alias="to", description="Destination location code")
    departure_time: str = Field(..., description="Departure time (HH:MM)")
    arrival_time: str = Field(..., description="Arrival time (HH:MM)")
    duration_minutes: int = Field(..., description="Total duration in minutes")
    cost_per_person: float = Field(..., description="Cost per person in currency units")
    reliability_score: float = Field(..., ge=0.0, le=1.0, description="Reliability score 0-1")

    class Config:
        populate_by_name = True


class Constraints(BaseModel):
    """Optimization constraints."""
    latest_arrival_time: str = Field(..., description="Latest allowed arrival time (HH:MM)")
    max_cost_per_person: float = Field(..., description="Maximum cost per person")


class Weights(BaseModel):
    """Optimization weight coefficients."""
    time: float = Field(..., ge=0.0, description="Weight for time/duration")
    cost: float = Field(..., ge=0.0, description="Weight for cost")
    split_penalty: float = Field(..., ge=0.0, description="Weight for subgroup penalty")

    @validator("time", "cost", "split_penalty")
    def weights_sum_to_one(cls, v, values):
        """Validate weights are reasonable (optional normalization check)."""
        if v < 0:
            raise ValueError("Weights must be non-negative")
        return v


class OptimizationRequest(BaseModel):
    """Complete input payload for the optimizer."""
    optimization_id: str = Field(..., description="Unique optimization request ID")
    users: List[str] = Field(..., description="List of user IDs to optimize for")
    candidate_groupings: List[List[List[str]]] = Field(
        ...,
        description="List of candidate groupings, each grouping is a list of subgroups"
    )
    transport_options: List[TransportOption] = Field(
        ...,
        description="Available transport options"
    )
    constraints: Constraints
    weights: Weights

    @validator("users")
    def non_empty_users(cls, v):
        if not v:
            raise ValueError("Users list cannot be empty")
        return v

    @validator("candidate_groupings")
    def non_empty_groupings(cls, v):
        if not v:
            raise ValueError("Candidate groupings cannot be empty")
        return v

    @validator("transport_options")
    def non_empty_options(cls, v):
        if not v:
            raise ValueError("Transport options cannot be empty")
        return v


class PlanLabel(str, Enum):
    """Labels for ranked plans."""
    FASTEST = "fastest"
    CHEAPEST = "cheapest"
    BALANCED = "balanced"


class OptimizationPlan(BaseModel):
    """A single optimized plan."""
    plan_id: str = Field(..., description="Unique plan identifier")
    label: PlanLabel = Field(..., description="Plan label (fastest/cheapest/balanced)")
    grouping: List[List[str]] = Field(..., description="Final subgroups in this plan")
    chosen_legs: List[str] = Field(..., description="Leg IDs chosen for each subgroup")
    arrival_time: str = Field(..., description="Arrival time of the plan (HH:MM)")
    total_cost_per_person: float = Field(..., description="Total cost per person")
    meta_score: float = Field(..., description="Meta-score for ranking")


class OptimizationResponse(BaseModel):
    """Successful optimization response with ranked plans."""
    plans: List[OptimizationPlan] = Field(..., description="Ranked optimization plans")
    optimization_id: Optional[str] = Field(None, description="Reference to input optimization_id")


class NoFeasiblePlanResponse(BaseModel):
    """Response when no feasible plan exists."""
    status: str = Field(default="NO_FEASIBLE_PLAN", description="Status indicating no solution")
    optimization_id: Optional[str] = Field(None, description="Reference to input optimization_id")
