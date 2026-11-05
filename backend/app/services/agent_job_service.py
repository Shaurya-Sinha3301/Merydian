import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any

from sqlmodel import Session, select
from app.core.db import engine
from app.models.agent_job import AgentJob, AgentJobEvent, JobStatus, JobType

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
                   input_payload: Optional[Dict[str, Any]] = None) -> AgentJob:
        with Session(engine) as session:
            from app.core.context import correlation_id_ctx
            ctx_correlation = correlation_id_ctx.get()
            
            job = AgentJob(
                job_type=job_type,
                status=JobStatus.CREATED,
                priority=priority,
                created_by_user_id=created_by_user_id,
                trip_id=trip_id,
                itinerary_id=itinerary_id,
                input_payload=input_payload or {},
                correlation_id=ctx_correlation if ctx_correlation else str(uuid.uuid4())
            )
            session.add(job)
            session.flush() # get ID
            
            AgentJobService._create_event(
                session, job.id, "JOB_CREATED", new_status=JobStatus.CREATED.value, payload={"input": input_payload}
            )
            
            session.commit()
            session.refresh(job)
            logger.info(f"AgentJob created: {job.id} of type {job.job_type}")
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

    @staticmethod
    def claim_job(job_id: uuid.UUID) -> bool:
        """Take ownership of a job. Exactly one worker can win, even if several are handed the same job.

        A job is claimable when it is QUEUED, or when it is RUNNING but its lease has run out
        (no update for JOB_LEASE_SECONDS), which means the worker that held it died. A taken-over
        job counts as another attempt, and one that has used up its attempts is failed instead.
        """
        from datetime import timedelta
        from sqlmodel import update
        from sqlalchemy import and_, or_
        from app.core.config import settings

        with Session(engine) as session:
            now = datetime.utcnow()
            lease_cutoff = now - timedelta(seconds=settings.JOB_LEASE_SECONDS)
            stmt = update(AgentJob).where(
                AgentJob.id == job_id,
                or_(
                    AgentJob.status == JobStatus.QUEUED,
                    and_(
                        AgentJob.status == JobStatus.RUNNING,
                        AgentJob.updated_at < lease_cutoff,
                        AgentJob.attempt_count < AgentJob.max_attempts,
                    ),
                ),
            ).values(status=JobStatus.RUNNING, started_at=now, updated_at=now)
            result = session.exec(stmt)

            if result.rowcount > 0:
                job = session.get(AgentJob, job_id)
                job.attempt_count += 1
                AgentJobService._create_event(
                    session, job.id, "JOB_STARTED", previous_status=JobStatus.QUEUED.value,
                    new_status=JobStatus.RUNNING.value, payload={"attempt": job.attempt_count}
                )
                session.commit()
                return True

            session.commit()
            return False

    @staticmethod
    def expire_if_stale(job_id: uuid.UUID) -> Optional[AgentJob]:
        """Fail a job that is clearly never going to finish, so nobody waits on it forever.

        RUNNING with no update for twice the lease: the worker died and no replacement took over.
        QUEUED or CREATED for ten minutes: the message was lost before any worker saw it.
        Returns the failed job, or None if the job is fine.
        """
        from datetime import timedelta
        from sqlmodel import update
        from app.core.config import settings

        with Session(engine) as session:
            job = session.get(AgentJob, job_id)
            if not job:
                return None
            age = (datetime.utcnow() - job.updated_at).total_seconds()
            if job.status == JobStatus.RUNNING and age > settings.JOB_LEASE_SECONDS * 2:
                reason = "The worker handling this request stopped unexpectedly."
            elif job.status in (JobStatus.QUEUED, JobStatus.CREATED) and age > 600:
                reason = "This request was never picked up by a worker."
            else:
                return None
            prev = job.status
            stmt = update(AgentJob).where(AgentJob.id == job_id, AgentJob.status == prev, AgentJob.updated_at == job.updated_at).values(
                status=JobStatus.FAILED, error_message=reason, error_type="JobAbandoned",
                completed_at=datetime.utcnow(), updated_at=datetime.utcnow())
            if session.exec(stmt).rowcount == 0:
                return None  # someone else moved it on in the meantime
            AgentJobService._create_event(session, job_id, "JOB_FAILED", previous_status=prev.value,
                                          new_status=JobStatus.FAILED.value, payload={"error_message": reason})
            session.commit()
            logger.error(f"AgentJob {job_id} expired as stale ({prev.value}, {int(age)} s): {reason}")
        return AgentJobService.get_job(job_id)

    @staticmethod
    def complete_job(job_id: uuid.UUID, result_payload: Optional[Dict[str, Any]] = None) -> AgentJob:
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
            
            session.commit()
            session.refresh(job)
            logger.info(f"AgentJob completed: {job.id}")
            return job

    @staticmethod
    def fail_job(job_id: uuid.UUID, error_message: str, error_type: Optional[str] = None, 
                 internal_details: Optional[str] = None) -> AgentJob:
        with Session(engine) as session:
            job = session.get(AgentJob, job_id)
            if not job:
                raise ValueError(f"Job {job_id} not found")
                
            prev_status = job.status
            job.status = JobStatus.FAILED
            job.completed_at = datetime.utcnow()
            job.updated_at = datetime.utcnow()
            job.error_message = error_message
            job.error_type = error_type
            job.internal_error_details = internal_details
            
            payload = {
                "error_message": error_message,
                "error_type": error_type,
                "internal_details": internal_details
            }
            
            AgentJobService._create_event(
                session, job.id, "JOB_FAILED", previous_status=prev_status.value, 
                new_status=job.status.value, payload=payload
            )
            
            session.commit()
            session.refresh(job)
            logger.error(f"AgentJob failed: {job.id}. Reason: {error_message}")
            try:
                from app.services import notification_service as ns

                ns.notify_agents("job.failed", f"Agent job failed: {job.job_type.value if hasattr(job.job_type, 'value') else job.job_type}", error_message[:300], "/app/agents", {"job_id": str(job.id), "trip_id": job.trip_id})
            except Exception:
                pass
            return job

    @staticmethod
    def retry_job(job_id: uuid.UUID, reason: str) -> AgentJob:
        with Session(engine) as session:
            job = session.get(AgentJob, job_id)
            if not job:
                raise ValueError(f"Job {job_id} not found")
                
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
            AgentJobService._create_event(
                session, job.id, "JOB_QUEUED", previous_status=JobStatus.RETRYING.value, 
                new_status=job.status.value, payload={}
            )
            
            session.commit()
            session.refresh(job)
            logger.warning(f"AgentJob retrying -> queued: {job.id}. Reason: {reason}")
            return job

    @staticmethod
    def get_job(job_id: uuid.UUID) -> Optional[AgentJob]:
        with Session(engine) as session:
            return session.get(AgentJob, job_id)
