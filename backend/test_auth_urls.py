import requests

def test_auth():
    username = "Hackathon"
    password = "Hackathon@1234"
    ip = "192.168.10.36"
    
    payload = {
        "BookingMode": "API",
        "UserName": username,
        "Password": password,
        "IPAddress": ip,
    }
    
    urls_to_try = [
        "https://api.tektravels.com/Authenticate/ValidateAgency",
        "https://api.tektravels.com/SharedServices/SharedData.svc/rest/Authenticate",
        "http://api.tektravels.com/SharedServices/SharedData.svc/rest/Authenticate",
        "http://api.tbotechnology.in/TBOHolidays_BookingEngineAPI/Authenticate/ValidateAgency",
        "http://api.tbotechnology.in/TBOHolidays_AirService/Authenticate/ValidateAgency",
        "https://api.tboair.com/Authenticate/ValidateAgency",
        "http://api.tboair.com/Authenticate/ValidateAgency",
        "https://testapi.tboair.com/Authenticate/ValidateAgency",
        "http://testapi.tboair.com/Authenticate/ValidateAgency"
    ]
    
    print("Testing Auth Endpoints...")
    for base_url in urls_to_try:
        try:
            print(f"\nTrying: {base_url}")
            resp = requests.post(base_url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:200]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_auth()
