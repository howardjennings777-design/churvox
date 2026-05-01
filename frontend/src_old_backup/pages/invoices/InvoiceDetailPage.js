// CHURVOX_PREMIUM_TRADIE_REDESIGN_ACTIVE
// CHURVOX_NEW_FRONTEND_REAL_PAGE
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Trash2, Send, CheckCircle, MapPin, Mail, Briefcase, Clock, MessageSquare, RefreshCw, Link2, ExternalLink, CreditCard, Printer, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, INVOICE_STATUSES, MYOB_SYNC_STATUSES } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

function copyText(value, message) {
  if (!value) return;
  navigator.clipboard.writeText(value).then(() => toast.success(message || "Copied"));
}

function statusTone(status) {
  const value = String(status || "draft").toLowerCase();
  if (value === "paid") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (value === "overdue" || value === "cancelled") return "bg-red-50 text-red-700 ring-red-200";
  if (value === "sent") return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function Metric({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-950",
    blue: "border-blue-100 bg-blue-50 text-blue-800",
    green: "border-emerald-100 bg-emerald-50 text-emerald-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] opacity-70">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { normalizedRole } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, post, del, loading } = useApi();
  const [invoice, setInvoice] = useState(null);
  const [accounting, setAccounting] = useState(null);

  const fetchInvoice = useCallback(async () => {
    const [res, accountingRes] = await Promise.allSettled([get(`/invoices/${id}`), get("/accounting/settings")]);
    if (res.status === "fulfilled" && res.value?.success) setInvoice(res.value.data);
    else navigate("/invoices");
    if (accountingRes.status === "fulfilled" && accountingRes.value?.success) setAccounting(accountingRes.value.data || null);
  }, [get, id, navigate]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  const handleSend = async () => {
    const res = await post(`/invoices/${id}/send`);
    if (res.success) {
      toast.success("Invoice sent");
      await fetchInvoice();
      if (res?.data?.public_invoice_url) copyText(res.data.public_invoice_url, "Public invoice link copied");
    } else toast.error(res.error || "Failed to send invoice");
  };

  const handleMarkPaid = async () => {
    const res = await post(`/invoices/${id}/mark-paid`);
    if (res.success) {
      toast.success("Marked as paid");
      setInvoice(res.data);
      await fetchInvoice();
    } else toast.error(res.error || "Failed to mark as paid");
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this invoice? This cannot be undone.");
    if (!confirmed) return;
    const res = await del(`/invoices/${id}`);
    if (res.success) { toast.success("Invoice deleted"); navigate("/invoices"); }
  };

  const handleSendSMSReminder = async () => {
    let phone = "";
    if (invoice?.client_id) {
      const cRes = await get(`/clients/${invoice.client_id}`);
      if (cRes.success) phone = cRes.data.phone || "";
    }
    const res = await post("/sms/send", {
      recipient_phone: phone,
      message_type: "invoice_reminder",
      invoice_id: id,
      client_id: invoice?.client_id,
    });
    if (res.success) toast.success(`Invoice reminder sent — ${res.data.balance} credits left`);
    else toast.error(res.error || "Failed to send SMS reminder");
  };

  const handleMyobSync = async () => {
    const res = await post(`/myob/invoices/${id}/sync`);
    if (res.success) toast.success("Selected invoice sync requested.");
    else if (res?.not_configured) toast.warning("MYOB is not configured yet.");
    else toast.error(res?.message || res?.error || "MYOB setup required");
    await fetchInvoice();
  };

  const handleMyobPaymentPull = async () => {
    const res = await post(`/myob/invoices/${id}/pull-payment-status`);
    if (res.success) toast.success("Payment status pull completed.");
    else if (res?.not_configured) toast.warning("MYOB is not configured yet.");
    else toast.error(res?.message || res?.error || "Could not pull payment status");
    await fetchInvoice();
  };

  const handleAiReminderDraft = async () => {
    const res = await post("/ai/drafts/create", {
      type: "invoice_reminder",
      source_record_id: id,
      source_record_type: "invoice",
    });
    if (res?.success) toast.success("AI reminder draft created");
    else toast.error(res?.error || "Could not create AI draft");
  };

  const totals = useMemo(() => {
    const subtotal = Number(invoice?.subtotal || 0);
    const gst = Number(invoice?.gst_amount || 0);
    const total = Number(invoice?.total || subtotal + gst || 0);
    return { subtotal, gst, total };
  }, [invoice]);

  if (!invoice) return <Layout><div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" /></div></Layout>;

  const statusInfo = INVOICE_STATUSES.find((s) => s.value === invoice.status);
  const pricingLabel = { fixed: "Fixed", hourly: "Hourly", fixed_extras: "Fixed + Extras", hourly_extras: "Hourly + Extras" }[invoice.pricing_type] || "";
  const mode = accounting?.invoice_mode || "churvox_only";
  const myobConnected = Boolean(accounting?.myob_connected);
  const publicUrl = invoice.public_invoice_url || (invoice.public_token ? `${window.location.origin}/public/invoice/${invoice.public_token}` : "");
  const paymentUrl = invoice.payment_link || invoice.payment_url || invoice.stripe_payment_url || "";
  const syncKey = mode === "myob_external" ? "external" : (invoice.myob_sync_status || "not_synced");
  const syncInfo = MYOB_SYNC_STATUSES[syncKey] || MYOB_SYNC_STATUSES.not_synced;
  const canManageMyob = ["owner", "admin", "manager", "office_admin", "employer"].includes(String(normalizedRole || "").toLowerCase());

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6" data-testid="invoice-detail-page">
        <section className="overflow-hidden rounded-3xl border border-slate-900/20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <button onClick={() => navigate("/invoices")} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-200 hover:text-white" data-testid="back-to-invoices">
                <ArrowLeft size={18} /> Back to invoices
              </button>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Invoice command centre</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{invoice.invoice_number}</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-200">Send, collect, sync, mark paid, open the customer invoice, and review linked job details.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide ring-1 ${statusTone(invoice.status)}`} data-testid="invoice-status-badge">
                {statusInfo?.label || invoice.status}
              </span>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15"><Printer size={14} className="mr-1" /> Print</Button>
              <Button variant="outline" size="sm" onClick={handleAiReminderDraft} className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15">AI reminder draft</Button>
              <Button variant="outline" size="sm" onClick={handleDelete} className="rounded-full border-red-300/30 bg-red-500/10 text-red-100 hover:bg-red-500/20" data-testid="delete-invoice-trigger"><Trash2 size={14} className="mr-1" /> Delete</Button>
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total" value={formatCurrency(totals.total)} tone="blue" />
          <Metric label="Subtotal" value={formatCurrency(totals.subtotal)} />
          <Metric label="GST" value={formatCurrency(totals.gst)} />
          <Metric label="Payment" value={invoice.status === "paid" ? "Paid" : paymentUrl ? "Online link ready" : "No link"} tone={invoice.status === "paid" ? "green" : paymentUrl ? "blue" : "amber"} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <Card className="border-slate-200 bg-white shadow-sm" data-testid="invoice-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <ChurvoxLogo size="md" className="mb-2" />
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Invoice document</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1 ${statusTone(invoice.status)}`}>{statusInfo?.label || invoice.status}</span>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Bill to</p>
                  <p className="mt-2 font-black text-slate-950">{invoice.customer_name}</p>
                  {invoice.customer_email && <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-600"><Mail size={13} /> {invoice.customer_email}</p>}
                  {invoice.address && <p className="mt-1 flex items-start gap-1 text-sm font-semibold text-slate-600"><MapPin size={13} className="mt-1 shrink-0" /> {invoice.address}</p>}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Invoice date</p>
                  <p className="mt-2 font-black text-slate-950">{formatDate(invoice.created_at)}</p>
                  {pricingLabel && <p className="mt-1 text-sm font-bold text-blue-700">{pricingLabel}</p>}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-black text-slate-950"><FileText size={16} /> Description</p>
                <pre className="whitespace-pre-wrap font-sans text-sm font-semibold leading-6 text-slate-700">{invoice.description || "No description"}</pre>
              </div>

              {(invoice.hours_worked > 0 || (invoice.extras && invoice.extras.length > 0)) && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  {invoice.hours_worked > 0 && <div className="flex items-center justify-between text-slate-600"><span className="flex items-center gap-1"><Clock size={13} /> {invoice.hours_worked}h @ {formatCurrency(invoice.hourly_rate)}/hr</span><span className="font-black text-slate-950">{formatCurrency(invoice.hours_worked * invoice.hourly_rate)}</span></div>}
                  {invoice.extras && invoice.extras.map((ex, i) => <div key={i} className="mt-2 flex items-center justify-between text-slate-600"><span>{ex.description}</span><span className="font-black text-slate-950">{formatCurrency(ex.amount)}</span></div>)}
                </div>
              )}

              <div className="mt-5 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-bold text-slate-950">{formatCurrency(totals.subtotal)}</span></div>
                <div className="flex justify-between text-slate-600"><span>GST ({invoice.gst_rate}%)</span><span className="font-bold text-slate-950">{formatCurrency(totals.gst)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-black"><span className="text-slate-950">Total</span><span className="text-blue-700">{formatCurrency(totals.total)}</span></div>
              </div>

              {invoice.job_id && <Link to={`/jobs/${invoice.job_id}`} className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:underline" data-testid="linked-job"><Briefcase size={14} /> View linked job</Link>}
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-black text-slate-950">Invoice actions</p>
                {invoice.status === "draft" && <Button onClick={handleSend} disabled={loading} className="h-11 w-full rounded-2xl bg-blue-600 font-black text-white hover:bg-blue-700" data-testid="send-invoice-button"><Send size={16} className="mr-2" /> Send Invoice</Button>}
                <Button variant="outline" onClick={handleAiReminderDraft} className="h-11 w-full rounded-2xl font-black">AI reminder draft</Button>
                {invoice.status === "sent" && <Button onClick={handleMarkPaid} disabled={loading} className="h-11 w-full rounded-2xl bg-green-600 font-black text-white hover:bg-green-700" data-testid="mark-paid-button"><CheckCircle size={16} className="mr-2" /> Mark as Paid</Button>}
                {invoice.status === "sent" && <Button variant="outline" onClick={handleSendSMSReminder} disabled={loading} className="h-11 w-full rounded-2xl font-black" data-testid="sms-invoice-reminder"><MessageSquare size={16} className="mr-2" /> SMS Reminder</Button>}
                {invoice.status === "paid" && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-black text-emerald-700"><CheckCircle size={18} className="inline mr-2" /> Paid {invoice.paid_at && `on ${formatDate(invoice.paid_at)}`}</div>}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-black text-slate-950">Customer link</p>
                {publicUrl ? <Button variant="outline" onClick={() => copyText(publicUrl, "Public invoice link copied")} className="h-11 w-full rounded-2xl font-black"><Link2 size={16} className="mr-2" /> Copy invoice link</Button> : <p className="text-sm font-semibold text-amber-700">Send the invoice to create a public link.</p>}
                {publicUrl ? <Button asChild variant="outline" className="h-11 w-full rounded-2xl font-black"><a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} className="mr-2" /> Open customer invoice</a></Button> : null}
                {paymentUrl ? <Button asChild className="h-11 w-full rounded-2xl bg-blue-600 font-black text-white hover:bg-blue-700"><a href={paymentUrl} target="_blank" rel="noreferrer"><CreditCard size={16} className="mr-2" /> Open pay link</a></Button> : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">No online payment link attached yet.</div>}
              </CardContent>
            </Card>

            {canManageMyob ? <Card className="border-slate-200 bg-white shadow-sm" data-testid="myob-sync-section">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-950">MYOB</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-700">{mode.replace("_", " ")}</span>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${syncInfo.bg} ${syncInfo.color}`} data-testid="myob-sync-badge">{syncInfo.label}</span>
                {invoice.myob_invoice_id && <p className="text-xs font-semibold text-slate-500">MYOB invoice ID: {invoice.myob_invoice_id}</p>}
                {invoice.myob_invoice_number && <p className="text-xs font-semibold text-slate-500">MYOB invoice #{invoice.myob_invoice_number}</p>}
                {invoice.myob_payment_status && <p className="text-xs font-semibold text-slate-500">MYOB payment: {invoice.myob_payment_status}</p>}
                {invoice.myob_last_synced_at && <p className="text-xs font-semibold text-slate-500">Last synced: {formatDate(invoice.myob_last_synced_at)}</p>}
                {invoice.myob_error && <p className="text-xs font-semibold text-red-500">{invoice.myob_error}</p>}
                <p className="text-xs font-semibold text-slate-600">Internal invoice remains available even when MYOB is off.</p>
                {invoice.myob_invoice_url && <a href={invoice.myob_invoice_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:underline"><ExternalLink size={14} /> Open in MYOB</a>}
                <Button variant="outline" onClick={handleMyobSync} disabled={loading || !myobConnected} className="h-10 w-full rounded-2xl font-black" data-testid="sync-to-myob-button"><RefreshCw size={14} className="mr-2" /> Sync selected invoice to MYOB</Button>
                <Button variant="outline" onClick={handleMyobPaymentPull} disabled={loading || !myobConnected} className="h-10 w-full rounded-2xl font-black">Pull payment status from MYOB</Button>
              </CardContent>
            </Card> : null}
          </aside>
        </div>
      </div>
    </Layout>
  );
}
