"""
Election Results API endpoints
"""

from fastapi import APIRouter, HTTPException, Query, Body
from database import db
from models import Resultat, ResultatCreate, ProcessResultsRequest, ProcessResultsResponse
from services.predictions import prediction_service
from services.anomalies import anomaly_service
from typing import List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("", response_model=List[Resultat])
async def list_resultats(
    election_id: str = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    province_id: str = Query(None),
    bureau_id: str = Query(None)
):
    """Get results with filters"""
    try:
        query = db.client.table("resultats_partiels").select("*").eq("election_id", election_id)
        
        if province_id:
            query = query.eq("province_id", province_id)
        
        if bureau_id:
            query = query.eq("bureau_id", bureau_id)
        
        response = query.range(skip, skip + limit - 1).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching resultats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process", response_model=ProcessResultsResponse)
async def process_results(request: ProcessResultsRequest = Body(...)):
    """Process election results and trigger anomaly detection and predictions"""
    try:
        logger.info(f"Processing {len(request.results)} results for election {request.election_id}")
        
        # Convert request models to dicts
        resultats = []
        for result in request.results:
            resultat_dict = result.model_dump()
            resultat_dict["created_at"] = datetime.utcnow().isoformat()
            resultats.append(resultat_dict)
        
        # Insert resultats
        inserted_resultats = await db.insert_resultats(resultats)
        logger.info(f"✅ Inserted {len(inserted_resultats)} resultats")
        
        anomalies_detected = 0
        predictions_created = 0
        
        # Detect anomalies if requested
        if request.auto_detect_anomalies:
            logger.info("🔍 Detecting anomalies...")
            anomalies = anomaly_service.detect_all_anomalies([
                {
                    'bureau_id': r.get('bureau_id'),
                    'province_id': r.get('province_id'),
                    'taux_participation': r.get('taux_participation'),
                    'voix': r.get('voix'),
                    'registered_voters': r.get('registered_voters')
                }
                for r in inserted_resultats
            ])
            
            if anomalies:
                anomalies_data = [
                    {
                        'election_id': request.election_id,
                        'bureau_id': a.get('bureau_id'),
                        'province_id': a.get('province_id'),
                        'type': a.get('type'),
                        'severity': a.get('severity'),
                        'description': a.get('description'),
                        'score': a.get('score'),
                        'details': a.get('details'),
                        'created_at': datetime.utcnow().isoformat()
                    }
                    for a in anomalies
                ]
                
                await db.insert_anomalies(anomalies_data)
                anomalies_detected = len(anomalies_data)
                logger.info(f"✅ Detected {anomalies_detected} anomalies")
        
        # Predict if requested
        if request.auto_predict:
            logger.info("🔮 Generating predictions...")
            
            # Group results by candidat
            by_candidat = {}
            for r in inserted_resultats:
                candidat_id = r.get('candidat_id')
                if candidat_id not in by_candidat:
                    by_candidat[candidat_id] = []
                by_candidat[candidat_id].append(r)
            
            predictions = []
            for candidat_id, candidat_results in by_candidat.items():
                # Get current participation
                avg_participation = sum(r.get('taux_participation', 0) for r in candidat_results) / len(candidat_results)
                
                # Predict
                prediction = prediction_service.predict_final_score(candidat_results, avg_participation)
                
                if prediction:
                    predictions.append({
                        'election_id': request.election_id,
                        'candidat_id': candidat_id,
                        'voix_predites': prediction['prediction'],
                        'pourcentage_predit': (prediction['prediction'] / 100) * 100,  # Adjust based on actual calculation
                        'intervalle_bas': prediction['interval_low'],
                        'intervalle_haut': prediction['interval_high'],
                        'confidence': prediction['confidence'],
                        'method': prediction['method'],
                        'created_at': datetime.utcnow().isoformat()
                    })
            
            if predictions:
                await db.insert_predictions(predictions)
                predictions_created = len(predictions)
                logger.info(f"✅ Created {predictions_created} predictions")
        
        return ProcessResultsResponse(
            success=True,
            results_inserted=len(inserted_resultats),
            anomalies_detected=anomalies_detected,
            predictions_created=predictions_created,
            message=f"Processed {len(inserted_resultats)} results successfully"
        )
    
    except Exception as e:
        logger.error(f"Error processing results: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=Resultat)
async def create_resultat(resultat: ResultatCreate):
    """Create single result"""
    try:
        resultat_data = resultat.model_dump()
        resultat_data["created_at"] = datetime.utcnow().isoformat()
        
        response = db.client.table("resultats_partiels").insert([resultat_data]).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create resultat")
        
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating resultat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{resultat_id}", response_model=Resultat)
async def get_resultat(resultat_id: str):
    """Get specific result"""
    try:
        response = db.client.table("resultats_partiels").select("*").eq("id", resultat_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Resultat not found")
        
        return response.data
    except Exception as e:
        logger.error(f"Error fetching resultat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{election_id}/by-province")
async def get_resultats_by_province(election_id: str):
    """Get results grouped by province"""
    try:
        from services.analytics import analytics_service
        
        resultats = await db.get_resultats(election_id, skip=0, limit=1000)
        anomalies = await db.get_anomalies(election_id, skip=0, limit=1000)
        predictions = await db.get_predictions(election_id, skip=0, limit=1000)
        
        stats = analytics_service.calculate_province_stats(
            resultats or [],
            anomalies or [],
            predictions or []
        )
        
        return stats
    except Exception as e:
        logger.error(f"Error fetching resultats by province: {e}")
        raise HTTPException(status_code=500, detail=str(e))
