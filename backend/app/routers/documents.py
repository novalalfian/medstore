import posixpath
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_event
from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models.audit import AuditResult
from app.models.document import Document, DocumentCategory, StorageBackend
from app.models.patient import Patient
from app.models.retention import RetentionPolicy
from app.models.user import User
from app.schemas.document import DocumentList, DocumentResponse, BatchUploadRequest, BatchUploadResponse
from app.services.storage import iter_storage_file, save_upload_file
from app.utils.file_handler import validate_file

router = APIRouter(prefix="/documents", tags=["Documents"])


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _content_disposition(disposition: str, filename: str) -> str:
    safe = (filename or "document").replace('"', "").replace("\r", "").replace("\n", "")
    ascii_fallback = safe.encode("ascii", "ignore").decode() or "document"
    return (
        f'{disposition}; filename="{ascii_fallback}"; '
        f"filename*=UTF-8''{quote(safe)}"
    )


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    title: str = Form(...),
    category: str = Form(...),
    patient_id: uuid.UUID = Form(...),
    parent_id: Optional[uuid.UUID] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(
        require_roles(["SUPERADMIN", "DOKTER", "ADMIN_PENDAFTARAN", "LAB", "RADIOGRAFER"])
    ),
    db: AsyncSession = Depends(get_db),
):
    # Validate category
    try:
        cat = DocumentCategory(category)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category '{category}'. Valid: {[c.value for c in DocumentCategory]}",
        )

    # Validate patient exists
    stmt = select(Patient).where(Patient.id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    # Validate file
    await validate_file(file)

    # Determine version
    version = 1
    if parent_id:
        parent_stmt = select(Document).where(Document.id == parent_id)
        parent_result = await db.execute(parent_stmt)
        parent_doc = parent_result.scalar_one_or_none()
        if parent_doc is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent document not found")
        # Get max version among siblings
        max_version_stmt = select(func.max(Document.version)).where(
            Document.parent_id == parent_id
        )
        max_result = await db.execute(max_version_stmt)
        max_ver = max_result.scalar() or parent_doc.version
        version = max_ver + 1
    else:
        # Auto-versioning: same patient + same title becomes a new version
        existing_stmt = (
            select(Document)
            .where(
                Document.patient_id == patient_id,
                Document.title == title,
                Document.is_deleted == False,
            )
            .order_by(Document.version.desc())
            .limit(1)
        )
        existing_result = await db.execute(existing_stmt)
        existing_doc = existing_result.scalar_one_or_none()
        if existing_doc is not None:
            parent_id = existing_doc.parent_id or existing_doc.id
            max_version_stmt = select(func.max(Document.version)).where(
                (Document.id == parent_id) | (Document.parent_id == parent_id)
            )
            max_result = await db.execute(max_version_stmt)
            version = (max_result.scalar() or existing_doc.version) + 1

    # Save file to configured backend (local disk or TrueNAS SMB share)
    stored = await save_upload_file(file, patient.medical_record_no)

    # Retention expiry from category policy (only flagged, never auto-deleted)
    retention_expires_at = None
    policy_result = await db.execute(
        select(RetentionPolicy).where(RetentionPolicy.category == cat.value)
    )
    policy = policy_result.scalar_one_or_none()
    if policy:
        retention_expires_at = datetime.now(timezone.utc) + timedelta(days=365 * policy.retention_years)

    doc = Document(
        patient_id=patient_id,
        title=title,
        category=cat,
        version=version,
        parent_id=parent_id,
        storage_path=stored.relative_path,
        storage_backend=StorageBackend(stored.backend),
        file_size_bytes=stored.size_bytes,
        mime_type=file.content_type or "application/octet-stream",
        sha256_hash=stored.sha256,
        uploaded_by=current_user.id,
        retention_expires_at=retention_expires_at,
    )
    db.add(doc)
    await db.flush()

    await log_event(
        db, user_id=current_user.id, patient_id=patient_id, document_id=doc.id,
        action="DOCUMENT_UPLOAD", result=AuditResult.SUCCESS,
        ip_address=_client_ip(request), user_agent=request.headers.get("User-Agent", ""),
        detail={"title": title, "category": category, "file_size": stored.size_bytes},
    )

    return DocumentResponse.model_validate(doc)


@router.get("/patient/{patient_id}", response_model=DocumentList)
async def list_patient_documents(
    patient_id: uuid.UUID,
    request: Request,
    category: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document).where(
        Document.patient_id == patient_id,
        Document.is_deleted == False,
    )

    if category:
        try:
            cat = DocumentCategory(category)
            stmt = stmt.where(Document.category == cat)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid category '{category}'")

    if date_from:
        stmt = stmt.where(Document.created_at >= date_from)
    if date_to:
        stmt = stmt.where(Document.created_at <= date_to)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    stmt = stmt.order_by(Document.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(stmt)
    docs = result.scalars().all()

    await log_event(
        db, user_id=current_user.id, patient_id=patient_id,
        action="DOCUMENT_LIST", result=AuditResult.SUCCESS,
        ip_address=_client_ip(request), user_agent=request.headers.get("User-Agent", ""),
    )

    return DocumentList(
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=total,
        page=page,
        size=size,
    )


@router.get("", response_model=DocumentList)
async def list_all_documents(
    request: Request,
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    storage_backend: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document).where(Document.is_deleted == False)

    if category:
        try:
            stmt = stmt.where(Document.category == DocumentCategory(category))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid category '{category}'")

    if storage_backend:
        try:
            stmt = stmt.where(Document.storage_backend == StorageBackend(storage_backend))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid storage backend '{storage_backend}'")

    if q:
        stmt = stmt.where(Document.title.ilike(f"%{q}%"))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    stmt = stmt.order_by(Document.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(stmt)
    docs = result.scalars().all()

    return DocumentList(
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=total,
        page=page,
        size=size,
    )


@router.get("/{document_id}/download")
async def download_document(
    document_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document).where(Document.id == document_id, Document.is_deleted == False)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    await log_event(
        db, user_id=current_user.id, patient_id=doc.patient_id, document_id=doc.id,
        action="DOCUMENT_DOWNLOAD", result=AuditResult.SUCCESS,
        ip_address=_client_ip(request), user_agent=request.headers.get("User-Agent", ""),
    )

    filename = doc.title or posixpath.basename(doc.storage_path)
    return StreamingResponse(
        iter_storage_file(doc.storage_path, backend=doc.storage_backend.value),
        media_type=doc.mime_type,
        headers={"Content-Disposition": _content_disposition("attachment", filename)},
    )


@router.get("/{document_id}/preview")
async def preview_document(
    document_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document).where(Document.id == document_id, Document.is_deleted == False)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    await log_event(
        db, user_id=current_user.id, patient_id=doc.patient_id, document_id=doc.id,
        action="DOCUMENT_PREVIEW", result=AuditResult.SUCCESS,
        ip_address=_client_ip(request), user_agent=request.headers.get("User-Agent", ""),
    )

    filename = doc.title or posixpath.basename(doc.storage_path)
    return StreamingResponse(
        iter_storage_file(doc.storage_path, backend=doc.storage_backend.value),
        media_type=doc.mime_type,
        headers={"Content-Disposition": _content_disposition("inline", filename)},
    )


# ── DICOM WADO-RS Support ───────────────────────────────────────────────

@router.get("/{document_id}/dicom/metadata")
async def dicom_metadata(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return DICOM metadata for cornerstone.js (WADO-RS compatible)."""
    stmt = select(Document).where(Document.id == document_id, Document.is_deleted == False)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if doc.mime_type != "application/dicom" and not (doc.title or "").lower().endswith(".dcm"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a DICOM file")

    # For now, return basic metadata. In production, parse actual DICOM tags with pydicom
    return {
        "studyInstanceUID": f"1.2.826.0.1.3680043.2.1125.{doc.patient_id}.{doc.id}",
        "seriesInstanceUID": f"1.2.826.0.1.3680043.2.1125.{doc.patient_id}.{doc.id}.1",
        "sopInstanceUID": f"1.2.826.0.1.3680043.2.1125.{doc.patient_id}.{doc.id}.1.1",
        "patientName": "Unknown",
        "patientID": "Unknown",
        "studyDate": doc.created_at.strftime("%Y%m%d"),
        "studyTime": doc.created_at.strftime("%H%M%S"),
        "modality": "OT",
        "rows": 512,
        "columns": 512,
        "bitsAllocated": 16,
        "bitsStored": 12,
        "highBit": 11,
        "pixelRepresentation": 0,
        "samplesPerPixel": 1,
        "photometricInterpretation": "MONOCHROME2",
        "transferSyntaxUID": "1.2.840.10008.1.2.1",  # Explicit VR Little Endian
    }


@router.get("/{document_id}/dicom/pixeldata")
async def dicom_pixeldata(
    document_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Serve raw DICOM pixel data for cornerstone.js (WADO-RS compatible)."""
    stmt = select(Document).where(Document.id == document_id, Document.is_deleted == False)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if doc.mime_type != "application/dicom" and not (doc.title or "").lower().endswith(".dcm"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a DICOM file")

    await log_event(
        db, user_id=current_user.id, patient_id=doc.patient_id, document_id=doc.id,
        action="DICOM_PIXEL_DATA_ACCESS", result=AuditResult.SUCCESS,
        ip_address=_client_ip(request), user_agent=request.headers.get("User-Agent", ""),
    )

    filename = doc.title or posixpath.basename(doc.storage_path)
    return StreamingResponse(
        iter_storage_file(doc.storage_path, backend=doc.storage_backend.value),
        media_type="application/dicom",
        headers={"Content-Disposition": _content_disposition("inline", filename)},
    )


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_roles(["SUPERADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document).where(Document.id == document_id, Document.is_deleted == False)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if doc.legal_hold:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Document is under legal hold and cannot be deleted")

    doc.is_deleted = True
    doc.deleted_at = datetime.now(timezone.utc)
    await db.flush()

    await log_event(
        db, user_id=current_user.id, patient_id=doc.patient_id, document_id=doc.id,
        action="DOCUMENT_DELETE", result=AuditResult.SUCCESS,
        ip_address=_client_ip(request), user_agent=request.headers.get("User-Agent", ""),
    )

    return {"message": "Document deleted successfully"}


@router.get("/{document_id}/versions", response_model=list[DocumentResponse])
async def list_versions(
    document_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Find the root document
    stmt = select(Document).where(Document.id == document_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Determine root: if this doc has a parent, the root is the parent; otherwise it's this doc
    root_id = doc.parent_id if doc.parent_id else doc.id

    # Get all versions: the root itself + all children of root
    versions_stmt = select(Document).where(
        (Document.id == root_id) | (Document.parent_id == root_id)
    ).order_by(Document.version.asc())
    versions_result = await db.execute(versions_stmt)
    versions = versions_result.scalars().all()

    await log_event(
        db, user_id=current_user.id, patient_id=doc.patient_id, document_id=doc.id,
        action="DOCUMENT_VERSIONS", result=AuditResult.SUCCESS,
        ip_address=_client_ip(request), user_agent=request.headers.get("User-Agent", ""),
    )

    return [DocumentResponse.model_validate(v) for v in versions]


@router.post("/batch/upload", response_model=BatchUploadResponse, status_code=status.HTTP_201_CREATED)
async def batch_upload_documents(
    request: Request,
    files: list[UploadFile] = File(...),
    patient_id: uuid.UUID = Form(...),
    category: str = Form(...),
    current_user: User = Depends(
        require_roles(["SUPERADMIN", "DOKTER", "ADMIN_PENDAFTARAN", "LAB", "RADIOGRAFER"])
    ),
    db: AsyncSession = Depends(get_db),
):
    """Upload multiple files for a single patient at once."""
    try:
        cat = DocumentCategory(category)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category '{category}'. Valid: {[c.value for c in DocumentCategory]}",
        )

    stmt = select(Patient).where(Patient.id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    uploaded = []
    failed = []

    for file in files:
        try:
            await validate_file(file)
            stored = await save_upload_file(file, patient.medical_record_no)

            retention_expires_at = None
            policy_result = await db.execute(
                select(RetentionPolicy).where(RetentionPolicy.category == cat.value)
            )
            policy = policy_result.scalar_one_or_none()
            if policy:
                retention_expires_at = datetime.now(timezone.utc) + timedelta(days=365 * policy.retention_years)

            doc = Document(
                patient_id=patient_id,
                title=file.filename or "unnamed",
                category=cat,
                version=1,
                storage_path=stored.relative_path,
                storage_backend=StorageBackend(stored.backend),
                file_size_bytes=stored.size_bytes,
                mime_type=file.content_type or "application/octet-stream",
                sha256_hash=stored.sha256,
                uploaded_by=current_user.id,
                retention_expires_at=retention_expires_at,
            )
            db.add(doc)
            await db.flush()

            await log_event(
                db, user_id=current_user.id, patient_id=patient_id, document_id=doc.id,
                action="DOCUMENT_UPLOAD", result=AuditResult.SUCCESS,
                ip_address=_client_ip(request), user_agent=request.headers.get("User-Agent", ""),
                detail={"title": doc.title, "category": category, "file_size": stored.size_bytes},
            )

            uploaded.append(DocumentResponse.model_validate(doc))
        except Exception as exc:
            failed.append({"filename": file.filename or "unknown", "error": str(exc)})

    return BatchUploadResponse(uploaded=uploaded, failed=failed)


@router.post("/batch/delete", status_code=status.HTTP_200_OK)
async def batch_delete_documents(
    request: Request,
    document_ids: list[uuid.UUID],
    current_user: User = Depends(require_roles(["SUPERADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete multiple documents at once."""
    deleted = []
    failed = []

    for doc_id in document_ids:
        try:
            stmt = select(Document).where(Document.id == doc_id, Document.is_deleted == False)
            result = await db.execute(stmt)
            doc = result.scalar_one_or_none()

            if doc is None:
                failed.append({"id": str(doc_id), "error": "Document not found"})
                continue

            if doc.legal_hold:
                failed.append({"id": str(doc_id), "error": "Document is under legal hold"})
                continue

            doc.is_deleted = True
            doc.deleted_at = datetime.now(timezone.utc)
            await db.flush()

            await log_event(
                db, user_id=current_user.id, patient_id=doc.patient_id, document_id=doc.id,
                action="DOCUMENT_DELETE", result=AuditResult.SUCCESS,
                ip_address=_client_ip(request), user_agent=request.headers.get("User-Agent", ""),
            )

            deleted.append(str(doc_id))
        except Exception as exc:
            failed.append({"id": str(doc_id), "error": str(exc)})

    return {"deleted": deleted, "failed": failed}


@router.post("/batch/download")
async def batch_download_documents(
    request: Request,
    document_ids: list[uuid.UUID],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a ZIP archive of multiple documents for download."""
    import zipfile
    import io

    # Verify all documents exist and user has access
    docs = []
    for doc_id in document_ids:
        stmt = select(Document).where(Document.id == doc_id, Document.is_deleted == False)
        result = await db.execute(stmt)
        doc = result.scalar_one_or_none()
        if doc is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {doc_id} not found")
        docs.append(doc)

    # Log audit events
    for doc in docs:
        await log_event(
            db, user_id=current_user.id, patient_id=doc.patient_id, document_id=doc.id,
            action="DOCUMENT_DOWNLOAD", result=AuditResult.SUCCESS,
            ip_address=_client_ip(request), user_agent=request.headers.get("User-Agent", ""),
        )

    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for doc in docs:
            try:
                file_iter = iter_storage_file(doc.storage_path, backend=doc.storage_backend.value)
                filename = doc.title or f"document_{doc.id}"
                # Sanitize filename for ZIP
                safe_filename = "".join(c if c.isalnum() or c in "._- " else "_" for c in filename)
                if not safe_filename.lower().endswith(('.pdf', '.jpg', '.jpeg', '.png', '.dcm')):
                    safe_filename += posixpath.splitext(doc.storage_path)[1] or ".pdf"
                zip_file.writestr(safe_filename, b"".join([chunk async for chunk in file_iter]))
            except Exception:
                # Skip files that can't be read
                pass

    zip_buffer.seek(0)

    return StreamingResponse(
        iter([zip_buffer.read()]),
        media_type="application/zip",
        headers={"Content-Disposition": _content_disposition("attachment", "medstore-documents.zip")},
    )
