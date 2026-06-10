import React from "react";

const commandBoxes = [
  {
    group: "Money",
    title: "Invoice ready",
    info: "Aroha Property Care · $85 draft",
    urgency: "Approve today",
    found: "Completed lawn service has price, job notes and GST ready.",
    prepared: "Churvox prepared a draft invoice from the completed job record.",
    why: "The customer should not receive anything until the owner approves the money.",
    owner: "Approve invoice, save an edit, or decline the draft.",
    area: "Invoices",
  },
  {
    group: "Quotes",
    title: "Follow-up needed",
    info: "Birchville Rentals · 6 days no reply",
    urgency: "Could recover work",
    found: "A sent quote has had no response for 6 days.",
    prepared: "Churvox prepared a polite follow-up message.",
    why: "A follow-up can recover the job without you digging through old quotes.",
    owner: "Approve follow-up, edit wording, or ignore for now.",
    area: "Quotes",
  },
  {
    group: "Clients",
    title: "Billing detail missing",
    info: "Birchville Rentals · billing email blank",
    urgency: "Setup issue",
    found: "The client has service details but no billing email.",
    prepared: "Churvox paused invoice automation for this client.",
    why: "Invoices and reminders should not run with missing billing details.",
    owner: "Open client and complete billing details.",
    area: "Clients",
  },
  {
    group: "Jobs",
    title: "Job needs access",
    info: "Driveway clean · tenant access not confirmed",
    urgency: "Blocked",
    found: "A requested job has no confirmed access instructions.",
    prepared: "Churvox marked the job as blocked before dispatch.",
    why: "Sending a worker without access wastes time and looks unprofessional.",
    owner: "Confirm access, move the job, or send message to client.",
    area: "Jobs",
  },
  {
    group: "Team",
    title: "Worker not acknowledged",
    info: "Today route · one job not accepted",
    urgency: "Before route starts",
    found: "A worker has not acknowledged an assigned job.",
    prepared: "Churvox prepared an owner warning before the day starts.",
    why: "You need to know the job is accepted before relying on the route.",
    owner: "Message worker, reassign, or leave as watched.",
    area: "Dispatch",
  },
  {
    group: "Setup",
    title: "Automation paused",
    info: "1 client missing billing setup",
    urgency: "Safe hold",
    found: "Automation is ready but the record is not clean enough.",
    prepared: "Churvox held the action back and created a setup warning.",
    why: "Bad setup should never trigger customer-facing automation.",
    owner: "Fix setup, then approve automation.",
    area: "Settings",
  },
];

const pulse = [
  ["6", "Command boxes"],
  ["3", "Need owner today"],
  ["$695", "Money watched"],
];

export default function FreshCommand() {
  const [selected, setSelected] = React.useState(null);

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Command</span>
        <h1>Command</h1>
        <p>Small boxes show what needs your decision. Open a box to review the full AI-prepared slip.</p>
      </header>

      <section className="freshCommandPulse">
        {pulse.map(([value, label]) => (
          <aside className="freshCard" key={label}>
            <h2>{value}</h2>
            <p>{label}</p>
          </aside>
        ))}
      </section>

      <section className="freshCommandBoard">
        {commandBoxes.map((box) => (
          <button type="button" className="freshCommandBox" key={box.title} onClick={() => setSelected(box)}>
            <span className="freshCommandPill">{box.group}</span>
            <strong>{box.title}</strong>
            <em>{box.info}</em>
            <small>{box.urgency}</small>
          </button>
        ))}
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>Quick owner moves</h2>
          <p>Command stays clean. It only shows decisions, risk and admin ready for approval.</p>
          <div className="freshActions">
            <button className="freshPrimary">Create job</button>
            <button className="freshOrange">Create quote</button>
            <button className="freshDark">Add client</button>
          </div>
        </section>

        <aside className="freshCard">
          <h2>Command rule</h2>
          <div className="freshItem need">
            <b>Box first</b>
            <span>Quick info only, so the owner can scan fast.</span>
          </div>
          <div className="freshItem">
            <b>Slip second</b>
            <span>Full details only open when the owner chooses.</span>
          </div>
        </aside>
      </section>

      {selected && (
        <div className="freshSlipOverlay" onClick={() => setSelected(null)}>
          <section className="freshSlipModal" onClick={(event) => event.stopPropagation()}>
            <header className="freshSlipHead">
              <span>{selected.group}</span>
              <h2>{selected.title}</h2>
              <p>{selected.info}</p>
            </header>

            <div className="freshSlipBody">
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
                <textarea defaultValue={selected.owner} />
              </label>

              <div className="freshSlipActions">
                <button className="freshPrimary">Approve</button>
                <button className="freshDark">Save edit</button>
                <button className="freshGhost">Decline</button>
                <button className="freshOrange">Open {selected.area}</button>
              </div>

              <button type="button" className="freshClose" onClick={() => setSelected(null)}>
                Close slip
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
