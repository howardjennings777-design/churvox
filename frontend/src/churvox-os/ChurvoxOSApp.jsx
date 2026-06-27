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
  "": "hub", dashboard: "hub", home: "hub", smart: "hub", planday: "hub", today: "hub", calendar: "hub", schedule: "hub",
  command: "command", askchurvox: "command", automation: "command", followups: "command",
  messages: "messages", inbox: "messages",
  jobs: "jobs", recurring: "jobs", routes: "jobs", dispatch: "jobs",
  clients: "clients", reviews: "clients", feedback: "clients",
  workers: "workers", worker: "workers", workerview: "workers", workercommand: "workers", time: "workers", timelogs: "workers",
  team: "team", payroll: "team", contractors: "team",
  quotes: "quotes", variations: "quotes",
  invoices: "invoices", payments: "invoices", expenses: "invoices",
  xero: "xero", accounting: "xero", sync: "xero",
  settings: "settings", plans: "plans", help: "help", support: "help", helpdesk: "help", trust: "help",
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

const jobLanes = [
  { name: "Today", count: 2, items: [["Naenae lawn service", "9:30 am", "Ready"], ["Kauri Dental clean", "1:00 pm", "Worker assigned"]] },
  { name: "Recurring", count: 3, items: [["Fortnightly lawn run", "Next Tue", "Auto-created"], ["Monthly hedge trim", "Draft", "Needs date"]] },
  { name: "No worker", count: 4, items: [["Belmont reset", "Tomorrow", "Match found"], ["Upper Hutt garden", "Friday", "Needs approval"]] },
  { name: "Needs invoice", count: 5, items: [["Naenae lawn service", "$85", "Draft prepared"], ["Worker proof job", "$120", "Proof check"]] },
];

const quoteLanes = [
  { name: "Draft", items: ["Kauri Dental quote", "Hedge reset offer"] },
  { name: "Sent", items: ["PW public quote"] },
  { name: "Viewed", items: ["Naenae one-off tidy"] },
  { name: "Follow-up", items: ["Commercial clean quote"] },
  { name: "Accepted", items: ["Monthly garden run"] },
];

const invoiceLanes = [
  { name: "Needs invoice", items: ["Naenae lawn", "Worker proof job"] },
  { name: "Draft", items: ["Kauri Dental"] },
  { name: "Sent", items: ["Belmont reset"] },
  { name: "Overdue", items: ["Upper Hutt garden"] },
  { name: "Paid", items: ["June lawn run"] },
  { name: "Sync-ready", items: ["Draft to Xero"] },
];

const planRows = [
  { name: "Start", price: "$39/month + GST", tag: "Simple records", text: "Jobs, clients, quotes, invoices and recurring jobs for one owner.", includes: ["Jobs and clients", "Quotes and invoices", "Recurring inside Jobs"] },
  { name: "Crew", price: "$89/month + GST", tag: "Field proof", text: "Adds workers, proof, messages and team access for small crews.", includes: ["Worker view", "Team access", "Proof and messages"] },
  { name: "Operator", price: "$149/month + GST", tag: "Most Popular", text: "Churvox starts preparing admin work for owner approval.", includes: ["AI admin actions", "Follow-up drafts", "Admin debt checks"] },
  { name: "Command", price: "$299/month + GST", tag: "Approval OS", text: "Full approval desk, payroll review, accounting sync option and higher capacity.", includes: ["Command desk", "Payroll review", "Accounting sync option"] },
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
      <div className="osBrand"><div className="osBadge">C</div><div><strong>CHURVOX</strong><span>Command workspace</span></div></div>
      <button className="osLogout" type="button">Log out</button>
      {Object.entries(groups).map(([group, items]) => (
        <nav className="osNavGroup" key={group} aria-label={group}>
          <p>{group}</p>
          {items.map((item) => (
            <button key={item.key} type="button" className={page === item.key ? "active" : ""} onClick={() => onNavigate(item.key)}><span>{item.code}</span>{item.label}</button>
          ))}
        </nav>
      ))}
      <div className="osPromise">Churvox does the admin. You approve.</div>
    </aside>
  );
}

function TopCommand({ page }) {
  const label = NAV.find((item) => item.key === page)?.label || "Smart Hub";
  return <header className="osTop"><div><span>Owner OS</span><strong>{label}</strong></div><label className="osAsk"><span>Ask Churvox</span><input placeholder="Book a job, find unpaid work, prepare a follow-up..." /></label></header>;
}

function HubPage({ onNavigate }) {
  return (
    <section className="osHub">
      <div className="hubHero"><span className="osEyebrow">Smart Hub</span><h1>Only the work that needs the owner.</h1><p>Churvox watches jobs, money, proof and worker gaps in the background. This screen only shows what needs doing next.</p><div className="hubActions"><button type="button" onClick={() => onNavigate("jobs")}>Add job</button><button type="button" onClick={() => onNavigate("command")}>Review Command</button></div></div>
      <div className="hubToday"><span>Today</span><strong>3 decisions</strong><p>Everything else is being watched quietly.</p><div className="quietStack"><b>82 jobs watched</b><b>21 invoice checks</b><b>32 worker gaps scanned</b></div></div>
      <div className="hubTriage">{triage.map((item) => <article key={item.title}><span>{item.type}</span><strong>{item.title}</strong><p>{item.meta}</p></article>)}</div>
      <div className="hubEngine"><h2>Silent admin engine</h2><div><b>Recurring</b><span>Creates the next work prompt inside Jobs.</span></div><div><b>Proof</b><span>Blocks risky invoices until proof exists.</span></div><div><b>Memory</b><span>Reuses price, notes and owner preferences.</span></div><div><b>Money</b><span>Finds unpaid, overdue and sync-ready work.</span></div></div>
    </section>
  );
}

function CommandPage() {
  return (
    <section className="osCommand">
      <div className="commandQueue"><span className="osEyebrow">Admin queue</span><h1>Decisions, not chores.</h1><div className="queueTabs"><b>Open 12</b><span>Edited 0</span><span>Parked 1</span></div>{approvals.map((item) => <button type="button" key={item.title}><small>{item.kind}</small><strong>{item.title}</strong><span>{item.note}</span></button>)}</div>
      <div className="preparedForm"><span className="osEyebrow">Prepared by Churvox</span><h2>Invoice draft is already filled.</h2><div className="formRows"><label>Client<b>Howard Jennings Naenae</b></label><label>Job<b>Lawn service complete</b></label><label>Price memory<b>Last time this client paid $85</b></label><label>Prepared total<b>$85.00</b></label></div><div className="decisionBar"><button type="button">Approve</button><button type="button">Edit</button><button type="button">Park</button></div></div>
      <aside className="proofRail"><h3>Proof and owner control</h3><p>Job, note, photo, worker time and client history stay here. They support the decision without taking over the page.</p><ul><li>No auto-send</li><li>No tax filing</li><li>No bank payout files</li><li>No paid status without sync confirmation</li></ul></aside>
    </section>
  );
}

function JobsPage({ onNavigate }) {
  return (
    <section className="osJobs">
      <div className="jobsHeader"><span className="osEyebrow">Dispatch board</span><h1>Jobs stay simple: who, where, what next.</h1><button type="button">Create job</button></div>
      <div className="jobLanes">{jobLanes.map((lane) => <article key={lane.name}><header><b>{lane.name}</b><span>{lane.count}</span></header>{lane.items.map(([title, meta, status]) => <div key={title}><strong>{title}</strong><p>{meta}</p><small>{status}</small></div>)}</article>)}</div>
      <div className="jobInspector"><h2>Selected job</h2><p>One job opens one work surface: client, worker, proof, notes, quote and invoice history.</p><button type="button" onClick={() => onNavigate("command")}>Send issue to Command</button></div>
    </section>
  );
}

function ClientsPage() {
  return (
    <section className="osClients osClientsV2">
      <div className="clientSearch"><span className="osEyebrow">Customer memory</span><h1>Every client has a working history.</h1><input placeholder="Search name, phone, email or address" /><button type="button" className="clientActive"><b>bob</b><span>$85 price memory ready</span></button><button type="button"><b>Kauri Dental</b><span>Quote follow-up ready</span></button><button type="button"><b>Naenae lawn</b><span>Invoice can be prepared</span></button></div>
      <div className="clientProfile"><div><span className="osEyebrow">Selected client</span><h2>bob</h2><p>bob@bob / 0204957974</p></div><dl><div><dt>Service address</dt><dd>Flat 1</dd></div><div><dt>Last price</dt><dd>$85 memory match</dd></div><div><dt>Open money</dt><dd>$0.00</dd></div><div><dt>Next action</dt><dd>Prepare follow-up when work completes</dd></div></dl><div className="memoryNote"><b>Memory Churvox can use</b><span>Price, notes, service address and owner preferences feed Command so the next quote, invoice or message starts already filled.</span></div></div>
      <div className="clientTimeline"><h3>Admin trail</h3>{["Job completed", "Invoice prepared", "Quote follow-up drafted", "Owner note saved"].map((x) => <p key={x}>{x}</p>)}<button type="button">Prepare next action</button></div>
    </section>
  );
}

function WorkersPage({ onNavigate }) {
  return (
    <section className="osWorkers osWorkersV2">
      <div className="workerMap"><span>GPS</span><h1>Live field command.</h1><p>GPS, current job, route check, time and proof sit together so the owner does not chase workers.</p><div className="fieldGrid"><b>Route standby<small>Waiting for worker app location</small></b><b>Current job<small>No worker selected</small></b><b>Timer proof<small>Ready when shift starts</small></b><b>Photo proof<small>Feeds Command approval</small></b></div></div>
      <aside className="workerList"><span className="osEyebrow">Field status</span><h2>Workers only show when action is needed.</h2><button type="button">Refresh live</button><article><b>No live worker selected</b><p>Team records and jobs still work. GPS appears when the worker app sends location.</p></article><button type="button" onClick={() => onNavigate("team")}>Open Team</button></aside>
      <aside className="workerProof"><h3>Proof pack</h3><p>Photos, notes, time and location become approval evidence without making the owner hunt through pages.</p><div className="proofDots"><span>Photo</span><span>Note</span><span>Time</span><span>GPS</span></div></aside>
    </section>
  );
}

function QuotesPage() { return <Pipeline title="Quotes" kicker="Offer pipeline" lanes={quoteLanes} action="Convert accepted quote to job" />; }
function InvoicesPage() { return <Pipeline title="Invoices" kicker="Money desk" lanes={invoiceLanes} action="Review before send or sync" />; }

function Pipeline({ title, kicker, lanes, action }) {
  const isInvoice = title === "Invoices";
  return (
    <section className={`osPipeline osPipelineV2 ${isInvoice ? "invoiceDesk" : "quoteDesk"}`}>
      <header><span className="osEyebrow">{kicker}</span><h1>{title} should move themselves until approval.</h1><p>{action}. Churvox watches the trail, prepares the next admin step and waits for the owner.</p></header>
      <div className="pipeTrack">{lanes.map((lane, index) => <article key={lane.name}><span>{index + 1}</span><b>{lane.name}</b>{lane.items.map((item) => <div key={item}><strong>{item}</strong><p>{lane.name.includes("Overdue") || lane.name.includes("Follow") ? "Reminder drafted." : "Owner stays in control."}</p></div>)}</article>)}</div>
      <aside><span className="osEyebrow">Prepared by Churvox</span><h2>{isInvoice ? "Invoice pack is ready." : "Quote move is ready."}</h2><p>{isInvoice ? "Line items, price memory, proof and sync guard are checked before send." : "Price, client trail and follow-up wording are prepared before anything leaves."}</p><button type="button">Prepare in Command</button><div className="quietStack"><b>{isInvoice ? "Proof checked" : "Client trail checked"}</b><b>Price memory checked</b><b>{isInvoice ? "No paid status without sync confirmation" : "No message sent without approval"}</b></div></aside>
    </section>
  );
}

function TeamPage({ onNavigate }) {
  return (
    <section className="osTeam"><header><span className="osEyebrow">People and access</span><h1>Team is an access matrix.</h1><p>Workers, payroll-only people, invites and missing setup stay clear.</p></header><table><thead><tr><th>Person</th><th>Role</th><th>Worker app</th><th>Payroll</th><th>Action</th></tr></thead><tbody>{["Worker one", "Subcontractor", "Payroll admin"].map((name, i) => <tr key={name}><td>{name}</td><td>{i === 2 ? "Payroll" : "Field"}</td><td>{i === 2 ? "Off" : "Ready"}</td><td>{i === 0 ? "Review" : "None"}</td><td><button type="button">Open</button></td></tr>)}</tbody></table><aside><h2>Worker gaps become Command items.</h2><p>If a job has no worker, missing app access or payroll concern, Churvox surfaces the decision.</p><div className="quietStack"><b>2 invites pending</b><b>1 payroll review</b><b>4 field ready</b></div><button type="button" onClick={() => onNavigate("workers")}>Open worker view</button></aside></section>
  );
}

function MessagesPage({ onNavigate }) {
  return <section className="osMessages"><header><span className="osEyebrow">Prepared replies</span><h1>Messages are approval work, not another inbox.</h1></header><div>{["Quote follow-up", "Proof request", "Invoice reminder"].map((x) => <article key={x}><b>{x}</b><p>Drafted by Churvox and waiting for owner approval.</p><small>Linked to the original job or client.</small></article>)}</div><aside><h2>Nothing leaves without approval.</h2><p>Messages connect back to jobs, clients, quotes and invoices.</p><button type="button" onClick={() => onNavigate("command")}>Review in Command</button></aside></section>;
}

function XeroPage() {
  return <section className="osSync"><div><span className="osEyebrow">Accounting sync</span><h1>Draft sync only. Owner approval stays in control.</h1><p>Churvox prepares draft invoices and payment checks. It does not auto-send invoices, file tax or create payout files.</p></div><div className="syncRules"><b>Draft invoice sync<span>Only after owner approval</span></b><b>Payment status refresh<span>Paid only after confirmed refresh</span></b><b>Accounting export<span>CSV and draft-ready records</span></b><b>Owner approval required<span>No surprise accounting action</span></b></div></section>;
}

function SettingsPage() {
  return <ControlPage title="Business controls without the maze." items={[["Branding", "Logo, business name, email and customer-facing details."], ["GST and region", "Tax defaults for invoices without making Churvox a tax filer."], ["Approval rules", "What Churvox may prepare and what always needs owner review."], ["Imports and exports", "Clients, team, invoices and accounting files."], ["Account safety", "Password, sessions, delete account and data controls."], ["Notification defaults", "Worker alerts, owner prompts and quiet hours."]]} />;
}

function HelpPage() {
  return <ControlPage title="Help should get the owner unstuck fast." items={[["Setup check", "Find missing business, team, invoice and worker setup."], ["Launch checklist", "Owner, worker, quote, invoice and sync readiness."], ["Contact support", "Use hello@churvox.com when something blocks launch."], ["Worker guide", "How workers acknowledge jobs, add proof and record time."], ["Accounting guide", "Draft sync, exports and payment status guardrails."], ["Tester readiness", "A short path for getting early testers through the app."]]} />;
}

function ControlPage({ title, items }) {
  return <section className="osControl"><header><span className="osEyebrow">Control</span><h1>{title}</h1><p>Grouped by the decision the owner needs, not by hidden technical features.</p></header><div>{items.map(([item, text]) => <article key={item}><b>{item}</b><p>{text}</p><button type="button">Open</button></article>)}</div></section>;
}

function PlansPage() {
  const matrix = [["Recurring jobs", "Included", "Included", "Included", "Included"], ["Workers and proof", "Owner only", "Included", "Included", "Included"], ["Prepared admin", "Manual", "Light prompts", "Included", "Included"], ["Command approval desk", "Locked", "Locked", "Core", "Full"], ["Payroll review", "Locked", "Locked", "Review", "Included"], ["Accounting sync", "$39 add-on", "$39 add-on", "$39 add-on", "Included option"]];
  return (
    <section className="osPlans osPlansV2"><header><span className="osEyebrow">Plans</span><h1>Simple tiers. Real admin power.</h1><p>No fake basic/light labels. Each tier shows what Churvox actually unlocks.</p></header><div className="planCards">{planRows.map((plan) => <article key={plan.name} className={plan.name === "Operator" ? "popular" : ""}><span>{plan.tag}</span><h2>{plan.name}</h2><strong>{plan.price}</strong><p>{plan.text}</p><ul>{plan.includes.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div><div className="planMatrix"><h2>What actually unlocks</h2><table><thead><tr><th>Feature</th><th>Start</th><th>Crew</th><th>Operator</th><th>Command</th></tr></thead><tbody>{matrix.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div><footer><b>Growth and accounting:</b> Command Growth Pack is $99/month + GST. Accounting Sync Add-on is $39/month + GST for non-Command tiers.</footer></section>
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
  return <div className="churvoxOS"><Sidebar page={page} onNavigate={navigate} /><main className="osMain"><TopCommand page={page} /><Page page={page} onNavigate={navigate} /></main></div>;
}
