import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const followups = [
  {
    id: "quote",
    type: "Quote follow-up",
    client: "Upper Hutt Lead",
    value: "$190",
    trigger: "Quote sent 2 days ago and not accepted.",
    message: "Hi, just checking in on the garden reset quote. I can still fit this in this week if you’d like me to go ahead.",
    why: "A fast follow-up can save a job before the customer goes cold.",
    page: "quotes",
  },
  {
    id: "invoice",
    type: "Unpaid invoice reminder",
    client: "Belmont Customer",
    value: "$65",
    trigger: "Invoice unpaid after 7 days.",
    message: "Hi, just a friendly reminder that invoice INV-1007 is still outstanding. Let me know if you need it resent.",
    why: "Keeps cash moving without the owner writing awkward messages.",
    page: "invoices",
  },
  {
    id: "review",
    type: "Review request",
    client: "Naenae Property",
    value: "Completed job",
    trigger: "Job completed with photos and no complaint.",
    message: "Thanks again for choosing us. If you’re happy with the work, a quick review would really help our small business.",
    why: "Good completed jobs should turn into reputation.",
    page: "reviews",
  },
  {
    id: "rebook",
    type: "Rebooking nudge",
    client: "Wainuiomata Customer",
    value: "$85",
    trigger: "Regular client has not booked for 5 weeks.",
    message: "Hi, it looks like you may be due for another tidy-up. Would you like me to book you in for next week?",
    why: "Churvox helps keep repeat work alive.",
    page: "recurring",
  },
  {
    id: "worker",
    type: "Worker reminder",
    client: "Internal team",
    value: "Today",
    trigger: "Worker has not acknowledged assigned job.",
    message: "Quick reminder to acknowledge today’s assigned job in Churvox before heading out.",
    why: "Owner catches worker issues before the customer is affected.",
    page: "worker",
  },
];

function sendToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `followup-writer-${item.id}-${Date.now()}`,
      group: "AI Follow-up Writer",
      title: item.type,
      info: `${item.client} · ${item.value}`,
      urgency: item.id === "quote" || item.id === "invoice" ? "High" : "Medium",
      found: item.trigger,
      prepared: item.message,
      why: item.why,
      owner: "Approve, edit, send, or ignore.",
      area: "AI Follow-up Writer",
      page: "followupwriter",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 50)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "followup-writer" } }));
  } catch {
    // Fresh preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshAiFollowUpWriter({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(followups[0].id);
  const [customMessage, setCustomMessage] = React.useState(followups[0].message);
  const selected = followups.find((item) => item.id === selectedId) || followups[0];

  React.useEffect(() => {
    setCustomMessage(selected.message);
  }, [selected.id]);

  const highValue = followups.filter((item) => item.id === "quote" || item.id === "invoice").length;

  function sendCustom() {
    sendToCommand({ ...selected, message: customMessage }, onNavigate);
  }

  return (
    <section className="freshFollowWriterPage">
      <div className="freshFollowWriterHero">
        <div>
          <span>AI Follow-up Writer</span>
          <h1>Churvox writes the message before work slips away</h1>
          <p>Quotes, unpaid invoices, reviews, rebookings and worker reminders become approval cards instead of forgotten admin.</p>
        </div>

        <div className="freshFollowWriterStats">
          <div><b>{followups.length}</b><small>follow-ups</small></div>
          <div><b>{highValue}</b><small>money actions</small></div>
          <div><b>Edit</b><small>owner control</small></div>
          <div><b>Send</b><small>to Command</small></div>
        </div>
      </div>

      <div className="freshFollowWriterLayout">
        <aside className="freshFollowWriterList">
          <header>
            <b>Detected follow-ups</b>
            <span>Prepared by AI Operator</span>
          </header>

          {followups.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.type}</b>
              <span>{item.client}</span>
              <small>{item.value} · {item.trigger}</small>
            </button>
          ))}
        </aside>

        <article className="freshFollowWriterDetail">
          <header>
            <span>{selected.type}</span>
            <h2>{selected.client}</h2>
            <p>{selected.trigger}</p>
          </header>

          <div className="freshFollowWriterCards">
            <section>
              <b>AI found</b>
              <p>{selected.trigger}</p>
            </section>
            <section>
              <b>Why it matters</b>
              <p>{selected.why}</p>
            </section>
            <section>
              <b>Related value</b>
              <p>{selected.value}</p>
            </section>
          </div>

          <label className="freshFollowWriterMessage">
            <span>Editable message</span>
            <textarea value={customMessage} onChange={(event) => setCustomMessage(event.target.value)} />
          </label>

          <div className="freshFollowWriterButtons">
            <button type="button" onClick={sendCustom}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.("messages")}>Open Messages</button>
            <button type="button" onClick={() => onNavigate?.("followups")}>Open Follow-ups</button>
            <button type="button" onClick={() => onNavigate?.(selected.page)}>Open related page</button>
          </div>
        </article>
      </div>
    </section>
  );
}
