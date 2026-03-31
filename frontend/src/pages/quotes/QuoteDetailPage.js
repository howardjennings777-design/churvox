import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Loader2, 
  Pencil, 
  Trash2, 
  Send,
  Calendar,
  MapPin,
  DollarSign,
  Mail,
  User,
  FileText,
  CheckCircle,
  XCircle
} from "lucide-react";
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
import { formatDate, formatCurrency, QUOTE_STATUSES } from "@/lib/utils";
import Layout from "@/components/Layout";

export default function QuoteDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { get, del, post, patch, loading } = useApi();
  const [quote, setQuote] = useState(null);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    loadQuote();
  }, [id]);

  const loadQuote = async () => {
    const result = await get(`/quotes/${id}`);
    if (result.success) {
      setQuote(result.data);
    } else {
      toast.error("Quote not found");
      navigate("/quotes");
    }
  };

  const handleDelete = async () => {
    const result = await del(`/quotes/${id}`);
    if (result.success) {
      toast.success("Quote deleted");
      navigate("/quotes");
    } else {
      toast.error(result.error);
    }
  };

  const handleSendQuote = async () => {
    const result = await post(`/quotes/${id}/send`);
    if (result.success) {
      toast.success("Quote marked as sent");
      loadQuote();
    } else {
      toast.error(result.error);
    }
  };

  const handleUpdateStatus = async (status) => {
    const result = await patch(`/quotes/${id}`, { status });
    if (result.success) {
      toast.success(`Quote marked as ${status}`);
      loadQuote();
    } else {
      toast.error(result.error);
    }
  };

  if (loading || !quote) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 animate-in" data-testid="quote-detail-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/quotes")}
              data-testid="back-button"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-semibold text-white font-heading">
                  {quote.quote_number}
                </h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase text-white ${QUOTE_STATUSES.find(s => s.value === quote.status)?.color || "bg-slate-500"}`}>
                  {QUOTE_STATUSES.find(s => s.value === quote.status)?.label || quote.status}
                </span>
              </div>
              <p className="text-muted-foreground">Quote for {quote.customer_name}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {quote.status === "draft" && (
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleSendQuote}
                data-testid="send-quote-button"
              >
                <Send className="mr-2 h-4 w-4" />
                Send Quote
              </Button>
            )}
            {quote.status === "sent" && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleUpdateStatus("accepted")}
                  data-testid="accept-quote-button"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Accepted
                </Button>
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                  onClick={() => handleUpdateStatus("declined")}
                  data-testid="decline-quote-button"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Mark Declined
                </Button>
              </>
            )}
            <Link to={`/quotes/${id}/edit`}>
              <Button variant="outline" className="border-border" data-testid="edit-quote-button">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={() => setShowDelete(true)}
              data-testid="delete-quote-button"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Quote Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Name</p>
                  <p className="text-white">{quote.customer_name}</p>
                </div>
              </div>
              {quote.customer_email && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                    <a href={`mailto:${quote.customer_email}`} className="text-white hover:text-primary">
                      {quote.customer_email}
                    </a>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Address</p>
                  <p className="text-white">{quote.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Price</p>
                  <p className="text-2xl font-semibold text-white">{formatCurrency(quote.price)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Created</p>
                  <p className="text-white">{formatDate(quote.created_at)}</p>
                </div>
              </div>
              {quote.valid_until && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Valid Until</p>
                    <p className="text-white">{formatDate(quote.valid_until)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Job Description */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Job Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{quote.job_description}</p>
          </CardContent>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Quote</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this quote? This action cannot be undone.
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
