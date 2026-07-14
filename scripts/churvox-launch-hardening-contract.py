from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def require(source, needle, label):
    if needle not in source:
        raise AssertionError(f"Missing {label}: {needle}")


backend = text("backend/churvox_launch_hardening_routes.py")
root_shim = text("churvox_launch_hardening_routes.py")
frontend = text("frontend/src/churvox-office-lab/OfficeTeamLaunchHardening.jsx")
api = text("frontend/src/churvox-office-lab/OfficeTeamLaunchHardeningApi.js")
offline = text("frontend/src/churvox-office-lab/workerOfflineQueue.js")
worker = text("frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx")
portal = text("frontend/src/pages/public/PublicClientPortalPage.js")
lab = text("frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx")
nav = text("frontend/src/churvox-office-lab/OfficeTeamOwnerNavigation.jsx")
access = text("frontend/src/churvox-office-lab/OfficeTeamAccess.js")
plans = text("frontend/src/churvox-fresh/planRules.js")
intelligence = text("frontend/src/churvox-office-lab/OfficeTeamIntelligence.jsx")
package = text("frontend/package.json")
usercustomize = text("usercustomize.py")
backend_usercustomize = text("backend/usercustomize.py")
build_workflow = text(".github/workflows/churvox-build-check.yml")
paid_workflow = text(".github/workflows/churvox-paid-launch-gate.yml")

for needle, label in [
    ('LAUNCH_HARDENING_BUILD = "churvox-go-live-trust-v1-20260714"', "backend build marker"),
    ('@router.post("/launch-hardening/imports/preview")', "import preview"),
    ('@router.post("/launch-hardening/imports/commit")', "owner-approved import"),
    ('@router.post("/launch-hardening/worker-sync/batch")', "worker offline batch sync"),
    ('idempotency_key', "sync idempotency"),
    ('@router.get("/launch-hardening/portability/download")', "portability download"),
    ('zipfile.ZipFile', "portability ZIP"),
    ('@router.post("/launch-hardening/recovery/{receipt_id}/undo")', "recovery undo"),
    ('@router.get("/launch-hardening/evidence/{evidence_id}")', "evidence drawer"),
    ('@router.post("/public/client-portal/{token}/request-change")', "portal change request"),
    ('install_permission_middleware', "server permission middleware"),
]:
    require(backend, needle, label)

require(root_shim, "build_launch_hardening_router", "root route shim")
require(frontend, 'data-go-live-trust="v1"', "Go Live owner workspace")
for label in ("Golden Journey", "Bring My Business In", "Permissions & security", "Customer portal", "Recovery & undo", "Portability Pack", "Measured outcomes", "Offline worker sync"):
    require(frontend, label, f"Go Live tab {label}")
require(api, "/api/launch-hardening/portability/download", "frontend portability download")
require(offline, "indexedDB.open", "IndexedDB offline storage")
require(offline, "idempotency_key", "offline idempotency keys")
require(worker, "queueWorkerEvent", "worker queue integration")
require(worker, "Waiting to sync", "worker visible sync state")
require(worker, "Needs attention", "worker conflict state")
if worker.count('aria-label="Worker Proof Coach"') != 1:
    raise AssertionError("Worker Proof Coach must render exactly once")
if worker.count('step === "Complete" && proofChecklist.length') != 1:
    raise AssertionError("Worker completion proof check must run exactly once")
for label in ("Request a change", "Request more work", "Leave feedback"):
    require(portal, label, f"public portal action {label}")
require(lab, 'screen === "golive"', "Go Live route")
require(nav, '["golive", "Go Live"]', "Go Live navigation")
require(access, 'golive: "golive"', "Go Live access map")
for rule in ('golive: { area: "Go Live & Trust", open: "start"', 'offlinesync: { area: "Offline Worker Sync", open: "crew"', 'portability: { area: "Business Portability Pack", open: "start"'):
    require(plans, rule, f"plan rule {rule}")
require(intelligence, "Evidence Drawer", "Intelligence Evidence Drawer")
require(package, "churvox-launch-hardening.spec.js", "full UI hardening test")
for source, name in ((usercustomize, "root startup"), (backend_usercustomize, "backend startup")):
    require(source, "build_launch_hardening_router", f"{name} hardening mount")
    require(source, "install_permission_middleware", f"{name} permission middleware")
require(build_workflow, "churvox-launch-hardening-contract.py", "build workflow trust contract")
require(paid_workflow, "backend.test_churvox_launch_hardening", "paid launch backend trust tests")
require(paid_workflow, "churvox-launch-hardening.spec.js", "paid launch browser trust tests")

print("Churvox Go Live & Trust contract passed.")
