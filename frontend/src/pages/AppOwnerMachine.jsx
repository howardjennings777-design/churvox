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

const TABS = ["HQ", "Control Room", "Growth", "Bug Watch", "Testers", "Users", "Billing", "Businesses", "Activity", "Settings"];
const OWNER_EMAILS = new Set(["hello@churvox.com", "howardjennings77@gmail.com", "howardjennings777@gmail.com"]);
const PLAN_OPTIONS = [["solo", "Start"], ["team", "Crew"], ["pro", "Operator"], ["enterprise", "Command"]];
const PACK_OPTIONS = [["full_access", "Full tester access"], ["operator_pack", "Operator free pack"], ["command_pack", "Command free pack"], ["command_growth_pack", "Command Growth Pack"], ["accounting_sync", "Accounting Sync Add-on"]];
const PLAN_LABELS = { start: "Start", solo: "Start", crew: "Crew", team: "Crew", operator: "Operator", pro: "Operator", command: "Command", enterprise: "Command", none: "No plan", "": "No plan" };

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value, fallback = "—") => String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
const low = (value) => String(value ?? "").trim().toLowerCase();
const money = (value) => Number(value || 0).toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const idOf = (item) => clean(item?.id || item?._id || item?.user_id || item?.business_id || item?.email || item?.visitor_key || Math.random(), "record");
const emailOf = (item) => low(item?.email || item?.user_email || item?.owner_email);
const nameOf = (item) => clean(item?.business_name || item?.company || item?.name || item?.full_name || item?.email || item?.owner_email || item?.last_path || item?.first_path, "Record");
const dateOf = (item) => item?.last_active || item?.last_seen || item?.last_login_at || item?.updated_at || item?.created_at || item?.createdAt || item?.first_seen;
const businessIdOf = (item) => clean(item?.business_id || item?.owner_id || item?.user_id || item?.id || item?._id, "");

function token() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}
function headers() {
  const t = token();
  return { Accept: "application/json", "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
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
  try { const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("en-NZ"); } catch { return String(value); }
}
function planOf(item) {
  const raw = low(item?.plan_name || item?.plan || item?.subscription_plan || item?.tier || item?.selected_plan);
  return PLAN_LABELS[raw] || (raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "No plan");
}
function statusOf(item) { return clean(item?.subscription_status || item?.billing_status || item?.stripe_status || item?.status, "Unknown"); }
function isTester(item) { return Boolean(item?.is_free_tester || item?.free_tester_access || low(statusOf(item)).includes("tester") || item?.app_owner_free_pack); }
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
  if (/active|paid|healthy|clear|ok|tester|grant|enabled|accepted|online|secure/.test(text)) return "ok";
  if (/trial|pending|watch|setup|none|new|invited|waiting|check/.test(text)) return "watch";
  if (/fail|past|unpaid|required|locked|cancel|issue|bad|error|revoked|expired/.test(text)) return "bad";
  return "plain";
}
function issueTone(level) { if (level === "bad") return "bad"; if (level === "watch") return "watch"; return "ok"; }
function buildIssues({ endpointErrors, users, businesses, lists, retention, control, growth }) {
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
  if (!growth?.success) issues.push({ level: "watch", title: "Growth report waiting", detail: "Unique visits and accepted testers need the new backend report deployed." });
  return issues.length ? issues : [{ level: "clear", title: "HQ is clear", detail: "Admin endpoints loaded and no urgent issue was detected." }];
}

function Pill({ children, tone }) { return <span className={`aomPill ${tone || toneClass(children)}`}>{children}</span>; }
function Metric({ label, value, note, icon: Icon, hot }) {
  return <article className={`aomMetric ${hot ? "hot" : ""}`}><div><small>{label}</small>{Icon ? <span><Icon size={18} /></span> : null}</div><b>{value}</b>{note ? <p>{note}</p> : null}</article>;
}
function Empty({ children = "Nothing here yet." }) { return <div className="aomEmpty"><CheckCircle2 size={22} />{children}</div>; }
function RowCard({ item, onOpen, actions }) {
  return <article className="aomRowCard"><button type="button" onClick={() => onOpen(item)}><b>{nameOf(item)}</b><span>{emailOf(item) || clean(item?.target_email || item?.owner_email || item?.path || item?.last_path || item?.action)}</span><em>{dateText(dateOf(item))}</em></button>{actions ? <div>{actions}</div> : null}</article>;
}
function ControlButton({ label, note, icon: Icon, onClick, tone = "plain" }) {
  return <button type="button" className={`aomControlButton ${tone}`} onClick={onClick}>{Icon ? <Icon size={18} /> : null}<span><b>{label}</b><small>{note}</small></span></button>;
}
function UserTable({ rows, onOpen, onControl }) {
  const safeRows = arr(rows);
  if (!safeRows.length) return <Empty>No records returned.</Empty>;
  return <div className="aomTable"><table><thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Pack</th><th>Last</th><th>Control</th></tr></thead><tbody>{safeRows.map((user) => <tr key={idOf(user)}><td><button type="button" onClick={() => onOpen(user)}><b>{nameOf(user)}</b><span>{emailOf(user)}</span></button></td><td><Pill>{planOf(user)}</Pill></td><td><Pill>{statusOf(user)}</Pill></td><td>{clean(user?.app_owner_free_pack_label || user?.free_tester_note || (isTester(user) ? "Tester" : "—"))}</td><td>{ageText(dateOf(user))}</td><td><div className="aomTableActions"><button type="button" onClick={() => onOpen(user)}><Eye size={15} /></button><button type="button" onClick={() => onControl(user, "grant")}>Grant</button><button type="button" className="danger" onClick={() => onControl(user, "revoke")}>Revoke</button></div></td></tr>)}</tbody></table></div>;
}
function DetailModal({ item, onClose, onControl }) {
  if (!item) return null;
  const rows = Object.entries(item || {}).filter(([key]) => !/password|token|secret|hash/i.test(key)).slice(0, 80);
  return <div className="aomModal" role="dialog" aria-modal="true"><section><button type="button" className="aomModalClose" onClick={onClose}>×</button><small>platform record detail</small><h2>{nameOf(item)}</h2><p>{emailOf(item) || clean(item?.target_email || item?.action || item?.path || item?.last_path)}</p><div className="aomModalActions"><button type="button" onClick={() => onControl(item, "grant")}>Grant access</button><button type="button" className="danger" onClick={() => onControl(item, "revoke")}>Revoke</button></div><div className="aomDetailGrid">{rows.map(([key, value]) => <div key={key}><span>{key.replaceAll("_", " ")}</span><b>{typeof value === "object" ? JSON.stringify(value).slice(0, 400) : String(value ?? "")}</b></div>)}</div></section></div>;
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
    try { const response = await apiPost("/api/admin/owner/tester-intake", form); setResult(response); onSaved?.(); }
    catch (err) { setError(err.message || "Could not save tester."); }
    finally { setBusy(false); }
  }
  return <section className="aomTester"><form onSubmit={submit}><div className="aomCardHead"><span><UserPlus size={16} />Tester intake</span><Pill tone="watch">90 day default</Pill></div><h3>Grant tester access from HQ.</h3><p>Add a tester, choose the plan/pack, and Churvox grants access if the account already exists. This stays separate from paid MRR.</p><div className="aomFormGrid"><label><span>Email</span><input required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="tester@email.com" /></label><label><span>Name</span><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Name" /></label><label><span>Business</span><input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Business name" /></label><label><span>Plan</span><select value={form.plan} onChange={(e) => set("plan", e.target.value)}>{PLAN_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Pack</span><select value={form.pack} onChange={(e) => set("pack", e.target.value)}>{PACK_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Days</span><input type="number" min="1" max="1095" value={form.days} onChange={(e) => set("days", e.target.value)} /></label><label className="wide"><span>Note</span><textarea value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Why they are being granted access..." /></label></div>{error ? <div className="aomNotice bad">{error}</div> : null}{result ? <div className="aomNotice ok">{result.message || "Tester saved."}{result.signup_link || result.login_link ? <a href={result.signup_link || result.login_link} target="_blank" rel="noreferrer">Open access link</a> : null}</div> : null}<button type="submit" disabled={busy}>{busy ? "Saving..." : "Grant tester access"}</button></form><aside><h3>HQ tester rules</h3><ul><li>Accepted tester means the person has access or their tester account is linked.</li><li>Pending tester means invited/saved but not accepted yet.</li><li>Free testers stay separate from paid revenue.</li></ul></aside></section>;
}
function VisitorTable({ rows, onOpen }) {
  const safeRows = arr(rows);
  if (!safeRows.length) return <Empty>No unique visitors tracked yet.</Empty>;
  return <div className="aomTable"><table><thead><tr><th>Visitor</th><th>First seen</th><th>Last seen</th><th>Pageviews</th><th>Source</th></tr></thead><tbody>{safeRows.slice(0, 80).map((visitor) => <tr key={idOf(visitor)}><td><button type="button" onClick={() => onOpen(visitor)}><b>{nameOf(visitor)}</b><span>{clean(visitor?.visitor_key || visitor?.ip_hash || visitor?.first_path)}</span></button></td><td>{dateText(visitor?.first_seen)}</td><td>{ageText(visitor?.last_seen)}</td><td>{visitor?.pageviews || visitor?.visits || 1}</td><td>{clean(visitor?.source || visitor?.utm_source || visitor?.referrer || visitor?.last_path)}</td></tr>)}</tbody></table></div>;
}
function TesterPipeline({ growth, onOpen }) {
  const pipeline = growth?.tester_pipeline || {};
  const groups = [["Accepted", pipeline.accepted], ["Pending", pipeline.pending], ["Invited", pipeline.invited], ["Expired", pipeline.expired]];
  return <section className="aomTwo">{groups.map(([label, rows]) => <div className="aomCard" key={label}><div className="aomCardHead"><span><Gift size={16} />{label}</span><Pill>{arr(rows).length}</Pill></div><div className="aomList">{arr(rows).slice(0, 10).map((item) => <RowCard key={idOf(item.linked_user || item)} item={item.linked_user || item} onOpen={onOpen} />)}{!arr(rows).length ? <Empty>No {label.toLowerCase()} testers.</Empty> : null}</div></div>)}</section>;
}

export default function AppOwnerMachine() {
  const [tab, setTab] = React.useState("HQ");
  const [query, setQuery] = React.useState("");
  const [data, setData] = React.useState({});
  const [plans, setPlans] = React.useState({});
  const [control, setControl] = React.useState({});
  const [retention, setRetention] = React.useState({});
  const [growth, setGrowth] = React.useState({});
  const [endpointErrors, setEndpointErrors] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [toast, setToast] = React.useState("");
  const [busyAction, setBusyAction] = React.useState(false);
  const [selected, setSelected] = React.useState(null);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const calls = [["overview", "/api/admin/owner-overview"], ["plan report", "/api/admin/owner/plan-report"], ["control log", "/api/admin/owner/control-log"], ["retention", "/api/admin/owner/retention-email-status"], ["growth report", "/api/admin/owner/growth-report"]];
    const results = await Promise.allSettled(calls.map(([, path]) => apiGet(path)));
    const errors = [];
    results.forEach((result, index) => {
      const [name] = calls[index];
      if (result.status === "rejected") errors.push({ name, error: result.reason?.message || "Request failed" });
      if (name === "overview" && result.status === "fulfilled") setData(result.value || {});
      if (name === "plan report" && result.status === "fulfilled") setPlans(result.value || {});
      if (name === "control log" && result.status === "fulfilled") setControl(result.value || {});
      if (name === "retention" && result.status === "fulfilled") setRetention(result.value || {});
      if (name === "growth report" && result.status === "fulfilled") setGrowth(result.value || {});
    });
    setEndpointErrors(errors);
    if (!silent) setLoading(false);
  }, []);

  React.useEffect(() => { load(false); }, [load]);
  React.useEffect(() => { const timer = window.setInterval(() => load(true), 20000); return () => window.clearInterval(timer); }, [load]);

  const lists = React.useMemo(() => data?.lists || {}, [data?.lists]);
  const metrics = data?.metrics || {};
  const counts = growth?.counts || {};
  const conversion = growth?.conversion || {};
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
  const issues = buildIssues({ endpointErrors, users, businesses, lists, retention, control, growth });
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
      const payload = { identifier: email || idOf(user), action: action === "revoke" ? "revoke" : "grant", plan: action === "revoke" ? user.plan : "pro", pack: "full_access", days: 90, note: action === "revoke" ? "Revoked from Churvox Owner HQ" : "Granted from Churvox Owner HQ" };
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

  const growthMetrics = <section className="aomMetrics"><Metric label="Unique visits" value={counts.unique_total ?? "—"} note={`${counts.new_unique_today || 0} new today · ${counts.unique_active_7d || 0} active 7d`} icon={Eye} hot /><Metric label="Total visits" value={counts.visits_total || counts.pageviews_total || 0} note={`${counts.pageviews_total || 0} pageviews tracked`} icon={Activity} /><Metric label="Accepted testers" value={counts.accepted_testers ?? arr(growth?.tester_pipeline?.accepted).length} note={`${counts.pending_testers || 0} pending · ${counts.active_testers_30d || 0} active 30d`} icon={Gift} hot /><Metric label="Tester invites" value={counts.tester_invites_total || 0} note={`${conversion.tester_acceptance_percent || 0}% accepted`} icon={UserPlus} /><Metric label="Signups" value={counts.signups_total || metrics.total_users || users.length} note={`${conversion.visitor_to_signup_percent || 0}% visitor to signup`} icon={Users} /><Metric label="Paid users" value={counts.paid_users || metrics.paid_users || paid.length} note={`${conversion.accepted_to_paid_percent || 0}% accepted to paid`} icon={CreditCard} hot /><Metric label="Businesses" value={counts.businesses_total || metrics.total_businesses || businesses.length} note={`${support.length} support signals`} icon={Building2} /><Metric label="30d visitors" value={counts.unique_active_30d || 0} note="Recent public visitors" icon={Zap} /></section>;

  return <main className="aom" data-version="CHURVOX_PLATFORM_OWNER_HQ_CONTROL_ROOM_20260710"><DetailModal item={selected} onClose={() => setSelected(null)} onControl={controlUser} /><aside className="aomSide"><section className="aomBrand"><span><ShieldCheck size={26} /></span><small>Churvox owner only</small><h1>Owner HQ</h1><p>Platform control room for you: users, testers, billing, growth, bugs, customer support signals, data controls and app health.</p><button type="button" onClick={logout}><LogOut size={15} />Log out</button></section><nav>{TABS.map((item) => <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}{item === "Bug Watch" && badCount + watchCount ? <em>{badCount + watchCount}</em> : null}{item === "Growth" && counts.pending_testers ? <em>{counts.pending_testers}</em> : null}</button>)}</nav><section className="aomPulse"><small>Live pulse</small><div><span>Refresh</span><b>20 sec</b></div><div><span>Unique visits</span><b>{counts.unique_total || 0}</b></div><div><span>Accepted testers</span><b>{counts.accepted_testers || testers.length}</b></div><div><span>Status</span><b>{endpointErrors.length ? "Check" : "Online"}</b></div></section></aside><section className="aomMain"><header className="aomHero"><div><span><LockKeyhole size={15} /> Platform owner access</span><h2>{tab === "HQ" ? "Churvox Owner HQ" : tab}</h2><p>{tab === "HQ" ? "This is the app-owner control room, not a customer dashboard. You can see growth, users, testers, billing, bugs, businesses, activity and data controls from one place." : tab === "Control Room" ? "Absolute control, with owner-account protection and audit visibility. Grant access, revoke access, export records, inspect activity, and use danger controls deliberately." : tab === "Growth" ? "Track unique visitors, accepted testers, pending tester invites, signups and conversion signals." : "HQ stays separate from customer dashboards. This page is for running Churvox itself."}</p></div><div className="aomHeroActions"><button type="button" onClick={() => downloadCsv(tab === "Growth" ? "churvox-growth-visitors.csv" : "churvox-hq-users.csv", tab === "Growth" ? arr(growth.visitors) : filteredUsers)}><Download size={16} />Export</button><button type="button" className="hot" onClick={() => load(false)}><RefreshCw size={16} className={loading ? "spin" : ""} />Refresh</button></div></header>{toast ? <div className={`aomNotice ${busyAction ? "watch" : toneClass(toast)}`}>{toast}</div> : null}{endpointErrors.length ? <div className="aomNotice watch">{endpointErrors.length} HQ endpoint{endpointErrors.length === 1 ? "" : "s"} need checking. Open Bug Watch.</div> : null}{!["HQ", "Control Room", "Growth", "Bug Watch", "Settings"].includes(tab) ? <section className="aomSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, business, plan, status..." /></section> : null}

  {tab === "HQ" ? <div className="aomStack"><section className="aomMetrics"><Metric label="Unique visits" value={counts.unique_total ?? "—"} note={`${counts.unique_active_7d || 0} active 7d`} icon={Eye} hot /><Metric label="Accepted testers" value={counts.accepted_testers || testers.length} note={`${counts.pending_testers || 0} pending`} icon={Gift} hot /><Metric label="Total users" value={metrics.total_users || users.length} note={`${metrics.customer_users || 0} customer · ${metrics.internal_users || 0} internal`} icon={Users} /><Metric label="Paid users" value={metrics.paid_users || paid.length} note={`${money(metrics.monthly_revenue_estimate || 0)} MRR estimate`} icon={CreditCard} hot /><Metric label="Active now" value={metrics.active_now || activeNow.length} note={`${metrics.active_today || 0} active today`} icon={Zap} /><Metric label="Businesses" value={metrics.total_businesses || businesses.length} note={`${support.length} support signals`} icon={Building2} /><Metric label="Bug watch" value={badCount + watchCount} note={badCount ? `${badCount} urgent` : "No urgent blocker"} icon={AlertTriangle} hot={badCount + watchCount > 0} /><Metric label="Database" value={arr(data.collections_seen).length || "—"} note="Collections visible to HQ" icon={Database} /></section><section className="aomTwo"><div className="aomCard"><div className="aomCardHead"><span><ShieldCheck size={16} />Absolute control map</span><Pill tone="ok">Owner only</Pill></div><div className="aomControlGrid"><ControlButton icon={Gift} label="Grant tester" note="Open tester intake" tone="hot" onClick={() => setTab("Testers")} /><ControlButton icon={Users} label="Control users" note="Grant, inspect or revoke" onClick={() => setTab("Users")} /><ControlButton icon={CreditCard} label="Billing watch" note="Paid, trial, tester, locked" onClick={() => setTab("Billing")} /><ControlButton icon={AlertTriangle} label="Bug watch" note="Endpoint and issue signals" onClick={() => setTab("Bug Watch")} /><ControlButton icon={Activity} label="Activity trail" note="Control and platform events" onClick={() => setTab("Activity")} /><ControlButton icon={Database} label="Data controls" note="Settings and remove card" onClick={() => setTab("Settings")} /></div></div><div className="aomCard"><div className="aomCardHead"><span><LockKeyhole size={16} />Owner authority locks</span><Pill tone="ok">Protected</Pill></div><div className="aomCheckGrid"><div><b>Platform owner route</b><span>/admin only, behind PlatformAdminRoute</span></div><div><b>Customer dashboards</b><span>Separate from this HQ</span></div><div><b>Owner emails</b><span>Protected from revoke</span></div><div><b>Control changes</b><span>Go through admin owner endpoints</span></div><div><b>Exports</b><span>CSV from loaded HQ records</span></div><div><b>Live refresh</b><span>Every 20 seconds while open</span></div></div></div></section><section className="aomTwo"><div className="aomCard"><div className="aomCardHead"><span><Users size={16} />Newest users</span><button type="button" onClick={() => setTab("Users")}>View all</button></div><UserTable rows={[...users].sort((a, b) => new Date(dateOf(b) || 0) - new Date(dateOf(a) || 0)).slice(0, 8)} onOpen={setSelected} onControl={controlUser} /></div><div className="aomCard"><div className="aomCardHead"><span><AlertTriangle size={16} />Needs your eye</span><button type="button" onClick={() => setTab("Bug Watch")}>Open</button></div><div className="aomIssueList">{issues.slice(0, 6).map((item, index) => <article key={`${item.title}-${index}`} className={issueTone(item.level)}><b>{item.title}</b><p>{item.detail}</p><Pill tone={issueTone(item.level)}>{item.level}</Pill></article>)}</div></div></section></div> : null}

  {tab === "Control Room" ? <div className="aomStack"><section className="aomTwo"><div className="aomCard"><div className="aomCardHead"><span><LockKeyhole size={16} />Control room</span><Pill tone="ok">You decide</Pill></div><p className="aomParagraph">This is the platform-owner panel for controlling Churvox itself. It is not shown to customers, workers, or normal business owners.</p><div className="aomControlGrid"><ControlButton icon={UserPlus} label="Add tester" note="Grant 90-day access" tone="hot" onClick={() => setTab("Testers")} /><ControlButton icon={Users} label="Open users" note="Inspect accounts" onClick={() => setTab("Users")} /><ControlButton icon={CreditCard} label="Open billing" note="Plans and payment status" onClick={() => setTab("Billing")} /><ControlButton icon={Building2} label="Businesses" note="Support and setup signals" onClick={() => setTab("Businesses")} /><ControlButton icon={Activity} label="Activity" note="Audit and control log" onClick={() => setTab("Activity")} /><ControlButton icon={Download} label="Export users" note="Download loaded records" onClick={() => downloadCsv("churvox-hq-users.csv", filteredUsers)} /></div></div><div className="aomCard"><div className="aomCardHead"><span><ShieldCheck size={16} />Guard rails</span><Pill tone="ok">Safe control</Pill></div><div className="aomCheckGrid"><div><b>Grant/Revoke</b><span>Available from user records and modal detail</span></div><div><b>Owner account</b><span>Cannot be revoked from HQ</span></div><div><b>Danger data card</b><span>Kept in Settings with its own deliberate control</span></div><div><b>Endpoint health</b><span>{endpointErrors.length ? `${endpointErrors.length} need checking` : "All loaded"}</span></div></div></div></section><section className="aomCard"><div className="aomCardHead"><span><Activity size={16} />Recent control activity</span><button type="button" onClick={() => setTab("Activity")}>Open activity</button></div><div className="aomList">{events.slice(0, 10).map((event, index) => <RowCard key={`${idOf(event)}-${index}`} item={event} onOpen={setSelected} />)}{!events.length ? <Empty>No control activity returned.</Empty> : null}</div></section></div> : null}

  {tab === "Growth" ? <div className="aomStack">{growthMetrics}<TesterPipeline growth={growth} onOpen={setSelected} /><section className="aomTwo"><div className="aomCard"><div className="aomCardHead"><span><Eye size={16} />Unique visitors</span><Pill tone="ok">{counts.unique_total || 0}</Pill></div><VisitorTable rows={arr(growth.visitors)} onOpen={setSelected} /></div><div className="aomCard"><div className="aomCardHead"><span><Activity size={16} />Conversion</span></div><div className="aomCheckGrid"><div><b>Visitor → signup</b><span>{conversion.visitor_to_signup_percent || 0}%</span></div><div><b>Visitor → accepted tester</b><span>{conversion.visitor_to_accepted_tester_percent || 0}%</span></div><div><b>Tester acceptance</b><span>{conversion.tester_acceptance_percent || 0}%</span></div><div><b>Accepted → paid</b><span>{conversion.accepted_to_paid_percent || 0}%</span></div><div><b>New today</b><span>{counts.new_unique_today || 0}</span></div><div><b>Active 30d</b><span>{counts.unique_active_30d || 0}</span></div></div></div></section></div> : null}
  {tab === "Bug Watch" ? <section className="aomTwo"><div className="aomCard"><div className="aomCardHead"><span><AlertTriangle size={16} />Bug Watch</span><Pill tone={badCount ? "bad" : watchCount ? "watch" : "ok"}>{badCount ? "urgent" : watchCount ? "watch" : "clear"}</Pill></div><div className="aomIssueList">{issues.map((item, index) => <article key={`${item.title}-${index}`} className={issueTone(item.level)}><b>{item.title}</b><p>{item.detail}</p><Pill tone={issueTone(item.level)}>{item.level}</Pill></article>)}</div></div><div className="aomCard"><div className="aomCardHead"><span><ShieldCheck size={16} />System checks</span></div><div className="aomCheckGrid"><div><b>Owner guard</b><span>Active</span></div><div><b>Growth report</b><span>{growth?.success ? "Loaded" : "Waiting"}</span></div><div><b>Control log</b><span>{arr(control.items).length} rows</span></div><div><b>Retention</b><span>{arr(retention.items).length} rows</span></div><div><b>Customer app</b><span>Separate</span></div><div><b>Refresh</b><span>20 seconds</span></div></div></div></section> : null}
  {tab === "Testers" ? <div className="aomStack"><TesterPanel onSaved={() => load(true)} /><TesterPipeline growth={growth} onOpen={setSelected} /><UserTable rows={pageUsers} onOpen={setSelected} onControl={controlUser} /></div> : null}
  {["Users", "Billing"].includes(tab) ? <UserTable rows={pageUsers} onOpen={setSelected} onControl={controlUser} /> : null}
  {tab === "Businesses" ? <UserTable rows={businesses.filter((business) => !q || JSON.stringify(business).toLowerCase().includes(q))} onOpen={setSelected} onControl={controlUser} /> : null}
  {tab === "Activity" ? <section className="aomActivityGrid">{events.filter((event) => !q || JSON.stringify(event).toLowerCase().includes(q)).map((event, index) => <RowCard key={`${idOf(event)}-${index}`} item={event} onOpen={setSelected} />)}{!events.length ? <Empty>No activity yet.</Empty> : null}</section> : null}
  {tab === "Settings" ? <section className="aomStack"><div className="aomCard"><div className="aomCardHead"><span><ShieldCheck size={16} />HQ rules</span></div><p className="aomParagraph">This machine is only for the Churvox platform owner. It keeps tester access, unique visits, billing signals, support issues and control actions away from normal customer dashboards.</p><section className="aomMetrics small"><Metric label="API" value={endpointErrors.length ? "Check" : "Online"} note="Owner endpoints" icon={ShieldCheck} /><Metric label="Growth" value={growth?.success ? "Loaded" : "Waiting"} note="Visits and testers" icon={Eye} /><Metric label="Auto refresh" value="20s" note="While open" icon={RefreshCw} /></section></div><RemoveCustomerDataCard /></section> : null}
</section></main>;
}
