import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import { useApi } from "../../hooks/useApi";
import { ArrowLeft, Trash2, Send, CheckCircle, MapPin, Mail, Briefcase, Clock, MessageSquare, RefreshCw, Link2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, INVOICE_STATUSES, MYOB_SYNC_STATUSES } from "../../lib/utils";
import { confirmDialog } from "../../lib/confirmDialog";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "../../components/premium";

const CHURVOX_INVOICE_DETAIL_LINKED_JOB_CONTEXT_20260525 = true;

function linkedJobIdOf(invoice) {
  return invoice?.job_id || invoice?.jobId || invoice?.source_job_id || invoice?.linked_job_id || "";
}

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
    const confirmed = await confirmDialog({
      title: "Delete this invoice?",
      message: "This cannot be undone. If the invoice was sent or synced to MYOB, you may need to handle that separately.",
      danger: true,
      confirmLabel: "Delete invoice",
    });
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

  if (!invoice) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#2563eb]" />
        </div>
      </Layout>
    );
  }

  const statusInfo = INVOICE_STATUSES.find((s) => s.value === invoice.status);
  const pricingLabel = { fixed: "Fixed", hourly: "Hourly", fixed_extras: "Fixed + Extras", hourly_extras: "Hourly + Extras" }[invoice.pricing_type] || "";
  const mode = accounting?.invoice_mode || "churvox_only";
  const myobConnected = Boolean(accounting?.myob_connected);
  const linkedJobId = linkedJobIdOf(invoice);

  return (
    <Layout>
      <PremiumPage maxWidth={960}>
        <button onClick={() => navigate("/invoices")} className="flex items-center gap-2 text-[#5b6c87] hover:text-[#0d1b34] text-sm font-semibold" data-testid="back-to-invoices">
          <ArrowLeft size={16} /> Back to invoices
        </button>

        <PremiumHero
          eyebrow="Invoice"
          title={invoice.invoice_number || "Invoice"}
          subtitle={`${invoice.customer_name || "Customer"} • Total ${formatCurrency(invoice.total)}`}
          icon={<Receipt className="h-6 w-6" />}
          actions={
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase text-white ${statusInfo?.color || "bg-slate-500"}`} data-testid="invoice-status-badge">
                {statusInfo?.label || invoice.status}
              </span>
              <PremiumButton variant="danger" size="sm" onClick={handleDelete} dataTestId="delete-invoice-trigger">
                <Trash2 size={14} />
              </PremiumButton>
            </div>
          }
        />

        {linkedJobId && (
          <div className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] p-4 text-sm text-[#1e3a8a]" data-marker="CHURVOX_INVOICE_DETAIL_LINKED_JOB_CONTEXT_20260525">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-black flex items-center gap-2"><Briefcase size={16} /> Linked approved job</div>
                <div className="mt-1 font-semibold">This invoice was created from an approved job or Work Review item.</div>
                <div className="mt-1 text-xs font-bold opacity-80">Job ID: {linkedJobId}</div>
              </div>
              <Link to={`/jobs/${linkedJobId}`} className="inline-flex rounded-full bg-[#1d4ed8] px-4 py-2 text-xs font-black text-white no-underline">
                Open linked job
              </Link>
            </div>
          </div>
        )}

        <PremiumCard data-testid="invoice-card">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
              <ChurvoxLogo size="md" className="mb-2" />
              <p className="text-xs text-[#7d8ba3] font-mono">{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#7d8ba3] mb-1">Total</p>
              <p className="text-2xl font-bold text-[#2563eb]" style={{ fontFamily: "'Outfit', sans-serif" }}>{formatCurrency(invoice.total)}</p>
              {pricingLabel && <p className="text-xs text-[#5b6c87] mt-1">{pricingLabel}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-sm">
            <div>
              <p className="text-xs text-[#7d8ba3] mb-1 uppercase tracking-wide font-semibold">Bill to</p>
              <p className="text-[#0d1b34] font-semibold">{invoice.customer_name}</p>
              {invoice.customer_email && <p className="text-[#5b6c87] flex items-center gap-1 mt-0.5"><Mail size={12} /> {invoice.customer_email}</p>}
              {invoice.address && <p className="text-[#5b6c87] flex items-center gap-1 mt-0.5"><MapPin size={12} /> {invoice.address}</p>}
            </div>
            <div className="md:text-right">
              <p className="text-xs text-[#7d8ba3] mb-1 uppercase tracking-wide font-semibold">Date</p>
              <p className="text-[#0d1b34]">{formatDate(invoice.created_at)}</p>
            </div>
          </div>

          <div className="border-t border-[#e6eef9] pt-4 mb-4">
            <p className="text-xs text-[#7d8ba3] mb-2 uppercase tracking-wide font-semibold">Description</p>
            <pre className="text-sm text-[#1a2c4d] whitespace-pre-wrap font-sans">{invoice.description}</pre>
          </div>

          {(invoice.hours_worked > 0 || (invoice.extras && invoice.extras.length > 0)) && (
            <div className="border-t border-[#e6eef9] pt-4 mb-4 text-sm space-y-1.5">
              {invoice.hours_worked > 0 && (
                <div className="flex items-center justify-between text-[#5b6c87]">
                  <span className="flex items-center gap-1"><Clock size={12} /> {invoice.hours_worked}h @ {formatCurrency(invoice.hourly_rate)}/hr</span>
                  <span className="text-[#0d1b34] font-semibold">{formatCurrency(invoice.hours_worked * invoice.hourly_rate)}</span>
                </div>
              )}
              {invoice.extras && invoice.extras.map((ex, i) => (
                <div key={i} className="flex items-center justify-between text-[#5b6c87]">
                  <span>{ex.description}</span>
                  <span className="text-[#0d1b34] font-semibold">{formatCurrency(ex.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-[#e6eef9] pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-[#5b6c87]">
              <span>Subtotal</span>
              <span className="text-[#0d1b34] font-semibold">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#5b6c87]">
              <span>GST ({invoice.gst_rate}%)</span>
              <span className="text-[#0d1b34] font-semibold">{formatCurrency(invoice.gst_amount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-[#e6eef9] pt-2">
              <span className="text-[#0d1b34]">Total</span>
              <span className="text-[#2563eb]">{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          {linkedJobId && (
            <div className="mt-4 pt-4 border-t border-[#e6eef9]">
              <Link to={`/jobs/${linkedJobId}`} className="text-xs text-[#2563eb] hover:underline flex items-center gap-1 font-semibold" data-testid="linked-job">
                <Briefcase size={12} /> View linked job
              </Link>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-[#e6eef9]" data-testid="myob-sync-section">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#7d8ba3]">Invoice mode:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#eff4ff] text-[#1d4ed8]">{mode.replace("_", " ")}</span>
                <span className="text-xs text-[#7d8ba3]">MYOB:</span>
                {(() => {
                  const syncKey = mode === "myob_external" ? "external" : (invoice.myob_sync_status || "not_synced");
                  const syncInfo = MYOB_SYNC_STATUSES[syncKey] || MYOB_SYNC_STATUSES.not_synced;
                  return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${syncInfo.bg} ${syncInfo.color}`} data-testid="myob-sync-badge">
                      {syncInfo.label}
                    </span>
                  );
                })()}
                {invoice.myob_invoice_number && <span className="text-[10px] text-[#5b6c87]">#{invoice.myob_invoice_number}</span>}
              </div>
              {(mode === "myob_sync" || mode === "myob_external") && (
                <PremiumButton variant="secondary" size="sm" onClick={handleMyobSync} disabled={loading || !myobConnected} dataTestId="sync-to-myob-button">
                  <RefreshCw size={12} className="mr-1" /> {myobConnected ? (String(invoice.myob_sync_status) === "failed" ? "Retry sync" : "Sync to MYOB") : "Setup MYOB"}
                </PremiumButton>
              )}
            </div>
            {invoice.myob_payment_status && (
              <p className="text-[11px] text-[#5b6c87] mt-2">MYOB payment status: {invoice.myob_payment_status}</p>
            )}
            {invoice.myob_last_synced_at && (
              <p className="text-[10px] text-[#7d8ba3] mt-1">Last synced: {formatDate(invoice.myob_last_synced_at)}</p>
            )}
            {invoice.myob_error && (
              <p className="text-[10px] text-[#dc2626] mt-1">{invoice.myob_error}</p>
            )}
            {invoice.myob_invoice_url && <a href={invoice.myob_invoice_url} target="_blank" rel="noreferrer" className="text-xs text-[#2563eb] hover:underline mt-1 inline-block font-semibold">Open in MYOB →</a>}
          </div>
        </PremiumCard>

        <div className="flex gap-3 flex-wrap" data-testid="invoice-actions">
          {invoice.status === "draft" && (
            <PremiumButton onClick={handleSend} disabled={loading} dataTestId="send-invoice-button" className="flex-1 min-w-[200px]">
              <Send size={16} className="mr-2" /> Send Invoice
            </PremiumButton>
          )}
          {invoice.status === "sent" && (
            <>
              <PremiumButton variant="success" onClick={handleMarkPaid} disabled={loading} dataTestId="mark-paid-button" className="flex-1 min-w-[200px]">
                <CheckCircle size={16} className="mr-2" /> Mark as Paid
              </PremiumButton>
              <PremiumButton variant="secondary" onClick={handleSendSMSReminder} disabled={loading} dataTestId="sms-invoice-reminder" className="flex-1 min-w-[200px]">
                <MessageSquare size={16} className="mr-2" /> SMS Reminder
              </PremiumButton>
            </>
          )}
          {invoice.public_invoice_url && (
            <PremiumButton variant="secondary" onClick={() => navigator.clipboard.writeText(invoice.public_invoice_url).then(() => toast.success("Public invoice link copied"))} className="flex-1 min-w-[200px]">
              <Link2 size={16} className="mr-2" /> Copy Public Link
            </PremiumButton>
          )}
          {invoice.status === "paid" && (
            <div className="flex-1 min-w-[240px] bg-[#ccfbf1] border border-[#0d9488]/30 rounded-2xl p-4 text-center text-[#0d9488] text-sm font-bold flex items-center justify-center gap-2">
              <CheckCircle size={18} /> Paid {invoice.paid_at && `on ${formatDate(invoice.paid_at)}`}
            </div>
          )}
        </div>
      </PremiumPage>
    </Layout>
  );
}
