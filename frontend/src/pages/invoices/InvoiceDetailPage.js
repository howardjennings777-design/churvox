import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { ArrowLeft, Trash2, Send, CheckCircle, DollarSign, MapPin, Mail, Briefcase, Clock, MessageSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, INVOICE_STATUSES, MYOB_SYNC_STATUSES } from "../../lib/utils";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, post, del, loading } = useApi();
  const [invoice, setInvoice] = useState(null);
  const [showDelete, setShowDelete] = useState(false);

  const fetchInvoice = useCallback(async () => {
    const res = await get(`/invoices/${id}`);
    if (res.success) setInvoice(res.data);
    else navigate("/invoices");
  }, [get, id, navigate]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  const handleSend = async () => {
    const res = await post(`/invoices/${id}/send`);
    if (res.success) { toast.success("Invoice sent"); setInvoice(res.data); }
    else toast.error(res.error || "Failed to send invoice");
  };

  const handleMarkPaid = async () => {
    const res = await post(`/invoices/${id}/mark-paid`);
    if (res.success) { toast.success("Marked as paid"); setInvoice(res.data); }
    else toast.error(res.error || "Failed to mark as paid");
  };

  const handleDelete = async () => {
    const res = await del(`/invoices/${id}`);
    if (res.success) { toast.success("Invoice deleted"); navigate("/invoices"); }
  };

  const handleSendSMSReminder = async () => {
    let phone = "";
    if (invoice?.client_id) {
      const cRes = await get(`/clients/${invoice.client_id}`);
      if (cRes.success) phone = cRes.data.phone || "";
    }
    if (!phone) { console.log("SMS precheck disabled"); }
    const res = await post("/sms/send-fixed", {
      recipient_phone: phone,
      message_type: "invoice_reminder",
      invoice_id: id,
    });
    if (res.success) toast.success(`Invoice reminder sent (mock) — ${res.data.balance} credits left`);
    else toast.error(res.error || "Failed to send SMS reminder");
  };

  const handleMyobSync = async () => {
    const res = await post(`/myob/sync/${id}`);
    if (res.success) { toast.success("Invoice synced to MYOB (mock)"); setInvoice(res.data); }
    else toast.error(res.error || "Failed to sync to MYOB");
  };

  if (!invoice) return <Layout><div className="p-6 text-churvox-muted">Loading...</div></Layout>;

  const statusInfo = INVOICE_STATUSES.find((s) => s.value === invoice.status);
  const pricingLabel = { fixed: "Fixed", hourly: "Hourly", fixed_extras: "Fixed + Extras", hourly_extras: "Hourly + Extras" }[invoice.pricing_type] || "";

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4" data-testid="invoice-detail-page">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/invoices")} className="flex items-center gap-2 text-churvox-muted hover:text-white" data-testid="back-to-invoices">
            <ArrowLeft size={18} /> Invoices
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDelete(true)} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid="delete-invoice-trigger">
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* Invoice Card */}
        <Card className="bg-churvox-card border-churvox-border" data-testid="invoice-card">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <ChurvoxLogo size="md" className="mb-2" />
                <p className="text-xs text-churvox-muted">{invoice.invoice_number}</p>
              </div>
              <span className={`px-3 py-1 rounded text-xs font-semibold uppercase text-white ${statusInfo?.color || "bg-slate-500"}`} data-testid="invoice-status-badge">
                {statusInfo?.label || invoice.status}
              </span>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
              <div>
                <p className="text-xs text-churvox-muted mb-1">Bill To</p>
                <p className="text-white font-medium">{invoice.customer_name}</p>
                {invoice.customer_email && <p className="text-churvox-muted flex items-center gap-1 mt-0.5"><Mail size={12} /> {invoice.customer_email}</p>}
                {invoice.address && <p className="text-churvox-muted flex items-center gap-1 mt-0.5"><MapPin size={12} /> {invoice.address}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-churvox-muted mb-1">Date</p>
                <p className="text-white">{formatDate(invoice.created_at)}</p>
                {pricingLabel && <p className="text-xs text-churvox-accent mt-1">{pricingLabel}</p>}
              </div>
            </div>

            {/* Description */}
            <div className="border-t border-churvox-border pt-4 mb-4">
              <p className="text-xs text-churvox-muted mb-2">Description</p>
              <pre className="text-sm text-white whitespace-pre-wrap font-sans">{invoice.description}</pre>
            </div>

            {/* Time & extras detail */}
            {(invoice.hours_worked > 0 || (invoice.extras && invoice.extras.length > 0)) && (
              <div className="border-t border-churvox-border pt-4 mb-4 text-sm space-y-1">
                {invoice.hours_worked > 0 && (
                  <div className="flex items-center justify-between text-churvox-muted">
                    <span className="flex items-center gap-1"><Clock size={12} /> {invoice.hours_worked}h @ {formatCurrency(invoice.hourly_rate)}/hr</span>
                    <span className="text-white">{formatCurrency(invoice.hours_worked * invoice.hourly_rate)}</span>
                  </div>
                )}
                {invoice.extras && invoice.extras.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between text-churvox-muted">
                    <span>{ex.description}</span>
                    <span className="text-white">{formatCurrency(ex.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-churvox-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-churvox-muted">
                <span>Subtotal</span>
                <span className="text-white">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-churvox-muted">
                <span>GST ({invoice.gst_rate}%)</span>
                <span className="text-white">{formatCurrency(invoice.gst_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-churvox-border pt-2">
                <span className="text-white">Total</span>
                <span className="text-churvox-accent">{formatCurrency(invoice.total)}</span>
              </div>
            </div>

            {/* Linked job */}
            {invoice.job_id && (
              <div className="mt-4 pt-4 border-t border-churvox-border">
                <Link to={`/jobs/${invoice.job_id}`} className="text-xs text-churvox-accent hover:underline flex items-center gap-1" data-testid="linked-job">
                  <Briefcase size={12} /> View linked job
                </Link>
              </div>
            )}

            {/* MYOB Sync Status */}
            <div className="mt-4 pt-4 border-t border-churvox-border" data-testid="myob-sync-section">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-churvox-muted">MYOB:</span>
                  {(() => {
                    const syncInfo = MYOB_SYNC_STATUSES[invoice.myob_sync_status] || MYOB_SYNC_STATUSES.not_synced;
                    return (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${syncInfo.bg} ${syncInfo.color}`} data-testid="myob-sync-badge">
                        {syncInfo.label}
                      </span>
                    );
                  })()}
                  {invoice.myob_id && <span className="text-[10px] text-churvox-muted">{invoice.myob_id}</span>}
                </div>
                {invoice.myob_sync_status !== "synced" && (
                  <Button variant="outline" size="sm" onClick={handleMyobSync} disabled={loading}
                    className="border-churvox-border text-churvox-muted hover:text-white hover:border-churvox-accent/50 text-xs" data-testid="sync-to-myob-button">
                    <RefreshCw size={12} className="mr-1" /> Sync to MYOB
                  </Button>
                )}
              </div>
              {invoice.myob_last_sync && (
                <p className="text-[10px] text-churvox-muted mt-1">Last synced: {formatDate(invoice.myob_last_sync)}</p>
              )}
              {invoice.myob_error && (
                <p className="text-[10px] text-red-400 mt-1">{invoice.myob_error}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3" data-testid="invoice-actions">
          {invoice.status === "draft" && (
            <Button onClick={handleSend} disabled={loading} className="flex-1 bg-churvox-accent hover:bg-churvox-accent/90" data-testid="send-invoice-button">
              <Send size={16} className="mr-2" /> Send Invoice
            </Button>
          )}
          {invoice.status === "sent" && (
            <>
              <Button onClick={handleMarkPaid} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700" data-testid="mark-paid-button">
                <CheckCircle size={16} className="mr-2" /> Mark as Paid
              </Button>
              <Button variant="outline" onClick={handleSendSMSReminder} disabled={loading}
                className="border-churvox-border text-churvox-muted hover:text-white hover:border-churvox-accent/50" data-testid="sms-invoice-reminder">
                <MessageSquare size={16} className="mr-2" /> SMS Reminder
              </Button>
            </>
          )}
          {invoice.status === "paid" && (
            <Card className="bg-green-900/20 border-green-500/30 w-full">
              <CardContent className="p-4 text-center text-green-400 text-sm font-medium">
                <CheckCircle size={18} className="inline mr-2" /> Paid {invoice.paid_at && `on ${formatDate(invoice.paid_at)}`}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Delete Dialog */}
        <Dialog open={showDelete} onOpenChange={setShowDelete}>
          <DialogContent className="bg-churvox-card border-churvox-border" data-testid="delete-invoice-dialog">
            <DialogHeader><DialogTitle className="text-white">Delete Invoice</DialogTitle></DialogHeader>
            <p className="text-churvox-muted">Are you sure? This cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDelete(false)} className="border-churvox-border text-churvox-muted">Cancel</Button>
              <Button onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-invoice">Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
