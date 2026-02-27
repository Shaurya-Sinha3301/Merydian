import requests
import json
import traceback

def test_auth():
    username = "Hackathon"
    password = "Hackathon@1234" # from screenshot
    # Also "Hackathon@123" was in B2B but we will try @1234 first
    ip = "192.168.10.36"
    
    payload = {
        "BookingMode": "API",
        "UserName": username,
        "Password": password,
        "IPAddress": ip,
    }
    
    urls_to_try = [
        "https://api.tektravels.com/Authenticate/ValidateAgency",
        "http://api.tektravels.com/Authenticate/ValidateAgency",
        "https://api.tektravels.com/SharedServices/SharedData.svc/rest/Authenticate",
        "http://api.tektravels.com/SharedServices/SharedData.svc/rest/Authenticate",
        "https://api.tektravels.com/BookingEngineService_Air/AirService.svc/rest/Authenticate",
        "http://api.tbotechnology.in/TBOHolidays_BookingEngineAPI/Authenticate/ValidateAgency",
        "http://api.tbotechnology.in/TBOHolidays_AirService/Authenticate/ValidateAgency",
        "http://api.tbotechnology.in/Authenticate/ValidateAgency",
        "https://api.tbotechnology.in/Authenticate/ValidateAgency",
        # Adding api/v1 patterns
        "https://api.tektravels.com/api/v1/Authenticate/ValidateAgency",
        "http://api.tektravels.com/api/v1/Authenticate/ValidateAgency"
    ]
    
    results = {}
    
    for base_url in urls_to_try:
        try:
            resp = requests.post(base_url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
            results[base_url] = {
                "status": resp.status_code,
                "response": resp.text[:200]
            }
        except Exception as e:
            results[base_url] = {"error": str(e)}

    with open("auth_test_results.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    test_auth()
