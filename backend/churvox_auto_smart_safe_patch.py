from __future__ import annotations

try:
    import churvox_auto_smart_patch as auto_smart
except Exception:  # pragma: no cover
    auto_smart = None


if auto_smart is not None:
    async def safe_store_actions(db, bid, actions):
        stored = 0
        for item in (actions or [])[:300]:
            if not isinstance(item, dict):
                continue
            action_id = auto_smart.clean(item.get("id") or item.get("action_id") or item.get("title"))
            if not action_id:
                continue
            existing = await auto_smart.safe_one(db.ai_approval_actions, {"business_id": bid, "id": action_id})
            if existing and auto_smart.lower(existing.get("status")) in auto_smart.FINAL_STATUSES:
                continue
            doc = auto_smart.json_safe({**item, "id": action_id, "business_id": bid, "updated_at": auto_smart.now_utc()})
            created_at = doc.pop("created_at", None) or auto_smart.now_utc()
            try:
                await db.ai_approval_actions.update_one(
                    {"business_id": bid, "id": action_id},
                    {"$set": doc, "$setOnInsert": {"created_at": created_at}},
                    upsert=True,
                )
                stored += 1
            except Exception:
                pass
        return stored

    auto_smart.store_actions = safe_store_actions
