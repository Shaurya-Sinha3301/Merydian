import sys
import os
import json
from fastapi.testclient import TestClient

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.main import app

client = TestClient(app)

def test_evaluate():
    payload = {
        "request_id": "req-fake-123",
        "requested_location_id": "loc-paris",
        "origin_family": "fam-1",
        "location_features": {
            "history": 0.8,
            "architecture": 0.9,
            "food": 0.7,
            "nature": 0.3,
            "nightlife": 0.6,
            "shopping": 0.5,
            "religious": 0.2
        },
        "family_profiles": [
            {
                "family_id": "fam-1",
                "members": 4,
                "children": 2,
                "budget_sensitivity": 0.9,
                "interest_vector": {
                    "history": 0.9,
                    "architecture": 0.8,
                    "food": 0.4,
                    "nature": 0.5,
                    "nightlife": 0.1,
                    "shopping": 0.3,
                    "religious": 0.9
                },
                "must_visit_locations": ["LOC_008"],
                "never_visit_locations": []
            },
            {
                "family_id": "fam-2",
                "members": 2,
                "children": 0,
                "budget_sensitivity": 0.2,
                "interest_vector": {
                    "history": 0.3,
                    "architecture": 0.5,
                    "food": 0.9,
                    "nature": 0.2,
                    "nightlife": 1.0,
                    "shopping": 0.8,
                    "religious": 0.1
                },
                "must_visit_locations": ["LOC_001"],
                "never_visit_locations": []
            }
        ],
        "family_responses": [
            {
                "family_id": "fam-1",
                "response": "YES",
                "confidence": 0.9,
                "current_satisfaction": 0.8,
                "delta_satisfaction": 0.1
            },
            {
                "family_id": "fam-2",
                "response": "NO",
                "confidence": 0.7,
                "current_satisfaction": 0.6,
                "delta_satisfaction": -0.2
            }
        ],
        "group_context": {
            "remaining_trip_hours": 48.0,
            "locked_booking_ratio": 0.3,
            "optimizer_calls_used": 0
        }
    }

    print("Sending Request Payload:")
    print(json.dumps(payload, indent=2))
    
    try:
        response = client.post("/api/v1/agent/decision-policy/evaluate", json=payload)
        
        print("\nResponse Status:", response.status_code)
        
        if response.status_code == 200:
            print("Response Body:")
            print(json.dumps(response.json(), indent=2))
        else:
            print("Error Response:")
            print(response.text)
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    test_evaluate()
