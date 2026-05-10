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

function Empty({ title, copy }) {
  return (
    <div className="v3-empty">
      <b>{title}</b>
      <span>{copy}</span>
    </div>
  );
}

function SmartModal({ item, onClose, onApprove, busy }) {
  if (!item) return null;
  const isAction = item.kind === "action";
  return (
    <div className="v3-modal-backdrop" onClick={onClose}>
      <div className="v3-modal" onClick={(event) => event.stopPropagation()}>
        <div className="v3-modal-head">
          <div>
            <p className="v3-eyebrow">{item.kicker || "Smart Hub detail"}</p>
            <h2>{item.title}</h2>
          </div>
          <button type="button" className="v3-icon-button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="v3-modal-body">
          <p>{item.copy}</p>

          <div className="v3-detail-grid">
            {(item.fields || []).map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <b>{value}</b>
              </div>
            ))}
          </div>

          <div className="v3-actions">
            {isAction && (
              <button className="v3-button dark" onClick={() => onApprove(item.raw)} disabled={busy}>
                {busy ? "Doing it…" : "Approve and do it"}
              </button>
            )}
            {item.href && (
              <button className="v3-button secondary" onClick={() => { window.location.href = item.href; }}>
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
      setSelected(null);
      await load();
    } else {
      setNotice(result.message || "Approval failed.");
    }

    setBusyActionId("");
  };

  const hubItems = [
    {
      kind: "summary",
      title: `${pending.length} owner decisions`,
      kicker: "AI Operator",
      copy: pending.length ? "AI-prepared actions are waiting for owner approval." : "Nothing is waiting right now.",
      href: "/v3/decisions",
      fields: [["Waiting", pending.length], ["Mode", "Approval-first"]],
    },
    {
      kind: "summary",
      title: `${unassignedJobs.length} jobs need crew`,
      kicker: "Dispatch",
      copy: "AI should match unassigned jobs to the best available worker.",
      href: "/v3/dispatch",
      fields: [["Unassigned", unassignedJobs.length], ["Active jobs", inProgressJobs.length]],
    },
    {
      kind: "summary",
      title: `${draftQuotes.length} quotes need movement`,
      kicker: "Quotes",
      copy: "AI can prepare quote follow-ups and next steps.",
      href: "/v3/quotes",
      fields: [["Open quotes", draftQuotes.length], ["Next", "Follow-up"]],
    },
    {
      kind: "summary",
      title: `${moneyItems.length} money items`,
      kicker: "Invoices",
      copy: "AI can prepare invoice reminders and draft invoices.",
      href: "/v3/invoices",
      fields: [["Money items", moneyItems.length], ["Next", "Collect"]],
    },
  ];

  const actionItems = pending.slice(0, 5).map((action) => ({
    kind: "action",
    title: action.title || action.name || "AI prepared action",
    kicker: action.module || action.action_type || "AI action",
    copy: action.summary || action.reason || action.description || "Ready for owner review.",
    raw: action,
    href: "/v3/decisions",
    fields: [["Type", action.action_type || "Action"], ["Status", action.queue_status || action.status || "Pending"]],
  }));

  return (
    <V3Shell>
      <div className="v3-page">
        <section className="v3-hero">
          <div className="v3-hero-main">
            <div className="v3-hero-copy">
              <p className="v3-eyebrow">AI trade command centre</p>
              <h1>AI runs the admin. You approve.</h1>
              <p>
                Churvox checks jobs, crew, quotes, invoices, money and owner decisions. Tap a card for a pop-up detail.
                Only the clear Open workspace button moves you away.
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
                onClick={() => pending[0] ? setSelected(actionItems[0]) : runAi("check")}
                disabled={aiRunning || !!busyActionId}
              >
                {pending[0] ? "Review first" : "Check again"}
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
          <button className="v3-metric" onClick={() => setSelected(hubItems[0])}>
            <b>{pending.length}</b>
            <span>Decisions</span>
            <small>{pending.length ? "Needs approval" : "All clear"}</small>
          </button>

          <button className="v3-metric" onClick={() => setSelected(hubItems[1])}>
            <b>{unassignedJobs.length}</b>
            <span>Unassigned jobs</span>
            <small>AI can match crew</small>
          </button>

          <button className="v3-metric lime" onClick={() => setSelected(hubItems[3])}>
            <b>{moneyItems.length}</b>
            <span>Money items</span>
            <small>Drafts and reminders</small>
          </button>

          <button className="v3-metric" onClick={() => setSelected({ title: `${workers.length} crew`, kicker: "Team", copy: `${inProgressJobs.length} active jobs right now.`, href: "/v3/team", fields: [["Crew", workers.length], ["Active jobs", inProgressJobs.length]] })}>
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
            ) : actionItems.length ? (
              actionItems.map((item) => (
                <div className="v3-row" key={actionId(item.raw)}>
                  <button type="button" onClick={() => setSelected(item)} className="v3-button ghost v3-row-main">
                    <span>
                      <b>{item.title}</b>
                      <span>{item.copy}</span>
                    </span>
                  </button>
                  <button type="button" className="v3-button dark" onClick={() => approve(item.raw)} disabled={busyActionId === actionId(item.raw)}>
                    {busyActionId === actionId(item.raw) ? "Doing it…" : "Approve"}
                  </button>
                </div>
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
              {hubItems.slice(1).map((item) => (
                <button type="button" key={item.title} onClick={() => setSelected(item)}>
                  {item.kicker === "Dispatch" ? <Users size={18} /> : item.kicker === "Quotes" ? <Clock size={18} /> : <DollarSign size={18} />}
                  <span><b>{item.title}</b><small>{item.copy}</small></span>
                </button>
              ))}
              <button type="button" onClick={() => runAi("prepare")} disabled={aiRunning}>
                <Sparkles size={18} />
                <span><b>Prepare everything for me</b><small>Run AI checks and fill the owner approval queue.</small></span>
              </button>
            </div>
          </article>

          <article className="v3-card v3-workspaces">
            <div className="v3-card-head">
              <div>
                <p>Work areas</p>
                <h2>Open a workspace</h2>
              </div>
            </div>
            <div className="v3-workspace-grid">
              {[
                ["Jobs", "/v3/jobs", "Live run sheet"],
                ["Dispatch", "/v3/dispatch", "Crew coverage"],
                ["Clients", "/v3/clients", "Customer base"],
                ["Quotes", "/v3/quotes", "Sales desk"],
                ["Invoices", "/v3/invoices", "Money board"],
                ["AI Operator", "/v3/operator", "Owner queue"],
                ["Team", "/v3/team", "Crew control"],
                ["Rules", "/v3/rules", "Background engine"],
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
        />
      </div>
    </V3Shell>
  );
}
