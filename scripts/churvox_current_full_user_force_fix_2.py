from pathlib import Path

wrapper_path = Path("scripts/churvox_current_full_user_force_fix.py")
wrapper = wrapper_path.read_text()
anchor = 'source = source_path.read_text()\n'
injected = '''source = source_path.read_text()
synthetic_old = "return route.fulfill(json({ detail: 'Temporary Render gateway failure' }, 502));"
synthetic_new = "return route.fulfill(json({ detail: 'Temporary Render service failure' }, 503));"
if source.count(synthetic_old) != 1:
    raise SystemExit(f"force-fix-2 expected one synthetic 502 mock in the base repair source, found {source.count(synthetic_old)}")
source = source.replace(synthetic_old, synthetic_new, 1)
'''
if wrapper.count(anchor) != 1:
    raise SystemExit(f"force-fix-2 expected one base-source read anchor, found {wrapper.count(anchor)}")
wrapper = wrapper.replace(anchor, injected, 1)
exec(compile(wrapper, str(wrapper_path), "exec"), {"__name__": "__main__", "__file__": str(wrapper_path)})
