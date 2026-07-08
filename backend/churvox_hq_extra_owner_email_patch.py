from __future__ import annotations


def install(module):
    try:
        import churvox_hq_owner_access_fix_patch as hq_owner_access
        hq_owner_access.DEFAULT_OWNER_EMAILS.add("howardjennings777@gmail.com")
        hq_owner_access.DEFAULT_OWNER_EMAILS.add("howardjennings77@gmail.com")
        hq_owner_access.DEFAULT_OWNER_EMAILS.add("hello@churvox.com")
    except Exception:
        pass

    try:
        owner_checker = getattr(module, "is_platform_owner", None)
        if not owner_checker:
            return

        def patched_is_platform_owner(user):
            email = str((user or {}).get("email") or "").strip().lower()
            role = str((user or {}).get("role") or (user or {}).get("user_role") or (user or {}).get("account_type") or "").strip().lower().replace("-", "_").replace(" ", "_")
            if email in {"hello@churvox.com", "howardjennings77@gmail.com", "howardjennings777@gmail.com"}:
                return True
            if role in {"platform_owner", "platform_admin", "super_admin", "superadmin", "admin"}:
                return True
            if bool((user or {}).get("is_platform_owner") or (user or {}).get("is_platform_admin") or (user or {}).get("is_super_admin") or (user or {}).get("is_admin")):
                return True
            return bool(owner_checker(user))

        setattr(module, "is_platform_owner", patched_is_platform_owner)
    except Exception:
        pass
