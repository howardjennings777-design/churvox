import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Loader2, 
  Pencil, 
  Trash2, 
  Send,
  Calendar,
  MapPin,
  DollarSign,
  Mail,
  User,
  CheckCircle,
  Printer
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDate, formatCurrency, INVOICE_STATUSES } from "@/lib/utils";
import Layout from "@/components/Layout";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";

export default function InvoiceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { get, del, post, loading } = useApi();
  const [invoice, setInvoice] = useState(null);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    const result = await get(`/invoices/${id}`);
    if (result.success) {
      setInvoice(result.data);
    } else {
      toast.error("Invoice not found");
      navigate("/invoices");
    }
  };

  const handleDelete = async () => {
    const result = await del(`/invoices/${id}`);
    if (result.success) {
      toast.success("Invoice deleted");
      navigate("/invoices");
    } else {
      toast.error(result.error);
    }
  };

  const handleSendInvoice = async () => {
    const result = await post(`/invoices/${id}/send`);
    if (result.success) {
      toast.success("Invoice marked as sent");
      loadInvoice();
    } else {
      toast.error(result.error);
    }
  };

  const handleMarkPaid = async () => {
    const result = await post(`/invoices/${id}/mark-paid`);
    if (result.success) {
      toast.success("Invoice marked as paid");
      loadInvoice();
    } else {
      toast.error(result.error);
    }
  };

  if (loading || !invoice) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 animate-in" data-testid="invoice-detail-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/invoices")}
              data-testid="back-button"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-semibold text-white font-heading">
                  {invoice.invoice_number}
                </h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase text-white ${INVOICE_STATUSES.find(s => s.value === invoice.status)?.color || "bg-slate-500"}`}>
                  {INVOICE_STATUSES.find(s => s.value === invoice.status)?.label || invoice.status}
                </span>
              </div>
              <p className="text-muted-foreground">Invoice for {invoice.customer_name}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {invoice.status === "draft" && (
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleSendInvoice}
                data-testid="send-invoice-button"
              >
                <Send className="mr-2 h-4 w-4" />
                Send Invoice
              </Button>
            )}
            {invoice.status === "sent" && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleMarkPaid}
                data-testid="mark-paid-button"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Paid
              </Button>
            )}
            <Link to={`/invoices/${id}/edit`}>
              <Button variant="outline" className="border-border" data-testid="edit-invoice-button">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={() => setShowDelete(true)}
              data-testid="delete-invoice-button"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Invoice Preview */}
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            {/* Invoice Header */}
            <div className="bg-gradient-to-r from-[#1A1D27] to-[#12141D] p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div>
                  <ChurvoxLogo size="md" className="mb-4" />
                  <h2 className="text-2xl font-bold text-white">INVOICE</h2>
                  <p className="text-lg text-primary font-mono">{invoice.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="text-white font-medium">{formatDate(invoice.created_at)}</p>
                  {invoice.sent_at && (
                    <>
                      <p className="text-sm text-muted-foreground mt-2">Sent Date</p>
                      <p className="text-white font-medium">{formatDate(invoice.sent_at)}</p>
                    </>
                  )}
                  {invoice.paid_at && (
                    <>
                      <p className="text-sm text-muted-foreground mt-2">Paid Date</p>
                      <p className="text-green-400 font-medium">{formatDate(invoice.paid_at)}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="p-6 sm:p-8 border-b border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Bill To</p>
              <p className="text-lg font-medium text-white">{invoice.customer_name}</p>
              {invoice.customer_email && (
                <p className="text-muted-foreground">{invoice.customer_email}</p>
              )}
              {invoice.address && (
                <p className="text-muted-foreground">{invoice.address}</p>
              )}
            </div>

            {/* Line Items */}
            <div className="p-6 sm:p-8 border-b border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-muted-foreground uppercase tracking-wider py-3">Description</th>
                    <th className="text-right text-xs text-muted-foreground uppercase tracking-wider py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-4">
                      <p className="text-white">{invoice.description}</p>
                    </td>
                    <td className="text-right py-4 text-white font-medium">
                      {formatCurrency(invoice.subtotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="p-6 sm:p-8">
              <div className="max-w-xs ml-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-white">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST ({invoice.gst_rate}%)</span>
                  <span className="text-white">{formatCurrency(invoice.gst_amount)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-3 border-t border-border">
                  <span className="text-white">Total</span>
                  <span className="text-primary">{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="p-6 sm:p-8 bg-secondary/30 border-t border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this invoice? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
