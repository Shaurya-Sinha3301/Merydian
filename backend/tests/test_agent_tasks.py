import pytest
from unittest.mock import MagicMock
import uuid
from app.workers.agent_tasks import execute_agent_job_task
from app.agent_runtime.schemas import AgentRuntimeResult
from app.models.agent_job import JobType, JobStatus

@pytest.fixture
def mock_job_service(mocker):
    return mocker.patch('app.workers.agent_tasks.AgentJobService')

@pytest.fixture
def mock_runtime_cls(mocker):
    return mocker.patch('app.workers.agent_tasks.AgentRuntime')

@pytest.fixture
def mock_task_instance(mocker):
    task = mocker.patch('app.workers.agent_tasks.execute_agent_job_task')
    task.retry.exc_class = Exception
    return task

def test_execute_agent_job_success(mock_job_service, mock_runtime_cls):
    job_id = uuid.uuid4()
    
    mock_job = MagicMock()
    mock_job.id = job_id
    mock_job.status = JobStatus.QUEUED
    mock_job.job_type = JobType.AGENT_TOOLS
    mock_job.trip_id = "trip1"
    mock_job.itinerary_id = "itinerary1"
    mock_job.correlation_id = "corr_123"
    mock_job.input_payload = {"event_id": "evt1", "details": {}}
    
    mock_job_service.get_job.return_value = mock_job
    mock_job_service.claim_job.return_value = True
    
    mock_runtime_instance = mock_runtime_cls.return_value
    mock_runtime_instance.execute_tools_agent.return_value = AgentRuntimeResult(
        success=True, result={"status": "done"}, metadata={}
    )
    
    result = execute_agent_job_task(str(job_id))
    
    mock_job_service.claim_job.assert_called_once_with(job_id)
    mock_runtime_instance.execute_tools_agent.assert_called_once()
    mock_job_service.complete_job.assert_called_once_with(job_id, result_payload={"status": "done"})
    assert result == {"status": "done"}

def test_duplicate_task_execution_ignored(mock_job_service, mock_runtime_cls):
    job_id = uuid.uuid4()
    
    mock_job = MagicMock()
    mock_job.id = job_id
    mock_job.status = JobStatus.COMPLETED
    mock_job_service.get_job.return_value = mock_job
    
    result = execute_agent_job_task(str(job_id))
    
    mock_job_service.claim_job.assert_not_called()
    mock_runtime_cls.return_value.execute_tools_agent.assert_not_called()
    assert result is None

def test_atomic_claim_failure_aborts(mock_job_service, mock_runtime_cls):
    job_id = uuid.uuid4()
    
    mock_job = MagicMock()
    mock_job.id = job_id
    mock_job.status = JobStatus.QUEUED
    mock_job_service.get_job.return_value = mock_job
    mock_job_service.claim_job.return_value = False
    
    result = execute_agent_job_task(str(job_id))
    
    mock_job_service.claim_job.assert_called_once_with(job_id)
    mock_runtime_cls.return_value.execute_tools_agent.assert_not_called()
    assert result is None

def test_execute_agent_job_retryable(mock_job_service, mock_runtime_cls, mocker):
    job_id = uuid.uuid4()
    
    mock_job = MagicMock()
    mock_job.id = job_id
    mock_job.status = JobStatus.QUEUED
    mock_job.job_type = JobType.AGENT_FEEDBACK
    mock_job.trip_id = "trip1"
    mock_job.correlation_id = "corr_456"
    mock_job.input_payload = {"family_id": "fam1", "message": "msg"}
    mock_job_service.get_job.return_value = mock_job
    mock_job_service.claim_job.return_value = True
    
    mock_runtime_instance = mock_runtime_cls.return_value
    mock_runtime_instance.execute_feedback_optimization.return_value = AgentRuntimeResult(
        success=False, error="AgentProviderError: API down", metadata={}
    )
    
    mock_retry = mocker.patch('app.workers.agent_tasks.execute_agent_job_task.retry', side_effect=Exception("Retry Exception"))
    
    with pytest.raises(Exception, match="Retry Exception"):
        execute_agent_job_task(str(job_id))
        
    mock_job_service.retry_job.assert_called_once_with(job_id, reason="AgentProviderError: API down")

def test_execute_agent_job_non_retryable(mock_job_service, mock_runtime_cls, mocker):
    job_id = uuid.uuid4()
    
    mock_job = MagicMock()
    mock_job.id = job_id
    mock_job.status = JobStatus.QUEUED
    mock_job.job_type = JobType.AGENT_COMMUNICATION
    mock_job.trip_id = "trip1"
    mock_job.correlation_id = "corr_789"
    mock_job.input_payload = {"event_id": "evt1"}
    mock_job_service.get_job.return_value = mock_job
    mock_job_service.claim_job.return_value = True
    
    mock_runtime_instance = mock_runtime_cls.return_value
    mock_runtime_instance.execute_communication_agent.return_value = AgentRuntimeResult(
        success=False, error="AgentValidationError: bad input", metadata={}
    )
    
    with pytest.raises(RuntimeError, match="AgentValidationError"):
        execute_agent_job_task(str(job_id))
        
    mock_job_service.fail_job.assert_called_once_with(job_id, error_message="AgentValidationError: bad input")
