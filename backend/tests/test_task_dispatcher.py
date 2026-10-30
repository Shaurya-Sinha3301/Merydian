import pytest
import uuid
from app.task_queue.dispatcher import TaskDispatcher

def test_enqueue_agent_job(mocker):
    # Mock the celery task's delay method
    mock_task = mocker.patch('app.workers.agent_tasks.execute_agent_job_task')
    mock_delay = mock_task.delay
    
    test_job_id = uuid.uuid4()
    
    TaskDispatcher.enqueue_agent_job(test_job_id)
    
    mock_delay.assert_called_once_with(str(test_job_id))
