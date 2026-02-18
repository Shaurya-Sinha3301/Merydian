"""
POI Mapper - Maps POI names to IDs using locations.json
"""
import json
from pathlib import Path
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


def load_locations_map(locations_path: Path) -> Dict[str, Any]:
    """Load locations.json into a dictionary keyed by location_id."""
    with open(locations_path, 'r', encoding='utf-8') as f:
        locations_list = json.load(f)
    
    # Convert list to dict keyed by location_id
    # Handle both 'id' and 'location_id' field names
    locations_dict = {}
    for loc in locations_list:
        loc_id = loc.get("id") or loc.get("location_id")
        if loc_id:
            locations_dict[loc_id] = loc
    
    return locations_dict


def get_poi_id(poi_name: str, locations_map: Dict[str, Any]) -> Optional[str]:
    """
    Map a POI name to its ID using fuzzy case-insensitive matching.
    
    Args:
        poi_name: User-provided POI name (e.g., "Akshardham", "Red Fort")
        locations_map: Dictionary of {location_id: location_data}
    
    Returns:
        Location ID (e.g., "LOC_006") or None if not found
    """
    if not poi_name:
        return None
    
    poi_name_lower = poi_name.lower().strip()
    
    # Try exact match first
    for loc_id, loc_data in locations_map.items():
        if loc_data.get("name", "").lower().strip() == poi_name_lower:
            logger.info(f"Exact match: '{poi_name}' → {loc_id}")
            return loc_id
    
    # Try partial match (contains)
    for loc_id, loc_data in locations_map.items():
        loc_name = loc_data.get("name", "").lower().strip()
        if poi_name_lower in loc_name or loc_name in poi_name_lower:
            logger.info(f"Partial match: '{poi_name}' → {loc_id} ({loc_data.get('name')})")
            return loc_id
    
    logger.warning(f"No POI found for name: '{poi_name}'")
    return None


def get_poi_name(poi_id: str, locations_map: Dict[str, Any]) -> Optional[str]:
    """
    Get POI name from ID.
    
    Args:
        poi_id: Location ID (e.g., "LOC_006")
        locations_map: Dictionary of {location_id: location_data}
    
    Returns:
        POI name or None if not found
    """
    loc_data = locations_map.get(poi_id)
    if loc_data:
        return loc_data.get("name")
    return None
