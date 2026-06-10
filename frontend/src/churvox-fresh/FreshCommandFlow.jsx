import React from "react";

const keys = {
  jobs: "churvox:fresh-jobs:v1",
  quotes: "churvox:fresh-quotes:v1",
  clients: "churvox:fresh-clients:v1",
  invoices: "churvox:fresh-invoices:v1",
  payroll: "churvox:fresh-payroll:v1",
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

function buildFlow() {
  const jobs = readList(keys.jobs);
  const quotes = readList(keys.quotes);
  const clients = readList(keys.clients);
  const invoices = readList(keys.invoices);
  const payroll = readList(keys.payroll);

  const overdue = invoices
    .filter((invoice) => invoice.status === "Overdue")
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

  return [
    {
      page: "clients",
      number: clients.length,
      label: "Clients",
      detail: `${clients.filter((client) => client.status === "Needs setup").length} setup gaps`,
      risk: clients.some((client) => client.status === "Needs setup"),
    },
    {
      page: "quotes",
      number: quotes.length,
      label: "Quotes",
      detail: `${quotes.filter((quote) => quote.status === "Sent").length} waiting`,
      risk: false,
    },
    {
      page: "jobs",
      number: jobs.length,
      label: "Jobs",
      detail: `${jobs.filter((job) => job.status === "Blocked").length} blocked`,
      risk: jobs.some((job) => job.status === "Blocked"),
    },
    {
      page: "invoices",
      number: invoices.length,
      label: "Invoices",
      detail: `${money(overdue)} overdue`,
      risk: overdue > 0 || invoices.some((invoice) => invoice.status === "Draft"),
    },
    {
      page: "payroll",
      number: payroll.length,
      label: "Payroll",
      detail: `${payroll.filter((person) => person.status === "Needs review").length} reviews`,
      risk: payroll.some((person) => person.status === "Needs review"),
    },
  ];
}

export default function FreshCommandFlow({ onNavigate }) {
  const [flow, setFlow] = React.useState(buildFlow);

  React.useEffect(() => {
    function refresh() {
      setFlow(buildFlow());
    }

    window.addEventListener("churvox:fresh-data-updated", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("churvox:fresh-data-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <section className="freshFlowPanel">
      <header className="freshFlowHeader">
        <div>
          <span>Business flow</span>
          <h2>Job → Invoice → Paid</h2>
          <p>Command watches the whole chain and highlights where the owner needs to approve or fix something.</p>
        </div>

        <button type="button" onClick={() => onNavigate?.("reports")}>
          Open reports
        </button>
      </header>

      <div className="freshFlowCards">
        {flow.map((item, index) => (
          <button
            type="button"
            key={item.page}
            className={`freshFlowCard ${item.risk ? "risk" : "safe"}`}
            onClick={() => onNavigate?.(item.page)}
          >
            <i>{String(index + 1).padStart(2, "0")}</i>
            <strong>{item.number}</strong>
            <b>{item.label}</b>
            <span>{item.detail}</span>
            <em>{item.risk ? "Needs owner check" : "Looks okay"}</em>
          </button>
        ))}
      </div>
    </section>
  );
}
