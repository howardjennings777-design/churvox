from __future__ import annotations

from datetime import datetime, timezone, timedelta

INSTALLED = set()
PLATFORM_OWNER_EMAIL = "howardjennings77@gmail.com"
INTERNAL_MARKERS = ["sample", "fake", "seed", "example.com", "mailinator", "tempmail", "john@churvox", "johnworker", "localhost", "127.0.0.1"]
INTERNAL_PATH_PREFIXES = ("/admin", "/churvox-hq", "/owner", "/platform-dashboard", "/app-owner", "/dashboard", "/worker", "/plans", "/setup", "/setup-guide", "/guide")


def now_utc():
    return datetime.now(timezone.utc)


def text(value):
    return str(value or "").strip()


def lower(value):
    return text(value).lower()


def email_of(doc):
    return lower((doc or {}).get("email") or (doc or {}).get("user_email") or (doc or {}).get("owner_email"))


def is_owner_email(value):
    return lower(value) == PLATFORM_OWNER_EMAIL


def parse_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def safe(value):
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        output = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ["password", "token", "secret", "hash"]):
                continue
            output["id" if key == "_id" else key] = safe(item)
        return output
    return value


def public_path(path):
    p = "/" + text(path).split("?")[0].lstrip("/")
    if p == "//":
        p = "/"
    return not any(p.startswith(prefix) for prefix in INTERNAL_PATH_PREFIXES)


def public_visitor(row):
    row = row or {}
    path = row.get("path") or row.get("last_path") or row.get("first_path")
    if not public_path(path):
        return False
    if is_owner_email(email_of(row)):
        return False
    hay = " ".join(str(row.get(k) or "") for k in ["email", "user_email", "business_name", "referrer", "last_referrer", "source", "last_source", "user_agent"]).lower()
    return not any(marker in hay for marker in INTERNAL_MARKERS)


def status_of(user):
    return lower((user or {}).get("subscription_status") or (user or {}).get("billing_status") or (user or {}).get("status"))


def is_free_tester(user):
    user = user or {}
    if not (user.get("free_tester_access") or "tester" in status_of(user) or user.get("app_owner_free_pack")):
        return False
    until = parse_dt(user.get("free_tester_until") or user.get("free_until"))
    return not until or until >= now_utc()


def is_expired_tester(user):
    user = user or {}
    until = parse_dt(user.get("free_tester_until") or user.get("free_until"))
    return bool(until and until < now_utc())


def is_paid(user):
    return not is_free_tester(user) and status_of(user) in {"active", "paid"}


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_current_user or Request is None or HTTPException is None:
        return

    async def require_owner(request: Request):
        user = await get_current_user(request)
        if not is_owner_email(email_of(user)):
            raise HTTPException(status_code=403, detail="Churvox HQ growth report is locked to howardjennings77@gmail.com")
        return user

    def remove_route(path, method):
        try:
            app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))]
        except Exception:
            pass

    async def list_collection(name, limit=3000):
        try:
            cursor = db[name].find({})
            try:
                cursor = cursor.sort("created_at", -1)
            except Exception:
                cursor = cursor.sort("_id", -1)
            return await cursor.limit(limit).to_list(length=limit)
        except Exception:
            return []

    async def growth_report(request: Request):
        await require_owner(request)
        now = now_utc()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        seven_days = now - timedelta(days=7)
        thirty_days = now - timedelta(days=30)

        users = await list_collection("users", 3500)
        testers_raw = await list_collection("app_owner_testers", 2500)
        unique_rows = await list_collection("platform_unique_visitors", 5000)
        visit_rows = await list_collection("platform_visits", 12000)
        businesses = await list_collection("businesses", 2500)

        if not unique_rows and visit_rows:
            seen = {}
            for visit in visit_rows:
                key = text(visit.get("visitor_key") or visit.get("ip") or visit.get("user_agent") or visit.get("_id"))
                if not key:
                    continue
                item = seen.get(key) or {"visitor_key": key, "first_seen": visit.get("created_at"), "last_seen": visit.get("last_seen") or visit.get("created_at"), "first_path": visit.get("path"), "last_path": visit.get("path"), "pageview_count": 0}
                item["pageview_count"] = int(item.get("pageview_count") or 0) + 1
                d = parse_dt(visit.get("last_seen") or visit.get("created_at"))
                cd = parse_dt(item.get("last_seen"))
                if d and (not cd or d >= cd):
                    item.update({"last_seen": visit.get("last_seen") or visit.get("created_at"), "last_path": visit.get("path"), "last_referrer": visit.get("referrer"), "last_source": visit.get("source"), "user_email": visit.get("user_email"), "business_name": visit.get("business_name")})
                seen[key] = item
            unique_rows = list(seen.values())

        visitors = [row for row in unique_rows if public_visitor(row)]

        def seen_at(row, field):
            return parse_dt((row or {}).get(field))

        def first_seen(row):
            return seen_at(row, "first_seen") or seen_at(row, "created_at") or seen_at(row, "last_seen")

        def last_seen(row):
            return seen_at(row, "last_seen") or seen_at(row, "created_at") or seen_at(row, "first_seen")

        new_unique_today = [row for row in visitors if first_seen(row) and first_seen(row) >= today]
        active_7d = [row for row in visitors if last_seen(row) and last_seen(row) >= seven_days]
        active_30d = [row for row in visitors if last_seen(row) and last_seen(row) >= thirty_days]

        users_by_email = {email_of(user): user for user in users if email_of(user)}
        tester_emails = set(email_of(tester) for tester in testers_raw if email_of(tester))
        user_tester_emails = set(email_of(user) for user in users if email_of(user) and (is_free_tester(user) or is_expired_tester(user)))
        accepted_emails = set()
        pending_testers = []
        accepted_testers = []
        expired_testers = []

        for tester in testers_raw:
            email = email_of(tester)
            status = lower(tester.get("status"))
            linked_user = users_by_email.get(email)
            accepted = bool(linked_user and (is_free_tester(linked_user) or status in {"access_granted", "accepted", "active"})) or status in {"access_granted", "accepted", "active"}
            expired = bool((linked_user and is_expired_tester(linked_user)) or parse_dt(tester.get("free_until")) and parse_dt(tester.get("free_until")) < now)
            item = {**tester, "linked_user": safe(linked_user) if linked_user else None, "accepted": accepted, "expired": expired}
            if expired:
                expired_testers.append(item)
            elif accepted:
                accepted_emails.add(email)
                accepted_testers.append(item)
            else:
                pending_testers.append(item)

        for user in users:
            email = email_of(user)
            if email and email not in accepted_emails and email in user_tester_emails:
                accepted_testers.append({"email": email, "name": user.get("name") or user.get("business_name"), "business_name": user.get("business_name"), "status": user.get("subscription_status") or "tester_free", "linked_user": safe(user), "accepted": True, "expired": is_expired_tester(user)})
                accepted_emails.add(email)

        paid_users = [user for user in users if is_paid(user)]
        trial_users = [user for user in users if status_of(user) == "trialing"]
        signup_users = [user for user in users if not is_owner_email(email_of(user))]
        active_testers = [item for item in accepted_testers if parse_dt(((item.get("linked_user") or {}).get("last_active") if isinstance(item.get("linked_user"), dict) else None) or ((item.get("linked_user") or {}).get("updated_at") if isinstance(item.get("linked_user"), dict) else None) or item.get("updated_at") or item.get("created_at")) and parse_dt(((item.get("linked_user") or {}).get("last_active") if isinstance(item.get("linked_user"), dict) else None) or ((item.get("linked_user") or {}).get("updated_at") if isinstance(item.get("linked_user"), dict) else None) or item.get("updated_at") or item.get("created_at")) >= thirty_days]

        unique_total = len(visitors)
        accepted_count = len(accepted_testers)
        signup_count = len(signup_users)
        pageviews_total = sum(int(row.get("pageview_count") or row.get("visit_count") or 0) for row in visitors)
        if not pageviews_total:
            pageviews_total = len([row for row in visit_rows if public_visitor(row)])
        conversion = {
            "visitor_to_signup_percent": round((signup_count / unique_total) * 100, 1) if unique_total else 0,
            "visitor_to_accepted_tester_percent": round((accepted_count / unique_total) * 100, 1) if unique_total else 0,
            "tester_acceptance_percent": round((accepted_count / max(1, len(tester_emails | user_tester_emails))) * 100, 1) if (tester_emails or user_tester_emails) else 0,
            "accepted_to_paid_percent": round((len(paid_users) / accepted_count) * 100, 1) if accepted_count else 0,
        }

        return safe({
            "success": True,
            "source": "platform_unique_visitors_real_public",
            "generated_at": now,
            "owner_only": PLATFORM_OWNER_EMAIL,
            "counts": {
                "unique_total": unique_total,
                "new_unique_today": len(new_unique_today),
                "unique_active_7d": len(active_7d),
                "unique_active_30d": len(active_30d),
                "pageviews_total": pageviews_total,
                "visits_total": len([row for row in visit_rows if public_visitor(row)]),
                "signups_total": signup_count,
                "businesses_total": len(businesses),
                "tester_invites_total": len(tester_emails | user_tester_emails),
                "accepted_testers": accepted_count,
                "pending_testers": len(pending_testers),
                "active_testers_30d": len(active_testers),
                "expired_testers": len(expired_testers),
                "paid_users": len(paid_users),
                "trial_users": len(trial_users),
            },
            "conversion": conversion,
            "visitors": sorted([safe(row) for row in visitors], key=lambda row: str(row.get("last_seen") or row.get("created_at") or ""), reverse=True)[:500],
            "tester_pipeline": {
                "accepted": accepted_testers[:500],
                "pending": pending_testers[:500],
                "expired": expired_testers[:200],
            },
        })

    remove_route("/api/admin/owner/growth-report", "GET")
    app.add_api_route("/api/admin/owner/growth-report", growth_report, methods=["GET"])
    INSTALLED.add(name)
