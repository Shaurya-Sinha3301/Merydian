"""
TravelDataProvider — Abstraction layer between data sources and the optimizer.

The optimizer MUST NEVER know where data comes from.
This provider currently reads from the local JSON files in ml_or/data/,
but the interface is designed so future implementations can read from
a database, OpenStreetMap, Google Places, or any external API.
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.contracts.optimization import (
    TravelDataset,
    LocationData,
    TransportEdgeData,
    BaseItineraryData,
    FamilyPreferenceData,
)

logger = logging.getLogger(__name__)


class TravelDataProvider:
    """
    Loads geographic and structural travel data for the optimizer.
    
    Current implementation: reads from ml_or/data/ JSON files.
    Future: database, external APIs, or a mix.
    """
    
    _cache: Dict[str, Any] = {}

    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            # Default to the ml_or/data directory
            data_dir = Path(__file__).parent.parent.parent.parent / "ml_or" / "data"
        self.data_dir = Path(data_dir)
        
    @classmethod
    def clear_cache(cls):
        cls._cache.clear()

    def _load_json(self, filename: str) -> dict:
        filepath = self.data_dir / filename
        if not filepath.exists():
            logger.warning(f"Data file not found: {filepath}")
            return {}
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    def load_locations(self) -> Dict[str, LocationData]:
        """Load POI locations from locations.json."""
        raw = self._load_json("locations.json")
        result = {}
        if isinstance(raw, list):
            for loc in raw:
                lid = loc.get("location_id", loc.get("id", ""))
                result[lid] = LocationData(
                    location_id=lid,
                    name=loc.get("name", ""),
                    lat=float(loc.get("lat", loc.get("latitude", 0))),
                    lon=float(loc.get("lon", loc.get("longitude", 0))),
                    category=loc.get("category"),
                    visit_duration_min=loc.get("visit_duration_min", loc.get("duration_min")),
                    entry_fee=loc.get("entry_fee"),
                    tags=loc.get("tags", []),
                    metadata={k: v for k, v in loc.items() if k not in {
                        "location_id", "id", "name", "lat", "latitude",
                        "lon", "longitude", "category", "visit_duration_min",
                        "duration_min", "entry_fee", "tags"
                    }},
                )
        elif isinstance(raw, dict):
            for lid, loc in raw.items():
                if isinstance(loc, dict):
                    result[lid] = LocationData(
                        location_id=lid,
                        name=loc.get("name", ""),
                        lat=float(loc.get("lat", loc.get("latitude", 0))),
                        lon=float(loc.get("lon", loc.get("longitude", 0))),
                        category=loc.get("category"),
                        visit_duration_min=loc.get("visit_duration_min"),
                        entry_fee=loc.get("entry_fee"),
                        tags=loc.get("tags", []),
                        metadata={},
                    )
        return result

    def load_hotels(self) -> Dict[str, LocationData]:
        """Load hotel locations from hotels.json."""
        raw = self._load_json("hotels.json")
        result = {}
        if isinstance(raw, list):
            for loc in raw:
                lid = loc.get("location_id", loc.get("id", ""))
                result[lid] = LocationData(
                    location_id=lid,
                    name=loc.get("name", ""),
                    lat=float(loc.get("lat", loc.get("latitude", 0))),
                    lon=float(loc.get("lon", loc.get("longitude", 0))),
                    category="hotel",
                    tags=loc.get("tags", []),
                    metadata={k: v for k, v in loc.items() if k not in {
                        "location_id", "id", "name", "lat", "latitude",
                        "lon", "longitude", "tags"
                    }},
                )
        elif isinstance(raw, dict):
            for lid, loc in raw.items():
                if isinstance(loc, dict):
                    result[lid] = LocationData(
                        location_id=lid,
                        name=loc.get("name", ""),
                        lat=float(loc.get("lat", loc.get("latitude", 0))),
                        lon=float(loc.get("lon", loc.get("longitude", 0))),
                        category="hotel",
                        metadata={},
                    )
        return result

    def load_transport_edges(self) -> List[TransportEdgeData]:
        """Load transport graph from transport_graph.json."""
        raw = self._load_json("transport_graph.json")
        edges = []
        if isinstance(raw, list):
            for edge in raw:
                edges.append(TransportEdgeData(
                    from_location=edge.get("from", ""),
                    to_location=edge.get("to", ""),
                    mode=edge.get("mode", "WALK"),
                    duration_min=float(edge.get("duration_min", edge.get("time_min", 0))),
                    cost=float(edge.get("cost", 0)),
                    distance_km=float(edge.get("distance_km", 0)),
                    available=edge.get("available", True),
                ))
        return edges

    def load_base_itinerary(self) -> BaseItineraryData:
        """Load skeleton/backbone itinerary from base_itinerary_clustered.json."""
        raw = self._load_json("base_itinerary_clustered.json")
        return BaseItineraryData(
            days=raw.get("days", []),
            metadata={k: v for k, v in raw.items() if k != "days"},
        )

    def load_family_preferences(self, filename: str = "family_preferences_3fam_strict.json") -> Dict[str, FamilyPreferenceData]:
        """Load family preferences from a JSON file."""
        raw = self._load_json(filename)
        result = {}
        if isinstance(raw, dict):
            for fam_id, prefs in raw.items():
                if isinstance(prefs, dict):
                    result[fam_id] = FamilyPreferenceData(
                        family_id=fam_id,
                        must_visit_locations=prefs.get("must_visit_locations", []),
                        never_visit_locations=prefs.get("never_visit_locations", []),
                        interests=prefs.get("interests", []),
                        members=prefs.get("members", 1),
                        budget_sensitivity=prefs.get("budget_sensitivity", 0.5),
                    )
        return result

    def build_dataset(self, preference_overrides: Optional[Dict[str, FamilyPreferenceData]] = None) -> TravelDataset:
        """
        Build a complete TravelDataset from all data sources.
        
        Args:
            preference_overrides: If provided, these replace the file-based preferences.
                                  This is the path for DB-sourced preferences.
        """
        cache_key = str(self.data_dir)
        
        if cache_key not in TravelDataProvider._cache:
            TravelDataProvider._cache[cache_key] = {
                "locations": self.load_locations(),
                "hotels": self.load_hotels(),
                "transport_edges": self.load_transport_edges(),
                "base_itinerary": self.load_base_itinerary(),
                "family_preferences": self.load_family_preferences()
            }
            
        cached = TravelDataProvider._cache[cache_key]
        
        if preference_overrides is not None:
            family_preferences = preference_overrides
        else:
            family_preferences = cached["family_preferences"]

        return TravelDataset(
            locations=cached["locations"],
            hotels=cached["hotels"],
            transport_edges=cached["transport_edges"],
            base_itinerary=cached["base_itinerary"],
            family_preferences=family_preferences,
        )
