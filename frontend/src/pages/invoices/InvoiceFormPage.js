import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "../../components/premium";
import { ArrowLeft, Loader2, Plus, Receipt, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

function invoiceIdOf(result) {
  const invoice = result?.data?.invoice || result?.invoice || result?.data || result;
  return String(result?.data?.id || invoice?.id || invoice?._id || "");
}

function todayPlus(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 7));
  return d.toISOString().slice(0, 10);
}

function n(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function money(value) {
  return n(value).toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

const emptyLine = () => ({ description: "", quantity: 1, unit_price: "", amount: 0 });

export default function InvoiceFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const api = useApi();
  const isEdit = Boolean(id);
  const query = new URLSearchParams(location.search);
  const jobFromQuery = query.get("job_id") || "";

  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [settings, setSettings] = useState({});
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "",
    job_id: jobFromQuery,
    quote_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    billing_address: "",
    address: "",
    site_address: "",
    description: "",
    invoice_number: "",
    due_date: "",
    payment_terms: "",
    gst_rate: 15,
    discount_amount: 0,
    deposit_amount: 0,
    amount_paid: 0,
    payment_link: "",
    notes: "",
    internal_notes: "",
    status: "draft",
    line_items: [emptyLine()],
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingData(true);
      const [clientRes, jobRes, setupRes, invoiceRes] = await Promise.all([
        api.get("/clients"),
        api.get("/jobs"),
        api.get("/business/settings"),
        isEdit ? api.get(`/invoices/${id}`) : Promise.resolve(null),
      ]);
      if (!mounted) return;

      const nextClients = Array.isArray(clientRes?.data) ? clientRes.data : Array.isArray(clientRes?.data?.clients) ? clientRes.data.clients : [];
      const nextJobs = Array.isArray(jobRes?.data) ? jobRes.data : Array.isArray(jobRes?.data?.jobs) ? jobRes.data.jobs : [];
      const setup = setupRes?.data?.settings || {};
      setClients(nextClients);
      setJobs(nextJobs);
      setSettings(setup);

      const baseDueDays = setup?.default_invoice_due_days || 7;
      setFormData((current) => ({
        ...current,
        gst_rate: setup?.default_gst_rate ?? current.gst_rate,
        due_date: current.due_date || todayPlus(baseDueDays),
        payment_terms: current.payment_terms || `Payment due within ${baseDueDays} days.`,
      }));

      if (invoiceRes?.success) {
        const invoice = invoiceRes.data || {};
        setFormData({
          client_id: invoice.client_id || "",
          job_id: invoice.job_id || invoice.linked_job_id || "",
          quote_id: invoice.quote_id || invoice.linked_quote_id || "",
          customer_name: invoice.customer_name || "",
          customer_email: invoice.customer_email || "",
          customer_phone: invoice.customer_phone || "",
          billing_address: invoice.billing_address || invoice.address || "",
          address: invoice.address || "",
          site_address: invoice.site_address || invoice.address || "",
          description: invoice.description || "",
          invoice_number: invoice.invoice_number || "",
          due_date: String(invoice.due_date || "").slice(0, 10) || todayPlus(baseDueDays),
          payment_terms: invoice.payment_terms || `Payment due within ${baseDueDays} days.`,
          gst_rate: invoice.gst_rate ?? setup?.default_gst_rate ?? 15,
          discount_amount: invoice.discount_amount || 0,
          deposit_amount: invoice.deposit_amount || 0,
          amount_paid: invoice.amount_paid || 0,
          payment_link: invoice.payment_link || "",
          notes: invoice.notes || "",
          internal_notes: invoice.internal_notes || "",
          status: invoice.status || "draft",
          line_items: Array.isArray(invoice.line_items) && invoice.line_items.length
            ? invoice.line_items.map((x) => ({
                description: x.description || "",
                quantity: x.quantity || 1,
                unit_price: x.unit_price ?? x.rate ?? "",
                amount: x.amount ?? 0,
              }))
            : [{ description: invoice.description || "", quantity: 1, unit_price: invoice.subtotal || "", amount: invoice.subtotal || 0 }],
        });
      } else if (jobFromQuery) {
        const job = nextJobs.find((x) => String(x.id || x._id) === String(jobFromQuery));
        if (job) applyJob(job, false);
      }

      setLoadingData(false);
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  function update(key, value) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function updateLine(index, key, value) {
    setFormData((current) => {
      const lines = [...current.line_items];
      const line = { ...lines[index], [key]: value };
      if (key === "quantity" || key === "unit_price") {
        line.amount = Math.round(n(line.quantity) * n(line.unit_price) * 100) / 100;
      }
      lines[index] = line;
      return { ...current, line_items: lines };
    });
  }

  function addLine() {
    setFormData((current) => ({ ...current, line_items: [...current.line_items, emptyLine()] }));
  }

  function removeLine(index) {
    setFormData((current) => ({ ...current, line_items: current.line_items.filter((_, i) => i !== index).length ? current.line_items.filter((_, i) => i !== index) : [emptyLine()] }));
  }

  function applyClient(clientId) {
    const client = clients.find((x) => String(x.id || x._id) === String(clientId));
    update("client_id", clientId);
    if (!client) return;
    setFormData((current) => ({
      ...current,
      client_id: clientId,
      customer_name: client.client_name || client.name || client.contact_name || current.customer_name,
      customer_email: client.email || current.customer_email,
      customer_phone: client.phone || client.mobile || current.customer_phone,
      billing_address: client.billing_address || client.address || current.billing_address,
      address: client.address || current.address,
      site_address: client.site_address || client.address || current.site_address,
    }));
  }

  function applyJob(job, setJobId = true) {
    const price = n(job.price || job.job_price || job.fixed_price || job.total || job.amount || 0);
    const desc = job.ai_invoice_description || job.invoice_description_draft || job.description || job.notes || job.title || "Service work completed";
    setFormData((current) => ({
      ...current,
      job_id: setJobId ? String(job.id || job._id || "") : current.job_id,
      client_id: job.client_id || current.client_id,
      customer_name: job.customer_name || job.client_name || current.customer_name,
      address: job.address || job.site_address || current.address,
      site_address: job.site_address || job.address || current.site_address,
      description: desc,
      line_items: [{ description: desc, quantity: 1, unit_price: price, amount: price }],
    }));
  }

  function applyJobId(jobId) {
    update("job_id", jobId);
    const job = jobs.find((x) => String(x.id || x._id) === String(jobId));
    if (job) applyJob(job, false);
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
      line_items: formData.line_items.map((line) => ({
        description: line.description,
        quantity: n(line.quantity) || 1,
        unit_price: n(line.unit_price),
        amount: n(line.amount),
      })),
      subtotal,
      gst_amount: gstAmount,
      total,
      amount_due: due,
    };

    const res = isEdit
      ? await api.patch(`/invoices/${id}/business-grade`, payload)
      : await api.post("/invoices/business-grade", payload);

    setSaving(false);
    if (res.success) {
      const createdId = invoiceIdOf(res);
      toast.success(isEdit ? "Invoice updated" : "Business-grade invoice created");
      navigate(createdId ? `/invoices/${createdId}` : "/invoices");
    } else {
      toast.error(res.error || "Could not save invoice");
    }
  }

  return (
    <Layout>
      <PremiumPage maxWidth={1080}>
        <button onClick={() => navigate("/invoices")} className="flex items-center gap-2 text-sm font-black text-[#5b6c87] hover:text-[#0d1b34]">
          <ArrowLeft size={16} /> Back to invoices
        </button>

        <PremiumHero
          eyebrow={isEdit ? "Edit invoice" : "Business-grade invoice"}
          title={isEdit ? "Edit invoice" : "Create invoice ready to send"}
          subtitle="Line items, GST, due dates, bank/payment details, linked jobs and payment tracking."
          icon={<Receipt className="h-6 w-6" />}
        />

        {loadingData ? (
          <PremiumCard><div className="p-8 text-center font-bold text-[#5b6c87]">Loading invoice workspace…</div></PremiumCard>
        ) : (
          <form onSubmit={save} className="space-y-6" data-testid="business-grade-invoice-form">
            <PremiumCard title="Customer and linked work">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-black text-[#0d1b34]">Saved client</span>
                  <select value={formData.client_id} onChange={(e) => applyClient(e.target.value)} className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] p-3 text-[#0d1b34]">
                    <option value="">Select client</option>
                    {clients.map((client) => <option key={client.id || client._id} value={client.id || client._id}>{client.client_name || client.name || client.contact_name || "Unnamed client"}</option>)}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-black text-[#0d1b34]">Linked job</span>
                  <select value={formData.job_id} onChange={(e) => applyJobId(e.target.value)} className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] p-3 text-[#0d1b34]">
                    <option value="">No linked job</option>
                    {jobs.map((job) => <option key={job.id || job._id} value={job.id || job._id}>{job.title || job.job_name || job.customer_name || job.client_name || "Job"} — {job.status || "open"}</option>)}
                  </select>
                </label>

                {[
                  ["customer_name", "Customer name *"],
                  ["customer_email", "Customer email"],
                  ["customer_phone", "Customer phone"],
                  ["billing_address", "Billing address"],
                  ["site_address", "Site / job address"],
                  ["quote_id", "Linked quote ID"],
                ].map(([key, label]) => (
                  <label className="space-y-2" key={key}>
                    <span className="text-sm font-black text-[#0d1b34]">{label}</span>
                    <input value={formData[key] || ""} onChange={(e) => update(key, e.target.value)} className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] p-3 text-[#0d1b34]" />
                  </label>
                ))}
              </div>
            </PremiumCard>

            <PremiumCard title="Invoice lines">
              <div className="space-y-3">
                {formData.line_items.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end rounded-2xl border border-[#e6eef9] bg-[#f8fbff] p-3">
                    <label className="col-span-12 md:col-span-5 space-y-1">
                      <span className="text-xs font-black text-[#5b6c87]">Description</span>
                      <input value={line.description} onChange={(e) => updateLine(index, "description", e.target.value)} className="w-full rounded-xl border border-[#d8e3f3] bg-white p-3 text-[#0d1b34]" />
                    </label>
                    <label className="col-span-4 md:col-span-2 space-y-1">
                      <span className="text-xs font-black text-[#5b6c87]">Qty</span>
                      <input type="number" step="0.01" value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} className="w-full rounded-xl border border-[#d8e3f3] bg-white p-3 text-[#0d1b34]" />
                    </label>
                    <label className="col-span-4 md:col-span-2 space-y-1">
                      <span className="text-xs font-black text-[#5b6c87]">Unit price</span>
                      <input type="number" step="0.01" value={line.unit_price} onChange={(e) => updateLine(index, "unit_price", e.target.value)} className="w-full rounded-xl border border-[#d8e3f3] bg-white p-3 text-[#0d1b34]" />
                    </label>
                    <label className="col-span-4 md:col-span-2 space-y-1">
                      <span className="text-xs font-black text-[#5b6c87]">Line total</span>
                      <input type="number" step="0.01" value={line.amount} onChange={(e) => updateLine(index, "amount", e.target.value)} className="w-full rounded-xl border border-[#d8e3f3] bg-white p-3 text-[#0d1b34]" />
                    </label>
                    <button type="button" onClick={() => removeLine(index)} className="col-span-12 md:col-span-1 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700"><Trash2 size={16} /></button>
                  </div>
                ))}
                <button type="button" onClick={addLine} className="inline-flex items-center gap-2 rounded-full bg-[#0d1b34] px-4 py-2 text-sm font-black text-white"><Plus size={16} /> Add line item</button>
              </div>
            </PremiumCard>

            <PremiumCard title="Terms, tax and payment">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  ["invoice_number", "Invoice number"],
                  ["due_date", "Due date", "date"],
                  ["gst_rate", "GST rate %", "number"],
                  ["discount_amount", "Discount", "number"],
                  ["deposit_amount", "Deposit / already paid", "number"],
                  ["amount_paid", "Other amount paid", "number"],
                  ["payment_link", "Payment link"],
                  ["payment_terms", "Payment terms"],
                ].map(([key, label, type = "text"]) => (
                  <label className="space-y-2" key={key}>
                    <span className="text-sm font-black text-[#0d1b34]">{label}</span>
                    <input type={type} value={formData[key] || ""} onChange={(e) => update(key, e.target.value)} className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] p-3 text-[#0d1b34]" />
                  </label>
                ))}
                <label className="space-y-2 md:col-span-3">
                  <span className="text-sm font-black text-[#0d1b34]">Customer description / public notes</span>
                  <textarea value={formData.description} onChange={(e) => update("description", e.target.value)} rows={3} className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] p-3 text-[#0d1b34]" />
                </label>
                <label className="space-y-2 md:col-span-3">
                  <span className="text-sm font-black text-[#0d1b34]">Internal notes</span>
                  <textarea value={formData.internal_notes} onChange={(e) => update("internal_notes", e.target.value)} rows={2} className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] p-3 text-[#0d1b34]" />
                </label>
              </div>
            </PremiumCard>

            <PremiumCard title="Invoice preview">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div><span className="block text-[#5b6c87]">Subtotal</span><b className="text-[#0d1b34]">{money(subtotal)}</b></div>
                <div><span className="block text-[#5b6c87]">Discount</span><b className="text-[#0d1b34]">{money(discount)}</b></div>
                <div><span className="block text-[#5b6c87]">GST</span><b className="text-[#0d1b34]">{money(gstAmount)}</b></div>
                <div><span className="block text-[#5b6c87]">Total</span><b className="text-[#2563eb]">{money(total)}</b></div>
                <div><span className="block text-[#5b6c87]">Amount due</span><b className="text-[#16a34a]">{money(due)}</b></div>
              </div>
            </PremiumCard>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => navigate("/invoices")} className="rounded-full border border-[#d8e3f3] px-5 py-3 font-black text-[#0d1b34]">Cancel</button>
              <PremiumButton type="submit" disabled={saving} iconLeft={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}>
                {saving ? "Saving…" : isEdit ? "Update invoice" : "Create invoice"}
              </PremiumButton>
            </div>
          </form>
        )}
      </PremiumPage>
    </Layout>
  );
}
