import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Edit, Trash2, MapPin, Mail, DollarSign, Send, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, QUOTE_STATUSES } from "../../lib/utils";

export default function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isEmployer } = useAuth();
  const { get, post, del, loading } = useApi();
  const [quote, setQuote] = useState(null);

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
    const confirmed = window.confirm("Delete this quote? This cannot be undone.");
    if (!confirmed) return;
    const res = await del(`/quotes/${id}`);
    if (res.success) { toast.success("Quote deleted"); navigate("/quotes"); }
  };

  if (!quote) return <Layout><div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" /></div></Layout>;

  const statusInfo = QUOTE_STATUSES.find((s) => s.value === quote.status);
  const pricingLabel = { fixed: "Fixed Price", hourly: "Hourly", fixed_extras: "Fixed + Extras", hourly_extras: "Hourly + Extras" }[quote.pricing_type] || "Fixed";

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4" data-testid="quote-detail-page">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/quotes")} className="flex items-center gap-2 text-slate-500 hover:text-slate-900" data-testid="back-to-quotes">
            <ArrowLeft size={18} /> Quotes
          </button>
          {isEmployer && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="border-slate-200 text-slate-500 hover:text-slate-900" data-testid="edit-quote-button">
                <Link to={`/quotes/${id}/edit`}><Edit size={14} className="mr-1" /> Edit</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleDelete} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid="delete-quote-trigger">
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>

        {/* Quote Info */}
        <Card className="bg-white border-slate-200" data-testid="quote-info-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-white">{quote.quote_number}</CardTitle>
              <span className={`px-3 py-1 rounded text-xs font-semibold uppercase text-slate-900 ${statusInfo?.color || "bg-slate-500"}`} data-testid="quote-status-badge">
                {statusInfo?.label || quote.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-slate-500">Customer: <span className="text-slate-900">{quote.customer_name}</span></div>
              {quote.customer_email && <div className="flex items-center gap-2 text-slate-500"><Mail size={14} /> {quote.customer_email}</div>}
              {quote.address && <div className="flex items-center gap-2 text-slate-500 col-span-2"><MapPin size={14} /> {quote.address}</div>}
              <div className="flex items-center gap-2 text-slate-500"><DollarSign size={14} /> {formatCurrency(quote.price)} <span className="text-xs text-blue-600">({pricingLabel})</span></div>
              {quote.valid_until && <div className="text-slate-500">Valid until: <span className="text-slate-900">{formatDate(quote.valid_until)}</span></div>}
            </div>

            <div className="pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Description</p>
              <p className="text-sm text-white">{quote.job_description}</p>
            </div>

            {quote.pricing_type && quote.pricing_type !== "fixed" && (
              <div className="pt-3 border-t border-slate-200 text-sm">
                {(quote.pricing_type === "hourly" || quote.pricing_type === "hourly_extras") && quote.hourly_rate > 0 && (
                  <p className="text-slate-500">Hourly rate: <span className="text-slate-900">{formatCurrency(quote.hourly_rate)}/hr</span></p>
                )}
                {quote.extras && quote.extras.length > 0 && (
                  <div className="mt-1">
                    <p className="text-slate-500 text-xs mb-1">Extras:</p>
                    {quote.extras.map((ex, i) => (
                      <p key={i} className="text-slate-700 text-xs ml-2">- {ex.description}: {formatCurrency(ex.amount)}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {quote.notes && (
              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Notes</p>
                <p className="text-sm text-white">{quote.notes}</p>
              </div>
            )}

            <p className="text-xs text-slate-500 pt-2">Created {formatDate(quote.created_at)}</p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3" data-testid="quote-actions">
          {quote.status === "draft" && (
            <Button onClick={handleSend} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" data-testid="send-quote-button">
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

      </div>
    </Layout>
  );
}
