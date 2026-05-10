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
  const [jobs, setAI Run Sheet] = useState([]);
  const [quotes, setQuote Desk] = useState([]);
  const [invoices, setMoney Board] = useState([]);
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

  const unassignedAI Run Sheet = useMemo(
    () => jobs.filter((job) => !job.assigned_worker_id && !job.worker_id && !job.assigned_to && !job.assigned_worker_name),
    [jobs]
  );

  const inProgressAI Run Sheet = useMemo(
    () => jobs.filter((job) => ["in_progress", "started", "active", "paused"].includes(lower(job.status))),
    [jobs]
  );

  const draftQuote Desk = useMemo(
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
    setAI Run Sheet(pickArray(jobsResult, ["jobs"]));
    setQuote Desk(pickArray(quotesResult, ["quotes"]));
    setMoney Board(pickArray(invoicesResult, ["invoices"]));
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
      title: `${unassignedAI Run Sheet.length} jobs need crew`,
      kicker: "Crew Match",
      copy: "Churvox should match unassigned work to the best available crew member.",
      href: "/v3/dispatch",
      fields: [["Unassigned", unassignedAI Run Sheet.length], ["Active jobs", inProgressAI Run Sheet.length]],
    },
    {
      kind: "summary",
      title: `${draftQuote Desk.length} quotes need movement`,
      kicker: "Quote Desk",
      copy: "AI can prepare quote follow-ups and next steps.",
      href: "/v3/quotes",
      fields: [["Open quotes", draftQuote Desk.length], ["Next", "Follow-up"]],
    },
    {
      kind: "summary",
      title: `${moneyItems.length} money items`,
      kicker: "Money Board",
      copy: "Churvox can prepare reminders and draft invoices.",
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
              <p className="v3-eyebrow">Churvox Trade OS</p>
              <h1>Your AI Operator for the day.</h1>
              <p>
                Churvox checks jobs, crew, quotes, invoices, proof, and owner decisions before the day gets messy. Tap a card for a pop-up detail.
                Only clear workspace buttons move you away.
              </p>
              <div className="v3-actions">
                <button className="v3-button" onClick={() => runAi("prepare")} disabled={aiRunning}>
                  <Wand2 size={18} /> {aiRunning ? "Preparing…" : "Prepare today"}
                </button>
                <button className="v3-button secondary" onClick={() => runAi("check")} disabled={aiRunning}>
                  <RefreshCw size={18} /> Run Churvox check
                </button>
              </div>
              {notice && <div className="v3-notice">{notice}</div>}
            </div>
          </div>

          <aside className="v3-hero-panel">
            <div className="v3-now-card">
              <div>
                <small>Owner Decisions</small>
                <b>{loading ? "…" : pending.length}</b>
                <span>{pending.length ? "Prepared actions waiting" : "Nothing waiting right now"}</span>
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
            <b>{unassignedAI Run Sheet.length}</b>
            <span>Unassigned jobs</span>
            <small>AI can match crew</small>
          </button>

          <button className="v3-metric lime" onClick={() => setSelected(hubItems[3])}>
            <b>{moneyItems.length}</b>
            <span>Money items</span>
            <small>Drafts and reminders</small>
          </button>

          <button className="v3-metric" onClick={() => setSelected({ title: `${workers.length} crew`, kicker: "Crew", copy: `${inProgressAI Run Sheet.length} active jobs right now.`, href: "/v3/team", fields: [["Crew", workers.length], ["Active jobs", inProgressAI Run Sheet.length]] })}>
            <b>{workers.length}</b>
            <span>Crew</span>
            <small>{inProgressAI Run Sheet.length} active jobs</small>
          </button>
        </section>

        <section className="v3-board">
          <article className="v3-card">
            <div className="v3-card-head">
              <div>
                <p>AI Operator</p>
                <h2>Owner Decisions</h2>
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
                <p>Prepared by Churvox AI</p>
                <h2>Next best moves</h2>
              </div>
            </div>

            <div className="v3-ai-stack">
              {hubItems.slice(1).map((item) => (
                <button type="button" key={item.title} onClick={() => setSelected(item)}>
                  {item.kicker === "Crew Match" ? <Users size={18} /> : item.kicker === "Quote Desk" ? <Clock size={18} /> : <DollarSign size={18} />}
                  <span><b>{item.title}</b><small>{item.copy}</small></span>
                </button>
              ))}
              <button type="button" onClick={() => runAi("prepare")} disabled={aiRunning}>
                <Sparkles size={18} />
                <span><b>Prepare the next moves</b><small>Run Churvox checks and fill Owner Decisions.</small></span>
              </button>
            </div>
          </article>

          <article className="v3-card v3-workspaces">
            <div className="v3-card-head">
              <div>
                <p>Churvox workspaces</p>
                <h2>Navigate only here</h2>
              </div>
            </div>
            <div className="v3-workspace-grid">
              {[
                ["AI Run Sheet", "/v3/jobs", "Live run sheet"],
                ["Crew Match", "/v3/dispatch", "Crew coverage"],
                ["Clients", "/v3/clients", "Customer base"],
                ["Quote Desk", "/v3/quotes", "Sales desk"],
                ["Money Board", "/v3/invoices", "Money board"],
                ["AI Operator", "/v3/operator", "Owner queue"],
                ["Crew", "/v3/team", "Crew control"],
                ["Auto Rules", "/v3/rules", "Background engine"],
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
