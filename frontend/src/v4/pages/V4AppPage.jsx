import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bot, Briefcase, CheckCircle2, ChevronRight, ClipboardCheck, DollarSign, FileText, Hammer, Home, LogOut, MapPinned, MessageSquare, Plug, RefreshCw, Settings, ShieldCheck, Sparkles, Timer, Upload, UserPlus, Users, Wand2, X, Zap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { get } from "../../lib/api";
import { approveAiAction, loadAiOperatorQueue, prepareTodayWithAi, runAiDailyCheck } from "../../lib/aiOperator";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
const lower = (v) => String(v || "").toLowerCase();
const actionId = (a) => a?.id || a?._id || a?.action_id || a?.uuid;
const alias = { dashboard: "smart-hub", overview: "smart-hub", "smart-hub": "smart-hub", operator: "operator", decisions: "decisions", jobs: "jobs", dispatch: "dispatch", clients: "clients", quotes: "quotes", invoices: "invoices", team: "team", payroll: "payroll", rules: "rules", reports: "reports", messages: "messages", integrations: "integrations", settings: "settings" };

const nav = [
  ["smart-hub", "Smart Hub", Home, "Today first"],
  ["operator", "AI Operator", Bot, "Prepared admin"],
  ["decisions", "Decisions", Sparkles, "Approve work"],
  ["jobs", "Jobs", Briefcase, "Run sheet"],
  ["dispatch", "Dispatch", MapPinned, "Crew match"],
  ["clients", "Clients", Users, "Customers"],
  ["quotes", "Quotes", FileText, "Quote desk"],
  ["invoices", "Invoices", DollarSign, "Money board"],
  ["team", "Team", UserPlus, "Crew"],
  ["payroll", "Payroll", Timer, "Pay run"],
  ["rules", "Auto Rules", Zap, "Automation"],
  ["reports", "Reports", ClipboardCheck, "Insights"],
  ["messages", "Messages", MessageSquare, "AI drafts"],
  ["integrations", "Sync", Plug, "MYOB"],
  ["settings", "Settings", Settings, "Setup"],
];

function pickArray(payload, keys = []) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

const titleOf = (x, fallback = "Untitled") => x?.title || x?.name || x?.job_title || x?.client_name || x?.customer_name || x?.business_name || x?.invoice_number || x?.quote_number || x?.email || fallback;
const clientOf = (x) => x?.client_name || x?.customer_name || x?.client?.name || x?.customer?.name || x?.business_name || x?.email || "No client set";
const statusOf = (x, fallback = "open") => x?.status || x?.job_status || x?.workflow_status || x?.queue_status || fallback;
const hasWorker = (j) => Boolean(j?.assigned_worker_id || j?.worker_id || j?.assigned_to || j?.assigned_worker_name || j?.worker_name);
const isDone = (j) => ["completed", "done", "paid", "accepted"].includes(lower(statusOf(j))) || j?.completed === true || Boolean(j?.completed_at);
const hasProof = (j) => ["photos", "photo_urls", "proof_photos", "job_photos", "worker_photos", "completion_photos"].some((k) => Array.isArray(j?.[k]) ? j[k].length : Boolean(j?.[k]));
function dateOf(x) { const d = new Date(x?.scheduled_at || x?.scheduledAt || x?.due_date || x?.created_at || x?.updated_at || ""); return Number.isNaN(d.getTime()) ? "No date" : d.toLocaleDateString([], { month: "short", day: "numeric" }); }
function moneyOf(x) { const n = Number(x?.total || x?.amount || x?.balance_due || x?.price || x?.subtotal || 0); return n ? n.toLocaleString([], { style: "currency", currency: "NZD" }) : "—"; }
function initials(user) { return String(user?.name || user?.email || "CV").split(/[\s@.]+/).filter(Boolean).slice(0,2).map((p) => p[0]).join("").toUpperCase(); }


// AI_DECISION_COPY_START
const LONG_RAW_ID_RE = /\b(?:[a-f0-9]{20,}|\d{7,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi;

function cleanAiText(value, fallback = "") {
  let text = String(value || "")
    .replace(/\bJob\s+\d{7,}/gi, "job")
    .replace(/\bWorker\s+\d{7,}/gi, "worker")
    .replace(LONG_RAW_ID_RE, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();

  if (!text || text === "-" || /^\d+$/.test(text)) return fallback;
  return text;
}

function readNested(obj, paths = []) {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, key) => acc?.[key], obj);
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return "";
}

function cleanLabel(value, fallback) {
  const cleaned = cleanAiText(value, "");
  if (!cleaned || cleaned.length < 2) return fallback;
  return cleaned;
}

function titleCase(value) {
  return cleanAiText(value, "Prepared action")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function actionWorkerLabel(action) {
  return cleanLabel(
    readNested(action, [
      "worker_name",
      "recommended_worker_name",
      "assigned_worker_name",
      "crew_name",
      "worker.name",
      "recommended_worker.name",
      "payload.worker_name",
      "payload.recommended_worker_name",
      "payload.worker.name",
      "metadata.worker_name",
      "metadata.recommended_worker_name",
    ]),
    "the best available crew"
  );
}

function actionJobLabel(action) {
  return cleanLabel(
    readNested(action, [
      "job_title",
      "job_name",
      "service_type",
      "job.title",
      "job.name",
      "payload.job_title",
      "payload.job_name",
      "payload.job.title",
      "payload.service_type",
      "metadata.job_title",
      "metadata.job_name",
      "client_name",
      "customer_name",
      "address",
      "site_address",
    ]),
    "this job"
  );
}

function actionTypeLabel(action) {
  return titleCase(action?.action_type || action?.type || action?.module || "Owner decision");
}

function isCrewAssignmentAction(action) {
  const blob = lower(`${action?.action_type || ""} ${action?.type || ""} ${action?.module || ""} ${action?.title || ""} ${action?.summary || ""}`);
  return blob.includes("assign") || blob.includes("crew") || blob.includes("dispatch") || blob.includes("worker") || blob.includes("put crew");
}

function isInvoiceAction(action) {
  const blob = lower(`${action?.action_type || ""} ${action?.type || ""} ${action?.module || ""} ${action?.title || ""}`);
  return blob.includes("invoice") || blob.includes("money") || blob.includes("payment");
}

function isQuoteAction(action) {
  const blob = lower(`${action?.action_type || ""} ${action?.type || ""} ${action?.module || ""} ${action?.title || ""}`);
  return blob.includes("quote");
}

function preparedActionTitle(action) {
  const rawTitle = cleanAiText(action?.title || action?.name || "", "");

  if (isCrewAssignmentAction(action)) {
    return `Assign ${actionWorkerLabel(action)} to ${actionJobLabel(action)}`;
  }

  if (isInvoiceAction(action)) {
    return rawTitle || `Prepare invoice action for ${actionJobLabel(action)}`;
  }

  if (isQuoteAction(action)) {
    return rawTitle || `Prepare quote follow-up for ${actionJobLabel(action)}`;
  }

  return rawTitle || "Review prepared owner action";
}

function preparedActionCopy(action) {
  if (isCrewAssignmentAction(action)) {
    return `${actionWorkerLabel(action)} is the recommended match for ${actionJobLabel(action)}. Owner approval is required before Churvox changes anything.`;
  }

  const raw = cleanAiText(action?.summary || action?.description || action?.reason || "", "");
  return raw || "Churvox prepared this owner action. It will only run after you approve it.";
}

function preparedActionAnswer(action) {
  const worker = actionWorkerLabel(action);
  const job = actionJobLabel(action);

  if (isCrewAssignmentAction(action)) {
    return `I recommend assigning ${worker} to ${job}. This is the next clean move for the run sheet. When you tap approve, Churvox will make the assignment only. It will not send messages, create invoices, charge customers, delete records or sync anything without owner approval.`;
  }

  if (isInvoiceAction(action)) {
    return `I found an invoice-related admin move that looks ready for review. Approving lets Churvox prepare or update the invoice action only. Nothing is sent, charged, deleted or synced without owner approval.`;
  }

  if (isQuoteAction(action)) {
    return `I found a quote follow-up that looks ready for review. Approving lets Churvox prepare the next quote action only. Nothing is sent to the customer until the owner approves that step.`;
  }

  return `This is a prepared owner decision. I have kept it approval-first, so Churvox will not send, assign, charge, delete or sync anything until you approve the move.`;
}

function preparedActionReason(action) {
  return cleanAiText(
    action?.reason,
    "Prepared from current business data and waiting for owner approval."
  );
}

function toPreparedDecision(action) {
  return {
    kind: "action",
    kicker: actionTypeLabel(action),
    title: preparedActionTitle(action),
    copy: preparedActionCopy(action),
    answer: preparedActionAnswer(action),
    reason: preparedActionReason(action),
    raw: action,
    fullPath: "/v3/decisions",
    fields: [
      ["Type", actionTypeLabel(action)],
      ["Worker", isCrewAssignmentAction(action) ? actionWorkerLabel(action) : "Not needed"],
      ["Job", actionJobLabel(action)],
      ["Safety", "Owner approval required"],
    ],
  };
}
// AI_DECISION_COPY_END

function Empty({ title, copy }) { return <div className="v4-empty"><Hammer size={28}/><b>{title}</b><span>{copy}</span></div>; }
function Status({ value }) { const s = lower(value); const cls = s.includes("overdue") || s.includes("cancel") ? "danger" : s.includes("complete") || s.includes("paid") || s.includes("accept") ? "good" : s.includes("progress") || s.includes("sent") ? "blue" : s.includes("pause") ? "warn" : "neutral"; return <span className={`v4-status ${cls}`}>{value || "Open"}</span>; }

function DetailModal({ item, busy, onClose, onApprove, onOpenFull }) {
  if (!item) return null;
  return <div className="v4-modal-backdrop" onClick={onClose}><section className="v4-modal" onClick={(e) => e.stopPropagation()}>
    <header className="v4-modal-head"><div><span>{item.kicker}</span><h2>{item.title}</h2></div><button onClick={onClose} aria-label="Close"><X size={18}/></button></header>
    <p className="v4-modal-copy">{item.copy}</p>
    <div className="v4-detail-grid">{(item.fields || []).map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div>
    <div className="v4-ai-reason v4-ai-answer"><Bot size={20}/><div><small>AI answer</small><b>{item.answer || item.reason || "Churvox prepared this because it looks like the next useful business move."}</b></div></div>
    <footer className="v4-modal-actions">
      {item.kind === "action" ? <button className="v4-btn primary v4-approve-strong" disabled={busy} onClick={() => onApprove(item.raw)}>{busy ? "Approving…" : "Approve move"}</button> : null}
      {item.fullPath ? <button className="v4-btn secondary" onClick={() => onOpenFull(item.fullPath)}>Open full workspace</button> : null}
      <button className="v4-btn ghost" onClick={onClose}>Close</button>
    </footer>
  </section></div>;
}

function RecordCard({ item, type, onOpen }) {
  const title = titleOf(item, type);
  const copy = type === "invoice" || type === "quote" ? `${clientOf(item)} · ${moneyOf(item)}` : `${clientOf(item)} · ${dateOf(item)}`;
  return <button className="v4-list-card" onClick={() => onOpen({ kind: "record", kicker: type, title, copy, reason: "Open detail in a pop-up first so owners keep context. Full workspace is for editing.", fields: [["Status", statusOf(item)], ["Client", clientOf(item)], ["Date", dateOf(item)], ["Value", moneyOf(item)]], raw: item, fullPath: `/v3/${type === "invoice" ? "invoices" : type === "quote" ? "quotes" : type === "client" ? "clients" : type === "worker" ? "team" : "jobs"}` })}><div><b>{title}</b><span>{copy}</span></div><Status value={statusOf(item)}/></button>;
}

export default function V4AppPage({ initialSection = "smart-hub" }) {
  const params = useParams();
  const navigate = useNavigate();
  const { user, logout, normalizedRole } = useAuth();
  const section = alias[params.section || initialSection] || "smart-hub";
  const [activeSection, setActiveSection] = useState(section);
  const [state, setState] = useState({ jobs: [], quotes: [], invoices: [], clients: [], workers: [], actions: [] });
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiRunning, setAiRunning] = useState(false);
  const [busyActionId, setBusyActionId] = useState("");

  const role = lower(normalizedRole || user?.role || "owner");
  const visibleNav = useMemo(() => {
    if (role === "worker") return nav.filter(([k]) => ["jobs", "settings"].includes(k));
    if (role === "payroll") return nav.filter(([k]) => ["payroll", "reports", "settings"].includes(k));
    if (role === "office_admin") return nav.filter(([k]) => !["payroll", "settings"].includes(k));
    if (role === "manager") return nav.filter(([k]) => k !== "settings");
    return nav;
  }, [role]);

  async function load() {
    setLoading(true);
    try {
      const [queue, jobs, quotes, invoices, clients, workers] = await Promise.all([loadAiOperatorQueue(), get("/jobs"), get("/quotes"), get("/invoices"), get("/clients"), get("/team/workers")]);
      setState({ actions: queue.actions || [], jobs: pickArray(jobs,["jobs"]), quotes: pickArray(quotes,["quotes"]), invoices: pickArray(invoices,["invoices"]), clients: pickArray(clients,["clients"]), workers: pickArray(workers,["workers","team"]) });
      setNotice("");
    } catch { setNotice("Some live data could not load. Churvox is showing the safest available view."); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const pending = state.actions.filter((a) => ["pending", "edited", "needs_review", ""].includes(lower(a.status || a.queue_status)));
  const unassigned = state.jobs.filter((j) => !hasWorker(j) && !isDone(j));
  const completed = state.jobs.filter(isDone);
  const proofNeeded = completed.filter((j) => !hasProof(j) || j.ai_proof_review_needed);
  const money = state.invoices.filter((i) => ["draft", "sent", "overdue", "unpaid", "pending", ""].includes(lower(statusOf(i))));

  async function runAi(mode = "prepare") {
    setAiRunning(true);
    setNotice(mode === "prepare" ? "Churvox AI is preparing owner-approved actions…" : "Churvox AI is checking the business…");
    const result = mode === "prepare" ? await prepareTodayWithAi() : await runAiDailyCheck();
    if (result.ok) { setNotice(result.data?.message || "AI finished. Review Owner Decisions."); }
    else { setNotice(result.message || "AI could not run yet. Check Render/OpenAI settings."); }
    await load();
    setAiRunning(false);
  }

  async function approve(action) {
    const id = actionId(action);
    if (!id) { setNotice("This prepared action is missing an id, so it cannot be approved yet."); return; }
    setBusyActionId(id);
    const result = await approveAiAction(action);
    if (result.ok) { setNotice(result.data?.message || "Approved. Churvox completed the action."); setSelected(null); await load(); }
    else setNotice(result.message || "Approval failed. Nothing was changed.");
    setBusyActionId("");
  }

  const openSection = (key) => setActiveSection(key);
  const signOut = async () => { await logout(); navigate("/login", { replace: true }); };
  const prepared = pending.slice(0, 8).map((a) => toPreparedDecision(a));

  const SmartHub = () => <>
    <section className="v4-hero"><div className="v4-hero-main"><span className="v4-kicker"><Bot size={15}/> Churvox AI Operator</span><h1>Your AI trade command centre.</h1><p>Jobs, crew, quotes, invoices and follow-ups stay in one simple owner view. Churvox prepares the admin. You approve the move.</p><div className="v4-hero-actions"><button className="v4-btn primary" onClick={() => runAi("prepare")} disabled={aiRunning}><Wand2 size={18}/> {aiRunning ? "Preparing…" : "Prepare next moves"}</button><button className="v4-btn dark" onClick={() => runAi("check")} disabled={aiRunning}><RefreshCw size={18}/> Full business check</button><button className="v4-btn light" onClick={() => openSection("decisions")}>Review decisions</button></div></div><aside className="v4-next-card"><small>Next best move</small><b>{pending.length ? "Approve the first prepared action." : unassigned.length ? "Assign unassigned work." : proofNeeded.length ? "Check proof-to-paid." : "Run the AI check."}</b><span>Tap a card to inspect detail. Open the full workspace only when editing is needed.</span></aside></section>
    <section className="v4-metric-grid">{[["Owner decisions", pending.length, "Approve prepared AI work", Sparkles, "decisions"], ["Unassigned jobs", unassigned.length, "Match the right worker", MapPinned, "dispatch"], ["Proof-to-paid", proofNeeded.length, "Ready-to-invoice checks", CheckCircle2, "jobs"], ["Money moves", money.length, "Invoices and follow-ups", DollarSign, "invoices"]].map(([label, value, copy, Icon, target]) => <button className="v4-metric" key={label} onClick={() => openSection(target)}><Icon size={22}/><span>{label}</span><b>{loading ? "—" : value}</b><small>{copy}</small></button>)}</section>
    <section className="v4-board two"><article className="v4-panel"><div className="v4-panel-head"><div><small>Owner approval queue</small><h2>Prepared actions</h2></div><strong>{pending.length}</strong></div>{prepared.length ? prepared.map((item) => <button className="v4-decision" key={actionId(item.raw)} onClick={() => setSelected(item)}><span><Sparkles size={18}/></span><div><b>{item.title}</b><small>{item.copy}</small></div><ChevronRight size={18}/></button>) : <Empty title="No decisions waiting" copy="Run the AI check to prepare assignments, invoice drafts and follow-ups."/>}</article><article className="v4-panel"><div className="v4-panel-head"><div><small>Operator workflow</small><h2>AI does the prep. You stay in control.</h2></div><Bot size={25}/></div><div className="v4-flow-grid">{[[MapPinned,"Crew Match","Recommend the worker by area, workload, availability and fit.","dispatch"],[CheckCircle2,"Proof-to-Paid","Completed jobs checked for photos, time and invoice readiness.","jobs"],[DollarSign,"Money Board","Draft, chase and clear invoice actions from one place.","invoices"],[Zap,"Auto Rules","Safe admin runs automatically. Risky work stays approval-first.","rules"]].map(([Icon,title,copy,target]) => <button className="v4-flow" key={title} onClick={() => openSection(target)}><Icon size={20}/><b>{title}</b><span>{copy}</span></button>)}</div></article></section>
  </>;

  const Decisions = () => <section className="v4-panel full"><div className="v4-section-title"><small>Approval-first AI</small><h1>Owner Decisions</h1><p>Approve prepared actions here, then Churvox does the admin.</p></div>{prepared.length ? prepared.map((item) => <div className="v4-approval-row" key={actionId(item.raw)}><button onClick={() => setSelected(item)}><b>{item.title}</b><span>{item.copy}</span></button><button className="v4-btn primary v4-approve-strong" disabled={busyActionId === actionId(item.raw)} onClick={() => approve(item.raw)}>{busyActionId === actionId(item.raw) ? "Approving…" : "Approve move"}</button></div>) : <Empty title="No prepared actions" copy="Run the AI Operator from Smart Hub to create owner-approved actions."/>}</section>;
  const Records = ({ kind, title, kicker, copy, items, type }) => {
    const csvLabel = kind === "clients" ? "Import clients CSV" : kind === "team" ? "Import workers CSV" : "";
    return <section className="v4-panel full"><div className="v4-section-title"><small>{kicker}</small><h1>{title}</h1><p>{copy}</p></div>{csvLabel ? <div className="v4-modal-actions"><button className="v4-btn primary" onClick={() => navigate(`/v3/${kind}`)}><Upload size={18}/> {csvLabel}</button><button className="v4-btn secondary" onClick={() => navigate(`/v3/${kind}`)}>Open full {title} workspace</button></div> : null}<div className="v4-record-grid">{items.length ? items.slice(0, 24).map((item) => <RecordCard key={item.id || item._id || item.email || item.invoice_number || item.quote_number || titleOf(item)} item={item} type={type} onOpen={setSelected}/>) : <Empty title={`No ${title.toLowerCase()} loaded`} copy="When live data is available it will show here."/>}</div>{!csvLabel ? <button className="v4-btn secondary" onClick={() => navigate(`/v3/${kind}`)}>Open current full {title} workspace</button> : null}</section>;
  };
  const Dispatch = () => <section className="v4-board two"><Records kind="dispatch" title="Dispatch" kicker="AI Crew Match" copy="Unassigned work appears here so the owner can approve the best worker match." items={unassigned} type="job"/><Records kind="team" title="Crew" kicker="Available workers" copy="Workers, roles and readiness for dispatch." items={state.workers} type="worker"/></section>;
  const Simple = () => { const data = { operator:[Bot,"AI Operator","Prepared admin for the owner","Run checks, find admin gaps and prepare actions."], payroll:[Timer,"Payroll","Approved time and pay run review","Payroll stays locked down and approval-first."], rules:[Zap,"Auto Rules","Safe automation for repeat admin","Safe patterns can run. Risky changes need approval."], reports:[ClipboardCheck,"Reports","Owner insight without clutter","Track jobs, money, proof and workload."], messages:[MessageSquare,"Messages","AI drafted customer communication","Draft reminders and follow-ups before sending."], integrations:[Plug,"Sync","MYOB and external connections","Clear sync for invoices, payments and contacts."], settings:[Settings,"Settings","Business setup and preferences","Trade type, roles, plan and AI approval behaviour."] }[activeSection] || [ShieldCheck,"Workspace","Churvox workspace","This area uses the same V4 system."]; const [Icon,k,t,c]=data; return <section className="v4-panel full v4-placeholder"><Icon size={42}/><small>{k}</small><h1>{t}</h1><p>{c}</p><div><button className="v4-btn primary" onClick={() => runAi("prepare")} disabled={aiRunning}><Wand2 size={18}/> Prepare actions</button><button className="v4-btn secondary" onClick={() => navigate(`/v3/${activeSection}`)}>Open current full workspace</button></div></section>; };

  const content = activeSection === "smart-hub" ? <SmartHub/> : activeSection === "decisions" ? <Decisions/> : activeSection === "dispatch" ? <Dispatch/> : activeSection === "jobs" ? <Records kind="jobs" title="Jobs" kicker="AI Run Sheet" copy="All work with proof, worker and billing readiness." items={state.jobs} type="job"/> : activeSection === "clients" ? <Records kind="clients" title="Clients" kicker="Customers" copy="Clean customer base for jobs, quotes and invoices. Import your customer list from CSV in the full Clients workspace." items={state.clients} type="client"/> : activeSection === "quotes" ? <Records kind="quotes" title="Quotes" kicker="Quote Desk" copy="Draft, sent and follow-up quotes." items={state.quotes} type="quote"/> : activeSection === "invoices" ? <Records kind="invoices" title="Invoices" kicker="Money Board" copy="Draft, unpaid, overdue and paid invoices." items={state.invoices} type="invoice"/> : activeSection === "team" ? <Records kind="team" title="Team" kicker="Crew" copy="Workers, roles, workload and dispatch readiness. Import your team from CSV in the full Team workspace." items={state.workers} type="worker"/> : <Simple/>;

  return <div className="v4-app"><aside className="v4-sidebar"><button className="v4-brand" onClick={() => openSection("smart-hub")}><ChurvoxLogo dark size="lg" /></button><nav>{visibleNav.map(([key,label,Icon,hint]) => <button key={key} className={activeSection === key ? "active" : ""} onClick={() => openSection(key)}><Icon size={18}/><span><b>{label}</b><small>{hint}</small></span></button>)}</nav></aside><main className="v4-main"><header className="v4-topbar"><div><span>Churvox AI Trade OS</span><b>{nav.find(([k]) => k === activeSection)?.[1] || "Smart Hub"}</b></div><div className="v4-top-actions">{notice ? <em>{notice}</em> : null}<button onClick={load}><RefreshCw size={16}/> Refresh</button><button onClick={signOut}><LogOut size={16}/> Log out</button><div className="v4-user"><strong>{initials(user)}</strong><span>{user?.business_name || user?.email || "Churvox"}</span></div></div></header>{content}</main><nav className="v4-mobile-nav">{["smart-hub","decisions","jobs","dispatch","invoices"].map((key) => { const found = nav.find(([k]) => k === key); const Icon = found?.[2] || Home; return <button key={key} className={activeSection === key ? "active" : ""} onClick={() => openSection(key)}><Icon size={18}/><span>{found?.[1]}</span></button>; })}</nav><DetailModal item={selected} busy={!!busyActionId} onClose={() => setSelected(null)} onApprove={approve} onOpenFull={(path) => { setSelected(null); navigate(path); }}/></div>;
}
