import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const gaps = [
  {
    id: "gap-1",
    area: "Job",
    item: "Belmont lawn reset",
    severity: "High",
    missing: ["assigned worker", "before photos", "invoice method"],
    found: "Job is booked but not fully ready for completion and invoicing.",
    fix: "Assign Tama Worker, require photos and set invoice method to email.",
    page: "jobs",
  },
  {
    id: "gap-2",
    area: "Client",
    item: "Upper Hutt Lead",
    severity: "Medium",
    missing: ["phone number", "full address", "preferred time"],
    found: "Lead has quote interest but not enough contact details.",
    fix: "Ask customer for phone, full address and preferred visit time.",
    page: "clients",
  },
  {
    id: "gap-3",
    area: "Invoice",
    item: "INV-1009",
    severity: "High",
    missing: ["materials line", "GST check"],
    found: "Worker note mentions materials but invoice has no materials line.",
    fix: "Add materials line and confirm GST before sending.",
    page: "invoicecheck",
  },
  {
    id: "gap-4",
    area: "Team",
    item: "Mere Crew",
    severity: "Low",
    missing: ["region", "hourly rate"],
    found: "Team member profile is incomplete for scheduling and payroll.",
    fix: "Add default region and hourly rate.",
    page: "team",
  },
];

function sendGapToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `missing-info-${item.id}-${Date.now()}`,
      group: "AI Missing Info",
      title: `${item.area} missing information`,
      info: `${item.item} · ${item.severity}`,
      urgency: item.severity,
      found: item.found,
      prepared: item.fix,
      why: `Missing fields: ${item.missing.join(", ")}.`,
      owner: "Approve fix, edit, open related page, or ignore.",
      area: "Missing Info Detector",
      page: "missinginfo",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 50)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "missing-info" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshMissingInfo({ onNavigate }) {
  const [fixed, setFixed] = React.useState({});
  const high = gaps.filter((gap) => gap.severity === "High").length;
  const open = gaps.filter((gap) => !fixed[gap.id]).length;

  return (
    <section className="freshMissingPage">
      <div className="freshMissingHero">
        <div>
          <span>AI Missing Info Detector</span>
          <h1>Churvox finds gaps before they become mistakes</h1>
          <p>Instead of waiting for users to discover broken jobs, quotes or invoices, AI flags missing details and prepares the fix.</p>
        </div>

        <div className="freshMissingStats">
          <div><b>{gaps.length}</b><small>checks</small></div>
          <div><b>{high}</b><small>high risk</small></div>
          <div><b>{open}</b><small>open gaps</small></div>
          <div><b>Fix</b><small>one click</small></div>
        </div>
      </div>

      <div className="freshMissingGrid">
        {gaps.map((gap) => (
          <article key={gap.id} className={fixed[gap.id] ? "freshMissingCard fixed" : "freshMissingCard"}>
            <header>
              <span>{gap.severity}</span>
              <h2>{gap.area}: {gap.item}</h2>
            </header>

            <div className="freshMissingChips">
              {gap.missing.map((item) => <small key={item}>{item}</small>)}
            </div>

            <p><strong>AI found:</strong> {gap.found}</p>
            <p><strong>AI prepared:</strong> {gap.fix}</p>

            <div className="freshMissingButtons">
              <button type="button" onClick={() => setFixed({ ...fixed, [gap.id]: true })}>
                {fixed[gap.id] ? "Marked fixed" : "Mark fixed"}
              </button>
              <button type="button" onClick={() => sendGapToCommand(gap, onNavigate)}>Send to Command</button>
              <button type="button" onClick={() => onNavigate?.(gap.page)}>Open area</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
