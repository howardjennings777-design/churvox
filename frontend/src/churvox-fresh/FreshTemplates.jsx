import React from "react";

const TEMPLATES_KEY = "churvox:fresh-templates:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "tp-1",
    name: "Quote follow-up",
    type: "Message",
    area: "Quotes",
    trigger: "Quote viewed but not accepted after 48 hours",
    status: "Active",
    tone: "Friendly tradie",
    ownerApproval: "Required",
    body: "Hi {{customer}}, just checking you received the quote for {{job}}. Happy to answer any questions or adjust the scope if needed.",
    note: "Keeps quote follow-ups helpful and not pushy.",
  },
  {
    id: "tp-2",
    name: "Job complete update",
    type: "Message",
    area: "Jobs",
    trigger: "Worker marks job completed",
    status: "Draft",
    tone: "Professional",
    ownerApproval: "Optional",
    body: "Hi {{customer}}, the job at {{address}} has been completed. Photos and invoice details are ready for review.",
    note: "Good for completed work, proof photos and invoice handover.",
  },
  {
    id: "tp-3",
    name: "Standard quote wording",
    type: "Quote",
    area: "Quotes",
    trigger: "New quote created",
    status: "Active",
    tone: "Clear and simple",
    ownerApproval: "Required",
    body: "This quote includes labour, standard materials and tidy-up. Any extra work found on site will be confirmed before proceeding.",
    note: "Protects margin and avoids scope confusion.",
  },
];

function readTemplates() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(TEMPLATES_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveTemplates(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "templates" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendTemplateToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `template-${item.id}-${Date.now()}`,
      group: "Templates",
      title: "Template needs owner review",
      info: `${item.name} · ${item.type} · ${item.status}`,
      urgency: item.ownerApproval,
      found: `Template trigger: ${item.trigger}.`,
      prepared: "Churvox prepared this message or quote wording for owner approval.",
      why: item.note,
      owner: "Approve wording, edit template, open Messages, or open Quotes.",
      area: "Message / Quote Templates",
      page: "templates",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "template-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshTemplates({ onNavigate }) {
  const [items, setItems] = React.useState(readTemplates);
  const [selectedId, setSelectedId] = React.useState(() => readTemplates()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const total = items.length;
  const active = items.filter((item) => item.status === "Active").length;
  const approval = items.filter((item) => item.ownerApproval === "Required").length;
  const messageTemplates = items.filter((item) => item.type === "Message").length;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      saveTemplates(next);
      return next;
    });
  }

  function addTemplate() {
    const next = {
      id: `tp-${Date.now()}`,
      name: "New template",
      type: "Message",
      area: "Messages",
      trigger: "Add trigger.",
      status: "Draft",
      tone: "Friendly tradie",
      ownerApproval: "Required",
      body: "Write template body here. Use {{customer}}, {{job}}, {{address}}, {{invoice}} or {{quote}}.",
      note: "Owner approves before this template is used.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveTemplates(updated);
  }

  function resetTemplates() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveTemplates(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendTemplateToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshTemplatesPage">
      <div className="freshTemplatesHero">
        <div>
          <span>Message / quote templates</span>
          <h1>Keep customer wording fast, clear and owner-approved</h1>
          <p>Build reusable quote wording, job updates, payment reminders, follow-ups and customer portal replies.</p>
        </div>

        <div className="freshTemplatesStats">
          <div><b>{total}</b><small>templates</small></div>
          <div><b>{active}</b><small>active</small></div>
          <div><b>{approval}</b><small>need approval</small></div>
          <div><b>{messageTemplates}</b><small>messages</small></div>
        </div>
      </div>

      <div className="freshTemplatesLayout">
        <aside className="freshTemplatesList">
          <header>
            <div>
              <b>Template desk</b>
              <span>{approval} owner-controlled</span>
            </div>
            <button type="button" onClick={addTemplate}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.name}</b>
              <span>{item.type} · {item.area}</span>
              <small>{item.status} · approval {item.ownerApproval}</small>
            </button>
          ))}

          <button type="button" className="freshTemplatesReset" onClick={resetTemplates}>
            Reset templates
          </button>
        </aside>

        {selected && (
          <article className="freshTemplatesDetail">
            <div className="freshTemplatesHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.name}</h2>
                <p>{selected.type} · {selected.area} · {selected.tone}</p>
              </div>

              <div className="freshTemplatesHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("messages")}>Open Messages</button>
                <button type="button" onClick={() => onNavigate?.("quotes")}>Open Quotes</button>
              </div>
            </div>

            <div className="freshTemplatesCards">
              <section>
                <span>Trigger</span>
                <b>{selected.area}</b>
                <p>{selected.trigger}</p>
              </section>

              <section>
                <span>Approval</span>
                <b>{selected.ownerApproval}</b>
                <p>Owner approval keeps AI wording safe before customers see it.</p>
              </section>

              <section>
                <span>Tone</span>
                <b>{selected.tone}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshTemplatesForm">
              <label>
                <span>Name</span>
                <input value={selected.name} onChange={(event) => updateItem(selected.id, { name: event.target.value })} />
              </label>

              <label>
                <span>Type</span>
                <select value={selected.type} onChange={(event) => updateItem(selected.id, { type: event.target.value })}>
                  <option>Message</option>
                  <option>Quote</option>
                  <option>Invoice</option>
                  <option>Follow-up</option>
                  <option>Portal reply</option>
                </select>
              </label>

              <label>
                <span>Area</span>
                <select value={selected.area} onChange={(event) => updateItem(selected.id, { area: event.target.value })}>
                  <option>Messages</option>
                  <option>Quotes</option>
                  <option>Jobs</option>
                  <option>Invoices</option>
                  <option>Payments</option>
                  <option>Customer Portal</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Active</option>
                  <option>Draft</option>
                  <option>Needs review</option>
                  <option>Paused</option>
                </select>
              </label>

              <label>
                <span>Tone</span>
                <select value={selected.tone} onChange={(event) => updateItem(selected.id, { tone: event.target.value })}>
                  <option>Friendly tradie</option>
                  <option>Professional</option>
                  <option>Clear and simple</option>
                  <option>Firm but polite</option>
                  <option>Short mobile</option>
                </select>
              </label>

              <label>
                <span>Owner approval</span>
                <select value={selected.ownerApproval} onChange={(event) => updateItem(selected.id, { ownerApproval: event.target.value })}>
                  <option>Required</option>
                  <option>Optional</option>
                  <option>Not required</option>
                </select>
              </label>

              <label className="wide">
                <span>Trigger</span>
                <textarea value={selected.trigger} onChange={(event) => updateItem(selected.id, { trigger: event.target.value })} />
              </label>

              <label className="wide">
                <span>Template body</span>
                <textarea value={selected.body} onChange={(event) => updateItem(selected.id, { body: event.target.value })} />
              </label>

              <label className="wide">
                <span>Owner note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshTemplatesPreview">
              <span>Preview</span>
              <p>{selected.body}</p>
            </div>

            <div className="freshTemplatesActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Active" })}>Activate</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs review" })}>Needs review</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Paused" })}>Pause</button>
              <button type="button" onClick={() => onNavigate?.("approvals")}>Open Approvals</button>
              <button type="button" onClick={() => onNavigate?.("followups")}>Open Follow-ups</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
