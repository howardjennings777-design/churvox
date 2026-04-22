"""
End-to-end proof: Real rule + real app event + real run + real notification + deep-link.

Flow:
  1. Log in as business owner (launchtest@churvox.com)
  2. Create a client + worker
  3. Create an automation rule on `job_assigned` that fires a notification to the worker
  4. Create a job assigned to that worker — hits real /api/jobs endpoint
  5. Verify the automation_run is recorded as completed
  6. Verify the notification exists for the worker with correct route
  7. Verify unread count
  8. Clean up

Run: python3 /app/backend/tests/test_automation_e2e_proof.py
"""
import os, json, time, urllib.request, urllib.error, sys

API = os.environ.get("API", "http://localhost:8001")


def req(method, path, token=None, body=None):
    url = API + path
    h = {"Content-Type": "application/json"}
    if token: h["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, method=method, headers=h, data=data)
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def login(email, password):
    code, body = req("POST", "/api/auth/login", body={"email": email, "password": password})
    assert code == 200, f"login {email} failed {code} {body}"
    return body["token"], body.get("user", body)


def main():
    # 1) Owner login
    owner_tok, owner_user = login("launchtest@churvox.com", "Launch2025!")
    bid = owner_user.get("business_id") or owner_user.get("id") or owner_user.get("_id")
    print(f"[ok] owner logged in, business_id={bid}")

    # 2) Ensure we have a worker + client
    # Create a test worker via team invite
    worker_email = f"e2eworker_{int(time.time())}@churvox.com"
    code, worker = req("POST", "/api/team/workers", token=owner_tok, body={
        "name": "E2E Worker",
        "email": worker_email,
        "phone": "",
        "country": "New Zealand",
        "region": "Auckland",
        "role": "worker",
    })
    assert 200 <= code < 300, f"create worker failed {code} {worker}"
    worker_id = worker.get("worker", {}).get("id") or worker.get("id")
    print(f"[ok] created worker id={worker_id}")

    # Quick client
    code, client = req("POST", "/api/clients", token=owner_tok, body={
        "name": "E2E Client", "email": "client@example.com", "phone": "",
        "address": "123 Test St",
    })
    client_id = client.get("id") or client.get("client_id")
    print(f"[ok] created client id={client_id}")

    # 3) Create a rule: on job_assigned → notify worker with deep-link
    rule_payload = {
        "name": f"E2E notify worker on assignment {int(time.time())}",
        "description": "End-to-end proof rule",
        "trigger": "job_assigned",
        "enabled": True,
        "condition_mode": "all",
        "conditions": [{"path": "job.worker_id", "op": "not_blank", "value": ""}],
        "actions": [{
            "type": "create_notification",
            "config": {
                "user_id": "{{job.worker_id}}",
                "title": "E2E: you were assigned {{job.title}}",
                "message": "From trigger {{trigger}}; status={{job.status}}",
                "route": "/worker/jobs/{{job.id}}",
                "target_type": "job",
                "target_id": "{{job.id}}",
                "notification_type": "job_assigned",
            },
        }],
    }
    code, rule = req("POST", "/api/automation/rules", token=owner_tok, body=rule_payload)
    assert 200 <= code < 300, f"create rule failed {code} {rule}"
    rule_id = rule["id"]
    print(f"[ok] rule created id={rule_id}")

    try:
        # 4) Create a real job assigning it to this worker (triggers real job_assigned)
        code, job = req("POST", "/api/jobs", token=owner_tok, body={
            "title": "E2E Kitchen Tap Replacement",
            "job_type": "plumbing",
            "client_id": client_id,
            "client_name": "E2E Client",
            "address": "123 Test St",
            "country": "New Zealand",
            "region": "Auckland",
            "scheduled_date": "2026-05-01",
            "estimated_duration": 60,
            "price": 180,
            "pricing_type": "fixed",
            "assigned_worker_id": worker_id,
            "status": "assigned",
        })
        assert 200 <= code < 300, f"create job failed {code} {job}"
        job_id = job.get("id")
        print(f"[ok] job created id={job_id} assigned_worker_id={worker_id}")
        time.sleep(0.6)  # let engine flush

        # 5) Verify automation_run recorded
        code, runs = req("GET", "/api/automation/runs?limit=20", token=owner_tok)
        matching = [r for r in runs if r.get("rule_id") == rule_id and r.get("trigger") == "job_assigned"]
        assert matching, f"no run found for rule={rule_id}, latest runs: {[(r.get('trigger'), r.get('status')) for r in runs[:5]]}"
        run = matching[0]
        assert run["status"] == "completed", f"run status={run['status']}, errors={run.get('error')} results={run.get('results')}"
        assert run["results"] and run["results"][0]["ok"], f"action failed: {run['results']}"
        notif_id_from_run = run["results"][0].get("notification_id")
        assert notif_id_from_run, f"no notification_id in action result: {run['results'][0]}"
        print(f"[ok] automation run completed; notification_id={notif_id_from_run}")

        # 6) Log in as the worker's account would require password — instead we read the notification as the worker
        # We can't log in as the invited worker (no password yet). Instead query via a direct DB-verified notifications fetch.
        # Use /api/notifications as *owner* to list their own, then verify via Mongo-style check that a notification
        # with user_id=worker_id exists. We'll call list_notifications impersonating via a separate tool.
        # Easiest: directly query via backend Mongo since this is an E2E smoke in-container.
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        from dotenv import load_dotenv
        load_dotenv('/app/backend/.env')

        async def check_notif():
            c = AsyncIOMotorClient(os.environ['MONGO_URL'])
            db = c[os.environ['DB_NAME']]
            from bson import ObjectId
            n = await db.notifications.find_one({"_id": ObjectId(notif_id_from_run)})
            return n

        n = asyncio.get_event_loop().run_until_complete(check_notif())
        assert n, f"notification {notif_id_from_run} not found in DB"
        assert n.get("user_id") == str(worker_id), f"notification user_id mismatch got={n.get('user_id')} want={worker_id}"
        assert n.get("route") == f"/worker/jobs/{job_id}", f"bad deep-link route: {n.get('route')}"
        assert "E2E: you were assigned E2E Kitchen Tap Replacement" in (n.get("title") or ""), f"bad title token render: {n.get('title')}"
        assert f"trigger job_assigned; status=assigned" in (n.get("message") or ""), f"bad message token render: {n.get('message')}"
        assert n.get("read") is False
        print(f"[ok] notification persisted to worker, deep-link={n.get('route')}, title='{n.get('title')}'")
        print(f"[ok] tokens rendered: {{trigger}}→job_assigned, {{job.id}}, {{job.title}}, {{job.status}}")

        # Cleanup job
        req("DELETE", f"/api/jobs/{job_id}", token=owner_tok)
    finally:
        req("DELETE", f"/api/automation/rules/{rule_id}", token=owner_tok)
        if worker_id:
            req("DELETE", f"/api/team/workers/{worker_id}", token=owner_tok)

    print("\nE2E_PROOF_OK — real rule + real event + real run + real notification + real deep-link")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        print("FAIL:", e)
        sys.exit(1)
    except Exception as e:
        import traceback; traceback.print_exc()
        sys.exit(2)
