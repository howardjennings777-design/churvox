from pathlib import Path

PATH = Path('frontend/src/pages/AppOwnerPage.js')
text = PATH.read_text(encoding='utf-8')

if 'handleDeleteUser' in text and 'Delete user' in text:
    print('App-owner delete user button already present')
    raise SystemExit(0)

text = text.replace(
    'import { Activity, AlertTriangle, Briefcase, Building2, CreditCard, FileText, LogOut, RefreshCw, ShieldCheck, Users, Zap } from "lucide-react";',
    'import { Activity, AlertTriangle, Briefcase, Building2, CreditCard, FileText, LogOut, RefreshCw, ShieldCheck, Trash2, Users, Zap } from "lucide-react";'
)

text = text.replace(
    'function RecordCard({ item }) {\n  return (\n    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">\n      <p className="truncate text-sm font-black text-white">{titleOf(item)}</p>',
    'function RecordCard({ item, selected, onDeleteUser }) {\n  const canDelete = selected === "users" && !isOwnerAccount(item);\n  return (\n    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">\n      <div className="flex items-start justify-between gap-3">\n        <p className="min-w-0 truncate text-sm font-black text-white">{titleOf(item)}</p>\n        {canDelete && (\n          <button\n            type="button"\n            onClick={() => onDeleteUser?.(item)}\n            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-red-300/25 bg-red-500/15 px-2.5 py-1.5 text-[11px] font-black text-red-100 hover:bg-red-500/25"\n            data-testid="app-owner-delete-user"\n            title="Delete user"\n          >\n            <Trash2 className="h-3.5 w-3.5" />\n            Delete\n          </button>\n        )}\n      </div>'
)

insert_after = '''  const fetchJson = useCallback(async (path) => {
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include", headers: { Accept: "application/json", ...headers() } });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.detail || json?.message || `${path} ${res.status}`);
    return json;
  }, []);
'''

insert_block = '''

  const handleDeleteUser = useCallback(async (item) => {
    const userId = idOf(item);
    const label = titleOf(item);
    if (!userId) {
      setWarning("Could not find this user's ID.");
      return;
    }
    if (isOwnerAccount(item)) {
      setWarning("Owner and platform owner accounts are protected. Delete workers/team users only.");
      return;
    }
    const ok = window.confirm(`Delete user ${label}? This removes the team user account and cannot be undone from the dashboard.`);
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", ...headers() },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.detail || json?.message || `Delete failed (${res.status})`);
      setWarning(`Deleted user: ${label}`);
      await load();
      setSelected("users");
    } catch (err) {
      setWarning(err.message || "Could not delete user.");
    }
  }, [load]);
'''

if insert_after not in text:
    raise SystemExit('Could not find fetchJson block')
text = text.replace(insert_after, insert_after + insert_block, 1)

text = text.replace(
    '{records.length ? records.map((item, index) => <RecordCard key={idOf(item) || index} item={item} />) : <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 text-sm font-semibold text-slate-400">No records yet.</div>}',
    '{records.length ? records.map((item, index) => <RecordCard key={idOf(item) || index} item={item} selected={selected} onDeleteUser={handleDeleteUser} />) : <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 text-sm font-semibold text-slate-400">No records yet.</div>}'
)

PATH.write_text(text, encoding='utf-8')
print('Inserted app-owner delete user button into AppOwnerPage.js')
