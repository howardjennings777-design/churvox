import React from "react";

const PROFIT_KEY = "churvox:fresh-profit:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "profit-1",
    job: "Garden tidy",
    client: "Lower Hutt Medical Centre",
    revenue: 420,
    labour: 132,
    expenses: 42,
    status: "Healthy",
    note: "Good margin. Ready to invoice once photos are checked.",
  },
  {
    id: "profit-2",
    job: "Driveway clean",
    client: "Birchville Rentals",
    revenue: 140,
    labour: 85,
    expenses: 120,
    status: "Loss risk",
    note: "Subcontractor cost may make this job unprofitable unless billable extras are added.",
  },
  {
    id: "profit-3",
    job: "Lawn service",
    client: "Aroha Property Care",
    revenue: 65,
    labour: 32,
    expenses: 8,
    status: "Healthy",
    note: "Regular repeat job. Keep route efficient.",
  },
];

function readProfit() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(PROFIT_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveProfit(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PROFIT_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "profit" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function calc(item) {
  const revenue = Number(item.revenue || 0);
  const labour = Number(item.labour || 0);
  const expenses = Number(item.expenses || 0);
  const cost = labour + expenses;
  const profit = revenue - cost;
  const margin = revenue ? Math.round((profit / revenue) * 100) : 0;
  return { revenue, labour, expenses, cost, profit, margin };
}

function sendProfitToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];
    const numbers = calc(item);

    const slip = {
      id: `profit-${item.id}-${Date.now()}`,
      group: "Profit",
      title: "Job margin needs review",
      info: `${item.job} · ${numbers.margin}% margin · $${numbers.profit} profit`,
      urgency: numbers.profit < 0 || numbers.margin < 25 ? "Margin risk" : item.status,
      found: `${item.job} has revenue $${numbers.revenue}, labour $${numbers.labour}, expenses $${numbers.expenses}.`,
      prepared: "Churvox prepared a profit review before invoicing.",
      why: item.note,
      owner: "Approve margin, add billable extras, review labour, or open Invoices.",
      area: "Profit",
      page: "profit",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "profit-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshProfit({ onNavigate }) {
  const [items, setItems] = React.useState(readProfit);
  const [selectedId, setSelectedId] = React.useState(() => readProfit()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];
  const selectedNumbers = selected ? calc(selected) : null;

  const totals = items.reduce(
    (acc, item) => {
      const numbers = calc(item);
      acc.revenue += numbers.revenue;
      acc.cost += numbers.cost;
      acc.profit += numbers.profit;
      if (numbers.profit < 0 || numbers.margin < 25) acc.risks += 1;
      return acc;
    },
    { revenue: 0, cost: 0, profit: 0, risks: 0 }
  );

  const overallMargin = totals.revenue ? Math.round((totals.profit / totals.revenue) * 100) : 0;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };
        const numbers = calc(updated);
        const status = numbers.profit < 0 ? "Loss risk" : numbers.margin < 25 ? "Low margin" : "Healthy";
        return { ...updated, status };
      });

      saveProfit(next);
      return next;
    });
  }

  function addProfitJob() {
    const next = {
      id: `profit-${Date.now()}`,
      job: "New job",
      client: "New client",
      revenue: 0,
      labour: 0,
      expenses: 0,
      status: "Low margin",
      note: "Add job costing details.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveProfit(updated);
  }

  function resetProfit() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveProfit(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendProfitToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshProfitPage">
      <div className="freshProfitHero">
        <div>
          <span>Job profit / margins</span>
          <h1>Know which jobs actually make money</h1>
          <p>Compare revenue, labour and expenses before invoicing, payroll or reports.</p>
        </div>

        <div className="freshProfitStats">
          <div><b>${totals.revenue}</b><small>revenue</small></div>
          <div><b>${totals.cost}</b><small>costs</small></div>
          <div><b>${totals.profit}</b><small>profit</small></div>
          <div><b>{overallMargin}%</b><small>margin</small></div>
        </div>
      </div>

      <div className="freshProfitLayout">
        <aside className="freshProfitList">
          <header>
            <div>
              <b>Job margin queue</b>
              <span>{totals.risks} needs review</span>
            </div>
            <button type="button" onClick={addProfitJob}>Add</button>
          </header>

          {items.map((item) => {
            const numbers = calc(item);

            return (
              <button
                type="button"
                key={item.id}
                className={selected?.id === item.id ? "active" : ""}
                onClick={() => setSelectedId(item.id)}
              >
                <b>{item.job}</b>
                <span>{item.client}</span>
                <small>${numbers.profit} profit · {numbers.margin}% · {item.status}</small>
              </button>
            );
          })}

          <button type="button" className="freshProfitReset" onClick={resetProfit}>
            Reset profit data
          </button>
        </aside>

        {selected && selectedNumbers && (
          <article className="freshProfitDetail">
            <div className="freshProfitHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.job}</h2>
                <p>{selected.client} · ${selectedNumbers.profit} profit · {selectedNumbers.margin}% margin</p>
              </div>

              <div className="freshProfitHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
                <button type="button" onClick={() => onNavigate?.("reports")}>Open Reports</button>
              </div>
            </div>

            <div className="freshProfitCards">
              <section>
                <span>Revenue</span>
                <b>${selectedNumbers.revenue}</b>
                <p>Quote or invoice value before costs.</p>
              </section>

              <section>
                <span>Total cost</span>
                <b>${selectedNumbers.cost}</b>
                <p>Labour ${selectedNumbers.labour} + expenses ${selectedNumbers.expenses}</p>
              </section>

              <section>
                <span>Profit</span>
                <b>${selectedNumbers.profit}</b>
                <p>{selectedNumbers.margin}% margin after labour and expenses.</p>
              </section>
            </div>

            <div className="freshProfitForm">
              <label>
                <span>Job</span>
                <input value={selected.job} onChange={(event) => updateItem(selected.id, { job: event.target.value })} />
              </label>

              <label>
                <span>Client</span>
                <input value={selected.client} onChange={(event) => updateItem(selected.id, { client: event.target.value })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Healthy</option>
                  <option>Low margin</option>
                  <option>Loss risk</option>
                  <option>Needs review</option>
                  <option>Approved</option>
                </select>
              </label>

              <label>
                <span>Revenue</span>
                <input type="number" value={selected.revenue} onChange={(event) => updateItem(selected.id, { revenue: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Labour cost</span>
                <input type="number" value={selected.labour} onChange={(event) => updateItem(selected.id, { labour: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Expenses</span>
                <input type="number" value={selected.expenses} onChange={(event) => updateItem(selected.id, { expenses: Number(event.target.value || 0) })} />
              </label>

              <label className="wide">
                <span>Owner note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshProfitActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Approved" })}>Approve margin</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs review" })}>Needs review</button>
              <button type="button" onClick={() => onNavigate?.("expenses")}>Open Expenses</button>
              <button type="button" onClick={() => onNavigate?.("time")}>Open Time Logs</button>
              <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
