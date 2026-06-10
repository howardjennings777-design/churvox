import React from "react";

const MESSAGES_KEY = "churvox:fresh-messages:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "msg-1",
    from: "Aroha Property Care",
    type: "Customer",
    status: "Needs reply",
    subject: "Can we move next visit?",
    lastMessage: "Can we make the next lawn visit Thursday morning instead?",
    reply: "",
    linkedArea: "Jobs",
    priority: "Medium",
  },
  {
    id: "msg-2",
    from: "Matiu Rangi",
    type: "Worker",
    status: "Open",
    subject: "Green waste extra",
    lastMessage: "There is extra green waste on the lawn job. Should I add it?",
    reply: "",
    linkedArea: "Extras",
    priority: "High",
  },
  {
    id: "msg-3",
    from: "Birchville Rentals",
    type: "Customer",
    status: "Watching",
    subject: "Access for driveway clean",
    lastMessage: "Tenant has not confirmed gate access yet.",
    reply: "",
    linkedArea: "Dispatch",
    priority: "High",
  },
];

function readMessages() {
  try {
    if (typeof window === "undefined") return defaults;

    const saved = window.localStorage.getItem(MESSAGES_KEY);
    if (!saved) return defaults;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveMessages(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "messages" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendMessageToCommand(message) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `message-${message.id}-${Date.now()}`,
      group: "Messages",
      title: "Message needs owner review",
      info: `${message.from} · ${message.subject}`,
      urgency: message.priority,
      found: `${message.from} sent a ${message.type.toLowerCase()} message.`,
      prepared: message.reply
        ? `Draft reply prepared: ${message.reply}`
        : "Churvox prepared a reply review slip.",
      why: "Messages can affect jobs, invoices, quotes or customer expectations, so the owner should approve first.",
      owner: "Approve reply, edit it, mark handled, or open the linked area.",
      area: "Messages",
      page: "messages",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "message-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function pageForArea(area) {
  const clean = String(area || "").toLowerCase();

  if (clean.includes("job")) return "jobs";
  if (clean.includes("extra")) return "extras";
  if (clean.includes("dispatch")) return "dispatch";
  if (clean.includes("invoice")) return "invoices";
  if (clean.includes("quote")) return "quotes";
  if (clean.includes("client")) return "clients";
  if (clean.includes("worker")) return "worker";

  return "command";
}

export default function FreshMessages({ onNavigate }) {
  const [messages, setMessages] = React.useState(readMessages);
  const [selectedId, setSelectedId] = React.useState(() => readMessages()[0]?.id || "");
  const selected = messages.find((item) => item.id === selectedId) || messages[0];

  const needsReply = messages.filter((item) => item.status === "Needs reply").length;
  const highPriority = messages.filter((item) => item.priority === "High").length;
  const handled = messages.filter((item) => item.status === "Handled").length;

  function updateMessage(id, patch) {
    setMessages((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveMessages(next);
      return next;
    });
  }

  function addMessage() {
    const next = {
      id: `msg-${Date.now()}`,
      from: "New customer",
      type: "Customer",
      status: "Needs reply",
      subject: "New message",
      lastMessage: "Type the message details here.",
      reply: "",
      linkedArea: "Jobs",
      priority: "Medium",
    };

    const updated = [next, ...messages];
    setMessages(updated);
    setSelectedId(next.id);
    saveMessages(updated);
  }

  function resetMessages() {
    saveMessages(defaults);
    setMessages(defaults);
    setSelectedId(defaults[0]?.id || "");
  }

  function sendToCommand() {
    if (!selected) return;
    sendMessageToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshMessagesPage">
      <div className="freshMessagesHero">
        <div>
          <span>Messages</span>
          <h1>Customer and worker messages</h1>
          <p>Keep replies controlled. Worker and customer messages can be reviewed in Command before they become promises.</p>
        </div>

        <div className="freshMessagesStats">
          <div><b>{messages.length}</b><small>threads</small></div>
          <div><b>{needsReply}</b><small>needs reply</small></div>
          <div><b>{highPriority}</b><small>high priority</small></div>
          <div><b>{handled}</b><small>handled</small></div>
        </div>
      </div>

      <div className="freshMessagesLayout">
        <aside className="freshMessagesList">
          <header>
            <div>
              <b>Inbox</b>
              <span>Owner controlled replies</span>
            </div>

            <button type="button" onClick={addMessage}>Add</button>
          </header>

          {messages.map((message) => (
            <button
              type="button"
              key={message.id}
              className={selected?.id === message.id ? "active" : ""}
              onClick={() => setSelectedId(message.id)}
            >
              <b>{message.subject}</b>
              <span>{message.from}</span>
              <small>{message.status} · {message.priority}</small>
            </button>
          ))}

          <button type="button" className="freshMessagesReset" onClick={resetMessages}>
            Reset messages
          </button>
        </aside>

        {selected && (
          <article className="freshMessagesDetail">
            <div className="freshMessagesHead">
              <div>
                <span>{selected.type}</span>
                <h2>{selected.subject}</h2>
                <p>{selected.from} · linked to {selected.linkedArea}</p>
              </div>

              <div className="freshMessagesHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.(pageForArea(selected.linkedArea))}>Open linked area</button>
              </div>
            </div>

            <div className="freshMessagesConversation">
              <section>
                <span>Incoming</span>
                <p>{selected.lastMessage}</p>
              </section>

              <section>
                <span>Draft reply</span>
                <textarea
                  value={selected.reply}
                  onChange={(event) => updateMessage(selected.id, { reply: event.target.value })}
                  placeholder="Write the reply here before sending to Command..."
                />
              </section>
            </div>

            <div className="freshMessagesForm">
              <label>
                <span>From</span>
                <input value={selected.from} onChange={(event) => updateMessage(selected.id, { from: event.target.value })} />
              </label>

              <label>
                <span>Type</span>
                <select value={selected.type} onChange={(event) => updateMessage(selected.id, { type: event.target.value })}>
                  <option>Customer</option>
                  <option>Worker</option>
                  <option>Internal</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateMessage(selected.id, { status: event.target.value })}>
                  <option>Needs reply</option>
                  <option>Open</option>
                  <option>Watching</option>
                  <option>Handled</option>
                </select>
              </label>

              <label>
                <span>Priority</span>
                <select value={selected.priority} onChange={(event) => updateMessage(selected.id, { priority: event.target.value })}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>

              <label>
                <span>Linked area</span>
                <select value={selected.linkedArea} onChange={(event) => updateMessage(selected.id, { linkedArea: event.target.value })}>
                  <option>Jobs</option>
                  <option>Dispatch</option>
                  <option>Extras</option>
                  <option>Invoices</option>
                  <option>Quotes</option>
                  <option>Clients</option>
                  <option>Worker</option>
                </select>
              </label>
            </div>

            <div className="freshMessagesActions">
              <button type="button" onClick={() => updateMessage(selected.id, { status: "Handled" })}>Mark handled</button>
              <button type="button" onClick={() => updateMessage(selected.id, { status: "Watching" })}>Watch</button>
              <button type="button" onClick={() => updateMessage(selected.id, { status: "Needs reply" })}>Needs reply</button>
              <button type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
