import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  HardHat,
  RefreshCw,
  Sparkles,
  Users,
  Wand2
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

const workspaces = [
  ["Jobs", "/v3/jobs", "Live run sheet"],
  ["Dispatch", "/v3/dispatch", "Crew coverage"],
  ["Clients", "/v3/clients", "Customer base"],
  ["Quotes", "/v3/quotes", "Sales desk"],
  ["Invoices", "/v3/invoices", "Money board"],
  ["Decisions", "/v3/decisions", "Owner approval queue"],
  ["Team", "/v3/team", "Crew control"],
  ["Payroll", "/v3/payroll", "Pay run"],
  ["Rules", "/v3/rules", "Background engine"],
  ["Reports", "/v3/reports", "Owner numbers"],
  ["Messages", "/v3/messages", "Customer comms"],
];

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

const lower = (value) => String(value || "").toLowerCase();
const actionId = (action) => action?.id || action?._id || action?.action_id || action?.uuid;

function Empty({ title, copy }) {
  return (
    <div className="v3-empty">
      <b>{title}</b>
      <span>{copy}</span>
    </div>
  );
}

function ActionRow({ action, onOpen, onApprove, busy }) {
  return (
    <div className="v3-row">
      <button type="button" onClick={onOpen} className="v3-button ghost v3-row-main">
        <span>
          <b>{action.title || action.name || "AI prepared action"}</b>
          <span>{action.summary || action.reason || action.description || "Ready for owner review."}</span>
        </span>
      </button>
      <button type="button" className="v3-button dark" onClick={onApprove} disabled={busy}>
        {busy ? "Doing it…" : "Approve"}
      </button>
    </div>
  );
}

export default function V3SmartHubPage() {
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [busyActionId, setBusyActionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiRunning, setAiRunning] = useState(false);
  const [notice, setNotice] = useState("");

  const pending = useMemo(
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

  const draftQuotes = useMemo(
    () => quotes.filter((q) => ["draft", "pending", "sent"].includes(lower(q.status))),
    [quotes]
  );

  const moneyItems = useMemo(
    () => invoices.filter((inv) => ["draft", "sent", "overdue", "unpaid", "pending"].includes(lower(inv.status))),
    [invoices]
  );

  const load = async () => {
    setLoading(true);
    setNotice("");

    const [queueResult, jobsResult, quotesResult, invoicesResult, workersResult] = await Promise.all([
      loadAiOperatorQueue(),
      get("/jobs"),
      get("/quotes"),
      get("/invoices"),
      get("/team/workers"),
    ]);

    setActions(queueResult.actions || []);
    setJobs(pickArray(jobsResult, ["jobs"]));
    setQuotes(pickArray(quotesResult, ["quotes"]));
    setInvoices(pickArray(invoicesResult, ["invoices"]));
    setWorkers(pickArray(workersResult, ["workers", "team"]));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const runAi = async (mode) => {
    setAiRunning(true);
    setNotice(mode === "prepare" ? "AI is preparing the owner queue…" : "AI is checking the business…");

    const result = mode === "prepare" ? await prepareTodayWithAi() : await runAiDailyCheck();
    if (result.ok) {
      setActions(result.actions || []);
      setNotice("AI finished. Review the approval queue.");
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
      await load();
    } else {
      setNotice(result.message || "Approval failed.");
    }

    setBusyActionId("");
  };

  const topAction = pending[0];

  return (
    <V3Shell>
      <div className="v3-page">
        <section className="v3-hero">
          <div className="v3-hero-main">
            <div className="v3-hero-copy">
              <p className="v3-eyebrow">AI trade command centre</p>
              <h1>AI runs the admin. You approve.</h1>
              <p>
                Churvox checks jobs, crew, quotes, invoices, money and owner decisions. It prepares the work,
                then the owner taps approve when it is right.
              </p>
              <div className="v3-actions">
                <button className="v3-button" onClick={() => runAi("prepare")} disabled={aiRunning}>
                  <Wand2 size={18} /> {aiRunning ? "Preparing…" : "Prepare my day"}
                </button>
                <button className="v3-button secondary" onClick={() => runAi("check")} disabled={aiRunning}>
                  <RefreshCw size={18} /> Refresh checks
                </button>
              </div>
              {notice && <div className="v3-notice">{notice}</div>}
            </div>
          </div>

          <aside className="v3-hero-panel">
            <div className="v3-now-card">
              <div>
                <small>Owner approval queue</small>
                <b>{loading ? "…" : pending.length}</b>
                <span>{pending.length ? "AI-prepared actions waiting" : "Nothing waiting right now"}</span>
              </div>
              <button
                className="v3-button dark"
                onClick={() => (topAction ? approve(topAction) : runAi("check"))}
                disabled={aiRunning || !!busyActionId}
              >
                {topAction ? "Approve first" : "Check again"}
              </button>
            </div>

            <div className="v3-site-card">
              <div className="v3-site-icon">
                <HardHat size={25} />
              </div>
              <div>
                <small>Trade OS</small>
                <b>Field + office synced</b>
                <span>AI prepares admin. Owners stay in control.</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="v3-metrics">
          <button className="v3-metric" onClick={() => navigate("/v3/decisions")}>
            <b>{pending.length}</b>
            <span>Decisions</span>
            <small>{pending.length ? "Needs approval" : "All clear"}</small>
          </button>

          <button className="v3-metric" onClick={() => navigate("/v3/dispatch")}>
            <b>{unassignedJobs.length}</b>
            <span>Unassigned jobs</span>
            <small>AI can match crew</small>
          </button>

          <button className="v3-metric lime" onClick={() => navigate("/v3/invoices")}>
            <b>{moneyItems.length}</b>
            <span>Money items</span>
            <small>Drafts and reminders</small>
          </button>

          <button className="v3-metric" onClick={() => navigate("/v3/team")}>
            <b>{workers.length}</b>
            <span>Crew</span>
            <small>{inProgressJobs.length} active jobs</small>
          </button>
        </section>

        <section className="v3-board">
          <article className="v3-card">
            <div className="v3-card-head">
              <div>
                <p>AI Operator</p>
                <h2>Owner approval queue</h2>
              </div>
              <strong>{pending.length}</strong>
            </div>

            {loading ? (
              <Empty title="Checking the business" copy="AI is refreshing prepared work and owner decisions." />
            ) : pending.length ? (
              pending.slice(0, 5).map((action) => (
                <ActionRow
                  key={actionId(action)}
                  action={action}
                  busy={busyActionId === actionId(action)}
                  onOpen={() => navigate("/v3/decisions")}
                  onApprove={() => approve(action)}
                />
              ))
            ) : (
              <Empty title="Nothing waiting" copy="AI has no owner decisions waiting right now." />
            )}
          </article>

          <article className="v3-card">
            <div className="v3-card-head">
              <div>
                <p>AI-prepared work</p>
                <h2>What needs attention</h2>
              </div>
            </div>

            <div className="v3-ai-stack">
              <button type="button" onClick={() => navigate("/v3/dispatch")}>
                <Users size={18} />
                <span><b>{unassignedJobs.length} jobs need crew</b><small>AI should suggest the best available worker.</small></span>
              </button>
              <button type="button" onClick={() => navigate("/v3/quotes")}>
                <Clock size={18} />
                <span><b>{draftQuotes.length} quotes need movement</b><small>AI should prepare follow-ups and next steps.</small></span>
              </button>
              <button type="button" onClick={() => navigate("/v3/invoices")}>
                <DollarSign size={18} />
                <span><b>{moneyItems.length} money items</b><small>AI should prepare reminders and draft invoices.</small></span>
              </button>
              <button type="button" onClick={() => runAi("prepare")} disabled={aiRunning}>
                <Sparkles size={18} />
                <span><b>Prepare everything for me</b><small>Run AI checks and fill the owner approval queue.</small></span>
              </button>
            </div>
          </article>

          <div className="v3-side-stack">
            <article className="v3-card">
              <div className="v3-card-head">
                <div>
                  <p>Automation</p>
                  <h2>Quiet background</h2>
                </div>
              </div>
              <Empty title="Approval-first" copy="AI can prepare work, but sending, pricing, payroll, deleting and accounting changes still need owner approval." />
            </article>

            <article className="v3-card">
              <div className="v3-card-head">
                <div>
                  <p>Cashflow</p>
                  <h2>Invoices</h2>
                </div>
              </div>
              <button className="v3-button dark" onClick={() => navigate("/v3/invoices")}>
                Open money board
              </button>
            </article>
          </div>

          <article className="v3-card v3-workspaces">
            <div className="v3-card-head">
              <div>
                <p>Work areas</p>
                <h2>Open a workspace</h2>
              </div>
            </div>
            <div className="v3-workspace-grid">
              {workspaces.map(([name, path, copy]) => (
                <button className="v3-workspace" key={path} onClick={() => navigate(path)}>
                  <b>{name}</b>
                  <span>{copy}</span>
                </button>
              ))}
            </div>
          </article>
        </section>
      </div>
    </V3Shell>
  );
}
