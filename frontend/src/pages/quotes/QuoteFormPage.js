import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";

export default function QuoteFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { get, post, patch, loading } = useApi();
  const isEdit = !!id;

  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    address: "",
    job_description: "",
    price: "",
    notes: "",
    valid_until: "",
  });

  useEffect(() => {
    loadClients();
    if (isEdit) {
      loadQuote();
    } else {
      // Pre-fill from client if provided
      const clientId = searchParams.get("client_id");
      if (clientId) {
        loadClientData(clientId);
      }
    }
  }, [id]);

  const loadClients = async () => {
    const result = await get("/clients");
    if (result.success) {
      setClients(result.data);
    }
  };

  const loadClientData = async (clientId) => {
    const result = await get(`/clients/${clientId}`);
    if (result.success) {
      setFormData((prev) => ({
        ...prev,
        customer_name: result.data.name || "",
        customer_email: result.data.email || "",
        address: result.data.address || "",
      }));
    }
  };

  const loadQuote = async () => {
    const result = await get(`/quotes/${id}`);
    if (result.success) {
      const quote = result.data;
      setFormData({
        customer_name: quote.customer_name || "",
        customer_email: quote.customer_email || "",
        address: quote.address || "",
        job_description: quote.job_description || "",
        price: quote.price?.toString() || "",
        notes: quote.notes || "",
        valid_until: quote.valid_until ? quote.valid_until.split("T")[0] : "",
      });
    } else {
      toast.error("Quote not found");
      navigate("/quotes");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!formData.address.trim()) {
      toast.error("Address is required");
      return;
    }
    if (!formData.job_description.trim()) {
      toast.error("Job description is required");
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      toast.error("Valid price is required");
      return;
    }

    const quoteData = {
      ...formData,
      price: Number(formData.price),
      valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
    };

    const result = isEdit
      ? await patch(`/quotes/${id}`, quoteData)
      : await post("/quotes", quoteData);

    if (result.success) {
      toast.success(isEdit ? "Quote updated" : "Quote created");
      navigate("/quotes");
    } else {
      toast.error(result.error);
    }
  };

  // Calculate default valid_until (30 days from now)
  const getDefaultValidUntil = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in" data-testid="quote-form-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/quotes")}
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-white font-heading">
              {isEdit ? "Edit Quote" : "New Quote"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEdit ? "Update quote details" : "Create a quote for a customer"}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  placeholder="John Smith"
                  className="bg-background border-border"
                  required
                  data-testid="quote-customer-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_email">Customer Email</Label>
                <Input
                  id="customer_email"
                  name="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  className="bg-background border-border"
                  data-testid="quote-customer-email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main Street, Auckland"
                  className="bg-background border-border"
                  required
                  data-testid="quote-address-input"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Quote Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job_description">Job Description *</Label>
                <Textarea
                  id="job_description"
                  name="job_description"
                  value={formData.job_description}
                  onChange={handleChange}
                  placeholder="Describe the work to be done..."
                  className="bg-background border-border min-h-[100px]"
                  required
                  data-testid="quote-description-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (NZD) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="bg-background border-border"
                    required
                    data-testid="quote-price-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valid_until">Valid Until</Label>
                  <Input
                    id="valid_until"
                    name="valid_until"
                    type="date"
                    value={formData.valid_until || getDefaultValidUntil()}
                    onChange={handleChange}
                    className="bg-background border-border"
                    data-testid="quote-valid-until-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes or terms..."
                  className="bg-background border-border min-h-[80px]"
                  data-testid="quote-notes-input"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-border"
              onClick={() => navigate("/quotes")}
              data-testid="cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={loading}
              data-testid="save-quote-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Update Quote"
              ) : (
                "Create Quote"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
