import React from "react";
import { useApi } from "../hooks/useApi";
import { hideDemoRecords } from "./freshDemoRecords";

function asArray(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function idText(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return idText(value.$oid || value.oid || value.id || value._id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}

function pick(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function moneyNumber(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function invoiceId(invoice) {
  return idText(invoice?.id || invoice?._id || invoice?.invoice_id);
}

function invoiceNumber(invoice) {
  return pick(invoice, "invoice_number", "number", "invoiceNumber") || invoiceId(invoice) || "Draft invoice";
}

function customerName(invoice) {
  return pick(invoice, "customer_name", "client_name", "name", "customer", "client", "business_name") || "Customer";
}

function jobName(invoice) {
  return pick(invoice, "job_title", "job_name", "job", "description", "service_type") || "Linked work";
}

function dueText(invoice) {
  const value = pick(invoice, "due_date", "due", "payment_due");
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" });
}

function isPaid(invoice) {
  return ["paid", "complete", "completed", "closed"].includes(lower(invoice?.status || invoice?.payment_status));
}

function totalOf(invoice) {
  return moneyNumber(invoice?.total ?? invoice?.amount ?? invoice?.invoice_total ?? invoice?.subtotal ?? invoice?.price ?? 0);
}

function paidOf(invoice) {
  if (isPaid(invoice)) return totalOf(invoice);
  return moneyNumber(invoice?.amount_paid ?? invoice?.paid ?? invoice?.deposit_amount ?? invoice?.payment_amount ?? 0);
}

function owingOf(invoice) {
  if (isPaid(invoice)) return 0;
  const explicit = moneyNumber(invoice?.amount_due ?? invoice?.balance_due ?? invoice?.balance);
  if (explicit > 0) return explicit;
  return Math.max(0, totalOf(invoice) - paidOf(invoice));
}

function statusOf(invoice) {
  if (isPaid(invoice)) return "Paid";
  if (lower(invoice?.status).includes("overdue") || lower(invoice?.payment_status).includes("overdue")) return "Overdue";
  if (paidOf(invoice) > 0 && owingOf(invoice) > 0) return "Part paid";
  return "Awaiting payment";
}

function rowFromInvoice(invoice) {
  const id = invoiceId(invoice);
  const total = totalOf(invoice);
  const paid = paidOf(invoice);
  const owing = owingOf(invoice);
  return {
    id: id || `invoice-${invoiceNumber(invoice)}`,
    invoiceId: id,
    customer: customerName(invoice),
    invoice: invoiceNumber(invoice),
    job: jobName(invoice),
    total,
    paid,
    owing,
    method: pick(invoice, "payment_method", "method") || "Bank transfer",
    status: statusOf(invoice),
    due: dueText(invoice),
    note: owing > 0 ? "Payment is still owing." : "Paid-looking invoice. Confirm with accounting refresh before closing it out.",
  };
}

export default function FreshPayments({ onNavigate }) {
  const { get, patch } = useApi();
  const [items, setItems] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [accountingRows, setAccountingRows] = React.useState([]);
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const paid = items.reduce((sum, item) => sum + Number(item.paid || 0), 0);
  const owing = items.reduce((sum, item) => sum + Number(item.owing || 0), 0);
  const checks = items.filter((item) => item.owing > 0 && item.status !== "Paid").length;

  const loadInvoices = React.useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const result = await get("/invoices", { timeout: 25000 });
      if (!result?.success) throw new Error(result?.error || "Could not load invoices.");
      const rows = hideDemoRecords(asArray(result.data)).map(rowFromInvoice).sort((a, b) => b.owing - a.owing || String(a.customer).localeCompare(String(b.customer)));
      setItems(rows);
      setSelectedId((current) => current && rows.some((item) => item.id === current) ? current : rows[0]?.id || "");
      if (!rows.length) setMessage("No invoices waiting yet. Once invoices exist, payments will show what is paid and what is owing.");
    } catch (err) {
      setItems([]);
      setSelectedId("");
      setMessage(err?.message || "Could not load payment data from invoices.");
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => { loadInvoices(); }, [loadInvoices]);
  React.useEffect(() => {
    const refresh = () => loadInvoices();
    window.addEventListener("churvox:fresh-data-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("churvox:fresh-data-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadInvoices]);

  async function updateInvoicePayment(item, patchData) {
    if (!item?.invoiceId) {
      setMessage("This invoice has no saved ID yet. Open Invoices and save it first.");
      return;
    }
    setBusy("update");
    setMessage("Updating invoice status...");
    const result = await patch(`/invoices/${encodeURIComponent(item.invoiceId)}`, patchData, { timeout: 25000 });
    setBusy("");
    if (!result?.success) {
      setMessage(result?.error || "Could not update invoice status.");
      return;
    }
    setMessage("Invoice status updated. Paid status still needs accounting confirmation.");
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "invoice-payment" } }));
    await loadInvoices();
  }

  async function refreshAccountingPayments() {
    setBusy("accounting");
    try {
      const result = await get("/accounting/payment-status", { timeout: 25000 });
      if (!result?.success) throw new Error(result?.error || "Could not load accounting payment status.");
      const rows = asArray(result.data?.invoices || result.data || result);
      setAccountingRows(rows);
      const paidRows = rows.filter((row) => ["paid", "complete", "completed", "closed"].includes(lower(row.status || row.payment_status || row.xero_status || row.myob_status)));
      setMessage(`Accounting refresh loaded ${rows.length} invoice${rows.length === 1 ? "" : "s"}. ${paidRows.length} look paid from accounting.`);
    } catch (err) {
      setMessage(err?.message || "Could not load accounting payment status.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="freshPaymentsPage">
      <div className="freshPaymentsHero">
        <div><span>Payments</span><h1>Payments</h1><p>Invoice totals, paid-looking amounts, balances owing and accounting refresh results.</p></div>
        <div className="freshPaymentsStats"><div><b>{money(total)}</b><small>invoiced</small></div><div><b>{money(paid)}</b><small>paid-looking</small></div><div><b>{money(owing)}</b><small>owing</small></div><div><b>{checks}</b><small>owing checks</small></div></div>
      </div>

      <div className="freshXeroNotice proper"><b>Payment rule</b><span>Only treat an invoice as paid after Xero or your accounting record confirms it.</span></div>
      {message ? <div className={`freshXeroNotice ${checks ? "need" : "proper"}`}><b>Payment status</b><span>{message}</span></div> : null}

      {!loading && !items.length ? <section className="freshPaymentsEmptyState"><div><span>Nothing waiting</span><h2>No invoices yet</h2><p>Once invoice records exist, payments will show balances and accounting status here.</p></div><div className="freshPaymentsEmptyActions"><button type="button" onClick={() => onNavigate?.("invoices")}>Create invoice</button><button type="button" onClick={loadInvoices}>Refresh</button></div></section> : null}

      <div className={`freshPaymentsLayout ${!items.length ? "freshPaymentsLayout--empty" : ""}`}>
        <aside className="freshPaymentsList">
          <header><div><b>Invoice balances</b><span>{loading ? "Loading invoices..." : `${checks} owing check${checks === 1 ? "" : "s"}`}</span></div><button type="button" onClick={loadInvoices} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button></header>
          {items.map((item) => <button type="button" key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}><b>{item.customer}</b><span>{item.invoice}</span><small>{money(item.owing)} owing - {item.status}</small></button>)}
          {!loading && !items.length ? <div className="freshPaymentsEmpty"><b>No invoices yet</b><span>When invoice records exist, payments will show here.</span></div> : null}
          <button type="button" className="freshPaymentsReset" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
        </aside>

        {selected && <article className="freshPaymentsDetail">
          <div className="freshPaymentsHead"><div><span>{selected.status}</span><h2>{selected.customer}</h2><p>{selected.invoice} - {selected.job}</p></div><div className="freshPaymentsHeadActions"><button type="button" onClick={refreshAccountingPayments} disabled={busy === "accounting"}>{busy === "accounting" ? "Checking..." : "Refresh accounting"}</button><button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button><button type="button" onClick={() => onNavigate?.("xero")}>Open Xero</button></div></div>

          <div className="freshPaymentsCards"><section><span>Total</span><b>{money(selected.total)}</b><p>Invoice total from live invoice data.</p></section><section><span>Paid-looking</span><b>{money(selected.paid)}</b><p>{selected.method} - due {selected.due}</p></section><section><span>Balance</span><b>{money(selected.owing)}</b><p>{selected.note}</p></section></div>

          <div className="freshPaymentsForm"><label><span>Customer</span><input readOnly value={selected.customer} /></label><label><span>Invoice</span><input readOnly value={selected.invoice} /></label><label><span>Linked work</span><input readOnly value={selected.job} /></label><label><span>Total</span><input readOnly value={money(selected.total)} /></label><label><span>Paid-looking</span><input readOnly value={money(selected.paid)} /></label><label><span>Status</span><input readOnly value={selected.status} /></label><label><span>Due</span><input readOnly value={selected.due} /></label><label><span>Accounting rows loaded</span><input readOnly value={accountingRows.length ? `${accountingRows.length} invoice${accountingRows.length === 1 ? "" : "s"}` : "Not loaded"} /></label></div>

          <div className="freshPaymentsActions"><button type="button" onClick={() => updateInvoicePayment(selected, { status: "overdue", payment_status: "overdue" })} disabled={busy === "update"}>Mark overdue</button><button type="button" onClick={refreshAccountingPayments} disabled={busy === "accounting"}>Refresh accounting</button><button type="button" onClick={() => onNavigate?.("xero")}>Xero draft sync</button></div>
        </article>}
      </div>
    </section>
  );
}
