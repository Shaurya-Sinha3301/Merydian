from datetime import datetime
from typing import Optional, Any
import uuid
from sqlmodel import Field, SQLModel, Column
from sqlalchemy.dialects.postgresql import JSONB
import enum

class JobStatus(str, enum.Enum):
    CREATED = "CREATED"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    RETRYING = "RETRYING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class JobType(str, enum.Enum):
    AGENT_TOOLS = "AGENT_TOOLS"
    AGENT_COMMUNICATION = "AGENT_COMMUNICATION"
    AGENT_FEEDBACK = "AGENT_FEEDBACK"

class AgentJobBase(SQLModel):
    job_type: JobType = Field(index=True)
    status: JobStatus = Field(default=JobStatus.CREATED, index=True)
    priority: int = Field(default=0)
    correlation_id: str = Field(default_factory=lambda: str(uuid.uuid4()), index=True)
    
    # Relations
    created_by_user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id", index=True)
    trip_id: Optional[str] = Field(default=None, index=True)
    itinerary_id: Optional[str] = Field(default=None, index=True)
    
    # Execution tracking
    attempt_count: int = Field(default=0)
    max_attempts: int = Field(default=3)
    worker_id: Optional[str] = Field(default=None)
    celery_task_id: Optional[str] = Field(default=None, index=True)
    
    # Error tracking
    error_type: Optional[str] = Field(default=None)
    error_message: Optional[str] = Field(default=None)
    internal_error_details: Optional[str] = Field(default=None)

class AgentJob(AgentJobBase, table=True):
    __tablename__ = "agent_jobs"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    
    # Payloads
    input_payload: Optional[dict] = Field(default={}, sa_column=Column(JSONB))
    result_payload: Optional[dict] = Field(default={}, sa_column=Column(JSONB))
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

class AgentJobEvent(SQLModel, table=True):
    __tablename__ = "agent_job_events"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_id: uuid.UUID = Field(foreign_key="agent_jobs.id", index=True)
    
    event_type: str = Field(index=True) # e.g. "STATUS_CHANGED", "RETRY_SCHEDULED"
    previous_status: Optional[str] = Field(default=None)
    new_status: Optional[str] = Field(default=None)
    
    event_payload: Optional[dict] = Field(default={}, sa_column=Column(JSONB))
    
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
