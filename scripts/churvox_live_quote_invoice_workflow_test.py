from pathlib import Path
from datetime import datetime, timezone, timedelta
import json
import os
import ssl
import urllib.request
import urllib.error
import http.cookiejar

BACKEND = os.getenv("CHURVOX_BACKEND_URL", "https://grassley-backend.onrender.com").rstrip("/")
FRONTEND = os.getenv("CHURVOX_FRONTEND_URL", "https://www.churvox.com").rstrip("/")
TEST_EMAIL = os.getenv("CHURVOX_TEST_EMAIL", "hello@churvox.com")
TEST_PASSWORD = os.getenv("CHURVOX_TEST_PASSWORD", "TempPass123!")

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
                parsed = text[:800]
            return {"ok": 200 <= res.status < 300, "status": res.status, "data": parsed, "text": text, "error": ""}
        except urllib.error.HTTPError as e:
            raw = e.read()
            text = raw.decode("utf-8", errors="ignore")
            try:
                parsed = json.loads(text) if text else None
            except Exception:
                parsed = text[:800]
            return {"ok": False, "status": e.code, "data": parsed, "text": text, "error": str(e)}
        except Exception as e:
            return {"ok": False, "status": 0, "data": None, "text": "", "error": str(e)}

def short(data):
    if data is None:
        return ""
    try:
        return json.dumps(data, default=str)[:900]
    except Exception:
        return str(data)[:900]

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
        for key in ["id", "_id", "client_id", "job_id", "quote_id", "invoice_id"]:
            if data.get(key):
                return str(data[key])
        for value in data.values():
            found = pick_id(value)
            if found:
                return found
    if isinstance(data, list) and data:
        return pick_id(data[0])
    return ""

def pick_first_url(data):
    if isinstance(data, dict):
        for key in [
            "public_url",
            "public_quote_url",
            "public_invoice_url",
            "payment_url",
            "pay_url",
            "url",
            "link",
        ]:
            value = data.get(key)
            if isinstance(value, str) and value.startswith("http"):
                return value
        for value in data.values():
            found = pick_first_url(value)
            if found:
                return found
    if isinstance(data, list):
        for item in data:
            found = pick_first_url(item)
            if found:
                return found
    return ""

def add(results, name, res_or_status, ok, detail="", expected=None):
    status = res_or_status.get("status") if isinstance(res_or_status, dict) else res_or_status
    if isinstance(res_or_status, dict) and not detail:
        detail = short(res_or_status.get("data")) or res_or_status.get("error") or ""
    results.append({
        "name": name,
        "status": status,
        "ok": bool(ok),
        "expected": expected or [],
        "detail": detail,
    })

def try_methods(client, name, attempts, results, expected=(200, 201, 204)):
    details = []
    for method, path, payload in attempts:
        res = client.request(method, path, payload)
        details.append(f"{method} {path} => {res['status']} {short(res.get('data'))}")
        if res["status"] in expected:
            add(results, name, res, True, " | ".join(details), list(expected))
            return res
    last = res if attempts else {"status": 0, "data": None, "error": "No attempts"}
    add(results, name, last, False, " | ".join(details), list(expected))
    return last

def main():
    client = Client()
    results = []
    findings = []
    created = {"client_id": "", "quote_id": "", "invoice_id": "", "job_id": ""}

    login = client.request("POST", "/api/auth/login", {"email": TEST_EMAIL, "password": TEST_PASSWORD}, auth=False)
    if not login["ok"]:
        login = client.request("POST", "/api/auth/login", {"username": TEST_EMAIL, "password": TEST_PASSWORD}, auth=False)

    client.token = extract_token(login.get("data"))
    add(results, "Owner login", login, login["status"] == 200, short(login.get("data")), [200])

    if login["status"] != 200:
        findings.append({
            "severity": "HIGH",
            "title": "Owner login failed",
            "detail": f"Login returned {login['status']}: {short(login.get('data')) or login.get('error')}",
        })
    else:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        due = (datetime.now(timezone.utc) + timedelta(days=14)).date().isoformat()

        # Create client.
        client_payload = {
            "name": f"Quote Invoice Test Client {stamp}",
            "email": f"quote-invoice-test-{stamp}@example.com",
            "phone": "0200000000",
            "address": "10 Quote Invoice Test Street, Wellington",
            "notes": "Created by Churvox quote/invoice live workflow test. Safe to delete.",
        }
        client_create = client.request("POST", "/api/clients", client_payload)
        created["client_id"] = pick_id(client_create.get("data"))
        add(
            results,
            "Create test client",
            client_create,
            client_create["status"] in [200, 201] and bool(created["client_id"]),
            f"id={created['client_id']} {short(client_create.get('data'))}",
            [200, 201],
        )

        if not created["client_id"]:
            findings.append({
                "severity": "HIGH",
                "title": "Could not create test client",
                "detail": f"Client create returned {client_create['status']}: {short(client_create.get('data'))}",
            })

        # Create quote.
        if created["client_id"]:
            quote_payload = {
                "client_id": created["client_id"],
                "customer_name": client_payload["name"],
                "customer_email": client_payload["email"],
                "address": client_payload["address"],
                "job_type": "other",
                "job_description": "Live quote workflow test work. Safe test only.",
                "description": "Live quote workflow test work. Safe test only.",
                "price": 250,
                "amount": 250,
                "total": 250,
                "pricing_type": "fixed",
                "status": "draft",
                "valid_until": due,
            }

            quote_create = try_methods(
                client,
                "Create test quote",
                [
                    ("POST", "/api/quotes", quote_payload),
                    ("POST", "/api/quotes/", quote_payload),
                ],
                results,
            )
            created["quote_id"] = pick_id(quote_create.get("data"))

            if not created["quote_id"]:
                findings.append({
                    "severity": "HIGH",
                    "title": "Could not create quote",
                    "detail": f"Quote create returned {quote_create['status']}: {short(quote_create.get('data'))}",
                })

        # Read quote and test public URL if supplied.
        if created["quote_id"]:
            quote_read = try_methods(
                client,
                "Read/open test quote",
                [
                    ("GET", f"/api/quotes/{created['quote_id']}", None),
                    ("GET", f"/api/quotes?id={created['quote_id']}", None),
                ],
                results,
                expected=(200,),
            )

            quote_url = pick_first_url(quote_read.get("data")) or pick_first_url(quote_create.get("data"))
            if quote_url:
                public_quote = client.request("GET", quote_url, auth=False)
                add(
                    results,
                    "Open public quote link",
                    public_quote,
                    public_quote["status"] in [200, 401, 403, 404],
                    f"url={quote_url} {short(public_quote.get('data')) or public_quote.text[:250]}",
                    [200, 401, 403, 404],
                )
            else:
                add(results, "Open public quote link", 0, True, "Skipped: quote response did not expose a public URL.", [])

        # Create invoice.
        if created["client_id"]:
            invoice_payload = {
                "client_id": created["client_id"],
                "customer_name": client_payload["name"],
                "customer_email": client_payload["email"],
                "address": client_payload["address"],
                "description": "Live invoice workflow test work. Safe test only.",
                "subtotal": 300,
                "gst_rate": 15,
                "gst_amount": 45,
                "total": 345,
                "amount": 345,
                "amount_due": 345,
                "status": "draft",
                "due_date": due,
            }

            invoice_create = try_methods(
                client,
                "Create test invoice",
                [
                    ("POST", "/api/invoices", invoice_payload),
                    ("POST", "/api/invoices/", invoice_payload),
                ],
                results,
            )
            created["invoice_id"] = pick_id(invoice_create.get("data"))

            if not created["invoice_id"]:
                findings.append({
                    "severity": "HIGH",
                    "title": "Could not create invoice",
                    "detail": f"Invoice create returned {invoice_create['status']}: {short(invoice_create.get('data'))}",
                })

        # Read invoice and test public/payment URL if supplied.
        if created["invoice_id"]:
            invoice_read = try_methods(
                client,
                "Read/open test invoice",
                [
                    ("GET", f"/api/invoices/{created['invoice_id']}", None),
                    ("GET", f"/api/invoices?id={created['invoice_id']}", None),
                ],
                results,
                expected=(200,),
            )

            invoice_url = pick_first_url(invoice_read.get("data")) or pick_first_url(invoice_create.get("data"))
            if invoice_url:
                public_invoice = client.request("GET", invoice_url, auth=False)
                add(
                    results,
                    "Open public invoice/payment link",
                    public_invoice,
                    public_invoice["status"] in [200, 401, 403, 404],
                    f"url={invoice_url} {short(public_invoice.get('data')) or public_invoice.text[:250]}",
                    [200, 401, 403, 404],
                )
            else:
                add(results, "Open public invoice/payment link", 0, True, "Skipped: invoice response did not expose a public/payment URL.", [])

        # Lists still load after create.
        for name, path in [
            ("Quotes list after create", "/api/quotes"),
            ("Invoices list after create", "/api/invoices"),
        ]:
            res = client.request("GET", path)
            add(results, name, res, res["status"] == 200, short(res.get("data")), [200])
            if res["status"] != 200:
                findings.append({
                    "severity": "HIGH",
                    "title": f"{name} failed",
                    "detail": f"{path} returned {res['status']}: {short(res.get('data'))}",
                })

        # Cleanup.
        cleanup_attempts = []
        if created["invoice_id"]:
            cleanup_attempts.append(("Delete test invoice cleanup", [
                ("DELETE", f"/api/invoices/{created['invoice_id']}", None),
            ]))
        if created["quote_id"]:
            cleanup_attempts.append(("Delete test quote cleanup", [
                ("DELETE", f"/api/quotes/{created['quote_id']}", None),
            ]))
        if created["client_id"]:
            cleanup_attempts.append(("Delete test client cleanup", [
                ("DELETE", f"/api/clients/{created['client_id']}", None),
            ]))

        for name, attempts in cleanup_attempts:
            try_methods(client, name, attempts, results, expected=(200, 204, 404))

    high = sum(1 for f in findings if f["severity"] == "HIGH")
    med = sum(1 for f in findings if f["severity"] == "MED")
    low = sum(1 for f in findings if f["severity"] == "LOW")
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    report = []
    report.append("# Churvox Live Quote + Invoice Workflow Test")
    report.append("")
    report.append(f"Generated: {now}")
    report.append("")
    report.append("## Summary")
    report.append("")
    report.append(f"- HIGH: {high}")
    report.append(f"- MED: {med}")
    report.append(f"- LOW: {low}")
    report.append(f"- Backend: {BACKEND}")
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
        report.append("No live quote/invoice workflow blockers found in this API smoke test.")
        report.append("")
    report.append("## Notes")
    report.append("")
    report.append("- This test creates and then deletes one client, quote, and invoice where supported.")
    report.append("- It does not email customers, send SMS, create Stripe charges, or sync MYOB.")
    report.append("- Public document/payment links are only opened if the API exposes them.")
    report.append("")

    out = "\n".join(report)
    Path("audits").mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    report_path = Path("audits") / f"churvox_live_quote_invoice_workflow_test_{stamp}.md"
    latest_path = Path("audits/churvox_live_quote_invoice_workflow_test_latest.md")
    report_path.write_text(out)
    latest_path.write_text(out)

    print(out)
    print("")
    print(f"REPORT_FILE={report_path}")
    print(f"LATEST_FILE={latest_path}")

if __name__ == "__main__":
    main()
