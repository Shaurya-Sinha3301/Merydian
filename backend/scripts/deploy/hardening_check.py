"""
Checks for the concurrency and abuse protections, run against a real Postgres and Redis.

Needs SQLALCHEMY_DATABASE_URI (an empty scratch database) and REDIS_URL in the environment, and the
schema created first:  python scripts/db_bootstrap.py
Run from backend/:     python scripts/deploy/hardening_check.py
"""
import asyncio
import os
import sys
import threading
import time
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.core import locks, login_throttle
from app.core.config import settings
from app.core.db import engine
from app.models.agent_job import AgentJob, JobStatus, JobType
from app.models.family import Family
from app.models.itinerary import Itinerary
from app.services.agent_job_service import AgentJobService
from app.services.itinerary_service import ItineraryService

ok = True


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""), flush=True)


def make_job(status, age_seconds=0, attempts=0):
    """A job whose owner last reported in age_seconds ago (its lease ran from then)."""
    with Session(engine) as s:
        then = datetime.utcnow() - timedelta(seconds=age_seconds)
        job = AgentJob(job_type=JobType.AGENT_FEEDBACK, status=status, attempt_count=attempts,
                       updated_at=then, created_at=then, fence=1 if status == JobStatus.RUNNING else 0,
                       lease_expires_at=then + timedelta(seconds=settings.JOB_LEASE_SECONDS) if status == JobStatus.RUNNING else None)
        s.add(job)
        s.commit()
        return job.id


def status_of(job_id):
    return AgentJobService.get_job(job_id).status


# --- 1. jobs: one owner, and a dead worker's job is recovered or ended -------------------------
print("\n== Jobs")
j = make_job(JobStatus.QUEUED)
check("a queued job can be claimed once", AgentJobService.claim_job(j) is not None)
check("a second claim of the same job is refused", AgentJobService.claim_job(j) is None)

j = make_job(JobStatus.QUEUED)
wins = []
threads = [threading.Thread(target=lambda: wins.append(AgentJobService.claim_job(j))) for _ in range(12)]
[t.start() for t in threads]
[t.join() for t in threads]
check("12 workers race for one job: exactly one wins", sum(w is not None for w in wins) == 1, f"{sum(w is not None for w in wins)} winner(s)")

lease = settings.JOB_LEASE_SECONDS
j = make_job(JobStatus.RUNNING, age_seconds=lease + 30, attempts=1)
check("a job whose worker died (lease expired) is taken over", AgentJobService.claim_job(j) is not None)
check("the takeover counts as a new attempt", AgentJobService.get_job(j).attempt_count == 2)

j = make_job(JobStatus.RUNNING, age_seconds=5, attempts=1)
check("a healthy running job is NOT taken over", AgentJobService.claim_job(j) is None)

j = make_job(JobStatus.RUNNING, age_seconds=lease + 30, attempts=3)
check("a job that used all attempts is not run again", AgentJobService.claim_job(j) is None)

j = make_job(JobStatus.RUNNING, age_seconds=lease * 2 + 30, attempts=3)
failed = AgentJobService.expire_if_stale(j)
check("a job abandoned by a dead worker is failed, not left spinning", failed is not None and status_of(j) == JobStatus.FAILED)

j = make_job(JobStatus.RUNNING, age_seconds=10, attempts=1)
check("a healthy running job is left alone by the expiry check", AgentJobService.expire_if_stale(j) is None and status_of(j) == JobStatus.RUNNING)

j = make_job(JobStatus.QUEUED, age_seconds=700)
check("a job never picked up after 10 minutes is failed", AgentJobService.expire_if_stale(j) is not None and status_of(j) == JobStatus.FAILED)

# --- 2. itinerary versions: no lost updates, no duplicate numbers -----------------------------
print("\n== Itinerary versions")
with Session(engine) as s:
    fam = Family(family_code=f"HC_{uuid.uuid4().hex[:6]}", family_name="Hardening check family")
    s.add(fam)
    s.commit()
    fam_id = fam.id

N = 20
errors = []


def write(i):
    try:
        ItineraryService.create_itinerary(fam_id, {"days": [], "total_cost": i}, created_reason=f"writer {i}", created_by="check")
    except Exception as exc:  # noqa: BLE001
        errors.append(repr(exc)[:120])


threads = [threading.Thread(target=write, args=(i,)) for i in range(N)]
t0 = time.time()
[t.start() for t in threads]
[t.join() for t in threads]
with Session(engine) as s:
    rows = s.exec(select(Itinerary).where(Itinerary.family_id == fam_id)).all()
    versions = sorted(r.version for r in rows)
    family = s.get(Family, fam_id)
    current = s.get(Itinerary, family.current_itinerary_version)
check(f"{N} simultaneous replans all saved, none failed", len(rows) == N and not errors, f"{len(rows)} saved, errors={errors[:1]}, {round(time.time() - t0, 1)} s")
check("version numbers are exactly 1..N with no duplicates", versions == list(range(1, N + 1)))
check("'current' points at the newest version", current is not None and current.version == N)

try:
    with Session(engine) as s:
        s.add(Itinerary(family_id=fam_id, version=1, data={}, created_reason="duplicate", created_by="check"))
        s.commit()
    check("the database refuses a duplicate version number", False)
except IntegrityError:
    check("the database refuses a duplicate version number", True)

# --- 3. the per-trip lock --------------------------------------------------------------------
print("\n== Per-trip lock")
name = f"check:{uuid.uuid4().hex}"
a = locks.acquire(name, 30)
check("first worker takes the lock", a is not None)
check("second worker is turned away while it is held", locks.acquire(name, 30) is None)
locks.release(name, "not-the-owner")
check("a stranger cannot release someone else's lock", locks.acquire(name, 30) is None)
locks.release(name, a)
b = locks.acquire(name, 1)
check("after release the lock can be taken again", b is not None)
time.sleep(1.5)
c = locks.acquire(name, 30)
check("a lock whose holder crashed expires on its own", c is not None)
locks.release(name, c)

# --- 4. sign-in lockout ----------------------------------------------------------------------
print("\n== Sign-in lockout")


async def lockout():
    email = f"victim_{uuid.uuid4().hex[:6]}@example.com"
    for _ in range(settings.LOGIN_MAX_FAILURES - 1):
        await login_throttle.record_failure(email)
    await login_throttle.check(email)
    check(f"{settings.LOGIN_MAX_FAILURES - 1} wrong passwords do not lock the account", True)
    await login_throttle.record_failure(email)
    try:
        await login_throttle.check(email)
        check(f"the {settings.LOGIN_MAX_FAILURES}th wrong password locks it", False)
    except Exception as exc:  # HTTPException 429
        check(f"the {settings.LOGIN_MAX_FAILURES}th wrong password locks it", getattr(exc, "status_code", None) == 429 and "Retry-After" in (exc.headers or {}))
    await login_throttle.clear(email)
    await login_throttle.check(email)
    check("a clear (successful sign-in) lifts the count", True)
    # an unknown email is counted the same way, so lockout does not reveal which accounts exist
    ghost = f"nobody_{uuid.uuid4().hex[:6]}@example.com"
    for _ in range(settings.LOGIN_MAX_FAILURES):
        await login_throttle.record_failure(ghost)
    try:
        await login_throttle.check(ghost)
        check("an email that does not exist locks the same way", False)
    except Exception as exc:
        check("an email that does not exist locks the same way", getattr(exc, "status_code", None) == 429)
    await login_throttle.clear(ghost)


asyncio.run(lockout())

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
