from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path
import sys

legacy_path = Path(__file__).resolve().parents[1] / 'server.py'
spec = spec_from_file_location('churvox_legacy_server', legacy_path)
legacy = module_from_spec(spec)
sys.modules['churvox_legacy_server'] = legacy
spec.loader.exec_module(legacy)

app = legacy.app
try:
    app.router.on_startup.clear()
except Exception:
    pass
