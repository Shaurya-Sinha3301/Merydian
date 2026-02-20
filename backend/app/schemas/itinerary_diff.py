"""
Itinerary Diff Schemas

Pydantic models for comparing itinerary versions.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class POIDiff(BaseModel):
    """Diff for a single POI change."""
    poi_id: str
    poi_name: str = ""
    change_type: Literal["added", "removed", "modified"] = "modified"
    day: Optional[int] = None
    old_values: dict = {}
    new_values: dict = {}


class DayDiff(BaseModel):
    """Diff for a single day."""
    day: int
    change_type: Literal["added", "removed", "modified"] = "modified"
    poi_changes: List[POIDiff] = []


class CostDiff(BaseModel):
    """Cost comparison between versions."""
    old_cost: float = 0.0
    new_cost: float = 0.0
    delta: float = 0.0
    percent_change: float = 0.0


class SatisfactionDiff(BaseModel):
    """Satisfaction comparison between versions."""
    old_satisfaction: float = 0.0
    new_satisfaction: float = 0.0
    delta: float = 0.0


class ItineraryDiffResponse(BaseModel):
    """Complete diff between two itinerary versions."""
    family_id: str
    version_a: int
    version_b: int
    day_changes: List[DayDiff] = []
    cost_diff: CostDiff = CostDiff()
    satisfaction_diff: SatisfactionDiff = SatisfactionDiff()
    total_pois_added: int = 0
    total_pois_removed: int = 0
    total_pois_modified: int = 0
    summary: str = ""
