import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { ArrowLeft, Edit, Trash2, MapPin, Mail, DollarSign, Send, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, QUOTE_STATUSES } from "../../lib/utils";

export default function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isEmployer } = useAuth();
  const { get, post, del, loading } = useApi();
  const [quote, setQuote] = useState(null);
  const [showDelete, setShowDelete] = useState(false);

  const fetchQuote = useCallback(async () => {
    const res = await get(`/quotes/${id}`);
    if (res.success) setQuote(res.data);
    else navigate("/quotes");
  }, [get, id, navigate]);

  useEffect(() => { fetchQuote(); }, [fetchQuote]);

  const handleSend = async () => {
    const res = await post(`/quotes/${id}/send`);
    if (res.success) { toast.success("Quote sent"); setQuote(res.data); }
    else toast.error(res.error || "Failed to send quote");
  };

  const handleConvert = async () => {
    const res = await post(`/quotes/${id}/convert`);
    if (res.success) {
      toast.success("Quote converted to job");
      navigate(`/jobs/${res.data.job_id}`);
    } else toast.error(res.error || "Failed to convert quote");
  };

  const handleDelete = async () => {
    const res = await del(`/quotes/${id}`);
    if (res.success) { toast.success("Quote deleted"); navigate("/quotes"); }
  };

  if (!quote) return <Layout><div className="p-6 text-churvox-muted">Loading...</div></Layout>;

  const statusInfo = QUOTE_STATUSES.find((s) => s.value === quote.status);
  const pricingLabel = { fixed: "Fixed Price", hourly: "Hourly", fixed_extras: "Fixed + Extras", hourly_extras: "Hourly + Extras" }[quote.pricing_type] || "Fixed";

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4" data-testid="quote-detail-page">
        <div className="flex items-center justify-between">
          <button onClick={() => { window.location.href="/emergency-job.html"; }} className="flex items-center gap-2 text-churvox-muted hover:text-white" data-testid="back-to-quotes">
            <ArrowLeft size={18} /> Quotes
          </button>
          {isEmployer && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="border-churvox-border text-churvox-muted hover:text-white" data-testid="edit-quote-button">
                <Link to={`/quotes/${id}/edit`}><Edit size={14} className="mr-1" /> Edit</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowDelete(true)} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid="delete-quote-trigger">
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>

        {/* Quote Info */}
        <Card className="bg-churvox-card border-churvox-border" data-testid="quote-info-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-white">{quote.quote_number}</CardTitle>
              <span className={`px-3 py-1 rounded text-xs font-semibold uppercase text-white ${statusInfo?.color || "bg-slate-500"}`} data-testid="quote-status-badge">
                {statusInfo?.label || quote.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-churvox-muted">Customer: <span className="text-white">{quote.customer_name}</span></div>
              {quote.customer_email && <div className="flex items-center gap-2 text-churvox-muted"><Mail size={14} /> {quote.customer_email}</div>}
              {quote.address && <div className="flex items-center gap-2 text-churvox-muted col-span-2"><MapPin size={14} /> {quote.address}</div>}
              <div className="flex items-center gap-2 text-churvox-muted"><DollarSign size={14} /> {formatCurrency(quote.price)} <span className="text-xs text-churvox-accent">({pricingLabel})</span></div>
              {quote.valid_until && <div className="text-churvox-muted">Valid until: <span className="text-white">{formatDate(quote.valid_until)}</span></div>}
            </div>

            <div className="pt-3 border-t border-churvox-border">
              <p className="text-xs text-churvox-muted mb-1">Description</p>
              <p className="text-sm text-white">{quote.job_description}</p>
            </div>

            {quote.pricing_type && quote.pricing_type !== "fixed" && (
              <div className="pt-3 border-t border-churvox-border text-sm">
                {(quote.pricing_type === "hourly" || quote.pricing_type === "hourly_extras") && quote.hourly_rate > 0 && (
                  <p className="text-churvox-muted">Hourly rate: <span className="text-white">{formatCurrency(quote.hourly_rate)}/hr</span></p>
                )}
                {quote.extras && quote.extras.length > 0 && (
                  <div className="mt-1">
                    <p className="text-churvox-muted text-xs mb-1">Extras:</p>
                    {quote.extras.map((ex, i) => (
                      <p key={i} className="text-white text-xs ml-2">- {ex.description}: {formatCurrency(ex.amount)}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {quote.notes && (
              <div className="pt-3 border-t border-churvox-border">
                <p className="text-xs text-churvox-muted mb-1">Notes</p>
                <p className="text-sm text-white">{quote.notes}</p>
              </div>
            )}

            <p className="text-xs text-churvox-muted pt-2">Created {formatDate(quote.created_at)}</p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3" data-testid="quote-actions">
          {quote.status === "draft" && (
            <Button onClick={handleSend} disabled={loading} className="flex-1 bg-churvox-accent hover:bg-churvox-accent/90" data-testid="send-quote-button">
              <Send size={16} className="mr-2" /> Send Quote
            </Button>
          )}
          {(quote.status === "sent" || quote.status === "accepted") && !quote.converted_job_id && (
            <Button onClick={handleConvert} disabled={loading} className="flex-1 bg-emerald-500 hover:bg-emerald-600" data-testid="convert-to-job-button">
              <Briefcase size={16} className="mr-2" /> Convert to Job
            </Button>
          )}
          {quote.converted_job_id && (
            <Button asChild className="flex-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30">
              <Link to={`/jobs/${quote.converted_job_id}`} data-testid="view-linked-job"><Briefcase size={16} className="mr-2" /> View Job</Link>
            </Button>
          )}
        </div>

        {/* Delete Dialog */}
        <Dialog open={showDelete} onOpenChange={setShowDelete}>
          <DialogContent className="bg-churvox-card border-churvox-border" data-testid="delete-quote-dialog">
            <DialogHeader><DialogTitle className="text-white">Delete Quote</DialogTitle></DialogHeader>
            <p className="text-churvox-muted">Are you sure? This cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDelete(false)} className="border-churvox-border text-churvox-muted">Cancel</Button>
              <Button onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-quote">Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
