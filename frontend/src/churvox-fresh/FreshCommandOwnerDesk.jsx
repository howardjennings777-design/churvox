import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const starterSlips = [
  {
    id: "starter-money-1",
    group: "AI Invoice Checker",
    title: "Invoice ready for approval",
    info: "Belmont Customer · $145 · possible $45 extra",
    urgency: "High",
    found: "Job was completed with photos. Worker note says extra hedge trim was completed.",
    prepared: "Invoice draft prepared with a possible extra line: Hedge trim — $45 + GST.",
    why: "This may be unbilled work. Owner should approve before sending.",
    owner: "Approve, edit, open invoice, or ignore.",
    area: "Money",
    page: "invoicecheck",
    createdAt: "Today",
  },
  {
    id: "starter-day-1",
    group: "AI Plan My Day",
    title: "Today’s plan is ready",
    info: "5 jobs · 1 quote · 2 worker briefs",
    urgency: "High",
    found: "Churvox found today’s work, route order and worker brief needs.",
    prepared: "Best order prepared with dispatch notes and invoice block at the end of the day.",
    why: "Owner should know what to do first without hunting through pages.",
    owner: "Approve route, edit order, open dispatch, or ignore.",
    area: "Today",
    page: "planday",
    createdAt: "Today",
  },
  {
    id: "starter-money-2",
    group: "AI Cashflow Coach",
    title: "$255 overdue needs chasing",
    info: "3 invoices · friendly reminders ready",
    urgency: "High",
    found: "Three invoices are overdue by more than 7 days.",
    prepared: "Friendly payment reminders are ready for owner approval.",
    why: "Cashflow improves when overdue money is chased early.",
    owner: "Send reminders, edit, snooze, or ignore.",
    area: "Money",
    page: "cashflowai",
    createdAt: "Today",
  },
  {
    id: "starter-customer-1",
    group: "AI Recurring Saver",
    title: "Regular customer may be slipping",
    info: "Wainuiomata Customer · 5 weeks since last visit",
    urgency: "Medium",
    found: "Customer is past their normal booking cycle.",
    prepared: "Rebooking message prepared for next week.",
    why: "Repeat work is easier to save than new work is to win.",
    owner: "Send, edit, open client, or ignore.",
    area: "Customers",
    page: "recurringsaver",
    createdAt: "Today",
  },
  {
    id: "starter-setup-1",
    group: "AI Setup Assistant",
    title: "Invoice settings need checking",
    info: "GST · invoice details · send flow",
    urgency: "Medium",
    found: "Invoice settings should be confirmed before launch.",
    prepared: "Open invoice checker and test invoice from completed job.",
    why: "Job to invoice to paid is the core money flow.",
    owner: "Fix now, later, open settings, or ignore.",
    area: "Setup",
    page: "setupassistant",
    createdAt: "Today",
  },
];

function safeReadSlips() {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) && parsed.length ? parsed : starterSlips;
  } catch {
    return starterSlips;
  }
}

function safeSaveSlips(slips) {
  try {
    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify(slips.slice(0, 160)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "command-owner-desk" } }));
  } catch {
    // Preview keeps working without storage.
  }
}

function getArea(slip) {
  const raw = `${slip.area || ""} ${slip.group || ""} ${slip.title || ""} ${slip.page || ""}`.toLowerCase();

  if (raw.includes("setup") || raw.includes("first run") || raw.includes("launch")) return "Setup";
  if (raw.includes("invoice") || raw.includes("cash") || raw.includes("payment") || raw.includes("price") || raw.includes("profit") || raw.includes("quote")) return "Money";
  if (raw.includes("plan") || raw.includes("worker") || raw.includes("schedule") || raw.includes("dispatch") || raw.includes("materials")) return "Today";
  if (raw.includes("customer") || raw.includes("recurring") || raw.includes("review") || raw.includes("message") || raw.includes("rework") || raw.includes("upsell")) return "Customers";
  return "Needs approval";
}

function getStatus(slip) {
  return slip.status || "open";
}

function urgencyRank(urgency) {
  if (urgency === "High") return 1;
  if (urgency === "Medium") return 2;
  if (urgency === "Low") return 3;
  return 4;
}

export default function FreshCommandOwnerDesk({ onNavigate }) {
  const [mode, setMode] = React.useState("daily");
  const [slips, setSlips] = React.useState(safeReadSlips);
  const [activeGroup, setActiveGroup] = React.useState("Needs approval");
  const [editing, setEditing] = React.useState(null);
  const [editText, setEditText] = React.useState("");

  React.useEffect(() => {
    const refresh = () => setSlips(safeReadSlips());
    window.addEventListener("storage", refresh);
    window.addEventListener("churvox:fresh-data-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("churvox:fresh-data-updated", refresh);
    };
  }, []);

  const enriched = React.useMemo(() => {
    return slips
      .map((slip) => ({ ...slip, areaGroup: getArea(slip), status: getStatus(slip) }))
      .sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency));
  }, [slips]);

  const openSlips = enriched.filter((slip) => slip.status === "open" || slip.status === "edited");
  const doneSlips = enriched.filter((slip) => slip.status !== "open" && slip.status !== "edited");
  const important = openSlips.filter((slip) => slip.urgency === "High");
  const money = openSlips.filter((slip) => slip.areaGroup === "Money");
  const today = openSlips.filter((slip) => slip.areaGroup === "Today");
  const setup = openSlips.filter((slip) => slip.areaGroup === "Setup");

  const groups = ["Needs approval", "Money", "Today", "Customers", "Setup"];
  const visible = activeGroup === "Needs approval"
    ? openSlips
    : openSlips.filter((slip) => slip.areaGroup === activeGroup);

  function updateSlip(id, patch) {
    const next = slips.map((slip) => slip.id === id ? { ...slip, ...patch } : slip);
    setSlips(next);
    safeSaveSlips(next);
  }

  function clearDemo() {
    setSlips(starterSlips);
    safeSaveSlips(starterSlips);
    setActiveGroup("Needs approval");
  }

  function startEdit(slip) {
    setEditing(slip);
    setEditText(slip.prepared || "");
  }

  function saveEdit() {
    if (!editing) return;
    updateSlip(editing.id, { prepared: editText, status: "edited" });
    setEditing(null);
    setEditText("");
  }

  return (
    <section className="freshCommandDeskPage">
      <div className="freshCommandDeskHero">
        <div>
          <span>Command</span>
          <h1>{mode === "setup" ? "Let’s get your business ready." : "Churvox has checked your business."}</h1>
          <p>
            {mode === "setup"
              ? "Setup mode shows what a new owner must finish before Churvox can run properly."
              : "Daily mode shows the work AI has already prepared: money, jobs, workers, customers, risks and setup gaps."}
          </p>
        </div>

        <div className="freshCommandDeskStats">
          <div><b>{openSlips.length}</b><small>open actions</small></div>
          <div><b>{important.length}</b><small>important</small></div>
          <div><b>{money.length}</b><small>money</small></div>
          <div><b>{today.length}</b><small>today</small></div>
        </div>
      </div>

      <div className="freshCommandMorning">
        <div>
          <b>{mode === "setup" ? "Setup Assistant" : "Good morning. Churvox prepared actions for approval."}</b>
          <p>
            {mode === "setup"
              ? `${setup.length || 1} setup items need checking before launch.`
              : `${openSlips.length} open actions. ${important.length} important. ${money.length} money-related. ${today.length} for today.`}
          </p>
        </div>

        <div className="freshCommandMorningActions">
          <button type="button" onClick={() => setMode(mode === "setup" ? "daily" : "setup")}>
            {mode === "setup" ? "Daily mode" : "Setup mode"}
          </button>
          <button type="button" onClick={() => onNavigate?.("planday")}>Plan my day</button>
          <button type="button" onClick={() => onNavigate?.("askchurvox")}>Ask Churvox</button>
          <button type="button" onClick={clearDemo}>Reload sample slips</button>
        </div>
      </div>

      <div className="freshCommandFocusRow">
        <button type="button" onClick={() => setActiveGroup("Money")}>
          <b>Money ready</b>
          <span>{money.length} actions</span>
        </button>
        <button type="button" onClick={() => setActiveGroup("Today")}>
          <b>Plan today</b>
          <span>{today.length} actions</span>
        </button>
        <button type="button" onClick={() => setActiveGroup("Needs approval")}>
          <b>Review important</b>
          <span>{important.length} high priority</span>
        </button>
      </div>

      <div className="freshCommandTabs">
        {groups.map((group) => {
          const count = group === "Needs approval" ? openSlips.length : openSlips.filter((slip) => slip.areaGroup === group).length;
          return (
            <button
              type="button"
              key={group}
              className={activeGroup === group ? "active" : ""}
              onClick={() => setActiveGroup(group)}
            >
              <b>{group}</b>
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="freshCommandSlipList">
        {visible.length ? visible.map((slip) => (
          <article key={slip.id} className={`freshCommandSlip ${slip.urgency === "High" ? "high" : ""}`}>
            <header>
              <div>
                <span>{slip.areaGroup}</span>
                <h2>{slip.title || "Prepared action"}</h2>
                <small>{slip.group || "AI Operator"} · {slip.info || slip.urgency || "Ready"}</small>
              </div>
              <strong>{slip.urgency || "Medium"}</strong>
            </header>

            <div className="freshCommandSlipBody">
              <section>
                <b>AI found</b>
                <p>{slip.found || "Churvox found an item that needs owner review."}</p>
              </section>
              <section>
                <b>AI prepared</b>
                <p>{slip.prepared || "A prepared action is ready for owner approval."}</p>
              </section>
              <section>
                <b>Why it matters</b>
                <p>{slip.why || slip.owner || "This keeps admin moving while the owner stays in control."}</p>
              </section>
            </div>

            <div className="freshCommandSlipControls">
              <button type="button" onClick={() => updateSlip(slip.id, { status: "approved" })}>Approve</button>
              <button type="button" onClick={() => startEdit(slip)}>Edit</button>
              <button type="button" onClick={() => updateSlip(slip.id, { status: "snoozed" })}>Snooze</button>
              <button type="button" onClick={() => updateSlip(slip.id, { status: "ignored" })}>Ignore</button>
              <button type="button" onClick={() => onNavigate?.(slip.page || "smart")}>Open</button>
            </div>
          </article>
        )) : (
          <div className="freshCommandEmpty">
            <b>No open actions in {activeGroup}.</b>
            <p>That is good. Open another group, reload sample slips, or ask Churvox to prepare something.</p>
            <button type="button" onClick={() => onNavigate?.("askchurvox")}>Ask Churvox</button>
          </div>
        )}
      </div>

      {doneSlips.length > 0 && (
        <details className="freshCommandDone">
          <summary>Completed / ignored / snoozed slips ({doneSlips.length})</summary>
          <div>
            {doneSlips.slice(0, 12).map((slip) => (
              <button type="button" key={slip.id} onClick={() => updateSlip(slip.id, { status: "open" })}>
                <b>{slip.title}</b>
                <span>{slip.status} · restore</span>
              </button>
            ))}
          </div>
        </details>
      )}

      {editing && (
        <div className="freshCommandEditOverlay" role="dialog" aria-modal="true">
          <section>
            <header>
              <span>Edit prepared action</span>
              <h2>{editing.title}</h2>
              <p>Owner can change what AI prepared before approving.</p>
            </header>

            <textarea value={editText} onChange={(event) => setEditText(event.target.value)} />

            <div>
              <button type="button" onClick={saveEdit}>Save edit</button>
              <button type="button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
