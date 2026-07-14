from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend" / "src"

CUSTOMER_FILES = [
    "pages/marketing/PublicDemoPage.jsx",
    "pages/MoneyDeskCommandPage.jsx",
    "components/IndustrialSimplePage.jsx",
    "churvox-office-lab/OfficeTeamLabTidy.jsx",
    "churvox-office-lab/OfficeTeamLabFinal.jsx",
    "churvox-office-lab/OfficeTeamClientsWorkspace.jsx",
    "churvox-office-lab/OfficeTeamWorkerPhoneView.jsx",
    "churvox-office-lab/OfficeTeamMessagesDesk.jsx",
    "churvox-office-lab/OfficeTeamJobDone.jsx",
    "churvox-office-lab/OfficeTeamOperationalScreens.jsx",
    "churvox-office-lab/OfficeTeamWorkForms.jsx",
    "churvox-office-lab/OfficeTeamWorkFormsClean.jsx",
    "runtime/churvoxAdminBrainSurfaceRuntime.js",
    "runtime/churvoxLaunchSplashRuntime.js",
]

FORBIDDEN_PHRASES = [
    "ECB Property Maintenance",
    "Focus Landscaping",
    "howardjennings777@gmail.com",
    "hidden build",
    "Build Map",
    "Build map",
    "build version",
    "build number",
    "build status",
    "release marker",
    "deployment status",
    "Demo preview",
    "Demo mode",
    "lab preview",
    "Live Admin Brain",
    "Admin Brain",
    "admin brain",
    "Live scan",
    "live scan",
    "live admin gaps",
    "Showing sample layout",
    "Sample business",
    "sample records",
    "Test connection",
    "test connection",
    "Test mode",
    "test mode",
    "API response",
    "API error",
    "backend error",
    "frontend error",
    "debug information",
    "diagnostic information",
    "data-version=",
    "data-build=",
    "data-build-id=",
    "data-deploy=",
    "data-deployment=",
    "data-marker=",
    "data-release=",
]

NAMED_PLACEHOLDERS = [
    r"\bCam\b",
    r"\bStuart\b",
    r"\bSarah Wilson\b",
    r"\bSarah\b",
    r"\bJay\b",
    r"\bMike\b",
    r"\bSmith Property\b",
    r"\bSmith lawn service\b",
    r"\bJones property tidy\b",
    r"\bGreen Acres\b",
]

REQUIRED_CONTRACTS = {
    "pages/MoneyDeskCommandPage.jsx": [
        "Nothing needs attention",
        "Money records are unavailable",
    ],
    "components/IndustrialSimplePage.jsx": [
        'OfficeTeamLabSite appMode="owner"',
    ],
    "churvox-office-lab/OfficeTeamLabTidy.jsx": [
        "Owner controls",
        "How every decision works",
        "Nothing sends, syncs, charges, changes records, files tax or pays anyone without approval.",
    ],
    "churvox-office-lab/OfficeTeamWorkFormsClean.jsx": [
        "Check every prepared field in Command before approval.",
        "Nothing is imported before approval.",
    ],
    "runtime/churvoxAdminBrainSurfaceRuntime.js": [
        "Churvox office check",
        "No office decisions need attention",
        "Nothing sends, syncs, charges or changes records unless the owner approves the next step.",
    ],
    "runtime/churvoxLaunchSplashRuntime.js": [
        "churvoxForbiddenExampleScrubRuntime",
    ],
}

GLOBAL_BUSINESS_TERMS = [
    "ECB Property Maintenance",
    "Focus Landscaping",
]

failures: list[str] = []


def line_number(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def add_failure(path: Path, text: str, offset: int, message: str) -> None:
    relative = path.relative_to(ROOT)
    failures.append(f"{relative}:{line_number(text, offset)}: {message}")


for relative in CUSTOMER_FILES:
    path = FRONTEND / relative
    if not path.exists():
        failures.append(f"frontend/src/{relative}: missing customer-facing file")
        continue
    text = path.read_text(encoding="utf-8")
    for phrase in FORBIDDEN_PHRASES:
        offset = text.find(phrase)
        if offset >= 0:
            add_failure(path, text, offset, f"customer-facing wording contains forbidden phrase {phrase!r}")
    for pattern in NAMED_PLACEHOLDERS:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            add_failure(path, text, match.start(), f"customer-facing source contains named placeholder matching {pattern!r}")

for relative, required in REQUIRED_CONTRACTS.items():
    path = FRONTEND / relative
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    for phrase in required:
        if phrase not in text:
            failures.append(f"{path.relative_to(ROOT)}: missing required customer-language contract {phrase!r}")

# Real tester/business identifiers must not survive anywhere in production frontend source.
# Private HQ account identifiers are intentionally outside this customer-facing rule.
for path in sorted(FRONTEND.rglob("*")):
    if path.suffix.lower() not in {".js", ".jsx", ".ts", ".tsx"}:
        continue
    if path.name == "churvoxForbiddenExampleScrubRuntime.js":
        # This file intentionally names the strings it removes from the rendered UI.
        continue
    if ".bak" in path.name.lower() or "archive" in {part.lower() for part in path.parts}:
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    for phrase in GLOBAL_BUSINESS_TERMS:
        offset = text.find(phrase)
        if offset >= 0:
            add_failure(path, text, offset, f"production frontend source contains real business identifier {phrase!r}")

# Owner work pages must never fall back to fabricated records.
money = (FRONTEND / "pages/MoneyDeskCommandPage.jsx").read_text(encoding="utf-8")
for token in ["sampleRecords", "Showing sample layout", "records.length ? records :"]:
    offset = money.find(token)
    if offset >= 0:
        add_failure(FRONTEND / "pages/MoneyDeskCommandPage.jsx", money, offset, f"Money Desk still contains fabricated fallback token {token!r}")

lab_tidy = (FRONTEND / "churvox-office-lab/OfficeTeamLabTidy.jsx").read_text(encoding="utf-8")
for token in ["demoDecisions", "buildMap", "fallbackActivity"]:
    offset = lab_tidy.find(token)
    if offset >= 0:
        add_failure(FRONTEND / "churvox-office-lab/OfficeTeamLabTidy.jsx", lab_tidy, offset, f"office workspace still contains preview-only token {token!r}")

if failures:
    print("Customer wording contract failed:")
    for failure in failures:
        print(f"- {failure}")
    sys.exit(1)

print(
    "Customer wording contract passed: active public, owner, Command, Money, client, worker, message, Job Done, owner-decision overlay and working-form surfaces contain no real tester/business identifiers, named fallback people, build/deploy/debug wording or fabricated owner records."
)
