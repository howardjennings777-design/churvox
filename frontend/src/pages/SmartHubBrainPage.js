import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { get, patch, post } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const safeArray = (value) => (Array.isArray(value) ? value : []);

const listFrom = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  const src = value?.data ?? value;
  if (Array.isArray(src)) return src;
  if (src && typeof src === "object") {
    for (const key of keys) {
      if (Array.isArray(src?.[key])) return src[key];
    }
    if (Array.isArray(src?.items)) return src.items;
  }
  return [];
};

const statusOf = (value) => String(value || "").toLowerCase().trim();
const norm = (value) => String(value || "").toLowerCase().trim();
const asDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
};

const money = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString(undefined, { style: "currency", currency: "AUD" });
};

const REMINDER_ELIGIBLE = ["open", "sent", "unpaid", "overdue", "pending_payment"];
const REMINDER_EXCLUDED = ["paid", "cancelled", "canceled"];

const invoiceBalance = (inv) => {
  const candidates = [inv?.balance_due, inv?.amount_due, inv?.total_due, inv?.total, inv?.amount];
  const picked = candidates.map((v) => Number(v)).find((v) => Number.isFinite(v));
  return Number.isFinite(picked) ? picked : NaN;
};

const daysOverdue = (inv) => {
  const explicit = Number(inv?.overdue_days ?? inv?.days_overdue);
  if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  const dueDate = inv?.due_date || inv?.dueDate;
  if (!dueDate) return null;
  const ms = Date.now() - new Date(dueDate).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

const reminderText = ({ clientName, invoiceNo, amount, overdue }) => {
  if (overdue > 0) {
    return `Hi ${clientName}, this is a friendly follow-up on overdue invoice ${invoiceNo || ""} for ${amount}. Please let us know if payment has already been made or if you need the payment link resent.`.replace("invoice  for", "your invoice for");
  }
  if (!invoiceNo) {
    return `Hi ${clientName}, just a friendly reminder that your invoice for ${amount} is still outstanding. Please let us know if you need anything from us.`;
  }
  return `Hi ${clientName}, just a friendly reminder that invoice ${invoiceNo} for ${amount} is still outstanding. Please let us know if you need anything from us.`;
};
const QUOTE_FOLLOW_UP_ELIGIBLE = ["sent", "pending", "waiting", "awaiting_response", "viewed"];
const QUOTE_FOLLOW_UP_EXCLUDED = ["accepted", "declined", "rejected", "converted", "invoiced", "cancelled", "canceled", "draft"];

const quoteAgeDays = (quote) => {
  const source = quote?.sent_at || quote?.sentAt || quote?.created_at || quote?.createdAt || quote?.date;
  if (!source) return null;
  const ms = Date.now() - new Date(source).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

const quoteFollowUpText = ({ clientName, quoteNo, amountText, title, ageDays }) => {
  if (Number.isFinite(ageDays) && ageDays >= 21) {
    return `Hi ${clientName}, just checking whether you'd still like to proceed with quote ${quoteNo || title || "this quote"}. Happy to help with any changes before we book the work in.`;
  }
  if (quoteNo && amountText && amountText !== "—") {
    return `Hi ${clientName}, just following up on quote ${quoteNo} for ${amountText}. Let us know if you'd like to go ahead or if you have any questions.`;
  }
  return `Hi ${clientName}, just checking in on the quote for ${title || "your requested work"}. Happy to answer any questions or adjust anything if needed.`;
};

const safeText = (value, fallback = "Not available") => {
  const text = String(value || "").trim();
  return text || fallback;
};

const textOr = safeText;

const findByIds = (list, ids, keys = ["id", "_id"]) => {
  const wanted = safeArray(ids).map((v) => String(v || "")).filter(Boolean);
  if (!wanted.length) return null;
  return safeArray(list).find((item) => keys.some((key) => wanted.includes(String(item?.[key] || "")))) || null;
};

const hasInvoiceForJob = (job, invoices) => {
  const jobIds = [job?.id, job?._id, job?.job_id].map((id) => String(id || "")).filter(Boolean);
  if (!jobIds.length) return false;
  return safeArray(invoices).some((inv) => {
    const linked = [inv?.job_id, inv?.jobId, inv?.linked_job_id, inv?.source_job_id].map((id) => String(id || "")).filter(Boolean);
    return linked.some((id) => jobIds.includes(id));
  });
};

const aiInvoiceDescription = (job, client) => {
  const saved = [
    job?.ai_invoice_description,
    job?.invoice_description_draft,
    job?.completion_notes,
    job?.worker_completion_notes,
    job?.worker_notes,
    job?.job_notes,
    job?.notes,
    job?.description,
  ]
    .map((value) => String(value || "").trim())
    .find(Boolean);
  if (saved) return saved;
  const title = textOr(job?.title || job?.name, "service work");
  const clientName = textOr(client?.name || job?.client_name || job?.customer_name, "client");
  const location = textOr(job?.address || job?.location, "their site");
  return `${title} completed for ${clientName} at ${location}. Work has been marked complete and is ready for billing.`;
};

export default function SmartHubBrainPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workspaceDrawer, setWorkspaceDrawer] = useState("");
  const [workspaceMode, setWorkspaceMode] = useState("list");
  const [workspaceRecord, setWorkspaceRecord] = useState(null);
  const [workspaceEditForm, setWorkspaceEditForm] = useState({});
  const [savingJobId, setSavingJobId] = useState("");
  const [toast, setToast] = useState({ kind: "", message: "" });
  const [data, setData] = useState({ jobs: [], clients: [], quotes: [], invoices: [], workers: [] });
  const [reminderDrafts, setReminderDrafts] = useState({});
  const [editingDraft, setEditingDraft] = useState({});
  const [selectedReminderIds, setSelectedReminderIds] = useState([]);
  const [approvedReminderIds, setApprovedReminderIds] = useState({});
  const [quoteDrafts, setQuoteDrafts] = useState({});
  const [quoteDraftOriginals, setQuoteDraftOriginals] = useState({});
  const [editingQuoteDraft, setEditingQuoteDraft] = useState({});
  const [selectedQuoteIds, setSelectedQuoteIds] = useState([]);
  const [approvedQuoteIds, setApprovedQuoteIds] = useState({});
  const [activity, setActivity] = useState([]);
  const [activityFilter, setActivityFilter] = useState("all");
  const [dispatchOverrides, setDispatchOverrides] = useState({});
  const [rejectedDispatchIds, setRejectedDispatchIds] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const safeGet = async (path) => {
      try {
        return await get(path);
      } catch {
        return [];
      }
    };

    try {
      const [jobsRes, clientsRes, quotesRes, invoicesRes, workersRes, activityRes] = await Promise.all([
        safeGet("/jobs"),
        safeGet("/clients"),
        safeGet("/quotes"),
        safeGet("/invoices"),
        safeGet("/team/workers"),
        safeGet("/smart-hub/activity"),
      ]);

      setData({
        jobs: listFrom(jobsRes, ["jobs"]),
        clients: listFrom(clientsRes, ["clients"]),
        quotes: listFrom(quotesRes, ["quotes"]),
        invoices: listFrom(invoicesRes, ["invoices"]),
        workers: listFrom(workersRes, ["workers"]),
      });
      setActivity(listFrom(activityRes, ["activities"]));
    } catch {
      setError("Failed to load Smart Hub data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const jobs = safeArray(data?.jobs);
  const clients = safeArray(data?.clients);
  const quotes = safeArray(data?.quotes);
  const invoices = safeArray(data?.invoices);
  const workers = safeArray(data?.workers);

  const readyToBillJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const invoiceStatus = statusOf(job?.invoice_status);
        const hasJobInvoiceFlag =
          !!(job?.invoice_id || job?.draft_invoice_id || job?.invoice_created || job?.invoiced) ||
          ["draft", "sent", "paid", "open", "overdue"].includes(invoiceStatus);
        return ["completed", "complete"].includes(statusOf(job?.status)) && !hasJobInvoiceFlag && !hasInvoiceForJob(job, invoices);
      }),
    [jobs, invoices]
  );

  const unassignedJobs = useMemo(() => jobs.filter((job) => {
    const st = statusOf(job?.status);
    if (["completed", "complete", "cancelled", "canceled", "archived"].includes(st)) return false;
    if ((st === "assigned" || st === "in_progress") && (job?.assigned_worker_id || job?.worker_id || job?.assigned_worker)) return false;
    return !(job?.assigned_worker_id || job?.worker_id || job?.assigned_worker);
  }), [jobs]);

  const workerJobStats = useMemo(() => {
    const map = {};
    jobs.forEach((j) => {
      const wid = String(j?.assigned_worker_id || j?.worker_id || "").trim();
      if (!wid) return;
      const st = statusOf(j?.status);
      if (!map[wid]) map[wid] = { today: 0, active: 0, jobs: [] };
      const sched = asDate(j?.scheduled_date || j?.date || j?.scheduled_at);
      if (sched && sched.toDateString() === new Date().toDateString()) map[wid].today += 1;
      if (!["completed", "complete", "cancelled", "canceled", "archived"].includes(st)) map[wid].active += 1;
      map[wid].jobs.push(j);
    });
    return map;
  }, [jobs]);

  const dispatchRecs = useMemo(() => unassignedJobs.filter((j) => !rejectedDispatchIds[String(j?.id || j?._id || "")]).map((job) => {
    const jobId = String(job?.id || job?._id || "");
    const jobRegion = norm(job?.region || job?.area || job?.zone || job?.suburb);
    const jobSkill = norm(job?.service_type || job?.job_type || job?.trade);
    let best = null;
    workers.forEach((w) => {
      const role = norm(w?.role);
      if (!["worker", "employee", "field_worker"].includes(role)) return;
      const unavailable = w?.available === false || ["inactive", "deleted", "offboarded"].includes(norm(w?.status));
      if (unavailable) return;
      const wid = String(w?.id || w?._id || "");
      const stats = workerJobStats[wid] || { today: 0, active: 0, jobs: [] };
      const wRegion = norm(w?.region || w?.area || w?.zone);
      const skills = norm([w?.skills, w?.trades, w?.service_types, w?.service_type].flat().join(" "));
      const regionMatch = !!(jobRegion && wRegion && jobRegion === wRegion);
      const skillMatch = !!(jobSkill && skills.includes(jobSkill));
      const sched = asDate(job?.scheduled_date || job?.date || job?.scheduled_at);
      const conflict = stats.jobs.some((wj) => {
        const ws = asDate(wj?.scheduled_date || wj?.date || wj?.scheduled_at);
        if (!sched || !ws) return false;
        return sched.toISOString() === ws.toISOString();
      });
      let score = 0;
      score += 30;
      if (regionMatch) score += 20;
      if (skillMatch) score += 20;
      score += Math.max(0, 15 - (stats.today * 5));
      score += Math.max(0, 15 - (stats.active * 3));
      if (conflict) score -= 20;
      const candidate = { worker: w, score, stats, regionMatch, skillMatch, conflict };
      if (!best || candidate.score > best.score) best = candidate;
    });
    return { job, jobId, recommendation: best, selectedWorkerId: dispatchOverrides[jobId] || String(best?.worker?.id || best?.worker?._id || "") };
  }), [unassignedJobs, workers, workerJobStats, dispatchOverrides, rejectedDispatchIds]);

  const openInvoices = useMemo(
    () => invoices.filter((inv) => ["open", "sent", "overdue"].includes(statusOf(inv?.status))),
    [invoices]
  );

  const reminderInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const st = statusOf(inv?.status);
      if (REMINDER_EXCLUDED.includes(st)) return false;
      if (st === "draft" && !inv?.sent_at && !inv?.sentAt) return false;
      if (!REMINDER_ELIGIBLE.includes(st)) return false;
      const paidFlag = [inv?.paid, inv?.is_paid, inv?.payment_status].some((v) => [true, "paid"].includes(v));
      if (paidFlag) return false;
      const balance = invoiceBalance(inv);
      return !Number.isFinite(balance) || balance > 0;
    });
  }, [invoices]);

  useEffect(() => {
    setReminderDrafts((prev) => {
      const next = { ...prev };
      reminderInvoices.forEach((inv) => {
        const id = String(inv?.id || inv?._id || inv?.invoice_id || "");
        if (!id || next[id]) return;
        const client = findByIds(clients, [inv?.client_id, inv?.clientId], ["id", "_id", "client_id"]);
        const clientName = textOr(client?.name || inv?.client_name || inv?.customer_name, "there");
        const invoiceNo = textOr(inv?.invoice_number || inv?.number || inv?.title || "", "");
        const overdue = daysOverdue(inv);
        next[id] = reminderText({ clientName, invoiceNo, amount: money(invoiceBalance(inv)), overdue });
      });
      return next;
    });
  }, [reminderInvoices, clients]);

  const waitingQuotes = useMemo(
    () =>
      quotes.filter((q) => {
        const st = statusOf(q?.status);
        if (QUOTE_FOLLOW_UP_EXCLUDED.includes(st)) return false;
        return QUOTE_FOLLOW_UP_ELIGIBLE.includes(st);
      }),
    [quotes]
  );

  useEffect(() => {
    const originals = {};
    setQuoteDrafts((prev) => {
      const next = { ...prev };
      waitingQuotes.forEach((quote) => {
        const id = String(quote?.id || quote?._id || quote?.quote_id || "");
        if (!id) return;
        const client = findByIds(clients, [quote?.client_id, quote?.clientId], ["id", "_id", "client_id"]);
        const clientName = textOr(client?.name || quote?.client_name || quote?.customer_name, "there");
        const quoteNo = textOr(quote?.quote_number || quote?.number || quote?.reference || "", "");
        const title = textOr(quote?.title || quote?.name || quote?.description || "", "your requested work");
        const amountText = money(Number(quote?.total ?? quote?.amount ?? quote?.price));
        const message = quoteFollowUpText({ clientName, quoteNo, amountText, title, ageDays: quoteAgeDays(quote) });
        originals[id] = message;
        if (!next[id]) next[id] = message;
      });
      return next;
    });
    setQuoteDraftOriginals((prev) => ({ ...prev, ...originals }));
  }, [waitingQuotes, clients]);

  const crewAvailable = useMemo(
    () => workers.filter((w) => w?.available !== false && !["inactive", "offboarded"].includes(statusOf(w?.status))).length,
    [workers]
  );
  const jobsToday = useMemo(() => {
    const today = new Date().toDateString();
    return jobs.filter((job) => {
      const scheduled = asDate(job?.scheduled_date || job?.date || job?.scheduled_at);
      return scheduled && scheduled.toDateString() === today;
    }).length;
  }, [jobs]);

  const bestNextMove = useMemo(() => {
    if (readyToBillJobs.length) {
      return { label: `Create invoices for ${readyToBillJobs.length} ready-to-bill job${readyToBillJobs.length === 1 ? "" : "s"}.`, target: "Invoices" };
    }
    if (unassignedJobs.length) {
      return { label: `Assign crew to ${unassignedJobs.length} unassigned job${unassignedJobs.length === 1 ? "" : "s"}.`, target: "Crew" };
    }
    if (openInvoices.length) {
      return { label: `Follow up ${openInvoices.length} open invoice${openInvoices.length === 1 ? "" : "s"}.`, target: "Invoices" };
    }
    if (waitingQuotes.length) {
      return { label: `Review ${waitingQuotes.length} waiting quote${waitingQuotes.length === 1 ? "" : "s"}.`, target: "Quotes" };
    }
    return { label: "All clear — no urgent actions in Smart Hub.", target: "Dashboard" };
  }, [readyToBillJobs.length, unassignedJobs.length, openInvoices.length, waitingQuotes.length]);

  const workspaceButtons = ["Jobs", "Clients", "Invoices", "Quotes", "Crew", "Payroll", "Approvals", "AI Dispatch"];
  const workspaceMeta = {
    Jobs: `${unassignedJobs.length} unassigned`,
    Clients: "Relationship health",
    Invoices: `${readyToBillJobs.length} ready to bill`,
    Quotes: `${waitingQuotes.length} waiting`,
    Crew: `${crewAvailable} available`,
    Payroll: "Weekly review",
    Approvals: "Owner review",
    "AI Dispatch": `${unassignedJobs.length} to assign`,
  };

  const openWorkspace = (name, mode = "list") => {
    setWorkspaceDrawer(name);
    setWorkspaceMode(mode);
    setWorkspaceRecord(null);
  };

  const runScanNow = async () => {
    try {
      await post("/smart-hub/scan", {});
      await load();
      setToast({ kind: "success", message: "Smart Hub scan complete." });
    } catch {
      setToast({ kind: "error", message: "Scan failed. Please try again." });
    }
  };

  const draftInvoices = useMemo(() => invoices.filter((inv) => statusOf(inv?.status) === "draft"), [invoices]);

  const approveDraft = useCallback(
    async (job) => {
      const jobId = String(job?.id || job?._id || "");
      if (!jobId) return;
      const client = findByIds(clients, [job?.client_id, job?.clientId], ["id", "_id", "client_id"]);
      const subtotal = Number(job?.subtotal ?? job?.price ?? job?.amount ?? 0);
      const gstRate = Number(job?.gst_rate ?? 15);
      const gstAmount = Number(job?.gst_amount ?? job?.gst ?? job?.tax ?? subtotal * (gstRate / 100));
      const total = Number(job?.total ?? subtotal + gstAmount);
      const description = aiInvoiceDescription(job, client);

      setSavingJobId(jobId);
      setToast({ kind: "", message: "" });
      const res = await post(`/jobs/${jobId}/create-draft-invoice`, {
        description,
        subtotal,
        gst_rate: gstRate,
        gst_amount: gstAmount,
        total,
      });
      if (!res?.success) {
        setToast({ kind: "error", message: res?.error || "Failed to create draft invoice." });
        return;
      }
      setToast({ kind: "success", message: "Draft invoice created and linked to this job." });
      const targetName = textOr(client?.name || job?.title || job?.name, "client");
      await logActivity({ action_type: "invoice_draft_created", title: "Draft invoice created", message: `Draft invoice created for ${targetName}`, related_type: "invoice", related_id: String(res?.invoice?.id || res?.invoice?._id || jobId), status: "completed" });
      await load();
    },
    [clients, load]
  );

  const logActivity = useCallback(async (payload) => {
    try {
      await post("/smart-hub/activity", payload);
      const refreshed = await get("/smart-hub/activity");
      setActivity(listFrom(refreshed, ["activities"]));
    } catch {}
  }, []);

  const renderDrawerContent = () => {
    if (!workspaceDrawer) return null;
    const recordId = String(workspaceRecord?.id || workspaceRecord?._id || "");
    const startEdit = (record) => {
      setWorkspaceRecord(record || null);
      setWorkspaceMode("edit");
      setWorkspaceEditForm({ ...(record || {}) });
    };
    const openDetail = (record) => {
      setWorkspaceRecord(record || null);
      setWorkspaceMode("detail");
    };
    const saveRecord = async (path, payload, key) => {
      const res = await patch(path, payload);
      if (!res?.success) return setToast({ kind: "error", message: res?.error || "Save failed." });
      setData((prev) => ({ ...prev, [key]: safeArray(prev?.[key]).map((r) => String(r?.id || r?._id || "") === recordId ? { ...r, ...payload } : r) }));
      setWorkspaceRecord((prev) => ({ ...(prev || {}), ...payload }));
      setWorkspaceMode("detail");
      setToast({ kind: "success", message: "Saved." });
    };

    if (workspaceDrawer === "Jobs") {
      if (workspaceMode === "list") return <div className="space-y-3">{jobs.map((j) => <button key={String(j?.id || j?._id)} type="button" onClick={() => openDetail(j)} className="block w-full rounded border bg-white p-3 text-left"><p className="font-semibold">{safeText(j?.title || j?.name, "Untitled job")}</p><p className="text-sm text-slate-600">{safeText(j?.status, "Unknown")} · {safeText(j?.address || j?.location, "No address")}</p></button>)}</div>;
      if (!workspaceRecord) return <p className="text-sm text-slate-700">Record details could not load.</p>;
      if (workspaceMode === "edit") return <div className="space-y-2"><input className="w-full rounded border p-2" value={workspaceEditForm.title || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, title: e.target.value }))} placeholder="Job title" /><input className="w-full rounded border p-2" value={workspaceEditForm.address || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" /><input className="w-full rounded border p-2" value={workspaceEditForm.status || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, status: e.target.value }))} placeholder="Status" /><textarea className="w-full rounded border p-2" value={workspaceEditForm.notes || ""} onChange={(e) => setWorkspaceEditForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" /><div className="flex gap-2"><button type="button" className="rounded bg-teal-700 px-3 py-1 text-white" onClick={() => saveRecord(`/jobs/${recordId}`, { title: workspaceEditForm.title, address: workspaceEditForm.address, status: workspaceEditForm.status, notes: workspaceEditForm.notes }, "jobs")}>Save</button><button type="button" className="rounded border px-3 py-1" onClick={() => setWorkspaceMode("detail")}>Back</button></div></div>;
      return <div className="space-y-2"><p className="font-semibold">{safeText(workspaceRecord?.title || workspaceRecord?.name, "Untitled job")}</p><p>Client: {safeText(findByIds(clients, [workspaceRecord?.client_id, workspaceRecord?.clientId], ["id","_id","client_id"])?.name || workspaceRecord?.client_name)}</p><p>Address: {safeText(workspaceRecord?.address || workspaceRecord?.location)}</p><p>Status: {safeText(workspaceRecord?.status)}</p><p>Assigned worker: {safeText(workspaceRecord?.assigned_worker || workspaceRecord?.assigned_worker_name)}</p><p>Scheduled date: {safeText(workspaceRecord?.scheduled_date || workspaceRecord?.date)}</p><p>Completed date: {safeText(workspaceRecord?.completed_at)}</p><p>Service type: {safeText(workspaceRecord?.service_type || workspaceRecord?.job_type)}</p><p>Notes: {safeText(workspaceRecord?.notes)}</p><div className="flex flex-wrap gap-2"><button type="button" className="rounded border px-3 py-1" onClick={() => startEdit(workspaceRecord)}>Edit job details</button><button type="button" className="rounded border px-3 py-1" onClick={() => setWorkspaceMode("list")}>Back</button><button type="button" className="rounded border px-3 py-1" onClick={() => navigate(`/jobs/${recordId}`)}>Open full job page</button></div></div>;
    }

    if (workspaceDrawer === "Invoices") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Invoices Workspace</h3>
            <p className="text-sm text-slate-600">Review ready-to-bill jobs, draft invoices and payment reminders.</p>
          </div>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Ready to bill", readyToBillJobs.length],
              ["Open invoices", openInvoices.length],
              ["Draft invoices", draftInvoices.length],
              ["Quotes waiting", waitingQuotes.length],
            ].map(([label, value]) => (
              <article key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
              </article>
            ))}
          </section>
          {!readyToBillJobs.length ? (
            <p className="text-sm text-slate-600">No ready-to-bill jobs right now.</p>
          ) : (
            readyToBillJobs.map((job) => {
              const client = findByIds(clients, [job?.client_id, job?.clientId], ["id", "_id", "client_id"]);
              const subtotal = Number(job?.subtotal ?? job?.price ?? job?.amount);
              const gst = Number(job?.gst ?? job?.tax);
              const total = Number(job?.total ?? (Number.isFinite(subtotal) && Number.isFinite(gst) ? subtotal + gst : NaN));

              return (
                <div key={String(job?.id || job?._id || job?.job_id || Math.random())} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="font-semibold text-slate-900">{textOr(job?.title || job?.name, "Untitled job")}</p>
                  <p className="text-sm text-slate-600">Client: {textOr(client?.name, "Unknown client")}</p>
                  <p className="text-sm text-slate-600">Address: {textOr(job?.address || job?.location, "No address saved")}</p>
                  <p className="text-sm text-slate-600">Completed: {textOr(job?.completed_at || job?.updated_at, "Unknown date")}</p>
                  <p className="mt-2 text-sm text-slate-700">{aiInvoiceDescription(job, client)}</p>
                  {Number.isFinite(subtotal) ? (
                    <div className="mt-3 grid grid-cols-1 gap-1 text-sm text-slate-700 sm:grid-cols-3">
                      <p>Subtotal: {money(subtotal)}</p>
                      <p>GST: {money(gst)}</p>
                      <p>Total: {money(total)}</p>
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">Warning: price missing. Confirm pricing before invoicing.</p>
                  )}
                  <button
                    type="button"
                    onClick={() => approveDraft(job)}
                    disabled={savingJobId === String(job?.id || job?._id || "")}
                    className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingJobId === String(job?.id || job?._id || "") ? "Approving..." : "Approve draft"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      );
    }

    if (workspaceDrawer === "Payment Reminders") {
      const draftCount = Object.values(approvedReminderIds).filter(Boolean).length;
      const overdueCount = reminderInvoices.filter((inv) => (daysOverdue(inv) || 0) > 0 || statusOf(inv?.status) === "overdue").length;
      const missingContactCount = reminderInvoices.filter((inv) => {
        const client = findByIds(clients, [inv?.client_id, inv?.clientId], ["id", "_id", "client_id"]);
        return !(client?.email || inv?.client_email || client?.phone || inv?.client_phone);
      }).length;

      const approveOne = async (inv) => {
        const id = String(inv?.id || inv?._id || inv?.invoice_id || "");
        if (!id) return;
        const client = findByIds(clients, [inv?.client_id, inv?.clientId], ["id", "_id", "client_id"]);
        const payload = {
          invoice_id: id,
          client_id: client?.id || client?._id || inv?.client_id || null,
          business_id: user?.business_id || user?.businessId || null,
          message: reminderDrafts[id] || "",
          channel: client?.email || inv?.client_email ? "email" : "sms",
          status: "draft",
          source: "smart_hub_ai",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        try { await post("/communications/messages", payload); } catch {}
        setApprovedReminderIds((prev) => ({ ...prev, [id]: true }));
        await logActivity({ action_type: "reminder_draft_approved", title: "Reminder draft approved", message: `Payment reminder draft approved for ${textOr(client?.name || inv?.client_name || inv?.invoice_number, "client")}`, related_type: "invoice", related_id: id, status: "completed" });
        setToast({ kind: "success", message: "Reminder draft approved." });
      };

      const toggleSelected = (id) => setSelectedReminderIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      const approveMany = async (ids) => {
        for (const id of ids) {
          const inv = reminderInvoices.find((item) => String(item?.id || item?._id || item?.invoice_id || "") === id);
          if (inv) await approveOne(inv);
        }
      };

      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Payment Reminders</h3>
            <p className="text-sm text-slate-600">Review AI-prepared reminder drafts for unpaid invoices.</p>
          </div>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Open invoices', reminderInvoices.length], ['Overdue invoices', overdueCount], ['Draft reminders', draftCount], ['Missing contact details', missingContactCount]].map(([label, value]) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-slate-900">{value}</p></article>)}
          </section>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => approveMany(selectedReminderIds)} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white">Approve selected reminders</button>
            <button type="button" onClick={() => approveMany(reminderInvoices.map((inv) => String(inv?.id || inv?._id || inv?.invoice_id || "")).filter(Boolean))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">Approve all ready reminders</button>
            <button type="button" onClick={() => setSelectedReminderIds([])} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">Reject selected</button>
          </div>
          {!reminderInvoices.length ? <p className="text-sm text-slate-600">No unpaid invoices need reminders right now.</p> : reminderInvoices.map((inv) => {
            const id = String(inv?.id || inv?._id || inv?.invoice_id || "");
            const client = findByIds(clients, [inv?.client_id, inv?.clientId], ["id", "_id", "client_id"]);
            const contactEmail = client?.email || inv?.client_email;
            const contactPhone = client?.phone || inv?.client_phone;
            const missingContact = !(contactEmail || contactPhone);
            const isEditing = !!editingDraft[id];
            const due = inv?.due_date || inv?.dueDate;
            return <article key={id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedReminderIds.includes(id)} onChange={() => toggleSelected(id)} />Select</label><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{approvedReminderIds[id] ? "Approved draft" : "Pending approval"}</p></div><p className="mt-2 font-semibold text-slate-900">{textOr(client?.name || inv?.client_name || inv?.customer_name, "Unknown client")}</p><p className="text-sm text-slate-600">Invoice: {textOr(inv?.invoice_number || inv?.number || inv?.title, "Untitled invoice")}</p><p className="text-sm text-slate-600">Amount due: {money(invoiceBalance(inv))}</p><p className="text-sm text-slate-600">Due date: {textOr(due, "No due date")}</p><p className="text-sm text-slate-600">Status: {textOr(inv?.status, "unknown")}</p><p className="text-sm text-slate-600">Overdue days: {daysOverdue(inv) ?? "—"}</p><p className="text-sm text-slate-600">Contact: {contactEmail || "—"} {contactPhone ? ` / ${contactPhone}` : ""}</p>{missingContact ? <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">Warning: missing client contact details. You can save/approve this draft, but it is not ready to send.</p> : null}{isEditing ? <textarea className="mt-3 w-full rounded-lg border border-slate-300 p-2 text-sm" rows={4} value={reminderDrafts[id] || ""} onChange={(e) => setReminderDrafts((prev) => ({ ...prev, [id]: e.target.value }))} /> : <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-800">{reminderDrafts[id]}</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setEditingDraft((prev) => ({ ...prev, [id]: true }))} className="rounded border border-slate-300 px-3 py-1 text-sm">Edit message</button><button type="button" onClick={() => setEditingDraft((prev) => ({ ...prev, [id]: false }))} className="rounded border border-slate-300 px-3 py-1 text-sm">Save message</button><button type="button" onClick={() => { setEditingDraft((prev) => ({ ...prev, [id]: false })); setReminderDrafts((prev) => ({ ...prev, [id]: reminderText({ clientName: textOr(client?.name || inv?.client_name || inv?.customer_name, "there"), invoiceNo: textOr(inv?.invoice_number || inv?.number || inv?.title || "", ""), amount: money(invoiceBalance(inv)), overdue: daysOverdue(inv) }) })); }} className="rounded border border-slate-300 px-3 py-1 text-sm">Cancel</button><button type="button" onClick={() => approveOne(inv)} className="rounded bg-teal-700 px-3 py-1 text-sm text-white">Approve reminder draft</button><button type="button" onClick={() => navigate(`/invoices/${id}`)} className="rounded border border-slate-300 px-3 py-1 text-sm">Open full invoice page</button></div></article>;
          })}
        </div>
      );
    }

    if (workspaceDrawer === "Quotes" || workspaceDrawer === "Quote Follow-ups") {
      const preparedCount = Object.values(approvedQuoteIds).filter(Boolean).length;
      const missingContactCount = waitingQuotes.filter((q) => {
        const client = findByIds(clients, [q?.client_id, q?.clientId], ["id", "_id", "client_id"]);
        return !(client?.email || q?.client_email || client?.phone || q?.client_phone);
      }).length;
      const oldestWaiting = waitingQuotes.reduce((max, q) => Math.max(max, quoteAgeDays(q) ?? 0), 0);
      const toggleSelected = (id) => setSelectedQuoteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      const approveOne = async (quote) => {
        const id = String(quote?.id || quote?._id || quote?.quote_id || "");
        if (!id) return;
        const client = findByIds(clients, [quote?.client_id, quote?.clientId], ["id", "_id", "client_id"]);
        const hasContact = !!(client?.email || quote?.client_email || client?.phone || quote?.client_phone);
        const payload = { quote_id: id, client_id: client?.id || client?._id || quote?.client_id || null, business_id: user?.business_id || user?.businessId || null, message: quoteDrafts[id] || "", channel: client?.email || quote?.client_email ? "email" : "sms", status: "draft", source: "smart_hub_ai", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        try { await post("/communications/messages", payload); } catch {}
        setApprovedQuoteIds((prev) => ({ ...prev, [id]: hasContact ? true : "missing_contact" }));
        await logActivity({ action_type: "quote_followup_approved", title: "Quote follow-up approved", message: `Quote follow-up draft approved for ${textOr(client?.name || quote?.quote_number || quote?.title, "client")}`, related_type: "quote", related_id: id, status: "completed" });
        setToast({ kind: "success", message: "Quote follow-up draft approved." });
      };
      const approveMany = async (ids) => { for (const id of ids) { const quote = waitingQuotes.find((q) => String(q?.id || q?._id || q?.quote_id || "") === id); if (quote) await approveOne(quote); } };
      return (
        <div className="space-y-4">
          <div><h3 className="text-lg font-semibold text-slate-900">Quote Follow-ups</h3><p className="text-sm text-slate-600">Review AI-prepared quote follow-up drafts before anything is sent.</p></div>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Quotes waiting", waitingQuotes.length], ["Follow-ups prepared", preparedCount], ["Missing contact details", missingContactCount], ["Oldest waiting quote", oldestWaiting ? `${oldestWaiting}d` : "—"]].map(([label, value]) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-slate-900">{value}</p></article>)}</section>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => approveMany(selectedQuoteIds)} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white">Approve selected follow-ups</button><button type="button" onClick={() => approveMany(waitingQuotes.map((q) => String(q?.id || q?._id || q?.quote_id || "")).filter(Boolean))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">Approve all ready follow-ups</button><button type="button" onClick={() => setSelectedQuoteIds([])} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">Reject selected</button></div>
          {!waitingQuotes.length ? <p className="text-sm text-slate-600">No quotes are waiting for follow-up right now.</p> : waitingQuotes.map((quote) => {
            const id = String(quote?.id || quote?._id || quote?.quote_id || "");
            const client = findByIds(clients, [quote?.client_id, quote?.clientId], ["id", "_id", "client_id"]);
            const contactEmail = client?.email || quote?.client_email;
            const contactPhone = client?.phone || quote?.client_phone;
            const missingContact = !(contactEmail || contactPhone);
            const age = quoteAgeDays(quote);
            const displayDate = quote?.sent_at || quote?.sentAt || quote?.created_at || quote?.createdAt || quote?.date;
            return <article key={id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedQuoteIds.includes(id)} onChange={() => toggleSelected(id)} />Select</label><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{approvedQuoteIds[id] ? "Approved draft" : "Pending approval"}</p></div><p className="mt-2 font-semibold text-slate-900">{textOr(client?.name || quote?.client_name || quote?.customer_name, "Unknown client")}</p><p className="text-sm text-slate-600">Quote: {textOr(quote?.quote_number || quote?.number || quote?.title, "Untitled quote")}</p><p className="text-sm text-slate-600">Amount: {money(Number(quote?.total ?? quote?.amount ?? quote?.price))}</p><p className="text-sm text-slate-600">Status: {textOr(quote?.status, "unknown")}</p><p className="text-sm text-slate-600">Created/Sent: {textOr(displayDate, "Unknown date")}</p><p className="text-sm text-slate-600">Age: {age ?? "—"} days</p><p className="text-sm text-slate-600">Contact: {contactEmail || "—"} {contactPhone ? ` / ${contactPhone}` : ""}</p>{missingContact ? <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">Warning: missing client contact details. You can save this draft, but it is not ready to send.</p> : null}{editingQuoteDraft[id] ? <textarea className="mt-3 w-full rounded-lg border border-slate-300 p-2 text-sm" rows={4} value={quoteDrafts[id] || ""} onChange={(e) => setQuoteDrafts((prev) => ({ ...prev, [id]: e.target.value }))} /> : <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-800">{quoteDrafts[id]}</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setEditingQuoteDraft((prev) => ({ ...prev, [id]: true }))} className="rounded border border-slate-300 px-3 py-1 text-sm">Edit message</button><button type="button" onClick={() => setEditingQuoteDraft((prev) => ({ ...prev, [id]: false }))} className="rounded border border-slate-300 px-3 py-1 text-sm">Save message</button><button type="button" onClick={() => { setQuoteDrafts((prev) => ({ ...prev, [id]: quoteDraftOriginals[id] || prev[id] })); setEditingQuoteDraft((prev) => ({ ...prev, [id]: false })); }} className="rounded border border-slate-300 px-3 py-1 text-sm">Cancel</button><button type="button" onClick={() => approveOne(quote)} className="rounded bg-teal-700 px-3 py-1 text-sm text-white">Approve follow-up draft</button><button type="button" onClick={() => navigate(`/quotes/${id}`)} className="rounded border border-slate-300 px-3 py-1 text-sm">Open full quote page</button></div></article>;
          })}
        </div>
      );
    }
    if (workspaceDrawer === "AI Dispatch") {
      const applyAssign = async (job, workerId) => {
        if (!workerId) return;
        const jobId = String(job?.id || job?._id || "");
        setSavingJobId(jobId);
        const res = await post(`/jobs/${jobId}/assign-worker`, { worker_id: workerId });
        if (!res?.success) {
          setToast({ kind: "error", message: res?.error || "Failed to assign worker." });
        } else {
          setToast({ kind: "success", message: "Worker assignment approved and saved." });
          await logActivity({ action_type: "worker_assigned", title: "Worker assigned", message: `${res?.job?.assigned_worker_name || "Worker"} assigned to ${textOr(job?.title, "job")}`, related_type: "job", related_id: jobId, status: "completed" });
          await load();
        }
        setSavingJobId("");
      };
      const conflicts = dispatchRecs.filter((r) => r?.recommendation?.conflict).length;
      const missingData = dispatchRecs.filter((r) => !(r?.recommendation?.regionMatch && r?.recommendation?.skillMatch)).length;
      return <div className="space-y-4"><div><h3 className="text-lg font-semibold text-slate-900">AI Dispatch</h3><p className="text-sm text-slate-600">Review recommended worker assignments before jobs are updated.</p></div>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Unassigned jobs", dispatchRecs.length],["Crew available", crewAvailable],["Schedule conflicts", conflicts],["Missing job details", missingData]].map(([l,v])=><article key={l} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><p className="text-xs uppercase tracking-wide text-slate-500">{l}</p><p className="mt-1 text-xl font-semibold text-slate-900">{v}</p></article>)}</section>
      {!dispatchRecs.length ? <p className="text-sm text-slate-600">No unassigned jobs require approval right now.</p> : dispatchRecs.map(({ job, jobId, recommendation, selectedWorkerId }) => {
        const selected = workers.find((w) => String(w?.id || w?._id || "") === String(selectedWorkerId));
        const st = recommendation?.stats || { today: 0, active: 0 };
        const reasoning = recommendation ? `AI recommends ${textOr(selected?.name || recommendation?.worker?.name, "this worker")} because ${recommendation.regionMatch ? "they are in the same region, " : ""}${recommendation.skillMatch ? "their skills match, " : ""}and they currently have ${st.today} jobs today (${st.active} active).${recommendation.conflict ? " Possible schedule conflict detected." : " No schedule conflict was detected."}` : "No perfect worker was found. Choose a worker manually.";
        return <article key={jobId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="font-semibold">{textOr(job?.title, "Untitled job")}</p><p className="text-sm text-slate-600">Client: {textOr(job?.client_name || job?.customer_name, "Unknown")}</p><p className="text-sm text-slate-600">Address: {textOr(job?.address || job?.location, "No address")}</p><p className="text-sm text-slate-600">Scheduled: {textOr(job?.scheduled_date || job?.date || job?.scheduled_at, "Unscheduled")}</p><p className="text-sm text-slate-600">Priority/Status: {textOr(job?.priority, "normal")} / {textOr(job?.status, "new")}</p><p className="mt-2 text-sm text-slate-700">{reasoning}</p>{recommendation?.conflict ? <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">Possible schedule conflict: this worker already has another job scheduled that day.</p> : null}
        <div className="mt-3"><select className="w-full rounded border p-2 text-sm" value={selectedWorkerId} onChange={(e) => setDispatchOverrides((prev) => ({ ...prev, [jobId]: e.target.value }))}><option value="">Choose different worker</option>{workers.filter((w) => !["inactive","deleted","offboarded"].includes(norm(w?.status))).map((w) => <option key={String(w?.id || w?._id)} value={String(w?.id || w?._id)}>{textOr(w?.name, "Worker")} · {textOr(w?.region || w?.area || w?.zone, "No region")}</option>)}</select></div>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!selectedWorkerId || savingJobId===jobId} onClick={() => applyAssign(job, selectedWorkerId)} className="rounded bg-teal-700 px-3 py-1 text-sm text-white">Approve assignment</button><button type="button" onClick={() => navigate(`/jobs/${jobId}`)} className="rounded border px-3 py-1 text-sm">Open full job page</button><button type="button" onClick={async () => { setRejectedDispatchIds((prev) => ({ ...prev, [jobId]: true })); await logActivity({ action_type: "recommendation_rejected", title: "Recommendation rejected", message: `AI recommendation rejected: ${textOr(job?.title, "Job")}`, related_type: "job", related_id: jobId, status: "rejected" }); }} className="rounded border px-3 py-1 text-sm">Reject recommendation</button></div></article>;
      })}</div>;
    }

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">{workspaceDrawer} Workspace</h3>
        <p className="text-sm text-slate-600">Nothing needs attention here.</p>
        <button
          type="button"
          onClick={() => navigate(`/${workspaceDrawer.toLowerCase()}`)}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          Open full page
        </button>
      </div>
    );
  };

  return (
    <Layout title="Smart Hub">
      <div className="min-h-screen bg-[#f6f4ef]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <section className="rounded-2xl bg-slate-900 p-6 text-slate-100 shadow-xl">
            <p className="text-xs uppercase tracking-[0.2em] text-teal-200">AI command centre</p>
            <h1 className="mt-2 text-2xl font-semibold">Smart Hub</h1>
            <p className="mt-2 text-sm text-slate-300">Welcome back, {textOr(user?.name || user?.email, "team")}. Keep operations flowing with one clear next move.</p>
            <div className="mt-4 rounded-xl bg-slate-800/70 p-4">
              <p className="text-xs uppercase tracking-wide text-teal-200">Best Next Move</p>
              <p className="mt-1 text-base text-slate-100">{bestNextMove.label}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={runScanNow} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">Run scan</button>
              <button type="button" onClick={() => openWorkspace(bestNextMove.target, bestNextMove.target === "Quotes" ? "followUps" : "list")} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800">Review now</button>
            </div>
          </section>

          {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Ready to bill", readyToBillJobs.length],
              ["Unassigned jobs", unassignedJobs.length],
              ["Open invoices", openInvoices.length],
              ["Crew available", crewAvailable],
            ].map(([label, value]) => (
              <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                <button type="button" onClick={() => ({"Ready to bill":"Invoices","Unassigned jobs":"AI Dispatch","Open invoices":"Payment Reminders","Crew available":"AI Dispatch"}[label] ? openWorkspace({"Ready to bill":"Invoices","Unassigned jobs":"AI Dispatch","Open invoices":"Payment Reminders","Crew available":"AI Dispatch"}[label], {"Open invoices":"reminders"}[label] || "list") : null)} className="mt-2 text-2xl font-semibold text-slate-900">
                  {value}
                </button>
              </article>
            ))}
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Owner Decision Queue</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                readyToBillJobs.length > 0 ? { key: "bill", title: `Create invoices for ${readyToBillJobs.length} ready-to-bill job${readyToBillJobs.length === 1 ? "" : "s"}`, reason: "Completed jobs are waiting for billing.", impact: "AI prepares editable draft invoices. Nothing is sent until you approve.", cta: "Review drafts", onClick: () => openWorkspace("Invoices", "readyToBill") } : null,
                unassignedJobs.length > 0 ? { key: "assign", title: `Assign workers to ${unassignedJobs.length} unassigned job${unassignedJobs.length === 1 ? "" : "s"}`, reason: "Unassigned jobs can delay today's schedule.", impact: "AI suggests best-fit crew assignments and lets you approve each one.", cta: "Assign workers", onClick: () => openWorkspace("AI Dispatch", "assign") } : null,
                openInvoices.length > 0 ? { key: "reminders", title: `Prepare reminders for ${openInvoices.length} open invoice${openInvoices.length === 1 ? "" : "s"}`, reason: "Money is waiting on unpaid invoices.", impact: "AI drafts reminder messages for quick approval before sending.", cta: "Prepare reminders", onClick: () => openWorkspace("Payment Reminders", "reminders") } : null,
                waitingQuotes.length > 0 ? { key: "quotes", title: `Follow up ${waitingQuotes.length} waiting quote${waitingQuotes.length === 1 ? "" : "s"}`, reason: "Follow-ups increase quote conversions.", impact: "AI drafts client follow-ups so you can review and approve in minutes.", cta: "Review follow-ups", onClick: () => openWorkspace("Quote Follow-ups", "followUps") } : null,
              ].filter(Boolean).map((item) => (
                <article key={item.key} className="rounded-xl border border-slate-200 bg-[#fdfcf8] p-4 shadow-sm">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.reason}</p>
                  <p className="mt-2 text-sm text-slate-700">{item.impact}</p>
                  <button type="button" onClick={item.onClick} className="mt-3 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800">{item.cta}</button>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Today&apos;s Plan</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                {[["Jobs today", jobsToday], ["Unassigned jobs", unassignedJobs.length], ["Ready to bill", readyToBillJobs.length], ["Open invoices", openInvoices.length], ["Quotes waiting", waitingQuotes.length], ["Crew available", crewAvailable]].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-[#f6f4ef] px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="text-lg font-semibold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                AI found {readyToBillJobs.length} {readyToBillJobs.length === 1 ? "job" : "jobs"} ready to bill, {unassignedJobs.length} unassigned {unassignedJobs.length === 1 ? "job" : "jobs"}, {openInvoices.length} open {openInvoices.length === 1 ? "invoice" : "invoices"} and {waitingQuotes.length} {waitingQuotes.length === 1 ? "quote" : "quotes"} waiting. Best next move: create invoice drafts.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Business Pulse</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[["Money waiting", openInvoices.length], ["Billing ready", readyToBillJobs.length], ["Dispatch pressure", unassignedJobs.length], ["Pipeline", waitingQuotes.length], ["Crew", crewAvailable]].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-[#fdfcf8] p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Workspace Dock</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {workspaceButtons.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => openWorkspace(name) }
                  className="rounded-lg bg-teal-700 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-teal-800"
                >
                  <span className="block">{name}</span>
                  <span className="block text-xs text-teal-100">{workspaceMeta[name] || "Open workspace"}</span>
                </button>
              ))}
              <button type="button" onClick={() => openWorkspace("Payment Reminders", "reminders")} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800">Prepare reminders</button>
              <button type="button" onClick={() => openWorkspace("Quote Follow-ups", "followUps")} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800">Review follow-ups</button>
              <button type="button" onClick={() => openWorkspace("AI Dispatch", "list")} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800">Assign workers</button>
            </div>
          </section>
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Recent Smart Hub activity</h3>
            <div className="mt-2 flex gap-2">{[["all","All"],["completed","Completed"],["rejected","Rejected"],["draft_prepared","Drafts"]].map(([k,l]) => <button key={k} type="button" onClick={() => setActivityFilter(k)} className={`rounded px-2 py-1 text-xs ${activityFilter===k?"bg-slate-800 text-white":"bg-slate-100 text-slate-700"}`}>{l}</button>)}</div>{!activity.length ? <p className="mt-2 text-sm text-slate-500">No AI actions approved yet. Approved work will appear here.</p> : <ul className="mt-3 space-y-2 text-sm text-slate-700">{activity.filter((a)=>activityFilter==="all"?true:String(a?.status||"")===activityFilter).map((a) => <li key={String(a?.id||a?._id)} className="rounded-lg border border-slate-200 p-2"><p>{a?.message || a?.title}</p><p className="text-xs text-slate-500">{textOr(a?.status, "completed")} · {a?.approved_by_name ? `${a.approved_by_name} · ` : ""}{new Date(a?.created_at || Date.now()).toLocaleString()}</p></li>)}</ul>}
          </section>
        </div>

        {workspaceDrawer ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-6">
            <div className="h-[86vh] w-full max-w-3xl rounded-t-2xl bg-[#fdfcf8] sm:h-auto sm:rounded-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="font-semibold text-slate-900">{workspaceDrawer}</h2>
                <button type="button" onClick={() => { setWorkspaceDrawer(""); setWorkspaceMode("list"); setWorkspaceRecord(null); }} className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700">
                  Close
                </button>
              </div>
              <div className="max-h-[72vh] overflow-y-auto p-4">{renderDrawerContent()}</div>
            </div>
          </div>
        ) : null}
        {toast?.message ? (
          <div className={`fixed bottom-4 right-4 z-[60] rounded-lg px-4 py-2 text-sm text-white ${toast.kind === "error" ? "bg-rose-600" : "bg-emerald-600"}`}>
            {toast.message}
          </div>
        ) : null}

        {loading ? <p className="mx-auto max-w-6xl px-4 pb-6 text-sm text-slate-500 sm:px-6 lg:px-8">Loading Smart Hub...</p> : null}
      </div>
    </Layout>
  );
}
