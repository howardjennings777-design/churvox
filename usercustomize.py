from pathlib import Path
import runpy

_here = Path(__file__).resolve()
_root = _here.parent.parent if _here.parent.name == "backend" else _here.parent
_materializer = _root / "scripts" / "churvox_hardening_v8_materialize.py"
_before = _here.read_text(encoding="utf-8")
if not _materializer.exists():
    raise RuntimeError(f"Missing Churvox hardening materializer: {_materializer}")
runpy.run_path(str(_materializer), run_name="__main__")
_after = _here.read_text(encoding="utf-8")
if _after == _before or "build_hardening_router" not in _after:
    raise RuntimeError("Churvox hardening bundle did not install the backend startup hook")
exec(compile(_after, str(_here), "exec"), globals(), globals())
