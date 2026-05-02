import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { ArrowLeft, Edit, Trash2, MapPin, Mail, DollarSign, Send, Briefcase, Link2, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, QUOTE_STATUSES } from "../../lib/utils";
import { safeText } from "../../utils/safeRender";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "../../components/premium";

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
    if (res.success) {
      toast.success("Quote sent");
      await fetchQuote();
      if (res?.data?.public_quote_url) {
        try { await navigator.clipboard.writeText(res.data.public_quote_url); toast.success("Public quote link copied"); } catch (_) {}
      }
    }
    else toast.error(safeText(res.error, "Failed to send quote"));
  };

  const handleConvert = async () => {
    const res = await post(`/quotes/${id}/convert`);
    if (res.success) {
      toast.success("Quote converted to job");
      navigate(`/jobs/${res.data.job_id}`);
    } else toast.error(safeText(res.error, "Failed to convert quote"));
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this quote? This cannot be undone.");
    if (!confirmed) return;
    const res = await del(`/quotes/${id}`);
    if (res.success) { toast.success("Quote deleted"); navigate("/quotes"); }
  };

  if (!quote) return <Layout><div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#2563eb]" /></div></Layout>;

  const statusInfo = QUOTE_STATUSES.find((s) => s.value === quote.status);
  const pricingLabel = { fixed: "Fixed Price", hourly: "Hourly", fixed_extras: "Fixed + Extras", hourly_extras: "Hourly + Extras" }[quote.pricing_type] || "Fixed";

  return (
    <Layout>
      <PremiumPage maxWidth={960}>
        <button onClick={() => navigate("/quotes")} className="flex items-center gap-2 text-[#5b6c87] hover:text-[#0d1b34] text-sm font-semibold" data-testid="back-to-quotes">
          <ArrowLeft size={16} /> Back to quotes
        </button>

        <PremiumHero
          eyebrow="Quote"
          title={safeText(quote.quote_number, "Quote")}
          subtitle={`${safeText(quote.customer_name, "Customer")} • ${pricingLabel}`}
          icon={<FileSignature className="h-6 w-6" />}
          actions={
            isEmployer && (
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase text-white ${statusInfo?.color || "bg-slate-500"}`} data-testid="quote-status-badge">
                  {statusInfo?.label || quote.status}
                </span>
                <PremiumButton variant="secondary" size="sm" dataTestId="edit-quote-button" onClick={() => navigate(`/quotes/${id}/edit`)}>
                  <Edit size={14} className="mr-1" /> Edit
                </PremiumButton>
                <PremiumButton variant="danger" size="sm" onClick={handleDelete} dataTestId="delete-quote-trigger">
                  <Trash2 size={14} />
                </PremiumButton>
              </div>
            )
          }
        />

        <PremiumCard title="Quote details" icon={<FileSignature className="h-5 w-5" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-[#7d8ba3] mb-0.5">Customer</p>
              <p className="text-[#0d1b34] font-semibold">{quote.customer_name}</p>
            </div>
            {quote.customer_email && (
              <div>
                <p className="text-xs text-[#7d8ba3] mb-0.5">Email</p>
                <p className="text-[#1a2c4d] flex items-center gap-1.5"><Mail size={13} /> {quote.customer_email}</p>
              </div>
            )}
            {quote.address && (
              <div className="md:col-span-2">
                <p className="text-xs text-[#7d8ba3] mb-0.5">Address</p>
                <p className="text-[#1a2c4d] flex items-center gap-1.5"><MapPin size={13} /> {quote.address}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[#7d8ba3] mb-0.5">Total</p>
              <p className="text-[#0d1b34] font-bold text-lg flex items-center gap-1"><DollarSign size={16} className="text-[#2563eb]" /> {formatCurrency(quote.price)}</p>
            </div>
            {quote.valid_until && (
              <div>
                <p className="text-xs text-[#7d8ba3] mb-0.5">Valid until</p>
                <p className="text-[#0d1b34]">{formatDate(quote.valid_until)}</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[#e6eef9]">
            <p className="text-xs text-[#7d8ba3] mb-1">Description</p>
            <p className="text-sm text-[#1a2c4d] whitespace-pre-wrap">{safeText(quote.job_description, "No description")}</p>
          </div>

          {quote.pricing_type && quote.pricing_type !== "fixed" && (
            <div className="mt-4 pt-4 border-t border-[#e6eef9] text-sm">
              {(quote.pricing_type === "hourly" || quote.pricing_type === "hourly_extras") && quote.hourly_rate > 0 && (
                <p className="text-[#5b6c87]">Hourly rate: <span className="text-[#0d1b34] font-semibold">{formatCurrency(quote.hourly_rate)}/hr</span></p>
              )}
              {quote.extras && quote.extras.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-[#7d8ba3] mb-1">Extras</p>
                  {quote.extras.map((ex, i) => (
                    <p key={i} className="text-[#1a2c4d] text-xs ml-2">• {ex.description}: <strong>{formatCurrency(ex.amount)}</strong></p>
                  ))}
                </div>
              )}
            </div>
          )}

          {quote.notes && (
            <div className="mt-4 pt-4 border-t border-[#e6eef9]">
              <p className="text-xs text-[#7d8ba3] mb-1">Notes</p>
              <p className="text-sm text-[#1a2c4d]">{safeText(quote.notes)}</p>
            </div>
          )}

          <p className="text-xs text-[#7d8ba3] mt-4 pt-4 border-t border-[#e6eef9]">Created {formatDate(quote.created_at)}</p>
        </PremiumCard>

        <div className="flex gap-3 flex-wrap" data-testid="quote-actions">
          {quote.status === "draft" && (
            <PremiumButton onClick={handleSend} disabled={loading} dataTestId="send-quote-button" className="flex-1 min-w-[200px]">
              <Send size={16} className="mr-2" /> Send Quote
            </PremiumButton>
          )}
          {quote.status === "accepted" && !quote.converted_job_id && (
            <PremiumButton variant="success" onClick={handleConvert} disabled={loading} dataTestId="convert-to-job-button" className="flex-1 min-w-[200px]">
              <Briefcase size={16} className="mr-2" /> Convert to Job
            </PremiumButton>
          )}
          {quote.public_quote_url && (
            <PremiumButton variant="secondary" onClick={() => navigator.clipboard.writeText(quote.public_quote_url).then(() => toast.success("Public quote link copied"))} className="flex-1 min-w-[200px]">
              <Link2 size={16} className="mr-2" /> Copy Public Link
            </PremiumButton>
          )}
          {quote.converted_job_id && (
            <Link to={`/jobs/${quote.converted_job_id}`} data-testid="view-linked-job" className="flex-1 min-w-[200px]">
              <PremiumButton variant="success" className="w-full">
                <Briefcase size={16} className="mr-2" /> View Job
              </PremiumButton>
            </Link>
          )}
        </div>
      </PremiumPage>
    </Layout>
  );
}
