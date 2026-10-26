import enum
from datetime import datetime, timezone

from sqlalchemy import BigInteger, Column, DateTime, Enum as SAEnum, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.orm import relationship

from app.database import Base


class AuditResult(str, enum.Enum):
    SUCCESS = "SUCCESS"
    FAIL = "FAIL"
    DENIED = "DENIED"


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    event_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    result = Column(SAEnum(AuditResult, name="audit_result", create_constraint=True), nullable=False)
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    detail = Column(JSON, nullable=True)

    user = relationship("User", foreign_keys=[user_id], lazy="selectin")
