import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import V2Shell from "../components/V2Shell";
import { useApi } from "../../hooks/useApi";
import "../styles/v2.css";

const pageCopy = {
  jobs: { title: "Live Run Sheet", eyebrow: "Jobs", subtitle: "Today’s jobs, crew coverage, completed work and invoice handoff in one calm workspace.", endpoint: "/jobs", primary: "New job", newPath: "/jobs/new", empty: "No jobs found yet." },
  clients: { title: "Client Workspace", eyebrow: "Clients", subtitle: "Customers, sites, jobs, quotes and invoice follow-ups without the clutter.", endpoint: "/clients", primary: "Add client", newPath: "/clients/new", empty: "No clients found yet." },
  quotes: { title: "Quotes", eyebrow: "Sales", subtitle: "Prepare quotes, track decisions and turn accepted work into jobs.", endpoint: "/quotes", primary: "New quote", newPath: "/quotes/new", empty: "No quotes found yet." },
  invoices: { title: "Cashflow", eyebrow: "Invoices", subtitle: "Create, review, send and collect invoices. Drafts and reminders stay clean and owner-approved.", endpoint: "/invoices", primary: "New invoice", newPath: "/invoices/new", empty: "No invoices found yet." },
  team: { title: "Team", eyebrow: "Crew", subtitle: "Manage crew, invites, roles, regions and worker details from one premium workspace.", endpoint: "/team/workers", primary: "Invite worker", empty: "No team members found yet." },
  payroll: { title: "Payroll", eyebrow: "Operations", subtitle: "Review approved hours, worker summaries, exports and payroll handoff.", endpoint: "/payroll/summary", primary: "Refresh", empty: "Payroll data will appear here." },
  automation: { title: "Rules & Triggers", eyebrow: "Automation", subtitle: "AI prepares the work. Automation runs the background rules. You only see decisions that need review.", endpoint: "/automation/rules", primary: "New rule", empty: "No rules found yet." },
  reports: { title: "Business Insights", eyebrow: "Reports", subtitle: "Simple owner snapshot for revenue, invoices, jobs, payroll and customers.", endpoint: "/reports/summary?range=this_month", primary: "Refresh", empty: "Insights will appear after activity is recorded." },
  sms: { title: "Messages", eyebrow: "Communication", subtitle: "Customer follow-ups, reminders and message history in a simple approval-first workspace.", endpoint: "/sms/history", primary: "New message", empty: "No messages found yet." },
  integrations: { title: "Integrations", eyebrow: "Connected systems", subtitle: "MYOB and connected tools stay clean, visible and easy to control.", endpoint: "/accounting/settings", primary: "Refresh", empty: "No integrations connected yet." },
  plans: { title: "Billing", eyebrow: "Plan", subtitle: "Plan, subscription and billing controls without noise.", endpoint: "/billing/status", primary: "Manage plan", empty: "Billing status will appear here." },
  settings: { title: "Settings", eyebrow: "Business setup", subtitle: "Business profile, account settings and operational preferences in one place.", endpoint: "/auth/me", primary: "Save changes", empty: "Settings are ready." },
};

function asArray(data, type) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.clients)) return data.clients;
  if (Array.isArray(data?.quotes)) return data.quotes;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.rules)) return data.rules;
  if (Array.isArray(data?.messages)) return data.messages;
  if (type === "reports" && data) return Object.entries(data).slice(0, 12).map(([key, value]) => ({ title: key.replace(/_/g, " "), value }));
  if (data && typeof data === "object") return Object.entries(data).slice(0, 8).map(([key, value]) => ({ title: key.replace(/_/g, " "), value: typeof value === "object" ? JSON.stringify(value) : value }));
  return [];
}

function getTitle(item) {
  return item?.title || item?.name || item?.customer_name || item?.client_name || item?.job_title || item?.quote_number || item?.invoice_number || item?.email || item?.rule_name || item?.title || "Untitled";
}

function getSub(item) {
  return item?.address || item?.status || item?.description || item?.job_description || item?.phone || item?.role || item?.created_at || item?.value || "Open details";
}

export default function V2WorkspacePage({ type }) {
  const config = pageCopy[type] || pageCopy.jobs;
  const navigate = useNavigate();
  const { get } = useApi();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Loading workspace…");

  const load = async () => {
    setLoading(true);
    const result = await get(config.endpoint);
    const data = result?.success ? result.data : result;
    const nextRows = asArray(data, type);
    setRows(nextRows);
    setStatus(result?.success === false ? "Could not load workspace" : `${nextRows.length} items loaded`);
    setLoading(false);
  };

  useEffect(() => { load(); }, [type]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, query]);

  const total = rows.length;
  const pending = rows.filter((row) => String(row?.status || "").toLowerCase().includes("pending") || String(row?.status || "").toLowerCase().includes("draft")).length;
  const complete = rows.filter((row) => ["completed", "paid", "accepted", "active", "success"].includes(String(row?.status || "").toLowerCase())).length;

  const primaryClick = () => {
    if (config.newPath) navigate(config.newPath);
    else load();
  };

  return (
    <V2Shell status={status}>
      <div className="v2-page">
        <div className="v2-topbar"><span className="v2-live-pill">{status}</span><div className="v2-top-actions"><button className="v2-button secondary" onClick={load}>Refresh</button></div></div>
        <section className="v2-hero">
          <div className="v2-hero-copy">
            <p className="v2-eyebrow">{config.eyebrow}</p>
            <h1>{config.title}</h1>
            <p>{config.subtitle}</p>
            <div className="v2-hero-actions"><button className="v2-button" onClick={primaryClick}>{config.primary}</button><button className="v2-button secondary" onClick={load}>Refresh</button></div>
          </div>
          <aside className="v2-hero-side"><small>{config.eyebrow} summary</small><b>{loading ? "…" : total}</b><span>{total ? "Live records in this workspace" : config.empty}</span></aside>
        </section>
        <section className="v2-stats">
          <div className="v2-stat"><b>{total}</b><span>Total</span><small>All records</small></div>
          <div className="v2-stat" data-tone="amber"><b>{pending}</b><span>Needs review</span><small>Draft or pending</small></div>
          <div className="v2-stat" data-tone="green"><b>{complete}</b><span>Complete</span><small>Done or active</small></div>
          <div className="v2-stat"><b>{filtered.length}</b><span>Showing</span><small>After search</small></div>
        </section>
        <article className="v2-card">
          <div className="v2-card-head"><div><p>{config.eyebrow}</p><h2>{config.title} list</h2></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search…" style={{ maxWidth: 260, minHeight: 42, borderRadius: 14, border: "1px solid #dce7f4", padding: "0 12px" }} /></div>
          {loading ? <div className="v2-empty"><b>Loading</b><span>Pulling live data from Churvox.</span></div> : filtered.length ? filtered.slice(0, 30).map((item, index) => <button className="v2-row" key={item.id || item._id || index} onClick={() => item.id ? navigate(`/${type}/${item.id}`) : null}><span><b>{getTitle(item)}</b><span>{getSub(item)}</span></span><em>Open</em></button>) : <div className="v2-empty"><b>{config.empty}</b><span>When records exist, they will show here in the new V2 layout.</span></div>}
        </article>
      </div>
    </V2Shell>
  );
}
