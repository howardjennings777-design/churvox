from pathlib import Path
import subprocess
import re
from collections import Counter

ROOT = Path(".")
checks = []
failures = []
warnings = []

def run(cmd):
    p = subprocess.run(cmd, shell=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return p.returncode, p.stdout.strip()

def read(path):
    p = ROOT / path
    return p.read_text(errors="ignore") if p.exists() else ""

def ok(text):
    checks.append(text)

def fail(text):
    failures.append(text)

def warn(text):
    warnings.append(text)

server = read("backend/server.py")
app = read("frontend/src/App.js")

code, out = run("python3 -m py_compile backend/server.py")
if code == 0:
    ok("Backend syntax passes")
else:
    fail("Backend syntax fails:\n" + out[-2000:])

code, out = run("npm --prefix frontend run build")
if code == 0:
    ok("Frontend build passes")
else:
    fail("Frontend build fails:\n" + out[-3000:])

required = [
    "CHURVOX_STAGE4_AI_DECISION_ENGINE_START",
    "CHURVOX_STAGE5_JOB_COMPLETION_FLOW_START",
    "CHURVOX_STAGE6_APPROVE_SEND_POLISH_START",
    "CHURVOX_STAGE7_CREW_MAP_TIMESHEETS_START",
    "CHURVOX_STAGE8_CLIENT_WORKBENCH_START",
    "CHURVOX_STAGE9_QUOTES_LOGIC_START",
    "CHURVOX_STAGE10_SUPPORT_ROLES_START",
]

for marker in required:
    if marker in server:
        ok(f"{marker} present")
    else:
        fail(f"{marker} missing")

routes = re.findall(r'@(api_router|app)\.(get|post|patch|put|delete)\("([^"]+)"', server)
route_names = [f"{m.upper()} {p}" for _, m, p in routes]
dupes = [r for r, c in Counter(route_names).items() if c > 1]

if dupes:
    if "CHURVOX_STAGE3_ROUTE_DEDUPE_START" in server or "CHURVOX_ROUTE_DEDUPE_START" in server:
        warn(f"{len(dupes)} duplicate backend route strings exist, but runtime de-dupe is present")
    else:
        fail("Duplicate backend routes exist without runtime de-dupe")

main_routes = [
    '/dashboard',
    '/jobs',
    '/crew-map',
    '/clients',
    '/quotes',
    '/invoices',
    '/team',
    '/settings',
    '/support',
    '/worker/jobs',
]

for route in main_routes:
    if f'path="{route}"' in app:
        ok(f"Frontend route exists: {route}")
    else:
        fail(f"Frontend route missing: {route}")

report = []
report.append("# Churvox Launch Smoke Check Result")
report.append("")
report.append(f"- Failures: {len(failures)}")
report.append(f"- Warnings: {len(warnings)}")
report.append(f"- Passes: {len(checks)}")
report.append("")

report.append("## Failures")
report.append("")
report.extend([f"- {x}" for x in failures] or ["None"])
report.append("")

report.append("## Warnings")
report.append("")
report.extend([f"- {x}" for x in warnings] or ["None"])
report.append("")

report.append("## Passes")
report.append("")
report.extend([f"- {x}" for x in checks])

Path("CHURVOX_LAUNCH_SMOKE_CHECK_RESULT.md").write_text("\n".join(report))

print("\n".join(report))
raise SystemExit(1 if failures else 0)
