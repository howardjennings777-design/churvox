import React from "react";

const dataGroups = [
  {
    label: "Command",
    keys: [
      "churvox:fresh-command-boxes:v1",
      "churvox:fresh-command-activity:v1",
      "churvox:fresh-command-inbox:v1",
    ],
  },
  {
    label: "Jobs",
    keys: ["churvox:fresh-jobs:v1"],
  },
  {
    label: "Dispatch",
    keys: ["churvox:fresh-dispatch:v1"],
  },
  {
    label: "Clients",
    keys: ["churvox:fresh-clients:v1"],
  },
  {
    label: "Quotes",
    keys: ["churvox:fresh-quotes:v1"],
  },
  {
    label: "Invoices",
    keys: ["churvox:fresh-invoices:v1"],
  },
  {
    label: "Team",
    keys: ["churvox:fresh-team:v1"],
  },
  {
    label: "Payroll",
    keys: [
      "churvox:fresh-payroll:v1",
      "churvox:fresh-payroll-period:v1",
    ],
  },
  {
    label: "Plans",
    keys: [
      "churvox:fresh-plan:v1",
      "churvox:fresh-growth-packs:v1",
    ],
  },
  {
    label: "Support",
    keys: ["churvox:fresh-support:v1"],
  },
];

const allKeys = dataGroups.flatMap((group) => group.keys);

function clearKeys(keys) {
  try {
    if (typeof window === "undefined") return;

    keys.forEach((key) => window.localStorage.removeItem(key));
    window.dispatchEvent(
      new CustomEvent("churvox:fresh-data-updated", {
        detail: { type: "reset" },
      })
    );
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshDataControls({ onNavigate }) {
  const [lastAction, setLastAction] = React.useState("No reset yet");

  function resetGroup(group) {
    clearKeys(group.keys);
    setLastAction(`${group.label} reset`);
  }

  function resetAll() {
    clearKeys(allKeys);
    setLastAction("All fresh preview data reset");
  }

  return (
    <section className="freshDataControls">
      <header>
        <div>
          <span>Fresh preview data</span>
          <h2>Reset controls</h2>
          <p>Use this when testing gets messy. It only clears browser preview data.</p>
        </div>

        <button type="button" onClick={resetAll}>
          Reset everything
        </button>
      </header>

      <div className="freshDataStatus">
        <b>Last action</b>
        <span>{lastAction}</span>
      </div>

      <div className="freshDataGrid">
        {dataGroups.map((group) => (
          <button type="button" key={group.label} onClick={() => resetGroup(group)}>
            <b>{group.label}</b>
            <span>{group.keys.length} storage item{group.keys.length === 1 ? "" : "s"}</span>
          </button>
        ))}
      </div>

      <div className="freshActions">
        <button className="freshPrimary" onClick={() => onNavigate?.("command")}>
          Open Command
        </button>
        <button className="freshDark" onClick={() => onNavigate?.("jobs")}>
          Open Jobs
        </button>
        <button className="freshGhost" onClick={() => onNavigate?.("reports")}>
          Refresh reports
        </button>
      </div>
    </section>
  );
}
