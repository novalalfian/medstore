import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class AuditLogResponse(BaseModel):
    id: int
    event_time: datetime
    user_id: Optional[uuid.UUID] = None
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None
    patient_id: Optional[uuid.UUID] = None
    patient_name: Optional[str] = None
    document_id: Optional[uuid.UUID] = None
    document_title: Optional[str] = None
    action: str
    result: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    detail: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}

    @field_validator('ip_address', mode='before')
    @classmethod
    def convert_ip(cls, v):
        if v is not None:
            return str(v)
        return v


class AuditLogFilter(BaseModel):
    patient_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    action: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


class AuditLogExport(BaseModel):
    items: List[AuditLogResponse]
    total: int


class AuditLogList(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    size: int
