import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  { value: "invoice.paid", label: "Invoice paid" },
  { value: "client.created", label: "Client created" },
  { value: "team.invited", label: "Team member invited" },
  { value: "time.approved", label: "Time entry approved" },
];

const actionOptions = [
  { value: "notification.create", label: "Create notification" },
  { value: "timeline.create", label: "Create activity timeline entry" },
  { value: "invoice.create_draft", label: "Create draft invoice" },
  { value: "email.send", label: "Send email if configured" },
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

function Badge({ enabled }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        enabled
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      {enabled ? "Enabled" : "Disabled"}
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

  const editingRule = useMemo(
    () => rules.find((rule) => rule.id === editingId),
    [rules, editingId]
  );

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
      name: template.name || "",
      description: template.description || "",
      trigger: template.trigger || "job.completed",
      action: template.action || "notification.create",
      enabled: true,
    });
    setEditingId(null);
    setNotice("Template loaded. Save it to create the automation rule.");
  };

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name || "",
      description: rule.description || "",
      trigger: rule.trigger || "job.completed",
      action: rule.action || "notification.create",
      enabled: rule.enabled !== false,
    });
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
      setNotice(rule.enabled === false ? "Automation enabled." : "Automation disabled.");
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
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                Churvox Automation
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                Automation Center
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Create safe business rules for job, quote, invoice, client, team, payroll, and timeline workflows.
                SMS automation stays off until SMS is fully live.
              </p>
            </div>

            <button
              type="button"
              onClick={load}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            {notice}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <form onSubmit={saveRule} className="rounded-3xl border border-border bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-950">
                  {editingRule ? "Edit automation" : "Create automation"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Only real backend-supported actions are shown.
                </p>
              </div>

              <label className="block text-sm font-semibold text-slate-700">
                Name
                <input
                  value={form.name}
                  onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))}
                  placeholder="Example: Job completed notification"
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-950 outline-none ring-blue-500 focus:ring-2"
                />
              </label>

              <label className="mt-4 block text-sm font-semibold text-slate-700">
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))}
                  placeholder="What this automation should do"
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-950 outline-none ring-blue-500 focus:ring-2"
                />
              </label>

              <label className="mt-4 block text-sm font-semibold text-slate-700">
                Trigger
                <select
                  value={form.trigger}
                  onChange={(event) => setForm((old) => ({ ...old, trigger: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-950 outline-none ring-blue-500 focus:ring-2"
                >
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
                  className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-950 outline-none ring-blue-500 focus:ring-2"
                >
                  {actionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(event) => setForm((old) => ({ ...old, enabled: event.target.checked }))}
                  className="h-5 w-5 rounded border-slate-300"
                />
                Enabled
              </label>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : editingRule ? "Save changes" : "Create rule"}
                </button>

                {editingRule ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl border border-border bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">Quick templates</h2>
              <p className="mt-1 text-sm text-slate-500">Start from a safe launch-ready automation.</p>

              <div className="mt-4 space-y-3">
                {templates.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    No templates loaded yet.
                  </p>
                ) : (
                  templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className="w-full rounded-2xl border border-border bg-white p-4 text-left hover:border-cyan-200 hover:bg-cyan-50"
                    >
                      <div className="text-sm font-bold text-slate-950">{template.name}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{template.description}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Automation rules</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {rules.length} rule{rules.length === 1 ? "" : "s"} configured
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl bg-blue-50/60 p-6 text-sm font-medium text-slate-600">
                  Loading automation rules...
                </div>
              ) : rules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-slate-50 p-8 text-center">
                  <h3 className="text-lg font-bold text-slate-950">No automation rules yet</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Create your first automation rule or use a quick template.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div key={rule.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-base font-bold text-slate-950">{rule.name || "Untitled rule"}</h3>
                            <Badge enabled={rule.enabled !== false} />
                          </div>

                          {rule.description ? (
                            <p className="mt-2 text-sm leading-6 text-slate-500">{rule.description}</p>
                          ) : null}

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-blue-50/60 p-3">
                              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Trigger</div>
                              <div className="mt-1 text-sm font-semibold text-slate-800">{rule.trigger}</div>
                            </div>
                            <div className="rounded-2xl bg-blue-50/60 p-3">
                              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Action</div>
                              <div className="mt-1 text-sm font-semibold text-slate-800">{rule.action}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(rule)}
                            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRule(rule)}
                            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {rule.enabled === false ? "Enable" : "Disable"}
                          </button>
                          <button
                            type="button"
                            onClick={() => testRule(rule)}
                            disabled={testingId === rule.id}
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            {testingId === rule.id ? "Testing..." : "Test"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRule(rule)}
                            disabled={deletingId === rule.id}
                            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {deletingId === rule.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">Recent automation runs</h2>
              <p className="mt-1 text-sm text-slate-500">Latest automation tests and rule activity.</p>

              <div className="mt-4 space-y-3">
                {runs.length === 0 ? (
                  <div className="rounded-2xl bg-blue-50/60 p-5 text-sm text-slate-600">
                    No automation runs logged yet.
                  </div>
                ) : (
                  runs.slice(0, 10).map((run) => (
                    <div key={run.id || run._id} className="rounded-2xl border border-border bg-slate-50 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-bold text-slate-950">
                            {run.rule_name || run.trigger || "Automation run"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {run.action || "action"} · {run.created_at || "unknown time"}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AutomationPage;
