import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, FileText, MapPin, Printer, ShieldCheck } from "lucide-react";

function safe(value, fallback = "—") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function StatusPill({ status }) {
  const value = String(status || "draft").toLowerCase();
  const cls = value === "paid"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : value === "overdue"
      ? "border-red-200 bg-red-50 text-red-700"
      : value === "sent"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${cls}`}>{value}</span>;
}

export default function PublicInvoicePage() {
  const { token } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/public/invoice/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || "Unable to load invoice");
        setInvoice(data);
      } catch (err) {
        toast.error(err.message || "Unable to load invoice");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const total = useMemo(() => invoice?.total || invoice?.amount || invoice?.subtotal || 0, [invoice]);
  const paymentLink = invoice?.payment_link || invoice?.payment_url || invoice?.stripe_payment_url || "";
  const paid = String(invoice?.status || "").toLowerCase() === "paid";
  const lineItems = Array.isArray(invoice?.line_items) ? invoice.line_items : Array.isArray(invoice?.extras) ? invoice.extras : [];

  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-100 text-slate-700">Loading invoice…</div>;
  if (!invoice) return <div className="min-h-screen grid place-items-center bg-slate-100 text-slate-700">Invoice not found.</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-300/40">
          <section className="bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,0.18),transparent_20rem),linear-gradient(135deg,#020617,#0f172a_55%,#172554)] p-6 text-white md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Churvox invoice</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{safe(invoice.invoice_number, "Service invoice")}</h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
                  Review the invoice, service details, status, and secure payment option from one customer page.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={invoice.status} />
                <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 p-5 md:grid-cols-[1fr_320px] md:p-6">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-black text-slate-950"><FileText className="h-4 w-4 text-blue-600" /> Invoice details</div>
                <div className="mt-3 grid gap-3 text-sm text-slate-700">
                  <p><strong>Customer:</strong> {safe(invoice.customer_name || invoice.client_name)}</p>
                  {invoice.address ? <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>{safe(invoice.address)}</span></p> : null}
                  <p><strong>Description:</strong> {safe(invoice.description)}</p>
                  {invoice.notes ? <p><strong>Notes:</strong> {safe(invoice.notes)}</p> : null}
                </div>
              </div>

              {lineItems.length ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-black text-slate-950">Invoice items</p>
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
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Amount due</p>
                <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{formatCurrency(total)}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">Status: {safe(invoice.status, "draft")}</p>
              </div>

              {paid ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                  <div className="flex items-center gap-2 font-black"><CheckCircle2 className="h-5 w-5" /> Invoice paid</div>
                  <p className="mt-2 text-sm font-semibold">Thank you. This invoice is marked as paid.</p>
                </div>
              ) : paymentLink ? (
                <Button asChild className="h-12 w-full rounded-2xl bg-blue-600 text-base font-black hover:bg-blue-700">
                  <a href={paymentLink} target="_blank" rel="noreferrer"><CreditCard className="mr-2 h-5 w-5" /> Pay now</a>
                </Button>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  <div className="flex items-center gap-2 font-black"><CreditCard className="h-5 w-5" /> Payment link not ready</div>
                  <p className="mt-2 text-sm font-semibold">The business has not attached an online payment link yet.</p>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 font-black text-slate-900"><ShieldCheck className="h-4 w-4 text-blue-600" /> Secure customer link</div>
                <p className="mt-2 font-semibold">This invoice link is unique to this document. No app login is needed.</p>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}
