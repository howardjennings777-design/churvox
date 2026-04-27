import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { CheckCircle2, FileText, MapPin, Printer, ShieldCheck, XCircle } from "lucide-react";

function safe(value, fallback = "—") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function StatusPill({ status }) {
  const value = String(status || "draft").toLowerCase();
  const cls = value === "accepted"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : value === "declined"
      ? "border-red-200 bg-red-50 text-red-700"
      : value === "sent"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${cls}`}>{value}</span>;
}

export default function PublicQuotePage() {
  const { token } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadQuote = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/quote/${token}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Unable to load quote");
      setQuote(data);
    } catch (err) {
      toast.error(err.message || "Unable to load quote");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuote(); }, [token]);

  const updateStatus = async (next) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/quote/${token}/${next}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.detail || data?.error || `Failed to ${next}`);
      toast.success(next === "accept" ? "Quote accepted" : "Quote declined");
      await loadQuote();
    } catch (err) {
      toast.error(err.message || `Failed to ${next} quote`);
    } finally {
      setSaving(false);
    }
  };

  const total = useMemo(() => quote?.price || quote?.total || quote?.subtotal || 0, [quote]);
  const lineItems = Array.isArray(quote?.line_items) ? quote.line_items : Array.isArray(quote?.extras) ? quote.extras : [];
  const accepted = String(quote?.status || "").toLowerCase() === "accepted";
  const declined = String(quote?.status || "").toLowerCase() === "declined";

  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-100 text-slate-700">Loading quote…</div>;
  if (!quote) return <div className="min-h-screen grid place-items-center bg-slate-100 text-slate-700">Quote not found.</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-300/40">
          <section className="bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,0.18),transparent_20rem),linear-gradient(135deg,#020617,#0f172a_55%,#172554)] p-6 text-white md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Churvox quote</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{safe(quote.quote_number, "Service quote")}</h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
                  Review the work, total, and site details. Accepting this quote lets the business move it into the job workflow.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={quote.status} />
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 p-5 md:grid-cols-[1fr_320px] md:p-6">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-black text-slate-950"><FileText className="h-4 w-4 text-blue-600" /> Work details</div>
                <div className="mt-3 grid gap-3 text-sm text-slate-700">
                  <p><strong>Customer:</strong> {safe(quote.customer_name || quote.client_name)}</p>
                  <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>{safe(quote.address)}</span></p>
                  <p><strong>Description:</strong> {safe(quote.job_description || quote.description)}</p>
                  {quote.notes ? <p><strong>Notes:</strong> {safe(quote.notes)}</p> : null}
                </div>
              </div>

              {lineItems.length ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-black text-slate-950">Included items</p>
                  <div className="mt-3 space-y-2">
                    {lineItems.map((item, index) => (
                      <div key={`${item?.name || item?.description || index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate text-slate-700">{safe(item?.name || item?.description || item?.title, `Item ${index + 1}`)}</span>
                        <span className="shrink-0 font-black text-slate-950">{formatCurrency(item?.amount || item?.price || item?.total || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Quote total</p>
                <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{formatCurrency(total)}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">Total shown includes the amount supplied by the business.</p>
              </div>

              {accepted ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                  <div className="flex items-center gap-2 font-black"><CheckCircle2 className="h-5 w-5" /> Quote accepted</div>
                  <p className="mt-2 text-sm font-semibold">The business can now turn this into a job.</p>
                </div>
              ) : declined ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                  <div className="flex items-center gap-2 font-black"><XCircle className="h-5 w-5" /> Quote declined</div>
                  <p className="mt-2 text-sm font-semibold">The business has been notified of the decision.</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Button onClick={() => updateStatus("accept")} disabled={saving} className="h-12 rounded-2xl bg-blue-600 text-base font-black hover:bg-blue-700">
                    Accept quote
                  </Button>
                  <Button variant="outline" onClick={() => updateStatus("decline")} disabled={saving} className="h-12 rounded-2xl text-base font-black">
                    Decline quote
                  </Button>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 font-black text-slate-900"><ShieldCheck className="h-4 w-4 text-blue-600" /> Secure customer link</div>
                <p className="mt-2 font-semibold">This quote link is unique to this document. No app login is needed.</p>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}
