from datetime import datetime, timezone
import sys

COLLECTIONS = ["clients", "jobs", "quotes", "invoices"]


def _server():
    return sys.modules.get("server") or sys.modules.get("backend.server") or sys.modules.get("main")


def _obj(value):
    ObjectId = getattr(_server(), "ObjectId", None)
    try:
        return ObjectId(str(value)) if value and ObjectId else None
    except Exception:
        return None


def _clean(value):
    return str(value or "").strip()


async def _user(request):
    return await getattr(_server(), "get_current_user")(request)


def _ids(user):
    user_id = _clean(user.get("id") or user.get("_id"))
    business_id = _clean(user.get("business_id") or user_id)
    return user_id, business_id, _obj(user_id), _obj(business_id)


def _scope_query(user):
    user_id, business_id, user_oid, biz_oid = _ids(user)
    options = [
        {"business_id": business_id},
        {"contractor_id": business_id},
        {"owner_id": user_id},
        {"created_by": user_id},
        {"user_id": user_id},
    ]
    if biz_oid:
        options += [{"business_id": biz_oid}, {"contractor_id": biz_oid}]
    if user_oid:
        options += [{"owner_id": user_oid}, {"created_by": user_oid}, {"user_id": user_oid}]
    return {"$or": options}


def _safe(doc):
    if not doc:
        return doc
    out = dict(doc)
    for k, v in list(out.items()):
        if k == "_id":
            out["id"] = str(v)
            out.pop("_id", None)
        elif hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        elif v.__class__.__name__ == "ObjectId":
            out[k] = str(v)
    return out


def install(router):
    if getattr(router, "churvox_isolation_routes_installed", False):
        return

    @router.get("/logic/business-isolation/status")
    async def isolation_status(request):
        app = _server()
        db = getattr(app, "db", None)
        if db is None:
            return {"success": False, "error": "Database not ready"}
        try:
            user = await _user(request)
        except Exception:
            return {"success": False, "error": "Not authenticated"}
        _, business_id, _, biz_oid = _ids(user)
        out = {}
        for name in COLLECTIONS:
            col = getattr(db, name)
            scoped = await col.count_documents(_scope_query(user))
            proper_or = [{"business_id": business_id}]
            if biz_oid:
                proper_or.append({"contractor_id": biz_oid})
            proper = await col.count_documents({"$or": proper_or})
            out[name] = {"scoped": scoped, "properly_keyed": proper, "needs_repair_estimate": max(scoped - proper, 0)}
        return {"success": True, "business_id": business_id, "collections": out}

    @router.post("/logic/business-isolation/repair")
    async def repair_isolation(request):
        app = _server()
        db = getattr(app, "db", None)
        if db is None:
            return {"success": False, "error": "Database not ready"}
        try:
            user = await _user(request)
        except Exception:
            return {"success": False, "error": "Not authenticated"}
        _, business_id, _, biz_oid = _ids(user)
        now = datetime.now(timezone.utc)
        updates = {}
        set_fields = {"business_id": business_id, "business_isolation_repaired_at": now, "updated_at": now}
        if biz_oid:
            set_fields["contractor_id"] = biz_oid
        for name in COLLECTIONS:
            col = getattr(db, name)
            result = await col.update_many(_scope_query(user), {"$set": set_fields})
            updates[name] = {"matched": result.matched_count, "modified": result.modified_count}
        return {"success": True, "message": "Business isolation fields repaired for this business", "business_id": business_id, "updates": updates}

    @router.get("/logic/business-records/{kind}")
    async def list_business_records(kind: str, request):
        app = _server()
        db = getattr(app, "db", None)
        if db is None:
            return {"success": False, "error": "Database not ready"}
        if kind not in COLLECTIONS:
            return {"success": False, "error": "Unsupported record type"}
        try:
            user = await _user(request)
        except Exception:
            return {"success": False, "error": "Not authenticated"}
        col = getattr(db, kind)
        docs = await col.find(_scope_query(user)).sort("updated_at", -1).to_list(500)
        return {"success": True, "items": [_safe(x) for x in docs]}

    router.churvox_isolation_routes_installed = True
