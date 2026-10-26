import uuid
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog, AuditResult


async def log_event(
    db: AsyncSession,
    *,
    user_id: Optional[uuid.UUID] = None,
    patient_id: Optional[uuid.UUID] = None,
    document_id: Optional[uuid.UUID] = None,
    action: str,
    result: AuditResult = AuditResult.SUCCESS,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    detail: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        patient_id=patient_id,
        document_id=document_id,
        action=action,
        result=result,
        ip_address=ip_address or "127.0.0.1",
        user_agent=user_agent,
        detail=detail,
    )
    db.add(entry)
    await db.flush()
    return entry
