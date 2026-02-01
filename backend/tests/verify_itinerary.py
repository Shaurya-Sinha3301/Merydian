import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    def test_get_current_itinerary():
        print("Testing GET /api/v1/itinerary/current ...")
        
        # 1. Login to get token
        login_payload = {
            "username": "traveller@example.com",
            "password": "password"
        }
        # Note: OAuth2PasswordRequestForm expects form data, not JSON
        login_response = client.post("/api/v1/auth/login", data=login_payload)
        
        if login_response.status_code != 200:
            print(f"LOGIN FAILED. Status: {login_response.status_code}")
            print(f"Response: {login_response.json()}")
            return

        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Itinerary
        response = client.get("/api/v1/itinerary/current", headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            assert data["itinerary_id"] == "it_001"
            assert data["status"] == "live"
            assert "subgroups" in data
            print("SUCCESS: Retrieved current itinerary.")
        else:
            print("FAILED: Unexpected status code.")

    if __name__ == "__main__":
        test_get_current_itinerary()

except ImportError as e:
    print(f"Import Error: {e}")
    print("Ensure you have these installed: fastapi, httpx (for TestClient)")
