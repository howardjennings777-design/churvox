#!/usr/bin/env python3
"""
Churvox launch readiness static tester.

Run from the repo root:
  python3 scripts/churvox_launch_readiness_check.py

This does not delete data and does not call production services. It checks the repo for
common launch blockers after the premium AI rebuild: routes, AI wiring, onboarding
endpoints, duplicate pasted imports/components, worker safety patterns, and frontend
secret leaks.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FAILURES: list[str] = []
WARNINGS: list[str] = []
PASSES: list[str] = []


def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        FAILURES.append(f"Missing file: {path}")
        return ""
    return p.read_text(encoding="utf-8", errors="ignore")


def ok(label: str) -> None:
    PASSES.append(label)


def warn(label: str) -> None:
    WARNINGS.append(label)


def fail(label: str) -> None:
    FAILURES.append(label)


def contains(path: str, needle: str, label: str) -> None:
    text = read(path)
    if needle in text:
        ok(label)
    else:
        fail(f"{label} missing: {needle} in {path}")


def regex_contains(path: str, pattern: str, label: str) -> None:
    text = read(path)
    if re.search(pattern, text, re.S):
        ok(label)
    else:
        fail(f"{label} missing pattern {pattern!r} in {path}")


def check_single_component_file(path: str) -> None:
    text = read(path)
    if not text:
        return
    export_count = len(re.findall(r"export\s+default\s+function\s+", text))
    if export_count == 1:
        ok(f"{path}: exactly one default component")
    else:
        fail(f"{path}: expected one default component, found {export_count}")

    first_export = text.find("export default function")
    if first_export != -1 and "\nimport " in text[first_export:]:
        fail(f"{path}: import statement appears after component start")
    else:
        ok(f"{path}: no mid-file imports")


def check_routes() -> None:
    app = read("frontend/src/App.js")
    routes = [
        "/login", "/signup", "/dashboard", "/overview", "/onboarding",
        "/jobs", "/jobs/new", "/jobs/:id", "/clients", "/clients/new", "/clients/:id",
        "/quotes", "/quotes/new", "/quotes/:id", "/invoices", "/invoices/new", "/invoices/:id",
        "/team", "/payroll", "/automation", "/automation/runs", "/reports", "/settings",
        "/plans", "/sms", "/integrations", "/worker/jobs", "/worker/jobs/:id",
        "/public/quote/:token", "/public/invoice/:token",
    ]
    for route in routes:
        if f'path="{route}"' in app or f"path='{route}'" in app:
            ok(f"route exists: {route}")
        else:
            fail(f"route missing: {route}")


def check_backend_endpoints() -> None:
    server = read("backend/server.py")
    endpoints = [
        '@api_router.post("/ai/generate-draft")',
        '@api_router.get("/onboarding/status")',
        '@api_router.post("/onboarding/save")',
        '@api_router.post("/onboarding/complete")',
    ]
    for ep in endpoints:
        if ep in server:
            ok(f"backend endpoint registered: {ep}")
        else:
            fail(f"backend endpoint missing: {ep}")

    required_terms = [
        "get_current_user",
        "get_user_business_id",
        "approval_required",
        "llm_available",
        "OPENAI_API_KEY",
        "_safe_ai_fallback",
    ]
    for term in required_terms:
        if term in server:
            ok(f"backend AI/onboarding term present: {term}")
        else:
            fail(f"backend AI/onboarding term missing: {term}")


def check_ai_frontend() -> None:
    contains("frontend/src/hooks/useAiDraft.js", "post('/ai/generate-draft'", "useAiDraft posts to AI endpoint")
    contains("frontend/src/hooks/useAiDraft.js", "res?.data", "useAiDraft reads useApi response data")
    contains("frontend/src/components/premium/index.js", "PremiumAIDraftPanel", "PremiumAIDraftPanel is exported")
    contains("frontend/src/components/premium/PremiumAIDraftPanel.js", "Copy draft", "AI draft panel has copy action")
    contains("frontend/src/components/premium/PremiumAIDraftPanel.js", "Clear", "AI draft panel has clear action")
    contains("frontend/src/components/premium/PremiumAIDraftPanel.js", "Approval-first", "AI draft panel has approval-first warning")

    ai_pages = {
        "Smart Hub": "frontend/src/pages/DashboardPage.js",
        "Jobs": "frontend/src/pages/jobs/JobsPage.js",
        "Clients": "frontend/src/pages/clients/ClientsPage.js",
        "Quotes": "frontend/src/pages/quotes/QuotesPage.js",
        "Invoices": "frontend/src/pages/invoices/InvoicesPage.js",
        "Automation": "frontend/src/pages/AutomationPage.js",
        "Onboarding": "frontend/src/pages/OnboardingPage.js",
    }
    for name, path in ai_pages.items():
        text = read(path)
        if "PremiumAIDraftPanel" in text or "useAiDraft" in text:
            ok(f"{name}: AI draft wiring present")
        else:
            fail(f"{name}: AI draft wiring missing")


def check_onboarding() -> None:
    page = read("frontend/src/pages/OnboardingPage.js")
    required = [
        "business_name", "industry", "region", "team_size", "uses_myob", "sms_later",
        "/onboarding/save", "/onboarding/complete", "PremiumAIDraftPanel",
    ]
    for term in required:
        if term in page:
            ok(f"onboarding includes {term}")
        else:
            fail(f"onboarding missing {term}")

    step_like_terms = ["Welcome", "Business", "Team", "AI", "Finish"]
    missing = [term for term in step_like_terms if term.lower() not in page.lower()]
    if missing:
        warn(f"onboarding may not clearly show all step labels: missing {', '.join(missing)}")
    else:
        ok("onboarding step labels present")


def check_worker_safety() -> None:
    worker_files = [
        "frontend/src/pages/worker/WorkerJobsPage.js",
        "frontend/src/pages/worker/WorkerJobDetailPage.js",
        "frontend/src/pages/worker/WorkerSettingsPage.js",
    ]
    sensitive_terms = [
        "price", "hourly_rate", "invoice", "subtotal", "total", "myob", "payroll", "gps", "latitude", "longitude",
    ]
    for path in worker_files:
        text = read(path).lower()
        found = [term for term in sensitive_terms if term in text]
        if found:
            warn(f"{path}: contains sensitive terms to manually review for worker visibility: {', '.join(found)}")
        else:
            ok(f"{path}: no obvious owner-only sensitive terms")


def check_frontend_secrets() -> None:
    for p in (ROOT / "frontend/src").rglob("*.js"):
        text = p.read_text(encoding="utf-8", errors="ignore")
        if "OPENAI_API_KEY" in text or "ANTHROPIC_API_KEY" in text or "EMERGENT_LLM_KEY" in text:
            fail(f"frontend secret reference found: {p.relative_to(ROOT)}")
    ok("frontend source scan completed for AI key names")


def check_common_page_health() -> None:
    for path in [
        "frontend/src/pages/clients/ClientsPage.js",
        "frontend/src/pages/jobs/JobsPage.js",
        "frontend/src/pages/quotes/QuotesPage.js",
        "frontend/src/pages/invoices/InvoicesPage.js",
    ]:
        check_single_component_file(path)


def main() -> int:
    print("=== Churvox Launch Readiness Static Check ===")
    check_routes()
    check_backend_endpoints()
    check_ai_frontend()
    check_onboarding()
    check_worker_safety()
    check_frontend_secrets()
    check_common_page_health()

    print("\n=== PASS ===")
    for item in PASSES:
        print(f"✅ {item}")

    print("\n=== WARNINGS / MANUAL REVIEW ===")
    if WARNINGS:
        for item in WARNINGS:
            print(f"⚠️  {item}")
    else:
        print("None")

    print("\n=== FAILURES ===")
    if FAILURES:
        for item in FAILURES:
            print(f"❌ {item}")
    else:
        print("None")

    print("\nSummary:")
    print(f"Passed: {len(PASSES)}")
    print(f"Warnings: {len(WARNINGS)}")
    print(f"Failures: {len(FAILURES)}")

    return 1 if FAILURES else 0


if __name__ == "__main__":
    sys.exit(main())
