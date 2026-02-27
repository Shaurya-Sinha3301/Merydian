import json
import requests
import os

def run_postman():
    with open("API/TBO India Air API.postman_collection.json") as f:
        col = json.load(f)
        
    auth_req = col["item"][0]["item"][0]["request"]
    url = auth_req["url"]["raw"]
    
    # We will try both tektravels and tbotechnology
    base_urls = ["https://api.tektravels.com", "http://api.tbotechnology.in/TBOHolidays_AirService"]
    
    print("Postman URL:", url)
    print("Postman Body:", auth_req["body"]["raw"])
    
    body = auth_req["body"]["raw"].replace('\r', '').replace('\n', '')
    payload = json.loads(body)
    
    # Update credentials
    payload["UserName"] = "Hackathon"
    payload["Password"] = "Hackathon@1234"
    
    for base in base_urls:
        test_url = url.replace("{{RC_TBOAIR_URL}}", base)
        print(f"\n--- Testing {test_url} ---")
        try:
            resp = requests.post(test_url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
            print("Status:", resp.status_code)
            print("Response:", resp.text[:200])
        except Exception as e:
            print("Error:", e)
            
if __name__ == "__main__":
    run_postman()
