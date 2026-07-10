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
import "./PaidLaunchHQ.css";

const ENDPOINTS = {
  launch: "/api/admin/owner/paid-launch-report",
  overview: "/api/admin/owner-overview",
  growth: "/api/admin/owner/growth-report",
  connection: "/api/admin/owner/connection",
  plans: "/api/admin/owner/plan-report",
  control: "/api/admin/owner/control-log",
  retention: "/api/admin/owner/retention-email-status",
};

const TABS = ["Overview", "Paid launch", "Users", "Billing", "Testers", "Businesses", "Activity", "System", "Data"];
const OWNER_EMAILS = new Set(["hello@churvox.com", "howardjennings77@gmail.com", "howardjennings777@gmail.com"]);
const PLAN_OPTIONS = [["solo", "Start"], ["team", "Crew"], ["pro", "Operator"], ["enterprise", "Command"]];
const PACK_OPTIONS = [["full_access", "Full tester access"], ["operator_pack", "Operator free pack"], ["command_pack", "Command free pack"], ["command_growth_pack", "Command Growth Pack"], ["accounting_sync", "Accounting Sync Add-on"]];

const arr = (value) => (Array.isArray(value) ? value : []);
const text = (value, fallback = "") => String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
const low = (value) => text(value).toLowerCase();
const hasValue = (value) => value !== null && value !== undefined && value !== "";
const numberText = (value) => (hasValue(value) ? Number(value).toLocaleString("en-NZ") : "Unavailable");
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
  if (!response.ok || body?.success === false || body?.ok === false) {
    throw new Error(body?.detail || body?.message || body?.error || `Request failed ${response.status}`);
  }
  return body;
}

async function apiPost(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(payload || {}),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false || body?.ok === false) {
    throw new Error(body?.detail || body?.message || body?.error || `Request failed ${response.status}`);
  }
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

function idOf(item, index = 0) {
  return text(item?.id || item?._id || item?.stripe_subscription_id || item?.email || item?.visitor_key || item?.created_at, `row-${index}`);
}

function emailOf(item) {
  return low(item?.email || item?.user_email || item?.owner_email);
}

function nameOf(item) {
  return text(item?.business_name || item?.company || item?.name || item?.full_name || item?.email || item?.title || item?.path, "Unnamed record");
}

function statusOf(item) {
  return text(item?.subscription_status || item?.billing_status || item?.stripe_status || item?.status, "Unknown");
}

function planOf(item) {
  const value = low(item?.plan_name || item?.plan || item?.subscription_plan || item?.tier);
  const labels = { start: "Start", solo: "Start", crew: "Crew", team: "Crew", operator: "Operator", pro: "Operator", command: "Command", enterprise: "Command" };
  return labels[value] || (value ? value.charAt(0).toUpperCase() + value.slice(1) : "No plan");
}

function tone(value) {
  const valueText = low(value);
  if (/pass|ready|connected|verified|active|paid|online|clear|loaded|configured/.test(valueText)) return "good";
  if (/fail|blocked|error|unavailable|past_due|unpaid|cancel|locked/.test(valueText)) return "bad";
  return "warn";
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

function downloadCsv(filename, rows) {
  const source = arr(rows);
  if (!source.length) return false;
  const keys = Array.from(new Set(source.flatMap((row) => Object.keys(row || {})))).slice(0, 80);
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

function Metric({ label, value, note, icon: Icon, state = "neutral" }) {
  return (
    <article className={`plhqMetric ${state}`}>
      <header><span>{label}</span>{Icon ? <Icon size={18} /> : null}</header>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function Empty({ title = "No records returned", text: detail = "The live endpoint returned an empty list." }) {
  return <div className="plhqEmpty"><CheckCircle2 size={22} /><div><strong>{title}</strong><p>{detail}</p></div></div>;
}

function EndpointStatus({ name, entry }) {
  const state = entry?.status || "waiting";
  return (
    <article className={`plhqEndpoint ${tone(state)}`}>
      <div>{state === "loaded" ? <CheckCircle2 size={17} /> : state === "error" ? <XCircle size={17} /> : <RefreshCw size={17} />}</div>
      <section><strong>{name}</strong><span>{entry?.path}</span><small>{state === "loaded" ? `Loaded ${dateText(entry.loadedAt)}` : entry?.error || "Waiting for live response"}</small></section>
    </article>
  );
}

function LaunchChecks({ checks }) {
  const rows = arr(checks);
  if (!rows.length) return <Empty title="Launch checks unavailable" text="The paid-launch report did not return launch checks." />;
  return <div className="plhqCheckGrid">{rows.map((item) => (
    <article key={item.key || item.label} className={tone(item.status)}>
      <span>{item.status === "pass" ? <CheckCircle2 size={18} /> : item.status === "fail" ? <XCircle size={18} /> : <AlertTriangle size={18} />}</span>
      <div><strong>{item.label}</strong><p>{item.detail}</p></div>
      <em>{item.status}</em>
    </article>
  ))}</div>;
}

function UserTable({ rows, onOpen, onControl, control = false }) {
  const source = arr(rows);
  if (!source.length) return <Empty />;
  return (
    <div className="plhqTableWrap"><table><thead><tr><th>User / business</th><th>Plan</th><th>Status</th><th>Stripe proof</th><th>Last activity</th>{control ? <th>Control</th> : null}</tr></thead>
      <tbody>{source.map((item, index) => (
        <tr key={idOf(item, index)}>
          <td><button type="button" className="plhqRecordButton" onClick={() => onOpen(item)}><strong>{nameOf(item)}</strong><span>{emailOf(item) || "No email returned"}</span></button></td>
          <td>{planOf(item)}</td>
          <td><span className={`plhqPill ${tone(statusOf(item))}`}>{statusOf(item)}</span></td>
          <td>{text(item?.stripe_subscription_id, "Not verified")}</td>
          <td>{ageText(item?.last_active || item?.last_login_at || item?.last_login || item?.updated_at || item?.created_at)}</td>
          {control ? <td><div className="plhqRowActions"><button type="button" onClick={() => onControl(item, "grant")}>Grant</button><button type="button" className="danger" onClick={() => onControl(item, "revoke")}>Revoke</button></div></td> : null}
        </tr>
      ))}</tbody>
    </table></div>
  );
}

function DetailModal({ item, onClose }) {
  if (!item) return null;
  const rows = Object.entries(item).filter(([key]) => !/password|token|secret|hash/i.test(key)).slice(0, 80);
  return (
    <div className="plhqModal" role="dialog" aria-modal="true" aria-label="HQ record detail">
      <section><button type="button" className="plhqModalClose" onClick={onClose}>×</button><small>Live backend record</small><h2>{nameOf(item)}</h2><p>{emailOf(item) || statusOf(item)}</p>
        <div className="plhqDetailGrid">{rows.map(([key, value]) => <div key={key}><span>{key.replaceAll("_", " ")}</span><strong>{typeof value === "object" ? JSON.stringify(value).slice(0, 600) : String(value ?? "")}</strong></div>)}</div>
      </section>
    </div>
  );
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
  return (
    <form className="plhqCard plhqTesterForm" onSubmit={submit}>
      <header className="plhqCardHead"><div><UserPlus size={18} /><strong>Real tester intake</strong></div><span className="plhqPill warn">90 days default</span></header>
      <p>This writes through the owner backend. Testers remain separate from verified paid subscriptions and Stripe MRR.</p>
      <div className="plhqFormGrid">
        <label><span>Email</span><input required type="email" value={form.email} onChange={(event) => change("email", event.target.value)} /></label>
        <label><span>Name</span><input value={form.name} onChange={(event) => change("name", event.target.value)} /></label>
        <label><span>Business</span><input value={form.business_name} onChange={(event) => change("business_name", event.target.value)} /></label>
        <label><span>Days</span><input min="1" max="365" type="number" value={form.days} onChange={(event) => change("days", Number(event.target.value || 90))} /></label>
        <label><span>Plan</span><select value={form.plan} onChange={(event) => change("plan", event.target.value)}>{PLAN_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>Pack</span><select value={form.pack} onChange={(event) => change("pack", event.target.value)}>{PACK_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="wide"><span>Note</span><textarea value={form.note} onChange={(event) => change("note", event.target.value)} /></label>
        <label className="plhqCheckbox"><input type="checkbox" checked={form.send_email} onChange={(event) => change("send_email", event.target.checked)} /><span>Send tester welcome email</span></label>
      </div>
      <button type="submit" className="plhqPrimary" disabled={busy}>{busy ? "Saving…" : "Grant tester access"}</button>
      {message ? <div className={`plhqInlineNotice ${tone(message)}`}>{message}</div> : null}
    </form>
  );
}

export default function PaidLaunchHQ() {
  const [tab, setTab] = React.useState("Overview");
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
        next[key] = result.status === "fulfilled"
          ? { status: "loaded", path, data: result.value, loadedAt, error: "" }
          : { status: "error", path, data: null, loadedAt, error: result.reason?.message || "Request failed" };
      });
      return next;
    });
    if (!silent) setLoading(false);
  }, []);

  React.useEffect(() => { load(false); }, [load]);
  React.useEffect(() => {
    const timer = window.setInterval(() => load(true), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const launch = state.launch?.data || null;
  const overview = state.overview?.data || null;
  const growth = state.growth?.data || null;
  const connection = state.connection?.data || null;
  const control = state.control?.data || null;
  const retention = state.retention?.data || null;
  const users = arr(overview?.lists?.all_users);
  const businesses = arr(overview?.lists?.businesses);
  const events = [...arr(overview?.lists?.events), ...arr(control?.items)];
  const launchCounts = launch?.counts || {};
  const billing = launch?.billing || {};
  const collectionCounts = launch?.collections?.counts || {};
  const growthCounts = growth?.counts || {};
  const errors = Object.entries(state).filter(([, entry]) => entry?.status === "error");
  const normalizedQuery = low(query);
  const filterRows = (rows) => arr(rows).filter((row) => !normalizedQuery || JSON.stringify(row).toLowerCase().includes(normalizedQuery));

  async function controlUser(user, action) {
    const email = emailOf(user);
    if (OWNER_EMAILS.has(email)) {
      setNotice("Platform owner accounts are protected and cannot be revoked from HQ.");
      return;
    }
    setNotice(action === "revoke" ? "Revoking access…" : "Granting access…");
    try {
      const result = await apiPost("/api/admin/owner/control-access", {
        identifier: email || idOf(user),
        action,
        plan: action === "revoke" ? user?.plan : "pro",
        pack: "full_access",
        days: 90,
        note: `${action === "revoke" ? "Revoked" : "Granted"} from paid-launch HQ`,
      });
      setNotice(result.message || "Access updated.");
      await load(true);
    } catch (error) {
      setNotice(error.message || "Access update failed.");
    }
  }

  const actualMrr = billing?.actual_mrr_nzd;
  const estimatedMrr = billing?.estimated_mrr_nzd;
  const launchReady = launch?.ready_to_take_payments;
  const exportRows = tab === "Billing"
    ? [...arr(billing?.verified_paid_users), ...arr(billing?.verified_trial_users), ...arr(billing?.needs_verification)]
    : tab === "Businesses" ? businesses
      : tab === "Activity" ? events
        : tab === "Testers" ? arr(billing?.tester_users)
          : users;

  return (
    <main className="plhq" data-version="CHURVOX_REAL_PAID_LAUNCH_HQ_20260711">
      <DetailModal item={selected} onClose={() => setSelected(null)} />
      <aside className="plhqSide">
        <section className="plhqBrand"><div><ShieldCheck size={26} /></div><small>Platform owner only</small><h1>Churvox HQ</h1><p>Real users, verified billing, live collections and launch health. No demo records and no silent number substitution.</p><button type="button" onClick={logout}><LogOut size={16} />Log out</button></section>
        <nav>{TABS.map((item) => <button type="button" className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}{item === "Paid launch" && launchReady === false ? <em>!</em> : null}</button>)}</nav>
        <section className="plhqPulse"><small>Live source</small><div><span>Database</span><strong>{connection?.database_connected === true ? "Connected" : connection?.database_connected === false ? "Unavailable" : "Checking"}</strong></div><div><span>Stripe</span><strong>{billing?.stripe?.available === true ? "Confirmed" : billing?.stripe?.available === false ? "Check" : "Checking"}</strong></div><div><span>Refresh</span><strong>30 sec</strong></div></section>
      </aside>

      <section className="plhqMain">
        <header className="plhqHero"><div><span><ShieldCheck size={15} /> Real paid-launch control</span><h2>{tab}</h2><p>{tab === "Paid launch" ? "Payment readiness uses the database and Stripe subscription API. Estimates stay separate from confirmed MRR." : "HQ displays live backend responses, exact source states and truthful empty or unavailable results."}</p></div><div className="plhqHeroActions"><button type="button" onClick={() => { if (!downloadCsv(`churvox-${tab.toLowerCase().replaceAll(" ", "-")}.csv`, exportRows)) setNotice("No loaded rows are available to export from this tab."); }}><Download size={16} />Export loaded rows</button><button type="button" className="primary" onClick={() => load(false)}><RefreshCw size={16} className={loading ? "spin" : ""} />Refresh</button></div></header>

        {notice ? <div className={`plhqNotice ${tone(notice)}`}>{notice}</div> : null}
        {errors.length ? <div className="plhqNotice bad"><AlertTriangle size={18} />{errors.length} live HQ endpoint{errors.length === 1 ? "" : "s"} failed. System shows the exact errors.</div> : null}

        {!['Overview', 'Paid launch', 'System', 'Data'].includes(tab) ? <label className="plhqSearch"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search loaded live records…" /></label> : null}

        {tab === "Overview" ? <div className="plhqStack">
          <section className="plhqMetrics">
            <Metric label="Launch state" value={launchReady === true ? "Confirmed" : launchReady === false ? "Check required" : "Unavailable"} note="Database, Stripe and billing-truth gates" icon={ShieldCheck} state={launchReady === true ? "good" : "bad"} />
            <Metric label="Verified paid" value={numberText(launchCounts.verified_paid_users)} note="Active/paid with Stripe subscription ID" icon={CreditCard} state="good" />
            <Metric label="Actual Stripe MRR" value={money(actualMrr)} note={hasValue(actualMrr) ? "Confirmed by Stripe subscription items" : "Not replaced by an estimate"} icon={CreditCard} state={hasValue(actualMrr) ? "good" : "warn"} />
            <Metric label="Businesses" value={numberText(launchCounts.businesses_total)} note={text(launchCounts.businesses_source, "Source unavailable")} icon={Building2} />
            <Metric label="Users" value={numberText(launchCounts.users_total)} note={`${numberText(launchCounts.internal_users_excluded)} internal records excluded`} icon={Users} />
            <Metric label="Active today" value={numberText(launchCounts.active_today)} note={`${numberText(launchCounts.active_30d)} active in 30 days`} icon={Activity} />
            <Metric label="Unique public visits" value={numberText(growthCounts.unique_total)} note={`${numberText(growthCounts.new_unique_today)} new today`} icon={Eye} />
            <Metric label="Needs verification" value={numberText(launchCounts.billing_needs_verification)} note="Active/trial status without Stripe subscription proof" icon={AlertTriangle} state={Number(launchCounts.billing_needs_verification || 0) ? "warn" : "good"} />
          </section>
          <section className="plhqCard"><header className="plhqCardHead"><div><ShieldCheck size={18} /><strong>Paid-launch checks</strong></div><span className={`plhqPill ${launchReady === true ? "good" : "bad"}`}>{launchReady === true ? "confirmed" : "check"}</span></header><LaunchChecks checks={launch?.launch_checks} /></section>
          <section className="plhqTwo"><article className="plhqCard"><header className="plhqCardHead"><div><Database size={18} /><strong>Data provenance</strong></div></header><dl className="plhqFacts"><div><dt>Report source</dt><dd>{text(launch?.source, "Unavailable")}</dd></div><div><dt>Generated</dt><dd>{dateText(launch?.generated_at)}</dd></div><div><dt>Paid definition</dt><dd>{text(launch?.truth?.paid_definition, "Unavailable")}</dd></div><div><dt>MRR source</dt><dd>{text(launch?.truth?.mrr_source, "Unavailable")}</dd></div><div><dt>Sample records</dt><dd>{launch?.truth?.sample_records_included === false ? "Excluded" : "Unconfirmed"}</dd></div></dl></article><article className="plhqCard"><header className="plhqCardHead"><div><CreditCard size={18} /><strong>Billing truth</strong></div></header><dl className="plhqFacts"><div><dt>Verified trials</dt><dd>{numberText(launchCounts.verified_trial_users)}</dd></div><div><dt>Free testers</dt><dd>{numberText(launchCounts.tester_users)}</dd></div><div><dt>Estimated MRR</dt><dd>{money(estimatedMrr)} <small>separate estimate</small></dd></div><div><dt>Stripe subscriptions checked</dt><dd>{numberText(billing?.stripe?.subscriptions_checked)}</dd></div></dl></article></section>
        </div> : null}

        {tab === "Paid launch" ? <div className="plhqStack">
          <section className="plhqMetrics">
            <Metric label="Verified paid" value={numberText(launchCounts.verified_paid_users)} note="Counted only with Stripe subscription ID" icon={CreditCard} state="good" />
            <Metric label="Verified trials" value={numberText(launchCounts.verified_trial_users)} note="Trialing with Stripe subscription ID" icon={Activity} />
            <Metric label="Stripe MRR NZD" value={money(actualMrr)} note="Actual recurring price items; no FX guessing" icon={CreditCard} state={hasValue(actualMrr) ? "good" : "warn"} />
            <Metric label="Unverified billing" value={numberText(launchCounts.billing_needs_verification)} note="Never counted as verified paid" icon={AlertTriangle} state={Number(launchCounts.billing_needs_verification || 0) ? "warn" : "good"} />
          </section>
          <section className="plhqCard"><header className="plhqCardHead"><div><ShieldCheck size={18} /><strong>Launch gate</strong></div></header><LaunchChecks checks={launch?.launch_checks} /></section>
          <section className="plhqCard"><header className="plhqCardHead"><div><CreditCard size={18} /><strong>Verified paid subscriptions</strong></div><span className="plhqPill good">Stripe proof required</span></header><UserTable rows={filterRows(billing?.verified_paid_users)} onOpen={setSelected} onControl={controlUser} /></section>
          <section className="plhqCard"><header className="plhqCardHead"><div><AlertTriangle size={18} /><strong>Billing records needing verification</strong></div><span className="plhqPill warn">not counted as paid</span></header><UserTable rows={filterRows(billing?.needs_verification)} onOpen={setSelected} onControl={controlUser} /></section>
        </div> : null}

        {tab === "Users" ? <section className="plhqCard"><header className="plhqCardHead"><div><Users size={18} /><strong>All loaded user records</strong></div><span className="plhqPill">{users.length}</span></header><UserTable rows={filterRows(users)} onOpen={setSelected} onControl={controlUser} control /></section> : null}

        {tab === "Billing" ? <div className="plhqStack"><section className="plhqCard"><header className="plhqCardHead"><div><CreditCard size={18} /><strong>Verified paid</strong></div></header><UserTable rows={filterRows(billing?.verified_paid_users)} onOpen={setSelected} onControl={controlUser} /></section><section className="plhqCard"><header className="plhqCardHead"><div><Activity size={18} /><strong>Verified trials</strong></div></header><UserTable rows={filterRows(billing?.verified_trial_users)} onOpen={setSelected} onControl={controlUser} /></section><section className="plhqCard"><header className="plhqCardHead"><div><AlertTriangle size={18} /><strong>Needs Stripe verification</strong></div></header><UserTable rows={filterRows(billing?.needs_verification)} onOpen={setSelected} onControl={controlUser} /></section></div> : null}

        {tab === "Testers" ? <div className="plhqStack"><TesterForm onSaved={() => load(true)} /><section className="plhqCard"><header className="plhqCardHead"><div><Gift size={18} /><strong>Current tester access</strong></div><span className="plhqPill warn">excluded from paid MRR</span></header><UserTable rows={filterRows(billing?.tester_users)} onOpen={setSelected} onControl={controlUser} control /></section></div> : null}

        {tab === "Businesses" ? <section className="plhqCard"><header className="plhqCardHead"><div><Building2 size={18} /><strong>Businesses returned by owner overview</strong></div><span className="plhqPill">{businesses.length}</span></header><UserTable rows={filterRows(businesses)} onOpen={setSelected} onControl={controlUser} /></section> : null}

        {tab === "Activity" ? <section className="plhqActivity">{filterRows(events).map((item, index) => <button type="button" key={idOf(item, index)} onClick={() => setSelected(item)}><strong>{nameOf(item)}</strong><span>{text(item?.meta || item?.action || item?.kind || item?.status, "Live event")}</span><small>{dateText(item?.at || item?.created_at || item?.updated_at)}</small></button>)}{!filterRows(events).length ? <Empty title="No activity returned" /> : null}</section> : null}

        {tab === "System" ? <div className="plhqStack"><section className="plhqCard"><header className="plhqCardHead"><div><Database size={18} /><strong>Live endpoint status</strong></div></header><div className="plhqEndpointGrid">{Object.entries(ENDPOINTS).map(([key, path]) => <EndpointStatus key={key} name={key} entry={{ path, ...(state[key] || {}) }} />)}</div></section><section className="plhqCard"><header className="plhqCardHead"><div><Database size={18} /><strong>Database collection counts</strong></div><span className={`plhqPill ${launch?.collections?.connected ? "good" : "bad"}`}>{launch?.collections?.connected ? "connected" : "unavailable"}</span></header><div className="plhqCollectionGrid">{Object.entries(collectionCounts).map(([key, value]) => <article key={key}><span>{key.replaceAll("_", " ")}</span><strong>{numberText(value)}</strong></article>)}</div></section><section className="plhqTwo"><article className="plhqCard"><header className="plhqCardHead"><div><Activity size={18} /><strong>Latest backend records</strong></div></header><dl className="plhqFacts"><div><dt>Stripe webhook</dt><dd>{dateText(launch?.collections?.latest?.stripe_webhook?.created_at)}</dd></div><div><dt>Support message</dt><dd>{dateText(launch?.collections?.latest?.support_message?.created_at)}</dd></div><div><dt>Lifecycle email</dt><dd>{dateText(launch?.collections?.latest?.lifecycle_email?.created_at)}</dd></div></dl></article><article className="plhqCard"><header className="plhqCardHead"><div><ShieldCheck size={18} /><strong>Service state</strong></div></header><dl className="plhqFacts"><div><dt>Database</dt><dd>{connection?.database_connected === true ? "Connected" : "Unavailable"}</dd></div><div><dt>Collections visible</dt><dd>{numberText(connection?.collections_seen?.length)}</dd></div><div><dt>Retention engine</dt><dd>{retention?.success === true ? "Loaded" : "Unavailable"}</dd></div></dl></article></section></div> : null}

        {tab === "Data" ? <div className="plhqStack"><section className="plhqCard"><header className="plhqCardHead"><div><ShieldCheck size={18} /><strong>Data-control rules</strong></div></header><p>Exports use only records loaded from owner endpoints. Deletion stays deliberate and separated below. Nothing on this screen creates sample customers, jobs, invoices or payments.</p></section><RemoveCustomerDataCard /></div> : null}
      </section>
    </main>
  );
}
