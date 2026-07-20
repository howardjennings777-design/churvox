#!/usr/bin/env python3
from datetime import datetime, timezone
from pathlib import Path
import importlib.util
import sys

ROOT = Path(__file__).resolve().parents[1]
ROUTES = ROOT / "backend" / "churvox_recurring_routes.py"

spec = importlib.util.spec_from_file_location("churvox_recurring_routes_contract", ROUTES)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)

failures = []


def check(name, condition, detail):
    if condition:
        print(f"PASS — {name}")
    else:
        print(f"FAIL — {name}: {detail}")
        failures.append(f"{name}: {detail}")


utc = timezone.utc
check(
    "weekly recurrence keeps exact time",
    module._next_date(datetime(2026, 7, 20, 9, 30, tzinfo=utc), "weekly")
    == datetime(2026, 7, 27, 9, 30, tzinfo=utc),
    "weekly should add seven days without changing the appointment time",
)
check(
    "fortnightly recurrence keeps exact time",
    module._next_date(datetime(2026, 7, 20, 9, 30, tzinfo=utc), "fortnightly")
    == datetime(2026, 8, 3, 9, 30, tzinfo=utc),
    "fortnightly should add fourteen days",
)
check(
    "monthly recurrence uses the next calendar month",
    module._next_date(datetime(2026, 1, 31, 9, 30, tzinfo=utc), "monthly")
    == datetime(2026, 2, 28, 9, 30, tzinfo=utc),
    "January 31 must become the final day of February, not March 2",
)
check(
    "leap-year monthly recurrence preserves month end",
    module._next_date(datetime(2028, 1, 31, 9, 30, tzinfo=utc), "monthly")
    == datetime(2028, 2, 29, 9, 30, tzinfo=utc),
    "January 31 in a leap year must become February 29",
)
check(
    "monthly recurrence returns to the requested day when possible",
    module._next_date(datetime(2028, 2, 29, 9, 30, tzinfo=utc), "monthly")
    == datetime(2028, 3, 29, 9, 30, tzinfo=utc),
    "February 29 should become March 29",
)
check(
    "custom recurrence never creates a same-day loop",
    module._next_date(datetime(2026, 7, 20, 9, 30, tzinfo=utc), "custom", 0)
    == datetime(2026, 7, 21, 9, 30, tzinfo=utc),
    "zero custom days must be clamped to one",
)

source = ROUTES.read_text(encoding="utf-8")
check(
    "completion returns the already-created next job",
    "existing_next = await _existing_next_job(db, job)" in source
    and '"idempotent": True' in source,
    "repeated completion must not silently create another occurrence",
)
check(
    "concurrent completion claims generation once",
    '"recurring_generation_state": "creating"' in source
    and '"next_generated_job_id": {"$exists": False}' in source
    and "if not claim.matched_count" in source,
    "the parent job needs an atomic generation claim",
)
check(
    "failed generation releases the claim",
    '"recurring_generation_state": ""' in source
    and '"recurring_generation_started_at": ""' in source,
    "a failed insert must remain retryable",
)
check(
    "generated occurrence cannot inherit completed state",
    'doc.pop(field, None)' in source
    and 'doc["status"] = "assigned"' in source
    and 'doc["time_entries"] = []' in source,
    "the new occurrence must start clean",
)
check(
    "monthly recurrence no longer means thirty days",
    'if frequency == "monthly":\n        return _add_calendar_month(start)' in source
    and 'timedelta(days=30)' not in source,
    "monthly work must follow calendar months",
)

if failures:
    print(f"\nRecurring job contract failed: {len(failures)} issue(s).")
    for failure in failures:
        print(f"- {failure}")
    raise SystemExit(1)

print("\nRecurring job contract passed: calendar dates are correct and duplicate next jobs are guarded.")
