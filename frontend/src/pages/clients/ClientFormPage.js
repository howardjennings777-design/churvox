import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, UserPlus2, Save } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "@/components/premium";
import ClientCreateForm from "@/components/forms/ClientCreateForm";

export default function ClientFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { get, post, patch, loading } = useApi();
  const isEdit = !!id;
  const { maxClients } = usePlanLimits(user?.plan);
  const [clientCount, setClientCount] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    if (isEdit) {
      loadClient();
    } else {
      loadClientCount();
    }
  }, [id]);

  const loadClient = async () => {
    const result = await get(`/clients/${id}`);
    if (result.success) {
      setFormData({
        name: result.data.name || "",
        email: result.data.email || "",
        phone: result.data.phone || "",
        address: result.data.address || "",
        notes: result.data.notes || "",
      });
    } else {
      toast.error("Client not found");
      navigate("/clients");
    }
  };

  const loadClientCount = async () => {
    const result = await get("/clients");
    if (result.success && Array.isArray(result.data)) {
      setClientCount(result.data.length);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Client name is required");
      return;
    }

    const payload = {
      ...formData,
      name: formData.name?.trim() || "",
      email: formData.email?.trim() || "",
      phone: formData.phone?.trim() || "",
      address: formData.address?.trim() || "",
      notes: formData.notes?.trim() || "",
    };

    try {
      const result = isEdit
        ? await patch(`/clients/${id}`, payload)
        : await post("/clients", payload);

      if (result?.success) {
        toast.success(isEdit ? "Client updated" : "Client created");
        navigate("/clients");
      } else {
        toast.error(result?.error || "Failed to save client");
      }
    } catch (err) {
      console.error("CLIENT_SAVE_ERROR", err);
      toast.error("Failed to save client");
    }
  };

  if (!isEdit) {
    return (
      <Layout>
        <PremiumPage maxWidth={820}>
          <PremiumHero eyebrow="New" title="New Client" subtitle="Create in full page layout." />
          <PremiumCard>
            <ClientCreateForm onCancel={() => navigate("/clients")} onSuccess={() => navigate("/clients")} submitLabel="Create" />
          </PremiumCard>
        </PremiumPage>
      </Layout>
    );
  }

  return (
    <Layout>
      <PremiumPage maxWidth={780}>
        <button onClick={() => navigate("/clients")} className="flex items-center gap-2 text-[#5b6c87] hover:text-[#0d1b34] text-sm font-semibold" data-testid="back-button">
          <ArrowLeft size={16} /> Back to clients
        </button>

        <PremiumHero
          eyebrow={isEdit ? "Edit client" : "New client"}
          title={isEdit ? "Edit Client" : "New Client"}
          subtitle={isEdit ? "Update contact details and notes." : "Add a new client to your database."}
          icon={<UserPlus2 className="h-6 w-6" />}
        />

        <PremiumCard title="Client details" icon={<UserPlus2 className="h-5 w-5" />}>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="client-form-page">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#0d1b34] font-semibold">Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Smith"
                className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34] focus-visible:ring-[#2563eb]"
                required
                data-testid="client-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#0d1b34] font-semibold">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]"
                data-testid="client-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[#0d1b34] font-semibold">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="021 123 4567"
                className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]"
                data-testid="client-phone-input"
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
                data-testid="client-address-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-[#0d1b34] font-semibold">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional notes about this client..."
                className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34] min-h-[120px]"
                data-testid="client-notes-input"
              />
            </div>

            <div className="flex gap-3 pt-4 flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="flex-1 min-w-[140px] border-[#d8e3f3] text-[#1a2c4d] hover:bg-[#eff4ff]"
                onClick={() => navigate("/clients")}
                data-testid="cancel-button"
              >
                Cancel
              </Button>
              <PremiumButton
                type="submit"
                disabled={loading}
                dataTestId="save-client-button"
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
                    {isEdit ? "Update Client" : "Create Client"}
                  </>
                )}
              </PremiumButton>
            </div>
          </form>
        </PremiumCard>
      </PremiumPage>
    </Layout>
  );
}
