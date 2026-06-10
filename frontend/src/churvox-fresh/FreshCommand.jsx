import React from "react";
import FreshCommandFlow from "./FreshCommandFlow";

const commandFilters = ["Pending", "Approved", "Edited", "Declined", "All"];

const seedBoxes = [
  {
    id: "invoice-ready",
    group: "Money",
    title: "Invoice ready",
    info: "Aroha Property Care · $85 draft",
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
    info: "Birchville Rentals · 6 days no reply",
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
    info: "Birchville Rentals · billing email blank",
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
    info: "Driveway clean · tenant access not confirmed",
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

export default function FreshCommand({ onNavigate }) {
  const [boxes, setBoxes] = React.useState(loadCommandBoxes);
  const [selectedId, setSelectedId] = React.useState(null);
  const [activity, setActivity] = React.useState(loadCommandActivity);
  const [filter, setFilter] = React.useState("Pending");

  const selected = boxes.find((box) => box.id === selectedId);

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
        <p>Small boxes show what needs your decision. Open a box, review the slip, then approve, edit or decline.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard">
          <h2>{pendingCount}</h2>
          <p>Pending boxes</p>
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


      <FreshCommandFlow onNavigate={onNavigate} />

      <section className="freshCommandFilterBar">
        {commandFilters.map((item) => (
          <button
            type="button"
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            <span>{item}</span>
            <b>{filterCounts[item]}</b>
          </button>
        ))}
      </section>

      <section className="freshCommandBoard">
        {visibleBoxes.map((box) => (
          <button
            type="button"
            className={`freshCommandBox ${box.status !== "Pending" ? "isDone" : ""}`}
            key={box.id}
            onClick={() => setSelectedId(box.id)}
          >
            <span className="freshCommandPill">{box.group}</span>
            <strong>{box.title}</strong>
            <em>{box.info}</em>
            <small>{box.status === "Pending" ? box.urgency : box.status}</small>
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
          <section className="freshSlipModal" onClick={(event) => event.stopPropagation()}>
            <header className="freshSlipHead">
              <span>{selected.group}</span>
              <h2>{selected.title}</h2>
              <p>{selected.info}</p>
            </header>

            <div className="freshSlipBody">
              <div className="freshSlipRow">
                <b>Status</b>
                <p>{selected.status}</p>
              </div>

              <div className="freshSlipRow">
                <b>AI found</b>
                <p>{selected.found}</p>
              </div>

              <div className="freshSlipRow">
                <b>AI prepared</b>
                <p>{selected.prepared}</p>
              </div>

              <div className="freshSlipRow">
                <b>Why it matters</b>
                <p>{selected.why}</p>
              </div>

              <label className="freshField">
                <span>Editable owner instruction</span>
                <textarea
                  defaultValue={selected.editedInstruction}
                  onBlur={(event) => saveInstruction(event.target.value)}
                />
              </label>

              <div className="freshSlipActions">
                <button className="freshPrimary" onClick={() => updateSelected("Approved")}>Approve</button>
                <button className="freshDark" onClick={() => updateSelected("Edited")}>Save edit</button>
                <button className="freshGhost" onClick={() => updateSelected("Declined")}>Decline</button>
                <button className="freshOrange" onClick={openArea}>Open {selected.area}</button>
              </div>

              <button type="button" className="freshClose" onClick={() => setSelectedId(null)}>
                Close slip
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
