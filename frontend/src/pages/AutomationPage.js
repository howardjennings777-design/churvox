import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import {
  PremiumPage, PremiumHero, PremiumCard, PremiumStatCard, PremiumButton,
  PremiumBadge, PremiumAIDraftPanel, PremiumEmptyState, PremiumFormSection
} from "../components/premium";
import { Zap, Sparkles, RefreshCw, Plus, Pencil, Trash2, Power, PlayCircle, ListChecks, ShieldCheck, AlertTriangle, BellRing } from "lucide-react";
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
  { value: "notification.create", label: "Notify office admin" },
  { value: "timeline.create", label: "Flag payroll review" },
  { value: "invoice.create_draft", label: "Create invoice draft" },
  { value: "email.send", label: "Send customer follow-up" },
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
    setNotice("Template loaded. Save it to create the automation rule.");
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
      if (!payload.name) throw new Error("Automation name is required.");
      if (editingId) {
        await apiRequest(`/automation/rules/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("Automation rule updated.");
      } else {
        await apiRequest("/automation/rules", { method: "POST", body: JSON.stringify(payload) });
        setNotice("Automation rule created.");
      }
      resetForm();
      await load();
    } catch (err) { setError(err.message || "Automation rule could not be saved."); }
    finally { setSaving(false); }
  };

  const toggleRule = async (rule) => {
    setError(""); setNotice("");
    try {
      await apiRequest(`/automation/rules/${rule.id}`, { method: "PUT", body: JSON.stringify({ enabled: rule.enabled === false }) });
      setNotice(rule.enabled === false ? "Automation enabled." : "Automation disabled.");
      await load();
    } catch (err) { setError(err.message || "Automation rule could not be updated."); }
  };

  const deleteRule = async (rule) => {
    const confirmed = await confirmDialog({
      title: `Delete automation rule "${rule.name}"?`,
      message: "This rule will stop running immediately. This cannot be undone.",
      danger: true,
      confirmLabel: "Delete rule",
    });
    if (!confirmed) return;
    setDeletingId(rule.id); setError(""); setNotice("");
    try {
      await apiRequest(`/automation/rules/${rule.id}`, { method: "DELETE" });
      setNotice("Automation rule deleted.");
      if (editingId === rule.id) resetForm();
      await load();
    } catch (err) { setError(err.message || "Automation rule could not be deleted."); }
    finally { setDeletingId(null); }
  };

  const testRule = async (rule) => {
    setTestingId(rule.id); setError(""); setNotice("");
    try {
      await apiRequest(`/automation/rules/${rule.id}/test`, { method: "POST" });
      setNotice("Automation test completed and logged.");
      await load();
    } catch (err) { setError(err.message || "Automation test could not run."); }
    finally { setTestingId(null); }
  };
  const activeRules = rules.filter((r) => r.enabled !== false).length;
  const disabledRules = rules.length - activeRules;
  const successRuns = runs.filter((r) => r.status === "success").length;
  const failedRuns = runs.filter((r) => r.status && r.status !== "success").length;

  return (
    <Layout>
      <PremiumPage>
        <PremiumHero
          icon={<Zap className="h-7 w-7" />}
          eyebrow={<><Zap className="h-3 w-3" /> Automation</>}
          title="Smart Operations Automation"
          subtitle="Build reliable rules for jobs, quotes, invoices, payroll review and customer follow-up. Approval-first — no automatic customer SMS or payroll decisions."
          actions={
            <>
              <PremiumButton onClick={load} iconLeft={<RefreshCw className="h-4 w-4" />} variant="secondary">Refresh</PremiumButton>
              {editingRule && <PremiumButton onClick={resetForm} variant="ghost">Cancel edit</PremiumButton>}
            </>
          }
        />

        <div className="px-grid px-grid--4">
          <PremiumStatCard label="Active rules" value={activeRules} icon={<Power className="h-4 w-4" />} tone="teal" onClick={() => {}} />
          <PremiumStatCard label="Disabled" value={disabledRules} icon={<Power className="h-4 w-4" />} tone="slate" onClick={() => {}} />
          <PremiumStatCard label="Successful runs" value={successRuns} icon={<ShieldCheck className="h-4 w-4" />} tone="sky" onClick={() => {}} />
          <PremiumStatCard label="Failed runs" value={failedRuns} icon={<AlertTriangle className="h-4 w-4" />} tone={failedRuns ? "red" : "blue"} onClick={() => {}} />
        </div>

        {error ? <div className="rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-3 text-[13.5px] font-medium text-[#b91c1c]">{error}</div> : null}
        {notice ? <div className="rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5] p-3 text-[13.5px] font-medium text-[#065f46]">{notice}</div> : null}

        <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <div className="space-y-5">
            <PremiumFormSection
              title={editingRule ? "Edit automation" : "Create automation"}
              subtitle="Only real backend-supported actions are shown."
            >
              <form onSubmit={saveRule} className="space-y-4">
                <div>
                  <label className="px-field__label">Name</label>
                  <input value={form.name} onChange={(e) => setForm((o) => ({ ...o, name: e.target.value }))}
                    placeholder="Example: Job completed notification" className="px-input" />
                </div>
                <div>
                  <label className="px-field__label">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm((o) => ({ ...o, description: e.target.value }))}
                    placeholder="What this automation should do" rows={3} className="px-textarea" />
                </div>
                <div>
                  <label className="px-field__label">Trigger</label>
                  <select value={form.trigger} onChange={(e) => setForm((o) => ({ ...o, trigger: e.target.value }))} className="px-select">
                    {triggerOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="px-field__label">Action</label>
                  <select value={form.action} onChange={(e) => setForm((o) => ({ ...o, action: e.target.value }))} className="px-select">
                    {actionOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-[#e6eef9] bg-[#f6faff] p-3 text-[13.5px] font-semibold text-[#1a2c4d]">
                  <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((o) => ({ ...o, enabled: e.target.checked }))} className="h-4 w-4 rounded border-[#cbd5e1]" />
                  Enabled
                </label>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <PremiumButton type="submit" disabled={saving} className="flex-1" iconLeft={<Plus className="h-4 w-4" />}>
                    {saving ? "Saving…" : editingRule ? "Save changes" : "Create rule"}
                  </PremiumButton>
                  {editingRule && <PremiumButton type="button" variant="secondary" onClick={resetForm}>Cancel</PremiumButton>}
                </div>
              </form>
            </PremiumFormSection>

            <PremiumCard title="Quick templates" icon={<Sparkles className="h-4 w-4" />} subtitle="Start from a launch-ready automation">
              <div className="space-y-2">
                {templates.length === 0 ? (
                  <p className="rounded-xl bg-[#f6faff] border border-[#e6eef9] p-3 text-[13px] text-[#5b6c87]">No templates loaded yet.</p>
                ) : (
                  templates.map((template) => (
                    <button key={template.id} type="button" onClick={() => applyTemplate(template)}
                      className="w-full rounded-xl border border-[#e6eef9] bg-white p-3 text-left hover:border-[#c7dcfb] hover:bg-[#eff4ff]">
                      <div className="text-[13.5px] font-bold text-[#0d1b34]">{template.name}</div>
                      <div className="mt-1 text-[12px] text-[#5b6c87]">{template.description}</div>
                    </button>
                  ))
                )}
              </div>
            </PremiumCard>
          </div>

          <div className="space-y-5">
            <PremiumCard
              title="Automation rules"
              icon={<ListChecks className="h-4 w-4" />}
              subtitle={`${rules.length} rule${rules.length === 1 ? "" : "s"} configured`}
            >
              {loading ? (
                <div className="rounded-2xl bg-[#f0f6ff] p-6 text-[13.5px] font-medium text-[#5b6c87]">Loading automation rules…</div>
              ) : rules.length === 0 ? (
                <PremiumEmptyState
                  icon={<Zap className="h-6 w-6" />}
                  title="No automation rules yet"
                  subtitle="Create your first automation rule or use a quick template."
                />
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div key={rule.id} className="rounded-2xl border border-[#e6eef9] bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[15px] font-bold text-[#0d1b34]">{rule.name || "Untitled rule"}</h3>
                            <PremiumBadge tone={rule.enabled === false ? "slate" : "green"}>{rule.enabled === false ? "Disabled" : "Enabled"}</PremiumBadge>
                          </div>
                          {rule.description && <p className="mt-2 text-[13px] leading-6 text-[#5b6c87]">{rule.description}</p>}
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-xl bg-[#eef4ff] p-2.5">
                              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#1d4ed8]">Trigger</div>
                              <div className="mt-0.5 text-[13px] font-semibold text-[#0d1b34]">{rule.trigger}</div>
                            </div>
                            <div className="rounded-xl bg-[#ede4ff] p-2.5">
                              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#7c3aed]">Action</div>
                              <div className="mt-0.5 text-[13px] font-semibold text-[#0d1b34]">{rule.action}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <PremiumButton size="sm" variant="secondary" onClick={() => startEdit(rule)} iconLeft={<Pencil className="h-3.5 w-3.5" />}>Edit</PremiumButton>
                          <PremiumButton size="sm" variant="secondary" onClick={() => toggleRule(rule)} iconLeft={<Power className="h-3.5 w-3.5" />}>
                            {rule.enabled === false ? "Enable" : "Disable"}
                          </PremiumButton>
                          <PremiumButton size="sm" onClick={() => testRule(rule)} disabled={testingId === rule.id} iconLeft={<PlayCircle className="h-3.5 w-3.5" />}>
                            {testingId === rule.id ? "Testing…" : "Test"}
                          </PremiumButton>
                          <PremiumButton size="sm" variant="danger" onClick={() => deleteRule(rule)} disabled={deletingId === rule.id} iconLeft={<Trash2 className="h-3.5 w-3.5" />}>
                            {deletingId === rule.id ? "Deleting…" : "Delete"}
                          </PremiumButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PremiumCard>

            <PremiumCard title="Recent automation runs" icon={<RefreshCw className="h-4 w-4" />} subtitle="Latest tests and rule activity">
              <div className="space-y-2">
                {runs.length === 0 ? (
                  <div className="rounded-xl bg-[#f0f6ff] border border-[#e6eef9] p-4 text-[13px] text-[#5b6c87]">No automation runs logged yet.</div>
                ) : (
                  runs.slice(0, 10).map((run) => (
                    <div key={run.id || run._id} className="rounded-xl border border-[#e6eef9] bg-white p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-[13.5px] font-bold text-[#0d1b34]">{run.rule_name || run.trigger || "Automation run"}</div>
                          <div className="mt-0.5 text-[11.5px] text-[#7d8ba3]">{run.action || "action"} · {run.created_at || "unknown time"}</div>
                        </div>
                        <PremiumBadge tone={run.status === "success" ? "green" : "red"}>{run.status || "logged"}</PremiumBadge>
                      </div>
                      {run.message && <p className="mt-2 text-[12.5px] text-[#5b6c87]">{run.message}</p>}
                    </div>
                  ))
                )}
              </div>
            </PremiumCard>
          </div>
        </div>
      </PremiumPage>
    </Layout>
  );
}

export default AutomationPage;
