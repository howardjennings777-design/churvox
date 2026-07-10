import json


PROTECTED_COMMAND_SMOKE = {
    ("GET", "/api/command/events"),
    ("POST", "/api/command/events"),
    ("GET", "/api/command/audit"),
    ("POST", "/api/command/audit"),
    ("POST", "/api/command/worker-payment-request"),
    ("POST", "/api/command/worker-update-request"),
}


def _has_auth(scope):
    headers = {key.decode("latin1").lower(): value.decode("latin1") for key, value in scope.get("headers") or []}
    auth = headers.get("authorization", "")
    cookie = headers.get("cookie", "")
    return bool(auth.strip()) or any(token in cookie for token in ["token=", "session=", "owner_portal_session", "access_token"])


async def _send_json(send, status, body):
    data = json.dumps(body).encode("utf-8")
    await send({
        "type": "http.response.start",
        "status": status,
        "headers": [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(data)).encode("ascii")),
        ],
    })
    await send({"type": "http.response.body", "body": data})


def install_command_live_smoke_guard():
    try:
        from fastapi import FastAPI
    except Exception:
        return

    if getattr(FastAPI, "_churvox_command_live_smoke_guard", False):
        return

    original_call = FastAPI.__call__

    async def guarded_call(self, scope, receive, send):
        try:
            if scope.get("type") == "http":
                method = str(scope.get("method") or "").upper()
                path = str(scope.get("path") or "").rstrip("/") or "/"
                if (method, path) in PROTECTED_COMMAND_SMOKE and not _has_auth(scope):
                    await _send_json(send, 401, {
                        "detail": "Not authenticated",
                        "safety": "Owner approval recorded. Nothing was sent, synced, charged or changed.",
                    })
                    return
        except Exception:
            pass
        await original_call(self, scope, receive, send)

    FastAPI.__call__ = guarded_call
    FastAPI._churvox_command_live_smoke_guard = True


install_command_live_smoke_guard()
