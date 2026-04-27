import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import API_BASE from "../lib/apiBase";

const triggerOptions = [
  { value: "job.created", label: "Job created" },
  { value: "job.assigned", label: "Job assigned" },
  { value: "job.started", label: "Job started" },
  { value: "job.paused", label: "Job paused" },
  { value: "job.resumed", label: "Job resumed" },
  { value: "job.completed", label: "Job completed" },
  { value: "quote.created", label: "Quote created" },
  { value: "quote.accepted", label: "Quote accepted" },
  { value: "quote.declined", label: "Quote declined" },
  { value: "invoice.created", label: "Invoice created" },
  { value: "invoice.overdue", label: "Invoice overdue" },
  { value: "invoice.paid", label: "Invoice paid" },
  { value: "client.created", label: "Client created" },
  { value: "team.invited", label: "Team member invited" },
  { value: "time.approved", label: "Time entry approved" },
  { value: "payroll.ready", label: "Payroll ready" },
];

const actionOptions = [
  { value: "notification.create", label: "Create notification" },
  { value: "timeline.create", label: "Create activity timeline entry" },
  { value: "invoice.create_draft", label: "Create draft invoice" },
  { value: "job.create", label: "Create job" },
  { value: "task.create_follow_up", label: "Create follow-up task" },
  { value: "email.send", label: "Send email if configured" },
  { value: "payroll.alert_admin", label: "Alert payroll admin" },
];

const quickTemplates = [
  {
    id: "template-job-assigned-notify-worker",
    name: "Job assigned → notify worker",
    description: "Send an instant worker notification when a new job assignment is made.",
    trigger: "job.assigned",
    action: "notification.create",
  },
  {
    id: "template-job-completed-draft-invoice",
    name: "Completed job → draft invoice",
    description: "Create a draft invoice as soon as a job is marked completed.",
    trigger: "job.completed",
    action: "invoice.create_draft",
  },
  {
    id: "template-quote-accepted-create-job",
    name: "Accepted quote → create job",
    description: "Auto-create a new job after a quote is accepted by the customer.",
    trigger: "quote.accepted",
    action: "job.create",
  },
  {
    id: "template-overdue-invoice-follow-up",
    name: "Overdue invoice → follow-up task",
    description: "Create an internal follow-up task when an invoice becomes overdue.",
    trigger: "invoice.overdue",
    action: "task.create_follow_up",
  },
  {
    id: "template-payroll-ready-alert",
    name: "Payroll ready → payroll/admin alert",
    description: "Notify payroll/admin when approved time entries are ready for processing.",
    trigger: "payroll.ready",
    action: "payroll.alert_admin",
  },
];

const emptyForm = {
  name: "",
  description: "",
  trigger: "job.completed",
  action: "notification.create",
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
    return (
      value.label ||
      value.name ||
      value.title ||
      value.type ||
      value.action ||
      value.trigger ||
      JSON.stringify(value)
    );
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
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
        enabled
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {enabled ? "Enabled" : "Paused"}
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
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
      const [rulesRes, runsRes, templatesRes] = await Promise.allSettled([
        apiRequest("/automation/rules"),
        apiRequest("/automation/runs"),
        apiRequest("/automation/templates"),
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
    } catch (err) {
      setError(err.message || "Automation could not be loaded.");
      setRules([]);
      setRuns([]);
      setTemplates([]);
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
      trigger: resolveOptionValue(triggerOptions, template.trigger || template.event || template.type, "job.completed"),
      action: resolveOptionValue(actionOptions, template.action || template.actions, "notification.create"),
      enabled: true,
    });
    setEditingId(null);
    setError("");
    setNotice("Template loaded. Review and save to create the rule.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name || "",
      description: rule.description || "",
      trigger: resolveOptionValue(
        triggerOptions,
        displayText(rule.trigger || rule.event || rule.type || "job.completed"),
        "job.completed"
      ),
      action: resolveOptionValue(actionOptions, firstAction(rule), "notification.create"),
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
        setNotice("Automation rule updated.");
      } else {
        await apiRequest("/automation/rules", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Automation rule created.");
      }

      resetForm();
      await load();
    } catch (err) {
      setError(err.message || "Automation rule could not be saved.");
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
      setNotice(rule.enabled === false ? "Automation enabled." : "Automation paused.");
      await load();
    } catch (err) {
      setError(err.message || "Automation rule could not be updated.");
    }
  };

  const deleteRule = async (rule) => {
    const confirmed = window.confirm(`Delete automation rule "${rule.name}"?`);
    if (!confirmed) return;

    setDeletingId(rule.id);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/automation/rules/${rule.id}`, { method: "DELETE" });
      setNotice("Automation rule deleted.");
      if (editingId === rule.id) resetForm();
      await load();
    } catch (err) {
      setError(err.message || "Automation rule could not be deleted.");
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
      setNotice("Automation test completed and logged.");
      await load();
    } catch (err) {
      setError(err.message || "Automation test could not run.");
    } finally {
      setTestingId(null);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-3xl border border-slate-900/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-2xl lg:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">Automation</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Automation Command Centre</h1>
                <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base">
                  Centralise job, quote, invoice, payroll, and worker communications with reliable business rules that keep
                  your operations moving without manual follow-ups.
                </p>
              </div>
              <button
                type="button"
                onClick={load}
                className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-400"
              >
                Refresh data
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Total rules", value: totalRules },
                { label: "Enabled", value: enabledRules },
                { label: "Paused", value: pausedRules },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-wide text-slate-300">{stat.label}</p>
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

          <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
            <div className="space-y-6">
              <form onSubmit={saveRule} className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-lg shadow-slate-200/60">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">{editingRule ? "Edit rule" : "Create rule"}</h2>
                    <p className="mt-1 text-sm text-slate-500">Configure trigger, action, and run state.</p>
                  </div>
                  {saving ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Saving…</span>
                  ) : null}
                </div>

                <label className="block text-sm font-semibold text-slate-700">
                  Rule name
                  <input
                    value={form.name}
                    onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))}
                    placeholder="e.g. Completed job → draft invoice"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none ring-blue-500 focus:ring-2"
                  />
                </label>

                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Description
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))}
                    placeholder="Describe what this rule should do for your operations team."
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none ring-blue-500 focus:ring-2"
                  />
                </label>

                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Trigger
                  <select
                    value={form.trigger}
                    onChange={(event) => setForm((old) => ({ ...old, trigger: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none ring-blue-500 focus:ring-2"
                  >
                    {!triggerOptions.some((option) => option.value === form.trigger) ? (
                      <option value={form.trigger}>{prettifyToken(form.trigger)}</option>
                    ) : null}
                    {triggerOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Action
                  <select
                    value={form.action}
                    onChange={(event) => setForm((old) => ({ ...old, action: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none ring-blue-500 focus:ring-2"
                  >
                    {!actionOptions.some((option) => option.value === form.action) ? (
                      <option value={form.action}>{prettifyToken(form.action)}</option>
                    ) : null}
                    {actionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                  Enabled
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(event) => setForm((old) => ({ ...old, enabled: event.target.checked }))}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600"
                  />
                </label>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : editingRule ? "Save changes" : "Create rule"}
                  </button>
                  {editingRule ? (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel edit
                    </button>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                </div>
              </form>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
                <h2 className="text-xl font-bold text-slate-950">Quick templates</h2>
                <p className="mt-1 text-sm text-slate-500">Prefill proven workflows for launch-ready operations.</p>

                <div className="mt-4 space-y-3">
                  {templateChoices.map((template) => (
                    <button
                      key={template.id || template.name}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <div className="text-sm font-bold text-slate-950">{displayText(template.name)}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{displayText(template.description)}</div>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">Live rules</h2>
                    <p className="mt-1 text-sm text-slate-500">{totalRules} configured across your workspace.</p>
                  </div>
                </div>

                {loading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">Loading automation rules...</div>
                ) : rules.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <h3 className="text-lg font-bold text-slate-950">No automation rules yet</h3>
                    <p className="mt-2 text-sm text-slate-500">Create your first rule or start from a quick template.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rules.map((rule) => (
                      <article key={rule.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-base font-bold text-slate-950">{rule.name || "Untitled rule"}</h3>
                              <Badge enabled={rule.enabled !== false} />
                            </div>

                            {rule.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{rule.description}</p> : null}

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trigger</div>
                                <div className="mt-1 text-sm font-semibold text-slate-800">{prettifyToken(firstTrigger(rule))}</div>
                              </div>
                              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Action</div>
                                <div className="mt-1 text-sm font-semibold text-slate-800">{prettifyToken(firstAction(rule))}</div>
                              </div>
                            </div>
                          </div>

                          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                            <button
                              type="button"
                              onClick={() => startEdit(rule)}
                              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleRule(rule)}
                              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              {rule.enabled === false ? "Enable" : "Pause"}
                            </button>
                            <button
                              type="button"
                              onClick={() => testRule(rule)}
                              disabled={testingId === rule.id}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                            >
                              {testingId === rule.id ? "Testing..." : "Test"}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRule(rule)}
                              disabled={deletingId === rule.id}
                              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                            >
                              {deletingId === rule.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
                <h2 className="text-xl font-bold text-slate-950">Recent automation runs</h2>
                <p className="mt-1 text-sm text-slate-500">Latest tests and execution activity.</p>

                <div className="mt-4 space-y-3">
                  {runs.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No automation runs logged yet.</div>
                  ) : (
                    runs.slice(0, 10).map((run) => (
                      <div key={run.id || run._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-sm font-bold text-slate-950">
                              {displayText(run.rule_name || run.trigger || run.rule_id || "Automation run")}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {run.action || "action"} • {run.created_at || "unknown time"}
                            </div>
                          </div>
                          <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
                              run.status === "success"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-red-50 text-red-700 ring-1 ring-red-200"
                            }`}
                          >
                            {run.status || "logged"}
                          </span>
                        </div>
                        {run.message ? <p className="mt-2 text-sm text-slate-600">{run.message}</p> : null}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default AutomationPage;
