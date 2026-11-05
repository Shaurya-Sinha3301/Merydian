"""
Milestone 10 proof: the scheduler repairs stuck work without anyone looking, and only one copy acts.

Needs SQLALCHEMY_DATABASE_URI (a migrated scratch database) and REDIS_URL, with no worker running (so lost
messages stay lost until the scheduler acts).
Run from backend/:  python scripts/deploy/scheduler_check.py
"""
import sys
import threading
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import redis

sys.path[:0] = [str(Path(__file__).resolve().parents[2]), str(Path(__file__).resolve().parents[3])]
from sqlalchemy import func, select, update  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app import scheduler  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.db import engine  # noqa: E402
from app.core.redis import queue_url  # noqa: E402
from app.models.agent_job import AgentJob, AgentJobEvent, JobStatus, JobType  # noqa: E402
from app.models.idempotency import IdempotencyKey  # noqa: E402
from app.models.outbox import OutboxMessage  # noqa: E402
from app.services.agent_job_service import AgentJobService as J  # noqa: E402

ok = True
Q = redis.from_url(queue_url(), decode_responses=True)


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""), flush=True)


def age(job_id, seconds, created_too=False):
    with Session(engine) as s:
        values = {"updated_at": datetime.utcnow() - timedelta(seconds=seconds)}
        if created_too:
            values["created_at"] = datetime.utcnow() - timedelta(seconds=seconds)
        s.execute(update(AgentJob).where(AgentJob.id == job_id).values(**values))
        s.commit()


def republished(job_id):
    with Session(engine) as s:
        return s.execute(select(func.count()).select_from(AgentJobEvent).where(
            AgentJobEvent.job_id == job_id, AgentJobEvent.event_type == "JOB_REPUBLISHED")).scalar()


def clear_locks():
    for k in Q.scan_iter("lock:scheduler:*"):
        Q.delete(k)


Q.delete("optimizer")

print("\n== A job whose message was lost is published again")
job = J.create_job(JobType.AGENT_FEEDBACK, trip_id=f"sched-{uuid.uuid4().hex[:4]}", publish=True,
                   input_payload={"family_id": "X", "message": "lost"})
check("the job was published once", Q.llen("optimizer") == 1)
Q.delete("optimizer")  # Redis loses it
check("a fresh job is left alone (it may simply be waiting)", scheduler.republish_lost_jobs() == 0 and republished(job.id) == 0)
age(job.id, 120)
scheduler.republish_lost_jobs()
check("after a minute with no sign of life it is published again", republished(job.id) == 1 and Q.llen("optimizer") == 1)
check("and the next sweep does not repeat it straight away", scheduler.republish_lost_jobs() == 0 and republished(job.id) == 1)

waiting = J.create_job(JobType.AGENT_FEEDBACK, trip_id=f"sched-{uuid.uuid4().hex[:4]}", publish=True,
                       input_payload={"family_id": "X", "message": "waiting"})
age(waiting.id, 120)
J.touch(waiting.id)
check("a job that is waiting for its trip (it touches itself) is not mistaken for lost",
      scheduler.republish_lost_jobs() == 0 and republished(waiting.id) == 0)

print("\n== A job that is never picked up is failed with a reason, not left spinning")
for _ in range(scheduler.REPUBLISH_LIMIT - 1):
    age(job.id, 120)
    scheduler.republish_lost_jobs()
age(job.id, settings.JOB_WAIT_DEADLINE_SECONDS + 60, created_too=True)
scheduler.republish_lost_jobs()
gone = J.get_job(job.id)
check("after the limit and the deadline it is failed", gone.status == JobStatus.FAILED and "never picked up" in (gone.error_message or ""),
      f"{republished(job.id)} re-publishes, {gone.status}")

print("\n== A running job whose owner stopped renewing, with attempts left, is sent again for a takeover")
orphan = J.create_job(JobType.AGENT_FEEDBACK, trip_id=f"sched-{uuid.uuid4().hex[:4]}", input_payload={"family_id": "X", "message": "orphan"})
J.queue_job(orphan.id)
J.claim_job(orphan.id, owner="crashed")
Q.delete("optimizer")
check("a healthy running job is left alone", scheduler.resume_abandoned_jobs() == 0)
with Session(engine) as s:
    s.execute(update(AgentJob).where(AgentJob.id == orphan.id).values(
        lease_expires_at=func.timezone("utc", func.now()) - timedelta(seconds=5), updated_at=datetime.utcnow() - timedelta(minutes=5)))
    s.commit()
scheduler.resume_abandoned_jobs()
check("once its lease runs out it is sent again", republished(orphan.id) == 1 and Q.llen("optimizer") == 1)
check("and a worker that receives it takes it over with a higher fence", J.claim_job(orphan.id, owner="rescuer") == 2)
Q.delete("optimizer")

print("\n== A job whose worker died is ended")
dead = J.create_job(JobType.AGENT_FEEDBACK, trip_id=f"sched-{uuid.uuid4().hex[:4]}", input_payload={"family_id": "X", "message": "dead"})
J.queue_job(dead.id)
J.claim_job(dead.id, owner="gone")
with Session(engine) as s:
    s.execute(update(AgentJob).where(AgentJob.id == dead.id).values(
        attempt_count=AgentJob.max_attempts,
        lease_expires_at=func.timezone("utc", func.now()) - timedelta(seconds=settings.JOB_LEASE_SECONDS + 30)))
    s.commit()
check("with no attempts left and its lease long expired, it is failed without anyone looking",
      scheduler.fail_abandoned_jobs() == 1 and J.get_job(dead.id).status == JobStatus.FAILED)

print("\n== Outbox rows and keys")
with Session(engine) as s:
    stuck = OutboxMessage(kind="notify_users", status="in_progress", locked_at=datetime.utcnow() - timedelta(minutes=10), payload={})
    s.add(stuck)
    s.add(IdempotencyKey(scope="s", endpoint="e", key=uuid.uuid4().hex, request_hash="h", expires_at=datetime.utcnow() - timedelta(hours=1)))
    s.commit()
    sid = stuck.id
check("a row a vanished dispatcher left in progress is released for any dispatcher", scheduler.release_stuck_outbox() >= 1
      and Session(engine).get(OutboxMessage, sid).status == "pending")
check("expired idempotency keys are removed", scheduler.expire_idempotency_keys() >= 1)

print("\n== Only one scheduler acts")
clear_locks()
results = []
threads = [threading.Thread(target=lambda: results.append(scheduler.run_sweep("release_stuck_outbox"))) for _ in range(5)]
[t.start() for t in threads]
[t.join() for t in threads]
check("five copies start the same sweep at once: one runs it, four skip", sum(r != -1 for r in results) == 1 and results.count(-1) == 4, str(results))
check("and it is not repeated within its interval", scheduler.run_sweep("release_stuck_outbox") == -1)
clear_locks()
Q.delete("optimizer")

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
