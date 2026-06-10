import React from "react";

const PORTAL_KEY = "churvox:fresh-client-portal:v1";

const defaults = [
  {
    id: "portal-1",
    client: "Aroha Property Care",
    quote: "QT-2042",
    quoteTitle: "Monthly grounds care",
    quoteAmount: 420,
    quoteStatus: "Awaiting approval",
    invoice: "INV-1007",
    invoiceAmount: 85,
    invoiceStatus: "Draft",
    request: "Fortnightly lawn run",
    requestStatus: "Open",
    message: "Can we make the next visit Thursday morning?",
  },
  {
    id: "portal-2",
    client: "Birchville Rentals",
    quote: "QT-2041",
    quoteTitle: "Driveway clean",
    quoteAmount: 240,
    quoteStatus: "Sent",
    invoice: "INV-1002",
    invoiceAmount: 190,
    invoiceStatus: "Overdue",
    request: "Tenant access check",
    requestStatus: "Needs reply",
    message: "Please confirm access before dispatch.",
  },
];

function readPortal() {
  try {
    if (typeof window === "undefined") return defaults;

    const saved = window.localStorage.getItem(PORTAL_KEY);
    if (!saved) return defaults;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function savePortal(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PORTAL_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "client-portal" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshClientPortal({ onNavigate }) {
  const [items, setItems] = React.useState(readPortal);
  const [selectedId, setSelectedId] = React.useState(() => readPortal()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  function updatePortal(id, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      savePortal(next);
      return next;
    });
  }

  function resetPortal() {
    savePortal(defaults);
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
  }

  function sendPortalIssue() {
    if (!selected) return;

    try {
      const key = "churvox:fresh-command-inbox:v1";
      const saved = window.localStorage.getItem(key);
      const current = saved ? JSON.parse(saved) : [];
      const safeCurrent = Array.isArray(current) ? current : [];

      const issue = {
        id: `portal-${selected.id}-${Date.now()}`,
        group: "Portal",
        title: "Customer portal message",
        info: `${selected.client} · ${selected.message}`,
        urgency: "Customer reply",
        found: `${selected.client} sent a customer portal message.`,
        prepared: "Churvox prepared a Command review slip instead of auto-replying.",
        why: "Customer messages should be checked by the owner before action.",
        owner: "Reply, create job, update quote, or mark handled.",
        area: "Client Portal",
        page: "portal",
        fromInbox: true,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      window.localStorage.setItem(key, JSON.stringify([issue, ...safeCurrent].slice(0, 20)));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "portal-command" } }));
      onNavigate?.("command");
    } catch {
      // Fresh preview keeps working without local storage.
    }
  }

  const approved = items.filter((item) => item.quoteStatus === "Approved").length;
  const requests = items.filter((item) => item.requestStatus !== "Done").length;
  const money = items.reduce((sum, item) => sum + Number(item.invoiceAmount || 0), 0);

  return (
    <section className="freshPortalPage">
      <div className="freshPortalHero">
        <div>
          <span>Client portal preview</span>
          <h1>Customer view</h1>
          <p>Let customers approve quotes, view invoices, request work and message the owner — while Command keeps control.</p>
        </div>

        <div className="freshPortalStats">
          <div>
            <b>{items.length}</b>
            <small>customers</small>
          </div>
          <div>
            <b>{approved}</b>
            <small>approved</small>
          </div>
          <div>
            <b>{requests}</b>
            <small>open requests</small>
          </div>
          <div>
            <b>${money}</b>
            <small>visible invoices</small>
          </div>
        </div>
      </div>

      <div className="freshPortalLayout">
        <aside className="freshPortalList">
          <header>
            <div>
              <b>Portal sessions</b>
              <span>Customer-facing preview</span>
            </div>
            <button type="button" onClick={resetPortal}>Reset</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.client}</b>
              <span>{item.quote} · {item.quoteStatus}</span>
              <small>{item.requestStatus}</small>
            </button>
          ))}
        </aside>

        {selected && (
          <article className="freshPortalDetail">
            <div className="freshPortalCardHead">
              <div>
                <span>Customer</span>
                <h2>{selected.client}</h2>
                <p>Preview of what this customer could see without entering the owner app.</p>
              </div>

              <button type="button" onClick={sendPortalIssue}>
                Send message to Command
              </button>
            </div>

            <div className="freshPortalCards">
              <section>
                <span>Quote</span>
                <h3>{selected.quote}</h3>
                <p>{selected.quoteTitle}</p>
                <b>${selected.quoteAmount}</b>
                <small>{selected.quoteStatus}</small>

                <div className="freshPortalActions">
                  <button type="button" onClick={() => updatePortal(selected.id, { quoteStatus: "Approved" })}>
                    Approve quote
                  </button>
                  <button type="button" onClick={() => onNavigate?.("quotes")}>
                    Owner quote view
                  </button>
                </div>
              </section>

              <section>
                <span>Invoice</span>
                <h3>{selected.invoice}</h3>
                <p>Customer can see amount and status.</p>
                <b>${selected.invoiceAmount}</b>
                <small>{selected.invoiceStatus}</small>

                <div className="freshPortalActions">
                  <button type="button" onClick={() => updatePortal(selected.id, { invoiceStatus: "Viewed" })}>
                    Mark viewed
                  </button>
                  <button type="button" onClick={() => onNavigate?.("invoices")}>
                    Owner invoice view
                  </button>
                </div>
              </section>

              <section>
                <span>Request</span>
                <h3>{selected.request}</h3>
                <p>{selected.message}</p>
                <b>{selected.requestStatus}</b>
                <small>Customer request queue</small>

                <div className="freshPortalActions">
                  <button type="button" onClick={() => updatePortal(selected.id, { requestStatus: "Done" })}>
                    Mark handled
                  </button>
                  <button type="button" onClick={() => onNavigate?.("jobs")}>
                    Create job
                  </button>
                </div>
              </section>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
