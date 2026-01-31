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
    
    # Gemini API Configuration
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
    
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
        if not cls.GEMINI_API_KEY or cls.GEMINI_API_KEY in ["your_api_key_here", "demo_mode", ""]:
            raise ValueError(
                "GEMINI_API_KEY not set or is a placeholder. "
                "Please set a valid Google Gemini API key in the .env file."
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
