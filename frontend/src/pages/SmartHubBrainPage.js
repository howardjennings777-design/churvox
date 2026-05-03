import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { get, post } from "../lib/api";
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

const textOr = (value, fallback = "Not available") => {
  const text = String(value || "").trim();
  return text || fallback;
};

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
  const [drawer, setDrawer] = useState("");
  const [savingJobId, setSavingJobId] = useState("");
  const [toast, setToast] = useState({ kind: "", message: "" });
  const [data, setData] = useState({ jobs: [], clients: [], quotes: [], invoices: [], workers: [] });
  const [reminderDrafts, setReminderDrafts] = useState({});
  const [editingDraft, setEditingDraft] = useState({});
  const [selectedReminderIds, setSelectedReminderIds] = useState([]);
  const [approvedReminderIds, setApprovedReminderIds] = useState({});
  const [activity, setActivity] = useState([]);

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
      const [jobsRes, clientsRes, quotesRes, invoicesRes, workersRes] = await Promise.all([
        safeGet("/jobs"),
        safeGet("/clients"),
        safeGet("/quotes"),
        safeGet("/invoices"),
        safeGet("/team/workers"),
      ]);

      setData({
        jobs: listFrom(jobsRes, ["jobs"]),
        clients: listFrom(clientsRes, ["clients"]),
        quotes: listFrom(quotesRes, ["quotes"]),
        invoices: listFrom(invoicesRes, ["invoices"]),
        workers: listFrom(workersRes, ["workers"]),
      });
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

  const unassignedJobs = useMemo(
    () => jobs.filter((job) => !(job?.assigned_worker_id || job?.worker_id || job?.assigned_worker)),
    [jobs]
  );

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
    () => quotes.filter((q) => ["sent", "pending", "waiting"].includes(statusOf(q?.status))),
    [quotes]
  );

  const crewAvailable = useMemo(
    () => workers.filter((w) => w?.available !== false && !["inactive", "offboarded"].includes(statusOf(w?.status))).length,
    [workers]
  );

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

  const workspaceButtons = ["Jobs", "Clients", "Invoices", "Quotes", "Crew", "Payroll", "Approvals"];

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
      await load();
    },
    [clients, load]
  );

  const renderDrawerContent = () => {
    if (!drawer) return null;

    if (drawer === "Invoices") {
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

    if (drawer === "Payment Reminders") {
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
        setActivity((prev) => [{ id: `${id}-${Date.now()}`, text: `Reminder draft approved for invoice ${textOr(inv?.invoice_number || inv?.number, id)}.` }, ...prev].slice(0, 12));
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

    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">{drawer} Workspace</h3>
        <p className="text-sm text-slate-600">This workspace is in safe mode for build rescue. Use the full {drawer.toLowerCase()} page for advanced actions.</p>
        <button
          type="button"
          onClick={() => navigate(`/${drawer.toLowerCase()}`)}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          Open {drawer} page
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
          </section>

          {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Ready to bill", readyToBillJobs.length],
              ["Open invoices", openInvoices.length],
              ["Quotes waiting", waitingQuotes.length],
              ["Crew available", crewAvailable],
            ].map(([label, value]) => (
              <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Workspace Dock</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {workspaceButtons.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setDrawer(name)}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
                >
                  {name}
                </button>
              ))}
              <button type="button" onClick={() => setDrawer("Payment Reminders")} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800">Prepare reminders</button>
            </div>
          </section>
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Recent Smart Hub activity</h3>
            {!activity.length ? <p className="mt-2 text-sm text-slate-500">No reminder approvals yet in this session.</p> : <ul className="mt-2 space-y-1 text-sm text-slate-700">{activity.map((a) => <li key={a.id}>• {a.text}</li>)}</ul>}
          </section>
        </div>

        {drawer ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-6">
            <div className="h-[86vh] w-full max-w-3xl rounded-t-2xl bg-[#fdfcf8] sm:h-auto sm:rounded-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="font-semibold text-slate-900">{drawer}</h2>
                <button type="button" onClick={() => setDrawer("")} className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700">
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
