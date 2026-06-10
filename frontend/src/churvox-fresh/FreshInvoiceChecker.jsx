import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const invoices = [
  {
    id: "inv-check-1",
    invoice: "INV-1007",
    client: "Belmont Customer",
    job: "Lawn reset and hedge tidy",
    currentTotal: 145,
    suggestedExtra: 45,
    issue: "Worker note says extra hedge trim completed but invoice has no extra line.",
    prepared: "Add line item: Extra hedge trim — $45 + GST.",
    status: "Needs owner review",
  },
  {
    id: "inv-check-2",
    invoice: "INV-1008",
    client: "Upper Hutt Lead",
    job: "Garden reset",
    currentTotal: 190,
    suggestedExtra: 0,
    issue: "Photos attached and job complete. No missing extras found.",
    prepared: "Invoice looks ready to send.",
    status: "Ready",
  },
  {
    id: "inv-check-3",
    invoice: "INV-1009",
    client: "Naenae Property",
    job: "Handyman repair",
    currentTotal: 120,
    suggestedExtra: 18,
    issue: "Materials note says screws/sealant used but invoice has no materials line.",
    prepared: "Add line item: Materials — $18 + GST.",
    status: "Needs owner review",
  },
];

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ")}`;
}

function sendToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `invoice-check-${item.id}-${Date.now()}`,
      group: "AI Invoice Checker",
      title: "Invoice needs owner review",
      info: `${item.invoice} · ${item.client} · ${money(item.suggestedExtra)} possible extra`,
      urgency: item.suggestedExtra ? "High" : "Medium",
      found: item.issue,
      prepared: item.prepared,
      why: item.suggestedExtra ? "Churvox may have found unbilled work before the invoice is sent." : "Churvox checked the invoice and found no obvious missing extra.",
      owner: "Approve extra, edit invoice, send invoice, or ignore.",
      area: "Invoice Checker",
      page: "invoicecheck",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 50)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "invoice-check" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshInvoiceChecker({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(invoices[0].id);
  const [approved, setApproved] = React.useState({});
  const selected = invoices.find((item) => item.id === selectedId) || invoices[0];

  const risk = invoices.reduce((sum, item) => sum + item.suggestedExtra, 0);
  const review = invoices.filter((item) => item.status === "Needs owner review").length;

  return (
    <section className="freshInvoiceCheckPage">
      <div className="freshInvoiceCheckHero">
        <div>
          <span>AI Invoice Checker</span>
          <h1>Catch missing money before invoices go out</h1>
          <p>Churvox checks job notes, worker time, photos, materials and variations before the owner sends an invoice.</p>
        </div>

        <div className="freshInvoiceCheckStats">
          <div><b>{invoices.length}</b><small>checked</small></div>
          <div><b>{review}</b><small>review</small></div>
          <div><b>{money(risk)}</b><small>possible extras</small></div>
          <div><b>Approve</b><small>owner control</small></div>
        </div>
      </div>

      <div className="freshInvoiceCheckLayout">
        <aside className="freshInvoiceCheckList">
          <header>
            <b>Invoices scanned</b>
            <span>{review} need review</span>
          </header>

          {invoices.map((item) => (
            <button key={item.id} type="button" className={selected.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}>
              <b>{item.invoice}</b>
              <span>{item.client}</span>
              <small>{item.status} · {money(item.suggestedExtra)} extra</small>
            </button>
          ))}
        </aside>

        <article className="freshInvoiceCheckDetail">
          <header>
            <span>{selected.status}</span>
            <h2>{selected.invoice}</h2>
            <p>{selected.client} · {selected.job}</p>
          </header>

          <div className="freshInvoiceCheckCards">
            <section><b>Current invoice</b><p>{money(selected.currentTotal)}</p></section>
            <section><b>Possible extra</b><p>{money(selected.suggestedExtra)}</p></section>
            <section><b>New total</b><p>{money(selected.currentTotal + selected.suggestedExtra)}</p></section>
          </div>

          <div className="freshInvoiceCheckFinding">
            <b>AI found</b>
            <p>{selected.issue}</p>
            <b>AI prepared</b>
            <p>{selected.prepared}</p>
          </div>

          <div className="freshInvoiceCheckButtons">
            <button type="button" onClick={() => setApproved({ ...approved, [selected.id]: true })}>
              {approved[selected.id] ? "Approved" : "Approve extra"}
            </button>
            <button type="button" onClick={() => sendToCommand(selected, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
            <button type="button" onClick={() => onNavigate?.("jobs")}>Open Job</button>
          </div>
        </article>
      </div>
    </section>
  );
}
