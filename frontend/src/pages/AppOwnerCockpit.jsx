import React from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle,
  CreditCard,
  Download,
  Eye,
  Gift,
  LifeBuoy,
  Lock,
  LogOut,
  Mail,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Unlock,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import API_BASE from "../lib/apiBase";
import RemoveCustomerDataCard from "./admin/RemoveCustomerDataCard";

const TABS = ["Cockpit", "Needs Action", "Testers", "Users", "Billing", "Businesses", "Activity", "Support", "Settings"];
const PLAN_OPTIONS = [["solo", "Start"], ["team", "Crew"], ["pro", "Operator"], ["enterprise", "Command"]];
const PACK_OPTIONS = [["full_access", "Full tester access"], ["operator_pack", "Operator free pack"], ["command_pack", "Command free pack"], ["command_growth_pack", "Command Growth Pack"], ["accounting_sync", "Accounting Sync Add-on"]];
const PLAN_LABELS = { solo: "Start", start: "Start", team: "Crew", crew: "Crew", pro: "Operator", operator: "Operator", enterprise: "Command", command: "Command", none: "No plan", "": "No plan" };
const PLAN_VALUE = { solo: 39, start: 39, team: 89, crew: 89, pro: 149, operator: 149, enterprise: 299, command: 299 };

function token() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}
function headers() {
  return { Accept: "application/json", "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) };
}
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include", headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false || body?.ok === false) throw new Error(body?.detail || body?.message || body?.error || `Request failed ${res.status}`);
  return body;
}
async function apiPost(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", credentials: "include", headers: headers(), body: JSON.stringify(payload || {}) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false || body?.ok === false) throw new Error(body?.detail || body?.message || body?.error || `Request failed ${res.status}`);
  return body;
}

const arr = (value) => Array.isArray(value) ? value : [];
const low = (value) => String(value || "").trim().toLowerCase();
const text = (value, fallback = "—") => String(value ?? "").trim() || fallback;
const emailOf = (row) => low(row?.email || row?.user_email || row?.owner_email || row?.target_email);
const idOf = (row) => String(row?.id || row?._id || row?.user_id || row?.business_id || emailOf(row) || Math.random()).trim();
const businessId = (row) => String(row?.business_id || row?.owner_id || row?.user_id || row?.id || row?._id || "");
const nameOf = (row) => text(row?.business_name || row?.company || row?.name || row?.full_name || row?.email || row?.title || row?.path, "Record");
const createdOf = (row) => row?.created_at || row?.createdAt || row?.signup_at || row?.registered_at || row?.updated_at;
const activeOf = (row) => row?.last_active || row?.last_seen || row?.last_login_at || row?.last_login || row?.updated_at || row?.created_at;
const safeJson = (row) => { try { return JSON.stringify(row || {}).toLowerCase(); } catch { return ""; } };
function planKey(row) { return low(row?.plan_name || row?.plan || row?.subscription_plan || row?.tier || row); }
function planOf(row) {
  const raw = planKey(row);
  return PLAN_LABELS[raw] || (raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "No plan");
}
function statusOf(row) {
  return text(row?.subscription_status || row?.billing_status || row?.stripe_status || row?.status || row?.billing_health?.subscription_status, "Unknown");
}
function money(value) {
  return Number(value || 0).toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
}
function dateText(value) {
  if (!value) return "—";
  try { const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("en-NZ"); } catch { return String(value); }
}
function ageText(value) {
  if (!value) return "—";
  try {
    const mins = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  } catch { return "—"; }
}
function isTester(row) {
  return Boolean(row?.is_free_tester || row?.free_tester_access || low(statusOf(row)).includes("tester") || low(row?.app_owner_free_pack));
}
function isPaid(row) {
  const status = low(statusOf(row));
  return !isTester(row) && (status.includes("active") || status.includes("paid"));
}
function isBillingIssue(row) {
  return /past|fail|required|locked|cancel|unpaid|incomplete|none|choose/.test(low(statusOf(row))) || /required|locked|payment/.test(low(row?.billing_lock_reason || row?.billing_health?.billing_lock_reason));
}
function hasClient(row, lists) {
  const id = businessId(row);
  if (!id) return false;
  return arr(lists.clients).some((item) => businessId(item) === id || String(item?.business_id || item?.contractor_id || item?.owner_id || "") === id);
}
function hasJob(row, lists) {
  const id = businessId(row);
  if (!id) return false;
  return arr(lists.jobs).some((item) => businessId(item) === id || String(item?.business_id || item?.contractor_id || item?.owner_id || "") === id);
}
function needsSetupHelp(row, lists) {
  if (low(row?.hq_record_type) === "internal") return false;
  if (isBillingIssue(row)) return true;
  if (!hasClient(row, lists) || !hasJob(row, lists)) return true;
  return false;
}
function tone(value) {
  const x = low(value);
  if (/active|paid|healthy|grant|tester|free|success|connected/.test(x)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (/trial|pending|setup|new|warning|attention|choose/.test(x)) return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (/fail|past|unpaid|required|locked|cancel|issue|error/.test(x)) return "border-red-500/30 bg-red-500/10 text-red-200";
  return "border-slate-700 bg-slate-900 text-slate-300";
}
function csv(name, rows) {
  const safe = arr(rows);
  const keys = Array.from(new Set(safe.flatMap((row) => Object.keys(row || {})))).slice(0, 60);
  const body = [keys.join(","), ...safe.map((row) => keys.map((key) => `"${String(typeof row?.[key] === "object" ? JSON.stringify(row?.[key]) : row?.[key] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function logout() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("owner_portal_session");
    localStorage.removeItem("platform_owner_email");
  } catch {}
  window.location.href = "/login";
}

function Pill({ children }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${tone(children)}`}>{children}</span>;
}
function Metric({ label, value, note, icon: Icon, hot }) {
  return <article className={`rounded-[26px] border ${hot ? "border-orange-500/30 bg-orange-500/10" : "border-slate-800 bg-slate-950/80"} p-5 shadow-xl`}><div className="mb-3 flex items-center justify-between gap-3"><span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>{Icon ? <Icon className={hot ? "text-orange-300" : "text-cyan-300"} size={19} /> : null}</div><b className="block text-3xl font-black tracking-[-0.06em] text-white">{value}</b>{note ? <p className="mt-2 text-xs font-bold leading-5 text-slate-400">{note}</p> : null}</article>;
}
function Empty({ children }) {
  return <div className="rounded-[24px] border border-slate-800 bg-slate-950/70 p-8 text-center text-sm font-bold text-slate-400"><CheckCircle className="mx-auto mb-2 text-emerald-300" />{children || "Nothing here yet."}</div>;
}
function Line({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return <div className="flex justify-between gap-4 border-t border-slate-800 py-2 text-sm"><span className="text-slate-500">{label}</span><span className="break-words text-right font-bold text-slate-100">{String(value)}</span></div>;
}

function UserRows({ rows, onOpen, onControl, compact = false }) {
  const safe = arr(rows);
  if (!safe.length) return <Empty>No records returned.</Empty>;
  return <div className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/75"><div className="grid gap-3 p-3 md:hidden">{safe.map((row) => <button key={idOf(row)} onClick={() => onOpen(row)} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left"><b className="block text-white">{nameOf(row)}</b><span className="block text-xs font-bold text-slate-500">{text(emailOf(row))}</span><div className="mt-3 flex flex-wrap gap-2"><Pill>{planOf(row)}</Pill><Pill>{statusOf(row)}</Pill></div></button>)}</div><div className="hidden overflow-x-auto md:block"><table className="min-w-full text-left text-sm"><thead className="bg-slate-900/90 text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Pack</th><th className="px-4 py-3">Last</th><th className="px-4 py-3">Control</th></tr></thead><tbody>{safe.map((row) => <tr key={idOf(row)} className="border-t border-slate-800 hover:bg-slate-900/60"><td className="max-w-[300px] px-4 py-3"><button className="block max-w-full text-left" onClick={() => onOpen(row)}><b className="block truncate text-white">{nameOf(row)}</b><span className="block truncate text-xs font-bold text-slate-500">{text(emailOf(row))}</span></button></td><td className="px-4 py-3"><Pill>{planOf(row)}</Pill></td><td className="px-4 py-3"><Pill>{statusOf(row)}</Pill></td><td className="px-4 py-3 text-slate-300">{text(row.app_owner_free_pack_label || row.free_tester_note || (isTester(row) ? "Tester" : "—"))}</td><td className="px-4 py-3 text-slate-400">{ageText(activeOf(row))}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button onClick={() => onOpen(row)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-white"><Eye size={14} /></button>{!compact ? <button onClick={() => onControl(row, "grant")} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100">Grant</button> : null}{!compact ? <button onClick={() => onControl(row, "revoke")} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-100">Revoke</button> : null}</div></td></tr>)}</tbody></table></div></div>;
}

function ActionCard({ title, text: body, rows, onOpen, onControl, icon: Icon, hot }) {
  return <article className={`rounded-[30px] border ${hot ? "border-orange-500/25 bg-orange-500/10" : "border-slate-800 bg-slate-900/80"} p-5`}><div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-xl font-black text-white">{title}</h3><p className="mt-1 text-sm font-bold leading-6 text-slate-400">{body}</p></div>{Icon ? <Icon className={hot ? "text-orange-300" : "text-cyan-300"} size={22} /> : null}</div><UserRows rows={rows} onOpen={onOpen} onControl={onControl} compact /></article>;
}

function TesterPanel({ onSaved, users, pendingTesters, onOpen, onControl }) {
  const [form, setForm] = React.useState({ email: "", name: "", business_name: "", plan: "pro", pack: "full_access", days: 90, note: "", send_email: true });
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState("");
  function set(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await apiPost("/api/admin/owner/tester-intake", form);
      setResult(res);
      setForm((prev) => ({ ...prev, email: "", name: "", business_name: "", note: "" }));
      onSaved?.();
    } catch (err) {
      setError(err.message || "Could not save tester");
    } finally {
      setBusy(false);
    }
  }
  return <section className="grid gap-5 xl:grid-cols-[430px_1fr]"><form onSubmit={submit} className="rounded-[30px] border border-orange-500/20 bg-gradient-to-br from-slate-900 to-slate-950 p-5"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-orange-200"><UserPlus size={14} /> Add tester</div><h3 className="mb-2 text-3xl font-black tracking-[-0.06em] text-white">Grant a clean trial.</h3><p className="mb-5 text-sm font-bold leading-6 text-slate-400">Save the person, choose plan/free pack, and Churvox grants access when the account exists.</p><div className="grid gap-3"><input required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="tester@email.com" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-500" /><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Name" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-500" /><input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Business name" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-500" /><div className="grid grid-cols-2 gap-3"><select value={form.plan} onChange={(e) => set("plan", e.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white">{PLAN_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input type="number" min="1" max="1095" value={form.days} onChange={(e) => set("days", e.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white" /></div><select value={form.pack} onChange={(e) => set("pack", e.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white">{PACK_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><textarea value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Private note — why they got free access" className="min-h-[100px] rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-500" /><button disabled={busy} className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy ? "Saving..." : "Save tester / grant access"}</button></div>{error ? <p className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p> : null}{result ? <p className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">{result.message}</p> : null}</form><div className="grid gap-5"><article className="rounded-[30px] border border-slate-800 bg-slate-900/80 p-5"><h3 className="mb-4 text-xl font-black text-white">Current testers / free access</h3><UserRows rows={users.filter(isTester).slice(0, 80)} onOpen={onOpen} onControl={onControl} /></article><article className="rounded-[30px] border border-slate-800 bg-slate-900/80 p-5"><h3 className="mb-4 text-xl font-black text-white">Saved tester invites</h3><UserRows rows={pendingTesters.slice(0, 80)} onOpen={onOpen} onControl={onControl} compact /></article></div></section>;
}

function DetailModal({ item, onClose, onControl, busy }) {
  if (!item) return null;
  const canControl = Boolean(emailOf(item));
  return <div className="fixed inset-0 z-[10000] grid place-items-center bg-black/75 p-4"><section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-slate-800 bg-slate-950 p-5 text-white"><div className="mb-4 flex items-start justify-between gap-4"><div><div className="mb-2 inline-flex rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-orange-200">HQ record</div><h2 className="text-4xl font-black tracking-[-0.07em]">{nameOf(item)}</h2><p className="mt-2 text-sm font-bold text-slate-400">{emailOf(item) || item.path || item.action || item.label}</p></div><button onClick={onClose} className="rounded-2xl border border-slate-700 bg-slate-900 p-3"><X size={18} /></button></div><div className="mb-4 flex flex-wrap gap-2"><Pill>{planOf(item)}</Pill><Pill>{statusOf(item)}</Pill>{isTester(item) ? <Pill>Free tester</Pill> : null}{isBillingIssue(item) ? <Pill>Needs billing check</Pill> : null}</div><div className="grid gap-3 md:grid-cols-2"><section className="rounded-[24px] border border-slate-800 bg-slate-900/70 p-4"><h3 className="mb-2 font-black">Account</h3><Line label="Email" value={emailOf(item)} /><Line label="Role" value={item.role} /><Line label="User ID" value={item.id || item._id || item.user_id} /><Line label="Created" value={dateText(createdOf(item))} /><Line label="Last active" value={dateText(activeOf(item))} /></section><section className="rounded-[24px] border border-slate-800 bg-slate-900/70 p-4"><h3 className="mb-2 font-black">Access</h3><Line label="Plan" value={planOf(item)} /><Line label="Status" value={statusOf(item)} /><Line label="Free until" value={dateText(item.free_tester_until || item.free_until)} /><Line label="Free pack" value={item.app_owner_free_pack_label || item.pack_label || item.free_tester_note} /><Line label="Business" value={item.business_name || item.business_id} /></section></div><div className="mt-4 flex flex-wrap gap-2">{emailOf(item) ? <a href={`mailto:${emailOf(item)}`} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-white no-underline"><Mail size={16} /> Email</a> : null}{canControl ? <button disabled={busy} onClick={() => onControl(item, "grant")} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100 disabled:opacity-60"><Gift size={16} /> Grant</button> : null}{canControl ? <button disabled={busy} onClick={() => onControl(item, "revoke")} className="inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 disabled:opacity-60"><Unlock size={16} /> Revoke</button> : null}{canControl ? <button disabled={busy} onClick={() => onControl(item, "lock")} className="inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-600/20 px-4 py-3 text-sm font-black text-red-100 disabled:opacity-60"><Lock size={16} /> Lock</button> : null}</div><details className="mt-4 rounded-[24px] border border-slate-800 bg-slate-900/70 p-4"><summary className="cursor-pointer font-black">Raw record</summary><pre className="mt-3 max-h-[340px] overflow-auto rounded-2xl bg-black/40 p-3 text-xs text-slate-300">{JSON.stringify(item, null, 2)}</pre></details></section></div>;
}

export default function AppOwnerCockpit() {
  const [tab, setTab] = React.useState("Cockpit");
  const [data, setData] = React.useState(null);
  const [plans, setPlans] = React.useState(null);
  const [control, setControl] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(null);
  const [toast, setToast] = React.useState("");
  const [busyAction, setBusyAction] = React.useState(false);

  const load = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const [overview, report, controlLog] = await Promise.allSettled([
        apiGet("/api/admin/owner-overview"),
        apiGet("/api/admin/owner/plan-report"),
        apiGet("/api/admin/owner/control-log"),
      ]);
      if (overview.status === "rejected") throw overview.reason;
      setData(overview.value || {});
      setPlans(report.status === "fulfilled" ? report.value || {} : null);
      setControl(controlLog.status === "fulfilled" ? controlLog.value || {} : null);
    } catch (err) {
      setError(err.message || "Could not load owner cockpit");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { const timer = window.setInterval(() => load(true), 15000); return () => window.clearInterval(timer); }, [load]);

  const lists = data?.lists || {};
  const metrics = data?.metrics || {};
  const users = React.useMemo(() => {
    const source = [
      ...arr(lists.all_users),
      ...arr(lists.users),
      ...arr(lists.customer_users),
      ...arr(lists.businesses),
      ...arr(plans?.paid_users),
      ...arr(plans?.trial_users),
      ...arr(plans?.free_testers),
    ];
    const seen = new Set();
    return source.filter((row) => {
      const key = emailOf(row) || idOf(row);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [lists.all_users, lists.users, lists.customer_users, lists.businesses, plans?.paid_users, plans?.trial_users, plans?.free_testers]);

  const businesses = arr(lists.businesses);
  const testers = users.filter(isTester);
  const paid = users.filter(isPaid);
  const activeNow = arr(lists.active_now);
  const controlItems = arr(control?.items);
  const pendingTesters = arr(control?.testers);
  const events = React.useMemo(() => [...arr(lists.events), ...arr(lists.activity), ...controlItems].sort((a, b) => String(b?.created_at || b?.at || "").localeCompare(String(a?.created_at || a?.at || ""))).slice(0, 200), [lists.events, lists.activity, controlItems]);
  const supportRows = users.filter((row) => needsSetupHelp(row, lists));
  const billingIssues = users.filter(isBillingIssue);
  const newUsers = [...users].sort((a, b) => new Date(createdOf(b) || 0) - new Date(createdOf(a) || 0));
  const q = low(query);
  const filterRows = (rows) => arr(rows).filter((row) => !q || safeJson(row).includes(q));
  const filteredUsers = filterRows(users);
  const billingRows = filterRows(users.filter((row) => isTester(row) || isPaid(row) || isBillingIssue(row) || /trial|none|choose/i.test(statusOf(row))));
  const pageRows = tab === "Billing" ? billingRows : tab === "Testers" ? filterRows(testers) : filteredUsers;

  async function controlUser(user, action) {
    const email = emailOf(user);
    if (!email) {
      setToast("This record has no email to control.");
      return;
    }
    setBusyAction(true);
    setToast("");
    try {
      const payload = {
        identifier: email,
        action,
        plan: action === "revoke" ? planKey(user) || "pro" : "pro",
        pack: "full_access",
        days: 90,
        note: `${action} from app owner cockpit`,
      };
      const result = await apiPost("/api/admin/owner/control-access", payload);
      setToast(result.message || "Access updated");
      setSelected(null);
      await load(true);
    } catch (err) {
      setToast(err.message || "Could not update access");
    } finally {
      setBusyAction(false);
    }
  }

  const tabBadges = {
    Cockpit: users.length,
    "Needs Action": supportRows.length + billingIssues.length,
    Testers: testers.length + pendingTesters.length,
    Users: users.length,
    Billing: billingRows.length,
    Businesses: businesses.length,
    Activity: events.length,
    Support: supportRows.length,
    Settings: "",
  };

  return <main className="min-h-screen bg-[#05070b] text-white"><DetailModal item={selected} onClose={() => setSelected(null)} onControl={controlUser} busy={busyAction} /><div className="grid min-h-screen xl:grid-cols-[300px_1fr]"><aside className="border-b border-slate-800 bg-slate-950/95 p-4 xl:border-b-0 xl:border-r"><section className="mb-5 rounded-[30px] border border-orange-500/25 bg-gradient-to-br from-slate-900 to-black p-5"><div className="mb-4 inline-flex rounded-2xl bg-orange-500 p-3 text-slate-950"><Shield size={24} /></div><h1 className="text-3xl font-black tracking-[-0.07em]">App Owner Cockpit</h1><p className="mt-2 text-xs font-bold leading-5 text-slate-400">Live Churvox control room. Users, testers, paid accounts, setup issues, support and activity.</p><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => load(false)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-3 py-3 text-xs font-black text-orange-100"><RefreshCw className={loading ? "animate-spin" : ""} size={15} />Refresh</button><button onClick={logout} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-xs font-black text-red-100"><LogOut size={15} />Log out</button></div></section><nav className="grid gap-2">{TABS.map((item) => <button key={item} onClick={() => { setTab(item); setQuery(""); }} className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black ${tab === item ? "bg-orange-500 text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}`}><span>{item}</span>{tabBadges[item] !== "" ? <em className={`rounded-full px-2 py-0.5 text-[11px] not-italic ${tab === item ? "bg-slate-950/15 text-slate-950" : "bg-slate-950 text-slate-400"}`}>{tabBadges[item]}</em> : null}</button>)}</nav><section className="mt-5 rounded-[24px] border border-slate-800 bg-slate-900/80 p-4"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Live status</p><Line label="Refresh" value="15 sec" /><Line label="Active now" value={activeNow.length} /><Line label="Users" value={users.length} /><Line label="Last loaded" value={dateText(data?.generated_at || new Date())} /></section></aside><section className="min-w-0 p-4 md:p-6 xl:p-8"><header className="mb-6 rounded-[34px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-5 shadow-2xl"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-orange-200"><Radio size={14} /> Live cockpit</div><h2 className="text-4xl font-black tracking-[-0.07em] md:text-6xl">{tab}</h2><p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-400">See who signed up, who needs help, who is paid, who is testing, and what needs action now.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => csv("churvox-hq-users.csv", filteredUsers)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-black text-white"><Download size={16} /> Export</button><button onClick={() => setTab("Testers")} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-100"><UserPlus size={16} /> Add tester</button></div></div></header>{error ? <div className="mb-5 rounded-[24px] border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div> : null}{toast ? <div className="mb-5 rounded-[24px] border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">{busyAction ? "Working... " : ""}{toast}</div> : null}{!["Cockpit", "Needs Action", "Settings"].includes(tab) ? <section className="mb-5 rounded-[24px] border border-slate-800 bg-slate-950/70 p-4"><label className="relative block"><Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, business, plan..." className="w-full rounded-2xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-sm font-bold text-white outline-none focus:border-orange-500" /></label></section> : null}{tab === "Cockpit" ? <div className="space-y-6"><section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4"><Metric label="Total users" value={metrics.total_users || users.length} note={`${metrics.customer_users || 0} customer · ${metrics.internal_users || 0} internal`} icon={Users} /><Metric label="Paid users" value={metrics.paid_users || paid.length} note={`${money(metrics.monthly_revenue_estimate || paid.reduce((sum, user) => sum + (PLAN_VALUE[planKey(user)] || 0), 0))} MRR estimate`} icon={CreditCard} hot /><Metric label="Needs action" value={supportRows.length + billingIssues.length} note="Setup, billing, support or empty workspace" icon={AlertTriangle} hot /><Metric label="Free testers" value={metrics.free_tester_users || testers.length} note="Owner-granted access, not MRR" icon={Gift} /><Metric label="Active now" value={metrics.active_now || activeNow.length} note={`${metrics.active_today || 0} active today`} icon={Radio} /><Metric label="Businesses" value={metrics.total_businesses || businesses.length} note={`${supportRows.length} may need help`} icon={Building2} /><Metric label="Jobs" value={metrics.total_jobs || arr(lists.jobs).length} note={`${metrics.total_clients || arr(lists.clients).length} clients`} icon={Activity} /><Metric label="Billing issues" value={billingIssues.length} note="Payment, lock or plan problems" icon={Lock} hot={billingIssues.length} /></section><section className="grid gap-5 xl:grid-cols-2"><ActionCard title="Needs owner attention" text="People who may need help setting up or paying." rows={supportRows.slice(0, 8)} onOpen={setSelected} onControl={controlUser} icon={LifeBuoy} hot /><ActionCard title="Newest users" text="Latest accounts and businesses entering Churvox." rows={newUsers.slice(0, 8)} onOpen={setSelected} onControl={controlUser} icon={Users} /></section><section className="rounded-[30px] border border-slate-800 bg-slate-900/80 p-5"><h3 className="mb-4 text-xl font-black">Live activity</h3><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{events.slice(0, 12).map((event, index) => <button key={`${idOf(event)}-${index}`} onClick={() => setSelected(event)} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left hover:border-orange-400"><b className="block truncate text-white">{text(event.title || event.action || event.path || event.label, "Activity")}</b><span className="block truncate text-xs font-bold text-slate-500">{text(event.meta || event.target_email || event.user_email || event.email)}</span><span className="mt-1 block text-xs text-slate-600">{dateText(event.at || event.created_at)}</span></button>)}{!events.length ? <Empty>No activity yet.</Empty> : null}</div></section></div> : null}{tab === "Needs Action" ? <div className="grid gap-5"><ActionCard title="Setup and support follow-up" text="Users with missing clients/jobs or signs they need help." rows={supportRows} onOpen={setSelected} onControl={controlUser} icon={LifeBuoy} hot /><ActionCard title="Billing or access issues" text="Past due, locked, payment required or no-plan accounts." rows={billingIssues} onOpen={setSelected} onControl={controlUser} icon={AlertTriangle} hot /></div> : null}{tab === "Testers" ? <TesterPanel users={users} pendingTesters={pendingTesters} onSaved={() => load(true)} onOpen={setSelected} onControl={controlUser} /> : null}{["Users", "Billing"].includes(tab) ? <UserRows rows={pageRows} onOpen={setSelected} onControl={controlUser} /> : null}{tab === "Businesses" ? <UserRows rows={filterRows(businesses)} onOpen={setSelected} onControl={controlUser} /> : null}{tab === "Activity" ? <div className="grid gap-3 xl:grid-cols-2">{filterRows(events).map((event, index) => <article key={`${idOf(event)}-${index}`} className="rounded-[24px] border border-slate-800 bg-slate-950/70 p-4"><b className="text-white">{text(event.title || event.action || event.path || event.label, "Activity")}</b><p className="mt-1 text-sm font-bold text-slate-500">{text(event.meta || event.target_email || event.user_email || event.email)}</p><p className="mt-2 text-xs font-bold text-slate-600">{dateText(event.at || event.created_at)}</p></article>)}</div> : null}{tab === "Support" ? <UserRows rows={filterRows(supportRows)} onOpen={setSelected} onControl={controlUser} /> : null}{tab === "Settings" ? <div className="grid gap-5"><section className="rounded-[30px] border border-slate-800 bg-slate-900/80 p-5"><h3 className="mb-2 text-xl font-black">Cockpit rules</h3><p className="max-w-3xl text-sm font-bold leading-6 text-slate-400">Only hello@churvox.com can use this. Free testers are separate from paid MRR. Grant/revoke/lock access here without touching the database directly.</p><div className="mt-5 grid gap-4 md:grid-cols-3"><Metric label="API" value={error ? "Check" : "Connected"} note="/api/admin/owner-overview" icon={Shield} /><Metric label="Control log" value={controlItems.length} note="Latest owner actions" icon={Activity} /><Metric label="Auto-refresh" value="15 sec" note="Live while open" icon={RefreshCw} /></div></section><RemoveCustomerDataCard onRemoved={() => load(true)} /></div> : null}{loading ? <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm font-bold text-slate-400">Loading cockpit…</div> : null}</section></div></main>;
}
