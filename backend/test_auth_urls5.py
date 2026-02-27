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
    
    results = {}
    
    for url in urls_to_try:
        results[url] = []
        for i, payload in enumerate(payloads):
            try:
                resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
                results[url].append({
                    "payload_index": i,
                    "status": resp.status_code,
                    "response": resp.json() if resp.status_code == 200 else resp.text[:200]
                })
            except Exception as e:
                results[url].append({
                    "payload_index": i,
                    "error": str(e)
                })

    with open("auth_test_results5.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    test_auth()
