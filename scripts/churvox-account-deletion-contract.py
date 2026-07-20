#!/usr/bin/env python3
from pathlib import Path
import ast

ROOT = Path(__file__).resolve().parents[1]
PATCH = ROOT / "backend" / "churvox_account_deletion_final_patch.py"
LOADER = ROOT / "backend" / "churvox_startup_patch_loader.py"
PAGE = ROOT / "frontend" / "src" / "pages" / "legal" / "AccountDeletionPage.js"

patch = PATCH.read_text(encoding="utf-8")
loader = LOADER.read_text(encoding="utf-8")
page = PAGE.read_text(encoding="utf-8")
ast.parse(patch, filename=str(PATCH))
ast.parse(loader, filename=str(LOADER))

audit_start = patch.find("audit = {")
audit_end = patch.find("\n        try:", audit_start)
audit_block = patch[audit_start:audit_end] if audit_start >= 0 and audit_end > audit_start else ""

failures = []


def check(name, condition, detail):
    if condition:
        print(f"PASS — {name}")
    else:
        print(f"FAIL — {name}: {detail}")
        failures.append(f"{name}: {detail}")


def position(fragment):
    return patch.find(fragment)


check(
    "frontend delete routes are installed",
    '("/api/auth/delete-account", "DELETE")' in patch
    and '("/api/auth/delete-account", "POST")' in patch
    and '("/api/auth/account-delete", "DELETE")' in patch
    and '("/api/auth/account-delete", "POST")' in patch,
    "the backend must accept the route names used by AccountDeletionPage",
)
check(
    "canonical delete routes remain installed",
    '("/api/account/self-delete", "DELETE")' in patch
    and '("/api/account/self-delete", "POST")' in patch
    and '("/api/account/delete", "DELETE")' in patch
    and '("/api/account/delete", "POST")' in patch,
    "existing API clients must keep working",
)
check(
    "all known Churvox platform-owner identities are protected",
    all(email in patch for email in [
        "hello@churvox.com",
        "howardjennings77@gmail.com",
        "howardjennings777@gmail.com",
    ]),
    "the customer deletion flow must not remove an HQ owner account",
)
check(
    "frontend confirmation matches backend acceptance",
    'JSON.stringify({ confirmation: "DELETE" })' in page
    and '"delete my account", "delete"' in patch,
    "the visible DELETE confirmation must be accepted case-insensitively",
)
check(
    "frontend never retries a real deletion failure through another alias",
    "if (response.status !== 404 && response.status !== 405)" in page
    and "throw new Error(lastMessage);" in page,
    "fallback aliases are only for missing routes; 409, 500 and billing errors must stop immediately",
)
check(
    "deletion has one stale-safe processing claim",
    '"account_deletion_state": "processing"' in patch
    and '"account_deletion_started_at": now' in patch
    and '"account_deletion_started_at": {"$lt": stale_before}' in patch
    and "status_code=409" in patch,
    "parallel deletion requests must not run destructive cleanup twice",
)
check(
    "Stripe cancellation happens before destructive cleanup",
    0 <= position("stripe_result = await cancel_stripe") < position("for collection_name in BUSINESS_COLLECTIONS"),
    "an active subscription must be safely cancelled or deletion must stop",
)
check(
    "workspace cleanup fails closed before identity cleanup",
    0 <= position("for collection_name in BUSINESS_COLLECTIONS")
    < position("if failures:")
    < position("for collection_name in IDENTITY_COLLECTIONS")
    < position("users_result = await db.users.delete_many"),
    "a failed workspace collection must keep the account identity available for a retry",
)
check(
    "workspace failures retain the owner login",
    "Account data deletion was incomplete. The account login was kept" in patch
    and 'account_deletion_state": "failed"' in patch
    and "account_deletion_failures=failures" in patch,
    "partial cleanup must be recorded without deleting the only login",
)
check(
    "deletion audit contains only a hash of the account email",
    '"email_hash": hashlib.sha256(email.encode("utf-8")).hexdigest()' in audit_block
    and '"email":' not in audit_block
    and '"account_email":' not in audit_block,
    "the retained audit must not store the raw deleted-account email",
)
check(
    "security tokens are cleaned only after workspace and audit success",
    0 <= position("await db.account_deletion_audit.insert_one(audit)")
    < position("for collection_name in IDENTITY_COLLECTIONS")
    < position("users_result = await db.users.delete_many"),
    "token/session cleanup must not strand an owner before the deletion is auditable",
)
check(
    "identity cleanup failure remains recoverable",
    "Account security-token cleanup was incomplete" in patch
    and "Identity token cleanup was incomplete" in patch
    and '"status": "failed"' in patch,
    "the user record must remain when identity collection cleanup is incomplete",
)
check(
    "final identity deletion failure disables remaining access",
    '"is_active": False' in patch
    and '"disabled": True' in patch
    and '"deleted": True' in patch
    and '"session_invalid_before": disabled_at' in patch
    and "clear_auth_cookies(response)" in patch,
    "after workspace and token cleanup, any undeleted user record must be unusable",
)
check(
    "business shell cleanup is last and retryable out of band",
    0 <= position("users_result = await db.users.delete_many")
    < position("business_result = await db.businesses.delete_many")
    and '"status": "cleanup_pending"' in patch
    and '"cleanup_pending": cleanup_pending' in patch,
    "a final empty business-shell failure must not restore account access or falsely hide cleanup status",
)
check(
    "successful deletion clears server authentication cookies",
    patch.count("clear_auth_cookies(response)") >= 2
    and '"signed_out": True' in patch,
    "the browser must not keep an authenticated cookie after deleting the account",
)
check(
    "final patch wins startup route precedence",
    '"churvox_account_deletion_paid_launch"' in loader
    and '"churvox_account_deletion_final_patch"' in loader
    and loader.index('"churvox_account_deletion_final_patch"') > loader.index('"churvox_account_deletion_paid_launch"'),
    "the alias and fail-closed routes must replace the older deletion implementation",
)

if failures:
    print(f"\nAccount deletion contract failed: {len(failures)} issue(s).")
    for failure in failures:
        print(f"- {failure}")
    raise SystemExit(1)

print("\nAccount deletion contract passed: route aliases, owner protection, Stripe cancellation, retry safety, fail-closed cleanup, audit privacy and sign-out are enforced.")
