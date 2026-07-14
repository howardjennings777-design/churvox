#!/usr/bin/env python3
"""Static contract for paid billing, strict login confirmation and explicit logout."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    target = ROOT / path
    if not target.exists():
        raise AssertionError(f"Missing account-boundary file: {path}")
    return target.read_text(encoding="utf-8")


def require(text, needle, label):
    if needle not in text:
        raise AssertionError(f"Missing {label}: {needle}")


def main():
    auth = read("frontend/src/context/AuthContext.js")
    login = read("frontend/src/pages/auth/LoginPage.js")
    owner = read("frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx")
    plans = read("frontend/src/churvox-office-lab/OfficeTeamPlansScreen.jsx")

    for invariant in [
        'const LOGGED_OUT_KEY = "churvox:logged-out"',
        "function hasExplicitLogoutLock()",
        "function setExplicitLogoutLock()",
        "function clearExplicitLogoutLock()",
        "allowOfflineFallback = true",
        "if (hasExplicitLogoutLock())",
        "allowOfflineFallback && transient && workerSession",
        "allowOfflineFallback && transient && businessSession",
        "confirmSession = options?.confirmSession === true",
        "if (confirmSession) {",
        "setExplicitLogoutLock();\n    clearStoredAuth",
    ]:
        require(auth, invariant, "auth boundary invariant")

    require(login, "login(cleanEmail, password, { confirmSession: true })", "deferred login publication")
    require(login, "checkAuth({ allowOfflineFallback: false })", "strict post-login session confirmation")
    require(login, "Your session could not be confirmed", "session confirmation alert")

    require(owner, 'doLogout as performVisibleLogout', "owner logout implementation")
    require(owner, 'window.location.replace("/login?logged_out=1")', "owner logout destination")

    for invariant in [
        'apiUrl("/billing/subscription-status")',
        'apiUrl("/billing/create-portal-session")',
        'hasStripeCustomer: Boolean(',
        '"Manage billing"',
        'role="alert"',
        'window.location.assign(secureUrl.toString())',
    ]:
        require(plans, invariant, "billing management invariant")

    for temporary in [
        "scripts/churvox-paid-account-boundary-fix.py",
        ".github/workflows/apply-paid-account-boundary-fix.yml",
    ]:
        if (ROOT / temporary).exists():
            raise AssertionError(f"Temporary account repair file was not removed: {temporary}")

    print("Paid account boundary contract passed: Stripe management, strict session confirmation and explicit logout are wired.")


if __name__ == "__main__":
    main()
