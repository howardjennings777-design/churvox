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
  DollarSign,
  Send,
  Filter,
  CheckCircle,
  ReceiptText,
  Clock3,
  SlidersHorizontal,
  FileCheck2,
  AlertTriangle,
  Link2,
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
import { formatDate, formatCurrency, INVOICE_STATUSES, MYOB_SYNC_STATUSES } from "@/lib/utils";
import Layout from "@/components/Layout";

const safeArray = (value) => (Array.isArray(value) ? value : []);
const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const safeText = (value, fallback = "—") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const getInvoiceStatusMeta = (status) => {
  const normalized = String(status || "draft").toLowerCase();
  const map = {
    draft: { label: "Draft", className: "cx-status-badge--slate" },
    sent: { label: "Sent", className: "cx-status-badge--blue" },
    unpaid: { label: "Unpaid", className: "cx-status-badge--amber" },
    pending: { label: "Pending", className: "cx-status-badge--amber" },
    paid: { label: "Paid", className: "cx-status-badge--green" },
    overdue: { label: "Overdue", className: "cx-status-badge--red" },
    failed: { label: "Failed", className: "cx-status-badge--red" },
    cancelled: { label: "Cancelled", className: "cx-status-badge--red" },
  };

  if (map[normalized]) return map[normalized];

  const fallback = INVOICE_STATUSES.find((item) => item.value === normalized);
  return {
    label: fallback?.label || safeText(normalized, "Draft"),
    className: "cx-status-badge--slate",
  };
};

const getPaymentLabel = (invoice) => {
  const status = String(invoice?.status || "").toLowerCase();
  if (status === "paid") return "Paid";
  if (status === "overdue") return "Payment overdue";
  if (["sent", "unpaid", "pending"].includes(status)) return "Awaiting payment";
  if (status === "draft") return "Draft (not sent)";
  return safeText(status, "Pending");
};

const getSortValue = (sortBy, invoice) => {
  if (sortBy === "highest") return safeNumber(invoice.total);
  if (sortBy === "overdue_first") {
    const isOverdue = String(invoice.status || "").toLowerCase() === "overdue" ? 1 : 0;
    const dueDate = new Date(invoice.due_date || 0).getTime();
    return isOverdue * 10000000000000 + dueDate;
  }
  return new Date(invoice.created_at || 0).getTime();
};

export default function InvoicesPage() {
  const { get, del, post, loading } = useApi();
  const [invoices, setInvoices] = useState([]);
  const [accounting, setAccounting] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    const [result, accountingRes] = await Promise.all([get("/invoices"), get("/accounting/settings")]);
    if (result.success) setInvoices(safeArray(result.data));
    if (accountingRes?.success) setAccounting(accountingRes.data || null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await del(`/invoices/${deleteId}`);
    if (result.success) {
      toast.success("Invoice deleted successfully");
      setInvoices((prev) => prev.filter((i) => i.id !== deleteId));
    } else {
      toast.error(result.error);
    }
    setDeleteId(null);
  };

  const handleSendInvoice = async (invoiceId) => {
    const result = await post(`/invoices/${invoiceId}/send`);
    if (result.success) {
      toast.success("Invoice marked as sent");
      loadInvoices();
    } else {
      toast.error(result.error);
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    const result = await post(`/invoices/${invoiceId}/mark-paid`);
    if (result.success) {
      toast.success("Invoice marked as paid");
      loadInvoices();
    } else {
      toast.error(result.error);
    }
  };

  const handleSyncMyob = async (invoiceId, retry = false) => {
    const endpoint = retry ? `/invoices/${invoiceId}/myob-retry` : `/invoices/${invoiceId}/myob-sync`;
    const result = await post(endpoint);
    if (result?.success) toast.success("MYOB sync updated");
    else toast.error(result?.message || result?.error || "MYOB sync needs setup");
    loadInvoices();
  };

  const handleCreateReminderDraft = async (invoiceId) => {
    const result = await post("/ai/drafts/create", {
      type: "invoice_reminder",
      source_record_id: invoiceId,
      source_record_type: "invoice",
    });
    if (result?.success) toast.success("AI reminder draft created");
    else toast.error(result?.error || "Could not create AI draft");
  };

  const invoiceMetrics = useMemo(() => {
    const safeInvoices = safeArray(invoices);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return {
      total: safeInvoices.length,
      draft: safeInvoices.filter((i) => String(i.status || "").toLowerCase() === "draft").length,
      sentUnpaid: safeInvoices.filter((i) => ["sent", "unpaid", "pending"].includes(String(i.status || "").toLowerCase())).length,
      paid: safeInvoices.filter((i) => String(i.status || "").toLowerCase() === "paid").length,
      overdue: safeInvoices.filter((i) => String(i.status || "").toLowerCase() === "overdue").length,
      outstanding: safeInvoices
        .filter((i) => ["sent", "unpaid", "pending", "overdue"].includes(String(i.status || "").toLowerCase()))
        .reduce((sum, i) => sum + safeNumber(i.total), 0),
      paidThisMonth: safeInvoices
        .filter((i) => {
          const status = String(i.status || "").toLowerCase();
          if (status !== "paid") return false;
          const paidDate = new Date(i.paid_at || i.updated_at || i.created_at || 0);
          return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
        })
        .reduce((sum, i) => sum + safeNumber(i.total), 0),
      myobIssues: safeInvoices.filter((i) => {
        const syncStatus = String(i.myob_sync_status || "not_synced").toLowerCase();
        return ["failed", "error", "sync_error"].includes(syncStatus) || Boolean(i.myob_error);
      }).length,
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return safeArray(invoices)
      .filter((invoice) => {
        const pool = [
          invoice.customer_name,
          invoice.invoice_number,
          invoice.description,
          invoice.status,
          invoice.total,
          invoice.job_title,
          invoice.job_name,
          invoice.job_description,
        ]
          .map((item) => String(item || ""))
          .join(" ")
          .toLowerCase();

        const matchesSearch = !query || pool.includes(query);
        const matchesStatus = statusFilter === "all" || String(invoice.status || "").toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") return getSortValue("newest", a) - getSortValue("newest", b);
        if (sortBy === "highest") return getSortValue("highest", b) - getSortValue("highest", a);
        if (sortBy === "overdue_first") return getSortValue("overdue_first", b) - getSortValue("overdue_first", a);
        return getSortValue("newest", b) - getSortValue("newest", a);
      });
  }, [invoices, searchTerm, statusFilter, sortBy]);

  const mode = accounting?.invoice_mode || "churvox_only";
  const myobConnected = Boolean(accounting?.myob_connected);
  return (
    <Layout>
      <div className="cx-page space-y-6 animate-in bg-background min-h-full" data-testid="invoices-page">
        <div className="cx-page-hero flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h1 className="cx-page-title">Invoices</h1>
            <p className="cx-page-subtitle">Polished document workflow with clear totals, status badges, and ready-to-send actions.</p>
          </div>
          <div className="cx-toolbar w-full xl:w-auto">
            {mode === "myob_external" ? (
              <button type="button" className="cx-button-secondary" disabled title="Create invoices in MYOB, then sync them back to Churvox.">
                <Plus className="mr-2 h-4 w-4" />
                Create in MYOB
              </button>
            ) : (
              <Link to="/invoices/new" className="cx-button-primary" data-testid="add-invoice-button">
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Link>
            )}
            <button type="button" onClick={() => setStatusFilter("overdue")} className="cx-button-secondary">
              <AlertTriangle className="mr-2 h-4 w-4" />
              View Overdue
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Total invoices</p><p className="text-2xl font-semibold text-slate-900">{invoiceMetrics.total}</p></div><div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 grid place-items-center"><ReceiptText className="h-5 w-5" /></div></div></CardContent></Card>
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Draft invoices</p><p className="text-2xl font-semibold text-slate-900">{invoiceMetrics.draft}</p></div><div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 grid place-items-center"><Clock3 className="h-5 w-5" /></div></div></CardContent></Card>
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Sent / unpaid</p><p className="text-2xl font-semibold text-slate-900">{invoiceMetrics.sentUnpaid}</p></div><div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 grid place-items-center"><Send className="h-5 w-5" /></div></div></CardContent></Card>
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Paid invoices</p><p className="text-2xl font-semibold text-slate-900">{invoiceMetrics.paid}</p></div><div className="h-10 w-10 rounded-xl bg-green-50 text-green-700 grid place-items-center"><FileCheck2 className="h-5 w-5" /></div></div></CardContent></Card>
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Overdue invoices</p><p className="text-2xl font-semibold text-slate-900">{invoiceMetrics.overdue}</p></div><div className="h-10 w-10 rounded-xl bg-red-50 text-red-700 grid place-items-center"><AlertTriangle className="h-5 w-5" /></div></div></CardContent></Card>
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Outstanding amount</p><p className="text-2xl font-semibold text-slate-900">{formatCurrency(invoiceMetrics.outstanding)}</p></div><div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><DollarSign className="h-5 w-5" /></div></div></CardContent></Card>
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Paid this month</p><p className="text-2xl font-semibold text-slate-900">{formatCurrency(invoiceMetrics.paidThisMonth)}</p></div><div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center"><CheckCircle className="h-5 w-5" /></div></div></CardContent></Card>
        </div>

        <Card className="cx-panel">
          <CardContent className="p-3 md:p-4">
            <div className="cx-toolbar gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices by number, client, job, status, or amount"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl bg-card border-border"
                  data-testid="invoice-search-input"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[190px] rounded-xl bg-card border-border" data-testid="invoice-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[190px] rounded-xl bg-card border-border">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="highest">Highest amount</SelectItem>
                  <SelectItem value="overdue_first">Overdue first</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="cx-card">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-slate-900">Needs attention</h2>
              <span className="text-xs text-slate-500">Stay ahead of overdue and unpaid cashflow</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mt-3">
              <div className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-700">
                <p className="text-xs text-slate-500">Overdue invoices</p>
                <p className="font-semibold text-red-700">{invoiceMetrics.overdue}</p>
              </div>
              <div className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-700">
                <p className="text-xs text-slate-500">Unpaid / pending</p>
                <p className="font-semibold text-amber-700">{invoiceMetrics.sentUnpaid}</p>
              </div>
              <div className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-700">
                <p className="text-xs text-slate-500">Draft invoices</p>
                <p className="font-semibold text-slate-700">{invoiceMetrics.draft}</p>
              </div>
              <div className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-700">
                <p className="text-xs text-slate-500">MYOB sync issues</p>
                <p className="font-semibold text-red-700">{invoiceMetrics.myobIssues}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <Card className="cx-empty-state">
            <CardContent className="flex flex-col items-center justify-center py-10 md:py-14 bg-gradient-to-b from-blue-50/70 to-white rounded-2xl">
              <div className="h-16 w-16 rounded-2xl bg-cyan-100 text-cyan-700 grid place-items-center mb-5 shadow-sm">
                <ReceiptText className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No invoices yet</h3>
              <p className="text-slate-600 text-center mb-2 max-w-md">
                Create your first invoice or turn a completed job into a draft invoice.
              </p>
              <p className="text-xs text-slate-500 mb-5">Job completed → Draft invoice → Send → Paid</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link to="/invoices/new" className="cx-button-primary" data-testid="add-first-invoice-button">
                  <Plus className="mr-2 h-4 w-4" />
                  New Invoice
                </Link>
                <Link to="/jobs" className="cx-button-secondary">View Jobs</Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((invoice) => {
              const statusMeta = getInvoiceStatusMeta(invoice.status);
              const jobTitle = invoice.job_title || invoice.job_name || invoice.job_description;
              const paymentLink = invoice.public_invoice_url || invoice.public_url || invoice.payment_link || invoice.stripe_payment_link;

              return (
                <Card
                  key={invoice.id}
                  className="cx-invoice-card hover:border-blue-300 transition-colors"
                  data-testid={`invoice-card-${invoice.id}`}
                >
                  <CardContent className="p-4 md:p-5">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Link
                            to={`/invoices/${invoice.id}`}
                            className="text-lg font-semibold text-slate-900 hover:text-primary transition-colors"
                            data-testid={`invoice-number-${invoice.id}`}
                          >
                            {safeText(invoice.invoice_number, "Draft invoice")}
                          </Link>
                          <span className={`cx-status-badge ${statusMeta.className}`}>{statusMeta.label}</span>
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-[#e7e0d3] bg-white text-slate-600">
                            {getPaymentLabel(invoice)}
                          </span>
                          {(mode === "myob_sync" || mode === "myob_external") && (() => {
                            const syncKey = mode === "myob_external" ? "external" : String(invoice.myob_sync_status || "not_synced");
                            const syncInfo = MYOB_SYNC_STATUSES[syncKey] || MYOB_SYNC_STATUSES.not_synced;
                            return <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${syncInfo.bg} ${syncInfo.color}`} data-testid={`myob-badge-${invoice.id}`}>MYOB {syncInfo.label}</span>;
                          })()}
                          {invoice.myob_invoice_number && <span className="text-[11px] text-slate-500">#{invoice.myob_invoice_number}</span>}
                        </div>
                        <p className="text-sm text-slate-900 font-medium">{safeText(invoice.customer_name, "Unknown client")}</p>
                        {jobTitle && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{safeText(jobTitle)}</p>}
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Created {formatDate(invoice.created_at) || "—"}</span>
                          <span>Due {formatDate(invoice.due_date) || "—"}</span>
                          {invoice.myob_last_synced_at && <span>MYOB sync {formatDate(invoice.myob_last_synced_at)}</span>}
                        </div>
                        {invoice.myob_error && (mode === "myob_sync" || mode === "myob_external") && <p className="text-xs text-red-700 mt-2">{safeText(invoice.myob_error)}</p>}
                      </div>

                      <div className="flex flex-col sm:items-end gap-2">
                        <span className="text-2xl font-semibold text-slate-900">{formatCurrency(invoice.total)}</span>
                        <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Link to={`/invoices/${invoice.id}`} className="cx-button-secondary">Open</Link>

                          {invoice.status === "draft" && (
                            <Button
                              size="sm"
                              className="cx-button-secondary"
                              onClick={() => handleSendInvoice(invoice.id)}
                              data-testid={`send-invoice-${invoice.id}`}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Send
                            </Button>
                          )}

                          {invoice.status === "sent" && (
                            <Button
                              size="sm"
                              className="cx-button-primary"
                              onClick={() => handleMarkPaid(invoice.id)}
                              data-testid={`mark-paid-${invoice.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark paid
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleCreateReminderDraft(invoice.id)}>
                            AI reminder draft
                          </Button>

                          {paymentLink && (
                            <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="cx-button-secondary">
                              <Link2 className="h-4 w-4 mr-1" />
                              Pay link
                            </a>
                          )}
                          {(mode === "myob_sync" || mode === "myob_external") && (
                            <Button
                              size="sm"
                              className="cx-button-secondary"
                              disabled={!myobConnected}
                              onClick={() => handleSyncMyob(invoice.id, String(invoice.myob_sync_status) === "failed")}
                            >
                              {myobConnected ? (String(invoice.myob_sync_status) === "failed" ? "Retry sync" : "Sync to MYOB") : "Setup MYOB"}
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                data-testid={`invoice-menu-${invoice.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border">
                              <DropdownMenuItem asChild>
                                <Link to={`/invoices/${invoice.id}`} className="cursor-pointer">View Details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/invoices/${invoice.id}/edit`} className="flex items-center cursor-pointer" data-testid={`edit-invoice-${invoice.id}`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteId(invoice.id)}
                                className="text-destructive focus:text-destructive cursor-pointer"
                                data-testid={`delete-invoice-${invoice.id}`}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="delete-invoice-dialog">
            <div className="absolute inset-0 bg-black/80" onClick={() => setDeleteId(null)} />
            <div className="relative z-10 w-full max-w-md mx-4 rounded-lg border bg-white border-slate-200 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-900">Delete Invoice</h2>
              <p className="mt-2 text-sm text-slate-500">Are you sure you want to delete this invoice? This action cannot be undone.</p>
              <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button type="button" onClick={() => setDeleteId(null)} className="inline-flex items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-blue-50 transition-colors">
                  Cancel
                </button>
                <button type="button" data-testid="confirm-delete-invoice" disabled={loading} onClick={handleDelete} className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-slate-900 bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
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
