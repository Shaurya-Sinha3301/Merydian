"""Quick API test: login as sh1@gmail.com and check /itinerary/current response"""
import urllib.request
import urllib.parse
import json
import urllib.error

BASE = "http://localhost:8000/api/v1"

# 1. Login
form = urllib.parse.urlencode({"username": "sh1@gmail.com", "password": "VoyageurDefault2026!"}).encode()
req = urllib.request.Request(f"{BASE}/auth/login", data=form, headers={"Content-Type": "application/x-www-form-urlencoded"})
try:
    with urllib.request.urlopen(req) as r:
        login_data = json.loads(r.read())
    token = login_data.get("access_token")
    print("✅ Login OK, token:", token[:25], "...")
except urllib.error.HTTPError as e:
    print(f"❌ Login failed: {e.code} — {e.read().decode()}")
    token = None

if token:
    # 2. Get /itinerary/current
    req3 = urllib.request.Request(f"{BASE}/itinerary/current", headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req3) as r:
            itin = json.loads(r.read())
        days = itin.get("days", [])
        print(f"\n✅ Itinerary returned!")
        print(f"   Top-level keys: {list(itin.keys())}")
        print(f"   Number of days: {len(days)}")
        if days:
            d0 = days[0]
            print(f"   Day 0 keys: {list(d0.keys())}")
            events = d0.get("timelineEvents", [])
            print(f"   Day 0 timelineEvents count: {len(events)}")
            if events:
                print(f"   First event: {json.dumps(events[0], indent=2)}")
            else:
                print("   ⚠️ No timelineEvents in day 0")
        else:
            print("   ⚠️ No days in itinerary!")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"❌ /itinerary/current failed: {e.code} — {body}")
