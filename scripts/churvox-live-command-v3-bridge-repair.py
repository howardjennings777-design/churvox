from pathlib import Path

TARGET = Path('backend/churvox_paid_launch_live_patch.py')
WRAPPER = Path('backend/server/__init__.py')


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing anchor: {label}')
    return text.replace(old, new, 1)


text = TARGET.read_text(encoding='utf-8')
text = replace_once(
    text,
    '''    try:
        from churvox_command_human_mimic_guard_routes import build_command_human_mimic_guard_router
    except Exception:
        from backend.churvox_command_human_mimic_guard_routes import build_command_human_mimic_guard_router

    guarded_router = build_command_human_mimic_guard_router(db, get_current_user, ObjectId)
''',
    '''    try:
        from churvox_command_human_mimic_v3_routes import build_command_human_mimic_v3_router
    except Exception:
        from backend.churvox_command_human_mimic_v3_routes import build_command_human_mimic_v3_router

    guarded_router = build_command_human_mimic_v3_router(db, get_current_user, ObjectId)
''',
    'v3 scanner import and builder',
)
text = replace_once(
    text,
    'result = await bounded(guarded_scan(request=request, payload=payload or {}), 18, "Command brain scan")',
    'result = await bounded(guarded_scan(request=request, payload=payload or {}), 25, "Command brain scan")',
    'v3 scan timeout',
)
text = replace_once(
    text,
    'result.setdefault("source", "human-mimic-intelligence-v2")\n        result.setdefault("guard", "human-mimic-scan-guard-v2")',
    'result.setdefault("source", "human-mimic-intelligence-v3")\n        result.setdefault("guard", "human-mimic-strict-preflight-v3")',
    'v3 defaults',
)
text = replace_once(
    text,
    '"marker": "churvox-command-queue-speed-backend-20260713e",',
    '"marker": "churvox-command-v3-live-backend-20260713g",',
    'v3 backend marker',
)
TARGET.write_text(text, encoding='utf-8')

wrapper = WRAPPER.read_text(encoding='utf-8')
wrapper = replace_once(
    wrapper,
    "FINAL_COMMAND_WRAPPER_VERSION = 'churvox-command-queue-speed-server-wrapper-20260713f'",
    "FINAL_COMMAND_WRAPPER_VERSION = 'churvox-command-v3-server-wrapper-20260713g'",
    'v3 wrapper marker',
)
WRAPPER.write_text(wrapper, encoding='utf-8')

print('Mounted strict human mimic v3 on the live Command scan bridge.')
