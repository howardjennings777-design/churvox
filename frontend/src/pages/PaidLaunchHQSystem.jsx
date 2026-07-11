import React from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  Database,
  Download,
  Gift,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import API_BASE from "../lib/apiBase";
import RemoveCustomerDataCard from "./admin/RemoveCustomerDataCard";
import "./PaidLaunchHQSystem.css";

const PLATFORM_OWNER_EMAIL = "hello@churvox.com";
const OWNER_EMAILS = new Set([PLATFORM_OWNER_EMAIL]);
const TABS = ["Command", "Launch", "Users", "Billing", "Testers", "Businesses", "Activity", "System", "Data"];

const ENDPOINTS = {
  launch: "/api/admin/owner/paid-launch-report",
  overview: "/api/admin/owner-overview",
  growth: "/api/admin/owner/growth-report",
  connection: "/api/admin/owner/connection",
  plans: "/api/admin/owner/plan-report",
  control: "/api/admin/owner/control-log",
  retention: "/api/admin/owner/retention-email-status",
  testers: "/api/admin/owner/testers",
};

const PLAN_OPTIONS = [["solo", "Start"], ["team", "Crew"], ["pro", "Operator"], ["enterprise", "Command"]];
const PACK_OPTIONS = [["full_access", "Full tester access"], ["operator_pack", "Operator free pack"], ["command_pack", "Command free pack"], ["command_growth_pack", "Command Growth Pack"], ["accounting_sync", "Accounting Sync Add-on"]];

const arr = (value) => (Array.isArray(value) ? value : []);
const text = (value, fallback = "") => String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
const low = (value) => text(value).toLowerCase();
const hasValue = (value) => value !== null && value !== undefined && value !== "";
const numberText = (value) => hasValue(value) ? Number(value).toLocaleString("en-NZ") : "0";
const money = (value, currency = "NZD") => hasValue(value)
  ? Number(value).toLocaleString("en-NZ", { style: "currency", currency, maximumFractionDigits: 2 })
  : "Unavailable";

function token() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}

function headers() {
  const value = token();
  return { Accept: "application/json", "Content-Type": "application/json", ...(value ? { Authorization: `Bearer ${value}` } : {}) };
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

function dateText(value) {
  if (!value) return "Unavailable";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? text(value, "Unavailable") : parsed.toLocaleString("en-NZ");
}

function ageText(value) {
  if (!value) return "Unavailable";
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return "Unavailable";
  const minutes = Math.max(0, Math.floor((Date.now() - parsed) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function emailOf(item) { return low(item?.email || item?.user_email || item?.owner_email || item?.tester_email); }
function idOf(item, index = 0) { return text(item?.id || item?._id || item?.stripe_subscription_id || emailOf(item) || item?.visitor_key || item?.created_at, `row-${index}`); }
function nameOf(item) { return text(item?.business_name || item?.company || item?.name || item?.full_name || item?.email || item?.title || item?.path, "Unnamed record"); }
function statusOf(item) { return text(item?.status || item?.subscription_status || item?.billing_status || item?.stripe_status, "Unknown"); }
function planOf(item) {
  const value = low(item?.plan_name || item?.plan || item?.subscription_plan || item?.tier);
  const labels = { start: "Start", solo: "Start", crew: "Crew", team: "Crew", operator: "Operator", pro: "Operator", command: "Command", enterprise: "Command" };
  return labels[value] || (value ? value.charAt(0).toUpperCase() + value.slice(1) : "No plan");
}
function tone(value) {
  const v = low(value);
  if (/pass|ready|connected|verified|active|paid|online|clear|loaded|configured|accepted|trialing/.test(v)) return "good";
  if (/fail|blocked|error|unavailable|past_due|unpaid|cancel|locked|revoked|expired/.test(v)) return "bad";
  return "warn";
}

function downloadCsv(filename, rows) {
  const source = arr(rows);
  if (!source.length) return false;
  const keys = Array.from(new Set(source.flatMap((row) => Object.keys(row || {})))).filter((key) => !/password|token|secret|hash/i.test(key)).slice(0, 90);
  const lines = [keys.join(","), ...source.map((row) => keys.map((key) => {
    const raw = typeof row?.[key] === "object" ? JSON.stringify(row?.[key]) : row?.[key] ?? "";
    return `"${String(raw).replace(/"/g, '""')}"`;
  }).join(","))];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

function logout() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("owner_portal_session");
    localStorage.removeItem("platform_owner_email");
    sessionStorage.clear();
  } catch {}
  window.location.href = "/login";
}

function Metric({ label, value, note, icon: Icon, state = "neutral" }) {
  return <article className={`hq2Metric ${state}`}><header><span>{label}</span>{Icon ? <Icon size={18} /> : null}</header><strong>{value}</strong><p>{note}</p></article>;
}

function Empty({ title = "No records returned", detail = "The live endpoint returned no rows for this section." }) {
  return <div className="hq2Empty"><CheckCircle2 size={22} /><div><strong>{title}</strong><p>{detail}</p></div></div>;
}

function EndpointStatus({ name, entry }) {
  const state = entry?.status || "waiting";
  return <article className={`hq2Endpoint ${tone(state)}`}><div>{state === "loaded" ? <CheckCircle2 size={17} /> : state === "error" ? <XCircle size={17} /> : <RefreshCw size={17} />}</div><section><strong>{name}</strong><span>{entry?.path}</span><small>{state === "loaded" ? `Loaded ${dateText(entry.loadedAt)}` : entry?.error || "Waiting for live response"}</small></section></article>;
}

function LaunchChecks({ checks }) {
  const rows = arr(checks);
  if (!rows.length) return <Empty title="Launch checks unavailable" detail="The paid-launch report did not return launch checks." />;
  return <div className="hq2CheckGrid">{rows.map((item) => <article key={item.key || item.label} className={tone(item.status)}><span>{item.status === "pass" ? <CheckCircle2 size={18} /> : item.status === "fail" ? <XCircle size={18} /> : <AlertTriangle size={18} />}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div><em>{item.status}</em></article>)}</div>;
}

function RecordTable({ rows, onOpen, onControl, control = false, title = "records" }) {
  const source = arr(rows);
  if (!source.length) return <Empty title={`No ${title}`} />;
  return <div className="hq2TableWrap"><table><thead><tr><th>User / business</th><th>Plan</th><th>Status</th><th>Proof</th><th>Last activity</th>{control ? <th>Control</th> : null}</tr></thead><tbody>{source.map((item, index) => <tr key={idOf(item, index)}><td><button type="button" className="hq2RecordButton" onClick={() => onOpen(item)}><strong>{nameOf(item)}</strong><span>{emailOf(item) || "No email returned"}</span></button></td><td>{planOf(item)}</td><td><span className={`hq2Pill ${tone(statusOf(item))}`}>{statusOf(item)}</span></td><td>{text(item?.stripe_subscription_id || item?.source, "Not verified")}</td><td>{ageText(item?.last_active || item?.last_login_at || item?.last_login || item?.updated_at || item?.created_at || item?.invited_at)}</td>{control ? <td><div className="hq2RowActions"><button type="button" onClick={() => onControl(item, "grant")}>Grant</button><button type="button" className="danger" onClick={() => onControl(item, "revoke")}>Revoke</button></div></td> : null}</tr>)}</tbody></table></div>;
}

function TesterRoster({ data, query, onOpen, onControl }) {
  const testers = arr(data?.testers);
  const invited = arr(data?.invited_testers);
  const accepted = arr(data?.accepted_testers);
  const active = arr(data?.active_testers);
  const counts = data?.counts || {};
  const filter = (rows) => arr(rows).filter((row) => !query || JSON.stringify(row).toLowerCase().includes(query));
  return <div className="hq2Stack"><section className="hq2Metrics tight"><Metric label="Total testers" value={numberText(counts.total ?? testers.length)} note="All invite and tester records found" icon={Gift} /><Metric label="Invited" value={numberText(counts.invited_not_accepted ?? invited.length)} note="Not accepted yet" icon={UserPlus} state="warn" /><Metric label="Accepted" value={numberText(counts.accepted ?? accepted.length)} note="Tester access created" icon={CheckCircle2} state="good" /><Metric label="Active" value={numberText(counts.active ?? active.length)} note="Seen using the app" icon={Activity} state="good" /></section><section className="hq2Card"><header className="hq2CardHead"><div><UserPlus size={18} /><strong>Invited, not accepted yet</strong></div><span className="hq2Pill warn">{invited.length}</span></header><RecordTable rows={filter(invited)} onOpen={onOpen} onControl={onControl} title="invited testers" control /></section><section className="hq2Card"><header className="hq2CardHead"><div><Gift size={18} /><strong>Accepted / current testers</strong></div><span className="hq2Pill good">{accepted.length || testers.length}</span></header><RecordTable rows={filter(accepted.length ? accepted : testers)} onOpen={onOpen} onControl={onControl} title="accepted testers" control /></section></div>;
}

function TesterForm({ onSaved }) {
  const [form, setForm] = React.useState({ email: "", name: "", business_name: "", plan: "pro", pack: "full_access", days: 90, note: "", send_email: true });
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await apiPost("/api/admin/owner/tester-intake", form);
      setMessage(result.message || "Tester intake saved.");
      setForm((current) => ({ ...current, email: "", name: "", business_name: "", note: "" }));
      await onSaved?.();
    } catch (error) {
      setMessage(error.message || "Tester intake failed.");
    } finally {
      setBusy(false);
    }
  }
  return <form className="hq2Card hq2TesterForm" onSubmit={submit}><header className="hq2CardHead"><div><UserPlus size={18} /><strong>Invite tester</strong></div><span className="hq2Pill warn">90 days default</span></header><p>Add a tester, send the welcome email, and keep them excluded from paid MRR.</p><div className="hq2FormGrid"><label><span>Email</span><input required type="email" value={form.email} onChange={(event) => change("email", event.target.value)} /></label><label><span>Name</span><input value={form.name} onChange={(event) => change("name", event.target.value)} /></label><label><span>Business</span><input value={form.business_name} onChange={(event) => change("business_name", event.target.value)} /></label><label><span>Days</span><input min="1" max="365" type="number" value={form.days} onChange={(event) => change("days", Number(event.target.value || 90))} /></label><label><span>Plan</span><select value={form.plan} onChange={(event) => change("plan", event.target.value)}>{PLAN_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label><span>Pack</span><select value={form.pack} onChange={(event) => change("pack", event.target.value)}>{PACK_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="wide"><span>Note</span><textarea value={form.note} onChange={(event) => change("note", event.target.value)} /></label><label className="hq2Checkbox"><input type="checkbox" checked={form.send_email} onChange={(event) => change("send_email", event.target.checked)} /><span>Send tester welcome email</span></label></div><button type="submit" className="hq2Primary" disabled={busy}>{busy ? "Saving…" : "Grant tester access"}</button>{message ? <div className={`hq2InlineNotice ${tone(message)}`}>{message}</div> : null}</form>;
}

function DetailModal({ item, onClose }) {
  if (!item) return null;
  const rows = Object.entries(item).filter(([key]) => !/password|token|secret|hash/i.test(key)).slice(0, 100);
  return <div className="hq2Modal" role="dialog" aria-modal="true" aria-label="HQ record detail"><section><button type="button" className="hq2ModalClose" onClick={onClose}>×</button><small>Live backend record</small><h2>{nameOf(item)}</h2><p>{emailOf(item) || statusOf(item)}</p><div className="hq2DetailGrid">{rows.map(([key, value]) => <div key={key}><span>{key.replaceAll("_", " ")}</span><strong>{typeof value === "object" ? JSON.stringify(value).slice(0, 800) : String(value ?? "")}</strong></div>)}</div></section></div>;
}

export default function PaidLaunchHQSystem() {
  const [tab, setTab] = React.useState("Command");
  const [query, setQuery] = React.useState("");
  const [state, setState] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [notice, setNotice] = React.useState("");
  const [selected, setSelected] = React.useState(null);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const entries = Object.entries(ENDPOINTS);
    const results = await Promise.allSettled(entries.map(([, path]) => apiGet(path)));
    const loadedAt = new Date().toISOString();
    setState((current) => {
      const next = { ...current };
      results.forEach((result, index) => {
        const [key, path] = entries[index];
        next[key] = result.status === "fulfilled" ? { status: "loaded", path, data: result.value, loadedAt, error: "" } : { status: "error", path, data: null, loadedAt, error: result.reason?.message || "Request failed" };
      });
      return next;
    });
    if (!silent) setLoading(false);
  }, []);

  React.useEffect(() => { load(false); }, [load]);
  React.useEffect(() => { const timer = window.setInterval(() => load(true), 30000); return () => window.clearInterval(timer); }, [load]);

  const launch = state.launch?.data || null;
  const overview = state.overview?.data || null;
  const growth = state.growth?.data || null;
  const connection = state.connection?.data || null;
  const control = state.control?.data || null;
  const retention = state.retention?.data || null;
  const testers = state.testers?.data || null;
  const users = arr(overview?.lists?.all_users);
  const businesses = arr(overview?.lists?.businesses);
  const events = [...arr(overview?.lists?.events), ...arr(control?.items)];
  const launchCounts = launch?.counts || {};
  const billing = launch?.billing || {};
  const collectionCounts = launch?.collections?.counts || {};
  const growthCounts = growth?.counts || {};
  const errors = Object.entries(state).filter(([, entry]) => entry?.status === "error");
  const q = low(query);
  const filterRows = (rows) => arr(rows).filter((row) => !q || JSON.stringify(row).toLowerCase().includes(q));
  const launchReady = launch?.ready_to_take_payments;
  const actualMrr = billing?.actual_mrr_nzd;
  const estimatedMrr = billing?.estimated_mrr_nzd;

  const exportRows = tab === "Billing" ? [...arr(billing?.verified_paid_users), ...arr(billing?.verified_trial_users), ...arr(billing?.needs_verification)] : tab === "Businesses" ? businesses : tab === "Activity" ? events : tab === "Testers" ? arr(testers?.testers) : users;

  async function controlUser(user, action) {
    const email = emailOf(user);
    if (OWNER_EMAILS.has(email)) {
      setNotice("Platform owner accounts are protected and cannot be changed from HQ.");
      return;
    }
    setNotice(action === "revoke" ? "Revoking access…" : "Granting access…");
    try {
      const result = await apiPost("/api/admin/owner/control-access", { identifier: email || idOf(user), action, plan: action === "revoke" ? user?.plan : "pro", pack: "full_access", days: 90, note: `${action === "revoke" ? "Revoked" : "Granted"} from paid-launch HQ` });
      setNotice(result.message || "Access updated.");
      await load(true);
    } catch (error) {
      setNotice(error.message || "Access update failed.");
    }
  }

  return <main className="hq2" data-version="CHURVOX_HQ_SYSTEM_HIGH_CONTRAST_20260712"><DetailModal item={selected} onClose={() => setSelected(null)} /><aside className="hq2Side"><section className="hq2Brand"><div><ShieldCheck size={26} /></div><small>Platform owner only</small><h1>Churvox HQ</h1><p>Paid launch control centre for real users, billing proof, testers, live collections and platform data controls.</p><button type="button" onClick={logout}><LogOut size={16} />Log out</button></section><nav>{TABS.map((item) => <button type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}{item === "Launch" && launchReady === false ? <em>!</em> : null}</button>)}</nav><section className="hq2Pulse"><small>Live source</small><div><span>Database</span><strong>{connection?.database_connected === true ? "Connected" : connection?.database_connected === false ? "Unavailable" : "Checking"}</strong></div><div><span>Stripe</span><strong>{billing?.stripe?.available === true ? "Confirmed" : billing?.stripe?.available === false ? "Check" : "Checking"}</strong></div><div><span>Refresh</span><strong>30 sec</strong></div></section></aside><section className="hq2Main"><header className="hq2Hero"><div><span><ShieldCheck size={15} /> Real launch control</span><h2>{tab}</h2><p>{tab === "Command" ? "A high-contrast owner console showing what is safe to sell, what needs attention, and what data is live." : "Live backend responses, truthful empty states, and no demo number substitution."}</p></div><div className="hq2HeroActions"><button type="button" onClick={() => { if (!downloadCsv(`churvox-${tab.toLowerCase().replaceAll(" ", "-")}.csv`, exportRows)) setNotice("No loaded rows are available to export from this tab."); }}><Download size={16} />Export</button><button type="button" className="primary" onClick={() => load(false)}><RefreshCw size={16} className={loading ? "spin" : ""} />Refresh</button></div></header>{notice ? <div className={`hq2Notice ${tone(notice)}`}>{notice}</div> : null}{errors.length ? <div className="hq2Notice bad"><AlertTriangle size={18} />{errors.length} HQ endpoint{errors.length === 1 ? "" : "s"} failed. Check System for exact errors.</div> : null}{!["Command", "Launch", "System", "Data"].includes(tab) ? <label className="hq2Search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search loaded live records…" /></label> : null}

    {tab === "Command" ? <div className="hq2Stack"><section className="hq2Metrics"><Metric label="Launch state" value={launchReady === true ? "Confirmed" : launchReady === false ? "Check" : "Unknown"} note="Database, Stripe and billing truth gates" icon={ShieldCheck} state={launchReady === true ? "good" : "bad"} /><Metric label="Verified paid" value={numberText(launchCounts.verified_paid_users)} note="Stripe subscription proof required" icon={CreditCard} state="good" /><Metric label="Stripe MRR" value={money(actualMrr)} note="Actual recurring price items only" icon={CreditCard} state={hasValue(actualMrr) ? "good" : "warn"} /><Metric label="Needs check" value={numberText(launchCounts.billing_needs_verification)} note="Never counted as paid" icon={AlertTriangle} state={Number(launchCounts.billing_needs_verification || 0) ? "warn" : "good"} /><Metric label="Users" value={numberText(launchCounts.users_total)} note={`${numberText(launchCounts.internal_users_excluded)} internal excluded`} icon={Users} /><Metric label="Businesses" value={numberText(launchCounts.businesses_total)} note={text(launchCounts.businesses_source, "Source unavailable")} icon={Building2} /><Metric label="Testers" value={numberText(testers?.counts?.total ?? launchCounts.tester_users)} note={`${numberText(testers?.counts?.invited_not_accepted)} invited not accepted`} icon={Gift} /><Metric label="Visits" value={numberText(growthCounts.unique_total)} note={`${numberText(growthCounts.new_unique_today)} new today`} icon={Activity} /></section><section className="hq2Card"><header className="hq2CardHead"><div><ShieldCheck size={18} /><strong>Launch gate</strong></div><span className={`hq2Pill ${launchReady === true ? "good" : "bad"}`}>{launchReady === true ? "confirmed" : "check"}</span></header><LaunchChecks checks={launch?.launch_checks} /></section></div> : null}

    {tab === "Launch" ? <div className="hq2Stack"><section className="hq2Metrics tight"><Metric label="Verified paid" value={numberText(launchCounts.verified_paid_users)} note="Active/paid with Stripe proof" icon={CreditCard} state="good" /><Metric label="Verified trials" value={numberText(launchCounts.verified_trial_users)} note="Trialing with Stripe proof" icon={Activity} /><Metric label="Actual MRR" value={money(actualMrr)} note="Not replaced by estimates" icon={CreditCard} state={hasValue(actualMrr) ? "good" : "warn"} /><Metric label="Estimated MRR" value={money(estimatedMrr)} note="Separated from confirmed MRR" icon={Database} /></section><section className="hq2Card"><header className="hq2CardHead"><div><ShieldCheck size={18} /><strong>Paid-launch checks</strong></div></header><LaunchChecks checks={launch?.launch_checks} /></section><section className="hq2Card"><header className="hq2CardHead"><div><CreditCard size={18} /><strong>Verified paid subscriptions</strong></div><span className="hq2Pill good">Stripe proof required</span></header><RecordTable rows={filterRows(billing?.verified_paid_users)} onOpen={setSelected} onControl={controlUser} title="paid subscriptions" /></section><section className="hq2Card"><header className="hq2CardHead"><div><AlertTriangle size={18} /><strong>Billing records needing verification</strong></div><span className="hq2Pill warn">not counted as paid</span></header><RecordTable rows={filterRows(billing?.needs_verification)} onOpen={setSelected} onControl={controlUser} title="unverified billing" /></section></div> : null}

    {tab === "Users" ? <section className="hq2Card hq2Stack"><header className="hq2CardHead"><div><Users size={18} /><strong>All loaded user records</strong></div><span className="hq2Pill">{users.length}</span></header><RecordTable rows={filterRows(users)} onOpen={setSelected} onControl={controlUser} title="users" control /></section> : null}

    {tab === "Billing" ? <div className="hq2Stack"><section className="hq2Card"><header className="hq2CardHead"><div><CreditCard size={18} /><strong>Verified paid</strong></div></header><RecordTable rows={filterRows(billing?.verified_paid_users)} onOpen={setSelected} onControl={controlUser} title="verified paid" /></section><section className="hq2Card"><header className="hq2CardHead"><div><Activity size={18} /><strong>Verified trials</strong></div></header><RecordTable rows={filterRows(billing?.verified_trial_users)} onOpen={setSelected} onControl={controlUser} title="verified trials" /></section><section className="hq2Card"><header className="hq2CardHead"><div><AlertTriangle size={18} /><strong>Needs Stripe verification</strong></div></header><RecordTable rows={filterRows(billing?.needs_verification)} onOpen={setSelected} onControl={controlUser} title="records needing verification" /></section></div> : null}

    {tab === "Testers" ? <div className="hq2Stack"><TesterForm onSaved={() => load(true)} /><TesterRoster data={testers} query={q} onOpen={setSelected} onControl={controlUser} /></div> : null}

    {tab === "Businesses" ? <section className="hq2Card"><header className="hq2CardHead"><div><Building2 size={18} /><strong>Businesses returned by owner overview</strong></div><span className="hq2Pill">{businesses.length}</span></header><RecordTable rows={filterRows(businesses)} onOpen={setSelected} onControl={controlUser} title="businesses" /></section> : null}

    {tab === "Activity" ? <section className="hq2Activity">{filterRows(events).map((item, index) => <button type="button" key={idOf(item, index)} onClick={() => setSelected(item)}><strong>{nameOf(item)}</strong><span>{text(item?.meta || item?.action || item?.kind || item?.status, "Live event")}</span><small>{dateText(item?.at || item?.created_at || item?.updated_at)}</small></button>)}{!filterRows(events).length ? <Empty title="No activity returned" /> : null}</section> : null}

    {tab === "System" ? <div className="hq2Stack"><section className="hq2Card"><header className="hq2CardHead"><div><Database size={18} /><strong>Live endpoint status</strong></div></header><div className="hq2EndpointGrid">{Object.entries(ENDPOINTS).map(([key, path]) => <EndpointStatus key={key} name={key} entry={{ path, ...(state[key] || {}) }} />)}</div></section><section className="hq2Card"><header className="hq2CardHead"><div><Database size={18} /><strong>Database collection counts</strong></div><span className={`hq2Pill ${launch?.collections?.connected ? "good" : "bad"}`}>{launch?.collections?.connected ? "connected" : "unavailable"}</span></header><div className="hq2CollectionGrid">{Object.entries(collectionCounts).map(([key, value]) => <article key={key}><span>{key.replaceAll("_", " ")}</span><strong>{numberText(value)}</strong></article>)}</div></section><section className="hq2Two"><article className="hq2Card"><header className="hq2CardHead"><div><Activity size={18} /><strong>Latest backend records</strong></div></header><dl className="hq2Facts"><div><dt>Stripe webhook</dt><dd>{dateText(launch?.collections?.latest?.stripe_webhook?.created_at)}</dd></div><div><dt>Support message</dt><dd>{dateText(launch?.collections?.latest?.support_message?.created_at)}</dd></div><div><dt>Lifecycle email</dt><dd>{dateText(launch?.collections?.latest?.lifecycle_email?.created_at)}</dd></div></dl></article><article className="hq2Card"><header className="hq2CardHead"><div><ShieldCheck size={18} /><strong>Service state</strong></div></header><dl className="hq2Facts"><div><dt>Database</dt><dd>{connection?.database_connected === true ? "Connected" : "Unavailable"}</dd></div><div><dt>Collections visible</dt><dd>{numberText(connection?.collections_seen?.length)}</dd></div><div><dt>Retention engine</dt><dd>{retention?.success === true ? "Loaded" : "Unavailable"}</dd></div></dl></article></section></div> : null}

    {tab === "Data" ? <div className="hq2Stack"><section className="hq2Card"><header className="hq2CardHead"><div><ShieldCheck size={18} /><strong>Data-control rules</strong></div></header><p>Exports use only records loaded from owner endpoints. Deletion stays deliberate and separated below. Nothing here creates sample customers, jobs, invoices or payments.</p></section><RemoveCustomerDataCard /></div> : null}
  </section></main>;
}
