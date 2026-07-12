from __future__ import annotations

import importlib

VERSION = "churvox-email-links-paid-launch-20260712"
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


def _install_auth_hardening(module) -> None:
    patch = None
    for name in (
        "churvox_auth_paid_launch_hardening",
        "backend.churvox_auth_paid_launch_hardening",
    ):
        try:
            patch = importlib.import_module(name)
            break
        except Exception:
            continue
    if patch is not None:
        patch.install(module)


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

        for target in (module,):
            if getattr(target, "build_lifecycle_email", None) is original:
                target.build_lifecycle_email = fixed_build_lifecycle_email

    _install_auth_hardening(module)
