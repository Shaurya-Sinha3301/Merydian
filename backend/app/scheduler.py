"""
The scheduler: one process, on a timer, that notices and repairs things nobody is looking at.

With almost no traffic, nothing else would ever look: a stuck job used to be ended only when someone polled
its status. Each sweep is a short, conditional database update, so it is safe to run twice or to race a
worker. Before each sweep the scheduler takes a lock on the queue Redis, so if two copies run by mistake only
one acts. It never does real work itself (no solving, no sending): it only notices and repairs. If it is down,
nothing breaks; repairs simply wait.

    re-publish lost jobs      every minute   QUEUED with no sign of life for a minute: the message was lost
                                             (Redis lost it, or it was never delivered). Published again from
                                             the outbox; after REPUBLISH_LIMIT tries and the wait deadline it
                                             is failed with a clear reason.
    resume abandoned jobs     every minute   RUNNING whose owner stopped renewing, with attempts left: sent again
                                             so another worker takes it over (the original message may be gone).
    fail abandoned jobs       every minute   RUNNING whose owner stopped renewing a full lease ago and whose
                                             attempts are used up.
    release stuck outbox rows every minute   in progress for longer than the dispatcher could need.
    expire idempotency keys   hourly
    remove old records        daily          used or expired sign-in tokens, sent outbox rows and webhook
                                             deliveries older than their retention.

Run:  python -m app.scheduler      (container mode: `scheduler`)
"""
import logging
import os
import signal
import threading
import time
from datetime import datetime, timedelta
from typing import Callable, Dict, List

from sqlalchemy import and_, delete, func, or_, select, update
from sqlmodel import Session

from app.core import locks
from app.core.db import engine
from app.models.agent_job import AgentJob, AgentJobEvent, JobStatus
from app.models.idempotency import IdempotencyKey
from app.models.outbox import OutboxMessage

logger = logging.getLogger("app.scheduler")

LOST_AFTER = timedelta(seconds=int(os.getenv("SCHEDULER_LOST_AFTER_SECONDS", "60")))
REPUBLISH_LIMIT = int(os.getenv("SCHEDULER_REPUBLISH_LIMIT", "3"))
OUTBOX_RETENTION = timedelta(days=7)
DELIVERY_RETENTION = timedelta(days=30)
_DB_NOW = func.timezone("utc", func.now())


# ---------------------------------------------------------------------------------------------------
# Sweeps. Each returns how many rows it changed, and is safe to run at any time, any number of times.
# ---------------------------------------------------------------------------------------------------
def republish_lost_jobs() -> int:
    """Jobs still QUEUED with no sign of life: publish them again, or give up after the limit and deadline."""
    from app.core.config import settings
    from app.services import outbox_service
    from app.services.agent_job_service import AgentJobService

    deadline = timedelta(seconds=settings.JOB_WAIT_DEADLINE_SECONDS)
    changed, to_publish, to_fail = 0, [], []
    with Session(engine) as s:
        stale = s.execute(select(AgentJob).where(
            AgentJob.status.in_([JobStatus.QUEUED, JobStatus.CREATED]),
            AgentJob.updated_at < _DB_NOW - LOST_AFTER,
        ).limit(200)).scalars().all()
        for job in stale:
            tries = s.execute(select(func.count()).select_from(AgentJobEvent).where(
                AgentJobEvent.job_id == job.id, AgentJobEvent.event_type == "JOB_REPUBLISHED")).scalar()
            if tries >= REPUBLISH_LIMIT and datetime.utcnow() - job.created_at > deadline:
                to_fail.append(job.id)
                continue
            # Touch the job in the same transaction, so the next sweep waits another full minute
            n = s.execute(update(AgentJob).where(AgentJob.id == job.id, AgentJob.updated_at == job.updated_at)
                          .values(updated_at=_DB_NOW)).rowcount
            if not n:
                continue  # it moved on meanwhile
            s.add(AgentJobEvent(job_id=job.id, event_type="JOB_REPUBLISHED", previous_status=job.status.value,
                                new_status=job.status.value, event_payload={"try": tries + 1}))
            to_publish.append(outbox_service.add(s, "publish_job", {"job_id": str(job.id)}).id)
        s.commit()
    outbox_service.try_now(to_publish)
    for jid in to_fail:
        if AgentJobService.fail_job(jid, "This request was never picked up by a worker, even after it was sent again. "
                                         "Please try again.", error_type="JobLost"):
            changed += 1
    if to_publish:
        logger.warning("Re-published %s job(s) that showed no sign of a worker", len(to_publish))
    return changed + len(to_publish)


def resume_abandoned_jobs() -> int:
    """RUNNING jobs whose owner stopped renewing (its lease ran out) but with attempts left.

    A worker that crashes leaves its message unacknowledged and Redis delivers it again. A worker whose task
    failed for an outside reason (the database restarted under it) acknowledges the message, so nothing would
    ever deliver it again: the lease allows a takeover, but someone must send the job. This sends it, and the
    worker that receives it takes the job over with a higher fence.
    """
    from app.services import outbox_service

    to_publish = []
    with Session(engine) as s:
        stale = s.execute(select(AgentJob).where(
            AgentJob.status == JobStatus.RUNNING,
            AgentJob.lease_expires_at < _DB_NOW,
            AgentJob.attempt_count < AgentJob.max_attempts,
            AgentJob.updated_at < _DB_NOW - LOST_AFTER,
        ).limit(200)).scalars().all()
        for job in stale:
            n = s.execute(update(AgentJob).where(AgentJob.id == job.id, AgentJob.updated_at == job.updated_at)
                          .values(updated_at=_DB_NOW)).rowcount
            if not n:
                continue
            s.add(AgentJobEvent(job_id=job.id, event_type="JOB_REPUBLISHED", previous_status=job.status.value,
                                new_status=job.status.value, event_payload={"reason": "owner stopped renewing", "fence": job.fence}))
            to_publish.append(outbox_service.add(s, "publish_job", {"job_id": str(job.id)}).id)
        s.commit()
    outbox_service.try_now(to_publish)
    if to_publish:
        logger.warning("Re-sent %s running job(s) whose owner stopped renewing, for a takeover", len(to_publish))
    return len(to_publish)


def fail_abandoned_jobs() -> int:
    """RUNNING jobs whose owner stopped renewing a full lease ago, with no attempts left to take them over."""
    from app.core.config import settings
    from app.services.agent_job_service import AgentJobService

    lease = timedelta(seconds=settings.JOB_LEASE_SECONDS)
    with Session(engine) as s:
        ids = s.execute(select(AgentJob.id).where(
            AgentJob.status == JobStatus.RUNNING,
            AgentJob.lease_expires_at < _DB_NOW - lease,
            AgentJob.attempt_count >= AgentJob.max_attempts,
        ).limit(200)).scalars().all()
    return sum(1 for jid in ids if AgentJobService.expire_if_stale(jid))


def release_stuck_outbox() -> int:
    """Rows a dispatcher took and then vanished with: make them pending again for any dispatcher."""
    from app.services import outbox_service

    with Session(engine) as s:
        n = s.execute(update(OutboxMessage).where(
            OutboxMessage.status == "in_progress",
            OutboxMessage.locked_at < datetime.utcnow() - outbox_service.STUCK_AFTER,
        ).values(status="pending", locked_at=None, next_attempt_at=datetime.utcnow())).rowcount
        s.commit()
    return n


def expire_idempotency_keys() -> int:
    with Session(engine) as s:
        n = s.execute(delete(IdempotencyKey).where(IdempotencyKey.expires_at < datetime.utcnow())).rowcount
        s.commit()
    return n


def remove_old_records() -> int:
    from app.models.phase3 import WebhookDelivery
    from app.models.phase4 import AuthToken

    now = datetime.utcnow()
    with Session(engine) as s:
        n = s.execute(delete(AuthToken).where(or_(AuthToken.expires_at < now, AuthToken.used_at.is_not(None)))).rowcount
        n += s.execute(delete(OutboxMessage).where(OutboxMessage.status == "sent",
                                                   OutboxMessage.sent_at < now - OUTBOX_RETENTION)).rowcount
        n += s.execute(delete(WebhookDelivery).where(WebhookDelivery.created_at < now - DELIVERY_RETENTION)).rowcount
        s.commit()
    return n


_MINUTE = int(os.getenv("SCHEDULER_SWEEP_SECONDS", "60"))

SWEEPS: Dict[str, tuple] = {
    # name: (function, every N seconds)
    "republish_lost_jobs": (republish_lost_jobs, _MINUTE),
    "resume_abandoned_jobs": (resume_abandoned_jobs, _MINUTE),
    "fail_abandoned_jobs": (fail_abandoned_jobs, _MINUTE),
    "release_stuck_outbox": (release_stuck_outbox, _MINUTE),
    "expire_idempotency_keys": (expire_idempotency_keys, 3600),
    "remove_old_records": (remove_old_records, 86400),
}


def run_sweep(name: str) -> int:
    """Run one sweep if no other scheduler is running it right now. Returns rows changed, or -1 if skipped."""
    fn, every = SWEEPS[name]
    token = locks.acquire(f"scheduler:{name}", max(int(every * 0.9), 30))
    if token is None:
        return -1  # another scheduler copy holds it
    try:
        n = fn()
        if n:
            logger.info("Sweep %s changed %s row(s)", name, n)
        return n
    except Exception as exc:
        logger.error("Sweep %s failed: %s", name, exc, exc_info=True)
        return 0
    finally:
        # Keep the lock until it expires: a second copy must not repeat the sweep within the interval
        pass


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    from app.workers import worker_heartbeat

    tick = float(os.getenv("SCHEDULER_TICK_SECONDS", "15"))
    stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    worker_heartbeat.start(f"scheduler@{os.getenv('HOSTNAME', 'local')}", [])
    last: Dict[str, float] = {}
    logger.info("Scheduler started (tick %s s): %s", tick, ", ".join(SWEEPS))
    while not stop.is_set():
        now = time.time()
        for name, (_fn, every) in SWEEPS.items():
            if now - last.get(name, 0) >= every:
                last[name] = now
                run_sweep(name)
        stop.wait(tick)
    worker_heartbeat.stop()
    logger.info("Scheduler stopped")


if __name__ == "__main__":
    main()
