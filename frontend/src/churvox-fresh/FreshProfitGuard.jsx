import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const jobs = [
  {
    id: "pg-1",
    title: "Upper Hutt garden reset",
    client: "Upper Hutt Lead",
    quoted: 190,
    labour: 132,
    travel: 28,
    materials: 12,
    risk: "High",
    found: "Quote may be too cheap after labour, travel and green waste.",
    prepared: "Suggest $229 or staged option: lawn reset first, hedge later.",
    page: "quoteai",
  },
  {
    id: "pg-2",
    title: "Belmont fortnightly mow",
    client: "Belmont Customer",
    quoted: 65,
    labour: 34,
    travel: 8,
    materials: 0,
    risk: "Low",
    found: "Regular job margin looks healthy.",
    prepared: "Keep pricing and offer recurring confirmation.",
    page: "recurring",
  },
  {
    id: "pg-3",
    title: "Naenae handyman repair",
    client: "Naenae Property",
    quoted: 120,
    labour: 84,
    travel: 14,
    materials: 18,
    risk: "Medium",
    found: "Materials almost wipe out profit unless added to invoice.",
    prepared: "Add materials line before invoice goes out.",
    page: "invoicecheck",
  },
];

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ")}`;
}

function margin(item) {
  const cost = item.labour + item.travel + item.materials;
  return Math.round(((item.quoted - cost) / item.quoted) * 100);
}

function sendProfitToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `profit-guard-${item.id}-${Date.now()}`,
      group: "AI Profit Guard",
      title: "Profit check needs review",
      info: `${item.client} · ${money(item.quoted)} · ${margin(item)}% margin`,
      urgency: item.risk,
      found: item.found,
      prepared: item.prepared,
      why: "Busy work is not always profitable work. Churvox should warn before the owner sends a weak price.",
      owner: "Approve suggested price, edit quote, add extra, or ignore.",
      area: "Profit Guard",
      page: "profitguard",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 100)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "profit-guard" } }));
  } catch {
    // Fresh preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshProfitGuard({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(jobs[0].id);
  const selected = jobs.find((item) => item.id === selectedId) || jobs[0];
  const cost = selected.labour + selected.travel + selected.materials;
  const profit = selected.quoted - cost;
  const high = jobs.filter((item) => item.risk === "High").length;

  return (
    <section className="freshProfitGuardPage">
      <div className="freshProfitGuardHero">
        <div>
          <span>AI Profit Guard</span>
          <h1>Stop users sending jobs that make no money</h1>
          <p>Churvox checks quote price, labour, travel, materials and risk before the owner approves the work.</p>
        </div>

        <div className="freshProfitGuardStats">
          <div><b>{jobs.length}</b><small>checked</small></div>
          <div><b>{high}</b><small>high risk</small></div>
          <div><b>{margin(selected)}%</b><small>margin</small></div>
          <div><b>{money(profit)}</b><small>profit</small></div>
        </div>
      </div>

      <div className="freshProfitGuardLayout">
        <aside className="freshProfitGuardList">
          <header>
            <b>Profit checks</b>
            <span>{high} high risk</span>
          </header>

          {jobs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={selected.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.title}</b>
              <span>{item.client}</span>
              <small>{money(item.quoted)} · {margin(item)}% · {item.risk}</small>
            </button>
          ))}
        </aside>

        <article className="freshProfitGuardDetail">
          <header>
            <span>{selected.risk} risk</span>
            <h2>{selected.title}</h2>
            <p>{selected.client} · quoted {money(selected.quoted)}</p>
          </header>

          <div className="freshProfitGuardCards">
            <section><b>Quoted</b><p>{money(selected.quoted)}</p></section>
            <section><b>Costs</b><p>{money(cost)}</p></section>
            <section><b>Profit</b><p>{money(profit)}</p></section>
            <section><b>Margin</b><p>{margin(selected)}%</p></section>
          </div>

          <div className="freshProfitGuardFinding">
            <b>AI found</b>
            <p>{selected.found}</p>
            <b>AI prepared</b>
            <p>{selected.prepared}</p>
          </div>

          <div className="freshProfitGuardButtons">
            <button type="button" onClick={() => sendProfitToCommand(selected, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.("profit")}>Open Profit</button>
            <button type="button" onClick={() => onNavigate?.(selected.page)}>Open related page</button>
            <button type="button" onClick={() => onNavigate?.("quoteai")}>Open AI Quote</button>
          </div>
        </article>
      </div>
    </section>
  );
}
