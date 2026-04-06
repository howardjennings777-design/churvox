import React, { useState, useEffect } from "react";
import {Link, useNavigate} from "react-router-dom";
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
  CheckCircle
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDate, formatCurrency, INVOICE_STATUSES, MYOB_SYNC_STATUSES } from "@/lib/utils";
import Layout from "@/components/Layout";

export default function InvoicesPage() {
  const { get, del, post, loading } = useApi();
  const [invoices, setInvoices] = useState([]);
  
  const [actionLoading, setActionLoading] = useState(false);
const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    const result = await get("/invoices");
    if (result.success) {
      setInvoices(result.data);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await del(`/invoices/${deleteId}`);
    if (result.success) {
      toast.success("Invoice deleted successfully");
      setInvoices(invoices.filter((i) => i.id !== deleteId));
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

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="invoices-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white font-heading">Invoices</h1>
            <p className="text-muted-foreground mt-1">Manage your invoices and payments</p>
          </div>
          <Link to="/invoices/new">
            <Button className="bg-primary hover:bg-primary/90" data-testid="add-invoice-button">
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card border-border"
              data-testid="invoice-search-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-border" data-testid="invoice-status-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Invoices List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {searchTerm || statusFilter !== "all" ? "No invoices found" : "No invoices yet"}
              </h3>
              <p className="text-muted-foreground text-center mb-4 max-w-xs mx-auto">
                {searchTerm || statusFilter !== "all"
                  ? "Try a different search or filter"
                  : "Complete a job to create a draft invoice, or create one manually. Track from draft to sent to paid."}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Link to="/invoices/new">
                  <Button className="bg-primary hover:bg-primary/90" data-testid="add-first-invoice-button">
                    <Plus className="mr-2 h-4 w-4" />
                    New Invoice
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((invoice) => (
              <Card 
                key={invoice.id} 
                className="bg-card border-border hover:bg-card/80 transition-colors cursor-pointer"
                data-testid={`invoice-card-${invoice.id}`}
              >
                <Link to={`/invoices/${invoice.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span 
                            className="text-lg font-medium text-white hover:text-primary transition-colors"
                            data-testid={`invoice-number-${invoice.id}`}
                          >
                            {invoice.invoice_number}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase text-white ${INVOICE_STATUSES.find(s => s.value === invoice.status)?.color || "bg-slate-500"}`}>
                            {INVOICE_STATUSES.find(s => s.value === invoice.status)?.label || invoice.status}
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
                        <p className="text-sm text-white mb-1">{invoice.customer_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{invoice.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created {formatDate(invoice.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total (inc. GST)</p>
                          <p className="text-xl font-semibold text-white">
                            {formatCurrency(invoice.total)}
                          </p>
                        </div>
                        
                        {invoice.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary hover:text-white"
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

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this invoice? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
