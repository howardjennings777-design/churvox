from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "frontend" / "src"

checks = []
warnings = []

def ok(name, detail=""):
    checks.append(("PASS", name, detail))

def warn(name, detail=""):
    checks.append(("WARN", name, detail))
    warnings.append((name, detail))

def fail(name, detail=""):
    checks.append(("FAIL", name, detail))

def read(path):
    try:
        return path.read_text(errors="ignore")
    except Exception:
        return ""

def exists_any(paths):
    return next((p for p in paths if p.exists()), None)

print("===== CHURVOX LAUNCH AUDIT =====")

backup_files = list(SRC.rglob("*.phase*-backup-*")) + list(SRC.rglob("*.phase9-route-backup"))
if backup_files:
    fail("No accidental backup files", "\n".join(str(p.relative_to(ROOT)) for p in backup_files[:20]))
else:
    ok("No accidental backup files")

index_css = SRC / "index.css"
index_text = read(index_css)

required_css = [
    "churvox-phase1-shell.css",
    "churvox-worker-phase7.css",
    "churvox-worker-phase10-polish.css",
    "churvox-jobs-phase11-polish.css",
    "churvox-clients-phase12-polish.css",
    "churvox-quotes-phase13-polish.css",
    "churvox-invoices-phase14-polish.css",
    "churvox-team-phase15-polish.css",
    "churvox-schedule-phase16-polish.css",
    "churvox-payroll-phase17-polish.css",
    "churvox-automation-phase18-polish.css",
    "churvox-settings-phase19-polish.css",
    "churvox-phase20-global-polish.css",
    "churvox-public-phase21-polish.css",
]

for css in required_css:
    path = SRC / "styles" / css
    if path.exists() and css in index_text:
        ok(f"CSS imported: {css}")
    elif path.exists():
        warn(f"CSS file exists but not imported: {css}")
    else:
        warn(f"CSS file missing: {css}")

app_file = exists_any([
    SRC / "App.js",
    SRC / "App.jsx",
    SRC / "routes.js",
    SRC / "routes.jsx",
])

if app_file:
    app_text = read(app_file)
    ok("Found app/routes file", str(app_file.relative_to(ROOT)))

    core_routes = [
        "/dashboard",
        "/jobs",
        "/clients",
        "/quotes",
        "/invoices",
        "/team",
        "/settings",
    ]

    for route in core_routes:
        if route in app_text:
            ok(f"Core route present: {route}")
        else:
            warn(f"Core route not directly found: {route}", "May be nested/dynamic. Manually check if this is expected.")

    worker_routes = ["/worker", "/worker/dashboard", "/worker/jobs", "/my-jobs"]
    if any(route in app_text for route in worker_routes):
        ok("Worker route found")
    else:
        warn("Worker route not directly found", "Check worker login redirect manually.")
else:
    warn("Could not find App/routes file")

entry = exists_any([
    SRC / "index.js",
    SRC / "index.jsx",
    SRC / "main.js",
    SRC / "main.jsx",
])

if entry:
    entry_text = read(entry)
    ok("Found frontend entry file", str(entry.relative_to(ROOT)))

    if "churvoxWorkerRouteClass" in entry_text or "churvoxRouteBodyClass" in entry_text:
        ok("Worker route body class helper imported")
    else:
        warn("Worker route body class helper not imported")
else:
    warn("Could not find frontend entry file")

important_dirs = [
    SRC / "pages",
    SRC / "components",
    SRC / "styles",
]

for d in important_dirs:
    if d.exists():
        ok(f"Directory exists: {d.relative_to(ROOT)}")
    else:
        warn(f"Directory missing: {d.relative_to(ROOT)}")

operator_files = []
for p in SRC.rglob("*"):
    if p.suffix.lower() not in [".js", ".jsx"]:
        continue
    txt = read(p)
    if "Churvox Operator" in txt or "Live command centre" in txt or "Operator" in p.name:
        operator_files.append(p)

if operator_files:
    ok("Operator page found", ", ".join(str(p.relative_to(ROOT)) for p in operator_files[:3]))
else:
    warn("Operator page not found by audit keywords")

worker_files = []
for p in SRC.rglob("*"):
    if p.suffix.lower() not in [".js", ".jsx"]:
        continue
    txt = read(p)
    if "Today's jobs, clear actions" in txt or "Todays jobs, clear actions" in txt or "worker-phase8.css" in txt:
        worker_files.append(p)

if worker_files:
    ok("Premium worker dashboard found", ", ".join(str(p.relative_to(ROOT)) for p in worker_files[:3]))
else:
    warn("Premium worker dashboard not found by audit keywords")

bad_strings = []
for p in SRC.rglob("*"):
    if p.suffix.lower() not in [".js", ".jsx", ".css"]:
        continue
    txt = read(p)
    for bad in ["bash: command not found", "event not found", "Phase: command not found"]:
        if bad in txt:
            bad_strings.append((p, bad))

if bad_strings:
    fail("Terminal paste error text found in source", "\n".join(f"{p.relative_to(ROOT)} -> {bad}" for p, bad in bad_strings[:20]))
else:
    ok("No terminal paste error text found in source")

print()
for status, name, detail in checks:
    icon = "✅" if status == "PASS" else "⚠️" if status == "WARN" else "❌"
    print(f"{icon} {name}")
    if detail:
        print(f"   {detail}")

print()
print(f"Audit complete: {sum(1 for c in checks if c[0] == 'PASS')} pass, {sum(1 for c in checks if c[0] == 'WARN')} warnings, {sum(1 for c in checks if c[0] == 'FAIL')} fail.")

# Do not fail the terminal for warnings. Build is the real gate.
if any(c[0] == "FAIL" for c in checks):
    raise SystemExit(1)
