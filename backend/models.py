"""
Pydantic models for request/response validation
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum

# Enums
class ElectionStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class AnomalySeverity(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class UserRole(str, Enum):
    ADMIN = "admin"
    MODERATOR = "moderator"
    OBSERVER = "observer"
    USER = "user"

class AnomalyType(str, Enum):
    ZSCORE = "zscore"
    IQR = "iqr"
    PARTICIPATION_RATE = "participation_rate"
    TOTAL_VOTES = "total_votes"
    MOVING_AVERAGE = "moving_average"
    BUSINESS_RULE = "business_rule"

# Base models
class ElectionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    date: datetime
    status: ElectionStatus = ElectionStatus.SCHEDULED
    total_bureaux: int = Field(..., gt=0)
    total_registered_voters: int = Field(..., gt=0)

class ElectionCreate(ElectionBase):
    pass

class ElectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ElectionStatus] = None
    total_bureaux: Optional[int] = None
    total_registered_voters: Optional[int] = None

class Election(ElectionBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Results/Resultats
class ResultatBase(BaseModel):
    election_id: str
    bureau_id: str
    province_id: str
    circonscription_id: str
    candidat_id: str
    voix: int = Field(..., ge=0)
    registered_voters: int = Field(..., ge=0)
    pourcentage: float = Field(..., ge=0, le=100)
    taux_participation: float = Field(..., ge=0, le=100)

class ResultatCreate(ResultatBase):
    pass

class Resultat(ResultatBase):
    id: str
    is_anomalie: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Anomalies
class AnomalyBase(BaseModel):
    election_id: str
    bureau_id: Optional[str] = None
    province_id: Optional[str] = None
    type: AnomalyType
    severity: AnomalySeverity
    description: str
    score: float = Field(..., ge=0, le=100)
    details: Optional[dict] = None

class AnomalyCreate(AnomalyBase):
    pass

class Anomaly(AnomalyBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Predictions
class PredictionBase(BaseModel):
    election_id: str
    province_id: Optional[str] = None
    candidat_id: str
    voix_predites: float = Field(..., ge=0)
    pourcentage_predit: float = Field(..., ge=0, le=100)
    intervalle_bas: float = Field(..., ge=0)
    intervalle_haut: float = Field(..., ge=0)
    confidence: float = Field(..., ge=0, le=1)
    method: str

class PredictionCreate(PredictionBase):
    pass

class Prediction(PredictionBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Statistics/Analytics
class StatistiqueProvince(BaseModel):
    province_id: str
    province_name: str
    total_bureaux: int
    total_voix: int
    taux_participation_moyen: float
    anomalies_count: int
    anomalies_critique: int
    predictions_count: int
    
    class Config:
        from_attributes = True

class StatsElection(BaseModel):
    election_id: str
    total_resultats: int
    total_anomalies: int
    anomalies_by_severity: dict
    total_predictions: int
    prediction_quality: float
    taux_participation_moyen: float
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Users
class UserBase(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    role: UserRole
    created_at: datetime
    
    class Config:
        from_attributes = True

# Request models
class ProcessResultsRequest(BaseModel):
    election_id: str
    results: List[ResultatCreate]
    auto_detect_anomalies: bool = True
    auto_predict: bool = True

class DetectAnomaliesRequest(BaseModel):
    election_id: str
    province_id: Optional[str] = None
    method: str = "all"  # 'all', 'zscore', 'iqr', 'business_rule'

class PredictElectionResultsRequest(BaseModel):
    election_id: str
    province_id: Optional[str] = None
    candidat_id: Optional[str] = None

# Response models
class ProcessResultsResponse(BaseModel):
    success: bool
    results_inserted: int
    anomalies_detected: int
    predictions_created: int
    message: str

class DetectAnomaliesResponse(BaseModel):
    success: bool
    anomalies_count: int
    anomalies: List[Anomaly]
    timestamp: datetime

class PredictElectionResultsResponse(BaseModel):
    success: bool
    predictions_count: int
    predictions: List[Prediction]
    timestamp: datetime

# Pagination
class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=100)
    
    @property
    def skip(self) -> int:
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        return self.page_size
