from __future__ import annotations

PLATFORM_OWNER_EMAIL = "howardjennings77@gmail.com"


def install(module):
    try:
        import churvox_hq_owner_access_fix_patch as hq_owner_access
        hq_owner_access.DEFAULT_OWNER_EMAILS.clear()
        hq_owner_access.DEFAULT_OWNER_EMAILS.add(PLATFORM_OWNER_EMAIL)
    except Exception:
        pass

    try:
        def patched_is_platform_owner(user):
            email = str((user or {}).get("email") or "").strip().lower()
            return email == PLATFORM_OWNER_EMAIL

        setattr(module, "is_platform_owner", patched_is_platform_owner)
    except Exception:
        pass
