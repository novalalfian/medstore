import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class PatientCreate(BaseModel):
    medical_record_no: str = Field(..., max_length=50)
    full_name: str = Field(..., max_length=255)
    birth_date: date
    gender: str = Field(..., pattern=r"^[MFO]$")


class PatientUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    birth_date: Optional[date] = None
    gender: Optional[str] = Field(None, pattern=r"^[MFO]$")
    is_active: Optional[bool] = None


class PatientResponse(BaseModel):
    id: uuid.UUID
    medical_record_no: str
    full_name: str
    birth_date: date
    gender: str
    is_active: bool
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PatientList(BaseModel):
    items: List[PatientResponse]
    total: int
    page: int
    size: int
