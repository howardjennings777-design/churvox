import React from "react";

const QA_KEY = "churvox:fresh-qa:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "qa-1",
    test: "Mobile navigation tap test",
    area: "Mobile",
    status: "Needs test",
    priority: "High",
    device: "Phone / tablet",
    result: "Confirm bottom nav, side menu and cards are tappable.",
    issue: "Old issue: overlays or z-index blocking taps.",
    nextAction: "Open /fresh on phone, tap every main page, confirm no dead buttons.",
  },
  {
    id: "qa-2",
    test: "Command approval slip test",
    area: "Command",
    status: "In progress",
    priority: "High",
    device: "Desktop + mobile",
    result: "One focused slip opens, owner can approve, decline, edit and save.",
    issue: "Command must not show old blue slip layout.",
    nextAction: "Send a setup, invoice or follow-up item to Command and approve it.",
  },
  {
    id: "qa-3",
    test: "Text visibility test",
    area: "Design",
    status: "Passed",
    priority: "High",
    device: "All pages",
    result: "Text must show without highlighting.",
    issue: "Old issue: some text was invisible unless selected.",
    nextAction: "Hard refresh and scan dark cards, forms, buttons and mobile pages.",
  },
];

function readQa() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(QA_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveQa(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(QA_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "qa" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendQaToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `qa-${item.id}-${Date.now()}`,
      group: "QA",
      title: "QA test needs owner review",
      info: `${item.test} · ${item.status} · ${item.priority}`,
      urgency: item.priority,
      found: `${item.area} test is marked ${item.status}.`,
      prepared: `Churvox prepared QA action: ${item.nextAction}`,
      why: item.issue,
      owner: "Run test, mark passed, open related page, or keep blocked.",
      area: "QA Test Tracker",
      page: "qa",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "qa-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshQa({ onNavigate }) {
  const [items, setItems] = React.useState(readQa);
  const [selectedId, setSelectedId] = React.useState(() => readQa()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const passed = items.filter((item) => item.status === "Passed").length;
  const needsTest = items.filter((item) => item.status === "Needs test").length;
  const blocked = items.filter((item) => item.status === "Blocked").length;
  const percent = total ? Math.round((passed / total) * 100) : 0;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveQa(next);
      return next;
    });
  }

  function addTest() {
    const next = {
      id: `qa-${Date.now()}`,
      test: "New QA test",
      area: "Launch",
      status: "Needs test",
      priority: "Medium",
      device: "Desktop + mobile",
      result: "Add expected result.",
      issue: "Add possible issue.",
      nextAction: "Run the test and mark result.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveQa(updated);
  }

  function resetQa() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveQa(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendQaToCommand(selected);
    onNavigate?.("command");
  }

  function openArea(area) {
    const map = {
      Mobile: "worker",
      Command: "command",
      Design: "launch",
      Jobs: "jobs",
      Invoices: "invoices",
      Billing: "billing",
      Security: "security",
      Launch: "launch",
      Setup: "setup",
    };
    onNavigate?.(map[area] || "launch");
  }

  return (
    <section className="freshQaPage">
      <div className="freshQaHero">
        <div>
          <span>QA test tracker</span>
          <h1>Test the app like a real owner before launch</h1>
          <p>Track mobile taps, Command slips, text visibility, job flow, invoice flow, billing, security and launch blockers in one place.</p>
        </div>

        <div className="freshQaStats">
          <div><b>{percent}%</b><small>passed</small></div>
          <div><b>{total}</b><small>tests</small></div>
          <div><b>{needsTest}</b><small>needs test</small></div>
          <div><b>{blocked}</b><small>blocked</small></div>
        </div>
      </div>

      <div className="freshQaMeter">
        <div>
          <span>{passed} passed</span>
          <b>{percent}% QA confidence</b>
        </div>
        <i style={{ width: `${percent}%` }} />
      </div>

      <div className="freshQaLayout">
        <aside className="freshQaList">
          <header>
            <div>
              <b>Testing desk</b>
              <span>{needsTest + blocked} need action</span>
            </div>
            <button type="button" onClick={addTest}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.test}</b>
              <span>{item.area} · {item.device}</span>
              <small>{item.status} · {item.priority}</small>
            </button>
          ))}

          <button type="button" className="freshQaReset" onClick={resetQa}>
            Reset QA tests
          </button>
        </aside>

        {selected && (
          <article className="freshQaDetail">
            <div className="freshQaHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.test}</h2>
                <p>{selected.area} · {selected.device} · {selected.priority} priority</p>
              </div>

              <div className="freshQaHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => openArea(selected.area)}>Open Area</button>
                <button type="button" onClick={() => onNavigate?.("launch")}>Open Launch</button>
              </div>
            </div>

            <div className="freshQaCards">
              <section>
                <span>Expected result</span>
                <b>{selected.area}</b>
                <p>{selected.result}</p>
              </section>

              <section>
                <span>Possible issue</span>
                <b>{selected.priority}</b>
                <p>{selected.issue}</p>
              </section>

              <section>
                <span>Next action</span>
                <b>{selected.status}</b>
                <p>{selected.nextAction}</p>
              </section>
            </div>

            <div className="freshQaForm">
              <label>
                <span>Test</span>
                <input value={selected.test} onChange={(event) => updateItem(selected.id, { test: event.target.value })} />
              </label>

              <label>
                <span>Area</span>
                <select value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })}>
                  <option>Mobile</option>
                  <option>Command</option>
                  <option>Design</option>
                  <option>Jobs</option>
                  <option>Invoices</option>
                  <option>Billing</option>
                  <option>Security</option>
                  <option>Launch</option>
                  <option>Setup</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Passed</option>
                  <option>In progress</option>
                  <option>Needs test</option>
                  <option>Failed</option>
                  <option>Blocked</option>
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

              <label>
                <span>Device</span>
                <input value={selected.device} onChange={(event) => updateItem(selected.id, { device: event.target.value })} />
              </label>

              <label className="wide">
                <span>Expected result</span>
                <textarea value={selected.result} onChange={(event) => updateItem(selected.id, { result: event.target.value })} />
              </label>

              <label className="wide">
                <span>Issue / risk</span>
                <textarea value={selected.issue} onChange={(event) => updateItem(selected.id, { issue: event.target.value })} />
              </label>

              <label className="wide">
                <span>Next action</span>
                <textarea value={selected.nextAction} onChange={(event) => updateItem(selected.id, { nextAction: event.target.value })} />
              </label>
            </div>

            <div className="freshQaActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Passed" })}>Mark passed</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Failed" })}>Mark failed</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Blocked" })}>Blocked</button>
              <button type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
              <button type="button" onClick={() => onNavigate?.("security")}>Open Security</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
