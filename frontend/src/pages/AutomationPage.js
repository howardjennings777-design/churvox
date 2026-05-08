import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import {
  PremiumPage, PremiumHero, PremiumCard, PremiumStatCard, PremiumButton,
  PremiumBadge, PremiumEmptyState, PremiumFormSection
} from "../components/premium";
import { Zap, Sparkles, RefreshCw, Plus, Pencil, Trash2, Power, PlayCircle, ListChecks, ShieldCheck, AlertTriangle, Clock3 } from "lucide-react";
import { confirmDialog } from "../lib/confirmDialog";

const API_BASE = (process.env.REACT_APP_BACKEND_URL || "https://grassley-backend.onrender.com").replace(/\/$/, "");

const triggerOptions = [
  { value: "job.created", label: "Job created" },
  { value: "job.assigned", label: "Job assigned" },
  { value: "job.started", label: "Job started" },
  { value: "job.paused", label: "Job paused" },
  { value: "job.resumed", label: "Job resumed" },
  { value: "job.completed", label: "When a job is completed" },
  { value: "quote.created", label: "Quote created" },
  { value: "quote.accepted", label: "Quote accepted" },
  { value: "quote.declined", label: "Quote declined" },
  { value: "invoice.created", label: "Invoice created" },
  { value: "invoice.paid", label: "Invoice paid" },
  { value: "client.created", label: "Client created" },
  { value: "team.invited", label: "Team member invited" },
  { value: "time.approved", label: "Time entry approved" },
];

const actionOptions = [
  { value: "notification.create", label: "Create internal notification" },
  { value: "timeline.create", label: "Flag payroll / admin review" },
  { value: "invoice.create_draft", label: "Prepare invoice draft" },
  { value: "email.send", label: "Prepare customer follow-up draft" },
];

const launchTemplates = [
  {
    id: "job-complete-proof",
    name: "Job completed → review proof",
    description: "When a worker completes a job, create an internal review item so proof and invoice handoff are checked.",
    trigger: "job.completed",
    action: "notification.create",
  },
  {
    id: "job-complete-invoice",
    name: "Job completed → draft invoice",
    description: "Prepare an invoice draft from completed work so the owner can review before sending.",
    trigger: "job.completed",
    action: "invoice.create_draft",
  },
  {
    id: "invoice-paid-admin",
    name: "Invoice paid → update admin",
    description: "Create an internal update when an invoice is marked paid.",
    trigger: "invoice.paid",
    action: "notification.create",
  },
  {
    id: "time-approved-payroll",
    name: "Time approved → payroll review",
    description: "Flag payroll review when approved time is ready for pay run checks.",
    trigger: "time.approved",
    action: "timeline.create",
  },
];

const emptyForm = { name: "", description: "", trigger: "job.completed", action: "notification.create", enabled: true };

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}/api${path}`, { credentials: "include", ...options, headers });
  let data = null;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) {
    const message = data?.detail || data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return data || { success: true };
}

function AutomationPage() {
  const [rules, setRules] = useState([]);
  const [runs, setRuns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const editingRule = useMemo(() => rules.find((rule) => rule.id === editingId), [rules, editingId]);
  const availableTemplates = templates.length ? templates : launchTemplates;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [rulesRes, runsRes, templatesRes] = await Promise.allSettled([
        apiRequest("/automation/rules"), apiRequest("/automation/runs"), apiRequest("/automation/templates"),
      ]);
      if (rulesRes.status === "fulfilled") setRules(Array.isArray(rulesRes.value.rules) ? rulesRes.value.rules : []);
      else throw rulesRes.reason;
      setRuns(runsRes.status === "fulfilled" && Array.isArray(runsRes.value.runs) ? runsRes.value.runs : []);
      setTemplates(templatesRes.status === "fulfilled" && Array.isArray(templatesRes.value.templates) ? templatesRes.value.templates : []);
    } catch (err) {
      setError(err.message || "Automation could not be loaded."); setRules([]); setRuns([]); setTemplates([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const applyTemplate = (template) => {
    setForm({
      name: template.name || "", description: template.description || "",
      trigger: template.trigger || "job.completed", action: template.action || "notification.create", enabled: true,
    });
    setEditingId(null);
    setNotice("Template loaded. Check it, then save the rule.");
  };

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name || "", description: rule.description || "",
      trigger: rule.trigger || "job.completed", action: rule.action || "notification.create",
      enabled: rule.enabled !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveRule = async (event) => {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description.trim() };
      if (!payload.name) throw new Error("Rule name is required.");
      if (editingId) {
        await apiRequest(`/automation/rules/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("Rule updated.");
      } else {
        await apiRequest("/automation/rules", { method: "POST", body: JSON.stringify(payload) });
        setNotice("Rule created.");
      }
      resetForm();
      await load();
    } catch (err) { setError(err.message || "Rule could not be saved."); }
    finally { setSaving(false); }
  };

  const toggleRule = async (rule) => {
    setError(""); setNotice("");
    try {
      await apiRequest(`/automation/rules/${rule.id}`, { method: "PUT", body: JSON.stringify({ enabled: rule.enabled === false }) });
      setNotice(rule.enabled === false ? "Rule enabled." : "Rule paused.");
      await load();
    } catch (err) { setError(err.message || "Rule could not be updated."); }
  };

  const deleteRule = async (rule) => {
    const confirmed = await confirmDialog({
      title: `Delete rule "${rule.name}"?`,
      message: "This rule will stop running immediately. This cannot be undone.",
      danger: true,
      confirmLabel: "Delete rule",
    });
    if (!confirmed) return;
    setDeletingId(rule.id); setError(""); setNotice("");
    try {
      await apiRequest(`/automation/rules/${rule.id}`, { method: "DELETE" });
      setNotice("Rule deleted.");
      if (editingId === rule.id) resetForm();
      await load();
    } catch (err) { setError(err.message || "Rule could not be deleted."); }
    finally { setDeletingId(null); }
  };

  const testRule = async (rule) => {
    setTestingId(rule.id); setError(""); setNotice("");
    try {
      await apiRequest(`/automation/rules/${rule.id}/test`, { method: "POST" });
      setNotice("Rule test completed and logged.");
      await load();
    } catch (err) { setError(err.message || "Rule test could not run."); }
    finally { setTestingId(null); }
  };

  const activeRules = rules.filter((r) => r.enabled !== false).length;
  const disabledRules = rules.length - activeRules;
  const successRuns = runs.filter((r) => r.status === "success").length;
  const failedRuns = runs.filter((r) => r.status && r.status !== "success").length;

  return (
    <Layout>
      <PremiumPage>
        <div className="automation-v5">
          <PremiumHero
            className="automation-v5-hero"
            icon={<Zap className="h-7 w-7" />}
            eyebrow={<><Zap className="h-3 w-3" /> Automation engine</>}
            title="Rules & Triggers"
            subtitle="AI prepares the work. Automation runs the background rules. Owner approval stays in place for customer messages, payroll, money and anything sensitive."
            actions={
              <>
                <PremiumButton onClick={load} iconLeft={<RefreshCw className="h-4 w-4" />} variant="secondary">Refresh</PremiumButton>
                {editingRule && <PremiumButton onClick={resetForm} variant="ghost">Cancel edit</PremiumButton>}
              </>
            }
          />

          <section className="automation-v5-note">
            <Clock3 size={18} />
            <div>
              <b>Background engine</b>
              <span>Runs quietly in the background. You only see decisions that need review.</span>
            </div>
          </section>

          <div className="px-grid px-grid--4 automation-v5-stats">
            <PremiumStatCard label="Active rules" value={activeRules} icon={<Power className="h-4 w-4" />} tone="teal" onClick={() => {}} />
            <PremiumStatCard label="Paused rules" value={disabledRules} icon={<Power className="h-4 w-4" />} tone="slate" onClick={() => {}} />
            <PremiumStatCard label="Successful runs" value={successRuns} icon={<ShieldCheck className="h-4 w-4" />} tone="sky" onClick={() => {}} />
            <PremiumStatCard label="Failed runs" value={failedRuns} icon={<AlertTriangle className="h-4 w-4" />} tone={failedRuns ? "red" : "blue"} onClick={() => {}} />
          </div>

          {error ? <div className="automation-v5-alert automation-v5-alert--error">{error}</div> : null}
          {notice ? <div className="automation-v5-alert automation-v5-alert--success">{notice}</div> : null}

          <div className="automation-v5-grid">
            <div className="automation-v5-left">
              <PremiumCard title="Quick templates" icon={<Sparkles className="h-4 w-4" />} subtitle="Safe launch-ready rules">
                <div className="automation-v5-templates">
                  {availableTemplates.map((template) => (
                    <button key={template.id || template.name} type="button" onClick={() => applyTemplate(template)}>
                      <div>{template.name}</div>
                      <span>{template.description}</span>
                    </button>
                  ))}
                </div>
              </PremiumCard>

              <PremiumFormSection
                title={editingRule ? "Edit rule" : "Create rule"}
                subtitle="Choose the trigger and the safe background action."
              >
                <form onSubmit={saveRule} className="automation-v5-form">
                  <div>
                    <label className="px-field__label">Rule name</label>
                    <input value={form.name} onChange={(e) => setForm((o) => ({ ...o, name: e.target.value }))}
                      placeholder="Example: Job completed → review proof" className="px-input" />
                  </div>
                  <div>
                    <label className="px-field__label">What should this rule do?</label>
                    <textarea value={form.description} onChange={(e) => setForm((o) => ({ ...o, description: e.target.value }))}
                      placeholder="Describe what Churvox should prepare in the background." rows={3} className="px-textarea" />
                  </div>
                  <div className="automation-v5-form-row">
                    <div>
                      <label className="px-field__label">When this happens</label>
                      <select value={form.trigger} onChange={(e) => setForm((o) => ({ ...o, trigger: e.target.value }))} className="px-select">
                        {triggerOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="px-field__label">Churvox should</label>
                      <select value={form.action} onChange={(e) => setForm((o) => ({ ...o, action: e.target.value }))} className="px-select">
                        {actionOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <label className="automation-v5-enabled">
                    <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((o) => ({ ...o, enabled: e.target.checked }))} />
                    Rule is active
                  </label>
                  <div className="automation-v5-form-actions">
                    <PremiumButton type="submit" disabled={saving} className="flex-1" iconLeft={<Plus className="h-4 w-4" />}>
                      {saving ? "Saving…" : editingRule ? "Save changes" : "Create rule"}
                    </PremiumButton>
                    {editingRule && <PremiumButton type="button" variant="secondary" onClick={resetForm}>Cancel</PremiumButton>}
                  </div>
                </form>
              </PremiumFormSection>
            </div>

            <div className="automation-v5-right">
              <PremiumCard
                title="Rules running in the background"
                icon={<ListChecks className="h-4 w-4" />}
                subtitle={`${rules.length} rule${rules.length === 1 ? "" : "s"} configured`}
              >
                {loading ? (
                  <div className="automation-v5-loading">Loading rules…</div>
                ) : rules.length === 0 ? (
                  <PremiumEmptyState
                    icon={<Zap className="h-6 w-6" />}
                    title="No rules yet"
                    subtitle="Use a quick template or create your first background rule."
                  />
                ) : (
                  <div className="automation-v5-rules">
                    {rules.map((rule) => (
                      <div key={rule.id} className="automation-v5-rule">
                        <div>
                          <div className="automation-v5-rule-title">
                            <h3>{rule.name || "Untitled rule"}</h3>
                            <PremiumBadge tone={rule.enabled === false ? "slate" : "green"}>{rule.enabled === false ? "Paused" : "Active"}</PremiumBadge>
                          </div>
                          {rule.description && <p>{rule.description}</p>}
                          <div className="automation-v5-rule-flow">
                            <span><b>Trigger</b>{rule.trigger}</span>
                            <span><b>Action</b>{rule.action}</span>
                          </div>
                        </div>
                        <div className="automation-v5-rule-actions">
                          <PremiumButton size="sm" variant="secondary" onClick={() => startEdit(rule)} iconLeft={<Pencil className="h-3.5 w-3.5" />}>Edit</PremiumButton>
                          <PremiumButton size="sm" variant="secondary" onClick={() => toggleRule(rule)} iconLeft={<Power className="h-3.5 w-3.5" />}>
                            {rule.enabled === false ? "Enable" : "Pause"}
                          </PremiumButton>
                          <PremiumButton size="sm" onClick={() => testRule(rule)} disabled={testingId === rule.id} iconLeft={<PlayCircle className="h-3.5 w-3.5" />}>
                            {testingId === rule.id ? "Testing…" : "Test"}
                          </PremiumButton>
                          <PremiumButton size="sm" variant="danger" onClick={() => deleteRule(rule)} disabled={deletingId === rule.id} iconLeft={<Trash2 className="h-3.5 w-3.5" />}>
                            {deletingId === rule.id ? "Deleting…" : "Delete"}
                          </PremiumButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PremiumCard>

              <PremiumCard title="Recent runs" icon={<RefreshCw className="h-4 w-4" />} subtitle="Latest rule activity">
                <div className="automation-v5-runs">
                  {runs.length === 0 ? (
                    <div className="automation-v5-empty-run">No rule runs logged yet.</div>
                  ) : (
                    runs.slice(0, 10).map((run) => (
                      <div key={run.id || run._id} className="automation-v5-run">
                        <div>
                          <b>{run.rule_name || run.trigger || "Rule run"}</b>
                          <span>{run.action || "action"} · {run.created_at || "unknown time"}</span>
                        </div>
                        <PremiumBadge tone={run.status === "success" ? "green" : "red"}>{run.status || "logged"}</PremiumBadge>
                        {run.message && <p>{run.message}</p>}
                      </div>
                    ))
                  )}
                </div>
              </PremiumCard>
            </div>
          </div>
        </div>
      </PremiumPage>
    </Layout>
  );
}

export default AutomationPage;
