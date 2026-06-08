"""
Backend FastAPI for Academia Election Hub
Main entry point for the application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from config import settings
from database import init_supabase
from routers import (
    elections,
    resultats,
    anomalies,
    predictions,
    analytics,
    users,
    health
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    logger.info("🚀 Starting Academia Election Hub Backend")
    try:
        init_supabase()
        logger.info("✅ Supabase initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Supabase: {e}")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Academia Election Hub Backend")

# Create FastAPI app
app = FastAPI(
    title="Academia Election Hub API",
    description="Real-time electoral data analysis and anomaly detection",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(elections.router, prefix="/api/elections", tags=["Elections"])
app.include_router(resultats.router, prefix="/api/resultats", tags=["Results"])
app.include_router(anomalies.router, prefix="/api/anomalies", tags=["Anomalies"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Academia Election Hub API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
