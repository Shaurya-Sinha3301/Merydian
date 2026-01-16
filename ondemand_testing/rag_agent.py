import requests
import json

API_URL = "https://api.on-demand.io/automation/api/workflow/6969d7cac28c63108ddb5edc/execute"
API_KEY = "4plD8Lt7X9COvLY83aDchJvaRVHHYEm5"

headers = {
    "Content-Type": "application/json",
    "apikey": API_KEY
}

payload = {
    "message": "I want to visit Lotus Temple",
    "family_preference": {
        "family_id": "FAM_A",
        "members": 4,
        "children": 2,
        "budget_sensitivity": 0.9,
        "energy_level": 0.6,
        "pace_preference": "relaxed",
        "interest_vector": {
            "history": 0.9,
            "architecture": 0.8,
            "food": 0.4,
            "nature": 0.5,
            "nightlife": 0.1,
            "shopping": 0.3,
            "religious": 0.9
        },
        "must_visit_locations": [
            "LOC_008",
            "LOC_016"
        ],
        "never_visit_locations": [
            "LOC_001"
        ],
        "notes": "Budget sensitive. History buff. HATES Red Fort. LOVES Akshardham."
    }
}

response = requests.post(API_URL, headers=headers, json=payload)

print("Status Code:", response.status_code)
print("Response JSON:")
print(response.text)
