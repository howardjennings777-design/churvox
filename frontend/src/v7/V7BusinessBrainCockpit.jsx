import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
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
  Orbit,
  Plus,
  Radar,
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
const ZONES = [
  { id: "brain", label: "Brain", full: "Business Brain", line: "AI control", icon: BrainCircuit },
  { id: "work", label: "Work", full: "Work Command", line: "Jobs + dispatch", icon: BriefcaseBusiness },
  { id: "cash", label: "Cash", full: "Cash Engine", line: "Invoices + quotes", icon: Banknote },
  { id: "clients", label: "Clients", full: "Client Memory", line: "History + context", icon: ContactRound },
  { id: "crew", label: "Crew", full: "Crew Control", line: "Team + payroll", icon: UsersRound },
  { id: "rules", label: "Rules", full: "Auto Rules", line: "Business automation", icon: Zap },
  { id: "numbers", label: "Numbers", full: "Numbers", line: "Reports", icon: Gauge },
  { id: "setup", label: "Setup", full: "Setup", line: "Settings", icon: Settings },
];

const ROUTE_ZONE = {
  dashboard: "brain",
  overview: "brain",
  smart: "brain",
  ai: "brain",
  brain: "brain",
  operator: "brain",
  approvals: "brain",
  decisions: "brain",
  work: "work",
  jobs: "work",
  dispatch: "work",
  calendar: "work",
  cash: "cash",
  money: "cash",
  quotes: "cash",
  invoices: "cash",
  sms: "cash",
  messages: "cash",
  clients: "clients",
  crew: "crew",
  team: "crew",
  payroll: "crew",
  rules: "rules",
  automation: "rules",
  numbers: "numbers",
  reports: "numbers",
  setup: "setup",
  settings: "setup",
  integrations: "setup",
};

const cleanList = (value) => {
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

const rowId = (item) => item?.id || item?._id || item?.job_id || item?.invoice_id || item?.quote_id || item?.client_id || "";
const rowName = (item, fallback = "Untitled") => item?.title || item?.name || item?.customer_name || item?.client_name || item?.invoice_number || item?.quote_number || fallback;
const rowStatus = (item) => String(item?.status || item?.job_status || item?.workflow_status || "draft").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const isDone = (job) => ["completed", "done", "closed"].includes(String(job?.status || job?.job_status || "").toLowerCase());
const isUnassigned = (job) => !job?.assigned_worker_id && !job?.worker_id && !job?.assigned_worker_name;
const isOpenInvoice = (invoice) => !["paid", "cancelled", "canceled"].includes(String(invoice?.status || "").toLowerCase());
const nzMoney = (value) => new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(value || 0));

function useCockpitData() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    data: { jobs: [], clients: [], invoices: [], quotes: [], workers: [], approvals: [] },
  });

  const refresh = async () => {
    setState((previous) => ({ ...previous, loading: true, error: "" }));

    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const load = async (path) => {
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

    const settled = await Promise.allSettled(endpoints.map(([, path]) => load(path)));
    const data = { jobs: [], clients: [], invoices: [], quotes: [], workers: [], approvals: [] };
    let failed = false;

    settled.forEach((result, index) => {
      const key = endpoints[index][0];
      if (result.status === "fulfilled") data[key] = cleanList(result.value);
      else failed = true;
    });

    setState({
      loading: false,
      error: failed ? "One live source did not answer. The cockpit loaded the rest." : "",
      data,
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  return { ...state, refresh };
}

function Mark() {
  return (
    <svg viewBox="0 0 120 120" className="v7-mark" aria-hidden="true">
      <defs>
        <linearGradient id="v7Mark" x1="10" y1="8" x2="112" y2="112">
          <stop stopColor="#140F0A" />
          <stop offset=".48" stopColor="#AF4A2B" />
          <stop offset="1" stopColor="#6F58FF" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="104" height="104" rx="30" fill="url(#v7Mark)" />
      <path d="M79 34a35 35 0 1 0 0 52" stroke="#FFF2DC" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M40 60h44" stroke="#F5C35C" strokeWidth="12" strokeLinecap="round" />
      <path d="M68 42l21 18-21 18" stroke="#8B7CFF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="91" cy="27" r="6" fill="#FFF2DC" />
    </svg>
  );
}

function Pill({ tone = "plain", children }) {
  return <span className={`v7-pill v7-pill--${tone}`}>{children}</span>;
}

function BigNumber({ label, value, tone = "plain", icon: Icon }) {
  return (
    <div className={`v7-number v7-number--${tone}`}>
      {Icon && <Icon size={18} />}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Sheet({ sheet, onClose, children, footer }) {
  if (!sheet) return null;
  return (
    <div className="v7-sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="v7-sheet" role="dialog" aria-modal="true">
        <header>
          <div>
            <p>{sheet.kicker || "Command sheet"}</p>
            <h2>{sheet.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="v7-sheet-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </aside>
    </div>
  );
}

function StripRow({ type, item, onOpen }) {
  const Icon =
    type === "invoice" ? ReceiptText :
    type === "quote" ? FileText :
    type === "client" ? ContactRound :
    type === "worker" ? UsersRound :
    Hammer;

  return (
    <button className="v7-strip-row" type="button" onClick={() => onOpen(type, item)}>
      <span><Icon size={18} /></span>
      <strong>{rowName(item, type)}</strong>
      <small>{item?.address || item?.customer_email || item?.email || item?.phone || "Open detail sheet"}</small>
      <em>{rowStatus(item)}</em>
    </button>
  );
}

function ZonePanel({ title, eyebrow, children, action }) {
  return (
    <section className="v7-zone-panel">
      <div className="v7-zone-head">
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

function Empty({ title, text, icon: Icon = Orbit }) {
  return (
    <div className="v7-empty">
      <Icon size={30} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

export default function V7BusinessBrainCockpit() {
  const navigate = useNavigate();
  const params = useParams();
  const { user, logout } = useAuth();
  const { loading, error, data, refresh } = useCockpitData();

  const [sheet, setSheet] = useState(null);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [busyMove, setBusyMove] = useState("");

  const pathRoot = window.location.pathname.split("/").filter(Boolean)[0];
  const current = ROUTE_ZONE[String(params.section || params.area || pathRoot || "brain").toLowerCase()] || "brain";
  const active = ZONES.find((zone) => zone.id === current) || ZONES[0];
  const ActiveIcon = active.icon;

  const go = (zone) => {
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
    navigate(paths[zone] || "/dashboard");
  };

  const openJobs = data.jobs.filter((job) => !isDone(job));
  const completedJobs = data.jobs.filter(isDone);
  const unassignedJobs = data.jobs.filter(isUnassigned);
  const openInvoices = data.invoices.filter(isOpenInvoice);
  const openInvoiceValue = openInvoices.reduce((sum, invoice) => sum + Number(invoice.total || invoice.subtotal || invoice.amount || 0), 0);
  const quoteFollowups = data.quotes.filter((quote) => ["draft", "sent"].includes(String(quote.status || "").toLowerCase()));

  const moves = useMemo(() => {
    const output = [];

    completedJobs.slice(0, 5).forEach((job) => {
      const hasInvoice = data.invoices.some((invoice) => String(invoice.job_id || invoice.source_job_id || invoice.linked_job_id || "") === String(rowId(job)));
      if (!hasInvoice) {
        output.push({
          id: `invoice-${rowId(job)}`,
          kind: "draft_invoice",
          tone: "cash",
          level: "Money waiting",
          title: `Draft invoice for ${rowName(job, "completed job")}`,
          reason: "Completed work has no matching invoice. The brain can turn it into a draft invoice for approval.",
          outcome: "Creates billable money from completed work.",
          item: job,
        });
      }
    });

    unassignedJobs.slice(0, 5).forEach((job) => {
      const worker = data.workers.find((person) => String(person.status || "active").toLowerCase() !== "inactive") || data.workers[0];
      output.push({
        id: `assign-${rowId(job)}`,
        kind: "assign_worker",
        tone: "risk",
        level: "Dispatch gap",
        title: `Place crew on ${rowName(job, "job")}`,
        reason: worker ? `${worker.name || worker.email || "A worker"} is the first crew match found. Owner approval stays required.` : "This job has no crew assigned yet.",
        outcome: "Keeps the day from slipping.",
        item: job,
        worker,
      });
    });

    openInvoices.slice(0, 5).forEach((invoice) => {
      output.push({
        id: `reminder-${rowId(invoice)}`,
        kind: "invoice_reminder",
        tone: "cash",
        level: "Cash follow-up",
        title: `Prepare reminder for ${rowName(invoice, "invoice")}`,
        reason: "This invoice is still open. The brain can prepare a customer reminder without sending it.",
        outcome: "Improves cashflow without sounding pushy.",
        item: invoice,
      });
    });

    quoteFollowups.slice(0, 4).forEach((quote) => {
      output.push({
        id: `quote-${rowId(quote)}`,
        kind: "quote_followup",
        tone: "growth",
        level: "Win work",
        title: `Follow up quote for ${rowName(quote, "client")}`,
        reason: "This quote is not accepted yet. The brain can prepare a friendly follow-up.",
        outcome: "Keeps future work alive.",
        item: quote,
      });
    });

    data.approvals.slice(0, 4).forEach((approval, index) => {
      output.push({
        id: approval.id || `approval-${index}`,
        kind: approval.type || "approval",
        tone: "brain",
        level: approval.impact || "Prepared",
        title: approval.title || approval.name || "AI approval ready",
        reason: approval.reason || approval.description || "The brain prepared this for owner review.",
        outcome: "Owner approval required.",
        item: approval,
      });
    });

    return output.slice(0, 12);
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

  const openRecord = (type, item) => {
    setSheet({
      mode: "record",
      type,
      item,
      title: rowName(item, type),
      kicker: rowStatus(item),
    });
  };

  const openMove = (move) => {
    setSheet({
      mode: "move",
      item: move,
      title: move.title,
      kicker: "AI command prepared",
    });
  };

  const approveMove = async (move) => {
    setBusyMove(move.id);
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    try {
      if (move.kind === "draft_invoice") {
        const job = move.item || {};
        const payload = {
          job_id: rowId(job) || undefined,
          client_id: job.client_id || undefined,
          customer_name: job.customer_name || job.client_name || job.name || "Client",
          customer_email: job.customer_email || job.client_email || undefined,
          address: job.address || job.job_address || "",
          description: job.ai_invoice_description || job.invoice_description_draft || job.notes || `Work completed for ${rowName(job, "job")}.`,
          subtotal: Number(job.price || job.total || job.subtotal || 0),
        };

        const response = await fetch(`${API_BASE}/api/invoices`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Could not create invoice.");
        await refresh();
        setSheet({ mode: "done", title: "Draft invoice created", kicker: "Approved", item: { message: "The brain created the draft invoice. Review it in Cash." } });
        return;
      }

      setSheet({
        mode: "prepared",
        title: "Move approved for wiring",
        kicker: "Command ready",
        item: { message: "This move is prepared in the new cockpit. Next step is wiring the exact backend execution for this action." },
      });
    } catch (err) {
      setSheet({
        mode: "error",
        title: "Move could not run",
        kicker: "Needs review",
        item: { message: err.message || "The action could not run yet." },
      });
    } finally {
      setBusyMove("");
    }
  };

  const detailRows = Object.entries(sheet?.item || {})
    .filter(([key, value]) => !["item", "worker"].includes(key) && value !== "" && value !== null && value !== undefined)
    .slice(0, 18);

  return (
    <div className="v7-shell">
      <header className="v7-command-bar">
        <button className="v7-mobile-menu" type="button" onClick={() => setNavOpen(true)}>
          <Menu size={22} />
        </button>

        <button className="v7-brand-button" type="button" onClick={() => go("brain")}>
          <Mark />
          <span>
            <strong>Churvox</strong>
            <small>Business Brain</small>
          </span>
        </button>

        <label className="v7-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the business or find a command..." />
        </label>

        <button className="v7-create" type="button" onClick={() => setSheet({ mode: "create", title: "New command", kicker: "Create", item: {} })}>
          <Plus size={18} /> Create
        </button>

        <button className="v7-brain-count" type="button" onClick={() => go("brain")}>
          <BrainCircuit size={18} /> {moves.length}
        </button>

        <button className="v7-icon" type="button" onClick={refresh}>
          <RefreshCw size={18} />
        </button>

        <button className="v7-icon" type="button" onClick={() => setSheet({ mode: "profile", title: user?.name || "Profile", kicker: "Account", item: user || {} })}>
          <UserRound size={18} />
        </button>
      </header>

      <nav className={`v7-zone-nav ${navOpen ? "open" : ""}`}>
        <div className="v7-zone-mobile-head">
          <strong>Churvox zones</strong>
          <button type="button" onClick={() => setNavOpen(false)}><X size={20} /></button>
        </div>
        {ZONES.map((zone) => {
          const Icon = zone.icon;
          return (
            <button key={zone.id} className={current === zone.id ? "active" : ""} type="button" onClick={() => go(zone.id)}>
              <Icon size={18} />
              <span>{zone.label}</span>
              <small>{zone.line}</small>
            </button>
          );
        })}
      </nav>

      <main className="v7-stage">
        {searchResults ? (
          <section className="v7-search-board">
            <div className="v7-board-title">
              <p>Search results</p>
              <h1>{searchResults.length} records found</h1>
              <button type="button" onClick={() => setQuery("")}>Clear</button>
            </div>
            <div className="v7-record-wall">
              {searchResults.map((result, index) => (
                <StripRow key={`${result.type}-${index}`} type={result.type} item={result.item} onOpen={openRecord} />
              ))}
            </div>
          </section>
        ) : (
          <>
            <section className="v7-hero-brain">
              <div className="v7-hero-left">
                <p><ActiveIcon size={16} /> {active.full}</p>
                <h1>Business brain online.</h1>
                <h2>AI finds the move. You approve the outcome.</h2>
                <span>No maze, no “open full page,” no clutter. Work, cash, clients and crew are controlled from this cockpit.</span>
              </div>

              <div className="v7-core-orb">
                <div className="v7-orb-ring">
                  <BrainCircuit size={52} />
                  <strong>{moves.length}</strong>
                  <span>moves ready</span>
                </div>
                <small>AI is reading live jobs, cashflow, quotes and crew.</small>
              </div>

              <div className="v7-live-stack">
                <BigNumber label="Open jobs" value={openJobs.length} icon={BriefcaseBusiness} />
                <BigNumber label="Need crew" value={unassignedJobs.length} tone="risk" icon={AlertTriangle} />
                <BigNumber label="Open cash" value={nzMoney(openInvoiceValue)} tone="cash" icon={CircleDollarSign} />
              </div>
            </section>

            {error && (
              <div className="v7-sync">
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            {current === "brain" && (
              <section className="v7-cockpit-grid">
                <div className="v7-decision-column">
                  <div className="v7-column-title">
                    <p>AI decision engine</p>
                    <h2>Prepared moves</h2>
                  </div>

                  {loading ? (
                    <Empty icon={Loader2} title="Brain is reading the business" text="Checking jobs, invoices, quotes and crew now." />
                  ) : moves.length ? (
                    <div className="v7-move-board">
                      {moves.map((move, index) => (
                        <button className={`v7-command-card v7-command-card--${move.tone}`} key={move.id || index} type="button" onClick={() => openMove(move)}>
                          <span className="v7-command-index">{String(index + 1).padStart(2, "0")}</span>
                          <Pill tone={move.tone}>{move.level}</Pill>
                          <h3>{move.title}</h3>
                          <p>{move.reason}</p>
                          <small>{move.outcome}</small>
                          <ArrowUpRight size={19} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Empty title="No moves waiting" text="The brain has not found any urgent decisions right now." />
                  )}
                </div>

                <div className="v7-lane-column">
                  <div className="v7-lane">
                    <p>Work lane</p>
                    <h3>Jobs needing attention</h3>
                    {openJobs.slice(0, 5).map((job) => <StripRow key={rowId(job) || rowName(job)} type="job" item={job} onOpen={openRecord} />)}
                  </div>

                  <div className="v7-lane">
                    <p>Cash lane</p>
                    <h3>Money to protect</h3>
                    {openInvoices.slice(0, 5).map((invoice) => <StripRow key={rowId(invoice)} type="invoice" item={invoice} onOpen={openRecord} />)}
                  </div>
                </div>
              </section>
            )}

            {current === "work" && (
              <ZonePanel
                eyebrow="Work command"
                title="Jobs, dispatch and proof"
                action={<button className="v7-primary" type="button" onClick={() => setSheet({ mode: "create", title: "New job", kicker: "Create", item: {} })}><Plus size={17} /> Job</button>}
              >
                <div className="v7-zone-metrics">
                  <BigNumber label="Open jobs" value={openJobs.length} icon={BriefcaseBusiness} />
                  <BigNumber label="Unassigned" value={unassignedJobs.length} tone="risk" icon={AlertTriangle} />
                  <BigNumber label="Completed" value={completedJobs.length} tone="good" icon={CheckCircle2} />
                </div>
                <div className="v7-record-wall">
                  {data.jobs.map((job) => <StripRow key={rowId(job) || rowName(job)} type="job" item={job} onOpen={openRecord} />)}
                </div>
              </ZonePanel>
            )}

            {current === "cash" && (
              <ZonePanel
                eyebrow="Cash command"
                title="Quotes, invoices and follow-up"
                action={<button className="v7-primary" type="button" onClick={() => setSheet({ mode: "create", title: "New invoice", kicker: "Create", item: {} })}><Plus size={17} /> Invoice</button>}
              >
                <div className="v7-zone-metrics">
                  <BigNumber label="Open value" value={nzMoney(openInvoiceValue)} tone="cash" icon={CreditCard} />
                  <BigNumber label="Open invoices" value={openInvoices.length} icon={ReceiptText} />
                  <BigNumber label="Quote follow-ups" value={quoteFollowups.length} tone="risk" icon={FileText} />
                </div>
                <div className="v7-two-lanes">
                  <div className="v7-record-wall">
                    {data.invoices.map((invoice) => <StripRow key={rowId(invoice)} type="invoice" item={invoice} onOpen={openRecord} />)}
                  </div>
                  <div className="v7-record-wall">
                    {data.quotes.map((quote) => <StripRow key={rowId(quote)} type="quote" item={quote} onOpen={openRecord} />)}
                  </div>
                </div>
              </ZonePanel>
            )}

            {current === "clients" && (
              <ZonePanel eyebrow="Client memory" title="Clients with context">
                <div className="v7-card-wall">
                  {data.clients.map((client) => <StripRow key={rowId(client) || rowName(client)} type="client" item={client} onOpen={openRecord} />)}
                  {!data.clients.length && <Empty icon={ContactRound} title="No clients loaded" text="Add clients so the brain can connect work, quotes and invoices." />}
                </div>
              </ZonePanel>
            )}

            {current === "crew" && (
              <ZonePanel eyebrow="Crew control" title="Workers, workload and payroll-ready time">
                <div className="v7-card-wall">
                  {data.workers.map((worker) => <StripRow key={rowId(worker) || worker.email || worker.name} type="worker" item={worker} onOpen={openRecord} />)}
                  {!data.workers.length && <Empty icon={UsersRound} title="No crew loaded" text="Invite workers so AI can recommend assignments." />}
                </div>
              </ZonePanel>
            )}

            {current === "rules" && (
              <ZonePanel eyebrow="Automation engine" title="Rules the brain can run">
                <div className="v7-rule-wall">
                  {[
                    "Draft invoice when job completes",
                    "Warn before assigning a busy worker",
                    "Prepare overdue invoice reminders",
                    "Prepare quote follow-ups",
                    "Build recurring job run sheet",
                    "Notify owner when proof is uploaded",
                    "Spot missing client details",
                    "Prepare tomorrow’s work list",
                  ].map((rule) => (
                    <button key={rule} type="button" onClick={() => setSheet({ mode: "rule", title: rule, kicker: "Automation rule", item: { rule, status: "Approval-first" } })}>
                      <ListChecks size={20} />
                      <strong>{rule}</strong>
                      <span>AI prepares. Owner approves.</span>
                    </button>
                  ))}
                </div>
              </ZonePanel>
            )}

            {current === "numbers" && (
              <ZonePanel eyebrow="Numbers" title="Plain-English business pulse">
                <div className="v7-zone-metrics">
                  <BigNumber label="Completed jobs" value={completedJobs.length} tone="good" icon={CheckCircle2} />
                  <BigNumber label="Open cash" value={nzMoney(openInvoiceValue)} tone="cash" icon={CircleDollarSign} />
                  <BigNumber label="Clients" value={data.clients.length} icon={ContactRound} />
                  <BigNumber label="Crew" value={data.workers.length} icon={UsersRound} />
                </div>
              </ZonePanel>
            )}

            {current === "setup" && (
              <ZonePanel eyebrow="Setup" title="Control how the brain runs">
                <div className="v7-rule-wall">
                  <button type="button" onClick={() => setSheet({ mode: "setup", title: "Business profile", kicker: "Setup", item: {} })}>
                    <Settings size={20} />
                    <strong>Business profile</strong>
                    <span>Trade, region, defaults and brand</span>
                  </button>
                  <button type="button" onClick={() => setSheet({ mode: "setup", title: "MYOB and payments", kicker: "Setup", item: {} })}>
                    <CreditCard size={20} />
                    <strong>MYOB and payments</strong>
                    <span>Invoice sync and payment setup</span>
                  </button>
                  <button type="button" onClick={() => setSheet({ mode: "setup", title: "AI control limits", kicker: "Setup", item: {} })}>
                    <ShieldCheck size={20} />
                    <strong>AI control limits</strong>
                    <span>What AI can prepare, and what needs approval</span>
                  </button>
                </div>
              </ZonePanel>
            )}
          </>
        )}
      </main>

      <nav className="v7-mobile-tabs">
        {ZONES.slice(0, 5).map((zone) => {
          const Icon = zone.icon;
          return (
            <button key={zone.id} type="button" className={current === zone.id ? "active" : ""} onClick={() => go(zone.id)}>
              <Icon size={18} />
              <span>{zone.label}</span>
            </button>
          );
        })}
      </nav>

      <Sheet
        sheet={sheet}
        onClose={() => setSheet(null)}
        footer={
          sheet?.mode === "profile" ? (
            <button className="v7-danger" type="button" onClick={logout}><LogOut size={17} /> Log out</button>
          ) : sheet?.mode === "move" ? (
            <button className="v7-primary" type="button" onClick={() => approveMove(sheet.item)} disabled={busyMove === sheet.item.id}>
              {busyMove === sheet.item.id ? <Loader2 className="v7-spin" size={17} /> : <CheckCircle2 size={17} />}
              Approve move
            </button>
          ) : null
        }
      >
        {sheet?.mode === "move" && (
          <div className="v7-move-sheet">
            <Pill tone={sheet.item.tone}>{sheet.item.level}</Pill>
            <h3>{sheet.item.title}</h3>
            <p>{sheet.item.reason}</p>
            <div>
              <BrainCircuit size={20} />
              <span>{sheet.item.outcome}</span>
            </div>
            <small>Nothing is sent, assigned, charged or synced without owner approval.</small>
          </div>
        )}

        {sheet?.mode === "create" && (
          <div className="v7-move-sheet">
            <Pill tone="brain">Command create</Pill>
            <h3>Create without leaving the cockpit</h3>
            <p>This is where the final job, client, quote and invoice forms plug in. No old full-page jumping.</p>
          </div>
        )}

        {["done", "prepared", "error"].includes(sheet?.mode) && (
          <div className="v7-move-sheet">
            <Pill tone={sheet.mode === "error" ? "risk" : "good"}>{sheet.kicker}</Pill>
            <h3>{sheet.title}</h3>
            <p>{sheet.item?.message}</p>
          </div>
        )}

        {sheet && !["move", "create", "done", "prepared", "error"].includes(sheet.mode) && (
          <div className="v7-detail-grid">
            {detailRows.map(([key, value]) => (
              <div key={key}>
                <span>{key.replace(/_/g, " ")}</span>
                <strong>{typeof value === "object" ? JSON.stringify(value).slice(0, 160) : String(value)}</strong>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}
