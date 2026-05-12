import { useEffect, useState } from "react";
import { askBusiness, getAiAudit, loadAiIntelligenceSnapshot, prepareDailyBriefing, updateAiMemory } from "../../ai/aiIntelligenceApi";

export default function AIIntelligencePanel({ onNav }) {
  const [snap, setSnap] = useState({});
  const [busy, setBusy] = useState({});
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { (async () => { try { setSnap(await loadAiIntelligenceSnapshot()); } catch { setError("AI intelligence unavailable right now."); } })(); }, []);

  const run = async (key, fn) => { setBusy((b) => ({ ...b, [key]: true })); setError(""); try { await fn(); } catch { setError("Action failed. Please try again."); } setBusy((b) => ({ ...b, [key]: false })); };

  const briefing = snap.briefing?.briefing || {};
  const quality = snap.quality?.report || {};
  const memory = snap.memory?.memory || {};
  const auditRows = snap.audit?.rows || [];

  return <section className="op-panel op-ai-intelligence"><header><div><p>AI INTELLIGENCE</p><h2>Daily Briefing + Business Memory</h2></div><div className="op-row-actions"><button disabled={busy.brief} onClick={() => run("brief", async () => setSnap((s) => ({ ...s, briefing: await prepareDailyBriefing() })))}>Prepare briefing</button><button disabled={busy.mem} onClick={() => run("mem", async () => setSnap((s) => ({ ...s, memory: { memory: await updateAiMemory() } })))}>Update memory</button><button onClick={() => onNav?.("queue")}>Open AI Queue</button></div></header>
    {error ? <p className="op-ai-answer">{error}</p> : null}
    <div className="op-intel-strip">{(briefing.summary_cards || []).map((c, i) => <article key={i}><strong>{c.value ?? "—"}</strong><small>{c.label}</small></article>)}</div>
    <div className="op-intel-grid">
      <article className="op-intel-card"><h3>Daily briefing</h3><p>{briefing.headline || "No briefing yet."}</p><small>{briefing.next_best_action || "Prepare briefing to get next best action."}</small></article>
      <article className="op-intel-card"><h3>Data quality</h3><p>Score: {quality.score ?? "—"}</p><div className="op-intel-issues">{(quality.issues || []).slice(0, 4).map((i) => <span key={i.key || i.title}>{i.title} ({i.count})</span>)}</div></article>
      <article className="op-intel-card"><h3>Business memory</h3><p>Jobs: {memory.patterns?.counts?.jobs ?? "—"} · Clients: {memory.patterns?.counts?.clients ?? "—"}</p><small>{(memory.insights || []).slice(0, 2).join(" ") || "Update memory to learn patterns."}</small></article>
      <article className="op-intel-card"><h3>Audit trail</h3><p>{auditRows.length} recent events</p><button disabled={busy.audit} onClick={() => run("audit", async () => setSnap((s) => ({ ...s, audit: await getAiAudit() })))}>Refresh audit</button></article>
    </div>
    <div className="op-ask-business"><h3>Ask your business</h3><div className="op-row-actions"><input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Who owes me money?" /><button disabled={!question || busy.ask} onClick={() => run("ask", async () => setAnswer((await askBusiness(question)).answer || "No answer yet."))}>Ask AI</button></div>{answer ? <p className="op-ai-answer">{answer}</p> : null}</div>
  </section>;
}
