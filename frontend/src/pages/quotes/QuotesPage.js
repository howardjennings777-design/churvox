import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Send,
  Filter,
  CheckCircle2,
  Clock3,
  CircleDashed,
  XCircle,
  Wallet,
  ArrowRight,
  Briefcase,
  ClipboardCheck,
  SlidersHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate, formatCurrency, QUOTE_STATUSES } from "@/lib/utils";
import Layout from "@/components/Layout";

const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeText = (value, fallback = "—") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};
const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const statusMeta = {
  draft: { label: "Draft", className: "cx-status-badge--slate" },
  sent: { label: "Sent", className: "cx-status-badge--blue" },
  pending: { label: "Pending", className: "cx-status-badge--amber" },
  accepted: { label: "Accepted", className: "cx-status-badge--green" },
  declined: { label: "Declined", className: "cx-status-badge--red" },
  expired: { label: "Expired", className: "cx-status-badge--red" },
};

export default function QuotesPage() {
  const { get, del, post, loading } = useApi();
  const [quotes, setQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    const result = await get("/quotes");
    if (result.success) {
      setQuotes(safeArray(result.data));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await del(`/quotes/${deleteId}`);
    if (result.success) {
      toast.success("Quote deleted successfully");
      setQuotes((prev) => prev.filter((q) => q.id !== deleteId));
    } else {
      toast.error(result.error);
    }
    setDeleteId(null);
  };

  const handleSendQuote = async (quoteId) => {
    const result = await post(`/quotes/${quoteId}/send`);
    if (result.success) {
      toast.success("Quote marked as sent");
      loadQuotes();
    } else {
      toast.error(result.error);
    }
  };

  const handleConvertToJob = async (quoteId) => {
    const result = await post(`/quotes/${quoteId}/convert`);
    if (result.success) {
      toast.success("Quote converted to job");
      loadQuotes();
    } else {
      toast.error(result.error || "Unable to convert quote right now");
    }
  };

  const quoteMetrics = useMemo(() => {
    const safeQuotes = safeArray(quotes);
    const totalValue = safeQuotes.reduce((sum, quote) => sum + safeNumber(quote.price ?? quote.total), 0);

    return {
      total: safeQuotes.length,
      drafts: safeQuotes.filter((q) => String(q.status || "").toLowerCase() === "draft").length,
      sentPending: safeQuotes.filter((q) => ["sent", "pending"].includes(String(q.status || "").toLowerCase())).length,
      accepted: safeQuotes.filter((q) => String(q.status || "").toLowerCase() === "accepted").length,
      declinedExpired: safeQuotes.filter((q) => ["declined", "expired"].includes(String(q.status || "").toLowerCase())).length,
      totalValue,
    };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return safeArray(quotes)
      .filter((quote) => {
        const status = String(quote.status || "").toLowerCase();
        const pool = [
          quote.customer_name,
          quote.job_description,
          quote.quote_number,
          quote.status,
          quote.title,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !query || pool.includes(query);
        const matchesStatus = statusFilter === "all" || status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        }
        if (sortBy === "highest") {
          return safeNumber(b.price ?? b.total) - safeNumber(a.price ?? a.total);
        }
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [quotes, searchTerm, statusFilter, sortBy]);

  return (
    <Layout>
      <div className="cx-page space-y-6 animate-in bg-background min-h-full" data-testid="quotes-page">
        <div className="cx-page-hero flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h1 className="cx-page-title">Quotes</h1>
            <p className="cx-page-subtitle">Create professional proposals, track approvals, and turn accepted quotes into jobs.</p>
          </div>
          <div className="cx-toolbar w-full xl:w-auto">
            <Link to="/quotes/new" className="cx-button-primary" data-testid="add-quote-button">
              <Plus className="mr-2 h-4 w-4" />
              New Quote
            </Link>
            <button type="button" onClick={() => setStatusFilter("accepted")} className="cx-button-secondary">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              View Accepted
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Total quotes</p><p className="text-2xl font-semibold text-slate-900">{quoteMetrics.total}</p></div><div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 grid place-items-center"><FileText className="h-5 w-5" /></div></div></CardContent></Card>
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Draft quotes</p><p className="text-2xl font-semibold text-slate-900">{quoteMetrics.drafts}</p></div><div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 grid place-items-center"><CircleDashed className="h-5 w-5" /></div></div></CardContent></Card>
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Sent / pending</p><p className="text-2xl font-semibold text-slate-900">{quoteMetrics.sentPending}</p></div><div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><Clock3 className="h-5 w-5" /></div></div></CardContent></Card>
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Accepted quotes</p><p className="text-2xl font-semibold text-slate-900">{quoteMetrics.accepted}</p></div><div className="h-10 w-10 rounded-xl bg-green-50 text-green-700 grid place-items-center"><CheckCircle2 className="h-5 w-5" /></div></div></CardContent></Card>
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Quote value</p><p className="text-2xl font-semibold text-slate-900">{formatCurrency(quoteMetrics.totalValue)}</p></div><div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 grid place-items-center"><Wallet className="h-5 w-5" /></div></div></CardContent></Card>
        </div>

        <Card className="cx-panel">
          <CardContent className="p-3 md:p-4">
            <div className="cx-toolbar gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client, title, quote number, or status"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl bg-card border-border"
                  data-testid="quote-search-input"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] rounded-xl bg-card border-border" data-testid="quote-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px] rounded-xl bg-card border-border">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="highest">Highest value</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="cx-card">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-slate-900">Quote workflow</h2>
              <span className="text-xs text-slate-500">From first draft to booked work</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mt-3">
              {["Draft", "Send", "Accepted", "Convert to job"].map((step, idx) => (
                <div key={step} className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-700 flex items-center justify-between">
                  <span className="font-medium">{idx + 1}. {step}</span>
                  {idx < 3 ? <ArrowRight className="h-4 w-4 text-slate-400" /> : <Briefcase className="h-4 w-4 text-green-700" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredQuotes.length === 0 ? (
          <Card className="cx-empty-state">
            <CardContent className="flex flex-col items-center justify-center py-10 md:py-14 bg-gradient-to-b from-blue-50/70 to-white rounded-2xl">
              <div className="h-16 w-16 rounded-2xl bg-blue-100 text-blue-700 grid place-items-center mb-5 shadow-sm">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No quotes yet</h3>
              <p className="text-slate-600 text-center mb-5 max-w-md">
                Create your first quote, send it to a client, and convert accepted work into jobs.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link to="/quotes/new" className="cx-button-primary" data-testid="add-first-quote-button">
                  <Plus className="mr-2 h-4 w-4" />
                  New Quote
                </Link>
                <Link to="/clients/new" className="cx-button-secondary">
                  Add Client
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredQuotes.map((quote) => {
              const status = String(quote.status || "draft").toLowerCase();
              const meta = statusMeta[status] || {
                label: QUOTE_STATUSES.find((s) => s.value === status)?.label || safeText(status, "Draft"),
                className: "cx-status-badge--slate",
              };

              return (
                <Card
                  key={quote.id}
                  className="cx-document-card hover:border-blue-300 transition-colors"
                  data-testid={`quote-card-${quote.id}`}
                >
                  <CardContent className="p-4 md:p-5">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Link
                            to={`/quotes/${quote.id}`}
                            className="text-lg font-semibold text-slate-900 hover:text-primary transition-colors"
                            data-testid={`quote-number-${quote.id}`}
                          >
                            {safeText(quote.title || quote.quote_number, "Untitled quote")}
                          </Link>
                          <span className={`cx-status-badge ${meta.className}`}>{meta.label}</span>
                          {(status === "declined" || status === "expired") && <XCircle className="h-4 w-4 text-red-500" />}
                        </div>
                        <p className="text-sm text-slate-900 font-medium">{safeText(quote.customer_name, "Unknown client")}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{safeText(quote.job_description, "No quote notes added yet.")}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Created {formatDate(quote.created_at) || "—"}</span>
                          {(quote.sent_at || quote.updated_at) && <span>Sent {formatDate(quote.sent_at || quote.updated_at)}</span>}
                          {quote.expires_at && <span>Expires {formatDate(quote.expires_at)}</span>}
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-2">
                        <span className="text-2xl font-semibold text-slate-900">{formatCurrency(quote.price ?? quote.total)}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/quotes/${quote.id}`} className="cx-button-secondary">Open</Link>

                          {status === "draft" && (
                            <Button
                              size="sm"
                              className="cx-button-secondary"
                              onClick={() => handleSendQuote(quote.id)}
                              data-testid={`send-quote-${quote.id}`}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Send
                            </Button>
                          )}

                          {status === "accepted" && (
                            <Button
                              size="sm"
                              className="cx-button-primary"
                              onClick={() => handleConvertToJob(quote.id)}
                            >
                              <Briefcase className="h-4 w-4 mr-1" />
                              Convert to Job
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9" data-testid={`quote-menu-${quote.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border">
                              <DropdownMenuItem asChild>
                                <Link to={`/quotes/${quote.id}`} className="cursor-pointer">
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/quotes/${quote.id}/edit`} className="flex items-center cursor-pointer" data-testid={`edit-quote-${quote.id}`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteId(quote.id)}
                                className="text-destructive focus:text-destructive cursor-pointer"
                                data-testid={`delete-quote-${quote.id}`}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!!deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="delete-quote-dialog">
            <div className="absolute inset-0 bg-black/80" onClick={() => setDeleteId(null)} />
            <div className="relative z-10 w-full max-w-md mx-4 rounded-lg border bg-white border-slate-200 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-900">Delete Quote</h2>
              <p className="mt-2 text-sm text-slate-500">Are you sure you want to delete this quote? This action cannot be undone.</p>
              <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button type="button" onClick={() => setDeleteId(null)}
                  className="inline-flex items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-blue-50 transition-colors">
                  Cancel
                </button>
                <button type="button" data-testid="confirm-delete-quote" disabled={loading} onClick={handleDelete}
                  className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-slate-900 bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {loading ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
