import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API_BASE from "../../lib/apiBase";

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
      <p className="mt-1 text-sm text-slate-600">Track your job, quote, invoice, and completion progress.</p>
      <p className="mt-2 text-xs font-semibold text-slate-500">{data?.privacy_note}</p>
    </div>
    {["jobs", "quotes", "invoices"].map((k) => <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold capitalize text-slate-900">{k}</h2>
      {!data?.[k]?.length ? <p className="mt-2 text-sm text-slate-500">No {k} available.</p> : <div className="mt-2 space-y-2">{data[k].map((item) => <div key={item._id} className="rounded-xl border border-slate-200 p-3 text-sm">
        <div className="font-semibold text-slate-900">{item.title || item.name || item.invoice_number || "Record"}</div>
        <div className="text-slate-600">Status: {item.status || "pending"}</div>
        {item.payment_url ? <a className="mt-2 inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-white" href={item.payment_url} target="_blank" rel="noreferrer">Pay now</a> : null}
      </div>)}</div>}
    </div>)}
  </div>;
}
