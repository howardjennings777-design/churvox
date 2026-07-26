import React from "react";
import {
  Activity,
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CreditCard,
  Database,
  ExternalLink,
  Gift,
  Globe2,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import API_BASE from "../lib/apiBase";
import "./ChurvoxHQPage.css";

export const CHURVOX_HQ_BUILD = "churvox-hq-one-console-20260727";

if (typeof window !== "undefined") {
  window.__CHURVOX_HQ_BUILD__ = CHURVOX_HQ_BUILD;
}

const ENDPOINTS = Object.freeze([
  { key: "overview", label: "Platform overview", path: "/api/admin/owner-overview" },
  { key: "launch", label: "Billing and launch", path: "/api/admin/owner/paid-launch-report" },
  { key: "growth", label: "Visitors and growth", path: "/api/admin/owner/growth-report" },
  { key: "testers", label: "Tester programme", path: "/api/admin/owner/testers" },
  { key: "plans", label: "Plan report", path: "/api/admin/owner/plan-report" },
  { key: "control", label: "Control log", path: "/api/admin/owner/control-log" },
  { key: "connection", label: "Backend connection", path: "/api/admin/owner/connection" },
  { key: "retention", label: "Retention email engine", path: "/api/admin/owner/retention-email-status" },
]);

const TABS = Object.freeze([
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "users", label: "Users", icon: Users },
  { key: "businesses", label: "Businesses", icon: Building2 },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "testers", label: "Testers", icon: Gift },
  { key: "visitors", label: "Visitors", icon: Globe2 },
  { key: "activity", label: "Activity", icon: Activity },
  { key: "system", label: "System", icon: Database },
]);

const arr = (value) => (Array.isArray(value) ? value : []);
const plainObject = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = (value, fallback = "") => {
  if (value === undefined || value === null || typeof value === "object") return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
};
const lower = (value) => text(value).toLowerCase();
const firstArray = (...values) => values.find(Array.isArray) || [];
const firstNumber = (...values) => {
  for (const value of values) {
    if (value === "" || value === null || value === undefined) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

function unwrap(payload) {
  if (!plainObject(payload)) return {};
  let result = { ...payload };
  let cursor = payload;
  for (let index = 0; index < 3; index += 1) {
    const nested = cursor?.data;
    if (!plainObject(nested)) break;
    result = { ...result, ...nested };
    cursor = nested;
  }
  return result;
}

function authHeaders(json = false) {
  let token = "";
  try {
    token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {}
  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiRequest(path, options = {}) {
  const base = String(API_BASE || "").replace(/\/+$/, "");
  const response = await fetch(`${base}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: { ...authHeaders(Boolean(options.body)), ...(options.headers || {}) },
  });
  const raw = await response.json().catch(() => ({}));
  const body = unwrap(raw);
  if (!response.ok || raw?.success === false || raw?.ok === false || body?.success === false || body?.ok === false) {
    throw new Error(text(body?.detail || body?.message || body?.error, `Request failed ${response.status}`));
  }
  return body;
}

function formatNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString("en-NZ") : "—";
}

function formatMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 2 })
    : "—";
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? text(value, "—") : parsed.toLocaleString("en-NZ");
}

function ageText(value) {
  if (!value) return "—";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "—";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function statusTone(value) {
  const current = lower(value);
  if (/active|paid|trialing|accepted|connected|pass|ready|sent|loaded|complete|success/.test(current)) return "good";
  if (/fail|error|locked|revoked|past_due|unpaid|cancel|blocked|expired|unavailable/.test(current)) return "bad";
  return "warn";
}

function emailOf(item = {}) {
  return text(item.email || item.user_email || item.owner_email || item.tester_email || item.target_email || item.to);
}

function nameOf(item = {}) {
  return text(item.business_name || item.company || item.name || item.full_name || item.title || emailOf(item), "Unnamed record");
}

function planOf(item = {}) {
  const value = lower(item.plan_name || item.plan || item.subscription_plan || item.tier);
  const labels = { solo: "Start", start: "Start", team: "Crew", crew: "Crew", pro: "Operator", operator: "Operator", enterprise: "Command", command: "Command" };
  return labels[value] || (value ? value.charAt(0).toUpperCase() + value.slice(1) : "—");
}

function recordStatus(item = {}) {
  return text(item.subscription_status || item.billing_status || item.stripe_status || item.tester_status || item.status, "Unknown");
}

function recordTime(item = {}) {
  return item.last_active || item.last_seen || item.last_login_at || item.last_login || item.updated_at || item.created_at || item.invited_at || item.at;
}

function recordKey(item = {}, index = 0) {
  return text(item.id || item._id || item.stripe_subscription_id || item.visitor_key || emailOf(item) || recordTime(item), `record-${index}`);
}

function dedupeRows(rows = []) {
  const seen = new Set();
  return arr(rows).filter((row, index) => {
    const key = lower(emailOf(row) || recordKey(row, index));
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function metric(label, value, note, icon, tone = "plain") {
  return { label, value, note, icon, tone };
}

function MetricCard({ item }) {
  const Icon = item.icon;
  return (
    <article className={`hqOneMetric ${item.tone || "plain"}`}>
      <header><span>{item.label}</span><Icon size={18} aria-hidden="true" /></header>
      <strong>{item.value}</strong>
      <p>{item.note}</p>
    </article>
  );
}

function EmptyState({ title = "No records returned", detail = "The live backend returned no rows for this section." }) {
  return (
    <div className="hqOneEmpty">
      <CheckCircle2 size={22} aria-hidden="true" />
      <div><strong>{title}</strong><p>{detail}</p></div>
    </div>
  );
}

function DataTable({ rows, query, onOpen, emptyTitle = "No records returned", type = "users" }) {
  const q = lower(query);
  const filtered = arr(rows).filter((row) => !q || JSON.stringify(row).toLowerCase().includes(q));
  if (!filtered.length) return <EmptyState title={emptyTitle} />;
  return (
    <div className="hqOneTableWrap">
      <table>
        <thead>
          <tr>
            <th>{type === "visitors" ? "Visitor / page" : "User / business"}</th>
            <th>{type === "visitors" ? "Source" : "Plan"}</th>
            <th>Status</th>
            <th>Last activity</th>
            <th aria-label="Open record" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((item, index) => (
            <tr key={recordKey(item, index)}>
              <td>
                <strong>{type === "visitors" ? text(item.last_path || item.first_path || item.path, "Website visitor") : nameOf(item)}</strong>
                <span>{type === "visitors" ? text(item.user_email || item.referrer || item.last_referrer || item.visitor_key, "Anonymous visitor") : emailOf(item) || text(item.phone, "No email returned")}</span>
              </td>
              <td>{type === "visitors" ? text(item.last_source || item.source || item.referrer, "Direct") : planOf(item)}</td>
              <td><span className={`hqOnePill ${statusTone(recordStatus(item))}`}>{recordStatus(item)}</span></td>
              <td>{ageText(recordTime(item))}</td>
              <td><button type="button" className="hqOneOpen" onClick={() => onOpen(item)}>Open</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailModal({ item, onClose }) {
  if (!item) return null;
  const rows = Object.entries(item).filter(([key]) => !/password|token|secret|hash/i.test(key)).slice(0, 90);
  return (
    <div className="hqOneModal" role="dialog" aria-modal="true" aria-label="HQ record detail">
      <button type="button" className="hqOneModalBackdrop" aria-label="Close record" onClick={onClose} />
      <section>
        <button type="button" className="hqOneModalClose" onClick={onClose}>×</button>
        <small>Live backend record</small>
        <h2>{nameOf(item)}</h2>
        <p>{emailOf(item) || recordStatus(item)}</p>
        <div className="hqOneDetailGrid">
          {rows.map(([key, value]) => (
            <div key={key}>
              <span>{key.replaceAll("_", " ")}</span>
              <strong>{typeof value === "object" ? JSON.stringify(value).slice(0, 900) : String(value ?? "")}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TesterForm({ onSaved }) {
  const [form, setForm] = React.useState({ email: "", name: "", business_name: "", plan: "pro", pack: "full_access", days: 90, note: "", send_email: true });
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await apiRequest("/api/admin/owner/tester-intake", { method: "POST", body: JSON.stringify(form) });
      setMessage(text(result.message, "Tester access saved."));
      setForm((current) => ({ ...current, email: "", name: "", business_name: "", note: "" }));
      await onSaved?.();
    } catch (error) {
      setMessage(error.message || "Tester access could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="hqOneCard hqOneTesterForm" onSubmit={submit}>
      <header className="hqOneCardHead">
        <div><UserPlus size={18} /><span><strong>Invite a tester</strong><small>Grant real access and optionally send the welcome email.</small></span></div>
        <span className="hqOnePill warn">90 days default</span>
      </header>
      <div className="hqOneFormGrid">
        <label><span>Email</span><input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></label>
        <label><span>Name</span><input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label><span>Business</span><input value={form.business_name} onChange={(event) => update("business_name", event.target.value)} /></label>
        <label><span>Days</span><input type="number" min="1" max="365" value={form.days} onChange={(event) => update("days", Number(event.target.value || 90))} /></label>
        <label><span>Plan</span><select value={form.plan} onChange={(event) => update("plan", event.target.value)}><option value="solo">Start</option><option value="team">Crew</option><option value="pro">Operator</option><option value="enterprise">Command</option></select></label>
        <label><span>Access pack</span><select value={form.pack} onChange={(event) => update("pack", event.target.value)}><option value="full_access">Full tester access</option><option value="operator_pack">Operator free pack</option><option value="command_pack">Command free pack</option></select></label>
        <label className="wide"><span>Note</span><textarea value={form.note} onChange={(event) => update("note", event.target.value)} /></label>
        <label className="hqOneCheck"><input type="checkbox" checked={form.send_email} onChange={(event) => update("send_email", event.target.checked)} /><span>Send tester welcome email</span></label>
      </div>
      <button type="submit" className="hqOnePrimary" disabled={busy}>{busy ? "Saving…" : "Grant tester access"}</button>
      {message ? <div className={`hqOneInline ${statusTone(message)}`}>{message}</div> : null}
    </form>
  );
}

export default function ChurvoxHQPage({ embedded = false }) {
  const [tab, setTab] = React.useState("overview");
  const [query, setQuery] = React.useState("");
  const [entries, setEntries] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState(null);
  const [notice, setNotice] = React.useState("");
  const [updatedAt, setUpdatedAt] = React.useState("");

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const results = await Promise.allSettled(ENDPOINTS.map((endpoint) => apiRequest(endpoint.path)));
    const next = {};
    results.forEach((result, index) => {
      const endpoint = ENDPOINTS[index];
      next[endpoint.key] = result.status === "fulfilled"
        ? { state: "live", data: result.value, error: "", path: endpoint.path, label: endpoint.label }
        : { state: /owner|access|forbidden|locked/i.test(result.reason?.message || "") ? "locked" : "error", data: {}, error: result.reason?.message || "Request failed", path: endpoint.path, label: endpoint.label };
    });
    setEntries(next);
    setUpdatedAt(new Date().toISOString());
    if (!silent) setLoading(false);
  }, []);

  React.useEffect(() => {
    load(false);
    const timer = window.setInterval(() => load(true), 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  const model = React.useMemo(() => {
    const overview = entries.overview?.data || {};
    const launch = entries.launch?.data || {};
    const growth = entries.growth?.data || {};
    const testersData = entries.testers?.data || {};
    const plans = entries.plans?.data || {};
    const control = entries.control?.data || {};
    const connection = entries.connection?.data || {};
    const retention = entries.retention?.data || {};

    const users = firstArray(overview?.lists?.all_users, overview?.lists?.users, overview?.users, plans?.users);
    const businesses = firstArray(overview?.lists?.businesses, overview?.businesses);
    const visitors = firstArray(growth?.visitors, overview?.lists?.visitors, overview?.visitors);
    const events = [...arr(overview?.lists?.events), ...arr(control?.items)].sort((a, b) => new Date(recordTime(b) || 0) - new Date(recordTime(a) || 0));

    const billing = launch?.billing || {};
    const paid = arr(billing?.verified_paid_users).map((row) => ({ ...row, hq_bucket: "Verified paid" }));
    const trials = arr(billing?.verified_trial_users).map((row) => ({ ...row, hq_bucket: "Verified trial" }));
    const needsCheck = arr(billing?.needs_verification).map((row) => ({ ...row, hq_bucket: "Needs verification" }));
    const billingRows = [...paid, ...trials, ...needsCheck];

    const testers = dedupeRows([
      ...arr(testersData?.testers),
      ...arr(testersData?.accepted_testers),
      ...arr(testersData?.active_testers),
      ...arr(testersData?.invited_testers),
      ...arr(testersData?.revoked_testers),
      ...arr(growth?.tester_pipeline?.accepted),
      ...arr(growth?.tester_pipeline?.pending),
      ...arr(growth?.tester_pipeline?.expired),
      ...arr(overview?.lists?.free_testers),
      ...arr(billing?.tester_users),
    ]);

    const overviewMetrics = overview?.metrics || {};
    const launchCounts = launch?.counts || {};
    const growthCounts = growth?.counts || {};
    const testerCounts = testersData?.counts || {};

    const metrics = {
      users: firstNumber(overviewMetrics.total_users, launchCounts.users_total, users.length),
      activeToday: firstNumber(overviewMetrics.active_today, launchCounts.active_today),
      businesses: firstNumber(overviewMetrics.total_businesses, launchCounts.businesses_total, growthCounts.businesses_total, businesses.length),
      jobs: firstNumber(overviewMetrics.total_jobs, launch?.collections?.counts?.jobs, connection?.counts?.jobs),
      clients: firstNumber(overviewMetrics.total_clients, launch?.collections?.counts?.clients, connection?.counts?.clients),
      invoices: firstNumber(overviewMetrics.total_invoices, launch?.collections?.counts?.invoices),
      visitors: firstNumber(growthCounts.unique_total, overviewMetrics.unique_visitors_7d, visitors.length),
      pageviews: firstNumber(growthCounts.pageviews_total, overviewMetrics.visitors_7d),
      signups: firstNumber(growthCounts.signups_total, users.length),
      paid: firstNumber(launchCounts.verified_paid_users, paid.length),
      trials: firstNumber(launchCounts.verified_trial_users, trials.length),
      needsCheck: firstNumber(launchCounts.billing_needs_verification, needsCheck.length),
      testers: firstNumber(testerCounts.total, launchCounts.tester_users, testers.length),
      mrr: firstNumber(billing?.actual_mrr_nzd),
    };

    const endpointFailures = Object.values(entries).filter((entry) => entry?.state !== "live");
    const launchChecks = arr(launch?.launch_checks);
    const attention = [
      ...endpointFailures.map((entry) => ({ label: entry.label, detail: entry.error, status: entry.state })),
      ...launchChecks.filter((item) => item.status !== "pass").map((item) => ({ label: item.label, detail: item.detail, status: item.status })),
      ...(metrics.needsCheck ? [{ label: "Billing verification", detail: `${metrics.needsCheck} record${metrics.needsCheck === 1 ? "" : "s"} need Stripe verification.`, status: "warn" }] : []),
    ];

    return { overview, launch, growth, testersData, plans, control, connection, retention, users, businesses, visitors, events, billingRows, testers, billing, launchChecks, metrics, attention };
  }, [entries]);

  const overviewMetrics = [
    metric("Registered users", formatNumber(model.metrics.users), `${formatNumber(model.metrics.activeToday)} active today`, Users),
    metric("Businesses", formatNumber(model.metrics.businesses), `${formatNumber(model.metrics.clients)} clients stored`, Building2),
    metric("Jobs", formatNumber(model.metrics.jobs), `${formatNumber(model.metrics.invoices)} invoices`, BriefcaseBusiness),
    metric("Public visitors", formatNumber(model.metrics.visitors), `${formatNumber(model.metrics.pageviews)} pageviews`, Globe2),
    metric("Verified paid", formatNumber(model.metrics.paid), `${formatNumber(model.metrics.trials)} verified trials`, CreditCard, "good"),
    metric("Stripe MRR", formatMoney(model.metrics.mrr), "Actual active NZD subscriptions", ReceiptText, model.metrics.mrr === null ? "warn" : "good"),
    metric("Testers", formatNumber(model.metrics.testers), "Accepted, invited and revoked", Gift),
    metric("Needs checking", formatNumber(model.metrics.needsCheck), "Not counted as paid", AlertTriangle, model.metrics.needsCheck ? "warn" : "good"),
  ];

  async function controlTester(item, action) {
    const identifier = emailOf(item) || text(item.id || item._id);
    if (!identifier) {
      setNotice("This tester record has no usable email or ID.");
      return;
    }
    setNotice(action === "revoke" ? "Revoking tester access…" : "Granting tester access…");
    try {
      const result = await apiRequest("/api/admin/owner/control-access", {
        method: "POST",
        body: JSON.stringify({ identifier, action, plan: action === "grant" ? "pro" : item.plan, pack: "full_access", days: 90, note: `${action} from the rebuilt Churvox HQ` }),
      });
      setNotice(text(result.message, "Tester access updated."));
      await load(true);
    } catch (error) {
      setNotice(error.message || "Tester access could not be updated.");
    }
  }

  function logout() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("access_token");
      sessionStorage.clear();
    } catch {}
    window.location.href = "/login";
  }

  const connected = Object.values(entries).filter((entry) => entry?.state === "live").length;
  const activeTab = TABS.find((item) => item.key === tab) || TABS[0];

  return (
    <main id="CHURVOX_HQ_SYSTEM" className={`hqOne${embedded ? " embedded" : ""}`} data-version="CHURVOX_HQ_ONE_CONSOLE_20260727" aria-label="Churvox HQ">
      <DetailModal item={selected} onClose={() => setSelected(null)} />

      <header className="hqOneTop">
        <div className="hqOneBrand">
          <span><ShieldCheck size={25} /></span>
          <div><small>Platform owner only</small><strong>Churvox HQ</strong></div>
        </div>
        <div className="hqOneTopStatus">
          <span className={`hqOneLive ${loading ? "loading" : connected === ENDPOINTS.length ? "good" : connected ? "warn" : "bad"}`}><i />{loading ? "Loading live platform data" : `${connected} of ${ENDPOINTS.length} live sources`}</span>
          <small>{updatedAt ? `Updated ${formatDate(updatedAt)}` : "Not refreshed yet"}</small>
        </div>
        <div className="hqOneTopActions">
          <a href="/dashboard"><ExternalLink size={15} />Owner app</a>
          <a href="/admin/usage"><Activity size={15} />Usage</a>
          <a href="/platform"><Database size={15} />Platform tools</a>
          <button type="button" onClick={logout}><LogOut size={15} />Log out</button>
        </div>
      </header>

      <nav className="hqOneNav" aria-label="Churvox HQ navigation">
        {TABS.map((item) => {
          const Icon = item.icon;
          return <button type="button" key={item.key} className={tab === item.key ? "active" : ""} onClick={() => { setTab(item.key); setQuery(""); }}><Icon size={17} /><span>{item.label}</span></button>;
        })}
      </nav>

      <section className="hqOneMain">
        <header className="hqOnePageHead">
          <div><small>One owner console</small><h1>{activeTab.label}</h1><p>Every figure and record below comes from the live owner-only backend. No old HQ is embedded inside this page.</p></div>
          <button type="button" className="hqOneRefresh" onClick={() => load(false)} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} />{loading ? "Refreshing…" : "Refresh"}</button>
        </header>

        {notice ? <div className={`hqOneNotice ${statusTone(notice)}`}>{notice}<button type="button" onClick={() => setNotice("")}>×</button></div> : null}

        {tab === "overview" ? (
          <div className="hqOneStack">
            <section className="hqOneMetrics">{overviewMetrics.map((item) => <MetricCard key={item.label} item={item} />)}</section>
            <div className="hqOneTwo">
              <section className="hqOneCard">
                <header className="hqOneCardHead"><div><AlertTriangle size={18} /><span><strong>Needs attention</strong><small>Live failures, warnings and billing checks.</small></span></div><span className={`hqOnePill ${model.attention.length ? "warn" : "good"}`}>{model.attention.length}</span></header>
                {model.attention.length ? <div className="hqOneAttention">{model.attention.slice(0, 12).map((item, index) => <article key={`${item.label}-${index}`}><span className={statusTone(item.status)}>{statusTone(item.status) === "bad" ? <XCircle size={17} /> : <AlertTriangle size={17} />}</span><div><strong>{item.label}</strong><p>{item.detail || item.status}</p></div></article>)}</div> : <EmptyState title="Nothing urgent returned" detail="All connected owner sources currently report without warnings." />}
              </section>
              <section className="hqOneCard">
                <header className="hqOneCardHead"><div><Activity size={18} /><span><strong>Latest platform activity</strong><small>Newest real records from overview and control log.</small></span></div><button type="button" className="hqOneTextButton" onClick={() => setTab("activity")}>View all</button></header>
                {model.events.length ? <div className="hqOneActivityList">{model.events.slice(0, 8).map((item, index) => <button type="button" key={recordKey(item, index)} onClick={() => setSelected(item)}><strong>{nameOf(item)}</strong><span>{text(item.meta || item.action || item.kind || recordStatus(item), "Live event")}</span><small>{ageText(recordTime(item))}</small></button>)}</div> : <EmptyState title="No activity returned" />}
              </section>
            </div>
          </div>
        ) : null}

        {tab !== "overview" && tab !== "system" ? <label className="hqOneSearch"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${activeTab.label.toLowerCase()}…`} /></label> : null}

        {tab === "users" ? <section className="hqOneCard"><header className="hqOneCardHead"><div><Users size={18} /><span><strong>All user records</strong><small>Customers, owners, workers and internal records returned by the owner overview.</small></span></div><span className="hqOnePill">{formatNumber(model.users.length)}</span></header><DataTable rows={model.users} query={query} onOpen={setSelected} emptyTitle="No users returned" /></section> : null}

        {tab === "businesses" ? <section className="hqOneCard"><header className="hqOneCardHead"><div><Building2 size={18} /><span><strong>Businesses</strong><small>Business owners and workspaces returned by the live overview.</small></span></div><span className="hqOnePill">{formatNumber(model.businesses.length)}</span></header><DataTable rows={model.businesses} query={query} onOpen={setSelected} emptyTitle="No businesses returned" /></section> : null}

        {tab === "billing" ? (
          <div className="hqOneStack">
            <section className="hqOneMetrics compact">
              <MetricCard item={metric("Verified paid", formatNumber(model.metrics.paid), "Stripe status active", CreditCard, "good")} />
              <MetricCard item={metric("Verified trials", formatNumber(model.metrics.trials), "Stripe status trialing", Activity)} />
              <MetricCard item={metric("Actual MRR", formatMoney(model.metrics.mrr), "Active NZD price items only", ReceiptText, "good")} />
              <MetricCard item={metric("Needs verification", formatNumber(model.metrics.needsCheck), "Excluded from paid totals", AlertTriangle, model.metrics.needsCheck ? "warn" : "good")} />
            </section>
            <section className="hqOneCard"><header className="hqOneCardHead"><div><CreditCard size={18} /><span><strong>Billing records</strong><small>Verified paid, verified trials and records needing Stripe verification.</small></span></div><span className="hqOnePill">{formatNumber(model.billingRows.length)}</span></header><DataTable rows={model.billingRows} query={query} onOpen={setSelected} emptyTitle="No billing records returned" /></section>
          </div>
        ) : null}

        {tab === "testers" ? (
          <div className="hqOneStack">
            <TesterForm onSaved={() => load(true)} />
            <section className="hqOneCard"><header className="hqOneCardHead"><div><Gift size={18} /><span><strong>Tester roster</strong><small>Accepted, pending, active, expired and revoked tester records.</small></span></div><span className="hqOnePill">{formatNumber(model.testers.length)}</span></header>{model.testers.length ? <div className="hqOneTesterRows">{model.testers.filter((item) => !lower(query) || JSON.stringify(item).toLowerCase().includes(lower(query))).map((item, index) => <article key={recordKey(item, index)}><button type="button" className="hqOneTesterIdentity" onClick={() => setSelected(item)}><strong>{nameOf(item)}</strong><span>{emailOf(item) || "No email returned"}</span></button><span>{planOf(item)}</span><span className={`hqOnePill ${statusTone(recordStatus(item))}`}>{recordStatus(item)}</span><div><button type="button" onClick={() => controlTester(item, "grant")}>Grant</button><button type="button" className="danger" onClick={() => controlTester(item, "revoke")}>Revoke</button></div></article>)}</div> : <EmptyState title="No testers returned" />}</section>
          </div>
        ) : null}

        {tab === "visitors" ? <section className="hqOneCard"><header className="hqOneCardHead"><div><Globe2 size={18} /><span><strong>Public visitors</strong><small>Real public visitor records after internal and owner traffic are excluded.</small></span></div><span className="hqOnePill">{formatNumber(model.visitors.length)}</span></header><DataTable rows={model.visitors} query={query} onOpen={setSelected} emptyTitle="No public visitors returned" type="visitors" /></section> : null}

        {tab === "activity" ? <section className="hqOneCard"><header className="hqOneCardHead"><div><Activity size={18} /><span><strong>Platform activity</strong><small>User, visit and owner control events in newest-first order.</small></span></div><span className="hqOnePill">{formatNumber(model.events.length)}</span></header>{model.events.filter((item) => !lower(query) || JSON.stringify(item).toLowerCase().includes(lower(query))).length ? <div className="hqOneActivityList full">{model.events.filter((item) => !lower(query) || JSON.stringify(item).toLowerCase().includes(lower(query))).map((item, index) => <button type="button" key={recordKey(item, index)} onClick={() => setSelected(item)}><strong>{nameOf(item)}</strong><span>{text(item.meta || item.action || item.kind || recordStatus(item), "Live event")}</span><small>{formatDate(recordTime(item))}</small></button>)}</div> : <EmptyState title="No activity returned" />}</section> : null}

        {tab === "system" ? (
          <div className="hqOneStack">
            <section className="hqOneCard"><header className="hqOneCardHead"><div><Database size={18} /><span><strong>Owner endpoint status</strong><small>Exact live state of every source used by this one HQ.</small></span></div><span className={`hqOnePill ${connected === ENDPOINTS.length ? "good" : "warn"}`}>{connected}/{ENDPOINTS.length} live</span></header><div className="hqOneEndpointGrid">{ENDPOINTS.map((endpoint) => { const entry = entries[endpoint.key] || {}; return <article key={endpoint.key} className={statusTone(entry.state)}><span>{entry.state === "live" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}</span><div><strong>{endpoint.label}</strong><small>{endpoint.path}</small><p>{entry.state === "live" ? "Loaded from the owner backend." : entry.error || "Waiting for response."}</p></div></article>; })}</div></section>
            <div className="hqOneTwo">
              <section className="hqOneCard"><header className="hqOneCardHead"><div><ShieldCheck size={18} /><span><strong>Launch checks</strong><small>Database, Stripe, prices, billing truth, webhooks and email.</small></span></div></header>{model.launchChecks.length ? <div className="hqOneChecks">{model.launchChecks.map((item) => <article key={item.key || item.label}><span className={statusTone(item.status)}>{item.status === "pass" ? <CheckCircle2 size={17} /> : item.status === "fail" ? <XCircle size={17} /> : <AlertTriangle size={17} />}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div><em>{item.status}</em></article>)}</div> : <EmptyState title="No launch checks returned" />}</section>
              <section className="hqOneCard"><header className="hqOneCardHead"><div><Database size={18} /><span><strong>Database collection counts</strong><small>Counts returned by launch and connection endpoints.</small></span></div></header>{Object.keys(model.launch?.collections?.counts || model.connection?.counts || {}).length ? <div className="hqOneCollectionGrid">{Object.entries(model.launch?.collections?.counts || model.connection?.counts || {}).map(([key, value]) => <article key={key}><span>{key.replaceAll("_", " ")}</span><strong>{formatNumber(value)}</strong></article>)}</div> : <EmptyState title="No collection counts returned" />}</section>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
