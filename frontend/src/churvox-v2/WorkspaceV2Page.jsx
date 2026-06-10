import React from "react";
import "./churvox-v2.css";

const PAGE = {
  jobs: {
    kicker: "Churvox V2 preview · Jobs",
    title: "Jobs",
    intro: "Book the work, assign the worker, set the price, track status and prepare the invoice when the job is done.",
    listTitle: "Find job",
    listHelp: "Search booked, active and completed work.",
    stats: ["Total jobs", "Need action", "Ready to invoice"],
    tabs: ["Details", "Schedule", "Invoice"],
    actions: ["Save job", "Assign worker", "Prepare invoice", "Send issue to Command"],
    noteTitle: "Job page purpose",
    noteText: "Jobs is for running work. Command is only for approval slips and exceptions.",
    filters: ["All", "Needs", "Active", "Done"],
    records: [
      { id: "j1", title: "Naenae lawn reset", sub: "Aroha Property Care · Today 10:00", status: "Active", needs: false, amount: "$185", owner: "Mason", details: ["Client confirmed access", "Photos required", "Fixed + extras"], history: ["Worker assigned", "Reminder due 30 minutes before start", "Invoice draft after completion"] },
      { id: "j2", title: "Birchville driveway clean", sub: "Birchville Rentals · Needs date", status: "Needs schedule", needs: true, amount: "$240", owner: "Unassigned", details: ["Needs site confirmation", "Quote accepted", "Worker not assigned"], history: ["Client waiting on date", "Create dispatch once booked", "No invoice until completed"] },
      { id: "j3", title: "Monthly garden tidy", sub: "Lower Hutt Medical Centre · Friday", status: "Booked", needs: false, amount: "$320", owner: "Talia", details: ["Commercial site", "After-hours only", "Use rear entrance"], history: ["Recurring monthly", "Last visit completed", "No open issues"] },
    ],
    fields: ["Job title", "Client", "Address", "Scheduled date", "Worker", "Status", "Price", "Job notes"],
  },
  dispatch: {
    kicker: "Churvox V2 preview · Dispatch",
    title: "Dispatch",
    intro: "Plan the day, see who is going where, spot late jobs, and make sure workers acknowledge the right work.",
    listTitle: "Today’s run",
    listHelp: "Jobs should move from booked to acknowledged to complete.",
    stats: ["Today", "Unassigned", "Acknowledged"],
    tabs: ["Run sheet", "Workers", "Map notes"],
    actions: ["Assign run", "Notify worker", "Mark ready", "Send issue to Command"],
    noteTitle: "Dispatch page purpose",
    noteText: "Dispatch is for today’s movement, not client records or invoice editing.",
    filters: ["All", "Needs", "Active", "Done"],
    records: [
      { id: "d1", title: "Mason · Lower Hutt route", sub: "4 jobs · 1 unacknowledged", status: "Needs acknowledgement", needs: true, amount: "4 stops", owner: "Mason", details: ["Naenae 10:00", "Belmont 12:30", "Wainuiomata 2:00"], history: ["Send worker reminder", "Check travel gap", "Photos required at stop 1"] },
      { id: "d2", title: "Talia · Commercial route", sub: "2 jobs · both ready", status: "Ready", needs: false, amount: "2 stops", owner: "Talia", details: ["Medical Centre after hours", "Office clean 6pm"], history: ["All acknowledged", "No route conflicts", "Invoice after completion"] },
    ],
    fields: ["Run name", "Worker", "Start time", "Area", "Stops", "Status", "Priority", "Dispatch notes"],
  },
  quotes: {
    kicker: "Churvox V2 preview · Quotes",
    title: "Quotes",
    intro: "Draft quotes, follow up sent quotes, convert accepted work into jobs, and only send approvals to Command when needed.",
    listTitle: "Quote pipeline",
    listHelp: "See draft, sent, accepted and declined work.",
    stats: ["Open quotes", "Need follow-up", "Accepted"],
    tabs: ["Scope", "Pricing", "Follow-up"],
    actions: ["Save quote", "Send quote", "Convert to job", "Send issue to Command"],
    noteTitle: "Quote page purpose",
    noteText: "Quotes is for sales pipeline. Accepted quotes become jobs.",
    filters: ["All", "Needs", "Sent", "Accepted"],
    records: [
      { id: "q1", title: "Overgrown section reset", sub: "New client lead · Draft", status: "Draft", needs: true, amount: "$390", owner: "Owner", details: ["Needs client email", "Scope includes green waste", "Valid 14 days"], history: ["Draft started", "Cannot send until email added", "Convert to job after acceptance"] },
      { id: "q2", title: "Driveway waterblast", sub: "Birchville Rentals · Sent", status: "Sent", needs: true, amount: "$240", owner: "Owner", details: ["Sent 3 days ago", "Follow-up due", "Access needs confirmation"], history: ["Quote sent", "No acceptance yet", "Follow-up task ready"] },
      { id: "q3", title: "Commercial garden tidy", sub: "Lower Hutt Medical Centre · Accepted", status: "Accepted", needs: false, amount: "$320", owner: "Owner", details: ["Accepted by admin", "Commercial terms", "Ready to convert"], history: ["Accepted", "Create job next", "Invoice after completion"] },
    ],
    fields: ["Quote title", "Client", "Status", "Valid until", "Price", "GST", "Scope", "Customer message"],
  },
  invoices: {
    kicker: "Churvox V2 preview · Invoices",
    title: "Invoices",
    intro: "Review drafts, approve sends, track paid and overdue money, and sync later when integrations are ready.",
    listTitle: "Money list",
    listHelp: "Draft, approved, sent, paid and overdue invoices.",
    stats: ["Invoices", "Need approval", "Overdue"],
    tabs: ["Invoice", "Delivery", "Payment"],
    actions: ["Save invoice", "Approve send", "Mark paid", "Send issue to Command"],
    noteTitle: "Invoice page purpose",
    noteText: "Invoices is the money desk. Risky sends should be approved through Command.",
    filters: ["All", "Needs", "Sent", "Paid"],
    records: [
      { id: "i1", title: "INV-1042", sub: "Aroha Property Care · Draft", status: "Needs approval", needs: true, amount: "$185", owner: "Owner", details: ["Created from completed job", "Draft only", "Needs owner approval before sending"], history: ["Job completed", "Invoice drafted", "Awaiting approval"] },
      { id: "i2", title: "INV-1041", sub: "Lower Hutt Medical Centre · Sent", status: "Sent", needs: false, amount: "$320", owner: "Owner", details: ["Sent by email", "14 day terms", "Payment not due yet"], history: ["Approved", "Sent", "Waiting for payment"] },
      { id: "i3", title: "INV-1033", sub: "Birchville Rentals · Overdue", status: "Overdue", needs: true, amount: "$145", owner: "Owner", details: ["7 days overdue", "Reminder prepared", "Do not chase twice"], history: ["Sent", "Viewed", "Reminder ready"] },
    ],
    fields: ["Invoice number", "Client", "Email", "Status", "Amount", "Due date", "Line items", "Internal note"],
  },
  team: {
    kicker: "Churvox V2 preview · Team",
    title: "Team",
    intro: "Manage workers, managers, office admin and payroll access without mixing up permissions.",
    listTitle: "People",
    listHelp: "Workers, role access and invite status.",
    stats: ["Team members", "Need invite", "Active workers"],
    tabs: ["Profile", "Access", "Activity"],
    actions: ["Save person", "Send invite", "Open worker view", "Send issue to Command"],
    noteTitle: "Team page purpose",
    noteText: "Team is for people and access. Payroll has its own workspace.",
    filters: ["All", "Needs", "Worker", "Admin"],
    records: [
      { id: "t1", title: "Mason Clark", sub: "Worker · Active", status: "Active worker", needs: false, amount: "Worker", owner: "Owner", details: ["Can see assigned jobs", "Can upload photos", "Cannot see reports"], history: ["Acknowledged 3 jobs", "No payroll issue", "Phone verified"] },
      { id: "t2", title: "Talia Morgan", sub: "Manager · Active", status: "Manager", needs: false, amount: "Manager", owner: "Owner", details: ["Can dispatch work", "Can view clients", "Cannot change billing"], history: ["Managed commercial route", "No open issue", "Invite accepted"] },
      { id: "t3", title: "New payroll helper", sub: "Payroll · Invite needed", status: "Needs invite", needs: true, amount: "Payroll", owner: "Owner", details: ["Email missing", "Payroll access only", "No reports"], history: ["Draft user", "Invite not sent", "Needs email"] },
    ],
    fields: ["Full name", "Email", "Phone", "Role", "Invite status", "Access level", "Internal note", "Worker note"],
  },
  payroll: {
    kicker: "Churvox V2 preview · Payroll",
    title: "Payroll",
    intro: "Select a pay period, review hours from jobs, add manual adjustments and export a clean CSV. No tax filing. No bank payout files.",
    listTitle: "Pay run",
    listHelp: "Workers and hours for the selected period.",
    stats: ["Workers", "Hours", "Adjustments"],
    tabs: ["Hours", "Adjustments", "Export"],
    actions: ["Save pay run", "Add adjustment", "Export CSV", "Send issue to Command"],
    noteTitle: "Payroll page purpose",
    noteText: "Payroll calculates and exports. It does not submit to government or create bank files.",
    filters: ["All", "Needs", "Ready", "Exported"],
    records: [
      { id: "p1", title: "Mason Clark", sub: "32.5 hours · 1 adjustment", status: "Ready", needs: false, amount: "32.5h", owner: "Payroll", details: ["Jobs time confirmed", "Fuel allowance added", "Ready for CSV"], history: ["Monday 7.5h", "Tuesday 8h", "Adjustment +$25"] },
      { id: "p2", title: "Talia Morgan", sub: "28 hours · needs review", status: "Needs review", needs: true, amount: "28h", owner: "Payroll", details: ["One job timer missing", "Manual check needed", "Do not export yet"], history: ["Wednesday timer missing", "Photo proof exists", "Owner review required"] },
    ],
    fields: ["Worker", "Pay period", "Hours", "Hourly rate", "Adjustment", "Reason", "Status", "Payroll note"],
  },
  reports: {
    kicker: "Churvox V2 preview · Reports",
    title: "Reports",
    intro: "Show the owner useful business health: money, work completed, overdue invoices and team activity. No random charts.",
    listTitle: "Report views",
    listHelp: "Pick the business question you want answered.",
    stats: ["Revenue", "Jobs done", "Overdue"],
    tabs: ["Summary", "Money", "Operations"],
    actions: ["Refresh report", "Export summary", "Open invoices", "Send issue to Command"],
    noteTitle: "Reports page purpose",
    noteText: "Reports should explain the business, not just show decoration.",
    filters: ["All", "Needs", "Money", "Jobs"],
    records: [
      { id: "r1", title: "Money this month", sub: "$6,420 billed · $145 overdue", status: "Money", needs: false, amount: "$6,420", owner: "Owner", details: ["Invoices sent", "Paid amount", "Overdue amount"], history: ["Revenue up 12%", "One overdue", "Command reminder ready"] },
      { id: "r2", title: "Jobs completed", sub: "38 completed · 4 in progress", status: "Jobs", needs: false, amount: "38", owner: "Owner", details: ["Completed count", "Average job value", "In-progress count"], history: ["Most work in Lower Hutt", "Two jobs need photos", "One job ready to invoice"] },
      { id: "r3", title: "Risk report", sub: "Missing billing and overdue money", status: "Needs attention", needs: true, amount: "3 issues", owner: "Owner", details: ["2 clients need billing email", "1 invoice overdue", "1 job missing worker"], history: ["Fix clients first", "Then chase overdue", "Then assign job"] },
    ],
    fields: ["Report", "Date range", "Metric", "Status", "Amount", "Owner", "Finding", "Recommendation"],
  },
  settings: {
    kicker: "Churvox V2 preview · Settings",
    title: "Settings",
    intro: "Set up the business once: branding, GST, contact details, integrations and safe defaults.",
    listTitle: "Setup areas",
    listHelp: "Only show settings that help the business run.",
    stats: ["Setup items", "Need details", "Ready"],
    tabs: ["Business", "Defaults", "Integrations"],
    actions: ["Save settings", "Upload logo", "Test integration", "Send issue to Command"],
    noteTitle: "Settings page purpose",
    noteText: "Settings is for business setup, not daily operations.",
    filters: ["All", "Needs", "Ready", "Later"],
    records: [
      { id: "s1", title: "Business profile", sub: "Name, email, phone, address", status: "Ready", needs: false, amount: "Profile", owner: "Owner", details: ["Business name set", "Support email set", "Address optional"], history: ["Used on quotes", "Used on invoices", "Used in customer emails"] },
      { id: "s2", title: "GST and invoice defaults", sub: "Needs GST confirmation", status: "Needs details", needs: true, amount: "GST", owner: "Owner", details: ["GST rate", "Payment terms", "Invoice wording"], history: ["Default due date needed", "Bank details later", "Command can warn before send"] },
      { id: "s3", title: "Integrations", sub: "Xero/MYOB staged later", status: "Later", needs: false, amount: "Later", owner: "Owner", details: ["Xero prepared later", "MYOB prepared later", "No silent sync"], history: ["Owner approval needed", "Sync logs required", "Credentials secure"] },
    ],
    fields: ["Setting area", "Value", "Status", "Default", "Owner", "Visibility", "Notes", "Risk"],
  },
  plans: {
    kicker: "Churvox V2 preview · Plans",
    title: "Plans",
    intro: "Keep pricing simple: Start, Crew, Operator and Command. Make the best upgrade obvious without confusing people.",
    listTitle: "Plan options",
    listHelp: "Show current plan, limits and upgrade path.",
    stats: ["Plans", "Most popular", "Growth pack"],
    tabs: ["Compare", "Limits", "Billing"],
    actions: ["Choose Operator", "Choose Command", "Open billing", "Send issue to Command"],
    noteTitle: "Plans page purpose",
    noteText: "Plans should sell clearly, not overload with feature dumps.",
    filters: ["All", "Ready", "Popular", "Scale"],
    records: [
      { id: "pl1", title: "Start", sub: "$39/month + GST", status: "Ready", needs: false, amount: "$39", owner: "Owner", details: ["For small starters", "Basic admin", "14-day trial"], history: ["Low entry", "No card trial", "Upgrade later"] },
      { id: "pl2", title: "Operator", sub: "$149/month + GST · Most Popular", status: "Popular", needs: false, amount: "$149", owner: "Owner", details: ["AI Operator Actions", "Recommended", "Admin automation"], history: ["Main plan", "Churvox does the admin", "Owner approves"] },
      { id: "pl3", title: "Command", sub: "$299/month + GST", status: "Scale", needs: false, amount: "$299", owner: "Owner", details: ["MYOB included", "Payroll workspace", "Growth Pack $99"], history: ["For larger teams", "50 active team members", "Growth packs add capacity"] },
    ],
    fields: ["Plan", "Price", "Best for", "Limits", "AI actions", "Integrations", "Payroll", "Notes"],
  },
  support: {
    kicker: "Churvox V2 preview · Support",
    title: "Support",
    intro: "Give owners a simple path to get unstuck: setup help, issue report, docs, or contact support.",
    listTitle: "Help topics",
    listHelp: "Common setup and operating questions.",
    stats: ["Topics", "Setup", "Urgent"],
    tabs: ["Help", "Contact", "Status"],
    actions: ["Open guide", "Contact support", "Report issue", "Send issue to Command"],
    noteTitle: "Support page purpose",
    noteText: "Support should make owners feel guided, not lost.",
    filters: ["All", "Needs", "Setup", "Billing"],
    records: [
      { id: "su1", title: "Setup checklist", sub: "Business profile, GST, first client", status: "Setup", needs: false, amount: "Guide", owner: "Owner", details: ["Business profile", "GST defaults", "First client and job"], history: ["Start here", "No technical wording", "Keep practical"] },
      { id: "su2", title: "Billing question", sub: "Stripe or plan issue", status: "Billing", needs: true, amount: "Help", owner: "Support", details: ["Check current plan", "Checkout return", "Invoice receipt"], history: ["Open billing", "Contact support", "Do not guess payments"] },
      { id: "su3", title: "Bug report", sub: "Something not working", status: "Needs details", needs: true, amount: "Issue", owner: "Support", details: ["Page URL", "Screenshot", "What happened"], history: ["Collect details", "Send to Command", "Support follows up"] },
    ],
    fields: ["Topic", "Area", "Priority", "Status", "Contact email", "Page", "Problem", "Next step"],
  },
};

function pickIcon(title) {
  return String(title || "?").split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "CV";
}

function Field({ label, value, wide }) {
  const [local, setLocal] = React.useState(value || "");
  React.useEffect(() => setLocal(value || ""), [value]);
  return (
    <label className={wide ? "v2Field wide" : "v2Field"}>
      <span>{label}</span>
      {wide ? <textarea value={local} onChange={(event) => setLocal(event.target.value)} /> : <input value={local} onChange={(event) => setLocal(event.target.value)} />}
    </label>
  );
}

function HistoryCard({ title, items }) {
  return (
    <article className="v2HistoryCard">
      <h3>{title}</h3>
      <ul>{(items || []).map((item) => <li key={item}>{item}</li>)}</ul>
    </article>
  );
}

export default function WorkspaceV2Page({ area = "jobs" }) {
  const config = PAGE[area] || PAGE.jobs;
  const [records] = React.useState(config.records);
  const [selectedId, setSelectedId] = React.useState(config.records[0]?.id || "");
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [tab, setTab] = React.useState(config.tabs[0]);
  const selected = records.find((record) => record.id === selectedId) || records[0];
  const needsCount = records.filter((record) => record.needs).length;
  const readyCount = records.length - needsCount;
  const thirdCount = area === "invoices" ? records.filter((record) => String(record.status).toLowerCase().includes("overdue")).length : readyCount;

  const filtered = records.filter((record) => {
    if (filter === "Needs" && !record.needs) return false;
    if (["Ready", "Active", "Done", "Sent", "Accepted", "Worker", "Admin", "Money", "Jobs", "Setup", "Billing", "Popular", "Scale"].includes(filter)) {
      const hay = `${record.status} ${record.sub} ${record.title}`.toLowerCase();
      if (!hay.includes(filter.toLowerCase())) return false;
    }
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${record.title} ${record.sub} ${record.status} ${record.owner}`.toLowerCase().includes(q);
  });

  const fieldValues = config.fields.map((label, index) => {
    const source = [selected.title, selected.sub, selected.status, selected.owner, selected.amount, ...(selected.details || [])];
    return [label, source[index] || ""];
  });

  return (
    <main className="v2Root">
      <section className="v2Shell">
        <header className="v2Topbar">
          <section className="v2Hero">
            <span className="v2Kicker">{config.kicker}</span>
            <h1>{config.title}</h1>
            <p>{config.intro}</p>
          </section>
          <aside className="v2Stats">
            <div className="v2Stat"><b>{area === "reports" ? selected.amount : records.length}</b><span>{config.stats[0]}</span></div>
            <div className="v2Stat"><b>{needsCount}</b><span>{config.stats[1]}</span></div>
            <div className="v2Stat"><b>{thirdCount}</b><span>{config.stats[2]}</span></div>
          </aside>
        </header>

        <section className="v2Workspace">
          <aside className="v2Pane">
            <div className="v2PaneHeader">
              <div>
                <span className="v2Pill">{config.listTitle}</span>
                <h2>{config.listTitle}</h2>
                <p>{config.listHelp}</p>
              </div>
            </div>
            <div className="v2Search">
              <input placeholder={`Search ${config.title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} />
              <div className="v2FilterRow">
                {config.filters.map((name) => <button key={name} className={filter === name ? "active" : ""} type="button" onClick={() => setFilter(name)}>{name}</button>)}
              </div>
            </div>
            <div className="v2List">
              {filtered.map((record) => (
                <button key={record.id} type="button" className={`v2ListItem ${record.id === selected.id ? "active" : ""} ${record.needs ? "needs" : ""}`} onClick={() => setSelectedId(record.id)}>
                  <b>{record.title}</b>
                  <span>{record.sub}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="v2Pane v2Detail">
            <article className="v2IdentityCard">
              <div className="v2Avatar">{pickIcon(selected.title)}</div>
              <div>
                <h2>{selected.title}</h2>
                <p>{selected.sub}</p>
              </div>
              <span className="v2StatusBadge">{selected.status}</span>
            </article>

            <nav className="v2Tabs" aria-label={`${config.title} sections`}>
              {config.tabs.map((name) => <button key={name} className={tab === name ? "active" : ""} type="button" onClick={() => setTab(name)}>{name}</button>)}
            </nav>

            {tab === config.tabs[0] ? (
              <div className="v2FormGrid">
                {fieldValues.map(([label, value], index) => <Field key={label} label={label} value={value} wide={index >= 6} />)}
              </div>
            ) : null}

            {tab === config.tabs[1] ? (
              <div className="v2HistoryGrid">
                <HistoryCard title="What matters" items={selected.details} />
                <HistoryCard title="Recent movement" items={selected.history} />
                <HistoryCard title="Owner check" items={[selected.needs ? "Needs owner attention" : "No urgent issue", `Owner: ${selected.owner}`, `Value: ${selected.amount}`]} />
              </div>
            ) : null}

            {tab === config.tabs[2] ? (
              <div className="v2FormGrid">
                <Field wide label="Working note" value={`${config.noteText}\n\nSelected: ${selected.title}\nStatus: ${selected.status}`} />
                <Field wide label="Next step" value={selected.needs ? "Resolve missing detail, then continue normal workflow." : "Ready to move to the next action."} />
              </div>
            ) : null}
          </section>

          <aside className="v2ActionRail">
            <span className="v2Pill">Owner actions</span>
            <h2>Next move</h2>
            <p>{config.noteText}</p>
            <div className="v2ActionStack">
              <button type="button" className="v2PrimaryBtn">{config.actions[0]}</button>
              <button type="button" className="v2SecondaryBtn">{config.actions[1]}</button>
              <button type="button" className="v2SecondaryBtn">{config.actions[2]}</button>
              <button type="button" className="v2DarkBtn">{config.actions[3]}</button>
            </div>
            <article className="v2ActionNote">
              <b>{config.noteTitle}</b>
              <p>{selected.needs ? "This record needs a human check before automation should trust it." : "This record is ready for normal workflow."}</p>
            </article>
            <div className="v2MiniQueue">
              {records.filter((record) => record.needs).slice(0, 5).map((record) => (
                <button type="button" key={`mini-${record.id}`} className="v2MiniCard" onClick={() => setSelectedId(record.id)}>
                  <b>{record.title}</b>
                  <span>{record.status}</span>
                </button>
              ))}
              {!records.some((record) => record.needs) ? <p>No urgent records in this area.</p> : null}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
