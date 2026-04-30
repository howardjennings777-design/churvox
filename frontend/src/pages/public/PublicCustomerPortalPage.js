import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API_BASE from "../../lib/apiBase";

const nice = (v) => String(v || "-").replaceAll("_", " ");

export default function PublicCustomerPortalPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const resp = await fetch(`${API_BASE}/api/public/customer-portal/${token}`);
      const res = await resp.json();
      if (!resp.ok) throw new Error(res?.detail || res?.error || "Could not load portal");
      setData(res);
    } catch (e) {
      setError(e?.message || "Could not load portal");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  if (loading) return <div className="mx-auto max-w-3xl p-6 text-sm font-semibold text-slate-600">Loading customer portal…</div>;
  if (error) return <div className="mx-auto max-w-3xl p-6"><div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div><button onClick={load} className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-white">Retry</button></div>;

  return <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-black text-slate-900">Customer Portal</h1>
      <p className="mt-1 text-sm text-slate-600">Track your service progress, quotes, and invoices.</p>
      <p className="mt-2 text-xs font-semibold text-slate-500">{data?.privacy_note}</p>
    </div>
    {data?.jobs?.length ? <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Jobs</h2>{data.jobs.map((job) => <div key={job._id} className="mt-2 rounded-xl border border-slate-200 p-3 text-sm"><div className="font-semibold">{job.title}</div><div>Status: {nice(job.customer_live_status || job.status)}</div><div>Scheduled: {job.scheduled_date ? new Date(job.scheduled_date).toLocaleString() : "-"}</div>{job.customer_notes ? <p className="mt-1 text-slate-600">{job.customer_notes}</p> : null}</div>)}</div> : null}
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold capitalize text-slate-900">Quotes</h2>
      {!data?.quotes?.length ? <p className="mt-2 text-sm text-slate-500">No quotes available.</p> : data.quotes.map((q) => <div key={q._id} className="mt-2 rounded-xl border border-slate-200 p-3 text-sm"><div className="font-semibold">{q.title}</div><div>Status: {nice(q.status)}</div><div>Total: ${Number(q.total || 0).toFixed(2)}</div></div>)}
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold capitalize text-slate-900">Invoices</h2>
      {!data?.invoices?.length ? <p className="mt-2 text-sm text-slate-500">No invoices available.</p> : data.invoices.map((inv) => <div key={inv._id} className="mt-2 rounded-xl border border-slate-200 p-3 text-sm"><div className="font-semibold">{inv.invoice_number}</div><div>Status: {nice(inv.status)}</div><div>Total: ${Number(inv.total || 0).toFixed(2)}</div>{inv.payment_url ? <a className="mt-2 inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-white" href={inv.payment_url} target="_blank" rel="noreferrer">Pay now</a> : null}</div>)}
    </div>
  </div>;
}
