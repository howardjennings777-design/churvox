import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { usePlanLimits } from "@/hooks/usePlanLimits";

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

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in pb-36 md:pb-6" data-testid="client-form-page">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/clients")}
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {isEdit ? "Edit Client" : "New Client"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEdit ? "Update client information" : "Add a new client to your database"}
            </p>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Client Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Smith"
                  className="bg-background border-border"
                  required
                  data-testid="client-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  className="bg-background border-border"
                  data-testid="client-email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="021 123 4567"
                  className="bg-background border-border"
                  data-testid="client-phone-input"
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
                  data-testid="client-address-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes about this client..."
                  className="bg-background border-border min-h-[100px]"
                  data-testid="client-notes-input"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-border"
                  onClick={() => navigate("/clients")}
                  data-testid="cancel-button"
                >
                  Cancel
                </Button>
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-slate-900 hover:bg-primary/90 cursor-pointer touch-manipulation select-none"
                  disabled={loading}
                  data-testid="save-client-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : isEdit ? (
                    "Update Client"
                  ) : (
                    "Create Client"
                  )}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
