// CHURVOX_INVOICE_USES_BUSINESS_DEFAULTS_20260601
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "../../components/premium";
import { ArrowLeft, Loader2, Plus, Receipt, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addDaysIso, loadBusinessSettings } from "../../lib/businessSettings";

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}
function invoiceIdOf(result) {
  const data = result?.data ?? result;
  const invoice = data?.invoice || data?.item || data?.record || data;
  return String(data?.id || data?._id || invoice?.id || invoice?._id || "");
}
function n(value) { const num = Number(value || 0); return Number.isFinite(num) ? num : 0; }
function money(value) { return n(value).toLocaleString("en-NZ", { style: "currency", currency: "NZD" }); }
function clientId(client) { return String(client?.id || client?._id || client?.client_id || ""); }
function jobId(job) { return String(job?.id || job?._id || job?.job_id || ""); }
function clientName(client) { return client?.client_name || client?.name || client?.customer_name || client?.contact_name || "Unnamed client"; }
function jobTitle(job) { return job?.title || job?.job_name || job?.customer_name || job?.client_name || "Job"; }
function emptyLine(desc = "", price = "") { return { description: desc, quantity: 1, unit_price: price, amount: n(price) }; }
function readInvoice(payload) { const data = payload?.data ?? payload; return data?.invoice || data?.item || data?.record || data || {}; }
function buildInvoiceNumber(settings) { return `${settings?.invoice_prefix || "INV"}-${Date.now().toString().slice(-6)}`; }

export default function InvoiceFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const api = useApi();
  const isEdit = Boolean(id);
  const query = new URLSearchParams(location.search);
  const jobFromQuery = query.get("job_id") || "";
  const clientFromQuery = query.get("client_id") || "";
  const quoteFromQuery = query.get("quote_id") || "";

  const [settings, setSettings] = useState(() => loadBusinessSettings());
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(() => {
    const s = loadBusinessSettings();
    return {
      client_id: clientFromQuery,
      job_id: jobFromQuery,
      quote_id: quoteFromQuery,
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      billing_address: "",
      address: "",
      site_address: "",
      description: "",
      invoice_number: buildInvoiceNumber(s),
      due_date: addDaysIso(s.default_invoice_due_days || 7),
      payment_terms: `Payment due within ${Number(s.default_invoice_due_days || 7)} days.`,
      gst_rate: Number(s.default_gst_rate || 15),
      discount_amount: 0,
      deposit_amount: 0,
      amount_paid: 0,
      payment_link: "",
      notes: "",
      internal_notes: "",
      status: "draft",
      line_items: [emptyLine("Service work", "")],
    };
  });

  useEffect(() => {
    const onSettings = (event) => {
      const next = event?.detail || loadBusinessSettings();
      setSettings(next);
      setFormData((current) => ({
        ...current,
        invoice_number: current.invoice_number || buildInvoiceNumber(next),
        due_date: current.due_date || addDaysIso(next.default_invoice_due_days || 7),
        gst_rate: current.gst_rate || Number(next.default_gst_rate || 15),
        payment_terms: current.payment_terms || `Payment due within ${Number(next.default_invoice_due_days || 7)} days.`,
      }));
    };
    window.addEventListener("churvox-business-settings-updated", onSettings);
    return () => window.removeEventListener("churvox-business-settings-updated", onSettings);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingData(true);
      const [clientRes, jobRes, invoiceRes] = await Promise.all([
        api.get("/clients"),
        api.get("/jobs"),
        isEdit ? api.get(`/invoices/${encodeURIComponent(id)}`) : Promise.resolve(null),
      ]);
      if (!mounted) return;
      const nextClients = clientRes?.success ? arr(clientRes.data) : [];
      const nextJobs = jobRes?.success ? arr(jobRes.data) : [];
      setClients(nextClients);
      setJobs(nextJobs);

      if (invoiceRes?.success) {
        const invoice = readInvoice(invoiceRes);
        setFormData({
          client_id: invoice.client_id || "",
          job_id: invoice.job_id || invoice.linked_job_id || "",
          quote_id: invoice.quote_id || invoice.linked_quote_id || "",
          customer_name: invoice.customer_name || invoice.client_name || "",
          customer_email: invoice.customer_email || invoice.client_email || "",
          customer_phone: invoice.customer_phone || invoice.phone || "",
          billing_address: invoice.billing_address || invoice.address || "",
          address: invoice.address || invoice.site_address || "",
          site_address: invoice.site_address || invoice.address || "",
          description: invoice.description || invoice.notes || "",
          invoice_number: invoice.invoice_number || invoice.number || buildInvoiceNumber(settings),
          due_date: String(invoice.due_date || "").slice(0, 10) || addDaysIso(settings.default_invoice_due_days || 7),
          payment_terms: invoice.payment_terms || `Payment due within ${Number(settings.default_invoice_due_days || 7)} days.`,
          gst_rate: invoice.gst_rate ?? settings.default_gst_rate ?? 15,
          discount_amount: invoice.discount_amount || 0,
          deposit_amount: invoice.deposit_amount || 0,
          amount_paid: invoice.amount_paid || 0,
          payment_link: invoice.payment_link || invoice.payment_url || "",
          notes: invoice.notes || "",
          internal_notes: invoice.internal_notes || "",
          status: invoice.status || "draft",
          line_items: Array.isArray(invoice.line_items) && invoice.line_items.length
            ? invoice.line_items.map((x) => ({ description: x.description || "", quantity: x.quantity || x.qty || 1, unit_price: x.unit_price ?? x.rate ?? "", amount: x.amount ?? 0 }))
            : [emptyLine(invoice.description || "Service work", invoice.subtotal || invoice.total || invoice.amount || "")],
        });
      } else {
        if (clientFromQuery) {
          const client = nextClients.find((x) => clientId(x) === String(clientFromQuery));
          if (client) applyClientRecord(client, false);
        }
        if (jobFromQuery) {
          const job = nextJobs.find((x) => jobId(x) === String(jobFromQuery));
          if (job) applyJobRecord(job, false);
        }
      }
      setLoadingData(false);
    }
    load();
    return () => { mounted = false; };
  }, [api, id, isEdit, jobFromQuery, clientFromQuery, settings.default_invoice_due_days, settings.default_gst_rate]);

  function update(key, value) { setFormData((current) => ({ ...current, [key]: value })); }
  function updateLine(index, key, value) {
    setFormData((current) => {
      const lines = [...current.line_items];
      const line = { ...lines[index], [key]: value };
      if (key === "quantity" || key === "unit_price") line.amount = Math.round(n(line.quantity) * n(line.unit_price) * 100) / 100;
      lines[index] = line;
      return { ...current, line_items: lines };
    });
  }
  function addLine() { setFormData((current) => ({ ...current, line_items: [...current.line_items, emptyLine()] })); }
  function removeLine(index) {
    setFormData((current) => {
      const next = current.line_items.filter((_, i) => i !== index);
      return { ...current, line_items: next.length ? next : [emptyLine()] };
    });
  }
  function applyClientRecord(client, setClientId = true) {
    setFormData((current) => ({
      ...current,
      client_id: setClientId ? clientId(client) : current.client_id,
      customer_name: clientName(client) || current.customer_name,
      customer_email: client.email || client.customer_email || client.client_email || current.customer_email,
      customer_phone: client.phone || client.mobile || client.customer_phone || current.customer_phone,
      billing_address: client.billing_address || client.address || current.billing_address,
      address: client.address || client.site_address || current.address,
      site_address: client.site_address || client.address || current.site_address,
    }));
  }
  function applyClient(selectedId) {
    update("client_id", selectedId);
    const client = clients.find((x) => clientId(x) === String(selectedId));
    if (client) applyClientRecord(client, false);
  }
  function applyJobRecord(job, setJobId = true) {
    const price = n(job.price || job.job_price || job.fixed_price || job.total || job.amount || 0);
    const desc = job.ai_invoice_description || job.invoice_description_draft || job.description || job.notes || job.title || job.job_name || "Service work completed";
    setFormData((current) => ({
      ...current,
      job_id: setJobId ? jobId(job) : current.job_id,
      client_id: job.client_id || current.client_id,
      customer_name: job.customer_name || job.client_name || current.customer_name,
      customer_email: job.customer_email || job.client_email || current.customer_email,
      address: job.address || job.site_address || current.address,
      site_address: job.site_address || job.address || current.site_address,
      description: desc,
      line_items: [emptyLine(desc, price)],
    }));
  }
  function applyJobId(selectedId) {
    update("job_id", selectedId);
    const job = jobs.find((x) => jobId(x) === String(selectedId));
    if (job) applyJobRecord(job, false);
  }

  const subtotal = useMemo(() => formData.line_items.reduce((sum, line) => sum + n(line.amount), 0), [formData.line_items]);
  const discount = n(formData.discount_amount);
  const gstRate = n(formData.gst_rate);
  const gstAmount = Math.max(0, subtotal - discount) * gstRate / 100;
  const total = Math.max(0, subtotal - discount) + gstAmount;
  const paid = n(formData.amount_paid) + n(formData.deposit_amount);
  const due = Math.max(0, total - paid);

  async function save(event) {
    event.preventDefault();
    if (!formData.customer_name.trim()) return toast.error("Customer name is required");
    if (!formData.line_items.some((x) => x.description && n(x.amount) > 0)) return toast.error("Add at least one invoice line item");
    setSaving(true);
    const payload = {
      ...formData,
      client_name: formData.customer_name,
      customer_name: formData.customer_name,
      address: formData.site_address || formData.address || formData.billing_address,
      site_address: formData.site_address || formData.address,
      line_items: formData.line_items.map((line) => ({ description: line.description, quantity: n(line.quantity) || 1, qty: n(line.quantity) || 1, unit_price: n(line.unit_price), rate: n(line.unit_price), amount: n(line.amount) })),
      subtotal,
      gst_amount: gstAmount,
      tax_amount: gstAmount,
      total,
      amount: total,
      amount_due: due,
      balance_due: due,
      status: formData.status || "draft",
      invoice_prefix: settings.invoice_prefix || "INV",
      business_snapshot: settings,
      business_name: settings.business_name || "",
      business_email: settings.email || "",
      business_phone: settings.phone || "",
      business_address: settings.business_address || "",
      bank_account_name: settings.bank_account_name || "",
      bank_account_number: settings.bank_account_number || "",
      gst_number: settings.gst_number || "",
    };
    const res = isEdit ? await api.patch(`/invoices/${encodeURIComponent(id)}`, payload) : await api.post("/invoices", payload);
    setSaving(false);
    if (res.success) {
      const createdId = invoiceIdOf(res) || id;
      toast.success(isEdit ? "Invoice updated" : "Invoice created");
      navigate(createdId ? `/invoices/${createdId}` : "/invoices");
    } else toast.error(res.error || "Could not save invoice");
  }

  const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-white";
  const labelClass = "text-sm font-black text-slate-200";

  return <Layout><PremiumPage maxWidth={1080}>
    <button type="button" onClick={() => navigate("/invoices")} className="mb-3 inline-flex items-center gap-2 text-sm font-black text-slate-300 hover:text-white"><ArrowLeft size={16} /> Back to invoices</button>
    <PremiumHero eyebrow={isEdit ? "Edit invoice" : "First invoice"} title={isEdit ? "Edit invoice" : "Create an invoice ready to send"} subtitle="Invoices use your business setup defaults for GST, due date, prefixes, bank details and business snapshot." icon={<Receipt className="h-6 w-6" />} />
    {loadingData ? <PremiumCard><div className="p-8 text-center font-bold text-slate-300">Loading invoice workspace…</div></PremiumCard> : <form onSubmit={save} className="space-y-6" data-testid="stable-invoice-form" data-version="CHURVOX_INVOICE_USES_BUSINESS_DEFAULTS_20260601">
      <PremiumCard title="Business defaults"><div className="rounded-2xl border border-lime-300/20 bg-lime-300/10 p-3 text-sm font-bold text-lime-100">{settings.business_name || "No business name yet"} · Prefix {settings.invoice_prefix || "INV"} · GST {settings.default_gst_rate || 15}% · Due in {settings.default_invoice_due_days || 7} days</div></PremiumCard>
      <PremiumCard title="Customer and linked work"><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="space-y-2"><span className={labelClass}>Saved client</span><select value={formData.client_id} onChange={(e) => applyClient(e.target.value)} className={inputClass}><option value="">Select client</option>{clients.map((client) => <option key={clientId(client)} value={clientId(client)}>{clientName(client)}</option>)}</select></label><label className="space-y-2"><span className={labelClass}>Linked job</span><select value={formData.job_id} onChange={(e) => applyJobId(e.target.value)} className={inputClass}><option value="">No linked job</option>{jobs.map((job) => <option key={jobId(job)} value={jobId(job)}>{jobTitle(job)} — {job.status || "open"}</option>)}</select></label>{[["customer_name", "Customer name *"], ["customer_email", "Customer email"], ["customer_phone", "Customer phone"], ["billing_address", "Billing address"], ["site_address", "Site / job address"], ["quote_id", "Linked quote ID"]].map(([key, label]) => <label className="space-y-2" key={key}><span className={labelClass}>{label}</span><input value={formData[key] || ""} onChange={(e) => update(key, e.target.value)} className={inputClass} /></label>)}</div></PremiumCard>
      <PremiumCard title="Invoice lines"><div className="space-y-3">{formData.line_items.map((line, index) => <div key={index} className="grid grid-cols-12 gap-3 items-end rounded-2xl border border-slate-700 bg-slate-950/50 p-3"><label className="col-span-12 space-y-1 md:col-span-5"><span className="text-xs font-black text-slate-300">Description</span><input value={line.description} onChange={(e) => updateLine(index, "description", e.target.value)} className={inputClass} /></label><label className="col-span-4 space-y-1 md:col-span-2"><span className="text-xs font-black text-slate-300">Qty</span><input type="number" step="0.01" value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} className={inputClass} /></label><label className="col-span-4 space-y-1 md:col-span-2"><span className="text-xs font-black text-slate-300">Unit price</span><input type="number" step="0.01" value={line.unit_price} onChange={(e) => updateLine(index, "unit_price", e.target.value)} className={inputClass} /></label><label className="col-span-4 space-y-1 md:col-span-2"><span className="text-xs font-black text-slate-300">Line total</span><input type="number" step="0.01" value={line.amount} onChange={(e) => updateLine(index, "amount", e.target.value)} className={inputClass} /></label><button type="button" onClick={() => removeLine(index)} className="col-span-12 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200 md:col-span-1"><Trash2 size={16} /></button></div>)}<button type="button" onClick={addLine} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950"><Plus size={16} /> Add line item</button></div></PremiumCard>
      <PremiumCard title="Terms, tax and payment"><div className="grid grid-cols-1 gap-4 md:grid-cols-3">{[["invoice_number", "Invoice number"], ["due_date", "Due date", "date"], ["gst_rate", "GST rate %", "number"], ["discount_amount", "Discount", "number"], ["deposit_amount", "Deposit / already paid", "number"], ["amount_paid", "Other amount paid", "number"], ["payment_link", "Payment link"], ["payment_terms", "Payment terms"]].map(([key, label, type = "text"]) => <label className="space-y-2" key={key}><span className={labelClass}>{label}</span><input type={type} value={formData[key] || ""} onChange={(e) => update(key, e.target.value)} className={inputClass} /></label>)}<label className="space-y-2 md:col-span-3"><span className={labelClass}>Customer description / public notes</span><textarea value={formData.description} onChange={(e) => update("description", e.target.value)} rows={3} className={inputClass} /></label><label className="space-y-2 md:col-span-3"><span className={labelClass}>Internal notes</span><textarea value={formData.internal_notes} onChange={(e) => update("internal_notes", e.target.value)} rows={2} className={inputClass} /></label></div></PremiumCard>
      <PremiumCard title="Invoice preview"><div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5"><div><span className="block text-slate-300">Subtotal</span><b className="text-white">{money(subtotal)}</b></div><div><span className="block text-slate-300">Discount</span><b className="text-white">{money(discount)}</b></div><div><span className="block text-slate-300">GST</span><b className="text-white">{money(gstAmount)}</b></div><div><span className="block text-slate-300">Total</span><b className="text-cyan-300">{money(total)}</b></div><div><span className="block text-slate-300">Amount due</span><b className="text-lime-300">{money(due)}</b></div></div></PremiumCard>
      <div className="flex justify-end gap-3"><button type="button" onClick={() => navigate("/invoices")} className="rounded-full border border-slate-600 px-5 py-3 font-black text-slate-100">Cancel</button><PremiumButton type="submit" disabled={saving} iconLeft={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}>{saving ? "Saving…" : isEdit ? "Update invoice" : "Create invoice"}</PremiumButton></div>
    </form>}
  </PremiumPage></Layout>;
}
