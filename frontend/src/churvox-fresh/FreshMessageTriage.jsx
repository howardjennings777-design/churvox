import React from "react";
import { sendFreshSlipToCommand } from "./commandBridge";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const messages = [
  {
    id: "msg-1",
    from: "Belmont Customer",
    type: "Complaint",
    urgency: "High",
    message: "Hey, I think the driveway edge was missed yesterday.",
    found: "Customer issue / possible rework.",
    prepared: "Apology and touch-up message ready.",
    reply: "Hi, sorry about that — I can see the driveway edge may need a touch-up. I’ll make sure it’s sorted on the next visit.",
    page: "reworkresolver",
  },
  {
    id: "msg-2",
    from: "Upper Hutt Lead",
    type: "Quote question",
    urgency: "High",
    message: "Can you do it cheaper if we leave the hedge for later?",
    found: "Customer is asking for a staged quote.",
    prepared: "Staged quote option ready.",
    reply: "Yes, we can split it into stages. I can do the lawn reset first, then the hedge later if that suits your budget better.",
    page: "quoteai",
  },
  {
    id: "msg-3",
    from: "Naenae Property",
    type: "Payment question",
    urgency: "Medium",
    message: "What were the extra materials on the invoice?",
    found: "Customer wants invoice explanation.",
    prepared: "Materials explanation ready.",
    reply: "The extra materials were screws and sealant used to complete the repair properly. I can send through the job notes/photos as well.",
    page: "invoicecheck",
  },
  {
    id: "msg-4",
    from: "Wainuiomata Customer",
    type: "Booking request",
    urgency: "Medium",
    message: "Can you fit me in next week for another tidy?",
    found: "Repeat customer wants rebooking.",
    prepared: "Recurring booking action ready.",
    reply: "Yes, I can fit you in next week. I’ll confirm the best day and send the booking through.",
    page: "recurringsaver",
  },
];

function sendMessageToCommand(item, reply, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `message-triage-${item.id}-${Date.now()}`,
      group: "AI Message Triage",
      title: `${item.type} from ${item.from}`,
      info: item.urgency,
      urgency: item.urgency,
      found: `${item.found} Message: ${item.message}`,
      prepared: reply,
      why: "Customer messages should become clear owner actions, not get buried.",
      owner: "Approve reply, edit, open related page, or ignore.",
      area: "Message Triage",
      page: "messagetriage",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 120)));
    sendFreshSlipToCommand(slip, { type: "message-triage" });
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "message-triage" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshMessageTriage({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(messages[0].id);
  const selected = messages.find((item) => item.id === selectedId) || messages[0];
  const [reply, setReply] = React.useState(selected.reply);

  React.useEffect(() => {
    setReply(selected.reply);
  }, [selected.id]);

  const high = messages.filter((item) => item.urgency === "High").length;

  return (
    <section className="freshOwnerAiPage">
      <div className="freshOwnerAiHero">
        <div>
          <span>AI Message Triage</span>
          <h1>Incoming messages become prepared owner actions</h1>
          <p>AI sorts booking requests, complaints, quote questions and payment questions, then prepares the reply for approval.</p>
        </div>

        <div className="freshOwnerAiStats">
          <div><b>{messages.length}</b><small>messages</small></div>
          <div><b>{high}</b><small>urgent</small></div>
          <div><b>{selected.type}</b><small>selected</small></div>
          <div><b>Edit</b><small>before send</small></div>
        </div>
      </div>

      <div className="freshOwnerAiSplit">
        <aside className="freshOwnerAiList">
          <header>
            <b>Inbox triage</b>
            <span>{high} high priority</span>
          </header>

          {messages.map((item) => (
            <button
              key={item.id}
              type="button"
              className={selected.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.from}</b>
              <span>{item.type}</span>
              <small>{item.urgency} · {item.message}</small>
            </button>
          ))}
        </aside>

        <article className="freshOwnerAiDetail">
          <header>
            <span>{selected.type}</span>
            <h2>{selected.from}</h2>
            <p>{selected.message}</p>
          </header>

          <div className="freshOwnerAiMiniGrid">
            <section><b>AI found</b><p>{selected.found}</p></section>
            <section><b>AI prepared</b><p>{selected.prepared}</p></section>
            <section><b>Related page</b><p>{selected.page}</p></section>
          </div>

          <label className="freshOwnerAiEditor">
            <span>Editable reply</span>
            <textarea value={reply} onChange={(event) => setReply(event.target.value)} />
          </label>

          <div className="freshOwnerAiButtons">
            <button type="button" onClick={() => sendMessageToCommand(selected, reply, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.(selected.page)}>Open related page</button>
            <button type="button" onClick={() => onNavigate?.("messages")}>Open Messages</button>
          </div>
        </article>
      </div>
    </section>
  );
}
