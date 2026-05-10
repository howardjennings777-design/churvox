import churvoxLogoIcon from "../../assets/churvox-logo-icon.svg";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  HardHat,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import {
  approveAiAction,
  loadAiOperatorQueue,
  prepareTodayWithAi,
  runAiDailyCheck
} from "../../lib/aiOperator";
import { get } from "../../lib/api";
import V3Shell from "../components/V3Shell";
import V3<img className="churvox-logo-force" src={churvoxLogoIcon} alt="Churvox" /> ChurvoxEdge from "../components/V3ChurvoxEdge";
import "../styles/v3.css";

const lower = (value) => String(value || "").toLowerCase();
const actionId = (action) => action?.id || action?._id || action?.action_id || action?.uuid;

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

const isCompletedJob = (job) => {
  const status = lower(job?.status || job?.job_status || job?.workflow_status);
  return status === "completed" || status === "done" || job?.completed === true || Boolean(job?.completed_at);
};

const hasWorker = (job) => Boolean(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || job?.assigned_worker_name || job?.worker_name);
const hasProof = (job) => ["photos", "photo_urls", "proof_photos", "job_photos", "worker_photos", "completion_photos"].some((key) => {
  const value = job?.[key];
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
});

function Empty({ title, copy }) {
  return (
    <div className="v3-empty">
      <b>{title}</b>
      <span>{copy}</span>
    </div>
  );
}

function SmartModal({ item, onClose, onApprove, busy, onNavigate }) {
  if (!item) return null;
  const isAction = item.kind === "action";

  return (
    <div className="v3-modal-backdrop" onClick={onClose}>
      <div className="v3-modal cvx-decision-modal" onClick={(event) => event.stopPropagation()}>
        <div className="v3-modal-head">
          <div>
            <p className="v3-eyebrow">{item.kicker || "Churvox detail"}</p>
            <h2>{item.title}</h2>
          </div>
          <button type="button" className="v3-icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="v3-modal-body">
          <div className="cvx-ai-explain">
            <div className="cvx-ai-explain-icon"><Brain size={20} /></div>
            <div>
              <small>Prepared by Churvox AI</small>
              <p>{item.copy}</p>
            </div>
          </div>

          <div className="v3-detail-grid">
            {(item.fields || []).map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <b>{value}</b>
              </div>
            ))}
          </div>

          {item.reason && (
            <div className="cvx-reason-box">
              <small>Why this matters</small>
              <b>{item.reason}</b>
            </div>
          )}

          <div className="v3-actions">
            {isAction && (
              <button className="v3-button dark" onClick={() => onApprove(item.raw)} disabled={busy}>
                {busy ? "Doing it…" : "Approve and do it"}
              </button>
            )}

            {item.href && (
              <button className="v3-button secondary" onClick={() => onNavigate(item.href)}>
                Open workspace
              </button>
            )}

            <button className="v3-button secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DecisionRow({ item, busy, onOpen, onApprove }) {
  return (
    <div className="cvx-decision-row">
      <button type="button" onClick={onOpen} className="cvx-decision-main">
        <span className="cvx-decision-icon"><Sparkles size={17} /></span>
        <span>
          <b>{item.title}</b>
          <small>{item.copy}</small>
        </span>
      </button>
      <button type="button" className="v3-button dark" onClick={onApprove} disabled={busy}>
        {busy ? "Doing…" : "Approve"}
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
  const [selected, setSelected] = useState(null);

  const pending = useMemo(
    () => actions.filter((a) => ["pending", "edited", "needs_review", ""].includes(lower(a.status || a.queue_status))),
    [actions]
  );

  const unassignedJobs = useMemo(
    () => jobs.filter((job) => !hasWorker(job) && !isCompletedJob(job)),
    [jobs]
  );

  const activeJobs = useMemo(
    () => jobs.filter((job) => ["in_progress", "started", "active", "paused", "assigned", "acknowledged"].includes(lower(job.status || job.job_status))),
    [jobs]
  );

  const completedJobs = useMemo(() => jobs.filter(isCompletedJob), [jobs]);

  const proofNeeded = useMemo(
    () => completedJobs.filter((job) => !hasProof(job) || job.ai_proof_review_needed),
    [completedJobs]
  );

  const openQuotes = useMemo(
    () => quotes.filter((q) => ["draft", "pending", "sent", "open", ""].includes(lower(q.status))),
    [quotes]
  );

  const moneyItems = useMemo(
    () => invoices.filter((inv) => ["draft", "sent", "overdue", "unpaid", "pending", ""].includes(lower(inv.status))),
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

  const runAi = async (mode = "prepare") => {
    setAiRunning(true);
    setNotice(mode === "prepare" ? "Churvox AI is preparing next moves…" : "Churvox AI is checking the business…");

    const result = mode === "prepare" ? await prepareTodayWithAi() : await runAiDailyCheck();

    if (result.ok) {
      setActions(result.actions || []);
      setNotice(result.data?.message || "Churvox AI finished. Review Owner Decisions.");
    } else {
      setNotice(result.message || "Churvox AI could not run. Check OpenAI/Render settings.");
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
      setNotice(result.data?.message || "Approved. Churvox AI completed the action.");
      setSelected(null);
      await load();
    } else {
      setNotice(result.message || "Approval failed.");
    }

    setBusyActionId("");
  };

  const navigateTo = (href) => {
    setSelected(null);
    navigate(href);
  };

  const summaryCards = [
    {
      kind: "summary",
      title: `${pending.length} Owner Decisions`,
      kicker: "Owner approval queue",
      copy: pending.length ? "AI has prepared work that needs your approval before it runs." : "No decisions waiting. Run the AI check to prepare the next move.",
      reason: "This is the main control point: Churvox prepares the admin, but the owner approves the action.",
      href: "/v3/decisions",
      fields: [["Waiting", pending.length], ["Safety", "Owner approval"], ["Risk control", "On"]],
      icon: Sparkles,
    },
    {
      kind: "summary",
      title: `${unassignedJobs.length} jobs need Crew Match`,
      kicker: "AI dispatch matching",
      copy: "AI can recommend the best worker by area, workload, timing and job fit.",
      reason: "This makes Churvox feel like a real operator, because the assignment is prepared before the owner approves it.",
      href: "/v3/dispatch",
      fields: [["Unassigned", unassignedJobs.length], ["Active jobs", activeJobs.length], ["Crew", workers.length]],
      icon: Users,
    },
    {
      kind: "summary",
      title: `${moneyItems.length} money moves`,
      kicker: "Money Board",
      copy: "Draft invoices, unpaid work and overdue follow-ups are grouped for approval.",
      reason: "The strongest workflow is finished work moving cleanly through proof, invoice approval and payment follow-up.",
      href: "/v3/invoices",
      fields: [["Money items", moneyItems.length], ["Completed jobs", completedJobs.length], ["Proof flags", proofNeeded.length]],
      icon: DollarSign,
    },
    {
      kind: "summary",
      title: `${proofNeeded.length} Proof-to-Paid checks`,
      kicker: "Proof-to-Paid",
      copy: "Completed jobs are checked for photos, proof, time and invoice readiness.",
      reason: "This turns the app from a job list into a workflow that helps make sure completed work gets billed.",
      href: "/v3/proof",
      fields: [["Completed", completedJobs.length], ["Needs proof", proofNeeded.length], ["Ready to bill", Math.max(0, completedJobs.length - proofNeeded.length)]],
      icon: CheckCircle2,
    },
  ];

  const actionItems = pending.slice(0, 6).map((action) => ({
    kind: "action",
    title: action.title || action.name || "Churvox prepared action",
    kicker: action.module || action.action_type || "Owner Decision",
    copy: action.summary || action.reason || action.description || "Ready for owner review.",
    reason: action.reason || "Churvox prepared this because it appears to be the next safest useful business action.",
    raw: action,
    href: "/v3/decisions",
    fields: [
      ["Type", action.action_type || "Action"],
      ["Risk", action.risk_level || "Low"],
      ["Confidence", action.confidence ? `${Math.round(Number(action.confidence) * 100)}%` : "Prepared"],
      ["Status", action.queue_status || action.status || "Pending"],
    ],
  }));

  const nextBestMove = pending.length
    ? "Review the first Owner Decision."
    : unassignedJobs.length
    ? "Run Crew Match for unassigned jobs."
    : moneyItems.length
    ? "Open Money Board and approve money actions."
    : proofNeeded.length
    ? "Check Proof-to-Paid before invoicing."
    : "Run Churvox AI to prepare the next moves.";

  return (
    <V3Shell>
      <div className="v3-page cvx-smart-hub">
        <section className="v3-hero cvx-command-hero">
          <div className="v3-hero-main">
            <div className="v3-hero-copy">
              <p className="v3-eyebrow">Churvox AI Trade OS</p>
              <h1>Your business operator for today.</h1>
              <p>
                Churvox checks jobs, crew, proof, quotes, invoices and owner decisions.
                It prepares the work, explains why, and waits for approval before risky action.
              </p>
              <div className="v3-actions">
                <button className="v3-button" onClick={() => runAi("prepare")} disabled={aiRunning}>
                  <Wand2 size={18} /> {aiRunning ? "Preparing…" : "Prepare next moves"}
                </button>
                <button className="v3-button secondary" onClick={() => runAi("check")} disabled={aiRunning}>
                  <RefreshCw size={18} /> Run Churvox check
                </button>
              </div>
              {notice && <div className="v3-notice">{notice}</div>}
            </div>
          </div>

          <aside className="v3-hero-panel">
            <div className="v3-now-card cvx-next-card">
              <div>
                <small>Next best move</small>
                <b>{loading ? "Checking…" : nextBestMove}</b>
                <span>Tap cards for pop-up detail. Only workspace buttons change page.</span>
              </div>
              <button
                className="v3-button dark"
                onClick={() => actionItems[0] ? setSelected(actionItems[0]) : runAi("prepare")}
                disabled={aiRunning || !!busyActionId}
              >
                {actionItems[0] ? "Review first" : "Prepare"}
              </button>
            </div>

            <div className="v3-site-card">
              <div className="v3-site-icon">
                <HardHat size={25} />
              </div>
              <div>
                <small>Churvox promise</small>
                <b>AI prepares. Owner approves.</b>
                <span>Built around useful decisions, not empty dashboard noise.</span>
              </div>
            </div>
          </aside>
        </section>

        <V3ChurvoxEdge
          section="dashboard"
          decisions={pending.length}
          unassigned={unassignedJobs.length}
          money={moneyItems.length}
          proof={proofNeeded.length}
          loading={loading}
          onPrepare={() => runAi("prepare")}
          onOpenCard={setSelected}
        />

        <section className="cvx-command-metrics">
          {summaryCards.map(({ icon: Icon, ...item }) => (
            <button className="cvx-command-card" key={item.title} onClick={() => setSelected(item)}>
              <Icon size={20} />
              <span>{item.kicker}</span>
              <strong>{item.title}</strong>
              <small>{item.copy}</small>
            </button>
          ))}
        </section>

        <section className="v3-board cvx-command-board">
          <article className="v3-card cvx-owner-decisions">
            <div className="v3-card-head">
              <div>
                <p>Owner Decisions</p>
                <h2>Prepared by Churvox AI</h2>
              </div>
              <strong>{pending.length}</strong>
            </div>

            {loading ? (
              <Empty title="Checking the business" copy="Churvox AI is refreshing prepared work and owner decisions." />
            ) : actionItems.length ? (
              actionItems.map((item) => (
                <DecisionRow
                  key={actionId(item.raw)}
                  item={item}
                  busy={busyActionId === actionId(item.raw)}
                  onOpen={() => setSelected(item)}
                  onApprove={() => approve(item.raw)}
                />
              ))
            ) : (
              <Empty title="No owner decisions waiting" copy="Run Churvox AI to check jobs, proof, crew, quotes and money." />
            )}
          </article>

          <article className="v3-card cvx-moat-card">
            <div className="v3-card-head">
              <div>
                <p>Churvox Advantage</p>
                <h2>Where this beats normal job apps</h2>
              </div>
              <ShieldCheck size={24} />
            </div>

            <div className="cvx-advantage-list">
              <button type="button" onClick={() => setSelected(summaryCards[1])}>
                <Users size={18} />
                <span><b>Crew Match</b><small>AI recommends the worker before the owner approves.</small></span>
              </button>
              <button type="button" onClick={() => setSelected(summaryCards[3])}>
                <CheckCircle2 size={18} />
                <span><b>Proof-to-Paid</b><small>Completed work becomes invoice-ready with proof checks.</small></span>
              </button>
              <button type="button" onClick={() => setSelected(summaryCards[2])}>
                <DollarSign size={18} />
                <span><b>Money Board</b><small>Drafts, reminders and payment actions are prepared.</small></span>
              </button>
              <button type="button" onClick={() => setSelected({
                kind: "summary",
                kicker: "Auto Rules",
                title: "Safe background automation",
                copy: "Auto Rules can handle safe admin patterns while risky actions stay approval-first.",
                reason: "This lets Churvox feel automatic without letting important business changes happen silently.",
                href: "/v3/rules",
                fields: [["Safe admin", "Can automate"], ["Risky actions", "Approval-first"], ["Workspace", "Auto Rules"]],
              })}>
                <Zap size={18} />
                <span><b>Auto Rules</b><small>Safe admin can run quietly. Risky actions stay approval-first.</small></span>
              </button>
            </div>
          </article>

          <article className="v3-card v3-workspaces cvx-nav-card">
            <div className="v3-card-head">
              <div>
                <p>Navigate only here</p>
                <h2>Churvox workspaces</h2>
              </div>
            </div>
            <div className="v3-workspace-grid">
              {[
                ["AI Run Sheet", "/v3/jobs", "Jobs, proof, workers, billing readiness"],
                ["Crew Match", "/v3/dispatch", "AI dispatch recommendations"],
                ["Owner Decisions", "/v3/decisions", "Approve prepared actions"],
                ["Proof-to-Paid", "/v3/proof", "Completed work to invoice-ready"],
                ["Money Board", "/v3/invoices", "Drafts, reminders, unpaid money"],
                ["Quote Desk", "/v3/quotes", "Follow-ups and accepted work"],
                ["Crew", "/v3/team", "People, regions and readiness"],
                ["Auto Rules", "/v3/rules", "Safe background operator rules"],
              ].map(([name, path, copy]) => (
                <button className="v3-workspace" key={path} onClick={() => navigate(path)}>
                  <b>{name}</b>
                  <span>{copy}</span>
                </button>
              ))}
            </div>
          </article>
        </section>

        <SmartModal
          item={selected}
          onClose={() => setSelected(null)}
          onApprove={approve}
          busy={!!busyActionId}
          onNavigate={navigateTo}
        />
      </div>
    </V3Shell>
  );
}
