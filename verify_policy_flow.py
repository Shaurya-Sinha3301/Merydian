import sys
import os
from fastapi.testclient import TestClient

# Add backend to path so imports work
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.main import app

def run_verification():
    client = TestClient(app)
    
    print("--- Verifying Policy Agent (Decision & Policy) ---")
    
    # weights are members * spend(1.0) * budget_sensitivity
    # FAM_A: 4 * 1.0 * 0.9 = 3.6
    # FAM_B: 2 * 1.0 * 0.2 = 0.4
    # FAM_C: 3 * 1.0 * 0.5 = 1.5
    
    # Formula: w * (1.0*R + 1.0*dS + 1.0*C)
    
    # FAM_A (YES): 3.6 * (1.0(1) + 1.0(-0.3) + 1.0(0.95)) = 3.6 * 1.65 = 5.94
    # FAM_B (NEUTRAL): 0.4 * (1.0(0) + 1.0(-0.05) + 1.0(0.80)) = 0.4 * 0.75 = 0.3
    # FAM_C (NO): 1.5 * (1.0(-1) + 1.0(0.0) + 1.0(0.90)) = 1.5 * -0.1 = -0.15
    
    # Expected Score: 5.94 + 0.3 - 0.15 = 6.09
    
    payload = {
        "request_id": "REQ_123",
        "requested_location_id": "LOC_045",
        "origin_family": "FAM_A",
        "family_responses": [
            {
                "family_id": "FAM_A",
                "response": "YES",
                "confidence": 0.95,
                "current_satisfaction": 0.42,
                "delta_satisfaction": -0.30
            },
            {
                "family_id": "FAM_B",
                "response": "NEUTRAL",
                "confidence": 0.80,
                "current_satisfaction": 0.68,
                "delta_satisfaction": -0.05
            },
            {
                "family_id": "FAM_C",
                "response": "NO",
                "confidence": 0.90,
                "current_satisfaction": 0.75,
                "delta_satisfaction": 0.00
            }
        ],
        "group_context": {
            "remaining_trip_hours": 40,
            "locked_booking_ratio": 0.6,
            "optimizer_calls_used": 1
        }
    }
    
    print("Sending Payload...")
    response = client.post("/api/v1/agent/decision-policy/evaluate", json=payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Decision: {data['decision']}")
        print(f"Score: {data['score']}")
        print(f"Explanation: {data['explanation']}")
        
        # Approximate check due to float math
        if 6.0 < data['score'] < 6.2:
            print("\nSUCCESS: Score matches expected range (~6.09)")
        else:
            print(f"\nWARNING: Score {data['score']} differs from expected ~6.09")
            
        if data['decision'] == 'OPTIMIZE':
             print("SUCCESS: Decision is OPTIMIZE as expected.")
        else:
             print(f"FAILURE: Decision is {data['decision']}")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    run_verification()
