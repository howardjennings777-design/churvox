from __future__ import annotations

OWNER_EMAILS = {
    "hello@churvox.com",
    "howardjennings77@gmail.com",
    "howardjennings777@gmail.com",
}
SYNTHETIC_LOCALS = {"demo", "sample", "fake", "mock", "preview", "seed", "test"}
SYNTHETIC_DOMAINS = {
    "example.com",
    "example.org",
    "example.net",
    "mailinator.com",
    "tempmail.com",
    "localhost",
}
SYNTHETIC_NAME_PREFIXES = (
    "demo ",
    "sample ",
    "fake ",
    "mock ",
    "preview ",
    "seed ",
)


def _text(value):
    return str(value or "").strip()


def _low(value):
    return _text(value).lower()


def _read(doc, *keys):
    doc = doc or {}
    for key in keys:
        if isinstance(doc, dict) and doc.get(key) not in (None, ""):
            return doc.get(key)
        try:
            value = getattr(doc, key, None)
            if value not in (None, ""):
                return value
        except Exception:
            pass
    return None


def _truthy(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    return _low(value) in {"1", "true", "yes", "on"}


def _synthetic_email(email):
    clean = _low(email)
    if not clean:
        return False
    if clean in OWNER_EMAILS:
        return True
    if clean in {"john@churvox.com", "johnworker@churvox.com"}:
        return True
    local, separator, domain = clean.partition("@")
    if separator and domain in SYNTHETIC_DOMAINS:
        return True
    if local in SYNTHETIC_LOCALS:
        return True
    for prefix in SYNTHETIC_LOCALS:
        if local.startswith((f"{prefix}+", f"{prefix}.", f"{prefix}_", f"{prefix}-")):
            return True
        if local.startswith(prefix) and local[len(prefix):].isdigit():
            return True
    return False


def is_internal_record(doc):
    doc = doc or {}
    email = _read(doc, "email", "user_email", "owner_email")
    if _synthetic_email(email):
        return True

    if any(_truthy(_read(doc, key)) for key in (
        "is_demo",
        "is_sample",
        "is_seed",
        "is_mock",
        "is_fake",
        "is_test_account",
        "internal_account",
        "is_internal",
    )):
        return True

    name = _low(_read(doc, "business_name", "company_name", "company", "name"))
    if name in SYNTHETIC_LOCALS or name.startswith(SYNTHETIC_NAME_PREFIXES):
        return True

    source = _low(_read(doc, "source", "record_source", "created_by_source"))
    if source in {"demo", "sample", "fake", "mock", "preview", "seed", "fixture"}:
        return True

    # Do not use a broad substring check for "test": real tester accounts must stay visible.
    return False


def install(_module=None):
    try:
        import churvox_hq_paid_launch_report_patch as report
    except Exception:
        from backend import churvox_hq_paid_launch_report_patch as report

    def is_tester_record(doc):
        doc = doc or {}
        has_tester_flag = any(_truthy(_read(doc, key)) for key in (
            "free_tester_access",
            "is_free_tester",
            "is_tester",
            "app_owner_free_pack",
        ))
        if has_tester_flag:
            until = report._parse_dt(_read(doc, "free_tester_until", "free_until"))
            return not until or until >= report._now()
        return "tester" in report._status(doc)

    report._is_internal = is_internal_record
    report._is_tester = is_tester_record
    return report
