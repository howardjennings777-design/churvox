import React from "react";
import { toast } from "sonner";
import { useApi } from "../../hooks/useApi";
import { storeRecentInvoice } from "../../churvox-fresh/freshRecentInvoices";

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

function clientId(client) {
  return normalizeId(client?.id || client?._id || client?.client_id || "");
}

function clientName(client) {
  return client?.name || client?.client_name || client?.customer_name || client?.contact_name || "Client";
}

function money(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function jobDraft(job) {
  if (!job || typeof job !== "object") return null;
  const title = String(job.title || job.job || job.description || "Service work").trim();
  const client = String(job.client || job.customer_name || job.client_name || "").trim();
  const address = String(job.address || job.site_address || job.service_address || "").trim();
  const price = money(job.priceAmount ?? job.price ?? job.amount ?? job.total);
  const scheduled = String(job.scheduled || job.date || "").trim();
  const notes = ["Created from completed job.", scheduled ? "Scheduled: " + scheduled + "." : ""].filter(Boolean).join(" ");
  return { title, client, address, price, notes };
}

export default function InvoiceQuickCreateForm({ onSuccess, onCancel, initialJob = null }) {
  const { get, post } = useApi();
  const [clients, setClients] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    client_id: "",
    customer_name: "",
    customer_email: "",
    address: "",
    description: "Service work",
    quantity: "1",
    unit_price: "",
    due_date: todayPlus(7),
    notes: "",
  });

  React.useEffect(() => {
    let alive = true;
    get("/clients").then((res) => {
      if (alive) setClients(res?.success ? arr(res.data) : []);
    });
    return () => { alive = false; };
  }, [get]);

  React.useEffect(() => {
    const draft = jobDraft(initialJob);
    if (!draft) return;
    setForm((current) => ({
      ...current,
      customer_name: draft.client || current.customer_name,
      address: draft.address || current.address,
      description: draft.title || current.description,
      quantity: "1",
      unit_price: draft.price > 0 ? String(draft.price) : current.unit_price,
      notes: current.notes || draft.notes,
    }));
  }, [initialJob]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function pickClient(id) {
    const client = clients.find((c) => clientId(c) === String(id));
    setForm((current) => ({
      ...current,
      client_id: id,
      customer_name: client ? clientName(client) : current.customer_name,
      customer_email: client?.email || client?.customer_email || client?.client_email || current.customer_email,
      address: client?.address || client?.site_address || client?.billing_address || current.address,
    }));
  }

  async function submit(event) {
    event.preventDefault();

    if (!form.customer_name.trim()) return toast.error("Customer name is required");
    if (!form.description.trim()) return toast.error("Invoice line item is required");
    if (money(form.unit_price) <= 0) return toast.error("Invoice amount is required");

    setSaving(true);

    const subtotal = (money(form.quantity) || 1) * money(form.unit_price);
    const gstRate = 15;
    const gstAmount = subtotal * (gstRate / 100);
    const total = subtotal + gstAmount;
    const linkedJobId = initialJob?.id || initialJob?.job_id || null;

    const payload = {
      client_id: form.client_id || null,
      job_id: linkedJobId,
      linked_job_id: linkedJobId,
      job_title: initialJob?.title || form.description,
      customer_name: form.customer_name,
      client_name: form.customer_name,
      customer_email: form.customer_email || null,
      address: form.address,
      site_address: form.address,
      billing_address: form.address,
      description: form.description,
      due_date: form.due_date ? new Date(`${form.due_date}T23:59:59`).toISOString() : null,
      gst_rate: gstRate,
      gst_amount: gstAmount,
      tax_amount: gstAmount,
      subtotal,
      total,
      amount: total,
      amount_due: total,
      balance_due: total,
      status: "draft",
      notes: form.notes,
      line_items: [{
        description: form.description,
        quantity: money(form.quantity) || 1,
        qty: money(form.quantity) || 1,
        unit_price: money(form.unit_price),
        rate: money(form.unit_price),
        amount: subtotal,
      }],
    };

    const res = await post("/invoices", payload);
    setSaving(false);

    if (!res?.success) return toast.error(res?.error || "Could not create invoice");

    const savedInvoice = res.data || res.invoice || res.record || payload;
    storeRecentInvoice({ ...payload, ...savedInvoice, status: savedInvoice?.status || payload.status });
    toast.success("Draft invoice created");
    onSuccess?.(savedInvoice);
  }

  return (
    <form className="freshRoutePopupForm" onSubmit={submit}>
      <label>
        <span>Saved client</span>
        <select value={form.client_id} onChange={(event) => pickClient(event.target.value)}>
          <option value="">Select client</option>
          {clients.map((client) => <option key={clientId(client)} value={clientId(client)}>{clientName(client)}</option>)}
        </select>
      </label>

      <label>
        <span>Customer name *</span>
        <input value={form.customer_name} onChange={(event) => update("customer_name", event.target.value)} required />
      </label>

      <label>
        <span>Customer email</span>
        <input type="email" value={form.customer_email} onChange={(event) => update("customer_email", event.target.value)} />
      </label>

      <label>
        <span>Address</span>
        <input value={form.address} onChange={(event) => update("address", event.target.value)} />
      </label>

      <label className="wide">
        <span>Description / invoice line item *</span>
        <textarea value={form.description} onChange={(event) => update("description", event.target.value)} required />
      </label>

      <label>
        <span>Qty</span>
        <input type="number" step="0.01" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} />
      </label>

      <label>
        <span>Subtotal / unit price *</span>
        <input type="number" step="0.01" value={form.unit_price} onChange={(event) => update("unit_price", event.target.value)} required />
      </label>

      <label>
        <span>Due date</span>
        <input type="date" value={form.due_date} onChange={(event) => update("due_date", event.target.value)} />
      </label>

      <label className="wide">
        <span>Notes</span>
        <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} />
      </label>

      <div className="freshRoutePopupActions">
        <button type="button" className="freshGhost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="freshPrimary" disabled={saving}>{saving ? "Saving…" : "Save draft invoice"}</button>
      </div>
    </form>
  );
}
