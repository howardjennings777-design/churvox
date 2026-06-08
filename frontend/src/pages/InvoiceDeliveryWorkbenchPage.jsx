import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const DELIVERY_OPTIONS = [
  "Churvox internal",
  "Xero",
  "Draft only",
  "Manual external",
  "MYOB staged/later (inactive)",
];

function pickList(res) {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  for (const key of ["data", "items", "results", "invoices"]) {
    if (Array.isArray(d?.[key])) return d[key];
  }
  return [];
}

function idOf(item) {
  return String(item?.id || item?._id || item?.invoice_id || "");
}

function first(...items) {
  return items.find((x) => x !== undefined && x !== null && String(x).trim() !== "") || "";
}

function blank() {
  return {
    invoice_id: "",
    customer_name: "",
    customer_email: "",
    job_reference: "",
    invoice_type: "Job invoice",
    deliveryMethod: "Draft only",
    subtotal: "",
    gst_rate: "15",
    gst_status: "GST included",
    payment_link_status: "Not included",
    due_date: "",
    description: "",
    notes: "",
  };
}

function formFromInvoice(inv) {
  return {
    invoice_id: idOf(inv),
    customer_name: first(inv.customer_name, inv.client_name, inv.client?.name),
    customer_email: first(inv.customer_email, inv.client_email, inv.email),
    job_reference: first(inv.job_reference, inv.invoice_number, inv.job_title, inv.job_id),
    invoice_type: first(inv.invoice_type, "Job invoice"),
    deliveryMethod: first(inv.invoice_delivery_method, inv.deliveryMethod, inv.delivery_source, "Draft only"),
    subtotal: first(inv.subtotal, inv.amount, inv.total),
    gst_rate: first(inv.gst_rate, "15"),
    gst_status: first(inv.gst_status, "GST included"),
    payment_link_status: first(inv.payment_link_status, "Not included"),
    due_date: first(inv.due_date, inv.due),
    description: first(inv.description, inv.invoice_wording, inv.notes),
    notes: first(inv.internal_note, inv.notes),
  };
}

function deliverySummary(method) {
  const key = String(method || "").toLowerCase();
  if (key.includes("xero")) return ["Xero staged", "Owner approves it here. If Xero is connected it enters the Xero queue as prepared. If not connected it waits for Xero connection. Churvox does not fake-sync or email the customer."];
  if (key.includes("myob")) return ["MYOB later only", "Staged for MYOB later. Nothing is sent, synced, or shown as active MYOB delivery."];
  if (key.includes("manual") || key.includes("external")) return ["Manual external", "Marked as handled outside Churvox. Churvox sends nothing and stages nothing."];
  if (key.includes("draft")) return ["Draft only", "Approved as a draft only. Nothing is sent, emailed, or synced."];
  return ["Churvox internal", "Approved for Churvox internal handling. No customer email is sent silently from this button."];
}

function Field({ label, children, wide }) {
  return <label className={wide ? "ivField wide" : "ivField"}><span>{label}</span>{children}</label>;
}

function Style() {
  return <style>{`
    .ivRoot,.ivRoot *{box-sizing:border-box;color-scheme:light;opacity:1;text-shadow:none;filter:none;mix-blend-mode:normal}
    .ivRoot{min-height:100vh;background:#f6f1e7;color:#111827;font-family:Inter,system-ui}
    .ivWrap{max-width:1540px;margin:0 auto;padding:24px 28px 120px}
    .ivHero{background:#0b1018;color:#fff;border-left:8px solid #f97316;border-radius:34px;padding:30px;box-shadow:0 24px 70px rgba(2,6,23,.22)}
    .ivHero small,.ivPanel small{display:inline-flex;border-radius:999px;background:#fff7ed;color:#7c2d12;padding:8px 12px;font-size:10px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}
    .ivHero h1{margin:16px 0 8px;font-size:clamp(42px,5.5vw,76px);line-height:.9;letter-spacing:-.07em;color:#fff}
    .ivHero p{max-width:920px;color:#f8fafc;font-weight:900;line-height:1.5}
    .ivGrid{display:grid;grid-template-columns:330px minmax(0,1fr)330px;gap:18px;margin-top:18px}
    .ivPanel{background:#fffaf0;border:1px solid rgba(15,23,42,.18);border-radius:30px;padding:18px;box-shadow:0 18px 46px rgba(2,6,23,.12)}
    .ivList{display:grid;gap:10px;margin-top:16px;max-height:560px;overflow:auto;padding-right:4px}
    .ivList button{text-align:left;border:2px solid rgba(15,23,42,.14);border-radius:18px;background:#fff;color:#111827;padding:13px;cursor:pointer}
    .ivList button.active{border-color:#f97316;background:#fff7ed}
    .ivList b{display:block;color:#111827;font-size:15px;line-height:1.25}
    .ivList span{display:block;margin-top:5px;color:#475569;font-size:12px;font-weight:900}
    .ivFormHead{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px}
    .ivFormHead h2,.ivControls h2{margin:0;color:#111827;font-size:30px;line-height:.95;letter-spacing:-.04em}
    .ivSummary{grid-column:1/-1;background:#0b1018;color:#fff;border-left:7px solid #f97316;border-radius:22px;padding:16px;margin-bottom:14px;display:grid;gap:7px}
    .ivSummary b{color:#fbbf24;text-transform:uppercase;letter-spacing:.13em;font-size:11px;font-weight:1000}
    .ivSummary span{color:#f8fafc;font-weight:900;line-height:1.45}
    .ivFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .ivField.wide{grid-column:1/-1}
    .ivField span{display:block;color:#431407;text-transform:uppercase;letter-spacing:.11em;font-size:12px;font-weight:1000;margin-bottom:7px}
    .ivField input,.ivField textarea,.ivField select{width:100%;border:2px solid #c9a46d!important;border-radius:16px;padding:13px 15px;font-size:16px;font-weight:900;background:#fffdf7!important;background-color:#fffdf7!important;color:#020617!important;-webkit-text-fill-color:#020617!important;outline:none!important;box-shadow:0 1px 0 rgba(15,23,42,.10), inset 0 0 0 9999px #fffdf7!important}
    .ivField textarea{min-height:120px;resize:vertical}
    .ivField input:focus,.ivField textarea:focus,.ivField select:focus{border-color:#f97316!important;background:#fff!important;box-shadow:0 0 0 4px rgba(249,115,22,.16), inset 0 0 0 9999px #fff!important}
    .ivControls{display:grid;gap:10px;align-self:start;position:sticky;top:18px}
    .ivControls p{background:#14532d;color:#fff;border-radius:16px;padding:12px 14px;font-weight:1000;line-height:1.45}
    .ivControls button{border:0;border-radius:16px;padding:14px;font-size:16px;font-weight:1000;cursor:pointer}
    .ivControls button:disabled{opacity:.65;cursor:wait}
    .ivSave{background:#ffedd5;color:#7c2d12;border:2px solid #fed7aa!important}
    .ivApprove{background:#16a34a;color:#052e16;border:2px solid #15803d!important}
    .ivClear{background:#111827;color:#fff}
    .ivEmpty{margin-top:16px;border-radius:18px;background:#111827;color:#fff;padding:14px;font-weight:1000;line-height:1.4}
    @media(max-width:1200px){.ivGrid,.ivFields{grid-template-columns:1fr}.ivWrap{padding:16px 16px 110px}.ivControls{position:static}.ivList{max-height:none}}
  `}</style>;
}

export default function InvoiceDeliveryWorkbenchPage() {
  const api = useApi();
  const [form, setForm] = React.useState(blank);
  const [records, setRecords] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [message, setMessage] = React.useState("Pick an invoice or create one here. Approval follows the selected delivery method.");
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [sumTitle, sumText] = deliverySummary(form.deliveryMethod);

  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  async function loadInvoices() {
    setLoading(true);
    const res = await api.get("/invoices");
    if (res?.success === false) {
      setRecords([]);
      setMessage("Could not load invoices. You can still prepare a new invoice.");
    } else {
      setRecords(pickList(res));
    }
    setLoading(false);
  }

  React.useEffect(() => { loadInvoices(); }, []);

  function selectInvoice(inv) {
    const next = formFromInvoice(inv);
    setForm(next);
    setSelectedId(idOf(inv));
    setMessage("Invoice loaded. Check the delivery method before approving.");
  }

  async function approveDelivery() {
    setBusy(true);
    setMessage("Approving invoice delivery method...");
    try {
      const payload = { ...form, invoice_id: selectedId || form.invoice_id };
      const res = await api.post("/logic/invoice-approval", payload, { timeout: 25000 });
      if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Invoice approval failed");
      const msg = res?.data?.message || "Invoice approved.";
      setMessage(msg);
      toast.success(msg);
      const inv = res?.data?.invoice;
      if (inv?.id) {
        setSelectedId(inv.id);
        setForm(formFromInvoice(inv));
      }
      loadInvoices();
    } catch (err) {
      const msg = err?.message || "Could not approve invoice delivery";
      setMessage(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  function saveDraftLocal() {
    localStorage.setItem("churvox_invoice_delivery_draft", JSON.stringify(form));
    setMessage("Draft saved on this device. Use Approve invoice delivery to save it to Churvox.");
    toast.success("Invoice draft saved locally");
  }

  function clear() {
    setSelectedId("");
    setForm(blank());
    setMessage("Cleared. Ready for a new invoice.");
  }

  return <main className="ivRoot"><Style /><section className="ivWrap">
    <article className="ivHero"><small>Invoice workbench</small><h1>Invoices</h1><p>Pick a real invoice or prepare a new one, choose who handles delivery, then approve it. No silent customer email, no fake Xero sync, no active MYOB wording.</p></article>
    <section className="ivGrid">
      <aside className="ivPanel"><small>Quick list</small><div className="ivList">{loading ? <p className="ivEmpty">Loading invoices…</p> : records.length ? records.slice(0, 12).map((inv) => <button key={idOf(inv)} className={selectedId === idOf(inv) ? "active" : ""} onClick={() => selectInvoice(inv)}><b>{first(inv.invoice_number, inv.job_reference, inv.customer_name, "Untitled invoice")}</b><span>{first(inv.customer_name, inv.status, inv.invoice_delivery_method, idOf(inv))}</span></button>) : <p className="ivEmpty">No invoices yet. Create the first one in the form.</p>}</div></aside>
      <section className="ivPanel"><div className="ivFormHead"><div><small>Specific working form</small><h2>Invoice delivery</h2></div></div><section className="ivSummary"><b>{sumTitle}</b><span>{sumText}</span></section><div className="ivFields">
        <Field label="Client"><input value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} /></Field>
        <Field label="Client email"><input value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} /></Field>
        <Field label="Job / invoice reference"><input value={form.job_reference} onChange={(e) => update("job_reference", e.target.value)} /></Field>
        <Field label="Invoice type"><select value={form.invoice_type} onChange={(e) => update("invoice_type", e.target.value)}><option>Job invoice</option><option>Deposit invoice</option><option>Extras</option><option>Time-based</option><option>Adjustment</option></select></Field>
        <Field label="Invoice delivery method"><select value={form.deliveryMethod} onChange={(e) => update("deliveryMethod", e.target.value)}>{DELIVERY_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Amount"><input value={form.subtotal} onChange={(e) => update("subtotal", e.target.value)} /></Field>
        <Field label="GST status"><select value={form.gst_status} onChange={(e) => update("gst_status", e.target.value)}><option>GST included</option><option>GST excluded</option><option>No GST</option><option>Needs check</option></select></Field>
        <Field label="GST rate"><input value={form.gst_rate} onChange={(e) => update("gst_rate", e.target.value)} /></Field>
        <Field label="Payment link"><select value={form.payment_link_status} onChange={(e) => update("payment_link_status", e.target.value)}><option>Not included</option><option>Included</option><option>Coming soon</option><option>Needs setup</option></select></Field>
        <Field label="Due date"><input value={form.due_date} onChange={(e) => update("due_date", e.target.value)} /></Field>
        <Field label="Invoice wording" wide><textarea value={form.description} onChange={(e) => update("description", e.target.value)} /></Field>
        <Field label="Internal note" wide><textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} /></Field>
      </div></section>
      <aside className="ivPanel ivControls"><h2>Owner controls</h2><p>{message}</p><button className="ivSave" onClick={saveDraftLocal} disabled={busy}>Save edit</button><button className="ivApprove" onClick={approveDelivery} disabled={busy}>{busy ? "Approving..." : "Approve invoice delivery"}</button><button className="ivClear" onClick={clear} disabled={busy}>Clear / new invoice</button></aside>
    </section>
  </section></main>;
}
