import React from "react";

const IMPORTS_KEY = "churvox:fresh-imports:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "im-1",
    name: "Client CSV import",
    dataType: "Clients",
    source: "CSV",
    rows: 186,
    cleanRows: 172,
    status: "Needs review",
    priority: "High",
    issue: "14 rows missing phone or email.",
    nextAction: "Review bad rows before importing live clients.",
    note: "Good for launch because existing customers can be moved into Churvox quickly.",
  },
  {
    id: "im-2",
    name: "Team import",
    dataType: "Team",
    source: "CSV",
    rows: 12,
    cleanRows: 12,
    status: "Ready",
    priority: "Medium",
    issue: "No blocking issues found.",
    nextAction: "Owner approves invites before workers receive access.",
    note: "Team invites should stay owner-approved.",
  },
  {
    id: "im-3",
    name: "Invoice history import",
    dataType: "Invoices",
    source: "Accounting export",
    rows: 94,
    cleanRows: 81,
    status: "Blocked",
    priority: "Medium",
    issue: "Some invoices do not match existing customers.",
    nextAction: "Match customers before importing invoice history.",
    note: "Keep old invoice data separate until accounting sync is ready.",
  },
];

function readImports() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(IMPORTS_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveImports(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(IMPORTS_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "imports" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function cleanPercent(item) {
  const rows = Math.max(1, Number(item.rows || 1));
  return Math.min(100, Math.round((Number(item.cleanRows || 0) / rows) * 100));
}

function sendImportToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `import-${item.id}-${Date.now()}`,
      group: "Imports",
      title: "Import needs owner review",
      info: `${item.name} · ${item.cleanRows}/${item.rows} clean rows · ${item.status}`,
      urgency: item.priority,
      found: `${item.issue} Clean rate is ${cleanPercent(item)}%.`,
      prepared: `Churvox prepared next action: ${item.nextAction}`,
      why: item.note,
      owner: "Approve import, fix rows, open related area, or keep blocked.",
      area: "Data Import",
      page: "imports",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "import-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshImports({ onNavigate }) {
  const [items, setItems] = React.useState(readImports);
  const [selectedId, setSelectedId] = React.useState(() => readImports()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const totalRows = items.reduce((sum, item) => sum + Number(item.rows || 0), 0);
  const cleanRows = items.reduce((sum, item) => sum + Number(item.cleanRows || 0), 0);
  const review = items.filter((item) => item.status === "Needs review").length;
  const blocked = items.filter((item) => item.status === "Blocked").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveImports(next);
      return next;
    });
  }

  function addImport() {
    const next = {
      id: `im-${Date.now()}`,
      name: "New import",
      dataType: "Clients",
      source: "CSV",
      rows: 0,
      cleanRows: 0,
      status: "Needs review",
      priority: "Medium",
      issue: "Add import issue or validation note.",
      nextAction: "Review before importing.",
      note: "Owner approval protects live data from messy imports.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveImports(updated);
  }

  function resetImports() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveImports(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendImportToCommand(selected);
    onNavigate?.("command");
  }

  function openDataArea(type) {
    const map = {
      Clients: "clients",
      Team: "team",
      Jobs: "jobs",
      Invoices: "invoices",
      Quotes: "quotes",
      Payments: "payments",
    };
    onNavigate?.(map[type] || "clients");
  }

  return (
    <section className="freshImportsPage">
      <div className="freshImportsHero">
        <div>
          <span>Data import / migration</span>
          <h1>Bring old business data into Churvox without making a mess</h1>
          <p>Review CSV imports, customer lists, team records, invoice history and bad rows before anything touches live data.</p>
        </div>

        <div className="freshImportsStats">
          <div><b>{totalRows}</b><small>rows found</small></div>
          <div><b>{cleanRows}</b><small>clean rows</small></div>
          <div><b>{review}</b><small>review</small></div>
          <div><b>{blocked}</b><small>blocked</small></div>
        </div>
      </div>

      <div className="freshImportsLayout">
        <aside className="freshImportsList">
          <header>
            <div>
              <b>Import desk</b>
              <span>{review + blocked} need owner action</span>
            </div>
            <button type="button" onClick={addImport}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.name}</b>
              <span>{item.dataType} · {item.source}</span>
              <small>{item.cleanRows}/{item.rows} clean · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshImportsReset" onClick={resetImports}>
            Reset imports
          </button>
        </aside>

        {selected && (
          <article className="freshImportsDetail">
            <div className="freshImportsHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.name}</h2>
                <p>{selected.dataType} · {selected.source} · {selected.priority} priority</p>
              </div>

              <div className="freshImportsHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => openDataArea(selected.dataType)}>Open Area</button>
                <button type="button" onClick={() => onNavigate?.("setup")}>Open Setup</button>
              </div>
            </div>

            <div className="freshImportsMeter">
              <div>
                <span>{cleanPercent(selected)}%</span>
                <b>{selected.cleanRows} of {selected.rows} rows clean</b>
              </div>
              <i style={{ width: `${cleanPercent(selected)}%` }} />
            </div>

            <div className="freshImportsCards">
              <section>
                <span>Issue found</span>
                <b>{selected.status}</b>
                <p>{selected.issue}</p>
              </section>

              <section>
                <span>Next action</span>
                <b>{selected.dataType}</b>
                <p>{selected.nextAction}</p>
              </section>

              <section>
                <span>Owner control</span>
                <b>{selected.priority}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshImportsForm">
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
                  <option>Payments</option>
                </select>
              </label>

              <label>
                <span>Source</span>
                <select value={selected.source} onChange={(event) => updateItem(selected.id, { source: event.target.value })}>
                  <option>CSV</option>
                  <option>Accounting export</option>
                  <option>Spreadsheet</option>
                  <option>Manual upload</option>
                  <option>Future API</option>
                </select>
              </label>

              <label>
                <span>Rows</span>
                <input type="number" value={selected.rows} onChange={(event) => updateItem(selected.id, { rows: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Clean rows</span>
                <input type="number" value={selected.cleanRows} onChange={(event) => updateItem(selected.id, { cleanRows: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Ready</option>
                  <option>Needs review</option>
                  <option>Blocked</option>
                  <option>Imported</option>
                  <option>Draft</option>
                </select>
              </label>

              <label>
                <span>Priority</span>
                <select value={selected.priority} onChange={(event) => updateItem(selected.id, { priority: event.target.value })}>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </label>

              <label className="wide">
                <span>Issue</span>
                <textarea value={selected.issue} onChange={(event) => updateItem(selected.id, { issue: event.target.value })} />
              </label>

              <label className="wide">
                <span>Next action</span>
                <textarea value={selected.nextAction} onChange={(event) => updateItem(selected.id, { nextAction: event.target.value })} />
              </label>

              <label className="wide">
                <span>Owner note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshImportsActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Ready" })}>Mark ready</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Imported" })}>Mark imported</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Blocked" })}>Blocked</button>
              <button type="button" onClick={() => onNavigate?.("clients")}>Open Clients</button>
              <button type="button" onClick={() => onNavigate?.("team")}>Open Team</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
