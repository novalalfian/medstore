"""Minimal TrueNAS SCALE REST API v2.0 client.

Docs: https://<truenas>/api/docs/  (API key auth via Bearer token)
Only the endpoints MedStore needs are wrapped, with normalized return values so the
dashboard does not depend on raw TrueNAS payload shapes.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

logger = logging.getLogger("medstore.truenas")


class TrueNASError(RuntimeError):
    """Raised when TrueNAS is unreachable or returns an error."""


@dataclass
class TrueNASPool:
    name: str
    status: str
    total_bytes: int
    used_bytes: int
    free_bytes: int
    topology: str = ""
    disks: List[Dict[str, Any]] = field(default_factory=list)

    def as_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status,
            "health": "HEALTHY" if self.status == "ONLINE" else self.status,
            "topology": self.topology,
            "total_bytes": self.total_bytes,
            "used_bytes": self.used_bytes,
            "free_bytes": self.free_bytes,
            "disks": self.disks,
        }


def _as_int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _as_timestamp(value: Any) -> Any:
    """Normalize TrueNAS date values (``{"$date": ms}`` or epoch seconds)."""
    if isinstance(value, dict):
        value = value.get("$date")
    if isinstance(value, (int, float)):
        # TrueNAS returns epoch seconds in most endpoints and ms in some.
        if value > 1e12:
            return datetime.fromtimestamp(value / 1000, tz=timezone.utc).isoformat()
        return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()
    return value


class TrueNASClient:
    def __init__(
        self,
        api_url: Optional[str] = None,
        api_key: Optional[str] = None,
        verify_ssl: Optional[bool] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.api_url = (api_url if api_url is not None else settings.TRUENAS_API_URL).rstrip("/")
        self.api_key = api_key if api_key is not None else settings.TRUENAS_API_KEY
        self.verify_ssl = verify_ssl if verify_ssl is not None else settings.TRUENAS_VERIFY_SSL
        self.timeout = timeout or settings.TRUENAS_TIMEOUT_SECONDS

    @property
    def configured(self) -> bool:
        return bool(self.api_url and self.api_key)

    def _client(self) -> httpx.AsyncClient:
        if not self.configured:
            raise TrueNASError(
                "TrueNAS belum dikonfigurasi. Isi TRUENAS_API_URL dan TRUENAS_API_KEY di backend/.env"
            )
        return httpx.AsyncClient(
            base_url=self.api_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Accept": "application/json",
            },
            timeout=self.timeout,
            verify=self.verify_ssl,
        )

    async def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        try:
            async with self._client() as client:
                response = await client.request(method, path, **kwargs)
        except httpx.HTTPError as exc:
            raise TrueNASError(f"Gagal menghubungi TrueNAS: {exc}") from exc

        if response.status_code >= 400:
            detail = response.text[:500]
            raise TrueNASError(
                f"TrueNAS menolak {method} {path} (HTTP {response.status_code}): {detail}"
            )

        if not response.content:
            return None
        try:
            return response.json()
        except ValueError:
            return None

    async def ping(self) -> bool:
        """Return True when the API answers authenticated requests."""
        # Try multiple endpoints (TrueNAS SCALE API changed across versions)
        endpoints = ["/system/info", "/system/version", "/system/general"]
        last_error = None
        for ep in endpoints:
            try:
                await self._request("GET", ep)
                return True
            except TrueNASError as exc:
                last_error = exc
                if "404" not in str(exc):
                    raise
        raise TrueNASError(f"Semua endpoint ping gagal: {last_error}")

    async def list_pools(self) -> List[TrueNASPool]:
        payload = await self._request("GET", "/pool")
        pools: List[TrueNASPool] = []
        for item in payload or []:
            topology = ""
            topo = item.get("topology") or {}
            for key, value in topo.items():
                if isinstance(value, dict) and value.get("type"):
                    topology = str(value.get("type")).upper()
                    break

            disks = [
                {"name": d.get("disk", ""), "status": d.get("status", "")}
                for d in (item.get("topology", {}).get("data") or [])
                if isinstance(d, dict)
            ]

            total = _as_int(item.get("size"))
            allocated = _as_int(item.get("allocated"))
            free = _as_int(item.get("free"))
            if total and not free:
                free = max(total - allocated, 0)

            pools.append(
                TrueNASPool(
                    name=str(item.get("name", "unknown")),
                    status=str(item.get("status", "UNKNOWN")),
                    total_bytes=total,
                    used_bytes=allocated,
                    free_bytes=free,
                    topology=topology,
                    disks=disks,
                )
            )
        return pools

    async def list_datasets(self) -> List[Dict[str, Any]]:
        payload = await self._request("GET", "/pool/dataset")
        return sorted(
            [
                {
                    "id": d.get("id"),
                    "name": d.get("name"),
                    "used_bytes": _as_int((d.get("used") or {}).get("parsed")),
                    "available_bytes": _as_int((d.get("available") or {}).get("parsed")),
                    "type": d.get("type"),
                    "encrypted": bool(d.get("encrypted")),
                }
                for d in (payload or [])
                if isinstance(d, dict)
            ],
            key=lambda d: d.get("id") or "",
        )

    async def list_snapshots(self, limit: int = 20) -> List[Dict[str, Any]]:
        # Try multiple endpoints (TrueNAS SCALE API changed across versions)
        endpoints = [
            "/pool/snapshot",
            "/zfs/snapshot",
            "/storage/snapshot",
        ]
        payload = None
        last_error = None
        for ep in endpoints:
            try:
                payload = await self._request("GET", ep, params={"limit": limit})
                break
            except TrueNASError as exc:
                last_error = exc
                if "404" not in str(exc):
                    raise
                # try next endpoint
        if payload is None:
            raise TrueNASError(f"Semua endpoint snapshot gagal: {last_error}")
        snapshots: List[Dict[str, Any]] = []
        for item in payload or []:
            if not isinstance(item, dict):
                continue
            props = item.get("properties") or {}
            used = props.get("used") or {}
            snapshots.append(
                {
                    "id": item.get("id") or item.get("name"),
                    "name": item.get("name") or item.get("id"),
                    "dataset": item.get("dataset")
                    or (props.get("dataset") or {}).get("value"),
                    "created_at": _as_timestamp(
                        item.get("created_at")
                        or (props.get("creation") or {}).get("value")
                    ),
                    "used_bytes": _as_int(used.get("parsed") or used.get("value")),
                }
            )
        return snapshots

    async def create_snapshot(
        self, name: str, dataset: Optional[str] = None
    ) -> Dict[str, Any]:
        target = (dataset or settings.TRUENAS_DATASET).strip("/")
        if not target:
            raise TrueNASError("TRUENAS_DATASET belum diisi")
        # Try multiple endpoints
        endpoints = ["/pool/snapshot", "/zfs/snapshot"]
        last_error = None
        for ep in endpoints:
            try:
                payload = await self._request(
                    "POST",
                    ep,
                    json={
                        "dataset": target,
                        "name": name,
                        "recursive": False,
                    },
                )
                return payload or {}
            except TrueNASError as exc:
                last_error = exc
                if "404" not in str(exc):
                    raise
        raise TrueNASError(f"Create snapshot gagal di semua endpoint: {last_error}")

    async def list_cloudsync_jobs(self) -> List[Dict[str, Any]]:
        payload = await self._request("GET", "/cloudsync")
        return [
            {
                "id": item.get("id"),
                "description": item.get("description") or item.get("job", {}).get("description"),
                "path": item.get("path"),
                "enabled": item.get("enabled", True),
                "direction": item.get("direction"),
                "transfer_mode": item.get("transfer_mode"),
                "last_run": _as_timestamp((item.get("job") or {}).get("time_finished")),
                "status": (item.get("job") or {}).get("state"),
            }
            for item in (payload or [])
            if isinstance(item, dict)
        ]

    async def list_alerts(self) -> List[Dict[str, Any]]:
        payload = await self._request("GET", "/alert/list")
        return [
            {
                "id": item.get("id"),
                "level": item.get("level"),
                "formatted": item.get("formatted"),
                "datetime": item.get("datetime"),
                "dismissed": item.get("dismissed", False),
            }
            for item in (payload or [])
            if isinstance(item, dict)
        ]

    async def get_job(self, job_id: int) -> Dict[str, Any]:
        payload = await self._request("GET", "/core/get_jobs", params={"id": job_id})
        if isinstance(payload, list):
            return payload[0] if payload else {}
        return payload or {}


truenas_client = TrueNASClient()
