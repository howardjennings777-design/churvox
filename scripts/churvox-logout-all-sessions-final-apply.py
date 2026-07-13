from pathlib import Path

TARGET = Path('backend/server/__init__.py')


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing anchor: {label}')
    return text.replace(old, new, 1)


text = TARGET.read_text(encoding='utf-8')
anchor = """_force_install_final_billing_patch()


@app.options('/{full_path:path}')
"""
replacement = """_force_install_final_billing_patch()


FINAL_SESSION_REVOCATION_VERSION = 'churvox-logout-all-sessions-final-20260713a'
FINAL_SESSION_REVOCATION_INSTALLED = False
FINAL_SESSION_REVOCATION_ERROR = ''


def _force_install_final_session_revocation():
    global FINAL_SESSION_REVOCATION_INSTALLED, FINAL_SESSION_REVOCATION_ERROR
    try:
        try:
            import churvox_logout_all_sessions_final_patch as session_patch
        except Exception:
            from backend import churvox_logout_all_sessions_final_patch as session_patch
        FINAL_SESSION_REVOCATION_INSTALLED = bool(session_patch.install(legacy, force=True))
        FINAL_SESSION_REVOCATION_ERROR = '' if FINAL_SESSION_REVOCATION_INSTALLED else 'installer_not_ready'
    except Exception as exc:
        FINAL_SESSION_REVOCATION_INSTALLED = False
        FINAL_SESSION_REVOCATION_ERROR = f'{type(exc).__name__}:{exc}'
        print(f'Churvox final session revocation patch failed: {exc}', file=sys.stderr)


_force_install_final_session_revocation()


@app.options('/{full_path:path}')
"""
text = replace_once(text, anchor, replacement, 'session revocation install after billing')
text = replace_once(
    text,
    "        'billing_error': globals().get('FINAL_BILLING_PATCH_ERROR') or None,\n        'route_owners': route_owners,",
    "        'billing_error': globals().get('FINAL_BILLING_PATCH_ERROR') or None,\n        'session_revocation_installed': globals().get('FINAL_SESSION_REVOCATION_INSTALLED', False),\n        'session_revocation_version': globals().get('FINAL_SESSION_REVOCATION_VERSION'),\n        'session_revocation_error': globals().get('FINAL_SESSION_REVOCATION_ERROR') or None,\n        'route_owners': route_owners,",
    'boot marker session status',
)
TARGET.write_text(text, encoding='utf-8')
print('Mounted log-out-all-sessions route after final billing in the live wrapper.')
