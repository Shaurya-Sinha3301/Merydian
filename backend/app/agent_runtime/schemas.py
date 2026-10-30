from typing import Any, Dict, Optional
from pydantic import BaseModel, Field

class BaseAgentRequest(BaseModel):
    job_id: str = Field(..., description="UUID of the AgentJob")
    trip_id: str = Field(..., description="Trip session identifier")
    user_id: Optional[str] = Field(default=None, description="Initiating user or agent UUID")

class ToolsAgentRequest(BaseAgentRequest):
    option_id: str
    event_id: str
    details: Optional[Dict[str, Any]] = None

class CommunicationAgentRequest(BaseAgentRequest):
    option_id: str
    event_id: str

from app.travel_context.schemas import TravelContext

class FeedbackOptimizationRequest(BaseAgentRequest):
    family_id: str
    message: str
    context: Optional[TravelContext] = None

class AgentRuntimeResult(BaseModel):
    success: bool = Field(..., description="Whether the agent execution fully succeeded")
    result: Dict[str, Any] = Field(default_factory=dict, description="Execution output data")
    error: Optional[str] = Field(default=None, description="Normalized error message if failed")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Execution telemetry (time taken, retries, etc.)")
