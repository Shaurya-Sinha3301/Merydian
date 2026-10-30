import pytest
from unittest.mock import patch, MagicMock
from app.agent_runtime import AgentRuntime, FeedbackOptimizationRequest, ToolsAgentRequest
from app.agent_runtime.exceptions import AgentProviderError, AgentTimeoutError, AgentRuntimeError, AgentValidationError

@pytest.fixture
def mock_feedback_request():
    return FeedbackOptimizationRequest(
        job_id="test_job_123",
        trip_id="test_trip_1",
        family_id="fam_a",
        message="We need a late checkout."
    )

@pytest.fixture
def mock_tools_request():
    return ToolsAgentRequest(
        job_id="test_job_456",
        trip_id="test_trip_1",
        option_id="opt_1",
        event_id="evt_1",
        details={"type": "hotel"}
    )

@patch('app.services.optimizer_service.OptimizerService.process_feedback_with_agents')
def test_agent_runtime_success(mock_optimizer, mock_feedback_request):
    mock_optimizer.return_value = {"success": True, "action_taken": "Optimizer ran"}
    
    runtime = AgentRuntime()
    result = runtime.execute_feedback_optimization(mock_feedback_request)
    
    assert result.success is True
    assert result.result == {"success": True, "action_taken": "Optimizer ran"}
    assert result.error is None
    assert "execution_time_seconds" in result.metadata

@patch('app.services.optimizer_service.OptimizerService.process_feedback_with_agents')
def test_agent_runtime_provider_error(mock_optimizer, mock_feedback_request):
    # Simulate a Groq API Rate Limit error
    mock_optimizer.side_effect = Exception("Groq API rate limit exceeded")
    
    runtime = AgentRuntime()
    result = runtime.execute_feedback_optimization(mock_feedback_request)
    
    assert result.success is False
    assert result.error is not None
    assert "AgentProviderError" in result.error
    assert "rate limit" in result.error

@patch('app.services.optimizer_service.OptimizerService.process_feedback_with_agents')
def test_agent_runtime_timeout_error(mock_optimizer, mock_feedback_request):
    # Simulate a timeout
    import time
    def slow_function(*args, **kwargs):
        time.sleep(2)
        return {}
    mock_optimizer.side_effect = slow_function
    
    runtime = AgentRuntime()
    # Enforce 1-second timeout
    result = runtime.execute_feedback_optimization(mock_feedback_request, timeout_seconds=1)
    
    assert result.success is False
    assert result.error is not None
    assert "AgentTimeoutError" in result.error
    assert "timed out" in result.error

@patch('app.services.agent_service.AgentService.trigger_tools_agent')
def test_agent_runtime_tools_success(mock_tools, mock_tools_request):
    mock_tools.return_value = True
    
    runtime = AgentRuntime()
    result = runtime.execute_tools_agent(mock_tools_request)
    
    assert result.success is True
    assert result.result == {"tools_triggered": True}
    assert result.error is None

@patch('app.services.optimizer_service.OptimizerService.process_feedback_with_agents')
def test_agent_runtime_missing_payload_args(mock_optimizer):
    missing_payload_request = FeedbackOptimizationRequest(
        job_id="123",
        trip_id="trip1",
        family_id="",
        message=""
    )
    
    runtime = AgentRuntime()
    result = runtime.execute_feedback_optimization(missing_payload_request)
    
    assert result.success is False
    assert "AgentValidationError" in result.error
    assert "Missing 'family_id' or 'message'" in result.error
    mock_optimizer.assert_not_called()
