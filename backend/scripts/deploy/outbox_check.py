"""
Milestone 5 proof: an accepted job or announcement is never lost between the database and the queue,
and delivering it twice changes nothing.

Needs a running API and worker (the worker runs the outbox dispatcher) on a seeded database, started with
WEBHOOK_ALLOW_PRIVATE=true so a local test endpoint may receive webhooks. SQLALCHEMY_DATABASE_URI and
REDIS_URL must point at the same stack. Run from backend/:  python scripts/deploy/outbox_check.py [BASE_URL]
"""
import sys
import threading
import time
import uuid
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import requests

sys.path[:0] = [str(Path(__file__).resolve().parents[2]), str(Path(__file__).resolve().parents[3])]
from sqlalchemy import func, select, update  # noqa: E402
from sqlmodel import Session  # noqa: E402

from app.core.db import engine  # noqa: E402
from app.models.agent_job import AgentJob, JobStatus, JobType  # noqa: E402
from app.models.itinerary import Itinerary  # noqa: E402
from app.models.outbox import OutboxMessage  # noqa: E402
from app.models.phase3 import Notification  # noqa: E402
from app.models.trip_session import TripSession  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services import outbox_service  # noqa: E402
from app.services import notification_service as ns  # noqa: E402
from app.services.agent_job_service import AgentJobService  # noqa: E402

B = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8015").rstrip("/") + "/api/v1"
ok = True


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""), flush=True)


def wait_for(fn, seconds=90):
    end = time.time() + seconds
    while time.time() < end:
        v = fn()
        if v:
            return v
        time.sleep(1)
    return fn()


def job(jid):
    return AgentJobService.get_job(jid)


def outbox_for_job(jid):
    with Session(engine) as s:
        return s.execute(select(OutboxMessage).where(OutboxMessage.kind == "publish_job",
                                                     OutboxMessage.payload["job_id"].astext == str(jid))).scalars().first()


with Session(engine) as s:
    trip = next(t for t in s.execute(select(TripSession)).scalars().all() if "DEMO_FAM_VACATION" in (t.family_ids or []))
    trip_id = trip.trip_id
    fam_uuid = next(f for f in trip.family_ids if len(str(f)) == 36)
    traveller = s.execute(select(User).where(User.family_id == uuid.UUID(fam_uuid), User.role == "traveller")).scalars().first()


def new_feedback_job(msg):
    return AgentJobService.create_job(JobType.AGENT_FEEDBACK, trip_id=trip_id, publish=True,
                                      input_payload={"family_id": "DEMO_FAM_VACATION", "message": msg})


print("\n== Normal path: the request publishes straight after its commit")
jf = new_feedback_job("Outbox check zero: a quiet morning please.")
check("the publish instruction is already sent when the request returns (fast path)", outbox_for_job(jf.id).status == "sent")

print("\n== The API dies right after committing a job (it never tells Redis)")
outbox_service._fast_path = False
j = new_feedback_job("Outbox check one: keep the days shorter.")
row = outbox_for_job(j.id)
check("the job and its publish instruction were committed together", row is not None and j.status == JobStatus.QUEUED)
done = wait_for(lambda: job(j.id).status in (JobStatus.COMPLETED, JobStatus.FAILED) and job(j.id))
check("the worker's dispatcher published it and the job ran", done and done.status == JobStatus.COMPLETED, str(done.status if done else None))
check("the publish instruction is marked sent", outbox_for_job(j.id).status == "sent")
outbox_service._fast_path = True

print("\n== The API cannot reach Redis when the job is submitted")
from app.workers import agent_tasks  # noqa: E402

real = agent_tasks.execute_agent_job_task.apply_async
agent_tasks.execute_agent_job_task.apply_async = lambda *a, **k: (_ for _ in ()).throw(ConnectionError("redis unreachable (simulated)"))
j2 = new_feedback_job("Outbox check two: add a long lunch.")
agent_tasks.execute_agent_job_task.apply_async = real
r2 = outbox_for_job(j2.id)
check("the request still succeeded and the job was accepted", j2.status == JobStatus.QUEUED and r2 is not None)
check("the failed publish is scheduled for a retry, not lost", r2.status in ("pending", "in_progress", "sent") and (r2.attempts >= 1 or r2.status == "sent"),
      f"{r2.status}, attempts {r2.attempts}")
done2 = wait_for(lambda: job(j2.id).status in (JobStatus.COMPLETED, JobStatus.FAILED) and job(j2.id))
check("once Redis is reachable the dispatcher delivers it and the job runs", done2 and done2.status == JobStatus.COMPLETED)

print("\n== Delivering the same job twice")
with Session(engine) as s:
    versions_before = s.execute(select(func.count()).select_from(Itinerary).where(Itinerary.family_id == uuid.UUID(fam_uuid))).scalar()
attempts_before = job(j.id).attempt_count
real(args=[str(j.id)])
time.sleep(8)
with Session(engine) as s:
    versions_after = s.execute(select(func.count()).select_from(Itinerary).where(Itinerary.family_id == uuid.UUID(fam_uuid))).scalar()
check("a second message for a finished job does nothing", job(j.id).status == JobStatus.COMPLETED and job(j.id).attempt_count == attempts_before
      and versions_after == versions_before, f"versions {versions_before} -> {versions_after}")

print("\n== Announcements arrive once, however often they are delivered")
check("the finished replan announced itself to the traveller",
      wait_for(lambda: Session(engine).execute(select(func.count()).select_from(Notification).where(
          Notification.user_id == traveller.id, Notification.type == "feedback.processed")).scalar() >= 1, 30))
outbox_service._fast_path = False
with Session(engine) as s:
    note = outbox_service.add(s, "notify_users", ns.announcement("notify_users", user_ids=[str(traveller.id)], type="check.once",
                                                                 title="Delivered once", body="", link=None, data={}))
    nid, eid = note.id, str(note.event_id)
    s.commit()
outbox_service._fast_path = True
wait_for(lambda: Session(engine).get(OutboxMessage, nid).status == "sent", 30)
for _ in range(2):
    with Session(engine) as s:
        s.execute(update(OutboxMessage).where(OutboxMessage.id == nid).values(status="pending", next_attempt_at=datetime.utcnow()))
        s.commit()
    wait_for(lambda: Session(engine).get(OutboxMessage, nid).status == "sent", 30)
with Session(engine) as s:
    copies = s.execute(select(func.count()).select_from(Notification).where(Notification.event_id == eid)).scalar()
check("delivered three times, the traveller has exactly one notification", copies == 1, f"{copies}")

print("\n== Webhooks: called once per event, with the event id")
hits = []


class Hook(BaseHTTPRequestHandler):
    def do_POST(self):
        hits.append(self.headers.get("X-Merydian-Event-Id"))
        self.send_response(200)
        self.end_headers()

    def log_message(self, *a):
        pass


srv = HTTPServer(("127.0.0.1", 0), Hook)
threading.Thread(target=srv.serve_forever, daemon=True).start()
agent = requests.post(f"{B}/demo/load/Agent", timeout=60).json()
AH = {"Authorization": f"Bearer {agent['access_token']}"}
hook = requests.post(f"{B}/agent/webhooks", headers=AH, timeout=30,
                     json={"name": "outbox check", "url": f"http://127.0.0.1:{srv.server_port}/hook", "events": ["job.failed"]})
check("a local test endpoint was registered", hook.status_code in (200, 201), str(hook.status_code))
with Session(engine) as s:
    w = outbox_service.add(s, "notify_agents", ns.announcement("notify_agents", type="job.failed", title="Webhook once",
                                                               body="", link=None, data={"trip_id": trip_id}))
    wid, weid = w.id, str(w.event_id)
    s.commit()
wait_for(lambda: Session(engine).get(OutboxMessage, wid).status == "sent", 60)
with Session(engine) as s:
    s.execute(update(OutboxMessage).where(OutboxMessage.id == wid).values(status="pending", next_attempt_at=datetime.utcnow()))
    s.commit()
wait_for(lambda: Session(engine).get(OutboxMessage, wid).status == "sent", 60)
time.sleep(2)
check("delivered twice, the endpoint was called once", hits.count(weid) == 1, f"{hits.count(weid)} call(s)")
check("and the request carried the event id for the receiver", weid in hits)
srv.shutdown()

print("\n== A dispatcher that dies mid-delivery, and a delivery that keeps failing")
with Session(engine) as s:
    stuck = OutboxMessage(kind="notify_users", status="in_progress", locked_at=datetime.utcnow() - timedelta(minutes=5), attempts=1,
                          payload=ns.announcement("notify_users", user_ids=[str(traveller.id)], type="check.stuck", title="Stuck", body="",
                                                  link=None, data={}))
    bad = OutboxMessage(kind="no_such_kind", payload={})
    s.add(stuck)
    s.add(bad)
    s.commit()
    sid, bid = stuck.id, bad.id
check("a row left in progress by a dead dispatcher is picked up and delivered", wait_for(lambda: Session(engine).get(OutboxMessage, sid).status == "sent", 120))
first = wait_for(lambda: Session(engine).get(OutboxMessage, bid).attempts >= 1 and Session(engine).get(OutboxMessage, bid), 30)
check("a failing delivery is retried later, not dropped", first.status == "pending" and first.next_attempt_at > datetime.utcnow() and first.last_error,
      f"attempt {first.attempts}, next in {int((first.next_attempt_at - datetime.utcnow()).total_seconds())} s")
with Session(engine) as s:
    s.execute(update(OutboxMessage).where(OutboxMessage.id == bid).values(attempts=outbox_service.MAX_ATTEMPTS - 1, next_attempt_at=datetime.utcnow()))
    s.commit()
check("after the last attempt it is parked as dead for a person to look at", wait_for(lambda: Session(engine).get(OutboxMessage, bid).status == "dead", 30))

print("\n== A failed job tells the agents in the same transaction")
fj = AgentJobService.create_job(JobType.AGENT_FEEDBACK, trip_id=trip_id, input_payload={"family_id": "DEMO_FAM_VACATION", "message": "x"})
AgentJobService.fail_job(fj.id, "Simulated failure for the outbox check")
with Session(engine) as s:
    told = s.execute(select(OutboxMessage).where(OutboxMessage.kind == "notify_agents",
                                                 OutboxMessage.payload["data"]["job_id"].astext == str(fj.id))).scalars().first()
check("the failure and its announcement were committed together", told is not None)

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
