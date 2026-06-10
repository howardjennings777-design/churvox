import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const cases = [
  {
    id: "rw-1",
    client: "Belmont Customer",
    job: "Fortnightly lawn mow",
    issue: "Customer said edging was missed near driveway.",
    risk: "High",
    proof: "After photos show front lawn done but driveway edge unclear.",
    prepared: "Apology + free edge touch-up next visit.",
    message: "Hi, sorry about that — I can see the driveway edge may have been missed. I’ll make sure it’s touched up on the next visit.",
    page: "quality",
  },
  {
    id: "rw-2",
    client: "Naenae Property",
    job: "Handyman repair",
    issue: "Customer asked why materials were added.",
    risk: "Medium",
    proof: "Worker note says screws and sealant used.",
    prepared: "Explain materials politely and attach photo proof.",
    message: "Hi, the extra materials were screws and sealant used to complete the repair properly. I can send the photo notes through as well.",
    page: "photoproof",
  },
  {
    id: "rw-3",
    client: "Upper Hutt Lead",
    job: "Garden reset quote",
    issue: "Customer thinks quote is too high.",
    risk: "Medium",
    proof: "Photos show overgrown lawn, hedge and green waste volume.",
    prepared: "Offer staged option instead of losing the job.",
    message: "I understand. We can split it into stages — lawn reset first, then hedge and green waste later if that suits better.",
    page: "quoteai",
  },
];

function sendReworkToCommand(item, note, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `rework-${item.id}-${Date.now()}`,
      group: "AI Rework Resolver",
      title: "Customer issue needs owner approval",
      info: `${item.client} · ${item.risk}`,
      urgency: item.risk,
      found: item.issue,
      prepared: note || item.message,
      why: `${item.proof} Suggested action: ${item.prepared}`,
      owner: "Approve reply, edit, schedule callback, or open quality/rework.",
      area: "Rework Resolver",
      page: "reworkresolver",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 100)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "rework-resolver" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshReworkResolver({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(cases[0].id);
  const selected = cases.find((item) => item.id === selectedId) || cases[0];
  const [note, setNote] = React.useState(selected.message);
  const high = cases.filter((item) => item.risk === "High").length;

  React.useEffect(() => {
    setNote(selected.message);
  }, [selected.id]);

  return (
    <section className="freshReworkPage">
      <div className="freshReworkHero">
        <div>
          <span>AI Rework Resolver</span>
          <h1>Handle complaints before they become lost customers</h1>
          <p>Churvox uses job notes, photos, quality checks and customer history to prepare calm replies and callback actions.</p>
        </div>

        <div className="freshReworkStats">
          <div><b>{cases.length}</b><small>cases</small></div>
          <div><b>{high}</b><small>high risk</small></div>
          <div><b>Reply</b><small>prepared</small></div>
          <div><b>Save</b><small>customer</small></div>
        </div>
      </div>

      <div className="freshReworkLayout">
        <aside className="freshReworkList">
          <header>
            <b>Rework cases</b>
            <span>{high} high risk</span>
          </header>

          {cases.map((item) => (
            <button
              key={item.id}
              type="button"
              className={selected.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.client}</b>
              <span>{item.job}</span>
              <small>{item.risk} · {item.issue}</small>
            </button>
          ))}
        </aside>

        <article className="freshReworkDetail">
          <header>
            <span>{selected.risk} risk</span>
            <h2>{selected.client}</h2>
            <p>{selected.job}</p>
          </header>

          <div className="freshReworkCards">
            <section><b>AI found</b><p>{selected.issue}</p></section>
            <section><b>Proof checked</b><p>{selected.proof}</p></section>
            <section><b>AI prepared</b><p>{selected.prepared}</p></section>
          </div>

          <label>
            <span>Editable customer reply</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>

          <div className="freshReworkButtons">
            <button type="button" onClick={() => sendReworkToCommand(selected, note, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.("quality")}>Open Quality</button>
            <button type="button" onClick={() => onNavigate?.("warranties")}>Open Warranties</button>
            <button type="button" onClick={() => onNavigate?.(selected.page)}>Open related page</button>
          </div>
        </article>
      </div>
    </section>
  );
}
