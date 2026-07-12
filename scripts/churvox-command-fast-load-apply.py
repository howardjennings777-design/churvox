from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx"
API = ROOT / "frontend/src/churvox-office-lab/OfficeTeamCommandApi.js"
LIVE = ROOT / "backend/churvox_paid_launch_live_patch.py"
MIMIC = ROOT / "backend/churvox_command_human_mimic_routes.py"
GUARD = ROOT / "backend/churvox_command_human_mimic_guard_routes.py"
START = ROOT / "backend/churvox_start.py"


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


# Frontend: open the saved/current queue first; audit and full brain scan stay background work.
site = SITE.read_text(encoding="utf-8")
site = once(
    site,
    '  const [backendAudit, setBackendAudit] = useState({ source: "command-audit-unavailable", audit: [] });\n',
    '  const [backendAudit, setBackendAudit] = useState({ source: "command-audit-unavailable", audit: [] });\n  const [commandLoading, setCommandLoading] = useState(isOwnerApp);\n',
    "Command loading state",
)

start_marker = '  useEffect(() => {\n    let mounted = true;\n    const snapshotPromise = isOwnerApp ? Promise.resolve({ source: "skip", decisions: [] }) : fetchOfficeTeamSnapshot();'
start = site.find(start_marker)
if start < 0:
    raise RuntimeError("Initial Command load effect start not found")
end_marker = '  }, [isOwnerApp]);'
end = site.find(end_marker, start)
if end < 0:
    raise RuntimeError("Initial Command load effect end not found")
end += len(end_marker)
new_effect = '''  useEffect(() => {
    let mounted = true;
    let scanTimer = null;

    if (isOwnerApp) {
      setCommandLoading(true);
      setNotice("Opening the current Command queue. The full business check will continue behind it.");

      const loadCurrentQueue = async ({ afterScan = false, scan = null } = {}) => {
        try {
          const command = await fetchBackendCommandDecisions();
          if (!mounted) return null;
          const nextCommand = scan ? { ...command, scan } : command;
          setBackendCommand(nextCommand || { source: "command-unavailable", decisions: [] });
          setResolved({});
          if (!afterScan) {
            if (command?.decisions?.length) setNotice("Command is open. The latest saved owner decisions are ready while Churvox checks for anything new.");
            else if (command?.source === "backend-command-clear") setNotice("The current Command queue is clear. Churvox is checking the live records for anything new.");
            else setNotice("The current Command queue could not be confirmed. Churvox is retrying the live check behind the screen.");
          }
          return command;
        } catch (error) {
          if (mounted && !afterScan) setNotice(`Command queue could not load: ${error?.message || "connection issue"}. Nothing was changed.`);
          return null;
        } finally {
          if (mounted && !afterScan) setCommandLoading(false);
        }
      };

      const queuePromise = loadCurrentQueue();

      fetchBackendCommandAudit()
        .then((audit) => { if (mounted && audit) setBackendAudit(audit); })
        .catch(() => {});

      queuePromise.finally(() => {
        if (!mounted) return;
        scanTimer = window.setTimeout(async () => {
          try {
            const scan = await runBackendOfficeEngineScan();
            if (!mounted) return;
            const command = await loadCurrentQueue({ afterScan: true, scan });
            if (!mounted) return;
            const createdCount = Number(scan?.createdCount || 0);
            const existingCount = Number(scan?.existingCount || 0);
            const scanErrors = Array.isArray(scan?.scanErrors) ? scan.scanErrors : [];
            if (scanErrors.length) setNotice(`Current queue is open, but ${scanErrors.length} live data source${scanErrors.length === 1 ? "" : "s"} could not be checked. Do not treat an empty queue as all clear.`);
            else if (createdCount) setNotice(`Churvox prepared ${createdCount} new Command decision${createdCount === 1 ? "" : "s"}. Open the first slip and correct anything that is not right.`);
            else if (existingCount || command?.decisions?.length) setNotice(`${command?.decisions?.length || existingCount} Command decision${(command?.decisions?.length || existingCount) === 1 ? " is" : "s are"} waiting for you.`);
            else setNotice("Churvox checked the live records. Nothing needs your decision right now.");
          } catch (error) {
            if (mounted) setNotice(`The current queue is open. The background business check could not finish: ${error?.message || "connection issue"}. Nothing was changed.`);
          }
        }, 180);
      });

      return () => {
        mounted = false;
        if (scanTimer) window.clearTimeout(scanTimer);
      };
    }

    setCommandLoading(false);
    Promise.allSettled([fetchOfficeTeamSnapshot(), fetchOfficeTeamCommandDrafts()])
      .then(([snapshotResult, draftResult]) => {
        if (!mounted) return;
        const data = snapshotResult.status === "fulfilled" ? snapshotResult.value : { source: "starter", decisions: [] };
        const drafts = draftResult.status === "fulfilled" && Array.isArray(draftResult.value) ? draftResult.value : [];
        setSnapshot(data || { source: "starter", decisions: [] });
        setLiveDrafts(drafts);
        setResolved({});
        if (data?.source === "admin-brain") setNotice("Live office check loaded. Owner approval still comes first.");
        else if (drafts.length) setNotice("Live read-only records are prepared for Command. Nothing has been sent, synced or changed.");
        else if (data?.source === "clear-live") setNotice("Live check is clear. Command stays ready for the next decision.");
        else setNotice("Churvox control centre loaded. Live decisions appear when work needs owner approval.");
      })
      .catch((error) => mounted && setNotice(`Churvox control centre. Live check unavailable: ${error?.message || "connection issue"}`));

    return () => { mounted = false; };
  }, [isOwnerApp]);'''
site = site[:start] + new_effect + site[end:]

old_refresh = '''    const refreshBackendCommand = () => {
      Promise.allSettled([fetchBackendCommandDecisions(), fetchBackendCommandAudit()])
        .then(([commandResult, auditResult]) => {
          const command = commandResult.status === "fulfilled" ? commandResult.value : { source: "command-unavailable", decisions: [] };
          const audit = auditResult.status === "fulfilled" ? auditResult.value : { source: "command-audit-unavailable", audit: [] };
          setBackendCommand(command || { source: "command-unavailable", decisions: [] });
          setBackendAudit(audit || { source: "command-audit-unavailable", audit: [] });
          setResolved({});
          setNotice(command?.decisions?.length ? "Command refreshed. A prepared decision is waiting for you." : "Command refreshed. Nothing needs your decision right now.");
        })
        .catch(() => setNotice("Command refresh failed. No fallback decisions were shown and nothing changed."));
    };'''
new_refresh = '''    const refreshBackendCommand = () => {
      fetchBackendCommandDecisions()
        .then((command) => {
          setBackendCommand(command || { source: "command-unavailable", decisions: [] });
          setResolved({});
          setNotice(command?.decisions?.length ? "Command refreshed. A prepared decision is waiting for you." : "Command refreshed. Nothing needs your decision right now.");
        })
        .catch(() => setNotice("Command refresh failed. No fallback decisions were shown and nothing changed."));
      fetchBackendCommandAudit().then((audit) => { if (audit) setBackendAudit(audit); }).catch(() => {});
    };'''
site = once(site, old_refresh, new_refresh, "event refresh queue-first")
site = once(
    site,
    'backendAudit={backendAudit.audit || []} go={go}',
    'backendAudit={backendAudit.audit || []} commandLoading={commandLoading} go={go}',
    "Command loading prop",
)
site = once(
    site,
    'function Command({ tray, setTray, counts, pending, onAction }) {',
    'function Command({ tray, setTray, counts, pending, onAction, commandLoading }) {',
    "Command loading parameter",
)
site = once(
    site,
    '<div className="cvSiteDecisionGrid">{shown.length ? shown.map((item) => <Decision key={keyOf(item)} item={item} selected={keyOf(item) === keyOf(selected)} onOpen={() => setSelectedId(keyOf(item))} />) : <Empty title="No decisions in this tray" text="Routine work stays out of Command. A slip appears only when the owner is genuinely needed." />}</div>',
    '<div className="cvSiteDecisionGrid">{shown.length ? shown.map((item) => <Decision key={keyOf(item)} item={item} selected={keyOf(item) === keyOf(selected)} onOpen={() => setSelectedId(keyOf(item))} />) : commandLoading ? <Empty title="Opening current decisions" text="Churvox is loading the saved owner queue first. The full business check continues behind it." /> : <Empty title="No decisions in this tray" text="Routine work stays out of Command. A slip appears only when the owner is genuinely needed." />}</div>',
    "Command loading empty state",
)
SITE.write_text(site, encoding="utf-8")

# Frontend request deadlines: a background scan must never hold the Command page indefinitely.
api = API.read_text(encoding="utf-8")
old_retry = '''async function fetchWithRetry(url, options = {}, attempts = 3) {
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
}'''
new_retry = '''async function fetchWithRetry(url, options = {}, attempts = 2) {
  let lastError = null;
  const { timeoutMs = 8000, ...requestOptions } = options || {};
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(url, { ...requestOptions, signal: controller?.signal });
      const transient = response.status === 408 || response.status === 429 || response.status >= 500;
      if (!transient || attempt === attempts) return response;
      await wait(250 * attempt);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
      await wait(250 * attempt);
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }
  throw lastError || new Error("Live Churvox request failed.");
}'''
api = once(api, old_retry, new_retry, "bounded Command fetch")
api = once(
    api,
    'const response = await fetchWithRetry(`${base}/api/command/slips`, { credentials: "include", headers: authHeaders({ json: false }) });',
    'const response = await fetchWithRetry(`${base}/api/command/slips`, { credentials: "include", headers: authHeaders({ json: false }), timeoutMs: 6000 }, 2);',
    "queue timeout",
)
api = once(
    api,
    'const response = await fetchWithRetry(`${base}/api/command/audit`, { credentials: "include", headers: authHeaders({ json: false }) });',
    'const response = await fetchWithRetry(`${base}/api/command/audit`, { credentials: "include", headers: authHeaders({ json: false }), timeoutMs: 5000 }, 1);',
    "audit timeout",
)
api = once(
    api,
    '''    body: JSON.stringify({ source: "owner_workspace_load", prepared_only: true, owner_review_only: true }),
  });''',
    '''    body: JSON.stringify({ source: "owner_workspace_load", prepared_only: true, owner_review_only: true }),
    timeoutMs: 15000,
  }, 1);''',
    "scan timeout",
)
API.write_text(api, encoding="utf-8")

# Backend: route patch must be re-installable after the legacy server has finished registering routes.
live = LIVE.read_text(encoding="utf-8")
live = once(live, 'def install(module):\n', 'def install(module, force=False):\n', "force install signature")
live = once(live, '    if name in INSTALLED:\n        return\n', '    if name in INSTALLED and not force:\n        return\n', "force install guard")
old_fast_slips = '''    async def fast_slips(request: Request):
        user = await require_owner(request)
        await ensure_indexes()
        bid = business_id(user)
        query = {"business_id": bid, "status": {"$in": OPEN_STATUSES}}
        cursor = db.command_slips.find(query).sort("updated_at", -1).limit(100)
        rows = await bounded(cursor.to_list(length=100), 12, "Command queue")
        try:
            worker_count = await asyncio.wait_for(
                db.worker_field_slips.count_documents({"business_id": bid, "status": {"$nin": ["dismissed", "resolved", "closed", "archived"]}}),
                timeout=5,
            )
        except Exception:
            worker_count = 0
        return {
            "success": True,
            "source": "paid-launch-fast-command",
            "slips": [_safe(row, ObjectId) for row in rows],
            "worker_field_slip_count": int(worker_count),
            "scan_complete": True,
            "scan_errors": [],
            "safety": SAFETY,
        }'''
new_fast_slips = '''    async def fast_slips(request: Request):
        user = await require_owner(request)
        bid = business_id(user)
        if not index_ready:
            try:
                asyncio.create_task(ensure_indexes())
            except Exception:
                pass
        query = {"business_id": bid, "status": {"$in": OPEN_STATUSES}}
        cursor = db.command_slips.find(query, {"audit": 0}).sort("updated_at", -1).limit(50)
        try:
            cursor = cursor.max_time_ms(2500)
        except Exception:
            pass
        rows = await bounded(cursor.to_list(length=50), 5, "Command queue")
        return {
            "success": True,
            "source": "paid-launch-fast-command-v2",
            "slips": [_safe(row, ObjectId) for row in rows],
            "scan_complete": True,
            "scan_errors": [],
            "safety": SAFETY,
        }'''
live = once(live, old_fast_slips, new_fast_slips, "fast queue query")
live = once(
    live,
    '''    async def fast_scan(request: Request, payload: Dict[str, Any] = Body(default_factory=dict)):
        await require_owner(request)
        await ensure_indexes()
        if guarded_scan is None:''',
    '''    async def fast_scan(request: Request, payload: Dict[str, Any] = Body(default_factory=dict)):
        await require_owner(request)
        if not index_ready:
            try:
                asyncio.create_task(ensure_indexes())
            except Exception:
                pass
        if guarded_scan is None:''',
    "nonblocking scan indexes",
)
live = once(live, 'bounded(guarded_scan(request=request, payload=payload or {}), 25, "Command brain scan")', 'bounded(guarded_scan(request=request, payload=payload or {}), 18, "Command brain scan")', "scan deadline")
live = once(live, '"churvox-paid-launch-live-backend-20260713a"', '"churvox-command-fast-load-backend-20260713b"', "backend marker")
LIVE.write_text(live, encoding="utf-8")

# Human mimic: parallel collection reads and bounded concurrent slip storage.
mimic = MIMIC.read_text(encoding="utf-8")
mimic = once(mimic, 'from collections import Counter\n', 'import asyncio\nfrom collections import Counter\n', "mimic asyncio import")
old_scoped = '''    async def scoped_rows(user, collection_names, limit=120, errors=None):
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
        return rows[:limit]'''
new_scoped = '''    async def scoped_rows(user, collection_names, limit=120, errors=None):
        _, _, query = business_scope(user)

        async def load_collection(name):
            try:
                cursor = db[name].find(query)
                try:
                    cursor = cursor.sort("updated_at", -1)
                except Exception:
                    cursor = cursor.sort("_id", -1)
                found = await asyncio.wait_for(cursor.limit(limit).to_list(limit), timeout=5)
                return [{**dict(item), "_collection": name} for item in found]
            except Exception as exc:
                if errors is not None:
                    errors.append(f"{name}: {exc.__class__.__name__}")
                return []

        batches = await asyncio.gather(*(load_collection(name) for name in collection_names))
        rows = []
        for batch in batches:
            rows.extend(batch)
        return rows[:limit]'''
mimic = once(mimic, old_scoped, new_scoped, "parallel collection reads")
old_reads = '''        jobs = await scoped_rows(user, ["jobs", "job_records", "appointments", "bookings"], 180, scan_errors)
        invoices = await scoped_rows(user, ["invoices", "invoice_records"], 140, scan_errors)
        clients = await scoped_rows(user, ["clients", "customers"], 100, scan_errors)
        messages = await scoped_rows(user, ["messages", "client_messages", "inbox_messages"], 100, scan_errors)
        timers = await scoped_rows(user, ["time_entries", "timers", "worker_time_entries", "timesheets"], 100, scan_errors)
        settings = await scoped_rows(user, ["businesses", "business_settings", "settings"], 30, scan_errors)'''
new_reads = '''        jobs, invoices, clients, messages, timers, settings = await asyncio.gather(
            scoped_rows(user, ["jobs", "job_records", "appointments", "bookings"], 180, scan_errors),
            scoped_rows(user, ["invoices", "invoice_records"], 140, scan_errors),
            scoped_rows(user, ["clients", "customers"], 100, scan_errors),
            scoped_rows(user, ["messages", "client_messages", "inbox_messages"], 100, scan_errors),
            scoped_rows(user, ["time_entries", "timers", "worker_time_entries", "timesheets"], 100, scan_errors),
            scoped_rows(user, ["businesses", "business_settings", "settings"], 30, scan_errors),
        )'''
mimic = once(mimic, old_reads, new_reads, "parallel mimic areas")
old_store = '''        created = []
        existing = []
        seen = set()
        for doc in candidates[:100]:
            key = (doc["source_type"], doc["action_type"], doc["source_id"])
            if key in seen:
                continue
            seen.add(key)
            item, old = await insert_once(user, doc)
            if item:
                created.append(item)
            elif old:
                existing.append(old)'''
new_store = '''        created = []
        existing = []
        seen = set()
        unique_docs = []
        for doc in candidates[:100]:
            key = (doc["source_type"], doc["action_type"], doc["source_id"])
            if key in seen:
                continue
            seen.add(key)
            unique_docs.append(doc)

        semaphore = asyncio.Semaphore(8)

        async def store(doc):
            async with semaphore:
                return await insert_once(user, doc)

        stored = await asyncio.gather(*(store(doc) for doc in unique_docs))
        for item, old in stored:
            if item:
                created.append(item)
            elif old:
                existing.append(old)'''
mimic = once(mimic, old_store, new_store, "parallel mimic storage")
MIMIC.write_text(mimic, encoding="utf-8")

# Guard cleanup categories can run together; each remains business-scoped and owner-controlled.
guard = GUARD.read_text(encoding="utf-8")
guard = once(guard, 'from datetime import datetime, timezone\n', 'import asyncio\nfrom datetime import datetime, timezone\n', "guard asyncio import")
old_guard = '''        retired_old = await retire_old_engine_slips(user_business_id)
        retired_ids = await retire_outbound_reply_false_positives(user_business_id)
        retired_ids.update(await retire_false_completion_slips(user_business_id))
        retired_ids.update(await retire_early_or_invalid_payment_followups(user_business_id))
        retired_ids.update(await retire_stale_briefs(user_business_id))'''
new_guard = '''        retired_old, outbound_ids, completion_ids, payment_ids, stale_ids = await asyncio.gather(
            retire_old_engine_slips(user_business_id),
            retire_outbound_reply_false_positives(user_business_id),
            retire_false_completion_slips(user_business_id),
            retire_early_or_invalid_payment_followups(user_business_id),
            retire_stale_briefs(user_business_id),
        )
        retired_ids = set().union(outbound_ids, completion_ids, payment_ids, stale_ids)'''
guard = once(guard, old_guard, new_guard, "parallel guard cleanup")
GUARD.write_text(guard, encoding="utf-8")

# Guaranteed final route precedence after server.py has fully finished importing.
start_text = START.read_text(encoding="utf-8")
anchor = '''except Exception as exc:
    try:
        server.logger.warning("[Churvox] Business system suite entrypoint install skipped: %s", exc)
    except Exception:
        pass

PLAN_ALIASES = {'''
replacement = '''except Exception as exc:
    try:
        server.logger.warning("[Churvox] Business system suite entrypoint install skipped: %s", exc)
    except Exception:
        pass

try:
    try:
        import churvox_paid_launch_live_patch
    except Exception:
        from backend import churvox_paid_launch_live_patch
    # server.py has now finished registering legacy routes, so this final forced
    # install owns Command scan/slips/Admin Brain precedence in production.
    churvox_paid_launch_live_patch.install(server, force=True)
except Exception as exc:
    try:
        server.logger.warning("[Churvox] Final Command fast-load install skipped: %s", exc)
    except Exception:
        pass

PLAN_ALIASES = {'''
start_text = once(start_text, anchor, replacement, "guaranteed final live patch install")
START.write_text(start_text, encoding="utf-8")

print("Applied Command queue-first and backend fast-load repair.")
