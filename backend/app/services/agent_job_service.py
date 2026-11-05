import uuid
import logging
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy import and_, func, or_, text, update
from sqlmodel import Session, select
from app.core.db import engine
from app.models.agent_job import AgentJob, AgentJobEvent, JobStatus, JobType

# The database's clock, as a naive UTC timestamp to match the columns. Leases are judged by this alone.
_DB_NOW = func.timezone("utc", func.now())

logger = logging.getLogger(__name__)

class AgentJobService:
    @staticmethod
    def _create_event(session: Session, job_id: uuid.UUID, event_type: str,
                      previous_status: Optional[str] = None, new_status: Optional[str] = None,
                      payload: Optional[Dict[str, Any]] = None):
        event = AgentJobEvent(
            job_id=job_id,
            event_type=event_type,
            previous_status=previous_status,
            new_status=new_status,
            event_payload=payload or {}
        )
        session.add(event)
        return event

    @staticmethod
    def create_job(job_type: JobType, priority: int = 0, created_by_user_id: Optional[uuid.UUID] = None,
                   trip_id: Optional[str] = None, itinerary_id: Optional[str] = None,
                   input_payload: Optional[Dict[str, Any]] = None, publish: bool = False,
                   sequence_key: Optional[str] = None) -> AgentJob:
        """Create a job. With publish=True it is also queued for a worker, atomically.

        The job row and an outbox row meaning "publish this job" are written in one transaction, so a crash
        between saving the job and telling Redis can no longer lose it: the dispatcher publishes whatever the
        fast path below did not.

        With a sequence_key the job gets the next number in that stream (one family's feedback on one trip),
        and a worker will not start it until every earlier job in the stream has finished.
        """
        outbox_id = None
        with Session(engine) as session:
            from app.core.context import correlation_id_ctx
            ctx_correlation = correlation_id_ctx.get()

            sequence = None
            if sequence_key:
                # Serialise numbering within the stream for the rest of this transaction
                session.execute(text("SELECT pg_advisory_xact_lock(hashtext(:k))"), {"k": sequence_key})
                last = session.exec(select(func.max(AgentJob.sequence)).where(AgentJob.sequence_key == sequence_key)).first()
                sequence = (last or 0) + 1

            job = AgentJob(
                job_type=job_type,
                status=JobStatus.CREATED,
                priority=priority,
                created_by_user_id=created_by_user_id,
                trip_id=trip_id,
                itinerary_id=itinerary_id,
                input_payload=input_payload or {},
                correlation_id=ctx_correlation if ctx_correlation else str(uuid.uuid4()),
                sequence_key=sequence_key,
                sequence=sequence,
            )
            session.add(job)
            session.flush() # get ID

            AgentJobService._create_event(
                session, job.id, "JOB_CREATED", new_status=JobStatus.CREATED.value, payload={"input": input_payload}
            )
            if publish:
                from app.services import outbox_service

                job.status = JobStatus.QUEUED
                AgentJobService._create_event(session, job.id, "JOB_QUEUED", previous_status=JobStatus.CREATED.value,
                                              new_status=JobStatus.QUEUED.value, payload={})
                outbox_id = outbox_service.add(session, "publish_job", {"job_id": str(job.id)}).id

            session.commit()
            session.refresh(job)
            logger.info(f"AgentJob created: {job.id} of type {job.job_type}")
        if outbox_id:
            from app.services import outbox_service

            outbox_service.try_now([outbox_id])
        return job

    @staticmethod
    def queue_job(job_id: uuid.UUID) -> AgentJob:
        with Session(engine) as session:
            job = session.get(AgentJob, job_id)
            if not job:
                raise ValueError(f"Job {job_id} not found")

            prev_status = job.status
            if prev_status != JobStatus.CREATED:
                logger.warning(f"Queueing job {job_id} from invalid status {prev_status}")

            job.status = JobStatus.QUEUED
            job.updated_at = datetime.utcnow()

            AgentJobService._create_event(
                session, job.id, "JOB_QUEUED", previous_status=prev_status.value,
                new_status=job.status.value, payload={}
            )

            session.commit()
            session.refresh(job)
            return job

    # ------------------------------------------------------------------------------------------------
    # Ownership
    #
    # claim_job hands out a fence: a number that rises by one each time the job changes hands. The owner
    # renews its lease with heartbeat() and quotes its fence in every later write (finish, fail_job,
    # retry_job). A worker that was paused past its lease finds that another worker took the job with a
    # higher fence: its heartbeat returns False and its writes change nothing. All lease times come from
    # the database clock, so no two machines' clocks are ever compared.
    # ------------------------------------------------------------------------------------------------
    @staticmethod
    def claim_job(job_id: uuid.UUID, owner: Optional[str] = None) -> Optional[int]:
        """Take ownership of a job. Returns the new fence, or None if someone else holds it.

        Claimable when QUEUED, or RUNNING with an expired lease (its owner stopped renewing) and attempts
        left. Exactly one worker can win, even when several are handed the same job at once.
        """
        from app.core.config import settings

        lease = timedelta(seconds=settings.JOB_LEASE_SECONDS)
        with Session(engine) as session:
            row = session.execute(
                update(AgentJob).where(
                    AgentJob.id == job_id,
                    or_(
                        AgentJob.status == JobStatus.QUEUED,
                        and_(
                            AgentJob.status == JobStatus.RUNNING,
                            AgentJob.lease_expires_at < _DB_NOW,
                            AgentJob.attempt_count < AgentJob.max_attempts,
                        ),
                    ),
                ).values(
                    status=JobStatus.RUNNING, fence=AgentJob.fence + 1, lease_owner=owner,
                    lease_expires_at=_DB_NOW + lease, heartbeat_at=_DB_NOW,
                    started_at=_DB_NOW, updated_at=_DB_NOW, attempt_count=AgentJob.attempt_count + 1,
                ).returning(AgentJob.fence, AgentJob.attempt_count)
            ).first()
            if row is None:
                session.commit()
                return None
            fence, attempt = row
            AgentJobService._create_event(
                session, job_id, "JOB_STARTED", previous_status=JobStatus.QUEUED.value,
                new_status=JobStatus.RUNNING.value, payload={"attempt": attempt, "fence": fence, "owner": owner}
            )
            session.commit()
            return fence

    @staticmethod
    def heartbeat(job_id: uuid.UUID, fence: int) -> bool:
        """Extend the lease. False means ownership was lost: stop and discard the work."""
        from app.core.config import settings

        with Session(engine) as session:
            n = session.execute(
                update(AgentJob).where(AgentJob.id == job_id, AgentJob.fence == fence, AgentJob.status == JobStatus.RUNNING)
                .values(lease_expires_at=_DB_NOW + timedelta(seconds=settings.JOB_LEASE_SECONDS), heartbeat_at=_DB_NOW)
            ).rowcount
            session.commit()
            return n == 1

    @staticmethod
    def _owned(session: Session, job_id: uuid.UUID, fence: Optional[int]) -> Optional[AgentJob]:
        """Lock the job row. With a fence, return it only if that fence still owns a running job."""
        job = session.exec(select(AgentJob).where(AgentJob.id == job_id).with_for_update()).first()
        if job is None:
            raise ValueError(f"Job {job_id} not found")
        if fence is not None and (job.fence != fence or job.status != JobStatus.RUNNING):
            logger.warning(f"Job {job_id}: fence {fence} no longer owns it (now {job.fence}, {job.status}); write refused")
            return None
        return job

    @staticmethod
    def finish(job_id: uuid.UUID, fence: int, result_payload: Optional[Dict[str, Any]] = None,
               announcements: Optional[List[Dict[str, Any]]] = None,
               apply: Optional[Callable[[Session], None]] = None) -> bool:
        """Complete a job and save its result, all or nothing, only while `fence` still owns it.

        One transaction: lock the job row and check the fence, run `apply` (which writes the plan version,
        the iteration record and the trip pointer into the same session), mark the job completed and add its
        announcements to the outbox. Because the job row stays locked, a takeover cannot slip in half way, and
        once the job is completed nobody can claim it again. Returns False, writing nothing, if the fence lost.
        """
        import json

        outbox_ids: List[int] = []
        with Session(engine) as session:
            job = AgentJobService._owned(session, job_id, fence)
            if job is None:
                session.rollback()
                return False
            if apply is not None:
                apply(session)
            prev_status = job.status
            safe_result = json.loads(json.dumps(result_payload or {}, default=str))
            job.status = JobStatus.COMPLETED
            job.result_payload = safe_result
            job.completed_at = datetime.utcnow()
            job.updated_at = datetime.utcnow()
            job.lease_expires_at = None
            session.add(job)
            AgentJobService._create_event(
                session, job.id, "JOB_COMPLETED", previous_status=prev_status.value,
                new_status=JobStatus.COMPLETED.value, payload={"result": safe_result, "fence": fence}
            )
            if announcements:
                from app.services import outbox_service

                outbox_ids = [outbox_service.add(session, a["kind"], a["payload"]).id for a in announcements]
            session.commit()
            logger.info(f"AgentJob completed: {job_id} (fence {fence})")
        if outbox_ids:
            from app.services import outbox_service

            outbox_service.try_now(outbox_ids)
        return True

    @staticmethod
    def expire_if_stale(job_id: uuid.UUID) -> Optional[AgentJob]:
        """Fail a job that is clearly never going to finish, so nobody waits on it forever.

        RUNNING whose lease ran out a full lease ago with no takeover: the worker died and none replaced it.
        QUEUED or CREATED for ten minutes: the message was lost before any worker saw it.
        Returns the failed job, or None if the job is fine.
        """
        from app.core.config import settings

        lease = timedelta(seconds=settings.JOB_LEASE_SECONDS)
        with Session(engine) as session:
            job = session.get(AgentJob, job_id)
            if not job:
                return None
            if job.status == JobStatus.RUNNING:
                stale = and_(AgentJob.status == JobStatus.RUNNING, AgentJob.lease_expires_at < _DB_NOW - lease)
                reason = "The worker handling this request stopped unexpectedly."
            elif job.status in (JobStatus.QUEUED, JobStatus.CREATED):
                stale = and_(AgentJob.status == job.status, AgentJob.updated_at < _DB_NOW - timedelta(minutes=10))
                reason = "This request was never picked up by a worker."
            else:
                return None
            prev = job.status
            n = session.execute(update(AgentJob).where(AgentJob.id == job_id, stale).values(
                status=JobStatus.FAILED, error_message=reason, error_type="JobAbandoned",
                completed_at=datetime.utcnow(), updated_at=datetime.utcnow(), lease_expires_at=None)).rowcount
            if n == 0:
                session.rollback()
                return None
            AgentJobService._create_event(session, job_id, "JOB_FAILED", previous_status=prev.value,
                                          new_status=JobStatus.FAILED.value, payload={"error_message": reason})
            session.commit()
            logger.error(f"AgentJob {job_id} expired as stale ({prev.value}): {reason}")
        return AgentJobService.get_job(job_id)

    @staticmethod
    def complete_job(job_id: uuid.UUID, result_payload: Optional[Dict[str, Any]] = None,
                     announcements: Optional[List[Dict[str, Any]]] = None) -> AgentJob:
        """Mark a job completed without an ownership check (for callers that never claimed it).
        Its announcements (outbox rows) commit in the same transaction."""
        outbox_ids: List[int] = []
        with Session(engine) as session:
            job = session.get(AgentJob, job_id)
            if not job:
                raise ValueError(f"Job {job_id} not found")

            prev_status = job.status
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            job.updated_at = datetime.utcnow()
            # Agent results can contain datetimes/UUIDs; make them JSON-safe for JSONB
            import json
            safe_result = json.loads(json.dumps(result_payload or {}, default=str))
            job.result_payload = safe_result

            AgentJobService._create_event(
                session, job.id, "JOB_COMPLETED", previous_status=prev_status.value,
                new_status=job.status.value, payload={"result": safe_result}
            )
            if announcements:
                from app.services import outbox_service

                outbox_ids = [outbox_service.add(session, a["kind"], a["payload"]).id for a in announcements]

            session.commit()
            session.refresh(job)
            logger.info(f"AgentJob completed: {job.id}")
        if outbox_ids:
            from app.services import outbox_service

            outbox_service.try_now(outbox_ids)
        return job

    @staticmethod
    def fail_job(job_id: uuid.UUID, error_message: str, error_type: Optional[str] = None,
                 internal_details: Optional[str] = None, fence: Optional[int] = None) -> Optional[AgentJob]:
        """Mark a job failed and tell the agents, in one transaction.

        With a fence the write happens only while that fence still owns the job; returns None otherwise.
        """
        from app.services import notification_service as ns, outbox_service

        with Session(engine) as session:
            job = AgentJobService._owned(session, job_id, fence)
            if job is None:
                session.rollback()
                return None
            if job.status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
                session.rollback()
                return job

            prev_status = job.status
            job.status = JobStatus.FAILED
            job.completed_at = datetime.utcnow()
            job.updated_at = datetime.utcnow()
            job.lease_expires_at = None
            job.error_message = error_message
            job.error_type = error_type
            job.internal_error_details = internal_details
            session.add(job)

            payload = {
                "error_message": error_message,
                "error_type": error_type,
                "internal_details": internal_details
            }

            AgentJobService._create_event(
                session, job.id, "JOB_FAILED", previous_status=prev_status.value,
                new_status=job.status.value, payload=payload
            )

            # The agents are told in the same transaction that records the failure
            note = outbox_service.add(session, "notify_agents", ns.announcement(
                "notify_agents", type="job.failed",
                title=f"Agent job failed: {job.job_type.value if hasattr(job.job_type, 'value') else job.job_type}",
                body=error_message[:300], link="/app/agents", data={"job_id": str(job.id), "trip_id": job.trip_id}))
            note_id = note.id
            session.commit()
            session.refresh(job)
            logger.error(f"AgentJob failed: {job.id}. Reason: {error_message}")
        outbox_service.try_now([note_id])
        return job

    @staticmethod
    def retry_job(job_id: uuid.UUID, reason: str, fence: Optional[int] = None) -> Optional[AgentJob]:
        """Hand a running job back to the queue. With a fence, only while that fence still owns it."""
        with Session(engine) as session:
            job = AgentJobService._owned(session, job_id, fence)
            if job is None:
                session.rollback()
                return None

            if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
                logger.warning(f"Cannot retry job {job_id} in terminal state {job.status}")
                return job

            prev_status = job.status

            # Transition 1: RUNNING -> RETRYING
            job.status = JobStatus.RETRYING
            job.updated_at = datetime.utcnow()
            AgentJobService._create_event(
                session, job.id, "JOB_RETRYING", previous_status=prev_status.value,
                new_status=job.status.value, payload={"reason": reason, "attempt": job.attempt_count}
            )

            # Transition 2: RETRYING -> QUEUED
            job.status = JobStatus.QUEUED
            job.updated_at = datetime.utcnow()
            job.lease_expires_at = None
            AgentJobService._create_event(
                session, job.id, "JOB_QUEUED", previous_status=JobStatus.RETRYING.value,
                new_status=job.status.value, payload={}
            )

            session.add(job)
            session.commit()
            session.refresh(job)
            logger.warning(f"AgentJob retrying -> queued: {job.id}. Reason: {reason}")
            return job

    # ------------------------------------------------------------------------------------------------
    # Waiting (a job whose trip is busy, or whose earlier job in the same stream has not finished)
    # ------------------------------------------------------------------------------------------------
    @staticmethod
    def predecessor_pending(job: AgentJob) -> bool:
        """True while an earlier job in the same stream has not reached a final state."""
        if not job.sequence_key or not job.sequence:
            return False
        with Session(engine) as session:
            return session.exec(
                select(AgentJob.id).where(
                    AgentJob.sequence_key == job.sequence_key,
                    AgentJob.sequence < job.sequence,
                    AgentJob.status.notin_([JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]),
                ).limit(1)
            ).first() is not None

    @staticmethod
    def touch(job_id: uuid.UUID) -> None:
        """A waiting job shows it is alive, so the scheduler does not take it for lost and publish it again."""
        with Session(engine) as session:
            session.execute(update(AgentJob).where(AgentJob.id == job_id, AgentJob.status == JobStatus.QUEUED)
                            .values(updated_at=_DB_NOW))
            session.commit()

    @staticmethod
    def past_wait_deadline(job: AgentJob) -> bool:
        from app.core.config import settings

        return datetime.utcnow() - job.created_at > timedelta(seconds=settings.JOB_WAIT_DEADLINE_SECONDS)

    @staticmethod
    def find_recent_duplicate(trip_id: str, family_id: str, message: str, seconds: int = 30) -> Optional[AgentJob]:
        """The same feedback for the same trip and family within a few seconds, still alive.

        A second net for clients that send no Idempotency-Key: a double-click returns the first job
        instead of starting a second replan. Exact text only; anything different is a new request.
        """
        from datetime import timedelta

        cutoff = datetime.utcnow() - timedelta(seconds=seconds)
        with Session(engine) as session:
            return session.exec(
                select(AgentJob).where(
                    AgentJob.trip_id == trip_id,
                    AgentJob.job_type == JobType.AGENT_FEEDBACK,
                    AgentJob.created_at >= cutoff,
                    AgentJob.status.notin_([JobStatus.FAILED, JobStatus.CANCELLED]),
                    AgentJob.input_payload["family_id"].astext == str(family_id),
                    AgentJob.input_payload["message"].astext == message,
                ).order_by(AgentJob.created_at.desc())
            ).first()

    @staticmethod
    def get_job(job_id: uuid.UUID) -> Optional[AgentJob]:
        with Session(engine) as session:
            return session.get(AgentJob, job_id)
