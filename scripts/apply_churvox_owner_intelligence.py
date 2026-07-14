#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise RuntimeError(f"Could not find {label}: {old[:140]!r}")
    return text.replace(old, new, 1)


def patch_site() -> None:
    path = "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx"
    text = read(path)
    text = replace_once(text,
        'import OfficeTeamTodayScreen from "./OfficeTeamTodayScreen";\n',
        'import OfficeTeamTodayScreen from "./OfficeTeamTodayScreen";\nimport OfficeTeamIntelligence from "./OfficeTeamIntelligence";\n',
        "Intelligence screen import")
    text = replace_once(text,
        '["today", "Today"], ["command", "Command"], ["work", "Work"]',
        '["today", "Today"], ["intelligence", "Intelligence"], ["command", "Command"], ["work", "Work"]',
        "lab screen list")
    text = replace_once(text,
        '"": "today", dashboard: "today", home: "today", hub: "today", "smart-hub": "today",\n',
        '"": "today", dashboard: "today", home: "today", hub: "today", "smart-hub": "today", intelligence: "intelligence", insights: "intelligence", brain: "intelligence",\n',
        "Intelligence screen aliases")
    text = replace_once(text,
        'if (screen === "today") return <OfficeTeamTodayScreen {...props} />;\n',
        'if (screen === "today") return <OfficeTeamTodayScreen {...props} />;\n  if (screen === "intelligence") return <OfficeTeamIntelligence appMode={appMode} go={props.go} />;\n',
        "Intelligence screen route")
    write(path, text)


def patch_navigation() -> None:
    path = "frontend/src/churvox-office-lab/OfficeTeamOwnerNavigation.jsx"
    text = read(path)
    text = replace_once(text,
        '  ["today", "Today"],\n  ["command", "Command"],\n',
        '  ["today", "Today"],\n  ["intelligence", "Intelligence"],\n  ["command", "Command"],\n',
        "owner Intelligence navigation")
    write(path, text)


def patch_access() -> None:
    path = "frontend/src/churvox-office-lab/OfficeTeamAccess.js"
    text = read(path)
    text = replace_once(text,
        '  today: "planday",\n  command: "command",\n',
        '  today: "planday",\n  intelligence: "intelligence",\n  command: "command",\n',
        "owner Intelligence feature map")
    text = replace_once(text,
        '  "smart-hub": "today",\n  cockpit: "command",\n',
        '  "smart-hub": "today",\n  intelligence: "intelligence",\n  insights: "intelligence",\n  brain: "intelligence",\n  cockpit: "command",\n',
        "owner Intelligence aliases")
    write(path, text)


def patch_plan_rules() -> None:
    path = "frontend/src/churvox-fresh/planRules.js"
    text = read(path)
    text = replace_once(text,
        '  planday: { area: "Smart Hub", open: "start", reason: "Every plan gets the daily owner cockpit for jobs, admin, priorities and follow-ups." },\n',
        '  planday: { area: "Smart Hub", open: "start", reason: "Every plan gets the daily owner cockpit for jobs, admin, priorities and follow-ups." },\n  intelligence: { area: "Churvox Intelligence", open: "start", reason: "Every paid plan gets Money Left Behind, Job Truth Receipt, Promise Memory and Voice-to-Business." },\n  workerproofcoach: { area: "Worker Proof Coach", open: "crew", reason: "Crew adds trade-aware proof coaching inside the worker flow." },\n  weekexplain: { area: "Explain My Week", open: "operator", reason: "Operator adds deeper owner analysis with record-level evidence." },\n  approvalbudget: { area: "Approval Budget", open: "operator", reason: "Operator lets owners control what interrupts them and what waits for a batch." },\n  scenarios: { area: "What Happens If?", open: "command", reason: "Command adds safe business simulations without changing live records." },\n',
        "Intelligence plan rules")
    text = replace_once(text,
        '  { area: "Settings, plans and help", start: "Included", crew: "Included", operator: "Included", command: "Included" },\n',
        '  { area: "Settings, plans and help", start: "Included", crew: "Included", operator: "Included", command: "Included" },\n  { area: "Money Left Behind, Job Truth Receipt, Promise Memory and Voice-to-Business", start: "Included", crew: "Included", operator: "Included", command: "Included" },\n  { area: "Worker Proof Coach", start: "Locked", crew: "Included", operator: "Included", command: "Included" },\n  { area: "Explain My Week and Approval Budget", start: "Locked", crew: "Locked", operator: "Included", command: "Included" },\n  { area: "What Happens If? simulations", start: "Locked", crew: "Locked", operator: "Locked", command: "Included" },\n',
        "Intelligence plan matrix")
    write(path, text)


def patch_plans_screen() -> None:
    path = "frontend/src/churvox-office-lab/OfficeTeamPlansScreen.jsx"
    text = read(path)
    text = replace_once(text,
        'included: ["Clients", "Work tracking", "Basic office queue", "Quotes and invoices", "Owner review before send"],',
        'included: ["Clients", "Work tracking", "Basic office queue", "Quotes and invoices", "Owner review before send", "Money Left Behind", "Job Truth Receipt", "Promise Memory", "Voice-to-Business"],',
        "Start intelligence inclusions")
    text = replace_once(text,
        'locked: ["Workers and team runs", "Timers", "Command queue", "Office Team review", "Xero/accounting approval", "Payroll", "Command Growth Pack"],',
        'locked: ["Workers and team runs", "Timers", "Worker Proof Coach", "Explain My Week", "Approval Budget", "What Happens If?", "Command queue", "Office Team review", "Xero/accounting approval", "Payroll", "Command Growth Pack"],',
        "Start intelligence locks")
    text = replace_once(text,
        'included: ["Everything in Start", "Team / workers", "Timers", "Daily run view", "Worker updates", "Simple staff visibility"],',
        'included: ["Everything in Start", "Team / workers", "Timers", "Daily run view", "Worker updates", "Simple staff visibility", "Worker Proof Coach"],',
        "Crew proof coach inclusion")
    text = replace_once(text,
        'locked: ["Full Command queue", "Office Team review", "Advanced approvals", "Xero/accounting sync approval", "Payroll controls", "Command Growth Pack"],',
        'locked: ["Explain My Week", "Approval Budget", "What Happens If?", "Full Command queue", "Office Team review", "Advanced approvals", "Xero/accounting sync approval", "Payroll controls", "Command Growth Pack"],',
        "Crew intelligence locks")
    text = replace_once(text,
        'included: ["Everything in Crew", "Command queue", "Office Team review", "Follow-ups and reminders", "Worker-to-owner updates", "Prepared admin cards"],',
        'included: ["Everything in Crew", "Command queue", "Office Team review", "Follow-ups and reminders", "Worker-to-owner updates", "Prepared admin cards", "Explain My Week", "Approval Budget"],',
        "Operator intelligence inclusions")
    text = replace_once(text,
        'locked: ["Advanced Command", "Accounting export/sync approval", "50 active team members", "Command Growth Pack", "Full owner approval desk capacity"],',
        'locked: ["What Happens If?", "Advanced Command", "Accounting export/sync approval", "50 active team members", "Command Growth Pack", "Full owner approval desk capacity"],',
        "Operator scenario lock")
    text = replace_once(text,
        'included: ["Everything in Operator", "Advanced Command", "Accounting export/sync approval", "50 active team members", "Full owner approval desk", "More capacity"],',
        'included: ["Everything in Operator", "Advanced Command", "Accounting export/sync approval", "50 active team members", "Full owner approval desk", "More capacity", "What Happens If?"],',
        "Command scenario inclusion")
    write(path, text)


def patch_tier_guard() -> None:
    path = "backend/churvox_feature_tier_paid_launch_guard.py"
    text = read(path)
    anchor = 'FEATURE_PREFIXES = (\n'
    addition = '''FEATURE_PREFIXES = (\n    (FeatureAccess("owner_intelligence_scenarios", "What Happens If?", "command"), (\n        "/owner-intelligence/what-if",\n    )),\n    (FeatureAccess("owner_intelligence_operator", "Owner Intelligence analysis", "operator"), (\n        "/owner-intelligence/explain-my-week", "/owner-intelligence/approval-budget",\n    )),\n    (FeatureAccess("worker_proof_coach", "Worker Proof Coach", "crew"), (\n        "/owner-intelligence/worker-proof-coach",\n    )),\n    (FeatureAccess("owner_intelligence_core", "Churvox Intelligence core", "start"), (\n        "/owner-intelligence/features", "/owner-intelligence/summary",\n        "/owner-intelligence/money-left-behind", "/owner-intelligence/job-truth-receipts",\n        "/owner-intelligence/promise-memory", "/owner-intelligence/voice-to-business",\n    )),\n'''
    text = replace_once(text, anchor, addition, "backend intelligence tier prefixes")
    write(path, text)


def patch_hook(path: str) -> None:
    text = read(path)
    text = replace_once(text,
        '                try:\n                    from churvox_job_done_routes import build_job_done_router\n                except Exception:\n                    from backend.churvox_job_done_routes import build_job_done_router\n',
        '                try:\n                    from churvox_job_done_routes import build_job_done_router\n                except Exception:\n                    from backend.churvox_job_done_routes import build_job_done_router\n                try:\n                    from churvox_owner_intelligence_routes import build_owner_intelligence_router\n                except Exception:\n                    from backend.churvox_owner_intelligence_routes import build_owner_intelligence_router\n',
        f"{path} intelligence router import")
    text = replace_once(text,
        '                if not job_done_get_mounted:\n                    original_include_router(self, build_job_done_router(local_db, local_get_current_user, ObjectId), prefix="/api")\n',
        '                if not job_done_get_mounted:\n                    original_include_router(self, build_job_done_router(local_db, local_get_current_user, ObjectId), prefix="/api")\n                # Churvox Intelligence reads the same business records and remains owner-controlled.\n                intelligence_summary_mounted = any(\n                    getattr(route, "path", "") == "/api/owner-intelligence/summary"\n                    and "GET" in set(getattr(route, "methods", set()) or set())\n                    for route in self.router.routes\n                )\n                if not intelligence_summary_mounted:\n                    original_include_router(self, build_owner_intelligence_router(local_db, local_get_current_user, ObjectId), prefix="/api")\n',
        f"{path} intelligence router mount")
    text = replace_once(text,
        '                if not job_done_get_mounted or not job_done_marker_mounted:\n                    raise RuntimeError("Job Done routes did not mount during Churvox startup")\n                self.state.churvox_job_done_routes_installed = True\n',
        '                intelligence_summary_mounted = any(\n                    getattr(route, "path", "") == "/api/owner-intelligence/summary"\n                    and "GET" in set(getattr(route, "methods", set()) or set())\n                    for route in self.router.routes\n                )\n                intelligence_marker_mounted = any(\n                    getattr(route, "path", "") == "/api/owner-intelligence/marker"\n                    and "GET" in set(getattr(route, "methods", set()) or set())\n                    for route in self.router.routes\n                )\n                if not job_done_get_mounted or not job_done_marker_mounted:\n                    raise RuntimeError("Job Done routes did not mount during Churvox startup")\n                if not intelligence_summary_mounted or not intelligence_marker_mounted:\n                    raise RuntimeError("Churvox Intelligence routes did not mount during startup")\n                self.state.churvox_job_done_routes_installed = True\n                self.state.churvox_owner_intelligence_routes_installed = True\n',
        f"{path} intelligence mount verification")
    write(path, text)


def patch_worker() -> None:
    path = "frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx"
    text = read(path)
    text = replace_once(text,
        'import { createBackendWorkerPaymentRequest, createBackendWorkerUpdateRequest } from "./OfficeTeamCommandApi";\n',
        'import { createBackendWorkerPaymentRequest, createBackendWorkerUpdateRequest } from "./OfficeTeamCommandApi";\nimport { checkWorkerProofCoach, fetchWorkerProofCoach } from "./OfficeTeamIntelligenceApi";\n',
        "worker proof API import")
    text = replace_once(text,
        '  const [proofBusy, setProofBusy] = useState(false);\n  const [showAllJobs, setShowAllJobs] = useState(false);\n',
        '  const [proofBusy, setProofBusy] = useState(false);\n  const [proofCoach, setProofCoach] = useState({ checklist: [] });\n  const [proofConfirmations, setProofConfirmations] = useState({});\n  const [proofCoachBusy, setProofCoachBusy] = useState(false);\n  const [showAllJobs, setShowAllJobs] = useState(false);\n',
        "worker proof state")
    text = replace_once(text,
        '  const showMe = viewKey === "settings";\n\n  async function recordWorkerStep(step) {\n',
        '''  const showMe = viewKey === "settings";\n  const proofChecklist = Array.isArray(proofCoach?.checklist) ? proofCoach.checklist : [];\n  const proofConfirmationIds = Object.entries(proofConfirmations).filter(([, checked]) => checked).map(([id]) => id);\n\n  React.useEffect(() => {\n    let active = true;\n    setProofConfirmations({});\n    if (!jobId) {\n      setProofCoach({ checklist: [] });\n      return () => { active = false; };\n    }\n    fetchWorkerProofCoach(jobId)\n      .then((result) => { if (active) setProofCoach(result?.success === false ? { checklist: [] } : result); })\n      .catch(() => { if (active) setProofCoach({ checklist: [] }); });\n    return () => { active = false; };\n  }, [jobId]);\n\n  async function recordWorkerStep(step) {\n''',
        "worker proof loading effect")
    text = replace_once(text,
        '    if (!hasWork || stepBusy) {\n',
        '    if (!hasWork || stepBusy || proofCoachBusy) {\n',
        "worker busy guard")
    text = replace_once(text,
        '    setStepBusy(step);\n    const endpoint = stepEndpoint(step);\n',
        '''    if (step === "Complete" && proofChecklist.length) {\n      setProofCoachBusy(true);\n      try {\n        const proofResult = await checkWorkerProofCoach(jobId, {\n          photo_names: proofNames,\n          note: String(note || "").trim(),\n          confirmations: proofConfirmationIds,\n          owner_review_only: true,\n        });\n        if (!proofResult?.check?.ready) {\n          const missing = (proofResult?.check?.missing || []).map((item) => item.label).filter(Boolean);\n          addTrail(`Finish blocked: ${missing.join(" · ") || "required proof is still missing"}.`);\n          return;\n        }\n      } catch (error) {\n        addTrail(`Finish blocked: Worker Proof Coach could not confirm the required evidence. ${error?.message || "Check the connection and retry."}`);\n        return;\n      } finally {\n        setProofCoachBusy(false);\n      }\n    }\n    setStepBusy(step);\n    const endpoint = stepEndpoint(step);\n''',
        "worker completion proof gate")
    text = replace_once(text,
        '<div className="cvWorkerRouteSteps">{statusSteps.map((step) => <button key={step} type="button" disabled={!hasWork || Boolean(stepBusy)} onClick={() => recordWorkerStep(step)}>{stepBusy === step ? "Saving…" : step}</button>)}</div>',
        '<div className="cvWorkerRouteSteps">{statusSteps.map((step) => <button key={step} type="button" disabled={!hasWork || Boolean(stepBusy) || proofCoachBusy} onClick={() => recordWorkerStep(step)}>{proofCoachBusy && step === "Complete" ? "Checking proof…" : stepBusy === step ? "Saving…" : step}</button>)}</div>',
        "worker proof-aware step buttons")
    proof_old = '          <section className="cvWorkerRouteProof"><label className="cvWorkerProofPicker">Photo proof<input type="file" accept="image/*" capture="environment" multiple disabled={!hasWork || proofBusy} onChange={(event) => setProofFiles(event.target.files)} /></label><button type="button" disabled={!hasWork || proofBusy} onClick={sendProof}>{proofBusy ? "Sending…" : proofNames.length ? `Send ${proofNames.length} proof item${proofNames.length === 1 ? "" : "s"}` : "Send proof note"}</button><button type="button" disabled={!hasWork || updateBusy} onClick={() => sendBossUpdate(`Timer needs office review for ${title}. ${note || "Please check the recorded time."}`)}>Timer note</button></section>'
    proof_new = '''          {proofChecklist.length ? <section className="cvWorkerProofCoach" aria-label="Worker Proof Coach"><span>Worker Proof Coach</span><h3>Before you leave</h3><p>Churvox checks the proof needed for this exact job. Complete stays blocked until required evidence is present.</p><div>{proofChecklist.map((item) => item.proof === "confirmation" ? <label key={item.id}><input type="checkbox" checked={Boolean(proofConfirmations[item.id])} onChange={(event) => setProofConfirmations((current) => ({ ...current, [item.id]: event.target.checked }))} /><span>{item.label}</span></label> : <article key={item.id} className={(item.proof === "photo" ? proofNames.length > 0 : String(note || "").trim()) ? "ready" : "missing"}><b>{item.proof === "photo" ? proofNames.length > 0 ? "Photo ready" : "Photo needed" : String(note || "").trim() ? "Note ready" : "Note needed"}</b><span>{item.label}</span></article>)}</div><small>{proofCoach?.industry ? `Checklist: ${proofCoach.industry}` : "Trade-aware checklist"}</small></section> : null}\n          <section className="cvWorkerRouteProof"><label className="cvWorkerProofPicker">Photo proof<input type="file" accept="image/*" capture="environment" multiple disabled={!hasWork || proofBusy} onChange={(event) => setProofFiles(event.target.files)} /></label><button type="button" disabled={!hasWork || proofBusy} onClick={sendProof}>{proofBusy ? "Sending…" : proofNames.length ? `Send ${proofNames.length} proof item${proofNames.length === 1 ? "" : "s"}` : "Send proof note"}</button><button type="button" disabled={!hasWork || updateBusy} onClick={() => sendBossUpdate(`Timer needs office review for ${title}. ${note || "Please check the recorded time."}`)}>Timer note</button></section>'''
    text = replace_once(text, proof_old, proof_new, "worker proof coach UI")
    write(path, text)

    css_path = "frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.css"
    css = read(css_path)
    if ".cvWorkerProofCoach" not in css:
        css += '''\n.cvWorkerProofCoach{display:grid;gap:10px;padding:16px;border:1px solid #edb98f;border-radius:16px;background:#fff7ef}.cvWorkerProofCoach>span{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#c55208}.cvWorkerProofCoach h3,.cvWorkerProofCoach p{margin:0}.cvWorkerProofCoach p,.cvWorkerProofCoach small{color:#636b76;line-height:1.45}.cvWorkerProofCoach>div{display:grid;gap:8px}.cvWorkerProofCoach label,.cvWorkerProofCoach article{display:flex;align-items:flex-start;gap:9px;padding:10px;border:1px solid #dddfe2;border-radius:12px;background:#fff}.cvWorkerProofCoach label input{margin-top:3px}.cvWorkerProofCoach article{display:grid}.cvWorkerProofCoach article b{font-size:11px;text-transform:uppercase;color:#9d3d00}.cvWorkerProofCoach article.ready{border-color:#b5d9c0;background:#f2fbf5}.cvWorkerProofCoach article.ready b{color:#1d6b35}\n'''
    write(css_path, css)


def patch_package() -> None:
    path = "frontend/package.json"
    package = json.loads(read(path))
    spec = "tests/e2e/churvox-owner-intelligence.spec.js"
    for name in ("test:ui:full", "test:ui:desktop", "test:ui:mobile"):
        command = package["scripts"][name]
        if spec not in command:
            marker = " tests/e2e/churvox-job-done-reality.spec.js"
            if marker not in command:
                raise RuntimeError(f"Could not add Intelligence spec to {name}")
            command = command.replace(marker, marker + " " + spec, 1)
            package["scripts"][name] = command
    write(path, json.dumps(package, indent=2) + "\n")


def patch_workflows() -> None:
    path = ".github/workflows/churvox-build-check.yml"
    text = read(path)
    text = replace_once(text,
        '      - name: Paid account boundary contract\n        run: python3 scripts/churvox-paid-account-boundary-contract.py\n',
        '      - name: Paid account boundary contract\n        run: python3 scripts/churvox-paid-account-boundary-contract.py\n\n      - name: Churvox Intelligence contract\n        run: python3 scripts/churvox-owner-intelligence-contract.py\n',
        "Build Check intelligence contract")
    write(path, text)

    path = ".github/workflows/churvox-paid-launch-gate.yml"
    text = read(path)
    text = replace_once(text,
        '            backend.test_churvox_job_done_reality \\\n            scripts.test_worker_static_bypass_absent\n',
        '            backend.test_churvox_job_done_reality \\\n            backend.test_churvox_owner_intelligence \\\n            scripts.test_worker_static_bypass_absent\n',
        "Paid Launch intelligence test")
    write(path, text)


def patch_contract() -> None:
    path = "scripts/churvox-owner-intelligence-contract.py"
    text = read(path)
    text = text.replace('require(component, "simulation_only: true", "frontend simulation-only flag")', 'require(api, "simulation_only: true", "frontend simulation-only flag")')
    text = text.replace('require(component, "owner_review_only: true", "frontend prepared-only owner flag")', 'require(api, "owner_review_only: true", "frontend prepared-only owner flag")')
    text = text.replace('build_workflow = read(".github/workflows/build-check.yml")', 'build_workflow = read(".github/workflows/churvox-build-check.yml")')
    write(path, text)


def main() -> None:
    patch_site()
    patch_navigation()
    patch_access()
    patch_plan_rules()
    patch_plans_screen()
    patch_tier_guard()
    patch_hook("backend/usercustomize.py")
    patch_hook("usercustomize.py")
    patch_worker()
    patch_package()
    patch_workflows()
    patch_contract()
    print("Churvox Intelligence wiring applied successfully.")


if __name__ == "__main__":
    main()
