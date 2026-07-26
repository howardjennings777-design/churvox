import React from "react";
import {
  OFFICE_DESKS,
  OWNER_AREAS,
  PRODUCT_PROMISE,
  RELEASE_GATES,
  validateCommandSlip,
} from "./productContract";
import "./officeOSPreview.css";

const sampleSlips = [
  {
    id: "money-extra-work",
    title: "Extra work needs a price before invoicing",
    desk: "Money Desk",
    priority: "Now",
    whyItMatters: "The completed job includes extra work that is not covered by the saved price.",
    recordsChecked: ["job scope", "worker completion note", "saved client price", "invoice status"],
    preparedAction: "Invoice draft prepared with the agreed service price. The extra-work line is waiting for an owner amount.",
    confidence: "High on the completed work. Low on the extra-work amount.",
    missingInformation: "Owner must confirm the extra-work amount or ask the worker.",
    customerImpact: "Customer receives one accurate invoice instead of a correction later.",
    workerImpact: "No worker action unless the owner asks for clarification.",
    moneyImpact: "$180 base work plus an unconfirmed extra.",
    recommendedAction: "Enter the extra amount, then approve the invoice draft.",
    availableDecisions: ["Approve after edit", "Ask worker", "Park"],
    idempotencyKey: "preview-money-extra-work",
    auditReference: "preview-audit-001",
  },
  {
    id: "booking-gap",
    title: "Regular client has no next visit",
    desk: "Scheduling Desk",
    priority: "Today",
    whyItMatters: "The client normally receives fortnightly service but no future visit exists.",
    recordsChecked: ["last completed visit", "recurrence rule", "worker availability", "future schedule"],
    preparedAction: "A fortnightly visit is prepared in the next suitable slot with the usual worker.",
    confidence: "High. The client has followed the same pattern for six visits.",
    missingInformation: "None. The owner may still choose a different date.",
    customerImpact: "Protects the recurring promise and avoids a missed service.",
    workerImpact: "Adds one normal-duration visit to an available afternoon.",
    moneyImpact: "$95 recurring revenue protected.",
    recommendedAction: "Approve the proposed date or edit it.",
    availableDecisions: ["Approve plan", "Edit date", "Ask client", "Park"],
    idempotencyKey: "preview-booking-gap",
    auditReference: "preview-audit-002",
  },
  {
    id: "proof-missing",
    title: "Completed work is missing final proof",
    desk: "Quality Desk",
    priority: "Needs check",
    whyItMatters: "The worker finished the job but the required after photo is missing.",
    recordsChecked: ["job checklist", "completion status", "uploaded photos", "client requirement"],
    preparedAction: "A specific worker request is prepared asking for the missing after photo.",
    confidence: "Certain. The proof rule is enabled and no matching photo exists.",
    missingInformation: "After photo.",
    customerImpact: "Prevents sending an incomplete proof pack.",
    workerImpact: "Worker receives one clear request linked to the job.",
    moneyImpact: "Invoice remains safely on hold until proof is complete.",
    recommendedAction: "Approve the proof request.",
    availableDecisions: ["Approve request", "Clear personally", "Park"],
    idempotencyKey: "preview-proof-missing",
    auditReference: "preview-audit-003",
  },
];

const officeActivity = [
  ["Reception Desk", "2 requests checked", "1 quote draft ready"],
  ["Scheduling Desk", "18 visits reviewed", "1 recurring gap found"],
  ["Job Control Desk", "6 active jobs", "All workers acknowledged"],
  ["Quality Desk", "3 completion packs checked", "1 proof item missing"],
  ["Money Desk", "2 invoice drafts prepared", "$275 waiting for review"],
  ["Churvox Guard", "42 rules checked", "3 owner decisions raised"],
];

const runSheet = [
  { time: "8:00", client: "Harbour View Apartments", work: "Grounds maintenance", worker: "Aroha", state: "In progress" },
  { time: "9:30", client: "Mila Hair Studio", work: "Exterior clean", worker: "Tama", state: "Travelling" },
  { time: "11:00", client: "Kauri Property Group", work: "Fence repair", worker: "Wiremu", state: "Ready" },
  { time: "1:30", client: "North Road Dental", work: "Garden service", worker: "Aroha", state: "Ready" },
];

const metrics = [
  ["Owner decisions", "3", "Only genuine decisions"],
  ["Jobs moving", "6", "No stalled work"],
  ["Money prepared", "$275", "Nothing sent yet"],
  ["Promises protected", "4", "Recurring and follow-up checks"],
];

function AreaButton({ area, active, onClick }) {
  return (
    <button type="button" className={active ? "active" : ""} onClick={onClick}>
      <span>{area.label}</span>
      <small>{area.purpose}</small>
    </button>
  );
}

function Metric({ label, value, detail }) {
  return (
    <article className="cvosMetric">
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function StatusPill({ children, tone = "neutral" }) {
  return <span className={`cvosPill ${tone}`}>{children}</span>;
}

function TodayScreen({ openCommand }) {
  return (
    <div className="cvosGrid">
      <section className="cvosHero cvosSpan12">
        <div>
          <span className="cvosEyebrow">Tuesday owner briefing</span>
          <h2>Your business is moving. Three decisions need you.</h2>
          <p>Churvox has checked the schedule, field activity, proof, recurring work and money. Everything else stays in the background.</p>
          <div className="cvosHeroActions">
            <button type="button" className="primary" onClick={openCommand}>Open 3 owner decisions</button>
            <button type="button">Review today’s work</button>
          </div>
        </div>
        <aside>
          <span>Office status</span>
          <strong>Working normally</strong>
          <p>Last complete business check: just now</p>
          <div className="cvosSignalRow"><i /><i /><i /><i /><i /></div>
        </aside>
      </section>

      <section className="cvosMetrics cvosSpan12">
        {metrics.map(([label, value, detail]) => <Metric key={label} label={label} value={value} detail={detail} />)}
      </section>

      <section className="cvosPanel cvosSpan7">
        <header>
          <div><small>Field control</small><h3>Today’s run sheet</h3></div>
          <StatusPill tone="good">On track</StatusPill>
        </header>
        <div className="cvosRunSheet">
          {runSheet.map((job) => (
            <article key={`${job.time}-${job.client}`}>
              <time>{job.time}</time>
              <div><strong>{job.client}</strong><span>{job.work}</span></div>
              <div><strong>{job.worker}</strong><span>{job.state}</span></div>
              <button type="button">Open</button>
            </article>
          ))}
        </div>
      </section>

      <section className="cvosPanel cvosSpan5 cvosDarkPanel">
        <header><div><small>Owner attention</small><h3>Command queue</h3></div><StatusPill tone="warn">3 waiting</StatusPill></header>
        <div className="cvosDecisionStack">
          {sampleSlips.map((slip, index) => (
            <button type="button" key={slip.id} onClick={openCommand}>
              <span>{index + 1}</span>
              <div><strong>{slip.title}</strong><small>{slip.desk} · {slip.priority}</small></div>
            </button>
          ))}
        </div>
      </section>

      <section className="cvosPanel cvosSpan8">
        <header><div><small>Background office</small><h3>What Churvox is handling</h3></div><StatusPill tone="good">Live</StatusPill></header>
        <div className="cvosOfficeGrid">
          {officeActivity.map(([desk, first, second]) => (
            <article key={desk}><i /><div><strong>{desk}</strong><span>{first}</span><small>{second}</small></div></article>
          ))}
        </div>
      </section>

      <section className="cvosPanel cvosSpan4 cvosGuardPanel">
        <header><div><small>Protection</small><h3>Churvox Guard</h3></div><StatusPill tone="good">Clear</StatusPill></header>
        <ul>
          <li><span>Schedule clashes</span><strong>0</strong></li>
          <li><span>Completed, not invoiced</span><strong>2</strong></li>
          <li><span>Missing proof</span><strong>1</strong></li>
          <li><span>Promises due today</span><strong>4</strong></li>
          <li><span>Failed actions</span><strong>0</strong></li>
        </ul>
      </section>
    </div>
  );
}

function CommandScreen() {
  const [selectedId, setSelectedId] = React.useState(sampleSlips[0].id);
  const [notice, setNotice] = React.useState("");
  const selected = sampleSlips.find((slip) => slip.id === selectedId) || sampleSlips[0];
  const validation = validateCommandSlip(selected);

  const decide = (action) => {
    setNotice(`${action} recorded in this blueprint preview. Nothing was sent, changed, charged or synced.`);
  };

  return (
    <div className="cvosCommandLayout">
      <section className="cvosCommandQueue">
        <header><small>Prepared by the office</small><h2>Owner decisions</h2><p>Everything else remains in the background.</p></header>
        {sampleSlips.map((slip) => (
          <button type="button" className={selectedId === slip.id ? "active" : ""} key={slip.id} onClick={() => { setSelectedId(slip.id); setNotice(""); }}>
            <span className="cvosQueueMarker" />
            <div><small>{slip.desk} · {slip.priority}</small><strong>{slip.title}</strong><p>{slip.recommendedAction}</p></div>
          </button>
        ))}
      </section>

      <section className="cvosSlip">
        <header>
          <div><small>{selected.desk}</small><h2>{selected.title}</h2></div>
          <StatusPill tone={validation.valid ? "good" : "bad"}>{validation.valid ? "Complete slip" : "Missing fields"}</StatusPill>
        </header>
        <div className="cvosSlipLead">
          <article><small>Why it matters</small><p>{selected.whyItMatters}</p></article>
          <article><small>Recommended action</small><p>{selected.recommendedAction}</p></article>
        </div>
        <div className="cvosSlipGrid">
          <article><small>Records checked</small><ul>{selected.recordsChecked.map((item) => <li key={item}>{item}</li>)}</ul></article>
          <article><small>What Churvox prepared</small><p>{selected.preparedAction}</p></article>
          <article><small>Confidence</small><p>{selected.confidence}</p></article>
          <article><small>Missing information</small><p>{selected.missingInformation}</p></article>
          <article><small>Customer impact</small><p>{selected.customerImpact}</p></article>
          <article><small>Worker impact</small><p>{selected.workerImpact}</p></article>
          <article className="money"><small>Money impact</small><p>{selected.moneyImpact}</p></article>
          <article><small>Audit</small><p>{selected.auditReference}<br />Safe execution key attached</p></article>
        </div>
        {notice ? <div className="cvosNotice">{notice}</div> : null}
        <footer>
          <button type="button" className="primary" onClick={() => decide("Approval")}>Approve</button>
          <button type="button" onClick={() => decide("Edit")}>Edit</button>
          <button type="button" onClick={() => decide("Question")}>Ask</button>
          <button type="button" className="quiet" onClick={() => decide("Park")}>Park</button>
          <button type="button" className="danger" onClick={() => decide("Rejection")}>Reject</button>
        </footer>
      </section>
    </div>
  );
}

function WorkScreen() {
  const columns = [
    ["Unscheduled", ["New lawn-care request", "Fence repair follow-up"]],
    ["Aroha", ["Grounds maintenance · 8:00", "Garden service · 1:30"]],
    ["Tama", ["Exterior clean · 9:30", "Window clean · 2:30"]],
    ["Wiremu", ["Fence repair · 11:00", "Quote inspection · 3:00"]],
  ];
  return (
    <div className="cvosGrid">
      <section className="cvosSectionIntro cvosSpan12"><small>Work control</small><h2>Schedule the day without losing the office trail.</h2><p>Jobs, visits, recurrence, worker fit, capacity and travel stay in one operating view.</p></section>
      <section className="cvosPanel cvosSpan12">
        <header><div><small>Day board</small><h3>Tuesday schedule</h3></div><div className="cvosInlineActions"><button type="button">Previous</button><button type="button">Today</button><button type="button">Next</button></div></header>
        <div className="cvosScheduleBoard">
          {columns.map(([title, jobs], index) => (
            <section key={title} className={index === 0 ? "unscheduled" : ""}>
              <header><strong>{title}</strong><small>{jobs.length} items</small></header>
              {jobs.map((job, jobIndex) => <article key={job}><span>{job}</span><small>{jobIndex === 0 ? "Ready" : "No clash"}</small></article>)}
              <button type="button">Add work</button>
            </section>
          ))}
        </div>
      </section>
      <section className="cvosPanel cvosSpan6"><header><div><small>Recurring engine</small><h3>Future work protected</h3></div><StatusPill tone="good">11 active rules</StatusPill></header><div className="cvosListRows"><article><strong>Harbour View Apartments</strong><span>Weekly · next visit prepared</span><em>Healthy</em></article><article><strong>North Road Dental</strong><span>Fortnightly · one gap found</span><em className="warn">Review</em></article><article><strong>Kauri Property Group</strong><span>Monthly · capacity confirmed</span><em>Healthy</em></article></div></section>
      <section className="cvosPanel cvosSpan6"><header><div><small>Capacity</small><h3>Team load</h3></div><StatusPill tone="good">Balanced</StatusPill></header><div className="cvosCapacity"><div><span>Aroha</span><i style={{ "--fill": "72%" }} /></div><div><span>Tama</span><i style={{ "--fill": "61%" }} /></div><div><span>Wiremu</span><i style={{ "--fill": "54%" }} /></div></div></section>
    </div>
  );
}

function ClientsScreen() {
  return (
    <div className="cvosGrid">
      <section className="cvosSectionIntro cvosSpan12"><small>Business memory</small><h2>Every client and property remembers how the work should run.</h2><p>Contacts, access, hazards, services, promises, prices, equipment, proof and history stay connected.</p></section>
      <section className="cvosPanel cvosSpan4 cvosClientList"><header><div><small>Clients</small><h3>Client book</h3></div><button type="button">Add client</button></header>{["Harbour View Apartments", "Mila Hair Studio", "Kauri Property Group", "North Road Dental"].map((name, index) => <button type="button" className={index === 0 ? "active" : ""} key={name}><strong>{name}</strong><span>{index === 0 ? "3 properties · recurring" : "1 property"}</span></button>)}</section>
      <section className="cvosPanel cvosSpan8 cvosClientMemory"><header><div><small>Harbour View Apartments</small><h3>Property and service memory</h3></div><StatusPill tone="good">Recurring client</StatusPill></header><div className="cvosMemoryGrid"><article><small>Primary contact</small><strong>Moana R.</strong><span>Email preferred</span></article><article><small>Access</small><strong>Use east service gate</strong><span>Gate code held securely</span></article><article><small>Service pattern</small><strong>Weekly grounds care</strong><span>Tuesdays · 90 minutes</span></article><article><small>Saved price</small><strong>$180 per visit</strong><span>Extras require owner review</span></article><article><small>Site risk</small><strong>School traffic at 3pm</strong><span>Avoid afternoon vehicle movement</span></article><article><small>Equipment</small><strong>Irrigation controller</strong><span>Last checked 4 visits ago</span></article></div><div className="cvosTimeline"><article><time>Today</time><div><strong>Worker started the scheduled visit</strong><span>All instructions acknowledged.</span></div></article><article><time>Last week</time><div><strong>Proof pack completed</strong><span>8 photos, checklist and completion note.</span></div></article><article><time>2 weeks</time><div><strong>Client promise saved</strong><span>Notify contact before loud machinery is used.</span></div></article></div></section>
    </div>
  );
}

function MoneyScreen() {
  return (
    <div className="cvosGrid">
      <section className="cvosSectionIntro cvosSpan12"><small>Money control</small><h2>Proof becomes an accurate invoice, not another admin job.</h2><p>Quotes, deposits, costs, invoices and accounting handoff remain connected to the work that supports them.</p></section>
      <section className="cvosPanel cvosSpan12"><header><div><small>Proof-to-invoice</small><h3>Completed work pipeline</h3></div><StatusPill tone="warn">2 need owner review</StatusPill></header><div className="cvosFlow"><article className="done"><small>1</small><strong>Work completed</strong><span>Scope and time locked</span></article><article className="done"><small>2</small><strong>Proof checked</strong><span>Checklist and photos</span></article><article className="active"><small>3</small><strong>Costs checked</strong><span>One extra needs a price</span></article><article><small>4</small><strong>Owner approval</strong><span>Command slip ready</span></article><article><small>5</small><strong>Send and sync</strong><span>Still locked</span></article></div></section>
      <section className="cvosPanel cvosSpan7"><header><div><small>Money waiting</small><h3>Invoice preparation</h3></div><button type="button">Open all</button></header><div className="cvosListRows"><article><strong>Harbour View Apartments</strong><span>Base service complete · extra amount missing</span><em className="warn">Review</em></article><article><strong>Mila Hair Studio</strong><span>Proof complete · invoice ready</span><em>Ready</em></article><article><strong>North Road Dental</strong><span>Visit scheduled · not billable yet</span><em>Watching</em></article></div></section>
      <section className="cvosPanel cvosSpan5"><header><div><small>Profit check</small><h3>Job margin</h3></div><StatusPill tone="good">Healthy</StatusPill></header><div className="cvosMargin"><strong>38%</strong><span>Expected margin after labour, travel and materials</span><dl><div><dt>Revenue</dt><dd>$455</dd></div><div><dt>Direct cost</dt><dd>$282</dd></div><div><dt>Margin</dt><dd>$173</dd></div></dl></div></section>
    </div>
  );
}

function MessagesScreen() {
  return (
    <div className="cvosGrid">
      <section className="cvosSectionIntro cvosSpan12"><small>Connected communication</small><h2>Messages become promises, next steps and prepared replies.</h2><p>Every conversation stays attached to the right client, property, job, quote or invoice.</p></section>
      <section className="cvosPanel cvosSpan5"><header><div><small>Inbox</small><h3>Needs a response</h3></div><StatusPill tone="warn">2 waiting</StatusPill></header><div className="cvosMessageList"><button type="button" className="active"><strong>Harbour View Apartments</strong><span>Can the team avoid the west entrance today?</span><small>Job · Today 8:00</small></button><button type="button"><strong>Aroha</strong><span>I found extra green-waste removal.</span><small>Worker · Current job</small></button><button type="button"><strong>Kauri Property Group</strong><span>Quote approved. When can this start?</span><small>Quote · Approved</small></button></div></section>
      <section className="cvosPanel cvosSpan7 cvosDraft"><header><div><small>Admin Desk draft</small><h3>Prepared customer reply</h3></div><StatusPill tone="good">Context checked</StatusPill></header><blockquote>Thanks for letting us know. The team has been told to use the east service gate today and avoid the west entrance. Your scheduled work remains on track.</blockquote><div className="cvosDraftChecks"><span>✓ linked to today’s job</span><span>✓ access note checked</span><span>✓ no schedule change</span><span>✓ client preference ready to save</span></div><footer><button type="button" className="primary">Approve send</button><button type="button">Edit</button><button type="button">Save preference only</button><button type="button" className="quiet">Park</button></footer></section>
    </div>
  );
}

function TeamScreen() {
  return (
    <div className="cvosGrid">
      <section className="cvosSectionIntro cvosSpan12"><small>Team and field</small><h2>The owner sees control. Workers see one simple job at a time.</h2><p>Roles, access, capacity, time, proof and help requests remain connected without exposing restricted business data.</p></section>
      <section className="cvosPanel cvosSpan7"><header><div><small>Team status</small><h3>Field now</h3></div><StatusPill tone="good">All acknowledged</StatusPill></header><div className="cvosWorkerRows"><article><span className="avatar">A</span><div><strong>Aroha</strong><small>Grounds maintenance · in progress</small></div><em>1h 12m</em></article><article><span className="avatar">T</span><div><strong>Tama</strong><small>Travelling to exterior clean</small></div><em>ETA 9:26</em></article><article><span className="avatar">W</span><div><strong>Wiremu</strong><small>Fence repair · ready</small></div><em>Starts 11:00</em></article></div></section>
      <section className="cvosPhone cvosSpan5"><div className="cvosPhoneTop"><span>9:41</span><i /></div><small>Churvox Field</small><h3>Current job</h3><article><span>In progress</span><strong>Harbour View Apartments</strong><p>Grounds maintenance</p><dl><div><dt>Time</dt><dd>1h 12m</dd></div><div><dt>Checklist</dt><dd>5 of 7</dd></div><div><dt>Proof</dt><dd>3 photos</dd></div></dl></article><button type="button" className="primary">Continue job</button><button type="button">Something changed</button><button type="button">I need help</button></section>
      <section className="cvosPanel cvosSpan12"><header><div><small>Access control</small><h3>People see only what their role needs</h3></div><button type="button">Manage roles</button></header><div className="cvosRoleGrid"><article><strong>Owner</strong><span>Full business control and approval authority</span></article><article><strong>Manager</strong><span>Schedule, team and delegated approvals</span></article><article><strong>Worker</strong><span>Assigned jobs, proof, time and messages</span></article><article><strong>Payroll reviewer</strong><span>Hours and exports only</span></article></div></section>
    </div>
  );
}

function ReportsScreen() {
  return (
    <div className="cvosGrid">
      <section className="cvosSectionIntro cvosSpan12"><small>Business health</small><h2>Reports explain what needs attention, not just what already happened.</h2><p>Profit, capacity, promises, proof and admin debt are shown in plain language.</p></section>
      <section className="cvosMetrics cvosSpan12"><Metric label="Revenue prepared" value="$18.4k" detail="Current month" /><Metric label="Average job margin" value="34%" detail="Up 3 points" /><Metric label="Quote conversion" value="61%" detail="12 of 19 approved" /><Metric label="Admin debt" value="7" detail="Down from 18" /></section>
      <section className="cvosPanel cvosSpan8"><header><div><small>Owner explanation</small><h3>What changed this week</h3></div><StatusPill tone="good">Improving</StatusPill></header><div className="cvosInsightList"><article><strong>Recurring work is healthier</strong><span>Three missing future visits were prepared before they became missed services.</span></article><article><strong>Margin improved</strong><span>Extras are being captured before invoicing instead of being lost in worker notes.</span></article><article><strong>One client needs attention</strong><span>Two requested changes are waiting on a revised quote.</span></article><article><strong>Proof quality is strong</strong><span>94% of completed visits passed proof checks first time.</span></article></div></section>
      <section className="cvosPanel cvosSpan4"><header><div><small>Admin debt</small><h3>Work without a clean next step</h3></div><StatusPill tone="warn">7 items</StatusPill></header><div className="cvosDebt"><strong>7</strong><span>4 already prepared for owner review</span><ul><li>2 invoice decisions</li><li>1 missing proof</li><li>2 quote follow-ups</li><li>2 client detail gaps</li></ul></div></section>
    </div>
  );
}

function SettingsScreen() {
  const gates = Object.entries(RELEASE_GATES);
  return (
    <div className="cvosGrid">
      <section className="cvosSectionIntro cvosSpan12"><small>Foundation</small><h2>The product cannot be called ready until the safety gates pass.</h2><p>Pricing, approvals, permissions, tenant isolation, migration, offline work and rollback are part of the product—not later cleanup.</p></section>
      <section className="cvosPanel cvosSpan5"><header><div><small>Office model</small><h3>Background desks</h3></div><StatusPill tone="good">10 defined</StatusPill></header><div className="cvosDeskList">{OFFICE_DESKS.map((desk) => <article key={desk.id}><strong>{desk.name}</strong><span>{desk.mission}</span></article>)}</div></section>
      <section className="cvosPanel cvosSpan7"><header><div><small>Release contract</small><h3>Cutover gates</h3></div><StatusPill tone="warn">Not ready</StatusPill></header><div className="cvosGateGrid">{gates.map(([name, items]) => <article key={name}><strong>{name}</strong><span>{items.length} mandatory checks</span><ul>{items.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div></section>
    </div>
  );
}

function Screen({ active, setActive }) {
  if (active === "command") return <CommandScreen />;
  if (active === "work") return <WorkScreen />;
  if (active === "clients") return <ClientsScreen />;
  if (active === "money") return <MoneyScreen />;
  if (active === "messages") return <MessagesScreen />;
  if (active === "team") return <TeamScreen />;
  if (active === "reports") return <ReportsScreen />;
  if (active === "settings") return <SettingsScreen />;
  return <TodayScreen openCommand={() => setActive("command")} />;
}

export default function OfficeOSPreview() {
  const [active, setActive] = React.useState("today");
  const activeArea = OWNER_AREAS.find((area) => area.id === active) || OWNER_AREAS[0];

  return (
    <main className="cvosRoot" data-preview-only="true">
      <div className="cvosPreviewBanner">Blueprint preview · sample state only · nothing here sends, changes, charges or syncs</div>
      <header className="cvosTopbar">
        <button type="button" className="cvosBrand" onClick={() => setActive("today")}>
          <span>CV</span>
          <div><strong>Churvox</strong><small>Office OS</small></div>
        </button>
        <div className="cvosTopCopy">
          <small>Owner command floor</small>
          <h1>{activeArea.label}</h1>
          <p>{activeArea.purpose}</p>
        </div>
        <div className="cvosPromise"><span>Product promise</span><strong>{PRODUCT_PROMISE}</strong></div>
      </header>

      <nav className="cvosNav" aria-label="Office OS areas">
        {OWNER_AREAS.map((area) => <AreaButton key={area.id} area={area} active={active === area.id} onClick={() => setActive(area.id)} />)}
      </nav>

      <section className="cvosWorkspace">
        <Screen active={active} setActive={setActive} />
      </section>
    </main>
  );
}
