from pathlib import Path

TARGET = Path('backend/server/__init__.py')


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing anchor: {label}')
    return text.replace(old, new, 1)


text = TARGET.read_text(encoding='utf-8')
text = replace_once(
    text,
    "for path in ['/api/command/slips', '/api/command/scan', '/api/admin-brain/scan']:",
    "for path in ['/api/command/slips', '/api/command/scan', '/api/admin-brain/scan', '/api/billing/create-checkout-session', '/api/billing/create-addon-checkout-session']:",
    'marker route owners',
)
text = replace_once(
    text,
    "        'patch_error': FINAL_COMMAND_PATCH_ERROR or None,\n        'route_owners': route_owners,",
    "        'patch_error': FINAL_COMMAND_PATCH_ERROR or None,\n        'billing_patch_installed': globals().get('FINAL_BILLING_PATCH_INSTALLED', False),\n        'billing_version': globals().get('FINAL_BILLING_VERSION'),\n        'billing_error': globals().get('FINAL_BILLING_PATCH_ERROR') or None,\n        'route_owners': route_owners,",
    'marker billing status',
)
anchor = "\n\n@app.options('/{full_path:path}')\nasync def _global_options(full_path: str):\n"
install = """

FINAL_BILLING_VERSION = 'churvox-paid-launch-billing-final-20260713a'
FINAL_BILLING_PATCH_INSTALLED = False
FINAL_BILLING_PATCH_ERROR = ''


def _force_install_final_billing_patch():
    global FINAL_BILLING_PATCH_INSTALLED, FINAL_BILLING_PATCH_ERROR
    try:
        try:
            import churvox_paid_launch_billing_final_patch as billing_patch
        except Exception:
            from backend import churvox_paid_launch_billing_final_patch as billing_patch
        FINAL_BILLING_PATCH_INSTALLED = bool(billing_patch.install(legacy, force=True))
        FINAL_BILLING_PATCH_ERROR = '' if FINAL_BILLING_PATCH_INSTALLED else 'installer_not_ready'
    except Exception as exc:
        FINAL_BILLING_PATCH_INSTALLED = False
        FINAL_BILLING_PATCH_ERROR = f'{type(exc).__name__}:{exc}'
        print(f'Churvox final billing patch failed: {exc}', file=sys.stderr)


_force_install_final_billing_patch()


@app.options('/{full_path:path}')
async def _global_options(full_path: str):
"""
text = replace_once(text, anchor, install, 'final billing install before options')
TARGET.write_text(text, encoding='utf-8')
print('Mounted final owner-only Stripe plan and add-on checkout routes last in the live wrapper.')
