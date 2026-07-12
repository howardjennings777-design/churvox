from pathlib import Path

original = Path(__file__).with_name("churvox-auth-401-storm-repair.py")
source = original.read_text(encoding="utf-8")
old = '''app = APP.read_text(encoding="utf-8")
app = replace_once(app, '  if (loading && !user) return <Spinner />;', '  if (loading) return <Spinner />;', "owner route loading gate")
app = replace_once(app, '  if (loading && !user) return <Spinner />;', '  if (loading) return <Spinner />;', "worker route loading gate")
app = replace_once(app, 'version: "churvox-paid-launch-readiness-20260713a"', 'version: "churvox-auth-401-storm-repair-20260713b"', "frontend marker")
'''
new = '''app = APP.read_text(encoding="utf-8")
loading_anchor = '  if (loading && !user) return <Spinner />;'
if app.count(loading_anchor) != 2:
    raise RuntimeError(f"owner/worker loading gates: expected 2, found {app.count(loading_anchor)}")
app = app.replace(loading_anchor, '  if (loading) return <Spinner />;')
app = replace_once(app, 'version: "churvox-paid-launch-readiness-20260713a"', 'version: "churvox-auth-401-storm-repair-20260713b"', "frontend marker")
'''
if source.count(old) != 1:
    raise RuntimeError(f"repair script route-gate anchor count was {source.count(old)}")
patched = source.replace(old, new, 1)
namespace = {"__file__": str(original), "__name__": "__main__"}
exec(compile(patched, str(original), "exec"), namespace)
