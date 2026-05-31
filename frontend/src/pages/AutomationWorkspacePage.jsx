import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { Bot, CheckCircle, PlayCircle, RefreshCw, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import "./AutomationWorkspacePage.css";

function arr(value) { return Array.isArray(value) ? value : []; }
function idOf(value) { return String(value?.id || value?._id || value?.template_key || ""); }

function RiskPill({ risk }) {
  const key = String(risk || "medium").toLowerCase();
  return <span className={`cv-auto-risk ${key}`}>{key}</span>;
}

function StatusPill({ enabled }) {
  return <span className={`cv-auto-status ${enabled ? "on" : "off"}`}>{enabled ? "Enabled" : "Disabled"}</span>;
}

export default function AutomationWorkspacePage() {
  const api = useApi();
  const [automation, setAutomation] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  async function loadAutomation() {
    setLoading(true);
    const res = await api.get("/automation/workspace");
    if (res.success) setAutomation(res.data?.automation || {});
    else toast.error(res.error || "Could not load automation workspace");
    setLoading(false);
  }

  useEffect(() => { loadAutomation(); }, []);

  const rules = arr(automation.rules);
  const templates = arr(automation.templates);
  const runs = arr(automation.runs);
  const metrics = automation.metrics || {};
  const guardrails = arr(automation.guardrails);

  const groupedRules = useMemo(() => {
    return {
      enabled: rules.filter((rule) => rule.enabled),
      approval: rules.filter((rule) => rule.approval_required),
      disabled: rules.filter((rule) => !rule.enabled),
    };
  }, [rules]);

  async function run(label, fn) {
    setBusy(label);
    const res = await fn();
    setBusy("");
    if (res.success) {
      toast.success("Automation updated");
      await loadAutomation();
      return res;
    }
    toast.error(res.error || "Automation action failed");
    return res;
  }

  async function toggleRule(rule) {
    await run(`toggle-${idOf(rule)}`, () => api.post(`/automation/rules/${idOf(rule)}/toggle`, {}));
  }

  async function testRule(rule) {
    await run(`test-${idOf(rule)}`, () => api.post(`/automation/rules/${idOf(rule)}/test-run`, {}));
  }

  async function createFromTemplate(template) {
    await run(`create-${template.key}`, () => api.post("/automation/rules", {
      template_key: template.key,
      name: template.name,
      description: template.description,
      trigger: template.trigger,
      action: template.action,
      enabled: true,
      approval_required: template.approval_required,
      risk_level: template.risk_level,
    }));
  }

  return (
    <PremiumPage maxWidth={1240}>
      <PremiumHero
        eyebrow="Automation workspace"
        title="Let Churvox prepare the admin, not silently change the business."
        subtitle="Rules can prepare invoices, reminders, follow-ups, cleanup flags and worker suggestions — approval-first where it matters."
        icon={<Bot className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadAutomation} disabled={loading || Boolean(busy)}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-auto-metrics">
        <article><span>Rules</span><b>{metrics.rules || 0}</b><small>total</small></article>
        <article className="green"><span>Enabled</span><b>{metrics.enabled_rules || 0}</b><small>active</small></article>
        <article className="amber"><span>Approval-first</span><b>{metrics.approval_required_rules || 0}</b><small>guarded</small></article>
        <article><span>Recent runs</span><b>{metrics.recent_runs || 0}</b><small>history</small></article>
        <article className={metrics.failed_runs ? "red" : ""}><span>Failed runs</span><b>{metrics.failed_runs || 0}</b><small>needs review</small></article>
        <article><span>Prepared actions</span><b>{metrics.prepared_actions || 0}</b><small>waiting</small></article>
      </section>

      <section className="cv-auto-guardrails">
        <ShieldCheck size={20} />
        <div>
          <b>Approval-first guardrails</b>
          {guardrails.map((line) => <span key={line}>{line}</span>)}
        </div>
      </section>

      {loading ? (
        <PremiumCard><div className="cv-auto-empty">Loading automation workspace…</div></PremiumCard>
      ) : (
        <section className="cv-auto-grid">
          <PremiumCard title="Automation rules">
            {rules.length ? rules.map((rule) => (
              <article className="cv-auto-rule" key={idOf(rule)}>
                <header>
                  <div>
                    <h3>{rule.name}</h3>
                    <p>{rule.description}</p>
                  </div>
                  <div className="cv-auto-rule-pills">
                    <StatusPill enabled={rule.enabled} />
                    <RiskPill risk={rule.risk_level} />
                    {rule.approval_required ? <span className="cv-auto-approval">Approval required</span> : <span className="cv-auto-info">Auto-safe</span>}
                  </div>
                </header>
                <div className="cv-auto-rule-flow">
                  <span>When: <b>{rule.trigger}</b></span>
                  <span>Do: <b>{rule.action}</b></span>
                </div>
                <footer>
                  <button type="button" onClick={() => toggleRule(rule)}>
                    {rule.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {rule.enabled ? "Disable" : "Enable"}
                  </button>
                  <button type="button" className="secondary" onClick={() => testRule(rule)}>
                    <PlayCircle size={16} /> Test run
                  </button>
                </footer>
              </article>
            )) : <div className="cv-auto-empty">No automation rules yet.</div>}
          </PremiumCard>

          <PremiumCard title="Templates">
            {templates.map((template) => (
              <article className="cv-auto-template" key={template.key}>
                <div>
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <small>{template.trigger} → {template.action}</small>
                </div>
                <div>
                  <RiskPill risk={template.risk_level} />
                  <button type="button" onClick={() => createFromTemplate(template)}>Add rule</button>
                </div>
              </article>
            ))}
          </PremiumCard>

          <PremiumCard title="Recent runs">
            {runs.length ? runs.map((run) => (
              <article className="cv-auto-run" key={idOf(run)}>
                <div>
                  <b>{run.rule_name || run.template_key || "Automation run"}</b>
                  <span>{run.result || run.status || "Run recorded"}</span>
                </div>
                <em>{run.status || "recorded"}</em>
              </article>
            )) : <div className="cv-auto-empty">No automation runs yet. Use Test run on a rule to prove the log.</div>}
          </PremiumCard>

          <PremiumCard title="Rule groups">
            <div className="cv-auto-groups">
              <div><b>{groupedRules.enabled.length}</b><span>Enabled rules</span></div>
              <div><b>{groupedRules.approval.length}</b><span>Approval-first rules</span></div>
              <div><b>{groupedRules.disabled.length}</b><span>Disabled rules</span></div>
            </div>
          </PremiumCard>
        </section>
      )}
    </PremiumPage>
  );
}
