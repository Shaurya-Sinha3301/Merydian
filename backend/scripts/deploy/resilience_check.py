"""
Milestone 12 drills not covered elsewhere: a database restart, a live stream that loses its API copy,
a webhook whose address is changed to an internal one after it was registered, and "sign out everywhere".

Run through scripts/deploy/stack.py with two API copies and a worker. For the database drill, point the stack
at a dedicated Postgres container and name it in STACK_DB_CONTAINER; without it that drill is skipped.
    python scripts/deploy/stack.py --apis 2 --worker --db-server <url> scripts/deploy/resilience_check.py
"""
import json
import os
import signal
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path

import requests

sys.path[:0] = [str(Path(__file__).resolve().parents[2]), str(Path(__file__).resolve().parents[3])]
from sqlalchemy import select, update  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app.core.db import engine  # noqa: E402
from app.models.phase3 import WebhookDelivery, WebhookEndpoint  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services import notification_service as ns  # noqa: E402

URLS = os.environ.get("STACK_API_URLS", sys.argv[1] if len(sys.argv) > 1 else "").split(",")
PIDS = [p for p in os.environ.get("STACK_API_PIDS", "").split(",") if p]
ok = True


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""), flush=True)


def wait_for(fn, seconds=90):
    end = time.time() + seconds
    while time.time() < end:
        try:
            v = fn()
            if v:
                return v
        except Exception:
            pass
        time.sleep(1)
    try:
        return fn()
    except Exception:
        return None


A = URLS[0].rstrip("/")
B = (URLS[1] if len(URLS) > 1 else URLS[0]).rstrip("/")
trav = requests.post(f"{A}/api/v1/demo/load/Family_Vacation", timeout=60).json()
token = trav["access_token"]
import base64  # noqa: E402

_claims = json.loads(base64.urlsafe_b64decode(token.split(".")[1] + "=="))
with Session(engine) as s:
    me = s.get(User, uuid.UUID(_claims["sub"]))


def notify(title):
    ns.notify_users([me.id], "check.stream", title)


# ----------------------------------------------------------------------------------------------- stream
print("\n== A browser whose API copy dies picks up where it left off on the other copy")
seen = []


def listen(base, after, stop):
    with requests.get(f"{base}/api/v1/notifications/stream", params={"token": token, "after": after}, stream=True, timeout=120) as r:
        for line in r.iter_lines():
            if stop.is_set():
                return
            if line.startswith(b"data:"):
                try:
                    seen.append(json.loads(line[5:]))
                except ValueError:
                    pass


stop = threading.Event()
threading.Thread(target=listen, args=(A, 0, stop), daemon=True).start()
time.sleep(2)
notify("before the outage")
first = wait_for(lambda: [n for n in seen if isinstance(n, dict) and n.get("title") == "before the outage"], 20)
check("the stream on the first copy delivers a notification live", bool(first))
last_id = max((n.get("id") or 0) for n in seen if isinstance(n, dict)) if seen else 0
stop.set()
if PIDS and len(URLS) > 1:
    try:
        os.kill(int(PIDS[0]), signal.SIGTERM if hasattr(signal, "SIGTERM") else 15)
    except Exception:
        pass


def _alive(url):
    try:
        return requests.get(url + "/health/live", timeout=2).status_code == 200
    except Exception:
        return False


if PIDS and len(URLS) > 1:
    check("the first API copy is gone", wait_for(lambda: not _alive(A), 20))
notify("during the outage 1")
notify("during the outage 2")
seen.clear()
stop2 = threading.Event()
threading.Thread(target=listen, args=(B, last_id, stop2), daemon=True).start()
missed = wait_for(lambda: sorted(n.get("title") for n in seen if isinstance(n, dict) and n.get("title", "").startswith("during")), 20)
check("reconnecting to the other copy with the last id it saw delivers exactly what it missed",
      missed == ["during the outage 1", "during the outage 2"], str(missed))
notify("after reconnecting")
check("and live delivery continues on the new copy",
      wait_for(lambda: any(isinstance(n, dict) and n.get("title") == "after reconnecting" for n in seen), 20))
stop2.set()

# ----------------------------------------------------------------------------------------------- webhook
print("\n== A webhook pointed at an internal address after registration")
agent = requests.post(f"{B}/api/v1/demo/load/Agent", timeout=60).json()
AH = {"Authorization": f"Bearer {agent['access_token']}"}
r = requests.post(f"{B}/api/v1/agent/webhooks", headers=AH, timeout=30,
                  json={"name": "later changed", "url": "https://example.com/merydian-hook", "events": ["job.failed"]})
check("an endpoint with a public address is accepted", r.status_code in (200, 201), str(r.status_code))
r2 = requests.post(f"{B}/api/v1/agent/webhooks", headers=AH, timeout=30, json={"name": "internal", "url": "http://127.0.0.1:9/x"})
check("an endpoint with an internal address is refused at registration", r2.status_code == 400, str(r2.status_code))
with Session(engine) as s:
    ep = s.execute(select(WebhookEndpoint).where(WebhookEndpoint.name == "later changed")).scalars().first()
    s.execute(update(WebhookEndpoint).where(WebhookEndpoint.id == ep.id).values(url="http://127.0.0.1:9/merydian-hook"))
    s.commit()
    ep_id = ep.id
row = ns.deliver(ep_id, "job.failed", "Address changed", "", None, {}, event_id=str(uuid.uuid4()))
check("a delivery after the address was changed to an internal one is refused at send time",
      row.ok is False and "private" in (row.error or "").lower() and row.status_code is None, row.error)

# ----------------------------------------------------------------------------------------------- sessions
print("\n== Sign out everywhere cuts off tokens already handed out")
email, pw = f"device_{uuid.uuid4().hex[:6]}@example.com", "Device-Check-1"
requests.post(f"{B}/api/v1/auth/signup", json={"email": email, "password": pw, "full_name": "Two Devices"}, timeout=30)
laptop = requests.post(f"{B}/api/v1/auth/login", data={"username": email, "password": pw}, timeout=30).json()["access_token"]
phone = requests.post(f"{B}/api/v1/auth/login", data={"username": email, "password": pw}, timeout=30).json()["access_token"]
check("both devices are signed in", requests.get(f"{B}/api/v1/settings", headers={"Authorization": f"Bearer {laptop}"}, timeout=30).status_code == 200)
time.sleep(1.1)
requests.post(f"{B}/api/v1/auth/logout-all", headers={"Authorization": f"Bearer {phone}"}, timeout=30)
r = requests.get(f"{B}/api/v1/settings", headers={"Authorization": f"Bearer {laptop}"}, timeout=30)
check("the other device's unexpired token is refused at once", r.status_code == 401, str(r.status_code))
time.sleep(1.1)
fresh = requests.post(f"{B}/api/v1/auth/login", data={"username": email, "password": pw}, timeout=30).json()["access_token"]
check("signing in again afterwards works", requests.get(f"{B}/api/v1/settings", headers={"Authorization": f"Bearer {fresh}"}, timeout=30).status_code == 200)

# ----------------------------------------------------------------------------------------------- database
print("\n== The database restarts")
container = os.environ.get("STACK_DB_CONTAINER")
if not container:
    print("SKIP the database restart drill (set STACK_DB_CONTAINER to a dedicated Postgres container)")
else:
    AH2 = dict(AH, Prefer="respond-async")
    job = requests.post(f"{B}/api/v1/trips/initialize-with-optimization", headers=AH2, timeout=30, json={
        "trip_name": "Through a restart", "destination": "Delhi, India", "start_date": "2026-12-10", "end_date": "2026-12-12",
        "family_ids": ["DEMO_FAM_VACATION"], "num_travellers": 2}).json()
    subprocess.run(["docker", "restart", container], capture_output=True)
    back = wait_for(lambda: requests.get(f"{B}/health/ready", timeout=10).status_code == 200, 90)
    check("the API is ready again on its own after Postgres restarts", back)
    check("requests work again (stale pooled connections are replaced)",
          requests.post(f"{B}/api/v1/auth/login", data={"username": email, "password": pw}, timeout=30).status_code == 200)
    done = wait_for(lambda: requests.get(f"{B}/api/v1/jobs/{job['job_id']}", headers=AH, timeout=30).json()["status"] == "COMPLETED", 180)
    from app.models.agent_job import AgentJob, AgentJobEvent  # noqa: E402

    with Session(engine) as s:
        j = s.get(AgentJob, uuid.UUID(job["job_id"]))
        trail = [e.event_type for e in s.execute(select(AgentJobEvent).where(AgentJobEvent.job_id == j.id)
                                                 .order_by(AgentJobEvent.timestamp)).scalars().all()]
    check("a job submitted just before the restart still completes", done,
          f"{j.status.value}, attempts {j.attempt_count}, fence {j.fence}, {j.error_type or ''} {(j.error_message or '')[:120]} | {' > '.join(trail)}")

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
