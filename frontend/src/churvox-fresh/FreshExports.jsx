import React from "react";

const EXPORTS_KEY = "churvox:fresh-exports:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "ex-1",
    name: "Client list export",
    dataType: "Clients",
    format: "CSV",
    rows: 186,
    status: "Ready",
    ownerApproval: "Required",
    destination: "Owner download",
    risk: "Low",
    note: "Export customers for backup, review, or accounting prep.",
    nextAction: "Owner approves download before customer data leaves Churvox.",
  },
  {
    id: "ex-2",
    name: "Payroll hours export",
    dataType: "Payroll",
    format: "CSV",
    rows: 42,
    status: "Needs review",
    ownerApproval: "Required",
    destination: "Payroll workspace",
    risk: "High",
    note: "Payroll export must stay owner-approved. No government submission. No bank payout file.",
    nextAction: "Review manual time edits before export.",
  },
  {
    id: "ex-3",
    name: "Invoice report export",
    dataType: "Invoices",
    format: "CSV",
    rows: 94,
    status: "Draft",
    ownerApproval: "Optional",
    destination: "Reports",
    risk: "Medium",
    note: "Useful for paid, unpaid, overdue and GST review.",
    nextAction: "Filter by date range before download.",
  },
];

function readExports() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(EXPORTS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveExports(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(EXPORTS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "exports" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendExportToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `export-${item.id}-${Date.now()}`,
      group: "Exports",
      title: "Data export needs owner review",
      info: `${item.name} · ${item.rows} rows · ${item.status}`,
      urgency: item.risk,
      found: `${item.dataType} export is prepared as ${item.format}.`,
      prepared: `Churvox prepared export action: ${item.nextAction}`,
      why: item.note,
      owner: "Approve export, review rows, open related area, or keep draft.",
      area: "Data Exports",
      page: "exports",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "export-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshExports({ onNavigate }) {
  const [items, setItems] = React.useState(readExports);
  const [selectedId, setSelectedId] = React.useState(() => readExports()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const totalRows = items.reduce((sum, item) => sum + Number(item.rows || 0), 0);
  const ready = items.filter((item) => item.status === "Ready").length;
  const review = items.filter((item) => item.status === "Needs review").length;
  const approvals = items.filter((item) => item.ownerApproval === "Required").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveExports(next);
      return next;
    });
  }

  function addExport() {
    const next = {
      id: `ex-${Date.now()}`,
      name: "New export",
      dataType: "Clients",
      format: "CSV",
      rows: 0,
      status: "Draft",
      ownerApproval: "Required",
      destination: "Owner download",
      risk: "Medium",
      note: "Owner decides before data leaves Churvox.",
      nextAction: "Review filters and export fields.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveExports(updated);
  }

  function resetExports() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveExports(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendExportToCommand(selected);
    onNavigate?.("command");
  }

  function openDataArea(type) {
    const map = {
      Clients: "clients",
      Team: "team",
      Jobs: "jobs",
      Invoices: "invoices",
      Quotes: "quotes",
      Payroll: "payroll",
      Reports: "reports",
    };
    onNavigate?.(map[type] || "reports");
  }

  return (
    <section className="freshExportsPage">
      <div className="freshExportsHero">
        <div>
          <span>Data exports / CSV</span>
          <h1>Let owners export the business data they need safely</h1>
          <p>Prepare client lists, payroll hours, invoices, jobs and reports as owner-approved exports without sending anything to government or banks.</p>
        </div>

        <div className="freshExportsStats">
          <div><b>{totalRows}</b><small>rows ready</small></div>
          <div><b>{ready}</b><small>ready</small></div>
          <div><b>{review}</b><small>review</small></div>
          <div><b>{approvals}</b><small>approval</small></div>
        </div>
      </div>

      <div className="freshExportsLayout">
        <aside className="freshExportsList">
          <header>
            <div>
              <b>Export desk</b>
              <span>{approvals} owner-controlled</span>
            </div>
            <button type="button" onClick={addExport}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.name}</b>
              <span>{item.dataType} · {item.format}</span>
              <small>{item.rows} rows · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshExportsReset" onClick={resetExports}>
            Reset exports
          </button>
        </aside>

        {selected && (
          <article className="freshExportsDetail">
            <div className="freshExportsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.name}</h2>
                <p>{selected.dataType} · {selected.rows} rows · {selected.destination}</p>
              </div>

              <div className="freshExportsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => openDataArea(selected.dataType)}>Open Area</button>
                <button type="button" onClick={() => onNavigate?.("reports")}>Open Reports</button>
              </div>
            </div>

            <div className="freshExportsCards">
              <section>
                <span>Export format</span>
                <b>{selected.format}</b>
                <p>Simple CSV export for owner download, review or migration.</p>
              </section>

              <section>
                <span>Owner approval</span>
                <b>{selected.ownerApproval}</b>
                <p>Keep sensitive customer, invoice and payroll exports controlled.</p>
              </section>

              <section>
                <span>Risk</span>
                <b>{selected.risk}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshExportsForm">
              <label>
                <span>Name</span>
                <input value={selected.name} onChange={(event) => updateItem(selected.id, { name: event.target.value })} />
              </label>

              <label>
                <span>Data type</span>
                <select value={selected.dataType} onChange={(event) => updateItem(selected.id, { dataType: event.target.value })}>
                  <option>Clients</option>
                  <option>Team</option>
                  <option>Jobs</option>
                  <option>Invoices</option>
                  <option>Quotes</option>
                  <option>Payroll</option>
                  <option>Reports</option>
                </select>
              </label>

              <label>
                <span>Format</span>
                <select value={selected.format} onChange={(event) => updateItem(selected.id, { format: event.target.value })}>
                  <option>CSV</option>
                  <option>PDF summary</option>
                  <option>Spreadsheet</option>
                  <option>Backup bundle</option>
                </select>
              </label>

              <label>
                <span>Rows</span>
                <input type="number" value={selected.rows} onChange={(event) => updateItem(selected.id, { rows: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Draft</option>
                  <option>Needs review</option>
                  <option>Ready</option>
                  <option>Exported</option>
                  <option>Blocked</option>
                </select>
              </label>

              <label>
                <span>Owner approval</span>
                <select value={selected.ownerApproval} onChange={(event) => updateItem(selected.id, { ownerApproval: event.target.value })}>
                  <option>Required</option>
                  <option>Optional</option>
                  <option>Not required</option>
                </select>
              </label>

              <label>
                <span>Destination</span>
                <input value={selected.destination} onChange={(event) => updateItem(selected.id, { destination: event.target.value })} />
              </label>

              <label>
                <span>Risk</span>
                <select value={selected.risk} onChange={(event) => updateItem(selected.id, { risk: event.target.value })}>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>

              <label className="wide">
                <span>Next action</span>
                <textarea value={selected.nextAction} onChange={(event) => updateItem(selected.id, { nextAction: event.target.value })} />
              </label>
            </div>

            <div className="freshExportsActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Ready" })}>Mark ready</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Exported" })}>Mark exported</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Blocked" })}>Blocked</button>
              <button type="button" onClick={() => onNavigate?.("billing")}>Open Billing</button>
              <button type="button" onClick={() => onNavigate?.("imports")}>Open Imports</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
