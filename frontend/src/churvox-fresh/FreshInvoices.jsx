import React from "react";

const INVOICE_STORAGE_KEY = "churvox:fresh-invoices:v1";

const seedInvoices = [
  {
    id: "INV-1007",
    client: "Aroha Property Care",
    job: "Lawn service",
    status: "Draft",
    amount: 85,
    gst: 12.75,
    due: "Due in 7 days",
    sync: "Not synced yet",
    note: "Created from completed job. Owner must approve before sending.",
    lines: ["Lawn mowing and edges · $70", "Blower tidy and photos · $15"],
  },
  {
    id: "INV-1002",
    client: "Birchville Rentals",
    job: "Driveway clean",
    status: "Overdue",
    amount: 190,
    gst: 28.5,
    due: "Overdue 9 days",
    sync: "MYOB sync paused",
    note: "Needs owner follow-up before another reminder goes out.",
    lines: ["Driveway clean · $160", "Extra green waste handling · $30"],
  },
  {
    id: "INV-1004",
    client: "Lower Hutt Medical Centre",
    job: "Garden tidy",
    status: "Sent",
    amount: 140,
    gst: 21,
    due: "Due tomorrow",
    sync: "Ready to sync",
    note: "Waiting on payment confirmation.",
    lines: ["Garden tidy · $110", "Green waste removal · $30"],
  },
];

const filters = ["All", "Draft", "Sent", "Overdue", "Paid"];

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function loadInvoices() {
  try {
    if (typeof window === "undefined") return seedInvoices;

    const saved = window.localStorage.getItem(INVOICE_STORAGE_KEY);
    if (!saved) return seedInvoices;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : seedInvoices;
  } catch {
    return seedInvoices;
  }
}

export default function FreshInvoices({ onNavigate }) {
  const [invoices, setInvoices] = React.useState(loadInvoices);
  const [selectedId, setSelectedId] = React.useState(invoices[0]?.id || "");
  const [filter, setFilter] = React.useState("All");

  const selected = invoices.find((invoice) => invoice.id === selectedId) || invoices[0];
  const visibleInvoices = filter === "All" ? invoices : invoices.filter((invoice) => invoice.status === filter);
  const draftTotal = invoices.filter((invoice) => invoice.status === "Draft").reduce((sum, invoice) => sum + invoice.amount, 0);
  const overdueTotal = invoices.filter((invoice) => invoice.status === "Overdue").reduce((sum, invoice) => sum + invoice.amount, 0);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(invoices));
      }
    } catch {
      // Fresh preview keeps working without local storage.
    }
  }, [invoices]);

  function updateSelectedInvoice(patch) {
    if (!selected) return;

    setInvoices((current) =>
      current.map((invoice) =>
        invoice.id === selected.id
          ? { ...invoice, ...patch }
          : invoice
      )
    );
  }

  function resetInvoices() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(INVOICE_STORAGE_KEY);
      }
    } catch {
      // Ignore preview storage errors.
    }

    setInvoices(seedInvoices);
    setSelectedId(seedInvoices[0].id);
    setFilter("All");
  }

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Invoices</span>
        <h1>Invoices</h1>
        <p>Review draft invoices, approve sending, mark paid and send risky money issues back to Command.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard">
          <h2>{money(draftTotal)}</h2>
          <p>Draft money</p>
        </aside>
        <aside className="freshCard">
          <h2>{money(overdueTotal)}</h2>
          <p>Overdue money</p>
        </aside>
        <aside className="freshCard">
          <h2>{invoices.length}</h2>
          <p>Total invoices</p>
        </aside>
      </section>

      <section className="freshCommandFilterBar">
        {filters.map((item) => (
          <button
            type="button"
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            <span>{item}</span>
            <b>{item === "All" ? invoices.length : invoices.filter((invoice) => invoice.status === item).length}</b>
          </button>
        ))}
      </section>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Invoice list</h2>

          {visibleInvoices.map((invoice) => (
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

          {visibleInvoices.length === 0 && (
            <div className="freshItem">
              <b>No invoices</b>
              <span>Change filter or reset preview invoices.</span>
            </div>
          )}
        </aside>

        <section className="freshCard">
          <h2>{selected?.id || "Select invoice"}</h2>

          {selected && (
            <>
              <div className="freshMiniGrid">
                <div>
                  <span>Client</span>
                  <b>{selected.client}</b>
                </div>
                <div>
                  <span>Status</span>
                  <b>{selected.status}</b>
                </div>
                <div>
                  <span>Amount</span>
                  <b>{money(selected.amount)}</b>
                </div>
                <div>
                  <span>GST</span>
                  <b>{money(selected.gst)}</b>
                </div>
              </div>

              <div className={`freshInvoiceStatus ${selected.status.toLowerCase()}`}>
                <b>{selected.due}</b>
                <span>{selected.sync}</span>
              </div>

              <div className="freshInvoiceLines">
                {selected.lines.map((line) => (
                  <div key={line}>
                    <span>{line}</span>
                  </div>
                ))}
              </div>

              <label className="freshField">
                <span>Owner invoice note</span>
                <textarea
                  value={selected.note}
                  onChange={(event) => updateSelectedInvoice({ note: event.target.value })}
                />
              </label>
            </>
          )}
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>

          <div className="freshActions">
            <button className="freshPrimary" onClick={() => updateSelectedInvoice({ status: "Sent", due: "Due in 7 days", sync: "Ready to sync" })}>
              Approve and send
            </button>
            <button className="freshDark" onClick={() => updateSelectedInvoice({ status: "Paid", due: "Paid today", sync: "Payment ready to sync" })}>
              Mark paid
            </button>
            <button className="freshOrange" onClick={() => updateSelectedInvoice({ status: "Overdue", due: "Overdue now", sync: "Reminder needs approval" })}>
              Mark overdue
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>
              Send issue to Command
            </button>
            <button className="freshGhost" onClick={resetInvoices}>
              Reset invoices
            </button>
          </div>
        </aside>
      </section>
    </section>
  );
}
