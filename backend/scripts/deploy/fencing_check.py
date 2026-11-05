"""
Milestones 5a and 5b proof: a paused or late worker can never overwrite a result, and a job that has to
wait never gives up early or runs out of order.

Needs SQLALCHEMY_DATABASE_URI (a scratch database, migrated) and REDIS_URL. Seeds the demo data itself.
Run from backend/:  python scripts/deploy/fencing_check.py
"""
import sys
import threading
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path

sys.path[:0] = [str(Path(__file__).resolve().parents[2]), str(Path(__file__).resolve().parents[3])]
from sqlalchemy import func, select, text, update  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app.core import locks  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.db import engine  # noqa: E402
from app.models.agent_job import AgentJob, AgentJobEvent, JobStatus, JobType  # noqa: E402
from app.models.itinerary import Itinerary  # noqa: E402
from app.models.outbox import OutboxMessage  # noqa: E402
from app.models.trip_session import TripSession  # noqa: E402
from app.services.agent_job_service import AgentJobService as J  # noqa: E402
from app.services.demo_seed import seed_all  # noqa: E402
from app.services.itinerary_service import ItineraryService  # noqa: E402
from app.workers.heartbeat import Heartbeat, OwnershipLost  # noqa: E402

ok = True


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""), flush=True)


seed_all()
with Session(engine) as s:
    trip = next(t for t in s.execute(select(TripSession)).scalars().all() if "DEMO_FAM_VACATION" in (t.family_ids or []))
    trip_id = trip.trip_id
    fam = uuid.UUID(next(f for f in trip.family_ids if len(str(f)) == 36))
    plan = s.execute(select(Itinerary).where(Itinerary.family_id == fam).order_by(Itinerary.version.desc())).scalars().first().data


def versions():
    with Session(engine) as s:
        return s.execute(select(func.count()).select_from(Itinerary).where(Itinerary.family_id == fam)).scalar()


def new_job(**kw):
    return J.create_job(JobType.AGENT_FEEDBACK, trip_id=trip_id, input_payload={"family_id": "DEMO_FAM_VACATION", "message": "x"}, **kw)


def queued_job():
    j = new_job()
    J.queue_job(j.id)
    return j


def expire_lease(job_id):
    with Session(engine) as s:
        s.execute(update(AgentJob).where(AgentJob.id == job_id).values(lease_expires_at=func.timezone("utc", func.now()) - timedelta(seconds=1)))
        s.commit()


def writes_plan(session):
    ItineraryService.publish_base_itinerary(trip_id=trip_id, family_ids=["DEMO_FAM_VACATION"], itinerary_data=plan,
                                            created_reason="fencing check", session=session)


def completions(job_id):
    with Session(engine) as s:
        return s.execute(select(func.count()).select_from(AgentJobEvent).where(AgentJobEvent.job_id == job_id,
                                                                               AgentJobEvent.event_type == "JOB_COMPLETED")).scalar()


print("\n== Claiming and the database clock")
j = queued_job()
f1 = J.claim_job(j.id, owner="A")
check("a claim returns a fence", f1 == 1, str(f1))
check("a second claim is refused", J.claim_job(j.id, owner="B") is None)
with Session(engine) as s:
    lease_end, db_now = s.execute(text("SELECT lease_expires_at, (now() at time zone 'utc') FROM agent_jobs WHERE id = :i"), {"i": j.id}).first()
check("the lease is measured on the database clock", abs((lease_end - db_now).total_seconds() - settings.JOB_LEASE_SECONDS) < 3,
      f"{int((lease_end - db_now).total_seconds())} s left")
time.sleep(1.1)
J.heartbeat(j.id, f1)
with Session(engine) as s:
    later = s.execute(text("SELECT lease_expires_at FROM agent_jobs WHERE id = :i"), {"i": j.id}).scalar()
check("a heartbeat extends the lease", later > lease_end)

print("\n== A worker paused past its lease cannot write")
before = versions()
expire_lease(j.id)
f2 = J.claim_job(j.id, owner="B")
check("after the lease runs out another worker takes over with a higher fence", f2 == f1 + 1, f"{f1} -> {f2}")
check("the paused worker's heartbeat now reports the loss", J.heartbeat(j.id, f1) is False)
check("the paused worker's result is refused, writing nothing", J.finish(j.id, f1, {"by": "A"}, apply=writes_plan) is False and versions() == before)
check("its attempt to fail the job is refused", J.fail_job(j.id, "late failure", fence=f1) is None)
check("its attempt to requeue the job is refused", J.retry_job(j.id, "late retry", fence=f1) is None)
check("the new owner's result is saved", J.finish(j.id, f2, {"by": "B"}, apply=writes_plan) is True and versions() == before + 1)
done = J.get_job(j.id)
check("exactly one completion, carrying the new owner's result", done.status == JobStatus.COMPLETED and done.result_payload == {"by": "B"}
      and completions(j.id) == 1)

print("\n== Saving a result leaves no window for a takeover")
k = queued_job()
fk = J.claim_job(k.id, owner="A")
expire_lease(k.id)
outcome = {}


def slow_apply(session):
    writes_plan(session)
    time.sleep(3)


t = threading.Thread(target=lambda: outcome.setdefault("a", J.finish(k.id, fk, {"by": "A"}, apply=slow_apply)))
t.start()
time.sleep(0.7)
took = J.claim_job(k.id, owner="B")
t.join()
check("a claim arriving while the result is being saved waits, then finds the job finished",
      outcome.get("a") is True and took is None and J.get_job(k.id).status == JobStatus.COMPLETED)

print("\n== The heartbeat notices a lost lease within seconds")
h = queued_job()
fh = J.claim_job(h.id, owner="A")
raised = False
with Heartbeat(h.id, fh, interval=0.5) as beat:
    expire_lease(h.id)
    J.claim_job(h.id, owner="B")
    time.sleep(1.6)
    try:
        beat.check()
    except OwnershipLost:
        raised = True
check("the owner learns it lost the job and stops", raised)

print("\n== Waiting jobs keep their order and their deadline")
key = f"feedback:{trip_id}:order-check-{uuid.uuid4().hex[:4]}"
first, second = new_job(sequence_key=key), new_job(sequence_key=key)
check("jobs in one stream are numbered in order", (first.sequence, second.sequence) == (1, 2))
check("the second waits while the first is unfinished", J.predecessor_pending(J.get_job(second.id)) is True)
J.complete_job(first.id, {"ok": True})
check("and may run once the first has finished", J.predecessor_pending(J.get_job(second.id)) is False)
key2 = f"feedback:{trip_id}:race-{uuid.uuid4().hex[:4]}"
made = []
threads = [threading.Thread(target=lambda: made.append(new_job(sequence_key=key2).sequence)) for _ in range(10)]
[t.start() for t in threads]
[t.join() for t in threads]
check("ten jobs created at once in one stream get numbers 1 to 10, no repeats", sorted(made) == list(range(1, 11)))

from app.workers.agent_tasks import execute_agent_job_task  # noqa: E402

old = queued_job()
with Session(engine) as s:
    s.execute(update(AgentJob).where(AgentJob.id == old.id).values(
        created_at=datetime.utcnow() - timedelta(seconds=settings.JOB_WAIT_DEADLINE_SECONDS + 60)))
    s.commit()
held = locks.acquire(f"trip:{trip_id}", 60)
check("a waiting job is not abandoned by a retry count (only its deadline)", J.past_wait_deadline(J.get_job(queued_job().id)) is False)
execute_agent_job_task.apply(args=[str(old.id)])
locks.release(f"trip:{trip_id}", held)
gone = J.get_job(old.id)
check("past its deadline it fails with a reason a person can read", gone.status == JobStatus.FAILED and "busy" in (gone.error_message or ""),
      gone.error_message)
with Session(engine) as s:
    told = s.execute(select(func.count()).select_from(OutboxMessage).where(OutboxMessage.payload["data"]["job_id"].astext == str(old.id))).scalar()
check("and the agents are told", told == 1)

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
