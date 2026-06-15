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

const fallback = {
  commandBoxes: [
    { id: "invoice-ready", title: "Invoice ready", group: "Money", status: "Pending", info: "Aroha Property Care · $85 draft" },
    { id: "quote-follow-up", title: "Follow-up needed", group: "Quotes", status: "Pending", info: "Birchville Rentals · 6 days no reply" },
    { id: "job-access", title: "Job needs access", group: "Jobs", status: "Pending", info: "Driveway clean · tenant access not confirmed" },
  ],
  commandInbox: [],
  jobs: [
    { id: "job-1001", title: "Lawn service", client: "Aroha Property Care", status: "Ready", price: "$85 fixed" },
    { id: "job-1002", title: "Garden tidy", client: "Lower Hutt Medical Centre", status: "In progress", price: "$140 fixed" },
    { id: "job-1003", title: "Driveway clean", client: "Birchville Rentals", status: "Blocked", price: "$240 quote" },
  ],
  dispatch: [
    { id: "dispatch-1", job: "Lawn service", client: "Aroha Property Care", status: "Ready", worker: "Matiu Rangi" },
    { id: "dispatch-2", job: "Garden tidy", client: "Lower Hutt Medical Centre", status: "On site", worker: "Ana Williams" },
    { id: "dispatch-3", job: "Driveway clean", client: "Birchville Rentals", status: "Blocked", worker: "Unassigned" },
  ],
  clients: [
    { id: "client-1", name: "Aroha Property Care", status: "Active", email: "hello@churvox.com", billingEmail: "hello@churvox.com" },
    { id: "client-2", name: "Birchville Rentals", status: "Needs setup", email: "hello@churvox.com", billingEmail: "" },
    { id: "client-3", name: "Lower Hutt Medical Centre", status: "Active", email: "hello@churvox.com", billingEmail: "hello@churvox.com" },
  ],
  quotes: [
    { id: "QT-2041", client: "Birchville Rentals", title: "Driveway clean", status: "Sent", amount: 240 },
    { id: "QT-2042", client: "Aroha Property Care", title: "Monthly grounds care", status: "Draft", amount: 420 },
    { id: "QT-2038", client: "Lower Hutt Medical Centre", title: "Entry hedge tidy", status: "Accepted", amount: 180 },
  ],
  invoices: [
    { id: "INV-1007", client: "Aroha Property Care", job: "Lawn service", status: "Draft", amount: 85 },
    { id: "INV-1002", client: "Birchville Rentals", job: "Driveway clean", status: "Overdue", amount: 190 },
    { id: "INV-1004", client: "Lower Hutt Medical Centre", job: "Garden tidy", status: "Sent", amount: 140 },
  ],
  team: [
    { id: "team-1", name: "Matiu Rangi", role: "Worker", status: "Active", currentJob: "Lawn service" },
    { id: "team-2", name: "Ana Williams", role: "Lead worker", status: "Active", currentJob: "Garden tidy" },
    { id: "team-3", name: "Tama Smith", role: "Worker", status: "Invite sent", currentJob: "Not assigned" },
  ],
  payroll: [
    { id: "pay-1", name: "Matiu Rangi", role: "Worker", status: "Ready", ordinaryHours: 31.5 },
    { id: "pay-2", name: "Ana Williams", role: "Lead worker", status: "Needs review", ordinaryHours: 36 },
    { id: "pay-3", name: "Tama Smith", role: "Worker", status: "Draft", ordinaryHours: 8 },
  ],
  support: [
    { id: "SUP-001", title: "Finish onboarding setup", status: "Open", priority: "High" },
    { id: "SUP-002", title: "Check invoice sending flow", status: "Watching", priority: "Medium" },
  ],
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

function mergeWithFallback(saved, defaults) {
  const seen = new Set(saved.map((item) => item.id).filter(Boolean));
  return [...saved, ...defaults.filter((item) => !seen.has(item.id))];
}

function list(name) {
  return mergeWithFallback(readList(keys[name]), fallback[name] || []);
}

function money(value) {
  return `$${Number(value || 0).toFixed(0)}`;
}

function buildRecords() {
  return [
    ...list("commandBoxes").map((item) => ({
      id: item.id,
      area: "Command",
      title: item.title || "Command item",
      meta: `${item.group || "Box"} · ${item.status || "Pending"} · ${item.info || ""}`,
      page: "command",
    })),
    ...list("commandInbox").map((item) => ({
      id: item.id,
      area: "Command",
      title: item.title || "Inbox issue",
      meta: `Inbox · ${item.info || "Sent to Command"}`,
      page: "command",
    })),
    ...list("jobs").map((job) => ({
      id: job.id,
      area: "Jobs",
      title: job.title || "Job",
      meta: `${job.client || "Client"} · ${job.status || "Status"} · ${job.price || ""}`,
      page: "jobs",
    })),
    ...list("dispatch").map((item) => ({
      id: item.id,
      area: "Dispatch",
      title: item.job || "Dispatch job",
      meta: `${item.client || "Client"} · ${item.status || "Status"} · ${item.worker || ""}`,
      page: "dispatch",
    })),
    ...list("clients").map((client) => ({
      id: client.id,
      area: "Clients",
      title: client.name || "Client",
      meta: `${client.status || "Status"} · ${client.email || ""} · ${client.billingEmail || "billing missing"}`,
      page: "clients",
    })),
    ...list("quotes").map((quote) => ({
      id: quote.id,
      area: "Quotes",
      title: quote.id || "Quote",
      meta: `${quote.client || "Client"} · ${quote.title || ""} · ${quote.status || "Status"} · ${money(quote.amount)}`,
      page: "quotes",
    })),
    ...list("invoices").map((invoice) => ({
      id: invoice.id,
      area: "Invoices",
      title: invoice.id || "Invoice",
      meta: `${invoice.client || "Client"} · ${invoice.job || ""} · ${invoice.status || "Status"} · ${money(invoice.amount)}`,
      page: "invoices",
    })),
    ...list("team").map((member) => ({
      id: member.id,
      area: "Team",
      title: member.name || "Team member",
      meta: `${member.role || "Role"} · ${member.status || "Status"} · ${member.currentJob || ""}`,
      page: "team",
    })),
    ...list("payroll").map((person) => ({
      id: person.id,
      area: "Payroll",
      title: person.name || "Payroll record",
      meta: `${person.status || "Status"} · ${person.ordinaryHours || 0} hrs · ${person.role || ""}`,
      page: "payroll",
    })),
    ...list("support").map((ticket) => ({
      id: ticket.id,
      area: "Support",
      title: ticket.title || "Support item",
      meta: `${ticket.id || "Ticket"} · ${ticket.status || "Status"} · ${ticket.priority || ""}`,
      page: "support",
    })),
    { id: "", area: "Settings", title: "GST and business setup", meta: "Business name · region · email · accounting · automation", page: "settings" },
    { id: "", area: "Plans", title: "Operator and Command plans", meta: "Start · Crew · Operator · Command · Growth Pack", page: "plans" },
    { id: "", area: "Reports", title: "Live reports", meta: "Revenue · jobs · risks · payroll · invoices", page: "reports" },
  ];
}

export default function FreshSearch({ onNavigate }) {
  const editableRef = React.useRef(null);
  const [query, setQuery] = React.useState("");
  const [records, setRecords] = React.useState(buildRecords);

  function refresh() {
    setRecords(buildRecords());
  }

  function clearSearch() {
    setQuery("");
    if (editableRef.current) editableRef.current.textContent = "";
  }

  React.useEffect(() => {
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
        .slice(0, 10)
    : [];

  function open(item) {
    if (!item) return;

    if (item.id) setFreshFocus(item.page, item.id);
    onNavigate?.(item.page);
    clearSearch();
  }

  function onInput(event) {
    setQuery(event.currentTarget.textContent || "");
  }

  function onKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (results[0]) open(results[0]);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      clearSearch();
    }
  }

  return (
    <div className="freshSearchWrap">
      <div className="freshSearch freshSearchEditableShell">
        <span>Search</span>

        <div
          ref={editableRef}
          className="freshSearchEditable"
          role="textbox"
          tabIndex={0}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Try Birchville, INV-1007, Matiu..."
          onFocus={refresh}
          onInput={onInput}
          onKeyDown={onKeyDown}
          aria-label="Search Churvox fresh preview"
        />
      </div>

      {results.length > 0 && (
        <div className="freshSearchResults">
          {results.map((item, index) => (
            <button
              type="button"
              key={`${item.area}-${item.title}-${item.id || index}`}
              onMouseDown={(event) => {
                event.preventDefault();
                open(item);
              }}
            >
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
            <span>Try Birchville, INV-1007, Matiu, quote, payroll, Command or support.</span>
          </div>
        </div>
      )}
    </div>
  );
}
