"""
Turns a traveller's request for a specific place into a decision for the travel agent.

The optimizer re-plans the trip with the place as a must-visit and the result is stored, unapplied,
as an itinerary option beside a "keep the current plan" option. Nothing changes for the traveller
until an agent accepts one.
"""

import json
import logging
import os
import tempfile
import time
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.models.family import Family
from app.models.itinerary import Itinerary
from app.services.itinerary_format import normalize_itinerary
from app.services.itinerary_option_service import ItineraryOptionService
from app.services.optimizer_service import OptimizerService

logger = logging.getLogger(__name__)


def catalogue() -> List[Dict[str, Any]]:
    path = os.path.join(settings.ML_DATA_DIR, "locations.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else data.get("locations", [])


def find_place(name: str) -> Optional[Dict[str, Any]]:
    wanted = name.strip().lower()
    places = [p for p in catalogue() if p.get("type") != "RESTAURANT"]
    for p in places:
        if wanted in (str(p.get("location_id", "")).lower(), str(p.get("name", "")).lower()):
            return p
    for p in places:
        if wanted and wanted in str(p.get("name", "")).lower():
            return p
    return None


def _stop_ids(itinerary: Dict[str, Any]) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for d in (itinerary or {}).get("days", []):
        for p in d.get("pois", []):
            out[str(p.get("location_id"))] = p.get("name") or str(p.get("location_id"))
    return out


def propose_place(trip_id: str, family_id: UUID, place: Dict[str, Any], note: Optional[str] = None) -> Dict[str, Any]:
    """Create the pending options for adding `place` to the trip. Returns the new event id and the options."""
    from ml_or.demos.reopt_hard_constraints.feedback_processor import FeedbackProcessor
    from app.services.preference_service import PreferenceService

    trip = OptimizerService.get_trip_session(trip_id)
    if not trip:
        raise ValueError("Trip not found")

    with Session(engine) as session:
        family = session.get(Family, family_id)
        latest = session.exec(
            select(Itinerary).where(Itinerary.family_id == family_id).order_by(Itinerary.version.desc()).limit(1)
        ).first()
        if not family or not latest:
            raise ValueError("This trip has no published plan yet")
        family_code = family.family_code
        old = dict(latest.data or {})
        old_cost, old_fit = latest.total_cost or 0.0, latest.total_satisfaction or 0.0

    old_stops = _stop_ids(normalize_itinerary(old))
    if place["location_id"] in old_stops:
        raise ValueError(f"{place['name']} is already in the plan")

    stored = (trip.current_preferences or {}).get(family_code) or next(iter((trip.initial_preferences or {}).values()), {}) or {}
    must = list(PreferenceService.get_must_visit_pois(family_id)) + [place["location_id"]]
    prefs = [{
        "family_id": family_code,
        "members": int(stored.get("members", 2)),
        "children": int(stored.get("children", 0)),
        "budget_sensitivity": float(stored.get("budget_sensitivity", 0.5)),
        "energy_level": float(stored.get("energy_level", 0.7)),
        "interest_vector": stored.get("interest_vector", {}),
        "pace_preference": stored.get("pace_preference", "moderate"),
        "must_visit_locations": sorted(set(must)),
        "never_visit_locations": PreferenceService.get_never_visit_pois(family_id),
    }]

    # The optimizer silently leaves a must-visit out when the days are full, so try the plain
    # request first and then give up the least important optional stops one at a time.
    catalogue_by_id = {str(p.get("location_id")): p for p in catalogue()}
    droppable = sorted(
        [lid for lid in old_stops if catalogue_by_id.get(lid, {}).get("type") != "RESTAURANT" and catalogue_by_id.get(lid, {}).get("role") != "SKELETON"],
        key=lambda lid: float(catalogue_by_id.get(lid, {}).get("base_importance", 0.5)),
    )

    def solve(extra_never: List[str]) -> Optional[Dict[str, Any]]:
        attempt = [{**prefs[0], "never_visit_locations": sorted(set(prefs[0]["never_visit_locations"]) | set(extra_never))}]
        with tempfile.TemporaryDirectory() as tmp:
            base = os.path.join(tmp, "base_itinerary.json")
            prefs_path = os.path.join(tmp, "family_prefs.json")
            # The optimizer starts from the trip's baseline skeleton, as the first plan did
            baseline_path = trip.baseline_itinerary_path
            if baseline_path and os.path.exists(baseline_path):
                with open(baseline_path, "r", encoding="utf-8") as src:
                    baseline = json.load(src)
            else:
                baseline = old
            with open(base, "w") as f:
                json.dump(baseline, f)
            with open(prefs_path, "w") as f:
                json.dump(attempt, f)
            result = FeedbackProcessor().run_optimizer(base, prefs_path, tmp)
            if result.get("optimizer_ran") and result.get("optimized_itinerary"):
                candidate = normalize_itinerary(result["optimized_itinerary"], family_code, attempt[0]["members"])
                if place["location_id"] in _stop_ids(candidate):
                    return candidate
        return None

    new_itinerary: Optional[Dict[str, Any]] = solve([])
    for lid in ([] if new_itinerary else droppable[:3]):
        new_itinerary = solve([lid])
        if new_itinerary:
            break
    logger.info("POI proposal for %s: found=%s", place["location_id"], bool(new_itinerary))

    if not new_itinerary:
        raise ValueError(f"We could not fit {place['name']} into this plan without breaking its opening hours or travel times")

    event_id = f"poi_req_{family_id}_{int(time.time())}"
    keep = ItineraryOptionService.create_option(
        event_id=event_id,
        trip_id=trip_id,
        summary="Keep the current plan",
        cost=old_cost,
        satisfaction=old_fit / 10 if old_fit > 1 else old_fit,
        details={"schedule_changes": [], "type": "keep"},
    )
    options = [keep]
    if new_itinerary:
        new_stops = _stop_ids(new_itinerary)
        changes: List[Dict[str, Any]] = []
        for lid, name in new_stops.items():
            if lid not in old_stops:
                changes.append({"action": "add", "poi_name": name})
        for lid, name in old_stops.items():
            if lid not in new_stops:
                changes.append({"action": "remove", "poi_name": name})
        fit = float(new_itinerary.get("total_satisfaction") or 0.0)
        opt = ItineraryOptionService.create_option(
            event_id=event_id,
            trip_id=trip_id,
            summary=f"Add {place['name']} to the plan" + (f" ({note.strip()})" if note and note.strip() else ""),
            cost=float(new_itinerary.get("total_cost") or 0.0),
            satisfaction=fit / 10 if fit > 1 else fit,
            details={
                "itinerary": new_itinerary,
                "family_ids": [family_code],
                "schedule_changes": changes,
                "affected_pois": [place["location_id"]],
                "type": "re-optimized",
            },
        )
        options.insert(0, opt)
    return {"event_id": event_id, "options": options, "optimizer_ran": bool(new_itinerary)}
