from pathlib import Path

source_path = Path("scripts/churvox_current_full_user_force_fix.py")
source = source_path.read_text()
old = "return route.fulfill(json({ detail: 'Temporary Render gateway failure' }, 502));"
new = "return route.fulfill(json({ detail: 'Temporary Render service failure' }, 503));"
if source.count(old) != 1:
    raise SystemExit(f"force-fix-2 expected one synthetic 502 mock, found {source.count(old)}")
source = source.replace(old, new, 1)
exec(compile(source, str(source_path), "exec"), {"__name__": "__main__", "__file__": str(source_path)})
