import { useEffect, useState } from "react";
import {
  runAiOperatorPlan,
  approveAiAction,
  rejectAiAction,
  getAiActivity,
} from "../ai/aiIntelligenceApi";

const CACHE_KEY = "churvox_ai_cards_fixed_final";

const DEFAULT_CARDS = [
  {
    id: "dispatch_review",
    category: "Dispatch",
    title: "Review unassigned jobs for worker matching",
    summary: "AI can match unassigned jobs to workers by area, workload, availability and job type.",
    guardrail: "No worker is assigned until the owner approves.",
    priority_score: 95,
    status: "pending",
  },
  {
    id: "proof_to_paid",
    category: "Proof to paid",
    title: "Prepare completed work for invoice review",
    summary: "AI can turn completed jobs, notes and proof photos into invoice-ready admin.",
    guardrail: "No invoice is sent until the owner approves.",
    priority_score: 92,
    status: "pending",
  },
  {
    id: "cashflow_followup",
    category: "Cashflow",
    title: "Review unpaid invoices for follow-up",
    summary: "AI can prepare polite payment follow-ups for unpaid invoices.",
    guardrail: "No customer message is sent until the owner approves.",
    priority_score: 88,
    status: "pending",
  },
];

function safeId(item, index = 0) {
  return String(
    item?.id ||
      item?._id ||
      item?.action_id ||
      item?.fingerprint ||
      `${item?.category || "ai"}-${item?.title || "action"}-${index}`
  ).replace(/\s+/g, "_");
}

function cleanCard(item, index = 0) {
  if (!item || typeof item !== "object") return null;

  const status = String(item.status || "pending").toLowerCase();

  if (["approved", "executed", "rejected", "failed", "archived", "done"].includes(status)) {
    return null;
  }

  return {
    id: safeId(item, index),
    category: item.category || item.type || item.action_type || "AI Operator",
    title: item.title || "AI prepared action",
    summary: item.summary || item.reason || "Review this AI-prepared action before anything changes.",
    guardrail:
      item.guardrail ||
      "Nothing is sent, assigned, charged, synced or changed without owner approval.",
    priority_score: item.priority_score || item.priority || 80,
    status: item.status || "pending",
    suggested_payload: item.suggested_payload || item.payload || {},
  };
}

function extractCards(payload) {
  const rows =
    payload?.actions ||
    payload?.items ||
    payload?.rows ||
    payload?.data?.actions ||
    payload?.data?.items ||
    payload?.data?.rows ||
    [];

  if (!Array.isArray(rows)) return [];

  return rows.map(cleanCard).filter(Boolean);
}

function readCards() {
  try {
    const rows = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    const clean = Array.isArray(rows) ? rows.map(cleanCard).filter(Boolean) : [];
    return clean.length ? clean : DEFAULT_CARDS;
  } catch {
    return DEFAULT_CARDS;
  }
}

function saveCards(cards) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cards.map(cleanCard).filter(Boolean)));
  } catch {}
}

function mergeCards(nextCards, oldCards) {
  const seen = new Set();
  const output = [];

  [...nextCards, ...oldCards].forEach((card, index) => {
    const clean = cleanCard(card, index);
    if (!clean) return;
    if (seen.has(clean.id)) return;
    seen.add(clean.id);
    output.push(clean);
  });

  return output;
}

export default function AIWorkQueue() {
  const [cards, setCards] = useState(readCards);
  const [activity, setActivity] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState("");

  function keepCards(nextCards) {
    const clean = nextCards.map(cleanCard).filter(Boolean);
    if (!clean.length) return;

    setCards((current) => {
      const merged = mergeCards(clean, current);
      saveCards(merged);
      return merged;
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
    setNotice("AI is preparing owner actions...");
    setError("");

    try {
      const result = await runAiOperatorPlan();
      const returnedCards = extractCards(result);
      const visibleCards = returnedCards.length ? returnedCards : DEFAULT_CARDS;

      keepCards(visibleCards);

      const count =
        returnedCards.length ||
        Number(result?.created || 0) ||
        Number(result?.briefing_summary?.prepared || 0) ||
        visibleCards.length;

      setNotice(`AI prepared ${count} action${count === 1 ? "" : "s"}.`);
      await loadActivity();
    } catch (err) {
      keepCards(DEFAULT_CARDS);
      setNotice("Showing safe AI approval cards.");
      setError(err?.message || "AI backend could not prepare live actions yet.");
      await loadActivity();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    saveCards(cards);
    loadActivity();
    prepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function removeCard(card) {
    setCards((current) => {
      const next = current.filter((item) => item.id !== card.id);
      const finalCards = next.length ? next : DEFAULT_CARDS;
      saveCards(finalCards);
      return finalCards;
    });
  }

  async function approve(card) {
    setBusyId(card.id);
    setError("");

    try {
      await approveAiAction(card.id, card.suggested_payload || {});
      removeCard(card);
      setSelected(null);
      setNotice("AI action approved.");
      await loadActivity();
    } catch (err) {
      setError(err?.message || "Could not approve this action.");
    } finally {
      setBusyId("");
    }
  }

  async function reject(card) {
    setBusyId(card.id);
    setError("");

    try {
      await rejectAiAction(card.id, "Rejected by owner");
      removeCard(card);
      setSelected(null);
      setNotice("AI action rejected.");
      await loadActivity();
    } catch (err) {
      setError(err?.message || "Could not reject this action.");
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

        <button type="button" className="primary" onClick={prepare} disabled={busy}>
          {busy ? "Preparing..." : "Refresh AI work"}
        </button>
      </section>

      {notice ? <section className="op-notice">{notice}</section> : null}
      {error ? <section className="op-notice">{error}</section> : null}

      <section className="op-queue-list">
        {cards.map((card) => (
          <article key={card.id} className="op-action-card">
            <div className="op-action-icon">◆</div>

            <div>
              <span>{String(card.category).replaceAll("_", " ")}</span>
              <strong>{card.title}</strong>
              <p>{card.summary}</p>
              <small>{card.guardrail}</small>
            </div>

            <aside>
              <small>Priority {card.priority_score}</small>
              <button type="button" onClick={() => setSelected(card)}>
                Review details
              </button>
              <button
                type="button"
                className="primary"
                disabled={busyId === card.id}
                onClick={() => approve(card)}
              >
                {busyId === card.id ? "Approving..." : "Approve action"}
              </button>
            </aside>
          </article>
        ))}
      </section>

      <section className="op-workspace-head" style={{ marginTop: 24 }}>
        <div>
          <p>AI ACTIVITY</p>
          <h1 style={{ fontSize: 28 }}>Recent owner decisions</h1>
          <span>{activity.length ? `${activity.length} activity records loaded.` : "No activity yet."}</span>
        </div>
      </section>

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
              <p>{selected.summary}</p>
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
              <button type="button" onClick={() => setNotice("Edits saved.")}>
                Save edits
              </button>
              <button type="button" className="primary" onClick={() => approve(selected)}>
                Approve
              </button>
              <button type="button" onClick={() => reject(selected)}>
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
