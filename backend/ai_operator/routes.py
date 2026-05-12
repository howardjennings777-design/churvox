from datetime import datetime, timezone
from fastapi import HTTPException, Request
from ai_operator_engine import require_owner, business_records, safe_id
from ai_operator.policy import classify_action, policy_snapshot
from ai_operator.quality import build_data_quality_report
from ai_operator.memory import build_business_memory, load_audit_rows, save_business_memory
from ai_operator.briefing import build_daily_briefing
from ai_operator.ask import answer_business_question


def setup_ai_operator_power_routes(api_router, db, jwt_secret, jwt_algorithm):
    async def _ctx(request: Request):
        return await require_owner(request, db, jwt_secret, jwt_algorithm)

    @api_router.get("/ai/operator/policy")
    async def ai_policy(request: Request):
        await _ctx(request)
        return {"success": True, "policy": policy_snapshot()}

    @api_router.get("/ai/operator/data-quality")
    async def ai_data_quality(request: Request):
        user, business_id = await _ctx(request)
        records = await business_records(db, business_id, user)
        return {"success": True, "report": build_data_quality_report(**records)}

    @api_router.get("/ai/operator/audit")
    async def ai_audit(request: Request, limit: int = 120):
        _, business_id = await _ctx(request)
        rows = [dict(r) async for r in db.ai_operator_audit_log.find({"business_id": str(business_id)}).sort("created_at", -1).limit(max(1, min(limit, 500)))]
        return {"success": True, "rows": [{**r, "id": safe_id(r.get("_id"))} for r in rows]}

    @api_router.post("/ai/operator/learn")
    async def ai_learn(request: Request):
        user, business_id = await _ctx(request)
        records = await business_records(db, business_id, user)
        audit_rows = [dict(r) async for r in load_audit_rows(db, business_id, 300)]
        memory = build_business_memory(**records, audit_rows=audit_rows)
        saved = await save_business_memory(db, business_id, memory)
        return {"success": True, "memory": saved}

    @api_router.get("/ai/operator/memory")
    async def ai_memory(request: Request):
        _, business_id = await _ctx(request)
        row = await db.ai_operator_memory.find_one({"business_id": str(business_id), "memory_type": "business_patterns"})
        return {"success": True, "memory": {**(row or {}), "id": safe_id((row or {}).get("_id"))}}

    @api_router.post("/ai/operator/daily-briefing")
    async def ai_daily_briefing(request: Request):
        user, business_id = await _ctx(request)
        records = await business_records(db, business_id, user)
        actions = [dict(r) async for r in db.ai_operator_actions.find({"business_id": str(business_id)}).sort("created_at", -1).limit(100)]
        audit_rows = [dict(r) async for r in load_audit_rows(db, business_id, 300)]
        briefing = build_daily_briefing(**records, actions=actions, audit_rows=audit_rows)
        briefing["business_id"] = str(business_id)
        briefing["created_by"] = safe_id(user.get("id"))
        await db.ai_operator_briefings.insert_one(briefing)
        return {"success": True, "briefing": briefing}

    @api_router.get("/ai/operator/briefing/latest")
    async def ai_latest_briefing(request: Request):
        _, business_id = await _ctx(request)
        row = await db.ai_operator_briefings.find_one({"business_id": str(business_id)}, sort=[("created_at", -1)])
        return {"success": True, "briefing": {**(row or {}), "id": safe_id((row or {}).get("_id"))}}

    @api_router.post("/ai/operator/ask")
    async def ai_ask(request: Request, payload: dict):
        user, business_id = await _ctx(request)
        question = str((payload or {}).get("question") or "").strip()
        if not question:
            raise HTTPException(status_code=400, detail="question is required")
        records = await business_records(db, business_id, user)
        quality = build_data_quality_report(**records)
        mem_row = await db.ai_operator_memory.find_one({"business_id": str(business_id), "memory_type": "business_patterns"}) or {}
        answer = answer_business_question(question, **records, quality=quality, memory={"patterns": mem_row.get("patterns"), "insights": mem_row.get("insights")})
        await db.ai_operator_questions.insert_one({"business_id": str(business_id), "question": question, "answer": answer, "asked_by": safe_id(user.get("id")), "created_at": datetime.now(timezone.utc)})
        return {"success": True, **answer}

    @api_router.post("/ai/operator/classify-action")
    async def ai_classify_action(request: Request, payload: dict):
        await _ctx(request)
        return {"success": True, "policy": classify_action((payload or {}).get("action_type"), payload.get("action"))}
