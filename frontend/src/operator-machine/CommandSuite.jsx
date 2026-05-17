import React, { useMemo, useState } from "react";
import "./CommandSuite.css";

const PAGE_MAP = {
  dashboard: "dashboard",
  jobs: "work",
  work: "work",
  clients: "clients",
  team: "crew",
  crew: "crew",
  quotes: "quotes",
  invoices: "invoices",
  proof: "proof",
  payments: "proof",
  payroll: "payroll",
  plans: "plans",
  settings: "settings",
};

const NAV_ITEMS = [
  ["Dashboard", "dashboard", "target"],
  ["Work", "jobs", "briefcase"],
  ["Clients", "clients", "client"],
  ["Crew", "team", "crew"],
  ["Quotes", "quotes", "document"],
  ["Invoices", "invoices", "money"],
  ["Proof & Pay", "proof", "photo"],
  ["Payroll", "payroll", "pulse"],
  ["Plans", "plans", "shield"],
  ["Settings", "settings", "gear"],
];

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function rowsFrom(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object" && Array.isArray(value.items)) return value.items;
    if (value && typeof value === "object" && Array.isArray(value.results)) return value.results;
    if (value && typeof value === "object" && Array.isArray(value.data)) return value.data;
  }
  return [];
}

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "$0";
  return `$${n.toLocaleString()}`;
}

function statusOf(item = {}) {
  return clean(item.status || item.job_status || item.workflow_status || item.state || "Ready");
}

function areaOf(item = {}) {
  return clean(item.area || item.region || item.suburb || item.location || item.address || "Not set");
}

function clientName(item = {}) {
  return clean(
    item.client_name ||
      item.clientName ||
      item.customer_name ||
      item.customerName ||
      item.client ||
      item.name ||
      "Client"
  );
}

function workerName(item = {}) {
  return clean(
    item.worker_name ||
      item.assigned_worker_name ||
      item.assignedWorkerName ||
      item.employee_name ||
      item.full_name ||
      item.name ||
      "Unassigned"
  );
}

function titleOf(item = {}, fallback = "Record") {
  return clean(
    item.title ||
      item.name ||
      item.job_title ||
      item.jobTitle ||
      item.description ||
      item.invoice_number ||
      item.quote_number ||
      item.number ||
      fallback
  );
}

function idOf(item = {}, index = 0) {
  return clean(item.id || item._id || item.uuid || item.number || item.invoice_number || item.quote_number || `row-${index}`);
}

function textOf(item = {}) {
  return Object.values(item || {}).map((value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return "";
    return clean(value);
  }).join(" ").toLowerCase();
}

function slipText(item = {}) {
  return [
    item.kind,
    item.eyebrow,
    item.title,
    item.need,
    item.prepared,
    item.detail,
    item.status,
    item.reason,
    item.ai_reason,
  ].map(clean).join(" ").toLowerCase();
}

function riskFor(item = {}) {
  const text = slipText(item) || textOf(item);
  if (
    text.includes("missing") ||
    text.includes("blocked") ||
    text.includes("failed") ||
    text.includes("overdue") ||
    text.includes("risk") ||
    text.includes("amount") ||
    text.includes("no email") ||
    text.includes("no phone")
  ) {
    return { label: "High risk", tone: "high" };
  }
  if (
    text.includes("quote") ||
    text.includes("follow") ||
    text.includes("payment") ||
    text.includes("reminder") ||
    text.includes("worker") ||
    text.includes("crew") ||
    text.includes("dispatch")
  ) {
    return { label: "Medium", tone: "medium" };
  }
  return { label: "Low risk", tone: "low" };
}

function aiReason(item = {}, fallback = "Churvox prepared this for review.") {
  return clean(item.prepared || item.need || item.ai_reason || item.reason, fallback);
}

function Icon({ type }) {
  return <i className={`cs-icon ${type || "spark"}`} aria-hidden="true" />;
}

function filterRows(rows, filter) {
  if (!filter || filter === "All") return rows;
  const key = filter.toLowerCase().replace(/[^a-z0-9]/g, "");
  const matches = rows.filter((row) => textOf(row).replace(/[^a-z0-9]/g, "").includes(key));
  return matches.length ? matches : rows;
}

function openTop() {
  try {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch {
    window.scrollTo(0, 0);
  }
}

function Stat({ label, value, icon, onClick }) {
  return (
    <button type="button" className="cs-stat" onClick={onClick}>
      <Icon type={icon || "target"} />
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

function AiCard({ title, body, tone = "normal", icon = "spark", onClick }) {
  return (
    <button type="button" className={`cs-ai-card ${tone}`} onClick={onClick}>
      <Icon type={icon} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </button>
  );
}

function Table({ rows, columns, onOpen, emptyText = "Nothing here yet." }) {
  const gridTemplateColumns = `repeat(${columns.length}, minmax(150px, 1fr)) 170px`;

  return (
    <section className="cs-table">
      <header style={{ gridTemplateColumns }}>
        {columns.map((column) => (
          <span key={column.key}>{column.label}</span>
        ))}
        <span>Action</span>
      </header>

      {rows.length ? rows.map((row, index) => (
        <article
          className="cs-row"
          key={idOf(row, index)}
          style={{ gridTemplateColumns }}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(row)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onOpen(row);
          }}
        >
          {columns.map((column) => (
            <div key={column.key}>{column.render ? column.render(row, index) : clean(row[column.key], "—")}</div>
          ))}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(row);
            }}
          >
            Open Slip <em>›</em>
          </button>
        </article>
      )) : (
        <section className="cs-empty">
          <strong>{emptyText}</strong>
          <p>As work flows in, Churvox will prepare the admin and show the next best action here.</p>
        </section>
      )}
    </section>
  );
}

function DetailModal({ selected, onClose, onApprove, setPage }) {
  if (!selected) return null;

  const route = selected.__route;
  const detail = selected.__body || aiReason(selected, "Churvox prepared this item so you can review it without digging through the app.");

  return (
    <section className="cs-modal-backdrop" onClick={onClose}>
      <article className="cs-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <span>{selected.__modalType || "Approval Slip"}</span>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <h2>{clean(selected.__modalTitle || selected.title || selected.name, titleOf(selected, "Record detail"))}</h2>
        <p>{detail}</p>

        <dl>
          <div><dt>Status</dt><dd>{statusOf(selected)}</dd></div>
          <div><dt>Client</dt><dd>{clientName(selected)}</dd></div>
          <div><dt>Area</dt><dd>{areaOf(selected)}</dd></div>
          <div><dt>AI action</dt><dd>Review, edit if needed, then approve the next move.</dd></div>
        </dl>

        <footer>
          <button type="button" className="ghost" onClick={onClose}>Close</button>

          {route ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setPage?.(route);
                onClose();
                openTop();
              }}
            >
              Open page
            </button>
          ) : null}

          <button type="button" onClick={() => onApprove(selected)}>
            Approve next move
          </button>
        </footer>
      </article>
    </section>
  );
}

function SmartPage({ config, rows, columns, aiCards, onOpen, activeFilter, setActiveFilter, openInfo, goToPage }) {
  const filteredRows = filterRows(rows, activeFilter);

  return (
    <section className="cs-page">
      <header className="cs-hero compact">
        <section>
          <span>{config.kicker}</span>
          <h1>{config.title}<mark>{config.accent}</mark></h1>
          <p>{config.body}</p>
        </section>

        <section className="cs-stats">
          {config.stats.map((stat) => (
            <Stat
              key={stat.label}
              {...stat}
              onClick={() => openInfo({
                __modalType: "Smart Metric",
                __modalTitle: stat.label,
                __body: `${stat.label}: ${stat.value}. Churvox tracks this live for the ${config.workspaceTitle} workspace.`,
                __route: stat.route,
                status: "Live",
              })}
            />
          ))}
        </section>
      </header>

      <section className="cs-ai-strip">
        {aiCards.map((card) => (
          <AiCard
            key={card.title}
            {...card}
            onClick={() => openInfo({
              __modalType: "AI Prepared Action",
              __modalTitle: card.title,
              __body: card.body,
              __route: card.route,
              status: "Prepared",
            })}
          />
        ))}
      </section>

      <section className="cs-workspace">
        <header>
          <div>
            <span>{config.workspaceKicker}</span>
            <h2>{config.workspaceTitle}</h2>
            <p>{config.workspaceBody}</p>
          </div>

          <div className="cs-filters">
            {config.filters.map((filter) => (
              <button
                type="button"
                key={filter}
                className={activeFilter === filter ? "active" : ""}
                onClick={() => setActiveFilter(activeFilter === filter ? "All" : filter)}
              >
                {filter}
              </button>
            ))}

            {config.jumpTo ? (
              <button type="button" className="strong" onClick={() => goToPage(config.jumpTo)}>
                Open related page
              </button>
            ) : null}
          </div>
        </header>

        <Table rows={filteredRows} columns={columns} onOpen={onOpen} emptyText={config.emptyText} />
      </section>
    </section>
  );
}

export default function CommandSuite({
  page,
  setPage,
  data,
  machine,
  planName,
  visibleApprovals,
  hiddenApprovalCount,
  showAllApprovals,
  setShowAllApprovals,
  onOpenSlip,
}) {
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const current = PAGE_MAP[page] || "dashboard";

  const model = useMemo(() => {
    const raw = data?.raw || data || {};
    const jobs = rowsFrom(raw.jobs, data?.jobs, raw.work, data?.work);
    const clients = rowsFrom(raw.clients, data?.clients, raw.customers, data?.customers);
    const crew = rowsFrom(raw.workers, data?.workers, raw.team, data?.team, raw.crew, data?.crew);
    const quotes = rowsFrom(raw.quotes, data?.quotes);
    const invoices = rowsFrom(raw.invoices, data?.invoices);
    const payments = rowsFrom(raw.payments, data?.payments, raw.transactions, data?.transactions);
    const approvalRows = rowsFrom(machine?.approval, visibleApprovals);
    const input = rowsFrom(machine?.input);
    const processing = rowsFrom(machine?.processing);

    return { raw, jobs, clients, crew, quotes, invoices, payments, approvals: approvalRows, input, processing };
  }, [data, machine, visibleApprovals]);

  function goToPage(nextPage) {
    setActiveFilter("All");
    setPage?.(nextPage);
    openTop();
  }

  function openRecord(record) {
    setSelected(record);
  }

  function openInfo(record) {
    setSelected(record);
  }

  function approveRecord(record) {
    if (record?.__approval && onOpenSlip) {
      onOpenSlip(record.__raw || record);
      setSelected(null);
      return;
    }

    setToast("Approved. Churvox marked this next move as reviewed.");
    setSelected(null);
    window.setTimeout(() => setToast(""), 2400);
  }

  const approvals = model.approvals.map((item) => ({ ...item, __approval: true, __raw: item }));

  const readyToInvoice = model.invoices.filter((item) => /draft|ready|unpaid|owing/i.test(statusOf(item))).length ||
    model.jobs.filter((item) => /complete|ready/i.test(statusOf(item))).length;

  const crewActive = model.crew.filter((item) => /active|working|on|ready/i.test(statusOf(item))).length ||
    model.jobs.filter((item) => /active|progress|started/i.test(statusOf(item))).length;

  const dashboardStats = [
    { label: "Plan", value: planName || "Command", icon: "target" },
    { label: "New inputs", value: model.input.length, icon: "tray" },
    { label: "Prepared", value: model.processing.length + approvals.length, icon: "document" },
    { label: "Approvals", value: approvals.length, icon: "shield" },
  ];

  const pages = {
    work: {
      config: {
        kicker: "Work command",
        title: "All work,",
        accent: "already sorted.",
        body: "Jobs enter once. Churvox checks client, area, crew fit, proof and invoice readiness in the background.",
        stats: [
          { label: "New", value: model.jobs.filter((j) => /new|pending/i.test(statusOf(j))).length, icon: "tray" },
          { label: "Assigned", value: model.jobs.filter((j) => workerName(j) !== "Unassigned").length, icon: "crew" },
          { label: "Active", value: model.jobs.filter((j) => /active|progress|started/i.test(statusOf(j))).length, icon: "pulse" },
          { label: "Ready invoice", value: model.jobs.filter((j) => /complete|ready/i.test(statusOf(j))).length, icon: "money", route: "invoices" },
        ],
        workspaceKicker: "Work board",
        workspaceTitle: "Work slips",
        workspaceBody: "Tap a row to review client, crew, proof and invoice readiness.",
        filters: ["Needs action", "Unassigned", "Today", "Active", "Completed", "Ready to invoice"],
        emptyText: "No work found.",
      },
      rows: model.jobs,
      aiCards: [
        { title: "Best crew match", body: "When area is selected, Churvox suggests the best worker using area, workload and clashes.", icon: "crew", route: "team" },
        { title: "Invoice readiness", body: "Completed work is checked for proof, notes and pricing before invoice prep.", icon: "money", route: "invoices" },
        { title: "Schedule guard", body: "Crew clashes and risky timing are flagged before approval.", icon: "shield" },
      ],
      columns: [
        { key: "title", label: "Work", render: (row) => <strong>{titleOf(row, "Work slip")}</strong> },
        { key: "client", label: "Client", render: clientName },
        { key: "area", label: "Area", render: areaOf },
        { key: "crew", label: "Crew", render: workerName },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI suggestion", render: (row) => aiReason(row, "Churvox is checking crew fit and invoice readiness.") },
      ],
    },

    clients: {
      config: {
        kicker: "Client command",
        title: "Every client record,",
        accent: "cleaned and ready.",
        body: "Churvox watches missing details, unpaid invoices, open quotes and follow-up opportunities.",
        stats: [
          { label: "Clients", value: model.clients.length, icon: "client" },
          { label: "Missing details", value: model.clients.filter((c) => !clean(c.email || c.phone || c.mobile)).length, icon: "alert" },
          { label: "Open quotes", value: model.quotes.length, icon: "document", route: "quotes" },
          { label: "Unpaid", value: model.invoices.filter((i) => /unpaid|overdue|owing/i.test(statusOf(i))).length, icon: "money", route: "invoices" },
        ],
        workspaceKicker: "Client list",
        workspaceTitle: "Client records",
        workspaceBody: "Tap a client to see work history, quotes, invoices and AI next action.",
        filters: ["Needs details", "Active work", "Owing", "Follow-up", "All clients"],
        emptyText: "No clients found.",
      },
      rows: model.clients,
      aiCards: [
        { title: "Missing details", body: "Churvox flags missing phone, email, address or payment details.", icon: "alert" },
        { title: "Follow-up ready", body: "Clients with old quotes or unpaid invoices are prepared for owner review.", icon: "spark" },
        { title: "Duplicate check", body: "Similar names, phones and addresses can be flagged before records get messy.", icon: "shield" },
      ],
      columns: [
        { key: "name", label: "Client", render: clientName },
        { key: "contact", label: "Contact", render: (row) => clean(row.email || row.phone || row.mobile, "Missing") },
        { key: "area", label: "Area", render: areaOf },
        { key: "work", label: "Active work", render: () => "Checked" },
        { key: "owing", label: "Owing", render: (row) => money(row.owing || row.balance || row.amount_due) },
        { key: "ai", label: "AI status", render: (row) => aiReason(row, "Client record checked.") },
      ],
    },

    crew: {
      config: {
        kicker: "Crew command",
        title: "Crew matched,",
        accent: "to the right work.",
        body: "Churvox checks area, availability, workload, job history and schedule risk before suggesting crew.",
        stats: [
          { label: "Crew", value: model.crew.length, icon: "crew" },
          { label: "Active", value: crewActive, icon: "pulse" },
          { label: "Available", value: model.crew.filter((w) => /available|ready/i.test(statusOf(w))).length, icon: "shield" },
          { label: "Review", value: model.crew.filter((w) => /missing|late|risk/i.test(statusOf(w))).length, icon: "alert" },
        ],
        workspaceKicker: "Crew list",
        workspaceTitle: "Crew profiles",
        workspaceBody: "Tap a worker to see today’s work, notes, proof history and suggested assignments.",
        filters: ["Available", "Active", "Overloaded", "Needs update", "All crew"],
        emptyText: "No crew found.",
      },
      rows: model.crew,
      aiCards: [
        { title: "Best worker found", body: "Unassigned work gets a recommended crew match with the reason attached.", icon: "crew", route: "jobs" },
        { title: "Live updates", body: "Worker notes, pauses, proof photos and completions feed owner/admin automatically.", icon: "pulse", route: "proof" },
        { title: "Clash warning", body: "Churvox warns before assigning someone into a schedule clash.", icon: "alert" },
      ],
      columns: [
        { key: "name", label: "Worker", render: workerName },
        { key: "role", label: "Role", render: (row) => clean(row.role || row.position, "Worker") },
        { key: "area", label: "Area", render: areaOf },
        { key: "current", label: "Current work", render: (row) => clean(row.current_job || row.currentJob, "None") },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI note", render: (row) => aiReason(row, "Crew availability checked.") },
      ],
    },

    quotes: {
      config: {
        kicker: "Quote command",
        title: "Quotes prepared,",
        accent: "followed up and ready to win.",
        body: "Churvox watches quote age, missing pricing, follow-up timing and accepted quote conversion.",
        stats: [
          { label: "Drafts", value: model.quotes.filter((q) => /draft/i.test(statusOf(q))).length, icon: "document" },
          { label: "Sent", value: model.quotes.filter((q) => /sent/i.test(statusOf(q))).length, icon: "tray" },
          { label: "Awaiting", value: model.quotes.filter((q) => /await|pending/i.test(statusOf(q))).length, icon: "pulse" },
          { label: "Accepted", value: model.quotes.filter((q) => /accept/i.test(statusOf(q))).length, icon: "shield" },
        ],
        workspaceKicker: "Quote list",
        workspaceTitle: "Quote slips",
        workspaceBody: "Tap a quote to approve follow-up, convert to work, or convert to invoice.",
        filters: ["Follow-up due", "Drafts", "Awaiting", "Accepted", "All quotes"],
        emptyText: "No quotes found.",
      },
      rows: model.quotes,
      aiCards: [
        { title: "Follow-up prepared", body: "Old quotes get a polite follow-up drafted for owner approval.", icon: "spark" },
        { title: "Missing price check", body: "Quotes missing amount or detail are flagged before sending.", icon: "alert" },
        { title: "Convert when accepted", body: "Accepted quotes can become work or invoice prep without retyping.", icon: "shield", route: "jobs" },
      ],
      columns: [
        { key: "number", label: "Quote", render: (row) => clean(row.quote_number || row.number || row.id, "Quote") },
        { key: "client", label: "Client", render: clientName },
        { key: "work", label: "Work", render: titleOf },
        { key: "amount", label: "Amount", render: (row) => money(row.amount || row.total) },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI action", render: (row) => aiReason(row, "Follow-up timing checked.") },
      ],
    },

    invoices: {
      config: {
        kicker: "Invoice command",
        title: "Invoices prepared,",
        accent: "from completed work.",
        body: "Churvox links invoices to work, clients, proof, payment status and reminders.",
        stats: [
          { label: "Drafts", value: model.invoices.filter((i) => /draft/i.test(statusOf(i))).length, icon: "document" },
          { label: "Sent", value: model.invoices.filter((i) => /sent/i.test(statusOf(i))).length, icon: "tray" },
          { label: "Owing", value: model.invoices.filter((i) => /unpaid|owing/i.test(statusOf(i))).length, icon: "money" },
          { label: "Overdue", value: model.invoices.filter((i) => /overdue/i.test(statusOf(i))).length, icon: "alert" },
        ],
        workspaceKicker: "Invoice list",
        workspaceTitle: "Invoice slips",
        workspaceBody: "Tap an invoice to review proof, AI description, missing details and send readiness.",
        filters: ["Drafts", "Ready to send", "Owing", "Overdue", "Paid"],
        emptyText: "No invoices found.",
      },
      rows: model.invoices,
      aiCards: [
        { title: "Draft invoice ready", body: "Completed work becomes invoice prep with proof and notes attached.", icon: "money", route: "proof" },
        { title: "Reminder prepared", body: "Unpaid invoices get customer reminders drafted for approval.", icon: "spark" },
        { title: "Missing email check", body: "Churvox flags invoices that cannot be sent yet.", icon: "alert", route: "clients" },
      ],
      columns: [
        { key: "number", label: "Invoice", render: (row) => clean(row.invoice_number || row.number || row.id, "Invoice") },
        { key: "client", label: "Client", render: clientName },
        { key: "work", label: "Linked work", render: titleOf },
        { key: "amount", label: "Amount", render: (row) => money(row.amount || row.total) },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI action", render: (row) => aiReason(row, "Invoice checked.") },
      ],
    },

    proof: {
      config: {
        kicker: "Proof & Pay",
        title: "Proof in.",
        accent: "Payment ready.",
        body: "Worker proof, job notes and completion details flow into invoice and payment readiness.",
        stats: [
          { label: "Completed", value: model.jobs.filter((j) => /complete/i.test(statusOf(j))).length, icon: "shield" },
          { label: "Photos", value: model.jobs.filter((j) => Array.isArray(j.photos) && j.photos.length).length, icon: "photo" },
          { label: "Ready invoice", value: readyToInvoice, icon: "money", route: "invoices" },
          { label: "Follow-up", value: model.payments.length, icon: "card" },
        ],
        workspaceKicker: "Proof feed",
        workspaceTitle: "Proof and payment slips",
        workspaceBody: "Tap proof to check photos, completion notes, invoice readiness and payment action.",
        filters: ["Completed", "Photos", "Ready invoice", "Payment follow-up", "All proof"],
        emptyText: "No proof items found.",
      },
      rows: model.jobs.filter((j) => /complete|proof|photo|ready/i.test(statusOf(j))).length ? model.jobs.filter((j) => /complete|proof|photo|ready/i.test(statusOf(j))) : model.jobs,
      aiCards: [
        { title: "Proof checked", body: "Photos and worker notes are attached before invoice prep.", icon: "photo" },
        { title: "Invoice path ready", body: "Completed work becomes draft invoice context automatically.", icon: "money", route: "invoices" },
        { title: "Payment follow-up", body: "Unpaid or overdue payment actions are surfaced for approval.", icon: "card" },
      ],
      columns: [
        { key: "job", label: "Work", render: titleOf },
        { key: "client", label: "Client", render: clientName },
        { key: "worker", label: "Worker", render: workerName },
        { key: "proof", label: "Proof", render: (row) => Array.isArray(row.photos) && row.photos.length ? `${row.photos.length} photos` : "Checked" },
        { key: "invoice", label: "Invoice", render: (row) => clean(row.invoice_status || row.invoiceStatus, "Ready check") },
        { key: "ai", label: "AI action", render: (row) => aiReason(row, "Proof checked for invoice readiness.") },
      ],
    },

    payroll: {
      config: {
        kicker: "Payroll command",
        title: "Hours prepared,",
        accent: "for payroll review.",
        body: "Churvox prepares hours, pauses, job links, notes and export readiness without exposing owner billing mess.",
        stats: [
          { label: "Crew", value: model.crew.length, icon: "crew" },
          { label: "Hours", value: model.jobs.reduce((sum, j) => sum + Number(j.hours || j.total_hours || 0), 0), icon: "pulse" },
          { label: "Review", value: model.jobs.filter((j) => /missing|pause|review/i.test(statusOf(j))).length, icon: "alert" },
          { label: "Export", value: "Ready", icon: "document" },
        ],
        workspaceKicker: "Payroll review",
        workspaceTitle: "Timesheet slips",
        workspaceBody: "Tap a payroll slip to review worker hours, jobs, pauses and notes.",
        filters: ["Needs review", "Approved", "Missing clock-off", "Export ready"],
        emptyText: "No payroll records found.",
      },
      rows: model.crew.length ? model.crew : model.jobs,
      aiCards: [
        { title: "Missing clock-off", body: "Churvox flags time entries that need owner/admin review.", icon: "alert" },
        { title: "Long pause check", body: "Pauses and unusual time patterns are surfaced before approval.", icon: "pulse" },
        { title: "Export ready", body: "Approved hours can be exported for payroll handoff.", icon: "document" },
      ],
      columns: [
        { key: "worker", label: "Worker", render: workerName },
        { key: "hours", label: "Hours", render: (row) => clean(row.hours || row.total_hours || row.approved_hours, "0") },
        { key: "jobs", label: "Jobs", render: (row) => clean(row.jobs_count || row.job_count || row.current_job, "—") },
        { key: "pauses", label: "Pauses", render: (row) => clean(row.pause_total || row.pauses, "Checked") },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI flag", render: (row) => aiReason(row, "Payroll details checked.") },
      ],
    },

    plans: {
      config: {
        kicker: "Plan command",
        title: "Choose how much admin,",
        accent: "Churvox handles.",
        body: "Start simple, then grow into AI Operator Actions, MYOB sync, payroll workspace and advanced roles.",
        stats: [
          { label: "Start", value: "$39", icon: "target" },
          { label: "Crew", value: "$89", icon: "crew" },
          { label: "Operator", value: "$149", icon: "spark" },
          { label: "Command", value: "$299", icon: "shield" },
        ],
        workspaceKicker: "Plans",
        workspaceTitle: "Churvox pricing",
        workspaceBody: "Tap a plan to review what Churvox prepares for you.",
        filters: ["Monthly", "AI Operator", "MYOB", "Command"],
        emptyText: "No plans loaded.",
      },
      rows: [
        { id: "start", name: "Start", amount: 39, status: "Basic admin", prepared: "For solo operators getting work under control." },
        { id: "crew", name: "Crew", amount: 89, status: "Team workflow", prepared: "For businesses assigning work and tracking crew." },
        { id: "operator", name: "Operator", amount: 149, status: "Most popular", prepared: "AI Operator Actions prepare admin for approval." },
        { id: "command", name: "Command", amount: 299, status: "Full command", prepared: "MYOB included, payroll workspace, advanced roles and higher limits." },
      ],
      aiCards: [
        { title: "Operator is the main plan", body: "Best fit when Churvox prepares admin and the owner approves.", icon: "spark" },
        { title: "Command includes MYOB", body: "Command adds MYOB, payroll workspace and larger capacity.", icon: "shield" },
        { title: "Growth pack ready", body: "Command can grow by 50 active team member blocks.", icon: "crew" },
      ],
      columns: [
        { key: "name", label: "Plan", render: (row) => <strong>{row.name}</strong> },
        { key: "amount", label: "Price", render: (row) => `$${row.amount}/mo + GST` },
        { key: "status", label: "Best for", render: statusOf },
        { key: "included", label: "Included", render: (row) => row.prepared },
        { key: "ai", label: "AI value", render: () => "Churvox prepares admin. You approve." },
      ],
    },

    settings: {
      config: {
        kicker: "Settings command",
        title: "Business controls,",
        accent: "without the mess.",
        body: "Control roles, notifications, AI approval mode, billing, MYOB, SMS credits and security.",
        stats: [
          { label: "Business", value: "Ready", icon: "briefcase" },
          { label: "Roles", value: model.crew.length || "Set", icon: "crew" },
          { label: "AI mode", value: "Approve", icon: "spark" },
          { label: "Security", value: "On", icon: "shield" },
        ],
        workspaceKicker: "Settings",
        workspaceTitle: "Control centre",
        workspaceBody: "Tap a setting to manage business controls and AI behaviour.",
        filters: ["Business", "Roles", "AI Operator", "Billing", "MYOB", "SMS", "Security"],
        emptyText: "No settings found.",
      },
      rows: [
        { id: "business", title: "Business profile", status: "Ready", prepared: "Company details, industry and contact information." },
        { id: "roles", title: "Team roles", status: "Ready", prepared: "Owner, manager, worker, office admin and payroll permissions." },
        { id: "ai", title: "AI approval mode", status: "Prepare and ask", prepared: "Churvox prepares admin but never sends without approval." },
        { id: "billing", title: "Billing and plan", status: "Checked", prepared: "Plan, subscription and add-ons." },
        { id: "myob", title: "MYOB connection", status: "Optional", prepared: "Sync settings and accounting controls." },
        { id: "sms", title: "SMS credits", status: "Coming soon", prepared: "Credit packs and reminder controls." },
        { id: "security", title: "Security", status: "On", prepared: "Login, account and access controls." },
      ],
      aiCards: [
        { title: "Approval mode", body: "Draft only, prepare and ask, or high-confidence auto-prepare. Never auto-send without approval.", icon: "shield" },
        { title: "Role safety", body: "Payroll and worker users stay locked to the areas they need.", icon: "crew" },
        { title: "Integration control", body: "MYOB, SMS and billing settings stay grouped without clutter.", icon: "document" },
      ],
      columns: [
        { key: "title", label: "Setting", render: titleOf },
        { key: "status", label: "Status", render: statusOf },
        { key: "prepared", label: "What it controls", render: (row) => row.prepared },
        { key: "owner", label: "Owner action", render: () => "Review settings" },
        { key: "ai", label: "AI note", render: () => "Configured for approval-first admin." },
      ],
    },
  };

  const pageConfig = pages[current] || pages.work;

  return (
    <section className="cs-suite" data-phase="PHASE_212_WIRED_COMMAND_SUITE">
      <nav className="cs-subnav" aria-label="Command Suite pages">
        {NAV_ITEMS.map(([label, target, icon]) => {
          const active = PAGE_MAP[target] === current;
          return (
            <button
              type="button"
              key={target}
              className={active ? "active" : ""}
              onClick={() => goToPage(target)}
            >
              <Icon type={icon} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {current === "dashboard" ? (
        <section className="cs-page">
          <header className="cs-hero">
            <section>
              <span>Command Desk</span>
              <h1>
                Churvox prepares the admin.
                <mark>You approve the next move.</mark>
              </h1>
              <p>
                Work comes in, Churvox checks the admin path, then shows the owner one clean approval slip.
              </p>
            </section>

            <section className="cs-stats">
              {dashboardStats.map((stat) => (
                <Stat
                  key={stat.label}
                  {...stat}
                  onClick={() => openInfo({
                    __modalType: "Live metric",
                    __modalTitle: stat.label,
                    __body: `${stat.label}: ${stat.value}. Churvox keeps this updated from your business data.`,
                    status: "Live",
                  })}
                />
              ))}
            </section>
          </header>

          <section className="cs-command-cards">
            <button type="button" onClick={() => openInfo({ __modalType: "Approval queue", __modalTitle: "Ready for approval", __body: "These are owner-ready approval slips prepared by Churvox.", status: "Ready" })}>
              <Icon type="briefcase" />
              <div><strong>{approvals.length}</strong><span>Ready for approval</span><p>Owner-ready admin waiting for your decision.</p></div>
              <b>›</b>
            </button>
            <button type="button" onClick={() => goToPage("invoices")}>
              <Icon type="money" />
              <div><strong>{readyToInvoice}</strong><span>Ready to invoice</span><p>Completed work ready for invoice prep.</p></div>
              <b>›</b>
            </button>
            <button type="button" onClick={() => goToPage("team")}>
              <Icon type="crew" />
              <div><strong>{crewActive}</strong><span>Crew active today</span><p>Worker notes, proof and updates flowing in.</p></div>
              <b>›</b>
            </button>
          </section>

          <section className="cs-desk">
            <header>
              <Icon type="clipboard" />
              <h2>Approval Desk</h2>
              <i />
              <p>Review what Churvox prepared, approve it, or edit before it goes out.</p>
            </header>

            <section className="cs-approval-list">
              {approvals.length ? approvals.slice(0, showAllApprovals ? approvals.length : 5).map((item, index) => {
                const risk = riskFor(item);
                return (
                  <article
                    className="cs-approval-row"
                    key={idOf(item, index)}
                    role="button"
                    tabIndex={0}
                    onClick={() => openRecord(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") openRecord(item);
                    }}
                  >
                    <span>{clean(item.eyebrow || item.kind, "Approval")}</span>
                    <strong>{titleOf(item, "Approval slip")}</strong>
                    <p>{aiReason(item)}</p>
                    <b className={`cs-risk ${risk.tone}`}>{risk.label}</b>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openRecord(item);
                      }}
                    >
                      Open Approval Slip <em>›</em>
                    </button>
                  </article>
                );
              }) : (
                <section className="cs-empty">
                  <strong>No approvals waiting.</strong>
                  <p>When work comes in, Churvox prepares the admin and places clean approval slips here.</p>
                </section>
              )}

              {hiddenApprovalCount > 0 && !showAllApprovals ? (
                <button type="button" className="cs-view" onClick={() => setShowAllApprovals?.(true)}>
                  View all {approvals.length} approvals
                </button>
              ) : null}

              {showAllApprovals && approvals.length > 5 ? (
                <button type="button" className="cs-view ghost" onClick={() => setShowAllApprovals?.(false)}>
                  Show top 5 only
                </button>
              ) : null}
            </section>
          </section>

          <section className="cs-flow">
            <button type="button" onClick={() => openInfo({ __modalType: "AI Watch", __modalTitle: "AI is watching", __body: "Churvox watches each step from work intake to payment follow-up.", status: "Active" })}>
              <Icon type="eye" />
              <div><strong>AI is watching</strong><p>Every job. Every detail. Every time.</p></div>
            </button>
            <div>
              {[
                ["Work", "jobs"],
                ["Crew", "team"],
                ["Proof", "proof"],
                ["Invoice", "invoices"],
                ["Payment", "proof"],
              ].map(([label, route], index, arr) => (
                <React.Fragment key={`${label}-${route}`}>
                  <button type="button" onClick={() => goToPage(route)}>{label}</button>
                  {index < arr.length - 1 ? <b>›</b> : null}
                </React.Fragment>
              ))}
            </div>
          </section>
        </section>
      ) : (
        <SmartPage
          config={pageConfig.config}
          rows={pageConfig.rows}
          columns={pageConfig.columns}
          aiCards={pageConfig.aiCards}
          onOpen={openRecord}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          openInfo={openInfo}
          goToPage={goToPage}
        />
      )}

      {toast ? <aside className="cs-toast">{toast}</aside> : null}

      <DetailModal
        selected={selected}
        onClose={() => setSelected(null)}
        onApprove={approveRecord}
        setPage={goToPage}
      />
    </section>
  );
}
