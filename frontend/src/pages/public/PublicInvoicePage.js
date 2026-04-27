import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE } from "@/lib/apiBase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

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

  if (loading) return <div className="min-h-screen grid place-items-center">Loading invoice…</div>;
  if (!invoice) return <div className="min-h-screen grid place-items-center">Invoice not found.</div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="cx-document-card border-slate-200 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle>{invoice.invoice_number || "Invoice"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Service invoice document</p>
            <p><strong>Customer:</strong> {invoice.customer_name || "—"}</p>
            <p><strong>Description:</strong> {invoice.description || "—"}</p>
            <p><strong>Status:</strong> <span className="uppercase">{invoice.status || "draft"}</span></p>
            <p><strong>Total:</strong> {formatCurrency(invoice.total || 0)}</p>
            {invoice.payment_link ? (
              <Button asChild><a href={invoice.payment_link} target="_blank" rel="noreferrer">Pay now</a></Button>
            ) : (
              <p className="text-sm text-amber-700">Payment link not set up</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
