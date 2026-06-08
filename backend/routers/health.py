"""
Health check endpoints
"""

from fastapi import APIRouter, Response
from database import get_supabase
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/health", tags=["Health"])
async def health_check():
    """Check API and Supabase health"""
    try:
        supabase = get_supabase()
        
        # Test Supabase connection
        response = supabase.table("elections").select("*", count="exact").limit(1).execute()
        
        return {
            "status": "healthy",
            "api": "operational",
            "database": "connected",
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "api": "operational",
            "database": "disconnected",
            "error": str(e)
        }, 503

@router.get("/health/db")
async def database_health():
    """Check database connection"""
    try:
        supabase = get_supabase()
        response = supabase.table("elections").select("count", count="exact").execute()
        
        return {
            "status": "connected",
            "database": "supabase",
            "records_count": response.count
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "disconnected",
            "error": str(e)
        }, 503

@router.get("/ready")
async def readiness_check():
    """Kubernetes-style readiness check"""
    try:
        supabase = get_supabase()
        response = supabase.table("elections").select("*", count="exact").limit(1).execute()
        return {"ready": True}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {"ready": False}, 503
