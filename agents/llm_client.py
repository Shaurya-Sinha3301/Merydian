"""
Shared LLM Client - Provides a singleton Groq client for all agents.
This ensures single quota source and no per-agent state.
"""
from groq import Groq
from .config import Config

_client = None


def get_llm_client():
    """
    Get or create the shared Groq client.
    
    Returns:
        Groq: Shared Groq client instance
    """
    global _client
    if _client is None:
        _client = Groq(api_key=Config.GROQ_API_KEY)
    return _client
