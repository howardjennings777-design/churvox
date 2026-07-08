import React, { useMemo, useState } from "react";
import "./OfficeTeamLab.css";
import "./OfficeTeamLabTight.css";

const BRAND_ICON = "/churvox-app-icon.svg?v=churvox-office-team-lab-20260709";

const trays = [
  { key: "priority", label: "Today’s priorities", count: 6, note: "Office Manager ranks what needs owner attention first." },
  { key: "money", label: "Money", count: 8, note: "Invoices, payments, quotes, extras, margin checks." },
  { key: "bookings", label: "Bookings", count: 5, note: "New bookings, cancellations, no-shows, recurring work." },
  { key: "staff", label: "Staff", count: 4, note: "Payroll, worker access, reminders, schedule load." },
  { key: "clients", label: "Clients", count: 7, note: "Replies, memory, onboarding, reviews, complaints." },
  { key: "quality", label: "Work / Quality", count: 3, note: "Proof, service notes, completion checks, invoice safety." },
  { key: "operations", label: "Operations", count: 2, note: "Patterns, capacity, recurring issues, business fixes." },
];

const roles = [
  {
    name: "Office Manager",
    group: "priority",
    purpose: "Runs the office briefing and decides what the owner needs first.",
    usedBy: "Every business",
    jobs: ["Build daily briefing", "Rank urgent money/staff/client decisions", "Hide low-priority noise", "Show what can wait", "Group prepared decisions into clean trays", "Keep owner focused on approvals, not hunting"],
    triggers: ["New day starts", "High-risk admin appears", "Multiple mimics prepare work", "Owner opens Command"],
    checks: ["All open decisions", "Risk level", "Money impact", "Customer impact", "Staff impact", "Due dates"],
    prepares: ["Today’s decision list", "Priority order", "Office status summary", "Suggested first approvals"],
    asks: "These are the decisions that need you today. Approve the top set or open a tray?",
  },
  {
    name: "Owner Personal Assistant",
    group: "priority",
    purpose: "Turns rough owner instructions into clean admin actions.",
    usedBy: "Busy owners",
    jobs: ["Understand simple owner inputs", "Find matching client/work records", "Ask one clean follow-up if missing", "Summarise what happened today", "Prepare admin from rough notes", "Keep owner out of forms"],
    triggers: ["Owner types or says an instruction", "Owner forwards a message", "Owner asks what needs attention"],
    checks: ["Client match", "Recent work", "Open invoices", "Staff involved", "Missing decision", "Safe next step"],
    prepares: ["Draft task", "Invoice/booking/reply suggestion", "One-question owner choice", "Linked record update"],
    asks: "I found the likely record and prepared the admin. Approve, edit, or tell me what changed?",
  },
  {
    name: "Receptionist / Booking Coordinator",
    group: "bookings",
    purpose: "Handles bookings, appointment changes, cancellations, reminders, and staff assignment.",
    usedBy: "Barbers, nails, salons, cleaners, mobile services, trades",
    jobs: ["Create booking requests", "Handle appointment changes", "Handle cancellations", "Handle no-shows", "Check staff assigned", "Find double bookings", "Send reminders", "Suggest next appointment", "Turn accepted quote into booking"],
    triggers: ["New request", "Customer cancellation", "No-show", "Accepted quote", "Booking reminder due", "Regular client has no next visit"],
    checks: ["Client details", "Service requested", "Date/time", "Staff availability", "Double booking risk", "Deposit/no-show history"],
    prepares: ["Booking draft", "Rebooking message", "Cancellation note", "Reminder", "Staff assignment suggestion"],
    asks: "Create, move, rebook, mark no-show, send reminder, or park?",
  },
  {
    name: "Inbox Triage Clerk",
    group: "clients",
    purpose: "Reads messy messages and sends them to the right office role.",
    usedBy: "Any business with customer or staff messages",
    jobs: ["Classify messages", "Detect quote requests", "Detect booking requests", "Detect complaints", "Detect payment questions", "Detect cancellations", "Detect urgent issues", "Link messages to records", "Route to the right mimic"],
    triggers: ["New customer message", "New worker message", "Unread thread", "Message includes urgency words"],
    checks: ["Sender", "Client match", "Related job/appointment", "Invoice/quote links", "Urgency", "Needed owner decision"],
    prepares: ["Message category", "Linked record", "Suggested response", "Next mimic handoff"],
    asks: "This looks like a booking/request/complaint/payment issue. Create action, reply, assign, or park?",
  },
  {
    name: "Customer Onboarding Clerk",
    group: "clients",
    purpose: "Makes sure new customers are usable before work starts.",
    usedBy: "All service businesses",
    jobs: ["Check name", "Check phone/email", "Check service needed", "Check location/address", "Check preferences", "Check access notes", "Check first booking", "Check payment terms", "Prepare missing-info request"],
    triggers: ["New client created", "New lead accepted", "First booking made", "Missing contact data"],
    checks: ["Contact details", "Service type", "Location", "Preferences", "Notes", "First appointment/job", "Payment terms"],
    prepares: ["Clean client file", "Missing-info prompt", "First booking checklist", "Client welcome/reply draft"],
    asks: "Ask client for missing info, add manually, continue anyway, or park?",
  },
  {
    name: "Admin Operator",
    group: "quality",
    purpose: "Keeps jobs, appointments, clients, staff and records tidy.",
    usedBy: "Every business",
    jobs: ["Fix missing work details", "Find unassigned work", "Find wrong statuses", "Find completed work still open", "Check notes saved properly", "Link work to clients", "Link quotes/invoices to work", "Clean messy records"],
    triggers: ["Incomplete record", "Status mismatch", "Work created from message", "Record missing links"],
    checks: ["Client", "Staff", "Service", "Date/time", "Status", "Price", "Linked quote/invoice", "Notes"],
    prepares: ["Record cleanup", "Missing-field decision", "Status correction", "Link suggestion"],
    asks: "Fix missing detail, assign staff, update status, link record, or park?",
  },
  {
    name: "Client Memory Clerk",
    group: "clients",
    purpose: "Turns little details into business memory.",
    usedBy: "Salons, nails, barbers, cleaners, trades, recurring services",
    jobs: ["Save gate codes", "Save service preferences", "Save haircut/nail/colour notes", "Save likes/dislikes", "Save recurring preferences", "Save special instructions", "Save previous issues", "Notice repeat patterns", "Suggest notes from messages"],
    triggers: ["Staff note mentions preference", "Customer message includes detail", "Repeat service completed", "Issue/complaint resolved"],
    checks: ["Existing client notes", "Recent service notes", "Messages", "Recurring pattern", "Complaint history"],
    prepares: ["Client memory update", "Preference tag", "Access note", "Next-service reminder"],
    asks: "Save this to client memory, edit it, or ignore?",
  },
  {
    name: "Client Care",
    group: "clients",
    purpose: "Protects relationships and keeps customers replied to.",
    usedBy: "Every business",
    jobs: ["Find replies needed", "Handle complaints", "Handle unhappy customers", "Check waiting customers", "Prepare replies", "Follow up after issues", "Suggest check-ins", "Pass quote/booking/payment issues to right mimic"],
    triggers: ["Unread message", "Complaint words", "Customer waiting too long", "After-service issue", "Recurring request"],
    checks: ["Client history", "Recent work", "Complaint status", "Outstanding quote/invoice", "Next booking", "Previous reply"],
    prepares: ["Reply draft", "Issue follow-up", "Check-in message", "Recurring request handoff"],
    asks: "Send reply, edit wording, create action, ask staff, or park?",
  },
  {
    name: "Sales Follow-up Clerk",
    group: "money",
    purpose: "Chases future money without being pushy.",
    usedBy: "All businesses that quote, lead, or rebook",
    jobs: ["Follow up quotes", "Follow up leads", "Catch viewed quote no reply", "Catch price request no quote", "Catch accepted quote not booked", "Suggest reactivation messages", "Suggest upsell/add-on follow-ups", "Keep warm leads alive"],
    triggers: ["Quote viewed", "Quote sent X days ago", "Lead goes quiet", "Customer asks price", "Accepted quote has no booking"],
    checks: ["Quote status", "Viewed date", "Client history", "Last message", "Booking status", "Value"],
    prepares: ["Follow-up draft", "Booking suggestion", "Quote reminder", "Lead reactivation message"],
    asks: "Send follow-up, edit, create booking, call later, or park?",
  },
  {
    name: "Recurring Work Manager",
    group: "bookings",
    purpose: "Keeps repeat clients and recurring work from falling through cracks.",
    usedBy: "Hair, nails, barbers, cleaners, lawn care, pest control, maintenance",
    jobs: ["Find regular clients with no next booking", "Notice clients due again", "Check recurring schedules", "Catch recurring jobs that stopped", "Suggest next visit", "Prepare rebooking messages", "Set up accepted recurring requests", "Check recurring price/time still makes sense"],
    triggers: ["Completed repeat service", "Recurring schedule gap", "Client usually books every X weeks", "Customer asks for regular work"],
    checks: ["Last service date", "Usual cycle", "Staff availability", "Current price", "Previous duration", "Next booking"],
    prepares: ["Next booking draft", "Recurring schedule", "Rebooking message", "Price/time review"],
    asks: "Create next booking, send rebooking message, set recurring, review price, or park?",
  },
  {
    name: "Bookkeeper",
    group: "money",
    purpose: "Handles invoice and accounting admin safely.",
    usedBy: "Every paid service business",
    jobs: ["Find completed work not invoiced", "Prepare invoice drafts", "Check amount", "Check due date", "Check GST/tax setting", "Check paid/unpaid/open status", "Check Xero readiness", "Check quote-to-invoice flow", "Catch paid but still open"],
    triggers: ["Work completed", "Invoice overdue", "Quote accepted", "Payment marked", "Xero sync requested"],
    checks: ["Work status", "Client", "Price", "Extras", "Existing invoice", "Payment status", "Xero state"],
    prepares: ["Invoice draft", "Payment reminder", "Xero-ready check", "Paid/open correction"],
    asks: "Approve draft, edit, send reminder, mark paid, sync later, or park?",
  },
  {
    name: "Payments / Debt Follow-up Clerk",
    group: "money",
    purpose: "Keeps unpaid money moving with owner-approved follow-ups.",
    usedBy: "Businesses that invoice",
    jobs: ["Find overdue invoices", "Prepare polite reminders", "Check previous reminders", "Check promise-to-pay notes", "Check partial payments", "Check paid but not marked paid", "Answer payment questions", "Suggest stronger follow-up when overdue too long"],
    triggers: ["Invoice due/overdue", "Payment question", "Promise-to-pay date missed", "Partial payment received"],
    checks: ["Due date", "Amount", "Reminder history", "Payment records", "Client notes", "Dispute status"],
    prepares: ["Reminder draft", "Payment status correction", "Follow-up schedule", "Dispute flag"],
    asks: "Send reminder, edit, mark paid, call later, or park?",
  },
  {
    name: "Materials / Extras Clerk",
    group: "money",
    purpose: "Catches extra time, products, materials and charges before money is missed.",
    usedBy: "Trades, cleaners, lawns, salons, nails, mobile services",
    jobs: ["Catch extra time", "Catch extra materials", "Catch travel charges", "Catch after-hours charges", "Catch add-on services", "Catch extra green waste", "Catch product used", "Catch parts/supplies used", "Decide charge/save/ignore"],
    triggers: ["Staff note mentions extra", "Timer longer than expected", "Material/product used", "After-hours job", "Travel added"],
    checks: ["Worker note", "Service price", "Invoice draft", "Client agreement", "Material/product list", "Previous rules"],
    prepares: ["Extra charge suggestion", "Invoice line draft", "Client approval note", "Ask-worker prompt"],
    asks: "Add charge, include free, save note, ask worker, or park?",
  },
  {
    name: "Payroll Clerk",
    group: "staff",
    purpose: "Prepares gross pay and hours review without tax filing or bank payout.",
    usedBy: "Businesses with staff or contractors",
    jobs: ["Check worker hours", "Check timers", "Check manual time", "Check missed clock-outs", "Check long/odd shifts", "Check job hours", "Check worker rate", "Build pay period review", "Flag unclear hours", "Prepare gross pay review"],
    triggers: ["Timer stopped", "Job completed", "Pay period ending", "Manual time added", "Odd timer found"],
    checks: ["Worker", "Pay period", "Rates", "Timers", "Manual entries", "Job links", "Odd shifts"],
    prepares: ["Hours review", "Gross pay review", "Timer correction suggestion", "Ask-worker note"],
    asks: "Approve hours, edit, exclude shift, ask worker, or park?",
  },
  {
    name: "Staff / Worker Manager",
    group: "staff",
    purpose: "Keeps team admin and worker follow-through clean.",
    usedBy: "Businesses with staff/contractors",
    jobs: ["Check worker login", "Check phone/email", "Check access", "Check staff rate", "Check job acknowledgements", "Catch late updates", "Catch timer issues", "Catch missing notes", "Prepare worker reminders"],
    triggers: ["New worker", "Job not acknowledged", "Missing rate", "Late update", "Repeated worker issue"],
    checks: ["Contact", "Login/access", "Assigned jobs", "Acknowledgement", "Timer history", "Notes history", "Rate"],
    prepares: ["Worker reminder", "Setup checklist", "Reassignment suggestion", "Rate-missing warning"],
    asks: "Send reminder, complete setup, reassign, edit staff info, or park?",
  },
  {
    name: "Dispatcher",
    group: "staff",
    purpose: "Runs the day and keeps work assigned cleanly.",
    usedBy: "Appointment and field-service businesses",
    jobs: ["Check today’s schedule", "Check tomorrow’s schedule", "Check staff allocation", "Find unassigned work", "Find late jobs/bookings", "Find double bookings", "Check travel/time gaps", "Check missing location", "Prepare run sheet changes"],
    triggers: ["Daily schedule opens", "New booking/job", "Worker unavailable", "Late job", "Double booking risk"],
    checks: ["Time", "Location", "Assigned staff", "Duration", "Travel gaps", "Availability", "Urgency"],
    prepares: ["Run sheet", "Reassignment", "Reschedule suggestion", "Late-job message"],
    asks: "Approve run sheet, move booking, reassign, message customer/staff, or park?",
  },
  {
    name: "Workload / Capacity Planner",
    group: "operations",
    purpose: "Checks if the business is overloaded, quiet, or unbalanced.",
    usedBy: "Growing businesses",
    jobs: ["Find overloaded days", "Find quiet days", "Find one staff member overloaded", "Find gaps", "Check no urgent capacity", "Suggest moving bookings", "Check future capacity", "Warn before workload gets messy"],
    triggers: ["Week view", "New booking", "Staff leave", "Capacity threshold hit", "Quiet day detected"],
    checks: ["Bookings per day", "Staff load", "Duration", "Gaps", "Urgent space", "Future demand"],
    prepares: ["Capacity warning", "Move suggestion", "Quiet-day opportunity", "Staff load summary"],
    asks: "Move work, leave schedule, open booking space, or park?",
  },
  {
    name: "Quality Checker",
    group: "quality",
    purpose: "Checks work is safe to complete, invoice, and remember.",
    usedBy: "All service businesses",
    jobs: ["Check safe to mark complete", "Check proof/photos where needed", "Check service notes", "Check product/colour notes", "Check customer approval", "Check complaint risk", "Check next booking prompt", "Check safe to invoice", "Catch missing completion info"],
    triggers: ["Work marked complete", "Invoice draft requested", "Staff note missing", "Customer issue", "Proof required"],
    checks: ["Status", "Proof", "Service notes", "Customer approval", "Extras", "Complaint risk", "Invoice readiness"],
    prepares: ["Quality pass/fail", "Ask-staff prompt", "Completion correction", "Invoice safety flag"],
    asks: "Complete anyway, ask staff, attach proof, update notes, or park?",
  },
  {
    name: "Stock / Supplies Clerk",
    group: "operations",
    purpose: "Tracks products, materials and supplies used by work.",
    usedBy: "Salons, nails, cleaners, trades, mobile services",
    jobs: ["Track products used", "Track materials used", "Track cleaning supplies", "Track parts", "Track salon/nail colours", "Flag low stock", "Suggest reorder", "Link supplies to invoice/client notes", "Catch supplies used but not charged"],
    triggers: ["Product/material noted", "Stock threshold hit", "Repeated product use", "Invoice created"],
    checks: ["Product name", "Quantity", "Client/service", "Invoice line", "Stock level", "Reorder rule"],
    prepares: ["Low-stock alert", "Reorder reminder", "Invoice line suggestion", "Client product note"],
    asks: "Mark low stock, add to invoice, save to client, reorder later, or ignore?",
  },
  {
    name: "Review / Reputation Clerk",
    group: "clients",
    purpose: "Finds the right time to ask happy customers for reviews.",
    usedBy: "Businesses that rely on local trust",
    jobs: ["Find happy repeat customers", "Find completed work with no complaint", "Find paid jobs", "Find review opportunities", "Prepare review request", "Avoid unhappy clients", "Track review request history"],
    triggers: ["Repeat customer paid", "Clean job completed", "Positive message", "No complaint after work"],
    checks: ["Client history", "Complaint status", "Payment status", "Last review ask", "Service quality"],
    prepares: ["Review request draft", "Do-not-ask warning", "Reputation opportunity"],
    asks: "Send review request, edit, ask later, or park?",
  },
  {
    name: "Profit / Margin Checker",
    group: "operations",
    purpose: "Finds underpriced work before the business quietly loses money.",
    usedBy: "Any business with labour, time or materials",
    jobs: ["Compare price vs hours", "Compare price vs materials", "Find underpriced recurring work", "Find quotes too cheap", "Find extras not charged", "Find work taking longer than normal", "Warn before next recurring visit", "Suggest price review"],
    triggers: ["Work completed", "Recurring work repeated", "Quote prepared", "Timer high", "Material cost added"],
    checks: ["Price", "Hours", "Materials", "Staff cost", "Service history", "Normal duration", "Extras"],
    prepares: ["Margin warning", "Price review prompt", "Quote warning", "Recurring adjustment suggestion"],
    asks: "Review price, keep as is, add extra, change recurring price, or park?",
  },
  {
    name: "Compliance / Record Keeper",
    group: "quality",
    purpose: "Keeps business records clean enough to protect the owner later.",
    usedBy: "Any business that needs proof, approvals or history",
    jobs: ["Save approval proof", "Attach customer messages", "Check signed terms", "Check staff details", "Check service history", "Check invoice/payment records", "Protect against disputes", "Keep records clean before problems happen"],
    triggers: ["Customer approves extra", "Terms needed", "Dispute risk", "Invoice sent", "Staff/client record incomplete"],
    checks: ["Approval source", "Record link", "Message thread", "Terms status", "Payment/invoice link", "Staff/client details"],
    prepares: ["Attached proof", "Record correction", "Terms reminder", "Dispute-ready summary"],
    asks: "Attach proof, ask customer, update record, continue without, or park?",
  },
  {
    name: "Operations Manager",
    group: "operations",
    purpose: "Finds repeated business problems and suggests rules to fix them.",
    usedBy: "Owners who want the business improving over time",
    jobs: ["Find repeated missing prices", "Find repeated late invoices", "Find workers forgetting notes", "Find clients not rebooking", "Find overloaded days", "Find missed recurring work", "Find quotes not followed up", "Find work losing money", "Suggest rule changes"],
    triggers: ["Weekly review", "Pattern repeated", "Same problem appears 3+ times", "Owner asks what is going wrong"],
    checks: ["Last 7/30 days", "Repeated issues", "Money impact", "Staff/client patterns", "Process gap", "Suggested rule"],
    prepares: ["Pattern report", "Suggested business rule", "Process improvement", "Owner decision"],
    asks: "Apply suggested rule, review examples, remind staff, leave as is, or park?",
  },
];

const demoDecisions = [
  {
    tray: "Money",
    role: "Bookkeeper + Materials / Extras Clerk",
    title: "Completed service has extra charge decision",
    happened: "Worker marked Stuart’s service complete and noted extra green waste.",
    checked: ["Job/service completed", "Worker note found", "Timer: 2.5 hours", "No invoice sent yet", "Client has normal service price saved"],
    prepared: "Draft invoice is ready with the normal service price. Extra green waste is waiting for owner decision.",
    needs: "Should the extra green waste be charged, included free, or checked with the worker first?",
    actions: ["Add charge", "Include free", "Ask worker", "Edit invoice", "Park"],
  },
  {
    tray: "Bookings",
    role: "Receptionist + Recurring Work Manager",
    title: "Regular client has no next booking",
    happened: "Jay normally books every 3 weeks, but no next appointment is set.",
    checked: ["Last appointment date", "Usual 3-week pattern", "Preferred staff member", "Open booking calendar"],
    prepared: "Friendly rebooking message and next appointment suggestion are ready.",
    needs: "Send rebooking message, create booking, or leave for now?",
    actions: ["Send message", "Create booking", "Edit date", "Park"],
  },
  {
    tray: "Staff",
    role: "Payroll Clerk + Staff Manager",
    title: "Payroll review has one odd timer",
    happened: "Cam has 36.5 hours ready, but one timer ran much longer than usual.",
    checked: ["Pay period hours", "Completed work records", "Manual time", "Odd timer: 11.25 hours", "Worker rate exists"],
    prepared: "Gross hours review is ready. No tax filing or bank payout is prepared.",
    needs: "Approve hours, edit the odd timer, or ask Cam what happened?",
    actions: ["Approve clean hours", "Edit timer", "Ask Cam", "Exclude shift", "Park"],
  },
  {
    tray: "Clients",
    role: "Client Memory Clerk + Quality Checker",
    title: "Service note should become client memory",
    happened: "Sarah’s appointment note says colour 042, almond shape, sensitive cuticle.",
    checked: ["Existing client memory", "Latest service note", "No duplicate preference saved", "Next booking not set"],
    prepared: "Client memory update and next booking reminder are ready.",
    needs: "Save these details to client memory and suggest a 4-week rebook?",
    actions: ["Save memory", "Save + rebook", "Edit note", "Ignore", "Park"],
  },
];

const groupNames = {
  priority: "Today’s priorities",
  money: "Money",
  bookings: "Bookings",
  staff: "Staff",
  clients: "Clients",
  quality: "Work / Quality",
  operations: "Operations",
};

export default function OfficeTeamLab() {
  const [activeGroup, setActiveGroup] = useState("priority");
  const [activeRoleName, setActiveRoleName] = useState(roles[0].name);

  const visibleRoles = useMemo(() => roles.filter((role) => role.group === activeGroup), [activeGroup]);
  const activeRole = roles.find((role) => role.name === activeRoleName) || visibleRoles[0] || roles[0];

  function changeGroup(groupKey) {
    setActiveGroup(groupKey);
    const first = roles.find((role) => role.group === groupKey);
    if (first) setActiveRoleName(first.name);
  }

  return (
    <main className="officeLab">
      <header className="officeTopbar">
        <div className="officeBrand">
          <img src={BRAND_ICON} alt="Churvox" />
          <div>
            <strong>Churvox Office Team Lab</strong>
            <span>Hidden side build — public website untouched</span>
          </div>
        </div>
        <nav aria-label="Lab sections">
          <a href="#roles">Roles</a>
          <a href="#command">Command Desk</a>
          <a href="#logic">Logic</a>
        </nav>
      </header>

      <section className="officeHero">
        <div className="heroCopy">
          <p className="eyebrow">Workers and owners give simple updates</p>
          <h1>Churvox runs the office in the background. The owner approves the decisions.</h1>
          <p>
            This lab is the new side build for the real product direction: each mimic acts like a real office role, prepares the admin, then sends only clean owner decisions into Command.
          </p>
          <div className="heroActions">
            <a href="#command">View Command trays</a>
            <a href="#roles" className="ghost">Check all roles</a>
          </div>
        </div>
        <aside className="briefingCard" aria-label="Office team briefing">
          <span className="livePill">Office team active</span>
          <h2>Today’s briefing</h2>
          <p>Your office team prepared 35 decisions. The owner should only review 6 first.</p>
          <div className="briefingRows">
            {trays.slice(0, 4).map((tray) => (
              <div key={tray.key}><b>{tray.count}</b><span>{tray.label}</span></div>
            ))}
          </div>
        </aside>
      </section>

      <section className="officePrinciples" id="logic">
        <article>
          <span>1</span>
          <h3>Input comes in</h3>
          <p>Owner, worker, customer, timer, quote, invoice, booking, message, payment, or service note.</p>
        </article>
        <article>
          <span>2</span>
          <h3>Mimic does its role</h3>
          <p>Each role checks the records a real person would check before preparing anything.</p>
        </article>
        <article>
          <span>3</span>
          <h3>Command gets the decision</h3>
          <p>No messy pile. Decisions are grouped by money, bookings, staff, clients, quality and operations.</p>
        </article>
        <article>
          <span>4</span>
          <h3>Owner approves safely</h3>
          <p>Nothing is sent, synced, paid, charged or changed until the owner approves.</p>
        </article>
      </section>

      <section className="rolesSection" id="roles">
        <div className="sectionTitle">
          <p className="eyebrow">Office mimics</p>
          <h2>Every role has real work to do.</h2>
          <p>Not generic cards. Each mimic has jobs, triggers, checks, prepared work and a clean owner question.</p>
        </div>

        <div className="trayTabs" role="tablist" aria-label="Office trays">
          {Object.entries(groupNames).map(([key, label]) => (
            <button key={key} className={activeGroup === key ? "active" : ""} onClick={() => changeGroup(key)}>{label}</button>
          ))}
        </div>

        <div className="roleWorkbench">
          <aside className="roleList" aria-label="Roles in selected tray">
            {visibleRoles.map((role) => (
              <button key={role.name} className={activeRole.name === role.name ? "selected" : ""} onClick={() => setActiveRoleName(role.name)}>
                <strong>{role.name}</strong>
                <span>{role.usedBy}</span>
              </button>
            ))}
          </aside>

          <article className="roleDetail">
            <div className="roleHeader">
              <div>
                <span>{groupNames[activeRole.group]}</span>
                <h3>{activeRole.name}</h3>
                <p>{activeRole.purpose}</p>
              </div>
              <em>{activeRole.usedBy}</em>
            </div>

            <div className="roleGrid">
              <DetailList title="Jobs this role does" items={activeRole.jobs} />
              <DetailList title="What triggers it" items={activeRole.triggers} />
              <DetailList title="Records it checks" items={activeRole.checks} />
              <DetailList title="What it prepares" items={activeRole.prepares} />
            </div>

            <div className="ownerQuestion">
              <span>Owner decision sent to Command</span>
              <p>{activeRole.asks}</p>
              <small>Prepared only. Owner approval required before sending, syncing, changing money or updating records.</small>
            </div>
          </article>
        </div>
      </section>

      <section className="commandSection" id="command">
        <div className="sectionTitle narrow">
          <p className="eyebrow">Command Desk</p>
          <h2>One approval place. Not one messy pile.</h2>
          <p>The mimics feed clean decision trays. The owner opens the tray they need instead of searching through pages.</p>
        </div>

        <div className="commandTrays">
          {trays.map((tray) => (
            <article key={tray.key}>
              <div><strong>{tray.count}</strong><span>decisions</span></div>
              <h3>{tray.label}</h3>
              <p>{tray.note}</p>
            </article>
          ))}
        </div>

        <div className="decisionGrid">
          {demoDecisions.map((decision) => (
            <article className="decisionCard" key={decision.title}>
              <div className="decisionMeta"><span>{decision.tray}</span><em>{decision.role}</em></div>
              <h3>{decision.title}</h3>
              <dl>
                <dt>What happened</dt>
                <dd>{decision.happened}</dd>
                <dt>What Churvox checked</dt>
                <dd><ul>{decision.checked.map((item) => <li key={item}>{item}</li>)}</ul></dd>
                <dt>Prepared work</dt>
                <dd>{decision.prepared}</dd>
                <dt>Decision needed</dt>
                <dd>{decision.needs}</dd>
              </dl>
              <div className="decisionActions">
                {decision.actions.map((action, index) => <button key={action} className={index === 0 ? "primary" : ""}>{action}</button>)}
              </div>
              <small>Safety: nothing is sent, synced, paid, charged or changed until owner approval.</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function DetailList({ title, items }) {
  return (
    <section>
      <h4>{title}</h4>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  );
}
