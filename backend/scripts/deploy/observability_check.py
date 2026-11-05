"""
Milestone 11 proof: failures are visible without a user reporting them.

Needs a running API and worker (showcase mode, no METRICS_TOKEN) on a seeded database, the worker's log at
backend/worker_check.log, and SQLALCHEMY_DATABASE_URI for the same database.
Run from backend/:  python scripts/deploy/observability_check.py [BASE_URL]
"""
import re
import sys
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import requests

BACKEND = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(BACKEND), str(BACKEND.parent)]
from sqlalchemy import select, text, update  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app.core.db import engine  # noqa: E402
from app.models.agent_job import AgentJob, JobStatus, JobType  # noqa: E402
from app.models.outbox import OutboxMessage  # noqa: E402
from app.services.agent_job_service import AgentJobService  # noqa: E402

ROOT = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8018").rstrip("/")
B = ROOT + "/api/v1"
ok = True


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""), flush=True)


def metric(body, name, **labels):
    want = ",".join(f'{k}="{v}"' for k, v in labels.items())
    pat = re.escape(name) + (r"\{" + re.escape(want) + r"\}" if want else "") + r" ([0-9.eE+-]+)"
    m = re.search(pat, body)
    return float(m.group(1)) if m else None


def wait_for(fn, seconds=90):
    end = time.time() + seconds
    while time.time() < end:
        v = fn()
        if v:
            return v
        time.sleep(1)
    return fn()


print("\n== Readiness says why, not just whether")
h = requests.get(f"{ROOT}/health/ready", timeout=30).json()
check("ready reports the schema version, the workers and the model key", h.get("schema") == "current" and h.get("workers")
      and h.get("llm_provider") == "configured", f"schema {h.get('schema')}, {len(h.get('workers') or [])} worker(s)")
with Session(engine) as s:
    real = s.execute(text("SELECT version_num FROM alembic_version")).scalar()
    s.execute(text("UPDATE alembic_version SET version_num = '0008'"))
    s.commit()
r = requests.get(f"{ROOT}/health/ready", timeout=30)
with Session(engine) as s:
    s.execute(text("UPDATE alembic_version SET version_num = :v"), {"v": real})
    s.commit()
check("a schema behind the code makes the API unready, and says so", r.status_code == 503 and "code expects" in r.json().get("schema", ""),
      r.json().get("schema"))

print("\n== Metrics from shared state")
body = requests.get(f"{ROOT}/metrics", timeout=30).text
names = {"merydian_queue_length", "merydian_workers_alive", "merydian_jobs", "merydian_outbox", "merydian_job_duration_seconds",
         "merydian_lease_takeovers_total", "merydian_outbox_oldest_pending_seconds", "merydian_db_pool", "merydian_errors_last_hour"}
check("the metrics page lists queues, workers, jobs, outbox, durations, takeovers, pool use and errors",
      all(f"# TYPE {n} gauge" in body for n in names), ", ".join(sorted(n for n in names if f"# TYPE {n} gauge" not in body)) or "all present")
check("it sees the optimizer worker", (metric(body, "merydian_workers_alive", queue="optimizer") or 0) >= 1)
from app.services import outbox_service  # noqa: E402

with Session(engine) as s:
    stale = OutboxMessage(kind="notify_users", status="pending", payload={}, created_at=datetime.utcnow() - timedelta(minutes=5),
                          next_attempt_at=datetime.utcnow() + timedelta(hours=1))
    s.add(stale)
    s.commit()
    stale_id = stale.id
body = requests.get(f"{ROOT}/metrics", timeout=30).text
check("an outbox backlog shows up as the age of the oldest undelivered row", (metric(body, "merydian_outbox_oldest_pending_seconds") or 0) >= 290,
      f"{metric(body, 'merydian_outbox_oldest_pending_seconds')} s")
with Session(engine) as s:
    s.execute(update(OutboxMessage).where(OutboxMessage.id == stale_id).values(status="sent", sent_at=datetime.utcnow()))
    s.commit()

print("\n== One id follows a request into its job and the worker's log")
trav = requests.post(f"{B}/demo/load/Family_Vacation", timeout=60).json()
rid = f"trace-{uuid.uuid4().hex[:12]}"
r = requests.post(f"{B}/itinerary/feedback/agent", headers={"Authorization": f"Bearer {trav['access_token']}", "X-Request-ID": rid},
                  json={"message": f"Observability check {rid}: shorter days please."}, timeout=60)
check("the response echoes the request id", r.headers.get("X-Request-ID") == rid)
with Session(engine) as s:
    job = s.execute(select(AgentJob).where(AgentJob.correlation_id == rid)).scalars().first()
check("the job it created carries the same id", job is not None)
log = BACKEND / "worker_check.log"
check("and the worker's log line for that job carries it too",
      wait_for(lambda: log.exists() and rid in log.read_text(encoding="utf-8", errors="replace"), 90))

print("\n== Unexpected errors are grouped, with a count and the last request")
broken = [AgentJobService.create_job(JobType.TRIP_INIT, publish=True, input_payload={}) for _ in range(2)]
wait_for(lambda: all(AgentJobService.get_job(b.id).status == JobStatus.FAILED for b in broken), 90)
groups = requests.get(f"{ROOT}/ops/errors", timeout=30).json()
mine = [g for g in groups if g["last_where"] == "job TRIP_INIT" and g["type"] == "KeyError"]
check("two identical failures in background jobs are one group counted twice", len(mine) == 1 and mine[0]["count"] >= 2,
      f"{mine[0]['count']} at {mine[0]['location']}" if mine else "no group")
check("the group says where in the code it happened", bool(mine) and "trip_jobs.py" in mine[0]["location"])
page = requests.get(f"{ROOT}/ops", timeout=30)
check("the operations page shows the metrics and the error groups", page.status_code == 200 and "Merydian operations" in page.text
      and "KeyError" in page.text)

print("\n== Production keeps these pages closed")
from fastapi import HTTPException  # noqa: E402

from app.api import ops  # noqa: E402
from app.core.config import settings  # noqa: E402


def allowed(mode, token, header):
    settings.APP_MODE, settings.METRICS_TOKEN = mode, token
    try:
        ops._allowed(header)
        return True
    except HTTPException:
        return False


check("production with no token: hidden", not allowed("production", "", None))
check("production with a token: only the right bearer gets in",
      allowed("production", "s3cret-token", "Bearer s3cret-token") and not allowed("production", "s3cret-token", "Bearer wrong"))

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
