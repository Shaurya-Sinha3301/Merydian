import uuid
import logging

from app.core import locks
from celery.exceptions import Retry

from app.workers.celery_app import celery_app
from app.services.agent_job_service import AgentJobService
from app.workers.heartbeat import Heartbeat, OwnershipLost
from app.models.agent_job import JobType, JobStatus
from app.agent_runtime import (
    AgentRuntime,
    ToolsAgentRequest,
    CommunicationAgentRequest,
    FeedbackOptimizationRequest
)

logger = logging.getLogger(__name__)


def _record_feedback_outcome(job, trip_session, message: str) -> None:
    """After a re-optimization: store per-POI explanations and the feedback history entry."""
    from datetime import datetime
    from sqlmodel import select
    from app.core.db import engine
    from sqlmodel import Session
    from app.models.family import Family
    from app.models.itinerary import Itinerary
    from app.models.trip_session import TripSession
    from app.services.explanation_service import ExplanationService

    family_code = None
    for entry in trip_session.family_ids or []:
        try:
            uuid.UUID(str(entry))
        except ValueError:
            family_code = str(entry)
            break

    with Session(engine) as session:
        family = session.exec(select(Family).where(Family.family_code == family_code)).first() if family_code else None
        if family:
            versions = session.exec(
                select(Itinerary).where(Itinerary.family_id == family.id).order_by(Itinerary.version.desc()).limit(2)
            ).all()
            if len(versions) == 2:
                new_itin, old_itin = versions[0], versions[1]
                try:
                    from ml_or.demos.reopt_hard_constraints.feedback_processor import FeedbackProcessor
                    result = FeedbackProcessor().process_feedback(
                        trip_id=job.trip_id, family_id=family_code,
                        old_itinerary=old_itin.data.get("raw_solution") or old_itin.data,
                        new_itinerary=new_itin.data.get("raw_solution") or new_itin.data,
                        user_message=message,
                    )
                    ExplanationService.save_explanations(
                        trip_id=job.trip_id, family_id=family.id, itinerary_id=new_itin.id,
                        prev_itinerary_id=old_itin.id, explanations=result.get("explanations", []),
                        trigger_message=message,
                    )
                except Exception as exp_err:
                    logger.error(f"Could not generate explanations: {exp_err}", exc_info=True)

        trip = session.exec(select(TripSession).where(TripSession.trip_id == job.trip_id)).first()
        if trip:
            history = list(trip.feedback_history or [])
            history.append({
                "iteration": len(history) + 1,
                "timestamp": datetime.utcnow().isoformat(),
                "family_id": family_code,
                "message": message,
                "event_type": "FEEDBACK",
                "action": "re-optimized",
            })
            trip.feedback_history = history
            trip.last_optimization_at = datetime.utcnow()
            session.add(trip)
            session.commit()


WAIT_SECONDS = 8
TERMINAL = (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED)


def _family_targets(job, trip_session):
    """Only the family that asked gets the new branch; the others keep their plan."""
    target_codes = trip_session.family_ids
    try:
        from sqlmodel import Session as _S, select as _sel
        from app.core.db import engine as _e
        from app.models.family import Family as _F

        asked = (job.input_payload or {}).get("family_id")
        if asked:
            with _S(_e) as _s:
                fam = _s.exec(_sel(_F).where((_F.family_code == str(asked)) | (_F.id == asked if len(str(asked)) == 36 else False))).first()
            if fam:
                target_codes = [fam.family_code]
    except Exception as _err:
        logger.warning(f"Could not narrow the feedback to one family: {_err}")
    return target_codes


def _run_job(job, beat):
    """Do the work. Returns (result, apply, announcements, applied).

    Nothing is written here. `apply` is a function that writes the result (plan version, iteration record,
    trip pointer) into the session of the transaction that completes the job, so the result and the
    completion are saved together, under the owner's fence, or not at all.
    """
    runtime = AgentRuntime()
    apply, applied, announcements = None, False, []

    if job.job_type == JobType.AGENT_TOOLS:
        result = runtime.execute_tools_agent(ToolsAgentRequest(
            job_id=str(job.id), trip_id=job.trip_id, option_id=job.itinerary_id,
            event_id=job.input_payload.get("event_id"), details=job.input_payload.get("details")))

    elif job.job_type == JobType.AGENT_COMMUNICATION:
        result = runtime.execute_communication_agent(CommunicationAgentRequest(
            job_id=str(job.id), trip_id=job.trip_id,
            user_id=str(job.created_by_user_id) if job.created_by_user_id else None,
            option_id=job.itinerary_id, event_id=job.input_payload.get("event_id")))

    elif job.job_type == JobType.AGENT_FEEDBACK:
        from app.travel_context.travel_context_service import TravelContextService

        context = TravelContextService.build_context(job.trip_id)
        result = runtime.execute_feedback_optimization(FeedbackOptimizationRequest(
            job_id=str(job.id), trip_id=job.trip_id,
            user_id=str(job.created_by_user_id) if job.created_by_user_id else None,
            family_id=job.input_payload.get("family_id"), message=job.input_payload.get("message"), context=context))
        beat.check()

        solution = ((result.result or {}).get("optimization_result") or {}).get("solution") if result.success else None
        if solution and isinstance(solution, dict) and solution.get("days"):
            from app.services.trip_service import TripService

            trip_session = TripService.get_trip(job.trip_id)
            if trip_session:
                target_codes = _family_targets(job, trip_session)
                base_id = str(trip_session.current_itinerary_id) if trip_session.current_itinerary_id else None
                applied = True

                def apply(session):
                    from datetime import datetime
                    from sqlmodel import select
                    from app.models.trip_session import TripSession
                    from app.services import iteration_service
                    from app.services.itinerary_service import ItineraryService

                    ids = ItineraryService.publish_base_itinerary(
                        trip_id=job.trip_id, family_ids=target_codes, itinerary_data=solution,
                        created_reason=f"Feedback optimization (job {job.id})", session=session)
                    if not ids:
                        return
                    # What went in and what came out of this replan, in the trip's iteration record
                    iteration_service.record(
                        job.trip_id, "replan", session=session,
                        family_id=str((job.input_payload or {}).get("family_id") or "") or None, job_id=job.id,
                        input_snapshot={"message": (job.input_payload or {}).get("message"), "families": target_codes,
                                        "base_itinerary_id": base_id, "decision": (result.result or {}).get("decision")},
                        result=solution)
                    trip = session.exec(select(TripSession).where(TripSession.trip_id == job.trip_id)).first()
                    if trip:
                        trip.iteration_count = (trip.iteration_count or 0) + 1
                        trip.last_optimization_at = datetime.utcnow()
                        session.add(trip)
        elif result.success:
            logger.warning("Optimization result had no solution to persist")

        if result.success and job.trip_id:
            from app.services import notification_service as ns

            announcements.append({"kind": "notify_trip_travellers", "payload": ns.announcement(
                "notify_trip_travellers", trip_id=job.trip_id, type="feedback.processed",
                title="Your plan was updated" if applied else "Your feedback was saved",
                body=(job.input_payload or {}).get("message", "")[:200],
                link=f"/app/trip/{job.trip_id}/changes" if applied else f"/app/trip/{job.trip_id}/feedback",
                data={"trip_id": job.trip_id, "applied": applied})})
    elif job.job_type == JobType.TRIP_INIT:
        from app.services import trip_jobs

        result, announcements = trip_jobs.run(job)
    elif job.job_type == JobType.POI_PROPOSAL:
        from app.services import trip_jobs

        result, announcements = trip_jobs.run_place_request(job)
    else:
        raise ValueError(f"Unsupported job type: {job.job_type}")

    return result, apply, announcements, applied


@celery_app.task(bind=True, max_retries=None)
def execute_agent_job_task(self, job_id_str: str):
    from app.core.context import set_log_context, clear_log_context
    job_id = uuid.UUID(job_id_str)

    job = AgentJobService.get_job(job_id)
    if not job:
        logger.error(f"Task executed for unknown job_id: {job_id}")
        return
    set_log_context(correlation_id=job.correlation_id, agent_job_id=job_id_str, trip_id=job.trip_id, itinerary_id=job.itinerary_id)

    # A repeated message for a finished job does nothing
    if job.status in TERMINAL:
        logger.warning(f"Job {job_id} already in terminal state {job.status}. Skipping.")
        clear_log_context()
        return

    # Wait for earlier requests in the same stream, and for the trip, until the job's own deadline.
    # The trip lock only saves effort (two replans starting from the same old plan); correctness comes from
    # the fence checked when the result is saved.
    lock_name = f"trip:{job.trip_id}" if job.trip_id else None
    lock_token, waiting = None, None
    if AgentJobService.predecessor_pending(job):
        waiting = "an earlier request for this trip is still being handled"
    elif lock_name:
        lock_token = locks.acquire(lock_name, 170)
        if lock_token is None:
            waiting = "this trip is being updated by another request"
    if waiting:
        clear_log_context()
        if AgentJobService.past_wait_deadline(job):
            AgentJobService.fail_job(job_id, "This trip was busy for too long, so your request was not processed. "
                                             "Please send it again.", error_type="WaitDeadline")
            return
        logger.info(f"Job {job_id} waits: {waiting}")
        AgentJobService.touch(job_id)
        raise self.retry(countdown=WAIT_SECONDS)

    fence = None
    try:
        owner = f"{self.request.hostname or 'worker'}/{self.request.id or 'local'}"
        fence = AgentJobService.claim_job(job_id, owner=owner)
        if fence is None:
            logger.warning(f"Job {job_id} is owned by another worker; nothing to do.")
            return

        logger.info(f"Executing agent job {job_id} as fence {fence} [Correlation ID: {job.correlation_id}]")
        with Heartbeat(job_id, fence) as beat:
            result, apply, announcements, applied = _run_job(job, beat)
            beat.check()

            if result.success:
                # Result, iteration record, trip pointer, completion and announcements: one transaction,
                # only while this fence still owns the job
                if not AgentJobService.finish(job_id, fence, result.result, announcements, apply):
                    logger.warning(f"Job {job_id}: ownership lost before saving; this result was discarded")
                    return
                if applied:
                    try:
                        from app.services.trip_service import TripService

                        _record_feedback_outcome(job, TripService.get_trip(job.trip_id), job.input_payload.get("message") or "")
                    except Exception as exp_err:
                        logger.error(f"Could not record explanations: {exp_err}", exc_info=True)
                return result.result

            retryable = "AgentProviderError" in (result.error or "") or "AgentTimeoutError" in (result.error or "")
            current = AgentJobService.get_job(job_id)
            if retryable and current.attempt_count < current.max_attempts:
                if AgentJobService.retry_job(job_id, reason=result.error, fence=fence) is None:
                    return
                raise self.retry(exc=Exception(result.error), countdown=5)
            AgentJobService.fail_job(job_id, error_message=result.error, fence=fence)
            return None

    except Retry:  # celery retry signal: let it propagate
        raise
    except OwnershipLost:
        logger.warning(f"Job {job_id}: taken over by another worker while running; stopped and discarded")
        return None
    except Exception as e:
        from app.core import errors

        errors.record(e, job.correlation_id, f"job {job.job_type.value if hasattr(job.job_type, 'value') else job.job_type}")
        if fence is not None:
            AgentJobService.fail_job(job_id, error_message=str(e), error_type=type(e).__name__, fence=fence)
        raise
    finally:
        if lock_token:
            locks.release(lock_name, lock_token)
        clear_log_context()
