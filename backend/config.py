"""
Configuration settings for Academia Election Hub Backend
"""

from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    # Database
    DATABASE_URL: str = ""
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080"
    ]
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Anomaly Detection
    ANOMALY_ZSCORE_THRESHOLD: float = 2.5
    ANOMALY_IQR_MULTIPLIER: float = 1.5
    ANOMALY_MIN_PARTICIPATION_RATE: float = 10.0
    ANOMALY_MAX_PARTICIPATION_RATE: float = 95.0
    ANOMALY_VOTES_TO_REGISTERED_RATIO_MAX: float = 1.05
    
    # Predictions
    PREDICTION_SMA_PERIOD: int = 3
    PREDICTION_SMA_WEIGHT: float = 0.4
    PREDICTION_REGRESSION_WEIGHT: float = 0.6
    PREDICTION_MIN_DATA_POINTS: int = 5
    PREDICTION_CONFIDENCE_INTERVAL: float = 0.95
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 50
    MAX_PAGE_SIZE: int = 100
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Validate required settings
def validate_settings():
    """Validate that all required settings are configured"""
    required_settings = [
        "SUPABASE_URL",
        "SUPABASE_KEY",
        "SUPABASE_SERVICE_ROLE_KEY"
    ]
    
    missing = [
        setting for setting in required_settings
        if not getattr(settings, setting)
    ]
    
    if missing:
        print(f"⚠️ Warning: Missing required settings: {', '.join(missing)}")
        print("   Please configure these in .env file")
