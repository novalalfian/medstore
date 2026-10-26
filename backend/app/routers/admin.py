import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import log_event
from app.core.security import get_current_user, hash_password, require_roles
from app.database import get_db
from app.models.audit import AuditResult
from app.models.document import Document
from app.models.patient import Patient
from app.models.retention import RetentionPolicy
from app.models.user import Role, User, user_roles
from app.schemas.user import RoleResponse, UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/admin", tags=["Admin"])


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── Users ──────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    request: Request,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_roles(["SUPERADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(User)
        .options(selectinload(User.roles))
        .order_by(User.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    result = await db.execute(stmt)
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    request: Request,
    current_user: User = Depends(require_roles(["SUPERADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
    )

    # Assign roles
    if body.role_names:
        roles_stmt = select(Role).where(Role.name.in_(body.role_names))
        roles_result = await db.execute(roles_stmt)
        roles = roles_result.scalars().all()
        if len(roles) != len(body.role_names):
            found = {r.name for r in roles}
            missing = set(body.role_names) - found
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Roles not found: {missing}",
            )
        user.roles = list(roles)

    db.add(user)
    await db.flush()
    refreshed = await db.execute(
        select(User).where(User.id == user.id).options(selectinload(User.roles))
    )
    user = refreshed.scalar_one()

    await log_event(
        db, user_id=current_user.id, action="USER_CREATE", result=AuditResult.SUCCESS,
        ip_address=_client_ip(request), user_agent=request.headers.get("User-Agent", ""),
        detail={"created_user_id": str(user.id), "email": body.email},
    )

    return UserResponse.model_validate(user)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    request: Request,
    current_user: User = Depends(require_roles(["SUPERADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.id == user_id).options(selectinload(User.roles))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.email is not None:
        # Check duplicate
        dup = await db.execute(select(User).where(User.email == body.email, User.id != user_id))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        user.email = body.email

    if body.full_name is not None:
        user.full_name = body.full_name

    if body.is_active is not None:
        user.is_active = body.is_active

    if body.role_names is not None:
        roles_stmt = select(Role).where(Role.name.in_(body.role_names))
        roles_result = await db.execute(roles_stmt)
        roles = roles_result.scalars().all()
        if len(roles) != len(body.role_names):
            found = {r.name for r in roles}
            missing = set(body.role_names) - found
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Roles not found: {missing}",
            )
        user.roles = list(roles)

    await db.flush()
    refreshed = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.roles))
    )
    user = refreshed.scalar_one()

    await log_event(
        db, user_id=current_user.id, action="USER_UPDATE", result=AuditResult.SUCCESS,
        ip_address=_client_ip(request), user_agent=request.headers.get("User-Agent", ""),
        detail={"updated_user_id": str(user.id)},
    )

    return UserResponse.model_validate(user)


# ── Roles ──────────────────────────────────────────────────────────────

@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    current_user: User = Depends(require_roles(["SUPERADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).order_by(Role.name))
    roles = result.scalars().all()
    return [RoleResponse.model_validate(r) for r in roles]


# ── Retention Policies ─────────────────────────────────────────────────

class RetentionPolicyCreate(BaseModel):
    category: str
    retention_years: int
    description: Optional[str] = None


class RetentionPolicyResponse(BaseModel):
    id: uuid.UUID
    category: str
    retention_years: int
    description: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("/retention-policies", response_model=RetentionPolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_retention_policy(
    body: RetentionPolicyCreate,
    request: Request,
    current_user: User = Depends(require_roles(["SUPERADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(RetentionPolicy).where(RetentionPolicy.category == body.category)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category already has a retention policy")

    policy = RetentionPolicy(
        category=body.category,
        retention_years=body.retention_years,
        description=body.description,
    )
    db.add(policy)
    await db.flush()
    await db.refresh(policy)

    await log_event(
        db, user_id=current_user.id, action="RETENTION_POLICY_CREATE", result=AuditResult.SUCCESS,
        ip_address=_client_ip(request), user_agent=request.headers.get("User-Agent", ""),
        detail={"category": body.category, "retention_years": body.retention_years},
    )

    return RetentionPolicyResponse.model_validate(policy)


@router.get("/retention-policies", response_model=List[RetentionPolicyResponse])
async def list_retention_policies(
    current_user: User = Depends(require_roles(["SUPERADMIN"])),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(RetentionPolicy).order_by(RetentionPolicy.category))
    policies = result.scalars().all()
    return [RetentionPolicyResponse.model_validate(p) for p in policies]


# ── Retention Dashboard ─────────────────────────────────────────────────

class RetentionDashboardItem(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    patient_name: str
    patient_mrn: str
    title: str
    category: str
    retention_expires_at: datetime
    days_until_expiry: int
    storage_backend: str
    file_size_bytes: int

    model_config = {"from_attributes": True}


class RetentionDashboardResponse(BaseModel):
    expiring_soon: List[RetentionDashboardItem]  # <= 30 days
    expiring_later: List[RetentionDashboardItem]  # 31-365 days
    expired: List[RetentionDashboardItem]  # past due
    total_expiring_soon: int
    total_expiring_later: int
    total_expired: int


@router.get("/retention-dashboard", response_model=RetentionDashboardResponse)
async def retention_dashboard(
    current_user: User = Depends(require_roles(["SUPERADMIN", "ADMIN_PENDAFTARAN", "DOKTER"])),
    db: AsyncSession = Depends(get_db),
):
    """Get retention dashboard showing documents nearing or past retention expiry."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import func, select
    import logging

    logger = logging.getLogger(__name__)
    
    try:
        now = datetime.now(timezone.utc)
        thirty_days = now + timedelta(days=30)
        one_year = now + timedelta(days=365)

        # Get all documents with retention expiry
        stmt = (
            select(Document, Patient)
            .join(Patient, Document.patient_id == Patient.id)
            .where(Document.is_deleted == False)
            .where(Document.retention_expires_at.isnot(None))
        )
        result = await db.execute(stmt)
        rows = result.all()

        expiring_soon = []
        expiring_later = []
        expired = []

        for doc, patient in rows:
            try:
                expires = doc.retention_expires_at
                if expires is None:
                    continue
                # Ensure both are timezone aware
                if expires.tzinfo is None:
                    expires = expires.replace(tzinfo=timezone.utc)
                days = (expires - now).days
                item = RetentionDashboardItem(
                    id=doc.id,
                    patient_id=patient.id,
                    patient_name=patient.full_name,
                    patient_mrn=patient.medical_record_no,
                    title=doc.title,
                    category=doc.category.value if hasattr(doc.category, 'value') else str(doc.category),
                    retention_expires_at=expires,
                    days_until_expiry=days,
                    storage_backend=doc.storage_backend.value if hasattr(doc.storage_backend, 'value') else str(doc.storage_backend),
                    file_size_bytes=doc.file_size_bytes,
                )
                if expires <= now:
                    expired.append(item)
                elif expires <= thirty_days:
                    expiring_soon.append(item)
                elif expires <= one_year:
                    expiring_later.append(item)
            except Exception as e:
                logger.warning(f"Error processing doc {doc.id}: {e}")
                continue
    except Exception as e:
        logger.error(f"Retention dashboard error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Retention dashboard error: {str(e)}")

    # Sort by expiry date
    expiring_soon.sort(key=lambda x: x.retention_expires_at)
    expiring_later.sort(key=lambda x: x.retention_expires_at)
    expired.sort(key=lambda x: x.retention_expires_at, reverse=True)

    return RetentionDashboardResponse(
        expiring_soon=expiring_soon,
        expiring_later=expiring_later,
        expired=expired,
        total_expiring_soon=len(expiring_soon),
        total_expiring_later=len(expiring_later),
        total_expired=len(expired),
    )
