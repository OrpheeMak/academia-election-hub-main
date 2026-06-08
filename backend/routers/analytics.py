"""
Analytics API endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from database import db
from services.analytics import analytics_service
from models import StatistiqueProvince
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/{election_id}/overview")
async def get_election_overview(election_id: str):
    """Get election overview statistics"""
    try:
        resultats = await db.get_resultats(election_id, skip=0, limit=10000)
        anomalies = await db.get_anomalies(election_id, skip=0, limit=10000)
        predictions = await db.get_predictions(election_id, skip=0, limit=10000)
        
        stats = analytics_service.calculate_election_stats(
            election_id,
            resultats or [],
            anomalies or [],
            predictions or []
        )
        
        return stats
    except Exception as e:
        logger.error(f"Error fetching election overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{election_id}/provinces")
async def get_provinces_statistics(election_id: str):
    """Get statistics grouped by province"""
    try:
        resultats = await db.get_resultats(election_id, skip=0, limit=10000)
        anomalies = await db.get_anomalies(election_id, skip=0, limit=10000)
        predictions = await db.get_predictions(election_id, skip=0, limit=10000)
        
        stats = analytics_service.calculate_province_stats(
            resultats or [],
            anomalies or [],
            predictions or []
        )
        
        return {
            'election_id': election_id,
            'provinces': stats,
            'total_provinces': len(stats),
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching provinces statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{election_id}/candidates")
async def get_candidates_statistics(election_id: str):
    """Get statistics grouped by candidate"""
    try:
        resultats = await db.get_resultats(election_id, skip=0, limit=10000)
        
        stats = analytics_service.calculate_candidate_stats(resultats or [])
        
        return {
            'election_id': election_id,
            'candidates': stats,
            'total_candidates': len(stats),
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching candidates statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{election_id}/top-candidates")
async def get_top_candidates(
    election_id: str,
    limit: int = Query(5, ge=1, le=20)
):
    """Get top candidates by votes"""
    try:
        resultats = await db.get_resultats(election_id, skip=0, limit=10000)
        
        top_candidates = analytics_service.get_top_candidates(resultats or [], limit=limit)
        
        return {
            'election_id': election_id,
            'top_candidates': top_candidates,
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching top candidates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{election_id}/real-time")
async def get_real_time_stats(election_id: str):
    """Get real-time statistics"""
    try:
        # Get recent data (last 100 items)
        resultats = await db.get_resultats(election_id, skip=0, limit=100)
        anomalies = await db.get_anomalies(election_id, skip=0, limit=100)
        
        stats = analytics_service.get_real_time_stats(
            resultats or [],
            anomalies or []
        )
        
        return {
            'election_id': election_id,
            **stats
        }
    except Exception as e:
        logger.error(f"Error fetching real-time stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{election_id}/anomaly-rate")
async def get_anomaly_rate(election_id: str):
    """Get anomaly detection rate"""
    try:
        resultats = await db.get_resultats(election_id, skip=0, limit=10000)
        anomalies = await db.get_anomalies(election_id, skip=0, limit=10000)
        
        rate = analytics_service.calculate_anomaly_rate(
            anomalies or [],
            len(resultats or [])
        )
        
        return {
            'election_id': election_id,
            'anomaly_rate': rate,
            'total_samples': len(resultats or []),
            'total_anomalies': len(anomalies or []),
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error calculating anomaly rate: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{election_id}/trends")
async def get_trends(election_id: str):
    """Get electoral trends over time"""
    try:
        resultats = await db.get_resultats(election_id, skip=0, limit=10000)
        
        if not resultats:
            return {
                'election_id': election_id,
                'trends': [],
                'message': 'No data available'
            }
        
        # Sort by created_at
        resultats = sorted(resultats, key=lambda x: x.get('created_at', ''))
        
        # Build trend data
        trends = []
        cumulative_voix = {}
        cumulative_participation = 0
        
        for i, resultat in enumerate(resultats):
            candidat_id = resultat.get('candidat_id')
            if candidat_id not in cumulative_voix:
                cumulative_voix[candidat_id] = 0
            
            cumulative_voix[candidat_id] += resultat.get('voix', 0)
            cumulative_participation += resultat.get('taux_participation', 0)
            
            if i % max(1, len(resultats) // 10) == 0 or i == len(resultats) - 1:  # Sample every 10%
                trends.append({
                    'timestamp': resultat.get('created_at'),
                    'index': i,
                    'candidates_votes': cumulative_voix.copy(),
                    'average_participation': cumulative_participation / (i + 1)
                })
        
        return {
            'election_id': election_id,
            'trends': trends,
            'total_datapoints': len(resultats)
        }
    except Exception as e:
        logger.error(f"Error fetching trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))
