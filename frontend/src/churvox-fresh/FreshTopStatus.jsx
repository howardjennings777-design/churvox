import React from "react";

const keys = {
  commandBoxes: "churvox:fresh-command-boxes:v1",
  commandInbox: "churvox:fresh-command-inbox:v1",
  jobs: "churvox:fresh-jobs:v1",
  invoices: "churvox:fresh-invoices:v1",
};

function readList(key) {
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

function getStats() {
  const commandBoxes = readList(keys.commandBoxes);
  const commandInbox = readList(keys.commandInbox);
  const jobs = readList(keys.jobs);
  const invoices = readList(keys.invoices);

  const savedPending = commandBoxes.filter((box) => box.status === "Pending").length;
  const inboxNotInBoxes = commandInbox.filter(
    (issue) => !commandBoxes.some((box) => box.id === issue.id)
  ).length;

  const commandPending = savedPending + inboxNotInBoxes;
  const blockedJobs = jobs.filter((job) => job.status === "Blocked").length;
  const overdueMoney = invoices
    .filter((invoice) => invoice.status === "Overdue")
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

  return {
    commandPending,
    blockedJobs,
    overdueMoney,
  };
}

export default function FreshTopStatus({ onNavigate }) {
  const [stats, setStats] = React.useState(getStats);

  React.useEffect(() => {
    function refresh() {
      setStats(getStats());
    }

    window.addEventListener("churvox:fresh-data-updated", refresh);
    window.addEventListener("storage", refresh);

    const interval = window.setInterval(refresh, 1200);

    return () => {
      window.removeEventListener("churvox:fresh-data-updated", refresh);
      window.removeEventListener("storage", refresh);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="freshTopStatus">
      <button
        type="button"
        className={stats.commandPending > 0 ? "warn" : ""}
        onClick={() => onNavigate?.("command")}
      >
        <b>{stats.commandPending}</b>
        <span>Command</span>
      </button>

      <button
        type="button"
        className={stats.blockedJobs > 0 ? "warn" : ""}
        onClick={() => onNavigate?.("jobs")}
      >
        <b>{stats.blockedJobs}</b>
        <span>Blocked</span>
      </button>

      <button
        type="button"
        className={stats.overdueMoney > 0 ? "warn" : ""}
        onClick={() => onNavigate?.("invoices")}
      >
        <b>{money(stats.overdueMoney)}</b>
        <span>Overdue</span>
      </button>
    </div>
  );
}
