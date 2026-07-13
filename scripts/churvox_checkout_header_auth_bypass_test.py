from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
for path in (str(ROOT), str(BACKEND)):
    if path not in sys.path:
        sys.path.insert(0, path)

from churvox_checkout_token_session_guard import CheckoutBodyTokenGuard


async def run_header_authenticated_case():
    entered_downstream = False
    receive_calls = 0
    sent = []
    body = b'{"plan":"start","country":"NZ"}'

    async def receive():
        nonlocal receive_calls
        receive_calls += 1
        assert entered_downstream, "middleware consumed an Authorization-header request body before downstream"
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message):
        sent.append(message)

    async def downstream(scope, downstream_receive, downstream_send):
        nonlocal entered_downstream
        entered_downstream = True
        message = await downstream_receive()
        assert message["body"] == body
        await downstream_send({"type": "http.response.start", "status": 200, "headers": []})
        await downstream_send({"type": "http.response.body", "body": b'{}'})

    guard = CheckoutBodyTokenGuard(downstream, SimpleNamespace())
    scope = {
        "type": "http",
        "path": "/api/billing/create-checkout-session",
        "method": "POST",
        "headers": [
            (b"authorization", b"Bearer verified-session"),
            (b"content-type", b"application/json"),
        ],
    }
    await guard(scope, receive, send)
    assert receive_calls == 1
    assert sent[0]["status"] == 200


async def run_cookie_authenticated_case():
    entered_downstream = False
    body = b'{"addon":"command_growth_pack"}'

    async def receive():
        assert entered_downstream, "middleware consumed a cookie-authenticated request body before downstream"
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(_message):
        return None

    async def downstream(scope, downstream_receive, downstream_send):
        nonlocal entered_downstream
        entered_downstream = True
        message = await downstream_receive()
        assert message["body"] == body
        await downstream_send({"type": "http.response.start", "status": 200, "headers": []})
        await downstream_send({"type": "http.response.body", "body": b'{}'})

    guard = CheckoutBodyTokenGuard(downstream, SimpleNamespace())
    scope = {
        "type": "http",
        "path": "/api/billing/create-addon-checkout-session",
        "method": "POST",
        "headers": [
            (b"cookie", b"access_token=verified-cookie"),
            (b"content-type", b"application/json"),
        ],
    }
    await guard(scope, receive, send)


async def run_legacy_body_replay_case():
    original_calls = 0
    downstream_body = None
    body = b'{"plan":"start"}'

    async def receive():
        nonlocal original_calls
        original_calls += 1
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(_message):
        return None

    async def downstream(scope, downstream_receive, downstream_send):
        nonlocal downstream_body
        message = await downstream_receive()
        downstream_body = message["body"]
        await downstream_send({"type": "http.response.start", "status": 200, "headers": []})
        await downstream_send({"type": "http.response.body", "body": b'{}'})

    guard = CheckoutBodyTokenGuard(downstream, SimpleNamespace())
    scope = {
        "type": "http",
        "path": "/api/billing/create-checkout-session",
        "method": "POST",
        "headers": [(b"content-type", b"application/json")],
    }
    await guard(scope, receive, send)
    assert original_calls == 1
    assert downstream_body == body


async def main():
    await run_header_authenticated_case()
    await run_cookie_authenticated_case()
    await run_legacy_body_replay_case()
    print("CHECKOUT_HEADER_AUTH_BYPASS_BEHAVIOR_PASS")


if __name__ == "__main__":
    asyncio.run(main())
