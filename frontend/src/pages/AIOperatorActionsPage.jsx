import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { Bot, CheckCircle, Edit3, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import "./AIOperatorActionsPage.css";

function arr(value) { return Array.isArray(value) ? value : []; }
function idOf(value) { return String(value?.id || value?._id || value?.action_key || ""); }

function RiskPill({ risk }) {
  const key = String(risk || "medium").toLowerCase();
  return <span className={`cv-ai-risk ${key}`}>{key}</span>;
}

function ActionLink({ action }) {
  const type = action.record_type;
  const id = action.record_id;
  if (!id) return null;
  if (type === "job") return <Link to={`/jobs/${id}`}>Open job</Link>;
  if (type === "invoice") return <Link to={`/invoices/${id}`}>Open invoice</Link>;
  if (type === "client") return <Link to="/clients">Open clients</Link>;
  return null;
}

export default function AIOperatorActionsPage() {
  const api = useApi();
  const [operator, setOperator] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [edits, setEdits] = useState({});

  async function loadOperator() {
    setLoading(true);
    const res = await api.get("/ai-operator/actions");
    if (res.success) {
      const next = res.data?.ai_operator || {};
      setOperator(next);
      const editMap = {};
      arr(next.actions).forEach((action) => {
        editMap[idOf(action)] = JSON.stringify(action.editable_payload || {}, null, 2);
      });
      setEdits(editMap);
    } else {
      toast.error(res.error || "Could not load AI Operator actions");
    }
    setLoading(false);
  }

  useEffect(() => { loadOperator(); }, []);

  const actions = arr(operator.pending_actions);
  const approved = arr(operator.approved_actions);
  const rejected = arr(operator.rejected_actions);
  const metrics = operator.metrics || {};
  const guardrails = arr(operator.guardrails);

  const grouped = useMemo(() => ({
    high: actions.filter((a) => a.risk_level === "high"),
    medium: actions.filter((a) => a.risk_level === "medium"),
    low: actions.filter((a) => a.risk_level === "low"),
  }), [actions]);

  async function run(label, fn) {
    setBusy(label);
    const res = await fn();
    setBusy("");
    if (res.success) {
      toast.success("AI Operator updated");
      await loadOperator();
      return res;
    }
    toast.error(res.error || res.message || "AI Operator action failed");
    return res;
  }

  async function saveEdits(action) {
    const key = idOf(action);
    let payload = {};
    try {
      payload = JSON.parse(edits[key] || "{}");
    } catch {
      toast.error("Editable payload must be valid JSON.");
      return;
    }
    await run(`save-${key}`, () => api.patch(`/ai-operator/actions/${key}`, { editable_payload: payload }));
  }

  async function approve(action) {
    const key = idOf(action);
    await run(`approve-${key}`, () => api.post(`/ai-operator/actions/${key}/approve`, {}));
  }

  async function reject(action) {
    const key = idOf(action);
    const reason = window.prompt("Reject reason?", "Rejected by owner");
    if (reason === null) return;
    await run(`reject-${key}`, () => api.post(`/ai-operator/actions/${key}/reject`, { reason }));
  }

  return (
    <PremiumPage maxWidth={1240}>
      <PremiumHero
        eyebrow="AI Operator actions"
        title="Churvox prepares the admin. You approve."
        subtitle="AI finds the next business actions, explains the reason, lets you edit the payload, then performs the real update only after approval."
        icon={<Bot className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadOperator} disabled={loading || Boolean(busy)}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-ai-metrics">
        <article><span>Pending</span><b>{metrics.pending || 0}</b><small>waiting for owner</small></article>
        <article className="green"><span>Approved</span><b>{metrics.approved || 0}</b><small>executed/logged</small></article>
        <article className="red"><span>Rejected</span><b>{metrics.rejected || 0}</b><small>dismissed</small></article>
        <article className="red"><span>High risk</span><b>{metrics.high_risk || 0}</b><small>careful approval</small></article>
        <article className="amber"><span>Medium risk</span><b>{metrics.medium_risk || 0}</b><small>review payload</small></article>
      </section>

      <section className="cv-ai-guardrails">
        <ShieldAlert size={20} />
        <div>
          <b>Hard guardrails</b>
          {guardrails.map((line) => <span key={line}>{line}</span>)}
        </div>
      </section>

      {loading ? (
        <PremiumCard><div className="cv-ai-empty">Loading AI Operator actions…</div></PremiumCard>
      ) : (
        <section className="cv-ai-layout">
          <main className="cv-ai-actions">
            {actions.length ? actions.map((action) => {
              const key = idOf(action);
              return (
                <article className="cv-ai-action" key={key}>
                  <header>
                    <div>
                      <h3>{action.title}</h3>
                      <p>{action.reason}</p>
                    </div>
                    <div className="cv-ai-pills">
                      <RiskPill risk={action.risk_level} />
                      <span>{Math.round(Number(action.confidence || 0) * 100)}% confidence</span>
                      <em>{action.action_type}</em>
                    </div>
                  </header>

                  <section className="cv-ai-data">
                    <div>
                      <b>Data used</b>
                      <pre>{JSON.stringify(action.data_used || {}, null, 2)}</pre>
                    </div>
                    <div>
                      <b>Proposed changes</b>
                      <pre>{JSON.stringify(action.proposed_changes || {}, null, 2)}</pre>
                    </div>
                  </section>

                  <label className="cv-ai-edit">
                    <span><Edit3 size={14} /> Editable payload</span>
                    <textarea value={edits[key] || "{}"} onChange={(e) => setEdits((current) => ({ ...current, [key]: e.target.value }))} rows={6} />
                  </label>

                  <footer>
                    <ActionLink action={action} />
                    <button type="button" onClick={() => saveEdits(action)}>Save edits</button>
                    <button type="button" className="approve" onClick={() => approve(action)}><CheckCircle size={15} /> Approve</button>
                    <button type="button" className="reject" onClick={() => reject(action)}><XCircle size={15} /> Reject</button>
                  </footer>
                </article>
              );
            }) : <div className="cv-ai-empty">No pending AI Operator actions right now. Churvox will generate them when jobs, invoices or customer records need work.</div>}
          </main>

          <aside className="cv-ai-side">
            <PremiumCard title="Action groups">
              <div className="cv-ai-groups">
                <div><b>{grouped.high.length}</b><span>High risk</span></div>
                <div><b>{grouped.medium.length}</b><span>Medium risk</span></div>
                <div><b>{grouped.low.length}</b><span>Low risk</span></div>
              </div>
            </PremiumCard>

            <PremiumCard title="Recently approved">
              {approved.length ? approved.slice(0, 8).map((action) => (
                <div className="cv-ai-mini" key={idOf(action)}><b>{action.title}</b><span>{action.executed_result?.message || "Approved"}</span></div>
              )) : <div className="cv-ai-empty">No approved actions yet.</div>}
            </PremiumCard>

            <PremiumCard title="Rejected">
              {rejected.length ? rejected.slice(0, 8).map((action) => (
                <div className="cv-ai-mini" key={idOf(action)}><b>{action.title}</b><span>{action.reject_reason || "Rejected"}</span></div>
              )) : <div className="cv-ai-empty">No rejected actions.</div>}
            </PremiumCard>
          </aside>
        </section>
      )}
    </PremiumPage>
  );
}
