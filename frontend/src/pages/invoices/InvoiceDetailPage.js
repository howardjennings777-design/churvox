import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Trash2, Send, CheckCircle, DollarSign, MapPin, Mail, Briefcase, Clock, MessageSquare, RefreshCw, Link2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, INVOICE_STATUSES, MYOB_SYNC_STATUSES } from "../../lib/utils";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, post, del, loading } = useApi();
  const [invoice, setInvoice] = useState(null);
  const [accounting, setAccounting] = useState(null);

  const fetchInvoice = useCallback(async () => {
    const [res, accountingRes] = await Promise.all([get(`/invoices/${id}`), get("/accounting/settings")]);
    if (res.success) setInvoice(res.data);
    else navigate("/invoices");
    if (accountingRes?.success) setAccounting(accountingRes.data || null);
  }, [get, id, navigate]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  const handleSend = async () => {
    const res = await post(`/invoices/${id}/send`);
    if (res.success) {
      toast.success("Invoice sent");
      await fetchInvoice();
      if (res?.data?.public_invoice_url) {
        try { await navigator.clipboard.writeText(res.data.public_invoice_url); toast.success("Public invoice link copied"); } catch (_) {}
      }
    }
    else toast.error(res.error || "Failed to send invoice");
  };

  const handleMarkPaid = async () => {
    const res = await post(`/invoices/${id}/mark-paid`);
    if (res.success) { toast.success("Marked as paid"); setInvoice(res.data); }
    else toast.error(res.error || "Failed to mark as paid");
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
    const endpoint = String(invoice?.myob_sync_status || "") === "failed" ? `/invoices/${id}/myob-retry` : `/invoices/${id}/myob-sync`;
    const res = await post(endpoint);
    if (res.success) toast.success("MYOB sync updated");
    else toast.error(res?.message || res?.error || "MYOB setup required");
    await fetchInvoice();
  };

  if (!invoice) return <Layout><div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" /></div></Layout>;

  const statusInfo = INVOICE_STATUSES.find((s) => s.value === invoice.status);
  const pricingLabel = { fixed: "Fixed", hourly: "Hourly", fixed_extras: "Fixed + Extras", hourly_extras: "Hourly + Extras" }[invoice.pricing_type] || "";
  const mode = accounting?.invoice_mode || "churvox_only";
  const myobConnected = Boolean(accounting?.myob_connected);

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4" data-testid="invoice-detail-page">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/invoices")} className="flex items-center gap-2 text-slate-500 hover:text-slate-900" data-testid="back-to-invoices">
            <ArrowLeft size={18} /> Invoices
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDelete} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid="delete-invoice-trigger">
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* Invoice Card */}
        <Card className="bg-white border-slate-200 shadow-sm" data-testid="invoice-card">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <ChurvoxLogo size="md" className="mb-2" />
                <p className="text-xs text-slate-500">{invoice.invoice_number}</p>
              </div>
              <span className={`px-3 py-1 rounded text-xs font-semibold uppercase text-slate-900 ${statusInfo?.color || "bg-slate-500"}`} data-testid="invoice-status-badge">
                {statusInfo?.label || invoice.status}
              </span>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
              <div>
                <p className="text-xs text-slate-500 mb-1">Bill To</p>
                <p className="text-slate-900 font-medium">{invoice.customer_name}</p>
                {invoice.customer_email && <p className="text-slate-500 flex items-center gap-1 mt-0.5"><Mail size={12} /> {invoice.customer_email}</p>}
                {invoice.address && <p className="text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={12} /> {invoice.address}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Date</p>
                <p className="text-slate-900">{formatDate(invoice.created_at)}</p>
                {pricingLabel && <p className="text-xs text-blue-600 mt-1">{pricingLabel}</p>}
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-slate-200 pt-4 mb-4">
              <p className="text-xs text-slate-500 mb-2">Description</p>
              <pre className="text-sm text-slate-900 whitespace-pre-wrap font-sans">{invoice.description}</pre>
            </div>

            {/* Time & extras detail */}
            {(invoice.hours_worked > 0 || (invoice.extras && invoice.extras.length > 0)) && (
              <div className="border-t border-slate-200 pt-4 mb-4 text-sm space-y-1">
                {invoice.hours_worked > 0 && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={12} /> {invoice.hours_worked}h @ {formatCurrency(invoice.hourly_rate)}/hr</span>
                    <span className="text-slate-900">{formatCurrency(invoice.hours_worked * invoice.hourly_rate)}</span>
                  </div>
                )}
                {invoice.extras && invoice.extras.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between text-slate-500">
                    <span>{ex.description}</span>
                    <span className="text-slate-900">{formatCurrency(ex.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-slate-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="text-slate-900">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>GST ({invoice.gst_rate}%)</span>
                <span className="text-slate-900">{formatCurrency(invoice.gst_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-slate-200 pt-2">
                <span className="text-slate-900">Total</span>
                <span className="text-blue-600">{formatCurrency(invoice.total)}</span>
              </div>
            </div>

            {/* Linked job */}
            {invoice.job_id && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Link to={`/jobs/${invoice.job_id}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1" data-testid="linked-job">
                  <Briefcase size={12} /> View linked job
                </Link>
              </div>
            )}

            {/* MYOB Accounting */}
            <div className="mt-4 pt-4 border-t border-slate-200" data-testid="myob-sync-section">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Invoice mode:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">{mode.replace("_", " ")}</span>
                  <span className="text-xs text-slate-500">MYOB:</span>
                  {(() => {
                    const syncKey = mode === "myob_external" ? "external" : (invoice.myob_sync_status || "not_synced");
                    const syncInfo = MYOB_SYNC_STATUSES[syncKey] || MYOB_SYNC_STATUSES.not_synced;
                    return (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${syncInfo.bg} ${syncInfo.color}`} data-testid="myob-sync-badge">
                        {syncInfo.label}
                      </span>
                    );
                  })()}
                  {invoice.myob_invoice_number && <span className="text-[10px] text-slate-500">#{invoice.myob_invoice_number}</span>}
                </div>
                {(mode === "myob_sync" || mode === "myob_external") && (
                  <Button variant="outline" size="sm" onClick={handleMyobSync} disabled={loading || !myobConnected}
                    className="border-slate-200 text-slate-500 hover:text-slate-900 hover:border-blue-600/50 text-xs" data-testid="sync-to-myob-button">
                    <RefreshCw size={12} className="mr-1" /> {myobConnected ? (String(invoice.myob_sync_status) === "failed" ? "Retry sync" : "Sync to MYOB") : "Setup MYOB"}
                  </Button>
                )}
              </div>
              {invoice.myob_payment_status && (
                <p className="text-[11px] text-slate-500 mt-1">MYOB payment status: {invoice.myob_payment_status}</p>
              )}
              {invoice.myob_last_synced_at && (
                <p className="text-[10px] text-slate-500 mt-1">Last synced: {formatDate(invoice.myob_last_synced_at)}</p>
              )}
              {invoice.myob_error && (
                <p className="text-[10px] text-red-400 mt-1">{invoice.myob_error}</p>
              )}
              {invoice.myob_invoice_url && <a href={invoice.myob_invoice_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Open in MYOB</a>}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3" data-testid="invoice-actions">
          {invoice.status === "draft" && (
            <Button onClick={handleSend} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" data-testid="send-invoice-button">
              <Send size={16} className="mr-2" /> Send Invoice
            </Button>
          )}
          {invoice.status === "sent" && (
            <>
              <Button onClick={handleMarkPaid} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700" data-testid="mark-paid-button">
                <CheckCircle size={16} className="mr-2" /> Mark as Paid
              </Button>
              <Button variant="outline" onClick={handleSendSMSReminder} disabled={loading}
                className="border-slate-200 text-slate-500 hover:text-slate-900 hover:border-blue-600/50" data-testid="sms-invoice-reminder">
                <MessageSquare size={16} className="mr-2" /> SMS Reminder
              </Button>
            </>
          )}
          {invoice.public_invoice_url && (
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(invoice.public_invoice_url).then(() => toast.success("Public invoice link copied"))}>
              <Link2 size={16} className="mr-2" /> Copy Public Link
            </Button>
          )}
          {invoice.status === "paid" && (
            <Card className="bg-green-900/20 border-green-500/30 w-full">
              <CardContent className="p-4 text-center text-green-400 text-sm font-medium">
                <CheckCircle size={18} className="inline mr-2" /> Paid {invoice.paid_at && `on ${formatDate(invoice.paid_at)}`}
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </Layout>
  );
}
