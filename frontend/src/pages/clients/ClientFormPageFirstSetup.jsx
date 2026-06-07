// CHURVOX_CLIENT_FORM_COMMAND_BOARD_ROUTES_20260608
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { useApi } from "@/hooks/useApi";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "@/components/premium";
import { ArrowLeft, Save, UserPlus2 } from "lucide-react";
import { toast } from "sonner";

const FIRST_SETUP_KEY = "churvox_first_setup_pending";

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (value.$oid) return String(value.$oid);
    if (value.oid) return String(value.oid);
    if (value.id) return normalizeId(value.id);
    if (value._id) return normalizeId(value._id);
  }
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}
function recordId(payload) {
  const data = payload?.data ?? payload;
  const item = data?.client || data?.customer || data?.item || data?.record || data;
  return normalizeId(data?.id || data?._id || data?.client_id || data?.customer_id || item?.id || item?._id || item?.client_id || item?.customer_id || "");
}
function readClient(payload) {
  const data = payload?.data ?? payload;
  return data?.client || data?.customer || data?.item || data?.record || data || {};
}
function firstSetupActive(searchParams, isEdit) {
  if (isEdit) return false;
  try {
    return searchParams.get("first_setup") === "1" || ["true", "client", "job"].includes(localStorage.getItem(FIRST_SETUP_KEY));
  } catch { return false; }
}

export default function ClientFormPageFirstSetup() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const api = useApi();
  const isEdit = Boolean(id);
  const firstSetup = firstSetupActive(searchParams, isEdit);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", billing_address: "", notes: "" });

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
        navigate("/clients-board");
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [api, id, isEdit, navigate]);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return toast.error("Client name is required");
    setSaving(true);
    const payload = {
      name,
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
    };
    const res = isEdit ? await api.patch(`/clients/${encodeURIComponent(id)}`, payload) : await api.post("/clients", payload);
    setSaving(false);
    if (!res.success) return toast.error(res.error || "Could not save client");
    const nextId = recordId(res) || normalizeId(id);
    toast.success(isEdit ? "Client updated" : firstSetup ? "First client created" : "Client created");
    if (firstSetup && nextId) {
      try { localStorage.setItem(FIRST_SETUP_KEY, "job"); } catch {}
      navigate(`/jobs/new?client_id=${encodeURIComponent(nextId)}&first_setup=1`);
      return;
    }
    navigate(nextId ? `/clients/${encodeURIComponent(nextId)}` : "/clients-board");
  }

  return <Layout><PremiumPage maxWidth={860}>
    <button type="button" onClick={() => navigate(firstSetup ? "/settings-board?first_setup=1" : "/clients-board")} className="mb-3 inline-flex items-center gap-2 text-sm font-black text-slate-300 hover:text-white"><ArrowLeft size={16} /> {firstSetup ? "Back to setup" : "Back to Clients board"}</button>
    <PremiumHero eyebrow={isEdit ? "Edit client" : firstSetup ? "Step 3 of 4" : "New client"} title={isEdit ? "Update client record" : "Add a client"} subtitle={firstSetup ? "This gives Churvox a real customer to connect your first job, quote, invoice and approval flow." : "Clients feed jobs, quotes, invoices and customer records. Add the core details once so the rest of Churvox can prefill cleanly."} icon={<UserPlus2 className="h-6 w-6" />} />
    {firstSetup ? <div className="mb-4 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-bold text-cyan-100">First setup path: Plan selected → Business setup → First client → First job → Command Board.</div> : null}
    <PremiumCard title="Client details" icon={<UserPlus2 className="h-5 w-5" />}>
      {loading ? <div className="p-8 text-center font-bold text-slate-300">Loading client…</div> : <form onSubmit={submit} className="grid gap-4" data-testid="client-form-page" data-version="CHURVOX_CLIENT_FORM_COMMAND_BOARD_ROUTES_20260608">
        <label className="grid gap-2"><span className="text-sm font-black text-slate-200">Client name *</span><input className="px-input" value={form.name} onChange={(e) => update("name", e.target.value)} required data-testid="client-name-input" /></label>
        <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-2"><span className="text-sm font-black text-slate-200">Email</span><input className="px-input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} data-testid="client-email-input" /></label><label className="grid gap-2"><span className="text-sm font-black text-slate-200">Phone</span><input className="px-input" value={form.phone} onChange={(e) => update("phone", e.target.value)} data-testid="client-phone-input" /></label></div>
        <label className="grid gap-2"><span className="text-sm font-black text-slate-200">Site address</span><input className="px-input" value={form.address} onChange={(e) => update("address", e.target.value)} data-testid="client-address-input" /></label>
        <label className="grid gap-2"><span className="text-sm font-black text-slate-200">Billing address</span><input className="px-input" value={form.billing_address} onChange={(e) => update("billing_address", e.target.value)} placeholder="Leave blank to use site address" /></label>
        <label className="grid gap-2"><span className="text-sm font-black text-slate-200">Notes</span><textarea className="px-input min-h-[110px]" value={form.notes} onChange={(e) => update("notes", e.target.value)} data-testid="client-notes-input" /></label>
        <div className="flex flex-wrap justify-end gap-3 pt-2"><button type="button" onClick={() => navigate(firstSetup ? "/dashboard" : "/clients-board")} className="rounded-full border border-slate-600 px-5 py-3 font-black text-slate-100">{firstSetup ? "Skip to Command Board" : "Cancel"}</button><PremiumButton type="submit" disabled={saving} dataTestId="save-client-button" iconLeft={<Save className="h-4 w-4" />}>{saving ? "Saving…" : isEdit ? "Update client" : firstSetup ? "Create client and first job" : "Create client"}</PremiumButton></div>
      </form>}
    </PremiumCard>
  </PremiumPage></Layout>;
}
