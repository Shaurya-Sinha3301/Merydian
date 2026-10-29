import uuid
import logging

from celery.exceptions import Retry

from app.workers.celery_app import celery_app
from app.services.agent_job_service import AgentJobService
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


@celery_app.task(bind=True, max_retries=3)
def execute_agent_job_task(self, job_id_str: str):
    from app.core.context import set_log_context, clear_log_context
    job_id = uuid.UUID(job_id_str)
    
    # Check if job exists
    job = AgentJobService.get_job(job_id)
    if not job:
        logger.error(f"Task executed for unknown job_id: {job_id}")
        return
        
    set_log_context(
        correlation_id=job.correlation_id,
        agent_job_id=job_id_str,
        trip_id=job.trip_id,
        itinerary_id=job.itinerary_id
    )
        
    # Idempotency check
    if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
        logger.warning(f"Job {job_id} already in terminal state {job.status}. Skipping.")
        return
        
    try:
        if not AgentJobService.claim_job(job_id):
            logger.warning(f"Failed to claim job {job_id}. Another worker may be processing it.")
            return
            
        logger.info(f"Executing agent job {job_id} [Correlation ID: {job.correlation_id}]")
        
        # Instantiate runtime
        runtime = AgentRuntime()
        
        # Build Typed Request
        if job.job_type == JobType.AGENT_TOOLS:
            request = ToolsAgentRequest(
                job_id=str(job.id),
                trip_id=job.trip_id,
                option_id=job.itinerary_id,
                event_id=job.input_payload.get("event_id"),
                details=job.input_payload.get("details")
            )
            result = runtime.execute_tools_agent(request)
            
        elif job.job_type == JobType.AGENT_COMMUNICATION:
            request = CommunicationAgentRequest(
                job_id=str(job.id),
                trip_id=job.trip_id,
                user_id=str(job.created_by_user_id) if job.created_by_user_id else None,
                option_id=job.itinerary_id,
                event_id=job.input_payload.get("event_id")
            )
            result = runtime.execute_communication_agent(request)
            
        elif job.job_type == JobType.AGENT_FEEDBACK:
            # 1. Fetch Pure Context
            from app.travel_context.travel_context_service import TravelContextService
            context = TravelContextService.build_context(job.trip_id)

            # 2. Build Request
            request = FeedbackOptimizationRequest(
                job_id=str(job.id),
                trip_id=job.trip_id,
                user_id=str(job.created_by_user_id) if job.created_by_user_id else None,
                family_id=job.input_payload.get("family_id"),
                message=job.input_payload.get("message"),
                context=context
            )
            
            # 3. Execute Pure Runtime (uses architecture contracts internally)
            result = runtime.execute_feedback_optimization(request)
            
            # 4. Persist optimization result to database (NOT filesystem)
            if result.success:
                try:
                    from app.services.itinerary_service import ItineraryService
                    from app.services.trip_service import TripService
                    from datetime import datetime
                    
                    opt_res = result.result.get("optimization_result", {})
                    solution = opt_res.get("solution")
                    
                    if solution and isinstance(solution, dict) and solution.get("days"):
                        # Get all family codes for this trip
                        trip_session = TripService.get_trip(job.trip_id)
                        if trip_session:
                            # Create itinerary records via ItineraryService
                            itinerary_ids = ItineraryService.publish_base_itinerary(
                                trip_id=job.trip_id,
                                family_ids=trip_session.family_ids,
                                itinerary_data=solution,
                                created_reason=f"Feedback optimization (job {job_id})",
                            )
                            
                            # Update TripSession with current_itinerary_id
                            if itinerary_ids:
                                TripService.update_trip_itinerary(
                                    trip_id=job.trip_id,
                                    itinerary_id=itinerary_ids[0],
                                    iteration_count_increment=True,
                                )
                            
                            logger.info(f"Persisted optimization result to DB: {len(itinerary_ids)} itinerary records")
                            _record_feedback_outcome(job, trip_session, job.input_payload.get("message") or "")
                    else:
                        logger.warning("Optimization result had no solution to persist")
                        
                except Exception as save_err:
                    logger.error(f"Failed to persist optimization result to DB: {save_err}", exc_info=True)
        else:
            raise ValueError(f"Unsupported job type: {job.job_type}")
        
        # Handle Result
        if result.success:
            AgentJobService.complete_job(job_id, result_payload=result.result)
            
            # Publish to Redis for WebSocket real-time updates
            try:
                import redis
                from app.core.config import settings
                import json
                r = redis.from_url(settings.REDIS_URL)
                notification = {
                    "type": "JOB_COMPLETED",
                    "job_id": str(job_id),
                    "trip_id": job.trip_id,
                    "agent_id": str(job.created_by_user_id) if job.created_by_user_id else None
                }
                # Publish to both channels to ensure appropriate dashboards update
                r.publish("booking_notifications", json.dumps(notification))
                r.publish("traveller_notifications", json.dumps(notification))
            except Exception as pub_err:
                logger.error(f"Failed to publish to redis: {pub_err}")
                
            return result.result
        else:
            # Check for retryability based on error name
            is_retryable = "AgentProviderError" in result.error or "AgentTimeoutError" in result.error
            
            if is_retryable:
                AgentJobService.retry_job(job_id, reason=result.error)
                raise self.retry(exc=Exception(result.error), max_retries=3, countdown=5)
            else:
                AgentJobService.fail_job(job_id, error_message=result.error)
                raise RuntimeError(result.error)
                
    except Retry:  # celery retry signal: let it propagate
        raise
    except Exception as e:
        if not isinstance(e, RuntimeError): # If it wasn't already explicitly failed
            AgentJobService.fail_job(job_id, error_message=str(e), error_type=type(e).__name__)
        raise
    finally:
        clear_log_context()
