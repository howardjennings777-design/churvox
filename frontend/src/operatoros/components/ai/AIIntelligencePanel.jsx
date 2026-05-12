import { useEffect, useState } from "react";
import {
  askBusiness,
  loadAiIntelligenceSnapshot,
  prepareDailyBriefing,
  updateAiMemory,
} from "../../ai/aiIntelligenceApi";

const EMPTY_SNAPSHOT = {
  briefing: null,
  quality: null,
  audit: [],
  memory: null,
  policy: null,
  dataQualityActions: [],
};

export default function AIIntelligencePanel({ onNav }) {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  function normaliseSnapshot(result) {
    return {
      briefing: result?.briefing || null,
      quality: result?.quality || null,
      audit: Array.isArray(result?.audit) ? result.audit : [],
      memory: result?.memory || null,
      policy: result?.policy || null,
      dataQualityActions: Array.isArray(result?.dataQualityActions) ? result.dataQualityActions : [],
    };
  }

  async function loadSnapshot() {
    setBusy("load");
    setNotice("");

    try {
      const result = await loadAiIntelligenceSnapshot();
      setSnapshot(normaliseSnapshot(result));
    } catch (error) {
      setNotice(error?.message || "AI intelligence could not load yet.");
    } finally {
      setBusy("");
    }
  }

  async function handlePrepareBriefing() {
    setBusy("briefing");
    setNotice("");

    try {
      const result = await prepareDailyBriefing();
      setSnapshot((current) => ({
        ...current,
        briefing: result?.briefing || current.briefing,
      }));
      setNotice("AI briefing prepared.");
      await loadSnapshot();
    } catch (error) {
      setNotice(error?.message || "AI briefing could not be prepared.");
    } finally {
      setBusy("");
    }
  }

  async function handleUpdateMemory() {
    setBusy("memory");
    setNotice("");

    try {
      const result = await updateAiMemory();
      setSnapshot((current) => ({
        ...current,
        memory: result?.memory || current.memory,
      }));
      setNotice("AI business memory updated.");
      await loadSnapshot();
    } catch (error) {
      setNotice(error?.message || "AI memory could not be updated.");
    } finally {
      setBusy("");
    }
  }

  async function handleAsk(event) {
    event.preventDefault();

    if (!question.trim()) {
      setNotice("Ask a business question first.");
      return;
    }

    setBusy("ask");
    setNotice("");
    setAnswer("");

    try {
      const result = await askBusiness(question.trim());
      setAnswer(result?.answer || "AI did not return an answer yet.");
    } catch (error) {
      setNotice(error?.message || "AI could not answer that yet.");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    let active = true;

    async function run() {
      setBusy("load");

      try {
        const result = await loadAiIntelligenceSnapshot();

        if (!active) return;

        setSnapshot(normaliseSnapshot(result));
      } catch (error) {
        if (active) {
          setNotice(error?.message || "AI intelligence could not load yet.");
        }
      } finally {
        if (active) {
          setBusy("");
        }
      }
    }

    run();

    return () => {
      active = false;
    };
  }, []);

  const briefing = snapshot.briefing;
  const quality = snapshot.quality;
  const audit = snapshot.audit || [];
  const memory = snapshot.memory?.patterns || snapshot.memory || {};
  const qualityIssues = quality?.issues || [];
  const summaryCards = briefing?.summary_cards || [];

  return (
    <section className="op-panel op-ai-intelligence">
      <header>
        <div>
          <p>AI INTELLIGENCE LAYER</p>
          <h2>Memory, briefing, learning and business questions.</h2>
        </div>

        <div className="op-row-actions">
          <button type="button" onClick={handlePrepareBriefing} disabled={busy === "briefing"}>
            {busy === "briefing" ? "Preparing..." : "Prepare briefing"}
          </button>

          <button type="button" onClick={handleUpdateMemory} disabled={busy === "memory"}>
            {busy === "memory" ? "Learning..." : "Update memory"}
          </button>
        </div>
      </header>

      {notice ? <section className="op-notice">{notice}</section> : null}

      <div className="op-intel-grid">
        <article className="op-intel-card">
          <span>Daily briefing</span>
          <strong>{briefing?.headline || "No briefing yet"}</strong>
          <p>{briefing?.next_best_action || "Prepare a briefing to see the strongest next action."}</p>
          <button type="button" onClick={() => onNav?.("queue")}>
            Open AI Queue
          </button>
        </article>

        <article className="op-intel-card">
          <span>Data quality</span>
          <strong>{quality ? `${quality.score}% ready` : busy === "load" ? "Checking..." : "Not checked yet"}</strong>
          <p>{quality?.next_fix || "AI will show what data is blocking better decisions."}</p>
        </article>

        <article className="op-intel-card">
          <span>Business memory</span>
          <strong>{memory?.counts?.approved_ai_actions || memory?.approval_count || 0} approvals learned</strong>
          <p>
            {memory?.money?.unpaid_invoice_total
              ? `$${Math.round(memory.money.unpaid_invoice_total)} waiting across unpaid invoices.`
              : "AI memory strengthens as owners approve, reject and edit actions."}
          </p>
        </article>

        <article className="op-intel-card">
          <span>Audit trail</span>
          <strong>{audit.length} recent AI events</strong>
          <p>{audit[0]?.title || audit[0]?.event || "Approvals, rejections and AI scans appear here."}</p>
        </article>
      </div>

      {summaryCards.length ? (
        <div className="op-intel-strip">
          {summaryCards.map((card) => (
            <button key={card.label} type="button">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </button>
          ))}
        </div>
      ) : null}

      {qualityIssues.length ? (
        <div className="op-intel-issues">
          <strong>Data fixes that make AI stronger</strong>
          {qualityIssues.slice(0, 4).map((issue) => (
            <article key={issue.code}>
              <span>{issue.label}</span>
              <small>
                {issue.count} item{issue.count === 1 ? "" : "s"} · {issue.fix}
              </small>
            </article>
          ))}
        </div>
      ) : null}

      <form className="op-ask-business" onSubmit={handleAsk}>
        <label>
          <span>Ask your business</span>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g. Who owes me money? What should I do first today?"
          />
        </label>

        <button type="submit" disabled={busy === "ask"}>
          {busy === "ask" ? "Thinking..." : "Ask AI"}
        </button>
      </form>

      {answer ? <section className="op-ai-answer">{answer}</section> : null}
    </section>
  );
}
