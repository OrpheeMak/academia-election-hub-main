"""
Elections API endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from database import db
from models import Election, ElectionCreate, ElectionUpdate, ElectionStatus
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("", response_model=List[Election])
async def list_elections(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: ElectionStatus = Query(None)
):
    """Get all elections with pagination"""
    try:
        query = db.client.table("elections").select("*")
        
        if status:
            query = query.eq("status", status.value)
        
        response = query.range(skip, skip + limit - 1).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching elections: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{election_id}", response_model=Election)
async def get_election(election_id: str):
    """Get specific election by ID"""
    try:
        response = db.client.table("elections").select("*").eq("id", election_id).single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Election not found")
        return response.data
    except Exception as e:
        logger.error(f"Error fetching election {election_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=Election)
async def create_election(election: ElectionCreate):
    """Create new election"""
    try:
        election_data = {
            "name": election.name,
            "description": election.description,
            "date": election.date.isoformat(),
            "status": election.status.value,
            "total_bureaux": election.total_bureaux,
            "total_registered_voters": election.total_registered_voters
        }
        
        response = db.client.table("elections").insert([election_data]).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create election")
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating election: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{election_id}", response_model=Election)
async def update_election(election_id: str, election: ElectionUpdate):
    """Update election"""
    try:
        update_data = {}
        
        if election.name is not None:
            update_data["name"] = election.name
        if election.description is not None:
            update_data["description"] = election.description
        if election.status is not None:
            update_data["status"] = election.status.value
        if election.total_bureaux is not None:
            update_data["total_bureaux"] = election.total_bureaux
        if election.total_registered_voters is not None:
            update_data["total_registered_voters"] = election.total_registered_voters
        
        response = db.client.table("elections").update(update_data).eq("id", election_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Election not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating election {election_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{election_id}")
async def delete_election(election_id: str):
    """Delete election"""
    try:
        # Get election to verify it exists
        response = db.client.table("elections").select("*").eq("id", election_id).single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Election not found")
        
        # Delete election
        db.client.table("elections").delete().eq("id", election_id).execute()
        
        return {"message": "Election deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting election {election_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{election_id}/stats")
async def get_election_stats(election_id: str):
    """Get election statistics"""
    try:
        from services.analytics import analytics_service
        
        # Fetch data
        resultats = await db.get_resultats(election_id)
        anomalies = await db.get_anomalies(election_id)
        predictions = await db.get_predictions(election_id)
        
        # Calculate stats
        stats = analytics_service.calculate_election_stats(
            election_id,
            resultats or [],
            anomalies or [],
            predictions or []
        )
        
        return stats
    except Exception as e:
        logger.error(f"Error fetching election stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
