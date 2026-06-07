// CHURVOX_QUOTE_CREATE_EXTRAS_SAVE_20260607
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addDaysIso, loadBusinessSettings } from "@/lib/businessSettings";

function arr(value) { if (Array.isArray(value)) return value; if (Array.isArray(value?.data)) return value.data; if (Array.isArray(value?.clients)) return value.clients; if (Array.isArray(value?.items)) return value.items; if (Array.isArray(value?.results)) return value.results; return []; }
function normalizeId(value) { if (!value) return ""; if (typeof value === "string") return value; if (typeof value === "number") return String(value); if (typeof value === "object") return normalizeId(value.$oid || value.oid || value.id || value._id || ""); const text = String(value || ""); return text === "[object Object]" ? "" : text; }
function recordId(payload) { const data = payload?.data ?? payload; const item = data?.quote || data?.item || data?.record || data; return normalizeId(data?.id || data?._id || item?.id || item?._id || ""); }
function clientId(client) { return normalizeId(client?.id || client?._id || client?.client_id || ""); }
function clientName(client) { return client?.name || client?.client_name || client?.customer_name || client?.contact_name || "Client"; }
function money(value) { const n = Number(String(value ?? "").replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? n : 0; }
function lineTotal(line) { return (money(line.qty) || 1) * money(line.rate); }
function firstService(settings) { return settings?.default_job_types?.[0] || settings?.trade_industry_type || "Service work"; }
function validNote(settings) { return `Quote is valid for ${Number(settings?.default_quote_expiry_days || 14)} days unless stated otherwise.`; }
function queryValue(search, key) { try { return new URLSearchParams(search).get(key) || ""; } catch { return ""; } }

export default function QuoteCreateForm({ onSuccess, onCancel, submitLabel = "Create quote" }) {
  const location = useLocation();
  const clientFromQuery = queryValue(location.search, "client_id");
  const { get, post, loading } = useApi();
  const [settings, setSettings] = useState(() => loadBusinessSettings());
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [lines, setLines] = useState(() => [{ description: firstService(loadBusinessSettings()), qty: "1", rate: "" }]);
  const [form, setForm] = useState(() => {
    const s = loadBusinessSettings();
    return { client_id: clientFromQuery, customer_name: "", customer_email: "", customer_phone: "", address: "", job_description: firstService(s), job_type: "other", price: "", pricing_type: "fixed", notes: validNote(s), valid_until: addDaysIso(s.default_quote_expiry_days || 14) };
  });

  useEffect(() => {
    let alive = true;
    get("/clients").then((r) => { if (alive) setClients(r?.success ? arr(r.data) : []); });
    const onSettings = (event) => {
      const next = event?.detail || loadBusinessSettings();
      setSettings(next);
      setForm((current) => ({ ...current, notes: current.notes || validNote(next), valid_until: current.valid_until || addDaysIso(next.default_quote_expiry_days || 14) }));
    };
    window.addEventListener("churvox-business-settings-updated", onSettings);
    return () => { alive = false; window.removeEventListener("churvox-business-settings-updated", onSettings); };
  }, [get]);

  useEffect(() => {
    if (prefilled) return;
    if (clientFromQuery && clients.length) {
      const client = clients.find((c) => clientId(c) === String(clientFromQuery));
      if (client) pickClient(clientFromQuery);
      setPrefilled(true);
    }
    if (!clientFromQuery) setPrefilled(true);
  }, [clients, clientFromQuery, prefilled]);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + lineTotal(line), 0), [lines]);
  const previewTotal = money(form.price) || subtotal;
  const busy = loading || saving;

  useEffect(() => { if (subtotal > 0) setForm((p) => ({ ...p, price: String(Number(subtotal.toFixed(2))) })); }, [subtotal]);

  function change(key, value) { setForm((p) => ({ ...p, [key]: value })); }
  function updateLine(index, key, value) { setLines((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item)); }
  function addLine() { setLines((items) => [...items, { description: "", qty: "1", rate: "" }]); }
  function removeLine(index) { setLines((items) => items.length <= 1 ? items : items.filter((_, i) => i !== index)); }

  function pickClient(selectedId) {
    const client = clients.find((c) => clientId(c) === String(selectedId));
    setForm((p) => ({ ...p, client_id: selectedId, customer_name: client ? clientName(client) : p.customer_name, customer_email: client?.email || client?.customer_email || client?.client_email || p.customer_email, customer_phone: client?.phone || client?.mobile || client?.customer_phone || p.customer_phone, address: client?.address || client?.site_address || client?.billing_address || p.address, job_description: p.job_description || firstService(settings) }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.customer_name.trim()) return toast.error("Customer name is required");
    if (!form.address.trim()) return toast.error("Address is required");
    if (!form.job_description.trim()) return toast.error("Job description is required");
    if (previewTotal <= 0) return toast.error("Add a quote price or line item rate");
    setSaving(true);
    const cleanLines = lines.map((line) => ({ description: line.description, quantity: money(line.qty) || 1, qty: money(line.qty) || 1, rate: money(line.rate), unit_price: money(line.rate), amount: lineTotal(line) })).filter((line) => line.description || line.amount > 0);
    const lineSummary = cleanLines.length ? `\n\nQuote items:\n${cleanLines.map((line) => `- ${line.description || "Item"}: ${line.quantity} × $${line.rate} = $${Number(line.amount || 0).toFixed(2)}`).join("\n")}` : "";
    const payload = {
      client_id: form.client_id || null,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      address: form.address,
      job_description: form.job_description,
      job_type: form.job_type || "other",
      price: previewTotal,
      pricing_type: form.pricing_type || "fixed",
      hourly_rate: 0,
      extras: cleanLines,
      notes: `${form.notes || ""}${lineSummary}`.trim(),
      valid_until: form.valid_until ? new Date(`${form.valid_until}T23:59:59`).toISOString() : null,
    };
    const res = await post("/quotes", payload);
    setSaving(false);
    if (!res?.success) return toast.error(res?.error || "Could not create quote");
    toast.success("Quote created");
    const id = recordId(res);
    onSuccess?.({ ...(res.data || res.quote || res.record || res), id: id || undefined, _id: id || undefined });
  }

  const section = "rounded-2xl border border-slate-700 bg-slate-950/50 p-4 md:p-5 space-y-4 shadow-[0_8px_28px_rgba(0,0,0,0.18)]";
  const fieldClass = "w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-white";

  return <form onSubmit={submit} className="min-h-full flex flex-col" data-version="CHURVOX_QUOTE_CREATE_EXTRAS_SAVE_20260607">
    <div className="space-y-4 pb-28">
      <section className={section}>
        <div><p className="text-sm font-black text-white">Quote details</p><p className="text-xs font-semibold text-slate-300">Uses your business setup and can prefill directly from a client record.</p></div>
        <div className="rounded-2xl border border-lime-300/20 bg-lime-300/10 p-3 text-xs font-bold text-lime-100">Business defaults: {settings.business_name || "No business name yet"} · Expires in {settings.default_quote_expiry_days || 14} days</div>
        {clientFromQuery ? <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs font-bold text-cyan-100">Opened from a client record. Customer details will prefill once the client loads.</div> : null}
        <div><Label htmlFor="quote-client">Client</Label><select id="quote-client" className={fieldClass} value={form.client_id} onChange={(e)=>pickClient(e.target.value)} data-testid="quote-client-select"><option value="">Select client</option>{clients.map((c)=><option key={clientId(c)} value={clientId(c)}>{clientName(c)}</option>)}</select></div>
        <div><Label htmlFor="quote-customer-name">Customer Name *</Label><Input id="quote-customer-name" className="rounded-xl" required value={form.customer_name} onChange={(e)=>change("customer_name", e.target.value)} data-testid="quote-customer-name-input" /></div>
        <div className="grid gap-3 md:grid-cols-2"><div><Label htmlFor="quote-customer-email">Customer Email</Label><Input id="quote-customer-email" className="rounded-xl" type="email" value={form.customer_email} onChange={(e)=>change("customer_email", e.target.value)} data-testid="quote-customer-email-input" /></div><div><Label htmlFor="quote-customer-phone">Customer Phone</Label><Input id="quote-customer-phone" className="rounded-xl" value={form.customer_phone} onChange={(e)=>change("customer_phone", e.target.value)} data-testid="quote-customer-phone-input" /></div></div>
        <div><Label htmlFor="quote-address">Address *</Label><Input id="quote-address" className="rounded-xl" required value={form.address} onChange={(e)=>change("address", e.target.value)} data-testid="quote-address-input" /></div>
        <div><Label htmlFor="quote-job-description">Job Description *</Label><Textarea id="quote-job-description" className="rounded-xl" required value={form.job_description} onChange={(e)=>change("job_description", e.target.value)} data-testid="quote-job-description-input" /></div>
      </section>
      <section className={section}>
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-white">Quote line items</p><p className="text-xs font-semibold text-slate-300">Saved into quote extras so they remain available for job/invoice context.</p></div><button type="button" className="px-button-secondary" onClick={addLine}>Add line</button></div>
        {lines.map((line, index)=><div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_90px_120px_90px] gap-2 items-end"><div><Label htmlFor={`quote-line-description-${index}`}>Description</Label><Input id={`quote-line-description-${index}`} value={line.description} onChange={(e)=>updateLine(index,"description",e.target.value)} data-testid={`quote-line-description-${index}`} /></div><div><Label htmlFor={`quote-line-qty-${index}`}>Qty</Label><Input id={`quote-line-qty-${index}`} type="number" step="0.1" value={line.qty} onChange={(e)=>updateLine(index,"qty",e.target.value)} data-testid={`quote-line-qty-${index}`} /></div><div><Label htmlFor={`quote-line-rate-${index}`}>Rate</Label><Input id={`quote-line-rate-${index}`} type="number" step="0.01" value={line.rate} onChange={(e)=>updateLine(index,"rate",e.target.value)} data-testid={`quote-line-rate-${index}`} /></div><button type="button" className="px-button-secondary" onClick={()=>removeLine(index)}>Remove</button></div>)}
        <div><Label htmlFor="quote-total-price">Total quote price</Label><Input id="quote-total-price" className="rounded-xl" type="number" step="0.01" value={form.price} onChange={(e)=>change("price", e.target.value)} data-testid="quote-total-price-input" /></div>
        <div><Label htmlFor="quote-valid-until">Valid until</Label><Input id="quote-valid-until" className="rounded-xl" type="date" value={form.valid_until} onChange={(e)=>change("valid_until", e.target.value)} data-testid="quote-valid-until-input" /></div>
        <div><Label htmlFor="quote-notes">Notes</Label><Textarea id="quote-notes" className="rounded-xl" value={form.notes} onChange={(e)=>change("notes", e.target.value)} data-testid="quote-notes-input" /></div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-200"><div className="flex justify-between text-white text-base"><span>Quote total</span><b>${previewTotal.toFixed(2)}</b></div></div>
      </section>
    </div>
    <div className="sticky bottom-0 mt-auto border-t border-slate-700 bg-slate-950/95 backdrop-blur px-1 py-3 flex items-center justify-between gap-3"><button type="button" className="px-button-secondary" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className="px-button-primary" disabled={busy}>{busy ? "Saving..." : submitLabel}</button></div>
  </form>;
}
