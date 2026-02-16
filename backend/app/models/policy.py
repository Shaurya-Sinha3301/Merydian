from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship

class POIRequest(SQLModel, table=True):
    __tablename__ = "poi_requests"
    
    request_id: str = Field(primary_key=True)
    origin_family: str
    location_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="processed")

class FamilyResponseMessage(SQLModel, table=True):
    __tablename__ = "family_responses"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    request_id: str = Field(foreign_key="poi_requests.request_id")
    family_id: str
    response: str
    confidence: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class DecisionLog(SQLModel, table=True):
    __tablename__ = "decision_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    request_id: str = Field(foreign_key="poi_requests.request_id")
    decision: str
    trigger_score: float
    threshold: float
    optimizer_called: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)
