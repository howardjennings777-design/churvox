import React from "react";

const CHECKLIST_KEY = "churvox:fresh-launch-checklist:v1";

const checks = [
  {
    id: "command",
    title: "Command approval desk",
    text: "Approve, decline, edit and reset Command boxes.",
    page: "command",
  },
  {
    id: "clients",
    title: "Clients",
    text: "Add or fix billing email, then create job/quote from client.",
    page: "clients",
  },
  {
    id: "quotes",
    title: "Quotes",
    text: "Send quote, mark accepted, convert to job.",
    page: "quotes",
  },
  {
    id: "jobs",
    title: "Jobs",
    text: "Mark ready, start, complete, create invoice draft.",
    page: "jobs",
  },
  {
    id: "dispatch",
    title: "Dispatch",
    text: "Move work through Ready, On site, Complete and Blocked.",
    page: "dispatch",
  },
  {
    id: "invoices",
    title: "Invoices",
    text: "Approve/send, mark paid and check overdue flow.",
    page: "invoices",
  },
  {
    id: "team",
    title: "Team",
    text: "Activate worker, pause access and check role changes.",
    page: "team",
  },
  {
    id: "payroll",
    title: "Payroll workspace",
    text: "Change hours, approve pay and export CSV only.",
    page: "payroll",
  },
  {
    id: "reports",
    title: "Reports",
    text: "Check live totals and risk links.",
    page: "reports",
  },
  {
    id: "settings",
    title: "Settings",
    text: "Change GST/business setup and test reset controls.",
    page: "settings",
  },
  {
    id: "plans",
    title: "Plans",
    text: "Select Operator, Command and Growth Packs.",
    page: "plans",
  },
  {
    id: "support",
    title: "Support",
    text: "Add ticket, mark watching/solved and open setup guide.",
    page: "support",
  },
];

function loadDone() {
  try {
    if (typeof window === "undefined") return {};

    const saved = window.localStorage.getItem(CHECKLIST_KEY);
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function FreshLaunchChecklist({ onNavigate }) {
  const [done, setDone] = React.useState(loadDone);

  const completeCount = checks.filter((item) => done[item.id]).length;
  const percent = Math.round((completeCount / checks.length) * 100);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(done));
      }
    } catch {
      // Fresh preview keeps working without local storage.
    }
  }, [done]);

  function toggle(id) {
    setDone((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function resetChecklist() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(CHECKLIST_KEY);
      }
    } catch {
      // Ignore preview storage errors.
    }

    setDone({});
  }

  return (
    <section className="freshLaunchChecklist">
      <header>
        <div>
          <span>Launch testing</span>
          <h2>{percent}% checked</h2>
          <p>Tick each area after you test it. This stays saved while you work through the fresh app.</p>
        </div>

        <button type="button" onClick={resetChecklist}>
          Reset checklist
        </button>
      </header>

      <div className="freshLaunchProgress">
        <i style={{ width: `${percent}%` }} />
      </div>

      <div className="freshLaunchGrid">
        {checks.map((item) => (
          <article className={done[item.id] ? "done" : ""} key={item.id}>
            <button type="button" className="freshCheckToggle" onClick={() => toggle(item.id)}>
              {done[item.id] ? "✓" : ""}
            </button>

            <div>
              <b>{item.title}</b>
              <span>{item.text}</span>
            </div>

            <button type="button" className="freshOpenArea" onClick={() => onNavigate?.(item.page)}>
              Open
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
