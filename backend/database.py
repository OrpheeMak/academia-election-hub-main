"""
Database connection and management
"""

from supabase import create_client, Client
from config import settings
import logging

logger = logging.getLogger(__name__)

# Global Supabase client
_supabase_client: Client = None

def init_supabase() -> Client:
    """Initialize Supabase client"""
    global _supabase_client
    
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")
    
    _supabase_client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
    )
    
    logger.info("✅ Supabase client initialized")
    return _supabase_client

def get_supabase() -> Client:
    """Get Supabase client instance"""
    global _supabase_client
    
    if _supabase_client is None:
        init_supabase()
    
    return _supabase_client

# Database operations
class Database:
    """Database abstraction layer"""
    
    def __init__(self, supabase_client: Client = None):
        self.client = supabase_client or get_supabase()
    
    # Elections
    async def get_elections(self, skip: int = 0, limit: int = 50):
        """Get all elections with pagination"""
        try:
            response = self.client.table("elections").select("*").range(skip, skip + limit - 1).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching elections: {e}")
            raise
    
    async def get_election(self, election_id: str):
        """Get specific election"""
        try:
            response = self.client.table("elections").select("*").eq("id", election_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching election {election_id}: {e}")
            raise
    
    async def create_election(self, election_data: dict):
        """Create new election"""
        try:
            response = self.client.table("elections").insert(election_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating election: {e}")
            raise
    
    # Resultats
    async def get_resultats(self, election_id: str = None, skip: int = 0, limit: int = 50):
        """Get resultats with optional election filter"""
        try:
            query = self.client.table("resultats_partiels").select("*")
            if election_id:
                query = query.eq("election_id", election_id)
            response = query.range(skip, skip + limit - 1).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching resultats: {e}")
            raise
    
    async def insert_resultats(self, resultats: list):
        """Insert multiple resultats"""
        try:
            response = self.client.table("resultats_partiels").insert(resultats).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error inserting resultats: {e}")
            raise
    
    # Anomalies
    async def get_anomalies(self, election_id: str = None, skip: int = 0, limit: int = 50):
        """Get anomalies with optional election filter"""
        try:
            query = self.client.table("anomalies").select("*")
            if election_id:
                query = query.eq("election_id", election_id)
            response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching anomalies: {e}")
            raise
    
    async def insert_anomaly(self, anomaly_data: dict):
        """Insert single anomaly"""
        try:
            response = self.client.table("anomalies").insert([anomaly_data]).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting anomaly: {e}")
            raise
    
    async def insert_anomalies(self, anomalies: list):
        """Insert multiple anomalies"""
        try:
            response = self.client.table("anomalies").insert(anomalies).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error inserting anomalies: {e}")
            raise
    
    # Predictions
    async def get_predictions(self, election_id: str = None, skip: int = 0, limit: int = 50):
        """Get predictions with optional election filter"""
        try:
            query = self.client.table("predictions").select("*")
            if election_id:
                query = query.eq("election_id", election_id)
            response = query.range(skip, skip + limit - 1).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching predictions: {e}")
            raise
    
    async def insert_prediction(self, prediction_data: dict):
        """Insert single prediction"""
        try:
            response = self.client.table("predictions").insert([prediction_data]).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error inserting prediction: {e}")
            raise
    
    async def insert_predictions(self, predictions: list):
        """Insert multiple predictions"""
        try:
            response = self.client.table("predictions").insert(predictions).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error inserting predictions: {e}")
            raise
    
    # Provinces
    async def get_provinces(self):
        """Get all provinces"""
        try:
            response = self.client.table("provinces").select("*").execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching provinces: {e}")
            raise
    
    async def get_province_stats(self, province_id: str):
        """Get statistics for a province"""
        try:
            # Get stats via SQL function if available
            response = self.client.rpc("calculate_iqr_participation", {"p_province_id": province_id}).execute()
            return response.data
        except Exception as e:
            logger.debug(f"Using fallback for province stats: {e}")
            # Fallback: get manually if RPC not available
            return None

# Create database instance
db = Database()
