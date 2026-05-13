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



ACTIVE_AI_ACTION_STATUSES = ["pending", "ready", "needs_info", "waiting_owner"]

REVIEW_ONLY_ACTION_ALIASES = {
    "operator_health_check",
    "proof_to_paid_review",
    "operator_error_recovery",
    "dispatch_review",
    "cashflow_followup",
    "invoice_follow_up",
    "job_assignment",
}


def normalize_ai_action_type(action):
    if not isinstance(action, dict):
        return "ai_setup_task"

    raw = str(action.get("action_type") or "").strip()

    if not raw:
        raw = str(action.get("type") or "").strip()

    if not raw:
        payload = action.get("suggested_payload") or action.get("payload") or {}
        if isinstance(payload, dict):
            raw = str(payload.get("action_type") or payload.get("type") or "").strip()

    if not raw or raw in REVIEW_ONLY_ACTION_ALIASES:
        return "ai_setup_task"

    return raw


def prepare_ai_action(action):
    if not isinstance(action, dict):
        return action

    display_type = str(action.get("type") or action.get("action_type") or "ai_setup_task").strip()
    action["type"] = display_type or "ai_setup_task"
    action["action_type"] = normalize_ai_action_type(action)

    return action


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
        "status": {"$in": ACTIVE_AI_ACTION_STATUSES},
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



def action_lookup_filter(business_id, action_id):
    action_id = str(action_id or "")
    ors = [{"id": action_id}]

    if ObjectId.is_valid(action_id):
        ors.append({"_id": ObjectId(action_id)})

    return {
        "business_id": str(business_id),
        "$or": ors,
    }

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
        business_id = str(business_id)
        created = 0
        planner_error = None

        def safe_review_actions(error_text=None):
            now = now_utc()
            return [
                {
                    "id": "fallback_operator_health_check",
                    "business_id": business_id,
                    "action_type": "ai_setup_task",
                    "type": "operator_health_check",
                    "category": "AI Operator",
                    "title": "Review AI Operator setup",
                    "summary": "The AI route is live. This confirms the queue, review drawer, approval and reject flow are working from the backend.",
                    "reason": "Churvox created this backend action because no stronger AI action was available yet.",
                    "guardrail": "This action does not send messages, assign workers, change payroll, charge customers or sync accounting.",
                    "status": "pending",
                    "priority_score": 99,
                    "confidence": "safe_test",
                    "risk": "low",
                    "fingerprint": f"{business_id}:fallback_operator_health_check",
                    "suggested_payload": {
                        "next_step": "Review, approve or reject this action to confirm the AI workflow.",
                        "planner_error": error_text,
                    },
                    "owner_can_edit": True,
                    "approval_required": True,
                    "created_at": now,
                    "updated_at": now,
                },
                {
                    "id": "fallback_proof_to_paid_review",
                    "business_id": business_id,
                    "action_type": "ai_setup_task",
                    "type": "proof_to_paid_review",
                    "category": "Proof to paid",
                    "title": "Prepare completed work for invoice review",
                    "summary": "AI can help turn completed jobs, notes and proof photos into invoice-ready admin for owner approval.",
                    "reason": "This safe backend action confirms the proof-to-paid approval workflow is connected.",
                    "guardrail": "Nothing is sent to customers without owner approval.",
                    "status": "pending",
                    "priority_score": 90,
                    "confidence": "safe_test",
                    "risk": "low",
                    "fingerprint": f"{business_id}:fallback_proof_to_paid_review",
                    "suggested_payload": {"action": "review_completed_jobs"},
                    "owner_can_edit": True,
                    "approval_required": True,
                    "created_at": now,
                    "updated_at": now,
                },
                {
                    "id": "fallback_dispatch_review",
                    "business_id": business_id,
                    "action_type": "ai_setup_task",
                    "type": "dispatch_review",
                    "category": "Dispatch",
                    "title": "Review unassigned jobs for worker matching",
                    "summary": "AI can help match jobs to workers by area, workload, availability and job type before owner approval.",
                    "reason": "This safe backend action confirms the dispatch approval workflow is connected.",
                    "guardrail": "No worker is assigned until the owner approves.",
                    "status": "pending",
                    "priority_score": 88,
                    "confidence": "safe_test",
                    "risk": "low",
                    "fingerprint": f"{business_id}:fallback_dispatch_review",
                    "suggested_payload": {"action": "review_unassigned_jobs"},
                    "owner_can_edit": True,
                    "approval_required": True,
                    "created_at": now,
                    "updated_at": now,
                },
            ]

        try:
            ctx = await get_business_context(db, business_id, user)

            try:
                actions = build_operator_plan(
                    ctx.get("jobs", []),
                    ctx.get("clients", []),
                    ctx.get("workers", []),
                    ctx.get("quotes", []),
                    ctx.get("invoices", []),
                    ctx.get("memory", {}),
                    ctx.get("quality", {}),
                    existing_actions=ctx.get("actions", []),
                )
            except Exception as exc:
                planner_error = str(exc)
                actions = []

            if not isinstance(actions, list):
                actions = []

            if not actions:
                actions = safe_review_actions(planner_error)

            for index, action in enumerate(actions):
                if not isinstance(action, dict):
                    continue

                action = prepare_ai_action(action)

                now = now_utc()
                action["business_id"] = business_id
                action["id"] = str(action.get("id") or action.get("fingerprint") or f"ai_action_{index}")
                action["type"] = action.get("type") or action.get("action_type") or "ai_setup_task"
                action["action_type"] = normalize_ai_action_type(action)

                action["status"] = action.get("status") or "pending"
                action["created_at"] = action.get("created_at") or now
                action["updated_at"] = now
                action["fingerprint"] = action.get("fingerprint") or f"{business_id}:{action['action_type']}:{action['id']}"
                action["title"] = action.get("title") or "AI prepared action"
                action["summary"] = action.get("summary") or action.get("reason") or "Review this AI-prepared action before anything changes."
                action["guardrail"] = action.get("guardrail") or "Nothing is sent, assigned, charged, synced or changed without owner approval."
                action["suggested_payload"] = action.get("suggested_payload") or action.get("payload") or {}

                try:
                    reasoning = build_reasoning(
                        action,
                        ctx,
                        ctx.get("memory", {}),
                        ctx.get("quality", {}),
                    )
                    if isinstance(reasoning, dict):
                        action.update(reasoning)
                except Exception as exc:
                    action["reasoning_error"] = str(exc)

                existing = await db.ai_operator_actions.find_one({
                    "business_id": business_id,
                    "fingerprint": action.get("fingerprint"),
                    "status": {"$in": ACTIVE_AI_ACTION_STATUSES},
                })

                if not existing:
                    await db.ai_operator_actions.insert_one(action)
                    created += 1

        except Exception as exc:
            planner_error = str(exc)

            for action in safe_review_actions(planner_error):
                action = prepare_ai_action(action)

                existing = await db.ai_operator_actions.find_one({
                    "business_id": business_id,
                    "fingerprint": action.get("fingerprint"),
                    "status": {"$in": ACTIVE_AI_ACTION_STATUSES},
                })

                if not existing:
                    await db.ai_operator_actions.insert_one(action)
                    created += 1

        rows = await db.ai_operator_actions.find({
            "business_id": business_id,
            "status": {"$in": ACTIVE_AI_ACTION_STATUSES},
        }).sort([
            ("priority_score", -1),
            ("updated_at", -1),
            ("created_at", -1),
        ]).limit(200).to_list(length=200)

        return {
            "success": True,
            "created": created,
            "actions": clean_value(rows),
            "briefing_summary": {"prepared": len(rows)},
            "planner_error": planner_error,
        }

    @api_router.get("/ai/operator/actions")
    async def ai_operator_actions(request: Request, status: str | None = None):
        _, business_id = await owner_context(request)
        business_id = str(business_id)

        if status:
            query = {"business_id": business_id, "status": status}
        else:
            query = {
                "business_id": business_id,
                "status": {"$in": ACTIVE_AI_ACTION_STATUSES},
            }

        rows = await db.ai_operator_actions.find(query).sort([
            ("priority_score", -1),
            ("updated_at", -1),
            ("created_at", -1),
        ]).limit(200).to_list(length=200)

        return {
            "success": True,
            "actions": clean_value(rows),
            "count": len(rows),
        }

    @api_router.get("/ai/operator/actions/{action_id}")
    async def ai_operator_action(request: Request, action_id: str):
        _, business_id = await owner_context(request)
        row = await db.ai_operator_actions.find_one(action_lookup_filter(business_id, action_id))
        if not row: raise HTTPException(status_code=404, detail="Action not found")
        audit = await db.ai_operator_audit_log.find({"business_id": str(business_id), "action_id": str(row.get('id') or row.get('_id'))}).sort("created_at", -1).limit(100).to_list(length=100)
        return {"success": True, "action": clean_value(row), "audit": clean_value(audit)}

    @api_router.post("/ai/operator/actions/{action_id}/edit")
    async def ai_operator_action_edit(request: Request, action_id: str, payload: dict = Body(default={})):
        user, business_id = await owner_context(request)
        edited_payload = payload.get("edited_payload") or payload.get("payload") or {}
        row = await db.ai_operator_actions.find_one(action_lookup_filter(business_id, action_id))
        if not row: raise HTTPException(status_code=404, detail="Action not found")
        await db.ai_operator_actions.update_one({"_id": row.get("_id")}, {"$set": {"owner_edited_payload": edited_payload, "updated_at": now_utc()}})
        await record_owner_decision(db, business_id, user, row, "edited", edited_payload=edited_payload)
        return {"success": True, "message": "Edits saved."}

    @api_router.post("/ai/operator/actions/{action_id}/approve")
    async def ai_operator_action_approve(request: Request, action_id: str, payload: dict = Body(default={})):
        user, business_id = await owner_context(request)
        edited_payload = payload.get("edited_payload") or {}
        row = await db.ai_operator_actions.find_one(action_lookup_filter(business_id, action_id))
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
        row = await db.ai_operator_actions.find_one(action_lookup_filter(business_id, action_id))
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
