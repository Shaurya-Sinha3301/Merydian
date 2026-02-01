import sys
import os

# Add backend directory to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from fastapi.testclient import TestClient
    from app.main import app
    from app.schemas.events import EventType

    client = TestClient(app)

    def test_create_event():
        print("Testing POST /api/v1/events ...")
        payload = {
            "event_type": "TRANSPORT_CANCELLED",
            "entity_id": "FLIGHT_123",
            "reported_by": "traveller",
            "timestamp": "2026-01-13T12:00:00Z"
        }
        
        # Note: Depending on config, API_V1_STR might be different. 
        # Default in many templates is /api/v1
        response = client.post("/api/v1/events/", json=payload)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            assert data["status"] == "queued"
            assert "event_id" in data
            print("SUCCESS: Event created and queued.")
        else:
            print("FAILED: Unexpected status code.")

    if __name__ == "__main__":
        test_create_event()

except ImportError as e:
    print(f"Import Error: {e}")
    print("Ensure you have these installed: fastapi, httpx (for TestClient)")
