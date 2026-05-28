// CHURVOX_MESSAGE_APPROVAL_QUEUE_PAGE_20260528
// CHURVOX_MESSAGE_QUEUE_REAL_RECORD_DRAFTS_20260528
// CHURVOX_MESSAGE_QUEUE_APPROVAL_ACTIONS_20260528
// CHURVOX_MESSAGE_QUEUE_JOB_CONTEXT_20260528
// CHURVOX_MESSAGE_APPROVAL_EDIT_SEND_HISTORY_20260529
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAiAuditLog, sendApprovedMessage } from "../concept-c/churvoxTopTierApi";
import "./MessageApprovalQueuePage.css";

const API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cleanBase(base) {
  return String(base || "").replace(/\/+$/, "");
}

function getToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

function queryParam(name) {
  try {
    return new URLSearchParams(window.location.search).get(name) || "";
  } catch {
    return "";
  }
}

async function fetchJson(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${cleanBase(API_BASE)}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || data?.message || `Request failed ${res.status}`);
  return data;
}

function listFrom(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function idOf(item) {
  return item?.id || item?._id || item?.uuid || "";
}

function pickDraft(item) {
  return item?.customer_message_draft || item?.draft_message || item?.last_message_draft || item?.generated_message || item?.message || "";
}

function recordTitle(item, fallback) {
  return item?.title || item?.job_name || item?.customer_name || item?.client_name || item?.name || item?.summary || fallback;
}

function emailOf(item) {
  return item?.customer_email || item?.client_email || item?.email || item?.contact_email || "";
}

function draftSubject(type, item) {
  const name = recordTitle(item, "your service");
  if (type === "invoice") return `Invoice update for ${name}`;
  if (type === "quote") return `Quote update for ${name}`;
  return `Job update for ${name}`;
}

function draftFromRecord(type, item) {
  const draft = pickDraft(item);
  if (!draft) return null;
  const id = idOf(item);
  const href = type === "job" ? `/jobs/${id}` : type === "invoice" ? `/invoices/${id}` : type === "quote" ? `/quotes/${id}` : "/dashboard";
  return {
    id: `${type}-${id || Math.random()}`,
    record_id: id,
    type,
    title: recordTitle(item, `${type} message draft`),
    subject: item?.last_message_subject || draftSubject(type, item),
    to_email: emailOf(item),
    message: draft,
    href: id ? href : "/dashboard",
    state: item?.message_approval_status || item?.status || item?.owner_review_status || "Draft",
  };
}

function sameId(a, b) {
  return String(a || "") && String(a || "") === String(b || "");
}

function jobDescription(job, fallbackId) {
  return job?.customer_message_draft || job?.draft_message || job?.last_message_draft || job?.invoice_description_draft || job?.description || job?.notes || `Prepared customer update for job ${fallbackId}.`;
}

function initialDraftEdits(messages) {
  return Object.fromEntries(messages.map((item) => [item.id, { message: item.message || "", subject: item.subject || "", to_email: item.to_email || "" }]));
}

export default function MessageApprovalQueuePage() {
  const linkedJobId = queryParam("job_id");
  const [state, setState] = useState({ loading: true, error: "", actions: [], audit: [], jobs: [], invoices: [], quotes: [], linkedJob: null });
  const [localStatus, setLocalStatus] = useState({});
  const [draftEdits, setDraftEdits] = useState({});
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [sentHistory, setSentHistory] = useState([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const requests = [
          fetchJson("/api/ai-operator/actions"),
          getAiAuditLog(),
          fetchJson("/api/jobs"),
          fetchJson("/api/invoices"),
          fetchJson("/api/quotes"),
        ];
        if (linkedJobId) requests.push(fetchJson(`/api/jobs/${encodeURIComponent(linkedJobId)}`));
        const [actionsRes, auditRes, jobsRes, invoicesRes, quotesRes, linkedJobRes] = await Promise.allSettled(requests);

        if (!alive) return;

        const actionPayload = actionsRes.status === "fulfilled" ? actionsRes.value : {};
        const linkedJobPayload = linkedJobRes?.status === "fulfilled" ? linkedJobRes.value : null;

        setState({
          loading: false,
          error: "",
          actions: listFrom(actionPayload, "actions"),
          audit: auditRes.status === "fulfilled" ? auditRes.value.items || [] : [],
          jobs: jobsRes.status === "fulfilled" ? listFrom(jobsRes.value, "jobs") : [],
          invoices: invoicesRes.status === "fulfilled" ? listFrom(invoicesRes.value, "invoices") : [],
          quotes: quotesRes.status === "fulfilled" ? listFrom(quotesRes.value, "quotes") : [],
          linkedJob: linkedJobPayload?.job || linkedJobPayload?.item || linkedJobPayload?.data || linkedJobPayload || null,
        });
      } catch (err) {
        if (!alive) return;
        setState({ loading: false, error: err?.message || "Could not load message queue", actions: [], audit: [], jobs: [], invoices: [], quotes: [], linkedJob: null });
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [linkedJobId]);

  const messages = useMemo(() => {
    const recordDrafts = [
      ...state.jobs.map((item) => draftFromRecord("job", item)),
      ...state.invoices.map((item) => draftFromRecord("invoice", item)),
      ...state.quotes.map((item) => draftFromRecord("quote", item)),
    ].filter(Boolean);

    const actionMessages = state.actions.filter((item) => {
      const text = `${item.type || ""} ${item.title || ""} ${item.summary || ""} ${item.generated_message || ""} ${item.draft_message || ""}`.toLowerCase();
      return text.includes("message") || text.includes("sms") || text.includes("email") || text.includes("follow");
    }).map((item) => ({
      id: item.id || item._id || item.title,
      record_id: item.target_id || item.job_id || item.id || item._id || "",
      type: item.type || "ai action",
      title: item.title || item.summary || "Prepared message",
      subject: item.subject || "Customer update from Churvox",
      to_email: item.customer_email || item.to_email || "",
      message: item.generated_message || item.draft_message || item.message || item.summary || "Prepared for owner review.",
      href: item.target_url || (item.job_id ? `/jobs/${item.job_id}` : "/dashboard"),
      state: item.status || "Draft",
    }));

    const auditMessages = state.audit.filter((item) => {
      const text = `${item.action || ""} ${item.note || ""} ${item.target_type || ""}`.toLowerCase();
      return text.includes("message") || text.includes("draft") || text.includes("email") || text.includes("sms");
    }).map((item) => ({
      id: item.id || item._id || item.created_at,
      record_id: item.target_id || item.id || item._id || "",
      type: "audit",
      title: item.action || "Audit message record",
      subject: "Message audit record",
      to_email: "",
      message: item.note || "Message-related audit record.",
      href: item.target_id ? `/jobs/${item.target_id}` : "/operator-tools",
      state: "Logged",
      readOnly: true,
    }));

    const linkedJobMessage = linkedJobId && state.linkedJob ? [{
      id: `linked-job-${linkedJobId}`,
      record_id: linkedJobId,
      type: "job",
      title: `Work Slip message for ${recordTitle(state.linkedJob, "linked job")}`,
      subject: draftSubject("job", state.linkedJob),
      to_email: emailOf(state.linkedJob),
      message: jobDescription(state.linkedJob, linkedJobId),
      href: `/jobs/${linkedJobId}`,
      state: "Draft",
    }] : [];

    const all = [...linkedJobMessage, ...recordDrafts, ...actionMessages, ...auditMessages];
    if (!linkedJobId) return all.slice(0, 100);
    const linkedFirst = all.filter((item) => sameId(item.record_id, linkedJobId) || String(item.href || "").includes(`/jobs/${linkedJobId}`));
    const others = all.filter((item) => !linkedFirst.includes(item));
    return [...linkedFirst, ...others].slice(0, 100);
  }, [state.actions, state.audit, state.jobs, state.invoices, state.quotes, state.linkedJob, linkedJobId]);

  useEffect(() => {
    setDraftEdits((prev) => ({ ...initialDraftEdits(messages), ...prev }));
  }, [messages]);

  async function logMessageAction(item, action) {
    await fetchJson("/api/ai/audit-log", {
      method: "POST",
      body: JSON.stringify({
        action,
        target_type: item.type || "message",
        target_id: item.record_id || item.id || "",
        note: `${action.replace(/_/g, " ")}: ${item.title || "Prepared message"}. Nothing was auto-sent unless this was an approved send.`,
      }),
    });
  }

  function updateDraft(item, field, value) {
    setDraftEdits((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), [field]: value } }));
  }

  async function markMessage(item, status) {
    try {
      await logMessageAction(item, status === "dismissed" ? "message_draft_dismissed" : "message_draft_saved_for_later");
      setLocalStatus((prev) => ({ ...prev, [item.id]: status }));
      setNotice(status === "dismissed" ? "Message draft dismissed from this queue." : "Message saved for later. Nothing was sent.");
    } catch (err) {
      setNotice(err?.message || "Could not update message status.");
    }
  }

  async function approveAndSend(item) {
    const edit = draftEdits[item.id] || {};
    const payload = {
      target_type: item.type,
      target_id: item.record_id,
      to_email: edit.to_email || item.to_email,
      subject: edit.subject || item.subject || "Customer update from Churvox",
      message: edit.message || item.message,
    };
    if (!payload.message) {
      setNotice("Add a message before sending.");
      return;
    }
    if (!payload.to_email) {
      setNotice("Add the customer email before sending.");
      return;
    }
    setBusyId(item.id);
    try {
      const result = await sendApprovedMessage(payload);
      setLocalStatus((prev) => ({ ...prev, [item.id]: "sent" }));
      setSentHistory((prev) => [{ ...item, ...payload, status: "sent", sent_at: new Date().toISOString(), provider: result?.item?.provider_response }, ...prev].slice(0, 20));
      setNotice("Message sent after owner approval.");
    } catch (err) {
      setLocalStatus((prev) => ({ ...prev, [item.id]: "failed" }));
      setSentHistory((prev) => [{ ...item, ...payload, status: "failed", error: err?.message || "Send failed", sent_at: new Date().toISOString() }, ...prev].slice(0, 20));
      setNotice(err?.message || "Message failed. Nothing else was changed.");
    } finally {
      setBusyId("");
    }
  }

  const visibleMessages = messages.filter((item) => localStatus[item.id] !== "dismissed");
  const linkedJobTitle = recordTitle(state.linkedJob || {}, linkedJobId ? `Job ${linkedJobId}` : "Linked job");

  return (
    <main className="cmq-shell" data-version="CHURVOX_MESSAGE_APPROVAL_QUEUE_PAGE_20260528 CHURVOX_MESSAGE_QUEUE_REAL_RECORD_DRAFTS_20260528 CHURVOX_MESSAGE_QUEUE_APPROVAL_ACTIONS_20260528 CHURVOX_MESSAGE_QUEUE_JOB_CONTEXT_20260528 CHURVOX_MESSAGE_APPROVAL_EDIT_SEND_HISTORY_20260529">
      <section className="cmq-hero">
        <div>
          <p>MESSAGE APPROVAL QUEUE</p>
          <h1>Customer messages stay approval-first.</h1>
          <span>
            Churvox can prepare reminders, updates and follow-ups, but nothing sends until the owner checks the wording and approves send.
          </span>
        </div>
        <aside>
          <small>Status</small>
          <b>{state.loading ? "Loading" : `${visibleMessages.length} drafts`}</b>
          <em>{state.error || "Owner approval required"}</em>
        </aside>
      </section>

      {linkedJobId ? (
        <section className="cmq-linked-job-panel">
          <div>
            <small>Opened from Work Slip</small>
            <h2>{linkedJobTitle}</h2>
            <p>{state.linkedJob ? jobDescription(state.linkedJob, linkedJobId) : "Linked job context is loading or unavailable. The queue is still approval-first."}</p>
          </div>
          <Link to={`/jobs/${linkedJobId}`}>Open linked job</Link>
        </section>
      ) : null}

      {notice ? <section className="cmq-notice">{notice}</section> : null}

      <section className="cmq-list">
        {visibleMessages.length ? visibleMessages.map((item, index) => {
          const status = localStatus[item.id] || item.state || "Draft";
          const isLinked = linkedJobId && (sameId(item.record_id, linkedJobId) || String(item.href || "").includes(`/jobs/${linkedJobId}`));
          const edit = draftEdits[item.id] || { message: item.message || "", subject: item.subject || "", to_email: item.to_email || "" };
          const isBusy = busyId === item.id;
          const sent = status === "sent";
          const failed = status === "failed";
          return (
            <article className={`cmq-card ${sent ? "approved" : ""} ${failed ? "failed" : ""} ${isLinked ? "linked" : ""}`} key={item.id || index}>
              <small>{isLinked ? "linked work slip · " : ""}{item.type || "draft"} · {status}</small>
              <h2>{item.title || "Prepared message"}</h2>
              <label className="cmq-field"><span>To email</span><input disabled={item.readOnly || sent || isBusy} value={edit.to_email || ""} onChange={(e) => updateDraft(item, "to_email", e.target.value)} placeholder="customer@email.com" /></label>
              <label className="cmq-field"><span>Subject</span><input disabled={item.readOnly || sent || isBusy} value={edit.subject || ""} onChange={(e) => updateDraft(item, "subject", e.target.value)} placeholder="Customer update" /></label>
              <label className="cmq-field"><span>Editable message</span><textarea disabled={item.readOnly || sent || isBusy} value={edit.message || ""} onChange={(e) => updateDraft(item, "message", e.target.value)} placeholder="Review and edit before sending" /></label>
              <div className="cmq-actions-row">
                {!item.readOnly && <button type="button" disabled={isBusy || sent} onClick={() => approveAndSend(item)}>{isBusy ? "Sending..." : sent ? "Sent" : "Approve & send"}</button>}
                {!item.readOnly && <button type="button" disabled={isBusy || sent} onClick={() => markMessage(item, "later")}>Save for later</button>}
                {!item.readOnly && <button type="button" disabled={isBusy || sent} onClick={() => markMessage(item, "dismissed")}>Dismiss</button>}
              </div>
              <Link to={item.href || "/dashboard"}>Open source record</Link>
              <span>{sent ? "Sent after owner approval." : failed ? "Send failed. Check email/provider setup." : "Review/edit here, then approve send."}</span>
            </article>
          );
        }) : (
          <article className="cmq-card">
            <small>Clear</small>
            <h2>No message drafts waiting</h2>
            <p>When Churvox prepares customer updates, quote follow-ups or invoice reminders, they will appear here.</p>
          </article>
        )}
      </section>

      {sentHistory.length ? (
        <section className="cmq-history">
          <header><small>Sent / failed history this session</small><b>{sentHistory.length}</b></header>
          {sentHistory.map((item, index) => (
            <article key={`${item.id}-${index}`} className={item.status === "failed" ? "failed" : "sent"}>
              <span>{item.status}</span>
              <b>{item.subject}</b>
              <em>{item.to_email}</em>
              {item.error ? <p>{item.error}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      <footer className="cmq-footer">
        <Link to="/dashboard">Back to Command Floor</Link>
        <Link to="/operator-tools">Open AI Operator tools</Link>
      </footer>
    </main>
  );
}
