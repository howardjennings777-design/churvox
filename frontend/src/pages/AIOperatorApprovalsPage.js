import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Edit3,
  History,
  Rocket,
  Save,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";

const safeArray = (v) => (Array.isArray(v) ? v : []);
const safeText = (v, fallback = "") => String(v || "").trim() || fallback;
const actionId = (a) => a?.id || a?._id;
const statusOf = (a) => safeText(a?.status, "pending").toLowerCase();
const isPending = (a) => ["pending", "edited"].includes(statusOf(a));
const isScheduled = (a) => statusOf(a) === "scheduled";
const isDone = (a) => ["completed", "approved", "rejected", "dismissed"].includes(statusOf(a));

function nextWeeknightSevenPmLocal() {
  const d = new Date();
  d.setHours(19, 0, 0, 0);
  if (new Date() >= d) d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(value) {
  if (!value) return "Not scheduled";
  try {
    return new Date(value).toLocaleString();
  } catch (_err) {
    return value;
  }
}

function readableType(value) {
  return safeText(value, "AI action").replace(/_/g, " ");
}

function payloadText(payload) {
  if (!payload || typeof payload !== "object") return "{}";
  try {
    return JSON.stringify(payload, null, 2);
  } catch (_err) {
    return "{}";
  }
}

function parsePayload(text, fallback) {
  try {
    const parsed = JSON.parse(text || "{}");
    return parsed && typeof parsed === "object" ? parsed : fallback || {};
  } catch (_err) {
    return fallback || {};
  }
}

function StageCard({ action, onOpen, onApprove, onReject, onSchedule }) {
  const status = statusOf(action);
  const risk = safeText(action.risk_level || action.risk, "low").toLowerCase();
  const badgeTone = risk === "high" ? "ai-stage-badge danger" : risk === "medium" ? "ai-stage-badge warn" : "ai-stage-badge good";

  return (
    <button type="button" className="ai-stage-card" onClick={() => onOpen(action)}>
      <div className="ai-stage-card-top">
        <span className="ai-stage-pill">{readableType(action.action_type)}</span>
        <span className={badgeTone}>{risk} risk</span>
      </div>
      <h3>{safeText(action.title, "Untitled AI action")}</h3>
      <p>{safeText(action.summary || action.reason || action.preview_text, "AI prepared this action for review.")}</p>
      <div className="ai-stage-meta">
        <span>{safeText(action.module || action.target_record_type, "general")}</span>
        <span>{formatDateTime(action.created_at)}</span>
      </div>
      <div className="ai-stage-card-actions" onClick={(e) => e.stopPropagation()}>
        {isPending(action) ? (
          <>
            <button type="button" onClick={() => onOpen(action)}><Edit3 size={14} /> Edit</button>
            <button type="button" onClick={() => onSchedule(action)}><CalendarClock size={14} /> Schedule</button>
            <button type="button" className="primary" onClick={() => onApprove(action)}><CheckCircle2 size={14} /> Approve</button>
          </>
        ) : isScheduled(action) ? (
          <span className="ai-stage-scheduled"><CalendarClock size={14} /> Deploys {formatDateTime(action.scheduled_for)}</span>
        ) : (
          <span className="ai-stage-scheduled"><History size={14} /> {status}</span>
        )}
        {isPending(action) ? <button type="button" className="ghost" onClick={() => onReject(action)}><XCircle size={14} /> Reject</button> : null}
      </div>
    </button>
  );
}

function EditModal({ action, onClose, onSave, onApprove, onReject, onSchedule, busy }) {
  const [title, setTitle] = useState(action?.title || "");
  const [summary, setSummary] = useState(action?.summary || "");
  const [reason, setReason] = useState(action?.reason || "");
  const [previewText, setPreviewText] = useState(action?.preview_text || action?.generated_message || "");
  const [payload, setPayload] = useState(payloadText(action?.suggested_payload));
  const [scheduledFor, setScheduledFor] = useState("");

  useEffect(() => {
    setTitle(action?.title || "");
    setSummary(action?.summary || "");
    setReason(action?.reason || "");
    setPreviewText(action?.preview_text || action?.generated_message || "");
    setPayload(payloadText(action?.suggested_payload));
    setScheduledFor("");
  }, [action]);

  if (!action) return null;

  const edited = {
    ...action,
    title,
    summary,
    reason,
    preview_text: previewText,
    suggested_payload: parsePayload(payload, action.suggested_payload || {}),
  };

  return (
    <div className="ai-stage-modal" role="dialog" aria-modal="true">
      <div className="ai-stage-modal-card">
        <div className="ai-stage-modal-head">
          <div>
            <span>AI staging item</span>
            <h2>{safeText(action.title, "Review AI action")}</h2>
            <p>Edit it, schedule it, or leave the time blank so Churvox uses the 7:00pm weeknight fallback.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <div className="ai-stage-modal-body">
          <label>
            Action title
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Owner summary
            <textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </label>
          <label>
            AI reasoning / why
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <label>
            Draft / preview text
            <textarea rows={5} value={previewText} onChange={(e) => setPreviewText(e.target.value)} />
          </label>
          <label>
            Editable action payload
            <textarea className="mono" rows={7} value={payload} onChange={(e) => setPayload(e.target.value)} />
          </label>

          <div className="ai-stage-warning">
            <ShieldCheck size={18} />
            <div>
              <b>7:00pm weeknight fallback.</b>
              <span>If no custom time is chosen, Churvox schedules this for the next 7:00pm Monday–Friday deploy window and sends an owner warning notification about 1 hour before deploy.</span>
            </div>
          </div>

          <div className="ai-stage-schedule-box">
            <label>
              Optional custom deploy time
              <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </label>
            <button type="button" disabled={busy} onClick={() => onSchedule(edited, scheduledFor)}>
              <CalendarClock size={15} /> Add to deploy queue
            </button>
          </div>
        </div>

        <div className="ai-stage-modal-actions">
          <button type="button" onClick={onClose}>Close</button>
          <button type="button" disabled={busy} onClick={() => onReject(action)}><XCircle size={15} /> Reject</button>
          <button type="button" disabled={busy} onClick={() => onSave(edited)}><Save size={15} /> Save edits</button>
          <button type="button" className="primary" disabled={busy} onClick={() => onApprove(edited)}><Rocket size={15} /> Approve now</button>
        </div>
      </div>
    </div>
  );
}

export default function AIOperatorApprovalsPage() {
  const { get, post } = useApi();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("staging");
  const [openAction, setOpenAction] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    let res = await get("/ai/operator/board");
    if (!res.success) res = await get("/ai/operator/queue");
    if (res.success) {
      const data = res.data || {};
      setActions(safeArray(data.actions));
    }
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const buckets = useMemo(() => {
    const staging = actions.filter(isPending);
    const scheduled = actions.filter(isScheduled);
    const history = actions.filter(isDone);
    const needsEdit = staging.filter((a) => {
      const text = `${a.reason || ""} ${a.summary || ""} ${a.preview_text || ""}`.toLowerCase();
      return text.includes("missing") || text.includes("unknown") || text.includes("clash") || text.includes("no client") || text.includes("0.00");
    });
    return { staging, scheduled, history, needsEdit };
  }, [actions]);

  const visible = tab === "scheduled" ? buckets.scheduled : tab === "history" ? buckets.history : tab === "needs_edit" ? buckets.needsEdit : buckets.staging;

  const prepareNow = async () => {
    setBusy(true);
    const res = await post("/ai/operator/prepare-today", {});
    setBusy(false);
    if (res.success) {
      toast.success("AI prepared the latest owner actions");
      load();
    } else {
      toast.error(res.error || "AI preparation failed");
    }
  };

  const saveEdits = async (action) => {
    const id = actionId(action);
    if (!id) return;
    setBusy(true);
    const res = await post(`/ai/operator/actions/${id}/update`, action);
    setBusy(false);
    if (res.success) {
      toast.success("AI item updated");
      setOpenAction(null);
      load();
    } else {
      toast.error(res.error || "Could not save edits");
    }
  };

  const approve = async (action) => {
    const id = actionId(action);
    if (!id) return;
    setBusy(true);
    const res = await post(`/ai/operator/actions/${id}/approve`, { action });
    setBusy(false);
    if (res.success) {
      toast.success("Approved and sent to the right workflow");
      setOpenAction(null);
      load();
    } else {
      toast.error(res.error || "Could not approve action");
    }
  };

  const reject = async (action) => {
    const id = actionId(action);
    if (!id) return;
    setBusy(true);
    const res = await post(`/ai/operator/actions/${id}/reject`, {});
    setBusy(false);
    if (res.success) {
      toast.success("Rejected");
      setOpenAction(null);
      load();
    } else {
      toast.error(res.error || "Could not reject action");
    }
  };

  const schedule = async (action, scheduledFor) => {
    const id = actionId(action);
    if (!id) return;
    const customTime = safeText(scheduledFor);
    const deployAt = customTime || nextWeeknightSevenPmLocal();
    setBusy(true);
    const res = await post(`/ai/operator/actions/${id}/schedule`, {
      action,
      scheduled_for: deployAt,
      deploy_window_label: customTime ? "Custom owner deploy time" : "Fallback 7:00pm weeknight deploy",
      deploy_warning_minutes: 60,
    });
    setBusy(false);
    if (res.success) {
      toast.success(customTime ? "Added to custom AI deploy queue" : "Added to next 7:00pm weeknight deploy queue");
      setOpenAction(null);
      load();
    } else {
      toast.error(res.error || "Could not schedule action");
    }
  };

  return (
    <Layout>
      <div className="ai-stage-page">
        <section className="ai-stage-hero">
          <div className="ai-stage-hero-copy">
            <span><Sparkles size={15} /> AI Approval & Edit Board</span>
            <h1>AI prepares the work. 7pm deploys by default.</h1>
            <p>Every AI-prepared assignment, invoice handoff, message, reminder and follow-up lands here before it affects customers, workers, accounting or payroll. If no custom time is chosen, scheduled work goes out at the next 7:00pm weeknight deploy window with a warning notification 1 hour before.</p>
          </div>
          <div className="ai-stage-hero-panel">
            <b>Background operator live</b>
            <p>Render cron prepares admin work every few minutes. Fallback deploy window: 7:00pm Monday–Friday.</p>
            <button type="button" onClick={prepareNow} disabled={busy}><Sparkles size={15} /> Refresh prepared work</button>
          </div>
        </section>

        <section className="ai-stage-stats">
          <button type="button" onClick={() => setTab("staging")} className={tab === "staging" ? "active" : ""}><b>{buckets.staging.length}</b><span>Ready for approval</span></button>
          <button type="button" onClick={() => setTab("needs_edit")} className={tab === "needs_edit" ? "active" : ""}><b>{buckets.needsEdit.length}</b><span>Needs edit/check</span></button>
          <button type="button" onClick={() => setTab("scheduled")} className={tab === "scheduled" ? "active" : ""}><b>{buckets.scheduled.length}</b><span>Deploy queue</span></button>
          <button type="button" onClick={() => setTab("history")} className={tab === "history" ? "active" : ""}><b>{buckets.history.length}</b><span>AI history</span></button>
        </section>

        <section className="ai-stage-board">
          <div className="ai-stage-board-head">
            <div>
              <span>{tab.replace(/_/g, " ")}</span>
              <h2>{tab === "scheduled" ? "Scheduled deploy queue" : tab === "history" ? "Completed AI work" : tab === "needs_edit" ? "Items that need owner checking" : "Prepared for owner approval"}</h2>
            </div>
            <p>{visible.length} item{visible.length === 1 ? "" : "s"}</p>
          </div>

          {loading ? (
            <div className="ai-stage-empty">Loading AI staging board…</div>
          ) : visible.length ? (
            <div className="ai-stage-grid">
              {visible.map((action) => (
                <StageCard
                  key={actionId(action)}
                  action={action}
                  onOpen={setOpenAction}
                  onApprove={approve}
                  onReject={reject}
                  onSchedule={schedule}
                />
              ))}
            </div>
          ) : (
            <div className="ai-stage-empty">
              <AlertTriangle size={24} />
              <b>No items in this bucket.</b>
              <span>When the background AI operator prepares work, it will appear here for edit, approval, scheduling or history.</span>
            </div>
          )}
        </section>
      </div>

      <EditModal
        action={openAction}
        onClose={() => setOpenAction(null)}
        onSave={saveEdits}
        onApprove={approve}
        onReject={reject}
        onSchedule={schedule}
        busy={busy}
      />
    </Layout>
  );
}
