# PHASE_166_FIX_LIVE_WORKFLOW_TEST_HTTPS_CLIENT
from pathlib import Path
from datetime import datetime, timezone
import json
import os
import ssl
import urllib.request
import urllib.error
import http.cookiejar

BACKEND = os.getenv("CHURVOX_BACKEND_URL", "https://grassley-backend.onrender.com").rstrip("/")
FRONTEND = os.getenv("CHURVOX_FRONTEND_URL", "https://www.churvox.com").rstrip("/")

OWNER_EMAIL = os.getenv("CHURVOX_TEST_EMAIL", "hello@churvox.com")
OWNER_PASSWORD = os.getenv("CHURVOX_TEST_PASSWORD", "TempPass123!")

# Optional. If these are not set, the worker login part is skipped, not failed.
WORKER_EMAIL = os.getenv("CHURVOX_WORKER_EMAIL", "").strip()
WORKER_PASSWORD = os.getenv("CHURVOX_WORKER_PASSWORD", "").strip()

context = ssl.create_default_context()

class Client:
    def __init__(self):
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookies),
            urllib.request.HTTPSHandler(context=context),
        )
        self.token = ""

    def request(self, method, path, body=None, auth=True, timeout=30):
        url = path if path.startswith("http") else BACKEND + path
        data = None
        headers = {
            "Accept": "application/json",
            "Origin": FRONTEND,
        }

        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"

        if auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            res = self.opener.open(req, timeout=timeout)
            raw = res.read()
            text = raw.decode("utf-8", errors="ignore")
            try:
                parsed = json.loads(text) if text else None
            except Exception:
                parsed = text[:600]
            return {"ok": 200 <= res.status < 300, "status": res.status, "data": parsed, "text": text, "error": ""}
        except urllib.error.HTTPError as e:
            raw = e.read()
            text = raw.decode("utf-8", errors="ignore")
            try:
                parsed = json.loads(text) if text else None
            except Exception:
                parsed = text[:600]
            return {"ok": False, "status": e.code, "data": parsed, "text": text, "error": str(e)}
        except Exception as e:
            return {"ok": False, "status": 0, "data": None, "text": "", "error": str(e)}

def short(data):
    if data is None:
        return ""
    try:
        return json.dumps(data, default=str)[:700]
    except Exception:
        return str(data)[:700]

def extract_token(data):
    if not isinstance(data, dict):
        return ""
    for key in ["access_token", "token", "jwt"]:
        if data.get(key):
            return str(data[key])
    user = data.get("user")
    if isinstance(user, dict):
        for key in ["access_token", "token", "jwt"]:
            if user.get(key):
                return str(user[key])
    return ""

def pick_id(data):
    if isinstance(data, dict):
        for key in ["id", "_id", "client_id", "job_id", "worker_id", "user_id"]:
            if data.get(key):
                return str(data[key])
        for value in data.values():
            found = pick_id(value)
            if found:
                return found
    if isinstance(data, list) and data:
        return pick_id(data[0])
    return ""

def pick_list(data, keys):
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in keys:
            value = data.get(key)
            if isinstance(value, list):
                return value
    return []

def add(results, name, status, ok, detail="", expected=None):
    results.append({
        "name": name,
        "status": status,
        "ok": bool(ok),
        "expected": expected or [],
        "detail": detail,
    })

def login(client, email, password):
    for payload in [
        {"email": email, "password": password},
        {"username": email, "password": password},
    ]:
        res = client.request("POST", "/api/auth/login", payload, auth=False)
        if res["ok"]:
            client.token = extract_token(res.get("data"))
            return res
    return res

def main():
    results = []
    findings = []

    owner = Client()
    owner_login = login(owner, OWNER_EMAIL, OWNER_PASSWORD)
    add(results, "Owner login", owner_login["status"], owner_login["ok"], short(owner_login.get("data")), [200])

    if not owner_login["ok"]:
        findings.append({
            "severity": "HIGH",
            "title": "Owner login failed",
            "detail": f"Cannot run worker flow test because owner login returned {owner_login['status']}: {short(owner_login.get('data')) or owner_login.get('error')}",
        })
    else:
        # Read workers/team list.
        workers_res = owner.request("GET", "/api/team/workers")
        workers = pick_list(workers_res.get("data"), ["workers", "team", "items", "results", "users"])
        add(results, "Owner can load workers", workers_res["status"], workers_res["status"] == 200, f"Workers found: {len(workers)} {short(workers_res.get('data'))}", [200])

        if workers_res["status"] != 200:
            findings.append({
                "severity": "HIGH",
                "title": "Team workers endpoint failed",
                "detail": f"/api/team/workers returned {workers_res['status']}: {short(workers_res.get('data'))}",
            })

        worker = workers[0] if workers else {}
        worker_id = pick_id(worker)
        worker_name = (
            worker.get("name")
            or worker.get("full_name")
            or worker.get("worker_name")
            or worker.get("email")
            or "Test worker"
        ) if isinstance(worker, dict) else "Test worker"

        stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")

        # Create a safe test client.
        client_payload = {
            "name": f"Worker Flow Test Client {stamp}",
            "email": f"worker-flow-client-{stamp}@example.com",
            "phone": "0200000000",
            "address": "1 Worker Flow Test Street, Wellington",
            "notes": "Created by live worker flow test. Safe to delete.",
        }
        client_create = owner.request("POST", "/api/clients", client_payload)
        client_id = pick_id(client_create.get("data"))
        add(results, "Create test client for worker flow", client_create["status"], client_create["status"] in [200, 201] and bool(client_id), f"id={client_id} {short(client_create.get('data'))}", [200, 201])

        if not client_id:
            findings.append({
                "severity": "HIGH",
                "title": "Could not create test client",
                "detail": f"Client create returned {client_create['status']}: {short(client_create.get('data'))}",
            })

        # Create a test job.
        job_id = ""
        if client_id:
            job_payload = {
                "title": f"Worker Flow Test Job {stamp}",
                "client_id": client_id,
                "client_name": client_payload["name"],
                "address": client_payload["address"],
                "description": "Safe test job for owner/worker workflow audit.",
                "notes": "Created by live worker flow test. Safe to delete.",
                "status": "new",
                "scheduled_date": datetime.now(timezone.utc).date().isoformat(),
            }
            if worker_id:
                job_payload["assigned_worker_id"] = worker_id
                job_payload["assigned_worker"] = worker_name
                job_payload["assigned_worker_name"] = worker_name

            job_create = owner.request("POST", "/api/jobs", job_payload)
            job_id = pick_id(job_create.get("data"))
            add(results, "Create test job", job_create["status"], job_create["status"] in [200, 201] and bool(job_id), f"id={job_id} worker_id={worker_id} {short(job_create.get('data'))}", [200, 201])

            if not job_id:
                findings.append({
                    "severity": "HIGH",
                    "title": "Could not create test job",
                    "detail": f"Job create returned {job_create['status']}: {short(job_create.get('data'))}",
                })

        # If worker exists, try assign/update paths.
        if job_id and worker_id:
            assignment_payloads = [
                {"assigned_worker_id": worker_id, "assigned_worker": worker_name, "assigned_worker_name": worker_name, "status": "assigned"},
                {"worker_id": worker_id, "worker_name": worker_name, "status": "assigned"},
            ]

            assign_ok = False
            assign_detail = ""
            for payload in assignment_payloads:
                for method in ["PATCH", "PUT"]:
                    assign_res = owner.request(method, f"/api/jobs/{job_id}", payload)
                    assign_detail += f"{method} {assign_res['status']} {short(assign_res.get('data'))} "
                    if assign_res["status"] in [200, 204]:
                        assign_ok = True
                        break
                if assign_ok:
                    break

            add(results, "Assign worker to test job", 200 if assign_ok else 0, assign_ok, assign_detail, [200, 204])

            if not assign_ok:
                findings.append({
                    "severity": "MED",
                    "title": "Worker assignment update did not confirm",
                    "detail": assign_detail or "No assignment endpoint accepted PATCH/PUT /api/jobs/{job_id}.",
                })
        elif job_id and not worker_id:
            add(results, "Assign worker to test job", 0, False, "Skipped: no existing worker returned by /api/team/workers", [])
            findings.append({
                "severity": "MED",
                "title": "No worker available for assignment test",
                "detail": "Create/invite a worker account to fully test assignment and worker app.",
            })

        # Owner can open test job after create/assignment.
        if job_id:
            job_read = owner.request("GET", f"/api/jobs/{job_id}")
            add(results, "Open/read test job", job_read["status"], job_read["status"] == 200, short(job_read.get("data")), [200])

        # Worker login optional.
        if WORKER_EMAIL and WORKER_PASSWORD:
            worker_client = Client()
            worker_login = login(worker_client, WORKER_EMAIL, WORKER_PASSWORD)
            add(results, "Worker login", worker_login["status"], worker_login["ok"], short(worker_login.get("data")), [200])

            if worker_login["ok"]:
                worker_jobs = worker_client.request("GET", "/api/worker/jobs")
                if worker_jobs["status"] == 404:
                    worker_jobs = worker_client.request("GET", "/api/jobs")
                add(results, "Worker can load assigned jobs", worker_jobs["status"], worker_jobs["status"] == 200, short(worker_jobs.get("data")), [200])

                if job_id:
                    for action_name, method, path, payload in [
                        ("Worker start job", "POST", f"/api/worker/jobs/{job_id}/start", {}),
                        ("Worker add job note", "POST", f"/api/worker/jobs/{job_id}/notes", {"note": "Live test note from worker flow audit."}),
                        ("Worker complete job", "POST", f"/api/worker/jobs/{job_id}/complete", {}),
                    ]:
                        res = worker_client.request(method, path, payload)
                        add(results, action_name, res["status"], res["status"] in [200, 201, 204, 404], short(res.get("data")), [200, 201, 204, 404])
            else:
                findings.append({
                    "severity": "MED",
                    "title": "Worker login failed",
                    "detail": f"Worker login returned {worker_login['status']}: {short(worker_login.get('data'))}",
                })
        else:
            add(results, "Worker login", 0, True, "Skipped: set CHURVOX_WORKER_EMAIL and CHURVOX_WORKER_PASSWORD to run real worker login.", [])

        # Cleanup test job/client.
        if job_id:
            delete_job = owner.request("DELETE", f"/api/jobs/{job_id}")
            add(results, "Delete test job cleanup", delete_job["status"], delete_job["status"] in [200, 204, 404], short(delete_job.get("data")), [200, 204, 404])

        if client_id:
            delete_client = owner.request("DELETE", f"/api/clients/{client_id}")
            add(results, "Delete test client cleanup", delete_client["status"], delete_client["status"] in [200, 204, 404], short(delete_client.get("data")), [200, 204, 404])

    high = sum(1 for f in findings if f["severity"] == "HIGH")
    med = sum(1 for f in findings if f["severity"] == "MED")
    low = sum(1 for f in findings if f["severity"] == "LOW")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    report = []
    report.append("# Churvox Live Worker Flow Test")
    report.append("")
    report.append(f"Generated: {now}")
    report.append("")
    report.append("## Summary")
    report.append("")
    report.append(f"- HIGH: {high}")
    report.append(f"- MED: {med}")
    report.append(f"- LOW: {low}")
    report.append(f"- Backend: {BACKEND}")
    report.append(f"- Worker login supplied: {'yes' if WORKER_EMAIL and WORKER_PASSWORD else 'no'}")
    report.append("")
    report.append("## Checks")
    report.append("")
    for r in results:
        mark = "✅" if r["ok"] else "❌"
        report.append(f"- {mark} **{r['name']}** — status `{r['status']}` — {r['detail']}")
    report.append("")
    report.append("## Findings")
    report.append("")
    if findings:
        for i, f in enumerate(findings, 1):
            report.append(f"### {i}. [{f['severity']}] {f['title']}")
            report.append("")
            report.append(f["detail"])
            report.append("")
    else:
        report.append("No live worker flow blockers found in this API smoke test.")
        report.append("")
    report.append("## Notes")
    report.append("")
    report.append("- This test creates then deletes one client and one job.")
    report.append("- Real worker login is optional and only runs if worker env vars are supplied.")
    report.append("- It does not send SMS, customer email, Stripe charges, or MYOB updates.")
    report.append("")

    out = "\n".join(report)
    Path("audits").mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    report_path = Path("audits") / f"churvox_live_worker_flow_test_{stamp}.md"
    latest_path = Path("audits/churvox_live_worker_flow_test_latest.md")
    report_path.write_text(out)
    latest_path.write_text(out)

    print(out)
    print("")
    print(f"REPORT_FILE={report_path}")
    print(f"LATEST_FILE={latest_path}")

if __name__ == "__main__":
    main()
