from datetime import datetime, timezone
from fastapi import Body, HTTPException, Request
from bson import ObjectId

from ai_operator_engine import require_owner, business_records, safe_id
from ai_operator.policy import classify_action, policy_snapshot
from ai_operator.quality import build_data_quality_report, build_data_quality_actions
from ai_operator.memory import (
    build_business_memory,
    build_memory_insights,
    load_audit_rows,
    save_business_memory,
)
from ai_operator.briefing import build_daily_briefing
from ai_operator.ask import answer_business_question
from ai_operator.planner import build_operator_plan
from ai_operator.reasoning import build_reasoning
from ai_operator.learning import record_owner_decision
from ai_operator.executor import execute_approved_action


def now_utc():
    return datetime.now(timezone.utc)


def clean_value(value):
    if isinstance(value, ObjectId):
        return str(value)

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, list):
        return [clean_value(item) for item in value]

    if isinstance(value, tuple):
        return [clean_value(item) for item in value]

    if isinstance(value, dict):
        output = {}
        for key, item in value.items():
            if key == "_id":
                output["id"] = str(item)
            else:
                output[key] = clean_value(item)
        return output

    return value


def normalize_records(raw):
    """
    Existing business_records() may return a dict or a 5-item tuple/list.
    Keep this route layer defensive so AI endpoints do not crash if the helper shape changes.
    """
    if isinstance(raw, dict):
        return {
            "jobs": raw.get("jobs") or [],
            "clients": raw.get("clients") or [],
            "workers": raw.get("workers") or [],
            "quotes": raw.get("quotes") or [],
            "invoices": raw.get("invoices") or [],
        }

    if isinstance(raw, (list, tuple)):
        values = list(raw) + [[], [], [], [], []]
        return {
            "jobs": values[0] or [],
            "clients": values[1] or [],
            "workers": values[2] or [],
            "quotes": values[3] or [],
            "invoices": values[4] or [],
        }

    return {
        "jobs": [],
        "clients": [],
        "workers": [],
        "quotes": [],
        "invoices": [],
    }


async def get_business_context(db, business_id, user):
    raw = await business_records(db, business_id, user)
    records = normalize_records(raw)

    actions = await db.ai_operator_actions.find({
        "business_id": str(business_id),
        "status": {"$in": ["pending", "ready", "needs_info", "approved", "failed"]},
    }).sort([("priority_score", -1), ("updated_at", -1), ("created_at", -1)]).limit(100).to_list(length=100)

    audit = await load_audit_rows(db, business_id, limit=300)

    quality = build_data_quality_report(
        jobs=records["jobs"],
        clients=records["clients"],
        workers=records["workers"],
        quotes=records["quotes"],
        invoices=records["invoices"],
    )

    memory = build_business_memory(
        jobs=records["jobs"],
        clients=records["clients"],
        workers=records["workers"],
        quotes=records["quotes"],
        invoices=records["invoices"],
        audit_rows=audit,
    )

    return {
        **records,
        "actions": actions,
        "audit": audit,
        "quality": quality,
        "memory": memory,
    }


async def latest_saved_memory(db, business_id, user=None):
    row = await db.ai_operator_memory.find_one({
        "business_id": str(business_id),
        "memory_type": "business_patterns",
    })

    if row:
        return row

    if user is None:
        return None

    ctx = await get_business_context(db, business_id, user)
    return await save_business_memory(db, business_id, ctx["memory"])


def setup_ai_operator_power_routes(api_router, db, jwt_secret, jwt_algorithm):
    async def owner_context(request: Request):
        return await require_owner(request, db, jwt_secret, jwt_algorithm)

    @api_router.get("/ai/operator/policy")
    async def ai_policy(request: Request):
        await owner_context(request)
        return {
            "success": True,
            "policy": clean_value(policy_snapshot()),
        }

    @api_router.get("/ai/operator/data-quality")
    async def ai_data_quality(request: Request):
        user, business_id = await owner_context(request)
        ctx = await get_business_context(db, business_id, user)
        actions = build_data_quality_actions(ctx["quality"])

        return {
            "success": True,
            "quality": clean_value(ctx["quality"]),
            "report": clean_value(ctx["quality"]),
            "actions": clean_value(actions),
            "dataQualityActions": clean_value(actions),
        }

    @api_router.get("/ai/operator/audit")
    async def ai_audit(request: Request, limit: int = 120):
        _, business_id = await owner_context(request)
        limit = max(1, min(int(limit or 120), 500))

        rows = await db.ai_operator_audit_log.find({
            "business_id": str(business_id),
        }).sort("created_at", -1).limit(limit).to_list(length=limit)

        cleaned = clean_value(rows)

        return {
            "success": True,
            "audit": cleaned,
            "rows": cleaned,
        }

    @api_router.post("/ai/operator/learn")
    async def ai_learn(request: Request):
        user, business_id = await owner_context(request)
        ctx = await get_business_context(db, business_id, user)
        saved = await save_business_memory(db, business_id, ctx["memory"])

        return {
            "success": True,
            "message": "AI business memory updated.",
            "memory": clean_value(saved),
        }

    @api_router.get("/ai/operator/memory")
    async def ai_memory(request: Request):
        user, business_id = await owner_context(request)
        row = await latest_saved_memory(db, business_id, user)

        return {
            "success": True,
            "memory": clean_value(row or {}),
        }

    @api_router.post("/ai/operator/daily-briefing")
    async def ai_daily_briefing(request: Request):
        user, business_id = await owner_context(request)
        ctx = await get_business_context(db, business_id, user)

        briefing = build_daily_briefing(
            jobs=ctx["jobs"],
            clients=ctx["clients"],
            workers=ctx["workers"],
            quotes=ctx["quotes"],
            invoices=ctx["invoices"],
            actions=ctx["actions"],
            audit_rows=ctx["audit"],
        )

        briefing["business_id"] = str(business_id)
        briefing["created_by"] = safe_id(user.get("_id") or user.get("id"))
        briefing["created_at"] = briefing.get("created_at") or now_utc()

        await db.ai_operator_briefings.insert_one(briefing)
        await save_business_memory(db, business_id, ctx["memory"])

        return {
            "success": True,
            "briefing": clean_value(briefing),
        }

    @api_router.get("/ai/operator/briefing/latest")
    async def ai_latest_briefing(request: Request):
        user, business_id = await owner_context(request)

        row = await db.ai_operator_briefings.find_one(
            {"business_id": str(business_id)},
            sort=[("created_at", -1)],
        )

        if not row:
            ctx = await get_business_context(db, business_id, user)
            row = build_daily_briefing(
                jobs=ctx["jobs"],
                clients=ctx["clients"],
                workers=ctx["workers"],
                quotes=ctx["quotes"],
                invoices=ctx["invoices"],
                actions=ctx["actions"],
                audit_rows=ctx["audit"],
            )
            row["business_id"] = str(business_id)
            row["created_by"] = safe_id(user.get("_id") or user.get("id"))
            row["created_at"] = row.get("created_at") or now_utc()
            await db.ai_operator_briefings.insert_one(row)

        return {
            "success": True,
            "briefing": clean_value(row),
        }

    @api_router.post("/ai/operator/ask")
    async def ai_ask(request: Request, payload: dict = Body(default={})):
        user, business_id = await owner_context(request)

        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Question payload must be an object.")

        question = str(payload.get("question") or payload.get("q") or "").strip()

        if not question:
            raise HTTPException(status_code=400, detail="Ask a business question first.")

        ctx = await get_business_context(db, business_id, user)
        saved_memory = await latest_saved_memory(db, business_id, user)
        memory_payload = clean_value(saved_memory or {"patterns": ctx["memory"], "insights": build_memory_insights(ctx["memory"])})

        answer_result = answer_business_question(
            question,
            jobs=ctx["jobs"],
            clients=ctx["clients"],
            workers=ctx["workers"],
            quotes=ctx["quotes"],
            invoices=ctx["invoices"],
            actions=ctx["actions"],
            quality=ctx["quality"],
            memory=memory_payload,
        )

        if isinstance(answer_result, dict):
            answer = answer_result.get("answer") or str(answer_result)
        else:
            answer = str(answer_result)

        record = {
            "business_id": str(business_id),
            "question": question,
            "answer": answer,
            "asked_by": safe_id(user.get("_id") or user.get("id")),
            "created_at": now_utc(),
        }

        await db.ai_operator_questions.insert_one(record)

        return {
            "success": True,
            "question": question,
            "answer": answer,
        }

    @api_router.post("/ai/operator/classify-action")
    async def ai_classify_action(request: Request, payload: dict = Body(default={})):
        await owner_context(request)

        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Action payload must be an object.")

        action_type = payload.get("action_type") or payload.get("type") or ""
        action = payload.get("action") or payload

        return {
            "success": True,
            "classification": clean_value(classify_action(action_type, action)),
            "policy": clean_value(classify_action(action_type, action)),
        }


    @api_router.post("/ai/operator/plan")
    async def ai_operator_plan(request: Request):
        user, business_id = await owner_context(request)
        ctx = await get_business_context(db, business_id, user)
        actions = build_operator_plan(ctx["jobs"], ctx["clients"], ctx["workers"], ctx["quotes"], ctx["invoices"], ctx["memory"], ctx["quality"], existing_actions=ctx["actions"])
        created = 0
        for action in actions:
            action["business_id"] = str(business_id)
            reasoning = build_reasoning(action, ctx, ctx["memory"], ctx["quality"])
            action.update(reasoning)
            row = await db.ai_operator_actions.find_one({"business_id": str(business_id), "fingerprint": action.get("fingerprint"), "status": {"$in": ["pending","ready","needs_info"]}})
            if not row:
                await db.ai_operator_actions.insert_one(action)
                created += 1
        rows = await db.ai_operator_actions.find({"business_id": str(business_id)}).sort([("priority_score", -1), ("created_at", -1)]).limit(200).to_list(length=200)
        return {"success": True, "created": created, "actions": clean_value(rows), "briefing_summary": {"prepared": len(rows)}}

    @api_router.get("/ai/operator/actions")
    async def ai_operator_actions(request: Request, status: str | None = None):
        _, business_id = await owner_context(request)
        q={"business_id": str(business_id)}
        if status: q["status"]=status
        rows=await db.ai_operator_actions.find(q).sort([("priority_score", -1), ("created_at", -1)]).limit(200).to_list(length=200)
        return {"success": True, "actions": clean_value(rows)}

    @api_router.get("/ai/operator/actions/{action_id}")
    async def ai_operator_action(request: Request, action_id: str):
        _, business_id = await owner_context(request)
        row = await db.ai_operator_actions.find_one({"business_id": str(business_id), "$or":[{"id": action_id}, {"_id": ObjectId(action_id) if ObjectId.is_valid(action_id) else None}]})
        if not row: raise HTTPException(status_code=404, detail="Action not found")
        audit = await db.ai_operator_audit_log.find({"business_id": str(business_id), "action_id": str(row.get('id') or row.get('_id'))}).sort("created_at", -1).limit(100).to_list(length=100)
        return {"success": True, "action": clean_value(row), "audit": clean_value(audit)}

    @api_router.post("/ai/operator/actions/{action_id}/edit")
    async def ai_operator_action_edit(request: Request, action_id: str, payload: dict = Body(default={})):
        user, business_id = await owner_context(request)
        edited_payload = payload.get("edited_payload") or payload.get("payload") or {}
        row = await db.ai_operator_actions.find_one({"business_id": str(business_id), "$or":[{"id": action_id}, {"_id": ObjectId(action_id) if ObjectId.is_valid(action_id) else None}]})
        if not row: raise HTTPException(status_code=404, detail="Action not found")
        await db.ai_operator_actions.update_one({"_id": row.get("_id")}, {"$set": {"owner_edited_payload": edited_payload, "updated_at": now_utc()}})
        await record_owner_decision(db, business_id, user, row, "edited", edited_payload=edited_payload)
        return {"success": True, "message": "Edits saved."}

    @api_router.post("/ai/operator/actions/{action_id}/approve")
    async def ai_operator_action_approve(request: Request, action_id: str, payload: dict = Body(default={})):
        user, business_id = await owner_context(request)
        edited_payload = payload.get("edited_payload") or {}
        row = await db.ai_operator_actions.find_one({"business_id": str(business_id), "$or":[{"id": action_id}, {"_id": ObjectId(action_id) if ObjectId.is_valid(action_id) else None}]})
        if not row: raise HTTPException(status_code=404, detail="Action not found")
        await record_owner_decision(db, business_id, user, row, "approved", edited_payload=edited_payload)
        try:
            result = await execute_approved_action(db, business_id, user, row, approved_payload=edited_payload)
            await db.ai_operator_actions.update_one({"_id": row.get("_id")}, {"$set": {"status": "executed", "updated_at": now_utc()}})
            return {"success": True, "message": "Action approved and executed.", "result": clean_value(result)}
        except Exception as e:
            await db.ai_operator_actions.update_one({"_id": row.get("_id")}, {"$set": {"status": "failed", "error": str(e), "updated_at": now_utc()}})
            raise HTTPException(status_code=400, detail=str(e))

    @api_router.post("/ai/operator/actions/{action_id}/reject")
    async def ai_operator_action_reject(request: Request, action_id: str, payload: dict = Body(default={})):
        user, business_id = await owner_context(request)
        row = await db.ai_operator_actions.find_one({"business_id": str(business_id), "$or":[{"id": action_id}, {"_id": ObjectId(action_id) if ObjectId.is_valid(action_id) else None}]})
        if not row: raise HTTPException(status_code=404, detail="Action not found")
        reason = payload.get("reason")
        await record_owner_decision(db, business_id, user, row, "rejected", reason=reason)
        await db.ai_operator_actions.update_one({"_id": row.get("_id")}, {"$set": {"status": "rejected", "reject_reason": reason, "updated_at": now_utc()}})
        return {"success": True, "message": "Action rejected."}

    @api_router.get("/ai/operator/activity")
    async def ai_operator_activity(request: Request, limit: int = 120):
        _, business_id = await owner_context(request)
        rows = await db.ai_operator_audit_log.find({"business_id": str(business_id)}).sort("created_at", -1).limit(max(1,min(limit,500))).to_list(length=max(1,min(limit,500)))
        return {"success": True, "activity": clean_value(rows)}
