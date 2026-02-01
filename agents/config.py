"""
Configuration management for the agent system.
Loads environment variables and provides centralized configuration access.
"""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
ROOT_DIR = Path(__file__).parent.parent
ENV_PATH = ROOT_DIR / ".env"
load_dotenv(ENV_PATH)


class Config:
    """Centralized configuration for the agent system."""
    
    # LLM Configuration (Groq)
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    
    # Agent System Configuration
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    
    # Project Paths
    PROJECT_ROOT = ROOT_DIR
    AGENTS_DIR = ROOT_DIR / "agents"
    ML_OR_DIR = ROOT_DIR / "ml_or"
    TEST_DATA_DIR = ML_OR_DIR / "tests" / "solved" / "3fam3daypref"
    
    @classmethod
    def validate(cls):
        """Validate that required configuration is present."""
        if not cls.GROQ_API_KEY or cls.GROQ_API_KEY in ["your_api_key_here", "demo_mode", ""]:
            raise ValueError(
                "GROQ_API_KEY not set or is a placeholder. "
                "Please set a valid Groq API key in the .env file."
            )
        
        return True
    
    @classmethod
    def setup_logging(cls):
        """Configure logging for the agent system."""
        logging.basicConfig(
            level=getattr(logging, cls.LOG_LEVEL),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )


# Initialize logging on import
Config.setup_logging()
