import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import API_BASE from "../lib/apiBase";

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
}

async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE || ""}/api${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.detail || data?.error || "Request failed");
  return data;
}

function money(value) {
  const n = Number(value || 0);
  return n ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00";
}

function getName(client) {
  return client?.name || client?.client_name || client?.customer_name || client?.company_name || "Client";
}

function getEmail(client) {
  return client?.email || client?.client_email || client?.customer_email || "";
}

function getPhone(client) {
  return client?.phone || client?.mobile || client?.client_phone || "";
}

function getAddress(client) {
  return client?.billing_address || client?.site_address || client?.address || "";
}

function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (["completed", "paid", "accepted"].includes(s)) return "bg-emerald-100 text-emerald-900";
  if (["overdue", "cancelled", "declined"].includes(s)) return "bg-red-100 text-red-900";
  if (["in_progress", "active", "sent"].includes(s)) return "bg-blue-100 text-blue-900";
  return "bg-slate-100 text-slate-800";
}

export default function ClientWorkbenchCommandPage() {
  const { clientId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setNotice("");
    try {
      const res = await api(`/clients/${clientId}/workbench`);
      setData(res?.data || null);
    } catch (err) {
      setNotice(err?.message || "Could not load client workbench");
      toast.error("Could not load client workbench");
    } finally {
      setLoading(false);
    }
  }

  async function prepareActions() {
    setBusy(true);
    try {
      const res = await api(`/clients/${clientId}/prepare-actions`, { method: "POST", body: {} });
      toast.success(res?.message || "Client action slips prepared");
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not prepare client actions");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  const client = data?.client || {};
  const stats = data?.stats || {};
  const recent = data?.recent_activity || [];
  const suggested = data?.suggested_actions || [];

  const topJobs = useMemo(() => (data?.jobs || []).slice(0, 6), [data]);
  const topInvoices = useMemo(() => (data?.invoices || []).slice(0, 6), [data]);
  const topQuotes = useMemo(() => (data?.quotes || []).slice(0, 6), [data]);

  return (
    <main className="min-h-screen bg-[#f5f7f1] p-4 text-slate-950 md:p-6 xl:p-8">
      <header className="rounded-[34px] bg-slate-950 p-6 text-white shadow-[0_28px_90px_rgba(15,23,42,.24)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-200">Client Workbench</div>
            <h1 className="mt-3 text-5xl font-black tracking-[-.075em]">{getName(client)}</h1>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-slate-300">
              Jobs, quotes, invoices, unpaid totals, notes and AI suggestions in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/clients" className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white no-underline hover:bg-white/20">Back to clients</Link>
            <button onClick={prepareActions} disabled={busy || loading} className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60">
              {busy ? "Preparing…" : "Prepare client actions"}
            </button>
          </div>
        </div>
      </header>

      {notice ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-900">{notice}</div> : null}

      {loading ? (
        <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-8 text-center text-sm font-black text-slate-500">Loading client workbench…</section>
      ) : (
        <>
          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Open jobs</div>
              <div className="mt-2 text-4xl font-black">{stats.open_jobs || 0}</div>
            </div>
            <div className="rounded-[24px] border border-blue-200 bg-blue-50 p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-blue-700">Open quotes</div>
              <div className="mt-2 text-4xl font-black text-blue-900">{stats.open_quotes || 0}</div>
            </div>
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-red-700">Unpaid</div>
              <div className="mt-2 text-4xl font-black text-red-900">{stats.unpaid_total_display || money(stats.unpaid_total)}</div>
            </div>
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Proof photos</div>
              <div className="mt-2 text-4xl font-black text-emerald-900">{stats.proof_photos || 0}</div>
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="space-y-5">
              <div className="rounded-[32px] border border-blue-200 bg-blue-50 p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-700">AI client summary</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-blue-950">What Churvox sees</h2>
                <p className="mt-3 text-sm font-bold leading-6 text-blue-900">{data?.summary || "No summary available yet."}</p>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-600">Suggested actions</div>
                    <h2 className="mt-1 text-3xl font-black tracking-[-.06em]">What Churvox suggests</h2>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {suggested.map((item, index) => (
                    <article key={`${item.type}-${index}`} className={`rounded-[24px] border p-4 ${item.ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-black">{item.title}</div>
                          <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{item.reason}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${item.ready ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>
                          {item.ready ? "Ready" : "Needs details"}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <RecordList title="Jobs" records={topJobs} getTitle={(x) => x.title || x.job_title || x.job_name || x.service_type || "Job"} />
                <RecordList title="Quotes" records={topQuotes} getTitle={(x) => x.quote_number || x.number || "Quote"} />
                <RecordList title="Invoices" records={topInvoices} getTitle={(x) => x.invoice_number || x.number || "Invoice"} />
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Recent activity</div>
                <div className="mt-4 space-y-2">
                  {recent.slice(0, 12).map((item, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <div>
                        <div className="text-sm font-black">{item.title}</div>
                        <div className="text-xs font-bold text-slate-500">{item.type}</div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(item.status)}`}>{item.status || "open"}</span>
                    </div>
                  ))}
                  {!recent.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No activity yet.</div> : null}
                </div>
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">Client details</div>
                <h2 className="mt-2 text-2xl font-black">{getName(client)}</h2>
                <div className="mt-4 space-y-3 text-sm font-bold text-slate-600">
                  <div>Email: {getEmail(client) || "Missing"}</div>
                  <div>Phone: {getPhone(client) || "Missing"}</div>
                  <div>Address: {getAddress(client) || "Missing"}</div>
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-600">Quick actions</div>
                <div className="mt-4 grid gap-2">
                  <Link to={`/jobs/new?client_id=${clientId}`} className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white no-underline">Create job</Link>
                  <Link to={`/quotes/new?client_id=${clientId}`} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-black text-slate-900 no-underline">Create quote</Link>
                  <Link to={`/invoices/new?client_id=${clientId}`} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-black text-slate-900 no-underline">Create invoice</Link>
                  <Link to="/dashboard" className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-black text-blue-900 no-underline">Open Command Board</Link>
                </div>
              </div>
            </aside>
          </section>
        </>
      )}
    </main>
  );
}

function RecordList({ title, records, getTitle }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
      <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">{title}</div>
      <div className="mt-3 space-y-2">
        {records.map((item, index) => (
          <div key={item.id || item._id || index} className="rounded-2xl bg-slate-50 p-3">
            <div className="truncate text-sm font-black">{getTitle(item)}</div>
            <div className="mt-1 text-xs font-bold text-slate-500">{item.status || item.payment_status || "open"}</div>
          </div>
        ))}
        {!records.length ? <div className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-500">None yet.</div> : null}
      </div>
    </div>
  );
}
