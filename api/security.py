"""Lightweight access-control and traffic-shaping for the Sagar-Drishti API.

* **API-key gate** — when ``Settings.api_key`` is set, every ``/api/`` request must
  present ``X-API-Key``. Public by default so the demo console needs no key.
* **Fixed-window rate limiting** — in-process per-client-IP buckets. Reading
  endpoints share a generous quota; compute-heavy endpoints (drift / attribution /
  verification) get a stricter one. Documented caveat: this is per-instance, not
  shared; swap for Redis for a multi-node fleet.
"""
from __future__ import annotations

import time
from collections import defaultdict
from typing import Any

from fastapi import Depends, HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from api.config import get_settings

_COMPUTE_PREFIXES = ("/api/v1/drift", "/api/v1/attribution", "/api/v1/evidence/verify")


def require_api_key(request: Request) -> None:
    """FastAPI dependency: enforce X-API-Key only when an API key is configured."""
    settings = get_settings()
    if not settings.api_key:
        return
    supplied = request.headers.get("x-api-key")
    if supplied != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid X-API-Key",
            headers={"WWW-Authenticate": "ApiKey"},
        )


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window per-IP limiter with separate budgets for compute endpoints."""

    def __init__(self, app: Any) -> None:
        super().__init__(app)
        self._buckets: dict[str, tuple[int, int]] = defaultdict(lambda: (0, 0))

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path
        if not path.startswith("/api"):
            return await call_next(request)

        settings = get_settings()
        client = request.client.host if request.client else "unknown"
        now = int(time.monotonic())

        window_start, count = self._buckets[client]
        rate = (
            settings.rate_limit_compute_per_minute
            if path.startswith(_COMPUTE_PREFIXES)
            else settings.rate_limit_requests_per_minute
        )
        window = 60

        if now - window_start >= window:
            window_start, count = now, 0
            self._buckets[client] = (window_start, count)

        if count >= rate:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Rate limit exceeded. Slow down and retry shortly."},
                headers={"Retry-After": str(window - (now - window_start))},
            )

        self._buckets[client] = (window_start, count + 1)
        return await call_next(request)


# Convenience alias used by tests / docs.
secure_dependencies = [Depends(require_api_key)]