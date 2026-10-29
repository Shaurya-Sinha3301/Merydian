"""
Itinerary format bridge.

The CP-SAT optimizer returns a *solution* (days[].families[fid].pois[] with arrival
and departure times), while the rest of the platform, and the optimizer's own
input, use the *baseline* shape (days[].pois[] with location_id, role and
planned_visit_time_min). normalize_itinerary converts a solution into the baseline
shape, so a re-optimized plan can be stored, diffed, shown on the timeline and
fed back in as the next baseline.
"""
import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional

from app.core.config import settings


@lru_cache(maxsize=1)
def _locations() -> Dict[str, Dict[str, Any]]:
    with open(Path(settings.ML_DATA_DIR) / "locations.json", "r", encoding="utf-8") as f:
        return {loc["location_id"]: loc for loc in json.load(f)}


def is_solution_format(data: Optional[Dict[str, Any]]) -> bool:
    days = (data or {}).get("days") or []
    return bool(days) and "pois" not in days[0] and "families" in days[0]


def normalize_itinerary(data: Dict[str, Any], family_code: Optional[str] = None, members: int = 1) -> Dict[str, Any]:
    """Return the baseline-shaped itinerary; baseline-shaped input passes through."""
    if not data or not is_solution_format(data):
        return data

    locs = _locations()
    out_days = []
    total_cost = float(data.get("total_trip_cost") or 0.0)
    scores = []

    for day in data["days"]:
        families = day.get("families") or {}
        fid = family_code if family_code in families else next(iter(families), None)
        family = families.get(fid, {}) if fid else {}
        pois = []
        for i, p in enumerate(family.get("pois", []), start=1):
            loc_id = p.get("location_id")
            loc = locs.get(loc_id, {})
            name = p.get("location_name") or loc.get("name") or loc_id
            pois.append({
                "sequence": i,
                "location_id": loc_id,
                "poi_id": loc_id,
                "name": name,
                "category": "meal" if loc.get("type") == "RESTAURANT" else "activity",
                "role": loc.get("role") or "OPTIONAL",
                "planned_visit_time_min": p.get("visit_duration_min") or loc.get("avg_visit_time_min", 60),
                "time_window_start": p.get("arrival_time"),
                "time_window_end": p.get("departure_time"),
                "comment": name,
            })
            total_cost += float(loc.get("cost", 0)) * members
            if p.get("satisfaction_score") is not None:
                scores.append(float(p["satisfaction_score"]))
        out_days.append({"day": day.get("day"), "region": day.get("region"), "pois": pois})

    satisfaction = round(min(10.0, (sum(scores) / len(scores)) / 10.0), 2) if scores else 0.0
    return {
        "itinerary_id": data.get("trip_id"),
        "days": out_days,
        "total_cost": round(total_cost, 2),
        "total_satisfaction": satisfaction,
        "source": "optimizer",
        # The explainability pipeline diffs the optimizer's native solution shape
        "raw_solution": data,
    }
