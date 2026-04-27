import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";

export default function InvoiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { get, post, patch, loading } = useApi();
  const isEdit = !!id;

  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    client_id: "",
    customer_name: "",
    customer_email: "",
    address: "",
    description: "",
    subtotal: "",
    gst_rate: user?.gst_rate || 15,
    notes: "",
  });

  useEffect(() => {
    loadClients();
    if (isEdit) {
      loadInvoice();
    }
  }, [id]);

  const loadClients = async () => {
    const result = await get("/clients");
    if (result.success && Array.isArray(result.data)) {
      setClients(result.data);
    } else {
      setClients([]);
    }
  };

  const loadInvoice = async () => {
    const result = await get(`/invoices/${id}`);
    if (result.success) {
      const invoice = result.data;
      setFormData({
        client_id: invoice.client_id || "",
        customer_name: invoice.customer_name || "",
        customer_email: invoice.customer_email || "",
        address: invoice.address || "",
        description: invoice.description || "",
        subtotal: invoice.subtotal?.toString() || "",
        gst_rate: invoice.gst_rate || 15,
        notes: invoice.notes || "",
      });
    } else {
      toast.error("Invoice not found");
      navigate("/invoices");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleClientSelect = (clientId) => {
    const client = clients.find((c) => String(c.id || c._id) === String(clientId));
    setFormData((prev) => ({
      ...prev,
      client_id: clientId,
      customer_name: client?.client_name || client?.name || client?.contact_name || "",
      customer_email: client?.email || "",
      address: client?.address || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!formData.subtotal || Number(formData.subtotal) <= 0) {
      toast.error("Valid subtotal is required");
      return;
    }

    const invoiceData = {
      ...formData,
      client_id: formData.client_id || null,
      subtotal: Number(formData.subtotal),
      gst_rate: Number(formData.gst_rate),
    };

    const result = isEdit
      ? await patch(`/invoices/${id}`, invoiceData)
      : await post("/invoices", invoiceData);

    if (result.success) {
      toast.success(isEdit ? "Invoice updated" : "Invoice created");
      navigate("/invoices");
    } else {
      toast.error(result.error);
    }
  };

  // Calculate totals
  const subtotal = Number(formData.subtotal) || 0;
  const gstRate = Number(formData.gst_rate) || 0;
  const gstAmount = subtotal * (gstRate / 100);
  const total = subtotal + gstAmount;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in" data-testid="invoice-form-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/invoices")}
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {isEdit ? "Edit Invoice" : "New Invoice"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEdit ? "Update invoice details" : "Create a new invoice"}
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
                <Label htmlFor="client_id">Client</Label>
                <select
                  id="client_id"
                  name="client_id"
                  value={formData.client_id}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-white"
                  data-testid="invoice-client-select"
                >
                  <option value="" style={{ color: "#111827", backgroundColor: "#ffffff" }}>Select saved client</option>
                  {clients.map((client) => (
                    <option
                      key={client.id || client._id}
                      value={client.id || client._id}
                      style={{ color: "#111827", backgroundColor: "#ffffff" }}
                    >
                      {client.client_name || client.name || client.contact_name || "Unnamed client"}
                    </option>
                  ))}
                </select>
              </div>

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
                  data-testid="invoice-customer-name-input"
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
                  data-testid="invoice-customer-email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main Street, Auckland"
                  className="bg-background border-border"
                  data-testid="invoice-address-input"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the services provided..."
                  className="bg-background border-border min-h-[100px]"
                  required
                  data-testid="invoice-description-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subtotal">Subtotal (NZD) *</Label>
                  <Input
                    id="subtotal"
                    name="subtotal"
                    type="number"
                    value={formData.subtotal}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="bg-background border-border"
                    required
                    data-testid="invoice-subtotal-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gst_rate">GST Rate (%)</Label>
                  <Input
                    id="gst_rate"
                    name="gst_rate"
                    type="number"
                    value={formData.gst_rate}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.5"
                    className="bg-background border-border"
                    data-testid="invoice-gst-rate-input"
                  />
                </div>
              </div>

              {/* Totals Preview */}
              <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST ({gstRate}%)</span>
                  <span className="text-slate-900">${gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border">
                  <span className="text-slate-900">Total</span>
                  <span className="text-slate-900">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes or payment terms..."
                  className="bg-background border-border min-h-[80px]"
                  data-testid="invoice-notes-input"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-border"
              onClick={() => navigate("/invoices")}
              data-testid="cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={loading}
              data-testid="save-invoice-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Update Invoice"
              ) : (
                "Create Invoice"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
