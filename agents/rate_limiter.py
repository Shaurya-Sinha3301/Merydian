"""
Global Rate Limiter - Ensures all agents respect the same API quota.

This is critical for free tier usage where the quota is shared across
the entire API key, not per-agent.
"""
import time
import logging
from threading import Lock

logger = logging.getLogger(__name__)


class GlobalRateLimiter:
    """
    Singleton rate limiter to coordinate API calls across all agents.
    Ensures only one agent can call the API at a time, with proper spacing.
    """
    _instance = None
    _lock = Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the rate limiter (only once)."""
        if self._initialized:
            return
            
        self.last_request_time = 0
        self.min_request_interval = 30  # 30 seconds = 2 requests per minute
        self._initialized = True
        logger.info("GlobalRateLimiter initialized (2 RPM for free tier)")
    
    def wait_if_needed(self, agent_name: str = "Unknown"):
        """
        Wait if necessary to respect rate limits.
        
        Args:
            agent_name: Name of the agent making the request (for logging)
        """
        with self._lock:
            time_since_last = time.time() - self.last_request_time
            
            if time_since_last < self.min_request_interval:
                wait_time = self.min_request_interval - time_since_last
                logger.warning(
                    f"[{agent_name}] Rate limit: waiting {wait_time:.1f}s before API call "
                    f"(global limiter enforcing 2 RPM)"
                )
                time.sleep(wait_time)
            
            self.last_request_time = time.time()
            logger.info(f"[{agent_name}] API call cleared by global rate limiter")
    
    def set_interval(self, seconds: int):
        """
        Update the minimum interval between requests.
        
        Args:
            seconds: Minimum seconds between API calls
        """
        self.min_request_interval = seconds
        logger.info(f"Rate limit interval updated to {seconds}s")


# Create singleton instance
rate_limiter = GlobalRateLimiter()
