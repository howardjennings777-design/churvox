import React, { useState, useEffect } from "react";
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
  Filter
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

export default function QuotesPage() {
  const { get, del, post, loading } = useApi();
  const [quotes, setQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    const result = await get("/quotes");
    if (result.success) {
      setQuotes(result.data);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await del(`/quotes/${deleteId}`);
    if (result.success) {
      toast.success("Quote deleted successfully");
      setQuotes(quotes.filter((q) => q.id !== deleteId));
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

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch = 
      quote.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.job_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="quotes-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white font-heading">Quotes</h1>
            <p className="text-muted-foreground mt-1">Manage your quotes and proposals</p>
          </div>
          <Link to="/quotes/new">
            <Button className="bg-primary hover:bg-primary/90" data-testid="add-quote-button">
              <Plus className="mr-2 h-4 w-4" />
              New Quote
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card border-border"
              data-testid="quote-search-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-border" data-testid="quote-status-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quotes List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredQuotes.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {searchTerm || statusFilter !== "all" ? "No quotes found" : "No quotes yet"}
              </h3>
              <p className="text-muted-foreground text-center mb-4 max-w-xs mx-auto">
                {searchTerm || statusFilter !== "all"
                  ? "Try a different search or filter"
                  : "Send professional quotes to clients. Accepted quotes can be converted directly into jobs."}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Link to="/quotes/new">
                  <Button className="bg-primary hover:bg-primary/90" data-testid="add-first-quote-button">
                    <Plus className="mr-2 h-4 w-4" />
                    New Quote
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredQuotes.map((quote) => (
              <Card 
                key={quote.id} 
                className="bg-card border-border hover:bg-card/80 transition-colors"
                data-testid={`quote-card-${quote.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Link 
                          to={`/quotes/${quote.id}`}
                          className="text-lg font-medium text-white hover:text-primary transition-colors"
                          data-testid={`quote-number-${quote.id}`}
                        >
                          {quote.quote_number}
                        </Link>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase text-white ${QUOTE_STATUSES.find(s => s.value === quote.status)?.color || "bg-slate-500"}`}>
                          {QUOTE_STATUSES.find(s => s.value === quote.status)?.label || quote.status}
                        </span>
                      </div>
                      <p className="text-sm text-white mb-1">{quote.customer_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{quote.job_description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {formatDate(quote.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-semibold text-white">
                        {formatCurrency(quote.price)}
                      </span>
                      
                      {quote.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-primary text-primary hover:bg-primary hover:text-white"
                          onClick={() => handleSendQuote(quote.id)}
                          data-testid={`send-quote-${quote.id}`}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`quote-menu-${quote.id}`}>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation */}
        {!!deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="delete-quote-dialog">
            <div className="absolute inset-0 bg-black/80" onClick={() => setDeleteId(null)} />
            <div className="relative z-10 w-full max-w-md mx-4 rounded-lg border bg-churvox-card border-churvox-border p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-white">Delete Quote</h2>
              <p className="mt-2 text-sm text-churvox-muted">Are you sure you want to delete this quote? This action cannot be undone.</p>
              <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button type="button" onClick={() => setDeleteId(null)}
                  className="inline-flex items-center justify-center rounded-md border border-churvox-border px-4 py-2 text-sm font-medium text-churvox-muted hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="button" data-testid="confirm-delete-quote" disabled={loading} onClick={handleDelete}
                  className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
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
