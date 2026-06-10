import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const promises = [
  {
    id: "pay-1",
    client: "Belmont Customer",
    invoice: "INV-1007",
    amount: 65,
    promised: "Pay Friday",
    status: "Unpaid",
    urgency: "High",
    found: "Customer promised to pay Friday but invoice is still unpaid.",
    prepared: "Friendly reminder ready.",
    message: "Hi, just checking in — you mentioned payment would be made Friday. Let me know if you need the invoice resent.",
    page: "invoices",
  },
  {
    id: "pay-2",
    client: "Naenae Property",
    invoice: "INV-1009",
    amount: 138,
    promised: "Pay after materials explained",
    status: "Waiting reply",
    urgency: "Medium",
    found: "Customer asked about materials before paying.",
    prepared: "Explain materials and attach proof.",
    message: "Hi, the extra materials were screws and sealant used to complete the repair properly. I can send through the job notes/photos too.",
    page: "photoproof",
  },
  {
    id: "pay-3",
    client: "Upper Hutt Lead",
    invoice: "Quote follow-up",
    amount: 190,
    promised: "Decide this week",
    status: "No answer",
    urgency: "Medium",
    found: "Customer said they would decide this week and has not replied.",
    prepared: "Soft quote follow-up ready.",
    message: "Hi, just checking whether you’d like to go ahead with the garden reset. I can also split it into stages if that suits better.",
    page: "followupwriter",
  },
];

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ")}`;
}

function sendPromiseToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `payment-promise-${item.id}-${Date.now()}`,
      group: "AI Payment Promise Tracker",
      title: `${item.client} payment promise`,
      info: `${item.invoice} · ${money(item.amount)} · ${item.status}`,
      urgency: item.urgency,
      found: item.found,
      prepared: item.message,
      why: "When a customer says they will pay, Churvox should remember and follow up if it does not happen.",
      owner: "Approve reminder, edit, open invoice, or ignore.",
      area: "Payment Promise Tracker",
      page: "paymentpromise",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 130)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "payment-promise" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshPaymentPromise({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(promises[0].id);
  const selected = promises.find((item) => item.id === selectedId) || promises[0];
  const [message, setMessage] = React.useState(selected.message);
  const total = promises.reduce((sum, item) => sum + item.amount, 0);

  React.useEffect(() => {
    setMessage(selected.message);
  }, [selected.id]);

  return (
    <section className="freshOwnerAiPage">
      <div className="freshOwnerAiHero">
        <div>
          <span>AI Payment Promise Tracker</span>
          <h1>Churvox remembers when customers say “I’ll pay Friday”</h1>
          <p>Payment promises become follow-up actions if the money does not arrive. No more owner trying to remember who said what.</p>
        </div>

        <div className="freshOwnerAiStats">
          <div><b>{promises.length}</b><small>promises</small></div>
          <div><b>{money(total)}</b><small>watched</small></div>
          <div><b>{selected.status}</b><small>selected</small></div>
          <div><b>Chase</b><small>prepared</small></div>
        </div>
      </div>

      <div className="freshOwnerAiSplit">
        <aside className="freshOwnerAiList">
          <header>
            <b>Payment promises</b>
            <span>{money(total)} watched</span>
          </header>

          {promises.map((item) => (
            <button
              key={item.id}
              type="button"
              className={selected.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.client}</b>
              <span>{item.promised}</span>
              <small>{item.invoice} · {money(item.amount)} · {item.status}</small>
            </button>
          ))}
        </aside>

        <article className="freshOwnerAiDetail">
          <header>
            <span>{selected.urgency}</span>
            <h2>{selected.client}</h2>
            <p>{selected.invoice} · {money(selected.amount)} · {selected.status}</p>
          </header>

          <div className="freshOwnerAiMiniGrid">
            <section><b>AI found</b><p>{selected.found}</p></section>
            <section><b>AI prepared</b><p>{selected.prepared}</p></section>
            <section><b>Promise</b><p>{selected.promised}</p></section>
          </div>

          <label className="freshOwnerAiEditor">
            <span>Editable reminder</span>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>

          <div className="freshOwnerAiButtons">
            <button type="button" onClick={() => sendPromiseToCommand({ ...selected, message }, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.(selected.page)}>Open area</button>
            <button type="button" onClick={() => onNavigate?.("cashflowai")}>Open Cashflow Coach</button>
          </div>
        </article>
      </div>
    </section>
  );
}
