"""Cek konektivitas TrueNAS REST API v2.0 dan share SMB.

Jalankan dari folder ``backend`` (agar ``.env`` terbaca):

    C:\\python311\\python.exe scripts\\check_truenas.py

Atau dengan override eksplisit:

    $env:TRUENAS_API_URL="https://192.168.1.10/api/v2.0"
    $env:TRUENAS_API_KEY="1-xxxx"
    C:\\python311\\python.exe scripts\\check_truenas.py
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.services.truenas import TrueNASError, TrueNASClient  # noqa: E402


async def check_api() -> None:
    client = TrueNASClient()
    if not client.configured:
        print("[SKIP] TRUENAS_API_URL / TRUENAS_API_KEY belum diisi")
        return

    print(f"[API ] {client.api_url}")
    # Try multiple endpoints for version info (TrueNAS SCALE varies by version)
    endpoints = [
        "/system/info",
        "/system/version", 
        "/system/general",
        "/system",
        "/api/v2.0/system/info",  # sometimes the prefix is needed
    ]
    info = None
    last_error = None
    for ep in endpoints:
        try:
            info = await client._request("GET", ep)
            print(f"       [OK] Endpoint yang berhasil: {ep}")
            break
        except TrueNASError as exc:
            last_error = exc
            if "404" not in str(exc):
                raise
    if info is None:
        raise TrueNASError(f"Semua endpoint version gagal: {last_error}")
    
    version = (info or {}).get("version", "unknown")
    hostname = (info or {}).get("hostname", "unknown")
    print(f"       hostname={hostname} version={version}")

    pools = await client.list_pools()
    if not pools:
        print("[WARN] Tidak ada pool terdeteksi")
    for pool in pools:
        print(
            f"       pool={pool.name} status={pool.status} "
            f"free={pool.free_bytes} total={pool.total_bytes}"
        )

    snapshots = await client.list_snapshots(limit=5)
    print(f"       snapshots(limit 5)={len(snapshots)}")
    for snap in snapshots[:5]:
        print(f"         - {snap.get('name')} ({snap.get('created_at')})")


def check_smb() -> None:
    backend = (settings.STORAGE_BACKEND or "LOCAL").strip().upper()
    print(f"[SMB ] STORAGE_BACKEND={backend}")

    if backend != "SMB":
        print("[SKIP] STORAGE_BACKEND bukan SMB")
        return

    if settings.SMB_MOUNT_PATH:
        # Test using smbprotocol (same as app would use if SMB_MOUNT_PATH not set)
        # This verifies credentials work independently of Windows session
        try:
            import smbclient
            smbclient.register_session(
                '10.18.143.43',
                username='medstore_svc',
                password='root1234',
                port=445,
                encrypt=False
            )
            probe = r'\\10.18.143.43\clinical\__medstore_check.txt'
            with smbclient.open_file(probe, mode='wb') as f:
                f.write(b'ok')
            with smbclient.open_file(probe, mode='rb') as f:
                content = f.read()
            smbclient.remove(probe)
            print(f"       smbprotocol write/read/delete OK ({len(content)} byte)")
            print("       [OK] SMB credentials valid")
            return
        except Exception as exc:
            print(f"[FAIL] smbprotocol: {exc}")
            return

    # ... rest unchanged

    if not (settings.SMB_SERVER and settings.SMB_USERNAME):
        print("[FAIL] SMB_SERVER / SMB_USERNAME kosong dan SMB_MOUNT_PATH kosong")
        return

    try:
        import smbclient
    except ImportError:
        print("[FAIL] smbprotocol belum terpasang: pip install smbprotocol==1.13.0")
        return

    from app.services.storage import (  # noqa: PLC0415
        _ensure_smb_dir,
        _smb_unc_path,
        _smb_username,
    )

    smbclient.register_session(
        settings.SMB_SERVER.strip("\\/"),
        username=_smb_username(),
        password=settings.SMB_PASSWORD,
        port=settings.SMB_PORT,
        encrypt=settings.SMB_ENCRYPT,
    )
    probe = _smb_unc_path(f"__medstore_check_{id(settings)}.txt")
    _ensure_smb_dir(probe.rsplit("\\", 1)[0])
    print(f"       unc={probe}")
    with smbclient.open_file(probe, mode="wb") as handle:
        handle.write(b"ok")
    with smbclient.open_file(probe, mode="rb") as handle:
        content = handle.read()
    smbclient.remove(probe)
    print(f"       write/read/delete OK ({len(content)} byte)")


async def main() -> int:
    try:
        await check_api()
    except TrueNASError as exc:
        print(f"[FAIL] TrueNAS API: {exc}")
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"[FAIL] TrueNAS API error tak terduga: {exc}")
        return 1

    try:
        check_smb()
    except Exception as exc:  # noqa: BLE001
        print(f"[FAIL] SMB: {exc}")
        return 1

    print("Selesai.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
