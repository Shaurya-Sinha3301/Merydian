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
            publish=True,
            input_payload={"event_id": event_id, "details": details}
        )

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
            publish=True,
            input_payload={"event_id": event_id}
        )

        return job.id

    def enqueue_feedback_optimization(self, trip_id: str, family_id: str, message: str, agent_id: Optional[str] = None) -> Any:
        # The same message sent twice in a few seconds (a double-click) follows the first job
        recent = AgentJobService.find_recent_duplicate(trip_id, family_id, message)
        if recent:
            return {
                "job_id": str(recent.id),
                "status": recent.status.value if hasattr(recent.status, "value") else str(recent.status),
                "message": "Already received. Following the same job.",
            }

        job = AgentJobService.create_job(
            job_type=JobType.AGENT_FEEDBACK,
            trip_id=trip_id,
            created_by_user_id=uuid.UUID(agent_id) if agent_id else None,
            publish=True,
            # One family's feedback on one trip is handled in the order it was sent
            sequence_key=f"feedback:{trip_id}:{family_id}",
            input_payload={"family_id": family_id, "message": message}
        )


        # Return standard async response
        return {
            "job_id": str(job.id),
            "status": "QUEUED",
            "message": "Job started"
        }
