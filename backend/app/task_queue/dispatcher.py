from typing import Any
import uuid


class TaskDispatcher:
    @staticmethod
    def enqueue_agent_job(job_id: uuid.UUID) -> Any:
        """Queue an existing job through the outbox, so the queueing is durable even if Redis is down."""
        from sqlmodel import Session

        from app.core.db import engine
        from app.services import outbox_service
        from app.services.agent_job_service import AgentJobService

        AgentJobService.queue_job(job_id)
        with Session(engine) as session:
            rid = outbox_service.add(session, "publish_job", {"job_id": str(job_id)}).id
            session.commit()
        outbox_service.try_now([rid])
        return rid
