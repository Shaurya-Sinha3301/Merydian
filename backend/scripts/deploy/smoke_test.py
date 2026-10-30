"""
Smoke test of a running Merydian API (28 checks: health, CORS, hardening, demo, a real agency and customer,
the optimizer, live push, Celery feedback, webhooks, API keys).

Usage:  python smoke_test.py [BASE_URL] [AGENT_SIGNUP_CODE]
Example (a local image):  docker run ... -p 8010:8000 -e AGENT_SIGNUP_CODE=smoke-agency-code merydian-api all
                          python smoke_test.py http://127.0.0.1:8010 smoke-agency-code
It creates test accounts, so point it at a scratch or staging deployment, not at production.
"""
import sys
import re
import threading
import time
import uuid

import requests

ROOT = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8010").rstrip("/")
API = ROOT + "/api/v1"
CODE = sys.argv[2] if len(sys.argv) > 2 else "smoke-agency-code"
s = uuid.uuid4().hex[:5]
ok = True


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""))


# --- basics
check("health live", requests.get(f"{ROOT}/health/live").status_code == 200)
ready = requests.get(f"{ROOT}/health/ready").json()
check("health ready: db, redis, celery", ready["database"] == "connected" and ready["redis"] == "connected" and ready["celery"] == "connected", str(ready["llm_provider"]))
check("api docs served", requests.get(f"{ROOT}/docs").status_code == 200)

# --- CORS: the Vercel origin is allowed, a stranger is not
good = requests.options(f"{API}/auth/login", headers={"Origin": "https://example.vercel.app", "Access-Control-Request-Method": "POST"})
bad = requests.options(f"{API}/auth/login", headers={"Origin": "https://evil.example.com", "Access-Control-Request-Method": "POST"})
check("CORS allows the app origin", good.headers.get("access-control-allow-origin") == "https://example.vercel.app")
check("CORS refuses another origin", bad.headers.get("access-control-allow-origin") is None)

# --- hardening that must hold in production
check("/dev/outbox is closed", requests.get(f"{ROOT}/api/v1/dev/outbox").status_code == 404)
check("agent sign-up refuses a wrong code", requests.post(f"{API}/auth/signup", json={"email": f"x{s}@a.com", "password": "password123", "full_name": "X", "agent_code": "nope"}).status_code == 400)
check("all-trips list needs a login", requests.get(f"{API}/trips/").status_code == 401)

# --- the demo
personas = requests.get(f"{API}/demo/personas").json()
check("demo personas", len(personas['personas']) >= 5, str(len(personas['personas'])))
demo = requests.post(f"{API}/demo/load/Agent").json()
DH = {"Authorization": f"Bearer {demo['access_token']}"}
check("demo agent sees seeded trips", len(requests.get(f"{API}/trips/", headers=DH).json()["items"]) >= 5)
check("demo analytics", requests.get(f"{API}/agent/analytics", headers=DH).status_code == 200)
check("demo reset needs the admin key", requests.post(f"{API}/demo/reset").status_code in (401, 403, 422))

# --- a real agency, customer and trip
ag = requests.post(f"{API}/auth/signup", json={"email": f"sa_{s}@agency.com", "password": "password123", "full_name": "Smoke Agent", "agent_code": CODE, "agency_name": f"Smoke {s}"})
check("agent signs up with the code and an agency", ag.status_code == 200)
AH = {"Authorization": f"Bearer {ag.json()['access_token']}"}
c = requests.post(f"{API}/agent/customers", headers=AH, json={"email": f"sc_{s}@x.com", "full_name": "Smoke Customer", "members": 2, "children": 1}).json()
check("customer added with an invitation link", bool(c.get("invite_link")))
tok = re.search(r"token=([\w\-]+)", c["invite_link"]).group(1)
check("invitation token works", requests.post(f"{API}/auth/reset", json={"token": tok, "password": "smoke-pass-1"}).status_code == 200)
login = requests.post(f"{API}/auth/login", data={"username": f"sc_{s}@x.com", "password": "smoke-pass-1"})
check("invited customer signs in", login.status_code == 200)
CH = {"Authorization": f"Bearer {login.json()['access_token']}"}

t0 = time.time()
trip = requests.post(f"{API}/trips/initialize-with-optimization", headers=AH, timeout=300, json={"trip_name": f"Smoke {s}", "destination": "Delhi, India", "start_date": "2026-12-10", "end_date": "2026-12-12", "family_ids": [c["family_code"]], "num_travellers": 2})
check("optimizer builds a plan inside the container", trip.status_code == 201, f"{round(time.time() - t0, 1)} s")
t = trip.json()

# --- live stream: the customer is told when the agent approves
got = []


def listen():
    with requests.get(f"{API}/notifications/stream", params={"token": login.json()["access_token"]}, stream=True, timeout=90) as r:
        for line in r.iter_lines():
            if line.startswith(b"data:"):
                got.append(time.time())
                return


threading.Thread(target=listen, daemon=True).start()
time.sleep(2)
a0 = time.time()
check("agent approves the first plan", requests.post(f"{API}/agent/itinerary/approve", headers=AH, json={"option_id": t["option_id"]}).status_code == 200)
for _ in range(60):
    if got:
        break
    time.sleep(0.1)
check("customer receives the live notification", bool(got), f"{round((got[0] - a0) * 1000)} ms" if got else "")
check("customer reads the timeline", requests.get(f"{API}/itinerary/{t['trip_id']}/timeline", headers=CH).status_code == 200)
check("another agency cannot read it", requests.get(f"{API}/trips/{t['trip_id']}/history", headers={"Authorization": f"Bearer {requests.post(f'{API}/auth/signup', json={'email': f'sb_{s}@agency.com', 'password': 'password123', 'full_name': 'Other', 'agent_code': 'smoke-agency-code', 'agency_name': f'Other {s}'}).json()['access_token']}"}).status_code == 404)

# --- feedback through Celery, the language model and the optimizer
r = requests.post(f"{API}/itinerary/feedback/agent", headers=CH, json={"message": "We have a small child and get tired quickly. Please keep the days shorter."})
job = r.json().get("job_id")
t0 = time.time()
status = None
for _ in range(120):
    status = requests.get(f"{API}/jobs/{job}", headers=CH).json()["status"]
    if status in ("COMPLETED", "FAILED"):
        break
    time.sleep(2)
check("feedback runs through Celery and finishes", status == "COMPLETED", f"{status}, {round(time.time() - t0)} s")
hist = requests.get(f"{API}/trips/{t['trip_id']}/history", headers=AH).json()
check("a new version was published", len(hist["versions"]) >= 2, f"{len(hist['versions'])} versions")

# --- the rest of the surface
check("webhook to a private address is refused", requests.post(f"{API}/agent/webhooks", headers=AH, json={"name": "bad", "url": "http://127.0.0.1:9/x"}).status_code == 400)
key = requests.post(f"{API}/agent/api-keys", headers=AH, json={"name": "smoke"}).json()["key"]
check("API key works", requests.get(f"{API}/trips/", headers={"Authorization": f"Bearer {key}"}).status_code == 200)
check("booking recorded", requests.post(f"{API}/agent/bookings", headers=AH, json={"trip_id": t["trip_id"], "kind": "hotel", "title": "Smoke hotel", "amount": 100, "status": "confirmed"}).status_code == 201)
check("settings readable", requests.get(f"{API}/settings", headers=CH).status_code == 200)
fam = requests.post(f"{API}/auth/forgot", json={"email": f"nobody_{s}@none.com"})
check("forgot-password answers without revealing accounts", fam.status_code == 200)

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
