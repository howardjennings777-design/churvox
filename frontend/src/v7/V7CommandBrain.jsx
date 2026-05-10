import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bell,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ContactRound,
  CreditCard,
  FileText,
  Gauge,
  Hammer,
  Layers3,
  ListChecks,
  Loader2,
  LogOut,
  Menu,
  MessageSquareText,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import API_BASE from "../lib/apiBase";
import { useAuth } from "../context/AuthContext";
import "./v7.css";

const NAV = [
  { id: "brain", label: "Brain", sub: "AI runs today", icon: BrainCircuit },
  { id: "moves", label: "Moves", sub: "Approve actions", icon: Bot },
  { id: "work", label: "Work", sub: "Jobs + dispatch", icon: BriefcaseBusiness },
  { id: "cash", label: "Cash", sub: "Quotes + invoices", icon: Banknote },
  { id: "clients", label: "Clients", sub: "Context", icon: ContactRound },
  { id: "crew", label: "Crew", sub: "Team + payroll", icon: UsersRound },
  { id: "rules", label: "Rules", sub: "Automation", icon: Zap },
  { id: "numbers", label: "Numbers", sub: "Reports", icon: Gauge },
  { id: "setup", label: "Setup", sub: "Controls", icon: Settings },
];

const ROUTE_MAP = {
  dashboard: "brain",
  overview: "brain",
  smart: "brain",
  brain: "brain",
  ai: "moves",
  operator: "moves",
  decisions: "moves",
  approvals: "moves",
  moves: "moves",
  jobs: "work",
  work: "work",
  dispatch: "work",
  calendar: "work",
  clients: "clients",
  money: "cash",
  cash: "cash",
  quotes: "cash",
  invoices: "cash",
  sms: "cash",
  messages: "cash",
  team: "crew",
  crew: "crew",
  payroll: "crew",
  automation: "rules",
  rules: "rules",
  reports: "numbers",
  numbers: "numbers",
  settings: "setup",
  setup: "setup",
  integrations: "setup",
};

const routeFor = {
  brain: "/dashboard",
  moves: "/ai",
  work: "/work",
  cash: "/money",
  clients: "/clients",
  crew: "/team",
  rules: "/automation",
  numbers: "/reports",
  setup: "/settings",
};

const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.invoices)) return value.invoices;
  if (Array.isArray(value?.quotes)) return value.quotes;
  if (Array.isArray(value?.workers)) return value.workers;
  if (Array.isArray(value?.approvals)) return value.approvals;
  return [];
};

const idOf = (item) => item?.id || item?._id || item?.job_id || item?.invoice_id || item?.quote_id || item?.client_id || "";
const titleOf = (item, fallback = "Untitled") =>
  item?.title || item?.name || item?.customer_name || item?.client_name || item?.invoice_number || item?.quote_number || fallback;

const statusOf = (item) =>
  String(item?.status || item?.job_status || item?.workflow_status || "draft")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const completeJob = (job) => ["completed", "done", "closed"].includes(String(job?.status || job?.job_status || "").toLowerCase());
const noWorker = (job) => !job?.assigned_worker_id && !job?.worker_id && !job?.assigned_worker_name;
const openInvoice = (invoice) => !["paid", "cancelled", "canceled"].includes(String(invoice?.status || "").toLowerCase());

const nzMoney = (value) =>
  new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(value || 0));

function AppMark() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="v7-mark">
      <defs>
        <linearGradient id="v7Mark" x1="9" y1="8" x2="112" y2="112">
          <stop stopColor="#110C08" />
          <stop offset=".48" stopColor="#C4512D" />
          <stop offset=".76" stopColor="#6B4EFF" />
          <stop offset="1" stopColor="#F0C15B" />
        </linearGradient>
      </defs>
      <rect x="7" y="7" width="106" height="106" rx="30" fill="url(#v7Mark)" />
      <path d="M78 34a34 34 0 1 0 0 52" stroke="#FFF7E8" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M42 60h42" stroke="#F0C15B" strokeWidth="12" strokeLinecap="round" />
      <path d="M68 42l20 18-20 18" stroke="#7C6CFF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="91" cy="28" r="6" fill="#FFF7E8" />
    </svg>
  );
}

function Brand() {
  return (
    <div className="v7-brand">
      <AppMark />
      <div>
        <strong>Churvox</strong>
        <span>AI Business Brain</span>
      </div>
    </div>
  );
}

function Pill({ tone = "base", children }) {
  return <span className={`v7-pill v7-pill--${tone}`}>{children}</span>;
}

function Stat({ label, value, tone = "base", icon: Icon = Gauge, onClick }) {
  return (
    <button className={`v7-stat v7-stat--${tone}`} type="button" onClick={onClick}>
      <Icon size={18} />
      <strong>{value}</strong>
      <span>{label}</span>
    </button>
  );
}

function Drawer({ open, title, kicker, children, footer, onClose }) {
  if (!open) return null;
  return (
    <div className="v7-drawer-bg" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="v7-drawer" role="dialog" aria-modal="true">
        <header>
          <div>
            <p>{kicker}</p>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="v7-drawer-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </aside>
    </div>
  );
}

function RecordCard({ item, type, onOpen }) {
  const Icon =
    type === "invoice" ? ReceiptText :
    type === "quote" ? FileText :
    type === "client" ? ContactRound :
    type === "worker" ? UsersRound :
    Hammer;

  return (
    <button className="v7-record" type="button" onClick={() => onOpen({ mode: "record", type, item })}>
      <span className="v7-record-icon"><Icon size={18} /></span>
      <span className="v7-record-text">
        <strong>{titleOf(item, type)}</strong>
        <small>{item?.address || item?.customer_email || item?.email || item?.phone || item?.notes || "Tap to open details here"}</small>
      </span>
      <span className="v7-record-status">{statusOf(item)}</span>
    </button>
  );
}

function Panel({ eyebrow, title, action, children, className = "" }) {
  return (
    <section className={`v7-panel ${className}`}>
      <div className="v7-panel-head">
        <div>
          <p>{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ title, text, icon: Icon = Sparkles }) {
  return (
    <div className="v7-empty">
      <Icon size={28} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function useBrainData() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    data: { jobs: [], clients: [], invoices: [], quotes: [], workers: [], approvals: [] },
  });

  const refresh = async () => {
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const get = async (path) => {
      const response = await fetch(`${API_BASE}${path}`, { headers, credentials: "include" });
      if (!response.ok) throw new Error(path);
      return response.json();
    };

    const endpoints = [
      ["jobs", "/api/jobs"],
      ["clients", "/api/clients"],
      ["invoices", "/api/invoices"],
      ["quotes", "/api/quotes"],
      ["workers", "/api/team/workers"],
      ["approvals", "/api/ai/operator/approvals"],
    ];

    const settled = await Promise.allSettled(endpoints.map(([, path]) => get(path)));
    const data = { jobs: [], clients: [], invoices: [], quotes: [], workers: [], approvals: [] };
    let failed = false;

    settled.forEach((result, index) => {
      const key = endpoints[index][0];
      if (result.status === "fulfilled") data[key] = toList(result.value);
      else failed = true;
    });

    setState({
      loading: false,
      error: failed ? "One live source is still loading. The brain loaded the rest." : "",
      data,
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  return { ...state, refresh };
}

export default function V7CommandBrain() {
  const params = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { loading, error, data, refresh } = useBrainData();

  const [drawer, setDrawer] = useState(null);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [running, setRunning] = useState("");

  const pathArea = window.location.pathname.split("/").filter(Boolean)[0];
  const current = ROUTE_MAP[String(params.section || params.area || pathArea || "brain").toLowerCase()] || "brain";

  const go = (area) => {
    setNavOpen(false);
    navigate(routeFor[area] || "/dashboard");
  };

  const openJobs = data.jobs.filter((job) => !completeJob(job));
  const completedJobs = data.jobs.filter(completeJob);
  const unassignedJobs = data.jobs.filter(noWorker);
  const openInvoices = data.invoices.filter(openInvoice);
  const openInvoiceValue = openInvoices.reduce((sum, invoice) => sum + Number(invoice.total || invoice.subtotal || invoice.amount || 0), 0);
  const quoteFollowups = data.quotes.filter((quote) => ["draft", "sent"].includes(String(quote.status || "").toLowerCase()));

  const aiMoves = useMemo(() => {
    const moves = [];

    completedJobs.slice(0, 6).forEach((job) => {
      const hasInvoice = data.invoices.some((invoice) =>
        String(invoice.job_id || invoice.source_job_id || invoice.linked_job_id || "") === String(idOf(job))
      );

      if (!hasInvoice) {
        moves.push({
          id: `invoice-${idOf(job)}`,
          kind: "draft_invoice",
          tone: "cash",
          title: `Draft invoice for ${titleOf(job, "completed job")}`,
          summary: "Completed work has no matching invoice.",
          reason: "Churvox found a completed job that has not turned into an invoice yet. It can prepare the draft from job notes, client details and price.",
          outcome: "Turns finished work into billable cash.",
          item: job,
        });
      }
    });

    unassignedJobs.slice(0, 6).forEach((job) => {
      const worker = data.workers.find((person) => String(person.status || "active").toLowerCase() !== "inactive") || data.workers[0];

      moves.push({
        id: `assign-${idOf(job)}`,
        kind: "assign_worker",
        tone: "urgent",
        title: `Place crew on ${titleOf(job, "unassigned job")}`,
        summary: "Job is sitting without a worker.",
        reason: worker
          ? `${worker.name || worker.email || "A crew member"} is the first available crew match Churvox found. Owner approval is required before assignment.`
          : "No crew member is attached to this job yet. Churvox is flagging it before it slips.",
        outcome: "Keeps the run sheet moving.",
        item: job,
        worker,
      });
    });

    openInvoices.slice(0, 6).forEach((invoice) => {
      moves.push({
        id: `follow-${idOf(invoice)}`,
        kind: "invoice_followup",
        tone: "cash",
        title: `Prepare payment reminder for ${titleOf(invoice, "invoice")}`,
        summary: "Open invoice needs a clean follow-up.",
        reason: "Churvox found an open invoice. It can prepare a customer reminder for owner approval without sending anything automatically.",
        outcome: "Protects cashflow without sounding pushy.",
        item: invoice,
      });
    });

    quoteFollowups.slice(0, 5).forEach((quote) => {
      moves.push({
        id: `quote-${idOf(quote)}`,
        kind: "quote_followup",
        tone: "growth",
        title: `Follow up quote for ${titleOf(quote, "client")}`,
        summary: "Quote opportunity is still open.",
        reason: "Churvox found a quote that has not been accepted. It can draft a helpful follow-up.",
        outcome: "Keeps sales moving.",
        item: quote,
      });
    });

    data.approvals.slice(0, 5).forEach((approval, index) => {
      moves.push({
        id: approval.id || `approval-${index}`,
        kind: approval.type || "approval",
        tone: "brain",
        title: approval.title || approval.name || "AI approval ready",
        summary: approval.impact || "Prepared action",
        reason: approval.reason || approval.description || "Churvox prepared this action for owner review.",
        outcome: "Ready for owner approval.",
        item: approval,
      });
    });

    return moves.slice(0, 14);
  }, [completedJobs, unassignedJobs, openInvoices, quoteFollowups, data.invoices, data.workers, data.approvals]);

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;

    const hit = (type, items) =>
      items
        .filter((item) => JSON.stringify(item || {}).toLowerCase().includes(term))
        .slice(0, 6)
        .map((item) => ({ type, item }));

    return [
      ...hit("job", data.jobs),
      ...hit("client", data.clients),
      ...hit("invoice", data.invoices),
      ...hit("quote", data.quotes),
      ...hit("worker", data.workers),
    ].slice(0, 18);
  }, [query, data]);

  const openRecord = (payload) => {
    const { type, item } = payload;
    setDrawer({
      mode: "record",
      type,
      item,
      title: titleOf(item, type),
      kicker: statusOf(item),
    });
  };

  const openMove = (move) => {
    setDrawer({
      mode: "move",
      type: move.kind,
      item: move,
      title: move.title,
      kicker: "AI prepared move",
    });
  };

  const approveMove = async (move) => {
    setRunning(move.id);
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    try {
      if (move.kind === "draft_invoice") {
        const job = move.item || {};
        const payload = {
          job_id: idOf(job) || undefined,
          client_id: job.client_id || undefined,
          customer_name: job.customer_name || job.client_name || job.name || "Client",
          customer_email: job.customer_email || job.client_email || undefined,
          address: job.address || job.job_address || "",
          description: job.ai_invoice_description || job.invoice_description_draft || job.notes || `Work completed for ${titleOf(job, "job")}.`,
          subtotal: Number(job.price || job.total || job.subtotal || 0),
        };

        const response = await fetch(`${API_BASE}/api/invoices`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Could not create draft invoice.");
        await refresh();
        setDrawer({
          mode: "done",
          title: "Draft invoice created",
          kicker: "Approved",
          item: { message: "Churvox created the draft invoice. Open Cash to review it." },
        });
        return;
      }

      setDrawer({
        mode: "prepared",
        title: "Move approved",
        kicker: "Ready",
        item: {
          message: "This move is approved in the command sheet. Backend execution can be wired safely for this action without changing the layout.",
        },
      });
    } catch (err) {
      setDrawer({
        mode: "error",
        title: "Move could not run",
        kicker: "Needs review",
        item: { message: err.message || "This action could not run yet." },
      });
    } finally {
      setRunning("");
    }
  };

  const detailRows = Object.entries(drawer?.item || {})
    .filter(([key, value]) => !["item", "worker"].includes(key) && value !== "" && value !== null && value !== undefined)
    .slice(0, 18);

  const activeNav = NAV.find((item) => item.id === current) || NAV[0];

  return (
    <div className="v7-app">
      <aside className={`v7-rail ${navOpen ? "is-open" : ""}`}>
        <div className="v7-rail-top">
          <Brand />
          <button type="button" onClick={() => setNavOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <nav className="v7-nav" aria-label="Churvox navigation">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={current === item.id ? "active" : ""} type="button" onClick={() => go(item.id)}>
                <Icon size={20} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.sub}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="v7-operator-card">
          <div>
            <BrainCircuit size={22} />
            <strong>Operator mode</strong>
          </div>
          <p>{aiMoves.length ? `${aiMoves.length} moves prepared from live work, cash and crew data.` : "No urgent moves. Churvox is watching."}</p>
          <button type="button" onClick={() => go("moves")}>
            Review moves <ArrowRight size={16} />
          </button>
        </div>
      </aside>

      <main className="v7-main">
        <header className="v7-topbar">
          <button className="v7-menu" type="button" onClick={() => setNavOpen(true)}>
            <Menu size={22} />
          </button>

          <label className="v7-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the business or ask what needs doing..." />
          </label>

          <button className="v7-primary" type="button" onClick={() => setDrawer({ mode: "create", title: "Create from command", kicker: "Fast action", item: {} })}>
            <Plus size={18} /> Create
          </button>

          <button className="v7-brain-button" type="button" onClick={() => go("moves")}>
            <Bot size={18} /> {aiMoves.length}
          </button>

          <button className="v7-icon-button" type="button" onClick={refresh} aria-label="Refresh">
            <RefreshCw size={18} />
          </button>

          <button className="v7-icon-button" type="button" onClick={() => setDrawer({ mode: "profile", title: user?.name || "Profile", kicker: "Account", item: user || {} })} aria-label="Profile">
            <UserRound size={18} />
          </button>
        </header>

        {searchResults ? (
          <Panel eyebrow="Search" title={`${searchResults.length} live records found`} action={<button className="v7-soft-button" type="button" onClick={() => setQuery("")}>Clear</button>}>
            <div className="v7-record-stack">
              {searchResults.map((result, index) => (
                <RecordCard key={`${result.type}-${index}`} type={result.type} item={result.item} onOpen={openRecord} />
              ))}
            </div>
          </Panel>
        ) : (
          <>
            <section className="v7-hero">
              <div className="v7-hero-main">
                <p><activeNav.icon size={16} /> {activeNav.label}</p>
                <h1>Churvox runs the business brain. You approve the moves.</h1>
                <span>Jobs, money, clients and crew are read by AI in one cockpit. No old full-page maze. Tap anything and the full command sheet opens here.</span>
              </div>

              <div className="v7-core-card">
                <small>AI moves ready</small>
                <strong>{aiMoves.length}</strong>
                <span>waiting for owner approval</span>
              </div>
            </section>

            {error && (
              <div className="v7-sync">
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            {current === "brain" && (
              <div className="v7-layout">
                <Panel eyebrow="AI Command Stack" title="What Churvox wants to do next" className="v7-panel-dark">
                  <div className="v7-move-stack">
                    {loading ? (
                      <Empty icon={Loader2} title="Reading the business" text="Checking jobs, invoices, quotes, clients and crew." />
                    ) : aiMoves.length ? (
                      aiMoves.slice(0, 7).map((move, index) => (
                        <button className={`v7-move v7-move--${move.tone}`} key={move.id} type="button" onClick={() => openMove(move)}>
                          <span className="v7-move-number">{String(index + 1).padStart(2, "0")}</span>
                          <span className="v7-move-body">
                            <Pill tone={move.tone}>{move.summary}</Pill>
                            <strong>{move.title}</strong>
                            <small>{move.reason}</small>
                          </span>
                          <ChevronRight size={20} />
                        </button>
                      ))
                    ) : (
                      <Empty title="Brain is clear" text="No urgent work, cash or crew decision was detected." />
                    )}
                  </div>
                </Panel>

                <Panel eyebrow="Owner pulse" title="Business heartbeat">
                  <div className="v7-stat-grid">
                    <Stat label="Open jobs" value={openJobs.length} icon={BriefcaseBusiness} onClick={() => go("work")} />
                    <Stat label="Need crew" value={unassignedJobs.length} tone="urgent" icon={AlertTriangle} onClick={() => go("work")} />
                    <Stat label="Open cash" value={nzMoney(openInvoiceValue)} tone="cash" icon={CircleDollarSign} onClick={() => go("cash")} />
                    <Stat label="Clients" value={data.clients.length} icon={ContactRound} onClick={() => go("clients")} />
                  </div>
                </Panel>

                <Panel eyebrow="Live lane" title="Work Churvox is watching">
                  <div className="v7-record-stack">
                    {openJobs.slice(0, 6).map((job) => (
                      <RecordCard key={idOf(job) || titleOf(job)} type="job" item={job} onOpen={openRecord} />
                    ))}
                    {!openJobs.length && <Empty title="No open jobs" text="When work is added, Churvox starts building the run sheet." />}
                  </div>
                </Panel>
              </div>
            )}

            {current === "moves" && (
              <Panel eyebrow="AI Operator" title="Prepared moves for approval" className="v7-panel-dark">
                <div className="v7-move-grid">
                  {aiMoves.length ? aiMoves.map((move, index) => (
                    <button className={`v7-move v7-move--${move.tone}`} key={move.id} type="button" onClick={() => openMove(move)}>
                      <span className="v7-move-number">{String(index + 1).padStart(2, "0")}</span>
                      <span className="v7-move-body">
                        <Pill tone={move.tone}>{move.summary}</Pill>
                        <strong>{move.title}</strong>
                        <small>{move.reason}</small>
                      </span>
                      <ChevronRight size={20} />
                    </button>
                  )) : <Empty icon={Bot} title="No moves waiting" text="Churvox is watching for the next job, cash or crew move." />}
                </div>
              </Panel>
            )}

            {current === "work" && (
              <Panel eyebrow="Work command" title="Jobs, dispatch and proof" action={<button className="v7-primary" type="button" onClick={() => setDrawer({ mode: "create", title: "New job", kicker: "Fast action", item: {} })}><Plus size={17} /> Job</button>}>
                <div className="v7-wide-stats">
                  <Stat label="Open jobs" value={openJobs.length} icon={BriefcaseBusiness} />
                  <Stat label="Need crew" value={unassignedJobs.length} tone="urgent" icon={AlertTriangle} />
                  <Stat label="Completed" value={completedJobs.length} tone="good" icon={CheckCircle2} />
                </div>
                <div className="v7-record-stack">
                  {data.jobs.map((job) => <RecordCard key={idOf(job) || titleOf(job)} type="job" item={job} onOpen={openRecord} />)}
                </div>
              </Panel>
            )}

            {current === "cash" && (
              <Panel eyebrow="Cash command" title="Quotes, invoices and follow-up" action={<button className="v7-primary" type="button" onClick={() => setDrawer({ mode: "create", title: "New invoice", kicker: "Fast action", item: {} })}><Plus size={17} /> Invoice</button>}>
                <div className="v7-wide-stats">
                  <Stat label="Open invoice value" value={nzMoney(openInvoiceValue)} tone="cash" icon={CreditCard} />
                  <Stat label="Open invoices" value={openInvoices.length} icon={ReceiptText} />
                  <Stat label="Quote follow-ups" value={quoteFollowups.length} tone="urgent" icon={FileText} />
                </div>
                <div className="v7-two">
                  <div className="v7-record-stack">{data.invoices.map((invoice) => <RecordCard key={idOf(invoice)} type="invoice" item={invoice} onOpen={openRecord} />)}</div>
                  <div className="v7-record-stack">{data.quotes.map((quote) => <RecordCard key={idOf(quote)} type="quote" item={quote} onOpen={openRecord} />)}</div>
                </div>
              </Panel>
            )}

            {current === "clients" && (
              <Panel eyebrow="Client memory" title="Clients with live business context">
                <div className="v7-card-grid">
                  {data.clients.map((client) => <RecordCard key={idOf(client) || titleOf(client)} type="client" item={client} onOpen={openRecord} />)}
                  {!data.clients.length && <Empty icon={ContactRound} title="No clients loaded" text="Add clients so AI can connect jobs, quotes and invoices." />}
                </div>
              </Panel>
            )}

            {current === "crew" && (
              <Panel eyebrow="Crew command" title="Team, workload and payroll-ready time">
                <div className="v7-card-grid">
                  {data.workers.map((worker) => <RecordCard key={idOf(worker) || worker.email || worker.name} type="worker" item={worker} onOpen={openRecord} />)}
                  {!data.workers.length && <Empty icon={UsersRound} title="No crew loaded" text="Invite workers so AI can recommend assignments." />}
                </div>
              </Panel>
            )}

            {current === "rules" && (
              <Panel eyebrow="Automation brain" title="Rules that let AI run the admin">
                <div className="v7-rule-grid">
                  {[
                    ["Invoice after completion", "Draft invoice when a job is marked complete."],
                    ["Crew conflict warning", "Warn before assigning a busy worker."],
                    ["Cash follow-up", "Prepare overdue invoice reminders."],
                    ["Quote follow-up", "Prepare friendly quote follow-ups."],
                    ["Recurring work", "Build the next run sheet automatically."],
                    ["Proof alert", "Notify owner when job proof is uploaded."],
                    ["Missing details", "Find jobs or clients missing key info."],
                    ["Daily owner brief", "Prepare the morning business summary."],
                  ].map(([title, text]) => (
                    <button key={title} type="button" onClick={() => setDrawer({ mode: "rule", title, kicker: "AI rule", item: { title, text, control: "Approval-first" } })}>
                      <ListChecks size={20} />
                      <strong>{title}</strong>
                      <span>{text}</span>
                    </button>
                  ))}
                </div>
              </Panel>
            )}

            {current === "numbers" && (
              <Panel eyebrow="Numbers" title="Plain-English business performance">
                <div className="v7-wide-stats">
                  <Stat label="Completed jobs" value={completedJobs.length} tone="good" icon={CheckCircle2} />
                  <Stat label="Open invoice value" value={nzMoney(openInvoiceValue)} tone="cash" icon={CircleDollarSign} />
                  <Stat label="Clients" value={data.clients.length} icon={ContactRound} />
                  <Stat label="Crew" value={data.workers.length} icon={UsersRound} />
                </div>
              </Panel>
            )}

            {current === "setup" && (
              <Panel eyebrow="Control settings" title="Tell the brain what it can and cannot do">
                <div className="v7-rule-grid">
                  <button type="button" onClick={() => setDrawer({ mode: "setup", title: "Business profile", kicker: "Setup", item: {} })}>
                    <Settings size={20} />
                    <strong>Business profile</strong>
                    <span>Trade, area, defaults and brand.</span>
                  </button>
                  <button type="button" onClick={() => setDrawer({ mode: "setup", title: "MYOB and payments", kicker: "Setup", item: {} })}>
                    <CreditCard size={20} />
                    <strong>MYOB and payments</strong>
                    <span>Sync, invoice source and payment rules.</span>
                  </button>
                  <button type="button" onClick={() => setDrawer({ mode: "setup", title: "AI approval limits", kicker: "Setup", item: {} })}>
                    <ShieldCheck size={20} />
                    <strong>AI approval limits</strong>
                    <span>Control what AI prepares and what needs approval.</span>
                  </button>
                  <button type="button" onClick={() => setDrawer({ mode: "setup", title: "Customer messages", kicker: "Setup", item: {} })}>
                    <MessageSquareText size={20} />
                    <strong>Customer messages</strong>
                    <span>Templates for reminders and updates.</span>
                  </button>
                </div>
              </Panel>
            )}
          </>
        )}
      </main>

      <nav className="v7-tabs">
        {NAV.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={current === item.id ? "active" : ""} type="button" onClick={() => go(item.id)}>
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button className={current === "moves" ? "active" : ""} type="button" onClick={() => go("moves")}>
          <Bot size={19} />
          <span>AI</span>
        </button>
      </nav>

      <Drawer
        open={Boolean(drawer)}
        title={drawer?.title || "Details"}
        kicker={drawer?.kicker || "Command sheet"}
        onClose={() => setDrawer(null)}
        footer={
          drawer?.mode === "profile" ? (
            <button className="v7-danger" type="button" onClick={logout}><LogOut size={17} /> Log out</button>
          ) : drawer?.mode === "move" ? (
            <button className="v7-primary" type="button" onClick={() => approveMove(drawer.item)} disabled={running === drawer.item.id}>
              {running === drawer.item.id ? <Loader2 size={17} className="v7-spin" /> : <CheckCircle2 size={17} />} Approve move
            </button>
          ) : null
        }
      >
        {drawer?.mode === "move" && (
          <div className="v7-move-detail">
            <Pill tone={drawer.item.tone}>{drawer.item.summary}</Pill>
            <h3>{drawer.item.title}</h3>
            <p>{drawer.item.reason}</p>
            <div>
              <BrainCircuit size={20} />
              <span>{drawer.item.outcome}</span>
            </div>
            <small>Nothing is sent, assigned, charged, deleted or synced without owner approval.</small>
          </div>
        )}

        {drawer?.mode === "create" && (
          <div className="v7-move-detail">
            <Pill tone="brain">Fast command</Pill>
            <h3>Create without leaving the cockpit</h3>
            <p>V7 keeps creation inside this command sheet. Final job, client, quote and invoice forms plug in here without sending the owner into old full-page flows.</p>
          </div>
        )}

        {["done", "prepared", "error"].includes(drawer?.mode) && (
          <div className="v7-move-detail">
            <Pill tone={drawer.mode === "error" ? "urgent" : "good"}>{drawer.kicker}</Pill>
            <h3>{drawer.title}</h3>
            <p>{drawer.item?.message}</p>
          </div>
        )}

        {drawer && !["move", "create", "done", "prepared", "error"].includes(drawer.mode) && (
          <div className="v7-detail-grid">
            {Object.entries(drawer.item || {})
              .filter(([key, value]) => !["item", "worker"].includes(key) && value !== "" && value !== null && value !== undefined)
              .slice(0, 18)
              .map(([key, value]) => (
                <div key={key}>
                  <span>{key.replace(/_/g, " ")}</span>
                  <strong>{typeof value === "object" ? JSON.stringify(value).slice(0, 170) : String(value)}</strong>
                </div>
              ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
