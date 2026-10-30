import pytest
from unittest.mock import MagicMock
from app.services.agent_workflow_service import AgentWorkflowService
from app.models.agent_job import AgentJob, JobStatus
from app.agent_runtime.schemas import AgentRuntimeResult
from app.agent_runtime.exceptions import AgentTimeoutError

def test_workflow_success(mocker):
    # Mock dependencies
    mock_runtime = MagicMock()
    # Assume runtime returns success
    mock_runtime.execute_feedback_optimization.return_value = AgentRuntimeResult(
        success=True,
        result={"itinerary_updated": True},
        metadata={"execution_time_seconds": 1.5}
    )
    
    mock_job_service = mocker.patch('app.services.agent_workflow_service.AgentJobService')
    mock_job = MagicMock()
    mock_job.id = "mock_job_uuid"
    mock_job_service.create_job.return_value = mock_job

    workflow_service = AgentWorkflowService(runtime=mock_runtime)
    
    # Execute workflow
    result = workflow_service.enqueue_feedback_optimization(
        trip_id="trip1",
        family_id="fam1",
        message="Test message",
        agent_id="user1"
    )
    
    # Assertions
    mock_job_service.create_job.assert_called_once()
    mock_job_service.start_job.assert_called_once_with(mock_job.id)
    mock_runtime.execute_feedback_optimization.assert_called_once()
    mock_job_service.complete_job.assert_called_once_with(mock_job.id, result_payload={"itinerary_updated": True})
    
    assert result == {"itinerary_updated": True}


def test_workflow_failure(mocker):
    # Mock dependencies
    mock_runtime = MagicMock()
    # Assume runtime returns failure with AgentTimeoutError message
    mock_runtime.execute_feedback_optimization.return_value = AgentRuntimeResult(
        success=False,
        error="Execution timed out after 120 seconds",
        metadata={"timeout_seconds": 120}
    )
    
    mock_job_service = mocker.patch('app.services.agent_workflow_service.AgentJobService')
    mock_job = MagicMock()
    mock_job.id = "mock_job_uuid"
    mock_job_service.create_job.return_value = mock_job

    workflow_service = AgentWorkflowService(runtime=mock_runtime)
    
    # Execute workflow expecting RuntimeError
    with pytest.raises(RuntimeError) as exc_info:
        workflow_service.enqueue_feedback_optimization(
            trip_id="trip1",
            family_id="fam1",
            message="Test message",
            agent_id="user1"
        )
    
    # Assertions
    mock_job_service.create_job.assert_called_once()
    mock_job_service.start_job.assert_called_once_with(mock_job.id)
    mock_runtime.execute_feedback_optimization.assert_called_once()
    
    # Job should be marked as failed
    mock_job_service.fail_job.assert_called_once_with(
        mock_job.id, 
        error_message="Execution timed out after 120 seconds"
    )
    mock_job_service.complete_job.assert_not_called()
