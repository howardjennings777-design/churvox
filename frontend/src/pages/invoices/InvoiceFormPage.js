// CHURVOX_INVOICE_FROM_JOB_FLOW_20260607
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
function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return normalizeId(value.$oid || value.oid || value.id || value._id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}
function invoiceIdOf(result) {
  const data = result?.data ?? result;
  const invoice = data?.invoice || data?.item || data?.record || data;
  return normalizeId(data?.id || data?._id || invoice?.id || invoice?._id || "");
}
function n(value) { const num = Number(String(value || 0).replace(/[^0-9.-]/g, "")); return Number.isFinite(num) ? num : 0; }
function money(value) { return n(value).toLocaleString("en-NZ", { style: "currency", currency: "NZD" }); }
function clientId(client) { return normalizeId(client?.id || client?._id || client?.client_id || ""); }
function jobId(job) { return normalizeId(job?.id || job?._id || job?.job_id || ""); }
function clientName(client) { return client?.client_name || client?.name || client?.customer_name || client?.contact_name || "Unnamed client"; }
function jobTitle(job) { return job?.title || job?.job_name || job?.job_title || job?.customer_name || job?.client_name || "Job"; }
function emptyLine(desc = "", price = "") { return { description: desc, quantity: 1, unit_price: price, amount: n(price) }; }
function readInvoice(payload) { const data = payload?.data ?? payload; return data?.invoice || data?.item || data?.record || data || {}; }
function readQuote(payload) { const data = payload?.data ?? payload; return data?.quote || data?.item || data?.record || data || {}; }
function readJob(payload) { const data = payload?.data ?? payload; return data?.job || data?.item || data?.record || data || {}; }
function buildInvoiceNumber(settings) { return `${settings?.invoice_prefix || "INV"}-${Date.now().toString().slice(-6)}`; }
function quoteTotal(quote) { return n(quote?.price || quote?.total || quote?.amount || quote?.subtotal || 0); }
function quoteDescription(quote) { return quote?.job_description || quote?.description || quote?.notes || quote?.customer_name || "Quoted service work"; }
function cleanText(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function firstText(...values) { return cleanText(values.find((value) => cleanText(value)) || ""); }
function timeHours(job = {}) { return n(job.total_time_seconds) > 0 ? n(job.total_time_seconds) / 3600 : 0; }
function jobInvoiceAmount(job = {}) {
  const fixed = n(job.price || job.job_price || job.fixed_price || job.total || job.amount || job.subtotal || 0);
  if (fixed > 0) return Math.round(fixed * 100) / 100;
  const hourly = n(job.hourly_rate || job.rate || 0);
  const hours = timeHours(job);
  if (hourly > 0 && hours > 0) return Math.round(hourly * hours * 100) / 100;
  return 0;
}
function buildAiInvoiceDescription(job = {}, client = {}, settings = {}) {
  const clientDisplay = firstText(client.name, client.client_name, client.customer_name, job.client_name, job.customer_name, "the customer");
  const service = firstText(job.ai_invoice_line, job.service_type, job.job_type, job.title, job.job_title, job.job_name, "service work");
  const address = firstText(job.address, job.job_address, job.site_address, client.site_address, client.address);
  const notes = firstText(job.ai_invoice_description, job.invoice_description_draft, job.completion_notes, job.worker_notes, job.worker_note, job.notes, job.description);
  const proofCount = Array.isArray(job.photos || job.photo_urls || job.proof_photos) ? (job.photos || job.photo_urls || job.proof_photos).length : 0;
  const industry = firstText(settings.trade_industry_type, "service");
  const parts = [`${service} completed for ${clientDisplay}.`];
  if (address) parts.push(`Work location: ${address}.`);
  if (notes) parts.push(`Job notes: ${notes}.`);
  if (proofCount) parts.push(`Photos/proof recorded: ${proofCount}.`);
  if (timeHours(job) > 0) parts.push(`Logged time: ${Math.round(timeHours(job) * 100) / 100} hours.`);
  parts.push(`Invoice prepared from the completed ${industry} job record.`);
  return parts.filter(Boolean).join("\n");
}
function buildAiLineDescription(job = {}, fallback = "Service work completed") {
  return firstText(job.ai_invoice_line, job.invoice_line_description, job.service_type, job.job_type, job.title, job.job_title, job.job_name, fallback);
}
function quoteLineItems(quote) {
  const lines = Array.isArray(quote?.line_items) ? quote.line_items : [];
  if (lines.length) return lines.map((line) => ({
    description: line.description || quoteDescription(quote),
    quantity: line.quantity || line.qty || 1,
    unit_price: line.unit_price ?? line.rate ?? line.amount ?? 0,
    amount: line.amount ?? n(line.unit_price || line.rate || 0) * n(line.quantity || line.qty || 1),
  }));
  return [emptyLine(quoteDescription(quote), quoteTotal(quote))];
}

export default function InvoiceFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { get, post, patch } = useApi();
  const isEdit = Boolean(id);
  const query = new URLSearchParams(location.search);
  const jobFromQuery = query.get("job_id") || "";
  const clientFromQuery = query.get("client_id") || "";
  const quoteFromQuery = query.get("quote_id") || "";

  const [settings, setSettings] = useState(() => loadBusinessSettings());
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [sourceJob, setSourceJob] = useState(null);
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
      const [clientRes, jobsRes, exactJobRes, invoiceRes, quoteRes] = await Promise.all([
        get("/clients"),
        get("/jobs"),
        !isEdit && jobFromQuery ? get(`/jobs/${encodeURIComponent(jobFromQuery)}`) : Promise.resolve(null),
        isEdit ? get(`/invoices/${encodeURIComponent(id)}`) : Promise.resolve(null),
        !isEdit && quoteFromQuery ? get(`/quotes/${encodeURIComponent(quoteFromQuery)}`) : Promise.resolve(null),
      ]);
      if (!mounted) return;
      const nextClients = clientRes?.success ? arr(clientRes.data) : [];
      const listedJobs = jobsRes?.success ? arr(jobsRes.data) : [];
      const exactJob = exactJobRes?.success ? readJob(exactJobRes) : null;
      const nextJobs = exactJob && jobId(exactJob) && !listedJobs.some((job) => jobId(job) === jobId(exactJob)) ? [exactJob, ...listedJobs] : listedJobs;
      setClients(nextClients);
      setJobs(nextJobs);
      setSourceJob(exactJob || null);

      if (invoiceRes?.success) {
        const invoice = readInvoice(invoiceRes);
        setFormData({
          client_id: normalizeId(invoice.client_id) || "",
          job_id: normalizeId(invoice.job_id || invoice.linked_job_id) || "",
          quote_id: normalizeId(invoice.quote_id || invoice.linked_quote_id) || "",
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
        if (quoteRes?.success) applyQuoteRecord(readQuote(quoteRes), false);
        if (jobFromQuery) {
          const job = exactJob || nextJobs.find((x) => jobId(x) === String(jobFromQuery));
          if (job) applyJobRecord(job, false, nextClients, true);
          else toast.error("Could not load the linked job for this invoice");
        }
      }
      setLoadingData(false);
    }
    load();
    return () => { mounted = false; };
  }, [get, id, isEdit, jobFromQuery, clientFromQuery, quoteFromQuery, settings.default_invoice_due_days, settings.default_gst_rate]);

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
  function applyJobRecord(job, setJobId = true, clientList = clients, forceDescription = false) {
    const relatedClient = clientList.find((x) => clientId(x) === String(normalizeId(job.client_id || "")));
    const price = jobInvoiceAmount(job);
    const aiDescription = buildAiInvoiceDescription(job, relatedClient, settings);
    const lineDesc = buildAiLineDescription(job, "Service work completed");
    setSourceJob(job);
    setFormData((current) => ({
      ...current,
      job_id: setJobId ? jobId(job) : current.job_id || jobId(job),
      client_id: normalizeId(job.client_id) || current.client_id,
      customer_name: job.customer_name || job.client_name || clientName(relatedClient) || current.customer_name,
      customer_email: job.customer_email || job.client_email || relatedClient?.email || relatedClient?.customer_email || current.customer_email,
      customer_phone: job.customer_phone || job.client_phone || relatedClient?.phone || relatedClient?.mobile || current.customer_phone,
      billing_address: relatedClient?.billing_address || relatedClient?.address || current.billing_address,
      address: job.address || job.job_address || job.site_address || relatedClient?.address || current.address,
      site_address: job.site_address || job.job_address || job.address || relatedClient?.site_address || relatedClient?.address || current.site_address,
      description: forceDescription ? aiDescription : (current.description || aiDescription),
      notes: current.notes || aiDescription,
      internal_notes: current.internal_notes || `Invoice prepared from job ${jobId(job) || current.job_id}`,
      line_items: [emptyLine(lineDesc, price)],
    }));
    toast.success("Job details added to invoice");
  }
  function applyJobId(selectedId) {
    update("job_id", selectedId);
    const job = jobs.find((x) => jobId(x) === String(selectedId));
    if (job) applyJobRecord(job, false, clients, true);
  }
  function applyQuoteRecord(quote, setQuoteId = true) {
    const desc = quoteDescription(quote);
    setFormData((current) => ({
      ...current,
      quote_id: setQuoteId ? normalizeId(quote?.id || quote?._id || quoteFromQuery) : current.quote_id || quoteFromQuery,
      client_id: normalizeId(quote.client_id) || current.client_id,
      customer_name: quote.customer_name || quote.client_name || current.customer_name,
      customer_email: quote.customer_email || quote.client_email || current.customer_email,
      customer_phone: quote.customer_phone || quote.phone || current.customer_phone,
      address: quote.address || quote.site_address || current.address,
      site_address: quote.site_address || quote.address || current.site_address,
      description: desc,
      notes: quote.notes || current.notes,
      line_items: quoteLineItems(quote),
    }));
  }

  function aiFillDescriptionFromLinkedJob() {
    const job = sourceJob || jobs.find((x) => jobId(x) === String(formData.job_id || ""));
    if (!job) return toast.error("Select a linked job first");
    const relatedClient = clients.find((x) => clientId(x) === String(formData.client_id || job.client_id || ""));
    const aiDescription = buildAiInvoiceDescription(job, relatedClient, settings);
    const lineDesc = buildAiLineDescription(job, "Service work completed");
    const price = jobInvoiceAmount(job) || n(formData.line_items?.[0]?.unit_price || 0);
    setFormData((current) => ({
      ...current,
      description: aiDescription,
      notes: current.notes || aiDescription,
      line_items: current.line_items?.length
        ? current.line_items.map((line, index) => index === 0 ? { ...line, description: lineDesc, unit_price: line.unit_price || price, amount: line.amount || price } : line)
        : [emptyLine(lineDesc, price)],
    }));
    toast.success("Invoice description refreshed from linked job");
  }

  const subtotal = useMemo(() => formData.line_items.reduce((sum, line) => sum + n(line.amount), 0), [formData.line_items]);
  const discount = n(formData.discount_amount);
  const gstRate = n(formData.gst_rate);
  const gstAmount = Math.max(0, subtotal - discount) * gstRate / 100;
  const total = Math.max(0, subtotal - discount) + gstAmount;
  const paid = n(formData.amount_paid) + n(formData.deposit_amount);
  const due = Math.max(0, total - paid);

  async function linkInvoiceBack(createdId, payload) {
    if (!createdId) return;
    const linkedAt = new Date().toISOString();
    const linkedJobId = payload.job_id || payload.linked_job_id;
    const linkedQuoteId = payload.quote_id || payload.linked_quote_id;
    const updates = [];
    if (linkedJobId) updates.push(patch(`/jobs/${encodeURIComponent(linkedJobId)}`, { invoice_id: createdId, linked_invoice_id: createdId, invoice_status: payload.status || "draft", invoice_total: payload.total, invoice_amount_due: payload.amount_due, invoiced_at: linkedAt, invoice_source_status: "draft_created" }));
    if (linkedQuoteId) updates.push(patch(`/quotes/${encodeURIComponent(linkedQuoteId)}`, { invoice_id: createdId, linked_invoice_id: createdId, invoice_status: payload.status || "draft", invoice_total: payload.total, invoiced_at: linkedAt }));
    if (updates.length) await Promise.allSettled(updates);
  }

  async function save(event) {
    event.preventDefault();
    if (!formData.customer_name.trim()) return toast.error("Customer name is required");
    if (!formData.line_items.some((x) => x.description && n(x.amount) > 0)) return toast.error("Add at least one invoice line item");
    setSaving(true);
    const payload = {
      ...formData,
      client_id: formData.client_id || null,
      job_id: formData.job_id || null,
      quote_id: formData.quote_id || null,
      client_name: formData.customer_name,
      customer_name: formData.customer_name,
      linked_quote_id: formData.quote_id || null,
      linked_job_id: formData.job_id || null,
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
    const res = isEdit ? await patch(`/invoices/${encodeURIComponent(id)}`, payload) : await post("/invoices", payload);
    if (res.success) {
      const createdId = invoiceIdOf(res) || id;
      await linkInvoiceBack(createdId, payload);
      setSaving(false);
      toast.success(isEdit ? "Invoice updated" : "Invoice created and linked to job");
      navigate(createdId ? `/invoices/${encodeURIComponent(createdId)}` : "/invoices-board");
    } else {
      setSaving(false);
      toast.error(res.error || "Could not save invoice");
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-white";
  const labelClass = "text-sm font-black text-slate-200";
  const heroEyebrow = isEdit ? "Edit invoice" : jobFromQuery ? "Invoice from job" : quoteFromQuery ? "Invoice from quote" : "New invoice";
  const heroTitle = isEdit ? "Edit invoice" : jobFromQuery ? "Create invoice from completed job" : quoteFromQuery ? "Create invoice from accepted quote" : "Create an invoice ready to send";

  return <Layout><PremiumPage maxWidth={1080}>
    <button type="button" onClick={() => navigate("/invoices-board")} className="mb-3 inline-flex items-center gap-2 text-sm font-black text-slate-300 hover:text-white"><ArrowLeft size={16} /> Back to Invoices board</button>
    <PremiumHero eyebrow={heroEyebrow} title={heroTitle} subtitle="Invoices pull from clients, jobs, quotes and business defaults, then link back to the source record after save." icon={<Receipt className="h-6 w-6" />} />
    {loadingData ? <PremiumCard><div className="p-8 text-center font-bold text-slate-300">Loading invoice workspace…</div></PremiumCard> : <form onSubmit={save} className="space-y-6" data-testid="stable-invoice-form" data-version="CHURVOX_INVOICE_FROM_JOB_FLOW_20260607">
      {jobFromQuery ? <PremiumCard title="Job invoice source"><div className="rounded-2xl border border-lime-300/20 bg-lime-300/10 p-4 text-sm font-bold text-lime-100">This invoice was opened from a job. Churvox has pulled the customer, site address, invoice description, amount and job link where available.</div></PremiumCard> : null}
      <PremiumCard title="Business defaults"><div className="rounded-2xl border border-lime-300/20 bg-lime-300/10 p-3 text-sm font-bold text-lime-100">{settings.business_name || "No business name yet"} · Prefix {settings.invoice_prefix || "INV"} · GST {settings.default_gst_rate || 15}% · Due in {settings.default_invoice_due_days || 7} days</div></PremiumCard>
      <PremiumCard title="Customer and linked work">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2" htmlFor="invoice-client"><span className={labelClass}>Saved client</span><select id="invoice-client" value={formData.client_id} onChange={(e) => applyClient(e.target.value)} className={inputClass} data-testid="invoice-client-select"><option value="">Select client</option>{clients.map((client) => <option key={clientId(client)} value={clientId(client)}>{clientName(client)}</option>)}</select></label>
          <label className="space-y-2" htmlFor="invoice-job"><span className={labelClass}>Linked job</span><select id="invoice-job" value={formData.job_id} onChange={(e) => applyJobId(e.target.value)} className={inputClass} data-testid="invoice-job-select"><option value="">No linked job</option>{jobs.map((job) => <option key={jobId(job)} value={jobId(job)}>{jobTitle(job)} — {job.status || "open"}</option>)}</select></label>
          <label className="space-y-2" htmlFor="invoice-customer-name"><span className={labelClass}>Customer name *</span><input id="invoice-customer-name" value={formData.customer_name || ""} onChange={(e) => update("customer_name", e.target.value)} className={inputClass} data-testid="invoice-customer-name-input" /></label>
          <label className="space-y-2" htmlFor="invoice-customer-email"><span className={labelClass}>Customer email</span><input id="invoice-customer-email" value={formData.customer_email || ""} onChange={(e) => update("customer_email", e.target.value)} className={inputClass} data-testid="invoice-customer-email-input" /></label>
          <label className="space-y-2" htmlFor="invoice-customer-phone"><span className={labelClass}>Customer phone</span><input id="invoice-customer-phone" value={formData.customer_phone || ""} onChange={(e) => update("customer_phone", e.target.value)} className={inputClass} data-testid="invoice-customer-phone-input" /></label>
          <label className="space-y-2" htmlFor="invoice-billing-address"><span className={labelClass}>Billing address</span><input id="invoice-billing-address" value={formData.billing_address || ""} onChange={(e) => update("billing_address", e.target.value)} className={inputClass} data-testid="invoice-billing-address-input" /></label>
          <label className="space-y-2" htmlFor="invoice-site-address"><span className={labelClass}>Site / job address</span><input id="invoice-site-address" value={formData.site_address || ""} onChange={(e) => update("site_address", e.target.value)} className={inputClass} data-testid="invoice-site-address-input" /></label>
          <label className="space-y-2" htmlFor="invoice-quote-id"><span className={labelClass}>Linked quote ID</span><input id="invoice-quote-id" value={formData.quote_id || ""} onChange={(e) => update("quote_id", e.target.value)} className={inputClass} data-testid="invoice-quote-id-input" /></label>
        </div>
      </PremiumCard>
      <PremiumCard title="Invoice lines">
        <div className="space-y-3">{formData.line_items.map((line, index) => <div key={index} className="grid grid-cols-12 gap-3 items-end rounded-2xl border border-slate-700 bg-slate-950/50 p-3">
          <label className="col-span-12 space-y-1 md:col-span-5" htmlFor={`invoice-line-description-${index}`}><span className="text-xs font-black text-slate-300">Description</span><input id={`invoice-line-description-${index}`} value={line.description} onChange={(e) => updateLine(index, "description", e.target.value)} className={inputClass} data-testid={`invoice-line-description-${index}`} /></label>
          <label className="col-span-4 space-y-1 md:col-span-2" htmlFor={`invoice-line-quantity-${index}`}><span className="text-xs font-black text-slate-300">Qty</span><input id={`invoice-line-quantity-${index}`} type="number" step="0.01" value={line.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} className={inputClass} data-testid={`invoice-line-quantity-${index}`} /></label>
          <label className="col-span-4 space-y-1 md:col-span-2" htmlFor={`invoice-line-unit-price-${index}`}><span className="text-xs font-black text-slate-300">Unit price</span><input id={`invoice-line-unit-price-${index}`} type="number" step="0.01" value={line.unit_price} onChange={(e) => updateLine(index, "unit_price", e.target.value)} className={inputClass} data-testid={`invoice-line-unit-price-${index}`} /></label>
          <label className="col-span-4 space-y-1 md:col-span-2" htmlFor={`invoice-line-total-${index}`}><span className="text-xs font-black text-slate-300">Line total</span><input id={`invoice-line-total-${index}`} type="number" step="0.01" value={line.amount} onChange={(e) => updateLine(index, "amount", e.target.value)} className={inputClass} data-testid={`invoice-line-total-${index}`} /></label>
          <button type="button" onClick={() => removeLine(index)} className="col-span-12 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200 md:col-span-1"><Trash2 size={16} /></button>
        </div>)}<button type="button" onClick={addLine} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950"><Plus size={16} /> Add line item</button></div>
      </PremiumCard>
      <PremiumCard title="Terms, tax and payment">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[["invoice_number", "Invoice number"], ["due_date", "Due date", "date"], ["gst_rate", "GST rate %", "number"], ["discount_amount", "Discount", "number"], ["deposit_amount", "Deposit / already paid", "number"], ["amount_paid", "Other amount paid", "number"], ["payment_link", "Payment link"], ["payment_terms", "Payment terms"]].map(([key, label, type = "text"]) => <label className="space-y-2" key={key} htmlFor={`invoice-${key}`}><span className={labelClass}>{label}</span><input id={`invoice-${key}`} type={type} value={formData[key] || ""} onChange={(e) => update(key, e.target.value)} className={inputClass} data-testid={`invoice-${key}-input`} /></label>)}
          <div className="md:col-span-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">AI invoice wording</div><p className="mt-1 text-sm font-bold text-slate-200">Pulls job title, address, client, worker notes, completion notes, logged time and proof summary into a clear invoice description.</p></div><button type="button" onClick={aiFillDescriptionFromLinkedJob} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950">AI add job description</button></div></div>
          <label className="space-y-2 md:col-span-3" htmlFor="invoice-public-notes"><span className={labelClass}>Customer description / public notes</span><textarea id="invoice-public-notes" value={formData.description} onChange={(e) => update("description", e.target.value)} rows={5} className={inputClass} data-testid="invoice-public-notes-input" /></label>
          <label className="space-y-2 md:col-span-3" htmlFor="invoice-internal-notes"><span className={labelClass}>Internal notes</span><textarea id="invoice-internal-notes" value={formData.internal_notes} onChange={(e) => update("internal_notes", e.target.value)} rows={2} className={inputClass} data-testid="invoice-internal-notes-input" /></label>
        </div>
      </PremiumCard>
      <PremiumCard title="Invoice preview"><div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5"><div><span className="block text-slate-300">Subtotal</span><b className="text-white">{money(subtotal)}</b></div><div><span className="block text-slate-300">Discount</span><b className="text-white">{money(discount)}</b></div><div><span className="block text-slate-300">GST</span><b className="text-white">{money(gstAmount)}</b></div><div><span className="block text-slate-300">Total</span><b className="text-cyan-300">{money(total)}</b></div><div><span className="block text-slate-300">Amount due</span><b className="text-lime-300">{money(due)}</b></div></div></PremiumCard>
      <div className="flex justify-end gap-3"><button type="button" onClick={() => navigate("/invoices-board")} className="rounded-full border border-slate-600 px-5 py-3 font-black text-slate-100">Cancel</button><PremiumButton type="submit" disabled={saving} iconLeft={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}>{saving ? "Saving…" : isEdit ? "Update invoice" : "Create invoice"}</PremiumButton></div>
    </form>}
  </PremiumPage></Layout>;
}
