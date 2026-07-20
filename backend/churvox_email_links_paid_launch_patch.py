from __future__ import annotations

import importlib

VERSION = "churvox-email-links-paid-launch-20260720a"
REPLACEMENTS = {
    "/dashboard#jobs": "/dashboard#work",
    "/dashboard#support": "/support",
}


def _fix_value(value):
    if not isinstance(value, str):
        return value
    output = value
    for old, new in REPLACEMENTS.items():
        output = output.replace(old, new)
    return output


def _install_patch(module, direct_name, backend_name) -> None:
    patch = None
    for name in (direct_name, backend_name):
        try:
            patch = importlib.import_module(name)
            break
        except Exception:
            continue
    if patch is not None:
        installer = getattr(patch, "install", None)
        if callable(installer):
            installer(module)


def install(module) -> None:
    providers = []
    for name in ("email_provider", "backend.email_provider"):
        try:
            provider = importlib.import_module(name)
            if provider not in providers:
                providers.append(provider)
        except Exception:
            continue

    for provider in providers:
        original = getattr(provider, "build_lifecycle_email", None)
        if not callable(original) or getattr(original, "__churvox_paid_launch_links__", False):
            continue

        def fixed_build_lifecycle_email(kind, user, frontend_url="https://www.churvox.com", _original=original):
            result = _original(kind, user, frontend_url)
            if isinstance(result, dict):
                result = dict(result)
                for key in ("html", "text", "link", "cta_url"):
                    if key in result:
                        result[key] = _fix_value(result[key])
                result["link_version"] = VERSION
            return result

        fixed_build_lifecycle_email.__churvox_paid_launch_links__ = True
        provider.build_lifecycle_email = fixed_build_lifecycle_email

        if getattr(module, "build_lifecycle_email", None) is original:
            module.build_lifecycle_email = fixed_build_lifecycle_email

    _install_patch(module, "churvox_auth_paid_launch_hardening", "backend.churvox_auth_paid_launch_hardening")
    _install_patch(module, "churvox_password_recovery_paid_launch_patch", "backend.churvox_password_recovery_paid_launch_patch")
    _install_patch(module, "churvox_password_policy_final_patch", "backend.churvox_password_policy_final_patch")
    _install_patch(module, "churvox_session_token_precision_patch", "backend.churvox_session_token_precision_patch")
    _install_patch(module, "churvox_token_revocation_paid_launch_patch", "backend.churvox_token_revocation_paid_launch_patch")
    _install_patch(module, "churvox_registration_verification_paid_launch_patch", "backend.churvox_registration_verification_paid_launch_patch")
    _install_patch(module, "churvox_registration_claim_guard", "backend.churvox_registration_claim_guard")
    _install_patch(module, "churvox_checkout_token_session_guard", "backend.churvox_checkout_token_session_guard")
    _install_patch(module, "churvox_login_paid_launch_final_patch", "backend.churvox_login_paid_launch_final_patch")
    _install_patch(module, "churvox_worker_login_role_guard", "backend.churvox_worker_login_role_guard")
    _install_patch(module, "churvox_invite_security_paid_launch_patch", "backend.churvox_invite_security_paid_launch_patch")
    _install_patch(module, "churvox_feature_tier_paid_launch_guard", "backend.churvox_feature_tier_paid_launch_guard")
    _install_patch(module, "churvox_plan_usage_guard_patch", "backend.churvox_plan_usage_guard_patch")
    _install_patch(module, "churvox_auth_launch_status_patch", "backend.churvox_auth_launch_status_patch")
    _install_patch(module, "churvox_outer_cors_error_shield", "backend.churvox_outer_cors_error_shield")
