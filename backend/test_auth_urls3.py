import requests
import json
import traceback

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
        "https://api.tboair.com/Authenticate/ValidateAgency",
        "http://api.tboair.com/Authenticate/ValidateAgency",
        "https://testapi.tboair.com/Authenticate/ValidateAgency",
        "http://testapi.tboair.com/Authenticate/ValidateAgency",
        "https://api.tboholidays.com/Authenticate/ValidateAgency",
        "https://travelboutiqueonline.com/Authenticate/ValidateAgency",
        "https://api.travelboutiqueonline.com/Authenticate/ValidateAgency",
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

    with open("auth_test_results3.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    test_auth()
