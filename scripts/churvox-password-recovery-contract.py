#!/usr/bin/env python3
from pathlib import Path
import ast
import importlib.util
import sys

ROOT = Path(__file__).resolve().parents[1]
RECOVERY = ROOT / "backend" / "churvox_password_recovery_paid_launch_patch.py"
POLICY = ROOT / "backend" / "churvox_password_policy_final_patch.py"
EMAIL_LINKS = ROOT / "backend" / "churvox_email_links_paid_launch_patch.py"
RESET_PAGE = ROOT / "frontend" / "src" / "pages" / "auth" / "ResetPasswordPage.js"

recovery = RECOVERY.read_text(encoding="utf-8")
policy_source = POLICY.read_text(encoding="utf-8")
email_links = EMAIL_LINKS.read_text(encoding="utf-8")
reset_page = RESET_PAGE.read_text(encoding="utf-8")
ast.parse(recovery, filename=str(RECOVERY))
ast.parse(policy_source, filename=str(POLICY))

spec = importlib.util.spec_from_file_location("churvox_password_policy_contract", POLICY)
policy = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = policy
spec.loader.exec_module(policy)

failures = []


def check(name, condition, detail):
    if condition:
        print(f"PASS — {name}")
    else:
        print(f"FAIL — {name}: {detail}")
        failures.append(f"{name}: {detail}")


check(
    "forgot-password response does not reveal account existence",
    '"If the email exists, a reset link has been sent."' in recovery
    and 'if not user:\n            return generic' in recovery
    and 'return generic' in recovery,
    "known and unknown email addresses must receive the same public response",
)
check(
    "reset tokens are random, hashed and short-lived",
    "secrets.token_urlsafe(32)" in recovery
    and '"token_hash": _hash_token(raw_token)' in recovery
    and "timedelta(hours=1)" in recovery
    and '"used": False' in recovery,
    "raw tokens must not be stored and links must expire",
)
check(
    "reset token use is atomic and one-time",
    '"_id": token_doc["_id"], "used": False, "expires_at": {"$gt": now}' in recovery
    and '"$set": {"used": True, "used_at": now}' in recovery
    and "modified_count" in recovery,
    "two reset attempts must not both consume the same token",
)
check(
    "password reset revokes older sessions",
    '"password_changed_at": now' in recovery
    and '"session_invalid_before": now' in recovery
    and '"sessions_revoked": True' in recovery,
    "old access and refresh tokens must stop working after reset",
)
check(
    "all unused reset links are invalidated",
    '"user_id": token_doc["user_id"], "used": False' in recovery
    and '"invalidated_at": now' in recovery,
    "a successful password change must invalidate every other outstanding link",
)
check(
    "backend enforces the same length range as the reset page",
    policy.validate_password("short") == "Password must be at least 8 characters."
    and policy.validate_password("a" * 129) == "Password must be no more than 128 characters."
    and "password.length < 8" in reset_page
    and "password.length > 128" in reset_page,
    "browser and backend must agree on 8 to 128 characters",
)
check(
    "common and repetitive passwords are blocked server-side",
    policy.validate_password("password123") == "Choose a less common password."
    and policy.validate_password("aaaaaaaa") == "Choose a less repetitive password."
    and policy.validate_password("Correct-Horse-47") == "",
    "an attacker must not bypass the browser with a weak direct API request",
)
check(
    "leading and trailing spaces are rejected rather than silently changed",
    policy.validate_password(" Correct-Horse-47") == "Password cannot begin or end with spaces."
    and policy.validate_password("Correct-Horse-47 ") == "Password cannot begin or end with spaces.",
    "the password saved by the backend must be exactly the password the user entered",
)
check(
    "final policy wraps the real reset route",
    'path = "/api/auth/reset-password"' in policy_source
    and "original = existing[-1].endpoint" in policy_source
    and "result = original(data, response)" in policy_source
    and "app.add_api_route(path, final_reset_password" in policy_source,
    "the policy must preserve the secure token-claim and session-revocation implementation",
)
check(
    "policy loads after password recovery",
    '"churvox_password_recovery_paid_launch_patch"' in email_links
    and '"churvox_password_policy_final_patch"' in email_links
    and email_links.index('"churvox_password_policy_final_patch"') > email_links.index('"churvox_password_recovery_paid_launch_patch"'),
    "the final wrapper must see the installed reset endpoint",
)

if failures:
    print(f"\nPassword recovery contract failed: {len(failures)} issue(s).")
    for failure in failures:
        print(f"- {failure}")
    raise SystemExit(1)

print("\nPassword recovery contract passed: privacy-safe requests, one-time hashed links, session revocation and server-side password policy are enforced.")
