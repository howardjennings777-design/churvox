import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  MessageSquare,
  Plug,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
  X,
  Zap
} from "lucide-react";
import {
  approveAiAction,
  loadAiOperatorQueue,
  prepareTodayWithAi,
  runAiDailyCheck
} from "../../lib/aiOperator";
import { get } from "../../lib/api";
import V3Shell from "../components/V3Shell";
import "../styles/v3.css";

const PAGE_META = {
  decisions: {
    title: "Owner Decisions",
    kicker: "AI approval queue",
    intro: "AI-prepared actions that only need the owner to review and approve.",
    icon: Sparkles,
    emptyTitle: "No decisions waiting",
    emptyCopy: "Tap AI handle this and Churvox will check the business again.",
  },
  jobs: {
    title: "Jobs",
    kicker: "Live run sheet",
    intro: "All jobs, current status, assigned workers, completion state and AI next steps.",
    icon: Briefcase,
    emptyTitle: "No jobs found",
    emptyCopy: "When jobs are added, this page becomes the live run sheet.",
  },
  dispatch: {
    title: "Dispatch",
    kicker: "Crew matching",
    intro: "Unassigned jobs, available workers, schedule gaps and AI worker suggestions.",
    icon: Calendar,
    emptyTitle: "No dispatch work waiting",
    emptyCopy: "AI will surface jobs that need a worker assigned.",
  },
  clients: {
    title: "Clients",
    kicker: "Customer base",
    intro: "Customer records, contact details, addresses and recent work context.",
    icon: Users,
    emptyTitle: "No clients found",
    emptyCopy: "Imported or created clients will show here.",
  },
  quotes: {
    title: "Quotes",
    kicker: "Sales desk",
    intro: "Draft, sent, pending and accepted quotes with AI follow-up support.",
    icon: FileText,
    emptyTitle: "No quotes found",
    emptyCopy: "Quotes will show here once created.",
  },
  invoices: {
    title: "Invoices",
    kicker: "Money board",
    intro: "Draft, sent, unpaid and overdue invoices with AI reminder support.",
    icon: DollarSign,
    emptyTitle: "No invoices found",
    emptyCopy: "AI can create draft invoices from completed jobs when pricing is available.",
  },
  team: {
    title: "Team",
    kicker: "Crew control",
    intro: "Workers, roles, availability, contact details and assignment readiness.",
    icon: Users,
    emptyTitle: "No team members found",
    emptyCopy: "Invited workers and staff will show here.",
  },
  payroll: {
    title: "Payroll",
    kicker: "Pay run",
    intro: "Worker time, completed jobs, pay-review signals and export readiness.",
    icon: CreditCard,
    emptyTitle: "No payroll data ready",
    emptyCopy: "Completed jobs and worker time will feed payroll review.",
  },
  rules: {
    title: "Rules",
    kicker: "Automation engine",
    intro: "Background AI checks, prepared actions, automation runs and approval-first controls.",
    icon: Zap,
    emptyTitle: "No automation actions waiting",
    emptyCopy: "AI will add rules/actions here when something needs attention.",
  },
  reports: {
    title: "Reports",
    kicker: "Owner numbers",
    intro: "Business numbers, work completed, crew load, open quotes and money to collect.",
    icon: ShieldCheck,
    emptyTitle: "No report data yet",
    emptyCopy: "Reports fill in as jobs, quotes and invoices are used.",
  },
  messages: {
    title: "Messages",
    kicker: "Customer comms",
    intro: "AI-drafted follow-ups, invoice reminders and customer messages waiting for approval.",
    icon: MessageSquare,
    emptyTitle: "No messages waiting",
    emptyCopy: "AI will prepare reminders and follow-ups here, but will not send without approval.",
  },
  integrations: {
    title: "Sync",
    kicker: "MYOB and integrations",
    intro: "MYOB sync, connected services, integration checks and data handoff status.",
    icon: Plug,
    emptyTitle: "No sync actions waiting",
    emptyCopy: "MYOB and integration tasks will appear here when connected.",
  },
  plans: {
    title: "Billing",
    kicker: "Plan and limits",
    intro: "Plan status, feature access, limits and billing controls.",
    icon: CreditCard,
    emptyTitle: "No billing actions waiting",
    emptyCopy: "Plan and billing controls stay here.",
  },
  settings: {
    title: "Settings",
    kicker: "Business setup",
    intro: "Business profile, preferences, account setup and workspace controls.",
    icon: Settings,
    emptyTitle: "No settings actions waiting",
    emptyCopy: "Business setup and account controls stay here.",
  },
  proof: {
    title: "Job Proof Packs",
    kicker: "Proof to paid",
    intro: "Completed work, photos, proof checks and invoice-ready job packs.",
    icon: CheckCircle2,
    emptyTitle: "No proof packs waiting",
    emptyCopy: "Completed jobs and uploaded proof photos will show here.",
  },
};

const ORDER = [
  "decisions",
  "jobs",
  "dispatch",
  "clients",
  "quotes",
  "invoices",
  "team",
  "payroll",
  "rules",
  "reports",
  "messages",
  "integrations",
  "plans",
  "settings"
];

const lower = (value) => String(value || "").toLowerCase();
const safe = (value) => String(value || "").trim();
const idOf = (item) => item?.id || item?._id || item?.action_id || item?.uuid || "";
const actionId = (action) => action?.id || action?.action_id || action?._id || action?.uuid || "";

const money = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "$0";
  return `$${number.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const dateText = (value) => {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
};

const titleCase = (value) =>
  safe(value || "unknown")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const pickArray = (payload, keys = []) => {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const settledValue = (result) => (result.status === "fulfilled" ? result.value : null);

const hasWorker = (job) =>
  Boolean(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || job?.assigned_worker_name || job?.worker_name);

const jobStatus = (job) => lower(job?.status || job?.job_status || job?.workflow_status);
const isCompletedJob = (job) =>
  ["completed", "done", "finished"].includes(jobStatus(job)) || job?.completed === true || Boolean(job?.completed_at);

const hasProof = (job) => {
  const keys = ["photos", "photo_urls", "proof_photos", "job_photos", "completion_photos", "worker_photos"];
  return keys.some((key) => {
    const value = job?.[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });
};

function getItemTitle(item, pageKey) {
  if (!item) return "Untitled";
  if (pageKey === "decisions" || pageKey === "rules" || item.action_type) {
    return item.title || item.name || "AI prepared action";
  }
  if (pageKey === "clients") return item.name || item.client_name || item.business_name || item.email || "Client";
  if (pageKey === "team" || pageKey === "payroll") return item.name || item.full_name || item.email || "Team member";
  if (pageKey === "quotes") return item.quote_number || item.number || item.title || item.customer_name || item.client_name || "Quote";
  if (pageKey === "invoices") return item.invoice_number || item.number || item.title || item.customer_name || item.client_name || "Invoice";
  if (pageKey === "reports") return item.title || "Report";
  if (pageKey === "integrations" || pageKey === "plans" || pageKey === "settings" || pageKey === "messages") return item.title || item.name || "Item";
  return item.title || item.job_title || item.name || item.customer_name || item.client_name || item.address || "Job";
}

function getItemSub(item, pageKey) {
  if (!item) return "";
  if (pageKey === "decisions" || pageKey === "rules" || item.action_type) {
    return item.summary || item.reason || item.description || "Ready for owner review.";
  }
  if (pageKey === "clients") return [item.email, item.phone, item.address].filter(Boolean).join(" • ") || "Client record";
  if (pageKey === "team") return [titleCase(item.role || "worker"), item.email || item.phone].filter(Boolean).join(" • ");
  if (pageKey === "payroll") return `${titleCase(item.role || "worker")} • Payroll review ready`;
  if (pageKey === "quotes") return `${titleCase(item.status || "draft")} • ${money(item.total || item.amount || item.price || item.total_amount)}`;
  if (pageKey === "invoices") return `${titleCase(item.status || "draft")} • ${money(item.total || item.amount || item.subtotal || item.total_amount)}`;
  if (pageKey === "reports") return item.summary || item.copy || "";
  if (pageKey === "messages") return item.summary || item.copy || "Draft message or reminder";
  if (pageKey === "integrations" || pageKey === "plans" || pageKey === "settings") return item.summary || item.copy || "";
  return [
    titleCase(item.status || item.job_status || "new"),
    item.assigned_worker_name || item.worker_name || "No worker assigned",
    dateText(item.scheduled_date || item.date || item.created_at)
  ].filter(Boolean).join(" • ");
}

function getBadge(item, pageKey) {
  if (!item) return "Open";
  if (item.action_type || pageKey === "decisions" || pageKey === "rules") return "Review";
  if (pageKey === "quotes" || pageKey === "invoices") return titleCase(item.status || "draft");
  if (pageKey === "jobs" || pageKey === "dispatch" || pageKey === "proof") return titleCase(item.status || item.job_status || "new");
  if (pageKey === "team" || pageKey === "payroll") return titleCase(item.role || "worker");
  return "Open";
}

function StatCard({ icon: Icon, label, value, copy, onClick }) {
  return (
    <button type="button" className="v3-workspace-card" onClick={onClick}>
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{copy}</small>
    </button>
  );
}

function DetailModal({ selected, pageKey, onClose, onApprove, busyActionId, onAskAi }) {
  if (!selected) return null;

  const item = selected.item;
  const isAction = selected.isAction || Boolean(item?.action_type);
  const id = actionId(item);

  return (
    <div className="v3-modal-backdrop" onClick={onClose}>
      <div className="v3-modal" onClick={(event) => event.stopPropagation()}>
        <div className="v3-modal-head">
          <div>
            <p className="v3-eyebrow">{isAction ? "AI prepared this" : PAGE_META[pageKey]?.kicker || "Details"}</p>
            <h2>{getItemTitle(item, pageKey)}</h2>
          </div>
          <button type="button" className="v3-icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="v3-modal-body">
          <p>{getItemSub(item, pageKey)}</p>

          <div className="v3-detail-grid">
            <div><small>Status</small><b>{getBadge(item, pageKey)}</b></div>
            <div><small>Client</small><b>{item?.customer_name || item?.client_name || item?.name || "Not set"}</b></div>
            <div><small>Worker</small><b>{item?.assigned_worker_name || item?.worker_name || item?.name || "Not assigned"}</b></div>
            <div><small>Amount</small><b>{money(item?.total || item?.amount || item?.price || item?.subtotal)}</b></div>
          </div>

          {isAction ? (
            <div className="v3-actions">
              <button
                type="button"
                className="v3-button dark"
                onClick={() => onApprove(item)}
                disabled={busyActionId === id}
              >
                {busyActionId === id ? "Doing it…" : "Approve and do it"}
              </button>
              <button type="button" className="v3-button secondary" onClick={onClose}>
                Not now
              </button>
            </div>
          ) : (
            <div className="v3-actions">
              <button type="button" className="v3-button" onClick={onAskAi}>
                <Sparkles size={18} /> Ask AI to handle next step
              </button>
              <button type="button" className="v3-button secondary" onClick={onClose}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function V3WorkspacePage({ type }) {
  const navigate = useNavigate();
  const { section } = useParams();

  const key = useMemo(() => {
    const clean = safe(section || type || "jobs").toLowerCase().replace(/[^a-z]/g, "");
    if (clean === "automation") return "rules";
    if (clean === "sms") return "messages";
    return PAGE_META[clean] ? clean : "jobs";
  }, [section, type]);

  const meta = PAGE_META[key] || PAGE_META.jobs;
  const HeroIcon = meta.icon || Sparkles;

  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiRunning, setAiRunning] = useState(false);
  const [busyActionId, setBusyActionId] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null);

  const pendingActions = useMemo(
    () => actions.filter((a) => ["pending", "edited", "needs_review", ""].includes(lower(a.status))),
    [actions]
  );

  const unassignedJobs = useMemo(() => jobs.filter((job) => !hasWorker(job) && !isCompletedJob(job)), [jobs]);
  const inProgressJobs = useMemo(() => jobs.filter((job) => ["in_progress", "started", "active", "paused"].includes(jobStatus(job))), [jobs]);
  const completedJobs = useMemo(() => jobs.filter(isCompletedJob), [jobs]);
  const proofJobs = useMemo(() => completedJobs.filter((job) => !hasProof(job) || job.ai_proof_review_needed), [completedJobs]);

  const openQuotes = useMemo(
    () => quotes.filter((quote) => ["draft", "sent", "pending"].includes(lower(quote.status))),
    [quotes]
  );

  const moneyItems = useMemo(
    () => invoices.filter((invoice) => ["draft", "sent", "overdue", "unpaid", "pending"].includes(lower(invoice.status))),
    [invoices]
  );

  const messageItems = useMemo(() => {
    const aiMessages = pendingActions.filter((action) =>
      ["prepare_quote_follow_up", "prepare_invoice_reminder"].includes(action.action_type)
    );
    const invoiceDrafts = invoices
      .filter((invoice) => invoice.ai_reminder_draft)
      .map((invoice) => ({
        title: `Invoice reminder for ${invoice.customer_name || invoice.client_name || "client"}`,
        summary: invoice.ai_reminder_draft,
        status: "draft",
      }));
    const quoteDrafts = quotes
      .filter((quote) => quote.ai_follow_up_draft)
      .map((quote) => ({
        title: `Quote follow-up for ${quote.customer_name || quote.client_name || "client"}`,
        summary: quote.ai_follow_up_draft,
        status: "draft",
      }));
    return [...aiMessages, ...invoiceDrafts, ...quoteDrafts];
  }, [pendingActions, invoices, quotes]);

  const reportItems = useMemo(() => ([
    { title: "Jobs completed", summary: `${completedJobs.length} completed jobs`, status: "live" },
    { title: "Unassigned jobs", summary: `${unassignedJobs.length} jobs need a worker`, status: unassignedJobs.length ? "needs review" : "clear" },
    { title: "Open quotes", summary: `${openQuotes.length} quotes need movement`, status: openQuotes.length ? "active" : "clear" },
    { title: "Money to collect", summary: `${moneyItems.length} invoices need attention`, status: moneyItems.length ? "active" : "clear" },
    { title: "Crew size", summary: `${workers.length} workers/team records`, status: "live" },
  ]), [completedJobs.length, unassignedJobs.length, openQuotes.length, moneyItems.length, workers.length]);

  const integrationItems = useMemo(() => ([
    { title: "MYOB sync", summary: "Connection and sync checks live here.", status: "setup" },
    { title: "Invoice handoff", summary: `${moneyItems.length} invoice items can be reviewed for sync or follow-up.`, status: "ready" },
    { title: "Data checks", summary: "AI watches for missing customer, invoice and job data.", status: "background" },
  ]), [moneyItems.length]);

  const plansItems = useMemo(() => ([
    { title: "Current plan", summary: "Plan status and limits are checked here.", status: "account" },
    { title: "Feature access", summary: "Team, SMS, MYOB and client limits stay controlled here.", status: "rules" },
  ]), []);

  const settingsItems = useMemo(() => ([
    { title: "Business profile", summary: "Company details, trade type and default preferences.", status: "setup" },
    { title: "Workspace rules", summary: "Approval-first AI, roles and owner controls.", status: "safe" },
  ]), []);

  const pageItems = useMemo(() => {
    if (key === "decisions" || key === "rules") return pendingActions;
    if (key === "jobs") return jobs;
    if (key === "dispatch") return unassignedJobs.length ? unassignedJobs : workers;
    if (key === "clients") return clients;
    if (key === "quotes") return quotes;
    if (key === "invoices") return invoices;
    if (key === "team") return workers;
    if (key === "payroll") return [...workers, ...completedJobs.slice(0, 8)];
    if (key === "reports") return reportItems;
    if (key === "messages") return messageItems;
    if (key === "integrations") return integrationItems;
    if (key === "plans") return plansItems;
    if (key === "settings") return settingsItems;
    if (key === "proof") return proofJobs;
    return jobs;
  }, [
    key,
    pendingActions,
    jobs,
    unassignedJobs,
    workers,
    clients,
    quotes,
    invoices,
    completedJobs,
    reportItems,
    messageItems,
    integrationItems,
    plansItems,
    settingsItems,
    proofJobs
  ]);

  const load = async () => {
    setLoading(true);
    setNotice("");

    const results = await Promise.allSettled([
      loadAiOperatorQueue(),
      get("/jobs"),
      get("/quotes"),
      get("/invoices"),
      get("/clients"),
      get("/team/workers"),
    ]);

    const queueResult = settledValue(results[0]);
    const jobsResult = settledValue(results[1]);
    const quotesResult = settledValue(results[2]);
    const invoicesResult = settledValue(results[3]);
    const clientsResult = settledValue(results[4]);
    const workersResult = settledValue(results[5]);

    setActions(queueResult?.actions || []);
    setJobs(pickArray(jobsResult, ["jobs"]));
    setQuotes(pickArray(quotesResult, ["quotes"]));
    setInvoices(pickArray(invoicesResult, ["invoices"]));
    setClients(pickArray(clientsResult, ["clients"]));
    setWorkers(pickArray(workersResult, ["workers", "team"]));

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const runAi = async (mode = "prepare") => {
    setAiRunning(true);
    setNotice(mode === "prepare" ? "AI is preparing the next actions…" : "AI is checking the business…");

    const result = mode === "prepare" ? await prepareTodayWithAi() : await runAiDailyCheck();

    if (result.ok) {
      setActions(result.actions || []);
      setNotice("AI finished. Check Owner Decisions for prepared actions.");
    } else {
      setNotice(result.message || "AI could not complete that check.");
    }

    await load();
    setAiRunning(false);
  };

  const approve = async (action) => {
    const id = actionId(action);
    if (!id) {
      setNotice("This AI action is missing an id, so it cannot be approved yet.");
      return;
    }

    setBusyActionId(id);
    const result = await approveAiAction(action);

    if (result.ok) {
      setActions((current) => current.filter((item) => actionId(item) !== id));
      setNotice(result.data?.message || "Approved. AI completed the action.");
      setSelected(null);
      await load();
    } else {
      setNotice(result.message || "Approval failed.");
    }

    setBusyActionId("");
  };

  const sectionStats = [
    { icon: Sparkles, label: "AI decisions", value: pendingActions.length, copy: "Owner approvals", to: "/v3/decisions" },
    { icon: AlertTriangle, label: "Unassigned jobs", value: unassignedJobs.length, copy: "AI can match crew", to: "/v3/dispatch" },
    { icon: DollarSign, label: "Money items", value: moneyItems.length, copy: "Invoices/reminders", to: "/v3/invoices" },
    { icon: CheckCircle2, label: "Completed jobs", value: completedJobs.length, copy: "Proof + billing", to: "/v3/proof" },
  ];

  return (
    <V3Shell>
      <main className="v3-workspace-detail">
        <section className="v3-workspace-hero">
          <div>
            <p className="v3-eyebrow">{meta.kicker}</p>
            <h1>{meta.title}</h1>
            <p>{meta.intro}</p>
          </div>

          <div className="v3-workspace-actions">
            <button type="button" className="v3-primary-btn" onClick={() => runAi("prepare")} disabled={aiRunning}>
              <Wand2 size={18} /> {aiRunning ? "Preparing…" : "AI handle this"}
            </button>
            <button type="button" className="v3-dark-btn" onClick={() => runAi("check")} disabled={aiRunning}>
              <RefreshCw size={18} /> Check again
            </button>
          </div>
        </section>

        {notice && <div className="v3-notice">{notice}</div>}

        <section className="v3-workspace-grid">
          {sectionStats.map((stat) => (
            <StatCard
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              copy={stat.copy}
              onClick={() => navigate(stat.to)}
            />
          ))}
        </section>

        <section className="v3-page-specific">
          <div className="v3-page-specific-main">
            <div className="v3-card-head">
              <div>
                <p>{loading ? "Loading live data" : meta.kicker}</p>
                <h2>{meta.title}</h2>
              </div>
              <strong>{loading ? "…" : pageItems.length}</strong>
            </div>

            {loading ? (
              <div className="v3-empty">
                <b>Loading {meta.title}</b>
                <span>Checking live jobs, clients, quotes, invoices, team and AI actions.</span>
              </div>
            ) : pageItems.length ? (
              <div className="v3-live-list">
                {pageItems.slice(0, 18).map((item, index) => {
                  const itemKey = idOf(item) || `${key}-${index}`;
                  const isAction = Boolean(item?.action_type) || key === "decisions" || key === "rules";

                  return (
                    <button
                      type="button"
                      className="v3-live-item"
                      key={itemKey}
                      onClick={() => setSelected({ item, isAction })}
                    >
                      <div className="v3-live-icon">
                        <HeroIcon size={18} />
                      </div>
                      <div className="v3-live-text">
                        <b>{getItemTitle(item, key)}</b>
                        <span>{getItemSub(item, key)}</span>
                      </div>
                      <small>{getBadge(item, key)}</small>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="v3-empty">
                <b>{meta.emptyTitle}</b>
                <span>{meta.emptyCopy}</span>
              </div>
            )}
          </div>

          <aside className="v3-page-specific-side">
            <div className="v3-card-head">
              <div>
                <p>AI next step</p>
                <h2>What AI can do</h2>
              </div>
            </div>

            <div className="v3-ai-stack">
              <button type="button" onClick={() => runAi("prepare")} disabled={aiRunning}>
                <Sparkles size={18} />
                <span>
                  <b>Prepare owner actions</b>
                  <small>AI checks this page and fills the approval queue.</small>
                </span>
              </button>

              <button type="button" onClick={() => navigate("/v3/decisions")}>
                <CheckCircle2 size={18} />
                <span>
                  <b>Open approval queue</b>
                  <small>Owner taps approve, then Churvox does the work.</small>
                </span>
              </button>

              <button type="button" onClick={() => navigate("/v3/dispatch")}>
                <Users size={18} />
                <span>
                  <b>Find crew gaps</b>
                  <small>AI checks unassigned jobs and worker coverage.</small>
                </span>
              </button>

              <button type="button" onClick={() => navigate("/v3/invoices")}>
                <Clock size={18} />
                <span>
                  <b>Prepare money follow-ups</b>
                  <small>Draft invoices and reminders stay approval-first.</small>
                </span>
              </button>
            </div>
          </aside>
        </section>

        <section className="v3-workspace-switcher">
          <p className="v3-eyebrow">Work areas</p>
          <div>
            {ORDER.map((item) => (
              <button
                type="button"
                key={item}
                className={item === key ? "active" : ""}
                onClick={() => navigate(`/v3/${item}`)}
              >
                {PAGE_META[item]?.title || item}
              </button>
            ))}
          </div>
        </section>

        <DetailModal
          selected={selected}
          pageKey={key}
          busyActionId={busyActionId}
          onClose={() => setSelected(null)}
          onApprove={approve}
          onAskAi={() => runAi("prepare")}
        />
      </main>
    </V3Shell>
  );
}
