import React, { useEffect, useMemo, useState } from "react";
import "./OfficeTeamLabFinal.css";
import "./OfficeTeamLabLive.css";
import { fetchOfficeTeamSnapshot, makeStatusCards, recordOfficeTeamDecision } from "./officeTeamApi";

const BRAND_ICON = "/churvox-app-icon.svg?v=churvox-office-final-20260709";

const departments = [["command", "Command", 6], ["money", "Money", 8], ["bookings", "Bookings", 5], ["staff", "Staff", 4], ["clients", "Clients", 7], ["quality", "Quality", 3], ["ops", "Operations", 2]];

const roles = [
  role("Office Manager", "command", "Ranks the day and keeps the owner focused.", ["all decisions", "risk", "money impact", "due dates"], ["daily briefing", "priority order", "owner queue"], "Review the top decisions or open a tray?"),
  role("Owner PA", "command", "Turns rough owner instructions into clean admin.", ["client match", "recent work", "missing details"], ["draft task", "one-question follow-up", "linked action"], "Approve, edit, or park it?"),
  role("Receptionist", "bookings", "Handles bookings, moves, cancellations and reminders.", ["date/time", "staff availability", "double booking"], ["booking draft", "reminder", "rebooking message"], "Create, move, rebook, or park?"),
  role("Inbox Triage", "clients", "Sorts messy messages and routes them to the right mimic.", ["sender", "intent", "linked record", "urgency"], ["message category", "suggested reply", "handoff"], "Reply, create action, assign, or park?"),
  role("Client Onboarding", "clients", "Makes new client records usable before work starts.", ["contact", "service need", "location", "preferences"], ["clean client file", "missing-info request"], "Ask, add manually, continue, or park?"),
  role("Admin Operator", "quality", "Keeps work, clients, invoices and notes tidy.", ["status", "staff", "price", "linked invoice"], ["record cleanup", "status fix", "missing-field task"], "Fix, update, link, or park?"),
  role("Client Memory", "clients", "Turns small details into useful client memory.", ["existing notes", "history", "messages"], ["preference note", "access note", "next-service reminder"], "Save, edit, ignore, or park?"),
  role("Client Care", "clients", "Protects relationships and keeps customers replied to.", ["waiting replies", "complaints", "recent work"], ["reply draft", "check-in", "issue follow-up"], "Send, edit, ask staff, or park?"),
  role("Sales Follow-up", "money", "Follows up quotes, leads and quiet opportunities.", ["quote viewed", "last reply", "booking status"], ["follow-up", "booking prompt", "reactivation"], "Send, edit, book, or park?"),
  role("Recurring Work", "bookings", "Keeps repeat work from falling through cracks.", ["last service", "usual cycle", "next booking"], ["next visit", "recurring schedule", "rebook message"], "Create, send rebook, review, or park?"),
  role("Bookkeeper", "money", "Prepares invoice and accounting admin safely.", ["completed work", "price", "extras", "existing invoice"], ["invoice draft", "reminder", "Xero-ready check"], "Approve, edit, send, or park?"),
  role("Payments Clerk", "money", "Keeps unpaid money moving with approved follow-ups.", ["due date", "reminders", "payment status"], ["polite reminder", "status correction"], "Send reminder, edit, mark clear, or park?"),
  role("Extras Clerk", "money", "Catches extra time, products and materials before money is missed.", ["staff note", "normal price", "client approval"], ["extra line", "ask-staff prompt"], "Add, include free, ask, or park?"),
  role("Payroll Clerk", "staff", "Prepares staff hours review for the owner.", ["timers", "manual time", "rates", "odd shifts"], ["hours review", "timer correction"], "Approve hours, edit, ask staff, or park?"),
  role("Staff Manager", "staff", "Keeps staff access and follow-through clean.", ["login", "contact", "rate", "acknowledgement"], ["setup checklist", "staff reminder"], "Remind, finish setup, reassign, or park?"),
  role("Dispatcher", "staff", "Runs the day and keeps work assigned properly.", ["today", "tomorrow", "staff load", "locations"], ["run sheet", "reschedule option"], "Approve, move, reassign, or park?"),
  role("Capacity Planner", "ops", "Finds overloaded, quiet and unbalanced days.", ["bookings per day", "staff load", "gaps"], ["capacity warning", "move suggestion"], "Move, leave, open space, or park?"),
  role("Quality Checker", "quality", "Checks work is safe to complete, invoice and remember.", ["proof", "service notes", "extras"], ["quality flag", "ask-staff prompt"], "Complete, ask staff, attach proof, or park?"),
  role("Stock Clerk", "ops", "Tracks products, parts and supplies used by work.", ["product", "quantity", "stock level"], ["low-stock alert", "product note"], "Mark low, add, save, or ignore?"),
  role("Review Clerk", "clients", "Finds the right time to ask happy clients for reviews.", ["repeat client", "clear status", "last ask"], ["review request", "do-not-ask warning"], "Ask, edit, later, or park?"),
  role("Profit Checker", "ops", "Finds underpriced work before it quietly hurts the business.", ["price", "hours", "materials"], ["margin warning", "price review"], "Review price, keep, add extra, or park?"),
  role("Record Keeper", "quality", "Keeps proof and approvals attached to the right records.", ["approval source", "message thread", "record link"], ["attached proof", "record correction"], "Attach, ask, update, or park?"),
  role("Operations Manager", "ops", "Finds repeated business problems and suggests rules.", ["last 30 days", "repeated issues", "process gaps"], ["pattern report", "suggested rule"], "Apply rule, review, remind, or park?"),
];

const playbooks = [["General Service", "work", "staff", "client"], ["Hair / Beauty", "appointment", "stylist", "client"], ["Barber", "appointment", "barber", "client"], ["Nails", "appointment", "nail tech", "client"], ["Cleaning", "visit", "cleaner", "customer"], ["Trades / Maintenance", "job", "worker", "client"]];

const demoDecisions = [
  decision("demo-1", "Money", "Bookkeeper + Extras", "Top priority", "Completed service has extra charge decision", "Stuart’s work was completed and staff noted extra green waste.", ["completed", "staff note", "normal price", "invoice not sent"], "Invoice draft ready. Extra line is held for owner decision.", "Charge extra, include free, or ask staff first?", ["Add charge", "Include free", "Ask staff", "Edit", "Park"]),
  decision("demo-2", "Bookings", "Receptionist", "Next", "Regular client has no next booking", "Jay usually books every 3 weeks but has no next appointment.", ["last visit", "usual cycle", "preferred staff", "calendar space"], "Rebooking message and suggested date are ready.", "Send rebooking message or create booking now?", ["Send", "Book", "Edit date", "Park"]),
  decision("demo-3", "Staff", "Payroll Clerk", "Needs check", "Hours review has one odd timer", "Cam has 36.5 hours ready, with one timer much longer than usual.", ["period", "timers", "manual time", "rate"], "Hours review is ready and the odd timer is flagged.", "Approve, edit timer, or ask Cam?", ["Approve", "Edit", "Ask Cam", "Park"]),
  decision("demo-4", "Clients", "Client Memory", "Low risk", "Service note should become client memory", "Sarah’s appointment note includes colour, shape and sensitivity detail.", ["existing notes", "latest service", "duplicates"], "Client memory update is ready.", "Save this to client memory?", ["Save", "Save + rebook", "Edit", "Ignore"]),
];

const fallbackActivity = [["Bookkeeper", "Checked completed work and prepared one invoice decision.", "2 min ago"], ["Receptionist", "Found one regular client with no next booking.", "4 min ago"], ["Payroll Clerk", "Prepared staff hours review and flagged one timer.", "8 min ago"], ["Client Memory", "Prepared one service preference for owner save.", "12 min ago"]];
const buildMap = ["Connect Command Queue to Admin Brain scan results", "Make playbook labels change wording across the app", "Wire approve, edit and park to safe owner-decision routes", "Replace demo activity with real mimic activity log", "Add role settings so owners can choose review-only or active", "Move this finished shell into the real app once approved"];

export default function OfficeTeamLabFinal() {
  const [activeDepartment, setActiveDepartment] = useState("command");
  const [activeRoleName, setActiveRoleName] = useState("Office Manager");
  const [activePlaybook, setActivePlaybook] = useState(playbooks[0]);
  const [snapshot, setSnapshot] = useState({ source: "demo", decisions: [], counts: null });
  const [notice, setNotice] = useState("Demo preview. Live Admin Brain connects when signed in.");
  const [marks, setMarks] = useState({});

  useEffect(() => {
    let live = true;
    fetchOfficeTeamSnapshot().then((data) => {
      if (!live) return;
      setSnapshot(data || { source: "demo", decisions: [] });
      if (data?.source === "admin-brain") setNotice("Live Admin Brain scan loaded. Actions still require owner approval.");
      else if (data?.source === "clear-live") setNotice("Live scan is clear. Demo decisions remain visible for layout review.");
      else setNotice("Demo preview. Sign in as an owner to load live Admin Brain decisions.");
    }).catch((err) => {
      if (live) setNotice(`Demo preview. Live scan unavailable: ${err.message || "connection issue"}`);
    });
    return () => { live = false; };
  }, []);

  const filteredRoles = useMemo(() => roles.filter((item) => item.dept === activeDepartment), [activeDepartment]);
  const visibleRoles = filteredRoles.length ? filteredRoles : roles.filter((item) => item.dept === "command");
  const activeRole = roles.find((item) => item.name === activeRoleName) || visibleRoles[0] || roles[0];
  const visibleDecisions = snapshot.decisions?.length ? snapshot.decisions : demoDecisions;
  const departmentCounts = useMemo(() => countDepartments(visibleDecisions), [visibleDecisions]);
  const activityRows = useMemo(() => snapshot.decisions?.length ? visibleDecisions.slice(0, 4).map((item) => [item.roleName || item.tray, `${item.title} prepared for owner review.`, "live now"]) : fallbackActivity, [snapshot.decisions?.length, visibleDecisions]);
  const metrics = makeStatusCards(snapshot.counts, visibleDecisions.length);
  const sourceLabel = snapshot.source === "admin-brain" ? "Live Admin Brain" : snapshot.source === "clear-live" ? "Live scan clear" : "Demo mode";

  function chooseDepartment(key) {
    setActiveDepartment(key);
    const first = roles.find((item) => item.dept === key);
    if (first) setActiveRoleName(first.name);
  }

  async function handleDecision(item, action) {
    setMarks((prev) => ({ ...prev, [item.id || item.title]: action }));
    try {
      const result = await recordOfficeTeamDecision(item, action);
      setNotice(result?.localOnly ? `${action} saved in lab preview. No live send or sync.` : `${action} recorded safely. No send or sync was triggered.`);
    } catch (err) {
      setNotice(`Could not record ${action}: ${err.message || "try again"}. Nothing was sent or synced.`);
    }
  }

  return (
    <main className="cvOfficeFinal">
      <header className="cvOfficeTopbar"><div className="cvOfficeBrand"><img src={BRAND_ICON} alt="Churvox" /><div><strong>Churvox Office Team</strong><span>Command desk · owner approval · hidden build</span></div></div><nav><a href="#command">Command</a><a href="#team">Office Team</a><a href="#playbooks">Playbooks</a><a href="#build">Build Map</a></nav></header>
      <section className="cvOfficeStatus"><div className="cvOfficeStatusLead"><span>Office running · {sourceLabel}</span><h1>Staff update the work. Churvox runs the office. The owner approves the decisions.</h1><p>Nothing is sent, synced, charged, or changed until the owner approves it in Command.</p><small className="cvOfficeNotice">{notice}</small></div>{metrics.map((m) => <Metric key={m.label} {...m} />)}</section>
      <section className="cvOfficeGrid" id="command"><section className="cvCommandPanel"><PanelHeader eyebrow="Needs owner now" title="Command Queue" text="Prepared by mimics. Organised by risk. Owner decides the next step." /><div className="cvDepartmentRail">{departments.map(([key, label, count]) => <button key={key} className={activeDepartment === key ? "active" : ""} onClick={() => chooseDepartment(key)}><strong>{departmentCounts[key] ?? count}</strong><span>{label}</span></button>)}</div><div className="cvDecisionBoard">{visibleDecisions.map((item) => <DecisionCard key={item.id || item.title} item={item} mark={marks[item.id || item.title]} onAction={handleDecision} />)}</div></section><aside className="cvRightRail"><section className="cvPlaybookCard" id="playbooks"><PanelHeader eyebrow="Business playbook" title={activePlaybook[0]} /><div className="cvPlaybookButtons">{playbooks.map((item) => <button key={item[0]} className={activePlaybook[0] === item[0] ? "active" : ""} onClick={() => setActivePlaybook(item)}>{item[0]}</button>)}</div><dl className="cvPlaybookTerms"><div><dt>Work word</dt><dd>{activePlaybook[1]}</dd></div><div><dt>Staff word</dt><dd>{activePlaybook[2]}</dd></div><div><dt>Customer word</dt><dd>{activePlaybook[3]}</dd></div></dl></section><section className="cvActivityCard"><PanelHeader eyebrow="Live office activity" title="Background work" /><ul>{activityRows.map(([who, text, time]) => <li key={`${who}-${time}-${text}`}><strong>{who}</strong><p>{text}</p><small>{time}</small></li>)}</ul></section></aside></section>
      <section className="cvTeamWorkbench" id="team"><PanelHeader eyebrow="Office team" title="Every mimic has a real job." text="Roles sit in the background, prepare admin, and send only clean decisions to Command." /><div className="cvTeamLayout"><aside className="cvRoleList">{visibleRoles.map((item) => <button key={item.name} className={activeRole.name === item.name ? "active" : ""} onClick={() => setActiveRoleName(item.name)}><strong>{item.name}</strong><span>{item.summary}</span></button>)}</aside><article className="cvRoleDetail"><div className="cvRoleHero"><span>{activeRole.dept}</span><h3>{activeRole.name}</h3><p>{activeRole.summary}</p></div><div className="cvRoleColumns"><RoleBlock title="Checks" items={activeRole.checks} /><RoleBlock title="Prepares" items={activeRole.prepares} /><section><h4>Owner question</h4><p>{activeRole.ownerAsk}</p></section></div></article></div></section>
      <section className="cvBuildMap" id="build"><PanelHeader eyebrow="Build map" title="What this becomes next" text="This is the finished direction, ready to connect into real Churvox data." /><ol>{buildMap.map((item) => <li key={item}>{item}</li>)}</ol></section>
    </main>
  );
}

function role(name, dept, summary, checks, prepares, ownerAsk) { return { name, dept, summary, checks, prepares, ownerAsk }; }
function decision(id, tray, roleName, level, title, happened, checked, prepared, need, actions) { return { id, tray, roleName, level, title, happened, checked, prepared, need, actions }; }
function trayKey(tray = "") { const t = String(tray).toLowerCase(); if (t.includes("money")) return "money"; if (t.includes("booking")) return "bookings"; if (t.includes("staff")) return "staff"; if (t.includes("client")) return "clients"; if (t.includes("quality")) return "quality"; if (t.includes("operation")) return "ops"; return "command"; }
function countDepartments(items = []) { return items.reduce((acc, item) => { acc.command += 1; const key = trayKey(item.tray); acc[key] = (acc[key] || 0) + 1; return acc; }, { command: 0, money: 0, bookings: 0, staff: 0, clients: 0, quality: 0, ops: 0 }); }
function Metric({ value, label, note }) { return <article><strong>{value}</strong><span>{label}</span><small>{note}</small></article>; }
function PanelHeader({ eyebrow, title, text }) { return <div className="cvPanelHeader"><div><span>{eyebrow}</span><h2>{title}</h2></div>{text && <p>{text}</p>}</div>; }
function RoleBlock({ title, items }) { return <section><h4>{title}</h4><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>; }
function DecisionCard({ item, mark, onAction }) { return <article className="cvDecisionCard"><div className="cvDecisionMeta"><span>{mark || item.level}</span><em>{item.tray}</em></div><h3>{item.title}</h3><p>{item.happened}</p><dl><dt>Checked</dt><dd>{(item.checked || []).map((x) => <span key={x}>{x}</span>)}</dd><dt>Prepared</dt><dd>{item.prepared}</dd><dt>Owner decision</dt><dd>{item.need}</dd></dl><div className="cvDecisionActions">{(item.actions || []).map((action, i) => <button key={action} onClick={() => onAction(item, action)} className={i === 0 ? "primary" : ""}>{action}</button>)}</div><small>{mark ? `Marked: ${mark} · ` : ""}Approval locked · no auto-send · no auto-sync</small></article>; }
