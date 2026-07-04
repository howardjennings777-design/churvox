import React from "react";
// removed broken css import

const storageKeys = {
  jobs: "churvox:fresh-jobs:v1",
  invoices: "churvox:fresh-invoices:v1",
  quotes: "churvox:fresh-quotes:v1",
  clients: "churvox:fresh-clients:v1",
  team: "churvox:fresh-team:v1",
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
  return `$${Number(value || 0).toFixed(2)}`;
}

function payrollGross(person) {
  const hours = Number(person.ordinaryHours || 0) + Number(person.extraHours || 0);
  return hours * Number(person.hourlyRate || 0) + Number(person.adjustment || 0);
}

function buildReportData() {
  const jobs = readList(storageKeys.jobs);
  const invoices = readList(storageKeys.invoices);
  const quotes = readList(storageKeys.quotes);
  const clients = readList(storageKeys.clients);
  const team = readList(storageKeys.team);
  const payroll = readList(storageKeys.payroll);

  const invoiceMoney = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const overdueMoney = invoices
    .filter((invoice) => invoice.status === "Overdue")
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

  const quoteValue = quotes.reduce((sum, quote) => sum + Number(quote.amount || 0), 0);
  const acceptedQuoteValue = quotes
    .filter((quote) => quote.status === "Accepted")
    .reduce((sum, quote) => sum + Number(quote.amount || 0), 0);

  const grossPayroll = payroll.reduce((sum, person) => sum + payrollGross(person), 0);

  const risks = [
    ...jobs
      .filter((job) => job.status === "Blocked")
      .map((job) => ({
        type: "Job risk",
        title: job.title,
        text: `${job.client} · ${job.risk || "Blocked job"}`,
        page: "jobs",
      })),
    ...invoices
      .filter((invoice) => invoice.status === "Overdue")
      .map((invoice) => ({
        type: "Money risk",
        title: invoice.id,
        text: `${invoice.client} · ${money(invoice.amount)} overdue`,
        page: "invoices",
      })),
    ...clients
      .filter((client) => client.status === "Needs setup")
      .map((client) => ({
        type: "Client setup",
        title: client.name,
        text: client.risk || "Needs setup",
        page: "clients",
      })),
    ...payroll
      .filter((person) => person.status === "Needs review")
      .map((person) => ({
        type: "Payroll review",
        title: person.name,
        text: `${money(payrollGross(person))} gross pay needs review`,
        page: "payroll",
      })),
  ];

  return {
    jobs,
    invoices,
    quotes,
    clients,
    team,
    payroll,
    invoiceMoney,
    overdueMoney,
    quoteValue,
    acceptedQuoteValue,
    grossPayroll,
    risks,
  };
}

const reportTabs = ["Overview", "Money", "Work", "People", "Risks"];

export default function FreshReports({ onNavigate }) {
  const [data, setData] = React.useState(buildReportData);
  const [tab, setTab] = React.useState("Overview");

  function refreshReports() {
    setData(buildReportData());
  }

  const completedJobs = data.jobs.filter((job) => job.status === "Completed").length;
  const blockedJobs = data.jobs.filter((job) => job.status === "Blocked").length;
  const activeClients = data.clients.filter((client) => client.status === "Active").length;
  const activeTeam = data.team.filter((member) => member.status === "Active").length;

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Reports</span>
        <h1>Reports</h1>
        <p>Live preview reports from your fresh Jobs, Invoices, Quotes, Clients, Team and Payroll data.</p>
      </header>

      <section className="freshCommandPulse freshPayrollCompactPage">
        <aside className="freshCard">
          <h2>{money(data.invoiceMoney)}</h2>
          <p>Invoice value</p>
        </aside>
        <aside className="freshCard">
          <h2>{money(data.overdueMoney)}</h2>
          <p>Overdue money</p>
        </aside>
        <aside className="freshCard">
          <h2>{data.risks.length}</h2>
          <p>Command risks</p>
        </aside>
      </section>

      <section className="freshCommandFilterBar">
        {reportTabs.map((item) => (
          <button
            type="button"
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
          >
            <span>{item}</span>
          </button>
        ))}
      </section>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Report controls</h2>

          <div className="freshItem active">
            <b>{tab}</b>
            <span>Current report view</span>
          </div>

          <div className="freshActions">
            <button className="freshPrimary" onClick={refreshReports}>
              Refresh report data
            </button>
            <button className="freshDark" onClick={() => onNavigate?.("command")}>
              Open Command risks
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("invoices")}>
              Open invoices
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("jobs")}>
              Open jobs
            </button>
          </div>
        </aside>

        <section className="freshCard">
          <h2>{tab} report</h2>

          {tab === "Overview" && (
            <div className="freshReportGrid">
              <div><span>Jobs</span><b>{data.jobs.length}</b></div>
              <div><span>Completed jobs</span><b>{completedJobs}</b></div>
              <div><span>Invoices</span><b>{data.invoices.length}</b></div>
              <div><span>Quotes</span><b>{data.quotes.length}</b></div>
              <div><span>Clients</span><b>{data.clients.length}</b></div>
              <div><span>Team</span><b>{data.team.length}</b></div>
            </div>
          )}

          {tab === "Money" && (
            <div className="freshReportGrid">
              <div><span>Invoice value</span><b>{money(data.invoiceMoney)}</b></div>
              <div><span>Overdue money</span><b>{money(data.overdueMoney)}</b></div>
              <div><span>Quote value</span><b>{money(data.quoteValue)}</b></div>
              <div><span>Accepted quote value</span><b>{money(data.acceptedQuoteValue)}</b></div>
              <div><span>Payroll gross preview</span><b>{money(data.grossPayroll)}</b></div>
              <div><span>Draft invoices</span><b>{data.invoices.filter((invoice) => invoice.status === "Draft").length}</b></div>
            </div>
          )}

          {tab === "Work" && (
            <div className="freshReportGrid">
              <div><span>Total jobs</span><b>{data.jobs.length}</b></div>
              <div><span>Ready</span><b>{data.jobs.filter((job) => job.status === "Ready").length}</b></div>
              <div><span>In progress</span><b>{data.jobs.filter((job) => job.status === "In progress").length}</b></div>
              <div><span>Completed</span><b>{completedJobs}</b></div>
              <div><span>Blocked</span><b>{blockedJobs}</b></div>
              <div><span>Quotes accepted</span><b>{data.quotes.filter((quote) => quote.status === "Accepted").length}</b></div>
            </div>
          )}

          {tab === "People" && (
            <div className="freshReportGrid">
              <div><span>Active clients</span><b>{activeClients}</b></div>
              <div><span>Clients need setup</span><b>{data.clients.filter((client) => client.status === "Needs setup").length}</b></div>
              <div><span>Active team</span><b>{activeTeam}</b></div>
              <div><span>Invites pending</span><b>{data.team.filter((member) => member.status === "Invite sent").length}</b></div>
              <div><span>Payroll records</span><b>{data.payroll.length}</b></div>
              <div><span>Pay needs review</span><b>{data.payroll.filter((person) => person.status === "Needs review").length}</b></div>
            </div>
          )}

          {tab === "Risks" && (
            <div className="freshReportRisks">
              {data.risks.length === 0 && (
                <div className="freshItem">
                  <b>No current risks</b>
                  <span>Nice. Command is clean right now.</span>
                </div>
              )}

              {data.risks.map((risk) => (
                <button
                  type="button"
                  className="freshItem need"
                  key={`${risk.type}-${risk.title}`}
                  onClick={() => onNavigate?.(risk.page)}
                >
                  <b>{risk.type} · {risk.title}</b>
                  <span>{risk.text}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="freshCard">
          <h2>Command insight</h2>

          <div className="freshItem need">
            <b>{data.risks.length} risks found</b>
            <span>Send risky money, blocked work, setup gaps or payroll review back to Command.</span>
          </div>

          <div className="freshItem">
            <b>Reports read current workspace data</b>
            <span>They read current workspace data and highlight money, work, team and payroll risks.</span>
          </div>
        </aside>
      </section>
    </section>
  );
}
