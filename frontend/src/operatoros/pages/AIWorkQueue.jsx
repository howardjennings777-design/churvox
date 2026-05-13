import { useEffect, useState } from "react";
import {
  runAiOperatorPlan,
  approveAiAction,
  rejectAiAction,
  editAiAction,
  getAiActivity,
} from "../ai/aiIntelligenceApi";

const CACHE_KEY = "churvox_ai_queue_stable_cards";

function makeId(action, index = 0) {
  return String(
    action?.id ||
    action?._id ||
    action?.action_id ||
    action?.fingerprint ||
    `${action?.type || "ai"}-${action?.title || "action"}-${index}`
  ).replace(/\s+/g, "_");
}

function cleanAction(action, index = 0) {
  if (!action || typeof action !== "object") return null;

  const status = String(action.status || "pending").toLowerCase();
  if (["approved", "executed", "rejected", "failed", "archived", "done"].includes(status)) return null;

  return {
    ...action,
    id: makeId(action, index),
    status: action.status || "pending",
    category: action.category || action.type || "AI Operator",
    title: action.title || "AI prepared action",
    summary: action.summary || action.reason || "Review this AI-prepared action before anything changes.",
    guardrail: action.guardrail || "Nothing is sent, assigned, charged, synced or changed without owner approval.",
    priority_score: action.priority_score || action.priority || 80,
    suggested_payload: action.suggested_payload || action.payload || {},
  };
}

function extractActions(payload) {
  const rows =
    payload?.actions ||
    payload?.items ||
    payload?.rows ||
    payload?.data?.actions ||
    payload?.data?.items ||
    payload?.data?.rows ||
    [];

  return Array.isArray(rows) ? rows.map(cleanAction).filter(Boolean) : [];
}

function fallbackActions(message = "") {
  return [
    {
      id: "ai_dispatch_review",
      type: "dispatch_review",
      category: "Dispatch",
      title: "Review unassigned jobs for worker matching",
      summary: "AI can match jobs to workers by area, workload, availability and job type before owner approval.",
      guardrail: "No worker is assigned until the owner approves.",
      status: "pending",
      priority_score: 95,
      suggested_payload: { action: "review_unassigned_jobs", note: message },
    },
    {
      id: "ai_proof_to_paid",
      type: "proof_to_paid",
      category: "Proof to paid",
      title: "Prepare completed work for invoice review",
      summary: "AI can turn completed job notes and proof photos into invoice-ready admin for owner approval.",
      guardrail: "No invoice is sent until the owner approves.",
      status: "pending",
      priority_score: 92,
      suggested_payload: { action: "review_completed_jobs", note: message },
    },
    {
      id: "ai_cashflow_followup",
      type: "cashflow_followup",
      category: "Cashflow",
      title: "Review unpaid invoices for follow-up",
      summary: "AI can prepare polite customer follow-ups for unpaid invoices.",
      guardrail: "No customer message is sent until the owner approves.",
      status: "pending",
      priority_score: 88,
      suggested_payload: { action: "review_unpaid_invoices", note: message },
    },
  ];
}

function readCache() {
  try {
    const rows = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    return Array.isArray(rows) ? rows.map(cleanAction).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeCache(rows) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rows.map(cleanAction).filter(Boolean)));
  } catch {}
}

function mergeActions(newRows, oldRows) {
  const seen = new Set();
  const out = [];

  [...newRows, ...oldRows].forEach((row, index) => {
    const clean = cleanAction(row, index);
    if (!clean) return;
    if (seen.has(clean.id)) return;
    seen.add(clean.id);
    out.push(clean);
  });

  return out;
}

export default function AIWorkQueue() {
  const [actions, setActions] = useState(() => {
    const cached = readCache();
    return cached.length ? cached : fallbackActions("Ready while AI prepares real work.");
  });
  const [activity, setActivity] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState("");

  function keepActions(rows) {
    const clean = rows.map(cleanAction).filter(Boolean);
    if (!clean.length) return;

    setActions((current) => {
      const next = mergeActions(clean, current);
      writeCache(next);
      return next;
    });
  }

  async function loadActivity() {
    try {
      const payload = await getAiActivity();
      const rows = payload?.activity || payload?.items || payload?.rows || [];
      setActivity(Array.isArray(rows) ? rows : []);
    } catch {
      setActivity([]);
    }
  }

  async function prepare() {
    setBusy(true);
    setError("");
    setNotice("AI is preparing owner actions...");

    try {
      const result = await runAiOperatorPlan();
      let rows = extractActions(result);

      if (!rows.length) {
        rows = fallbackActions("Backend returned no visible cards, so safe owner-review cards are shown.");
      }

      keepActions(rows);

      const count =
        rows.length ||
        Number(result?.created || 0) ||
        Number(result?.briefing_summary?.prepared || 0) ||
        0;

      setNotice(`AI prepared ${count} action${count === 1 ? "" : "s"}.`);
      await loadActivity();
    } catch (err) {
      const message = err?.message || "AI scan failed.";
      setError(message);
      keepActions(fallbackActions(message));
      setNotice("Showing safe AI owner-review cards.");
      await loadActivity();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    writeCache(actions);
    loadActivity();
    prepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function removeAction(action) {
    setActions((current) => {
      const next = current.filter((item) => item.id !== action.id);
      writeCache(next);
      return next.length ? next : fallbackActions("Queue reset after action.");
    });
  }

  async function approve(action, edited) {
    setBusyId(action.id);
    setError("");

    try {
      await approveAiAction(action.id, edited || {});
      removeAction(action);
      setSelected(null);
      setNotice("AI action approved.");
      await loadActivity();
    } catch (err) {
      setError(err?.message || "Could not approve action.");
    } finally {
      setBusyId("");
    }
  }

  async function reject(action, reason) {
    setBusyId(action.id);
    setError("");

    try {
      await rejectAiAction(action.id, reason || "");
      removeAction(action);
      setSelected(null);
      setNotice("AI action rejected.");
      await loadActivity();
    } catch (err) {
      setError(err?.message || "Could not reject action.");
    } finally {
      setBusyId("");
    }
  }

  async function saveEdits(action, edited) {
    setBusyId(action.id);
    setError("");

    try {
      await editAiAction(action.id, edited || {});
      setNotice("Edits saved.");
    } catch (err) {
      setError(err?.message || "Could not save edits.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="op-workspace op-ai-work-queue">
      <section className="op-workspace-head">
        <div>
          <p>AI WORK QUEUE</p>
          <h1>Approve the work AI prepared for you.</h1>
          <span>AI prepares dispatch, invoice, quote and proof-to-paid actions for owner approval.</span>
        </div>
        <button className="primary" onClick={prepare} disabled={busy}>
          {busy ? "Preparing..." : "Refresh AI work"}
        </button>
      </section>

      {notice ? <section className="op-notice">{notice}</section> : null}
      {error ? <section className="op-notice">{error}</section> : null}

      <section className="op-queue-list">
        {actions.length ? (
          actions.map((action) => (
            <article key={action.id} className="op-action-card">
              <div className="op-action-icon">◆</div>
              <div>
                <span>{String(action.category).replaceAll("_", " ")}</span>
                <strong>{action.title}</strong>
                <p>{action.summary}</p>
                <small>{action.guardrail}</small>
              </div>
              <aside>
                <small>Priority {action.priority_score}</small>
                <button type="button" onClick={() => setSelected(action)}>
                  Review details
                </button>
                <button type="button" className="primary" disabled={busyId === action.id} onClick={() => approve(action)}>
                  {busyId === action.id ? "Approving..." : "Approve action"}
                </button>
              </aside>
            </article>
          ))
        ) : (
          <EmptyCard busy={busy} />
        )}
      </section>

      <AIActivityTimeline items={activity} />

      {selected ? (
        <div className="op-ai-drawer-backdrop">
          <aside className="op-ai-drawer">
            <header>
              <p>{selected.category}</p>
              <h3>{selected.title}</h3>
              <span>{selected.status} · Priority {selected.priority_score}</span>
            </header>

            <section className="op-ai-detail-block">
              <strong>Why AI prepared this</strong>
              <p>{selected.reason || selected.summary}</p>
            </section>

            <section className="op-ai-detail-block">
              <strong>Guardrail</strong>
              <p>{selected.guardrail}</p>
            </section>

            <section className="op-ai-detail-block">
              <strong>Prepared payload</strong>
              <pre>{JSON.stringify(selected.suggested_payload || {}, null, 2)}</pre>
            </section>

            <div className="op-ai-drawer-actions">
              <button type="button" onClick={() => saveEdits(selected, selected.suggested_payload || {})} disabled={Boolean(busyId)}>
                Save edits
              </button>
              <button type="button" className="primary" onClick={() => approve(selected)} disabled={Boolean(busyId)}>
                Approve
              </button>
              <button type="button" onClick={() => reject(selected, "Rejected by owner")} disabled={Boolean(busyId)}>
                Reject
              </button>
              <button type="button" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}

function EmptyCard({ busy }) {
  return (
    <EmptyState
      title={busy ? "AI is preparing work" : "No AI work waiting"}
      body={busy ? "Churvox is checking the business now." : "AI will prepare work automatically."}
    />
  );
}
