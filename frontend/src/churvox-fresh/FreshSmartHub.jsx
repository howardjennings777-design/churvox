import React from "react";
import { useApi } from "../hooks/useApi";
import { loadBusinessSettings } from "../lib/businessSettings";

const LIVE_ENDPOINTS = { jobs: "/jobs", clients: "/clients", invoices: "/invoices", quotes: "/quotes", workers: "/team/workers", reviewItems: "/ai-review-items" };

function asArray(payload, key) { const data = payload?.data ?? payload; if (Array.isArray(data)) return data; if (Array.isArray(data?.items)) return data.items; if (Array.isArray(data?.results)) return data.results; if (Array.isArray(data?.[key])) return data[key]; if (Array.isArray(data?.jobs)) return data.jobs; if (Array.isArray(data?.clients)) return data.clients; if (Array.isArray(data?.invoices)) return data.invoices; if (Array.isArray(data?.quotes)) return data.quotes; if (Array.isArray(data?.workers)) return data.workers; if (Array.isArray(data?.reviewItems)) return data.reviewItems; return []; }
function lower(value) { return String(value || "").trim().toLowerCase(); }
function pick(record, ...keys) { for (const key of keys) { const value = record?.[key]; if (value !== undefined && value !== null && String(value).trim() !== "") return value; } return ""; }
function idText(value) { if (!value) return ""; if (typeof value === "string" || typeof value === "number") return String(value); if (typeof value === "object") return idText(value.$oid || value.oid || value.id || value._id || value.job_id || value.invoice_id || ""); const text = String(value || ""); return text === "[object Object]" ? "" : text; }
function recordId(record, ...keys) { for (const key of keys) { const text = idText(record?.[key]); if (text) return text; } return idText(record?.id || record?._id || record?.job_id || record?.invoice_id || ""); }
function isPaidInvoice(invoice) { return ["paid", "complete", "completed", "closed"].includes(lower(invoice?.status || invoice?.payment_status)); }
function amountOf(record) { if (isPaidInvoice(record)) return 0; const raw = record?.balance_due ?? record?.amount_due ?? record?.balance ?? record?.total ?? record?.amount ?? record?.price ?? record?.job_price ?? record?.fixed_price ?? 0; const n = Number(String(raw).replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? n : 0; }
function money(value) { return `$${Number(value || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`; }
function dateValue(record, ...keys) { const value = pick(record, ...keys); const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null; }
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function endOfToday() { const d = startOfToday(); d.setDate(d.getDate() + 1); return d; }
function isToday(date) { return Boolean(date && date >= startOfToday() && date < endOfToday()); }
function isPast(date) { return Boolean(date && date < startOfToday()); }
function timeText(date) { if (!date) return "No time set"; return date.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" }); }
function isCompletedJob(job) { return ["completed", "complete", "done", "finished"].includes(lower(job?.status || job?.job_status)); }
function isCancelledJob(job) { return ["cancelled", "canceled", "archived", "void"].includes(lower(job?.status || job?.job_status)); }
function isOverdueInvoice(invoice) { const status = lower(invoice?.status || invoice?.payment_status); if (status === "overdue") return true; if (isPaidInvoice(invoice)) return false; return isPast(dateValue(invoice, "due_date", "dueAt", "due", "payment_due")); }
function isDueTodayInvoice(invoice) { if (isPaidInvoice(invoice)) return false; return isToday(dateValue(invoice, "due_date", "dueAt", "due", "payment_due")); }
function invoiceJobId(invoice) { return recordId(invoice, "job_id", "linked_job_id", "jobId", "linkedJobId", "source_job_id", "sourceJobId"); }
function jobHasInvoice(job, invoicedJobIds = new Set()) { const directInvoice = Boolean(job?.invoice_id || job?.linked_invoice_id || job?.invoiceId || job?.linkedInvoiceId || job?.draft_invoice_id || job?.draftInvoiceId || job?.invoiced || job?.invoice_number || job?.invoice_status); const id = recordId(job, "id", "_id", "job_id"); return directInvoice || Boolean(id && invoicedJobIds.has(id)); }
function jobTitle(job) { return pick(job, "title", "job_name", "job_title", "service_type", "job_type", "description") || "Untitled job"; }
function clientName(record) { return pick(record, "client_name", "customer_name", "client", "customer", "name", "business_name") || "No client"; }
function jobAddress(job) { return pick(job, "address", "site_address", "service_address", "job_address") || "No address"; }
function jobWorker(job) { return pick(job, "worker", "worker_name", "assigned_worker_name", "assigned_worker", "assigned_to", "assigned_worker_id", "worker_id"); }
function quoteNeedsChase(quote) { return !["accepted", "approved", "won", "lost", "declined", "rejected", "cancelled"].includes(lower(quote?.status || quote?.quote_status)); }
function businessDetailsDone(settings = {}) { const hasName = Boolean(pick(settings, "business_name", "trading_name")); const hasContact = Boolean(pick(settings, "email", "phone")); const hasInvoiceDefaults = Boolean(pick(settings, "invoice_prefix")) && Number(settings?.default_gst_rate || 0) >= 0; return hasName && hasContact && hasInvoiceDefaults; }

function buildSetupSteps(data, businessSettings = {}) {
  const clients = data.clients || []; const workers = data.workers || []; const jobs = data.jobs || []; const invoices = data.invoices || []; const quotes = data.quotes || []; const settingsDone = businessDetailsDone(businessSettings);
  const steps = [
    { key: "settings", title: settingsDone ? "Business details set" : "Set business details", detail: settingsDone ? "Business name, contact details and invoice defaults are ready." : "Business name, GST, invoice defaults, branding and contact info.", page: "settings", done: settingsDone, primary: !settingsDone },
    { key: "imports", title: clients.length ? "Clients loaded" : "Import or add clients", detail: clients.length ? `${clients.length} client${clients.length === 1 ? "" : "s"} in Churvox.` : "Bring in clients from CSV or add your first customer.", page: clients.length ? "clients" : "imports", done: clients.length > 0 },
    { key: "team", title: workers.length ? "Team started" : "Add workers", detail: workers.length ? `${workers.length} worker${workers.length === 1 ? "" : "s"} ready or invited.` : "Invite workers or import your team before dispatching work.", page: "team", done: workers.length > 0 },
    { key: "jobs", title: jobs.length ? "First job created" : "Create first job", detail: jobs.length ? `${jobs.length} job${jobs.length === 1 ? "" : "s"} in the workflow.` : "Create a job, assign a worker and schedule the work.", page: "jobs", done: jobs.length > 0 },
    { key: "invoices", title: invoices.length ? "Invoice workflow started" : "Create first invoice", detail: invoices.length ? `${invoices.length} invoice${invoices.length === 1 ? "" : "s"} created.` : quotes.length ? "Convert accepted work or completed jobs into invoices." : "Once work is done, create the invoice and keep money visible.", page: "invoices", done: invoices.length > 0 },
  ];
  const openSteps = steps.filter((step) => !step.done); const nextStep = openSteps[0] || steps[steps.length - 1]; return { steps, nextStep, complete: openSteps.length === 0, completeCount: steps.length - openSteps.length };
}

function buildCoreFlow({ jobs = [], clients = [], invoices = [], quotes = [], workers = [], reviewItems = [] }) {
  const invoicedJobIds = new Set(invoices.map(invoiceJobId).filter(Boolean));
  const openJobs = jobs.filter((job) => !isCompletedJob(job) && !isCancelledJob(job));
  const completedJobs = jobs.filter((job) => isCompletedJob(job));
  const completedNeedInvoice = completedJobs.filter((job) => !jobHasInvoice(job, invoicedJobIds));
  const unpaidInvoices = invoices.filter((invoice) => !isPaidInvoice(invoice));
  const moneyWaiting = unpaidInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const unassignedOpenJobs = openJobs.filter((job) => !jobWorker(job));
  const openQuotes = quotes.filter(quoteNeedsChase);
  const clientsMissingDetails = clients.filter((client) => !pick(client, "email", "customer_email", "client_email") || !pick(client, "phone", "mobile", "customer_phone"));
  const stages = [
    { key: "clients", title: "Client", count: clients.length, detail: clientsMissingDetails.length ? `${clientsMissingDetails.length} need contact details` : "Client list ready", page: "clients", tone: clients.length ? "info" : "warn" },
    { key: "quote", title: "Quote", count: openQuotes.length, detail: openQuotes.length ? "open quote follow-up" : "quotes clear", page: "quotes", tone: openQuotes.length ? "warn" : "info" },
    { key: "job", title: "Job", count: openJobs.length, detail: unassignedOpenJobs.length ? `${unassignedOpenJobs.length} need worker` : "work moving", page: "jobs", tone: unassignedOpenJobs.length ? "warn" : "info" },
    { key: "proof", title: "Worker proof", count: completedJobs.length, detail: completedJobs.length ? "completed work logged" : "waiting on completed work", page: "workercommand", tone: completedJobs.length ? "info" : "" },
    { key: "invoice", title: "Invoice", count: completedNeedInvoice.length, detail: completedNeedInvoice.length ? "completed jobs need invoice" : "no invoice blockers", page: "invoices", tone: completedNeedInvoice.length ? "warn" : "info" },
    { key: "paid", title: "Paid", count: unpaidInvoices.length, detail: unpaidInvoices.length ? `${money(moneyWaiting)} waiting` : "nothing owing", page: "payments", tone: unpaidInvoices.length ? "danger" : "info" },
    { key: "review", title: "Accounting / payroll", count: reviewItems.length, detail: workers.length ? "review sync and payroll items" : "add team before payroll", page: reviewItems.length ? "command" : "xero", tone: reviewItems.length ? "warn" : "info" },
  ];
  const next = stages.find((stage) => ["warn", "danger"].includes(stage.tone)) || stages.find((stage) => stage.count === 0) || stages[2];
  return { stages, next, completedNeedInvoice, unpaidInvoices, moneyWaiting, openJobs, completedJobs };
}

function buildToday(data, businessSettings = {}) {
  const jobs = data.jobs || []; const clients = data.clients || []; const invoices = data.invoices || []; const quotes = data.quotes || []; const workers = data.workers || []; const reviewItems = data.reviewItems || [];
  const coreFlow = buildCoreFlow({ jobs, clients, invoices, quotes, workers, reviewItems });
  const invoicedJobIds = new Set(invoices.map(invoiceJobId).filter(Boolean));
  const openJobs = jobs.filter((job) => !isCompletedJob(job) && !isCancelledJob(job));
  const todayJobs = openJobs.filter((job) => isToday(dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date"))).sort((a, b) => (dateValue(a, "scheduled_date", "date", "start", "start_time")?.getTime() || 0) - (dateValue(b, "scheduled_date", "date", "start", "start_time")?.getTime() || 0));
  const unassignedToday = todayJobs.filter((job) => !jobWorker(job));
  const completedNeedInvoice = jobs.filter((job) => isCompletedJob(job) && !jobHasInvoice(job, invoicedJobIds));
  const overdueInvoices = invoices.filter(isOverdueInvoice); const dueTodayInvoices = invoices.filter(isDueTodayInvoice); const quotesToChase = quotes.filter(quoteNeedsChase); const clientsMissingDetails = clients.filter((client) => !pick(client, "email", "customer_email", "client_email") || !pick(client, "phone", "mobile", "customer_phone"));
  const activeCrew = workers.filter((worker) => ["on job", "onsite", "on site", "active", "working", "available"].includes(lower(worker?.status || worker?.availability || worker?.current_status)) || worker?.current_job_id);
  const needsDoing = [
    ...unassignedToday.map((job) => ({ type: "Worker needed", title: jobTitle(job), detail: `${clientName(job)} · ${timeText(dateValue(job, "scheduled_date", "date", "start", "start_time"))}`, page: "jobs", tone: "warn" })),
    ...overdueInvoices.map((invoice) => ({ type: "Overdue invoice", title: clientName(invoice), detail: `${money(amountOf(invoice))} overdue`, page: "invoices", tone: "danger" })),
    ...dueTodayInvoices.map((invoice) => ({ type: "Due today", title: clientName(invoice), detail: `${money(amountOf(invoice))} due today`, page: "invoices", tone: "warn" })),
    ...completedNeedInvoice.map((job) => ({ type: "Invoice needed", title: jobTitle(job), detail: `${clientName(job)} · completed job`, page: "jobs", tone: "info" })),
    ...reviewItems.map((item) => ({ type: "Review waiting", title: item?.title || item?.summary || "Prepared work", detail: item?.action || "Needs approval", page: "command", tone: "info" })),
  ].slice(0, 8);
  const overdueMoney = overdueInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0); const dueTodayMoney = dueTodayInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0); const setup = buildSetupSteps({ jobs, clients, invoices, quotes, workers }, businessSettings);
  let message = "Nothing urgent yet. Keep the day moving.";
  if (setup.completeCount < setup.steps.length) message = `${setup.nextStep.title}: ${setup.nextStep.detail}`;
  if (todayJobs.length && needsDoing.length) message = `You have ${todayJobs.length} job${todayJobs.length === 1 ? "" : "s"} today and ${needsDoing.length} thing${needsDoing.length === 1 ? "" : "s"} needing attention.`;
  else if (todayJobs.length) message = `You have ${todayJobs.length} job${todayJobs.length === 1 ? "" : "s"} today.`;
  else if (needsDoing.length) message = `${needsDoing.length} thing${needsDoing.length === 1 ? "" : "s"} need attention today.`;
  return { jobs, clients, invoices, quotes, workers, reviewItems, todayJobs, needsDoing, overdueInvoices, dueTodayInvoices, overdueMoney, dueTodayMoney, activeCrew, quotesToChase, clientsMissingDetails, setup, coreFlow, message };
}

function TodayJobCard({ job, onNavigate }) { const when = dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date"); const status = lower(job?.status || job?.job_status || "ready"); return <button type="button" className="freshTodayJobCard" onClick={() => onNavigate?.("jobs")}><b>{timeText(when)}</b><strong>{jobTitle(job)}</strong><span>{clientName(job)} · {jobAddress(job)}</span><small>{jobWorker(job) ? `Worker: ${jobWorker(job)}` : "Worker needed"} · {status || "ready"}</small></button>; }
function NeedCard({ item, onNavigate }) { return <button type="button" className={`freshTodayNeedCard ${item.tone || ""}`} onClick={() => onNavigate?.(item.page)}><span>{item.type}</span><b>{item.title}</b><small>{item.detail}</small></button>; }
function SetupStepCard({ step, onNavigate }) { return <button type="button" className={`freshTodayNeedCard ${step.done ? "info" : step.primary ? "warn" : ""}`} onClick={() => onNavigate?.(step.page)}><span>{step.done ? "Done" : "Next setup"}</span><b>{step.title}</b><small>{step.detail}</small></button>; }
function CoreStageCard({ stage, index, onNavigate }) { return <button type="button" className={`freshTodayNeedCard ${stage.tone || ""}`} onClick={() => onNavigate?.(stage.page)}><span>{index + 1}. {stage.title}</span><b>{stage.count}</b><small>{stage.detail}</small></button>; }

export default function FreshSmartHub({ onNavigate }) {
  const { get } = useApi();
  const [liveData, setLiveData] = React.useState({ jobs: [], clients: [], invoices: [], quotes: [], workers: [], reviewItems: [] });
  const [businessSettings, setBusinessSettings] = React.useState(() => loadBusinessSettings());
  const [loading, setLoading] = React.useState(true); const [syncError, setSyncError] = React.useState(""); const [lastSynced, setLastSynced] = React.useState("");
  const loadLiveData = React.useCallback(async () => { setLoading(true); setSyncError(""); const next = {}; const failedCore = []; await Promise.all(Object.entries(LIVE_ENDPOINTS).map(async ([key, endpoint]) => { try { const result = await get(endpoint, { timeout: 25000 }); if (!result?.success) { if (["jobs", "invoices"].includes(key)) failedCore.push(key); next[key] = []; return; } next[key] = asArray(result.data, key); } catch { if (["jobs", "invoices"].includes(key)) failedCore.push(key); next[key] = []; } })); setLiveData({ jobs: next.jobs || [], clients: next.clients || [], invoices: next.invoices || [], quotes: next.quotes || [], workers: next.workers || [], reviewItems: next.reviewItems || [] }); setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })); if (failedCore.length) setSyncError(`Could not load ${failedCore.join(", ")}.`); setLoading(false); }, [get]);
  React.useEffect(() => { loadLiveData(); }, [loadLiveData]);
  React.useEffect(() => { const refresh = () => loadLiveData(); const refreshSettings = () => setBusinessSettings(loadBusinessSettings()); window.addEventListener("churvox:fresh-data-updated", refresh); window.addEventListener("churvox-business-settings-updated", refreshSettings); window.addEventListener("focus", refresh); const timer = window.setInterval(refresh, 45000); return () => { window.removeEventListener("churvox:fresh-data-updated", refresh); window.removeEventListener("churvox-business-settings-updated", refreshSettings); window.removeEventListener("focus", refresh); window.clearInterval(timer); }; }, [loadLiveData]);
  const today = React.useMemo(() => buildToday(liveData, businessSettings), [liveData, businessSettings]);
  return <section className="freshSmartPage freshTodayPage">
    <div className="freshTodayHero"><div><span>Today</span><h1>Today</h1><p>{today.message}</p><div className="freshSmartSync"><b>{loading ? "Checking today..." : "Live data updated"}</b>{lastSynced ? <small>Updated {lastSynced}</small> : null}<button type="button" onClick={loadLiveData} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button></div>{syncError ? <p className="freshSmartError">{syncError}</p> : null}</div><div className="freshTodayHeroStats"><button type="button" onClick={() => onNavigate?.("jobs")}><b>{today.todayJobs.length}</b><small>Jobs today</small></button><button type="button" onClick={() => onNavigate?.("invoices")}><b>{money(today.dueTodayMoney)}</b><small>Due today</small></button><button type="button" onClick={() => onNavigate?.("invoices")}><b>{money(today.overdueMoney)}</b><small>Overdue</small></button><button type="button" onClick={() => onNavigate?.("command")}><b>{today.reviewItems.length}</b><small>Review</small></button></div></div>
    <article className="freshTodayPanel freshTodayPanel--core"><header><span>Core flow</span><h2>Job → Invoice → Paid → Review</h2><p>One board for the real Churvox workflow. Next best move: {today.coreFlow.next?.title} — {today.coreFlow.next?.detail}.</p></header><div className="freshTodayList">{today.coreFlow.stages.map((stage, index) => <CoreStageCard key={stage.key} stage={stage} index={index} onNavigate={onNavigate} />)}</div><div className="freshTodayMoneyRows"><button type="button" onClick={() => onNavigate?.("jobs")}><b>{today.coreFlow.completedNeedInvoice.length}</b><span>Need invoice</span></button><button type="button" onClick={() => onNavigate?.("payments")}><b>{money(today.coreFlow.moneyWaiting)}</b><span>Money waiting</span></button><button type="button" onClick={() => onNavigate?.("command")}><b>{today.reviewItems.length}</b><span>Owner review</span></button></div></article>
    <div className="freshTodayBriefGrid freshTodayBriefGrid--columns"><div className="freshTodayColumn freshTodayColumn--left"><article className="freshTodayPanel freshTodayPanel--setup"><header><span>Launch path</span><h2>Set up Churvox properly</h2><p>{today.setup.complete ? "Your core setup path is complete. Keep running the job-to-paid workflow." : `${today.setup.completeCount}/${today.setup.steps.length} launch steps complete. Next: ${today.setup.nextStep.title}.`}</p></header><div className="freshTodayList">{today.setup.steps.map((step) => <SetupStepCard key={step.key} step={step} onNavigate={onNavigate} />)}</div></article><article className="freshTodayPanel freshTodayPanel--jobs"><header><span>Jobs</span><h2>Jobs today</h2><p>Only work scheduled for today.</p></header><div className="freshTodayList">{loading && !today.todayJobs.length ? <div className="freshTodayEmpty">Checking jobs...</div> : today.todayJobs.length ? today.todayJobs.map((job, index) => <TodayJobCard key={recordId(job, "id", "_id") || index} job={job} onNavigate={onNavigate} />) : <div className="freshTodayEmpty">No jobs booked for today.</div>}</div></article><article className="freshTodayPanel freshTodayPanel--money"><header><span>Money</span><h2>Money to check</h2><p>Invoices due today, overdue money, and quotes still open.</p></header><div className="freshTodayMoneyRows"><button type="button" onClick={() => onNavigate?.("invoices")}><b>{money(today.dueTodayMoney)}</b><span>Due today</span></button><button type="button" onClick={() => onNavigate?.("invoices")}><b>{money(today.overdueMoney)}</b><span>Overdue</span></button><button type="button" onClick={() => onNavigate?.("quotes")}><b>{today.quotesToChase.length}</b><span>Quotes still open</span></button></div></article></div><div className="freshTodayColumn freshTodayColumn--right"><article className="freshTodayPanel freshTodayPanel--needs"><header><span>Needs doing</span><h2>What needs doing</h2><p>Only the jobs, money, and approvals that still need action.</p></header><div className="freshTodayList">{today.needsDoing.length ? today.needsDoing.map((item, index) => <NeedCard key={`${item.type}-${index}`} item={item} onNavigate={onNavigate} />) : <div className="freshTodayEmpty">No urgent blockers showing.</div>}</div></article></div></div>
  </section>;
}
