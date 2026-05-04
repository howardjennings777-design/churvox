import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import "../styles/smartCommandSystem.css";

const toList = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of keys) if (Array.isArray(value[key])) return value[key];
  return Array.isArray(value.data) ? value.data : [];
};

const norm = (value) => String(value || "").toLowerCase().trim();
const money = (value) => new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" }).format(Number(value || 0));
const safeGet = async (path) => { try { return await get(path); } catch { return []; } };

function MetricCard({ label, value, help, onClick }) {
  return (
    <button type="button" className="smart-command-card" onClick={onClick}>
      <p className="smart-command-label">{label}</p>
      <p className="smart-command-number">{value}</p>
      <p className="smart-command-help">{help}</p>
    </button>
  );
}

function MiniStat({ label, value }) {
  return <div className="smart-command-mini"><p className="smart-command-label">{label}</p><b>{value}</b></div>;
}

function ListPanel({ title, items, empty }) {
  return (
    <section className="smart-command-panel">
      <p className="smart-command-label">Command workspace</p>
      <h2>{title}</h2>
      <div className="smart-command-list" style={{ marginTop: 18 }}>
        {items.length ? items.map((item, index) => (
          <article className="smart-command-row" key={`${item.title}-${index}`}>
            <p className="smart-command-row-title">{item.title}</p>
            <p className="smart-command-row-text">{item.text}</p>
          </article>
        )) : <p className="smart-command-help">{empty}</p>}
      </div>
    </section>
  );
}

function CommandCentre({ open, tab, setTab, close, counts, approvals, data }) {
  if (!open) return null;
  const tabs = [
    ["approvals", "Approvals"], ["dispatch", "Dispatch"], ["invoices", "Invoices"], ["quotes", "Quotes"],
    ["jobs", "Jobs"], ["clients", "Clients"], ["crew", "Crew"], ["activity", "Activity"], ["settings", "AI Settings"],
  ];
  const lists = {
    dispatch: data.jobs.filter(j => !j.assigned_worker_id && !j.worker_id && !j.assigned_worker).map(j => ({ title: j.title || j.name || "Unassigned job", text: j.address || j.location || "No address saved" })),
    invoices: data.invoices.map(i => ({ title: i.invoice_number || i.number || "Invoice", text: `${norm(i.status) || "open"} • ${money(i.balance || i.total || i.amount)}` })),
    quotes: data.quotes.map(q => ({ title: q.quote_number || q.number || q.title || "Quote", text: norm(q.status) || "waiting" })),
    jobs: data.jobs.map(j => ({ title: j.title || j.name || "Job", text: `${norm(j.status) || "new"} • ${j.address || j.location || "No address"}` })),
    clients: data.clients.map(c => ({ title: c.name || c.company_name || "Client", text: c.email || c.phone || c.address || "No contact detail" })),
    crew: data.workers.map(w => ({ title: w.name || w.email || "Worker", text: `${w.role || "worker"} • ${w.region || w.area || "No region"}` })),
    activity: data.activity.map(a => ({ title: a.title || "AI activity", text: a.message || a.status || "Recorded by Smart Hub" })),
    settings: ["Invoice reminders: draft only", "Quote follow-ups: draft only", "Worker assignment: approval required", "Accounting: locked", "Payroll: locked", "SMS: approval first"].map(x => ({ title: x, text: "Launch-safe owner approval setting" })),
  };
  return (
    <div className="smart-command-modal">
      <section className="smart-command-modal-shell">
        <header className="smart-command-modal-head">
          <div>
            <ChurvoxLogo size="xl" />
            <p className="smart-command-kicker" style={{ marginTop: 18 }}>AI Operator Command Centre</p>
            <h2>Full control room.</h2>
            <p className="smart-command-subtitle">Review approvals, dispatch work, chase invoices, follow up quotes, and manage the AI operator in one full-page workspace.</p>
          </div>
          <button type="button" className="smart-command-btn primary" onClick={close}>Back to Smart Hub</button>
        </header>
        <nav className="smart-command-tabs">
          {tabs.map(([key, label]) => <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}
        </nav>
        <main className="smart-command-modal-body">
          {tab === "approvals" ? (
            <div className="smart-command-shell">
              <section className="smart-command-metrics">
                <MetricCard label="Need decision" value={counts.needDecision} help="Owner choice needed" />
                <MetricCard label="Ready" value={counts.ready} help="Ready to approve" />
                <MetricCard label="Drafts" value={counts.drafts} help="Prepared but not sent" />
                <MetricCard label="Watching" value={counts.watching} help="AI monitoring" />
              </section>
              <ListPanel title="Priority approval queue" items={approvals} empty="No approvals waiting right now." />
            </div>
          ) : <ListPanel title={tabs.find(([key]) => key === tab)?.[1] || "Workspace"} items={lists[tab] || []} empty="Nothing here yet." />}
        </main>
      </section>
    </div>
  );
}

export default function SmartHubBrainPageStable() {
  const { user } = useAuth();
  const [data, setData] = useState({ jobs: [], clients: [], invoices: [], quotes: [], workers: [], activity: [], actions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandTab, setCommandTab] = useState("approvals");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [jobs, clients, invoices, quotes, workers, activity, actions] = await Promise.all([
        safeGet("/jobs"), safeGet("/clients"), safeGet("/invoices"), safeGet("/quotes"), safeGet("/team/workers"), safeGet("/smart-hub/activity"), safeGet("/ai-operator/actions"),
      ]);
      setData({
        jobs: toList(jobs, ["jobs"]), clients: toList(clients, ["clients"]), invoices: toList(invoices, ["invoices"]), quotes: toList(quotes, ["quotes"]),
        workers: toList(workers, ["workers"]), activity: toList(activity, ["activities"]), actions: toList(actions, ["actions"]),
      });
    } catch {
      setError("Smart Hub could not load everything yet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const readyToBill = data.jobs.filter(j => ["completed", "complete"].includes(norm(j.status)) && !j.invoice_id && !j.draft_invoice_id).length;
    const unassigned = data.jobs.filter(j => !["completed", "complete", "cancelled", "canceled"].includes(norm(j.status)) && !j.assigned_worker_id && !j.worker_id && !j.assigned_worker).length;
    const openInvoices = data.invoices.filter(i => !["paid", "cancelled", "canceled"].includes(norm(i.status))).length;
    const crew = data.workers.filter(w => w.available !== false && !["inactive", "offboarded"].includes(norm(w.status))).length;
    const waitingQuotes = data.quotes.filter(q => !["accepted", "declined", "converted", "invoiced", "cancelled", "canceled"].includes(norm(q.status))).length;
    const activeActions = data.actions.filter(a => !["done", "completed", "cancelled", "rejected"].includes(norm(a.status)));
    return {
      readyToBill, unassigned, openInvoices, crew, waitingQuotes,
      needDecision: activeActions.filter(a => /decision|missing|conflict/i.test(`${a.group || ""} ${a.type || ""} ${a.action_type || ""}`)).length,
      ready: activeActions.filter(a => /ready|assign|invoice/i.test(`${a.group || ""} ${a.type || ""} ${a.action_type || ""}`)).length,
      drafts: activeActions.filter(a => /draft|reminder|follow/i.test(`${a.group || ""} ${a.type || ""} ${a.action_type || ""}`)).length,
      watching: activeActions.length,
    };
  }, [data]);

  const approvals = useMemo(() => {
    if (data.actions.length) return data.actions.map(a => ({ title: a.title || a.name || a.action_type || "AI action ready", text: a.reason || a.message || a.what_happens || "Prepared for owner review." }));
    return data.invoices.slice(0, 4).map(i => ({ title: `Prepare reminder for ${i.client_name || "invoice"}`, text: `${i.invoice_number || i.number || "Invoice"} • ${money(i.balance || i.total || i.amount)} outstanding` }));
  }, [data]);

  const bestMove = counts.unassigned ? `Assign crew to ${counts.unassigned} unassigned jobs.` : counts.readyToBill ? `Create ${counts.readyToBill} draft invoices.` : counts.openInvoices ? `Review ${counts.openInvoices} open invoices.` : "Business is clear right now.";
  const runPlan = async () => { try { await post("/ai-operator/run-daily-plan", {}); await load(); } catch {} };
  const openCommand = (tab = "approvals") => { setCommandTab(tab); setCommandOpen(true); };

  return (
    <Layout smartHubMode>
      <main className="smart-command-system">
        <div className="smart-command-shell">
          <section className="smart-command-hero">
            <div className="smart-command-hero-grid">
              <div className="smart-command-logo-wrap"><ChurvoxLogo size="hero" /></div>
              <div>
                <p className="smart-command-kicker">Smart Hub</p>
                <h1 className="smart-command-title">AI Operator Command Dashboard</h1>
                <p className="smart-command-subtitle">Welcome back, {user?.name || "owner"}. Churvox prepares the admin, dispatch, reminders and billing work. You approve what happens next.</p>
              </div>
              <div className="smart-command-next-card">
                <p className="smart-command-kicker">Best next move</p>
                <strong>{bestMove}</strong>
                <div className="smart-command-actions">
                  <button type="button" className="smart-command-btn primary" onClick={() => openCommand("approvals")}>Open Command Centre</button>
                  <button type="button" className="smart-command-btn dark" onClick={runPlan}>Run AI plan</button>
                  <button type="button" className="smart-command-btn green" onClick={() => openCommand("approvals")}>{approvals.length} approvals</button>
                </div>
              </div>
            </div>
          </section>

          {error ? <div className="smart-command-panel"><p>{error}</p></div> : null}
          {loading ? <div className="smart-command-panel"><p>Loading Smart Hub...</p></div> : null}

          <section className="smart-command-metrics">
            <MetricCard label="Ready to bill" value={counts.readyToBill} help="Completed work waiting for invoice" onClick={() => openCommand("invoices")} />
            <MetricCard label="Unassigned jobs" value={counts.unassigned} help="Jobs AI can help place with crew" onClick={() => openCommand("dispatch")} />
            <MetricCard label="Open invoices" value={counts.openInvoices} help="Money still waiting to come in" onClick={() => openCommand("invoices")} />
            <MetricCard label="Crew available" value={counts.crew} help="Workers ready for dispatch" onClick={() => openCommand("crew")} />
          </section>

          <section className="smart-command-main">
            <section className="smart-command-panel accent">
              <div className="smart-command-panel-head">
                <div>
                  <p className="smart-command-label">AI approval centre</p>
                  <h2>Owner approval queue</h2>
                  <p>AI prepares the work. You approve what happens next.</p>
                </div>
                <button type="button" className="smart-command-btn light" onClick={() => openCommand("approvals")}>Open queue</button>
              </div>
              <div className="smart-command-mini-grid">
                <MiniStat label="Need decision" value={counts.needDecision} />
                <MiniStat label="Ready" value={counts.ready} />
                <MiniStat label="Drafts" value={counts.drafts} />
                <MiniStat label="Watching" value={counts.watching} />
              </div>
              <div className="smart-command-list">
                {approvals.slice(0, 4).map((item, index) => <article className="smart-command-row" key={index}><p className="smart-command-row-title">{item.title}</p><p className="smart-command-row-text">{item.text}</p></article>)}
              </div>
            </section>

            <section className="smart-command-panel">
              <p className="smart-command-label">Business pulse</p>
              <h2>Today&apos;s snapshot</h2>
              <div className="smart-command-mini-grid" style={{ gridTemplateColumns: "1fr" }}>
                <MiniStat label="Quotes waiting" value={counts.waitingQuotes} />
                <MiniStat label="Dispatch pressure" value={counts.unassigned} />
                <MiniStat label="Clients" value={data.clients.length} />
                <MiniStat label="AI actions" value={data.actions.length} />
              </div>
            </section>
          </section>

          <section className="smart-command-panel">
            <div className="smart-command-panel-head">
              <div><p className="smart-command-label">Workspace dock</p><h2>Open a command workspace</h2></div>
            </div>
            <div className="smart-command-dock">
              {[["Jobs", "jobs"], ["Clients", "clients"], ["Invoices", "invoices"], ["Quotes", "quotes"], ["Crew", "crew"], ["Dispatch", "dispatch"], ["Approvals", "approvals"], ["AI Settings", "settings"]].map(([name, tab]) => (
                <button key={name} type="button" onClick={() => openCommand(tab)}>{name}<span>Open full workspace</span></button>
              ))}
            </div>
          </section>
        </div>
        <CommandCentre open={commandOpen} tab={commandTab} setTab={setCommandTab} close={() => setCommandOpen(false)} counts={counts} approvals={approvals} data={data} />
      </main>
    </Layout>
  );
}
