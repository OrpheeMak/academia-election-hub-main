"""
Anomalies API endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from database import db
from models import Anomaly, DetectAnomaliesRequest, DetectAnomaliesResponse, AnomalySeverity
from services.anomalies import anomaly_service
from typing import List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("", response_model=List[Anomaly])
async def list_anomalies(
    election_id: str = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    severity: AnomalySeverity = Query(None),
    province_id: str = Query(None),
    anomaly_type: str = Query(None)
):
    """Get anomalies with filters"""
    try:
        query = db.client.table("anomalies").select("*").eq("election_id", election_id)
        
        if severity:
            query = query.eq("severity", severity.value)
        
        if province_id:
            query = query.eq("province_id", province_id)
        
        if anomaly_type:
            query = query.eq("type", anomaly_type)
        
        response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching anomalies: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detect", response_model=DetectAnomaliesResponse)
async def detect_anomalies(request: DetectAnomaliesRequest):
    """Detect anomalies in election results"""
    try:
        logger.info(f"Detecting anomalies for election {request.election_id}, method: {request.method}")
        
        # Fetch resultats
        query = db.client.table("resultats_partiels").select("*").eq("election_id", request.election_id)
        
        if request.province_id:
            query = query.eq("province_id", request.province_id)
        
        response = query.execute()
        resultats = response.data or []
        
        # Convert to sample format
        samples = [
            {
                'bureau_id': r.get('bureau_id'),
                'province_id': r.get('province_id'),
                'taux_participation': r.get('taux_participation'),
                'voix': r.get('voix'),
                'registered_voters': r.get('registered_voters')
            }
            for r in resultats
        ]
        
        # Detect anomalies based on method
        detected_anomalies = []
        if request.method == 'all':
            detected_anomalies = anomaly_service.detect_all_anomalies(samples)
        elif request.method == 'zscore':
            detected_anomalies = anomaly_service.detect_zscore_anomalies(samples)
        elif request.method == 'iqr':
            detected_anomalies = anomaly_service.detect_iqr_anomalies(samples)
        elif request.method == 'business_rule':
            # Business rule checks only
            for sample in samples:
                anomaly = anomaly_service.check_participation_rate(sample.get('taux_participation', 0))
                if anomaly:
                    detected_anomalies.append({**anomaly, **sample})
                
                anomaly = anomaly_service.check_total_votes(
                    sample.get('voix', 0),
                    sample.get('registered_voters', 0)
                )
                if anomaly:
                    detected_anomalies.append({**anomaly, **sample})
        
        # Insert anomalies
        anomalies_data = []
        for anomaly in detected_anomalies:
            anomalies_data.append({
                'election_id': request.election_id,
                'bureau_id': anomaly.get('bureau_id'),
                'province_id': anomaly.get('province_id'),
                'type': anomaly.get('type'),
                'severity': anomaly.get('severity'),
                'description': anomaly.get('description'),
                'score': anomaly.get('score', 0),
                'details': anomaly.get('details'),
                'created_at': datetime.utcnow().isoformat()
            })
        
        if anomalies_data:
            await db.insert_anomalies(anomalies_data)
        
        logger.info(f"✅ Detected {len(anomalies_data)} anomalies")
        
        return DetectAnomaliesResponse(
            success=True,
            anomalies_count=len(anomalies_data),
            anomalies=anomalies_data,
            timestamp=datetime.utcnow()
        )
    
    except Exception as e:
        logger.error(f"Error detecting anomalies: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{anomaly_id}", response_model=Anomaly)
async def get_anomaly(anomaly_id: str):
    """Get specific anomaly"""
    try:
        response = db.client.table("anomalies").select("*").eq("id", anomaly_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Anomaly not found")
        
        return response.data
    except Exception as e:
        logger.error(f"Error fetching anomaly: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{election_id}/severity-distribution")
async def get_severity_distribution(election_id: str):
    """Get anomaly severity distribution"""
    try:
        response = db.client.table("anomalies").select("severity, count()").eq("election_id", election_id).execute()
        
        distribution = {}
        for row in response.data or []:
            distribution[row.get('severity')] = row.get('count', 0)
        
        return {
            'election_id': election_id,
            'distribution': distribution,
            'total': sum(distribution.values())
        }
    except Exception as e:
        logger.error(f"Error fetching severity distribution: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{election_id}/by-type")
async def get_anomalies_by_type(election_id: str):
    """Get anomalies grouped by type"""
    try:
        response = db.client.table("anomalies").select("type, count()").eq("election_id", election_id).execute()
        
        by_type = {}
        for row in response.data or []:
            by_type[row.get('type')] = row.get('count', 0)
        
        return {
            'election_id': election_id,
            'by_type': by_type,
            'total': sum(by_type.values())
        }
    except Exception as e:
        logger.error(f"Error fetching anomalies by type: {e}")
        raise HTTPException(status_code=500, detail=str(e))
