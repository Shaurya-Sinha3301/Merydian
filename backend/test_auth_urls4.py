import requests
import json

def test_auth():
    payloads = [
        # From postman
        {
            "BookingMode": "API",
            "UserName": "Hackathon",
            "Password": "Hackathon@1234",
            "IPAddress": "192.168.10.36"
        },
        # From documentation
        {
            "ClientId": "ApiIntegrationNew",
            "UserName": "Hackathon",
            "Password": "Hackathon@1234",
            "EndUserIp": "192.168.11.120"
        }
    ]
    
    urls_to_try = [
        "http://Sharedapi.tektravels.com/SharedData.svc/rest/Authenticate",
        "https://Sharedapi.tektravels.com/SharedData.svc/rest/Authenticate",
        "http://api.tektravels.com/SharedData.svc/rest/Authenticate",
        "https://api.tektravels.com/SharedData.svc/rest/Authenticate",
        "http://api.tektravels.com/SharedServices/SharedData.svc/rest/Authenticate",
        "https://api.tektravels.com/SharedServices/SharedData.svc/rest/Authenticate"
    ]
    
    print("Testing Sharedapi Endpoints...\n")
    
    for url in urls_to_try:
        print(f"--- Trying: {url} ---")
        for i, payload in enumerate(payloads):
            try:
                resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
                print(f"Payload {i+1} Status:", resp.status_code)
                print(f"Response: {resp.text[:200]}")
            except Exception as e:
                print(f"Payload {i+1} Error: {e}")
        print()

if __name__ == "__main__":
    test_auth()
