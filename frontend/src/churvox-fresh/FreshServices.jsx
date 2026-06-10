import React from "react";

const SERVICES_KEY = "churvox:fresh-services:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "service-1",
    name: "Lawn service",
    industry: "Lawn care",
    priceType: "Fixed",
    defaultPrice: 65,
    duration: "1.5 hrs",
    photos: "Before and after",
    invoiceLine: "Lawn mowing, edging and tidy",
    checklist: "Mow lawn\nLine trim edges\nBlow paths\nTake after photo",
    status: "Active",
    note: "Best for regular fortnightly customers.",
  },
  {
    id: "service-2",
    name: "Garden tidy",
    industry: "Gardening",
    priceType: "Hourly + extras",
    defaultPrice: 85,
    duration: "3 hrs",
    photos: "Before and after",
    invoiceLine: "Garden tidy and green waste",
    checklist: "Confirm scope\nTrim/weed area\nCollect green waste\nTake proof photos",
    status: "Active",
    note: "Use extras for green waste or extra time.",
  },
  {
    id: "service-3",
    name: "Driveway clean",
    industry: "Exterior cleaning",
    priceType: "Fixed",
    defaultPrice: 140,
    duration: "2.5 hrs",
    photos: "Before and after",
    invoiceLine: "Driveway clean",
    checklist: "Confirm access\nTake before photo\nClean surface\nTake after photo",
    status: "Draft",
    note: "Needs access confirmed before dispatch.",
  },
];

function readServices() {
  try {
    if (typeof window === "undefined") return defaults;

    const saved = window.localStorage.getItem(SERVICES_KEY);
    if (!saved) return defaults;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveServices(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SERVICES_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "services" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendServiceToCommand(service) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `service-${service.id}-${Date.now()}`,
      group: "Services",
      title: "Service template needs review",
      info: `${service.name} · ${service.priceType} · $${service.defaultPrice}`,
      urgency: service.status === "Draft" ? "Setup review" : "Template check",
      found: `${service.name} is marked ${service.status}.`,
      prepared: "Churvox prepared a service template review slip.",
      why: "Templates control pricing, job checklists, photos and invoice lines. Bad templates create bad admin.",
      owner: "Approve, edit pricing, update checklist, or keep as draft.",
      area: "Services",
      page: "services",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "service-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshServices({ onNavigate }) {
  const [services, setServices] = React.useState(readServices);
  const [selectedId, setSelectedId] = React.useState(() => readServices()[0]?.id || "");
  const selected = services.find((item) => item.id === selectedId) || services[0];

  const active = services.filter((item) => item.status === "Active").length;
  const draft = services.filter((item) => item.status === "Draft").length;
  const average = services.length
    ? Math.round(services.reduce((sum, item) => sum + Number(item.defaultPrice || 0), 0) / services.length)
    : 0;

  function updateService(id, patch) {
    setServices((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveServices(next);
      return next;
    });
  }

  function addService() {
    const next = {
      id: `service-${Date.now()}`,
      name: "New service",
      industry: "General trade",
      priceType: "Fixed",
      defaultPrice: 0,
      duration: "1 hr",
      photos: "Optional",
      invoiceLine: "New service line",
      checklist: "Confirm scope\nComplete work\nTake proof photo",
      status: "Draft",
      note: "Set this up before using it on live jobs.",
    };

    const updated = [next, ...services];
    setServices(updated);
    setSelectedId(next.id);
    saveServices(updated);
  }

  function resetServices() {
    setServices(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveServices(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendServiceToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshServicesPage">
      <div className="freshServicesHero">
        <div>
          <span>Services / templates</span>
          <h1>Build jobs faster from templates</h1>
          <p>Set default pricing, checklists, proof photos and invoice lines so jobs are consistent.</p>
        </div>

        <div className="freshServicesStats">
          <div><b>{services.length}</b><small>templates</small></div>
          <div><b>{active}</b><small>active</small></div>
          <div><b>{draft}</b><small>draft</small></div>
          <div><b>${average}</b><small>avg price</small></div>
        </div>
      </div>

      <div className="freshServicesLayout">
        <aside className="freshServicesList">
          <header>
            <div>
              <b>Template list</b>
              <span>Pricing + checklist</span>
            </div>
            <button type="button" onClick={addService}>Add</button>
          </header>

          {services.map((service) => (
            <button
              type="button"
              key={service.id}
              className={selected?.id === service.id ? "active" : ""}
              onClick={() => setSelectedId(service.id)}
            >
              <b>{service.name}</b>
              <span>{service.industry}</span>
              <small>${service.defaultPrice} · {service.status}</small>
            </button>
          ))}

          <button type="button" className="freshServicesReset" onClick={resetServices}>
            Reset templates
          </button>
        </aside>

        {selected && (
          <article className="freshServicesDetail">
            <div className="freshServicesHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.name}</h2>
                <p>{selected.industry} · {selected.priceType}</p>
              </div>

              <div className="freshServicesHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("jobs")}>Create job</button>
              </div>
            </div>

            <div className="freshServicesCards">
              <section>
                <span>Default price</span>
                <b>${selected.defaultPrice}</b>
                <p>{selected.priceType} · expected duration {selected.duration}</p>
              </section>

              <section>
                <span>Invoice line</span>
                <b>{selected.invoiceLine}</b>
                <p>This becomes the normal invoice description.</p>
              </section>

              <section>
                <span>Proof</span>
                <b>{selected.photos}</b>
                <p>Photo rule for worker proof and customer confidence.</p>
              </section>
            </div>

            <div className="freshServicesForm">
              <label>
                <span>Name</span>
                <input value={selected.name} onChange={(event) => updateService(selected.id, { name: event.target.value })} />
              </label>

              <label>
                <span>Industry</span>
                <input value={selected.industry} onChange={(event) => updateService(selected.id, { industry: event.target.value })} />
              </label>

              <label>
                <span>Price type</span>
                <select value={selected.priceType} onChange={(event) => updateService(selected.id, { priceType: event.target.value })}>
                  <option>Fixed</option>
                  <option>Hourly</option>
                  <option>Fixed + extras</option>
                  <option>Hourly + extras</option>
                </select>
              </label>

              <label>
                <span>Default price</span>
                <input type="number" value={selected.defaultPrice} onChange={(event) => updateService(selected.id, { defaultPrice: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Duration</span>
                <input value={selected.duration} onChange={(event) => updateService(selected.id, { duration: event.target.value })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateService(selected.id, { status: event.target.value })}>
                  <option>Active</option>
                  <option>Draft</option>
                  <option>Paused</option>
                  <option>Archived</option>
                </select>
              </label>

              <label className="wide">
                <span>Invoice line</span>
                <input value={selected.invoiceLine} onChange={(event) => updateService(selected.id, { invoiceLine: event.target.value })} />
              </label>

              <label className="wide">
                <span>Checklist</span>
                <textarea value={selected.checklist} onChange={(event) => updateService(selected.id, { checklist: event.target.value })} />
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateService(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshServicesActions">
              <button type="button" onClick={() => updateService(selected.id, { status: "Active" })}>Activate</button>
              <button type="button" onClick={() => updateService(selected.id, { status: "Draft" })}>Draft</button>
              <button type="button" onClick={() => onNavigate?.("quotes")}>Open Quotes</button>
              <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
              <button type="button" onClick={() => onNavigate?.("settings")}>Open Settings</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
