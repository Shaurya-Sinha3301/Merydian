from typing import Any
import uuid

class TaskDispatcher:
    @staticmethod
    def enqueue_agent_job(job_id: uuid.UUID) -> Any:
        from app.services.agent_job_service import AgentJobService
        from app.workers.agent_tasks import execute_agent_job_task
        
        AgentJobService.queue_job(job_id)
        return execute_agent_job_task.delay(str(job_id))
