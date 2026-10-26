import uuid
from datetime import datetime, timezone
import io
import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.core.audit import log_event
from app.core.security import (
    create_access_token,
    create_mfa_token,
    decode_token,
    generate_mfa_secret,
    get_current_user,
    get_mfa_provisioning_uri,
    verify_mfa_code,
    verify_password,
)
from app.database import get_db
from app.models.audit import AuditResult
from app.models.user import User
from app.schemas.user import (
    LoginRequest,
    LoginResponse,
    MFAEnableRequest,
    MFASetupResponse,
    MFAVerifyRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    ua = request.headers.get("User-Agent")

    stmt = select(User).where(User.email == payload.email).options(selectinload(User.roles))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        await log_event(
            db,
            action="LOGIN_FAILED",
            result=AuditResult.FAIL,
            ip_address=ip,
            user_agent=ua,
            detail={"email": payload.email, "reason": "invalid_credentials"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau kata sandi salah",
        )

    if not user.is_active:
        await log_event(
            db,
            user_id=user.id,
            action="LOGIN_BLOCKED",
            result=AuditResult.DENIED,
            ip_address=ip,
            user_agent=ua,
            detail={"reason": "account_deactivated"},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun telah dinonaktifkan",
        )

    if user.mfa_enabled:
        temp_token = create_mfa_token(str(user.id))
        return LoginResponse(
            mfa_required=True,
            temp_token=temp_token,
            message="Masukkan kode MFA 6 digit",
        )

    user.last_login_at = datetime.now(timezone.utc)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "roles": [r.name for r in user.roles]}
    )

    await log_event(
        db,
        user_id=user.id,
        action="LOGIN_SUCCESS",
        result=AuditResult.SUCCESS,
        ip_address=ip,
        user_agent=ua,
    )

    return LoginResponse(
        mfa_required=False,
        token=TokenResponse(access_token=access_token),
        user=UserResponse.model_validate(user),
    )


@router.post("/mfa/verify", response_model=LoginResponse)
async def verify_mfa(
    payload: MFAVerifyRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    ua = request.headers.get("User-Agent")

    try:
        token_data = decode_token(payload.temp_token)
    except HTTPException:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token MFA kedaluwarsa atau tidak valid")

    if token_data.get("type") != "mfa":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tipe token tidak sesuai")

    user_id = token_data.get("sub")
    stmt = select(User).where(User.id == uuid.UUID(user_id)).options(selectinload(User.roles))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Pengguna tidak ditemukan atau tidak aktif")

    if not user.mfa_secret or not verify_mfa_code(user.mfa_secret, payload.code):
        await log_event(
            db,
            user_id=user.id,
            action="LOGIN_FAILED_MFA",
            result=AuditResult.FAIL,
            ip_address=ip,
            user_agent=ua,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kode MFA tidak valid")

    user.last_login_at = datetime.now(timezone.utc)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "roles": [r.name for r in user.roles]}
    )

    await log_event(
        db,
        user_id=user.id,
        action="LOGIN_SUCCESS_MFA",
        result=AuditResult.SUCCESS,
        ip_address=ip,
        user_agent=ua,
    )

    return LoginResponse(
        mfa_required=False,
        token=TokenResponse(access_token=access_token),
        user=UserResponse.model_validate(user),
    )


@router.post("/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    secret = generate_mfa_secret()
    current_user.mfa_secret = secret
    await db.flush()

    provisioning_uri = get_mfa_provisioning_uri(secret, current_user.email)

    img = qrcode.make(provisioning_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    import base64
    qr_base64 = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"

    return MFASetupResponse(secret=secret, qr_code_uri=qr_base64)


@router.post("/mfa/enable", response_model=UserResponse)
async def enable_mfa(
    payload: MFAEnableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.mfa_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA belum diinisialisasi")

    if not verify_mfa_code(current_user.mfa_secret, payload.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kode verifikasi tidak cocok")

    current_user.mfa_enabled = True
    await db.flush()
    return UserResponse.model_validate(current_user)


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ip = get_client_ip(request)
    ua = request.headers.get("User-Agent")

    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if "Bearer " in auth_header else ""

    redis_client = getattr(request.app.state, "redis", None)
    if redis_client and token:
        await redis_client.setex(f"blacklist:{token}", settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, "1")

    await log_event(
        db,
        user_id=current_user.id,
        action="LOGOUT",
        result=AuditResult.SUCCESS,
        ip_address=ip,
        user_agent=ua,
    )
    return {"message": "Berhasil logout"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
