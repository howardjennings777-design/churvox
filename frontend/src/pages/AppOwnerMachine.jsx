import React from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  Database,
  Download,
  Eye,
  Gift,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import API_BASE from "../lib/apiBase";
import RemoveCustomerDataCard from "./admin/RemoveCustomerDataCard";
import "./AppOwnerMachine.css";

const TABS = ["Mission Control", "Bug Watch", "Testers", "Users", "Billing", "Businesses", "Activity", "Settings"];
const OWNER_EMAILS = new Set(["hello@churvox.com", "howardjennings77@gmail.com", "howardjennings777@gmail.com"]);
const PLAN_OPTIONS = [
  ["solo", "Start"],
  ["team", "Crew"],
  ["pro", "Operator"],
  ["enterprise", "Command"],
];
const PACK_OPTIONS = [
  ["full_access", "Full tester access"],
  ["operator_pack", "Operator free pack"],
  ["command_pack", "Command free pack"],
  ["command_growth_pack", "Command Growth Pack"],
  ["accounting_sync", "Accounting Sync Add-on"],
];
const PLAN_LABELS = {
  start: "Start",
  solo: "Start",
  crew: "Crew",
  team: "Crew",
  operator: "Operator",
  pro: "Operator",
  command: "Command",
  enterprise: "Command",
  none: "No plan",
  "": "No plan",
};

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value, fallback = "—") => String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
const low = (value) => String(value ?? "").trim().toLowerCase();
const money = (value) => Number(value || 0).toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const idOf = (item) => clean(item?.id || item?._id || item?.user_id || item?.business_id || item?.email || Math.random(), "record");
const emailOf = (item) => low(item?.email || item?.user_email || item?.owner_email);
const nameOf = (item) => clean(item?.business_name || item?.company || item?.name || item?.full_name || item?.email || item?.owner_email, "Record");
const dateOf = (item) => item?.last_active || item?.last_seen || item?.last_login_at || item?.updated_at || item?.created_at || item?.createdAt;
const businessIdOf = (item) => clean(item?.business_id || item?.owner_id || item?.user_id || item?.id || item?._id, "");

function token() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}
function headers() {
  return { Accept: "application/json", "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) };
}
async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`, { credentials: "include", headers: headers() });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false || body?.ok === false) throw new Error(body?.detail || body?.message || body?.error || `Request failed ${response.status}`);
  return body;
}
async function apiPost(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, { method: "POST", credentials: "include", headers: headers(), body: JSON.stringify(payload || {}) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false || body?.ok === false) throw new Error(body?.detail || body?.message || body?.error || `Request failed ${response.status}`);
  return body;
}
function ageText(value) {
  if (!value) return "—";
  try {
    const diff = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(diff)) return "—";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  } catch { return "—"; }
}
function dateText(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("en-NZ");
  } catch { return String(value); }
}
function planOf(item) {
  const raw = low(item?.plan_name || item?.plan || item?.subscription_plan || item?.tier || item?.selected_plan);
  return PLAN_LABELS[raw] || (raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "No plan");
}
function statusOf(item) {
  return clean(item?.subscription_status || item?.billing_status || item?.stripe_status || item?.status, "Unknown");
}
function roleOf(item) {
  return clean(item?.role || item?.user_role || item?.account_type || item?.member_role, "owner");
}
function isTester(item) {
  return Boolean(item?.is_free_tester || item?.free_tester_access || low(statusOf(item)).includes("tester") || item?.app_owner_free_pack);
}
function isPaid(item) {
  const status = low(statusOf(item));
  return !isTester(item) && (status.includes("active") || status.includes("paid"));
}
function needsHelp(item, lists) {
  const status = low(statusOf(item));
  if (/past|fail|unpaid|required|locked|cancel/.test(status)) return true;
  const id = businessIdOf(item);
  if (!id) return false;
  const jobs = arr(lists.jobs).filter((x) => businessIdOf(x) === id).length;
  const clients = arr(lists.clients).filter((x) => businessIdOf(x) === id).length;
  return !jobs || !clients;
}
function downloadCsv(name, rows) {
  const safeRows = arr(rows);
  const keys = Array.from(new Set(safeRows.flatMap((row) => Object.keys(row || {})))).slice(0, 70);
  const csv = [keys.join(","), ...safeRows.map((row) => keys.map((key) => `"${String(typeof row?.[key] === "object" ? JSON.stringify(row?.[key]) : row?.[key] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
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
function toneClass(value) {
  const text = low(value);
  if (/active|paid|healthy|clear|ok|tester|grant|enabled/.test(text)) return "ok";
  if (/trial|pending|watch|setup|none|new/.test(text)) return "watch";
  if (/fail|past|unpaid|required|locked|cancel|issue|bad|error|revoked/.test(text)) return "bad";
  return "plain";
}
function issueTone(level) {
  if (level === "bad") return "bad";
  if (level === "watch") return "watch";
  return "ok";
}
function buildIssues({ endpointErrors, users, businesses, lists, retention, control }) {
  const issues = [];
  arr(endpointErrors).forEach((item) => issues.push({ level: "bad", title: `${item.name} failed`, detail: item.error || "Admin endpoint did not load." }));
  if (!endpointErrors.length && !users.length) issues.push({ level: "watch", title: "No users returned", detail: "HQ loaded but did not receive user records." });
  const billing = users.filter((user) => /past|fail|required|locked|unpaid|cancel/i.test(statusOf(user))).length;
  if (billing) issues.push({ level: "watch", title: `${billing} billing/access issue${billing === 1 ? "" : "s"}`, detail: "Open Billing and follow up before launch." });
  const support = businesses.filter((business) => needsHelp(business, lists)).length;
  if (support) issues.push({ level: "watch", title: `${support} setup support signal${support === 1 ? "" : "s"}`, detail: "Some accounts look empty or incomplete." });
  const failures = arr(retention?.last_result?.failures || retention?.failures);
  if (failures.length) issues.push({ level: "watch", title: `${failures.length} email failure${failures.length === 1 ? "" : "s"}`, detail: "Lifecycle email delivery needs checking." });
  if (arr(control?.items).some((item) => /fail|error|denied/i.test(JSON.stringify(item)))) issues.push({ level: "watch", title: "Control log warning", detail: "Recent HQ control activity includes a warning." });
  return issues.length ? issues : [{ level: "clear", title: "HQ is clear", detail: "Admin endpoints loaded and no urgent issue was detected." }];
}

function Pill({ children, tone }) {
  return <span className={`aomPill ${tone || toneClass(children)}`}>{children}</span>;
}
function Metric({ label, value, note, icon: Icon, hot }) {
  return <article className={`aomMetric ${hot ? "hot" : ""}`}><div><small>{label}</small>{Icon ? <span><Icon size={18} /></span> : null}</div><b>{value}</b>{note ? <p>{note}</p> : null}</article>;
}
function Empty({ children = "Nothing here yet." }) {
  return <div className="aomEmpty"><CheckCircle2 size={22} />{children}</div>;
}
function RowCard({ item, onOpen, actions }) {
  return <article className="aomRowCard"><button type="button" onClick={() => onOpen(item)}><b>{nameOf(item)}</b><span>{emailOf(item) || clean(item?.target_email || item?.owner_email || item?.path || item?.action)}</span><em>{dateText(dateOf(item))}</em></button>{actions ? <div>{actions}</div> : null}</article>;
}
function UserTable({ rows, onOpen, onControl }) {
  const safeRows = arr(rows);
  if (!safeRows.length) return <Empty>No records returned.</Empty>;
  return <div className="aomTable"><table><thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Pack</th><th>Last</th><th>Control</th></tr></thead><tbody>{safeRows.map((user) => <tr key={idOf(user)}><td><button type="button" onClick={() => onOpen(user)}><b>{nameOf(user)}</b><span>{emailOf(user)}</span></button></td><td><Pill>{planOf(user)}</Pill></td><td><Pill>{statusOf(user)}</Pill></td><td>{clean(user?.app_owner_free_pack_label || user?.free_tester_note || (isTester(user) ? "Tester" : "—"))}</td><td>{ageText(dateOf(user))}</td><td><div className="aomTableActions"><button type="button" onClick={() => onOpen(user)}><Eye size={15} /></button><button type="button" onClick={() => onControl(user, "grant")}>Grant</button><button type="button" className="danger" onClick={() => onControl(user, "revoke")}>Revoke</button></div></td></tr>)}</tbody></table></div>;
}
function DetailModal({ item, onClose, onControl }) {
  if (!item) return null;
  const rows = Object.entries(item || {}).filter(([key]) => !/password|token|secret|hash/i.test(key)).slice(0, 80);
  return <div className="aomModal" role="dialog" aria-modal="true"><section><button type="button" className="aomModalClose" onClick={onClose}>×</button><small>record detail</small><h2>{nameOf(item)}</h2><p>{emailOf(item) || clean(item?.target_email || item?.action || item?.path)}</p><div className="aomModalActions"><button type="button" onClick={() => onControl(item, "grant")}>Grant access</button><button type="button" className="danger" onClick={() => onControl(item, "revoke")}>Revoke</button></div><div className="aomDetailGrid">{rows.map(([key, value]) => <div key={key}><span>{key.replaceAll("_", " ")}</span><b>{typeof value === "object" ? JSON.stringify(value).slice(0, 400) : String(value ?? "")}</b></div>)}</div></section></div>;
}
function TesterPanel({ onSaved }) {
  const [form, setForm] = React.useState({ email: "", name: "", business_name: "", plan: "pro", pack: "full_access", days: 90, note: "", send_email: true });
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await apiPost("/api/admin/owner/tester-intake", form);
      setResult(response);
      onSaved?.();
    } catch (err) {
      setError(err.message || "Could not save tester.");
    } finally {
      setBusy(false);
    }
  }
  return <section className="aomTester"><form onSubmit={submit}><div className="aomCardHead"><span><UserPlus size={16} />Tester intake</span><Pill tone="watch">90 day default</Pill></div><h3>Grant access without touching the database.</h3><p>Add a tester, choose the plan/pack, and Churvox will grant access if the account already exists.</p><div className="aomFormGrid"><label><span>Email</span><input required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="tester@email.com" /></label><label><span>Name</span><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Name" /></label><label><span>Business</span><input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Business name" /></label><label><span>Plan</span><select value={form.plan} onChange={(e) => set("plan", e.target.value)}>{PLAN_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Pack</span><select value={form.pack} onChange={(e) => set("pack", e.target.value)}>{PACK_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Days</span><input type="number" min="1" max="1095" value={form.days} onChange={(e) => set("days", e.target.value)} /></label><label className="wide"><span>Note</span><textarea value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Why they are being granted access..." /></label></div>{error ? <div className="aomNotice bad">{error}</div> : null}{result ? <div className="aomNotice ok">{result.message || "Tester saved."}{result.signup_link || result.login_link ? <a href={result.signup_link || result.login_link} target="_blank" rel="noreferrer">Open access link</a> : null}</div> : null}<button type="submit" disabled={busy}>{busy ? "Saving..." : "Grant tester access"}</button></form><aside><h3>Tester rules</h3><ul><li>Free testers do not count as paid MRR.</li><li>Owner emails cannot be revoked from HQ.</li><li>Use this instead of editing database records.</li></ul></aside></section>;
}

export default function AppOwnerMachine() {
  const [tab, setTab] = React.useState("Mission Control");
  const [query, setQuery] = React.useState("");
  const [data, setData] = React.useState({});
  const [plans, setPlans] = React.useState({});
  const [control, setControl] = React.useState({});
  const [retention, setRetention] = React.useState({});
  const [endpointErrors, setEndpointErrors] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [toast, setToast] = React.useState("");
  const [busyAction, setBusyAction] = React.useState(false);
  const [selected, setSelected] = React.useState(null);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const calls = [
      ["overview", "/api/admin/owner-overview"],
      ["plan report", "/api/admin/owner/plan-report"],
      ["control log", "/api/admin/owner/control-log"],
      ["retention", "/api/admin/owner/retention-email-status"],
    ];
    const results = await Promise.allSettled(calls.map(([, path]) => apiGet(path)));
    const errors = [];
    results.forEach((result, index) => {
      const [name] = calls[index];
      if (result.status === "rejected") errors.push({ name, error: result.reason?.message || "Request failed" });
      if (name === "overview" && result.status === "fulfilled") setData(result.value || {});
      if (name === "plan report" && result.status === "fulfilled") setPlans(result.value || {});
      if (name === "control log" && result.status === "fulfilled") setControl(result.value || {});
      if (name === "retention" && result.status === "fulfilled") setRetention(result.value || {});
    });
    setEndpointErrors(errors);
    if (!silent) setLoading(false);
  }, []);

  React.useEffect(() => { load(false); }, [load]);
  React.useEffect(() => { const timer = window.setInterval(() => load(true), 20000); return () => window.clearInterval(timer); }, [load]);

  const lists = data?.lists || {};
  const metrics = data?.metrics || {};
  const users = React.useMemo(() => {
    const seen = new Set();
    return [...arr(lists.all_users), ...arr(lists.users), ...arr(plans.paid_users), ...arr(plans.trial_users), ...arr(plans.free_testers)].filter((user) => {
      const key = emailOf(user) || idOf(user);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [lists, plans]);
  const businesses = arr(lists.businesses);
  const testers = users.filter(isTester);
  const paid = users.filter(isPaid);
  const activeNow = arr(lists.active_now);
  const events = [...arr(lists.events), ...arr(lists.activity), ...arr(control.items)].slice(0, 180);
  const support = businesses.filter((business) => needsHelp(business, lists));
  const q = low(query);
  const filteredUsers = users.filter((user) => !q || JSON.stringify(user).toLowerCase().includes(q));
  const billingRows = filteredUsers.filter((user) => isTester(user) || isPaid(user) || /trial|past|fail|required|locked|none|unpaid/i.test(statusOf(user)));
  const issues = buildIssues({ endpointErrors, users, businesses, lists, retention, control });
  const badCount = issues.filter((item) => item.level === "bad").length;
  const watchCount = issues.filter((item) => item.level === "watch").length;
  const pageUsers = tab === "Billing" ? billingRows : tab === "Testers" ? testers : filteredUsers;

  async function controlUser(user, action) {
    const email = emailOf(user);
    if (OWNER_EMAILS.has(email)) {
      setToast("Owner account is protected. HQ will not revoke platform owner emails.");
      return;
    }
    setBusyAction(true);
    setToast(action === "revoke" ? "Revoking access..." : "Granting access...");
    try {
      const payload = { identifier: email || idOf(user), action: action === "revoke" ? "revoke" : "grant", plan: action === "revoke" ? user.plan : "pro", pack: "full_access", days: 90, note: action === "revoke" ? "Revoked from HQ app owner machine" : "Granted from HQ app owner machine" };
      const response = await apiPost("/api/admin/owner/control-access", payload);
      setToast(response.message || "Access updated.");
      setSelected(null);
      await load(true);
    } catch (err) {
      setToast(err.message || "Could not update access.");
    } finally {
      setBusyAction(false);
    }
  }

  return <main className="aom" data-version="CHURVOX_APP_OWNER_MACHINE_20260708"><DetailModal item={selected} onClose={() => setSelected(null)} onControl={controlUser} /><aside className="aomSide"><section className="aomBrand"><span><ShieldCheck size={26} /></span><small>Churvox HQ</small><h1>App Owner Machine</h1><p>Owner-only control room for testers, users, billing, support signals, bugs and platform health.</p><button type="button" onClick={logout}><LogOut size={15} />Log out</button></section><nav>{TABS.map((item) => <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}{item === "Bug Watch" && badCount + watchCount ? <em>{badCount + watchCount}</em> : null}</button>)}</nav><section className="aomPulse"><small>Live pulse</small><div><span>Refresh</span><b>20 sec</b></div><div><span>Active now</span><b>{activeNow.length}</b></div><div><span>Users</span><b>{users.length}</b></div><div><span>Status</span><b>{endpointErrors.length ? "Check" : "Online"}</b></div></section></aside><section className="aomMain"><header className="aomHero"><div><span><LockKeyhole size={15} /> Owner only</span><h2>{tab}</h2><p>{tab === "Mission Control" ? "Your platform cockpit: what is growing, what is broken, who needs help, and what needs owner action." : "HQ stays separate from customer dashboards. This page is for running Churvox itself."}</p></div><div className="aomHeroActions"><button type="button" onClick={() => downloadCsv("churvox-hq-users.csv", filteredUsers)}><Download size={16} />Export</button><button type="button" className="hot" onClick={() => load(false)}><RefreshCw size={16} className={loading ? "spin" : ""} />Refresh</button></div></header>{toast ? <div className={`aomNotice ${busyAction ? "watch" : toneClass(toast)}`}>{toast}</div> : null}{endpointErrors.length ? <div className="aomNotice watch">{endpointErrors.length} HQ endpoint{endpointErrors.length === 1 ? "" : "s"} need checking. Open Bug Watch.</div> : null}{!["Mission Control", "Bug Watch", "Settings"].includes(tab) ? <section className="aomSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, business, plan, status..." /></section> : null}{tab === "Mission Control" ? <div className="aomStack"><section className="aomMetrics"><Metric label="Total users" value={metrics.total_users || users.length} note={`${metrics.customer_users || 0} customer · ${metrics.internal_users || 0} internal`} icon={Users} /><Metric label="Paid users" value={metrics.paid_users || paid.length} note={`${money(metrics.monthly_revenue_estimate || 0)} MRR estimate`} icon={CreditCard} hot /><Metric label="Free testers" value={metrics.free_tester_users || testers.length} note="Owner-granted access" icon={Gift} hot /><Metric label="Active now" value={metrics.active_now || activeNow.length} note={`${metrics.active_today || 0} active today`} icon={Zap} /><Metric label="Businesses" value={metrics.total_businesses || businesses.length} note={`${support.length} support signals`} icon={Building2} /><Metric label="Jobs" value={metrics.total_jobs || arr(lists.jobs).length} note={`${metrics.total_clients || 0} clients`} icon={Activity} /><Metric label="Bug watch" value={badCount + watchCount} note={badCount ? `${badCount} urgent` : "No urgent blocker"} icon={AlertTriangle} hot={badCount + watchCount > 0} /><Metric label="Database" value={arr(data.collections_seen).length || "—"} note="Collections visible to HQ" icon={Database} /></section><section className="aomTwo"><div className="aomCard"><div className="aomCardHead"><span><Users size={16} />Newest users</span><button type="button" onClick={() => setTab("Users")}>View all</button></div><UserTable rows={[...users].sort((a, b) => new Date(dateOf(b) || 0) - new Date(dateOf(a) || 0)).slice(0, 8)} onOpen={setSelected} onControl={controlUser} /></div><div className="aomCard"><div className="aomCardHead"><span><RadioIcon />Live activity</span><button type="button" onClick={() => setTab("Activity")}>Open</button></div><div className="aomList">{events.slice(0, 12).map((event, index) => <RowCard key={`${idOf(event)}-${index}`} item={event} onOpen={setSelected} />)}{!events.length ? <Empty>No activity yet.</Empty> : null}</div></div></section></div> : null}{tab === "Bug Watch" ? <section className="aomTwo"><div className="aomCard"><div className="aomCardHead"><span><AlertTriangle size={16} />Bug Watch</span><Pill tone={badCount ? "bad" : watchCount ? "watch" : "ok"}>{badCount ? "urgent" : watchCount ? "watch" : "clear"}</Pill></div><div className="aomIssueList">{issues.map((item, index) => <article key={`${item.title}-${index}`} className={issueTone(item.level)}><b>{item.title}</b><p>{item.detail}</p><Pill tone={issueTone(item.level)}>{item.level}</Pill></article>)}</div></div><div className="aomCard"><div className="aomCardHead"><span><ShieldCheck size={16} />System checks</span></div><div className="aomCheckGrid"><div><b>Owner guard</b><span>Active</span></div><div><b>Admin APIs</b><span>{endpointErrors.length ? `${endpointErrors.length} issue` : "Loaded"}</span></div><div><b>Control log</b><span>{arr(control.items).length} rows</span></div><div><b>Retention</b><span>{arr(retention.items).length} rows</span></div><div><b>Customer app</b><span>Separate</span></div><div><b>Refresh</b><span>20 seconds</span></div></div></div></section> : null}{tab === "Testers" ? <TesterPanel onSaved={() => load(true)} /> : null}{["Users", "Billing"].includes(tab) ? <UserTable rows={pageUsers} onOpen={setSelected} onControl={controlUser} /> : null}{tab === "Businesses" ? <UserTable rows={businesses.filter((business) => !q || JSON.stringify(business).toLowerCase().includes(q))} onOpen={setSelected} onControl={controlUser} /> : null}{tab === "Activity" ? <section className="aomActivityGrid">{events.filter((event) => !q || JSON.stringify(event).toLowerCase().includes(q)).map((event, index) => <RowCard key={`${idOf(event)}-${index}`} item={event} onOpen={setSelected} />)}{!events.length ? <Empty>No activity yet.</Empty> : null}</section> : null}{tab === "Settings" ? <section className="aomStack"><div className="aomCard"><div className="aomCardHead"><span><ShieldCheck size={16} />HQ rules</span></div><p className="aomParagraph">This machine is only for the Churvox platform owner. It keeps tester access, billing signals, support issues and control actions away from normal customer dashboards.</p><section className="aomMetrics small"><Metric label="API" value={endpointErrors.length ? "Check" : "Online"} note="Owner endpoints" icon={ShieldCheck} /><Metric label="Control log" value={arr(control.items).length} note="Owner actions" icon={Activity} /><Metric label="Auto refresh" value="20s" note="While open" icon={RefreshCw} /></section></div><RemoveCustomerDataCard onRemoved={() => load(true)} /></section> : null}{loading ? <div className="aomNotice plain">Loading HQ control room…</div> : null}</section></main>;
}

function RadioIcon() {
  return <Activity size={16} />;
}
