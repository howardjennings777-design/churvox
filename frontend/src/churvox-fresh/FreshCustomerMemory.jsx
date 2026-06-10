import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const customers = [
  {
    id: "mem-1",
    name: "Belmont Customer",
    type: "Regular lawn client",
    value: "$65 / fortnight",
    memory: [
      "Prefers Fridays",
      "Likes tidy edging",
      "Usually wants photos after completion",
      "Green waste left beside garage",
    ],
    warning: "Once complained about missed edging.",
    opportunity: "Offer recurring fortnightly package and review request after next job.",
    nextAction: "Prepare customer message before next visit.",
    page: "clients",
  },
  {
    id: "mem-2",
    name: "Upper Hutt Lead",
    type: "Quote lead",
    value: "$190 quote",
    memory: [
      "Price sensitive",
      "Interested in staged work",
      "Asked about green waste",
      "Needs fast follow-up",
    ],
    warning: "Quote may be lost if no follow-up today.",
    opportunity: "Offer staged option: lawn reset first, hedge later.",
    nextAction: "Send follow-up to Command.",
    page: "quotes",
  },
  {
    id: "mem-3",
    name: "Naenae Property",
    type: "Handyman customer",
    value: "$120 job",
    memory: [
      "Wants approval before extras",
      "Prefers clear arrival time",
      "Likes repair photos",
      "Pays on time",
    ],
    warning: "Materials should be explained before invoice.",
    opportunity: "Good customer for small maintenance package.",
    nextAction: "Prepare worker brief and invoice note.",
    page: "jobs",
  },
];

function sendMemoryToCommand(customer, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `customer-memory-${customer.id}-${Date.now()}`,
      group: "AI Customer Memory",
      title: `${customer.name} memory ready`,
      info: `${customer.type} · ${customer.value}`,
      urgency: customer.warning.includes("lost") ? "High" : "Medium",
      found: customer.warning,
      prepared: customer.opportunity,
      why: `Customer memory: ${customer.memory.join(", ")}.`,
      owner: "Approve message, open client, create follow-up, or ignore.",
      area: "Customer Memory",
      page: "customermemory",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 60)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "customer-memory" } }));
  } catch {
    // Fresh preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshCustomerMemory({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(customers[0].id);
  const selected = customers.find((customer) => customer.id === selectedId) || customers[0];

  return (
    <section className="freshMemoryPage">
      <div className="freshMemoryHero">
        <div>
          <span>AI Customer Memory</span>
          <h1>Churvox remembers what the owner would forget</h1>
          <p>When opening a client, quote, job or invoice, AI should show preferences, warnings, payment habits and the next best action.</p>
        </div>

        <div className="freshMemoryStats">
          <div><b>{customers.length}</b><small>memories</small></div>
          <div><b>Prefs</b><small>saved</small></div>
          <div><b>Risk</b><small>warnings</small></div>
          <div><b>Next</b><small>action</small></div>
        </div>
      </div>

      <div className="freshMemoryLayout">
        <aside className="freshMemoryList">
          <header>
            <b>Customer memory cards</b>
            <span>Shown before decisions</span>
          </header>

          {customers.map((customer) => (
            <button
              type="button"
              key={customer.id}
              className={selected.id === customer.id ? "active" : ""}
              onClick={() => setSelectedId(customer.id)}
            >
              <b>{customer.name}</b>
              <span>{customer.type}</span>
              <small>{customer.value}</small>
            </button>
          ))}
        </aside>

        <article className="freshMemoryDetail">
          <header>
            <span>{selected.type}</span>
            <h2>{selected.name}</h2>
            <p>{selected.value}</p>
          </header>

          <div className="freshMemoryChips">
            {selected.memory.map((item) => (
              <small key={item}>{item}</small>
            ))}
          </div>

          <div className="freshMemoryCards">
            <section>
              <b>AI warning</b>
              <p>{selected.warning}</p>
            </section>
            <section>
              <b>AI opportunity</b>
              <p>{selected.opportunity}</p>
            </section>
            <section>
              <b>Next action</b>
              <p>{selected.nextAction}</p>
            </section>
          </div>

          <div className="freshMemoryButtons">
            <button type="button" onClick={() => sendMemoryToCommand(selected, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.("clients")}>Open Clients</button>
            <button type="button" onClick={() => onNavigate?.("followupwriter")}>Open AI Follow-up</button>
            <button type="button" onClick={() => onNavigate?.(selected.page)}>Open related page</button>
          </div>
        </article>
      </div>
    </section>
  );
}
