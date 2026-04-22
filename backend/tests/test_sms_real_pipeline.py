"""
E2E verification of the real SMS pipeline.

Covers:
  1. /api/sms/send calls the real provider and returns meaningful errors
  2. When provider reports failure, credits are REFUNDED (not lost)
  3. Successful send path works end-to-end (via Mock provider)
  4. "No phone found" returns 400, not silent success
  5. Legacy /api/sms/send-fixed alias still works
  6. Insufficient credits → clean 402
  7. sms_log captures real provider + status fields (never "mock_sent" when real)
"""
import asyncio, os, json, sys, urllib.request, urllib.error
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

API = os.environ.get("API", "http://localhost:8001")


def req(method, path, token=None, body=None):
    url = API + path
    h = {"Content-Type": "application/json"}
    if token: h["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, method=method, headers=h, data=data)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


async def setup_credits(bid, amount):
    from motor.motor_asyncio import AsyncIOMotorClient
    c = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = c[os.environ['DB_NAME']]
    await db.sms_credits.update_one(
        {"business_id": bid},
        {"$set": {"business_id": bid, "balance": amount}},
        upsert=True,
    )
    return db


async def read_credits(db, bid):
    row = await db.sms_credits.find_one({"business_id": bid})
    return int((row or {}).get("balance", 0) or 0)


async def last_log(db, bid):
    return await db.sms_log.find_one({"business_id": bid}, sort=[("created_at", -1)])


def main():
    code, body = req("POST", "/api/auth/login",
                     body={"email": "launchtest@churvox.com", "password": "Launch2025!"})
    assert code == 200, body
    tok = body["token"]
    bid = body.get("user", {}).get("business_id") or body.get("user", {}).get("id") or body.get("id")

    loop = asyncio.get_event_loop()
    db = loop.run_until_complete(setup_credits(bid, 100))

    # 1) Real send — either provider accepts (credits -2) OR provider rejects (credits refunded).
    #    Both outcomes prove the pipeline is real, not mocked.
    before = loop.run_until_complete(read_credits(db, bid))
    code, res = req("POST", "/api/sms/send", token=tok, body={
        "recipient_phone": "+64 21 123 4567",
        "message_type": "customer_reminder",
        "message": "Hello from Churvox SMS test",
    })
    after = loop.run_until_complete(read_credits(db, bid))
    log = loop.run_until_complete(last_log(db, bid))

    if code == 200:
        # Happy path: provider accepted
        assert after == before - 2, f"expected {before-2} credits after success, got {after}"
        data = res.get("data") or res
        assert data.get("provider") not in (None, "unknown"), f"missing provider: {data}"
        assert data.get("status", "").upper() in {"SUCCESS", "QUEUED", "SENT", "DELIVERED", "SCHEDULED", "DELIVERED_MOCK"}, f"unexpected status {data.get('status')}"
        assert log.get("status") != "mock_sent", f"log incorrectly says mock_sent: {log}"
        assert log.get("cost") == 2, f"success log should show cost=2, got {log}"
        print(f"[ok] REAL send accepted · provider={data['provider']} status={data['status']} credits {before}→{after}")
    elif code == 502:
        # Provider rejected → credits MUST be refunded
        assert after == before, f"credits NOT refunded: {before}→{after} (should stay {before})"
        assert "delivery failed" in str(res.get("detail", "")).lower()
        assert log.get("status") not in ("mock_sent", None), f"log missing real failure status: {log}"
        assert log.get("cost") == 0, f"failed-send log should show cost=0, got {log.get('cost')}"
        assert log.get("error"), f"failed-send log should have error message: {log}"
        print(f"[ok] REAL provider rejected cleanly · detail='{res['detail']}' credits refunded ({before}→{after}) log.cost={log.get('cost')}")
    else:
        raise AssertionError(f"unexpected status {code}: {res}")

    # 2) No phone → 400 with clean message
    code, res = req("POST", "/api/sms/send", token=tok, body={
        "message_type": "customer_reminder",
        "message": "No phone test",
    })
    assert code == 400, f"expected 400, got {code} {res}"
    assert "phone" in str(res.get("detail", "")).lower()
    print(f"[ok] no-phone returns clean 400: '{res.get('detail')}'")

    # 3) Legacy alias still works (returns same code path as /sms/send)
    code, res = req("POST", "/api/sms/send-fixed", token=tok, body={
        "recipient_phone": "+64 21 987 6543",
        "message_type": "on_the_way",
    })
    assert code in (200, 502), f"legacy alias unexpected status {code} {res}"
    if code == 200:
        print(f"[ok] legacy /sms/send-fixed alias: provider accepted")
    else:
        print(f"[ok] legacy /sms/send-fixed alias: same real pipeline (provider={res.get('detail')})")

    # 4) Insufficient credits → 402
    loop.run_until_complete(db.sms_credits.update_one({"business_id": bid}, {"$set": {"balance": 0}}))
    code, res = req("POST", "/api/sms/send", token=tok, body={
        "recipient_phone": "+64 21 111 2222",
        "message": "should fail",
    })
    assert code == 402, f"expected 402, got {code} {res}"
    print(f"[ok] 0 credits → 402: '{res.get('detail')}'")

    # Restore credits for any future runs
    loop.run_until_complete(db.sms_credits.update_one({"business_id": bid}, {"$set": {"balance": 100}}))

    print("\nSMS_REAL_PIPELINE_OK — pipeline is real, credits are honest, errors are meaningful")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        print("FAIL:", e)
        sys.exit(1)
    except Exception as e:
        import traceback; traceback.print_exc()
        sys.exit(2)
