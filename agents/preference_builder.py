"""
Preference Builder - Builds dynamic family preferences from feedback events
"""
import json
from pathlib import Path
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


def load_base_preferences(prefs_path: Path) -> Dict[str, Any]:
    """Load base family preferences from file and convert to dict."""
    if not prefs_path.exists():
        logger.warning(f"Preferences file not found: {prefs_path}, using empty dict")
        return {}
    
    with open(prefs_path, 'r', encoding='utf-8') as f:
        prefs_data = json.load(f)
    
    # Handle both dict and list formats
    if isinstance(prefs_data, list):
        # Convert list to dict keyed by family_id
        return {fam["family_id"]: fam for fam in prefs_data}
    else:
        # Already a dict
        return prefs_data


def apply_event_to_preferences(
    preferences: Dict[str, Any],
    event: Dict[str, Any],
    poi_id: Optional[str]
) -> Dict[str, Any]:
    """
    Apply a feedback event to family preferences.
    
    Args:
        preferences: Current family preferences dict
        event: FeedbackEvent dictionary
        poi_id: Location ID (already mapped from name)
    
    Returns:
        Updated preferences dictionary
    """
    event_type = event.get("event_type")
    family_id = event.get("family_id")
    
    if not family_id:
        logger.warning("No family_id in event, cannot update preferences")
        return preferences
    
    # Initialize family if not exists
    if family_id not in preferences:
        preferences[family_id] = {
            "must_visit_locations": [],
            "never_visit_locations": [],
            "interests": []
        }
    
    # Ensure lists exist (match FamilyPreference class field names)
    if "must_visit_locations" not in preferences[family_id]:
        preferences[family_id]["must_visit_locations"] = []
    if "never_visit_locations" not in preferences[family_id]:
        preferences[family_id]["never_visit_locations"] = []
    
    # Apply event
    if event_type == "MUST_VISIT_ADDED" and poi_id:
        if poi_id not in preferences[family_id]["must_visit_locations"]:
            preferences[family_id]["must_visit_locations"].append(poi_id)
            logger.info(f"Added {poi_id} to {family_id} must_visit_locations list")
        
        # Remove from never_visit if present
        if poi_id in preferences[family_id].get("never_visit_locations", []):
            preferences[family_id]["never_visit_locations"].remove(poi_id)
            logger.info(f"Removed {poi_id} from {family_id} never_visit_locations list")
    
    elif event_type == "NEVER_VISIT_ADDED" and poi_id:
        if poi_id not in preferences[family_id]["never_visit_locations"]:
            preferences[family_id]["never_visit_locations"].append(poi_id)
            logger.info(f"Added {poi_id} to {family_id} never_visit_locations list")
        
        # Remove from must_visit if present
        if poi_id in preferences[family_id].get("must_visit_locations", []):
            preferences[family_id]["must_visit_locations"].remove(poi_id)
            logger.info(f"Removed {poi_id} from {family_id} must_visit_locations list")
    
    return preferences


def save_preferences(preferences: Dict[str, Any], output_path: Path):
    """Save updated preferences to file in list format for ItineraryOptimizer."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Convert dict to list format with family_id key
    prefs_list = []
    for family_id, prefs in preferences.items():
        prefs_with_id = {"family_id": family_id, **prefs}
        prefs_list.append(prefs_with_id)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(prefs_list, f, indent=2)
    logger.info(f"Saved updated preferences to: {output_path}")
