// CHURVOX_QUOTE_DETAIL_STABLE_ACTIONS_20260601
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { ArrowLeft, Edit, Trash2, MapPin, Mail, DollarSign, Send, Briefcase, Link2, FileSignature, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, QUOTE_STATUSES } from "../../lib/utils";
import { safeText } from "../../utils/safeRender";
import { confirmDialog } from "../../lib/confirmDialog";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "../../components/premium";
import { loadBusinessSettings } from "../../lib/businessSettings";

function quoteRecord(payload) {
  const data = payload?.data ?? payload;
  return data?.quote || data?.item || data?.record || data || {};
}

function quoteIdOf(value) {
  return String(value?.id || value?._id || value?.quote_id || "");
}

function amountOf(quote) {
  return Number(quote?.price || quote?.total || quote?.amount || 0) || 0;
}

function mailtoUrl(quote, biz) {
  const to = quote.customer_email || quote.client_email || "";
  const subject = `Quote ${quote.quote_number || "from Churvox"}`;
  const body = `Hi ${quote.customer_name || "there"},\n\nYour quote is ready for review.\n\nQuote: ${quote.quote_number || ""}\nTotal: ${formatCurrency(amountOf(quote))}\nValid until: ${quote.valid_until ? formatDate(quote.valid_until) : "not set"}\n\n${quote.job_description || quote.description || ""}\n\nThanks,\n${biz.business_name || "Churvox"}`;
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isEmployer } = useAuth();
  const { get, post, patch, del, loading } = useApi();
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState("");

  const fetchQuote = useCallback(async () => {
    const res = await get(`/quotes/${encodeURIComponent(id)}`);
    if (res.success) setQuote(quoteRecord(res));
    else navigate("/quotes");
  }, [get, id, navigate]);

  useEffect(() => { fetchQuote(); }, [fetchQuote]);

  const status = String(quote?.status || "draft").toLowerCase();
  const statusInfo = useMemo(() => QUOTE_STATUSES.find((s) => s.value === status), [status]);
  const pricingLabel = { fixed: "Fixed Price", hourly: "Hourly", fixed_extras: "Fixed + Extras", hourly_extras: "Hourly + Extras" }[quote?.pricing_type] || "Fixed";
  const lineItems = Array.isArray(quote?.line_items) && quote.line_items.length ? quote.line_items : [];

  async function patchQuote(label, payload, message = "Quote updated") {
    setBusy(label);
    const res = await patch(`/quotes/${encodeURIComponent(id)}`, { ...payload, updated_at: new Date().toISOString() });
    setBusy("");
    if (res.success) {
      toast.success(message);
      await fetchQuote();
      return true;
    }
    toast.error(safeText(res.error, "Quote action failed"));
    return false;
  }

  const handleSend = async () => {
    if (!quote?.customer_email && !quote?.client_email) return toast.error("Add a customer email before sending this quote");
    const biz = quote.business_snapshot || loadBusinessSettings();
    window.location.href = mailtoUrl(quote, biz);
    await patchQuote("send", { status: "sent", sent_at: new Date().toISOString(), sent_via: "external_email_client" }, "Email opened and quote marked sent");
  };

  const handleAccept = async () => {
    await patchQuote("accept", { status: "accepted", accepted_at: new Date().toISOString() }, "Quote accepted");
  };

  const handleDecline = async () => {
    const reason = window.prompt("Reason for declining this quote?", "Declined by owner/customer");
    if (reason === null) return;
    await patchQuote("decline", { status: "declined", declined_at: new Date().toISOString(), declined_reason: reason }, "Quote declined");
  };

  const handleConvert = async () => {
    if (!quote) return;
    setBusy("convert");
    const jobPayload = {
      title: quote.job_description || quote.description || quote.customer_name || "Quoted job",
      job_name: quote.job_description || quote.description || "Quoted job",
      client_id: quote.client_id || null,
      client_name: quote.client_name || quote.customer_name,
      customer_name: quote.customer_name,
      customer_email: quote.customer_email,
      customer_phone: quote.customer_phone,
      address: quote.address || quote.site_address,
      site_address: quote.site_address || quote.address,
      notes: quote.notes || quote.job_description || quote.description || "",
      description: quote.job_description || quote.description || "",
      quote_id: quoteIdOf(quote) || id,
      linked_quote_id: quoteIdOf(quote) || id,
      status: "assigned",
      pricing_type: quote.pricing_type || "fixed",
      fixed_price: amountOf(quote),
      price: amountOf(quote),
      total: amountOf(quote),
      line_items: quote.line_items || [],
    };
    const jobRes = await post("/jobs", jobPayload);
    if (!jobRes.success) {
      setBusy("");
      toast.error(jobRes.error || "Could not create job from quote");
      return;
    }
    const created = jobRes.data?.job || jobRes.data?.item || jobRes.data || {};
    const jobId = created.id || created._id || jobRes.data?.id || jobRes.data?._id;
    await patch(`/quotes/${encodeURIComponent(id)}`, { status: "converted", converted_job_id: jobId, converted_at: new Date().toISOString() });
    setBusy("");
    toast.success("Quote converted to job");
    navigate(jobId ? `/jobs/${jobId}` : "/jobs");
  };

  const handleDelete = async () => {
    const confirmed = await confirmDialog({ title: "Delete this quote?", message: "This cannot be undone.", danger: true, confirmLabel: "Delete" });
    if (!confirmed) return;
    const res = await del(`/quotes/${encodeURIComponent(id)}`);
    if (res.success) { toast.success("Quote deleted"); navigate("/quotes"); }
    else toast.error(res.error || "Could not delete quote");
  };

  async function copyPublicLink() {
    const link = quote?.public_quote_url || (quote?.public_token ? `${window.location.origin}/public/quote/${quote.public_token}` : "");
    if (!link) return toast.error("No public quote link yet");
    await navigator.clipboard.writeText(link);
    toast.success("Public quote link copied");
  }

  if (!quote) return <Layout><div className="p-6 flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-300" /></div></Layout>;

  return (
    <Layout>
      <PremiumPage maxWidth={980}>
        <button onClick={() => navigate("/quotes")} className="mb-3 flex items-center gap-2 text-slate-300 hover:text-white text-sm font-black" data-testid="back-to-quotes">
          <ArrowLeft size={16} /> Back to quotes
        </button>

        <PremiumHero
          eyebrow="Quote Work Slip"
          title={safeText(quote.quote_number, "Quote")}
          subtitle={`${safeText(quote.customer_name, "Customer")} • ${pricingLabel} • ${formatCurrency(amountOf(quote))}`}
          icon={<FileSignature className="h-6 w-6" />}
          actions={isEmployer && <div className="flex items-center gap-2"><span className={`px-3 py-1 rounded-full text-xs font-bold uppercase text-white ${statusInfo?.color || "bg-slate-500"}`} data-testid="quote-status-badge">{statusInfo?.label || quote.status || "draft"}</span><PremiumButton variant="secondary" size="sm" dataTestId="edit-quote-button" onClick={() => navigate(`/quotes/${id}/edit`)}><Edit size={14} className="mr-1" /> Edit</PremiumButton><PremiumButton variant="danger" size="sm" onClick={handleDelete} dataTestId="delete-quote-trigger"><Trash2 size={14} /></PremiumButton></div>}
        />

        <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-5">
            <PremiumCard title="Quote details" icon={<FileSignature className="h-5 w-5" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-slate-400 mb-0.5">Customer</p><p className="text-white font-semibold">{quote.customer_name}</p></div>
                {quote.customer_email ? <div><p className="text-xs text-slate-400 mb-0.5">Email</p><p className="text-slate-200 flex items-center gap-1.5"><Mail size={13} /> {quote.customer_email}</p></div> : null}
                {quote.address ? <div className="md:col-span-2"><p className="text-xs text-slate-400 mb-0.5">Address</p><p className="text-slate-200 flex items-center gap-1.5"><MapPin size={13} /> {quote.address}</p></div> : null}
                <div><p className="text-xs text-slate-400 mb-0.5">Total</p><p className="text-white font-bold text-lg flex items-center gap-1"><DollarSign size={16} className="text-cyan-300" /> {formatCurrency(amountOf(quote))}</p></div>
                {quote.valid_until ? <div><p className="text-xs text-slate-400 mb-0.5">Valid until</p><p className="text-white">{formatDate(quote.valid_until)}</p></div> : null}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700"><p className="text-xs text-slate-400 mb-1">Description</p><p className="text-sm text-slate-200 whitespace-pre-wrap">{safeText(quote.job_description || quote.description, "No description")}</p></div>
              {quote.notes ? <div className="mt-4 pt-4 border-t border-slate-700"><p className="text-xs text-slate-400 mb-1">Notes</p><p className="text-sm text-slate-200">{safeText(quote.notes)}</p></div> : null}
              <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-700">Created {formatDate(quote.created_at)}</p>
            </PremiumCard>

            {lineItems.length ? <PremiumCard title="Line items"><div className="grid gap-2">{lineItems.map((line, index) => <div key={index} className="grid grid-cols-[1fr_80px_100px] gap-3 rounded-2xl border border-slate-700 bg-slate-950/50 p-3 text-sm"><b className="text-white">{line.description || "Item"}</b><span className="text-right text-slate-300">{line.quantity || line.qty || 1}</span><span className="text-right font-black text-lime-300">{formatCurrency(line.amount || (Number(line.rate || line.unit_price || 0) * Number(line.quantity || line.qty || 1)))}</span></div>)}</div></PremiumCard> : null}
          </div>

          <aside className="space-y-4">
            <PremiumCard title="Quote actions">
              <div className="grid gap-3" data-testid="quote-actions">
                {status === "draft" || status === "sent" ? <PremiumButton onClick={handleSend} disabled={loading || Boolean(busy)} dataTestId="send-quote-button"><Send size={16} className="mr-2" /> Open email + mark sent</PremiumButton> : null}
                {!["accepted", "converted", "declined"].includes(status) ? <PremiumButton variant="success" onClick={handleAccept} disabled={Boolean(busy)}><CheckCircle2 size={16} className="mr-2" /> Mark accepted</PremiumButton> : null}
                {!["declined", "converted"].includes(status) ? <PremiumButton variant="secondary" onClick={handleDecline} disabled={Boolean(busy)}><XCircle size={16} className="mr-2" /> Mark declined</PremiumButton> : null}
                {["accepted", "sent", "draft"].includes(status) && !quote.converted_job_id ? <PremiumButton variant="success" onClick={handleConvert} disabled={Boolean(busy)} dataTestId="convert-to-job-button"><Briefcase size={16} className="mr-2" /> Convert to Job</PremiumButton> : null}
                {(quote.public_quote_url || quote.public_token) ? <PremiumButton variant="secondary" onClick={copyPublicLink}><Link2 size={16} className="mr-2" /> Copy Public Link</PremiumButton> : null}
                {quote.converted_job_id ? <Link to={`/jobs/${quote.converted_job_id}`} data-testid="view-linked-job"><PremiumButton variant="success" className="w-full"><Briefcase size={16} className="mr-2" /> View Job</PremiumButton></Link> : null}
                <Link to={`/invoices/new?quote_id=${id}`}><PremiumButton variant="secondary" className="w-full">Create invoice from quote</PremiumButton></Link>
              </div>
            </PremiumCard>
          </aside>
        </section>
      </PremiumPage>
    </Layout>
  );
}
