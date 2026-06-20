import React from "react";
import { readFreshFocus } from "./freshFocus";

const commandFilters = ["Pending", "Approved", "Edited", "Declined", "All"];

const seedBoxes = [
  {
    id: "invoice-ready",
    group: "Money",
    title: "Invoice ready",
    info: "Completed job · $85 draft invoice",
    urgency: "Approve today",
    found: "Completed lawn service has price, job notes and GST ready.",
    prepared: "Churvox prepared a draft invoice from the completed job record.",
    why: "The customer should not receive anything until the owner approves the money.",
    owner: "Approve invoice, save an edit, or decline the draft.",
    area: "Invoices",
    page: "invoices",
  },
  {
    id: "quote-follow-up",
    group: "Quotes",
    title: "Follow-up needed",
    info: "Sent quote · 6 days no reply",
    urgency: "Could recover work",
    found: "A sent quote has had no response for 6 days.",
    prepared: "Churvox prepared a polite follow-up message.",
    why: "A follow-up can recover the job without you digging through old quotes.",
    owner: "Approve follow-up, edit wording, or ignore for now.",
    area: "Quotes",
    page: "quotes",
  },
  {
    id: "client-billing",
    group: "Clients",
    title: "Billing detail missing",
    info: "Client record · billing email blank",
    urgency: "Setup issue",
    found: "The client has service details but no billing email.",
    prepared: "Churvox paused invoice automation for this client.",
    why: "Invoices and reminders should not run with missing billing details.",
    owner: "Open client and complete billing details.",
    area: "Clients",
    page: "clients",
  },
  {
    id: "job-access",
    group: "Jobs",
    title: "Job needs access",
    info: "Job access · access not confirmed",
    urgency: "Blocked",
    found: "A requested job has no confirmed access instructions.",
    prepared: "Churvox marked the job as blocked before dispatch.",
    why: "Sending a worker without access wastes time and looks unprofessional.",
    owner: "Confirm access, move the job, or send message to client.",
    area: "Jobs",
    page: "jobs",
  },
  {
    id: "worker-ack",
    group: "Team",
    title: "Worker not acknowledged",
    info: "Today route · one job not accepted",
    urgency: "Before route starts",
    found: "A worker has not acknowledged an assigned job.",
    prepared: "Churvox prepared an owner warning before the day starts.",
    why: "You need to know the job is accepted before relying on the route.",
    owner: "Message worker, reassign, or leave as watched.",
    area: "Dispatch",
    page: "dispatch",
  },
  {
    id: "setup-paused",
    group: "Setup",
    title: "Automation paused",
    info: "1 client missing billing setup",
    urgency: "Safe hold",
    found: "Automation is ready but the record is not clean enough.",
    prepared: "Churvox held the action back and created a setup warning.",
    why: "Bad setup should never trigger customer-facing automation.",
    owner: "Fix setup, then approve automation.",
    area: "Settings",
    page: "settings",
  },
];

const COMMAND_STORAGE_KEY = "churvox:fresh-command-boxes:v1";
const COMMAND_ACTIVITY_KEY = "churvox:fresh-command-activity:v1";

function withState(box) {
  return {
    ...box,
    status: "Pending",
    editedInstruction: box.owner,
  };
}

function loadCommandBoxes() {
  const fallback = seedBoxes.map(withState);

  try {
    if (typeof window === "undefined") return fallback;

    const saved = window.localStorage.getItem(COMMAND_STORAGE_KEY);
    if (!saved) return fallback;

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return fallback;

    return fallback.map((baseBox) => {
      const savedBox = parsed.find((item) => item.id === baseBox.id);
      if (!savedBox) return baseBox;

      return {
        ...baseBox,
        status: savedBox.status || baseBox.status,
        editedInstruction: savedBox.editedInstruction || baseBox.editedInstruction,
      };
    });
  } catch {
    return fallback;
  }
}

function loadCommandActivity() {
  try {
    if (typeof window === "undefined") return [];

    const saved = window.localStorage.getItem(COMMAND_ACTIVITY_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function makeActivity(box, status) {
  return {
    id: `${box.id}-${Date.now()}`,
    status,
    title: box.title,
    group: box.group,
    info: box.info,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

function readFreshRiskList(key) {
  try {
    if (typeof window === "undefined") return [];

    const saved = window.localStorage.getItem(key);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function money(value) {
  return `$${Number(value || 0).toFixed(0)}`;
}

function buildRiskScanIssues() {
  const jobs = readFreshRiskList("churvox:fresh-jobs:v1");
  const clients = readFreshRiskList("churvox:fresh-clients:v1");
  const quotes = readFreshRiskList("churvox:fresh-quotes:v1");
  const invoices = readFreshRiskList("churvox:fresh-invoices:v1");
  const payroll = readFreshRiskList("churvox:fresh-payroll:v1");

  return [
    ...jobs
      .filter((job) => job.status === "Blocked")
      .map((job) => ({
        id: `scan-job-${job.id}`,
        group: "Scan",
        title: "Blocked job found",
        info: `${job.client} · ${job.title}`,
        urgency: "Owner review",
        found: `The job "${job.title}" is blocked.`,
        prepared: "Churvox prepared a Command review slip instead of sending it to dispatch.",
        why: job.risk || "A blocked job can waste worker time if it is dispatched.",
        owner: "Fix access, reschedule, reassign, or decline the job.",
        area: "Jobs",
        page: "jobs",
        fromInbox: true,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      })),

    ...clients
      .filter((client) => client.status === "Needs setup" || !client.billingEmail)
      .map((client) => ({
        id: `scan-client-${client.id}`,
        group: "Scan",
        title: "Client setup gap",
        info: `${client.name} · billing not clean`,
        urgency: "Setup issue",
        found: `${client.name} is missing clean billing setup.`,
        prepared: "Churvox paused customer-facing automation for this client.",
        why: "Invoices and reminders should not run until billing details are clean.",
        owner: "Open the client and complete billing details.",
        area: "Clients",
        page: "clients",
        fromInbox: true,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      })),

    ...quotes
      .filter((quote) => quote.status === "Sent")
      .map((quote) => ({
        id: `scan-quote-${quote.id}`,
        group: "Scan",
        title: "Quote follow-up found",
        info: `${quote.client} · ${quote.id}`,
        urgency: "Could recover work",
        found: `Quote ${quote.id} is sent and waiting.`,
        prepared: "Churvox prepared a follow-up review slip.",
        why: "Follow-ups can recover work, but the owner should approve the message first.",
        owner: "Approve follow-up, edit wording, or leave it watched.",
        area: "Quotes",
        page: "quotes",
        fromInbox: true,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      })),

    ...invoices
      .filter((invoice) => invoice.status === "Overdue" || invoice.status === "Draft")
      .map((invoice) => ({
        id: `scan-invoice-${invoice.id}`,
        group: "Scan",
        title: invoice.status === "Overdue" ? "Overdue invoice found" : "Draft invoice ready",
        info: `${invoice.client} · ${invoice.id} · ${money(invoice.amount)}`,
        urgency: invoice.status === "Overdue" ? "Money risk" : "Approve today",
        found: `Invoice ${invoice.id} is ${invoice.status.toLowerCase()}.`,
        prepared: "Churvox prepared an invoice review slip.",
        why: invoice.status === "Overdue"
          ? "Overdue money should be reviewed before another reminder is sent."
          : "Draft invoices should not be sent without owner approval.",
        owner: "Approve, edit, mark paid, or send a follow-up.",
        area: "Invoices",
        page: "invoices",
        fromInbox: true,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      })),

    ...payroll
      .filter((person) => person.status === "Needs review")
      .map((person) => ({
        id: `scan-payroll-${person.id}`,
        group: "Scan",
        title: "Payroll review found",
        info: `${person.name} · needs review`,
        urgency: "Owner review",
        found: `${person.name} has payroll marked as needs review.`,
        prepared: "Churvox prepared a payroll workspace review slip.",
        why: "Payroll should be checked by the owner before export.",
        owner: "Review hours, adjustment and gross pay. Do not submit tax or bank files.",
        area: "Payroll",
        page: "payroll",
        fromInbox: true,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      })),
  ];
}


const selectedFilterButtonStyle = {
  background: "#111827",
  backgroundColor: "#111827",
  borderColor: "#111827",
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
};

const selectedFilterTextStyle = {
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
  opacity: 1,
};

const selectedFilterCountStyle = {
  background: "#f97316",
  backgroundColor: "#f97316",
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
  opacity: 1,
  borderRadius: "999px",
};

export default function FreshCommand({ onNavigate }) {
  const [boxes, setBoxes] = React.useState(loadCommandBoxes);
  const [selectedId, setSelectedId] = React.useState(() => readFreshFocus("command", null));
  const [activity, setActivity] = React.useState(loadCommandActivity);
  const [filter, setFilter] = React.useState("Pending");

  const selected = boxes.find((box) => box.id === selectedId);

  const commandCardInfoStyle = {
    color: "#111827",
    WebkitTextFillColor: "#111827",
    opacity: 1,
    fontWeight: 850,
    textShadow: "none",
    mixBlendMode: "normal",
  };

  const commandCardUrgencyStyle = {
    color: "#334155",
    WebkitTextFillColor: "#334155",
    opacity: 1,
    fontWeight: 900,
    textShadow: "none",
    mixBlendMode: "normal",
  };


  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(COMMAND_STORAGE_KEY, JSON.stringify(boxes));
      }
    } catch {
      // Fresh preview can still run without local storage.
    }
  }, [boxes]);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(COMMAND_ACTIVITY_KEY, JSON.stringify(activity));
      }
    } catch {
      // Fresh preview can still run without local storage.
    }
  }, [activity]);

  const pendingCount = boxes.filter((box) => box.status === "Pending").length;
  const doneCount = boxes.filter((box) => box.status !== "Pending").length;
  const moneyWatched = "$695";
  const visibleBoxes =
    filter === "All"
      ? boxes
      : boxes.filter((box) => box.status === filter);

  const filterCounts = commandFilters.reduce((counts, item) => {
    counts[item] = item === "All"
      ? boxes.length
      : boxes.filter((box) => box.status === item).length;

    return counts;
  }, {});

  function updateSelected(status) {
    if (!selected) return;

    setBoxes((current) =>
      current.map((box) =>
        box.id === selected.id
          ? { ...box, status }
          : box
      )
    );

    setActivity((current) => [makeActivity(selected, status), ...current].slice(0, 8));
    setSelectedId(null);
  }

  function saveInstruction(value) {
    if (!selected) return;

    setBoxes((current) =>
      current.map((box) =>
        box.id === selected.id
          ? { ...box, editedInstruction: value, status: "Edited" }
          : box
      )
    );
  }

  function openArea() {
    if (!selected) return;
    onNavigate?.(selected.page);
    setSelectedId(null);
  }

  function scanFreshRisks() {
    const scanIssues = buildRiskScanIssues();

    try {
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
        const existing = saved ? JSON.parse(saved) : [];
        const safeExisting = Array.isArray(existing) ? existing : [];
        const existingIds = new Set(safeExisting.map((item) => item.id));

        const newIssues = scanIssues.filter((item) => !existingIds.has(item.id));
        const merged = [...newIssues, ...safeExisting].slice(0, 20);

        window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify(merged));

        window.dispatchEvent(
          new CustomEvent("churvox:fresh-data-updated", {
            detail: { type: "risk-scan" },
          })
        );
      }
    } catch {
      // Fresh preview keeps working without local storage.
    }

    setBoxes(loadCommandBoxes());
    setFilter("Pending");

    if (scanIssues.length) {
      setActivity((current) => [
        {
          id: `scan-${Date.now()}`,
          status: "Scanned",
          title: `${scanIssues.length} risks checked`,
          group: "Command",
          info: "Fresh data risk scan",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...current,
      ].slice(0, 8));
    }
  }

  function resetCommand() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(COMMAND_STORAGE_KEY);
        window.localStorage.removeItem(COMMAND_ACTIVITY_KEY);
      }
    } catch {
      // Ignore storage reset errors in preview.
    }

    setBoxes(seedBoxes.map(withState));
    setActivity([]);
    setSelectedId(null);
  }

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Command</span>
        <h1>Command</h1>
        <p>Only the work that needs your decision. Review the slip, approve it, edit it, or open the right area.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard">
          <h2>{pendingCount}</h2>
          <p>Needs decision</p>
        </aside>
        <aside className="freshCard">
          <h2>{doneCount}</h2>
          <p>Handled today</p>
        </aside>
        <aside className="freshCard">
          <h2>{moneyWatched}</h2>
          <p>Money watched</p>
        </aside>
      </section>


      <section className="freshCommandFilterBar">
        {commandFilters.map((item) => (
          <button
            type="button"
            key={item}
            className={filter === item ? "active" : ""}
            style={filter === item ? selectedFilterButtonStyle : undefined}
            onClick={() => setFilter(item)}
          >
            <span style={filter === item ? selectedFilterTextStyle : undefined}>{item}</span>
            <b style={filter === item ? selectedFilterCountStyle : undefined}>{filterCounts[item]}</b>
          </button>
        ))}
      </section>

      <section className="freshCommandBoard" aria-label="Command decisions">
        {visibleBoxes.map((box) => (
          <button
            type="button"
            className={`freshCommandBox ${box.status !== "Pending" ? "isDone" : ""}`}
            key={box.id}
            onClick={() => setSelectedId(box.id)}
          >
            <span className="freshCommandPill">{box.group}</span>
            <strong>{box.title}</strong>
            <em style={commandCardInfoStyle}>{box.info}</em>
            <small style={commandCardUrgencyStyle}>{box.status === "Pending" ? box.urgency : box.status}</small>
          </button>
        ))}

        {visibleBoxes.length === 0 && (
          <aside className="freshCommandEmpty">
            <b>No {filter.toLowerCase()} boxes</b>
            <span>Change filter or reset Command boxes.</span>
          </aside>
        )}
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>Quick owner moves</h2>
          <p>Command stays clean. It only shows decisions, risk and admin ready for approval.</p>
          <div className="freshActions">
            <button className="freshPrimary" onClick={scanFreshRisks}>Scan fresh data</button>
            <button className="freshPrimary" onClick={() => onNavigate?.("jobs")}>Create job</button>
            <button className="freshOrange" onClick={() => onNavigate?.("quotes")}>Create quote</button>
            <button className="freshDark" onClick={() => onNavigate?.("clients")}>Add client</button>
          </div>
        </section>

        <aside className="freshCard">
          <h2>Owner activity</h2>

          {activity.length === 0 && (
            <div className="freshItem">
              <b>No decisions yet</b>
              <span>Approve, decline or edit a Command slip to create activity.</span>
            </div>
          )}

          {activity.map((item) => (
            <div className="freshItem freshActivityItem" key={item.id}>
              <b>{item.status} · {item.title}</b>
              <span>{item.group} · {item.info} · {item.time}</span>
            </div>
          ))}

          <div className="freshActions">
            <button className="freshGhost" onClick={resetCommand}>Reset Command boxes</button>
          </div>
        </aside>
      </section>

      {selected && (
        <div className="freshSlipOverlay" onClick={() => setSelectedId(null)}>
          <section className="freshSlipModal freshWorkModal" onClick={(event) => event.stopPropagation()}>
            <header className="freshSlipHead">
              <span>{selected.group}</span>
              <h2>{selected.page === "invoices" ? "Draft invoice" : selected.page === "jobs" || selected.page === "dispatch" ? "Job detail" : selected.page === "clients" ? "Client details" : selected.page === "quotes" ? "Quote follow-up" : selected.title}</h2>
              <p>{selected.info}</p>
            </header>

            <div className="freshWorkForm">
              {selected.page === "invoices" && (
                <>
                  <label><span>Customer</span><input defaultValue="Aroha Property Care" /></label>
                  <label><span>Invoice amount</span><input defaultValue="$85.00" /></label>
                  <label><span>Description</span><textarea defaultValue="Completed lawn service. GST ready. Draft only until owner approves." /></label>
                  <label><span>Status</span><select defaultValue="draft"><option value="draft">Draft — owner review</option><option value="sent">Ready to send</option></select></label>
                </>
              )}

              {(selected.page === "jobs" || selected.page === "dispatch") && (
                <>
                  <label><span>Job</span><input defaultValue={selected.info} /></label>
                  <label><span>Access / issue</span><textarea defaultValue={selected.owner} /></label>
                  <label><span>Status</span><select defaultValue="blocked"><option value="blocked">Blocked</option><option value="assigned">Assigned</option><option value="ready">Ready for worker</option></select></label>
                  <label><span>Owner note</span><textarea defaultValue="Confirm access before sending worker." /></label>
                </>
              )}

              {selected.page === "clients" && (
                <>
                  <label><span>Client</span><input defaultValue="Birchville Rentals" /></label>
                  <label><span>Billing email</span><input placeholder="Add billing email" /></label>
                  <label><span>Setup note</span><textarea defaultValue="Billing details missing. Add email before invoice automation continues." /></label>
                </>
              )}

              {selected.page === "quotes" && (
                <>
                  <label><span>Client</span><input defaultValue="Birchville Rentals" /></label>
                  <label><span>Follow-up message</span><textarea defaultValue="Hi, just checking whether you would like us to go ahead with the quote. Happy to help when you're ready." /></label>
                  <label><span>Status</span><select defaultValue="waiting"><option value="waiting">Waiting reply</option><option value="send">Ready to send</option></select></label>
                </>
              )}

              {selected.page === "payroll" && (
                <>
                  <label><span>Payroll item</span><input defaultValue={selected.info} /></label>
                  <label><span>Owner check</span><textarea defaultValue="Review hours and export CSV only. Do not submit tax or create bank files." /></label>
                </>
              )}

              {selected.page === "settings" && (
                <>
                  <label><span>Setup issue</span><input defaultValue={selected.title} /></label>
                  <label><span>Fix needed</span><textarea defaultValue={selected.owner} /></label>
                </>
              )}

              {!["invoices", "jobs", "dispatch", "clients", "quotes", "payroll", "settings"].includes(selected.page) && (
                <label><span>Details</span><textarea defaultValue={selected.owner} /></label>
              )}

              <div className="freshSlipActions">
                <button className="freshPrimary" onClick={() => updateSelected("Approved")}>{selected.page === "invoices" ? "Approve draft" : "Approve"}</button>
                <button className="freshDark" onClick={() => updateSelected("Edited")}>Save changes</button>
                <button className="freshGhost" onClick={() => updateSelected("Declined")}>Decline</button>
                <button className="freshOrange" onClick={openArea}>Open {selected.area}</button>
              </div>

              <button type="button" className="freshClose" onClick={() => setSelectedId(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
