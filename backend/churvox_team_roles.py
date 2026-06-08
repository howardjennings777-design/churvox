import sys
from datetime import datetime, timezone


def _server():
    return sys.modules.get("server") or sys.modules.get("backend.server") or sys.modules.get("main")


def _clean(value):
    return str(value or "").strip()


def _role(value):
    text = _clean(value).lower().replace(" ", "_").replace("-", "_")
    return {"manager": "manager", "worker": "worker", "office": "office_admin", "office_admin": "office_admin", "payroll": "payroll"}.get(text, "worker")


def _pretty(role):
    return {"manager": "Manager", "worker": "Worker", "office_admin": "Office Admin", "payroll": "Payroll"}.get(role, "Worker")


def _safe(doc):
    if not doc:
        return doc
    out = dict(doc)
    out.pop("password_hash", None)
    for key, value in list(out.items()):
        if key == "_id":
            out["id"] = str(value)
            out.pop("_id", None)
        elif hasattr(value, "isoformat"):
            out[key] = value.isoformat()
        elif value.__class__.__name__ == "ObjectId":
            out[key] = str(value)
    return out


async def _user(request):
    return await getattr(_server(), "get_current_user")(request)


def install(router):
    if getattr(router, "churvox_team_role_bridge_installed", False):
        return

    @router.get("/logic/team-members")
    async def list_team_members(request):
        app = _server()
        db = getattr(app, "db", None)
        ObjectId = getattr(app, "ObjectId", None)
        if db is None or ObjectId is None:
            return {"success": False, "error": "Team route not ready"}
        try:
            user = await _user(request)
        except Exception:
            return {"success": False, "error": "Not authenticated"}
        business_id = str(user.get("business_id") or user.get("id"))
        query = {"role": {"$in": ["manager", "worker", "office_admin", "payroll"]}, "$or": [{"business_id": business_id}, {"business_id": ObjectId(business_id)}]}
        members = await db.users.find(query, {"password_hash": 0}).sort("created_at", -1).to_list(500)
        return {"success": True, "members": [_safe(member) for member in members]}

    @router.post("/logic/team-members")
    async def create_team_member(payload: dict, request):
        app = _server()
        db = getattr(app, "db", None)
        ObjectId = getattr(app, "ObjectId", None)
        require_employer = getattr(app, "require_employer", None)
        check_team_limits = getattr(app, "check_team_limits", None)
        create_invite_for_worker = getattr(app, "create_invite_for_worker", None)
        if not all([db, ObjectId, require_employer, check_team_limits, create_invite_for_worker]):
            return {"success": False, "error": "Team invite route not ready"}
        try:
            user = await require_employer(request)
        except Exception:
            return {"success": False, "error": "Only owners can invite team members"}
        name = _clean(payload.get("name") or payload.get("worker_name"))
        email = _clean(payload.get("email")).lower()
        phone = _clean(payload.get("phone"))
        role = _role(payload.get("role"))
        if not name or not email or "@" not in email:
            return {"success": False, "error": "Name and valid email are required"}
        existing = await db.users.find_one({"email": email})
        if existing:
            await db.users.update_one({"_id": existing["_id"]}, {"$set": {"name": name, "phone": phone, "role": role, "updated_at": datetime.now(timezone.utc)}})
            member = await db.users.find_one({"_id": existing["_id"]}, {"password_hash": 0})
            return {"success": True, "message": f"{_pretty(role)} updated", "member": _safe(member)}
        biz_id = await check_team_limits(user)
        created = await create_invite_for_worker(email, name, phone, user, biz_id)
        new_id = created.get("id")
        if new_id:
            await db.users.update_one({"_id": ObjectId(new_id)}, {"$set": {"role": role, "launch_role": role, "updated_at": datetime.now(timezone.utc)}})
            await db.invite_tokens.update_many({"user_id": ObjectId(new_id)}, {"$set": {"role": role}})
            member = await db.users.find_one({"_id": ObjectId(new_id)}, {"password_hash": 0})
        else:
            member = None
        return {"success": True, "message": f"{_pretty(role)} invited", "member": _safe(member), "invite_link": created.get("invite_link"), "note": "Invite uses existing email engine; selected role is saved on the account."}

    router.churvox_team_role_bridge_installed = True
