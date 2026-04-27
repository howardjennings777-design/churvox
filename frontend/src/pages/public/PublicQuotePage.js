import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

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
      toast.success(`Quote ${next}ed`);
      await loadQuote();
    } catch (err) {
      toast.error(err.message || `Failed to ${next} quote`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen grid place-items-center">Loading quote…</div>;
  if (!quote) return <div className="min-h-screen grid place-items-center">Quote not found.</div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="cx-document-card border-slate-200 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle>{quote.quote_number || "Quote"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Service quote document</p>
            <p><strong>Customer:</strong> {quote.customer_name || "—"}</p>
            <p><strong>Address:</strong> {quote.address || "—"}</p>
            <p><strong>Description:</strong> {quote.job_description || "—"}</p>
            <p><strong>Total:</strong> {formatCurrency(quote.price || 0)}</p>
            <p><strong>Status:</strong> <span className="uppercase">{quote.status || "draft"}</span></p>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => updateStatus("accept")} disabled={saving || quote.status === "accepted"}>Accept quote</Button>
              <Button variant="outline" onClick={() => updateStatus("decline")} disabled={saving || quote.status === "declined"}>Decline quote</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
