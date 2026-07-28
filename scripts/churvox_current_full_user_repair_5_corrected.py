from pathlib import Path

source_path = Path("scripts/churvox_current_full_user_repair_5.py")
source = source_path.read_text()
old = '''replace_once(
    flow,
    "  const me = await page.request.get(apiUrl('/api/auth/me'), { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 });\\n  const body = await bodyOf(me);",
    "  const { response: me, body } = await api(page.request, 'get', '/api/auth/me', token);",
    "reuse retrying API helper after visible login",
)
replace_once(
    flow,
    "  const me = await page.request.get(apiUrl('/api/auth/me'), { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 });\\n  const body = await bodyOf(me);",
    "  const { response: me, body } = await api(page.request, 'get', '/api/auth/me', token);",
    "reuse retrying API helper after seeded login",
)'''
new = '''flow_file = Path(flow)
flow_text = flow_file.read_text()
old_me = "  const me = await page.request.get(apiUrl('/api/auth/me'), { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 });\\n  const body = await bodyOf(me);"
new_me = "  const { response: me, body } = await api(page.request, 'get', '/api/auth/me', token);"
if flow_text.count(old_me) != 2:
    raise SystemExit(f"reuse retrying API helper in both login paths: expected two exact anchors, found {flow_text.count(old_me)}")
flow_file.write_text(flow_text.replace(old_me, new_me))
print("patched: reuse retrying API helper in both login paths")'''
if source.count(old) != 1:
    raise SystemExit(f"corrected repair wrapper expected one ambiguous block, found {source.count(old)}")
source = source.replace(old, new, 1)
exec(compile(source, str(source_path), "exec"), {"__name__": "__main__", "__file__": str(source_path)})
