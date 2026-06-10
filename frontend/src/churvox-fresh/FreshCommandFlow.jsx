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

  const draftInvoices = invoices.filter((invoice) => invoice.status === "Draft").length;
  const blockedJobs = jobs.filter((job) => job.status === "Blocked").length;
  const setupClients = clients.filter((client) => client.status === "Needs setup").length;
  const payrollReview = payroll.filter((person) => person.status === "Needs review").length;

  return [
    {
      key: "clients",
      title: "Clients",
      number: clients.length,
      detail: `${setupClients} need setup`,
      page: "clients",
      danger: setupClients > 0,
    },
    {
      key: "quotes",
      title: "Quotes",
      number: quotes.length,
      detail: `${quotes.filter((quote) => quote.status === "Sent").length} waiting`,
      page: "quotes",
      danger: false,
    },
    {
      key: "jobs",
      title: "Jobs",
      number: jobs.length,
      detail: `${blockedJobs} blocked`,
      page: "jobs",
      danger: blockedJobs > 0,
    },
    {
      key: "invoices",
      title: "Invoices",
      number: invoices.length,
      detail: `${draftInvoices} drafts · ${money(overdue)} overdue`,
      page: "invoices",
      danger: overdue > 0 || draftInvoices > 0,
    },
    {
      key: "payroll",
      title: "Payroll",
      number: payroll.length,
      detail: `${payrollReview} need review`,
      page: "payroll",
      danger: payrollReview > 0,
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
    <section className="freshCommandFlow">
      <header>
        <div>
          <span>Business flow</span>
          <h2>Job → Invoice → Paid</h2>
          <p>Command watches the whole admin chain and sends risky work back for owner approval.</p>
        </div>

        <button type="button" onClick={() => onNavigate?.("reports")}>
          Open reports
        </button>
      </header>

      <div className="freshFlowRail">
        {flow.map((item, index) => (
          <React.Fragment key={item.key}>
            <button
              type="button"
              className={item.danger ? "danger" : ""}
              onClick={() => onNavigate?.(item.page)}
            >
              <strong>{item.number}</strong>
              <b>{item.title}</b>
              <span>{item.detail}</span>
            </button>

            {index < flow.length - 1 && <i aria-hidden="true">→</i>}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
