import React from "react";
import "./churvox-v2.css";
import "../styles/churvox-v2-route-force.css";

const CLIENTS = [
  {
    id: "c-101",
    name: "Aroha Property Care",
    phone: "021 555 0184",
    email: "office@arohaproperty.co.nz",
    preferred_contact: "Email",
    service_address: "42 Rata Street, Naenae",
    billing_email: "accounts@arohaproperty.co.nz",
    site_notes: "Gate code 1842. Dog usually inside after 9am. Park on the street and send before/after photos.",
    notes: "Fortnightly lawn and hedge customer. Prefers invoices sent Friday afternoon.",
    status: "Ready",
    jobs: ["Fortnightly lawn service booked", "Hedge trim due next month"],
    quotes: ["Accepted lawn reset quote"],
    invoices: ["Last invoice paid", "Next draft after completion"],
  },
  {
    id: "c-102",
    name: "Birchville Rentals",
    phone: "",
    email: "manager@birchvillerentals.co.nz",
    preferred_contact: "Email",
    service_address: "17 River Road, Birchville",
    billing_email: "",
    site_notes: "Tenant access changes often. Confirm before dispatch.",
    notes: "Needs billing email before invoice automation can run.",
    status: "Needs billing",
    jobs: ["Driveway clean requested", "Lawn service awaiting confirmation"],
    quotes: ["Draft driveway quote"],
    invoices: ["Billing email missing"],
  },
  {
    id: "c-103",
    name: "Lower Hutt Medical Centre",
    phone: "04 555 0199",
    email: "admin@lhmedical.example",
    preferred_contact: "Phone",
    service_address: "88 Queens Drive, Lower Hutt",
    billing_email: "billing@lhmedical.example",
    site_notes: "Work outside patient hours only. Use rear entrance for equipment.",
    notes: "Commercial account. Requires clear job notes before invoice.",
    status: "Ready",
    jobs: ["Monthly garden tidy", "Irrigation check next visit"],
    quotes: ["No open quotes"],
    invoices: ["Commercial terms: 14 days"],
  },
  {
    id: "c-104",
    name: "New client lead",
    phone: "022 555 0141",
    email: "",
    preferred_contact: "Phone",
    service_address: "",
    billing_email: "",
    site_notes: "Asked for overgrown section quote.",
    notes: "Needs address and email before quote can be sent.",
    status: "Needs details",
    jobs: ["No jobs yet"],
    quotes: ["Quote cannot be sent until contact details are complete"],
    invoices: ["No invoices"],
  },
];

function needsAttention(client) {
  return !client.email || !client.billing_email || !client.service_address || String(client.status || "").toLowerCase().includes("need");
}

function initials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "C";
}

function fieldLabel(key) {
  return {
    name: "Client name",
    phone: "Phone",
    email: "Email",
    preferred_contact: "Preferred contact",
    service_address: "Service address",
    billing_email: "Billing email",
    site_notes: "Site notes",
    notes: "Internal notes",
  }[key] || key;
}

function Field({ type = "input", label, value, onChange, wide }) {
  return (
    <label className={wide ? "v2Field wide" : "v2Field"}>
      <span>{label}</span>
      {type === "textarea" ? (
        <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} />
      ) : type === "select" ? (
        <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
          <option>Phone</option>
          <option>Email</option>
          <option>SMS later</option>
          <option>No preference</option>
        </select>
      ) : (
        <input value={value || ""} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function HistoryCard({ title, items }) {
  return (
    <article className="v2HistoryCard">
      <h3>{title}</h3>
      <ul>
        {(items || []).map((item) => <li key={item}>{item}</li>)}
      </ul>
    </article>
  );
}

export default function ClientsV2Page() {
  const [clients, setClients] = React.useState(CLIENTS);
  const [selectedId, setSelectedId] = React.useState(CLIENTS[0].id);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [tab, setTab] = React.useState("details");

  const selected = clients.find((client) => client.id === selectedId) || clients[0];
  const filtered = clients.filter((client) => {
    if (filter === "needs" && !needsAttention(client)) return false;
    if (filter === "ready" && needsAttention(client)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${client.name} ${client.phone} ${client.email} ${client.service_address}`.toLowerCase().includes(q);
  });

  const patchSelected = (key, value) => {
    setClients((old) => old.map((client) => client.id === selected.id ? { ...client, [key]: value } : client));
  };

  const newClient = () => {
    const next = {
      id: `draft-${Date.now()}`,
      name: "New client",
      phone: "",
      email: "",
      preferred_contact: "Phone",
      service_address: "",
      billing_email: "",
      site_notes: "",
      notes: "",
      status: "Needs details",
      jobs: ["No jobs yet"],
      quotes: ["No quotes yet"],
      invoices: ["No invoices yet"],
    };
    setClients((old) => [next, ...old]);
    setSelectedId(next.id);
    setTab("details");
  };

  const readyCount = clients.filter((client) => !needsAttention(client)).length;
  const needsCount = clients.length - readyCount;

  return (
    <main className="v2Root">
      <section className="v2Shell">
        <header className="v2Topbar">
          <section className="v2Hero">
            <span className="v2Kicker">Churvox V2 preview · Clients</span>
            <h1>Client records</h1>
            <p>One clean place for customer contact, service address, billing details, site notes, job history and the next business action.</p>
          </section>
          <aside className="v2Stats">
            <div className="v2Stat"><b>{clients.length}</b><span>Total clients</span></div>
            <div className="v2Stat"><b>{needsCount}</b><span>Need details</span></div>
            <div className="v2Stat"><b>{readyCount}</b><span>Ready for work</span></div>
          </aside>
        </header>

        <section className="v2Workspace">
          <aside className="v2Pane">
            <div className="v2PaneHeader">
              <div>
                <span className="v2Pill">Clients list</span>
                <h2>Find client</h2>
                <p>Search, check missing details, then open the record.</p>
              </div>
            </div>
            <div className="v2Search">
              <input placeholder="Search clients..." value={query} onChange={(event) => setQuery(event.target.value)} />
              <div className="v2FilterRow">
                <button className={filter === "all" ? "active" : ""} type="button" onClick={() => setFilter("all")}>All</button>
                <button className={filter === "needs" ? "active" : ""} type="button" onClick={() => setFilter("needs")}>Needs</button>
                <button className={filter === "ready" ? "active" : ""} type="button" onClick={() => setFilter("ready")}>Ready</button>
              </div>
            </div>
            <div className="v2List">
              {filtered.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  className={`v2ListItem ${selected.id === client.id ? "active" : ""} ${needsAttention(client) ? "needs" : ""}`}
                  onClick={() => setSelectedId(client.id)}
                >
                  <b>{client.name}</b>
                  <span>{client.email || client.phone || "Missing contact"}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="v2Pane v2Detail">
            <article className="v2IdentityCard">
              <div className="v2Avatar">{initials(selected.name)}</div>
              <div>
                <h2>{selected.name}</h2>
                <p>{selected.service_address || "Service address still needed"}</p>
              </div>
              <span className="v2StatusBadge">{needsAttention(selected) ? "Needs details" : "Ready"}</span>
            </article>

            <nav className="v2Tabs" aria-label="Client sections">
              <button className={tab === "details" ? "active" : ""} type="button" onClick={() => setTab("details")}>Details</button>
              <button className={tab === "history" ? "active" : ""} type="button" onClick={() => setTab("history")}>History</button>
              <button className={tab === "notes" ? "active" : ""} type="button" onClick={() => setTab("notes")}>Notes</button>
            </nav>

            {tab === "details" ? (
              <div className="v2FormGrid">
                <Field label={fieldLabel("name")} value={selected.name} onChange={(value) => patchSelected("name", value)} />
                <Field label={fieldLabel("phone")} value={selected.phone} onChange={(value) => patchSelected("phone", value)} />
                <Field label={fieldLabel("email")} value={selected.email} onChange={(value) => patchSelected("email", value)} />
                <Field type="select" label={fieldLabel("preferred_contact")} value={selected.preferred_contact} onChange={(value) => patchSelected("preferred_contact", value)} />
                <Field label={fieldLabel("service_address")} value={selected.service_address} onChange={(value) => patchSelected("service_address", value)} />
                <Field label={fieldLabel("billing_email")} value={selected.billing_email} onChange={(value) => patchSelected("billing_email", value)} />
              </div>
            ) : null}

            {tab === "history" ? (
              <div className="v2HistoryGrid">
                <HistoryCard title="Jobs" items={selected.jobs} />
                <HistoryCard title="Quotes" items={selected.quotes} />
                <HistoryCard title="Invoices" items={selected.invoices} />
              </div>
            ) : null}

            {tab === "notes" ? (
              <div className="v2FormGrid">
                <Field wide type="textarea" label={fieldLabel("site_notes")} value={selected.site_notes} onChange={(value) => patchSelected("site_notes", value)} />
                <Field wide type="textarea" label={fieldLabel("notes")} value={selected.notes} onChange={(value) => patchSelected("notes", value)} />
              </div>
            ) : null}
          </section>

          <aside className="v2ActionRail">
            <span className="v2Pill">Owner actions</span>
            <h2>Next move</h2>
            <p>Clients page should do client work only. Command stays for approval slips.</p>
            <div className="v2ActionStack">
              <button type="button" className="v2PrimaryBtn">Save client</button>
              <button type="button" className="v2SecondaryBtn">Create job</button>
              <button type="button" className="v2SecondaryBtn">Create quote</button>
              <button type="button" className="v2DarkBtn">Send issue to Command</button>
              <button type="button" className="v2GhostBtn" onClick={newClient}>New client</button>
            </div>
            <article className="v2ActionNote">
              <b>{needsAttention(selected) ? "Before automation" : "Ready for work"}</b>
              <p>{needsAttention(selected) ? "Complete contact, service and billing details before invoices or reminders are trusted." : "This client can move into jobs, quotes and invoicing."}</p>
            </article>
            <div className="v2MiniQueue">
              {clients.filter(needsAttention).slice(0, 5).map((client) => (
                <button type="button" key={`mini-${client.id}`} className="v2MiniCard" onClick={() => setSelectedId(client.id)}>
                  <b>{client.name}</b>
                  <span>Missing: {!client.email ? "email " : ""}{!client.billing_email ? "billing " : ""}{!client.service_address ? "address" : ""}</span>
                </button>
              ))}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
