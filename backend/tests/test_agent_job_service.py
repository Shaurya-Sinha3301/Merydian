import uuid
import pytest
from sqlmodel import Session, select
from app.models.agent_job import AgentJob, AgentJobEvent, JobStatus, JobType
from app.services.agent_job_service import AgentJobService
from app.core.db import engine

@pytest.fixture
def db_session():
    # In a real test environment, this would use an overridden engine or mock
    with Session(engine) as session:
        yield session

def test_create_job(db_session):
    job = AgentJobService.create_job(
        job_type=JobType.AGENT_TOOLS,
        priority=10,
        trip_id="test_trip_123"
    )
    
    assert job.id is not None
    assert job.status == JobStatus.CREATED
    assert job.job_type == JobType.AGENT_TOOLS
    assert job.trip_id == "test_trip_123"
    assert job.priority == 10
    
    # Check events
    events = db_session.exec(select(AgentJobEvent).where(AgentJobEvent.job_id == job.id)).all()
    assert len(events) == 1
    assert events[0].event_type == "JOB_CREATED"
    assert events[0].new_status == JobStatus.CREATED.value

def test_start_job(db_session):
    job = AgentJobService.create_job(job_type=JobType.AGENT_COMMUNICATION)
    
    started_job = AgentJobService.start_job(job.id)
    assert started_job.status == JobStatus.RUNNING
    assert started_job.attempt_count == 1
    assert started_job.started_at is not None
    
    events = db_session.exec(select(AgentJobEvent).where(AgentJobEvent.job_id == job.id)).all()
    assert len(events) == 2
    assert events[1].event_type == "JOB_STARTED"
    assert events[1].previous_status == JobStatus.CREATED.value
    assert events[1].new_status == JobStatus.RUNNING.value

def test_complete_job(db_session):
    job = AgentJobService.create_job(job_type=JobType.AGENT_FEEDBACK)
    AgentJobService.start_job(job.id)
    
    completed_job = AgentJobService.complete_job(job.id, result_payload={"success": True})
    assert completed_job.status == JobStatus.COMPLETED
    assert completed_job.completed_at is not None
    assert completed_job.result_payload == {"success": True}
    
    events = db_session.exec(select(AgentJobEvent).where(AgentJobEvent.job_id == job.id)).all()
    assert len(events) == 3
    assert events[2].event_type == "JOB_COMPLETED"

def test_fail_job(db_session):
    job = AgentJobService.create_job(job_type=JobType.AGENT_TOOLS)
    AgentJobService.start_job(job.id)
    
    failed_job = AgentJobService.fail_job(job.id, error_message="API timeout", error_type="TimeoutError")
    assert failed_job.status == JobStatus.FAILED
    assert failed_job.error_message == "API timeout"
    assert failed_job.error_type == "TimeoutError"
    
    events = db_session.exec(select(AgentJobEvent).where(AgentJobEvent.job_id == job.id)).all()
    assert len(events) == 3
    assert events[2].event_type == "JOB_FAILED"
    assert events[2].event_payload["error_message"] == "API timeout"

def test_invalid_job_id():
    fake_id = uuid.uuid4()
    with pytest.raises(ValueError, match="not found"):
        AgentJobService.start_job(fake_id)
