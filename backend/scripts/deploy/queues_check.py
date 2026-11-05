"""
Milestones 8 and 9 proof: separate API and worker images, two queues, and worker heartbeats.

Runs against a stack started from the two images: an API container (API image), an optimizer worker and a
default worker (worker image), with WORKER_HEARTBEAT_SECONDS=3. Needs SQLALCHEMY_DATABASE_URI for the same
database (from this machine) and Docker on PATH, because it stops and kills worker containers on purpose.
Run from backend/:
    python scripts/deploy/queues_check.py <BASE_URL> <api-container> <optimizer-container> <default-container>
"""
import subprocess
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path

import requests

sys.path[:0] = [str(Path(__file__).resolve().parents[2]), str(Path(__file__).resolve().parents[3])]
from sqlalchemy import select  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app.core.db import engine  # noqa: E402
from app.models.agent_job import AgentJob, JobStatus  # noqa: E402
from app.models.outbox import OutboxMessage  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services import notification_service as ns  # noqa: E402
from app.services import outbox_service  # noqa: E402

ROOT, API_C, OPT_C, DEF_C = sys.argv[1].rstrip("/"), sys.argv[2], sys.argv[3], sys.argv[4]
B = ROOT + "/api/v1"
ok = True


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""), flush=True)


def docker(*args):
    return subprocess.run(["docker", *args], capture_output=True, encoding="utf-8", errors="replace")


def ready():
    r = requests.get(f"{ROOT}/health/ready", timeout=30)
    return r.status_code, r.json()


def wait_for(fn, seconds=60, step=1.0):
    end = time.time() + seconds
    while time.time() < end:
        v = fn()
        if v:
            return v
        time.sleep(step)
    return fn()


print("\n== The API image cannot run a solve")
probe = docker("exec", API_C, "python", "-c",
               "import importlib.util as u; print(' '.join(m for m in ('ortools','groq','agents','ml_or.itinerary_optimizer') if u.find_spec(m.split('.')[0]) and (m!='ml_or.itinerary_optimizer' or u.find_spec(m))))")
check("ortools, the model clients, the agents and the solver code are absent from the API image", probe.returncode == 0 and probe.stdout.strip() == "",
      probe.stdout.strip() or "none found")
w = docker("exec", OPT_C, "python", "-c", "import ortools, groq, agents, ml_or.itinerary_optimizer; print('present')")
check("the worker image has them", w.stdout.strip() == "present")

print("\n== Readiness knows which workers are alive")
code, h = wait_for(lambda: (lambda c, j: (c, j) if len(j.get("workers") or []) >= 2 else None)(*ready()), 60) or ready()
names = {x["name"].split("@")[0]: x["queues"] for x in h.get("workers", [])}
check("both workers report in, each with its own queues",
      names.get("worker-optimizer") == ["optimizer"] and "optimizer" not in names.get("worker-default", ["optimizer"]), str(names))
check("and the API is ready", code == 200 and h.get("celery") == "connected")

print("\n== A burst of replans does not delay a notification")
agent = requests.post(f"{B}/demo/load/Agent", timeout=60).json()
AH = {"Authorization": f"Bearer {agent['access_token']}", "Prefer": "respond-async"}
jobs = []
for i in range(6):
    r = requests.post(f"{B}/trips/initialize-with-optimization", headers=AH, timeout=30, json={
        "trip_name": f"Burst {i}", "destination": "Delhi, India", "start_date": "2026-12-10", "end_date": "2026-12-12",
        "family_ids": ["DEMO_FAM_VACATION"], "num_travellers": 2})
    jobs.append(uuid.UUID(r.json()["job_id"]))
with Session(engine) as s:
    agent_user = s.execute(select(User).where(User.role == "agent")).scalars().first()
    row = outbox_service.add(s, "notify_users", ns.announcement("notify_users", user_ids=[str(agent_user.id)], type="check.burst",
                                                                title="During a burst", body="", link=None, data={}))
    rid = row.id
    s.commit()
t0 = time.time()
sent = wait_for(lambda: Session(engine).get(OutboxMessage, rid).status == "sent", 30, 0.2)
took = time.time() - t0
with Session(engine) as s:
    waiting = sum(1 for j in jobs if s.get(AgentJob, j).status in (JobStatus.QUEUED, JobStatus.RUNNING))
check("the notification went out while replans were still queued", sent and waiting >= 1, f"{took:.1f} s, {waiting} of 6 replans still waiting")
done = wait_for(lambda: all(Session(engine).get(AgentJob, j).status == JobStatus.COMPLETED for j in jobs), 180)
with Session(engine) as s:
    owners = {s.get(AgentJob, j).lease_owner.split("@")[0] for j in jobs if s.get(AgentJob, j).lease_owner}
check("every replan ran, and only on the optimizer worker", done and owners == {"worker-optimizer"}, str(owners))

print("\n== Stopping workers")
docker("stop", "-t", "30", DEF_C)
docker("stop", "-t", "30", OPT_C)
wait_for(lambda: ready()[1].get("celery") != "connected", 20)
code, h = ready()
check("after a clean stop the API reports at once that no worker is running", code != 200 and h.get("celery") == "no_workers_available", f"HTTP {code}, {h.get('celery')}")

docker("start", OPT_C)
check("a restarted worker reports in again", wait_for(lambda: ready()[1].get("celery") == "connected", 60))
docker("kill", OPT_C)
gone = wait_for(lambda: ready()[1].get("celery") != "connected", 30)
check("a worker that is killed outright disappears once its heartbeat lapses", gone, ready()[1].get("celery"))

print("\n== A job running when its worker is stopped is not lost")
docker("start", OPT_C)
docker("start", DEF_C)
wait_for(lambda: ready()[1].get("celery") == "connected", 60)
r = requests.post(f"{B}/trips/initialize-with-optimization", headers=AH, timeout=30, json={
    "trip_name": "Stopped mid-way", "destination": "Delhi, India", "start_date": "2026-12-10", "end_date": "2026-12-12",
    "family_ids": ["DEMO_FAM_VACATION"], "num_travellers": 2})
jid = uuid.UUID(r.json()["job_id"])
wait_for(lambda: Session(engine).get(AgentJob, jid).status != JobStatus.QUEUED, 30, 0.2)
docker("stop", "-t", "60", OPT_C)
docker("start", OPT_C)
final = wait_for(lambda: Session(engine).get(AgentJob, jid).status in (JobStatus.COMPLETED, JobStatus.FAILED) and Session(engine).get(AgentJob, jid), 240)
check("it finishes once the worker is back (completed during shutdown, or redelivered)", final and final.status == JobStatus.COMPLETED,
      str(final.status if final else None))

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
