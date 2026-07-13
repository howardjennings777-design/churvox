from pathlib import Path

TARGET = Path('backend/churvox_checkout_token_session_guard.py')


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing anchor: {label}')
    return text.replace(old, new, 1)


text = TARGET.read_text(encoding='utf-8')
text = replace_once(
    text,
    'VERSION = "churvox-checkout-token-session-guard-20260712c"',
    'VERSION = "churvox-checkout-token-session-guard-20260713i"',
    'guard version',
)
text = replace_once(
    text,
    '''        chunks = []
        more = True
''',
    '''        headers = {key.decode("latin1").lower(): value.decode("latin1") for key, value in scope.get("headers", [])}
        authorization = _text(headers.get("authorization"))
        cookie = _text(headers.get("cookie"))
        has_header_auth = authorization.lower().startswith("bearer ")
        has_cookie_auth = any(name in cookie.lower() for name in ("access_token=", "auth_token=", "token=", "session="))
        # Header/cookie sessions are validated by the definitive downstream
        # get_current_user path. Do not consume and replay their checkout body;
        # doing so can break the ASGI receive stream before FastAPI parses JSON.
        if has_header_auth or has_cookie_auth:
            return await self.app(scope, receive, send)

        chunks = []
        more = True
''',
    'authenticated pass-through before body read',
)
text = replace_once(
    text,
    '''        headers = {key.decode("latin1").lower(): value.decode("latin1") for key, value in scope.get("headers", [])}
        token = _extract_token(body, headers.get("content-type", ""))
''',
    '''        token = _extract_token(body, headers.get("content-type", ""))
''',
    'remove duplicate header parsing',
)
TARGET.write_text(text, encoding='utf-8')
print('Checkout guard now leaves header/cookie-authenticated JSON bodies untouched.')
