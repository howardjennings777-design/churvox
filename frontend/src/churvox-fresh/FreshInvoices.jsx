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
  return `$${Number(value || 0).toFixed(2)}`;
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
    due: invoice?.due_date ? `Due ${new Date(invoice.due_date).toLocaleDateString()}` : "Draft invoice",
    sync: invoice?.myob_sync_status || invoice?.sync || "Not synced yet",
    note: invoice?.description || invoice?.notes || "No notes yet",
    lines: Array.isArray(invoice?.line_items)
      ? invoice.line_items.map((line) => `${line.description || "Invoice item"} · ${money(line.amount || line.unit_price || 0)}`)
      : [invoice?.description || invoice?.notes || "Invoice item"],
    sortTime: dateScore(invoice),
  };
}


const selectedFilterButtonStyle = {
  background: "#111827",
  backgroundColor: "#111827",
  borderColor: "#111827",
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
};

const selectedFilterTextStyle = {
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
  opacity: 1,
};

const selectedFilterCountStyle = {
  background: "#f97316",
  backgroundColor: "#f97316",
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
  opacity: 1,
  borderRadius: "999px",
};

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
  const overdueTotal = invoices.filter((invoice) => invoice.status === "Overdue").reduce((sum, invoice) => sum + invoice.amount, 0);

  const loadInvoices = React.useCallback(async () => {
    setLoading(true);
    setError("");

    const res = await get("/invoices", { timeout: 25000 });

    if (!res.success) {
      setInvoices([]);
      setSelectedId("");
      setError(res.error || "Could not load real invoices");
      setLoading(false);
      return;
    }

    const nextInvoices = hideDemoRecords(listFrom(res.data))
      .map(normalizeInvoice)
      .sort((a, b) => b.sortTime - a.sortTime || String(b.id).localeCompare(String(a.id)));

    setInvoices(nextInvoices);
    setSelectedId((current) => nextInvoices.some((invoice) => invoice.id === current) ? current : nextInvoices[0]?.id || "");
    setLoading(false);
  }, [get]);

  React.useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  React.useEffect(() => {
    const onFreshDataUpdated = () => loadInvoices();
    window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
    const filterPillStyle = (active) => active ? {
    background: "#111827",
    borderColor: "#111827",
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
  } : undefined;

  const filterTextStyle = (active) => active ? {
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
    opacity: 1,
  } : undefined;

  const filterCountStyle = (active) => active ? {
    background: "#f97316",
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
    opacity: 1,
  } : undefined;

  return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
  }, [loadInvoices]);

  function openInvoicePopup() {
    setInvoicePopupOpen(true);
  }

  function invoiceNextMove(invoice) {
    if (!invoice) return "Create or select an invoice.";
    if (invoice.status === "Draft") return "Review draft before sending.";
    if (invoice.status === "Sent") return "Watch payment and follow up if needed.";
    if (invoice.status === "Overdue") return "Needs owner-approved follow-up.";
    if (invoice.status === "Paid") return "Paid — check accounting sync.";
    return "Review invoice.";
  }

  function sendSelectedInvoiceToCommand() {
    if (!selected) return;

    const reviewKey = "churvox:review-inbox:v1";
    const item = {
      id: `invoice-review-${selected.id}-${Date.now()}`,
      title: `Invoice review: ${selected.id}`,
      category: "money",
      type: "invoice",
      summary: invoiceNextMove(selected),
      source: "Invoices",
      status: "open",
      createdAt: new Date().toLocaleString("en-NZ", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }),
      details: {
        "What Churvox found": `${selected.id} for ${selected.client}`,
        "Invoice status": selected.status,
        "Amount": money(selected.amount),
        "GST": money(selected.gst),
        "Due": selected.due,
        "Sync": selected.sync,
        "Next action": invoiceNextMove(selected),
        "Why it needs approval": "Money follow-ups, sends and accounting changes should be reviewed by the owner first."
      }
    };

    try {
      const current = JSON.parse(window.localStorage.getItem(reviewKey) || "[]");
      window.localStorage.setItem(reviewKey, JSON.stringify([item, ...current].slice(0, 80)));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "review-tray", source: "invoices" } }));
    } catch {}

    onNavigate?.("command");
  }

  function openPaymentsForSelected() {
    if (!selected) return;
    try {
      window.localStorage.setItem("churvox:selected-invoice-for-payment", JSON.stringify({
        id: selected.id,
        client: selected.client,
        amount: selected.amount,
        status: selected.status,
      }));
    } catch {}

    onNavigate?.("payments");
  }


  const filterPillStyle = (active) => active ? {
    background: "#111827",
    borderColor: "#111827",
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
  } : undefined;

  const filterTextStyle = (active) => active ? {
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
    opacity: 1,
  } : undefined;

  const filterCountStyle = (active) => active ? {
    background: "#f97316",
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
    opacity: 1,
  } : undefined;

  return (
    <section className="freshInvoicesPage">
      <header className="freshHero">
        <span>Churvox fresh · Invoices</span>
        <h1>Invoices</h1>
        <p>Real invoice records from your business account. New invoices should appear here after save.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard">
          <h2>{loading && invoices.length === 0 ? "…" : money(draftTotal)}</h2>
          <p>Draft money</p>
        </aside>
        <aside className="freshCard">
          <h2>{loading && invoices.length === 0 ? "…" : money(overdueTotal)}</h2>
          <p>Overdue money</p>
        </aside>
        <aside className="freshCard">
          <h2>{loading && invoices.length === 0 ? "…" : invoices.length}</h2>
          <p>Total invoices</p>
        </aside>
      </section>

      {error ? (
        <section className="freshCard freshItem need">
          <b>Could not load invoices</b>
          <span>{error}</span>
          <button type="button" className="freshPrimary" onClick={loadInvoices}>Retry</button>
        </section>
      ) : null}

      <section className="freshCommandFilterBar">
        {filters.map((item) => (
          <button
            type="button"
            key={item}
            className={filter === item ? "active" : ""}
            style={filter === item ? selectedFilterButtonStyle : undefined}
            onClick={() => setFilter(item)}
          >
            <span style={filter === item ? selectedFilterTextStyle : undefined}>{item}</span>
            <b style={filter === item ? selectedFilterCountStyle : undefined}>{item === "All" ? invoices.length : invoices.filter((invoice) => invoice.status === item).length}</b>
          </button>
        ))}
      </section>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Invoice list</h2>

          {loading && invoices.length === 0 ? (
            <div className="freshItem">
              <b>Loading real invoices…</b>
              <span>Checking your business account.</span>
            </div>
          ) : visibleInvoices.map((invoice) => (
            <button
              type="button"
              className={`freshItem ${selected?.id === invoice.id ? "active" : ""} ${invoice.status === "Overdue" ? "need" : ""}`}
              key={invoice.id}
              onClick={() => setSelectedId(invoice.id)}
            >
              <b>{invoice.id}</b>
              <span>{invoice.client} · {invoice.status} · {money(invoice.amount)}</span>
            </button>
          ))}

          {loading && invoices.length > 0 ? (
            <div className="freshItem">
              <b>Refreshing invoices…</b>
              <span>Showing saved invoices while Churvox refreshes.</span>
            </div>
          ) : null}

          {!loading && visibleInvoices.length === 0 ? (
            <div className="freshItem">
              <b>No invoices</b>
              <span>Create your first real invoice to start the workflow.</span>
            </div>
          ) : null}
        </aside>

<section className="freshCard freshInvoicesDetailCard">
  <div className="freshJobsDetailHeader">
    <div>
      <small>Selected invoice</small>
      <h2>{selected?.id || "Select invoice"}</h2>
    </div>
    {selected ? <span className={selected.status === "Paid" ? "ready" : selected.status === "Overdue" ? "need" : ""}>{selected.status}</span> : null}
  </div>

  {selected ? (
    <>
      <div className="freshMiniGrid freshJobsMiniGrid">
        <div><span>Client</span><b>{selected.client}</b></div>
        <div><span>Status</span><b>{selected.status}</b></div>
        <div><span>Amount</span><b>{money(selected.amount)}</b></div>
        <div><span>GST</span><b>{money(selected.gst)}</b></div>
      </div>

      <section className={`freshInvoiceNextBox ${selected.status.toLowerCase()}`}>
        <span>Next owner move</span>
        <b>{invoiceNextMove(selected)}</b>
        <p>{selected.status === "Draft" ? "Draft invoices stay draft-only until the owner sends or syncs them." : selected.status === "Overdue" ? "Follow-up should go through Command so nothing contacts the customer by mistake." : selected.status === "Paid" ? "Payment is done. Check sync/status only." : "Keep watching this invoice until paid."}</p>
      </section>

      <section className="freshJobsDetailBox">
        <span>Due / sync</span>
        <b>{selected.due} · {selected.sync}</b>
      </section>

      <section className="freshJobsDetailBox notes">
        <span>Invoice lines</span>
        {selected.lines.map((line, index) => <p key={`${selected.id}-${index}`}>{String(line)}</p>)}
      </section>

      <section className="freshJobsDetailBox notes">
        <span>Owner invoice note</span>
        <p>{selected.note}</p>
      </section>
    </>
  ) : (
    <div className="freshEmptyStateBig">
      <b>No invoice selected</b>
      <span>Create a draft invoice after work is complete. Churvox keeps invoices owner-approved.</span>
      <button type="button" className="freshPrimary" onClick={openInvoicePopup}>Create first draft invoice</button>
    </div>
  )}
</section>

<aside className="freshCard freshInvoicesActionsCard">
          <h2>Owner actions</h2>
          <p className="freshJobsActionHint">Invoices stay draft-only until the owner approves the next move.</p>
          <div className="freshActions freshJobsActionStack">
            <button className="freshPrimary" type="button" onClick={openInvoicePopup}>New draft invoice</button>
            <button className="freshOrange" type="button" disabled={!selected || selected.status === "Paid"} onClick={openPaymentsForSelected}>Open payment follow-up</button>
            <button className="freshDark" type="button" disabled={!selected} onClick={sendSelectedInvoiceToCommand}>Send selected to Command</button>
            <button className="freshGhost" type="button" onClick={loadInvoices}>Refresh invoices</button>
          </div>
        </aside>
      </section>
      {invoicePopupOpen ? (
        <div className="freshRoutePopupBackdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setInvoicePopupOpen(false); }}>
          <section className="freshCard freshRoutePopupCard">
            <button className="freshRoutePopupClose" type="button" onClick={() => setInvoicePopupOpen(false)}>×</button>
            <header className="freshHero freshRoutePopupHero">
              <span>New invoice</span>
              <h1>Create draft invoice</h1>
              <p>Add the real invoice here without leaving the Invoices area.</p>
            </header>
            <InvoiceQuickCreateForm
              onCancel={() => setInvoicePopupOpen(false)}
              onSuccess={() => {
                setInvoicePopupOpen(false);
                loadInvoices();
                try { window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "invoice-created" } })); } catch {}
              }}
            />
          </section>
        </div>
      ) : null}

    </section>
  );
}
