"""Churvox production runtime guard.

This module keeps the existing FastAPI application intact and adds small,
production-safe memory protections around it. Render should start this module
instead of importing ``server:app`` directly.
"""

from __future__ import annotations

import ctypes
import gc
import os
import threading
from datetime import datetime, timezone
from typing import Any

import server as _server

app = _server.app

# The wrapper compiles the legacy server from source. Those boot-only objects are
# not needed after import and otherwise stay attached to the module for the life
# of the process.
for _boot_name in ("source", "code", "spec"):
    _server.__dict__.pop(_boot_name, None)

RUNTIME_VERSION = "churvox-runtime-memory-guard-v1"
GC_EVERY_REQUESTS = max(10, int(os.getenv("CHURVOX_MEMORY_GC_EVERY", "75")))
TRIM_THRESHOLD_MB = max(128, int(os.getenv("CHURVOX_MEMORY_TRIM_MB", "340")))

_state_lock = threading.Lock()
_request_count = 0
_trim_count = 0
_last_trim_at: str | None = None
_last_before_mb: float | None = None
_last_after_mb: float | None = None


def _rss_mb() -> float | None:
    """Return current resident memory on Linux without adding a dependency."""
    try:
        with open("/proc/self/statm", "r", encoding="utf-8") as handle:
            resident_pages = int(handle.read().split()[1])
        return round(resident_pages * os.sysconf("SC_PAGE_SIZE") / 1024 / 1024, 1)
    except Exception:
        return None


def _malloc_trim() -> bool:
    """Ask glibc to return unused heap pages to the operating system."""
    try:
        libc = ctypes.CDLL("libc.so.6")
        trim = libc.malloc_trim
        trim.argtypes = [ctypes.c_size_t]
        trim.restype = ctypes.c_int
        return bool(trim(0))
    except Exception:
        return False


def _collect_and_trim(*, force: bool = False) -> dict[str, Any]:
    global _trim_count, _last_trim_at, _last_before_mb, _last_after_mb

    before = _rss_mb()
    due_by_count = _request_count > 0 and _request_count % GC_EVERY_REQUESTS == 0
    due_by_memory = before is not None and before >= TRIM_THRESHOLD_MB
    if not (force or due_by_count or due_by_memory):
        return {"ran": False, "rss_mb": before}

    collected = gc.collect()
    trimmed = _malloc_trim()
    after = _rss_mb()

    _trim_count += 1
    _last_trim_at = datetime.now(timezone.utc).isoformat()
    _last_before_mb = before
    _last_after_mb = after
    return {
        "ran": True,
        "collected": collected,
        "malloc_trim": trimmed,
        "before_mb": before,
        "after_mb": after,
    }


if not getattr(app.state, "churvox_memory_guard_installed", False):
    app.state.churvox_memory_guard_installed = True

    @app.middleware("http")
    async def churvox_runtime_memory_guard(request, call_next):
        global _request_count

        response = await call_next(request)
        with _state_lock:
            _request_count += 1
            _collect_and_trim()

        if request.url.path.startswith("/api/health"):
            response.headers["X-Churvox-Runtime"] = RUNTIME_VERSION
        return response

    async def runtime_memory_health():
        with _state_lock:
            return {
                "ok": True,
                "service": "churvox-backend",
                "runtime": RUNTIME_VERSION,
                "rss_mb": _rss_mb(),
                "trim_threshold_mb": TRIM_THRESHOLD_MB,
                "gc_every_requests": GC_EVERY_REQUESTS,
                "request_count": _request_count,
                "trim_count": _trim_count,
                "last_trim_at": _last_trim_at,
                "last_before_mb": _last_before_mb,
                "last_after_mb": _last_after_mb,
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }

    app.add_api_route(
        "/api/health/runtime-memory",
        runtime_memory_health,
        methods=["GET"],
        include_in_schema=False,
    )

# Release temporary allocations made while importing the legacy app and patches.
with _state_lock:
    _collect_and_trim(force=True)
