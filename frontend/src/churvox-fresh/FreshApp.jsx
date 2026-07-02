import React from "react";
import "../churvox-clean/ChurvoxCleanApp.css";
import "../churvox-clean/ChurvoxCleanDensity.css";
import "../churvox-clean/ChurvoxCleanPremium.css";

const nav = [
  "AI Guide",
  "Command",
  "Jobs",
  "Clients",
  "Quotes",
  "Invoices",
  "Team",
  "Payroll",
  "Workers",
  "Xero",
  "Settings",
  "Plans",
  "Support",
];

const cleanKey = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");

const titles = {
  aiguide: ["AI Guide", "This week, needs attention, quick actions and quiet admin rules."],
  command: ["Command", "Owner approval desk. Approve, edit or park prepared admin."],
  jobs: ["Jobs", "Job cards, prices, dates, workers, recurring work and job notes."],
  clients: ["Clients", "Client records, service memory, saved prices and job history."],
  quotes: ["Quotes", "Draft quotes, scopes, prices, follow-ups and owner-approved sending."],
  invoices: ["Invoices", "Draft invoices, due work, paid status and guarded accounting handoff."],
  team: ["Team", "People, roles, access, invites and worker app status."],
  payroll: ["Payroll", "Pay-period review only. No tax filing. No bank payout files."],
  workers: ["Workers", "Map, clock status, proof, messages and daily slips."],
  xero: ["Xero", "Draft sync only. Owner-approved accounting handoff."],
  settings: ["Settings", "Business profile, GST, branding, imports and account controls."],
  plans: ["Plans", "Locked Churvox pricing and add-ons."],
  support: ["Support", "Setup help, short guides and contact options."],
};

const quickActions = [
  "Add job",
  "Add client",
  "Create quote",
  "Create invoice",
  "Open Command",
  "Import clients",
];

const metrics = [
  ["Today", "4 jobs", "Two ready, one issue, one complete"],
  ["This week", "$1,480", "Draft work Churvox can prepare"],
  ["Needs attention", "5", "Owner decisions only"],
  ["Invoices", "2 drafts", "No automatic sending"],
];

const commandRecords = [
  {
    title: "Approve garden reset quote",
    client: "Robert K",
    price: "$190",
    status: "Approval",
    date: "Today",
    worker: "Howard",
    repeat: "One-off",
    note: "Scope and price prepared. Owner can approve, edit the slip, or park it.",
    slip: ["Client confirmed overgrown reset", "Green waste included", "Photos required before invoice"],
  },
  {
    title: "Review invoice draft",
    client: "Lisa M",
    price: "$85",
    status: "Approval",
    date: "Due today",
    worker: "Worker account",
    repeat: "Fortnightly",
    note: "Ready to send after owner check. Churvox will not send this automatically.",
    slip: ["Mow, edges, blower tidy", "Before and after photos attached", "Draft invoice only"],
  },
  {
    title: "Changed job price",
    client: "Garden tidy",
    price: "$140",
    status: "Edit needed",
    date: "Today",
    worker: "Howard",
    repeat: "One-off",
    note: "Churvox found a price change and sent it here instead of hiding it in Jobs.",
    slip: ["Original price was $120", "Green waste added", "Needs owner decision"],
  },
  {
    title: "Worker message needs answer",
    client: "Mere H",
    price: "$120",
    status: "Message",
    date: "This afternoon",
    worker: "Worker account",
    repeat: "Monthly",
    note: "Worker asked whether to trim the side hedge. Reply or park for later.",
    slip: ["Message from worker", "Customer is home after 2pm", "Decision required before starting"],
  },
  {
    title: "Recurring date conflict",
    client: "Naenae regular",
    price: "$65",
    status: "Schedule",
    date: "Friday",
    worker: "Unassigned",
    repeat: "Fortnightly",
    note: "The next repeat clashes with another job. Command keeps the owner in control.",
    slip: ["Fortnightly cycle detected", "Worker unavailable", "Move date or assign another worker"],
  },
];

const jobs = [
  {
    title: "Lawn care - Birchville",
    client: "Lisa M",
    price: "$85",
    status: "Ready",
    date: "Today 10:30",
    worker: "Worker account",
    repeat: "Fortnightly",
    address: "Birchville",
    note: "Mow, edges, blower tidy. Worker proof required before invoice draft.",
  },
  {
    title: "Garden tidy - Naenae",
    client: "Robert K",
    price: "$140",
    status: "Needs approval",
    date: "Tomorrow 9:00",
    worker: "Howard",
    repeat: "One-off",
    address: "Naenae",
    note: "Green waste and garden reset. Price change has been sent to Command.",
  },
  {
    title: "Hedge trim - Wainuiomata",
    client: "Mere H",
    price: "$120",
    status: "Booked",
    date: "Friday 1:00",
    worker: "Worker account",
    repeat: "Monthly",
    address: "Wainuiomata",
    note: "Before and after photos required. Customer prefers afternoon.",
  },
  {
    title: "Regular mow - Belmont",
    client: "Sam T",
    price: "$65",
    status: "Assigned",
    date: "Monday 11:00",
    worker: "Cam",
    repeat: "Fortnightly",
    address: "Belmont",
    note: "Saved service memory: mow, line trim, blow paths, text when complete.",
  },
];

const clients = [
  {
    title: "Lisa M",
    client: "Birchville",
    price: "$85 saved",
    status: "Active",
    date: "Fortnightly",
    worker: "Worker account",
    repeat: "Fortnightly",
    address: "Birchville",
    note: "Lawn mow + edges. Saved price, service memory and invoice history.",
    history: ["Last job completed", "Invoice draft ready", "Next job booked"],
  },
  {
    title: "Robert K",
    client: "Naenae",
    price: "$190 quote",
    status: "Quote ready",
    date: "One-off",
    worker: "Howard",
    repeat: "One-off",
    address: "Naenae",
    note: "Garden tidy, green waste and reset notes. Waiting in Command.",
    history: ["Quote prepared", "Price change flagged", "Owner decision needed"],
  },
  {
    title: "Mere H",
    client: "Wainuiomata",
    price: "$120 saved",
    status: "Active",
    date: "Monthly",
    worker: "Worker account",
    repeat: "Monthly",
    address: "Wainuiomata",
    note: "Hedge trim, tidy and photo proof before complete.",
    history: ["Monthly service", "Customer prefers afternoons", "Proof required"],
  },
];

const quotes = [
  {
    title: "Garden reset quote",
    client: "Robert K",
    price: "$190",
    status: "Draft",
    date: "Prepared today",
    worker: "Howard",
    repeat: "One-off",
    note: "Scope, price and follow-up are ready for Command approval.",
  },
  {
    title: "Monthly maintenance",
    client: "Mere H",
    price: "$120",
    status: "Viewed",
    date: "Follow-up due",
    worker: "Worker account",
    repeat: "Monthly",
    note: "Churvox prepared a polite follow-up. Owner approves before sending.",
  },
  {
    title: "Commercial tidy",
    client: "Focus Landscaping",
    price: "$420",
    status: "Draft",
    date: "This week",
    worker: "Cam",
    repeat: "Weekly",
    note: "Weekly site tidy quote with scope, dates and owner approval required.",
  },
];

const invoices = [
  {
    title: "INV-1042",
    client: "Lisa M",
    price: "$85",
    status: "Draft",
    date: "Due today",
    worker: "Worker account",
    repeat: "Fortnightly",
    note: "Review before sending. No automatic invoice sending.",
  },
  {
    title: "INV-1041",
    client: "Straightforward Lawn Care",
    price: "$65",
    status: "Paid",
    date: "Paid after refresh",
    worker: "Howard",
    repeat: "Fortnightly",
    note: "Only marked paid after accounting refresh confirms paid.",
  },
  {
    title: "INV-1040",
    client: "Mere H",
    price: "$120",
    status: "Ready draft",
    date: "Friday",
    worker: "Worker account",
    repeat: "Monthly",
    note: "Draft created from job slip after proof is checked by owner.",
  },
];

const team = [
  {
    title: "Howard",
    client: "Owner",
    price: "Full access",
    status: "Active",
    date: "Command access",
    worker: "Owner",
    repeat: "N/A",
    note: "Command, settings, billing, approvals and accounting controls.",
  },
  {
    title: "Worker account",
    client: "Field worker",
    price: "Worker app",
    status: "Invited",
    date: "Mobile access",
    worker: "Worker",
    repeat: "N/A",
    note: "Jobs, proof, messages, clock status and daily slips only.",
  },
  {
    title: "Cam",
    client: "Subcontractor",
    price: "Limited",
    status: "Pending",
    date: "Invite ready",
    worker: "Field worker",
    repeat: "N/A",
    note: "Can see assigned jobs only after invite is accepted.",
  },
];

const workerSlips = [
  {
    title: "Birchville daily slip",
    client: "Lisa M",
    price: "$85",
    status: "Clocked in",
    date: "10:30",
    worker: "Worker account",
    repeat: "Fortnightly",
    address: "Birchville",
    note: "GPS near site. Photos required before complete. Message thread open.",
  },
  {
    title: "Naenae issue slip",
    client: "Robert K",
    price: "$140",
    status: "Sent to Command",
    date: "Tomorrow",
    worker: "Howard",
    repeat: "One-off",
    address: "Naenae",
    note: "Issue goes to Command. Jobs stays clean and the owner decides.",
  },
];

const payrollRows = [
  ["Howard", "18.5h", "$0 draft", "Owner review"],
  ["Worker account", "22.0h", "$0 draft", "Clock proof"],
  ["Cam", "6.0h", "$0 draft", "Pending invite"],
];

const plans = [
  ["Start", "$39", "For a solo owner starting clean.", ["Clients", "Jobs", "Quotes", "Invoices"]],
  ["Crew", "$89", "For a small crew that needs jobs, clients and workers.", ["Team access", "Worker slips", "Recurring jobs", "Command basics"]],
  ["Operator", "$149", "Most Popular. Churvox prepares more admin for approval.", ["AI admin preparation", "Approval desk", "Follow-ups", "Better daily control"]],
  ["Command", "$299", "Full approval desk, scale and accounting handoff.", ["Xero/MYOB draft sync", "Advanced controls", "Scale features", "Owner guardrails"]],
  ["Growth Pack", "$99", "Adds 50 active team members and extra capacity.", ["50 active team members", "Extra job capacity", "More AI actions", "More automation capacity"]],
  ["Accounting Add-on", "$39", "For non-Command tiers that need accounting handoff.", ["Draft sync only", "No auto-send", "No tax filing", "No payout files"]],
];

const actionSets = {
  command: ["Approve selected", "Edit selected", "Park selected", "Limit waiting list to 5"],
  jobs: ["Add job", "Recurring setup", "Assign worker", "Open editable form"],
  clients: ["Add client", "CSV import", "Open client form", "View job history"],
  quotes: ["Create quote", "Follow up", "Convert to job", "Send after approval"],
  invoices: ["Create invoice", "Review draft", "Sync draft", "Refresh paid status"],
  team: ["Add person", "Invite worker", "Set access", "Worker app status"],
  payroll: ["Weekly", "Fortnightly", "Monthly", "CSV export"],
  workers: ["Open map", "Send message", "Review proof", "Daily slips"],
  xero: ["Check status", "Draft sync", "Refresh payments", "Disconnect"],
  settings: ["Save profile", "Upload logo", "Import clients", "Account controls"],
  plans: ["Choose plan", "Add growth pack", "Accounting add-on"],
  support: ["Setup guide", "Contact help", "Report issue"],
};

function startPage() {
  if (typeof window === "undefined") return "aiguide";
  const raw = String(window.location.hash || window.location.pathname || "")
    .replace("#", "")
    .replace("/", "")
    .toLowerCase();
  const alias = {
    dashboard: "aiguide",
    smart: "aiguide",
    guide: "aiguide",
    setup: "aiguide",
    help: "support",
    accounting: "xero",
  };
  return alias[raw] || (nav.map(cleanKey).includes(raw) ? raw : "aiguide");
}

function ActionStrip({ page, items }) {
  const list = items || actionSets[page] || [];
  return (
    <div className="cvxActions">
      {list.map((item, index) => (
        <button key={item} type="button">
          <b>{index === 0 ? "+" : index === 1 ? "✓" : "•"}</b>
          {item}
        </button>
      ))}
    </div>
  );
}

function Panel({ eyebrow, title, children, wide, className }) {
  return (
    <section className={`cvxPanel ${wide ? "cvxWide" : ""} ${className || ""}`}>
      <p className="cvxEyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Metrics({ items }) {
  return (
    <div className="cvxMetrics">
      {items.map(([label, value, text]) => (
        <article key={label}>
          <span>{label}</span>
          <b>{value}</b>
          <small>{text}</small>
        </article>
      ))}
    </div>
  );
}

function RecordCard({ item, onOpen }) {
  return (
    <button className="cvxRecordCard" type="button" onClick={() => onOpen(item)}>
      <span className="cvxPill">{item.status}</span>
      <h3>{item.title}</h3>
      <p>{item.note}</p>
      <div className="cvxRecordMeta">
        <b>{item.client}</b>
        <strong>{item.price}</strong>
        <small>{item.date}</small>
        <small>{item.repeat}</small>
      </div>
    </button>
  );
}

function RecordGrid({ items, onOpen, limited }) {
  return (
    <div className={`cvxRecordGrid ${limited ? "cvxLimited" : ""}`}>
      {items.map((item) => (
        <RecordCard key={`${item.title}-${item.client}`} item={item} onOpen={onOpen} />
      ))}
    </div>
  );
}

function MiniList({ items }) {
  return (
    <div className="cvxMiniList">
      {items.map((item) => (
        <div key={item[0] || item}>
          <b>{Array.isArray(item) ? item[0] : item}</b>
          {Array.isArray(item) && <span>{item.slice(1).join(" · ")}</span>}
        </div>
      ))}
    </div>
  );
}

function FieldForm({ fields, button }) {
  return (
    <div className="cvxFormGrid">
      {fields.map(([label, value, type]) => (
        <label key={label}>
          {label}
          {type === "select" ? (
            <select defaultValue={value}>
              <option>One-off</option>
              <option>Weekly</option>
              <option>Fortnightly</option>
              <option>Monthly</option>
              <option>Custom</option>
            </select>
          ) : (
            <input defaultValue={value} />
          )}
        </label>
      ))}
      <button type="button">{button || "Save locally"}</button>
    </div>
  );
}

function Drawer({ item, page, onClose }) {
  const [form, setForm] = React.useState(item || {});
  React.useEffect(() => setForm(item || {}), [item]);
  if (!item) return null;
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const commandMode = page === "command";
  return (
    <aside className="cvxDrawer">
      <button className="cvxClose" type="button" onClick={onClose}>
        Close
      </button>
      <p className="cvxEyebrow">Editable record form</p>
      <h2>{form.title}</h2>
      <div className="cvxDrawerFields">
        <label>
          Title
          <input value={form.title || ""} onChange={(event) => set("title", event.target.value)} />
        </label>
        <label>
          Client / person
          <input value={form.client || ""} onChange={(event) => set("client", event.target.value)} />
        </label>
        <label>
          Address / area
          <input value={form.address || ""} onChange={(event) => set("address", event.target.value)} />
        </label>
        <label>
          Date / time
          <input value={form.date || ""} onChange={(event) => set("date", event.target.value)} />
        </label>
        <label>
          Worker
          <input value={form.worker || ""} onChange={(event) => set("worker", event.target.value)} />
        </label>
        <label>
          Price
          <input value={form.price || ""} onChange={(event) => set("price", event.target.value)} />
        </label>
        <label>
          Repeat
          <select value={form.repeat || "One-off"} onChange={(event) => set("repeat", event.target.value)}>
            <option>One-off</option>
            <option>Weekly</option>
            <option>Fortnightly</option>
            <option>Monthly</option>
            <option>Custom</option>
          </select>
        </label>
        <label>
          Status
          <input value={form.status || ""} onChange={(event) => set("status", event.target.value)} />
        </label>
        <label className="cvxFullField">
          Notes
          <textarea value={form.note || ""} onChange={(event) => set("note", event.target.value)} />
        </label>
      </div>
      {(form.slip || form.history) && (
        <div className="cvxSlipBox">
          <b>{form.slip ? "Prepared slip" : "History"}</b>
          <ul>
            {(form.slip || form.history || []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="cvxDrawerActions">
        {commandMode ? (
          <>
            <button type="button">Approve</button>
            <button type="button">Edit</button>
            <button type="button">Park</button>
          </>
        ) : (
          <>
            <button type="button">Save form</button>
            <button type="button">Send issue to Command</button>
          </>
        )}
      </div>
      <small>Clean frontend only. Backend wiring comes after the screens feel right.</small>
    </aside>
  );
}

function AIGuide() {
  return (
    <div className="cvxPageGrid">
      <Panel eyebrow="This week" title="Business pulse" wide>
        <Metrics items={metrics} />
      </Panel>
      <Panel eyebrow="Needs attention" title="Owner decisions">
        <MiniList
          items={[
            ["Quote", "Robert K reset quote needs approval"],
            ["Invoice", "Lisa M draft ready to review"],
            ["Worker", "Side hedge question sent to Command"],
            ["Recurring", "Friday conflict needs moving"],
          ]}
        />
      </Panel>
      <Panel eyebrow="Quick actions" title="Start the admin">
        <ActionStrip items={quickActions} />
      </Panel>
      <Panel eyebrow="Quiet admin rules" title="Churvox does the admin. You approve.">
        <ul className="cvxRules">
          <li>Issues go to Command, not hidden inside Jobs.</li>
          <li>Draft quotes and invoices wait for owner approval.</li>
          <li>Recurring work is saved on the job form.</li>
          <li>Paid is only updated after accounting refresh confirms paid.</li>
        </ul>
      </Panel>
      <Panel eyebrow="Setup checklist" title="Keep building">
        <MiniList
          items={[
            ["Clients", "Add client or import CSV"],
            ["Jobs", "Add price, repeat, worker, date and time"],
            ["Workers", "Use slips, proof, messages and map"],
            ["Accounting", "Draft sync only when owner approves"],
          ]}
        />
      </Panel>
    </div>
  );
}

function CommandPage({ open }) {
  return (
    <div className="cvxPageGrid">
      <Panel eyebrow="Decision desk" title="Waiting for owner" wide>
        <RecordGrid items={commandRecords} onOpen={open} limited />
      </Panel>
      <Panel eyebrow="Command controls" title="Approve, edit or park">
        <ActionStrip page="command" />
        <p className="cvxNotice">Only Command shows approval actions. Other pages send issues here.</p>
      </Panel>
      <Panel eyebrow="Prepared slip" title="What the owner sees">
        <FieldForm
          button="Save prepared slip locally"
          fields={[
            ["Client", "Lisa M"],
            ["Job", "Lawn care - Birchville"],
            ["Price", "$85"],
            ["Date", "Today 10:30"],
            ["Worker", "Worker account"],
            ["Repeat", "Fortnightly", "select"],
          ]}
        />
      </Panel>
    </div>
  );
}

function JobsPage({ open }) {
  return (
    <div className="cvxPageGrid">
      <Panel eyebrow="Job board" title="Saved jobs" wide>
        <RecordGrid items={jobs} onOpen={open} />
      </Panel>
      <Panel eyebrow="Add / edit job" title="Full job form">
        <FieldForm
          button="Save job locally"
          fields={[
            ["Client", "Lisa M"],
            ["Job title", "Lawn care - Birchville"],
            ["Price", "$85"],
            ["Date", "Today"],
            ["Time", "10:30"],
            ["Worker", "Worker account"],
            ["Repeat", "Fortnightly", "select"],
            ["Notes", "Mow, edges, blower tidy"],
          ]}
        />
      </Panel>
      <Panel eyebrow="Rules" title="Keep Jobs clean">
        <ul className="cvxRules">
          <li>Jobs is for the work, not owner problems.</li>
          <li>Any price, proof, message or schedule issue goes to Command.</li>
          <li>Recurring stays on the job form: weekly, fortnightly, monthly or custom.</li>
        </ul>
      </Panel>
    </div>
  );
}

function ClientsPage({ open }) {
  return (
    <div className="cvxPageGrid">
      <Panel eyebrow="Client records" title="Saved clients" wide>
        <RecordGrid items={clients} onOpen={open} />
      </Panel>
      <Panel eyebrow="Add client" title="Client form">
        <FieldForm
          button="Save client locally"
          fields={[
            ["Name", "New client"],
            ["Phone", ""],
            ["Email", ""],
            ["Address", ""],
            ["Default price", ""],
            ["Default repeat", "Fortnightly", "select"],
          ]}
        />
      </Panel>
      <Panel eyebrow="CSV import" title="Bring clients in">
        <p className="cvxNotice">Import area stays visible here so it does not get lost.</p>
        <ActionStrip items={["Choose CSV", "Check headers", "Import clients"]} />
      </Panel>
      <Panel eyebrow="Job history" title="Client memory">
        <MiniList
          items={[
            ["Lisa M", "Last job complete", "Invoice draft ready"],
            ["Robert K", "Quote prepared", "Price waiting approval"],
            ["Mere H", "Monthly hedge trim", "Photos required"],
          ]}
        />
      </Panel>
    </div>
  );
}

function QuotesPage({ open }) {
  return (
    <div className="cvxPageGrid">
      <Panel eyebrow="Quote drafts" title="Ready for owner" wide>
        <RecordGrid items={quotes} onOpen={open} />
      </Panel>
      <Panel eyebrow="Create quote" title="Scope and price">
        <FieldForm
          button="Prepare quote"
          fields={[
            ["Client", "Robert K"],
            ["Scope", "Garden reset"],
            ["Price", "$190"],
            ["Follow-up date", "Tomorrow"],
            ["Convert repeat", "One-off", "select"],
          ]}
        />
      </Panel>
      <Panel eyebrow="Follow-up" title="Churvox prepares it">
        <MiniList
          items={[
            ["Draft reply", "Polite follow-up waits for owner approval"],
            ["Convert to job", "Only after quote is accepted"],
            ["Send rule", "No automatic sending"],
          ]}
        />
      </Panel>
    </div>
  );
}

function InvoicesPage({ open }) {
  return (
    <div className="cvxPageGrid">
      <Panel eyebrow="Invoice drafts" title="Review before sending" wide>
        <RecordGrid items={invoices} onOpen={open} />
      </Panel>
      <Panel eyebrow="Create invoice" title="From job slip">
        <FieldForm
          button="Prepare invoice"
          fields={[
            ["Client", "Lisa M"],
            ["Job", "Lawn care - Birchville"],
            ["Amount", "$85"],
            ["Due date", "7 days"],
            ["Status", "Draft"],
          ]}
        />
      </Panel>
      <Panel eyebrow="Paid guardrail" title="No false paid status">
        <ul className="cvxRules">
          <li>No automatic invoice sending.</li>
          <li>No paid marking from a button alone.</li>
          <li>Paid only after Xero/MYOB refresh confirms paid.</li>
          <li>Draft sync only after owner approval.</li>
        </ul>
      </Panel>
    </div>
  );
}

function TeamPage({ open }) {
  return (
    <div className="cvxPageGrid">
      <Panel eyebrow="People" title="Team and access" wide>
        <RecordGrid items={team} onOpen={open} />
      </Panel>
      <Panel eyebrow="Invite" title="Add worker">
        <FieldForm
          button="Send invite locally"
          fields={[
            ["Name", "New worker"],
            ["Email", ""],
            ["Role", "Worker"],
            ["Access", "Assigned jobs only"],
          ]}
        />
      </Panel>
      <Panel eyebrow="Access rules" title="Keep roles simple">
        <MiniList
          items={[
            ["Owner", "Command, settings, billing, approvals"],
            ["Worker", "Assigned jobs, photos, messages, clock"],
            ["Payroll", "Pay review only, no reports unless allowed"],
          ]}
        />
      </Panel>
    </div>
  );
}

function PayrollPage() {
  return (
    <div className="cvxPageGrid">
      <Panel eyebrow="Pay period" title="Review only">
        <ActionStrip page="payroll" />
        <p className="cvxNotice">Payroll is review/export only. No tax filing and no bank payout files.</p>
      </Panel>
      <Panel eyebrow="This period" title="Worker hours" wide>
        <div className="cvxTable">
          {payrollRows.map(([name, hours, pay, status]) => (
            <div key={name}>
              <b>{name}</b>
              <span>{hours}</span>
              <span>{pay}</span>
              <small>{status}</small>
            </div>
          ))}
        </div>
      </Panel>
      <Panel eyebrow="Export" title="Owner checked first">
        <MiniList
          items={[
            ["CSV", "Export after review"],
            ["Manual adjust", "Owner can correct time"],
            ["Proof", "Time comes from worker clock slips"],
          ]}
        />
      </Panel>
    </div>
  );
}

function WorkersPage({ open }) {
  return (
    <div className="cvxPageGrid">
      <Panel eyebrow="GPS map" title="Worker route view" wide>
        <div className="cvxMap">
          <span>Google Maps placeholder</span>
          <small>Daily route, job pins, time on site and worker status connects here later.</small>
        </div>
      </Panel>
      <Panel eyebrow="Daily slips" title="Clock, proof and messages" wide>
        <RecordGrid items={workerSlips} onOpen={open} />
      </Panel>
      <Panel eyebrow="Messages" title="Sent to Command">
        <MiniList
          items={[
            ["Issue", "Worker questions become owner decisions"],
            ["Photos", "Before and after proof stays with the job"],
            ["Clock", "Start, pause, resume and complete feeds payroll review"],
          ]}
        />
      </Panel>
    </div>
  );
}

function XeroPage() {
  return (
    <div className="cvxPageGrid">
      <Panel eyebrow="Guarded sync" title="Xero / MYOB handoff">
        <ActionStrip page="xero" />
        <ul className="cvxRules">
          <li>Draft invoice sync only.</li>
          <li>Owner approval required.</li>
          <li>No automatic invoice sending.</li>
          <li>No tax filing.</li>
          <li>No bank payout files.</li>
        </ul>
      </Panel>
      <Panel eyebrow="Payment refresh" title="Paid only when confirmed">
        <p className="cvxNotice">Local buttons stay disabled-looking until backend wiring comes later.</p>
        <Metrics
          items={[
            ["Connection", "Later", "Frontend first"],
            ["Draft sync", "Guarded", "Owner approved"],
            ["Paid status", "Refresh", "Accounting confirms"],
            ["Safety", "Locked", "No auto-send"],
          ]}
        />
      </Panel>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="cvxPageGrid">
      <Panel eyebrow="Business profile" title="Brand and defaults" wide>
        <FieldForm
          button="Save settings locally"
          fields={[
            ["Business name", "Churvox"],
            ["Owner email", "hello@churvox.com"],
            ["GST rate", "15"],
            ["Country", "NZ"],
            ["Default repeat", "Fortnightly", "select"],
            ["Notifications", "On"],
            ["Logo", "Not uploaded"],
            ["Client CSV", "Ready"],
          ]}
        />
      </Panel>
      <Panel eyebrow="Imports" title="CSV and account controls">
        <MiniList
          items={[
            ["Clients CSV", "Visible from Settings and Clients"],
            ["Branding", "Logo, business name, GST and defaults"],
            ["Delete account", "Control comes back when backend wiring starts"],
          ]}
        />
      </Panel>
    </div>
  );
}

function PlansPage() {
  return (
    <div className="cvxPlans">
      {plans.map(([name, price, text, bullets]) => (
        <section key={name} className={name === "Operator" ? "cvxPopularPlan" : ""}>
          {name === "Operator" && <em>Most Popular</em>}
          <p className="cvxEyebrow">{name}</p>
          <h2>
            {price}
            <small>/month + GST</small>
          </h2>
          <span>{text}</span>
          <ul>
            {bullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SupportPage() {
  return (
    <div className="cvxPageGrid">
      <Panel eyebrow="Help" title="Churvox setup">
        <MiniList
          items={[
            ["Start", "Add clients and jobs"],
            ["Command", "Approve what Churvox prepares"],
            ["Workers", "Use slips, map, proof and messages"],
            ["Accounting", "Keep draft sync guarded"],
          ]}
        />
      </Panel>
      <Panel eyebrow="Contact" title="hello@churvox.com">
        <p className="cvxNotice">Support wiring comes after the clean frontend is stable.</p>
      </Panel>
      <Panel eyebrow="Guides" title="What each page is for">
        <ul className="cvxRules">
          <li>AI Guide shows the business pulse.</li>
          <li>Command is the owner approval desk.</li>
          <li>Jobs and Clients hold the real work forms.</li>
          <li>Workers is where map, proof and messages live.</li>
        </ul>
      </Panel>
    </div>
  );
}

function Page({ page, open }) {
  if (page === "aiguide") return <AIGuide />;
  if (page === "command") return <CommandPage open={open} />;
  if (page === "jobs") return <JobsPage open={open} />;
  if (page === "clients") return <ClientsPage open={open} />;
  if (page === "quotes") return <QuotesPage open={open} />;
  if (page === "invoices") return <InvoicesPage open={open} />;
  if (page === "team") return <TeamPage open={open} />;
  if (page === "payroll") return <PayrollPage />;
  if (page === "workers") return <WorkersPage open={open} />;
  if (page === "xero") return <XeroPage />;
  if (page === "settings") return <SettingsPage />;
  if (page === "plans") return <PlansPage />;
  return <SupportPage />;
}

export default function FreshApp() {
  const [page, setPage] = React.useState(startPage);
  const [selected, setSelected] = React.useState(null);
  const [title, sub] = titles[page] || titles.aiguide;

  const go = (next) => {
    setPage(next);
    setSelected(null);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", `/dashboard#${next}`);
    }
  };

  return (
    <main className="cvxClean">
      <div className="cvxCleanShell">
        <header className="cvxCleanTop">
          <div className="cvxCleanHead">
            <div className="cvxCleanBrand">
              <span className="cvxCleanMark" />
              <span>
                <b>Churvox</b>
                <small>does the admin</small>
              </span>
            </div>
            <div className="cvxCleanTitle">
              <h1>{title}</h1>
              <p>{sub}</p>
            </div>
            <a className="cvxCleanLogout" href="/login">
              Log out
            </a>
          </div>
          <nav className="cvxCleanNav" aria-label="Churvox pages">
            {nav.map((item) => {
              const next = cleanKey(item);
              return (
                <button key={item} type="button" className={page === next ? "active" : ""} onClick={() => go(next)}>
                  {item}
                </button>
              );
            })}
          </nav>
        </header>
        <section className="cvxCleanWork">
          <Page page={page} open={setSelected} />
        </section>
      </div>
      <Drawer item={selected} page={page} onClose={() => setSelected(null)} />
    </main>
  );
}
