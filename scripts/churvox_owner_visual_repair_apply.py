from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file = Path(path)
    text = file.read_text()
    if new in text:
        print(f"already patched: {label}")
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    file.write_text(text.replace(old, new, 1))
    print(f"patched: {label}")


replace_once(
    "frontend/src/App.js",
    '<main className="min-h-screen bg-[#f5f2ec] p-6 text-center text-slate-950 grid place-items-center">',
    '<main className="cvAuthLoading min-h-screen bg-[#f5f2ec] p-6 text-center text-slate-950 grid place-items-center">',
    "auth loading marker",
)
replace_once(
    "frontend/src/App.js",
    """function FreshBusinessRoute({ children }) {
  const { user, loading, isWorker, isPayroll, hasAppAccess } = useAuth();
  if (loading) return <Spinner />;""",
    """function FreshBusinessRoute({ children }) {
  const { user, loading, isWorker, isPayroll, hasAppAccess } = useAuth();
  if (loading && !user) return <Spinner />;""",
    "owner renders verified snapshot while auth refreshes",
)
replace_once(
    "frontend/src/App.js",
    """function WorkerRoute({ children }) {
  const { user, loading, isWorker, normalizedRole } = useAuth();
  if (loading) return <Spinner />;""",
    """function WorkerRoute({ children }) {
  const { user, loading, isWorker, normalizedRole } = useAuth();
  if (loading && !user) return <Spinner />;""",
    "worker renders verified snapshot while auth refreshes",
)
replace_once(
    "frontend/src/App.js",
    '    workerLogout: "cvWorkerLogout",\n',
    '    workerLogout: "cvWorkerLogout",\n    visualRepair: "churvox-owner-visual-repair-20260713e",\n',
    "visual repair deployment fingerprint",
)

replace_once(
    "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx",
    'import "./OfficeTeamVisionPolish.css";\n',
    'import "./OfficeTeamVisionPolish.css";\nimport "./OfficeTeamVisualRepair.css";\n',
    "final visual repair stylesheet",
)
replace_once(
    "frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx",
    '<button type="button" className="cvSiteLogout" onClick={logoutOffice}>Log out</button>',
    '<button type="button" className="cvSiteLogout" data-churvox-native-logout="true" aria-label="Log out of Churvox" onClick={logoutOffice}>Log out</button>',
    "native owner logout marker",
)

replace_once(
    "frontend/src/churvox-office-lab/OfficeTeamOwnerNavigation.jsx",
    "{visibleOffice.length ? (",
    "{(visibleOffice.length || visibleUtility.length) ? (",
    "More menu remains available for utility pages",
)
nav_path = Path("frontend/src/churvox-office-lab/OfficeTeamOwnerNavigation.jsx")
nav_text = nav_path.read_text()
if 'className="cvOwnerMoreUtility"' not in nav_text:
    anchor = '                  <small>Only tools included in the current Churvox plan are shown.</small>'
    block = """                  {visibleUtility.length ? (
                    <section className="cvOwnerMoreUtility" aria-label="Account and help">
                      <span>Account and help</span>
                      {visibleUtility.map(([key, label]) => (
                        <button key={key} type="button" role="menuitem" className={screen === key ? "active" : ""} onClick={() => navigate(key)}>{label}</button>
                      ))}
                    </section>
                  ) : null}
"""
    if nav_text.count(anchor) != 1:
        raise SystemExit(f"mobile utility insertion: expected one anchor, found {nav_text.count(anchor)}")
    nav_path.write_text(nav_text.replace(anchor, block + anchor, 1))
    print("patched: mobile utility pages inside More menu")
else:
    print("already patched: mobile utility pages inside More menu")

replace_once(
    "frontend/src/runtime/churvoxVisibleLogoutRuntime.js",
    "    min-height: 38px;\n",
    "    min-height: 44px;\n",
    "legacy logout touch target",
)
replace_once(
    "frontend/src/runtime/churvoxVisibleLogoutRuntime.js",
    "    .cv3Account .cvxVisibleLogout { min-height: 34px; padding: 8px 10px; font-size: 11px; }",
    "    .cv3Account .cvxVisibleLogout { min-height: 44px; padding: 8px 10px; font-size: 11px; }",
    "mobile legacy logout touch target",
)
replace_once(
    "frontend/src/runtime/churvoxVisibleLogoutRuntime.js",
    """  const button = removeDuplicates();
  const path = window.location.pathname || '';""",
    """  const button = removeDuplicates();
  const nativeLogout = document.querySelector('.cvSiteLogout, .cvWorkerLogout, .cvWorkerRouteLogout, [data-churvox-native-logout="true"]');
  const authenticating = document.querySelector('.cvAuthLoading');
  if (nativeLogout || authenticating) {
    button?.remove();
    return;
  }
  const path = window.location.pathname || '';""",
    "remove injected logout when native control exists",
)

for path in ["backend/churvox_plan_usage_routes.py", "backend/churvox_plan_usage_guard_patch.py"]:
    file = Path(path)
    text = file.read_text()
    if "from starlette.requests import Request as StarletteRequest" not in text:
        anchor = "import sys\n"
        if text.count(anchor) != 1:
            raise SystemExit(f"{path}: import anchor mismatch")
        text = text.replace(anchor, anchor + "\nfrom starlette.requests import Request as StarletteRequest\n", 1)
    text = text.replace('    Request = getattr(module, "Request", None)\n', "")
    text = text.replace(" or Request is None", "")
    text = text.replace("request: Request", "request: StarletteRequest")
    if "request: Request" in text or 'Request = getattr(module, "Request", None)' in text:
        raise SystemExit(f"{path}: stale Request injection remains")
    file.write_text(text)
    print(f"patched FastAPI request injection: {path}")

CSS = r""".cvOwnerReady .cvSiteLogout,
.cvSafeControlButtons button {
  min-height: 44px;
}

.cvSafeControlButtons button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 13px;
  border-radius: 12px;
}

.cvBrainIntake h3 { color: #fff8ed; }
.cvBrainIntake > p { color: rgba(255, 248, 237, .76); }

.cvQuoteStage > div {
  max-height: 440px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

.cvOwnerMoreUtility { display: none; }

@media (max-width: 760px) {
  .cvOwnerReady .cvSiteTopbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    min-height: 0;
    padding: 10px 12px 12px;
  }
  .cvOwnerReady .cvSiteTopbar .cvOfficeBrand { min-width: 0; max-width: calc(100vw - 118px); }
  .cvOwnerReady .cvSiteTopbar .cvOfficeBrand img { width: 36px; height: 36px; }
  .cvOwnerReady .cvSiteTopbar .cvOfficeBrand span { display: none; }
  .cvOwnerReady .cvOwnerNavigation { grid-column: 1 / -1; width: 100%; min-width: 0; }
  .cvOwnerReady .cvOwnerMainNavigation { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; }
  .cvOwnerReady .cvOwnerPrimaryNav { width: 100%; min-width: 0; padding: 4px !important; gap: 5px !important; }
  .cvOwnerReady .cvOwnerPrimaryNav button,
  .cvOwnerReady .cvOwnerMore > button { min-height: 44px; padding: 0 13px; }
  .cvOwnerReady .cvOwnerUtilityNav { display: none !important; }
  .cvOwnerReady .cvSiteLogout {
    grid-column: 2;
    grid-row: 1;
    width: auto;
    min-width: 78px;
    min-height: 44px;
    padding: 0 14px;
    margin: 0;
  }
  .cvOwnerMoreUtility {
    display: grid;
    gap: 7px;
    padding-top: 10px;
    margin-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, .14);
  }
  .cvOwnerMoreUtility > span {
    color: rgba(255, 248, 237, .68);
    font-size: .62rem;
    font-weight: 950;
    letter-spacing: .12em;
    text-transform: uppercase;
  }
  .cvOwnerMoreUtility button { min-height: 48px; justify-content: flex-start; border-radius: 14px; }
}

@media (max-width: 640px) {
  .cvCorePageHero { padding: 18px 16px; }
  .cvCorePageHero h2 { font-size: clamp(2rem, 11vw, 3rem); }
  .cvCorePageHero p { font-size: .88rem; line-height: 1.42; }
  .cvCoreHeroStats {
    display: flex;
    overflow-x: auto;
    gap: 8px;
    padding-bottom: 4px;
    scroll-snap-type: x proximity;
  }
  .cvCoreHeroStats article {
    flex: 0 0 112px;
    min-height: 78px;
    padding: 13px;
    scroll-snap-align: start;
  }
  .cvCoreWorkingDock > div:first-child p,
  .cvBrainIntake > p,
  .cvDraftForm > p,
  .cvCsvImport > p { display: none; }
  .cvCsvImport textarea { min-height: 112px; }
  .cvQuoteStage > div { max-height: 340px; }
  .cvPlansGrid {
    display: flex !important;
    overflow-x: auto;
    gap: 12px;
    padding-bottom: 8px;
    scroll-snap-type: x mandatory;
  }
  .cvPlansGrid > button {
    flex: 0 0 min(86vw, 340px);
    scroll-snap-align: start;
  }
}
"""
Path("frontend/src/churvox-office-lab/OfficeTeamVisualRepair.css").write_text(CSS)
print("wrote: OfficeTeamVisualRepair.css")

CONTRACT = r"""#!/usr/bin/env node
const fs = require('fs');
const read = (path) => fs.readFileSync(path, 'utf8');
const app = read('frontend/src/App.js');
const shell = read('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx');
const nav = read('frontend/src/churvox-office-lab/OfficeTeamOwnerNavigation.jsx');
const logout = read('frontend/src/runtime/churvoxVisibleLogoutRuntime.js');
const css = read('frontend/src/churvox-office-lab/OfficeTeamVisualRepair.css');
const usage = read('backend/churvox_plan_usage_routes.py');
const guard = read('backend/churvox_plan_usage_guard_patch.py');
const checks = [
  ['loading screen is identifiable', app.includes('cvAuthLoading min-h-screen')],
  ['verified snapshot renders during refresh', (app.match(/if \(loading && !user\) return <Spinner \/>;/g) || []).length >= 2],
  ['visual deployment fingerprint exists', app.includes('churvox-owner-visual-repair-20260713e')],
  ['native logout is marked', shell.includes('data-churvox-native-logout="true"')],
  ['final repair stylesheet is imported', shell.includes('OfficeTeamVisualRepair.css')],
  ['mobile utility links live in More', nav.includes('cvOwnerMoreUtility') && nav.includes('Account and help')],
  ['floating logout yields to native control', logout.includes('if (nativeLogout || authenticating)')],
  ['quick intake contrast is explicit', css.includes('.cvBrainIntake h3') && css.includes('#fff8ed')],
  ['quote stages are height bounded', css.includes('max-height: 440px') && css.includes('overflow-y: auto')],
  ['mobile plans use a compact carousel', css.includes('scroll-snap-type: x mandatory')],
  ['controls meet touch target', css.includes('.cvSafeControlButtons button') && css.includes('min-height: 44px')],
  ['plan usage route uses Starlette request injection', usage.includes('request: StarletteRequest') && !usage.includes('request: Request')],
  ['plan usage guard uses Starlette request injection', guard.includes('request: StarletteRequest') && !guard.includes('request: Request')],
];
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}`);
  if (!pass) process.exitCode = 1;
}
"""
Path("scripts/churvox-owner-visual-repair-contract.cjs").write_text(CONTRACT)
print("wrote: owner visual repair contract")
