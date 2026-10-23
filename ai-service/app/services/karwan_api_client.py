"""Read-only client for the existing Express API. It never calls a write endpoint."""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Protocol

import httpx

from ..config import Settings
from ..errors import AppError

log = logging.getLogger("karwan-ai")

READ_TIMEOUT_SECONDS = 5.0
CACHE_SECONDS = 10.0
ENDPOINTS = {
    "requests": "/api/requests",
    "allocation": "/api/allocation",
    "depots": "/api/depots",
    "dashboard": "/api/dashboard",
    "deliveries": "/api/deliveries",
}


class KarwanLike(Protocol):
    async def fetch_context(self, request_id: str) -> dict[str, Any]: ...


class KarwanApiClient:
    def __init__(self, settings: Settings):
        self._base = settings.karwan_api_url
        self._cache: tuple[float, dict[str, Any]] | None = None

    async def _get(self, http: httpx.AsyncClient, name: str, path: str, request_id: str) -> Any:
        resp = await http.get(
            self._base + path,
            headers={"Accept": "application/json", "X-Request-Id": request_id},
        )
        resp.raise_for_status()
        body = resp.json()
        # Express envelope is { data: ... } - unwrap it.
        return body["data"] if isinstance(body, dict) and "data" in body else body

    async def fetch_context(self, request_id: str) -> dict[str, Any]:
        if not self._base:
            log.error("KARWAN_API_URL is not configured")
            raise AppError("KARWAN_API_UNAVAILABLE")
        now = time.monotonic()
        if self._cache and now - self._cache[0] < CACHE_SECONDS:
            return self._cache[1]
        try:
            async with httpx.AsyncClient(timeout=READ_TIMEOUT_SECONDS) as http:
                values = await asyncio.gather(
                    *(self._get(http, name, path, request_id) for name, path in ENDPOINTS.items())
                )
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            # Never let Gemini guess when facts are missing.
            log.error("Karwan API read failed: %s", type(exc).__name__)
            raise AppError("KARWAN_API_UNAVAILABLE") from None
        data = dict(zip(ENDPOINTS, values))
        self._cache = (now, data)
        return data
