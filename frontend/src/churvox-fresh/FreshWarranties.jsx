import React from "react";

const WARRANTIES_KEY = "churvox:fresh-warranties:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "wa-1",
    title: "Hedge trim callback",
    client: "Upper Hutt client",
    job: "Garden tidy",
    status: "Needs review",
    priority: "High",
    warrantyType: "Workmanship",
    dueDate: "This week",
    costRisk: 65,
    reason: "Customer says one side of hedge was missed.",
    ownerDecision: "Check job photos before sending worker back.",
    nextAction: "Review photos, decide if free callback or chargeable extra.",
  },
  {
    id: "wa-2",
    title: "Invoice dispute check",
    client: "Naenae property",
    job: "Handyman repair",
    status: "Open",
    priority: "Medium",
    warrantyType: "Dispute",
    dueDate: "Tomorrow",
    costRisk: 120,
    reason: "Customer says materials were not explained before invoice.",
    ownerDecision: "Compare quote, variation and invoice notes.",
    nextAction: "Open variations and invoice before replying.",
  },
  {
    id: "wa-3",
    title: "Completed lawn photo proof",
    client: "Belmont customer",
    job: "Lawn reset",
    status: "Resolved",
    priority: "Low",
    warrantyType: "Proof",
    dueDate: "Done",
    costRisk: 0,
    reason: "Customer asked for proof the back section was completed.",
    ownerDecision: "Photos confirmed job was completed.",
    nextAction: "Keep resolved and store proof on job record.",
  },
];

function readWarranties() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(WARRANTIES_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveWarranties(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WARRANTIES_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "warranties" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ")}`;
}

function sendWarrantyToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `warranty-${item.id}-${Date.now()}`,
      group: "Warranties",
      title: "Warranty or callback needs owner review",
      info: `${item.title} · ${item.status} · ${item.priority}`,
      urgency: item.priority,
      found: `${item.client} raised: ${item.reason}`,
      prepared: `Churvox prepared owner decision: ${item.ownerDecision}`,
      why: `Possible cost risk: ${money(item.costRisk)}. ${item.nextAction}`,
      owner: "Approve callback, open job photos, charge as extra, or mark resolved.",
      area: "Warranty / Defect Callbacks",
      page: "warranties",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "warranty-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshWarranties({ onNavigate }) {
  const [items, setItems] = React.useState(readWarranties);
  const [selectedId, setSelectedId] = React.useState(() => readWarranties()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const open = items.filter((item) => ["Open", "Needs review"].includes(item.status)).length;
  const resolved = items.filter((item) => item.status === "Resolved").length;
  const costRisk = items.reduce((sum, item) => sum + Number(item.costRisk || 0), 0);

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveWarranties(next);
      return next;
    });
  }

  function addWarranty() {
    const next = {
      id: `wa-${Date.now()}`,
      title: "New warranty callback",
      client: "Client name",
      job: "Job name",
      status: "Needs review",
      priority: "Medium",
      warrantyType: "Workmanship",
      dueDate: "TBC",
      costRisk: 0,
      reason: "Add customer issue or defect note.",
      ownerDecision: "Review job notes and photos before deciding.",
      nextAction: "Decide if this is warranty, rework, dispute or chargeable extra.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveWarranties(updated);
  }

  function resetWarranties() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveWarranties(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendWarrantyToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshWarrantiesPage">
      <div className="freshWarrantiesHero">
        <div>
          <span>Warranty / defect callbacks</span>
          <h1>Handle complaints and rework without losing money or trust</h1>
          <p>Track callbacks, workmanship issues, disputes, proof photos and owner decisions before sending staff back to site.</p>
        </div>

        <div className="freshWarrantiesStats">
          <div><b>{total}</b><small>cases</small></div>
          <div><b>{open}</b><small>open</small></div>
          <div><b>{resolved}</b><small>resolved</small></div>
          <div><b>{money(costRisk)}</b><small>cost risk</small></div>
        </div>
      </div>

      <div className="freshWarrantiesLayout">
        <aside className="freshWarrantiesList">
          <header>
            <div>
              <b>Callback desk</b>
              <span>{open} need owner decision</span>
            </div>
            <button type="button" onClick={addWarranty}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.title}</b>
              <span>{item.client} · {item.job}</span>
              <small>{item.status} · {item.priority}</small>
            </button>
          ))}

          <button type="button" className="freshWarrantiesReset" onClick={resetWarranties}>
            Reset warranties
          </button>
        </aside>

        {selected && (
          <article className="freshWarrantiesDetail">
            <div className="freshWarrantiesHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.title}</h2>
                <p>{selected.client} · {selected.job} · {selected.warrantyType}</p>
              </div>

              <div className="freshWarrantiesHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
                <button type="button" onClick={() => onNavigate?.("photos")}>Open Photos</button>
              </div>
            </div>

            <div className="freshWarrantiesCards">
              <section>
                <span>Customer issue</span>
                <b>{selected.warrantyType}</b>
                <p>{selected.reason}</p>
              </section>

              <section>
                <span>Cost risk</span>
                <b>{money(selected.costRisk)}</b>
                <p>Owner decides whether this is free rework, chargeable extra, or customer dispute.</p>
              </section>

              <section>
                <span>Next action</span>
                <b>{selected.dueDate}</b>
                <p>{selected.nextAction}</p>
              </section>
            </div>

            <div className="freshWarrantiesForm">
              <label>
                <span>Title</span>
                <input value={selected.title} onChange={(event) => updateItem(selected.id, { title: event.target.value })} />
              </label>

              <label>
                <span>Client</span>
                <input value={selected.client} onChange={(event) => updateItem(selected.id, { client: event.target.value })} />
              </label>

              <label>
                <span>Job</span>
                <input value={selected.job} onChange={(event) => updateItem(selected.id, { job: event.target.value })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Needs review</option>
                  <option>Open</option>
                  <option>Scheduled</option>
                  <option>Resolved</option>
                  <option>Declined</option>
                  <option>Chargeable extra</option>
                </select>
              </label>

              <label>
                <span>Type</span>
                <select value={selected.warrantyType} onChange={(event) => updateItem(selected.id, { warrantyType: event.target.value })}>
                  <option>Workmanship</option>
                  <option>Dispute</option>
                  <option>Proof</option>
                  <option>Materials</option>
                  <option>Damage</option>
                  <option>Customer extra</option>
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
                <span>Due</span>
                <input value={selected.dueDate} onChange={(event) => updateItem(selected.id, { dueDate: event.target.value })} />
              </label>

              <label>
                <span>Cost risk</span>
                <input type="number" value={selected.costRisk} onChange={(event) => updateItem(selected.id, { costRisk: Number(event.target.value || 0) })} />
              </label>

              <label className="wide">
                <span>Reason</span>
                <textarea value={selected.reason} onChange={(event) => updateItem(selected.id, { reason: event.target.value })} />
              </label>

              <label className="wide">
                <span>Owner decision</span>
                <textarea value={selected.ownerDecision} onChange={(event) => updateItem(selected.id, { ownerDecision: event.target.value })} />
              </label>

              <label className="wide">
                <span>Next action</span>
                <textarea value={selected.nextAction} onChange={(event) => updateItem(selected.id, { nextAction: event.target.value })} />
              </label>
            </div>

            <div className="freshWarrantiesActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Scheduled" })}>Schedule callback</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Resolved" })}>Mark resolved</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Chargeable extra" })}>Chargeable extra</button>
              <button type="button" onClick={() => onNavigate?.("quality")}>Open Quality</button>
              <button type="button" onClick={() => onNavigate?.("variations")}>Open Variations</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
