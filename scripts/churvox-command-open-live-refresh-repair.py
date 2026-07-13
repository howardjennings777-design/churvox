from __future__ import annotations

import json
from pathlib import Path

BUILD = "churvox-command-open-live-refresh-v11-20260713"


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected source block not found in {path}: {old[:220]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


site = "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx"
needle = '''  useEffect(() => {
    if (!isOwnerApp) return () => {};
    const refreshBackendCommand = () => {
      fetchBackendCommandDecisions({ timeoutMs: 8000, attempts: 2, force: true })
        .then((command) => {
          setBackendCommand(command || { source: "command-unavailable", decisions: [] });
          setResolved({});
          setNotice(command?.decisions?.length ? "Command refreshed. A prepared decision is waiting for you." : "Command refreshed. Nothing needs your decision right now.");
        })
        .catch(() => setNotice("Command refresh failed. No fallback or browser-only decisions are being shown. Nothing changed."));
      fetchBackendCommandAudit().then((audit) => { if (audit) setBackendAudit(audit); }).catch(() => {});
    };
    window.addEventListener(BACKEND_COMMAND_EVENT, refreshBackendCommand);
    return () => window.removeEventListener(BACKEND_COMMAND_EVENT, refreshBackendCommand);
  }, [isOwnerApp]);
'''
replacement = '''  useEffect(() => {
    if (!isOwnerApp) return () => {};
    const refreshBackendCommand = () => {
      fetchBackendCommandDecisions({ timeoutMs: 8000, attempts: 2, force: true })
        .then((command) => {
          setBackendCommand(command || { source: "command-unavailable", decisions: [] });
          setResolved({});
          setNotice(command?.decisions?.length ? "Command refreshed. A prepared decision is waiting for you." : "Command refreshed. Nothing needs your decision right now.");
        })
        .catch(() => setNotice("Command refresh failed. No fallback or browser-only decisions are being shown. Nothing changed."));
      fetchBackendCommandAudit().then((audit) => { if (audit) setBackendAudit(audit); }).catch(() => {});
    };
    window.addEventListener(BACKEND_COMMAND_EVENT, refreshBackendCommand);
    return () => window.removeEventListener(BACKEND_COMMAND_EVENT, refreshBackendCommand);
  }, [isOwnerApp]);

  useEffect(() => {
    if (!isOwnerApp || screen !== "command") return () => {};
    let active = true;
    let inFlight = false;
    const refreshOpenCommand = async () => {
      if (!active || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const command = await fetchBackendCommandDecisions({ timeoutMs: 8000, attempts: 2, force: true });
        if (!active) return;
        setBackendCommand(command || { source: "command-unavailable", decisions: [] });
        setResolved({});
        if (typeof window !== "undefined") window.__CHURVOX_COMMAND_LIVE_REFRESH__ = {
          build: "churvox-command-open-live-refresh-v11-20260713",
          refreshedAt: Date.now(),
          count: command?.decisions?.length || 0,
          source: command?.source || "unknown",
        };
      } catch (error) {
        if (active && typeof window !== "undefined") window.__CHURVOX_COMMAND_LIVE_REFRESH__ = {
          build: "churvox-command-open-live-refresh-v11-20260713",
          failedAt: Date.now(),
          error: error?.message || "connection issue",
        };
      } finally {
        inFlight = false;
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "hidden") refreshOpenCommand();
    };
    refreshOpenCommand();
    const timer = window.setInterval(refreshOpenCommand, 5000);
    window.addEventListener("focus", refreshOpenCommand);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshOpenCommand);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [isOwnerApp, screen]);
'''
replace_once(site, needle, replacement)

marker_path = Path("frontend/public/churvox-paid-launch-build.json")
marker = json.loads(marker_path.read_text(encoding="utf-8"))
marker["build"] = BUILD
marker["command_live_refresh"] = BUILD
includes = list(marker.get("includes") or [])
for value in [
    "worker-problems-ranked-before-routine-command-items",
    "command-screen-immediate-live-refresh",
    "command-screen-bounded-five-second-refresh",
    "command-screen-focus-and-visibility-refresh",
]:
    if value not in includes:
        includes.append(value)
marker["includes"] = includes
marker_path.write_text(json.dumps(marker, indent=2) + "\n", encoding="utf-8")

contract_path = Path("scripts/churvox-worker-field-command-bridge-contract.cjs")
contract = contract_path.read_text(encoding="utf-8")
if "const site = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx'" not in contract:
    contract = contract.replace(
        "const workerUi = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx', 'utf8');\n",
        "const workerUi = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx', 'utf8');\nconst site = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx', 'utf8');\n",
        1,
    )
needle_contract = "  ['worker problems rank ahead of routine Command items', field.includes('worker_field_problem') && marker.includes('worker-problems-ranked-before-routine-command-items')],\n"
addition = needle_contract + "  ['open Command refreshes live without rerunning scan', site.includes('screen !== \\\"command\\\"') && site.includes('window.setInterval(refreshOpenCommand, 5000)') && site.includes('force: true') && marker.includes('command-screen-bounded-five-second-refresh')],\n"
if "open Command refreshes live without rerunning scan" not in contract:
    if needle_contract not in contract:
        raise SystemExit("Expected worker priority contract entry not found")
    contract = contract.replace(needle_contract, addition, 1)
contract_path.write_text(contract, encoding="utf-8")

print("CHURVOX_COMMAND_OPEN_LIVE_REFRESH_REPAIR_APPLIED")
