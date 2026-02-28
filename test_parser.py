import sys
import json
import logging
import asyncio
from pathlib import Path

# Add project root to path
sys.path.append('d:/Coding/Voyage/meiliai/backend')
sys.path.append('d:/Coding/Voyage/meiliai')

from ml_or.demos.reopt_hard_constraints.feedback_processor import FeedbackProcessor

def test_parsing():
    processor = FeedbackProcessor()
    locations_path = Path('d:/Coding/Voyage/meiliai/ml_or/data/locations.json')
    available_pois = []
    if locations_path.exists():
        with open(locations_path, "r", encoding="utf-8") as f:
            locs_data = json.load(f)
            available_pois = [(loc.get("location_id"), loc.get("name")) for loc in locs_data if "location_id" in loc]

    print("Available POIs:", len(available_pois))
    
    # Test message
    message = "add qutub minar today"
    
    parsed = processor.parse_user_feedback(message, available_pois)
    print("Parsed constraints:", parsed)

test_parsing()
