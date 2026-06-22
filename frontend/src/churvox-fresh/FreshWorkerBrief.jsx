import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const briefs = [
  {
    id: "brief-1",
    worker: "Tama Worker",
    job: "Belmont lawn reset",
    client: "Belmont Customer",
    time: "Today · 9:45 AM",
    aiFound: "Job notes mention front/back lawn, hedge trim, photos and green waste.",
    brief: "Front and back lawn. Trim hedge along driveway. Take before and after photos. Leave green waste beside garage unless customer asks for removal.",
    safety: "Check gate latch and watch for dog in backyard.",
    customerMemory: "Customer prefers tidy edging and photos after completion.",
    page: "workercommand",
  },
  {
    id: "brief-2",
    worker: "Mere Crew",
    job: "Naenae handyman repair",
    client: "Naenae Property",
    time: "Today · 2:00 PM",
    aiFound: "Job note says bring screws, sealant and confirm repair photos.",
    brief: "Repair loose panel near side path. Bring screws and sealant. Confirm with customer before adding extra work.",
    safety: "Use PPE and check power tools before starting.",
    customerMemory: "Customer wants clear update before extra charges.",
    page: "jobs",
  },
  {
    id: "brief-3",
    worker: "Subcontractor",
    job: "Upper Hutt quote visit",
    client: "Upper Hutt Lead",
    time: "Tomorrow · 10:30 AM",
    aiFound: "Lead asked about overgrown lawn, hedge and green waste.",
    brief: "Measure lawn, check hedge height, confirm green waste volume and take photos for quote.",
    safety: "Watch uneven ground and overgrown edges.",
    customerMemory: "Lead is price sensitive. Offer staged options.",
    page: "quotes",
  },
];

function sendBriefToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `worker-brief-${item.id}-${Date.now()}`,
      group: "AI Worker Brief",
      title: "Worker brief ready",
      info: `${item.worker} · ${item.job}`,
      urgency: "Medium",
      found: item.aiFound,
      prepared: item.brief,
      why: "Clear worker instructions reduce mistakes, call-backs and owner typing.",
      owner: "Approve brief, edit, send to worker, or open job.",
      area: "AI Worker Brief",
      page: "workerbrief",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 50)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "worker-brief" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshWorkerBrief({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(briefs[0].id);
  const selected = briefs.find((item) => item.id === selectedId) || briefs[0];
  const [briefText, setBriefText] = React.useState(selected.brief);

  React.useEffect(() => {
    setBriefText(selected.brief);
  }, [selected.id]);

  return (
    <section className="freshWorkerBriefPage">
      <div className="freshWorkerBriefHero">
        <div>
          <span>AI Worker Brief</span>
          <h1>Workers get clear instructions without owner typing</h1>
          <p>Churvox reads the job, customer notes, photos and risks, then prepares a simple worker brief for approval.</p>
        </div>

        <div className="freshWorkerBriefStats">
          <div><b>{briefs.length}</b><small>briefs</small></div>
          <div><b>Photos</b><small>included</small></div>
          <div><b>Safety</b><small>checked</small></div>
          <div><b>Edit</b><small>owner control</small></div>
        </div>
      </div>

      <div className="freshWorkerBriefLayout">
        <aside className="freshWorkerBriefList">
          <header>
            <b>Prepared briefs</b>
            <span>Ready for owner approval</span>
          </header>

          {briefs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={selected.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.job}</b>
              <span>{item.worker}</span>
              <small>{item.client} · {item.time}</small>
            </button>
          ))}
        </aside>

        <article className="freshWorkerBriefDetail">
          <header>
            <span>{selected.worker}</span>
            <h2>{selected.job}</h2>
            <p>{selected.client} · {selected.time}</p>
          </header>

          <div className="freshWorkerBriefCards">
            <section>
              <b>AI found</b>
              <p>{selected.aiFound}</p>
            </section>
            <section>
              <b>Safety note</b>
              <p>{selected.safety}</p>
            </section>
            <section>
              <b>Customer memory</b>
              <p>{selected.customerMemory}</p>
            </section>
          </div>

          <label className="freshWorkerBriefEditor">
            <span>Editable worker brief</span>
            <textarea value={briefText} onChange={(event) => setBriefText(event.target.value)} />
          </label>

          <div className="freshWorkerBriefButtons">
            <button type="button" onClick={() => sendBriefToCommand({ ...selected, brief: briefText }, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.(selected.page || "workercommand")}>Open Worker View</button>
            <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
            <button type="button" onClick={() => onNavigate?.("dispatch")}>Open Dispatch</button>
          </div>
        </article>
      </div>
    </section>
  );
}
