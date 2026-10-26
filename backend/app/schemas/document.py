import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class DocumentUpload(BaseModel):
    title: str = Field(..., max_length=500)
    category: str
    patient_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None


class BatchUploadRequest(BaseModel):
    patient_id: uuid.UUID
    category: str
    file_count: int


class DocumentResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    title: str
    category: str
    version: int
    parent_id: Optional[uuid.UUID] = None
    storage_path: str
    storage_backend: str
    file_size_bytes: int
    mime_type: str
    sha256_hash: str
    is_deleted: bool
    deleted_at: Optional[datetime] = None
    legal_hold: bool
    retention_expires_at: Optional[datetime] = None
    uploaded_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("category", "storage_backend", mode="before")
    @classmethod
    def enum_to_value(cls, v):
        return getattr(v, "value", v)


class DocumentList(BaseModel):
    items: List[DocumentResponse]
    total: int
    page: int
    size: int


class BatchUploadResponse(BaseModel):
    uploaded: List[DocumentResponse]
    failed: List[dict]
