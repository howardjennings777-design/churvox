from pathlib import Path

TARGET = Path('backend/server/__init__.py')


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing anchor: {label}')
    return text.replace(old, new, 1)


text = TARGET.read_text(encoding='utf-8')
anchor = '''for _patch in [
'''
if anchor not in text:
    raise RuntimeError('server wrapper patch list missing')

insert_after = '''    _install_launch_patch(_patch)


'''
replacement = '''    _install_launch_patch(_patch)


FINAL_COMMAND_WRAPPER_VERSION = 'churvox-command-queue-speed-server-wrapper-20260713f'
FINAL_COMMAND_PATCH_INSTALLED = False
FINAL_COMMAND_PATCH_ERROR = ''


def _force_install_final_command_patch():
    global FINAL_COMMAND_PATCH_INSTALLED, FINAL_COMMAND_PATCH_ERROR
    try:
        try:
            import churvox_paid_launch_live_patch as command_patch
        except Exception:
            from backend import churvox_paid_launch_live_patch as command_patch
        command_patch.install(legacy, force=True)
        FINAL_COMMAND_PATCH_INSTALLED = True
        FINAL_COMMAND_PATCH_ERROR = ''
    except Exception as exc:
        FINAL_COMMAND_PATCH_INSTALLED = False
        FINAL_COMMAND_PATCH_ERROR = f'{type(exc).__name__}:{exc}'
        print(f'Churvox final Command wrapper patch failed: {exc}', file=sys.stderr)


def _remove_route(path, method):
    try:
        app.router.routes = [
            route for route in app.router.routes
            if not (
                getattr(route, 'path', '') == path
                and method.upper() in set(getattr(route, 'methods', set()) or set())
            )
        ]
    except Exception:
        pass


async def _final_command_wrapper_marker():
    route_owners = {}
    for path in ['/api/command/slips', '/api/command/scan', '/api/admin-brain/scan']:
        owners = []
        for route in list(getattr(app.router, 'routes', []) or []):
            if getattr(route, 'path', '') != path:
                continue
            endpoint = getattr(route, 'endpoint', None)
            methods = sorted(str(value) for value in (getattr(route, 'methods', set()) or set()))
            owners.append(f"{','.join(methods)}:{getattr(endpoint, '__name__', 'unknown')}")
        route_owners[path] = owners
    return {
        'ok': FINAL_COMMAND_PATCH_INSTALLED,
        'success': FINAL_COMMAND_PATCH_INSTALLED,
        'ready': FINAL_COMMAND_PATCH_INSTALLED,
        'version': FINAL_COMMAND_WRAPPER_VERSION,
        'patch_installed': FINAL_COMMAND_PATCH_INSTALLED,
        'patch_stage': 'ready' if FINAL_COMMAND_PATCH_INSTALLED else 'force_install_failed',
        'patch_error': FINAL_COMMAND_PATCH_ERROR or None,
        'route_owners': route_owners,
        'checked_at': datetime.now(timezone.utc).isoformat(),
    }


_force_install_final_command_patch()
_remove_route('/api/command-fast-load/boot', 'GET')
app.add_api_route('/api/command-fast-load/boot', _final_command_wrapper_marker, methods=['GET'])


'''
text = replace_once(text, insert_after, replacement, 'final wrapper patch insertion')
TARGET.write_text(text, encoding='utf-8')
print('Mounted final Command queue-speed patch last in the live server wrapper.')
