import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import API_BASE from "../lib/apiBase";

const triggerOptions = [
  { value: "job.assigned", label: "Job assigned" },
  { value: "job.completed", label: "Job completed" },
  { value: "job.updated", label: "Job updated" },
  { value: "worker.update", label: "Worker update" },
  { value: "quote.accepted", label: "Quote accepted" },
  { value: "invoice.overdue", label: "Invoice overdue" },
  { value: "payroll.ready", label: "Payroll ready" },
];

const actionOptions = [
  { value: "notify_worker", label: "Notify worker" },
  { value: "notify_owner", label: "Notify owner" },
  { value: "create_draft_invoice", label: "Create draft invoice" },
  { value: "create_job_from_quote", label: "Create job from quote" },
  { value: "create_followup_task", label: "Create follow-up task" },
  { value: "payroll_admin_alert", label: "Payroll admin alert" },
];

const quickTemplates = [
  {
    id: "template-job-assigned-notify-worker",
    name: "Job assigned → notify worker",
    description: "Send an instant worker notification whenever a job is assigned.",
    trigger: "job.assigned",
    action: "notify_worker",
  },
  {
    id: "template-job-completed-draft-invoice",
    name: "Completed job → draft invoice",
    description: "Generate a draft invoice immediately after work is completed.",
    trigger: "job.completed",
    action: "create_draft_invoice",
  },
  {
    id: "template-quote-accepted-create-job",
    name: "Quote accepted → create job",
    description: "Convert accepted quotes into a new job without manual admin time.",
    trigger: "quote.accepted",
    action: "create_job_from_quote",
  },
  {
    id: "template-overdue-invoice-follow-up",
    name: "Invoice overdue → follow-up",
    description: "Create a follow-up task when an invoice slips past due date.",
    trigger: "invoice.overdue",
    action: "create_followup_task",
  },
  {
    id: "template-payroll-ready-alert",
    name: "Payroll ready → admin alert",
    description: "Alert payroll admins when approved time is ready for processing.",
    trigger: "payroll.ready",
    action: "payroll_admin_alert",
  },
  {
    id: "template-worker-update-owner",
    name: "Worker update → owner/admin alert",
    description: "Notify owners/admins when a worker posts an operational update.",
    trigger: "worker.update",
    action: "notify_owner",
  },
];

const emptyForm = {
  name: "",
  description: "",
  trigger: "job.assigned",
  action: "notify_worker",
  enabled: true,
};

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data || { success: true };
}

function asList(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  return [];
}

function displayText(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(displayText).filter(Boolean).join(", ") || "-";
  }
  if (typeof value === "object") {
    return value.label || value.name || value.title || value.type || value.action || value.trigger || JSON.stringify(value);
  }
  return String(value);
}

function prettifyToken(text) {
  return displayText(text)
    .replace(/[._]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolveOptionValue(options, incoming, fallback) {
  if (!incoming) return fallback;
  const normal = String(incoming).trim();
  const byValue = options.find((option) => option.value === normal);
  if (byValue) return byValue.value;
  const byLabel = options.find((option) => option.label.toLowerCase() === normal.toLowerCase());
  if (byLabel) return byLabel.value;
  return normal;
}

function firstAction(rule) {
  if (!rule) return "-";
  if (rule.action) return displayText(rule.action);
  if (Array.isArray(rule.actions) && rule.actions.length > 0) return displayText(rule.actions[0]);
  return "-";
}

function firstTrigger(rule) {
  if (!rule) return "-";
  return displayText(rule.trigger || rule.event || rule.type);
}

function Badge({ enabled }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${
        enabled ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"
      }`}
    >
      {enabled ? "On" : "Paused"}
    </span>
  );
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
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showRuns, setShowRuns] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [enablingTemplate, setEnablingTemplate] = useState("");

  const editingRule = useMemo(() => rules.find((rule) => rule.id === editingId), [rules, editingId]);

  const totalRules = rules.length;
  const enabledRules = rules.filter((rule) => rule.enabled !== false).length;
  const pausedRules = totalRules - enabledRules;

  const templateChoices = useMemo(() => {
    const merged = [...quickTemplates, ...templates];
    const seen = new Set();
    return merged.filter((template) => {
      const key = String(template?.id || template?.name || JSON.stringify(template));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [templates]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rulesRes, runsRes, templatesRes, suggestionsRes] = await Promise.allSettled([
        apiRequest("/automation/rules"),
        apiRequest("/automation/runs"),
        apiRequest("/automation/templates"),
        apiRequest("/ai/automation-suggestions"),
      ]);

      if (rulesRes.status === "fulfilled") {
        setRules(asList(rulesRes.value, "rules"));
      } else {
        throw rulesRes.reason;
      }

      if (runsRes.status === "fulfilled") {
        setRuns(asList(runsRes.value, "runs"));
      } else {
        setRuns([]);
      }

      if (templatesRes.status === "fulfilled") {
        setTemplates(asList(templatesRes.value, "templates"));
      } else {
        setTemplates([]);
      }
      if (suggestionsRes.status === "fulfilled") {
        setSuggestions(asList(suggestionsRes.value, "suggestions"));
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      setError(err.message || "Automation could not be loaded.");
      setRules([]);
      setRuns([]);
      setTemplates([]);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const applyTemplate = (template) => {
    setForm({
      name: displayText(template.name) === "-" ? "" : displayText(template.name),
      description: displayText(template.description) === "-" ? "" : displayText(template.description),
      trigger: resolveOptionValue(triggerOptions, template.trigger || template.event || template.type, "job.assigned"),
      action: resolveOptionValue(actionOptions, template.action || template.actions, "notify_worker"),
      enabled: true,
    });
    setEditingId(null);
    setShowBuilder(true);
    setShowTemplates(false);
    setError("");
    setNotice("Template loaded. Review details and save to create this workflow.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const enableTemplate = async (templateKey) => {
    if (!templateKey) return;
    setEnablingTemplate(templateKey);
    setError("");
    try {
      const res = await apiRequest(`/automation/templates/${templateKey}/enable`, { method: "POST" });
      setNotice(res?.already_enabled ? "Template already enabled." : "Template enabled.");
      await load();
    } catch (err) {
      setError(err.message || "Could not enable template.");
    } finally {
      setEnablingTemplate("");
    }
  };

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setShowBuilder(true);
    setForm({
      name: rule.name || "",
      description: rule.description || "",
      trigger: resolveOptionValue(
        triggerOptions,
        displayText(rule.trigger || rule.event || rule.type || "job.assigned"),
        "job.assigned"
      ),
      action: resolveOptionValue(actionOptions, firstAction(rule), "notify_worker"),
      enabled: rule.enabled !== false,
    });
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveRule = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
      };

      if (!payload.name) {
        throw new Error("Automation name is required.");
      }

      if (editingId) {
        await apiRequest(`/automation/rules/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("Workflow updated successfully.");
      } else {
        await apiRequest("/automation/rules", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Workflow created successfully.");
      }

      resetForm();
      setShowBuilder(false);
      await load();
    } catch (err) {
      setError(err.message || "Workflow could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule) => {
    setError("");
    setNotice("");
    try {
      await apiRequest(`/automation/rules/${rule.id}`, {
        method: "PUT",
        body: JSON.stringify({ enabled: rule.enabled === false }),
      });
      setNotice(rule.enabled === false ? "Workflow enabled." : "Workflow paused.");
      await load();
    } catch (err) {
      setError(err.message || "Workflow state could not be updated.");
    }
  };

  const deleteRule = async (rule) => {
    setDeletingId(rule.id);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/automation/rules/${rule.id}`, { method: "DELETE" });
      setNotice("Workflow deleted.");
      if (editingId === rule.id) resetForm();
      setConfirmDeleteId(null);
      await load();
    } catch (err) {
      setError(err.message || "Workflow could not be deleted.");
    } finally {
      setDeletingId(null);
    }
  };

  const testRule = async (rule) => {
    setTestingId(rule.id);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/automation/rules/${rule.id}/test`, { method: "POST" });
      setNotice("Workflow test completed and logged.");
      await load();
    } catch (err) {
      setError(err.message || "Test endpoint is unavailable for this workflow.");
    } finally {
      setTestingId(null);
    }
  };

  const generateIdeas = async () => {
    setError("");
    try {
      const res = await apiRequest("/ai/automation-suggestions/generate", { method: "POST", body: JSON.stringify({}) });
      setNotice(res?.message || "AI suggests automation. You approve before anything runs.");
      await load();
    } catch (err) {
      setError(err.message || "Could not generate automation ideas.");
    }
  };

  const actOnSuggestion = async (id, action) => {
    setError("");
    try {
      await apiRequest(`/ai/automation-suggestions/${id}/${action}`, { method: "POST", body: JSON.stringify({}) });
      setNotice(action === "approve" ? "Suggestion approved. Draft rule only. Nothing sends automatically." : `Suggestion ${action}d.`);
      await load();
    } catch (err) {
      setError(err.message || "Could not update suggestion.");
    }
  };

  return (
    <Layout>
      <div className="bg-slate-100 px-4 py-6 sm:px-6 lg:px-8" data-testid="automation-page">
        <div className="mx-auto max-w-7xl space-y-5 pb-10">
          <section className="overflow-hidden rounded-3xl border border-slate-900/20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl lg:p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">Churvox automation</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Automation Command Centre</h1>
                <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base">
                  Simple workflow rules for jobs, quotes, invoices, payroll, and worker alerts.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowBuilder((old) => !old)}
                  className="rounded-2xl border border-cyan-200/40 bg-cyan-400/15 px-5 py-3 text-sm font-semibold text-cyan-100 backdrop-blur transition hover:bg-cyan-300/20"
                >
                  {showBuilder ? "Close builder" : "+ New workflow"}
                </button>
                <button
                  type="button"
                  onClick={load}
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Total", value: totalRules },
                { label: "Enabled", value: enabledRules },
                { label: "Paused", value: pausedRules },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-wide text-slate-700">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </section>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>
          ) : null}

          {notice ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">{notice}</div>
          ) : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">AI Automation Builder</h2>
                <p className="mt-1 text-sm text-slate-500">AI suggests automation. You approve before anything runs.</p>
              </div>
              <button type="button" onClick={generateIdeas} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white">Generate automation ideas</button>
            </div>
            <div className="mb-3 grid gap-2 md:grid-cols-3">
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Draft rule only</p>
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Nothing sends automatically</p>
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">No payroll, MYOB, pricing or invoice payment changes happen without approval</p>
            </div>
            {suggestions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white p-6 text-sm text-slate-600">No automation suggestions yet. Churvox will look for repeat admin work, follow-ups, invoice reminders and job workflow risks.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {suggestions.map((item) => (
                  <article key={item.id || item._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-black text-slate-950">{displayText(item.title)}</h3>
                    <p className="mt-1 text-xs text-slate-600">{displayText(item.description)}</p>
                    <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1"><strong>Priority:</strong> {displayText(item.priority)}</div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1"><strong>Confidence:</strong> {displayText(item.confidence)}</div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1"><strong>Trigger:</strong> {displayText(item.trigger_type)}</div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1"><strong>Action:</strong> {displayText(item.action_type)}</div>
                    </div>
                    <p className="mt-2 text-xs text-slate-600"><strong>Reason:</strong> {displayText(item.reason)}</p>
                    <p className="mt-1 text-xs text-slate-600"><strong>Impact:</strong> {displayText(item.impact)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => actOnSuggestion(item.id, "approve")} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Approve draft rule</button>
                      <button type="button" onClick={() => actOnSuggestion(item.id, "snooze")} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">Snooze</button>
                      <button type="button" onClick={() => actOnSuggestion(item.id, "dismiss")} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Dismiss</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {showBuilder ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{editingRule ? "Edit workflow" : "Build workflow"}</h2>
                  <p className="mt-1 text-sm text-slate-500">Choose a trigger, choose an action, then save.</p>
                </div>
                {saving ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Saving…</span> : null}
              </div>

              <form onSubmit={saveRule} className="grid gap-4 lg:grid-cols-[1fr_1fr_220px] lg:items-end">
                <label className="block text-sm font-semibold text-slate-700">
                  Name
                  <input
                    value={form.name}
                    onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))}
                    placeholder="Completed job → draft invoice"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none ring-blue-500 focus:bg-white focus:ring-2"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Description
                  <input
                    value={form.description}
                    onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))}
                    placeholder="Small note for this workflow"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none ring-blue-500 focus:bg-white focus:ring-2"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  Enabled
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(event) => setForm((old) => ({ ...old, enabled: event.target.checked }))}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Trigger
                  <select
                    value={form.trigger}
                    onChange={(event) => setForm((old) => ({ ...old, trigger: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none ring-blue-500 focus:bg-white focus:ring-2"
                  >
                    {!triggerOptions.some((option) => option.value === form.trigger) ? (
                      <option value={form.trigger}>{prettifyToken(form.trigger)}</option>
                    ) : null}
                    {triggerOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Action
                  <select
                    value={form.action}
                    onChange={(event) => setForm((old) => ({ ...old, action: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none ring-blue-500 focus:bg-white focus:ring-2"
                  >
                    {!actionOptions.some((option) => option.value === form.action) ? (
                      <option value={form.action}>{prettifyToken(form.action)}</option>
                    ) : null}
                    {actionOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? "Saving..." : editingRule ? "Save" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowBuilder(false);
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Live workflows</h2>
                <p className="mt-1 text-sm text-slate-500">Active and paused rules in this workspace.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowTemplates((old) => !old)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white"
                >
                  {showTemplates ? "Hide templates" : "Templates"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRuns((old) => !old)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white"
                >
                  {showRuns ? "Hide runs" : "Recent runs"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">Loading automation rules...</div>
            ) : rules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white p-8 text-center">
                <h3 className="text-lg font-bold text-slate-950">No workflows yet</h3>
                <p className="mt-2 text-sm text-slate-500">Open templates or create your first workflow.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {rules.map((rule) => (
                  <article key={rule.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-black leading-5 text-slate-950">{rule.name || "Untitled workflow"}</h3>
                      <Badge enabled={rule.enabled !== false} />
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-slate-500">
                      <div className="min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                        {prettifyToken(firstTrigger(rule))}
                      </div>
                      <span className="text-slate-700">→</span>
                      <div className="min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                        {prettifyToken(firstAction(rule))}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-2">
                      <button type="button" onClick={() => startEdit(rule)} className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Edit</button>
                      <button type="button" onClick={() => toggleRule(rule)} className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">{rule.enabled === false ? "On" : "Pause"}</button>
                      <button type="button" onClick={() => testRule(rule)} disabled={testingId === rule.id} className="rounded-xl bg-slate-900 px-2 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70">{testingId === rule.id ? "..." : "Test"}</button>
                      <button type="button" onClick={() => setConfirmDeleteId(rule.id)} disabled={deletingId === rule.id} className="rounded-xl bg-red-600 px-2 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-70">Del</button>
                    </div>

                    {confirmDeleteId === rule.id ? (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                        <p className="text-xs font-medium text-red-700">Delete this workflow?</p>
                        <div className="mt-2 flex gap-2">
                          <button type="button" onClick={() => deleteRule(rule)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">Confirm</button>
                          <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700">Cancel</button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          {showTemplates ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Templates</h2>
                <p className="mt-1 text-sm text-slate-500">Pick one to load it into the builder.</p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {templateChoices.map((template) => (
                  <div
                    key={template.id || template.name}
                    className="group rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <p className="text-sm font-bold text-slate-950">{displayText(template.name)}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{displayText(template.description)}</p>
                    <div className="mt-2 text-[11px] text-slate-500">Trigger: {prettifyToken(template.trigger || template.event || template.type)} · Action: {prettifyToken(template.action || template.actions)}</div>
                    {template.approval_first ? <div className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">Approval-first</div> : null}
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => applyTemplate(template)} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700">Use in builder</button>
                      <button type="button" disabled={template.enabled || enablingTemplate === template.key} onClick={() => enableTemplate(template.key)} className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-70">{template.enabled ? "Enabled" : enablingTemplate === template.key ? "Enabling..." : "Enable"}</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {showRuns ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
              <h2 className="text-lg font-bold text-slate-950">Recent runs</h2>
              <div className="mt-4 space-y-3">
                {runs.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No automation runs logged yet.</div>
                ) : (
                  runs.slice(0, 10).map((run) => (
                    <div key={run.id || run._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-bold text-slate-950">{displayText(run.rule_name || run.trigger || run.rule_id || "Automation run")}</div>
                          <div className="mt-1 text-xs text-slate-500">{run.action || "action"} • {run.created_at || "unknown time"}</div>
                        </div>
                        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${run.status === "success" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}>{run.status || "logged"}</span>
                      </div>
                      {run.message ? <p className="mt-2 text-sm text-slate-600">{run.message}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}

export default AutomationPage;
