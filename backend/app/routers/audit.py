import csv
import io
import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import require_roles
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.models.patient import Patient
from app.schemas.audit import AuditLogList, AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit"])

logger = logging.getLogger("medstore.audit")


def _build_audit_query(
    patient_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
    action: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
):
    stmt = select(AuditLog)
    if patient_id:
        stmt = stmt.where(AuditLog.patient_id == patient_id)
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if date_from:
        stmt = stmt.where(AuditLog.event_time >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.event_time <= date_to)
    return stmt


@router.get("", response_model=AuditLogList)
async def list_audit_logs(
    request: Request,
    patient_id: Optional[uuid.UUID] = Query(None),
    user_id: Optional[uuid.UUID] = Query(None),
    action: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_roles(["AUDITOR", "SUPERADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    try:
        stmt = _build_audit_query(patient_id, user_id, action, date_from, date_to)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Join with User to get email and full_name
        stmt = stmt.outerjoin(User, AuditLog.user_id == User.id).options(
            selectinload(AuditLog.user)
        ).order_by(AuditLog.event_time.desc()).offset((page - 1) * size).limit(size)
        
        result = await db.execute(stmt)
        logs = result.unique().scalars().all()

        # Convert to response with user details
        items = []
        for log in logs:
            item = AuditLogResponse.model_validate(log)
            if log.user:
                item.user_email = log.user.email
                item.user_full_name = log.user.full_name
            items.append(item)

        return AuditLogList(
            items=items,
            total=total,
            page=page,
            size=size,
        )
    except Exception as e:
        logger.exception("Failed to list audit logs")
        raise HTTPException(status_code=500, detail=f"Failed to list audit logs: {e}")


@router.get("/export/csv")
async def export_csv(
    request: Request,
    patient_id: Optional[uuid.UUID] = Query(None),
    user_id: Optional[uuid.UUID] = Query(None),
    action: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    current_user: User = Depends(require_roles(["AUDITOR", "SUPERADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    # Join with User and Patient to get names
    stmt = stmt.outerjoin(User, AuditLog.user_id == User.id).outerjoin(Patient, AuditLog.patient_id == Patient.id).options(
        selectinload(AuditLog.user)
    ).order_by(AuditLog.event_time.desc()).limit(10000)
    result = await db.execute(stmt)
    logs = result.unique().scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Waktu", "Pengguna", "Email Pengguna", "Nama Pasien", "Aksi", "Hasil", "IP Address", "Detail"])

    for log in logs:
        writer.writerow([
            log.id,
            log.event_time.strftime("%Y-%m-%d %H:%M:%S") if log.event_time else "",
            log.user.full_name if log.user else (str(log.user_id) if log.user_id else "-"),
            log.user.email if log.user else "-",
            log.patient.full_name if hasattr(log, 'patient') and log.patient else (str(log.patient_id) if log.patient_id else "-"),
            log.action,
            log.result.value if log.result else "",
            str(log.ip_address) if log.ip_address else "",
            str(log.detail) if log.detail else "",
        ])

    output.seek(0)
    # Add BOM for Excel UTF-8 support
    content = "\ufeff" + output.getvalue()
    return StreamingResponse(
        iter([content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=audit-log-{datetime.now().strftime('%Y%m%d')}.csv"},
    )


@router.get("/export/pdf")
async def export_pdf(
    request: Request,
    patient_id: Optional[uuid.UUID] = Query(None),
    user_id: Optional[uuid.UUID] = Query(None),
    action: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    current_user: User = Depends(require_roles(["AUDITOR", "SUPERADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    stmt = _build_audit_query(patient_id, user_id, action, date_from, date_to)
    stmt = stmt.order_by(AuditLog.event_time.desc()).limit(5000)
    result = await db.execute(stmt)
    logs = result.scalars().all()

    # Build simple text-based PDF
    lines = []
    lines.append("MedStore Audit Log Export")
    lines.append(f"Generated: {datetime.utcnow().isoformat()}")
    lines.append(f"Total records: {len(logs)}")
    lines.append("")
    lines.append("-" * 120)

    for log in logs:
        lines.append(
            f"[{log.event_time.isoformat() if log.event_time else 'N/A'}] "
            f"Action={log.action} Result={log.result.value if log.result else 'N/A'} "
            f"User={log.user_id or 'N/A'} Patient={log.patient_id or 'N/A'} "
            f"IP={log.ip_address or 'N/A'}"
        )
        if log.detail:
            lines.append(f"  Detail: {log.detail}")
        lines.append("")

    # Minimal PDF generation without external libraries
    content = "\n".join(lines)
    pdf_bytes = _generate_minimal_pdf(content)

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=audit_log_export.pdf"},
    )


def _generate_minimal_pdf(text: str) -> bytes:
    """Generate a minimal valid PDF with text content."""
    text_lines = text.split("\n")
    # Escape special PDF characters
    escaped_lines = []
    for line in text_lines:
        line = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        escaped_lines.append(line)

    # Build PDF text operations
    y = 750
    text_ops = []
    page_streams = []
    current_page_ops = []

    for line in escaped_lines:
        if y < 50:
            page_streams.append(current_page_ops)
            current_page_ops = []
            y = 750
        current_page_ops.append(f"BT /F1 9 Tf 50 {y} Td ({line}) Tj ET")
        y -= 12

    if current_page_ops:
        page_streams.append(current_page_ops)

    if not page_streams:
        page_streams = [[""]]

    objects = []
    obj_offsets = []

    # Object 1: Catalog
    objects.append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj")

    # Object 2: Pages (will be updated)
    page_obj_ids = []
    next_obj = 3

    # Object 3: Font
    font_obj_id = next_obj
    objects.append(f"{font_obj_id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj")
    next_obj += 1

    # Create page objects
    for page_ops in page_streams:
        stream_content = "\n".join(page_ops)
        stream_bytes = stream_content.encode("latin-1", errors="replace")

        # Stream object
        stream_obj_id = next_obj
        objects.append(
            f"{stream_obj_id} 0 obj\n<< /Length {len(stream_bytes)} >>\nstream\n"
            + stream_content
            + "\nendstream\nendobj"
        )
        next_obj += 1

        # Page object
        page_obj_id = next_obj
        page_obj_ids.append(page_obj_id)
        objects.append(
            f"{page_obj_id} 0 obj\n"
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Contents {stream_obj_id} 0 R "
            f"/Resources << /Font << /F1 {font_obj_id} 0 R >> >> >>\n"
            f"endobj"
        )
        next_obj += 1

    # Now build object 2 (Pages)
    kids = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
    pages_obj = f"2 0 obj\n<< /Type /Pages /Kids [{kids}] /Count {len(page_obj_ids)} >>\nendobj"

    # Assemble PDF
    pdf_lines = ["%PDF-1.4"]
    all_objects = [objects[0], pages_obj, objects[1]] + objects[2:]

    offsets = {}
    current_offset = len(pdf_lines[0]) + 1  # +1 for newline

    assembled = ["%PDF-1.4"]
    for obj_str in all_objects:
        # Extract object number
        obj_num = int(obj_str.split(" ")[0])
        offsets[obj_num] = current_offset
        assembled.append(obj_str)
        current_offset += len(obj_str) + 1

    xref_offset = current_offset
    max_obj = max(offsets.keys())

    xref_lines = [f"xref\n0 {max_obj + 1}"]
    xref_lines.append("0000000000 65535 f ")
    for i in range(1, max_obj + 1):
        off = offsets.get(i, 0)
        xref_lines.append(f"{off:010d} 00000 n ")

    xref_str = "\n".join(xref_lines)
    trailer = (
        f"trailer\n<< /Size {max_obj + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF"
    )

    assembled.append(xref_str)
    assembled.append(trailer)

    return "\n".join(assembled).encode("latin-1", errors="replace")
