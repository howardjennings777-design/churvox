import React from "react";

const CLIENT_STORAGE_KEY = "churvox:fresh-clients:v1";
const JOB_STORAGE_KEY = "churvox:fresh-jobs:v1";
const QUOTE_STORAGE_KEY = "churvox:fresh-quotes:v1";

const seedClients = [
  {
    id: "client-1",
    name: "Aroha Property Care",
    type: "Commercial",
    status: "Active",
    email: "office@arohaproperty.co.nz",
    phone: "027 410 7788",
    address: "Naenae, Lower Hutt",
    billingEmail: "accounts@arohaproperty.co.nz",
    notes: "Regular lawn and tidy work. Good payer.",
    risk: "Clean setup",
    value: "$85 this week",
  },
  {
    id: "client-2",
    name: "Birchville Rentals",
    type: "Property manager",
    status: "Needs setup",
    email: "manager@birchvillerentals.co.nz",
    phone: "027 900 3311",
    address: "Upper Hutt",
    billingEmail: "",
    notes: "Billing email missing. Do not automate invoices until fixed.",
    risk: "Billing detail missing",
    value: "$190 overdue",
  },
  {
    id: "client-3",
    name: "Lower Hutt Medical Centre",
    type: "Commercial",
    status: "Active",
    email: "admin@lhmedical.co.nz",
    phone: "04 555 0101",
    address: "Lower Hutt",
    billingEmail: "accounts@lhmedical.co.nz",
    notes: "Garden tidy every fortnight. Needs quiet entry work.",
    risk: "Clean setup",
    value: "$140 due",
  },
];

const filters = ["All", "Active", "Needs setup", "Paused"];

function readFreshList(key) {
  try {
    if (typeof window === "undefined") return [];

    const saved = window.localStorage.getItem(key);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFreshList(key, list, type) {
  try {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent("churvox:fresh-data-updated", {
        detail: { type },
      })
    );
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function loadClients() {
  try {
    if (typeof window === "undefined") return seedClients;

    const saved = window.localStorage.getItem(CLIENT_STORAGE_KEY);
    if (!saved) return seedClients;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : seedClients;
  } catch {
    return seedClients;
  }
}

export default function FreshClients({ onNavigate }) {
  const [clients, setClients] = React.useState(loadClients);
  const [selectedId, setSelectedId] = React.useState(clients[0]?.id || "");
  const [filter, setFilter] = React.useState("All");

  const selected = clients.find((client) => client.id === selectedId) || clients[0];
  const visibleClients = filter === "All" ? clients : clients.filter((client) => client.status === filter);
  const needsSetup = clients.filter((client) => client.status === "Needs setup").length;

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clients));
      }
    } catch {
      // Fresh preview keeps working without local storage.
    }
  }, [clients]);

  function updateSelectedClient(patch) {
    if (!selected) return;

    setClients((current) =>
      current.map((client) =>
        client.id === selected.id
          ? { ...client, ...patch }
          : client
      )
    );
  }

  function resetClients() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(CLIENT_STORAGE_KEY);
      }
    } catch {
      // Ignore preview storage errors.
    }

    setClients(seedClients);
    setSelectedId(seedClients[0].id);
    setFilter("All");
  }

  function markClean() {
    updateSelectedClient({
      status: "Active",
      risk: "Clean setup",
      notes: selected.billingEmail
        ? selected.notes
        : `${selected.notes}\n\nOwner note: billing email still needs checking.`,
    });
  }

  function createJobForClient() {
    if (!selected) return;

    const job = {
      id: `job-${Date.now()}`,
      title: "New service job",
      client: selected.name,
      address: selected.address || "Confirm service address",
      status: "Ready",
      worker: "Unassigned",
      scheduled: "Not scheduled",
      price: "$0 draft",
      notes: `Created from client record. Client phone: ${selected.phone || "missing"}.`,
      risk: selected.billingEmail ? "Client setup clean" : "Billing detail missing",
    };

    writeFreshList(JOB_STORAGE_KEY, [job, ...readFreshList(JOB_STORAGE_KEY)], "job");
    onNavigate?.("jobs");
  }

  function createQuoteForClient() {
    if (!selected) return;

    const quote = {
      id: `QT-${Date.now().toString().slice(-5)}`,
      client: selected.name,
      title: "New quote",
      status: "Draft",
      amount: 0,
      age: "Created now",
      followUp: "Not sent yet",
      note: `Created from client record. Confirm scope and pricing before sending.`,
      lines: ["New quote line · $0"],
    };

    writeFreshList(QUOTE_STORAGE_KEY, [quote, ...readFreshList(QUOTE_STORAGE_KEY)], "quote");
    onNavigate?.("quotes");
  }

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Clients</span>
        <h1>Clients</h1>
        <p>Keep client records clean so jobs, quotes, invoices and Command automation do not break.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard">
          <h2>{clients.length}</h2>
          <p>Total clients</p>
        </aside>
        <aside className="freshCard">
          <h2>{needsSetup}</h2>
          <p>Need setup</p>
        </aside>
        <aside className="freshCard">
          <h2>{clients.filter((client) => client.status === "Active").length}</h2>
          <p>Active clients</p>
        </aside>
      </section>

      <section className="freshCommandFilterBar">
        {filters.map((item) => (
          <button
            type="button"
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            <span>{item}</span>
            <b>{item === "All" ? clients.length : clients.filter((client) => client.status === item).length}</b>
          </button>
        ))}
      </section>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Client list</h2>

          {visibleClients.map((client) => (
            <button
              type="button"
              className={`freshItem ${selected?.id === client.id ? "active" : ""} ${client.status === "Needs setup" ? "need" : ""}`}
              key={client.id}
              onClick={() => setSelectedId(client.id)}
            >
              <b>{client.name}</b>
              <span>{client.type} · {client.status} · {client.value}</span>
            </button>
          ))}

          {visibleClients.length === 0 && (
            <div className="freshItem">
              <b>No clients</b>
              <span>Change filter or reset preview clients.</span>
            </div>
          )}
        </aside>

        <section className="freshCard">
          <h2>{selected?.name || "Select client"}</h2>

          {selected && (
            <>
              <div className="freshMiniGrid">
                <div>
                  <span>Status</span>
                  <b>{selected.status}</b>
                </div>
                <div>
                  <span>Type</span>
                  <b>{selected.type}</b>
                </div>
                <div>
                  <span>Value</span>
                  <b>{selected.value}</b>
                </div>
                <div>
                  <span>Risk</span>
                  <b>{selected.risk}</b>
                </div>
              </div>

              <label className="freshField">
                <span>Client name</span>
                <input
                  value={selected.name}
                  onChange={(event) => updateSelectedClient({ name: event.target.value })}
                />
              </label>

              <label className="freshField">
                <span>Email</span>
                <input
                  value={selected.email}
                  onChange={(event) => updateSelectedClient({ email: event.target.value })}
                />
              </label>

              <label className="freshField">
                <span>Billing email</span>
                <input
                  value={selected.billingEmail}
                  placeholder="Required for invoice automation"
                  onChange={(event) =>
                    updateSelectedClient({
                      billingEmail: event.target.value,
                      status: event.target.value ? "Active" : "Needs setup",
                      risk: event.target.value ? "Clean setup" : "Billing detail missing",
                    })
                  }
                />
              </label>

              <label className="freshField">
                <span>Phone</span>
                <input
                  value={selected.phone}
                  onChange={(event) => updateSelectedClient({ phone: event.target.value })}
                />
              </label>

              <label className="freshField">
                <span>Service address</span>
                <input
                  value={selected.address}
                  onChange={(event) => updateSelectedClient({ address: event.target.value })}
                />
              </label>

              <label className="freshField">
                <span>Client notes</span>
                <textarea
                  value={selected.notes}
                  onChange={(event) => updateSelectedClient({ notes: event.target.value })}
                />
              </label>
            </>
          )}
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>

          <div className="freshActions">
            <button className="freshPrimary" onClick={markClean}>
              Mark setup clean
            </button>
            <button className="freshOrange" onClick={createJobForClient}>
              Create job
            </button>
            <button className="freshDark" onClick={createQuoteForClient}>
              Create quote
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>
              Send issue to Command
            </button>
            <button className="freshGhost" onClick={resetClients}>
              Reset clients
            </button>
          </div>
        </aside>
      </section>
    </section>
  );
}
