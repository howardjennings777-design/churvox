import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  Bell,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ContactRound,
  CreditCard,
  FileText,
  Gauge,
  Hammer,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
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
  ["hub", "Smart Hub", "Today first", LayoutDashboard],
  ["work", "Work", "Jobs + dispatch", BriefcaseBusiness],
  ["money", "Money", "Quotes + invoices", Banknote],
  ["clients", "Clients", "History", ContactRound],
  ["team", "Team", "Crew + payroll", UsersRound],
  ["ai", "AI Queue", "Approve work", Bot],
  ["automation", "Automations", "Rules", Zap],
  ["reports", "Reports", "Numbers", Gauge],
  ["settings", "Settings", "Setup", Settings],
];

const MAP = {
  dashboard: "hub",
  overview: "hub",
  jobs: "work",
  dispatch: "work",
  calendar: "work",
  proof: "work",
  clients: "clients",
  quotes: "money",
  invoices: "money",
  money: "money",
  messages: "money",
  team: "team",
  payroll: "team",
  operator: "ai",
  decisions: "ai",
  approvals: "ai",
  ai: "ai",
  rules: "automation",
  automation: "automation",
  reports: "reports",
  settings: "settings",
  integrations: "settings",
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

const itemId = (item) =>
  item?.id || item?._id || item?.job_id || item?.invoice_id || item?.quote_id || item?.client_id || "";

const itemTitle = (item, fallback = "Untitled") =>
  item?.title || item?.name || item?.customer_name || item?.client_name || item?.invoice_number || item?.quote_number || fallback;

const prettyStatus = (item) =>
  String(item?.status || item?.job_status || item?.workflow_status || "draft")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const isComplete = (job) =>
  ["completed", "done", "closed"].includes(String(job?.status || job?.job_status || "").toLowerCase());

const isUnassigned = (job) =>
  !job?.assigned_worker_id && !job?.worker_id && !job?.assigned_worker_name;

const isOpenInvoice = (invoice) =>
  !["paid", "cancelled", "canceled"].includes(String(invoice?.status || "").toLowerCase());

const money = (amount) =>
  new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

function BrandMark() {
  return (
    <svg viewBox="0 0 120 120" className="v5-brand-mark" aria-hidden="true">
      <defs>
        <linearGradient id="v5BrandGradient" x1="8" y1="8" x2="112" y2="112">
          <stop stopColor="#18130F" />
          <stop offset=".55" stopColor="#C4512D" />
          <stop offset="1" stopColor="#5B4DFF" />
        </linearGradient>
      </defs>
      <rect x="7" y="7" width="106" height="106" rx="30" fill="url(#v5BrandGradient)" />
      <path d="M78 34a34 34 0 1 0 0 52" stroke="#FFFCF5" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M42 60h42" stroke="#F0C15B" strokeWidth="12" strokeLinecap="round" />
      <path d="M68 42l20 18-20 18" stroke="#5B4DFF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="90" cy="27" r="6" fill="#FFFCF5" />
    </svg>
  );
}

function Brand() {
  return (
    <div className="v5-brand">
      <BrandMark />
      <div>
        <strong>Churvox</strong>
        <span>AI workshop command</span>
      </div>
    </div>
  );
}

function Pill({ children, tone = "" }) {
  return <span className={`v5-pill ${tone}`}>{children}</span>;
}

function Stat({ label, value, icon: Icon = Gauge, tone = "", onClick }) {
  return (
    <button className={`v5-stat ${tone}`} type="button" onClick={onClick}>
      <Icon size={18} />
      <strong>{value}</strong>
      <span>{label}</span>
    </button>
  );
}

function Panel({ kicker, title, action, children }) {
  return (
    <section className="v5-panel">
      <div className="v5-panel-head">
        <div>
          <p>{kicker}</p>
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
    <div className="v5-empty">
      <Icon size={26} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function RowCard({ item, type, onOpen }) {
  const Icon =
    type === "invoice" ? ReceiptText :
    type === "quote" ? FileText :
    type === "client" ? ContactRound :
    type === "worker" ? UsersRound :
    Hammer;

  return (
    <button className="v5-row" type="button" onClick={() => onOpen(type, item)}>
      <span className="v5-row-icon"><Icon size={18} /></span>
      <span className="v5-row-main">
        <strong>{itemTitle(item, type)}</strong>
        <small>{item?.address || item?.customer_email || item?.email || item?.phone || "Tap to open detail panel"}</small>
      </span>
      <em>{prettyStatus(item)}</em>
    </button>
  );
}

function Drawer({ drawer, onClose, children, actions }) {
  if (!drawer) return null;

  return (
    <div className="v5-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="v5-drawer" role="dialog" aria-modal="true">
        <header>
          <div>
            <p>{drawer.kicker || "Details"}</p>
            <h2>{drawer.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="v5-drawer-body">{children}</div>
        {actions && <footer>{actions}</footer>}
      </aside>
    </div>
  );
}

function useCommandData() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    data: { jobs: [], clients: [], invoices: [], quotes: [], workers: [], approvals: [] },
  });

  const refresh = async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
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
    let hadError = false;

    settled.forEach((result, index) => {
      const key = endpoints[index][0];
      if (result.status === "fulfilled") data[key] = toList(result.value);
      else hadError = true;
    });

    setState({
      loading: false,
      error: hadError ? "Live data is syncing yet. The command centre still works." : "",
      data,
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  return { ...state, refresh };
}

export default function V5CommandApp() {
  const params = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { loading, error, data, refresh } = useCommandData();
  const [drawer, setDrawer] = useState(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const current = MAP[String(params.section || params.area || "hub").toLowerCase()] || "hub";

  const go = (target) => {
    setMenuOpen(false);
    navigate(target === "hub" ? "/dashboard" : `/v3/${target}`);
  };

  const openDrawer = (type, item) => {
    setDrawer({
      type,
      item,
      title: type === "ai" ? item.title : itemTitle(item, type),
      kicker: type === "ai" ? "AI prepared action" : prettyStatus(item),
    });
  };

  const openJobs = data.jobs.filter((job) => !isComplete(job));
  const completedJobs = data.jobs.filter(isComplete);
  const unassignedJobs = data.jobs.filter(isUnassigned);
  const openInvoices = data.invoices.filter(isOpenInvoice);
  const openInvoiceValue = openInvoices.reduce((sum, invoice) => sum + Number(invoice.total || invoice.subtotal || invoice.amount || 0), 0);
  const quoteFollowups = data.quotes.filter((quote) => ["draft", "sent"].includes(String(quote.status || "").toLowerCase()));

  const aiActions = useMemo(() => {
    const actions = [];

    completedJobs.slice(0, 4).forEach((job) => {
      const hasInvoice = data.invoices.some((invoice) =>
        String(invoice.job_id || invoice.source_job_id || invoice.linked_job_id || "") === String(itemId(job))
      );
      if (!hasInvoice) {
        actions.push({
          id: `invoice-${itemId(job)}`,
          tone: "cash",
          title: `Draft invoice for ${itemTitle(job, "completed job")}`,
          reason: "Job is complete and no matching invoice was found. Churvox can prepare a draft invoice for owner approval.",
          item: job,
        });
      }
    });

    unassignedJobs.slice(0, 4).forEach((job) => {
      actions.push({
        id: `assign-${itemId(job)}`,
        tone: "warn",
        title: `Assign ${itemTitle(job, "job")}`,
        reason: "This job has no worker. AI recommends reviewing crew fit, workload and area before approval.",
        item: job,
      });
    });

    openInvoices.slice(0, 4).forEach((invoice) => {
      actions.push({
        id: `follow-${itemId(invoice)}`,
        tone: "cash",
        title: `Follow up ${itemTitle(invoice, "invoice")}`,
        reason: "Invoice is still open. AI can draft a customer reminder for approval.",
        item: invoice,
      });
    });

    quoteFollowups.slice(0, 3).forEach((quote) => {
      actions.push({
        id: `quote-${itemId(quote)}`,
        tone: "ai",
        title: `Follow up quote for ${itemTitle(quote, "client")}`,
        reason: "Quote has not been accepted yet. AI can draft a friendly follow-up.",
        item: quote,
      });
    });

    return actions.slice(0, 10);
  }, [completedJobs, unassignedJobs, openInvoices, quoteFollowups, data.invoices]);

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;

    const hit = (type, items) =>
      items
        .filter((item) => JSON.stringify(item || {}).toLowerCase().includes(term))
        .slice(0, 5)
        .map((item) => ({ type, item }));

    return [
      ...hit("job", data.jobs),
      ...hit("client", data.clients),
      ...hit("invoice", data.invoices),
      ...hit("quote", data.quotes),
      ...hit("worker", data.workers),
    ].slice(0, 15);
  }, [query, data]);

  const detailRows = Object.entries(drawer?.item || {})
    .filter(([, value]) => value !== "" && value !== null && value !== undefined)
    .slice(0, 18);

  return (
    <div className="v5-app">
      <aside className={`v5-side ${menuOpen ? "open" : ""}`}>
        <div className="v5-side-top">
          <Brand />
          <button type="button" onClick={() => setMenuOpen(false)}><X size={19} /></button>
        </div>

        <nav>
          {NAV.map(([key, label, sub, Icon]) => (
            <button key={key} className={current === key ? "active" : ""} onClick={() => go(key)} type="button">
              <Icon size={19} />
              <strong>{label}</strong>
              <small>{sub}</small>
            </button>
          ))}
        </nav>

        <div className="v5-ai-note">
          <Wand2 size={18} />
          <strong>AI Operator</strong>
          <p>{aiActions.length ? `${aiActions.length} actions prepared.` : "Watching the business."}</p>
          <button type="button" onClick={() => go("ai")}>Open AI Queue</button>
        </div>
      </aside>

      <main className="v5-main">
        <header className="v5-top">
          <button className="v5-menu" type="button" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
          <label>
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search anything..." />
          </label>
          <button className="v5-create" type="button" onClick={() => openDrawer("create", { title: "Quick create" })}>
            <Plus size={18} /> Create
          </button>
          <button className="v5-ai-top" type="button" onClick={() => go("ai")}><Bot size={18} /> {aiActions.length}</button>
          <button className="v5-round" type="button" onClick={refresh}><RefreshCw size={18} /></button>
          <button className="v5-round" type="button" onClick={() => openDrawer("profile", user || {})}><UserRound size={18} /></button>
        </header>

        {searchResults ? (
          <Panel kicker="Search" title={`${searchResults.length} results`} action={<button className="v5-link" onClick={() => setQuery("")} type="button">Clear</button>}>
            <div className="v5-list">
              {searchResults.map((result, index) => (
                <RowCard key={`${result.type}-${index}`} type={result.type} item={result.item} onOpen={openDrawer} />
              ))}
            </div>
          </Panel>
        ) : (
          <>
            <section className="v5-hero">
              <div>
                <p><Sparkles size={16} /> {NAV.find((item) => item[0] === current)?.[1]}</p>
                <h1>AI runs the admin. You approve the moves.</h1>
                <span>One command centre for work, money, clients and crew. Tap anything and it opens here, not another maze.</span>
              </div>
              <div>
                <small>AI prepared</small>
                <strong>{aiActions.length}</strong>
                <em>owner decisions</em>
              </div>
            </section>

            {error && <div className="v5-warning"><AlertTriangle size={18} /> {error}</div>}

            {current === "hub" && (
              <div className="v5-grid">
                <Panel kicker="Owner first" title="What needs doing now" action={<button className="v5-link" onClick={() => go("ai")} type="button">All AI</button>}>
                  <div className="v5-ai-grid">
                    {loading ? (
                      <Empty title="Loading command" text="Checking jobs, money and crew." />
                    ) : aiActions.length ? (
                      aiActions.slice(0, 4).map((action) => (
                        <button className="v5-ai-card" key={action.id} onClick={() => openDrawer("ai", action)} type="button">
                          <Pill tone={action.tone}>AI prepared</Pill>
                          <strong>{action.title}</strong>
                          <span>{action.reason}</span>
                        </button>
                      ))
                    ) : (
                      <Empty title="Nothing urgent" text="No unassigned jobs or cash follow-ups detected." />
                    )}
                  </div>
                </Panel>

                <Panel kicker="Pulse" title="Business snapshot">
                  <div className="v5-stats">
                    <Stat label="Open jobs" value={openJobs.length} icon={BriefcaseBusiness} onClick={() => go("work")} />
                    <Stat label="Unassigned" value={unassignedJobs.length} tone="warn" icon={AlertTriangle} onClick={() => go("work")} />
                    <Stat label="Open invoices" value={money(openInvoiceValue)} tone="cash" icon={ReceiptText} onClick={() => go("money")} />
                    <Stat label="Clients" value={data.clients.length} icon={ContactRound} onClick={() => go("clients")} />
                  </div>
                </Panel>

                <Panel kicker="Run sheet" title="Next jobs">
                  <div className="v5-list">
                    {openJobs.slice(0, 6).map((job) => (
                      <RowCard key={itemId(job) || itemTitle(job)} type="job" item={job} onOpen={openDrawer} />
                    ))}
                    {!openJobs.length && <Empty title="No open jobs" text="Create work when ready." />}
                  </div>
                </Panel>
              </div>
            )}

            {current === "work" && (
              <Panel kicker="Work" title="Jobs and dispatch" action={<button className="v5-primary" onClick={() => openDrawer("create", { title: "New job" })} type="button"><Plus size={17} /> Job</button>}>
                <div className="v5-list">
                  {data.jobs.map((job) => <RowCard key={itemId(job) || itemTitle(job)} type="job" item={job} onOpen={openDrawer} />)}
                </div>
              </Panel>
            )}

            {current === "money" && (
              <Panel kicker="Money" title="Quotes and invoices" action={<button className="v5-primary" onClick={() => openDrawer("create", { title: "New invoice" })} type="button"><Plus size={17} /> Invoice</button>}>
                <div className="v5-stats wide">
                  <Stat label="Open value" value={money(openInvoiceValue)} tone="cash" icon={CreditCard} />
                  <Stat label="Invoices" value={openInvoices.length} icon={ReceiptText} />
                  <Stat label="Quote follow-ups" value={quoteFollowups.length} tone="warn" icon={FileText} />
                </div>
                <div className="v5-two">
                  <div className="v5-list">{data.invoices.map((invoice) => <RowCard key={itemId(invoice)} type="invoice" item={invoice} onOpen={openDrawer} />)}</div>
                  <div className="v5-list">{data.quotes.map((quote) => <RowCard key={itemId(quote)} type="quote" item={quote} onOpen={openDrawer} />)}</div>
                </div>
              </Panel>
            )}

            {current === "clients" && (
              <Panel kicker="Clients" title="Client command">
                <div className="v5-list cards">{data.clients.map((client) => <RowCard key={itemId(client) || itemTitle(client)} type="client" item={client} onOpen={openDrawer} />)}</div>
              </Panel>
            )}

            {current === "team" && (
              <Panel kicker="Team" title="Crew and payroll-ready work">
                <div className="v5-list cards">{data.workers.map((worker) => <RowCard key={itemId(worker) || worker.email || worker.name} type="worker" item={worker} onOpen={openDrawer} />)}</div>
              </Panel>
            )}

            {current === "ai" && (
              <Panel kicker="AI Operator" title="Prepared owner approvals" action={<button className="v5-link" onClick={refresh} type="button">Recheck</button>}>
                <div className="v5-ai-grid full">
                  {aiActions.length ? aiActions.map((action) => (
                    <button className="v5-ai-card" key={action.id} onClick={() => openDrawer("ai", action)} type="button">
                      <Pill tone={action.tone}>AI prepared</Pill>
                      <strong>{action.title}</strong>
                      <span>{action.reason}</span>
                    </button>
                  )) : <Empty icon={Bot} title="AI queue clear" text="Churvox is watching for the next move." />}
                </div>
              </Panel>
            )}

            {current === "automation" && (
              <Panel kicker="Automations" title="Rules that keep the day moving">
                <div className="v5-rules">
                  {[
                    "Draft invoice when job completes",
                    "Warn before assigning busy worker",
                    "Prepare overdue invoice reminders",
                    "Prepare quote follow-ups",
                    "Build recurring job run sheet",
                    "Notify owner when proof is uploaded",
                  ].map((rule) => (
                    <button key={rule} onClick={() => openDrawer("rule", { title: rule, status: "approval first" })} type="button">
                      <ListChecks size={18} />
                      <strong>{rule}</strong>
                      <span>Approval-first</span>
                    </button>
                  ))}
                </div>
              </Panel>
            )}

            {current === "reports" && (
              <Panel kicker="Reports" title="Numbers that make sense">
                <div className="v5-stats wide">
                  <Stat label="Completed jobs" value={completedJobs.length} tone="good" icon={CheckCircle2} />
                  <Stat label="Open invoice value" value={money(openInvoiceValue)} tone="cash" icon={Banknote} />
                  <Stat label="Clients" value={data.clients.length} icon={ContactRound} />
                  <Stat label="Crew" value={data.workers.length} icon={UsersRound} />
                </div>
              </Panel>
            )}

            {current === "settings" && (
              <Panel kicker="Settings" title="Business setup">
                <div className="v5-rules">
                  <button type="button" onClick={() => openDrawer("settings", { title: "Business profile" })}><Settings size={18} /><strong>Business profile</strong><span>Trade, area and defaults</span></button>
                  <button type="button" onClick={() => openDrawer("settings", { title: "MYOB and payments" })}><CreditCard size={18} /><strong>MYOB and payments</strong><span>Sync and billing setup</span></button>
                  <button type="button" onClick={() => openDrawer("settings", { title: "Notifications" })}><Bell size={18} /><strong>Notifications</strong><span>Owner and team alerts</span></button>
                </div>
              </Panel>
            )}
          </>
        )}
      </main>

      <nav className="v5-tabs">
        {NAV.slice(0, 5).map(([key, label, , Icon]) => (
          <button key={key} className={current === key ? "active" : ""} onClick={() => go(key)} type="button">
            <Icon size={19} />
            <span>{label.split(" ")[0]}</span>
          </button>
        ))}
        <button className={current === "ai" ? "active" : ""} onClick={() => go("ai")} type="button">
          <Bot size={19} />
          <span>AI</span>
        </button>
      </nav>

      <Drawer
        drawer={drawer}
        onClose={() => setDrawer(null)}
        actions={
          drawer?.type === "profile" ? (
            <button className="v5-danger" onClick={logout} type="button"><LogOut size={17} /> Log out</button>
          ) : drawer?.type === "ai" ? (
            <button className="v5-primary" onClick={() => setDrawer({ title: "Approval ready", kicker: "AI", item: { message: "Ready for backend execution wiring." } })} type="button"><CheckCircle2 size={17} /> Approve</button>
          ) : null
        }
      >
        {drawer?.type === "ai" && (
          <div className="v5-ai-detail">
            <Pill tone={drawer.item.tone}>AI prepared</Pill>
            <p>{drawer.item.reason}</p>
            <div><Bot size={20} /><span>AI prepared the next move. Owner approval stays in control.</span></div>
          </div>
        )}

        {drawer?.type === "create" && (
          <div className="v5-ai-detail">
            <p>Quick create drawer keeps users in the workspace instead of jumping through pages. Final create forms can plug in here.</p>
          </div>
        )}

        {drawer?.type !== "ai" && drawer?.type !== "create" && (
          <div className="v5-detail">
            {detailRows.map(([key, value]) => (
              <p key={key}>
                <span>{key.replace(/_/g, " ")}</span>
                <strong>{typeof value === "object" ? JSON.stringify(value).slice(0, 120) : String(value)}</strong>
              </p>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
