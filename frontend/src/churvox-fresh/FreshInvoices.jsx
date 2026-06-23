import React from "react";
import { useApi } from "../hooks/useApi";
import InvoiceQuickCreateForm from "../components/forms/InvoiceQuickCreateForm";
import { hideDemoRecords } from "./freshDemoRecords";
import "./freshRoutePopups.css";

const filters = ["All", "Draft", "Sent", "Overdue", "Paid"];

function listFrom(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.invoices)) return data.data.invoices;
  return [];
}

function idOf(value, fallback) {
  const raw = value?.invoice_number || value?.number || value?.id || value?._id || value?.invoice_id || fallback;
  if (typeof raw === "object") return raw.$oid || raw.id || raw._id || fallback;
  return String(raw || fallback);
}

function statusOf(value) {
  const text = String(value || "draft").toLowerCase();
  if (text.includes("paid")) return "Paid";
  if (text.includes("overdue")) return "Overdue";
  if (text.includes("sent")) return "Sent";
  return "Draft";
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateScore(invoice) {
  const raw = invoice?.created_at || invoice?.createdAt || invoice?.updated_at || invoice?.updatedAt || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeInvoice(invoice, index) {
  const id = idOf(invoice, `invoice-${index}`);
  const status = statusOf(invoice?.status);
  const amount = Number(invoice?.total ?? invoice?.amount ?? invoice?.subtotal ?? 0) || 0;
  const gst = Number(invoice?.gst_amount ?? invoice?.tax_amount ?? 0) || 0;
  return {
    ...invoice,
    id,
    client: invoice?.client_name || invoice?.customer_name || invoice?.client || "No client linked",
    job: invoice?.job_title || invoice?.job || invoice?.description || "Invoice",
    status,
    amount,
    gst,
    due: invoice?.due_date ? `Due ${new Date(invoice.due_date).toLocaleDateString()}` : "No due date",
    sync: invoice?.xero_sync_status || invoice?.myob_sync_status || invoice?.sync || "Not synced",
    note: invoice?.description || invoice?.notes || "No notes yet",
    lines: Array.isArray(invoice?.line_items)
      ? invoice.line_items.map((line) => `${line.description || "Invoice item"} - ${money(line.amount || line.unit_price || 0)}`)
      : [invoice?.description || invoice?.notes || "Invoice item"],
    sortTime: dateScore(invoice),
  };
}

const selectedFilterButtonStyle = { background: "#111827", backgroundColor: "#111827", borderColor: "#111827", color: "#ffffff", WebkitTextFillColor: "#ffffff" };
const selectedFilterTextStyle = { color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1 };
const selectedFilterCountStyle = { background: "#f97316", backgroundColor: "#f97316", color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1, borderRadius: "999px" };

export default function FreshInvoices({ onNavigate }) {
  const { get } = useApi();
  const [invoices, setInvoices] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [invoicePopupOpen, setInvoicePopupOpen] = React.useState(false);

  const visibleInvoices = filter === "All" ? invoices : invoices.filter((invoice) => invoice.status === filter);
  const selected = invoices.find((invoice) => invoice.id === selectedId) || visibleInvoices[0] || invoices[0];
  const draftTotal = invoices.filter((invoice) => invoice.status === "Draft").reduce((sum, invoice) => sum + invoice.amount, 0);
  const sentTotal = invoices.filter((invoice) => invoice.status === "Sent").reduce((sum, invoice) => sum + invoice.amount, 0);
  const overdueTotal = invoices.filter((invoice) => invoice.status === "Overdue").reduce((sum, invoice) => sum + invoice.amount, 0);

  const loadInvoices = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await get("/invoices", { timeout: 25000 });
    if (!res.success) {
      setInvoices([]);
      setSelectedId("");
      setError(res.error || "Could not load invoices");
      setLoading(false);
      return;
    }
    const nextInvoices = hideDemoRecords(listFrom(res.data)).map(normalizeInvoice).sort((a, b) => b.sortTime - a.sortTime || String(b.id).localeCompare(String(a.id)));
    setInvoices(nextInvoices);
    setSelectedId((current) => nextInvoices.some((invoice) => invoice.id === current) ? current : nextInvoices[0]?.id || "");
    setLoading(false);
  }, [get]);

  React.useEffect(() => { loadInvoices(); }, [loadInvoices]);
  React.useEffect(() => {
    const onFreshDataUpdated = () => loadInvoices();
    window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
    return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
  }, [loadInvoices]);

  function openInvoicePopup() { setInvoicePopupOpen(true); }

  function openPaymentsForSelected() {
    if (!selected) return;
    try {
      window.localStorage.setItem("churvox:selected-invoice-for-payment", JSON.stringify({ id: selected.id, client: selected.client, amount: selected.amount, status: selected.status }));
    } catch {}
    onNavigate?.("payments");
  }

  return (
    <section className="freshInvoicesPage">
      <header className="freshHero"><span>Invoices</span><h1>Invoices</h1><p>Saved invoice records, customer, amount, status, due date and accounting sync state.</p></header>

      <section className="freshCommandPulse">
        <aside className="freshCard"><h2>{loading && invoices.length === 0 ? "..." : money(draftTotal)}</h2><p>Draft value</p></aside>
        <aside className="freshCard"><h2>{loading && invoices.length === 0 ? "..." : money(sentTotal)}</h2><p>Sent value</p></aside>
        <aside className="freshCard"><h2>{loading && invoices.length === 0 ? "..." : money(overdueTotal)}</h2><p>Overdue value</p></aside>
      </section>

      {error ? <section className="freshCard freshItem need"><b>Could not load invoices</b><span>{error}</span><button type="button" className="freshPrimary" onClick={loadInvoices}>Retry</button></section> : null}

      <section className="freshCommandFilterBar">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} style={filter === item ? selectedFilterButtonStyle : undefined} onClick={() => setFilter(item)}><span style={filter === item ? selectedFilterTextStyle : undefined}>{item}</span><b style={filter === item ? selectedFilterCountStyle : undefined}>{item === "All" ? invoices.length : invoices.filter((invoice) => invoice.status === item).length}</b></button>)}</section>

      <section className="freshGrid">
        <aside className="freshCard"><h2>Invoice list</h2>{loading && invoices.length === 0 ? <div className="freshItem"><b>Loading invoices...</b><span>Checking saved invoice records.</span></div> : visibleInvoices.map((invoice) => <button type="button" className={`freshItem ${selected?.id === invoice.id ? "active" : ""} ${invoice.status === "Overdue" ? "need" : ""}`} key={invoice.id} onClick={() => setSelectedId(invoice.id)}><b>{invoice.id}</b><span>{invoice.client} - {invoice.status} - {money(invoice.amount)}</span></button>)}{loading && invoices.length > 0 ? <div className="freshItem"><b>Refreshing invoices...</b><span>Showing saved invoices while Churvox refreshes.</span></div> : null}{!loading && visibleInvoices.length === 0 ? <div className="freshItem"><b>No invoices found</b><span>Create an invoice or clear the filter.</span></div> : null}</aside>

        <section className="freshCard freshInvoicesDetailCard">
          <div className="freshJobsDetailHeader"><div><small>Invoice record</small><h2>{selected?.id || "Select invoice"}</h2></div>{selected ? <span className={selected.status === "Paid" ? "ready" : selected.status === "Overdue" ? "need" : ""}>{selected.status}</span> : null}</div>
          {selected ? (<>
            <div className="freshMiniGrid freshJobsMiniGrid"><div><span>Client</span><b>{selected.client}</b></div><div><span>Status</span><b>{selected.status}</b></div><div><span>Amount</span><b>{money(selected.amount)}</b></div><div><span>GST</span><b>{money(selected.gst)}</b></div></div>
            <section className="freshJobsDetailBox"><span>Due / sync</span><b>{selected.due} - {selected.sync}</b></section>
            <section className="freshJobsDetailBox notes"><span>Invoice lines</span>{selected.lines.map((line, index) => <p key={`${selected.id}-${index}`}>{String(line)}</p>)}</section>
            <section className="freshJobsDetailBox notes"><span>Invoice note</span><p>{selected.note}</p></section>
          </>) : <div className="freshEmptyStateBig"><b>No invoice selected</b><span>When invoice records exist, details will show here.</span><button type="button" className="freshPrimary" onClick={openInvoicePopup}>Create invoice</button></div>}
        </section>

        <aside className="freshCard freshInvoicesActionsCard"><h2>Invoice actions</h2><div className="freshActions freshJobsActionStack"><button className="freshPrimary" type="button" onClick={openInvoicePopup}>Create invoice</button><button className="freshOrange" type="button" disabled={!selected} onClick={openPaymentsForSelected}>Open payment check</button><button className="freshGhost" type="button" onClick={loadInvoices}>Refresh invoices</button></div></aside>
      </section>

      {invoicePopupOpen ? <div className="freshRoutePopupBackdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setInvoicePopupOpen(false); }}><section className="freshCard freshRoutePopupCard"><button className="freshRoutePopupClose" type="button" onClick={() => setInvoicePopupOpen(false)}>x</button><header className="freshHero freshRoutePopupHero"><span>Invoice</span><h1>Create invoice</h1><p>Add the invoice details.</p></header><InvoiceQuickCreateForm onCancel={() => setInvoicePopupOpen(false)} onSuccess={() => { setInvoicePopupOpen(false); loadInvoices(); try { window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "invoice-created" } })); } catch {} }} /></section></div> : null}
    </section>
  );
}
