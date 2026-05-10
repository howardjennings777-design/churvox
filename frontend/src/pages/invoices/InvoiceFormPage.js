import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Receipt, Save } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "@/components/premium";
import InvoiceCreateForm from "@/components/forms/InvoiceCreateForm";

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

  if (!isEdit) {
    return (
      <Layout>
        <PremiumPage maxWidth={820}>
          <PremiumHero eyebrow="New" title="New Invoice" subtitle="Create in full page layout." />
          <PremiumCard>
            <InvoiceCreateForm onCancel={() => navigate("/invoices")} onSuccess={() => navigate("/invoices")} submitLabel="Create" />
          </PremiumCard>
        </PremiumPage>
      </Layout>
    );
  }

  return (
    <Layout>
      <PremiumPage maxWidth={820}>
        <button onClick={() => navigate("/invoices")} className="flex items-center gap-2 text-[#5b6c87] hover:text-[#0d1b34] text-sm font-semibold" data-testid="back-button">
          <ArrowLeft size={16} /> Back to invoices
        </button>

        <PremiumHero
          eyebrow={isEdit ? "Edit invoice" : "New invoice"}
          title={isEdit ? "Edit Invoice" : "New Invoice"}
          subtitle={isEdit ? "Update invoice details, amounts and GST." : "Create a new invoice for your customer."}
          icon={<Receipt className="h-6 w-6" />}
        />

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="invoice-form-page">
          <PremiumCard title="Customer details" icon={<Receipt className="h-5 w-5" />}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client_id" className="text-[#0d1b34] font-semibold">Client</Label>
                <select
                  id="client_id"
                  name="client_id"
                  value={formData.client_id}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full h-10 rounded-md border border-[#d8e3f3] bg-[#f6faff] px-3 text-[#0d1b34]"
                  data-testid="invoice-client-select"
                >
                  <option value="">Select saved client</option>
                  {clients.map((client) => (
                    <option key={client.id || client._id} value={client.id || client._id}>
                      {client.client_name || client.name || client.contact_name || "Unnamed client"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_name" className="text-[#0d1b34] font-semibold">Customer Name *</Label>
                <Input
                  id="customer_name"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  placeholder="John Smith"
                  className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]"
                  required
                  data-testid="invoice-customer-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_email" className="text-[#0d1b34] font-semibold">Customer Email</Label>
                <Input
                  id="customer_email"
                  name="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]"
                  data-testid="invoice-customer-email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-[#0d1b34] font-semibold">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main Street, Auckland"
                  className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]"
                  data-testid="invoice-address-input"
                />
              </div>
            </div>
          </PremiumCard>

          <PremiumCard title="Invoice details" icon={<Receipt className="h-5 w-5" />}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-[#0d1b34] font-semibold">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the services provided..."
                  className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34] min-h-[120px]"
                  required
                  data-testid="invoice-description-input"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subtotal" className="text-[#0d1b34] font-semibold">Subtotal (NZD) *</Label>
                  <Input
                    id="subtotal"
                    name="subtotal"
                    type="number"
                    value={formData.subtotal}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]"
                    required
                    data-testid="invoice-subtotal-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gst_rate" className="text-[#0d1b34] font-semibold">GST Rate (%)</Label>
                  <Input
                    id="gst_rate"
                    name="gst_rate"
                    type="number"
                    value={formData.gst_rate}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.5"
                    className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]"
                    data-testid="invoice-gst-rate-input"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#eff4ff] border border-[#dbe7ff] rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#5b6c87]">Subtotal</span>
                  <span className="text-[#0d1b34] font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#5b6c87]">GST ({gstRate}%)</span>
                  <span className="text-[#0d1b34] font-semibold">${gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#d8e3f3]">
                  <span className="text-[#0d1b34]">Total</span>
                  <span className="text-[#2563eb]" style={{ fontFamily: "'Outfit', sans-serif" }}>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[#0d1b34] font-semibold">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes or payment terms..."
                  className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34] min-h-[80px]"
                  data-testid="invoice-notes-input"
                />
              </div>
            </div>
          </PremiumCard>

          <div className="flex gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-w-[140px] border-[#d8e3f3] text-[#1a2c4d] hover:bg-[#eff4ff]"
              onClick={() => navigate("/invoices")}
              data-testid="cancel-button"
            >
              Cancel
            </Button>
            <PremiumButton
              type="submit"
              disabled={loading}
              dataTestId="save-invoice-button"
              className="flex-1 min-w-[200px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEdit ? "Update Invoice" : "Create Invoice"}
                </>
              )}
            </PremiumButton>
          </div>
        </form>
      </PremiumPage>
    </Layout>
  );
}
