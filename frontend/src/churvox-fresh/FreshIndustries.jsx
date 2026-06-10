import React from "react";

const INDUSTRIES_KEY = "churvox:fresh-industries:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "in-1",
    industry: "Lawn care / gardening",
    status: "Ready",
    priority: "High",
    defaultServices: "Mowing, edging, hedge trimming, green waste, overgrown reset",
    jobFlow: "Quote → Schedule → Complete → Photos → Invoice",
    template: "Fortnightly maintenance, one-off tidy, overgrown reset",
    note: "Strong first industry because it matches real Churvox testing and local service work.",
    nextAction: "Use this as the first polished trade setup.",
  },
  {
    id: "in-2",
    industry: "Cleaning",
    status: "Draft",
    priority: "Medium",
    defaultServices: "Regular clean, deep clean, move-out clean, windows, extras",
    jobFlow: "Booking → Checklist → Complete → Photos → Invoice",
    template: "Weekly clean, fortnightly clean, one-off deep clean",
    note: "Good fit for recurring jobs, checklists, photos and customer reminders.",
    nextAction: "Add cleaning quote and message templates.",
  },
  {
    id: "in-3",
    industry: "Handyman / maintenance",
    status: "Needs review",
    priority: "Medium",
    defaultServices: "Repairs, small installs, painting touch-ups, odd jobs, callout",
    jobFlow: "Request → Quote → Job notes → Materials → Invoice",
    template: "Hourly job, fixed repair, fixed + materials",
    note: "Needs simple materials and extras flow.",
    nextAction: "Check materials and extras wording before showing live.",
  },
];

function readIndustries() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(INDUSTRIES_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveIndustries(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INDUSTRIES_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "industries" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendIndustryToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `industry-${item.id}-${Date.now()}`,
      group: "Industries",
      title: "Industry setup needs owner review",
      info: `${item.industry} · ${item.status} · ${item.priority}`,
      urgency: item.priority,
      found: `${item.industry} setup is marked ${item.status}.`,
      prepared: `Churvox prepared industry action: ${item.nextAction}`,
      why: item.note,
      owner: "Approve template, open Services, open Templates, or keep as draft.",
      area: "Industry Templates",
      page: "industries",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "industry-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshIndustries({ onNavigate }) {
  const [items, setItems] = React.useState(readIndustries);
  const [selectedId, setSelectedId] = React.useState(() => readIndustries()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const ready = items.filter((item) => item.status === "Ready").length;
  const review = items.filter((item) => item.status === "Needs review").length;
  const high = items.filter((item) => item.priority === "High").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveIndustries(next);
      return next;
    });
  }

  function addIndustry() {
    const next = {
      id: `in-${Date.now()}`,
      industry: "New trade",
      status: "Draft",
      priority: "Medium",
      defaultServices: "Add common services.",
      jobFlow: "Lead → Quote → Job → Invoice",
      template: "Add default quote/job/message templates.",
      note: "Industry templates help new businesses start faster.",
      nextAction: "Review and decide if this trade belongs in launch.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveIndustries(updated);
  }

  function resetIndustries() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveIndustries(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendIndustryToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshIndustriesPage">
      <div className="freshIndustriesHero">
        <div>
          <span>Industry templates</span>
          <h1>Set Churvox up for each trade without rebuilding the app</h1>
          <p>Prepare default services, job flows, quote templates and message wording for lawn care, cleaning, handyman, painting, plumbing and more.</p>
        </div>

        <div className="freshIndustriesStats">
          <div><b>{total}</b><small>trades</small></div>
          <div><b>{ready}</b><small>ready</small></div>
          <div><b>{review}</b><small>review</small></div>
          <div><b>{high}</b><small>high priority</small></div>
        </div>
      </div>

      <div className="freshIndustriesLayout">
        <aside className="freshIndustriesList">
          <header>
            <div>
              <b>Trade setup</b>
              <span>{ready} ready for launch</span>
            </div>
            <button type="button" onClick={addIndustry}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.industry}</b>
              <span>{item.status} · {item.priority}</span>
              <small>{item.template}</small>
            </button>
          ))}

          <button type="button" className="freshIndustriesReset" onClick={resetIndustries}>
            Reset industries
          </button>
        </aside>

        {selected && (
          <article className="freshIndustriesDetail">
            <div className="freshIndustriesHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.industry}</h2>
                <p>{selected.priority} priority · template setup</p>
              </div>

              <div className="freshIndustriesHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("services")}>Open Services</button>
                <button type="button" onClick={() => onNavigate?.("templates")}>Open Templates</button>
              </div>
            </div>

            <div className="freshIndustriesCards">
              <section>
                <span>Default services</span>
                <b>{selected.industry}</b>
                <p>{selected.defaultServices}</p>
              </section>

              <section>
                <span>Job flow</span>
                <b>{selected.status}</b>
                <p>{selected.jobFlow}</p>
              </section>

              <section>
                <span>Templates</span>
                <b>{selected.priority}</b>
                <p>{selected.template}</p>
              </section>
            </div>

            <div className="freshIndustriesForm">
              <label>
                <span>Industry</span>
                <input value={selected.industry} onChange={(event) => updateItem(selected.id, { industry: event.target.value })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Ready</option>
                  <option>Draft</option>
                  <option>Needs review</option>
                  <option>Blocked</option>
                  <option>Approved</option>
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
                <span>Default services</span>
                <textarea value={selected.defaultServices} onChange={(event) => updateItem(selected.id, { defaultServices: event.target.value })} />
              </label>

              <label className="wide">
                <span>Job flow</span>
                <textarea value={selected.jobFlow} onChange={(event) => updateItem(selected.id, { jobFlow: event.target.value })} />
              </label>

              <label className="wide">
                <span>Template</span>
                <textarea value={selected.template} onChange={(event) => updateItem(selected.id, { template: event.target.value })} />
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

            <div className="freshIndustriesActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Approved" })}>Approve</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs review" })}>Needs review</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Draft" })}>Draft</button>
              <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
              <button type="button" onClick={() => onNavigate?.("quotes")}>Open Quotes</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
