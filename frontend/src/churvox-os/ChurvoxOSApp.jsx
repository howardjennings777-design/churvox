import React from "react";
import "./churvoxOS.css";

const NAV = [
  { key: "hub", label: "Smart Hub", code: "SH", group: "Run" },
  { key: "command", label: "Command", code: "CM", group: "Run" },
  { key: "messages", label: "Messages", code: "MS", group: "Run" },
  { key: "jobs", label: "Jobs", code: "JB", group: "Work" },
  { key: "clients", label: "Clients", code: "CL", group: "Work" },
  { key: "workers", label: "Workers", code: "WV", group: "Work" },
  { key: "team", label: "Team", code: "TM", group: "Work" },
  { key: "quotes", label: "Quotes", code: "QT", group: "Money" },
  { key: "invoices", label: "Invoices", code: "IV", group: "Money" },
  { key: "xero", label: "Xero Sync", code: "AC", group: "Money" },
  { key: "settings", label: "Settings", code: "SG", group: "Control" },
  { key: "plans", label: "Plans", code: "PL", group: "Control" },
  { key: "help", label: "Help", code: "HP", group: "Control" },
];

const ALIASES = {
  "": "hub",
  dashboard: "hub",
  home: "hub",
  smart: "hub",
  planday: "hub",
  today: "hub",
  calendar: "hub",
  schedule: "hub",
  command: "command",
  askchurvox: "command",
  automation: "command",
  followups: "command",
  messages: "messages",
  inbox: "messages",
  jobs: "jobs",
  recurring: "jobs",
  routes: "jobs",
  dispatch: "jobs",
  clients: "clients",
  reviews: "clients",
  feedback: "clients",
  workers: "workers",
  worker: "workers",
  workerview: "workers",
  workercommand: "workers",
  time: "workers",
  timelogs: "workers",
  team: "team",
  payroll: "team",
  contractors: "team",
  quotes: "quotes",
  variations: "quotes",
  invoices: "invoices",
  payments: "invoices",
  expenses: "invoices",
  xero: "xero",
  accounting: "xero",
  sync: "xero",
  settings: "settings",
  plans: "plans",
  help: "help",
  support: "help",
  helpdesk: "help",
  trust: "help",
};

const triage = [
  { type: "Money waiting", title: "Lawn job can become an invoice", meta: "Worker proof missing, draft held for owner" },
  { type: "Worker gap", title: "Tomorrow job has no worker", meta: "Best crew match is ready to approve" },
  { type: "Quote follow-up", title: "Viewed quote needs a nudge", meta: "Message drafted, not sent" },
];

const approvals = [
  { title: "Invoice ready", note: "Howard Jennings Naenae. Last similar job was $85. Draft prepared at $85.", kind: "Money" },
  { title: "Assign worker", note: "Tomorrow recurring job has no worker. Churvox found the best available person.", kind: "Work" },
  { title: "Follow-up message", note: "Quote viewed twice. Short follow-up drafted for approval.", kind: "Message" },
  { title: "Payroll check", note: "Worker time changed after completion. Review before export.", kind: "Team" },
];

const planRows = [
  { name: "Start", price: "$39/month + GST", text: "Jobs, clients, quotes, invoices and recurring jobs for one owner." },
  { name: "Crew", price: "$89/month + GST", text: "Adds workers, proof, messages and team access for small crews." },
  { name: "Operator", price: "$149/month + GST", text: "Most Popular. Churvox starts preparing admin work for approval." },
  { name: "Command", price: "$299/month + GST", text: "Full approval desk, payroll review, accounting sync option and higher capacity." },
];

function normalise(value) {
  const key = String(value || "").replace(/^#/, "").replace(/^\//, "").trim().toLowerCase();
  return ALIASES[key] || (NAV.some((item) => item.key === key) ? key : "hub");
}

function useRoute() {
  const [page, setPage] = React.useState(() => {
    if (typeof window === "undefined") return "hub";
    return normalise(window.location.hash || window.localStorage?.getItem("churvox.os.page"));
  });

  React.useEffect(() => {
    const onHash = () => setPage(normalise(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = React.useCallback((next) => {
    const target = normalise(next);
    setPage(target);
    if (typeof window !== "undefined") {
      window.localStorage?.setItem("churvox.os.page", target);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${target}`);
    }
  }, []);

  return [page, navigate];
}

function Sidebar({ page, onNavigate }) {
  const groups = NAV.reduce((acc, item) => {
    acc[item.group] = acc[item.group] || [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <aside className="osSide">
      <div className="osBrand">
        <div className="osBadge">C</div>
        <div><strong>CHURVOX</strong><span>Command workspace</span></div>
      </div>
      <button className="osLogout" type="button">Log out</button>
      {Object.entries(groups).map(([group, items]) => (
        <nav className="osNavGroup" key={group} aria-label={group}>
          <p>{group}</p>
          {items.map((item) => (
            <button key={item.key} type="button" className={page === item.key ? "active" : ""} onClick={() => onNavigate(item.key)}>
              <span>{item.code}</span>{item.label}
            </button>
          ))}
        </nav>
      ))}
      <div className="osPromise">Churvox does the admin. You approve.</div>
    </aside>
  );
}

function TopCommand({ page }) {
  const label = NAV.find((item) => item.key === page)?.label || "Smart Hub";
  return (
    <header className="osTop">
      <div><span>Owner OS</span><strong>{label}</strong></div>
      <label className="osAsk"><span>Ask Churvox</span><input placeholder="Book a job, find unpaid work, prepare a follow-up..." /></label>
    </header>
  );
}

function HubPage({ onNavigate }) {
  return (
    <section className="osHub">
      <div className="hubHero">
        <span className="osEyebrow">Smart Hub</span>
        <h1>Only the work that needs the owner.</h1>
        <p>Churvox watches jobs, money, proof and worker gaps in the background. This screen only shows what needs doing next.</p>
        <div className="hubActions"><button type="button" onClick={() => onNavigate("jobs")}>Add job</button><button type="button" onClick={() => onNavigate("command")}>Review Command</button></div>
      </div>
      <div className="hubToday">
        <span>Today</span><strong>3 decisions</strong><p>Everything else is being watched quietly.</p>
      </div>
      <div className="hubTriage">
        {triage.map((item) => <article key={item.title}><span>{item.type}</span><strong>{item.title}</strong><p>{item.meta}</p></article>)}
      </div>
      <div className="hubEngine">
        <h2>Silent admin engine</h2>
        <div><b>Recurring</b><span>Creates the next work prompt inside Jobs.</span></div>
        <div><b>Proof</b><span>Blocks risky invoices until proof exists.</span></div>
        <div><b>Memory</b><span>Reuses price, notes and owner preferences.</span></div>
        <div><b>Money</b><span>Finds unpaid, overdue and sync-ready work.</span></div>
      </div>
    </section>
  );
}

function CommandPage() {
  return (
    <section className="osCommand">
      <div className="commandQueue">
        <span className="osEyebrow">Admin queue</span>
        <h1>Decisions, not chores.</h1>
        <div className="queueTabs"><b>Open 12</b><span>Edited 0</span><span>Parked 1</span></div>
        {approvals.map((item) => <button type="button" key={item.title}><small>{item.kind}</small><strong>{item.title}</strong><span>{item.note}</span></button>)}
      </div>
      <div className="preparedForm">
        <span className="osEyebrow">Prepared by Churvox</span>
        <h2>Invoice draft is already filled.</h2>
        <div className="formRows"><label>Client<b>Howard Jennings Naenae</b></label><label>Job<b>Lawn service complete</b></label><label>Price memory<b>Last time this client paid $85</b></label><label>Prepared total<b>$85.00</b></label></div>
        <div className="decisionBar"><button type="button">Approve</button><button type="button">Edit</button><button type="button">Park</button></div>
      </div>
      <aside className="proofRail">
        <h3>Proof and owner control</h3>
        <p>Job, note, photo, worker time and client history stay here. They support the decision without taking over the page.</p>
        <ul><li>No auto-send</li><li>No tax filing</li><li>No bank payout files</li><li>No paid status without sync confirmation</li></ul>
      </aside>
    </section>
  );
}

function JobsPage({ onNavigate }) {
  const lanes = ["Today", "Recurring", "No worker", "Needs invoice"];
  return (
    <section className="osJobs">
      <div className="jobsHeader"><span className="osEyebrow">Dispatch board</span><h1>Jobs stay simple: who, where, what next.</h1><button type="button">Create job</button></div>
      <div className="jobLanes">{lanes.map((lane, index) => <article key={lane}><header><b>{lane}</b><span>{index + 2}</span></header><div><strong>{lane === "Recurring" ? "Fortnightly lawn run" : "Naenae lawn service"}</strong><p>{lane === "Needs invoice" ? "Completed. Churvox is preparing the admin." : "Client, address, worker and next action attached."}</p></div></article>)}</div>
      <div className="jobInspector"><h2>Selected job</h2><p>One job opens one work surface: client, worker, proof, notes, quote and invoice history.</p><button type="button" onClick={() => onNavigate("command")}>Send issue to Command</button></div>
    </section>
  );
}

function ClientsPage() {
  return (
    <section className="osClients">
      <div className="clientSearch"><span className="osEyebrow">Customer memory</span><h1>Every client has a trail.</h1><input placeholder="Search name, phone, email or address" /><div><b>bob</b><span>Recent value $0.00</span></div><div><b>Kauri Dental</b><span>Quote follow-up ready</span></div></div>
      <div className="clientProfile"><h2>bob</h2><p>bob@bob / 0204957974</p><dl><div><dt>Service address</dt><dd>Flat 1</dd></div><div><dt>Last price</dt><dd>$85 memory match</dd></div><div><dt>Open money</dt><dd>$0.00</dd></div><div><dt>Next action</dt><dd>Prepare follow-up when work completes</dd></div></dl></div>
      <div className="clientTimeline"><h3>Admin trail</h3>{["Job completed", "Invoice prepared", "Quote follow-up drafted", "Owner note saved"].map((x) => <p key={x}>{x}</p>)}</div>
    </section>
  );
}

function WorkersPage({ onNavigate }) {
  return (
    <section className="osWorkers">
      <div className="workerMap"><span>GPS</span><h1>Live field view</h1><p>Location, job site, route check, photos and timer proof appear here when workers are live.</p></div>
      <aside className="workerList"><span className="osEyebrow">Workers</span><h2>Field status</h2><button type="button">Refresh live</button><article><b>No live worker selected</b><p>Waiting for worker app location data.</p></article><button type="button" onClick={() => onNavigate("team")}>Open Team</button></aside>
      <aside className="workerProof"><h3>Current job proof</h3><p>Photos, notes, time and alerts feed Command so the owner approves with confidence.</p></aside>
    </section>
  );
}

function QuotesPage() {
  return <Pipeline title="Quotes" kicker="Offer pipeline" lanes={["Draft", "Sent", "Viewed", "Follow-up", "Accepted"]} action="Convert accepted quote to job" />;
}

function InvoicesPage() {
  return <Pipeline title="Invoices" kicker="Money desk" lanes={["Needs invoice", "Draft", "Sent", "Overdue", "Paid", "Sync-ready"]} action="Review before send or sync" />;
}

function Pipeline({ title, kicker, lanes, action }) {
  return (
    <section className="osPipeline">
      <header><span className="osEyebrow">{kicker}</span><h1>{title} move through decisions.</h1><p>{action}. Churvox prepares the next move and waits for owner approval.</p></header>
      <div className="pipeTrack">{lanes.map((lane, index) => <article key={lane}><span>{index + 1}</span><b>{lane}</b><p>{lane.includes("Overdue") || lane.includes("Follow") ? "Churvox prepares the reminder." : "Owner stays in control."}</p></article>)}</div>
      <aside><h2>Prepared action</h2><p>Selected record opens as a clean approval form, not a full admin rebuild.</p><button type="button">Prepare in Command</button></aside>
    </section>
  );
}

function TeamPage({ onNavigate }) {
  return (
    <section className="osTeam">
      <header><span className="osEyebrow">People and access</span><h1>Team is an access matrix.</h1><p>Workers, payroll-only people, invites and missing setup stay clear.</p></header>
      <table><thead><tr><th>Person</th><th>Role</th><th>Worker app</th><th>Payroll</th><th>Action</th></tr></thead><tbody>{["Worker one", "Subcontractor", "Payroll admin"].map((name, i) => <tr key={name}><td>{name}</td><td>{i === 2 ? "Payroll" : "Field"}</td><td>{i === 2 ? "Off" : "Ready"}</td><td>{i === 0 ? "Review" : "None"}</td><td><button type="button">Open</button></td></tr>)}</tbody></table>
      <aside><h2>Worker gaps become Command items.</h2><p>If a job has no worker, missing app access or payroll concern, Churvox surfaces the decision.</p><button type="button" onClick={() => onNavigate("workers")}>Open worker view</button></aside>
    </section>
  );
}

function MessagesPage({ onNavigate }) {
  return (
    <section className="osMessages">
      <header><span className="osEyebrow">Prepared replies</span><h1>Messages are approval work, not another inbox.</h1></header>
      <div>{["Quote follow-up", "Proof request", "Invoice reminder"].map((x) => <article key={x}><b>{x}</b><p>Drafted by Churvox and waiting for owner approval.</p></article>)}</div>
      <aside><h2>Nothing leaves without approval.</h2><p>Messages connect back to jobs, clients, quotes and invoices.</p><button type="button" onClick={() => onNavigate("command")}>Review in Command</button></aside>
    </section>
  );
}

function XeroPage() {
  return (
    <section className="osSync">
      <div><span className="osEyebrow">Accounting sync</span><h1>Draft sync only. Owner approval stays in control.</h1><p>Churvox prepares draft invoices and payment checks. It does not auto-send invoices, file tax or create payout files.</p></div>
      <div className="syncRules"><b>Draft invoice sync</b><b>Payment status refresh</b><b>Accounting export</b><b>Owner approval required</b></div>
    </section>
  );
}

function SettingsPage() {
  return <ControlPage page="settings" title="Business controls without the maze." items={["Branding", "GST and region", "Approval rules", "Imports and exports", "Account safety", "Notification defaults"]} />;
}

function HelpPage() {
  return <ControlPage page="help" title="Help should get the owner unstuck fast." items={["Setup check", "Launch checklist", "Contact support", "Worker guide", "Accounting guide", "Tester readiness"]} />;
}

function ControlPage({ title, items }) {
  return (
    <section className="osControl">
      <header><span className="osEyebrow">Control</span><h1>{title}</h1></header>
      <div>{items.map((item) => <article key={item}><b>{item}</b><p>Clear controls, no hidden dead ends.</p></article>)}</div>
    </section>
  );
}

function PlansPage() {
  return (
    <section className="osPlans">
      <header><span className="osEyebrow">Plans</span><h1>Simple tiers. Real admin power.</h1><p>No fake basic/light labels. Each plan shows what Churvox actually unlocks.</p></header>
      <div>{planRows.map((plan) => <article key={plan.name} className={plan.name === "Operator" ? "popular" : ""}><h2>{plan.name}</h2><strong>{plan.price}</strong><p>{plan.text}</p></article>)}</div>
      <footer>Command Growth Pack: $99/month + GST. Accounting Sync Add-on: $39/month + GST for non-Command tiers.</footer>
    </section>
  );
}

function Page({ page, onNavigate }) {
  if (page === "command") return <CommandPage />;
  if (page === "messages") return <MessagesPage onNavigate={onNavigate} />;
  if (page === "jobs") return <JobsPage onNavigate={onNavigate} />;
  if (page === "clients") return <ClientsPage />;
  if (page === "workers") return <WorkersPage onNavigate={onNavigate} />;
  if (page === "team") return <TeamPage onNavigate={onNavigate} />;
  if (page === "quotes") return <QuotesPage />;
  if (page === "invoices") return <InvoicesPage />;
  if (page === "xero") return <XeroPage />;
  if (page === "settings") return <SettingsPage />;
  if (page === "plans") return <PlansPage />;
  if (page === "help") return <HelpPage />;
  return <HubPage onNavigate={onNavigate} />;
}

export default function ChurvoxOSApp() {
  const [page, navigate] = useRoute();
  return (
    <div className="churvoxOS">
      <Sidebar page={page} onNavigate={navigate} />
      <main className="osMain">
        <TopCommand page={page} />
        <Page page={page} onNavigate={navigate} />
      </main>
    </div>
  );
}
