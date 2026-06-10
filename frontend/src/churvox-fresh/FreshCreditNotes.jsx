import React from "react";

const CREDIT_NOTES_KEY = "churvox:fresh-credit-notes:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "cn-1",
    creditNo: "CN-1001",
    customer: "Lower Hutt Medical Centre",
    invoice: "INV-1042",
    job: "Garden tidy",
    amount: 85,
    reason: "Customer approved a partial credit for missed green waste removal.",
    status: "Needs approval",
    refundMethod: "Credit against next invoice",
    ownerNote: "Check photos and approve before sending to customer.",
  },
  {
    id: "cn-2",
    creditNo: "CN-1002",
    customer: "Birchville Rentals",
    invoice: "INV-1043",
    job: "Driveway clean",
    amount: 40,
    reason: "Deposit correction after job scope changed.",
    status: "Draft",
    refundMethod: "Bank refund",
    ownerNote: "Confirm bank details before refund.",
  },
  {
    id: "cn-3",
    creditNo: "CN-1003",
    customer: "Aroha Property Care",
    invoice: "INV-1044",
    job: "Lawn service",
    amount: 25,
    reason: "Goodwill credit for late arrival.",
    status: "Approved",
    refundMethod: "Credit against next invoice",
    ownerNote: "Ready to send with apology message.",
  },
];

function readCreditNotes() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(CREDIT_NOTES_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveCreditNotes(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CREDIT_NOTES_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "creditnotes" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendCreditToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `creditnote-${item.id}-${Date.now()}`,
      group: "Credit Notes",
      title: "Credit note needs owner approval",
      info: `${item.customer} · ${item.creditNo} · $${item.amount}`,
      urgency: item.status === "Needs approval" ? "Owner approval" : item.status,
      found: `${item.invoice} may need a $${item.amount} credit for ${item.job}.`,
      prepared: "Churvox prepared the credit note/refund details for owner review.",
      why: item.reason,
      owner: "Approve credit, edit amount, send customer message, or mark refunded.",
      area: "Credit Notes",
      page: "creditnotes",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "creditnote-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshCreditNotes({ onNavigate }) {
  const [items, setItems] = React.useState(readCreditNotes);
  const [selectedId, setSelectedId] = React.useState(() => readCreditNotes()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const approvalCount = items.filter((item) => item.status === "Needs approval").length;
  const approvedCount = items.filter((item) => item.status === "Approved").length;
  const refundedCount = items.filter((item) => item.status === "Refunded").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveCreditNotes(next);
      return next;
    });
  }

  function addCreditNote() {
    const next = {
      id: `cn-${Date.now()}`,
      creditNo: "CN-new",
      customer: "New customer",
      invoice: "INV-new",
      job: "New job",
      amount: 0,
      reason: "Add reason for credit or refund.",
      status: "Draft",
      refundMethod: "Credit against next invoice",
      ownerNote: "Review before sending.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveCreditNotes(updated);
  }

  function resetCreditNotes() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveCreditNotes(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendCreditToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshCreditNotesPage">
      <div className="freshCreditNotesHero">
        <div>
          <span>Credit notes / refunds</span>
          <h1>Approve credits before money leaves the business</h1>
          <p>Track refunds, invoice credits, goodwill adjustments and owner approval before anything is sent or marked refunded.</p>
        </div>

        <div className="freshCreditNotesStats">
          <div><b>${total}</b><small>credit value</small></div>
          <div><b>{approvalCount}</b><small>need approval</small></div>
          <div><b>{approvedCount}</b><small>approved</small></div>
          <div><b>{refundedCount}</b><small>refunded</small></div>
        </div>
      </div>

      <div className="freshCreditNotesLayout">
        <aside className="freshCreditNotesList">
          <header>
            <div>
              <b>Credit queue</b>
              <span>{approvalCount} needs owner check</span>
            </div>
            <button type="button" onClick={addCreditNote}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.customer}</b>
              <span>{item.creditNo} · {item.invoice}</span>
              <small>${item.amount} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshCreditNotesReset" onClick={resetCreditNotes}>
            Reset credit notes
          </button>
        </aside>

        {selected && (
          <article className="freshCreditNotesDetail">
            <div className="freshCreditNotesHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.customer}</h2>
                <p>{selected.creditNo} · {selected.invoice} · {selected.job}</p>
              </div>

              <div className="freshCreditNotesHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
                <button type="button" onClick={() => onNavigate?.("payments")}>Open Payments</button>
              </div>
            </div>

            <div className="freshCreditNotesCards">
              <section>
                <span>Amount</span>
                <b>${selected.amount}</b>
                <p>Credit, refund, or invoice adjustment value.</p>
              </section>

              <section>
                <span>Refund method</span>
                <b>{selected.refundMethod}</b>
                <p>How this credit will be handled.</p>
              </section>

              <section>
                <span>Owner control</span>
                <b>{selected.status}</b>
                <p>{selected.status === "Needs approval" ? "Waiting for approval." : "Ready for next action."}</p>
              </section>
            </div>

            <div className="freshCreditNotesForm">
              <label>
                <span>Credit no.</span>
                <input value={selected.creditNo} onChange={(event) => updateItem(selected.id, { creditNo: event.target.value })} />
              </label>

              <label>
                <span>Customer</span>
                <input value={selected.customer} onChange={(event) => updateItem(selected.id, { customer: event.target.value })} />
              </label>

              <label>
                <span>Invoice</span>
                <input value={selected.invoice} onChange={(event) => updateItem(selected.id, { invoice: event.target.value })} />
              </label>

              <label>
                <span>Job</span>
                <input value={selected.job} onChange={(event) => updateItem(selected.id, { job: event.target.value })} />
              </label>

              <label>
                <span>Amount</span>
                <input type="number" value={selected.amount} onChange={(event) => updateItem(selected.id, { amount: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Draft</option>
                  <option>Needs approval</option>
                  <option>Approved</option>
                  <option>Sent</option>
                  <option>Refunded</option>
                  <option>Rejected</option>
                </select>
              </label>

              <label>
                <span>Refund method</span>
                <select value={selected.refundMethod} onChange={(event) => updateItem(selected.id, { refundMethod: event.target.value })}>
                  <option>Credit against next invoice</option>
                  <option>Bank refund</option>
                  <option>Card refund</option>
                  <option>Cash refund</option>
                  <option>Write-off only</option>
                </select>
              </label>

              <label className="wide">
                <span>Reason</span>
                <textarea value={selected.reason} onChange={(event) => updateItem(selected.id, { reason: event.target.value })} />
              </label>

              <label className="wide">
                <span>Owner note</span>
                <textarea value={selected.ownerNote} onChange={(event) => updateItem(selected.id, { ownerNote: event.target.value })} />
              </label>
            </div>

            <div className="freshCreditNotesActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Approved" })}>Approve</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Refunded" })}>Mark refunded</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Rejected" })}>Reject</button>
              <button type="button" onClick={() => onNavigate?.("messages")}>Message customer</button>
              <button type="button" onClick={() => onNavigate?.("reports")}>Open Reports</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
