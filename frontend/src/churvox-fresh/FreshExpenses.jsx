import React from "react";

const EXPENSES_KEY = "churvox:fresh-expenses:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "exp-1",
    supplier: "Mitre 10",
    type: "Materials",
    job: "Garden tidy",
    client: "Lower Hutt Medical Centre",
    amount: 42,
    gst: 6.3,
    status: "Receipt uploaded",
    billable: "Yes",
    paidBy: "Owner card",
    note: "Green waste bags and gloves.",
  },
  {
    id: "exp-2",
    supplier: "BP Fuel",
    type: "Fuel",
    job: "Route day",
    client: "Internal",
    amount: 78,
    gst: 11.7,
    status: "Needs receipt",
    billable: "No",
    paidBy: "Worker card",
    note: "Fuel receipt needs upload before export.",
  },
  {
    id: "exp-3",
    supplier: "Subcontractor",
    type: "Subcontractor",
    job: "Driveway clean",
    client: "Birchville Rentals",
    amount: 120,
    gst: 18,
    status: "Needs approval",
    billable: "Yes",
    paidBy: "Business",
    note: "Approve before job profit is final.",
  },
];

function readExpenses() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(EXPENSES_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveExpenses(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(EXPENSES_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "expenses" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendExpenseToCommand(expense) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `expense-${expense.id}-${Date.now()}`,
      group: "Expenses",
      title: "Expense needs owner review",
      info: `${expense.supplier} · ${expense.type} · $${expense.amount}`,
      urgency: expense.status === "Needs approval" ? "Approval needed" : expense.status,
      found: `${expense.supplier} expense is linked to ${expense.job}.`,
      prepared: "Churvox prepared an expense review before reports/export.",
      why: expense.note,
      owner: "Approve expense, request receipt, mark billable, or open Reports.",
      area: "Expenses",
      page: "expenses",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "expense-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshExpenses({ onNavigate }) {
  const [items, setItems] = React.useState(readExpenses);
  const [selectedId, setSelectedId] = React.useState(() => readExpenses()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const billable = items.filter((item) => item.billable === "Yes").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const needs = items.filter((item) => item.status !== "Receipt uploaded" && item.status !== "Approved").length;
  const gst = items.reduce((sum, item) => sum + Number(item.gst || 0), 0);

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveExpenses(next);
      return next;
    });
  }

  function addExpense() {
    const next = {
      id: `exp-${Date.now()}`,
      supplier: "New supplier",
      type: "Materials",
      job: "New job",
      client: "New client",
      amount: 0,
      gst: 0,
      status: "Needs receipt",
      billable: "No",
      paidBy: "Owner card",
      note: "Add receipt and cost details.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveExpenses(updated);
  }

  function resetExpenses() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveExpenses(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendExpenseToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshExpensesPage">
      <div className="freshExpensesHero">
        <div>
          <span>Expenses / receipts</span>
          <h1>Know what every job really costs</h1>
          <p>Track receipts, materials, fuel, subcontractors and billable costs before reports or exports.</p>
        </div>

        <div className="freshExpensesStats">
          <div><b>${total}</b><small>total</small></div>
          <div><b>${billable}</b><small>billable</small></div>
          <div><b>{needs}</b><small>needs review</small></div>
          <div><b>${gst.toFixed(2)}</b><small>GST</small></div>
        </div>
      </div>

      <div className="freshExpensesLayout">
        <aside className="freshExpensesList">
          <header>
            <div>
              <b>Expense queue</b>
              <span>Costs + receipts</span>
            </div>
            <button type="button" onClick={addExpense}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.supplier}</b>
              <span>{item.job}</span>
              <small>${item.amount} · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshExpensesReset" onClick={resetExpenses}>
            Reset expenses
          </button>
        </aside>

        {selected && (
          <article className="freshExpensesDetail">
            <div className="freshExpensesHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.supplier}</h2>
                <p>{selected.type} · {selected.job}</p>
              </div>

              <div className="freshExpensesHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("reports")}>Open Reports</button>
                <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
              </div>
            </div>

            <div className="freshExpensesCards">
              <section>
                <span>Amount</span>
                <b>${selected.amount}</b>
                <p>GST: ${Number(selected.gst || 0).toFixed(2)}</p>
              </section>

              <section>
                <span>Billable</span>
                <b>{selected.billable}</b>
                <p>Billable costs can be recovered on invoices.</p>
              </section>

              <section>
                <span>Paid by</span>
                <b>{selected.paidBy}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshExpensesForm">
              <label>
                <span>Supplier</span>
                <input value={selected.supplier} onChange={(event) => updateItem(selected.id, { supplier: event.target.value })} />
              </label>

              <label>
                <span>Type</span>
                <select value={selected.type} onChange={(event) => updateItem(selected.id, { type: event.target.value })}>
                  <option>Materials</option>
                  <option>Fuel</option>
                  <option>Subcontractor</option>
                  <option>Equipment</option>
                  <option>Tip / waste</option>
                  <option>Other</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Receipt uploaded</option>
                  <option>Needs receipt</option>
                  <option>Needs approval</option>
                  <option>Approved</option>
                  <option>Declined</option>
                </select>
              </label>

              <label>
                <span>Job</span>
                <input value={selected.job} onChange={(event) => updateItem(selected.id, { job: event.target.value })} />
              </label>

              <label>
                <span>Client</span>
                <input value={selected.client} onChange={(event) => updateItem(selected.id, { client: event.target.value })} />
              </label>

              <label>
                <span>Paid by</span>
                <input value={selected.paidBy} onChange={(event) => updateItem(selected.id, { paidBy: event.target.value })} />
              </label>

              <label>
                <span>Amount</span>
                <input type="number" value={selected.amount} onChange={(event) => updateItem(selected.id, { amount: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>GST</span>
                <input type="number" value={selected.gst} onChange={(event) => updateItem(selected.id, { gst: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Billable</span>
                <select value={selected.billable} onChange={(event) => updateItem(selected.id, { billable: event.target.value })}>
                  <option>Yes</option>
                  <option>No</option>
                  <option>Maybe</option>
                </select>
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshExpensesActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Approved" })}>Approve</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs receipt" })}>Needs receipt</button>
              <button type="button" onClick={() => updateItem(selected.id, { billable: "Yes" })}>Mark billable</button>
              <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
              <button type="button" onClick={() => onNavigate?.("reports")}>Open Reports</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
