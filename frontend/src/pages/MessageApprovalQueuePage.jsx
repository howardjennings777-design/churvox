// CHURVOX_MESSAGE_APPROVAL_STABLE_WIRING_20260601
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./MessageApprovalQueuePage.css";

// Message approvals are approval-first. This page now uses stable live records only:
// /jobs, /invoices, /quotes and /clients. It does not call missing placeholder routes
// like /ai-operator/actions, /ai/audit-log or /message-approvals/send.

function queryParam(name) {
  try { return new URLSearchParams(window.location.search).get(name) || ""; } catch { return ""; }
}

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.invoices)) return value.invoices;
  if (Array.isArray(value?.quotes)) return value.quotes;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function pickList(response, keys = []) {
  const data = response?.data ?? response;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  return arr(data);
}

function idOf(item) { return item?.id || item?._id || item?.uuid || item?.job_id || item?.invoice_id || item?.quote_id || ""; }
function sameId(a, b) { return String(a || "") && String(a || "") === String(b || ""); }
function recordTitle(item, fallback) { return item?.title || item?.job_name || item?.customer_name || item?.client_name || item?.name || item?.summary || fallback; }
function clientIdOf(item) { return item?.client_id || item?.customer_id || item?.clientId || item?.customerId || ""; }
function clientEmailFor(item, clients = []) {
  const direct = item?.customer_email || item?.client_email || item?.email || item?.contact_email || "";
  if (direct) return direct;
  const cid = clientIdOf(item);
  if (!cid) return "";
  const client = clients.find((c) => String(c.id || c._id || c.client_id || "") === String(cid));
  return client?.email || client?.customer_email || client?.client_email || client?.contact_email || "";
}
function statusOf(item) { return String(item?.status || item?.job_status || item?.payment_status || "").toLowerCase(); }
function isComplete(item) { return statusOf(item).includes("complete") || statusOf(item).includes("done"); }
function isUnpaid(invoice) { return !statusOf(invoice).includes("paid") && Number(invoice?.amount_due || invoice?.balance_due || invoice?.total || invoice?.amount || 0) > 0; }
function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}

function draftSubject(type, item) {
  const name = recordTitle(item, "your service");
  if (type === "invoice") return `Invoice update for ${name}`;
  if (type === "quote") return `Quote update for ${name}`;
  return `Job update for ${name}`;
}

function pickDraft(item) {
  return item?.customer_message_draft || item?.draft_message || item?.last_message_draft || item?.generated_message || item?.message || "";
}

function draftBody(type, item) {
  const existing = pickDraft(item);
  if (existing) return existing;
  if (type === "invoice") return `Hi ${recordTitle(item, "there")},\n\nJust a quick update that your invoice is ready for review. The current balance is ${money(item?.amount_due || item?.balance_due || item?.total || item?.amount)}.\n\nThanks.`;
  if (type === "quote") return `Hi ${recordTitle(item, "there")},\n\nJust checking in on your quote. Let us know if you would like to go ahead or need anything changed.\n\nThanks.`;
  return item?.completion_notes || item?.notes || item?.description || `Hi ${recordTitle(item, "there")},\n\nHere is a quick update on your job. Please let us know if you have any questions.\n\nThanks.`;
}

function draftFromRecord(type, item, clients) {
  const id = idOf(item);
  if (!id && !pickDraft(item)) return null;
  const href = type === "job" ? `/jobs/${id}` : type === "invoice" ? `/invoices/${id}` : type === "quote" ? `/quotes/${id}` : "/dashboard";
  return {
    id: `${type}-${id || recordTitle(item, type)}`,
    record_id: id,
    type,
    title: recordTitle(item, `${type} message draft`),
    subject: item?.last_message_subject || draftSubject(type, item),
    to_email: clientEmailFor(item, clients),
    message: draftBody(type, item),
    href: id ? href : "/dashboard",
    state: item?.message_approval_status || item?.owner_review_status || "Draft",
  };
}

function readLocalHistory() {
  try { return JSON.parse(localStorage.getItem("churvox_message_approval_history") || "[]"); } catch { return []; }
}
function saveLocalHistory(items) {
  try { localStorage.setItem("churvox_message_approval_history", JSON.stringify(items.slice(0, 30))); } catch {}
}
function mailtoUrl({ to_email, subject, message }) {
  return `mailto:${encodeURIComponent(to_email || "")}?subject=${encodeURIComponent(subject || "Customer update from Churvox")}&body=${encodeURIComponent(message || "")}`;
}
function initialDraftEdits(messages) {
  return Object.fromEntries(messages.map((item) => [item.id, { message: item.message || "", subject: item.subject || "", to_email: item.to_email || "" }]));
}

export default function MessageApprovalQueuePage() {
  const api = useApi();
  const linkedJobId = queryParam("job_id");
  const [state, setState] = useState({ loading: true, error: "", jobs: [], invoices: [], quotes: [], clients: [], linkedJob: null });
  const [localStatus, setLocalStatus] = useState({});
  const [draftEdits, setDraftEdits] = useState({});
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [sentHistory, setSentHistory] = useState(() => readLocalHistory());

  useEffect(() => {
    let alive = true;
    async function load() {
      const requests = [api.get("/jobs"), api.get("/invoices"), api.get("/quotes"), api.get("/clients")];
      if (linkedJobId) requests.push(api.get(`/jobs/${encodeURIComponent(linkedJobId)}`));
      const [jobsRes, invoicesRes, quotesRes, clientsRes, linkedJobRes] = await Promise.allSettled(requests);
      if (!alive) return;
      const jobsOk = jobsRes.status === "fulfilled" && jobsRes.value?.success;
      setState({
        loading: false,
        error: jobsOk ? "" : jobsRes.value?.error || "Could not load some message source records",
        jobs: jobsOk ? pickList(jobsRes.value, ["jobs", "items", "results"]) : [],
        invoices: invoicesRes.status === "fulfilled" && invoicesRes.value?.success ? pickList(invoicesRes.value, ["invoices", "items", "results"]) : [],
        quotes: quotesRes.status === "fulfilled" && quotesRes.value?.success ? pickList(quotesRes.value, ["quotes", "items", "results"]) : [],
        clients: clientsRes.status === "fulfilled" && clientsRes.value?.success ? pickList(clientsRes.value, ["clients", "customers", "items", "results"]) : [],
        linkedJob: linkedJobRes?.status === "fulfilled" && linkedJobRes.value?.success ? (linkedJobRes.value?.data?.job || linkedJobRes.value?.data?.item || linkedJobRes.value?.data || null) : null,
      });
    }
    load();
    return () => { alive = false; };
  }, [api, linkedJobId]);

  const messages = useMemo(() => {
    const completedJobs = state.jobs.filter((job) => pickDraft(job) || isComplete(job));
    const invoiceDrafts = state.invoices.filter((invoice) => pickDraft(invoice) || isUnpaid(invoice));
    const quoteDrafts = state.quotes.filter((quote) => pickDraft(quote) || !statusOf(quote).includes("accepted"));
    const recordDrafts = [
      ...completedJobs.map((item) => draftFromRecord("job", item, state.clients)),
      ...invoiceDrafts.map((item) => draftFromRecord("invoice", item, state.clients)),
      ...quoteDrafts.map((item) => draftFromRecord("quote", item, state.clients)),
    ].filter(Boolean);
    const linkedJobMessage = linkedJobId && state.linkedJob ? [draftFromRecord("job", state.linkedJob, state.clients)].filter(Boolean) : [];
    const all = [...linkedJobMessage, ...recordDrafts];
    if (!linkedJobId) return all.slice(0, 100);
    const linkedFirst = all.filter((item) => sameId(item.record_id, linkedJobId) || String(item.href || "").includes(`/jobs/${linkedJobId}`));
    const others = all.filter((item) => !linkedFirst.includes(item));
    return [...linkedFirst, ...others].slice(0, 100);
  }, [state.jobs, state.invoices, state.quotes, state.clients, state.linkedJob, linkedJobId]);

  useEffect(() => { setDraftEdits((prev) => ({ ...initialDraftEdits(messages), ...prev })); }, [messages]);

  function updateDraft(item, field, value) {
    setDraftEdits((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), [field]: value } }));
  }

  function saveHistory(next) {
    setSentHistory(next);
    saveLocalHistory(next);
  }

  async function markMessage(item, status) {
    setLocalStatus((prev) => ({ ...prev, [item.id]: status }));
    setNotice(status === "dismissed" ? "Message draft dismissed from this device queue." : "Message saved for later on this device. Nothing was sent.");
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
    if (!payload.message) { setNotice("Add a message before approving."); return; }
    if (!payload.to_email) { setNotice("Add the customer email before approving, or add it to the linked client record."); return; }
    setBusyId(item.id);
    try {
      const historyItem = { ...item, ...payload, status: "approved_external_email_opened", approved_at: new Date().toISOString() };
      saveHistory([historyItem, ...sentHistory].slice(0, 30));
      setLocalStatus((prev) => ({ ...prev, [item.id]: "approved" }));
      window.location.href = mailtoUrl(payload);
      setNotice("Approved. Your email app opened with the checked message. Send from there when ready.");
    } catch (err) {
      setLocalStatus((prev) => ({ ...prev, [item.id]: "failed" }));
      setNotice(err?.message || "Could not open email app. Nothing was sent.");
    } finally {
      setBusyId("");
    }
  }

  const visibleMessages = messages.filter((item) => localStatus[item.id] !== "dismissed");
  const linkedJobTitle = recordTitle(state.linkedJob || {}, linkedJobId ? `Job ${linkedJobId}` : "Linked job");

  return <main className="cmq-shell" data-version="CHURVOX_MESSAGE_APPROVAL_STABLE_WIRING_20260601">
    <section className="cmq-hero"><div><p>MESSAGE APPROVAL QUEUE</p><h1>Customer messages stay approval-first.</h1><span>Churvox prepares message drafts from real jobs, invoices, quotes and clients. Nothing sends silently.</span></div><aside><small>Status</small><b>{state.loading ? "Loading" : `${visibleMessages.length} drafts`}</b><em>{state.error || "Owner approval required"}</em></aside></section>
    {linkedJobId ? <section className="cmq-linked-job-panel"><div><small>Opened from Work Slip</small><h2>{linkedJobTitle}</h2><p>{state.linkedJob ? draftBody("job", state.linkedJob) : "Linked job context is loading or unavailable. The queue is still approval-first."}</p></div><Link to={`/jobs/${linkedJobId}`}>Open linked job</Link></section> : null}
    {notice ? <section className="cmq-notice">{notice}</section> : null}
    <section className="cmq-list">{visibleMessages.length ? visibleMessages.map((item, index) => { const status = localStatus[item.id] || item.state || "Draft"; const isLinked = linkedJobId && (sameId(item.record_id, linkedJobId) || String(item.href || "").includes(`/jobs/${linkedJobId}`)); const edit = draftEdits[item.id] || { message: item.message || "", subject: item.subject || "", to_email: item.to_email || "" }; const isBusy = busyId === item.id; const approved = status === "approved"; return <article className={`cmq-card ${approved ? "approved" : ""} ${isLinked ? "linked" : ""}`} key={item.id || index}><small>{isLinked ? "linked work slip · " : ""}{item.type || "draft"} · {status}</small><h2>{item.title || "Prepared message"}</h2><label className="cmq-field"><span>To email</span><input disabled={approved || isBusy} value={edit.to_email || ""} onChange={(e) => updateDraft(item, "to_email", e.target.value)} placeholder="customer@email.com" /></label><label className="cmq-field"><span>Subject</span><input disabled={approved || isBusy} value={edit.subject || ""} onChange={(e) => updateDraft(item, "subject", e.target.value)} placeholder="Customer update" /></label><label className="cmq-field"><span>Editable message</span><textarea disabled={approved || isBusy} value={edit.message || ""} onChange={(e) => updateDraft(item, "message", e.target.value)} placeholder="Review and edit before sending" /></label><div className="cmq-actions-row"><button type="button" disabled={isBusy || approved} onClick={() => approveAndSend(item)}>{isBusy ? "Opening..." : approved ? "Approved" : "Approve & open email"}</button><button type="button" disabled={isBusy || approved} onClick={() => markMessage(item, "later")}>Save for later</button><button type="button" disabled={isBusy || approved} onClick={() => markMessage(item, "dismissed")}>Dismiss</button></div><Link to={item.href || "/dashboard"}>Open source record</Link><span>{approved ? "Approved. Email opened externally; Churvox did not silently send." : edit.to_email ? "Email filled from record/client. Review/edit here, then approve." : "Add email here or save it on the linked client before approving."}</span></article>; }) : <article className="cmq-card"><small>Clear</small><h2>No message drafts waiting</h2><p>When completed jobs, unpaid invoices, open quotes or saved drafts exist, they will appear here.</p></article>}</section>
    {sentHistory.length ? <section className="cmq-history"><h2>Recent approved messages on this device</h2>{sentHistory.map((item, index) => <article key={`${item.id || index}-${item.approved_at || index}`}><b>{item.subject || item.title}</b><span>{item.to_email || "No email"} · {item.status || "approved"}</span><em>{item.approved_at || item.sent_at || "recent"}</em></article>)}</section> : null}
  </main>;
}
