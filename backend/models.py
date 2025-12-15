from pydantic import BaseModel, Field
from datetime import datetime

class LogIn(BaseModel):
    source: str = Field(..., description="Host that sent the log, e.g. ec2-1")
    timestamp: datetime
    message: str

class AlertModel(BaseModel):
    source: str
    timestamp: datetime
    severity: str
    type: str
    description: str
    ip: str | None = None
