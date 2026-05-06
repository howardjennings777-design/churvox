import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import useAiDraft from "@/hooks/useAiDraft";
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2, FileText, Send,
  CheckCircle2, Clock3, CircleDashed, XCircle, Wallet, ArrowRight, Briefcase,
  ClipboardCheck, Sparkles, FileSignature, Filter, SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/utils";
import Layout from "@/components/Layout";
import {
  PremiumPage, PremiumHero, PremiumCard, PremiumStatCard, PremiumButton,
  PremiumAIBox, PremiumAIDraftPanel, PremiumEmptyState, PremiumStatusBadge,
} from "@/components/premium";
import EntityDetailModal from "@/components/EntityDetailModal";

const safeArray = (v) => (Array.isArray(v) ? v : []);
const safeText = (v, f = "—") => { if (v == null) return f; const t = String(v).trim(); return t || f; };
const safeNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

export default function QuotesPage() {
  const navigate = useNavigate();
  const { get, del, post, loading } = useApi();
  const [quotes, setQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [deleteId, setDeleteId] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [activeQuote, setActiveQuote] = useState(null);
  const { loading: aiLoading, draft, llmAvailable, setDraft, generate } = useAiDraft("quotes");

  useEffect(() => { loadQuotes(); }, []);

  const loadQuotes = async () => {
    const result = await get("/quotes");
    if (result.success) setQuotes(safeArray(result.data));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await del(`/quotes/${deleteId}`);
    if (result.success) {
      toast.success("Quote deleted");
      setQuotes((prev) => prev.filter((q) => q.id !== deleteId));
    } else { toast.error(result.error); }
    setDeleteId(null);
  };

  const handleSendQuote = async (quoteId) => {
    const result = await post(`/quotes/${quoteId}/send`);
    if (result.success) { toast.success("Quote marked as sent"); loadQuotes(); }
    else toast.error(result.error);
  };

  const handleConvertToJob = async (quoteId) => {
    const result = await post(`/quotes/${quoteId}/convert`);
    if (result.success) { toast.success("Quote converted to job"); loadQuotes(); }
    else toast.error(result.error || "Unable to convert quote right now");
  };

  const quoteMetrics = useMemo(() => {
    const arr = safeArray(quotes);
    const totalValue = arr.reduce((s, q) => s + safeNumber(q.price ?? q.total), 0);
    return {
      total: arr.length,
      drafts: arr.filter((q) => String(q.status || "").toLowerCase() === "draft").length,
      sentPending: arr.filter((q) => ["sent", "pending"].includes(String(q.status || "").toLowerCase())).length,
      accepted: arr.filter((q) => String(q.status || "").toLowerCase() === "accepted").length,
      totalValue,
    };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return safeArray(quotes)
      .filter((q) => {
        const status = String(q.status || "").toLowerCase();
        const pool = [q.customer_name, q.job_description, q.quote_number, q.status, q.title].filter(Boolean).join(" ").toLowerCase();
        const ms = !query || pool.includes(query);
        const mst = statusFilter === "all" || status === statusFilter;
        return ms && mst;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        if (sortBy === "highest") return safeNumber(b.price ?? b.total) - safeNumber(a.price ?? a.total);
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [quotes, searchTerm, statusFilter, sortBy]);

  const aiSuggestions = useMemo(() => {
    const out = [];
    const stale = quotes.filter((q) => {
      const status = String(q.status || "").toLowerCase();
      if (!["sent", "pending"].includes(status)) return false;
      const created = new Date(q.created_at || q.sent_at || 0).getTime();
      return created && (Date.now() - created) > 5 * 24 * 60 * 60 * 1000;
    });
    if (stale.length > 0) {
      out.push({
        icon: <Clock3 className="h-4 w-4" />,
        title: `${stale.length} quote${stale.length === 1 ? "" : "s"} sent over 5 days ago`,
        description: "Draft a polite follow-up message — review before sending.",
      });
    }
    if (quoteMetrics.accepted > 0) {
      out.push({
        icon: <Briefcase className="h-4 w-4" />,
        title: `${quoteMetrics.accepted} accepted quote${quoteMetrics.accepted === 1 ? "" : "s"} ready to convert`,
        description: "Convert accepted quotes into scheduled jobs for the crew.",
      });
    }
    if (quoteMetrics.drafts > 0) {
      out.push({
        icon: <FileSignature className="h-4 w-4" />,
        title: `${quoteMetrics.drafts} draft quote${quoteMetrics.drafts === 1 ? "" : "s"} unsent`,
        description: "Finalise and send drafts so customers can accept online.",
      });
    }
    if (out.length === 0) {
      out.push({ icon: <Sparkles className="h-4 w-4" />, title: "No urgent quote follow-ups", description: "AI checked and will surface stale quotes and accepted ones here." });
    }
    return out.slice(0, 4);
  }, [quotes, quoteMetrics]);

  return (
    <Layout>
      <PremiumPage>
        <PremiumHero
          icon={<FileText className="h-7 w-7" />}
          eyebrow={<><FileSignature className="h-3 w-3" /> Sales</>}
          title="Quotes"
          subtitle="Polished quote documents with public links, accept / decline tracking and one-click conversion to jobs."
          actions={
            <>
              <PremiumButton onClick={() => navigate("/quotes/new")} iconLeft={<Plus className="h-4 w-4" />} dataTestId="add-quote-button">New quote</PremiumButton>
              <PremiumButton variant="secondary" onClick={() => setStatusFilter("accepted")} iconLeft={<ClipboardCheck className="h-4 w-4" />}>View accepted</PremiumButton>
            </>
          }
        />

        <PremiumAIBox
          title="AI Quote Assistant"
          subtitle="AI checked live data and checks draft, sent, and accepted quotes then prepares the best conversion or follow-up action"
          chip="Approval-first"
          suggestions={aiSuggestions}
        >
          <div className="mt-2 flex gap-2 flex-wrap">
            <PremiumButton size="sm" onClick={() => generate("Generate quote follow-up draft")} disabled={aiLoading}>Generate quote follow-up</PremiumButton>
            {draft ? <PremiumButton size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(draft)}>Copy draft</PremiumButton> : null}
            {draft ? <PremiumButton size="sm" variant="ghost" onClick={() => setDraft("")}>Clear</PremiumButton> : null}
          </div>
          {draft ? <div className="mt-2 rounded-xl border border-[#d8e3f3] bg-[#f6faff] p-3 whitespace-pre-wrap text-[13px]">{draft}</div> : null}
          {!llmAvailable ? <p className="mt-2 text-[11.5px] text-[#b45309]">Fallback draft — connect AI key for live AI.</p> : null}
        </PremiumAIBox>

        <PremiumAIDraftPanel title="AI Quote Drafts" subtitle="Follow-ups and pending quote summaries." surface="quotes" context={{ quotes: filteredQuotes?.slice?.(0,12)?.map?.((q)=>({title:q.title,status:q.status,client:q.client_name})) }} quickActions={[{ label: "Quote follow-up", prompt: "Draft a concise quote follow-up." },{ label: "Owner summary", prompt: "Summarise pending quotes and suggested actions." }]} />

        <div className="px-grid px-grid--4">
          <PremiumStatCard label="Total quotes" value={quoteMetrics.total} icon={<FileText className="h-4 w-4" />} onClick={() => setStatusFilter("all")} />
          <PremiumStatCard label="Draft" value={quoteMetrics.drafts} icon={<CircleDashed className="h-4 w-4" />} tone="amber" onClick={() => setStatusFilter("draft")} />
          <PremiumStatCard label="Sent / pending" value={quoteMetrics.sentPending} icon={<Clock3 className="h-4 w-4" />} tone="sky" onClick={() => setStatusFilter("sent")} />
          <PremiumStatCard label="Accepted" value={quoteMetrics.accepted} icon={<CheckCircle2 className="h-4 w-4" />} tone="teal" onClick={() => setStatusFilter("accepted")} />
        </div>

        <PremiumCard title="Quote workflow" subtitle="From first draft to booked work" icon={<ArrowRight className="h-4 w-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {["Draft", "Send", "Accept", "Convert to job"].map((step, idx) => (
              <div key={step} className="rounded-2xl border border-[#e6eef9] bg-[#f6faff] px-3 py-2.5 text-[13px] text-[#1a2c4d] flex items-center justify-between font-semibold">
                <span>{idx + 1}. {step}</span>
                {idx < 3 ? <ArrowRight className="h-4 w-4 text-[#94a3b8]" /> : <Briefcase className="h-4 w-4 text-[#0d9488]" />}
              </div>
            ))}
          </div>
        </PremiumCard>

        <PremiumCard noBody>
          <div className="px-card__body grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d8ba3]" />
              <input
                placeholder="Search by client, title, number…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-input pl-10"
                data-testid="quote-search-input"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d8ba3] pointer-events-none" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-select pl-9" data-testid="quote-status-filter">
                <option value="all">All status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="relative">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7d8ba3] pointer-events-none" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-select pl-9">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest value</option>
              </select>
            </div>
          </div>
        </PremiumCard>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-[#1d4ed8]" /></div>
        ) : filteredQuotes.length === 0 ? (
          <PremiumEmptyState
            icon={<FileText className="h-6 w-6" />}
            title="No quotes match these filters"
            subtitle="Try a different search or status — or create a new quote to get started."
            action={<div className="flex gap-2 justify-center flex-wrap">
              <PremiumButton onClick={() => navigate("/quotes/new")} iconLeft={<Plus className="h-4 w-4" />} dataTestId="add-first-quote-button">New quote</PremiumButton>
              <PremiumButton variant="secondary" onClick={() => navigate("/clients/new")}>Add client</PremiumButton>
            </div>}
          />
        ) : (
          <div className="space-y-3">
            {filteredQuotes.map((quote) => {
              const status = String(quote.status || "draft").toLowerCase();
              return (
                <div key={quote.id} className="px-card px-card--hover" data-testid={`quote-card-${quote.id}`}>
                  <div className="px-card__body">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                      <button type="button" onClick={() => setActiveQuote(quote)} className="flex-1 min-w-0 group text-left">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[15.5px] font-bold text-[#0d1b34] group-hover:text-[#1d4ed8] transition" data-testid={`quote-number-${quote.id}`}>
                            {safeText(quote.title || quote.quote_number, "Untitled quote")}
                          </span>
                          <PremiumStatusBadge status={status} />
                          {(status === "declined" || status === "expired") && <XCircle className="h-4 w-4 text-[#dc2626]" />}
                        </div>
                        <p className="text-[13.5px] text-[#1a2c4d] font-semibold">{safeText(quote.customer_name, "Unknown client")}</p>
                        <p className="text-[12.5px] text-[#5b6c87] line-clamp-2 mt-1">{safeText(quote.job_description, "No quote notes added yet.")}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#7d8ba3]">
                          <span>Created {formatDate(quote.created_at) || "—"}</span>
                          {(quote.sent_at || quote.updated_at) && <span>Sent {formatDate(quote.sent_at || quote.updated_at)}</span>}
                          {quote.expires_at && <span>Expires {formatDate(quote.expires_at)}</span>}
                        </div>
                      </button>

                      <div className="flex flex-col sm:items-end gap-2">
                        <span className="text-[24px] font-heading font-bold text-[#0d1b34]">{formatCurrency(quote.price ?? quote.total)}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <PremiumButton size="sm" variant="secondary" onClick={() => setActiveQuote(quote)}>Open</PremiumButton>
                          {status === "draft" && (
                            <PremiumButton size="sm" onClick={() => handleSendQuote(quote.id)} iconLeft={<Send className="h-3.5 w-3.5" />} dataTestId={`send-quote-${quote.id}`}>Send</PremiumButton>
                          )}
                          {status === "accepted" && (
                            <PremiumButton size="sm" variant="success" onClick={() => handleConvertToJob(quote.id)} iconLeft={<Briefcase className="h-3.5 w-3.5" />}>Convert to job</PremiumButton>
                          )}
                          <div className="relative">
                            <button className="px-btn px-btn--ghost px-btn--sm" onClick={() => setOpenMenu(openMenu === quote.id ? null : quote.id)} data-testid={`quote-menu-${quote.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {openMenu === quote.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                                <div className="absolute right-0 mt-1 w-44 bg-white border border-[#d8e3f3] rounded-xl shadow-lg z-20 overflow-hidden">
                                  <button type="button" className="block w-full text-left px-3 py-2 text-[13px] text-[#0d1b34] hover:bg-[#eff4ff]" onClick={() => { setOpenMenu(null); setActiveQuote(quote); }}>View details</button>
                                  <Link to={`/quotes/${quote.id}/edit`} className="block px-3 py-2 text-[13px] text-[#0d1b34] hover:bg-[#eff4ff]" data-testid={`edit-quote-${quote.id}`}>
                                    <Pencil className="h-3.5 w-3.5 inline mr-1.5" />Edit
                                  </Link>
                                  <button onClick={() => { setOpenMenu(null); setDeleteId(quote.id); }} className="block w-full text-left px-3 py-2 text-[13px] text-[#dc2626] hover:bg-[#fff5f5]" data-testid={`delete-quote-${quote.id}`}>
                                    <Trash2 className="h-3.5 w-3.5 inline mr-1.5" />Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!!deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="delete-quote-dialog">
            <div className="absolute inset-0 bg-[#0d1b34]/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
            <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-[#d8e3f3] bg-white p-6 shadow-2xl">
              <h2 className="font-heading text-lg font-bold text-[#0d1b34]">Delete quote</h2>
              <p className="mt-2 text-[13.5px] text-[#5b6c87]">Are you sure you want to delete this quote? This cannot be undone.</p>
              <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <PremiumButton variant="secondary" onClick={() => setDeleteId(null)}>Cancel</PremiumButton>
                <PremiumButton variant="danger" onClick={handleDelete} disabled={loading} dataTestId="confirm-delete-quote">{loading ? "Deleting…" : "Delete"}</PremiumButton>
              </div>
            </div>
          </div>
        )}
      <EntityDetailModal open={Boolean(activeQuote)} onClose={() => setActiveQuote(null)} title={activeQuote ? `Quote details · ${activeQuote.title || activeQuote.id}` : "Quote details"} entityType="quote" item={activeQuote} />
      </PremiumPage>
    </Layout>
  );
}
