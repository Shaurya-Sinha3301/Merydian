import uuid
import logging
from typing import Optional, Dict, Any

from app.models.agent_job import JobType
from app.services.agent_job_service import AgentJobService

from app.agent_runtime import (
    AgentRuntime, 
    ToolsAgentRequest, 
    CommunicationAgentRequest, 
    FeedbackOptimizationRequest
)

logger = logging.getLogger(__name__)

class AgentWorkflowService:
    def __init__(self, runtime: AgentRuntime):
        self.runtime = runtime

    def enqueue_tools_agent(self, option_id: str, event_id: str, trip_id: str, details: Optional[Dict[str, Any]] = None) -> uuid.UUID:
        """
        Enqueues a Tools Agent job.
        """
        job = AgentJobService.create_job(
            job_type=JobType.AGENT_TOOLS,
            trip_id=trip_id,
            itinerary_id=option_id,
            input_payload={"event_id": event_id, "details": details}
        )
        
        from app.task_queue.dispatcher import TaskDispatcher
        TaskDispatcher.enqueue_agent_job(job.id)
        return job.id

    def enqueue_communication_agent(self, option_id: str, event_id: str, trip_id: str, agent_id: Optional[str] = None) -> uuid.UUID:
        """
        Enqueues a Communication Agent job.
        """
        job = AgentJobService.create_job(
            job_type=JobType.AGENT_COMMUNICATION,
            trip_id=trip_id,
            itinerary_id=option_id,
            created_by_user_id=uuid.UUID(agent_id) if agent_id else None,
            input_payload={"event_id": event_id}
        )
        
        from app.task_queue.dispatcher import TaskDispatcher
        TaskDispatcher.enqueue_agent_job(job.id)
        return job.id
        
    def enqueue_feedback_optimization(self, trip_id: str, family_id: str, message: str, agent_id: Optional[str] = None) -> Any:
        job = AgentJobService.create_job(
            job_type=JobType.AGENT_FEEDBACK,
            trip_id=trip_id,
            created_by_user_id=uuid.UUID(agent_id) if agent_id else None,
            input_payload={"family_id": family_id, "message": message}
        )
        
        from app.task_queue.dispatcher import TaskDispatcher
        TaskDispatcher.enqueue_agent_job(job.id)
        
        # Return standard async response
        return {
            "job_id": str(job.id),
            "status": "QUEUED",
            "message": "Job started"
        }
