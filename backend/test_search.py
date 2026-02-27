import requests
import json
import datetime
import time

def sweep_search():
    auth_url = "http://Sharedapi.tektravels.com/SharedData.svc/rest/Authenticate"
    auth_payload = {
        "ClientId": "ApiIntegrationNew",
        "UserName": "Hackathon",
        "Password": "Hackathon@1234",
        "EndUserIp": "192.168.11.120"
    }
    
    print("Authenticating...")
    auth_resp = requests.post(auth_url, json=auth_payload, headers={"Content-Type": "application/json"})
    auth_data = auth_resp.json()
    if auth_data.get("Status") != 1:
        print("Auth failed:")
        print(auth_data)
        return
        
    token = auth_data["TokenId"]
    print(f"Token: {token}")
    
    search_url = "http://api.tektravels.com/BookingEngineService_Air/AirService.svc/rest/Search"
    
    routes = [("DEL", "BOM")]
    
    for route in routes:
        origin, dest = route
        print(f"--- Sweeping {origin} to {dest} ---")
        for day_offset in range(1, 30):
            future_date = (datetime.datetime.now() + datetime.timedelta(days=day_offset)).strftime("%Y-%m-%dT00:00:00")
            
            search_payload = {
                "EndUserIp": "192.168.10.10",
                "TokenId": token,
                "AdultCount": "1",
                "ChildCount": "0",
                "InfantCount": "0",
                "DirectFlight": "false",
                "OneStopFlight": "false",
                "JourneyType": "1",
                "PreferredAirlines": None,
                "Segments": [
                    {
                        "Origin": origin,
                        "Destination": dest,
                        "FlightCabinClass": "1",
                        "PreferredDepartureTime": future_date,
                        "PreferredArrivalTime": future_date
                    }
                ],
                "Sources": None
            }
            
            try:
                resp = requests.post(search_url, json=search_payload, headers={"Content-Type": "application/json", "Accept": "application/json"}, timeout=15)
                data = resp.json()
                status = data.get("Response", {}).get("ResponseStatus")
                if status == 1:
                    print(f"FOUND RESULTS ON {future_date}!")
                    with open("search_results.json", "w") as f:
                        json.dump(data, f, indent=2)
                    print("Saved to search_results.json")
                    return
                else:
                    error = data.get("Response", {}).get("Error", {}).get("ErrorMessage", "Unknown Error")
                    print(f"{future_date}: {error}")
            except Exception as e:
                print(f"{future_date}: Error {e}")
            
            time.sleep(1) # Rate limit protection

    print("No results found in sweep.")

if __name__ == "__main__":
    sweep_search()
