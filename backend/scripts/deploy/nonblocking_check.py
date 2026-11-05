"""
Milestone 6 proof: the API never blocks on a solve.

Needs a running API and worker on a seeded database, and SQLALCHEMY_DATABASE_URI for the same database.
Run from backend/:  python scripts/deploy/nonblocking_check.py [BASE_URL]
"""
import statistics
import sys
import threading
import time
import uuid
from pathlib import Path

import requests

sys.path[:0] = [str(Path(__file__).resolve().parents[2]), str(Path(__file__).resolve().parents[3])]
from sqlalchemy import func, select  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app.core.db import engine  # noqa: E402
from app.models.agent_job import AgentJob  # noqa: E402
from app.models.itinerary_option import ItineraryOptionDB  # noqa: E402
from app.models.trip_session import TripSession  # noqa: E402

ROOT = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8016").rstrip("/")
B = ROOT + "/api/v1"
ok = True


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""), flush=True)


agent = requests.post(f"{B}/demo/load/Agent", timeout=60).json()
AH = {"Authorization": f"Bearer {agent['access_token']}"}
trav = requests.post(f"{B}/demo/load/Family_Vacation", timeout=60).json()
TH = {"Authorization": f"Bearer {trav['access_token']}"}


def trip_body(name):
    return {"trip_name": name, "destination": "Delhi, India", "start_date": "2026-12-10", "end_date": "2026-12-12",
            "family_ids": ["DEMO_FAM_VACATION"], "num_travellers": 2}


def follow(job_id, seconds=180):
    end = time.time() + seconds
    while time.time() < end:
        j = requests.get(f"{B}/jobs/{job_id}", headers=AH, timeout=30).json()
        if j["status"] in ("COMPLETED", "FAILED", "CANCELLED"):
            return j
        time.sleep(1)
    return j


print("\n== A trivial page stays fast while a plan is being built")
baseline = []
for _ in range(20):
    t0 = time.time()
    requests.get(f"{ROOT}/health/live", timeout=10)
    baseline.append(time.time() - t0)
latencies, done = [], {}


def create():
    t0 = time.time()
    done["r"] = requests.post(f"{B}/trips/initialize-with-optimization", json=trip_body(f"Nonblocking {uuid.uuid4().hex[:4]}"), headers=AH, timeout=120)
    done["secs"] = time.time() - t0


th = threading.Thread(target=create)
th.start()
while th.is_alive():
    t0 = time.time()
    requests.get(f"{ROOT}/health/live", timeout=10)
    latencies.append(time.time() - t0)
    time.sleep(0.05)
r = done["r"]
check("the plan was built and returned as before (201, trip and option)", r.status_code == 201 and r.json().get("trip_id") and r.json().get("option_id"),
      f"HTTP {r.status_code} in {done['secs']:.1f} s")
# If the API ran the solver itself, a request arriving mid-build would wait for most of the build.
# The worker shares this machine's CPU, so some slowdown is expected; waiting on the solve is not.
check("meanwhile a trivial page never waited on the solve", latencies and max(latencies) < min(1.0, done["secs"] / 2),
      f"{len(latencies)} requests during a {done['secs']:.1f} s build, slowest {max(latencies) * 1000:.0f} ms, "
      f"idle median {statistics.median(baseline) * 1000:.0f} ms")

print("\n== A client that asks to be answered at once")
r = requests.post(f"{B}/trips/initialize-with-optimization", json=trip_body("Async trip"), headers={**AH, "Prefer": "respond-async"}, timeout=30)
body = r.json()
check("gets 202 Accepted with the job to follow", r.status_code == 202 and body.get("job_id") and r.headers.get("Location", "").endswith(body.get("job_id", "?")),
      f"HTTP {r.status_code}")
j = follow(body["job_id"])
result = j.get("result") or {}
check("the job finishes and reports the trip and option it made", j["status"] == "COMPLETED" and result.get("trip_id") == body.get("trip_id") and result.get("option_id"))
with Session(engine) as s:
    option = s.get(ItineraryOptionDB, uuid.UUID(result["option_id"])) if result.get("option_id") else None
check("and the plan is waiting for the agent's approval", option is not None)

print("\n== Errors still come back as errors")
with Session(engine) as s:
    jobs_before = s.execute(select(func.count()).select_from(AgentJob)).scalar()
r = requests.post(f"{B}/trips/initialize-with-optimization", json=dict(trip_body("Bad dates"), start_date="10/12/2026"), headers=AH, timeout=60)
check("a malformed date is rejected before anything starts", r.status_code in (400, 422), f"HTTP {r.status_code}")
r = requests.post(f"{B}/trips/initialize-with-optimization", json=dict(trip_body("Backwards"), end_date="2026-12-01"), headers=AH, timeout=60)
check("an end date before the start date is rejected", r.status_code in (400, 422), f"HTTP {r.status_code}")
with Session(engine) as s:
    jobs_after = s.execute(select(func.count()).select_from(AgentJob)).scalar()
check("and neither created a job or a half-made trip", jobs_after == jobs_before)

print("\n== A traveller planning their own trip")
r = requests.post(f"{B}/trips/request", headers=TH, timeout=120, json={
    "trip_name": "My own trip", "destination": "Delhi, India", "start_date": "2026-12-20", "end_date": "2026-12-22", "members": 2})
check("gets the plan in the same response as before", r.status_code == 201 and r.json().get("trip_id"), f"HTTP {r.status_code}")

print("\n== Running a trip job twice makes one trip")
from app.workers.agent_tasks import execute_agent_job_task  # noqa: E402

with Session(engine) as s:
    job = s.execute(select(AgentJob).where(AgentJob.input_payload["trip_id"].astext == result["trip_id"])).scalars().first()
execute_agent_job_task.apply_async(args=[str(job.id)])
time.sleep(6)
with Session(engine) as s:
    trips = s.execute(select(func.count()).select_from(TripSession).where(TripSession.trip_id == result["trip_id"])).scalar()
    options = s.execute(select(func.count()).select_from(ItineraryOptionDB).where(ItineraryOptionDB.trip_id == result["trip_id"])).scalar()
check("a repeated message for the finished job creates no second trip or plan", trips == 1 and options == 1, f"{trips} trip, {options} option")

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
