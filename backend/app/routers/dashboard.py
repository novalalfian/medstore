import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models.document import Document
from app.models.patient import Patient
from app.models.user import User
from app.services.truenas import TrueNASError, truenas_client

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def dashboard_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total_patients_r = await db.execute(select(func.count(Patient.id)).where(Patient.is_active == True))
    total_patients = total_patients_r.scalar() or 0

    total_documents_r = await db.execute(select(func.count(Document.id)).where(Document.is_deleted == False))
    total_documents = total_documents_r.scalar() or 0

    total_users_r = await db.execute(select(func.count(User.id)).where(User.is_active == True))
    total_users = total_users_r.scalar() or 0

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    docs_today_r = await db.execute(
        select(func.count(Document.id)).where(
            Document.is_deleted == False,
            Document.created_at >= today_start,
        )
    )
    documents_today = docs_today_r.scalar() or 0

    storage_used_r = await db.execute(
        select(func.coalesce(func.sum(Document.file_size_bytes), 0)).where(Document.is_deleted == False)
    )
    storage_used = storage_used_r.scalar() or 0

    return {
        "total_patients": total_patients,
        "total_documents": total_documents,
        "documents_today": documents_today,
        "total_users": total_users,
        "active_users": total_users,
        "storage_used_bytes": storage_used,
        "storage_used_human": _human_size(storage_used),
    }


def _mock_pools() -> list:
    return [
        {
            "name": "medstore-pool",
            "status": "ONLINE",
            "topology": "RAIDZ2",
            "total_bytes": 10_995_116_277_760,  # 10 TB
            "used_bytes": 3_298_534_883_328,    # ~3 TB
            "free_bytes": 7_696_581_394_432,
            "health": "HEALTHY",
            "disks": [
                {"name": f"da{i}", "status": "ONLINE"} for i in range(6)
            ],
        }
    ]


def _mock_snapshots() -> list:
    now = datetime.now(timezone.utc)
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    dataset = settings.TRUENAS_DATASET.strip("/") or "medstore/clinical-data"
    snapshots = []
    for days_ago, used in ((2, 524_288_000), (1, 314_572_800), (0, 209_715_200)):
        created = midnight - timedelta(days=days_ago)
        snapshots.append(
            {
                "id": str(uuid.uuid4()),
                "name": f"{dataset}@auto-{created.strftime('%Y-%m-%d')}",
                "dataset": dataset,
                "created_at": created.isoformat(),
                "used_bytes": used,
            }
        )
    return snapshots


def _truenas_unavailable(exc: TrueNASError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"TrueNAS tidak dapat dihubungi: {exc}",
    )


@router.get("/storage")
async def storage_status(
    request: Request,
    current_user: User = Depends(require_roles(["SUPERADMIN", "ADMIN_PENDAFTARAN"])),
):
    if not truenas_client.configured:
        return {
            "pools": _mock_pools(),
            "datasets": [],
            "dataset": settings.TRUENAS_DATASET,
            "storage_backend": settings.STORAGE_BACKEND,
            "truenas_configured": False,
            "source": "mock",
            "mock": True,
            "message": "TrueNAS belum dikonfigurasi (TRUENAS_API_URL / TRUENAS_API_KEY kosong)",
        }

    try:
        pools = await truenas_client.list_pools()
    except TrueNASError as exc:
        raise _truenas_unavailable(exc) from exc

    return {
        "pools": [pool.as_dict() for pool in pools],
        "dataset": settings.TRUENAS_DATASET,
        "storage_backend": settings.STORAGE_BACKEND,
        "truenas_configured": True,
        "source": "truenas",
        "mock": False,
    }


@router.get("/datasets")
async def list_datasets(
    request: Request,
    current_user: User = Depends(require_roles(["SUPERADMIN", "ADMIN_PENDAFTARAN"])),
):
    if not truenas_client.configured:
        return {"datasets": [], "source": "mock", "mock": True}

    try:
        datasets = await truenas_client.list_datasets()
    except TrueNASError as exc:
        raise _truenas_unavailable(exc) from exc

    return {"datasets": datasets, "source": "truenas", "mock": False}


@router.get("/snapshots")
async def list_snapshots(
    request: Request,
    limit: int = Query(20, ge=1, le=200),
    current_user: User = Depends(require_roles(["SUPERADMIN", "ADMIN_PENDAFTARAN"])),
):
    if not truenas_client.configured:
        return {
            "snapshots": _mock_snapshots(),
            "dataset": settings.TRUENAS_DATASET,
            "source": "mock",
            "mock": True,
        }

    try:
        snapshots = await truenas_client.list_snapshots(limit=limit)
    except TrueNASError as exc:
        raise _truenas_unavailable(exc) from exc

    dataset = settings.TRUENAS_DATASET.strip("/")
    if dataset:
        filtered = [
            snap
            for snap in snapshots
            if str(snap.get("dataset") or "").strip("/") == dataset
        ]
        # Fall back to the full list if the dataset filter matches nothing
        # (e.g. TrueNAS returns only the snapshot name without a dataset field).
        snapshots = filtered or snapshots

    return {
        "snapshots": snapshots,
        "dataset": settings.TRUENAS_DATASET,
        "source": "truenas",
        "mock": False,
    }


@router.post("/snapshots")
async def create_snapshot(
    request: Request,
    current_user: User = Depends(require_roles(["SUPERADMIN"])),
):
    now = datetime.now(timezone.utc)

    if not truenas_client.configured:
        dataset = settings.TRUENAS_DATASET.strip("/") or "medstore/clinical-data"
        return {
            "snapshot": {
                "id": str(uuid.uuid4()),
                "name": f"{dataset}@manual-{now.strftime('%Y%m%d-%H%M%S')}",
                "dataset": dataset,
                "created_at": now.isoformat(),
                "used_bytes": 0,
            },
            "message": "Snapshot dibuat dalam mode mock (TrueNAS belum dikonfigurasi)",
            "source": "mock",
            "mock": True,
        }

    snap_name = f"manual-{now.strftime('%Y%m%d-%H%M%S')}"
    try:
        created = await truenas_client.create_snapshot(snap_name)
    except TrueNASError as exc:
        raise _truenas_unavailable(exc) from exc

    dataset = settings.TRUENAS_DATASET.strip("/")
    return {
        "snapshot": {
            "id": created.get("id") or f"{dataset}@{snap_name}",
            "name": created.get("name") or f"{dataset}@{snap_name}",
            "dataset": dataset,
            "created_at": now.isoformat(),
            "used_bytes": 0,
        },
        "message": f"Snapshot {snap_name} dibuat di dataset {dataset}",
        "source": "truenas",
        "mock": False,
    }


@router.get("/cloudsync")
async def list_cloudsync(
    request: Request,
    current_user: User = Depends(require_roles(["SUPERADMIN", "ADMIN_PENDAFTARAN"])),
):
    if not truenas_client.configured:
        return {
            "jobs": [
                {
                    "id": 1,
                    "description": "medstore-offsite-backup (mock)",
                    "path": "/mnt/medstore/clinical-data",
                    "enabled": True,
                    "direction": "PUSH",
                    "transfer_mode": "SYNC",
                    "last_run": None,
                    "status": "SUCCESS",
                }
            ],
            "source": "mock",
            "mock": True,
        }

    try:
        jobs = await truenas_client.list_cloudsync_jobs()
    except TrueNASError as exc:
        raise _truenas_unavailable(exc) from exc

    return {"jobs": jobs, "source": "truenas", "mock": False}


@router.get("/alerts")
async def list_alerts(
    request: Request,
    current_user: User = Depends(require_roles(["SUPERADMIN", "ADMIN_PENDAFTARAN"])),
):
    if not truenas_client.configured:
        return {"alerts": [], "source": "mock", "mock": True}

    try:
        alerts = await truenas_client.list_alerts()
    except TrueNASError as exc:
        raise _truenas_unavailable(exc) from exc

    return {
        "alerts": [a for a in alerts if not a.get("dismissed")],
        "source": "truenas",
        "mock": False,
    }


def _human_size(size_bytes: int) -> str:
    if size_bytes == 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB"]
    idx = 0
    size = float(size_bytes)
    while size >= 1024 and idx < len(units) - 1:
        size /= 1024
        idx += 1
    return f"{size:.2f} {units[idx]}"
