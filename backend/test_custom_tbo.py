import os
import sys
import json
from datetime import datetime, timedelta

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.tbo_air_service import TBOAirClient

def run_test():
    client = TBOAirClient(
        booking_url="https://api.tektravels.com",
        search_url="https://api.tektravels.com", 
        username="Hackathon",
        password="Hackathon@1234"
    )
    
    print("Testing Authentication...")
    try:
        # Instead of calling authenticate(), we will call the raw post to see what's happening
        payload = {
            "BookingMode": "API",
            "UserName": client.username,
            "Password": client.password,
            "IPAddress": "192.168.10.36",
        }
        import requests
        url = f"{client.booking_url}/Authenticate/ValidateAgency"
        print(f"POSTing to: {url}")
        resp = requests.post(
            url, json=payload, headers=client.headers, timeout=60
        )
        print("Status code:", resp.status_code)
        print("Response text:", resp.text[:1000])
        token_id = resp.json().get("TokenId")
        print(f"Authenticated successfully! Token: {token_id[:20]}...")
    except Exception as e:
        print(f"Auth failed: {e}")
        return

if __name__ == "__main__":
    run_test()
