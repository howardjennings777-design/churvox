import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const materials = [
  {
    id: "mat-1",
    job: "Naenae handyman repair",
    material: "Screws and sealant",
    status: "Needed today",
    urgency: "High",
    found: "Job note says bring screws and sealant.",
    prepared: "Add materials to worker brief and invoice check.",
    why: "Materials can be forgotten on site or missed on invoice.",
    page: "workerbrief",
  },
  {
    id: "mat-2",
    job: "Upper Hutt garden reset",
    material: "Green waste bags / trailer space",
    status: "Likely needed",
    urgency: "Medium",
    found: "Quote photos show overgrown lawn, hedge and waste volume.",
    prepared: "Warn owner to confirm green waste handling before job.",
    why: "Green waste can turn a profitable job into a weak one.",
    page: "quoteai",
  },
  {
    id: "mat-3",
    job: "Belmont hedge tidy",
    material: "Hedge trimmer / fuel / PPE",
    status: "Check before dispatch",
    urgency: "Medium",
    found: "Worker brief includes hedge trim near driveway.",
    prepared: "Add equipment reminder and safety note.",
    why: "The right gear prevents delays and callbacks.",
    page: "dispatch",
  },
  {
    id: "mat-4",
    job: "Stock level",
    material: "Sealant",
    status: "Running low",
    urgency: "High",
    found: "Sealant used on two jobs and stock is low.",
    prepared: "Restock reminder and materials invoice check.",
    why: "Low stock causes missed jobs and forgotten materials charges.",
    page: "inventory",
  },
];

function sendMaterialToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `materials-reminder-${item.id}-${Date.now()}`,
      group: "AI Materials Reminder",
      title: `${item.material} reminder`,
      info: `${item.job} · ${item.status}`,
      urgency: item.urgency,
      found: item.found,
      prepared: item.prepared,
      why: item.why,
      owner: "Approve reminder, add to worker brief, add to invoice, or ignore.",
      area: "Materials Reminder",
      page: "materialsai",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 140)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "materials-ai" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshMaterialsReminder({ onNavigate }) {
  const [done, setDone] = React.useState({});
  const high = materials.filter((item) => item.urgency === "High").length;
  const open = materials.filter((item) => !done[item.id]).length;

  return (
    <section className="freshOwnerAiPage">
      <div className="freshOwnerAiHero">
        <div>
          <span>AI Materials / Stock Reminder</span>
          <h1>Churvox remembers the gear, stock and materials charges</h1>
          <p>It checks job notes, quote photos, worker briefs and stock warnings so the owner does not forget gear or miss billable materials.</p>
        </div>

        <div className="freshOwnerAiStats">
          <div><b>{materials.length}</b><small>reminders</small></div>
          <div><b>{high}</b><small>high priority</small></div>
          <div><b>{open}</b><small>open</small></div>
          <div><b>Stock</b><small>watched</small></div>
        </div>
      </div>

      <div className="freshOwnerAiGrid">
        {materials.map((item) => (
          <article key={item.id} className={done[item.id] ? "freshOwnerAiCard done" : "freshOwnerAiCard"}>
            <header>
              <span>{item.urgency}</span>
              <h2>{item.material}</h2>
              <small>{item.job} · {item.status}</small>
            </header>

            <p><strong>AI found:</strong> {item.found}</p>
            <p><strong>AI prepared:</strong> {item.prepared}</p>
            <p><strong>Why:</strong> {item.why}</p>

            <div className="freshOwnerAiButtons">
              <button type="button" onClick={() => sendMaterialToCommand(item, onNavigate)}>Send to Command</button>
              <button type="button" onClick={() => onNavigate?.(item.page)}>Open area</button>
              <button type="button" onClick={() => setDone({ ...done, [item.id]: true })}>
                {done[item.id] ? "Handled" : "Mark handled"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
