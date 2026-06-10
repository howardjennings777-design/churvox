import React from "react";
import { setFreshFocus } from "./freshFocus";

const keys = {
  commandBoxes: "churvox:fresh-command-boxes:v1",
  commandInbox: "churvox:fresh-command-inbox:v1",
  jobs: "churvox:fresh-jobs:v1",
  dispatch: "churvox:fresh-dispatch:v1",
  clients: "churvox:fresh-clients:v1",
  quotes: "churvox:fresh-quotes:v1",
  invoices: "churvox:fresh-invoices:v1",
  team: "churvox:fresh-team:v1",
  payroll: "churvox:fresh-payroll:v1",
  support: "churvox:fresh-support:v1",
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

function buildRecords() {
  const commandBoxes = readList(keys.commandBoxes);
  const commandInbox = readList(keys.commandInbox);
  const jobs = readList(keys.jobs);
  const dispatch = readList(keys.dispatch);
  const clients = readList(keys.clients);
  const quotes = readList(keys.quotes);
  const invoices = readList(keys.invoices);
  const team = readList(keys.team);
  const payroll = readList(keys.payroll);
  const support = readList(keys.support);

  return [
    ...commandBoxes.map((item) => ({
      id: item.id,
      area: "Command",
      title: item.title || "Command item",
      meta: `${item.group || "Box"} · ${item.status || "Pending"} · ${item.info || ""}`,
      page: "command",
    })),

    ...commandInbox.map((item) => ({
      id: item.id,
      area: "Command",
      title: item.title || "Inbox issue",
      meta: `Inbox · ${item.info || "Sent to Command"}`,
      page: "command",
    })),

    ...jobs.map((job) => ({
      id: job.id,
      area: "Jobs",
      title: job.title || "Job",
      meta: `${job.client || "Client"} · ${job.status || "Status"} · ${job.price || ""}`,
      page: "jobs",
    })),

    ...dispatch.map((item) => ({
      id: item.id,
      area: "Dispatch",
      title: item.job || "Dispatch job",
      meta: `${item.client || "Client"} · ${item.status || "Status"} · ${item.worker || ""}`,
      page: "dispatch",
    })),

    ...clients.map((client) => ({
      id: client.id,
      area: "Clients",
      title: client.name || "Client",
      meta: `${client.status || "Status"} · ${client.email || ""} · ${client.billingEmail || "billing missing"}`,
      page: "clients",
    })),

    ...quotes.map((quote) => ({
      id: quote.id,
      area: "Quotes",
      title: quote.id || "Quote",
      meta: `${quote.client || "Client"} · ${quote.title || ""} · ${quote.status || "Status"} · ${money(quote.amount)}`,
      page: "quotes",
    })),

    ...invoices.map((invoice) => ({
      id: invoice.id,
      area: "Invoices",
      title: invoice.id || "Invoice",
      meta: `${invoice.client || "Client"} · ${invoice.job || ""} · ${invoice.status || "Status"} · ${money(invoice.amount)}`,
      page: "invoices",
    })),

    ...team.map((member) => ({
      id: member.id,
      area: "Team",
      title: member.name || "Team member",
      meta: `${member.role || "Role"} · ${member.status || "Status"} · ${member.currentJob || ""}`,
      page: "team",
    })),

    ...payroll.map((person) => ({
      id: person.id,
      area: "Payroll",
      title: person.name || "Payroll record",
      meta: `${person.status || "Status"} · ${person.ordinaryHours || 0} hrs · ${person.role || ""}`,
      page: "payroll",
    })),

    ...support.map((ticket) => ({
      id: ticket.id,
      area: "Support",
      title: ticket.title || "Support item",
      meta: `${ticket.id || "Ticket"} · ${ticket.status || "Status"} · ${ticket.priority || ""}`,
      page: "support",
    })),

    {
      id: "",
      area: "Settings",
      title: "GST and business setup",
      meta: "Business name · region · email · accounting · automation",
      page: "settings",
    },
    {
      id: "",
      area: "Plans",
      title: "Operator and Command plans",
      meta: "Start · Crew · Operator · Command · Growth Pack",
      page: "plans",
    },
    {
      id: "",
      area: "Reports",
      title: "Live reports",
      meta: "Revenue · jobs · risks · payroll · invoices",
      page: "reports",
    },
  ];
}

export default function FreshSearch({ onNavigate }) {
  const [query, setQuery] = React.useState("");
  const [records, setRecords] = React.useState(buildRecords);

  React.useEffect(() => {
    function refresh() {
      setRecords(buildRecords());
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

  const clean = query.trim().toLowerCase();

  const results = clean
    ? records
        .filter((item) =>
          `${item.area} ${item.title} ${item.meta}`.toLowerCase().includes(clean)
        )
        .slice(0, 9)
    : [];

  function open(item) {
    if (item.id) setFreshFocus(item.page, item.id);
    onNavigate?.(item.page);
    setQuery("");
  }

  return (
    <div className="freshSearchWrap">
      <label className="freshSearch">
        <span>Search</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find job, client, quote, invoice..."
        />
      </label>

      {results.length > 0 && (
        <div className="freshSearchResults">
          {results.map((item, index) => (
            <button type="button" key={`${item.area}-${item.title}-${index}`} onClick={() => open(item)}>
              <strong>{item.title}</strong>
              <span>{item.area} · {item.meta}</span>
            </button>
          ))}
        </div>
      )}

      {clean && results.length === 0 && (
        <div className="freshSearchResults">
          <div className="freshNoResults">
            <strong>No result yet</strong>
            <span>Try job, invoice, quote, client, payroll, Command or support.</span>
          </div>
        </div>
      )}
    </div>
  );
}
