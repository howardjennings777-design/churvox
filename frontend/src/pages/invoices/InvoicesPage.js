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

export default function InvoicesPage() {
  const { get, del, post, loading } = useApi();
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    const result = await get("/invoices");
    if (result.success) {
      setInvoices(safeArray(result.data));
    }
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

  const invoiceMetrics = useMemo(() => {
    const safeInvoices = safeArray(invoices);
    return {
      total: safeInvoices.length,
      draft: safeInvoices.filter((i) => i.status === "draft").length,
      sent: safeInvoices.filter((i) => ["sent", "unpaid"].includes(String(i.status))).length,
      paid: safeInvoices.filter((i) => i.status === "paid").length,
      value: safeInvoices.reduce((sum, i) => sum + safeNumber(i.total), 0),
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
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !query || pool.includes(query);
        const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        if (sortBy === "highest") return safeNumber(b.total) - safeNumber(a.total);
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [invoices, searchTerm, statusFilter, sortBy]);

  return (
    <Layout>
      <div className="cx-page space-y-6 animate-in bg-[#f8f6f1] min-h-full" data-testid="invoices-page">
        <div className="cx-page-hero flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="cx-page-title">Invoices</h1>
            <p className="cx-page-subtitle">Manage your invoices and payments with a cleaner cashflow workspace.</p>
          </div>
          <Link to="/invoices/new" className="cx-button-primary" data-testid="add-invoice-button">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Total invoices</p><p className="text-2xl font-semibold">{invoiceMetrics.total}</p></div><div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 grid place-items-center"><ReceiptText className="h-5 w-5" /></div></div></CardContent></Card>
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Draft</p><p className="text-2xl font-semibold">{invoiceMetrics.draft}</p></div><div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 grid place-items-center"><Clock3 className="h-5 w-5" /></div></div></CardContent></Card>
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Sent / unpaid</p><p className="text-2xl font-semibold">{invoiceMetrics.sent}</p></div><div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center"><Send className="h-5 w-5" /></div></div></CardContent></Card>
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Paid</p><p className="text-2xl font-semibold">{invoiceMetrics.paid}</p></div><div className="h-10 w-10 rounded-xl bg-green-50 text-green-700 grid place-items-center"><FileCheck2 className="h-5 w-5" /></div></div></CardContent></Card>
          <Card className="cx-stat-card"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Invoice value</p><p className="text-2xl font-semibold">{formatCurrency(invoiceMetrics.value)}</p></div><div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 grid place-items-center"><DollarSign className="h-5 w-5" /></div></div></CardContent></Card>
        </div>

        <div className="cx-toolbar cx-panel p-3 md:p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices by client, number, or status"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card border-border rounded-xl"
              data-testid="invoice-search-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-border rounded-xl" data-testid="invoice-status-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-border rounded-xl">
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <Card className="cx-empty-state">
            <CardContent className="flex flex-col items-center justify-center py-12 bg-gradient-to-b from-blue-50/60 to-white rounded-2xl">
              <DollarSign className="h-12 w-12 text-blue-700 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No invoices yet</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-xs mx-auto">
                Complete a job to create a draft invoice, or create one manually and track payments from sent to paid.
              </p>
              <Link to="/invoices/new" className="cx-button-primary" data-testid="add-first-invoice-button">
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((invoice) => (
              <Card
                key={invoice.id}
                className="cx-list-card hover:border-blue-300 transition-colors cursor-pointer"
                data-testid={`invoice-card-${invoice.id}`}
              >
                <Link to={`/invoices/${invoice.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span
                            className="text-lg font-medium text-slate-900 hover:text-primary transition-colors"
                            data-testid={`invoice-number-${invoice.id}`}
                          >
                            {invoice.invoice_number}
                          </span>
                          <span className={`cx-status-badge ${INVOICE_STATUSES.find((s) => s.value === invoice.status)?.color || "bg-slate-100 text-slate-700 border border-slate-200"}`}>
                            {INVOICE_STATUSES.find((s) => s.value === invoice.status)?.label || invoice.status}
                          </span>
                          {invoice.myob_sync_status && invoice.myob_sync_status !== "not_synced" && (() => {
                            const si = MYOB_SYNC_STATUSES[invoice.myob_sync_status];
                            return si ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${si.bg} ${si.color}`} data-testid={`myob-badge-${invoice.id}`}>
                                MYOB {si.label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <p className="text-sm text-slate-900 mb-1">{invoice.customer_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{invoice.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created {formatDate(invoice.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total (inc. GST)</p>
                          <p className="text-xl font-semibold text-slate-900">
                            {formatCurrency(invoice.total)}
                          </p>
                        </div>

                        {invoice.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary hover:text-slate-900"
                            onClick={(e) => {
                              e.preventDefault();
                              handleSendInvoice(invoice.id);
                            }}
                            data-testid={`send-invoice-${invoice.id}`}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Send
                          </Button>
                        )}
                        {invoice.status === "sent" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={(e) => {
                              e.preventDefault();
                              handleMarkPaid(invoice.id);
                            }}
                            data-testid={`mark-paid-${invoice.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Paid
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              data-testid={`invoice-menu-${invoice.id}`}
                              onClick={(e) => e.preventDefault()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border">
                            <DropdownMenuItem asChild>
                              <Link to={`/invoices/${invoice.id}`} className="cursor-pointer">
                                View Details
                              </Link>
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
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}

        {!!deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="delete-invoice-dialog">
            <div className="absolute inset-0 bg-black/80" onClick={() => setDeleteId(null)} />
            <div className="relative z-10 w-full max-w-md mx-4 rounded-lg border bg-white border-slate-200 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-900">Delete Invoice</h2>
              <p className="mt-2 text-sm text-slate-500">Are you sure you want to delete this invoice? This action cannot be undone.</p>
              <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button type="button" onClick={() => setDeleteId(null)}
                  className="inline-flex items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-blue-50 transition-colors">
                  Cancel
                </button>
                <button type="button" data-testid="confirm-delete-invoice" disabled={loading} onClick={handleDelete}
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
