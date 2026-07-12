from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOT = ROOT / "backend/churvox_boot.py"


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


text = BOOT.read_text(encoding="utf-8")
text = once(
    text,
    'VERSION = "churvox-boot-safe-entrypoint-20260712"',
    'VERSION = "churvox-command-fast-load-boot-20260713d"',
    "boot version",
)
text = once(
    text,
    '''BOOT_ERROR: BaseException | None = None
INNER_APP = None

try:
    import churvox_start

    INNER_APP = churvox_start.app
except BaseException as exc:  # keep Render up even when an import-time patch fails
    BOOT_ERROR = exc
    logging.critical("Churvox production app failed to import\\n%s", traceback.format_exc())
''',
    '''BOOT_ERROR: BaseException | None = None
PATCH_ERROR: BaseException | None = None
PATCH_STAGE = "not_started"
PATCH_INSTALLED = False
PATCH_ROUTES: dict[str, list[str]] = {}
INNER_APP = None


def _route_owners(inner_app) -> dict[str, list[str]]:
    wanted = {
        "/api/command/slips",
        "/api/command/scan",
        "/api/admin-brain/scan",
        "/api/paid-launch/backend-readiness",
    }
    owners: dict[str, list[str]] = {path: [] for path in sorted(wanted)}
    try:
        routes = list(getattr(getattr(inner_app, "router", None), "routes", []) or [])
    except Exception:
        routes = []
    for route in routes:
        path = str(getattr(route, "path", "") or "")
        if path not in wanted:
            continue
        endpoint = getattr(route, "endpoint", None)
        name = str(getattr(endpoint, "__name__", "") or getattr(route, "name", "") or "unknown")
        methods = sorted(str(method) for method in (getattr(route, "methods", set()) or set()))
        owners[path].append(f"{','.join(methods)}:{name}")
    return owners


try:
    PATCH_STAGE = "import_churvox_start"
    import churvox_start

    INNER_APP = churvox_start.app
    PATCH_STAGE = "force_install_fast_command"
    try:
        import churvox_paid_launch_live_patch
    except Exception:
        from backend import churvox_paid_launch_live_patch
    # Procfile boots this module. Reinstall after churvox_start has completed so
    # no legacy server route can shadow the paid-launch Command routes.
    churvox_paid_launch_live_patch.install(churvox_start.server, force=True)
    PATCH_ROUTES = _route_owners(INNER_APP)
    PATCH_INSTALLED = bool(
        any(owner.endswith(":fast_slips") for owner in PATCH_ROUTES.get("/api/command/slips", []))
        and any(owner.endswith(":fast_scan") for owner in PATCH_ROUTES.get("/api/command/scan", []))
        and any(owner.endswith(":admin_brain_bridge") for owner in PATCH_ROUTES.get("/api/admin-brain/scan", []))
    )
    PATCH_STAGE = "ready" if PATCH_INSTALLED else "route_owner_mismatch"
except BaseException as exc:  # keep Render up even when an import-time patch fails
    if INNER_APP is None:
        BOOT_ERROR = exc
        logging.critical("Churvox production app failed to import\\n%s", traceback.format_exc())
    else:
        PATCH_ERROR = exc
        PATCH_STAGE = "force_install_failed"
        PATCH_ROUTES = _route_owners(INNER_APP)
        logging.critical("Churvox Command fast-load patch failed to install\\n%s", traceback.format_exc())
''',
    "boot force install",
)
text = once(
    text,
    '''        path = scope.get("path", "")

        if method == "OPTIONS" and _allowed(origin):
''',
    '''        path = scope.get("path", "")

        if method == "GET" and path == "/api/command-fast-load/boot":
            payload = {
                "ok": bool(self.inner_app is not None and PATCH_INSTALLED),
                "success": bool(self.inner_app is not None and PATCH_INSTALLED),
                "ready": bool(self.inner_app is not None and PATCH_INSTALLED),
                "version": VERSION,
                "boot_ready": self.inner_app is not None,
                "patch_installed": PATCH_INSTALLED,
                "patch_stage": PATCH_STAGE,
                "patch_error_type": type(PATCH_ERROR).__name__ if PATCH_ERROR else None,
                "patch_error_fingerprint": _fingerprint(PATCH_ERROR) if PATCH_ERROR else "ready",
                "route_owners": PATCH_ROUTES,
                "checked_at": datetime.now(timezone.utc).isoformat(),
            }
            return await self._json(scope, send, 200, payload)

        if method == "OPTIONS" and _allowed(origin):
''',
    "public boot fingerprint",
)
BOOT.write_text(text, encoding="utf-8")
print("Applied real Procfile backend boot repair.")
