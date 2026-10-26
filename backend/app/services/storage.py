"""Document storage abstraction: local disk or TrueNAS SMB share.

Two SMB modes are supported:

1. ``SMB_MOUNT_PATH`` set (UNC path or mapped drive, e.g. ``\\\\truenas\\medstore``
   or ``Z:\\medstore``). The OS handles authentication, so normal file I/O is used.
2. ``SMB_SERVER`` + ``SMB_USERNAME`` + ``SMB_PASSWORD`` set. Files are written with
   the pure-Python ``smbprotocol`` client, no OS mount required. This is the
   recommended mode when the backend runs on Windows.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import BinaryIO, Iterator, Optional, Tuple

from fastapi import HTTPException, UploadFile, status

from app.config import settings

logger = logging.getLogger("medstore.storage")

CHUNK_SIZE = 1024 * 1024  # 1 MiB


@dataclass
class StoredFile:
    relative_path: str
    sha256: str
    size_bytes: int
    backend: str


def storage_backend_name() -> str:
    value = (settings.STORAGE_BACKEND or "LOCAL").strip().upper()
    return value if value in {"LOCAL", "SMB", "NFS", "S3"} else "LOCAL"


def _normalize_relative(relative_path: str) -> str:
    """Reject traversal and normalize separators to posix form."""
    candidate = PurePosixPath(str(relative_path).replace("\\", "/"))
    if candidate.is_absolute() or ".." in candidate.parts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path dokumen tidak valid",
        )
    return candidate.as_posix()


def _disk_root(backend: str) -> Path:
    if backend == "SMB" and settings.SMB_MOUNT_PATH:
        return Path(settings.SMB_MOUNT_PATH) / settings.SMB_PATH_PREFIX.strip("/\\")
    return Path(settings.UPLOAD_DIR)


def _smb_unc_path(relative_path: str) -> str:
    parts = [settings.SMB_SHARE.strip("/\\")]
    prefix = settings.SMB_PATH_PREFIX.strip("/\\")
    if prefix:
        parts.append(prefix.replace("/", "\\"))
    parts.append(_normalize_relative(relative_path).replace("/", "\\"))
    return "\\\\" + settings.SMB_SERVER.strip("\\/") + "\\" + "\\".join(parts)


def _smb_username() -> str:
    # smbprotocol often works better with just username (no domain prefix)
    # Windows 'net use' worked with 'medstore_svc' only
    return settings.SMB_USERNAME


def _smb_using_client(backend: Optional[str] = None) -> bool:
    effective = (backend or storage_backend_name()).strip().upper()
    return (
        effective == "SMB"
        and not settings.SMB_MOUNT_PATH
        and bool(settings.SMB_SERVER and settings.SMB_USERNAME)
    )


_SMB_SESSION_READY = False


def _ensure_smb_session() -> None:
    global _SMB_SESSION_READY

    if _SMB_SESSION_READY:
        return

    import smbclient  # imported lazily so LOCAL deployments do not need it

    smbclient.register_session(
        settings.SMB_SERVER.strip("\\/"),
        username=_smb_username(),
        password=settings.SMB_PASSWORD,
        port=settings.SMB_PORT,
        encrypt=settings.SMB_ENCRYPT,
    )
    _SMB_SESSION_READY = True


def _ensure_smb_dir(unc_dir: str) -> None:
    import smbclient

    parts = unc_dir.strip("\\").split("\\")
    if len(parts) < 2:
        return
    # Start at the share root; \\server and \\server\share already exist.
    current = f"\\\\{parts[0]}\\{parts[1]}"
    for part in parts[2:]:
        if not part:
            continue
        current = f"{current}\\{part}"
        try:
            smbclient.stat(current)
        except OSError:
            try:
                smbclient.mkdir(current)
            except OSError:
                # Most likely created concurrently; ignore if it now exists.
                smbclient.stat(current)


def storage_ready() -> bool:
    backend = storage_backend_name()
    if backend == "LOCAL":
        return True
    if backend == "SMB":
        if settings.SMB_MOUNT_PATH:
            return Path(settings.SMB_MOUNT_PATH).exists()
        return bool(settings.SMB_SERVER and settings.SMB_USERNAME)
    return False


def _write_to_destination(file: UploadFile, relative_path: str) -> Tuple[str, int]:
    """Blocking write used inside a worker thread. Returns (sha256, size)."""
    sha256 = hashlib.sha256()
    total = 0

    if _smb_using_client():
        import smbclient

        _ensure_smb_session()
        unc_path = _smb_unc_path(relative_path)
        _ensure_smb_dir(unc_path.rsplit("\\", 1)[0])
        with smbclient.open_file(unc_path, mode="wb") as remote:
            while True:
                chunk = file.file.read(CHUNK_SIZE)
                if not chunk:
                    break
                remote.write(chunk)
                sha256.update(chunk)
                total += len(chunk)
        return sha256.hexdigest(), total

    destination = _disk_root(storage_backend_name()) / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    with open(destination, "wb") as local:
        while True:
            chunk = file.file.read(CHUNK_SIZE)
            if not chunk:
                break
            local.write(chunk)
            sha256.update(chunk)
            total += len(chunk)
    return sha256.hexdigest(), total


async def save_upload_file(file: UploadFile, medical_record_no: str) -> StoredFile:
    backend = storage_backend_name()

    if backend == "SMB" and not storage_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Storage SMB belum siap. Isi SMB_MOUNT_PATH, atau SMB_SERVER + "
                "SMB_USERNAME + SMB_PASSWORD di backend/.env"
            ),
        )

    folder = _normalize_relative(medical_record_no)
    original_name = (file.filename or "document").replace("\\", "/")
    filename = f"{uuid.uuid4().hex}_{os.path.basename(original_name)}"
    relative_path = f"{folder}/{filename}"

    await file.seek(0)
    try:
        sha256, size = await asyncio.to_thread(
            _write_to_destination, file, relative_path
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - surface storage failures clearly
        logger.exception("Gagal menyimpan file ke storage %s: %s", backend, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gagal menyimpan file ke storage {backend}: {exc}",
        ) from exc

    return StoredFile(
        relative_path=relative_path,
        sha256=sha256,
        size_bytes=size,
        backend=backend,
    )


@contextmanager
def open_storage_stream(
    relative_path: str, backend: Optional[str] = None
) -> Iterator[BinaryIO]:
    """Open a stored document for reading.

    ``backend`` is the value recorded on the document row, so documents saved
    before switching STORAGE_BACKEND stay readable from their original location.
    """
    relative_path = _normalize_relative(relative_path)
    effective = str(backend or storage_backend_name()).strip().upper()

    if _smb_using_client(effective):
        import smbclient

        _ensure_smb_session()
        unc_path = _smb_unc_path(relative_path)
        try:
            with smbclient.open_file(unc_path, mode="rb") as remote:
                yield remote
        except OSError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File tidak ditemukan di share SMB: {exc}",
            ) from exc
        return

    path = _disk_root(effective) / relative_path
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File tidak ditemukan pada storage",
        )
    with open(path, "rb") as local:
        yield local


def iter_storage_file(
    relative_path: str, backend: Optional[str] = None
) -> Iterator[bytes]:
    with open_storage_stream(relative_path, backend=backend) as stream:
        while True:
            chunk = stream.read(CHUNK_SIZE)
            if not chunk:
                break
            yield chunk


def delete_storage_file(relative_path: str, backend: Optional[str] = None) -> None:
    """Physical delete. Only used after retention/legal-hold checks."""
    relative_path = _normalize_relative(relative_path)
    effective = str(backend or storage_backend_name()).strip().upper()

    if _smb_using_client(effective):
        import smbclient

        _ensure_smb_session()
        try:
            smbclient.remove(_smb_unc_path(relative_path))
        except OSError:
            logger.warning("Gagal menghapus file SMB %s", relative_path)
        return

    path = _disk_root(effective) / relative_path
    try:
        path.unlink(missing_ok=True)
    except OSError:
        logger.warning("Gagal menghapus file lokal %s", relative_path)
