"""
Predictions API endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from database import db
from models import Prediction, PredictElectionResultsRequest, PredictElectionResultsResponse
from services.predictions import prediction_service
from typing import List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("", response_model=List[Prediction])
async def list_predictions(
    election_id: str = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    candidat_id: str = Query(None),
    province_id: str = Query(None)
):
    """Get predictions with filters"""
    try:
        query = db.client.table("predictions").select("*").eq("election_id", election_id)
        
        if candidat_id:
            query = query.eq("candidat_id", candidat_id)
        
        if province_id:
            query = query.eq("province_id", province_id)
        
        response = query.range(skip, skip + limit - 1).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching predictions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict", response_model=PredictElectionResultsResponse)
async def predict_election_results(request: PredictElectionResultsRequest):
    """Generate predictions for election results"""
    try:
        logger.info(f"Generating predictions for election {request.election_id}")
        
        # Fetch resultats
        query = db.client.table("resultats_partiels").select("*").eq("election_id", request.election_id)
        
        if request.province_id:
            query = query.eq("province_id", request.province_id)
        
        response = query.execute()
        resultats = response.data or []
        
        if not resultats:
            logger.warning("No resultats found for prediction")
            return PredictElectionResultsResponse(
                success=True,
                predictions_count=0,
                predictions=[],
                timestamp=datetime.utcnow()
            )
        
        # Group by candidat
        by_candidat = {}
        for r in resultats:
            candidat_id = r.get('candidat_id')
            if not candidat_id:
                continue
            
            if candidat_id not in by_candidat:
                by_candidat[candidat_id] = []
            by_candidat[candidat_id].append(r)
        
        # Generate predictions
        predictions_data = []
        for candidat_id, candidat_results in by_candidat.items():
            if request.candidat_id and candidat_id != request.candidat_id:
                continue
            
            # Get current participation
            avg_participation = sum(r.get('taux_participation', 0) for r in candidat_results) / len(candidat_results)
            
            # Predict
            prediction = prediction_service.predict_final_score(candidat_results, avg_participation)
            
            if prediction:
                predictions_data.append({
                    'election_id': request.election_id,
                    'province_id': request.province_id,
                    'candidat_id': candidat_id,
                    'voix_predites': prediction['prediction'],
                    'pourcentage_predit': (prediction['prediction'] / max([c.get('voix', 0) for c in candidat_results], 1)) * 100 if candidat_results else 0,
                    'intervalle_bas': prediction['interval_low'],
                    'intervalle_haut': prediction['interval_high'],
                    'confidence': prediction['confidence'],
                    'method': prediction['method'],
                    'created_at': datetime.utcnow().isoformat()
                })
        
        # Insert predictions
        if predictions_data:
            await db.insert_predictions(predictions_data)
        
        logger.info(f"✅ Created {len(predictions_data)} predictions")
        
        return PredictElectionResultsResponse(
            success=True,
            predictions_count=len(predictions_data),
            predictions=predictions_data,
            timestamp=datetime.utcnow()
        )
    
    except Exception as e:
        logger.error(f"Error generating predictions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{prediction_id}", response_model=Prediction)
async def get_prediction(prediction_id: str):
    """Get specific prediction"""
    try:
        response = db.client.table("predictions").select("*").eq("id", prediction_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Prediction not found")
        
        return response.data
    except Exception as e:
        logger.error(f"Error fetching prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{election_id}/quality")
async def get_prediction_quality(election_id: str):
    """Calculate overall prediction quality"""
    try:
        response = db.client.table("predictions").select("*").eq("election_id", election_id).execute()
        predictions = response.data or []
        
        if not predictions:
            return {
                'election_id': election_id,
                'quality_score': 0,
                'total_predictions': 0,
                'average_confidence': 0
            }
        
        quality_score = prediction_service.evaluate_prediction_quality(predictions)
        
        confidences = [p.get('confidence', 0) for p in predictions]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        return {
            'election_id': election_id,
            'quality_score': quality_score,
            'total_predictions': len(predictions),
            'average_confidence': avg_confidence * 100,
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error calculating prediction quality: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{election_id}/by-candidate")
async def get_predictions_by_candidate(election_id: str):
    """Get predictions grouped by candidate"""
    try:
        response = db.client.table("predictions").select("*").eq("election_id", election_id).execute()
        predictions = response.data or []
        
        by_candidate = {}
        for p in predictions:
            candidat_id = p.get('candidat_id')
            if candidat_id not in by_candidate:
                by_candidate[candidat_id] = []
            by_candidate[candidat_id].append(p)
        
        return {
            'election_id': election_id,
            'by_candidate': by_candidate,
            'total_candidates': len(by_candidate),
            'total_predictions': len(predictions)
        }
    except Exception as e:
        logger.error(f"Error fetching predictions by candidate: {e}")
        raise HTTPException(status_code=500, detail=str(e))
