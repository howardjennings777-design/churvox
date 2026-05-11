import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Edit3,
  Power,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
  Zap
} from "lucide-react";
import { get, post, patch, del as delRequest } from "../../lib/api";
import { approveAiAction } from "../../lib/aiOperator";
import V3Shell from "../components/V3Shell";
const weekdays = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
];

const defaults = {
  ai_master_enabled: true,
  auto_run_enabled: true,
  scheduled_time: "08:00",
  scheduled_weekdays: [1, 2, 3, 4, 5],
  timezone: "Pacific/Auckland",
  auto_execute_safe_actions: true,
  auto_assign_workers_enabled: true,
  auto_send_customer_messages: false,
  owner_approval_required_for_external: true,
};

const actionId = (action) => action?.id || action?.action_id || action?._id || "";
const safeText = (value) => String(value || "").trim();

function Toggle({ label, desc, checked, onChange, danger }) {
  return (
    <button type="button" className="v3-operator-toggle" onClick={() => onChange(!checked)}>
      <span>
        <b>{label}</b>
        <small>{desc}</small>
      </span>
      <i className={`${checked ? "on" : ""} ${danger ? "danger" : ""}`}>
        <em />
      </i>
    </button>
  );
}

function EditModal({ action, saving, values, setValues, onClose, onSave }) {
  if (!action) return null;

  return (
    <div className="v3-modal-backdrop" onClick={onClose}>
      <div className="v3-modal" onClick={(event) => event.stopPropagation()}>
        <div className="v3-modal-head">
          <div>
            <p className="v3-eyebrow">Owner edit</p>
            <h2>Edit AI action</h2>
          </div>
          <button type="button" className="v3-icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form className="v3-action-form" onSubmit={onSave}>
          <label>
            <span>Title</span>
            <input
              value={values.title || ""}
              onChange={(event) => setValues((v) => ({ ...v, title: event.target.value }))}
              required
            />
          </label>

          <label>
            <span>What AI should do / reason</span>
            <textarea
              value={values.summary || ""}
              onChange={(event) => setValues((v) => ({ ...v, summary: event.target.value, reason: event.target.value }))}
              required
            />
          </label>

          <div className="v3-actions">
            <button type="submit" className="v3-button dark" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" className="v3-button secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function V3OperatorPage() {
  const [settings, setSettings] = useState(defaults);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [editAction, setEditAction] = useState(null);
  const [editValues, setEditValues] = useState({});

  const pending = useMemo(() => actions.filter((a) => !["completed", "deleted", "rejected"].includes(String(a.queue_status || a.status || "").toLowerCase())), [actions]);

  const load = async () => {
    setLoading(true);
    const [settingsRes, queueRes] = await Promise.all([
      get("/ai/operator/v3/strong/settings"),
      get("/ai/operator/v3/strong/queue"),
    ]);

    if (settingsRes.ok) setSettings({ ...defaults, ...(settingsRes.data?.settings || settingsRes.data || {}) });
    if (queueRes.ok) setActions(queueRes.data?.actions || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saveSettings = async () => {
    setBusyId("settings");
    const res = await patch("/ai/operator/v3/strong/settings", settings);
    if (res.ok) {
      setSettings({ ...defaults, ...(res.data?.settings || {}) });
      setNotice("AI Operator settings saved.");
    } else {
      setNotice(res.message || "Settings could not be saved.");
    }
    setBusyId("");
  };

  const prepareNow = async () => {
    setBusyId("prepare");
    const res = await post("/ai/operator/v3/strong/prepare-today", {});
    if (res.ok) {
      setActions(res.data?.actions || []);
      setNotice("AI prepared the owner queue.");
    } else {
      setNotice(res.message || "AI could not prepare the queue.");
    }
    setBusyId("");
  };

  const runScheduledNow = async () => {
    setBusyId("scheduled");
    const res = await post("/ai/operator/v3/strong/scheduled-run", {});
    if (res.ok) {
      setNotice(res.data?.message || "AI Operator ran.");
      await load();
    } else {
      setNotice(res.message || "Scheduled run failed.");
    }
    setBusyId("");
  };

  const approve = async (action) => {
    const id = actionId(action);
    setBusyId(id);
    const res = await approveAiAction(action);
    if (res.ok) {
      setNotice(res.data?.message || "Approved. AI completed the action.");
      await load();
    } else {
      setNotice(res.message || "Approval failed.");
    }
    setBusyId("");
  };

  const deleteAction = async (action) => {
    const id = actionId(action);
    setBusyId(id);
    const res = await delRequest(`/ai/operator/v3/strong/actions/${id}`);
    if (res.ok) {
      setNotice("AI action deleted from queue.");
      await load();
    } else {
      setNotice(res.message || "Could not delete action.");
    }
    setBusyId("");
  };

  const openEdit = (action) => {
    setEditAction(action);
    setEditValues({
      title: action.title || "",
      summary: action.summary || action.reason || "",
      reason: action.reason || action.summary || "",
    });
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    const id = actionId(editAction);
    setBusyId("edit");
    const res = await patch(`/ai/operator/v3/strong/actions/${id}`, editValues);
    if (res.ok) {
      setNotice("AI action updated.");
      setEditAction(null);
      await load();
    } else {
      setNotice(res.message || "Could not update action.");
    }
    setBusyId("");
  };

  const setWeekday = (day) => {
    const current = Array.isArray(settings.scheduled_weekdays) ? settings.scheduled_weekdays : [1, 2, 3, 4, 5];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort();
    setSettings((s) => ({ ...s, scheduled_weekdays: next.length ? next : [1, 2, 3, 4, 5] }));
  };

  return (
    <V3Shell>
      <main className="v3-workspace-detail">
        <section className="v3-workspace-hero">
          <div>
            <p className="v3-eyebrow">AI Operator HQ</p>
            <h1>AI runs the work. Owner controls it.</h1>
            <p>
              This is where AI-prepared actions sit. The owner can edit, approve, delete, turn auto mode on or off,
              and set the weekday run time.
            </p>
          </div>

          <div className="v3-workspace-actions">
            <button type="button" className="v3-primary-btn" onClick={prepareNow} disabled={!!busyId}>
              <Sparkles size={18} /> {busyId === "prepare" ? "Preparing…" : "Prepare queue"}
            </button>
            <button type="button" className="v3-dark-btn" onClick={runScheduledNow} disabled={!!busyId}>
              <Zap size={18} /> {busyId === "scheduled" ? "Running…" : "Run auto now"}
            </button>
          </div>
        </section>

        {notice && <div className="v3-notice">{notice}</div>}

        <section className="v3-operator-grid">
          <article className="v3-page-specific-main">
            <div className="v3-card-head">
              <div>
                <p>Owner queue</p>
                <h2>AI-prepared actions</h2>
              </div>
              <strong>{loading ? "…" : pending.length}</strong>
            </div>

            {loading ? (
              <div className="v3-empty">
                <b>Loading AI queue</b>
                <span>Checking prepared work.</span>
              </div>
            ) : pending.length ? (
              <div className="v3-live-list">
                {pending.map((action) => {
                  const id = actionId(action);
                  return (
                    <div className="v3-operator-action" key={id}>
                      <button type="button" className="v3-live-item" onClick={() => openEdit(action)}>
                        <div className="v3-live-icon"><Sparkles size={18} /></div>
                        <div className="v3-live-text">
                          <b>{action.title || "AI prepared action"}</b>
                          <span>{action.summary || action.reason || "Ready for owner review."}</span>
                        </div>
                        <small>{action.edited_by_owner ? "Edited" : action.module || "AI"}</small>
                      </button>

                      <div className="v3-operator-action-buttons">
                        <button type="button" className="v3-button secondary" onClick={() => openEdit(action)}>
                          <Edit3 size={16} /> Edit
                        </button>
                        <button type="button" className="v3-button dark" onClick={() => approve(action)} disabled={busyId === id}>
                          <CheckCircle2 size={16} /> {busyId === id ? "Doing…" : "Approve"}
                        </button>
                        <button type="button" className="v3-button ghost" onClick={() => deleteAction(action)} disabled={busyId === id}>
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="v3-empty">
                <b>No AI actions waiting</b>
                <span>Tap Prepare queue and AI will check jobs, quotes, invoices, crew and proof packs.</span>
              </div>
            )}
          </article>

          <aside className="v3-page-specific-side">
            <div className="v3-card-head">
              <div>
                <p>Auto mode</p>
                <h2>Weekdays at 8</h2>
              </div>
            </div>

            <div className="v3-operator-settings">
              <Toggle
                label="AI Operator enabled"
                desc="Turn this off to stop AI running the business queue."
                checked={!!settings.ai_master_enabled}
                onChange={(value) => setSettings((s) => ({ ...s, ai_master_enabled: value }))}
              />

              <Toggle
                label="Auto-run on schedule"
                desc="AI prepares/runs approved safe work on the selected weekdays."
                checked={!!settings.auto_run_enabled}
                onChange={(value) => setSettings((s) => ({ ...s, auto_run_enabled: value }))}
              />

              <label className="v3-operator-field">
                <span>Run time</span>
                <input
                  type="time"
                  value={settings.scheduled_time || "08:00"}
                  onChange={(event) => setSettings((s) => ({ ...s, scheduled_time: event.target.value }))}
                />
              </label>

              <div className="v3-weekday-row">
                {weekdays.map(([day, label]) => (
                  <button
                    type="button"
                    key={day}
                    className={(settings.scheduled_weekdays || [1, 2, 3, 4, 5]).includes(day) ? "active" : ""}
                    onClick={() => setWeekday(day)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Toggle
                label="Auto-do safe internal work"
                desc="Draft invoices, prepare reminders, flag proof issues and safe admin."
                checked={!!settings.auto_execute_safe_actions}
                onChange={(value) => setSettings((s) => ({ ...s, auto_execute_safe_actions: value }))}
              />

              <Toggle
                label="Auto-assign workers"
                desc="AI can assign best-match workers to unassigned jobs."
                checked={!!settings.auto_assign_workers_enabled}
                onChange={(value) => setSettings((s) => ({ ...s, auto_assign_workers_enabled: value }))}
              />

              <Toggle
                label="Auto-send customer messages"
                desc="Keep off unless you want AI to send customer messages without review."
                checked={!!settings.auto_send_customer_messages}
                onChange={(value) => setSettings((s) => ({ ...s, auto_send_customer_messages: value }))}
                danger
              />

              <button type="button" className="v3-button dark" onClick={saveSettings} disabled={!!busyId}>
                <Save size={16} /> {busyId === "settings" ? "Saving…" : "Save AI settings"}
              </button>

              <div className="v3-operator-safety">
                <Power size={16} />
                <span>
                  Delete records, payroll changes, charges, plan changes, tax/legal decisions and destructive accounting writes stay protected.
                </span>
              </div>
            </div>
          </aside>
        </section>

        <EditModal
          action={editAction}
          saving={busyId === "edit"}
          values={editValues}
          setValues={setEditValues}
          onClose={() => setEditAction(null)}
          onSave={saveEdit}
        />
      </main>
    </V3Shell>
  );
}
