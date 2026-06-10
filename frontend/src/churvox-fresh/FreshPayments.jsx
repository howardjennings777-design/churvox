import React from "react";

const PAYMENTS_KEY = "churvox:fresh-payments:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "pay-1",
    customer: "Lower Hutt Medical Centre",
    invoice: "INV-1042",
    job: "Garden tidy",
    total: 420,
    paid: 0,
    method: "Bank transfer",
    status: "Awaiting payment",
    due: "Today",
    note: "Send payment reminder after invoice is approved.",
  },
  {
    id: "pay-2",
    customer: "Birchville Rentals",
    invoice: "INV-1043",
    job: "Driveway clean",
    total: 260,
    paid: 120,
    method: "Card",
    status: "Part paid",
    due: "Tomorrow",
    note: "Balance due after return visit is confirmed.",
  },
  {
    id: "pay-3",
    customer: "Aroha Property Care",
    invoice: "INV-1044",
    job: "Lawn service",
    total: 65,
    paid: 65,
    method: "Bank transfer",
    status: "Paid",
    due: "Paid",
    note: "Ready for receipt and review request.",
  },
];

function readPayments() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(PAYMENTS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function savePayments(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PAYMENTS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "payments" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function balanceOf(item) {
  return Math.max(0, Number(item.total || 0) - Number(item.paid || 0));
}

function sendPaymentToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];
    const balance = balanceOf(item);

    const slip = {
      id: `payment-${item.id}-${Date.now()}`,
      group: "Payments",
      title: "Payment needs owner review",
      info: `${item.customer} · ${item.invoice} · $${balance} owing`,
      urgency: balance > 0 ? "Money owing" : "Paid",
      found: `${item.invoice} has total $${item.total}, paid $${item.paid}, balance $${balance}.`,
      prepared: balance > 0 ? "Churvox prepared a payment reminder." : "Churvox marked this as paid-ready.",
      why: item.note,
      owner: "Approve reminder, mark paid, open invoice, or contact customer.",
      area: "Payments",
      page: "payments",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "payment-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshPayments({ onNavigate }) {
  const [items, setItems] = React.useState(readPayments);
  const [selectedId, setSelectedId] = React.useState(() => readPayments()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const paid = items.reduce((sum, item) => sum + Number(item.paid || 0), 0);
  const owing = items.reduce((sum, item) => sum + balanceOf(item), 0);
  const risks = items.filter((item) => balanceOf(item) > 0 && item.status !== "Paid").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };
        const balance = balanceOf(updated);
        const status = balance <= 0 ? "Paid" : Number(updated.paid || 0) > 0 ? "Part paid" : updated.status;
        return { ...updated, status };
      });

      savePayments(next);
      return next;
    });
  }

  function addPayment() {
    const next = {
      id: `pay-${Date.now()}`,
      customer: "New customer",
      invoice: "INV-new",
      job: "New job",
      total: 0,
      paid: 0,
      method: "Bank transfer",
      status: "Awaiting payment",
      due: "Today",
      note: "Add payment details.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    savePayments(updated);
  }

  function resetPayments() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    savePayments(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendPaymentToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshPaymentsPage">
      <div className="freshPaymentsHero">
        <div>
          <span>Payments / deposits</span>
          <h1>See what is paid, part-paid, and still owing</h1>
          <p>Track payment reminders, deposits, balances, methods and owner approvals before chasing customers.</p>
        </div>

        <div className="freshPaymentsStats">
          <div><b>${total}</b><small>invoiced</small></div>
          <div><b>${paid}</b><small>paid</small></div>
          <div><b>${owing}</b><small>owing</small></div>
          <div><b>{risks}</b><small>follow up</small></div>
        </div>
      </div>

      <div className="freshPaymentsLayout">
        <aside className="freshPaymentsList">
          <header>
            <div>
              <b>Payment queue</b>
              <span>{risks} needs action</span>
            </div>
            <button type="button" onClick={addPayment}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.customer}</b>
              <span>{item.invoice}</span>
              <small>${balanceOf(item)} owing · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshPaymentsReset" onClick={resetPayments}>
            Reset payments
          </button>
        </aside>

        {selected && (
          <article className="freshPaymentsDetail">
            <div className="freshPaymentsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.customer}</h2>
                <p>{selected.invoice} · {selected.job}</p>
              </div>

              <div className="freshPaymentsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
                <button type="button" onClick={() => onNavigate?.("followups")}>Open Follow-ups</button>
              </div>
            </div>

            <div className="freshPaymentsCards">
              <section>
                <span>Total</span>
                <b>${selected.total}</b>
                <p>Full invoice or job value.</p>
              </section>

              <section>
                <span>Paid</span>
                <b>${selected.paid}</b>
                <p>{selected.method} · due {selected.due}</p>
              </section>

              <section>
                <span>Balance</span>
                <b>${balanceOf(selected)}</b>
                <p>{balanceOf(selected) > 0 ? "Needs payment follow-up." : "Ready to close out."}</p>
              </section>
            </div>

            <div className="freshPaymentsForm">
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
                <span>Total</span>
                <input type="number" value={selected.total} onChange={(event) => updateItem(selected.id, { total: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Paid</span>
                <input type="number" value={selected.paid} onChange={(event) => updateItem(selected.id, { paid: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Awaiting payment</option>
                  <option>Part paid</option>
                  <option>Paid</option>
                  <option>Overdue</option>
                  <option>Disputed</option>
                  <option>Written off</option>
                </select>
              </label>

              <label>
                <span>Method</span>
                <select value={selected.method} onChange={(event) => updateItem(selected.id, { method: event.target.value })}>
                  <option>Bank transfer</option>
                  <option>Card</option>
                  <option>Cash</option>
                  <option>Stripe</option>
                  <option>MYOB</option>
                  <option>Xero</option>
                </select>
              </label>

              <label>
                <span>Due</span>
                <input value={selected.due} onChange={(event) => updateItem(selected.id, { due: event.target.value })} />
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshPaymentsActions">
              <button type="button" onClick={() => updateItem(selected.id, { paid: Number(selected.total || 0), status: "Paid" })}>Mark paid</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Overdue" })}>Mark overdue</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Disputed" })}>Disputed</button>
              <button type="button" onClick={() => onNavigate?.("messages")}>Message customer</button>
              <button type="button" onClick={() => onNavigate?.("reports")}>Open Reports</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
