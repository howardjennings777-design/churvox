import React from "react";

const SUBBIES_KEY = "churvox:fresh-subcontractors:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "sub-1",
    name: "Tama Contracting",
    trade: "Lawn care backup crew",
    status: "Approved",
    compliance: "Insurance checked",
    rate: "$55/hr",
    availability: "Weekends / overflow",
    region: "Lower Hutt",
    risk: "Low",
    note: "Use for overflow lawn runs when internal crew is full.",
    nextAction: "Keep approved and assign only overflow jobs.",
  },
  {
    id: "sub-2",
    name: "Mere Cleaning Co",
    trade: "Cleaning subcontractor",
    status: "Needs review",
    compliance: "Agreement missing",
    rate: "$45/hr",
    availability: "Weekdays",
    region: "Wellington",
    risk: "Medium",
    note: "Good fit for cleaning work, but paperwork is not complete.",
    nextAction: "Upload agreement before assigning customer jobs.",
  },
  {
    id: "sub-3",
    name: "Hutt Handyman Help",
    trade: "Handyman / repairs",
    status: "Blocked",
    compliance: "Insurance expired",
    rate: "$70/hr",
    availability: "On call",
    region: "Upper Hutt",
    risk: "High",
    note: "Do not assign until insurance is confirmed.",
    nextAction: "Send to Command and keep blocked until documents are checked.",
  },
];

function readSubbies() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(SUBBIES_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveSubbies(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SUBBIES_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "subcontractors" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendSubbieToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `subcontractor-${item.id}-${Date.now()}`,
      group: "Subcontractors",
      title: "Subcontractor needs owner review",
      info: `${item.name} · ${item.status} · ${item.risk} risk`,
      urgency: item.risk,
      found: `${item.name} is marked ${item.status}. Compliance: ${item.compliance}.`,
      prepared: `Churvox prepared subcontractor action: ${item.nextAction}`,
      why: item.note,
      owner: "Approve subcontractor, keep blocked, open Team, or check documents.",
      area: "Subcontractors",
      page: "subcontractors",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "subcontractor-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshSubcontractors({ onNavigate }) {
  const [items, setItems] = React.useState(readSubbies);
  const [selectedId, setSelectedId] = React.useState(() => readSubbies()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const approved = items.filter((item) => item.status === "Approved").length;
  const review = items.filter((item) => item.status === "Needs review").length;
  const blocked = items.filter((item) => item.status === "Blocked").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveSubbies(next);
      return next;
    });
  }

  function addSubbie() {
    const next = {
      id: `sub-${Date.now()}`,
      name: "New subcontractor",
      trade: "Trade / service",
      status: "Needs review",
      compliance: "Documents needed",
      rate: "$0/hr",
      availability: "TBC",
      region: "New Zealand",
      risk: "Medium",
      note: "Check paperwork before assigning customer jobs.",
      nextAction: "Review agreement, insurance and availability.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveSubbies(updated);
  }

  function resetSubbies() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveSubbies(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendSubbieToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshSubbiesPage">
      <div className="freshSubbiesHero">
        <div>
          <span>Subcontractors / external crew</span>
          <h1>Use outside help without losing owner control</h1>
          <p>Track approved subcontractors, agreements, insurance, regions, rates and whether they are safe to assign to customer jobs.</p>
        </div>

        <div className="freshSubbiesStats">
          <div><b>{total}</b><small>subbies</small></div>
          <div><b>{approved}</b><small>approved</small></div>
          <div><b>{review}</b><small>review</small></div>
          <div><b>{blocked}</b><small>blocked</small></div>
        </div>
      </div>

      <div className="freshSubbiesLayout">
        <aside className="freshSubbiesList">
          <header>
            <div>
              <b>External crew desk</b>
              <span>{review + blocked} need owner check</span>
            </div>
            <button type="button" onClick={addSubbie}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.name}</b>
              <span>{item.trade} · {item.region}</span>
              <small>{item.status} · {item.risk} risk</small>
            </button>
          ))}

          <button type="button" className="freshSubbiesReset" onClick={resetSubbies}>
            Reset subcontractors
          </button>
        </aside>

        {selected && (
          <article className="freshSubbiesDetail">
            <div className="freshSubbiesHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.name}</h2>
                <p>{selected.trade} · {selected.rate} · {selected.availability}</p>
              </div>

              <div className="freshSubbiesHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("team")}>Open Team</button>
                <button type="button" onClick={() => onNavigate?.("documents")}>Open Documents</button>
              </div>
            </div>

            <div className="freshSubbiesCards">
              <section>
                <span>Compliance</span>
                <b>{selected.compliance}</b>
                <p>{selected.note}</p>
              </section>

              <section>
                <span>Assignment rule</span>
                <b>{selected.region}</b>
                <p>Subcontractors should only receive work once owner approval and paperwork are clear.</p>
              </section>

              <section>
                <span>Next action</span>
                <b>{selected.risk} risk</b>
                <p>{selected.nextAction}</p>
              </section>
            </div>

            <div className="freshSubbiesForm">
              <label>
                <span>Name</span>
                <input value={selected.name} onChange={(event) => updateItem(selected.id, { name: event.target.value })} />
              </label>

              <label>
                <span>Trade</span>
                <input value={selected.trade} onChange={(event) => updateItem(selected.id, { trade: event.target.value })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Approved</option>
                  <option>Needs review</option>
                  <option>Blocked</option>
                  <option>Draft</option>
                  <option>Inactive</option>
                </select>
              </label>

              <label>
                <span>Compliance</span>
                <input value={selected.compliance} onChange={(event) => updateItem(selected.id, { compliance: event.target.value })} />
              </label>

              <label>
                <span>Rate</span>
                <input value={selected.rate} onChange={(event) => updateItem(selected.id, { rate: event.target.value })} />
              </label>

              <label>
                <span>Availability</span>
                <input value={selected.availability} onChange={(event) => updateItem(selected.id, { availability: event.target.value })} />
              </label>

              <label>
                <span>Region</span>
                <input value={selected.region} onChange={(event) => updateItem(selected.id, { region: event.target.value })} />
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
                <span>Owner note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>

              <label className="wide">
                <span>Next action</span>
                <textarea value={selected.nextAction} onChange={(event) => updateItem(selected.id, { nextAction: event.target.value })} />
              </label>
            </div>

            <div className="freshSubbiesActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Approved", risk: "Low" })}>Approve</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs review", risk: "Medium" })}>Needs review</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Blocked", risk: "High" })}>Block</button>
              <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
              <button type="button" onClick={() => onNavigate?.("security")}>Open Security</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
