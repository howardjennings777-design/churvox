// CHURVOX_FIRST_CLIENT_FLOW_STABLE_20260601
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { useApi } from "@/hooks/useApi";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "@/components/premium";
import { ArrowLeft, Save, UserPlus2 } from "lucide-react";
import { toast } from "sonner";

function recordId(payload) {
  const data = payload?.data ?? payload;
  const item = data?.client || data?.customer || data?.item || data?.record || data;
  return String(data?.id || data?._id || item?.id || item?._id || "");
}

function readClient(payload) {
  const data = payload?.data ?? payload;
  return data?.client || data?.customer || data?.item || data?.record || data || {};
}

export default function ClientFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const api = useApi();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    billing_address: "",
    notes: "",
  });

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!isEdit) return;
      setLoading(true);
      const res = await api.get(`/clients/${encodeURIComponent(id)}`);
      if (!alive) return;
      if (res.success) {
        const client = readClient(res);
        setForm({
          name: client.name || client.client_name || client.customer_name || client.contact_name || "",
          email: client.email || client.customer_email || client.client_email || "",
          phone: client.phone || client.mobile || client.customer_phone || "",
          address: client.address || client.site_address || client.customer_address || "",
          billing_address: client.billing_address || client.address || "",
          notes: client.notes || client.internal_notes || "",
        });
      } else {
        toast.error(res.error || "Client not found");
        navigate("/clients");
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [api, id, isEdit, navigate]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return toast.error("Client name is required");
    setSaving(true);
    const payload = {
      ...form,
      name,
      client_name: name,
      customer_name: name,
      contact_name: name,
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      billing_address: (form.billing_address || form.address).trim(),
      notes: form.notes.trim(),
    };
    const res = isEdit ? await api.patch(`/clients/${encodeURIComponent(id)}`, payload) : await api.post("/clients", payload);
    setSaving(false);
    if (res.success) {
      const nextId = recordId(res) || id;
      toast.success(isEdit ? "Client updated" : "Client created");
      navigate(nextId ? `/clients/${nextId}` : "/clients");
    } else {
      toast.error(res.error || "Could not save client");
    }
  }

  return (
    <Layout>
      <PremiumPage maxWidth={860}>
        <button type="button" onClick={() => navigate("/clients")} className="mb-3 inline-flex items-center gap-2 text-sm font-black text-slate-300 hover:text-white">
          <ArrowLeft size={16} /> Back to clients
        </button>
        <PremiumHero
          eyebrow={isEdit ? "Edit client" : "First client"}
          title={isEdit ? "Update client record" : "Add your first client"}
          subtitle="Clients feed jobs, quotes, invoices, message approvals and customer records. Add the core details once so the rest of Churvox can prefill cleanly."
          icon={<UserPlus2 className="h-6 w-6" />}
        />
        <PremiumCard title="Client details" icon={<UserPlus2 className="h-5 w-5" />}>
          {loading ? <div className="p-8 text-center font-bold text-slate-300">Loading client…</div> : (
            <form onSubmit={submit} className="grid gap-4" data-testid="client-form-page">
              <label className="grid gap-2"><span className="text-sm font-black text-slate-200">Client name *</span><input className="px-input" value={form.name} onChange={(e) => update("name", e.target.value)} required data-testid="client-name-input" /></label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2"><span className="text-sm font-black text-slate-200">Email</span><input className="px-input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} data-testid="client-email-input" /></label>
                <label className="grid gap-2"><span className="text-sm font-black text-slate-200">Phone</span><input className="px-input" value={form.phone} onChange={(e) => update("phone", e.target.value)} data-testid="client-phone-input" /></label>
              </div>
              <label className="grid gap-2"><span className="text-sm font-black text-slate-200">Site address</span><input className="px-input" value={form.address} onChange={(e) => update("address", e.target.value)} data-testid="client-address-input" /></label>
              <label className="grid gap-2"><span className="text-sm font-black text-slate-200">Billing address</span><input className="px-input" value={form.billing_address} onChange={(e) => update("billing_address", e.target.value)} placeholder="Leave blank to use site address" /></label>
              <label className="grid gap-2"><span className="text-sm font-black text-slate-200">Notes</span><textarea className="px-input min-h-[110px]" value={form.notes} onChange={(e) => update("notes", e.target.value)} data-testid="client-notes-input" /></label>
              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button type="button" onClick={() => navigate("/clients")} className="rounded-full border border-slate-600 px-5 py-3 font-black text-slate-100">Cancel</button>
                <PremiumButton type="submit" disabled={saving} dataTestId="save-client-button" iconLeft={<Save className="h-4 w-4" />}>{saving ? "Saving…" : isEdit ? "Update client" : "Create client"}</PremiumButton>
              </div>
            </form>
          )}
        </PremiumCard>
      </PremiumPage>
    </Layout>
  );
}
