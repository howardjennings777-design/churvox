import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
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
const NAV = [
  { id: "brain", label: "Business Brain", sub: "AI control", icon: BrainCircuit },
  { id: "work", label: "Work Board", sub: "Jobs + dispatch", icon: BriefcaseBusiness },
  { id: "cash", label: "Cash Flow", sub: "Quotes + invoices", icon: Banknote },
  { id: "clients", label: "Clients", sub: "History + context", icon: ContactRound },
  { id: "crew", label: "Crew", sub: "Team + payroll", icon: UsersRound },
  { id: "rules", label: "Auto Rules", sub: "Business automation", icon: Zap },
  { id: "numbers", label: "Numbers", sub: "Reports", icon: Gauge },
  { id: "setup", label: "Setup", sub: "Settings", icon: Settings },
];

const ROUTE_MAP = {
  dashboard: "brain",
  overview: "brain",
  smart: "brain",
  brain: "brain",
  ai: "brain",
  operator: "brain",
  decisions: "brain",
  approvals: "brain",
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

const asList = (value) => {
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

const getId = (item) => item?.id || item?._id || item?.job_id || item?.invoice_id || item?.quote_id || item?.client_id || "";
const titleOf = (item, fallback = "Untitled") =>
  item?.title || item?.name || item?.customer_name || item?.client_name || item?.invoice_number || item?.quote_number || fallback;

const statusOf = (item) =>
  String(item?.status || item?.job_status || item?.workflow_status || "draft")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const isComplete = (job) => ["completed", "done", "closed"].includes(String(job?.status || job?.job_status || "").toLowerCase());
const isUnassigned = (job) => !job?.assigned_worker_id && !job?.worker_id && !job?.assigned_worker_name;
const isOpenInvoice = (invoice) => !["paid", "cancelled", "canceled"].includes(String(invoice?.status || "").toLowerCase());
const money = (amount) => new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(amount || 0));

function BrainLogo() {
  return (
    <div className="v6-logo">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <linearGradient id="v6LogoBg" x1="12" y1="8" x2="108" y2="112">
            <stop stopColor="#15110D" />
            <stop offset=".48" stopColor="#C4512D" />
            <stop offset="1" stopColor="#5B4DFF" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="104" height="104" rx="28" fill="url(#v6LogoBg)" />
        <path d="M78 34a34 34 0 1 0 0 52" stroke="#FFF7E8" strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M42 60h42" stroke="#F0C15B" strokeWidth="12" strokeLinecap="round" />
        <path d="M68 42l20 18-20 18" stroke="#7C6CFF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="91" cy="28" r="6" fill="#FFF7E8" />
      </svg>
      <div>
        <strong>Churvox</strong>
        <span>Business Brain</span>
      </div>
    </div>
  );
}

function Pill({ tone = "plain", children }) {
  return <span className={`v6-pill v6-pill--${tone}`}>{children}</span>;
}

function Metric({ label, value, tone = "plain", icon: Icon = Gauge, onClick }) {
  return (
    <button className={`v6-metric v6-metric--${tone}`} type="button" onClick={onClick}>
      <Icon size={18} />
      <strong>{value}</strong>
      <span>{label}</span>
    </button>
  );
}

function Drawer({ open, title, kicker, children, footer, onClose }) {
  if (!open) return null;

  return (
    <div className="v6-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="v6-drawer" role="dialog" aria-modal="true">
        <header>
          <div>
            <p>{kicker}</p>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="v6-drawer-body">{children}</div>
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
    <button className="v6-record" type="button" onClick={() => onOpen({ type, item })}>
      <span className="v6-record-icon"><Icon size={18} /></span>
      <span className="v6-record-main">
        <strong>{titleOf(item, type)}</strong>
        <small>{item?.address || item?.customer_email || item?.email || item?.phone || item?.notes || "Tap to open the command sheet"}</small>
      </span>
      <span className="v6-record-status">{statusOf(item)}</span>
    </button>
  );
}

function Panel({ eyebrow, title, action, children, className = "" }) {
  return (
    <section className={`v6-panel ${className}`}>
      <div className="v6-panel-head">
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
    <div className="v6-empty">
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
      if (result.status === "fulfilled") data[key] = asList(result.value);
      else failed = true;
    });

    setState({
      loading: false,
      error: failed ? "Live sync warning: one source did not answer. The brain still loaded the rest." : "",
      data,
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  return { ...state, refresh };
}

export default function V6BusinessBrain() {
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
    const paths = {
      brain: "/dashboard",
      work: "/work",
      cash: "/money",
      clients: "/clients",
      crew: "/team",
      rules: "/automation",
      numbers: "/reports",
      setup: "/settings",
    };
    navigate(paths[area] || "/dashboard");
  };

  const openJobs = data.jobs.filter((job) => !isComplete(job));
  const completedJobs = data.jobs.filter(isComplete);
  const unassignedJobs = data.jobs.filter(isUnassigned);
  const openInvoices = data.invoices.filter(isOpenInvoice);
  const openInvoiceValue = openInvoices.reduce((sum, invoice) => sum + Number(invoice.total || invoice.subtotal || invoice.amount || 0), 0);
  const quoteFollowups = data.quotes.filter((quote) => ["draft", "sent"].includes(String(quote.status || "").toLowerCase()));

  const brainMoves = useMemo(() => {
    const moves = [];

    completedJobs.slice(0, 5).forEach((job) => {
      const hasInvoice = data.invoices.some((invoice) =>
        String(invoice.job_id || invoice.source_job_id || invoice.linked_job_id || "") === String(getId(job))
      );

      if (!hasInvoice) {
        moves.push({
          id: `invoice-${getId(job)}`,
          kind: "draft_invoice",
          tone: "cash",
          strength: "High value",
          title: `Create draft invoice for ${titleOf(job, "completed job")}`,
          reason: "The job is complete and no matching invoice was found. Churvox can draft the invoice from job notes, client details and price.",
          impact: "Turns completed work into billable money.",
          item: job,
        });
      }
    });

    unassignedJobs.slice(0, 5).forEach((job) => {
      const worker = data.workers.find((person) => String(person.status || "active").toLowerCase() !== "inactive") || data.workers[0];
      moves.push({
        id: `assign-${getId(job)}`,
        kind: "assign_worker",
        tone: "urgent",
        strength: "Dispatch risk",
        title: `Assign worker to ${titleOf(job, "unassigned job")}`,
        reason: worker
          ? `${worker.name || worker.email || "A worker"} is the first available crew match found. Owner should approve before Churvox assigns.`
          : "No worker is attached to this job yet. Add or choose crew before it slips.",
        impact: "Keeps the run sheet moving.",
        item: job,
        worker,
      });
    });

    openInvoices.slice(0, 5).forEach((invoice) => {
      moves.push({
        id: `invoice-follow-${getId(invoice)}`,
        kind: "invoice_followup",
        tone: "cash",
        strength: "Cash follow-up",
        title: `Prepare reminder for ${titleOf(invoice, "open invoice")}`,
        reason: "This invoice is still open. Churvox can prepare a customer reminder for owner approval.",
        impact: "Protects cashflow without sounding pushy.",
        item: invoice,
      });
    });

    quoteFollowups.slice(0, 4).forEach((quote) => {
      moves.push({
        id: `quote-follow-${getId(quote)}`,
        kind: "quote_followup",
        tone: "growth",
        strength: "Sales follow-up",
        title: `Follow up quote for ${titleOf(quote, "client")}`,
        reason: "This quote has not been accepted yet. Churvox can draft a helpful follow-up.",
        impact: "Keeps work opportunities alive.",
        item: quote,
      });
    });

    data.approvals.slice(0, 4).forEach((approval, index) => {
      moves.push({
        id: approval.id || `approval-${index}`,
        kind: approval.type || "approval",
        tone: "brain",
        strength: approval.impact || "Prepared",
        title: approval.title || approval.name || "AI approval ready",
        reason: approval.reason || approval.description || "Churvox prepared this action for review.",
        impact: "Owner approval required.",
        item: approval,
      });
    });

    return moves.slice(0, 12);
  }, [completedJobs, unassignedJobs, openInvoices, quoteFollowups, data.invoices, data.workers, data.approvals]);

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;

    const find = (type, items) =>
      items
        .filter((item) => JSON.stringify(item || {}).toLowerCase().includes(term))
        .slice(0, 6)
        .map((item) => ({ type, item }));

    return [
      ...find("job", data.jobs),
      ...find("client", data.clients),
      ...find("invoice", data.invoices),
      ...find("quote", data.quotes),
      ...find("worker", data.workers),
    ].slice(0, 18);
  }, [query, data]);

  const openRecord = (payload) => {
    const type = payload.type;
    const item = payload.item;
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
      kicker: "AI Business Brain",
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
          job_id: getId(job) || undefined,
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
        setDrawer({ mode: "done", title: "Draft invoice created", kicker: "Approved", item: { message: "Churvox created the draft invoice. Review it from Cash Flow." } });
        return;
      }

      setDrawer({
        mode: "prepared",
        title: "Action prepared",
        kicker: "Owner approval",
        item: {
          message: "This action is prepared in the command sheet. The next backend execution step can be wired safely without changing the navigation.",
          move: move.title,
        },
      });
    } catch (error) {
      setDrawer({
        mode: "error",
        title: "Could not complete action",
        kicker: "Needs review",
        item: { message: error.message || "The action could not run yet." },
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
    <div className="v6-app">
      <aside className={`v6-rail ${navOpen ? "is-open" : ""}`}>
        <div className="v6-rail-head">
          <BrainLogo />
          <button type="button" onClick={() => setNavOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <nav className="v6-nav" aria-label="Business Brain navigation">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" className={current === item.id ? "active" : ""} onClick={() => go(item.id)}>
                <Icon size={20} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.sub}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="v6-brain-card">
          <div>
            <BrainCircuit size={21} />
            <strong>Brain status</strong>
          </div>
          <p>{brainMoves.length ? `${brainMoves.length} decisions prepared from live business data.` : "No urgent decisions detected right now."}</p>
          <button type="button" onClick={() => go("brain")}>Review brain</button>
        </div>
      </aside>

      <main className="v6-main">
        <header className="v6-topbar">
          <button className="v6-menu" type="button" onClick={() => setNavOpen(true)}>
            <Menu size={22} />
          </button>

          <label className="v6-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask or search the business..." />
          </label>

          <button className="v6-top-button" type="button" onClick={() => setDrawer({ mode: "create", title: "Create from command", kicker: "Fast action", item: {} })}>
            <Plus size={18} /> Create
          </button>

          <button className="v6-top-button v6-top-button--brain" type="button" onClick={() => go("brain")}>
            <Bot size={18} /> {brainMoves.length}
          </button>

          <button className="v6-icon-button" type="button" onClick={refresh} aria-label="Refresh">
            <RefreshCw size={18} />
          </button>

          <button className="v6-icon-button" type="button" onClick={() => setDrawer({ mode: "profile", title: user?.name || "Profile", kicker: "Account", item: user || {} })} aria-label="Profile">
            <UserRound size={18} />
          </button>
        </header>

        {searchResults ? (
          <Panel
            eyebrow="Business search"
            title={`${searchResults.length} matching records`}
            action={<button className="v6-light-button" type="button" onClick={() => setQuery("")}>Clear</button>}
          >
            <div className="v6-record-stack">
              {searchResults.map((result, index) => (
                <RecordCard key={`${result.type}-${index}`} type={result.type} item={result.item} onOpen={openRecord} />
              ))}
            </div>
          </Panel>
        ) : (
          <>
            <section className="v6-hero">
              <div className="v6-hero-copy">
                <p><activeNav.icon size={16} /> {activeNav.label}</p>
                <h1>The AI business brain that runs the admin before you ask.</h1>
                <span>Churvox watches jobs, crew, clients and cashflow. It prepares the next move, explains why, and waits for owner approval.</span>
              </div>
              <div className="v6-hero-core">
                <small>Brain decisions</small>
                <strong>{brainMoves.length}</strong>
                <span>ready for approval</span>
              </div>
            </section>

            {error && (
              <div className="v6-sync-note">
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            {current === "brain" && (
              <div className="v6-brain-layout">
                <Panel eyebrow="AI priority stack" title="The next moves Churvox prepared" className="v6-panel--brain">
                  <div className="v6-move-stack">
                    {loading ? (
                      <Empty icon={Loader2} title="Brain is reading the business" text="Checking jobs, invoices, quotes, clients and crew." />
                    ) : brainMoves.length ? (
                      brainMoves.slice(0, 6).map((move) => (
                        <button className={`v6-move v6-move--${move.tone}`} key={move.id} type="button" onClick={() => openMove(move)}>
                          <span className="v6-move-stripe" />
                          <div>
                            <Pill tone={move.tone}>{move.strength}</Pill>
                            <h3>{move.title}</h3>
                            <p>{move.reason}</p>
                            <small>{move.impact}</small>
                          </div>
                          <ChevronRight size={20} />
                        </button>
                      ))
                    ) : (
                      <Empty title="Brain is clear" text="No urgent work, cash or crew decision was detected." />
                    )}
                  </div>
                </Panel>

                <Panel eyebrow="Owner pulse" title="What matters today">
                  <div className="v6-metrics">
                    <Metric label="Open jobs" value={openJobs.length} icon={BriefcaseBusiness} onClick={() => go("work")} />
                    <Metric label="Need worker" value={unassignedJobs.length} tone="urgent" icon={AlertTriangle} onClick={() => go("work")} />
                    <Metric label="Open cash" value={money(openInvoiceValue)} tone="cash" icon={CircleDollarSign} onClick={() => go("cash")} />
                    <Metric label="Clients" value={data.clients.length} icon={ContactRound} onClick={() => go("clients")} />
                  </div>
                </Panel>

                <Panel eyebrow="Run sheet" title="Jobs moving now">
                  <div className="v6-record-stack">
                    {openJobs.slice(0, 6).map((job) => (
                      <RecordCard key={getId(job) || titleOf(job)} type="job" item={job} onOpen={openRecord} />
                    ))}
                    {!openJobs.length && <Empty title="No open jobs" text="When work is added, Churvox will start building the run sheet." />}
                  </div>
                </Panel>
              </div>
            )}

            {current === "work" && (
              <Panel
                eyebrow="Work board"
                title="Jobs, dispatch and proof"
                action={<button className="v6-primary" type="button" onClick={() => setDrawer({ mode: "create", title: "New job", kicker: "Fast capture", item: {} })}><Plus size={17} /> Job</button>}
              >
                <div className="v6-board-head">
                  <Metric label="Open jobs" value={openJobs.length} icon={BriefcaseBusiness} />
                  <Metric label="Unassigned" value={unassignedJobs.length} tone="urgent" icon={AlertTriangle} />
                  <Metric label="Completed" value={completedJobs.length} tone="good" icon={CheckCircle2} />
                </div>
                <div className="v6-record-stack">
                  {data.jobs.map((job) => <RecordCard key={getId(job) || titleOf(job)} type="job" item={job} onOpen={openRecord} />)}
                </div>
              </Panel>
            )}

            {current === "cash" && (
              <Panel
                eyebrow="Cash flow"
                title="Quotes, invoices and customer follow-up"
                action={<button className="v6-primary" type="button" onClick={() => setDrawer({ mode: "create", title: "New invoice", kicker: "Fast capture", item: {} })}><Plus size={17} /> Invoice</button>}
              >
                <div className="v6-board-head">
                  <Metric label="Open invoice value" value={money(openInvoiceValue)} tone="cash" icon={CreditCard} />
                  <Metric label="Open invoices" value={openInvoices.length} icon={ReceiptText} />
                  <Metric label="Quote follow-ups" value={quoteFollowups.length} tone="urgent" icon={FileText} />
                </div>
                <div className="v6-two-col">
                  <div className="v6-record-stack">
                    {data.invoices.map((invoice) => <RecordCard key={getId(invoice)} type="invoice" item={invoice} onOpen={openRecord} />)}
                  </div>
                  <div className="v6-record-stack">
                    {data.quotes.map((quote) => <RecordCard key={getId(quote)} type="quote" item={quote} onOpen={openRecord} />)}
                  </div>
                </div>
              </Panel>
            )}

            {current === "clients" && (
              <Panel eyebrow="Client memory" title="Every client with context">
                <div className="v6-card-grid">
                  {data.clients.map((client) => <RecordCard key={getId(client) || titleOf(client)} type="client" item={client} onOpen={openRecord} />)}
                  {!data.clients.length && <Empty icon={ContactRound} title="No clients loaded" text="Add clients so AI can connect jobs, quotes and invoices." />}
                </div>
              </Panel>
            )}

            {current === "crew" && (
              <Panel eyebrow="Crew command" title="Workers, workload and payroll-ready time">
                <div className="v6-card-grid">
                  {data.workers.map((worker) => <RecordCard key={getId(worker) || worker.email || worker.name} type="worker" item={worker} onOpen={openRecord} />)}
                  {!data.workers.length && <Empty icon={UsersRound} title="No crew loaded" text="Invite workers so AI can recommend assignments." />}
                </div>
              </Panel>
            )}

            {current === "rules" && (
              <Panel eyebrow="Automation brain" title="Rules that run the business">
                <div className="v6-rule-grid">
                  {[
                    "Draft invoice when job completes",
                    "Warn before assigning a busy worker",
                    "Prepare overdue invoice reminders",
                    "Prepare quote follow-ups",
                    "Build recurring job run sheet",
                    "Notify owner when proof is uploaded",
                    "Spot missing client details",
                    "Prepare today’s priority list",
                  ].map((rule) => (
                    <button key={rule} type="button" onClick={() => setDrawer({ mode: "rule", title: rule, kicker: "Approval-first rule", item: { rule, status: "Ready to wire" } })}>
                      <ListChecks size={20} />
                      <strong>{rule}</strong>
                      <span>AI prepares. Owner approves.</span>
                    </button>
                  ))}
                </div>
              </Panel>
            )}

            {current === "numbers" && (
              <Panel eyebrow="Numbers" title="Plain-English business performance">
                <div className="v6-board-head">
                  <Metric label="Completed jobs" value={completedJobs.length} tone="good" icon={CheckCircle2} />
                  <Metric label="Open invoice value" value={money(openInvoiceValue)} tone="cash" icon={CircleDollarSign} />
                  <Metric label="Clients" value={data.clients.length} icon={ContactRound} />
                  <Metric label="Crew" value={data.workers.length} icon={UsersRound} />
                </div>
              </Panel>
            )}

            {current === "setup" && (
              <Panel eyebrow="Setup" title="Keep the brain accurate">
                <div className="v6-rule-grid">
                  <button type="button" onClick={() => setDrawer({ mode: "setup", title: "Business profile", kicker: "Setup", item: {} })}>
                    <Settings size={20} />
                    <strong>Business profile</strong>
                    <span>Trade, region, defaults and brand</span>
                  </button>
                  <button type="button" onClick={() => setDrawer({ mode: "setup", title: "MYOB and payments", kicker: "Setup", item: {} })}>
                    <CreditCard size={20} />
                    <strong>MYOB and payments</strong>
                    <span>Sync, invoice source and billing</span>
                  </button>
                  <button type="button" onClick={() => setDrawer({ mode: "setup", title: "AI control limits", kicker: "Setup", item: {} })}>
                    <ShieldCheck size={20} />
                    <strong>AI control limits</strong>
                    <span>What AI can prepare and what needs approval</span>
                  </button>
                </div>
              </Panel>
            )}
          </>
        )}
      </main>

      <nav className="v6-tabs" aria-label="Mobile navigation">
        {NAV.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" className={current === item.id ? "active" : ""} onClick={() => go(item.id)}>
              <Icon size={19} />
              <span>{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
        <button type="button" className={current === "brain" ? "active" : ""} onClick={() => go("brain")}>
          <BrainCircuit size={19} />
          <span>Brain</span>
        </button>
      </nav>

      <Drawer
        open={Boolean(drawer)}
        title={drawer?.title || "Details"}
        kicker={drawer?.kicker || "Command sheet"}
        onClose={() => setDrawer(null)}
        footer={
          drawer?.mode === "profile" ? (
            <button className="v6-danger" type="button" onClick={logout}><LogOut size={17} /> Log out</button>
          ) : drawer?.mode === "move" ? (
            <button className="v6-primary" type="button" onClick={() => approveMove(drawer.item)} disabled={running === drawer.item.id}>
              {running === drawer.item.id ? <Loader2 size={17} className="spin" /> : <CheckCircle2 size={17} />} Approve move
            </button>
          ) : null
        }
      >
        {drawer?.mode === "move" && (
          <div className="v6-move-detail">
            <Pill tone={drawer.item.tone}>{drawer.item.strength}</Pill>
            <h3>{drawer.item.title}</h3>
            <p>{drawer.item.reason}</p>
            <div>
              <BrainCircuit size={20} />
              <span>{drawer.item.impact}</span>
            </div>
            <small>Nothing is sent, assigned, charged or synced without owner approval.</small>
          </div>
        )}

        {drawer?.mode === "create" && (
          <div className="v6-move-detail">
            <Pill tone="brain">Fast command</Pill>
            <h3>Create without leaving the brain</h3>
            <p>This command sheet is where final job, client, quote and invoice forms plug in. The owner should never be thrown into old full-page flows.</p>
          </div>
        )}

        {drawer?.mode === "done" || drawer?.mode === "prepared" || drawer?.mode === "error" ? (
          <div className="v6-move-detail">
            <Pill tone={drawer.mode === "error" ? "urgent" : "good"}>{drawer.kicker}</Pill>
            <h3>{drawer.title}</h3>
            <p>{drawer.item?.message}</p>
          </div>
        ) : null}

        {drawer && !["move", "create", "done", "prepared", "error"].includes(drawer.mode) && (
          <div className="v6-detail-grid">
            {detailRows.map(([key, value]) => (
              <div key={key}>
                <span>{key.replace(/_/g, " ")}</span>
                <strong>{typeof value === "object" ? JSON.stringify(value).slice(0, 160) : String(value)}</strong>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
