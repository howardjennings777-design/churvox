import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HardHat } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import V3Shell from "../components/V3Shell";
import "../styles/v3.css";

const config = {
  jobs: { eyebrow: "Run sheet", title: "Jobs", copy: "Live job flow, crew coverage, work status and invoice handoff.", endpoint: "/jobs", action: "New job", newPath: "/jobs/new" },
  clients: { eyebrow: "Customer base", title: "Clients", copy: "Customers, sites, job history and follow-ups without clutter.", endpoint: "/clients", action: "Add client", newPath: "/clients/new" },
  quotes: { eyebrow: "Sales desk", title: "Quotes", copy: "Prepare quotes, track decisions and turn accepted work into jobs.", endpoint: "/quotes", action: "New quote", newPath: "/quotes/new" },
  invoices: { eyebrow: "Money board", title: "Invoices", copy: "Draft, review, send and collect invoices from one cashflow workspace.", endpoint: "/invoices", action: "New invoice", newPath: "/invoices/new" },
  team: { eyebrow: "Crew", title: "Team", copy: "Manage workers, roles, regions and invites with a proper trade crew view.", endpoint: "/team/workers", action: "Invite worker" },
  payroll: { eyebrow: "Pay run", title: "Payroll", copy: "Approved hours, worker summaries, exports and payroll handoff.", endpoint: "/payroll/summary", action: "Refresh" },
  automation: { eyebrow: "Background engine", title: "Rules", copy: "Let Churvox prepare background actions and only surface what needs review.", endpoint: "/automation/rules", action: "New rule" },
  reports: { eyebrow: "Owner numbers", title: "Reports", copy: "Simple business insight for revenue, jobs, invoices and crew hours.", endpoint: "/reports/summary?range=this_month", action: "Refresh" },
  sms: { eyebrow: "Comms", title: "Messages", copy: "Customer follow-ups, reminders and message history in one clean area.", endpoint: "/sms/history", action: "New message" },
  integrations: { eyebrow: "Connected tools", title: "Sync", copy: "MYOB and other business systems connected without the noise.", endpoint: "/accounting/settings", action: "Refresh" },
  plans: { eyebrow: "Account", title: "Billing", copy: "Plan, subscription and billing controls in a simple owner view.", endpoint: "/billing/status", action: "Manage plan" },
  settings: { eyebrow: "Setup", title: "Settings", copy: "Business profile, account details and operating preferences.", endpoint: "/auth/me", action: "Save" },
  proof: { eyebrow: "Proof pack", title: "Job Proofs", copy: "Completed work, photos and invoice-ready proof packs.", endpoint: "/proof-to-paid", action: "Refresh" },
};

function asArray(data, type) {
  if (Array.isArray(data)) return data;
  for (const key of ["items", "jobs", "clients", "quotes", "invoices", "workers", "rules", "messages"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  if (data && typeof data === "object") {
    return Object.entries(data).slice(0, 12).map(([key, value]) => ({
      title: key.replace(/_/g, " "),
      value: typeof value === "object" ? JSON.stringify(value) : value,
    }));
  }
  return [];
}

function titleOf(row) {
  return row?.title || row?.name || row?.client_name || row?.customer_name || row?.job_title || row?.quote_number || row?.invoice_number || row?.email || row?.rule_name || "Untitled";
}

function subOf(row) {
  return row?.address || row?.status || row?.description || row?.phone || row?.role || row?.created_at || row?.value || "Open details";
}

export default function V3WorkspacePage({ type }) {
  const cfg = config[type] || config.jobs;
  const { get } = useApi();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const result = await get(cfg.endpoint);
    const data = result?.success ? result.data : result;
    setRows(asArray(data, type));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [type]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, query]);

  const pending = rows.filter((row) => String(row?.status || "").toLowerCase().match(/pending|draft|review/)).length;
  const done = rows.filter((row) => String(row?.status || "").toLowerCase().match(/done|complete|paid|accepted|active/)).length;

  return (
    <V3Shell>
      <div className="v3-page">
        <section className="v3-hero">
          <div className="v3-hero-main">
            <div className="v3-hero-copy">
              <p className="v3-eyebrow">{cfg.eyebrow}</p>
              <h1>{cfg.title}</h1>
              <p>{cfg.copy}</p>
              <div className="v3-actions">
                <button className="v3-button" onClick={() => cfg.newPath ? navigate(cfg.newPath) : load()}>{cfg.action}</button>
                <button className="v3-button secondary" onClick={load}>Refresh</button>
              </div>
            </div>
          </div>
          <aside className="v3-hero-panel">
            <div className="v3-now-card">
              <div>
                <small>Live records</small>
                <b>{loading ? "…" : rows.length}</b>
                <span>{rows.length ? "Loaded from Churvox" : "Nothing here yet"}</span>
              </div>
            </div>
            <div className="v3-site-card">
              <div className="v3-site-icon"><HardHat size={25} /></div>
              <div>
                <small>Workspace</small>
                <b>{cfg.title}</b>
                <span>Built for fast trade/admin flow.</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="v3-metrics">
          <div className="v3-metric"><b>{rows.length}</b><span>Total</span><small>All records</small></div>
          <div className="v3-metric"><b>{pending}</b><span>Needs review</span><small>Draft or pending</small></div>
          <div className="v3-metric lime"><b>{done}</b><span>Done</span><small>Completed or active</small></div>
          <div className="v3-metric"><b>{filtered.length}</b><span>Showing</span><small>After search</small></div>
        </section>

        <article className="v3-card">
          <div className="v3-card-head">
            <div>
              <p>{cfg.eyebrow}</p>
              <h2>{cfg.title} board</h2>
            </div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" style={{ minHeight: 44, borderRadius: 999, border: "1px solid #dacdbd", background: "#fffaf2", padding: "0 14px" }} />
          </div>

          {loading ? (
            <div className="v3-empty"><b>Loading</b><span>Pulling live data.</span></div>
          ) : filtered.length ? (
            filtered.slice(0, 40).map((row, index) => (
              <button className="v3-row" key={row.id || row._id || index} onClick={() => row.id && navigate(`/${type}/${row.id}`)}>
                <span><b>{titleOf(row)}</b><span>{subOf(row)}</span></span>
                <em>Open</em>
              </button>
            ))
          ) : (
            <div className="v3-empty"><b>No records yet</b><span>When this area has data, it will show here.</span></div>
          )}
        </article>
      </div>
    </V3Shell>
  );
}
