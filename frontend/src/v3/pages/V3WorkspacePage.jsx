import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  RefreshCw,
  Sparkles,
  Users,
  Wand2,
  X
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

const AREAS = {
  decisions: ["Owner Decisions", "Approval queue", "AI-prepared actions, owner decisions, review items, and approval-first work."],
  jobs: ["Jobs", "Live run sheet", "Unassigned jobs, in-progress work, completed jobs, and proof checks."],
  dispatch: ["Dispatch", "Crew coverage", "Worker availability, schedule gaps, conflicts, and suggested job matches."],
  clients: ["Clients", "Customer base", "Customer records, addresses, notes, imports, and recent work."],
  quotes: ["Quotes", "Sales desk", "Draft quotes, sent quotes, follow-ups, and accepted work."],
  invoices: ["Invoices", "Money board", "Draft invoices, overdue invoices, paid invoices, and reminders."],
  team: ["Team", "Crew control", "Workers, invites, roles, availability, and job ownership."],
  payroll: ["Payroll", "Pay run", "Pay periods, approved hours, worker summaries, and payroll exports."],
  rules: ["Rules", "Automation engine", "AI checks, approval-first actions, active rules, and recent runs."],
  automation: ["Rules", "Automation engine", "AI checks, approval-first actions, active rules, and recent runs."],
  reports: ["Reports", "Owner numbers", "Revenue, completed jobs, crew time, and outstanding money."],
  messages: ["Messages", "Customer comms", "Draft replies, reminders, follow-ups, and message history."],
  sms: ["Messages", "Customer comms", "Draft replies, reminders, follow-ups, and message history."],
  integrations: ["Sync", "MYOB and integrations", "MYOB sync, connected services, data checks, and integration status."],
  plans: ["Billing", "Plan and billing", "Plan status, limits, billing checks, and account controls."],
  settings: ["Settings", "Business setup", "Business profile, user settings, preferences, and workspace controls."],
  proof: ["Job Proof Packs", "Proof to paid", "Photos, job proof, completion evidence, and invoice-ready packs."]
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
const titleize = (value) => String(value || "Unknown").replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
const money = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "$0";
  return `$${number.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

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

const actionId = (action) => action?.id || action?._id || action?.action_id || action?.uuid;

function itemTitle(item, type) {
  if (!item) return "Untitled";
  if (type === "team") return item.name || item.full_name || item.email || "Worker";
  if (type === "clients") return item.name || item.client_name || item.business_name || item.email || "Client";
  if (type === "invoices") return item.invoice_number || item.number || item.title || item.client_name || "Invoice";
  if (type === "quotes") return item.quote_number || item.number || item.title || item.client_name || "Quote";
  return item.title || item.job_title || item.name || item.client_name || item.address || "Item";
}

function itemMeta(item, type) {
  if (!item) return "";
  if (type === "invoices") return `${titleize(item.status || "draft")} • ${money(item.total || item.amount || item.total_amount)}`;
  if (type === "quotes") return `${titleize(item.status || "draft")} • ${money(item.total || item.amount || item.total_amount)}`;
  if (type === "jobs" || type === "dispatch") return `${titleize(item.status || "new")} • ${item.assigned_worker_name || item.worker_name || "No worker assigned"}`;
  if (type === "team") return `${titleize(item.role || "worker")} • ${item.email || item.phone || "No contact"}`;
  if (type === "clients") return item.email || item.phone || item.address || "Client record";
  return item.summary || item.reason || item.description || "Ready for review";
}

function MiniStat({ icon: Icon, label, value, copy, onClick }) {
  return (
    <button type="button" className="v3-workspace-card" onClick={onClick}>
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{copy}</small>
    </button>
  );
}

function DetailModal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="v3-modal-backdrop" onClick={onClose}>
      <div className="v3-modal" onClick={(event) => event.stopPropagation()}>
        <div className="v3-modal-head">
          <div>
            <p className="v3-eyebrow">Details</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="v3-icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function V3WorkspacePage({ type }) {
  const navigate = useNavigate();
  const { section } = useParams();
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

  const key = useMemo(() => {
    const clean = String(section || type || "jobs").toLowerCase().replace(/[^a-z]/g, "");
    return AREAS[clean] ? clean : "jobs";
  }, [section, type]);

  const [title, kicker, intro] = AREAS[key];

  const pendingActions = useMemo(
    () => actions.filter((a) => ["pending", "edited", "needs_review", ""].includes(lower(a.status))),
    [actions]
  );

  const unassignedJobs = useMemo(
    () => jobs.filter((job) => !job.assigned_worker_id && !job.worker_id && !job.assigned_to && !job.assigned_worker_name),
    [jobs]
  );

  const inProgressJobs = useMemo(
    () => jobs.filter((job) => ["in_progress", "started", "active", "paused"].includes(lower(job.status))),
    [jobs]
  );

  const completedJobs = useMemo(
    () => jobs.filter((job) => ["completed", "done", "finished"].includes(lower(job.status))),
    [jobs]
  );

  const moneyItems = useMemo(
    () => invoices.filter((inv) => ["draft", "sent", "overdue", "unpaid", "pending"].includes(lower(inv.status))),
    [invoices]
  );

  const quoteItems = useMemo(
    () => quotes.filter((quote) => ["draft", "sent", "pending", "accepted"].includes(lower(quote.status))),
    [quotes]
  );

  const currentItems = useMemo(() => {
    if (key === "decisions" || key === "rules" || key === "automation") return pendingActions;
    if (key === "jobs" || key === "proof") return jobs;
    if (key === "dispatch") return unassignedJobs.length ? unassignedJobs : jobs;
    if (key === "clients") return clients;
    if (key === "quotes") return quoteItems.length ? quoteItems : quotes;
    if (key === "invoices") return moneyItems.length ? moneyItems : invoices;
    if (key === "team") return workers;
    if (key === "payroll") return workers;
    if (key === "reports") return [
      { title: "Jobs completed", summary: `${completedJobs.length} completed jobs` },
      { title: "Money to collect", summary: `${moneyItems.length} invoice items need attention` },
      { title: "Crew active", summary: `${workers.length} worker records` },
    ];
    return pendingActions;
  }, [key, pendingActions, jobs, unassignedJobs, clients, quoteItems, quotes, moneyItems, invoices, workers, completedJobs]);

  const load = async () => {
    setLoading(true);
    setNotice("");

    const [queueResult, jobsResult, quotesResult, invoicesResult, clientsResult, workersResult] = await Promise.all([
      loadAiOperatorQueue(),
      get("/jobs"),
      get("/quotes"),
      get("/invoices"),
      get("/clients"),
      get("/team/workers"),
    ]);

    setActions(queueResult.actions || []);
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

  const runAi = async (mode) => {
    setAiRunning(true);
    setNotice(mode === "prepare" ? "AI is preparing the work…" : "AI is checking this workspace…");

    const result = mode === "prepare" ? await prepareTodayWithAi() : await runAiDailyCheck();

    if (result.ok) {
      setActions(result.actions || []);
      setNotice("AI finished. Review the prepared actions.");
    } else {
      setNotice(result.message || "AI check could not run.");
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
      setNotice("Approved. AI completed the action.");
      setSelected(null);
      await load();
    } else {
      setNotice(result.message || "Approval failed.");
    }

    setBusyActionId("");
  };

  return (
    <V3Shell>
      <main className="v3-workspace-detail">
        <section className="v3-workspace-hero">
          <div>
            <p className="v3-eyebrow">{kicker}</p>
            <h1>{title}</h1>
            <p>{intro}</p>
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
          <MiniStat icon={Sparkles} label="AI decisions" value={pendingActions.length} copy="Owner approval queue" onClick={() => navigate("/v3/decisions")} />
          <MiniStat icon={Users} label="Unassigned jobs" value={unassignedJobs.length} copy="AI can match workers" onClick={() => navigate("/v3/dispatch")} />
          <MiniStat icon={DollarSign} label="Money items" value={moneyItems.length} copy="Drafts and reminders" onClick={() => navigate("/v3/invoices")} />
          <MiniStat icon={CheckCircle2} label="Completed jobs" value={completedJobs.length} copy="Proof and invoice ready" onClick={() => navigate("/v3/proof")} />
        </section>

        <section className="v3-live-panel">
          <div className="v3-card-head">
            <div>
              <p>{loading ? "Loading" : "Live workspace"}</p>
              <h2>{title}</h2>
            </div>
            <strong>{loading ? "…" : currentItems.length}</strong>
          </div>

          {loading ? (
            <div className="v3-empty"><b>Loading live data</b><span>Checking jobs, clients, quotes, invoices, crew and AI actions.</span></div>
          ) : currentItems.length ? (
            <div className="v3-live-list">
              {currentItems.slice(0, 12).map((item, index) => {
                const isAction = key === "decisions" || key === "rules" || key === "automation";
                const id = isAction ? actionId(item) : (item.id || item._id || `${key}-${index}`);
                return (
                  <button
                    type="button"
                    className="v3-live-item"
                    key={id || index}
                    onClick={() => setSelected({ item, isAction })}
                  >
                    <div>
                      <b>{isAction ? (item.title || item.name || "AI prepared action") : itemTitle(item, key)}</b>
                      <span>{isAction ? (item.summary || item.reason || item.description || "Ready for owner review") : itemMeta(item, key)}</span>
                    </div>
                    <small>{isAction ? "Review" : "Open"}</small>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="v3-empty">
              <b>Nothing urgent here</b>
              <span>Tap AI handle this and Churvox will prepare any work that needs owner approval.</span>
            </div>
          )}
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
                {AREAS[item][0]}
              </button>
            ))}
          </div>
        </section>

        <DetailModal
          open={!!selected}
          title={
            selected?.isAction
              ? selected?.item?.title || "AI prepared action"
              : itemTitle(selected?.item, key)
          }
          onClose={() => setSelected(null)}
        >
          {selected?.isAction ? (
            <div className="v3-modal-body">
              <p>{selected.item.summary || selected.item.reason || selected.item.description || "AI prepared this action for owner approval."}</p>
              <pre>{JSON.stringify(selected.item, null, 2)}</pre>
              <div className="v3-actions">
                <button
                  type="button"
                  className="v3-button dark"
                  onClick={() => approve(selected.item)}
                  disabled={busyActionId === actionId(selected.item)}
                >
                  {busyActionId === actionId(selected.item) ? "Doing it…" : "Approve and do it"}
                </button>
                <button type="button" className="v3-button secondary" onClick={() => setSelected(null)}>
                  Not now
                </button>
              </div>
            </div>
          ) : (
            <div className="v3-modal-body">
              <p>{itemMeta(selected?.item, key)}</p>
              <pre>{JSON.stringify(selected?.item || {}, null, 2)}</pre>
              <div className="v3-actions">
                <button type="button" className="v3-button" onClick={() => runAi("prepare")}>
                  Ask AI to handle next step
                </button>
                <button type="button" className="v3-button secondary" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
            </div>
          )}
        </DetailModal>
      </main>
    </V3Shell>
  );
}
