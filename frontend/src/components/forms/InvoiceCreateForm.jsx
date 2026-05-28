import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MARKER = "CHURVOX_INVOICE_EDITOR_LINE_ITEMS_PREVIEW_20260529";
const cleanMoney = (value) => { const n = Number(String(value ?? "").replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? n : 0; };
const first = (...values) => values.find((v) => String(v ?? "").trim()) || "";
const recordId = (record) => record?.id || record?._id || record?.invoice_id || recordId(record?.data || record?.invoice || record?.record || record?.item || record?.result) || "";
const jobIdFromUrl = () => new URLSearchParams(window.location.search || "").get("job_id") || "";
const lineTotal = (line) => (cleanMoney(line.qty) || 1) * cleanMoney(line.rate);

function jobDescription(job) {
  return first(job?.invoice_description_draft, job?.draft_invoice_description, job?.invoice_description, job?.completion_summary, job?.worker_notes, job?.description, job?.notes, job?.title);
}

export default function InvoiceCreateForm({ onSuccess, onCancel, submitLabel = "Create invoice" }) {
  const { get, post, patch, loading } = useApi();
  const [clients, setClients] = useState([]);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState([{ description: "Service work", qty: "1", rate: "" }]);
  const [form, setForm] = useState({ client_id: "", customer_name: "", customer_email: "", address: "", description: "", subtotal: "", gst_rate: 15, notes: "Payment due within 7 days. Thank you for your business.", payment_details: "", job_id: "" });

  useEffect(() => { get("/clients").then((r) => setClients(r?.success ? r.data || [] : [])); }, [get]);

  useEffect(() => {
    const jobId = jobIdFromUrl();
    if (!jobId) return;
    let alive = true;
    get(`/jobs/${jobId}`).then((res) => {
      if (!alive) return;
      const job = res?.data || res?.job || null;
      if (!res?.success || !job) { setNotice("Could not load the linked job. You can still create the invoice manually."); return; }
      const desc = jobDescription(job) || "Service work completed";
      const amount = cleanMoney(first(job.subtotal, job.invoice_amount, job.job_price, job.price, job.fixed_price, job.total, job.amount));
      const clientId = first(job.client_id, job.customer_id);
      const client = clients.find((c) => String(c.id || c._id) === String(clientId));
      setForm((p) => ({ ...p, job_id: jobId, client_id: clientId || p.client_id, customer_name: first(job.client_name, job.customer_name, client?.name, client?.client_name, p.customer_name), customer_email: first(job.customer_email, job.client_email, client?.email, p.customer_email), address: first(job.address, job.site_address, job.job_address, client?.address, p.address), description: desc, subtotal: amount > 0 ? String(amount) : p.subtotal }));
      setLines([{ description: desc, qty: "1", rate: amount > 0 ? String(amount) : "" }]);
      setNotice(amount > 0 ? "Invoice prefilled from the approved job. Check line items, GST and payment details before creating." : "Invoice prefilled from the job, but no price was found. Add the subtotal before creating.");
    });
    return () => { alive = false; };
  }, [get, clients]);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + lineTotal(line), 0), [lines]);
  const subtotalPreview = cleanMoney(form.subtotal) || subtotal;
  const gstRate = Math.max(0, Math.min(100, Number(form.gst_rate) || 0));
  const gstAmount = subtotalPreview * (gstRate / 100);
  const total = subtotalPreview + gstAmount;
  const busy = loading || saving;

  useEffect(() => { if (subtotal > 0) setForm((p) => ({ ...p, subtotal: String(Number(subtotal.toFixed(2))) })); }, [subtotal]);

  const updateLine = (index, key, value) => setLines((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const addLine = () => setLines((items) => [...items, { description: "", qty: "1", rate: "" }]);
  const removeLine = (index) => setLines((items) => items.length <= 1 ? items : items.filter((_, i) => i !== index));
  const change = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const pickClient = async (clientId) => {
    const c = clients.find((x) => String(x.id || x._id) === String(clientId));
    let desc = "";
    if (clientId) {
      const draft = await get(`/invoices/description-draft?client_id=${encodeURIComponent(clientId)}`);
      desc = draft?.description || draft?.data?.description || "";
    }
    setForm((p) => ({ ...p, client_id: clientId, customer_name: c?.name || c?.client_name || p.customer_name, customer_email: c?.email || p.customer_email, address: c?.address || p.address, description: desc || p.description }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) return toast.error("Customer name is required");
    if (!form.description.trim()) return toast.error("Description is required");
    if (subtotalPreview <= 0) return toast.error("Enter a valid invoice subtotal");
    setSaving(true);
    try {
      const payload = { ...form, client_id: form.client_id || null, job_id: form.job_id || null, subtotal: subtotalPreview, gst_rate: gstRate, gst_amount: gstAmount, total, line_items: lines.map((line) => ({ description: line.description, quantity: cleanMoney(line.qty) || 1, rate: cleanMoney(line.rate), amount: lineTotal(line) })).filter((line) => line.description || line.amount > 0) };
      const res = await post("/invoices", payload);
      if (!res?.success) return toast.error(res?.error || "Could not create invoice");
      const invoiceId = recordId(res);
      if (form.job_id && invoiceId) await patch(`/jobs/${form.job_id}`, { invoice_id: invoiceId, draft_invoice_id: invoiceId, invoiced: true, invoice_created_at: new Date().toISOString(), work_review_status: "invoiced", review_status: "invoiced" });
      toast.success("Invoice created");
      onSuccess?.(res.data || res.invoice || res.record || res.result || res);
    } catch (err) { toast.error(err?.message || "Could not create invoice"); }
    finally { setSaving(false); }
  };

  return <form onSubmit={submit} className="min-h-full flex flex-col" data-marker={MARKER}>
    <div className="space-y-4 pb-28">
      {notice && <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-sm font-semibold text-[#14532d]">{notice}</div>}
      <section className="rounded-2xl border border-[#d8e3f3] bg-white p-4 md:p-5 space-y-4"><p className="text-sm font-black text-[#0d1b34]">Customer details</p><div><Label>Client</Label><select className="w-full rounded-xl px-3 py-2.5 border border-[#d8e3f3]" value={form.client_id} onChange={(e)=>pickClient(e.target.value)}><option value="">Select saved client</option>{clients.map((c)=><option key={c.id||c._id} value={c.id||c._id}>{c.name||c.client_name}</option>)}</select></div><div><Label>Customer Name *</Label><Input value={form.customer_name} onChange={(e)=>change("customer_name", e.target.value)} required /></div><div><Label>Customer Email</Label><Input type="email" value={form.customer_email} onChange={(e)=>change("customer_email", e.target.value)} /></div><div><Label>Address</Label><Input value={form.address} onChange={(e)=>change("address", e.target.value)} /></div><div><Label>Main description *</Label><Textarea value={form.description} onChange={(e)=>change("description", e.target.value)} required /></div></section>
      <section className="rounded-2xl border border-[#d8e3f3] bg-white p-4 md:p-5 space-y-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-[#0d1b34]">Line items</p><p className="text-xs font-semibold text-[#64748b]">Check work, quantity, rate, GST and total before creating.</p></div><button type="button" className="px-button-secondary" onClick={addLine}>Add line</button></div>{lines.map((line, index)=><div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_90px_120px_90px] gap-2 items-end"><div><Label>Description</Label><Input value={line.description} onChange={(e)=>updateLine(index,"description",e.target.value)} /></div><div><Label>Qty</Label><Input type="number" step="0.1" value={line.qty} onChange={(e)=>updateLine(index,"qty",e.target.value)} /></div><div><Label>Rate</Label><Input type="number" step="0.01" value={line.rate} onChange={(e)=>updateLine(index,"rate",e.target.value)} /></div><button type="button" className="px-button-secondary" onClick={()=>removeLine(index)}>Remove</button></div>)}<div className="grid grid-cols-2 gap-3"><div><Label>Subtotal *</Label><Input type="number" step="0.01" value={form.subtotal} onChange={(e)=>change("subtotal", e.target.value)} required /></div><div><Label>GST %</Label><Input type="number" step="0.5" min="0" max="100" value={form.gst_rate} onChange={(e)=>change("gst_rate", e.target.value)} /></div></div><div><Label>Payment details</Label><Textarea value={form.payment_details} onChange={(e)=>change("payment_details", e.target.value)} placeholder="Bank account, reference, due date..." /></div><div><Label>Notes</Label><Textarea value={form.notes} onChange={(e)=>change("notes", e.target.value)} /></div><div className="rounded-2xl border border-[#d8e3f3] bg-[#f8fafc] p-3 text-sm text-[#334155] space-y-1"><div className="flex justify-between"><span>Subtotal</span><b>${subtotalPreview.toFixed(2)}</b></div><div className="flex justify-between"><span>GST ({gstRate}%)</span><b>${gstAmount.toFixed(2)}</b></div><div className="flex justify-between border-t border-[#d8e3f3] pt-2 text-[#071225] text-base"><span>Total</span><b>${total.toFixed(2)}</b></div></div></section>
    </div>
    <div className="sticky bottom-0 mt-auto border-t border-[#d8e3f3] bg-white/95 backdrop-blur px-1 py-3 flex items-center justify-between gap-3"><button type="button" className="px-button-secondary" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className="px-button-primary" disabled={busy}>{busy ? "Saving..." : submitLabel}</button></div>
  </form>;
}
