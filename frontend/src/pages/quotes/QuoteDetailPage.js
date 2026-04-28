import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Edit, Trash2, MapPin, Mail, Send, Briefcase, Link2, ExternalLink, Printer, FileText, CheckCircle2, XCircle, CalendarDays, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, QUOTE_STATUSES } from "../../lib/utils";
import { safeText } from "../../utils/safeRender";

function copyText(value, message) {
  if (!value) return;
  navigator.clipboard.writeText(value).then(() => toast.success(message || "Copied"));
}

function statusTone(status) {
  const value = String(status || "draft").toLowerCase();
  if (value === "accepted") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (value === "declined" || value === "expired") return "bg-red-50 text-red-700 ring-red-200";
  if (value === "sent") return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function Metric({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-950",
    blue: "border-blue-100 bg-blue-50 text-blue-800",
    green: "border-emerald-100 bg-emerald-50 text-emerald-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    red: "border-red-100 bg-red-50 text-red-800",
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] opacity-70">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}

function ActionState({ status, converted }) {
  const value = String(status || "draft").toLowerCase();
  if (converted) {
    return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800"><CheckCircle2 className="mr-2 inline h-5 w-5" />Converted to job</div>;
  }
  if (value === "accepted") {
    return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800"><CheckCircle2 className="mr-2 inline h-5 w-5" />Customer accepted this quote</div>;
  }
  if (value === "declined") {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800"><XCircle className="mr-2 inline h-5 w-5" />Customer declined this quote</div>;
  }
  return <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-800"><Sparkles className="mr-2 inline h-5 w-5" />Ready for customer review</div>;
}

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
      if (res?.data?.public_quote_url) copyText(res.data.public_quote_url, "Public quote link copied");
    } else toast.error(safeText(res.error, "Failed to send quote"));
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

  const quoteTotal = useMemo(() => Number(quote?.price || quote?.total || quote?.subtotal || 0), [quote]);
  const extrasTotal = useMemo(() => (Array.isArray(quote?.extras) ? quote.extras : []).reduce((sum, ex) => sum + Number(ex.amount || ex.price || ex.total || 0), 0), [quote]);

  if (!quote) return <Layout><div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" /></div></Layout>;

  const statusInfo = QUOTE_STATUSES.find((s) => s.value === quote.status);
  const pricingLabel = { fixed: "Fixed Price", hourly: "Hourly", fixed_extras: "Fixed + Extras", hourly_extras: "Hourly + Extras" }[quote.pricing_type] || "Fixed";
  const publicUrl = quote.public_quote_url || (quote.public_token ? `${window.location.origin}/public/quote/${quote.public_token}` : "");
  const accepted = String(quote.status || "").toLowerCase() === "accepted";
  const converted = Boolean(quote.converted_job_id || quote.job_id);
  const linkedJobId = quote.converted_job_id || quote.job_id;

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6" data-testid="quote-detail-page">
        <section className="overflow-hidden rounded-3xl border border-slate-900/20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <button onClick={() => navigate("/quotes")} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-200 hover:text-white" data-testid="back-to-quotes">
                <ArrowLeft size={18} /> Back to quotes
              </button>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Quote command centre</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{safeText(quote.quote_number, "Quote")}</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-300">Send, share, convert, track customer decision, and move accepted work into jobs.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide ring-1 ${statusTone(quote.status)}`} data-testid="quote-status-badge">
                {statusInfo?.label || quote.status}
              </span>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15"><Printer size={14} className="mr-1" /> Print</Button>
              {isEmployer && <Button asChild variant="outline" size="sm" className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15" data-testid="edit-quote-button"><Link to={`/quotes/${id}/edit`}><Edit size={14} className="mr-1" /> Edit</Link></Button>}
              {isEmployer && <Button variant="outline" size="sm" onClick={handleDelete} className="rounded-full border-red-300/30 bg-red-500/10 text-red-100 hover:bg-red-500/20" data-testid="delete-quote-trigger"><Trash2 size={14} className="mr-1" /> Delete</Button>}
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Quote total" value={formatCurrency(quoteTotal)} tone="blue" />
          <Metric label="Pricing" value={pricingLabel} />
          <Metric label="Status" value={statusInfo?.label || quote.status} tone={accepted ? "green" : String(quote.status) === "declined" ? "red" : "blue"} />
          <Metric label="Extras" value={formatCurrency(extrasTotal)} tone={extrasTotal > 0 ? "amber" : "slate"} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <Card className="border-slate-200 bg-white shadow-sm" data-testid="quote-info-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Customer quote</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{safeText(quote.customer_name, "Customer")}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1 ${statusTone(quote.status)}`}>{statusInfo?.label || quote.status}</span>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Customer</p>
                  <p className="mt-2 font-black text-slate-950">{quote.customer_name}</p>
                  {quote.customer_email && <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-600"><Mail size={13} /> {quote.customer_email}</p>}
                  {quote.address && <p className="mt-1 flex items-start gap-1 text-sm font-semibold text-slate-600"><MapPin size={13} className="mt-1 shrink-0" /> {quote.address}</p>}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Timeline</p>
                  <p className="mt-2 flex items-center gap-1 font-black text-slate-950"><CalendarDays size={14} /> Created {formatDate(quote.created_at)}</p>
                  {quote.valid_until && <p className="mt-1 text-sm font-bold text-blue-700">Valid until {formatDate(quote.valid_until)}</p>}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-black text-slate-950"><FileText size={16} /> Work description</p>
                <pre className="whitespace-pre-wrap font-sans text-sm font-semibold leading-6 text-slate-700">{safeText(quote.job_description, "No description")}</pre>
              </div>

              {(quote.pricing_type && quote.pricing_type !== "fixed") || (quote.extras && quote.extras.length > 0) ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  {(quote.pricing_type === "hourly" || quote.pricing_type === "hourly_extras") && quote.hourly_rate > 0 && (
                    <div className="flex items-center justify-between text-slate-600"><span>Hourly rate</span><span className="font-black text-slate-950">{formatCurrency(quote.hourly_rate)}/hr</span></div>
                  )}
                  {quote.extras && quote.extras.map((ex, i) => (
                    <div key={i} className="mt-2 flex items-center justify-between text-slate-600"><span>{ex.description}</span><span className="font-black text-slate-950">{formatCurrency(ex.amount)}</span></div>
                  ))}
                </div>
              ) : null}

              {quote.notes && <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Notes</p><p className="mt-2 text-sm font-semibold text-slate-700">{safeText(quote.notes)}</p></div>}
            </CardContent>
          </Card>

          <aside className="space-y-4 rounded-[2rem] bg-slate-100/80 p-3 shadow-inner shadow-slate-200/70" style={{ backgroundColor: "rgba(241,245,249,0.82)" }}>
            <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
              <CardContent className="space-y-3 p-5">
                <p className="text-sm font-black text-slate-950">Quote actions</p>
                <ActionState status={quote.status} converted={converted} />
                {quote.status === "draft" && <Button onClick={handleSend} disabled={loading} className="h-11 w-full rounded-2xl bg-blue-600 font-black text-white hover:bg-blue-700" data-testid="send-quote-button"><Send size={16} className="mr-2" /> Send Quote</Button>}
                {accepted && !converted && <Button onClick={handleConvert} disabled={loading} className="h-11 w-full rounded-2xl bg-emerald-600 font-black text-white hover:bg-emerald-700" data-testid="convert-to-job-button"><Briefcase size={16} className="mr-2" /> Convert to Job</Button>}
                {linkedJobId && <Button asChild className="h-11 w-full rounded-2xl bg-emerald-600 font-black text-white hover:bg-emerald-700"><Link to={`/jobs/${linkedJobId}`} data-testid="view-linked-job"><Briefcase size={16} className="mr-2" /> View Job</Link></Button>}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
              <CardContent className="space-y-3 p-5">
                <p className="text-sm font-black text-slate-950">Customer link</p>
                {publicUrl ? <Button variant="outline" onClick={() => copyText(publicUrl, "Public quote link copied")} className="h-11 w-full rounded-2xl bg-white font-black"><Link2 size={16} className="mr-2" /> Copy quote link</Button> : <p className="text-sm font-semibold text-amber-700">Send the quote to create a public customer link.</p>}
                {publicUrl ? <Button asChild variant="outline" className="h-11 w-full rounded-2xl bg-white font-black"><a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} className="mr-2" /> Open customer quote</a></Button> : null}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
              <CardContent className="p-5">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Quote total</p>
                <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{formatCurrency(quoteTotal)}</p>
                <p className="mt-2 text-sm font-semibold text-slate-500">{pricingLabel}</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
