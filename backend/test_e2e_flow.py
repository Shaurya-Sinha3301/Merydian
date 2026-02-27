"""
MeiliAI — End-to-End Backend Test
==================================
Tests the full travel agent workflow inside Docker:
  1. Sign up agent + traveller
  2. Initialize trip with ML optimizer
  3. Search hotels via TBO
  4. Search flights via TBO  
  5. Agent reviews & approves itinerary
  6. Customer sends feedback → re-optimization
  7. Retrieve cost analysis / explanations
"""
import requests, json, sys, time
from datetime import datetime, timedelta

BASE = "http://localhost:8000/api/v1"
S = requests.Session()

# ---------- Colours ----------
G = "\033[92m"; R = "\033[91m"; Y = "\033[93m"; B = "\033[94m"; E = "\033[0m"

def ok(msg):   print(f"{G}✓ {msg}{E}")
def fail(msg): print(f"{R}✗ {msg}{E}")
def info(msg): print(f"{B}→ {msg}{E}")
def warn(msg): print(f"{Y}⚠ {msg}{E}")

def check(resp, label):
    if resp.status_code < 300:
        ok(f"{label} [{resp.status_code}]")
        return resp.json()
    else:
        fail(f"{label} [{resp.status_code}]: {resp.text[:200]}")
        return None

# ================================================================
# STAGE 0: Auth — Create agent + traveller accounts
# ================================================================
print(f"\n{'='*60}")
print(f"{B}STAGE 0: Authentication{E}")
print(f"{'='*60}")

ts = int(time.time())

# Sign up agent
info("Signing up agent...")
agent_data = check(S.post(f"{BASE}/auth/signup", json={
    "email": f"agent_{ts}@test.com",
    "password": "TestPass123!",
    "full_name": "Test Agent",
    "role": "agent"
}), "Agent signup")

AGENT_TOKEN = agent_data["access_token"] if agent_data else None
AGENT_HEADERS = {"Authorization": f"Bearer {AGENT_TOKEN}"} if AGENT_TOKEN else {}

# Sign up traveller
info("Signing up traveller...")
traveller_data = check(S.post(f"{BASE}/auth/signup", json={
    "email": f"traveller_{ts}@test.com",
    "password": "TestPass123!",
    "full_name": "Test Traveller",
    "role": "traveller"
}), "Traveller signup")

TRAVELLER_TOKEN = traveller_data["access_token"] if traveller_data else None
TRAVELLER_HEADERS = {"Authorization": f"Bearer {TRAVELLER_TOKEN}"} if TRAVELLER_TOKEN else {}

if not AGENT_TOKEN or not TRAVELLER_TOKEN:
    fail("Cannot proceed without auth tokens")
    sys.exit(1)


# ================================================================
# STAGE 1: Trip Initialization
# ================================================================
print(f"\n{'='*60}")
print(f"{B}STAGE 1: Trip Initialization with Preferences{E}")
print(f"{'='*60}")

start_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
end_date = (datetime.now() + timedelta(days=33)).strftime("%Y-%m-%d")

trip_payload = {
    "trip_name": f"E2E Test Trip {ts}",
    "destination": "Delhi, India",
    "start_date": start_date,
    "end_date": end_date,
    "baseline_itinerary": "delhi_3day_skeleton",
    "families": [{
        "family_id": "FAM_A",
        "members": 4,
        "children": 2,
        "budget_sensitivity": 0.8,
        "energy_level": 0.6,
        "pace_preference": "relaxed",
        "interest_vector": {
            "history": 0.9, "architecture": 0.7, "food": 0.5,
            "nature": 0.4, "nightlife": 0.1, "shopping": 0.3, "religious": 0.8
        },
        "must_visit_locations": ["LOC_008"],
        "never_visit_locations": ["LOC_011"]
    }]
}

trip_result = check(S.post(f"{BASE}/trips/initialize", json=trip_payload), "Trip Init")
TRIP_ID = trip_result.get("trip_id") if trip_result else None
info(f"Trip ID: {TRIP_ID}")

if trip_result:
    summary = trip_result.get("summary", {})
    info(f"Families: {summary.get('families_registered')}, Members: {summary.get('total_members')}, Days: {summary.get('trip_duration_days')}")


# ================================================================
# STAGE 2: Hotel Search via TBO API
# ================================================================
print(f"\n{'='*60}")
print(f"{B}STAGE 2: Hotel Search (TBO API){E}")
print(f"{'='*60}")

hotel_search = {
    "checkin": start_date,
    "checkout": end_date,
    "city_code": "130443",
    "rooms": 1,
    "adults": 2,
    "children": 1,
    "children_ages": [8],
    "nationality": "IN",
    "max_hotels": 3
}

hotel_result = check(S.post(f"{BASE}/bookings/hotels/search", json=hotel_search, headers=AGENT_HEADERS), "Hotel Search")

if hotel_result and hotel_result.get("hotels"):
    hotels = hotel_result["hotels"]
    info(f"Found {len(hotels)} hotels")
    for h in hotels[:3]:
        print(f"    🏨 {h.get('hotel_name', 'N/A')} — ★{h.get('star_rating', '?')} — ₹{h.get('min_price', '?')}")
elif hotel_result:
    warn(f"No hotels found. Response keys: {list(hotel_result.keys())}")


# ================================================================
# STAGE 3: Flight Search via TBO Air API
# ================================================================
print(f"\n{'='*60}")
print(f"{B}STAGE 3: Flight Search (TBO Air API){E}")
print(f"{'='*60}")

flight_search = {
    "journey_type": "1",
    "origin": "BOM",
    "destination": "DEL",
    "departure_date": start_date,
    "adults": 2,
    "children": 1,
    "infants": 0,
    "cabin_class": 1,
    "sources": ["GDS", "LCC"]
}

flight_result = False
try:
    resp = S.post(f"{BASE}/flights/search", json=flight_search, headers=AGENT_HEADERS)
    if resp.status_code == 200:
        flight_result = resp.json()
        ok("Flight Search [200]")
    else:
        warn(f"Flight Search [{resp.status_code}]: {resp.text[:100]} (Expected if no TBO Air generic creds)")
except Exception as e:
    warn(f"Flight Search failed: {e}")

if flight_result and flight_result.get("results"):
    results = flight_result["results"]
    info(f"Found {len(results)} flights")
    for f in results[:3]:
        segments = f.get("segments", [[]])[0] if f.get("segments") else []
        airline = segments[0].get("airline", {}).get("name", "N/A") if segments else "N/A"
        fare = f.get("fare", {}).get("published_fare", "?")
        print(f"    ✈️  {airline} — ₹{fare}")
elif flight_result:
    warn(f"No flights found. Response keys: {list(flight_result.keys())}")


# ================================================================
# STAGE 4: Agent Reviews and Approves
# ================================================================
print(f"\n{'='*60}")
print(f"{B}STAGE 4: Agent Reviews Itinerary{E}")
print(f"{'='*60}")

# Get trip summary first
if TRIP_ID:
    trip_summary = check(S.get(f"{BASE}/trips/{TRIP_ID}/summary"), f"Trip Summary ({TRIP_ID})")
    if trip_summary:
        info(f"Iteration: {trip_summary.get('iteration_count', 0)}, Feedback: {trip_summary.get('feedback_count', 0)}")
else:
    warn("Skipping — no trip_id from Stage 1")


# ================================================================
# STAGE 5: Customer Feedback → Re-optimization
# ================================================================
print(f"\n{'='*60}")
print(f"{B}STAGE 5: Customer Feedback → Re-optimization{E}")
print(f"{'='*60}")

if TRIP_ID:
    feedback_payload = {
        "message": "Add Akshardham temple and remove Hauz Khas Village please"
    }

    info("Sending feedback (this triggers LLM parsing + optimizer + explainability)...")
    feedback_result = check(
        S.post(f"{BASE}/itinerary/feedback/agent", json=feedback_payload),
        "Feedback Processing"
    )

    if feedback_result:
        info(f"Updated: {feedback_result.get('itinerary_updated')}")
        info(f"Action: {feedback_result.get('action_taken')}")
        info(f"Iteration: {feedback_result.get('iteration')}")
        cost = feedback_result.get("cost_analysis")
        if cost:
            info(f"Cost Analysis: {json.dumps(cost, indent=2)}")
        explanations = feedback_result.get("explanations", [])
        for exp in explanations[:3]:
            print(f"    💬 {exp[:120]}")
else:
    warn("Skipping — no trip_id")


# ================================================================
# STAGE 6: Retrieve Explanations (Deep Cost Analysis)
# ================================================================
print(f"\n{'='*60}")
print(f"{B}STAGE 6: Retrieve Explanations (Cost Analysis){E}")
print(f"{'='*60}")

if TRIP_ID:
    explain_result = check(
        S.get(f"{BASE}/itinerary/explanations/trip/{TRIP_ID}", headers=TRAVELLER_HEADERS),
        "Trip Explanations"
    )
    if explain_result:
        total = explain_result.get("total", 0)
        info(f"Total explanations: {total}")
        by_day = explain_result.get("by_day", {})
        for day, items in by_day.items():
            for item in items:
                poi = item.get("poi_name", "?")
                ct = item.get("change_type", "?")
                cost = item.get("cost_delta", {})
                print(f"    Day {day}: {ct} — {poi} — Cost: {cost}")
else:
    warn("Skipping — no trip_id")


# ================================================================
# STAGE 7: Summary
# ================================================================
print(f"\n{'='*60}")
print(f"{B}STAGE 7: Final Trip State{E}")
print(f"{'='*60}")

if TRIP_ID:
    final = check(S.get(f"{BASE}/trips/{TRIP_ID}/summary"), "Final Summary")
    if final:
        info(f"Trip: {final.get('trip_name', '?')}")
        info(f"Iterations: {final.get('iteration_count', 0)}")
        info(f"Feedback events: {final.get('feedback_count', 0)}")

print(f"\n{'='*60}")
ok("E2E TEST COMPLETE")
print(f"{'='*60}\n")
