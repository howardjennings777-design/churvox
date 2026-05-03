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
      setSavingJobId("");
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
            </div>
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
