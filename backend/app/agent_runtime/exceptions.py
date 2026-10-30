class AgentRuntimeError(Exception):
    """Base exception for all normalized agent execution errors."""
    retryable: bool = False

class AgentTimeoutError(AgentRuntimeError):
    """Raised when an external API or optimizer times out."""
    retryable: bool = True

class AgentProviderError(AgentRuntimeError):
    """Raised when an upstream LLM or API provider fails (e.g. 503, rate limit)."""
    retryable: bool = True

class AgentValidationError(AgentRuntimeError):
    """Raised when a request payload is invalid."""
    retryable: bool = False
