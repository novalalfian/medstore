import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, String, Enum
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship

from app.database import Base

# Gender enum matching database
gender_enum = ENUM('M', 'F', 'O', name='gender_type', create_type=False)


class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medical_record_no = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False, index=True)
    birth_date = Column(Date, nullable=False)
    gender = Column(gender_enum, nullable=False)  # M / F / O
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    creator = relationship("User", foreign_keys=[created_by], lazy="selectin")
    documents = relationship("Document", back_populates="patient", lazy="selectin")
