import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base

import enum


class DocumentCategory(str, enum.Enum):
    LAB = "Lab"
    RADIOLOGI = "Radiologi"
    KONSULTASI = "Konsultasi"
    IDENTITAS = "Identitas"
    RUJUKAN = "Rujukan"
    LAINNYA = "Lainnya"


class StorageBackend(str, enum.Enum):
    SMB = "SMB"
    NFS = "NFS"
    S3 = "S3"
    LOCAL = "LOCAL"


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    category = Column(
        SAEnum(
            DocumentCategory,
            name="document_category",
            create_constraint=True,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    version = Column(Integer, default=1, nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    storage_path = Column(Text, nullable=False)
    storage_backend = Column(
        SAEnum(StorageBackend, name="storage_backend", create_constraint=True),
        default=StorageBackend.LOCAL,
        nullable=False,
    )
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    legal_hold = Column(Boolean, default=False, nullable=False)
    retention_expires_at = Column(DateTime(timezone=True), nullable=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    patient = relationship("Patient", back_populates="documents", lazy="selectin")
    uploader = relationship("User", foreign_keys=[uploaded_by], lazy="selectin")
    parent = relationship("Document", remote_side=[id], lazy="selectin")
