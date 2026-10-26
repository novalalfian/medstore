import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models.audit import AuditResult
from app.models.document import Document
from app.models.patient import Patient
from app.models.user import User
from app.schemas.patient import (
    PatientCreate,
    PatientList,
    PatientResponse,
    PatientUpdate,
)

router = APIRouter(prefix="/patients", tags=["Patients"])


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


@router.get("", response_model=PatientList)
async def list_patients(
    request: Request,
    q: Optional[str] = Query(None, min_length=1, description="Cari No. RM atau nama"),
    gender: Optional[str] = Query(None, description="Filter jenis kelamin: M, F, O"),
    status: Optional[str] = Query(None, description="Filter status: active, inactive"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    include_inactive: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Patient)
    count_stmt = select(func.count(Patient.id))

    if status == 'active':
        stmt = stmt.where(Patient.is_active == True)
        count_stmt = count_stmt.where(Patient.is_active == True)
    elif status == 'inactive':
        stmt = stmt.where(Patient.is_active == False)
        count_stmt = count_stmt.where(Patient.is_active == False)
    elif not include_inactive:
        stmt = stmt.where(Patient.is_active == True)
        count_stmt = count_stmt.where(Patient.is_active == True)

    if gender:
        stmt = stmt.where(Patient.gender == gender)
        count_stmt = count_stmt.where(Patient.gender == gender)

    if q:
        search_filter = or_(
            Patient.medical_record_no.ilike(f"%{q}%"),
            Patient.full_name.ilike(f"%{q}%"),
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)

    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    stmt = stmt.order_by(Patient.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    items = result.scalars().all()

    return PatientList(
        items=[PatientResponse.model_validate(p) for p in items],
        total=total,
        page=page,
        size=page_size,
    )


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    payload: PatientCreate,
    request: Request,
    current_user: User = Depends(require_roles(["SUPERADMIN", "ADMIN_PENDAFTARAN"])),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    ua = request.headers.get("User-Agent")

    existing = await db.execute(select(Patient).where(Patient.medical_record_no == payload.medical_record_no))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Nomor Rekam Medis '{payload.medical_record_no}' sudah terdaftar",
        )

    patient = Patient(
        medical_record_no=payload.medical_record_no,
        full_name=payload.full_name,
        birth_date=payload.birth_date,
        gender=payload.gender,
        created_by=current_user.id,
    )
    db.add(patient)
    await db.flush()

    await log_event(
        db,
        user_id=current_user.id,
        patient_id=patient.id,
        action="PATIENT_CREATED",
        result=AuditResult.SUCCESS,
        ip_address=ip,
        user_agent=ua,
        detail={"medical_record_no": patient.medical_record_no, "name": patient.full_name},
    )

    return PatientResponse.model_validate(patient)


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    ua = request.headers.get("User-Agent")

    stmt = select(Patient).where(Patient.id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pasien tidak ditemukan")

    await log_event(
        db,
        user_id=current_user.id,
        patient_id=patient.id,
        action="PATIENT_VIEWED",
        result=AuditResult.SUCCESS,
        ip_address=ip,
        user_agent=ua,
    )

    return PatientResponse.model_validate(patient)


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: uuid.UUID,
    payload: PatientUpdate,
    request: Request,
    current_user: User = Depends(require_roles(["SUPERADMIN", "ADMIN_PENDAFTARAN"])),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    ua = request.headers.get("User-Agent")

    stmt = select(Patient).where(Patient.id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pasien tidak ditemukan")

    if payload.full_name is not None:
        patient.full_name = payload.full_name
    if payload.birth_date is not None:
        patient.birth_date = payload.birth_date
    if payload.gender is not None:
        patient.gender = payload.gender
    if payload.is_active is not None:
        patient.is_active = payload.is_active

    await db.flush()

    await log_event(
        db,
        user_id=current_user.id,
        patient_id=patient.id,
        action="PATIENT_UPDATED",
        result=AuditResult.SUCCESS,
        ip_address=ip,
        user_agent=ua,
    )

    return PatientResponse.model_validate(patient)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(
    patient_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(["SUPERADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    ua = request.headers.get("User-Agent")

    stmt = select(Patient).where(Patient.id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pasien tidak ditemukan")

    patient.is_active = False
    await db.flush()

    await log_event(
        db,
        user_id=current_user.id,
        patient_id=patient.id,
        action="PATIENT_DEACTIVATED",
        result=AuditResult.SUCCESS,
        ip_address=ip,
        user_agent=ua,
    )


# ── Patient Timeline ───────────────────────────────────────────────────


class TimelineEvent(BaseModel):
    id: uuid.UUID
    type: str  # 'document_upload', 'document_version', 'patient_created', 'patient_updated'
    timestamp: datetime
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    document_id: Optional[uuid.UUID] = None
    document_title: Optional[str] = None
    version: Optional[int] = None
    user_name: Optional[str] = None

    model_config = {"from_attributes": True}


class PatientTimelineResponse(BaseModel):
    patient_id: uuid.UUID
    patient_name: str
    patient_mrn: str
    events: List[TimelineEvent]
    total_documents: int
    categories: List[str]


@router.get("/{patient_id}/timeline", response_model=PatientTimelineResponse)
async def get_patient_timeline(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get chronological timeline of all documents and events for a patient."""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Verify patient exists
        patient_stmt = select(Patient).where(Patient.id == patient_id)
        patient_result = await db.execute(patient_stmt)
        patient = patient_result.scalar_one_or_none()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pasien tidak ditemukan")

        # Get all documents for patient
        docs_stmt = (
            select(Document)
            .where(Document.patient_id == patient_id)
            .where(Document.is_deleted == False)
            .order_by(Document.created_at.asc())
        )
        docs_result = await db.execute(docs_stmt)
        documents = docs_result.scalars().all()

        # Get categories
        categories = list(set(doc.category.value if hasattr(doc.category, 'value') else str(doc.category) for doc in documents))

        # Build timeline events
        events = []
        for doc in documents:
            cat = doc.category.value if hasattr(doc.category, 'value') else str(doc.category)
            events.append(TimelineEvent(
                id=doc.id,
                type="document_upload",
                timestamp=doc.created_at,
                title=f"Dokumen diunggah: {doc.title}",
                description=f"Kategori: {cat}, Versi: {doc.version}, Ukuran: {doc.file_size_bytes} bytes",
                category=cat,
                document_id=doc.id,
                document_title=doc.title,
                version=doc.version,
                user_name="Staf Medis",  # TODO: join with user table
            ))

        # Add patient creation event
        events.insert(0, TimelineEvent(
            id=uuid.uuid4(),
            type="patient_created",
            timestamp=patient.created_at,
            title="Pasien didaftarkan",
            description=f"Nomor RM: {patient.medical_record_no}",
            user_name="Admin",
        ))

        return PatientTimelineResponse(
            patient_id=patient.id,
            patient_name=patient.full_name,
            patient_mrn=patient.medical_record_no,
            events=events,
            total_documents=len(documents),
            categories=categories,
        )
    except Exception as e:
        logger.error(f"Patient timeline error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Patient timeline error: {str(e)}")
