import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./operatorApprovalCentre.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

const DEFAULT_SETTINGS = {
  mode: "full_approval",
  assignWorkers: true,
  draftInvoices: true,
  smsDrafts: true,
  smsSendRequiresApproval: true,
  quoteFollowups: true,
  jobConfirmations: true,
  adminNotes: true,
};

function token() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

async function api(path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}/${String(path).replace(/^\/+/, "")}`, {
    method: options.method || "GET",
    credentials: "include",
    headers,
    body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body,
  });

  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) throw new Error(payload?.detail || payload?.message || payload?.error || `${path} failed`);
  return payload;
}

function arrayFrom(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  for (const key of ["items", "data", "results", "rows"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return Object.values(payload).find(Array.isArray) || [];
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function idOf(row) {
  return row?.id || row?._id || row?.job_id || row?.invoice_id || row?.quote_id || "";
}

function text(value, fallback = "") {
  return String(value || fallback).trim();
}

function lower(value) {
  return text(value).toLowerCase();
}

function titleOf(row, fallback = "Item") {
  return row?.title || row?.job_title || row?.name || row?.client_name || row?.customer_name || row?.invoice_number || row?.quote_number || fallback;
}

function phoneOf(row) {
  return row?.phone || row?.mobile || row?.client_phone || row?.customer_phone || row?.contact_phone || "";
}

function emailOf(row) {
  return row?.email || row?.client_email || row?.customer_email || row?.contact_email || "";
}

function moneyValue(row) {
  const value = Number(row?.total || row?.amount || row?.balance || row?.price || row?.job_price || 0);
  return Number.isFinite(value) ? value : 0;
}

function money(row) {
  const value = moneyValue(row);
  if (!value) return "$0";
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(value);
}

function statusOf(row) {
  return lower(row?.status || row?.job_status || row?.payment_status || row?.quote_status || "active");
}

function saveLocalApproval(row) {
  const key = "churvox_ai_operator_approval_centre";
  const existing = readJson(key, []);
  writeJson(key, [{ ...row, local_only: true, created_at: new Date().toISOString() }, ...existing].slice(0, 100));
}

function getWorkerLoad(jobs, worker) {
  const wid = String(idOf(worker));
  const email = lower(worker?.email);
  return jobs.filter((j) => {
    const assigned = [
      j.assigned_worker_id,
      j.worker_id,
      j.assigned_to,
      j.assigned_worker?.id,
      j.assigned_worker?._id,
    ].map((x) => String(x || ""));
    const assignedEmail = lower(j.worker_email || j.assigned_worker_email || j.assigned_worker?.email);
    return assigned.includes(wid) || (!!email && assignedEmail === email);
  }).length;
}

function chooseWorker(job, team, jobs) {
  const active = team.filter((w) => !["inactive", "disabled", "removed"].includes(lower(w.status)));
  if (!active.length) return null;

  const jobRegion = lower(job.region || job.suburb || job.area || job.location);
  const sorted = [...active].sort((a, b) => {
    const aRegion = lower(a.region || a.suburb || a.area || a.location);
    const bRegion = lower(b.region || b.suburb || b.area || b.location);
    const aMatch = jobRegion && aRegion === jobRegion ? 1 : 0;
    const bMatch = jobRegion && bRegion === jobRegion ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    return getWorkerLoad(jobs, a) - getWorkerLoad(jobs, b);
  });

  return sorted[0];
}

function invoiceDescription(job) {
  const service = titleOf(job, "Completed service");
  const address = job.address || job.site_address || job.job_address || "";
  const notes =
    job.ai_invoice_description ||
    job.completion_summary ||
    job.worker_completion_notes ||
    job.completion_notes ||
    job.worker_notes ||
    job.notes ||
    "";
  return [service, address ? `at ${address}` : "", notes].filter(Boolean).join(" — ");
}

function smsPaymentMessage(invoice) {
  const name = invoice.client_name || invoice.customer_name || "there";
  const amount = money(invoice);
  const ref = invoice.invoice_number || idOf(invoice) || "your invoice";
  return `Hi ${name}, just a friendly reminder from Churvox that ${ref} for ${amount} is still awaiting payment. Please let us know if you need anything.`;
}

function smsQuoteMessage(quote) {
  const name = quote.client_name || quote.customer_name || "there";
  const ref = quote.quote_number || idOf(quote) || "your quote";
  return `Hi ${name}, just checking in on ${ref}. Let us know if you would like to go ahead or need any changes.`;
}

function smsJobConfirmMessage(job) {
  const name = job.client_name || job.customer_name || "there";
  const when = job.scheduled_time || job.scheduled_date || "your scheduled time";
  const address = job.address || job.site_address || "";
  return `Hi ${name}, confirming your job is scheduled for ${when}${address ? ` at ${address}` : ""}. Reply here if anything has changed.`;
}

function makeAction(partial) {
  return {
    id: `${partial.type}-${partial.source_id || Date.now()}-${Math.random().toString(16).slice(2)}`,
    status: "waiting_owner_approval",
    confidence: "owner_review",
    created_at: new Date().toISOString(),
    edits: {},
    ...partial,
  };
}

function buildAiWorkQueue({ jobs, invoices, quotes, clients, team, enquiries }, settings) {
  if (settings.mode === "observe") return [];

  const actions = [];
  const invoicedJobIds = new Set(invoices.map((i) => String(i.job_id || i.source_job_id || i.linked_job_id || "")).filter(Boolean));

  if (settings.assignWorkers) {
    jobs
      .filter((j) => !j.assigned_worker_id && !j.worker_id && !j.assigned_to)
      .filter((j) => !["completed", "done", "cancelled", "closed"].includes(statusOf(j)))
      .slice(0, 6)
      .forEach((job) => {
        const worker = chooseWorker(job, team, jobs);
        actions.push(
          makeAction({
            type: "assign_worker",
            label: "Assign worker",
            title: `Assign ${titleOf(job, "job")}`,
            summary: worker
              ? `AI picked ${titleOf(worker, "worker")} using active status, area match and workload.`
              : "AI found an unassigned job but no active worker was available.",
            source_id: idOf(job),
            risk: "Owner can edit worker before approval. No assignment happens until approved.",
            workspace: "/jobs",
            payload: {
              job_id: idOf(job),
              job_title: titleOf(job, "Job"),
              worker_id: worker ? idOf(worker) : "",
              worker_name: worker ? titleOf(worker, "Worker") : "",
              note: worker
                ? `Recommended because ${titleOf(worker, "worker")} is available and has the lowest/closest load.`
                : "Pick a worker before approving.",
            },
          })
        );
      });
  }

  if (settings.draftInvoices) {
    jobs
      .filter((j) => ["completed", "done", "closed"].includes(statusOf(j)))
      .filter((j) => !invoicedJobIds.has(String(idOf(j))))
      .slice(0, 6)
      .forEach((job) => {
        actions.push(
          makeAction({
            type: "draft_invoice",
            label: "Draft invoice",
            title: `Create draft invoice for ${titleOf(job, "completed job")}`,
            summary: "AI prepared the invoice description and amount from completed job data.",
            source_id: idOf(job),
            risk: "Draft only. Nothing is sent to the customer until owner approves/sends.",
            workspace: "/invoices",
            payload: {
              job_id: idOf(job),
              client_id: job.client_id || job.customer_id || "",
              client_name: job.client_name || job.customer_name || "Client",
              customer_email: emailOf(job),
              description: invoiceDescription(job),
              amount: moneyValue(job),
              status: "draft",
            },
          })
        );
      });
  }

  if (settings.smsDrafts) {
    invoices
      .filter((i) => ["open", "sent", "unpaid", "overdue", "partially_paid", "draft"].includes(statusOf(i)))
      .filter((i) => phoneOf(i) || i.client_phone || i.customer_phone)
      .slice(0, 6)
      .forEach((invoice) => {
        actions.push(
          makeAction({
            type: "sms_payment_reminder",
            label: "SMS payment reminder",
            title: `SMS reminder for ${invoice.invoice_number || "invoice"}`,
            summary: "AI wrote an editable payment reminder.",
            source_id: idOf(invoice),
            risk: "SMS is not sent unless owner presses Approve + Send SMS.",
            workspace: "/invoices",
            payload: {
              invoice_id: idOf(invoice),
              to: phoneOf(invoice),
              message: smsPaymentMessage(invoice),
            },
          })
        );
      });
  }

  if (settings.quoteFollowups) {
    quotes
      .filter((q) => ["open", "sent", "pending", "waiting", "draft"].includes(statusOf(q)))
      .slice(0, 6)
      .forEach((quote) => {
        actions.push(
          makeAction({
            type: "quote_followup",
            label: "Quote follow-up",
            title: `Follow up ${quote.quote_number || titleOf(quote, "quote")}`,
            summary: phoneOf(quote)
              ? "AI wrote an editable SMS follow-up."
              : "AI prepared a quote follow-up note. Add a phone number before SMS sending.",
            source_id: idOf(quote),
            risk: "Draft only until owner approves.",
            workspace: "/quotes",
            payload: {
              quote_id: idOf(quote),
              to: phoneOf(quote),
              message: smsQuoteMessage(quote),
            },
          })
        );
      });
  }

  if (settings.jobConfirmations) {
    jobs
      .filter((j) => !["completed", "done", "cancelled", "closed"].includes(statusOf(j)))
      .filter((j) => phoneOf(j))
      .slice(0, 4)
      .forEach((job) => {
        actions.push(
          makeAction({
            type: "sms_job_confirmation",
            label: "SMS job confirmation",
            title: `Confirm ${titleOf(job, "job")}`,
            summary: "AI prepared an editable customer confirmation SMS.",
            source_id: idOf(job),
            risk: "SMS is not sent unless owner presses Approve + Send SMS.",
            workspace: "/jobs",
            payload: {
              job_id: idOf(job),
              to: phoneOf(job),
              message: smsJobConfirmMessage(job),
            },
          })
        );
      });
  }

  if (settings.adminNotes) {
    jobs
      .filter((j) => text(j.worker_notes || j.completion_notes || j.issue_flag || j.help_flag))
      .slice(0, 4)
      .forEach((job) => {
        actions.push(
          makeAction({
            type: "admin_note_review",
            label: "Admin note",
            title: `Review note for ${titleOf(job, "job")}`,
            summary: "AI found a worker/admin note that may need owner attention.",
            source_id: idOf(job),
            risk: "Review only. No customer action.",
            workspace: "/jobs",
            payload: {
              job_id: idOf(job),
              note: job.worker_notes || job.completion_notes || job.notes || "Worker flagged this job for review.",
            },
          })
        );
      });
  }

  if (settings.mode === "full_approval") {
    enquiries
      .filter((e) => !e.client_id && !e.job_id && !e.quote_id)
      .slice(0, 4)
      .forEach((lead) => {
        actions.push(
          makeAction({
            type: "lead_to_client",
            label: "Lead conversion",
            title: `Turn lead into client: ${titleOf(lead, "new enquiry")}`,
            summary: "AI prepared a client record from an enquiry.",
            source_id: idOf(lead),
            risk: "Owner can edit before creating client.",
            workspace: "/clients",
            payload: {
              lead_id: idOf(lead),
              name: lead.name || lead.client_name || lead.customer_name || "",
              phone: phoneOf(lead),
              email: emailOf(lead),
              notes: lead.message || lead.notes || "Created from AI Operator lead review.",
            },
          })
        );
      });
  }

  return actions.slice(0, 30);
}

async function firstWorking(attempts) {
  let last = null;
  for (const run of attempts) {
    try {
      return await run();
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error("No endpoint accepted this action.");
}

export default function OperatorApprovalCentre() {
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...readJson("churvox_ai_operator_settings", {}) }));
  const [data, setData] = useState({ jobs: [], invoices: [], quotes: [], clients: [], team: [], enquiries: [] });
  const [selected, setSelected] = useState(null);
  const [edited, setEdited] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setNotice("");
    const calls = await Promise.allSettled([
      api("/jobs"),
      api("/invoices"),
      api("/quotes"),
      api("/clients"),
      api("/team/workers"),
      api("/enquiries"),
    ]);

    setData({
      jobs: calls[0].status === "fulfilled" ? arrayFrom(calls[0].value, ["jobs"]) : [],
      invoices: calls[1].status === "fulfilled" ? arrayFrom(calls[1].value, ["invoices"]) : [],
      quotes: calls[2].status === "fulfilled" ? arrayFrom(calls[2].value, ["quotes"]) : [],
      clients: calls[3].status === "fulfilled" ? arrayFrom(calls[3].value, ["clients"]) : [],
      team: calls[4].status === "fulfilled" ? arrayFrom(calls[4].value, ["workers", "team"]) : [],
      enquiries: calls[5].status === "fulfilled" ? arrayFrom(calls[5].value, ["enquiries", "leads"]) : [],
    });

    if (calls.some((c) => c.status === "rejected")) {
      setNotice("Some live data could not load. AI Operator is using the records it can access.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    writeJson("churvox_ai_operator_settings", settings);
  }, [settings]);

  const actions = useMemo(() => buildAiWorkQueue(data, settings), [data, settings]);

  function openAction(action) {
    setSelected(action);
    setEdited(action.payload || {});
    setNotice("");
  }

  function updateField(field, value) {
    setEdited((e) => ({ ...e, [field]: value }));
  }

  async function persistLog(action, mode, result, extra = {}) {
    const row = {
      type: action.type,
      title: action.title,
      mode,
      result,
      payload: edited,
      source_id: action.source_id,
      created_at: new Date().toISOString(),
      ...extra,
    };

    try {
      await api("/operator/approval-log", { method: "POST", body: row });
    } catch {
      saveLocalApproval(row);
    }

    try {
      await api("/operator/drafts", {
        method: "POST",
        body: {
          type: action.type,
          status: result,
          payload: row,
        },
      });
    } catch {
      saveLocalApproval({ ...row, draft_fallback: true });
    }
  }

  async function approveAction(sendSms = false) {
    if (!selected || busy) return;
    setBusy(true);
    setNotice("");

    try {
      if (selected.type === "assign_worker") {
        if (!edited.worker_id) throw new Error("Pick a worker before approving.");
        await firstWorking([
          () =>
            api(`/jobs/${edited.job_id}`, {
              method: "PATCH",
              body: {
                assigned_worker_id: edited.worker_id,
                worker_id: edited.worker_id,
                assigned_to: edited.worker_id,
                assigned_worker_name: edited.worker_name,
              },
            }),
          () =>
            api(`/jobs/${edited.job_id}/assign`, {
              method: "POST",
              body: {
                worker_id: edited.worker_id,
                assigned_worker_id: edited.worker_id,
                note: edited.note,
              },
            }),
        ]);
        await persistLog(selected, "approve", "worker_assigned");
        setNotice("Worker assignment approved and sent to backend.");
      } else if (selected.type === "draft_invoice") {
        await firstWorking([
          () =>
            api("/invoices", {
              method: "POST",
              body: {
                job_id: edited.job_id,
                source_job_id: edited.job_id,
                client_id: edited.client_id,
                customer_id: edited.client_id,
                client_name: edited.client_name,
                customer_name: edited.client_name,
                customer_email: edited.customer_email,
                description: edited.description,
                amount: Number(edited.amount || 0),
                subtotal: Number(edited.amount || 0),
                total: Number(edited.amount || 0),
                status: "draft",
                source: "ai_operator_approval",
                created_by_ai: true,
              },
            }),
          () =>
            api("/operator/drafts", {
              method: "POST",
              body: {
                type: "draft_invoice",
                status: "owner_approved_draft",
                payload: edited,
              },
            }),
        ]);
        await persistLog(selected, "approve", "draft_invoice_created");
        setNotice("Draft invoice approved and created/saved.");
      } else if (selected.type.startsWith("sms_") || selected.type === "quote_followup") {
        if (sendSms) {
          if (!settings.smsSendRequiresApproval) throw new Error("SMS sending is not enabled in Operator settings.");
          if (!edited.to || !edited.message) throw new Error("SMS needs a phone number and message.");
          await firstWorking([
            () =>
              api("/sms/send-fixed", {
                method: "POST",
                body: {
                  to: edited.to,
                  phone: edited.to,
                  message: edited.message,
                  source: selected.type,
                  job_id: edited.job_id,
                  invoice_id: edited.invoice_id,
                  quote_id: edited.quote_id,
                },
              }),
            () =>
              api("/sms/send", {
                method: "POST",
                body: {
                  to: edited.to,
                  phone: edited.to,
                  message: edited.message,
                  source: selected.type,
                  job_id: edited.job_id,
                  invoice_id: edited.invoice_id,
                  quote_id: edited.quote_id,
                },
              }),
          ]);
          await persistLog(selected, "approve_send_sms", "sms_sent");
          setNotice("SMS approved and sent.");
        } else {
          await persistLog(selected, "approve_draft", "sms_draft_saved");
          setNotice("SMS draft saved for owner approval. Nothing was sent.");
        }
      } else if (selected.type === "lead_to_client") {
        await firstWorking([
          () =>
            api("/clients", {
              method: "POST",
              body: {
                name: edited.name,
                client_name: edited.name,
                phone: edited.phone,
                email: edited.email,
                notes: edited.notes,
                source: "ai_operator_lead_conversion",
              },
            }),
          () =>
            api("/operator/drafts", {
              method: "POST",
              body: {
                type: "lead_to_client",
                status: "owner_approved_draft",
                payload: edited,
              },
            }),
        ]);
        await persistLog(selected, "approve", "client_created_or_saved");
        setNotice("Lead approved and created/saved as client.");
      } else {
        await persistLog(selected, "approve", "review_saved");
        setNotice("AI action saved for admin review.");
      }

      setSelected(null);
      await load();
    } catch (e) {
      await persistLog(selected, sendSms ? "approve_send_attempt" : "approve_attempt", "fallback_saved", { error: e.message });
      setNotice(`${e.message || "Backend did not accept the action."} Saved to approval history as fallback.`);
    } finally {
      setBusy(false);
    }
  }

  async function rejectAction() {
    if (!selected || busy) return;
    setBusy(true);
    await persistLog(selected, "reject", "owner_rejected");
    setSelected(null);
    setBusy(false);
    setNotice("Action rejected and logged.");
  }

  const stats = {
    prepared: actions.length,
    sms: actions.filter((a) => a.type.startsWith("sms_") || a.type === "quote_followup").length,
    invoices: actions.filter((a) => a.type === "draft_invoice").length,
    dispatch: actions.filter((a) => a.type === "assign_worker").length,
  };

  return (
    <main className="ai-approval-centre">
      <header className="ai-approval-hero">
        <div>
          <p>AI OPERATOR APPROVAL CENTRE</p>
          <h1>AI does the work. You edit and approve.</h1>
          <span>
            Churvox prepares worker assignments, invoice drafts, customer SMS messages, quote follow-ups,
            job confirmations, lead conversions and admin notes into one owner approval page.
          </span>
        </div>
        <button type="button" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh live work"}</button>
      </header>

      {notice ? <section className="ai-notice">{notice}</section> : null}

      <section className="ai-mode-panel">
        <div>
          <strong>How much should AI do?</strong>
          <small>Owner stays in control. SMS/customer actions require approval.</small>
        </div>
        <select value={settings.mode} onChange={(e) => setSettings((s) => ({ ...s, mode: e.target.value }))}>
          <option value="observe">Watch only — no prepared work</option>
          <option value="drafts">Prepare drafts only</option>
          <option value="full_approval">Full Operator — prepare executable work for approval</option>
        </select>
      </section>

      <section className="ai-permission-grid">
        {[
          ["assignWorkers", "Assign workers", "AI chooses best worker and waits for owner approval."],
          ["draftInvoices", "Draft invoices", "AI creates invoice drafts from completed jobs."],
          ["smsDrafts", "Draft SMS", "AI writes payment, quote and job SMS messages."],
          ["smsSendRequiresApproval", "Allow approve + send SMS", "Owner can explicitly approve and send SMS."],
          ["quoteFollowups", "Quote follow-ups", "AI prepares follow-up messages for open quotes."],
          ["jobConfirmations", "Job confirmations", "AI prepares customer job confirmation SMS."],
          ["adminNotes", "Admin notes", "AI surfaces worker notes/issues for owner review."],
        ].map(([key, title, desc]) => (
          <label className="ai-permission" key={key}>
            <input
              type="checkbox"
              checked={!!settings[key]}
              onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))}
            />
            <span>
              <b>{title}</b>
              <small>{desc}</small>
            </span>
          </label>
        ))}
      </section>

      <section className="ai-stat-grid">
        <article><b>{stats.prepared}</b><small>Prepared actions</small></article>
        <article><b>{stats.dispatch}</b><small>Worker assignments</small></article>
        <article><b>{stats.invoices}</b><small>Invoice drafts</small></article>
        <article><b>{stats.sms}</b><small>SMS/message drafts</small></article>
      </section>

      <section className="ai-work-board">
        <header>
          <div>
            <p>OWNER APPROVAL QUEUE</p>
            <h2>Everything AI prepared</h2>
          </div>
          <span>{actions.length} waiting</span>
        </header>

        {!actions.length ? (
          <div className="ai-empty">
            <strong>No AI actions waiting.</strong>
            <small>When jobs, invoices, quotes, SMS reminders or admin notes need work, they will appear here.</small>
          </div>
        ) : (
          <div className="ai-action-list">
            {actions.map((action) => (
              <article className="ai-action-card" key={action.id}>
                <div>
                  <span>{action.label}</span>
                  <strong>{action.title}</strong>
                  <p>{action.summary}</p>
                  <small>{action.risk}</small>
                </div>
                <button type="button" onClick={() => openAction(action)}>Edit / approve</button>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected ? (
        <div className="ai-drawer-backdrop" onClick={() => !busy && setSelected(null)}>
          <section className="ai-drawer" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <p>{selected.label}</p>
                <h2>{selected.title}</h2>
                <span>{selected.risk}</span>
              </div>
              <button type="button" onClick={() => setSelected(null)} disabled={busy}>×</button>
            </header>

            <div className="ai-editor">
              {selected.type === "assign_worker" ? (
                <>
                  <label>
                    Job
                    <input value={edited.job_title || ""} onChange={(e) => updateField("job_title", e.target.value)} />
                  </label>
                  <label>
                    Worker
                    <select
                      value={edited.worker_id || ""}
                      onChange={(e) => {
                        const worker = data.team.find((w) => String(idOf(w)) === e.target.value);
                        updateField("worker_id", e.target.value);
                        updateField("worker_name", worker ? titleOf(worker, "Worker") : "");
                      }}
                    >
                      <option value="">Pick worker</option>
                      {data.team.map((worker) => (
                        <option value={idOf(worker)} key={idOf(worker)}>
                          {titleOf(worker, "Worker")} — {worker.region || worker.suburb || worker.status || "available"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Owner note
                    <textarea value={edited.note || ""} onChange={(e) => updateField("note", e.target.value)} />
                  </label>
                </>
              ) : selected.type === "draft_invoice" ? (
                <>
                  <label>
                    Client
                    <input value={edited.client_name || ""} onChange={(e) => updateField("client_name", e.target.value)} />
                  </label>
                  <label>
                    Amount
                    <input type="number" value={edited.amount || ""} onChange={(e) => updateField("amount", e.target.value)} />
                  </label>
                  <label>
                    Invoice description
                    <textarea value={edited.description || ""} onChange={(e) => updateField("description", e.target.value)} />
                  </label>
                </>
              ) : selected.type.startsWith("sms_") || selected.type === "quote_followup" ? (
                <>
                  <label>
                    Phone number
                    <input value={edited.to || ""} onChange={(e) => updateField("to", e.target.value)} />
                  </label>
                  <label>
                    SMS message
                    <textarea value={edited.message || ""} onChange={(e) => updateField("message", e.target.value)} />
                  </label>
                  <div className="ai-warning-box">
                    SMS is only sent if you press <b>Approve + Send SMS</b>. Saving draft will not send anything.
                  </div>
                </>
              ) : selected.type === "lead_to_client" ? (
                <>
                  <label>
                    Client name
                    <input value={edited.name || ""} onChange={(e) => updateField("name", e.target.value)} />
                  </label>
                  <label>
                    Phone
                    <input value={edited.phone || ""} onChange={(e) => updateField("phone", e.target.value)} />
                  </label>
                  <label>
                    Email
                    <input value={edited.email || ""} onChange={(e) => updateField("email", e.target.value)} />
                  </label>
                  <label>
                    Notes
                    <textarea value={edited.notes || ""} onChange={(e) => updateField("notes", e.target.value)} />
                  </label>
                </>
              ) : (
                <label>
                  Admin note
                  <textarea value={edited.note || ""} onChange={(e) => updateField("note", e.target.value)} />
                </label>
              )}
            </div>

            <footer>
              <button type="button" onClick={rejectAction} disabled={busy}>Reject</button>
              <button type="button" onClick={() => approveAction(false)} disabled={busy}>
                {busy ? "Saving..." : "Approve / save draft"}
              </button>
              {(selected.type.startsWith("sms_") || selected.type === "quote_followup") && settings.smsSendRequiresApproval ? (
                <button className="primary" type="button" onClick={() => approveAction(true)} disabled={busy}>
                  {busy ? "Sending..." : "Approve + Send SMS"}
                </button>
              ) : null}
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
