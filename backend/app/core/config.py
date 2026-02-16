from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "MeiliAi"
    
    # SECURITY
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # DATABASE
    SQLALCHEMY_DATABASE_URI: str

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    # AGENT CONFIGURATION
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    
    # ML OPTIMIZER PATHS
    ML_OPTIMIZER_BASE_DATA: str = "ml_or/data"
    TRIP_SESSION_STORAGE: str = "./trip_sessions"
    OPTIMIZER_OUTPUT_DIR: str = "./optimizer_outputs"

    class Config:
        case_sensitive = True
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
        env_file_encoding = 'utf-8'

settings = Settings()
