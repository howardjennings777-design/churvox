from datetime import datetime, timezone
from fastapi import HTTPException, Request
from pydantic import BaseModel
from ai_operator.policy import classify_action, policy_snapshot
from ai_operator.quality import build_data_quality_report, build_data_quality_actions
from ai_operator.memory import build_business_memory, build_memory_insights, load_audit_rows, save_business_memory
from ai_operator.briefing import build_daily_briefing
from ai_operator.ask import answer_business_question
from ai_operator_engine import require_owner, business_records, safe_id, public_doc

class AskReq(BaseModel):
    question: str | None = None
    q: str | None = None

class ClassifyReq(BaseModel):
    action_type: str
    payload: dict = {}

def setup_ai_operator_power_routes(api_router, db, jwt_secret, jwt_algorithm):
    @api_router.get('/ai/operator/policy')
    async def get_policy(request: Request):
        await require_owner(request, db, jwt_secret, jwt_algorithm)
        return {"success": True, "policy": policy_snapshot()}

    @api_router.get('/ai/operator/data-quality')
    async def get_data_quality(request: Request):
        user, business_id = await require_owner(request, db, jwt_secret, jwt_algorithm)
        jobs, clients, workers, quotes, invoices = await business_records(db, business_id, user)
        report = build_data_quality_report(jobs, clients, workers, quotes, invoices)
        return {"success": True, "quality": report, "actions": build_data_quality_actions(report)}

    @api_router.get('/ai/operator/audit')
    async def get_audit(request: Request):
        _, business_id = await require_owner(request, db, jwt_secret, jwt_algorithm)
        rows = await db.ai_operator_audit_log.find({"business_id": str(business_id)}).sort("created_at", -1).limit(100).to_list(length=100)
        return {"success": True, "rows": [public_doc(r) for r in rows]}

    @api_router.post('/ai/operator/learn')
    async def learn(request: Request):
        user, business_id = await require_owner(request, db, jwt_secret, jwt_algorithm)
        jobs, clients, workers, quotes, invoices = await business_records(db, business_id, user)
        audit_rows = await load_audit_rows(db, business_id)
        memory = build_business_memory(jobs, clients, workers, quotes, invoices, audit_rows)
        await save_business_memory(db, business_id, memory)
        return {"success": True, "memory": memory, "insights": build_memory_insights(memory)}

    @api_router.get('/ai/operator/memory')
    async def get_memory(request: Request):
        user, business_id = await require_owner(request, db, jwt_secret, jwt_algorithm)
        found = await db.ai_operator_memory.find_one({"business_id": str(business_id), "memory_type": "business_patterns"})
        if not found:
            jobs, clients, workers, quotes, invoices = await business_records(db, business_id, user)
            memory = build_business_memory(jobs, clients, workers, quotes, invoices, await load_audit_rows(db, business_id))
            await save_business_memory(db, business_id, memory)
            found = await db.ai_operator_memory.find_one({"business_id": str(business_id), "memory_type": "business_patterns"})
        return {"success": True, "memory": public_doc(found)}

    @api_router.post('/ai/operator/daily-briefing')
    async def daily_briefing(request: Request):
        user, business_id = await require_owner(request, db, jwt_secret, jwt_algorithm)
        jobs, clients, workers, quotes, invoices = await business_records(db, business_id, user)
        actions = await db.ai_operator_actions.find({"business_id": str(business_id)}).limit(200).to_list(length=200)
        briefing = build_daily_briefing(jobs, clients, workers, quotes, invoices, actions, await load_audit_rows(db, business_id))
        doc = {"business_id": str(business_id), **briefing, "created_at": datetime.now(timezone.utc)}
        await db.ai_operator_briefings.insert_one(doc)
        await save_business_memory(db, business_id, briefing.get("memory") or {})
        return {"success": True, "briefing": public_doc(doc)}

    @api_router.get('/ai/operator/briefing/latest')
    async def latest_briefing(request: Request):
        _, business_id = await require_owner(request, db, jwt_secret, jwt_algorithm)
        row = await db.ai_operator_briefings.find_one({"business_id": str(business_id)}, sort=[("created_at", -1)])
        if not row:
            jobs, clients, workers, quotes, invoices = await business_records(db, business_id, await db.users.find_one({"business_id": str(business_id)}) or {})
            actions = await db.ai_operator_actions.find({"business_id": str(business_id)}).limit(200).to_list(length=200)
            briefing = build_daily_briefing(jobs, clients, workers, quotes, invoices, actions, await load_audit_rows(db, business_id))
            row = {"business_id": str(business_id), **briefing, "created_at": datetime.now(timezone.utc)}
            await db.ai_operator_briefings.insert_one(row)
        return {"success": True, "briefing": public_doc(row)}

    @api_router.post('/ai/operator/ask')
    async def ask(request: Request, body: AskReq):
        user, business_id = await require_owner(request, db, jwt_secret, jwt_algorithm)
        jobs, clients, workers, quotes, invoices = await business_records(db, business_id, user)
        actions = await db.ai_operator_actions.find({"business_id": str(business_id)}).limit(100).to_list(length=100)
        quality = build_data_quality_report(jobs, clients, workers, quotes, invoices)
        memory_doc = await db.ai_operator_memory.find_one({"business_id": str(business_id), "memory_type": "business_patterns"})
        answer = answer_business_question(body.question or body.q, jobs, clients, workers, quotes, invoices, actions, quality, (memory_doc or {}).get("memory"))
        await db.ai_operator_questions.insert_one({"business_id": str(business_id), "question": body.question or body.q, "answer": answer, "created_at": datetime.now(timezone.utc)})
        return {"success": True, "answer": answer}

    @api_router.post('/ai/operator/classify-action')
    async def classify(request: Request, body: ClassifyReq):
        await require_owner(request, db, jwt_secret, jwt_algorithm)
        return {"success": True, "policy": classify_action(body.action_type, body.payload)}
