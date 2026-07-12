#!/usr/bin/env python3
from pathlib import Path


def patch(path, old, new, label):
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        print(f"already patched: {label}")
        return
    if old not in text:
        raise SystemExit(f"missing anchor for {label}: {path}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"patched: {label}")


def ensure_contains(path, needle, label):
    text = Path(path).read_text(encoding="utf-8")
    if needle not in text:
        raise SystemExit(f"missing required result for {label}: {needle}")


backend_import_anchor = '''                try:
                    from churvox_command_human_mimic_marker_routes import build_command_human_mimic_marker_router
'''
backend_import_new = '''                try:
                    from churvox_paid_launch_readiness_routes import build_paid_launch_readiness_router
                except Exception:
                    from backend.churvox_paid_launch_readiness_routes import build_paid_launch_readiness_router
                try:
                    from churvox_command_human_mimic_marker_routes import build_command_human_mimic_marker_router
'''
patch("backend/usercustomize.py", backend_import_anchor, backend_import_new, "backend paid-launch route import")

backend_register_anchor = '''                original_include_router(self, build_command_compat_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                # Public marker proves that the human mimic build reached the live backend.
'''
backend_register_new = '''                original_include_router(self, build_command_compat_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                # Paid-launch read routes are owner-only and never pay, file, send or sync.
                original_include_router(self, build_paid_launch_readiness_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                # Public marker proves that the human mimic build reached the live backend.
'''
patch("backend/usercustomize.py", backend_register_anchor, backend_register_new, "backend paid-launch route registration")

root_old_import = '''                try:
                    from churvox_command_mimic_intelligence_routes import build_command_mimic_intelligence_router
                except Exception:
                    from backend.churvox_command_mimic_intelligence_routes import build_command_mimic_intelligence_router
'''
root_new_import = '''                try:
                    from churvox_paid_launch_readiness_routes import build_paid_launch_readiness_router
                except Exception:
                    from backend.churvox_paid_launch_readiness_routes import build_paid_launch_readiness_router
                try:
                    from churvox_command_human_mimic_marker_routes import build_command_human_mimic_marker_router
                except Exception:
                    from backend.churvox_command_human_mimic_marker_routes import build_command_human_mimic_marker_router
                try:
                    from churvox_command_human_mimic_guard_routes import build_command_human_mimic_guard_router
                except Exception:
                    from backend.churvox_command_human_mimic_guard_routes import build_command_human_mimic_guard_router
                try:
                    from churvox_command_human_mimic_routes import build_command_human_mimic_router
                except Exception:
                    from backend.churvox_command_human_mimic_routes import build_command_human_mimic_router
                try:
                    from churvox_command_mimic_intelligence_routes import build_command_mimic_intelligence_router
                except Exception:
                    from backend.churvox_command_mimic_intelligence_routes import build_command_mimic_intelligence_router
'''
patch("usercustomize.py", root_old_import, root_new_import, "root current mimic and paid-launch imports")

root_old_register = '''                original_include_router(self, build_command_compat_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                # Register the real mimic intelligence scanner before the older Command scanner.
                original_include_router(self, build_command_mimic_intelligence_router(local_db, local_get_current_user, ObjectId), prefix="/api")
'''
root_new_register = '''                original_include_router(self, build_command_compat_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                original_include_router(self, build_paid_launch_readiness_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                original_include_router(self, build_command_human_mimic_marker_router(), prefix="/api")
                original_include_router(self, build_command_human_mimic_guard_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                original_include_router(self, build_command_human_mimic_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                original_include_router(self, build_command_mimic_intelligence_router(local_db, local_get_current_user, ObjectId), prefix="/api")
'''
patch("usercustomize.py", root_old_register, root_new_register, "root current mimic and paid-launch registration")

patch(
    "backend/churvox_worker_login_bridge_patch.py",
    "from datetime import datetime, timezone\n",
    "from datetime import datetime, timezone\nimport asyncio\n",
    "worker login asyncio import",
)

worker_lookup_old = '''    async def collections():
        try:
            return set(await db.list_collection_names())
        except Exception:
            return set(WORKER_COLLECTIONS)

    async def find_worker_by_email(email):
        names = await collections()
        checks = [
            {"email": email},
            {"user_email": email},
            {"worker_email": email},
            {"staff_email": email},
            {"contact_email": email},
        ]
        for collection_name in WORKER_COLLECTIONS:
            if collection_name not in names:
                continue
            for query in checks:
                try:
                    doc = await db[collection_name].find_one(query)
                except Exception:
                    doc = None
                if doc:
                    return collection_name, doc
        return None, None
'''
worker_lookup_new = '''    async def collections():
        last_error = None
        for attempt in range(3):
            try:
                names = await asyncio.wait_for(db.list_collection_names(), timeout=6)
                return set(names), None
            except Exception as exc:
                last_error = exc
                if attempt < 2:
                    await asyncio.sleep(0.35 * (attempt + 1))
        return set(WORKER_COLLECTIONS), last_error

    async def find_worker_by_email(email):
        checks = [
            {"email": email},
            {"user_email": email},
            {"worker_email": email},
            {"staff_email": email},
            {"contact_email": email},
        ]
        last_error = None
        for attempt in range(3):
            names, collection_error = await collections()
            last_error = collection_error or last_error
            for collection_name in WORKER_COLLECTIONS:
                if collection_name not in names:
                    continue
                for query in checks:
                    try:
                        doc = await asyncio.wait_for(db[collection_name].find_one(query), timeout=6)
                    except Exception as exc:
                        last_error = exc
                        doc = None
                    if doc:
                        return collection_name, doc, None
            if attempt < 2:
                await asyncio.sleep(0.35 * (attempt + 1))
        return None, None, last_error
'''
patch("backend/churvox_worker_login_bridge_patch.py", worker_lookup_old, worker_lookup_new, "worker login bounded database retries")

worker_call_old = '''        collection_name, worker_doc = await find_worker_by_email(email)
        if not worker_doc:
            if response:
                response.status_code = 401
            return {"success": False, "detail": "Worker account not found."}
'''
worker_call_new = '''        collection_name, worker_doc, lookup_error = await find_worker_by_email(email)
        if not worker_doc:
            if lookup_error is not None:
                if response:
                    response.status_code = 503
                return {"success": False, "detail": "Worker login service is temporarily unavailable. Please try again."}
            if response:
                response.status_code = 401
            return {"success": False, "detail": "Worker account not found."}
'''
patch("backend/churvox_worker_login_bridge_patch.py", worker_call_old, worker_call_new, "worker login outage classification")

worker_annotations_old = '''    for path in ["/api/worker/auth/login", "/api/auth/worker-login"]:
        remove_route(app, path, "POST")
        app.add_api_route(path, worker_login, methods=["POST"])
'''
worker_annotations_new = '''    # Nested functions plus postponed annotations otherwise become query parameters in FastAPI.
    worker_login.__annotations__ = {
        "payload": dict,
        "response": Response,
        "request": Request,
    }

    for path in ["/api/worker/auth/login", "/api/auth/worker-login"]:
        remove_route(app, path, "POST")
        app.add_api_route(path, worker_login, methods=["POST"])
'''
patch("backend/churvox_worker_login_bridge_patch.py", worker_annotations_old, worker_annotations_new, "worker login FastAPI annotations")

mimic_done_old = '''    def is_done(row):
        return any(word in status_of(row) for word in ["complete", "completed", "done", "finished", "closed"])
'''
mimic_done_new = '''    def is_done(row):
        status = status_of(row)
        normalized = status.replace("_", " ").replace("-", " ").replace("/", " ")
        words = {word for word in normalized.split() if word}
        if "incomplete" in words or ("not" in words and ("complete" in words or "completed" in words)):
            return False
        return bool(words & {"complete", "completed", "done", "finished", "closed"}) or status in {"complete", "completed", "done", "finished", "closed"}
'''
patch("backend/churvox_command_human_mimic_routes.py", mimic_done_old, mimic_done_new, "exact mimic completion matching")

mimic_rows_old = '''    async def scoped_rows(user, collection_names, limit=120):
        _, _, query = business_scope(user)
        rows = []
        for name in collection_names:
            try:
                cursor = db[name].find(query)
                try:
                    cursor = cursor.sort("updated_at", -1)
                except Exception:
                    cursor = cursor.sort("_id", -1)
                found = await cursor.limit(limit).to_list(limit)
                rows.extend([{**dict(item), "_collection": name} for item in found])
            except Exception:
                continue
        return rows[:limit]
'''
mimic_rows_new = '''    async def scoped_rows(user, collection_names, limit=120, errors=None):
        _, _, query = business_scope(user)
        rows = []
        for name in collection_names:
            try:
                cursor = db[name].find(query)
                try:
                    cursor = cursor.sort("updated_at", -1)
                except Exception:
                    cursor = cursor.sort("_id", -1)
                found = await cursor.limit(limit).to_list(limit)
                rows.extend([{**dict(item), "_collection": name} for item in found])
            except Exception as exc:
                if errors is not None:
                    errors.append(f"{name}: {exc.__class__.__name__}")
        return rows[:limit]
'''
patch("backend/churvox_command_human_mimic_routes.py", mimic_rows_old, mimic_rows_new, "mimic read error collection")

mimic_scan_old = '''        user = await require_owner(request)
        jobs = await scoped_rows(user, ["jobs", "job_records", "appointments", "bookings"], 180)
        invoices = await scoped_rows(user, ["invoices", "invoice_records"], 140)
        clients = await scoped_rows(user, ["clients", "customers"], 100)
        messages = await scoped_rows(user, ["messages", "client_messages", "inbox_messages"], 100)
        timers = await scoped_rows(user, ["time_entries", "timers", "worker_time_entries", "timesheets"], 100)
        settings = await scoped_rows(user, ["businesses", "business_settings", "settings"], 30)
'''
mimic_scan_new = '''        user = await require_owner(request)
        scan_errors = []
        jobs = await scoped_rows(user, ["jobs", "job_records", "appointments", "bookings"], 180, scan_errors)
        invoices = await scoped_rows(user, ["invoices", "invoice_records"], 140, scan_errors)
        clients = await scoped_rows(user, ["clients", "customers"], 100, scan_errors)
        messages = await scoped_rows(user, ["messages", "client_messages", "inbox_messages"], 100, scan_errors)
        timers = await scoped_rows(user, ["time_entries", "timers", "worker_time_entries", "timesheets"], 100, scan_errors)
        settings = await scoped_rows(user, ["businesses", "business_settings", "settings"], 30, scan_errors)
'''
patch("backend/churvox_command_human_mimic_routes.py", mimic_scan_old, mimic_scan_new, "mimic scan health capture")

mimic_return_old = '''            "role_counts": counts,
            "slips": created,
            "existing": existing,
            "message": f"Human-like mimic intelligence checked live records and prepared {len(created)} evidence-backed Command slip(s).",
            "safety": SAFE_RESULT,
'''
mimic_return_new = '''            "role_counts": counts,
            "slips": created,
            "existing": existing,
            "scan_complete": not scan_errors,
            "scan_errors": list(dict.fromkeys(scan_errors)),
            "message": (
                f"Human-like mimic intelligence checked live records and prepared {len(created)} evidence-backed Command slip(s)."
                if not scan_errors
                else f"Human mimic prepared {len(created)} Command slip(s), but part of the live record scan failed. Review the scan warning before relying on a clear queue."
            ),
            "safety": SAFE_RESULT,
'''
patch("backend/churvox_command_human_mimic_routes.py", mimic_return_old, mimic_return_new, "mimic scan health response")

command_api = "frontend/src/churvox-office-lab/OfficeTeamCommandApi.js"
command_helper_anchor = '''function authHeaders({ json = true } = {}) {
  const t = token();
  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}
'''
command_helper_new = command_helper_anchor + '''
function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const transient = response.status === 408 || response.status === 429 || response.status >= 500;
      if (!transient || attempt === attempts) return response;
      await wait(350 * attempt);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
      await wait(350 * attempt);
    }
  }
  throw lastError || new Error("Live Churvox request failed.");
}
'''
patch(command_api, command_helper_anchor, command_helper_new, "Command transient retry helper")

for label, old, new in [
    ("Command decisions retry", 'const response = await fetch(`${base}/api/command/slips`,', 'const response = await fetchWithRetry(`${base}/api/command/slips`,'),
    ("Command audit retry", 'const response = await fetch(`${base}/api/command/audit`,', 'const response = await fetchWithRetry(`${base}/api/command/audit`,'),
    ("Command scan retry", 'const response = await fetch(`${base}/api/command/scan`,', 'const response = await fetchWithRetry(`${base}/api/command/scan`,'),
]:
    patch(command_api, old, new, label)

command_return_old = '''    roleCounts: body?.role_counts || {},
    message: body?.message || body?.safety || SAFE_RESULT,
'''
command_return_new = '''    roleCounts: body?.role_counts || {},
    scanComplete: body?.scan_complete !== false,
    scanErrors: Array.isArray(body?.scan_errors) ? body.scan_errors : [],
    guard: body?.guard || "",
    message: body?.message || body?.safety || SAFE_RESULT,
'''
patch(command_api, command_return_old, command_return_new, "Command scan health mapping")

site_path = "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx"
site_notice_old = '''        const createdCount = Number(command?.scan?.createdCount || 0);
        const existingCount = Number(command?.scan?.existingCount || 0);
        if (isOwnerApp && createdCount) setNotice(`Churvox prepared ${createdCount} new Command decision${createdCount === 1 ? "" : "s"}. Open the first slip and correct anything that is not right.`);
'''
site_notice_new = '''        const createdCount = Number(command?.scan?.createdCount || 0);
        const existingCount = Number(command?.scan?.existingCount || 0);
        const scanErrors = Array.isArray(command?.scan?.scanErrors) ? command.scan.scanErrors : [];
        if (isOwnerApp && scanErrors.length) setNotice(`Command check incomplete. ${scanErrors.length} live data source${scanErrors.length === 1 ? "" : "s"} could not be read, so do not treat an empty queue as all clear.`);
        else if (isOwnerApp && createdCount) setNotice(`Churvox prepared ${createdCount} new Command decision${createdCount === 1 ? "" : "s"}. Open the first slip and correct anything that is not right.`);
'''
patch(site_path, site_notice_old, site_notice_new, "owner visible brain health warning")

rows_api = "frontend/src/churvox-office-lab/officeTeamApi.js"
safe_read_old = '''async function safeRead(path) {
  const base = host();
  if (!base) return { ok: false, locked: true, status: 0, body: {}, path };
  const response = await fetch(`${base}${path}`, {
    credentials: "include",
    headers: authHeaders({ json: false }),
  });
  const body = await response.json().catch(() => ({}));
  return {
    ok: response.ok && body?.success !== false,
    locked: response.status === 401 || response.status === 403,
    status: response.status,
    body,
    path,
  };
}
'''
safe_read_new = '''async function safeRead(path) {
  const base = host();
  if (!base) return { ok: false, locked: true, status: 0, body: {}, path };
  let last = { ok: false, locked: false, status: 0, body: {}, path, error: "network" };
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${base}${path}`, {
        credentials: "include",
        headers: authHeaders({ json: false }),
      });
      const body = await response.json().catch(() => ({}));
      last = {
        ok: response.ok && body?.success !== false,
        locked: response.status === 401 || response.status === 403,
        status: response.status,
        body,
        path,
      };
      const transient = response.status === 408 || response.status === 429 || response.status >= 500;
      if (!transient || attempt === 3) return last;
    } catch (error) {
      last = { ok: false, locked: false, status: 0, body: {}, path, error: error?.message || "network" };
      if (attempt === 3) return last;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 300 * attempt));
  }
  return last;
}
'''
patch(rows_api, safe_read_old, safe_read_new, "owner live row transient retries")

app_path = "frontend/src/App.js"
app_marker_old = 'const CHURVOX_DEPLOYMENT_FINGERPRINT = "churvox-auth-session-authority-20260713d";'
app_marker_new = 'const CHURVOX_DEPLOYMENT_FINGERPRINT = "churvox-paid-launch-readiness-20260713a";'
patch(app_path, app_marker_old, app_marker_new, "paid launch deployment marker")

for path, needle, label in [
    ("backend/usercustomize.py", "build_paid_launch_readiness_router", "backend route registration"),
    ("usercustomize.py", "build_command_human_mimic_guard_router", "root current mimic route"),
    ("backend/churvox_worker_login_bridge_patch.py", "Worker login service is temporarily unavailable", "worker outage response"),
    ("backend/churvox_command_human_mimic_routes.py", '"scan_complete": not scan_errors', "brain health response"),
    (command_api, "fetchWithRetry", "Command retries"),
    (site_path, "Command check incomplete", "brain health UI"),
    (app_path, "churvox-paid-launch-readiness-20260713a", "deployment marker"),
]:
    ensure_contains(path, needle, label)
