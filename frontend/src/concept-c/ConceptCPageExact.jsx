import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import CommandFloorApprovalSlip from "./CommandFloorApprovalSlip";
import "./ConceptCPageExact.css";
import "./ConceptCFullScreenSlip.css";
import "./ConceptCWorkSlipTight.css";
import "./ChurvoxClarityPass.css";
import "./commandFloorProperControlTower.css";

const arr = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.activities) ? v.activities : Array.isArray(v?.notifications) ? v.notifications : [];
const str = (v) => String(v || "").trim();
const low = (v) => str(v).toLowerCase();
const idOf = (v) => str(v?.id || v?._id || v?.uuid || "");
const firstText = (...values) => values.map(str).find(Boolean) || "";
const cash = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const sum = (items) => items.reduce((total, item) => total + Number(item.amount || 0), 0);
const apiOk = (res) => Boolean(res?.success && res?.data?.success !== false);
const apiError = (res, fallback = "unknown error") => firstText(res?.error, res?.data?.error, res?.data?.detail, res?.data?.message, fallback);
const recordIdFromResponse = (res) => idOf(res?.data) || idOf(res?.data?.invoice) || idOf(res?.data?.data) || idOf(res?.data?.record) || idOf(res?.data?.item) || idOf(res?.invoice) || idOf(res);

function moneyNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = Number(String(value).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

const API = {
  dashboard: { jobs: "/jobs", clients: "/clients", invoices: "/invoices", quotes: "/quotes", workers: "/team/workers", actions: "/ai-operator/actions", activity: "/smart-hub/activity", notifications: "/notifications" },
  jobs: { jobs: "/jobs", workers: "/team/workers", invoices: "/invoices", actions: "/ai-operator/actions" },
  dispatch: { jobs: "/jobs", workers: "/team/workers", actions: "/ai-operator/actions" },
  clients: { clients: "/clients", jobs: "/jobs", quotes: "/quotes", invoices: "/invoices" },
  quotes: { quotes: "/quotes", clients: "/clients", jobs: "/jobs", actions: "/ai-operator/actions" },
  invoices: { invoices: "/invoices", jobs: "/jobs", clients: "/clients", actions: "/ai-operator/actions" },
  team: { workers: "/team/workers", jobs: "/jobs", actions: "/ai-operator/actions" },
  sms: { history: "/sms/history", invoices: "/invoices", clients: "/clients", actions: "/ai-operator/actions" },
  notifications: { notifications: "/notifications", actions: "/ai-operator/actions", jobs: "/jobs" },
  reports: { jobs: "/jobs", invoices: "/invoices", quotes: "/quotes", clients: "/clients" },
  integrations: { invoices: "/invoices", actions: "/ai-operator/actions" },
  payroll: { workers: "/team/workers", jobs: "/jobs", actions: "/ai-operator/actions" },
  automation: { actions: "/ai-operator/actions", jobs: "/jobs", invoices: "/invoices" },
  settings: { actions: "/ai-operator/actions" },
};

const PAGES = {
  dashboard: ["Command Floor", "Approve the work Churvox prepared."],
  jobs: ["Jobs", "Open work, completed work and job records."],
  dispatch: ["Worker Assignments", "Assign workers and close crew gaps."],
  clients: ["Clients", "Customer records and missing details."],
  quotes: ["Quotes", "Quote follow-up and quote records."],
  invoices: ["Invoices", "Invoice approval and cashflow."],
  team: ["Workers", "Crew, roles and worker status."],
  sms: ["Messages", "Customer communication."],
  notifications: ["Issues", "Risks, alerts and updates."],
  reports: ["Reports", "Completed work and money records."],
  integrations: ["Sync", "Connected tools and invoice sync."],
  payroll: ["Payroll", "Crew summaries and pay review."],
  automation: ["Automation", "Rules and AI prepared actions."],
  settings: ["Settings", "Business setup."],
};

const PAGE_GUIDES = {
  jobs: {
    eyebrow: "Job command records",
    title: "Use this when you need the full job list.",
    copy: "This page is for finding, opening and manually checking job records. Approvals should still happen from the Command Floor Work Slip so the owner sees the filled form, photos, price and next step together.",
    action: "Main action: open a job or create a new one.",
  },
  dispatch: {
    eyebrow: "Crew allocation",
    title: "Use this to close worker gaps.",
    copy: "This page shows jobs and crew records that may need assignment. Churvox should recommend workers in the Work Slip, but this area is the backup place to review dispatch manually.",
    action: "Main action: open a job and assign the right worker.",
  },
  clients: {
    eyebrow: "Customer records",
    title: "Use this for customer detail cleanup.",
    copy: "This page keeps customer names, emails, phone numbers and site details tidy. If a Work Slip is blocked by missing client info, fix the customer record here or inside the slip.",
    action: "Main action: open a client or add a new customer.",
  },
  quotes: {
    eyebrow: "Quote desk",
    title: "Use this to review quote records.",
    copy: "Quotes live here for manual review, follow-up and editing. Customer follow-up should stay approval-first: Churvox drafts it, the owner checks it, then it can be sent.",
    action: "Main action: open a quote or create a new quote.",
  },
  invoices: {
    eyebrow: "Money desk",
    title: "Use this to check invoices and cashflow.",
    copy: "This page is the manual money desk. Work Slips prepare invoices from approved jobs, and this page lets you inspect invoice records, totals and payment status.",
    action: "Main action: open an invoice, review value, then send/pay outside the slip flow when ready.",
  },
  team: {
    eyebrow: "Crew control",
    title: "Use this to manage people and roles.",
    copy: "This page is for workers, managers and role control. Job assignment decisions should still be reviewed through a Work Slip so conflicts and availability are clear.",
    action: "Main action: open worker details or invite crew.",
  },
  notifications: {
    eyebrow: "Issue feed",
    title: "Use this to see what needs attention.",
    copy: "This is a backup issue feed. Command Floor should show the important decisions first; this page helps you inspect alerts and admin risks manually.",
    action: "Main action: open the issue and fix the linked record.",
  },
  reports: {
    eyebrow: "Records overview",
    title: "Use this when you want a wider view.",
    copy: "Reports are for checking completed work and money records. They are not the approval flow; use Command Floor when a decision is needed.",
    action: "Main action: review completed work and invoice history.",
  },
  payroll: {
    eyebrow: "Payroll review",
    title: "Use this for crew time and pay review.",
    copy: "Payroll is for checking worker summaries and completed job time. Keep pricing, customer messages and invoice approval in the owner approval flow.",
    action: "Main action: review crew records and pay-related job history.",
  },
  settings: {
    eyebrow: "Business setup",
    title: "Use this to control how Churvox behaves.",
    copy: "Settings are for business setup, account details and app behaviour. Day-to-day admin should happen on Command Floor.",
    action: "Main action: check setup before live customer use.",
  },
};

function detailText(record, fallback = "") {
  return firstText(record?.owner_facing_explanation, record?.reason, record?.recommendation, record?.what_happens, record?.generated_message, record?.description, record?.job_description, record?.service_description, record?.scope, record?.completion_notes, record?.worker_completion_notes, record?.worker_notes, record?.job_notes, record?.notes, record?.admin_notes, record?.message, record?.address, fallback);
}

function reviewed(item) {
  const r = item?.raw || {};
  const s = low(r.work_review_status || r.review_status || r.owner_review_status || r.approval_status);
  return Boolean(r.reviewed || r.owner_approved || r.work_approved || r.job_approved || r.approved_at || ["approved", "reviewed", "accepted", "invoiced"].includes(s));
}

function invoiceLinked(item) {
  const r = item?.raw || {};
  return Boolean(r.invoice_id || r.draft_invoice_id || r.invoice_number || r.invoiced);
}

// CHURVOX_WORKER_COMPLETE_OWNER_SLIP_DETECTION_20260527
function resolvedJobStatus(record) {
  const rawStatus = low(record?.status || record?.job_status || record?.workflow_status || record?.work_status);
  if (
    rawStatus === "completed" ||
    rawStatus === "complete" ||
    rawStatus === "done" ||
    record?.completed === true ||
    Boolean(record?.completed_at) ||
    Boolean(record?.worker_completed_at)
  ) {
    return "completed";
  }
  if (rawStatus === "in progress") return "in_progress";
  return rawStatus;
}

async function patchWithFallback(api, endpoint, payload) {
  // CHURVOX_BIG_LAUNCH_FINISH_PATCH_FALLBACK_20260528
  const res = await api.patch(endpoint, payload);
  if (apiOk(res)) return res;

  const errorText = apiError(res, "");
  if (/405|method not allowed/i.test(errorText) && typeof api.put === "function") {
    const putRes = await api.put(endpoint, payload);
    if (apiOk(putRes)) return putRes;
  }

  const jobMatch = String(endpoint || "").match(/^\/jobs\/([^/]+)$/);
  if (jobMatch) {
    const fallbackRes = await api.patch(`/jobs/${jobMatch[1]}/work-slip-update`, payload);
    if (apiOk(fallbackRes)) return fallbackRes;
  }

  return res;
}

function item(type, record) {
  const id = idOf(record);
  const status = type === "job" ? resolvedJobStatus(record) : low(record?.status);
  const base = { type, id, raw: record, status, amount: 0, href: "#" };
  if (type === "job") {
    const assigned = firstText(record.assigned_worker_id, record.assigned_worker_name, record.worker_name, record.assigned_to);
    return { ...base, code: record.job_number || record.reference || `JOB-${id.slice(-4) || "000"}`, title: record.title || record.job_name || record.client_name || record.customer_name || "Job", meta: detailText(record, record.client_name || record.customer_name || "Job record"), state: !assigned ? "Unassigned" : record.status || "Job", amount: moneyNumber(record.price, record.job_price, record.fixed_price, record.total, record.amount, record.subtotal), href: id ? `/jobs/${id}` : "/jobs" };
  }
  if (type === "invoice") return { ...base, code: record.invoice_number || `INV-${id.slice(-4) || "000"}`, title: record.customer_name || record.client_name || "Invoice", meta: detailText(record, record.email || "Invoice record"), state: record.status || "Invoice", amount: moneyNumber(record.balance_due, record.balance, record.total, record.amount, record.subtotal), href: id ? `/invoices/${id}` : "/invoices" };
  if (type === "quote") return { ...base, code: record.quote_number || `QTE-${id.slice(-4) || "000"}`, title: record.title || record.customer_name || record.client_name || "Quote", meta: detailText(record, "Quote record"), state: record.status || "Quote", amount: moneyNumber(record.total, record.amount, record.price, record.subtotal), href: id ? `/quotes/${id}` : "/quotes" };
  if (type === "client") return { ...base, code: "CLIENT", title: record.name || record.client_name || record.customer_name || "Client", meta: firstText(record.email, record.phone, record.address, "Client record"), state: record.email && record.phone ? "Good" : "Missing details", href: id ? `/clients/${id}` : "/clients" };
  if (type === "worker") {
    const active = firstText(record.current_job_title, record.active_job_title, record.current_job_id, record.active_job_id);
    return { ...base, code: "WORKER", title: record.name || record.full_name || record.email || "Worker", meta: active ? `On site · ${active}` : (record.role || record.email || "Worker record"), state: active ? "On job" : "Available", href: "/team" };
  }
  return { ...base, code: type === "alert" ? "ISSUE" : "AI ACTION", title: record.title || record.summary || record.subject || "Prepared action", meta: detailText(record, "Prepared for review."), state: record.status || "Review", href: record.target_url || record.url || "#" };
}

function build(data) {
  const jobs = arr(data.jobs).map((x) => item("job", x));
  const invoices = arr(data.invoices).map((x) => item("invoice", x));
  const quotes = arr(data.quotes).map((x) => item("quote", x));
  const clients = arr(data.clients).map((x) => item("client", x));
  const crew = arr(data.workers).map((x) => item("worker", x));
  const actions = arr(data.actions).map((x) => item("action", x));
  const alerts = arr(data.notifications).map((x) => item("alert", x));
  const messages = arr(data.history).map((x) => item("message", x));
  const activity = arr(data.activity).map((x) => item("activity", x));

  const doneJobs = jobs.filter((x) => ["completed", "complete", "done"].includes(x.status));
  const approved = doneJobs.filter((x) => reviewed(x));
  const workReview = doneJobs.filter((x) => !reviewed(x)).map((x) => ({
    // CHURVOX_OWNER_REVIEW_CLEAR_LABELS_20260527
    ...x,
    type: "work_review",
    state: "Ready for owner review",
    meta: `${x.meta} · worker finished · check notes, price and optional photos`,
  }));
  const readyInvoice = approved.filter((x) => !invoiceLinked(x));
  const openJobs = jobs.filter((x) => !["completed", "complete", "done", "cancelled"].includes(x.status));
  const active = jobs.filter((x) => ["in_progress", "in progress", "started", "paused"].includes(x.status));
  const unassigned = jobs.filter((x) => x.state === "Unassigned");
  const owing = invoices.filter((x) => ["sent", "open", "unpaid", "overdue"].includes(x.status));
  const overdue = invoices.filter((x) => x.status === "overdue");
  const draftInvoices = invoices.filter((x) => ["draft", "pending", ""].includes(x.status));
  const quoteFollow = quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status));
  const clientWatch = clients.filter((x) => x.state === "Missing details");
  const invoiceActions = [...readyInvoice, ...draftInvoices, ...owing];
  const workerActions = [...unassigned, ...openJobs.filter((x) => !active.includes(x))];
  const messageActions = [...actions, ...quoteFollow, ...messages].slice(0, 20);
  const issues = [...overdue, ...clientWatch, ...alerts, ...jobs.filter((x) => !moneyNumber(x.amount) && ["completed", "complete", "done"].includes(x.status))];
  const live = [...active, ...crew].slice(0, 8);
  const done = [...doneJobs, ...invoices.filter((x) => ["paid", "complete", "completed"].includes(x.status))];
  const urgent = [...workReview, ...invoiceActions, ...workerActions, ...messageActions, ...issues];

  return { jobs, invoices, quotes, clients, crew, actions, alerts, messages, activity, doneJobs, approved, approvedValue: sum(approved), workReview, readyInvoice, openJobs, active, unassigned, owing, overdue, draftInvoices, quoteFollow, clientWatch, invoiceActions, workerActions, messageActions, issues, live, done, urgent };
}

function useLive(area, get) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const endpoints = API[area] || API.dashboard;
  const load = useCallback(async () => {
    setLoading(true);
    const next = {};
    await Promise.all(Object.entries(endpoints).map(async ([key, url]) => {
      try {
        const response = await get(url);
        next[key] = response?.data ?? response?.[key] ?? response ?? [];
      } catch {
        next[key] = [];
      }
    }));
    setData(next);
    setLoading(false);
  }, [get, endpoints]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

function makeGroup(title, meta, items, tone = "blue", actionLabel = "Open action") {
  return { type: "action_group", title, code: "APPROVAL LANE", state: `${items.length} waiting`, meta, items, tone, actionLabel, amount: sum(items), href: "#" };
}

function TopBar({ loading }) {
  return <header className="xcf-topbar"><Link className="xcf-brand" to="/dashboard"><i>CV</i><span><b>Churvox</b><small>AI Operator</small></span></Link><div className="xcf-search">Search jobs, clients, invoices...</div><nav><Link to="/dashboard">Command Floor</Link><Link to="/jobs/new">+ New</Link><Link to="/invoices">Money</Link></nav><strong className={loading ? "syncing" : "live"}>{loading ? "Syncing" : "Live"}</strong></header>;
}

function BottomNav() {
  // CHURVOX_LAUNCH_READY_BOTTOM_NAV_20260527
  const links = [
    ["/dashboard", "Command"],
    ["/jobs", "Jobs"],
    ["/team", "Crew"],
    ["/clients", "Clients"],
    ["/invoices", "Money"],
    ["/quotes", "Quotes"],
  ];
  return <nav className="xcf-bottom-nav">{links.map(([href, label]) => <Link key={href} to={href}>{label}</Link>)}</nav>;
}

function Metric({ label, value, note, tone, onClick }) {
  return <button className={`xcf-metric ${tone}`} type="button" onClick={onClick}><i /><span>{label}</span><b>{value}</b><small>{note}</small></button>;
}
function Row({ item: x, onPick }) {
  return <button className="xcf-row" type="button" onClick={(event) => { event.stopPropagation(); onPick(x); }}><i /><span><b>{x.title}</b><small>{x.code} · {x.meta}</small></span><em>{Number(x.amount || 0) > 0 ? cash(x.amount) : x.state}</em></button>;
}
function Empty({ text = "Nothing waiting here." }) { return <div className="xcf-empty">{text}</div>; }

function ApprovalLane({ title, eyebrow, description, value, note, tone, items, group, onPick, primary }) {
  return <section className={`xcf-card xcf-approval-lane xcf-lane-${tone}`}><header><span><small>{eyebrow}</small><b>{title}</b></span><strong>{value}</strong></header><p className="xcf-lane-description">{description}</p><button className="xcf-lane-primary" type="button" onClick={() => onPick(group)}>{primary}</button><div className="xcf-list">{items.length ? items.slice(0, 4).map((x, i) => <Row key={`${title}-${x.type}-${x.id || i}`} item={x} onPick={onPick} />) : <Empty />}</div><small className="xcf-lane-note">{note}</small></section>;
}

// CHURVOX_OPERATOR_PROOF_HISTORY_PANEL_20260527
function OperatorProofHistory({ m, onPick }) {
  const prepared = Array.isArray(m.actions) ? m.actions : [];
  const history = Array.isArray(m.activity) ? m.activity : [];
  const blocked = prepared.filter((x) => low(x.status) === "blocked" || (Array.isArray(x.raw?.blockers) && x.raw.blockers.length));
  const safe = prepared.filter((x) => !blocked.includes(x));
  const proofItems = history.length ? history.slice(0, 5) : prepared.slice(0, 5);

  return <section className="xcf-operator-proof-panel">
    <div className="xcf-operator-proof-copy">
      <p>OPERATOR PROOF</p>
      <h2>Churvox shows the audit trail before you trust the automation.</h2>
      <span>Prepared actions, approvals, rejections, draft invoices and saved message drafts appear here so the owner can see what Churvox did and why.</span>
    </div>
    <div className="xcf-operator-proof-stats">
      <button type="button" onClick={() => onPick(makeGroup("Safe prepared actions", "Actions Churvox believes are ready for owner review.", safe, "green", "Open safe actions"))}><small>Safe</small><b>{safe.length}</b></button>
      <button type="button" onClick={() => onPick(makeGroup("Blocked actions", "Actions that need owner input before approval.", blocked, "red", "Open blocked actions"))}><small>Blocked</small><b>{blocked.length}</b></button>
      <button type="button" onClick={() => onPick(makeGroup("Recent proof history", "Recent Smart Hub / Operator activity.", proofItems, "blue", "Open proof history"))}><small>History</small><b>{proofItems.length}</b></button>
    </div>
    <div className="xcf-operator-proof-list">
      {proofItems.length ? proofItems.map((x, i) => (
        <button key={`${x.type}-${x.id || i}`} type="button" onClick={() => onPick(x)}>
          <span><b>{x.title}</b><small>{x.code} · {x.meta}</small></span>
          <em>{x.state || x.status || "Review"}</em>
        </button>
      )) : <div className="xcf-operator-proof-empty">No proof history yet. Approvals and prepared actions will appear here.</div>}
    </div>
  </section>;
}


function Dashboard({ m, loading, onPick }) {
  const workLane = makeGroup("Approve Work", "Finished jobs waiting for your approval. Check evidence, photos, notes and value before signing off.", m.workReview, "amber", "Open work approvals");
  const invoiceLane = makeGroup("Approve Invoices", "Approved work and invoice records waiting for invoice action.", m.invoiceActions, "green", "Open invoice actions");
  const workerLane = makeGroup("Assign Workers", "Jobs that need a worker or dispatch decision.", m.workerActions, "blue", "Open worker assignments");
  const messageLane = makeGroup("Approve Messages", "AI-prepared quote follow-ups, customer updates and reminders to review before sending.", m.messageActions, "purple", "Open message approvals");
  const issueLane = makeGroup("Fix Issues", "Missing price, missing customer details, overdue money or blocked admin work.", m.issues, "red", "Open issues");

  const controlLanes = [
    { key: "work", title: "Approve Work", eyebrow: "Crew finished work", description: "Jobs are ready for your sign-off. Open the Work Slip, check proof, notes, photos and price, then approve the move.", value: m.workReview.length, note: "finished jobs", tone: "amber", group: workLane, items: m.workReview, primary: "Open Work Slip" },
    { key: "money", title: "Approve Invoices", eyebrow: "Money waiting", description: "Churvox has surfaced the money lane. Review invoice-ready work before anything is sent or marked done.", value: cash(sum(m.invoiceActions)), note: `${m.readyInvoice.length} jobs ready`, tone: "green", group: invoiceLane, items: m.invoiceActions, primary: "Review Money" },
    { key: "crew", title: "Assign Workers", eyebrow: "Dispatch control", description: "Unassigned work needs a crew decision. Review availability, conflicts and the suggested next move.", value: m.workerActions.length, note: `${m.unassigned.length} unassigned`, tone: "blue", group: workerLane, items: m.workerActions, primary: "Assign Crew" },
    { key: "messages", title: "Approve Messages", eyebrow: "Customer updates", description: "Customer follow-ups are drafted, but nothing sends until you check the wording and approve it.", value: m.messageActions.length, note: "approval-first", tone: "purple", group: messageLane, items: m.messageActions, primary: "Review Drafts" },
    { key: "issues", title: "Fix Issues", eyebrow: "Blocked admin", description: "Missing prices, customer details and admin blockers are grouped here so work does not stall.", value: m.issues.length, note: "needs owner input", tone: "red", group: issueLane, items: m.issues, primary: "Clear Blockers" },
  ];

  const totalDecisions = m.workReview.length + m.invoiceActions.length + m.workerActions.length + m.messageActions.length + m.issues.length;
  const nextLane = controlLanes.find((lane) => Number(String(lane.value).replace(/[^0-9.-]/g, "")) > 0) || controlLanes[0];
  const nextAction = m.workReview.length ? "Approve finished work" : m.invoiceActions.length ? "Approve invoices" : m.workerActions.length ? "Assign workers" : m.messageActions.length ? "Approve messages" : m.issues.length ? "Fix issues" : "All clear";

  return (
    <main className="xcf-shell xcf-approval-desk xcf-control-tower" data-version="CHURVOX_PROPER_COMMAND_FLOOR_CONTROL_TOWER_20260529">
      <TopBar loading={loading} />

      <section className="xcf-control-hero">
        <div className="xcf-control-hero-main">
          <p>BUSINESS CONTROL TOWER</p>
          <h1>Command Floor</h1>
          <h2>Churvox is running the business lanes.</h2>
          <span>Work, money, crew, customer messages and blockers are organised into owner decisions. You stay in control: open the Work Slip, check the proof, approve what moves.</span>

          <div className="xcf-control-chips">
            <button type="button" onClick={() => onPick(nextLane.group)}>
              <b>{totalDecisions}</b>
              <span>actions prepared</span>
            </button>
            <button type="button" onClick={() => onPick(workLane)}>
              <b>{m.workReview.length}</b>
              <span>work slips ready</span>
            </button>
            <button type="button" onClick={() => onPick(invoiceLane)}>
              <b>{cash(sum(m.invoiceActions))}</b>
              <span>money waiting</span>
            </button>
            <button type="button" onClick={() => onPick(workerLane)}>
              <b>{m.live.length}</b>
              <span>crew / job records live</span>
            </button>
          </div>
        </div>

        <aside className="xcf-control-next">
          <small>NEXT OWNER DECISION</small>
          <h3>{nextAction}</h3>
          <p>{nextLane.description}</p>
          <div>
            <span>AI prepared</span>
            <span>Owner approves</span>
          </div>
          <button type="button" onClick={() => onPick(nextLane.group)}>Review now</button>
          <em>{totalDecisions} decisions waiting</em>
        </aside>
      </section>

      <section className="xcf-control-summary">
        {controlLanes.map((lane) => (
          <button key={lane.key} type="button" className={`xcf-control-metric ${lane.tone}`} onClick={() => onPick(lane.group)}>
            <i />
            <span>{lane.title}</span>
            <b>{lane.value}</b>
            <small>{lane.note}</small>
          </button>
        ))}
      </section>

      <section className="xcf-control-board">
        <div className="xcf-control-board-head">
          <p>TODAY'S OPERATING LANES</p>
          <h2>Churvox has sorted the day into decisions. Open a lane, inspect the slip, approve the move.</h2>
        </div>

        <div className="xcf-control-lanes">
          {controlLanes.map((lane) => (
            <article key={lane.key} className={`xcf-control-lane ${lane.tone}`}>
              <header>
                <small>{lane.eyebrow}</small>
                <h3>{lane.title}</h3>
                <strong>{lane.value}</strong>
              </header>
              <p>{lane.description}</p>
              <button type="button" onClick={() => onPick(lane.group)}>{lane.primary}</button>
              <div className="xcf-control-preview">
                {lane.items.length ? lane.items.slice(0, 3).map((item, index) => (
                  <button key={`${lane.key}-${item.id || index}`} type="button" onClick={() => onPick(item)}>
                    <span>
                      <b>{item.title}</b>
                      <small>{item.code} · {item.meta}</small>
                    </span>
                    <em>{item.state || "Review"}</em>
                  </button>
                )) : (
                  <div className="xcf-control-empty">
                    <b>Lane clear</b>
                    <small>Nothing waiting in this lane right now.</small>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <OperatorProofHistory m={m} onPick={onPick} />

      <section className="xcf-field-strip">
        <span><small>Field pulse</small><b>{m.live.length} crew/job records live</b></span>
        <button type="button" onClick={() => onPick(makeGroup("Field Pulse", "Live crew and active jobs. This is secondary information; approvals stay in the lanes above.", m.live, "cyan", "Open field pulse"))}>Open secondary info</button>
      </section>

      <BottomNav />
    </main>
  );
}

function Workspace({ area, m, loading, onPick }) {
  const [title, subtitle] = PAGES[area] || ["Workspace", "Simple workspace"];
  const guide = PAGE_GUIDES[area] || { eyebrow: "Manual workspace", title: "Use this as a backup record page.", copy: "Command Floor stays the main approval flow. This backup page is for finding records, checking details, and making manual changes when needed.", action: "Main action: open a record and inspect it." };
  const rowsByArea = { jobs: m.jobs, dispatch: m.workerActions, clients: m.clients, quotes: m.quotes, invoices: m.invoices, team: m.crew, sms: m.messages, notifications: [...m.alerts, ...m.issues], reports: m.done, integrations: m.invoices, payroll: [...m.crew, ...m.doneJobs], automation: m.actions, settings: m.issues };
  const rows = rowsByArea[area] || m.actions;
  return <main className={`xcf-shell xcf-workspace xcf-workspace-${area}`} data-version="CHURVOX_MANUAL_PAGE_GUIDE_PANELS_20260527 CHURVOX_BACKUP_PAGE_LAUNCH_POLISH_20260527"><TopBar loading={loading} /><section className="xcf-hero xcf-workspace-hero"><div><p>Backup record page</p><h1>{title}</h1><span>{subtitle}. Use Command Floor for approvals. This page is here when you need to find or check records manually.</span></div><aside className="xcf-workspace-guide"><small>{guide.eyebrow}</small><b>{guide.title}</b><em>{guide.copy}</em><strong>{guide.action}</strong><span>{rows.length} records loaded</span></aside></section><section className="xcf-workspace-list">{rows.length ? rows.slice(0, 40).map((x, i) => <Row key={`${area}-${i}`} item={x} onPick={onPick} />) : <Empty />}</section><BottomNav /></main>;
}

function invoicePayloadFromPicked(picked, draft) {
  const raw = picked?.raw || {};
  const customer = firstText(draft?.customer_name, raw.customer_name, raw.client_name, raw.name, raw.contact_name, picked?.title);
  const address = firstText(draft?.site_address, raw.address, raw.site_address, raw.job_address, raw.service_address, raw.location);
  const description = firstText(draft?.invoice_description, raw.ai_invoice_description, raw.invoice_description_draft, raw.completion_notes, raw.worker_completion_notes, raw.worker_notes, raw.job_notes, raw.notes, raw.description, draft?.meta, picked?.meta, `${picked?.title || "Service work"} completed${customer ? ` for ${customer}` : ""}${address ? ` at ${address}` : ""}.`);
  const subtotal = moneyNumber(draft?.amount, picked?.amount, raw.subtotal, raw.total, raw.amount, raw.price, raw.job_price, raw.fixed_price, raw.hourly_total);
  if (!customer) return { ok: false, error: "Need a customer name before Churvox can prepare an invoice." };
  if (!description) return { ok: false, error: "Need an invoice description before Churvox can prepare an invoice." };
  if (!subtotal) return { ok: false, error: "Need a job price or subtotal before Churvox can prepare an invoice." };
  return { ok: true, data: { client_id: firstText(raw.client_id, raw.customer_id) || null, customer_name: customer, customer_email: firstText(raw.customer_email, raw.client_email, raw.email), address, description, subtotal, gst_rate: moneyNumber(raw.gst_rate) || 15, notes: firstText(raw.invoice_notes, `Prepared by Churvox Command Floor from ${picked?.code || "work slip"}. Review before sending.`) } };
}

async function runRecordAction(action, picked, draft, api, reload) {
  if (!picked || picked.type === "action_group") return "Open a record inside the slip first.";
  const id = picked.id;
  if (!id && ["save", "approve", "reject", "invoice", "assign", "message"].includes(action)) return "This record has no saved ID yet.";
  const titlePayload = { title: draft.title, job_name: draft.title, customer_name: draft.customer_name, client_name: draft.customer_name, address: draft.site_address, site_address: draft.site_address, service_type: draft.service_type, scheduled_date: draft.scheduled, description: draft.meta, status: draft.status, pricing_type: draft.pricing_type, price: draft.amount, job_price: draft.amount, worker_notes: draft.worker_notes, invoice_description_draft: draft.invoice_description, customer_message_draft: draft.message };
  try {
    if (picked.type === "action") {
      if (action === "approve") { const res = await api.post(`/ai-operator/actions/${id}/approve`, {}); if (apiOk(res)) { await reload(); return "AI action approved and executed."; } return `Could not approve AI action: ${apiError(res)}`; }
      if (action === "reject") { const res = await api.post(`/ai-operator/actions/${id}/reject`, {}); if (apiOk(res)) { await reload(); return "AI action rejected."; } return `Could not reject AI action: ${apiError(res)}`; }
      if (action === "message") return draft.message || firstText(picked.raw?.generated_message, picked.raw?.draft_message, "No drafted message saved for this AI action yet.");
      return "AI action is ready for approve or reject.";
    }
    if (action === "assign") {
      if (picked.type !== "job" && picked.type !== "work_review") return "Select a job before assigning a worker.";
      if (!draft.worker_id) return "Choose a worker first.";
      const res = await patchWithFallback(api, `/jobs/${id}`, { ...titlePayload, assigned_worker_id: draft.worker_id, assigned_worker_name: draft.worker_name, assigned_to: draft.worker_id, status: picked.raw?.status || draft.status || "assigned" });
      if (apiOk(res)) { await reload(); return `Assigned — ${draft.worker_name || "selected worker"} is now linked to this job.`; }
      return `Could not assign worker: ${apiError(res)}`;
    }
    if (action === "save") { const endpoint = picked.type === "invoice" ? `/invoices/${id}` : picked.type === "quote" ? `/quotes/${id}` : picked.type === "client" ? `/clients/${id}` : `/jobs/${id}`; const res = await patchWithFallback(api, endpoint, titlePayload); if (apiOk(res)) { await reload(); return "Saved — this Work Slip is up to date."; } return `Could not save: ${apiError(res)}`; }
    if (action === "approve") { if (picked.type === "invoice") { const res = await patchWithFallback(api, `/invoices/${id}`, { ...titlePayload, status: "approved" }); if (apiOk(res)) { await reload(); return "Invoice approved."; } return `Could not approve: ${apiError(res)}`; } if (picked.type !== "job" && picked.type !== "work_review") return "Only jobs, work reviews and invoices can be approved from this slip."; const res = await patchWithFallback(api, `/jobs/${id}`, {
      // CHURVOX_WORK_SLIP_STRONG_APPROVE_FLAGS_20260527
      ...titlePayload,
      owner_review_status: "approved",
      work_review_status: "approved",
      approval_status: "approved",
      command_floor_status: "approved",
      reviewed: true,
      owner_approved: true,
      work_approved: true,
      job_approved: true,
      approved_at: new Date().toISOString(),
    }); if (apiOk(res)) {
      // CHURVOX_WORK_APPROVED_LOCAL_NOTIFY_20260527
      try {
        await api.post("/notifications", {
          type: "work_approved",
          title: "Work approved",
          message: `${picked?.title || "Completed work"} was approved from the Work Slip.`,
          route: `/jobs/${id}`,
          target_type: "job",
          target_id: id,
        });
      } catch {}
      await reload();
      return "Work approved — ready for invoice/admin.";
    } return `Could not approve: ${apiError(res)}`; }
    if (action === "invoice") { // CHURVOX_WORK_SLIP_LINKED_DRAFT_INVOICE_20260527
      // CHURVOX_WORK_SLIP_INVOICE_FALLBACK_20260527
      if (picked.type !== "job" && picked.type !== "work_review") return "Select a job or work review item before preparing an invoice.";
      const payload = invoicePayloadFromPicked(picked, draft);
      if (!payload.ok) return payload.error;

      let res = await api.post(`/jobs/${id}/create-draft-invoice`, payload.data);

      if (!apiOk(res)) {
        const fallbackPayload = {
          ...payload.data,
          job_id: id,
          status: "draft",
          source: "command_floor_work_slip",
        };
        res = await api.post("/invoices", fallbackPayload);

        if (apiOk(res)) {
          const fallbackInvoiceId = recordIdFromResponse(res) || res?.data?.invoice_id || res?.data?.id || res?.id;
          if (fallbackInvoiceId) {
            await patchWithFallback(api, `/jobs/${id}`, {
              // CHURVOX_WORK_SLIP_STRONG_INVOICE_LINK_FLAGS_20260527
              draft_invoice_id: fallbackInvoiceId,
              invoice_id: fallbackInvoiceId,
              linked_invoice_id: fallbackInvoiceId,
              invoice_number: fallbackInvoiceId,
              invoice_prepared: true,
              invoiced: true,
              invoice_status: "draft",
              command_floor_status: "invoice_prepared",
              work_review_status: "invoiced",
              owner_review_status: "invoiced",
              invoice_prepared_at: new Date().toISOString(),
              invoice_description_draft: payload.data.description,
            });
          }
        }
      }

      if (!apiOk(res)) return `Could not prepare invoice: ${apiError(res)}`;
      const invoiceId = recordIdFromResponse(res) || res?.data?.invoice_id || res?.data?.id || res?.invoice_id || res?.id;
      await reload();
      return invoiceId ? `Draft invoice prepared and linked to this job. Open invoice lane to review: INV ${invoiceId}.` : "Draft invoice prepared and linked to this job. Open invoice lane to review.";
    }
    if (action === "message") { const message = draft.message; if (!message) return "No message draft to save."; const endpoint = picked.type === "invoice" ? `/invoices/${id}` : picked.type === "quote" ? `/quotes/${id}` : picked.type === "client" ? `/clients/${id}` : `/jobs/${id}`; const res = await patchWithFallback(api, endpoint, { customer_message_draft: message, draft_message: message, last_message_draft: message }); if (apiOk(res)) { await reload(); return "Message draft saved — nothing has been sent."; } return `Could not save message draft: ${apiError(res)}`; }
  } catch (err) { return `Action failed: ${err?.message || "unknown error"}`; }
  return "Action ready.";
}

export default function ConceptCPageExact({ area = "dashboard" }) {
  const api = useApi();
  const { get } = api;
  const { data, loading, reload } = useLive(area, get);
  const m = useMemo(() => build(data), [data]);
  const [picked, setPicked] = useState(null);
  const onAction = useCallback((action, record, draft) => runRecordAction(action, record, draft, api, reload), [api, reload]);
  return <>{area === "dashboard" ? <Dashboard m={m} loading={loading} onPick={setPicked} /> : <Workspace area={area} m={m} loading={loading} onPick={setPicked} />}<CommandFloorApprovalSlip picked={picked} onClose={() => setPicked(null)} onAction={onAction} onPick={setPicked} workers={m.crew} jobs={m.jobs} /></>;
}
