import React, { useEffect, useMemo, useState } from "react";
import "./OfficeTeamLabFinal.css";
import "./OfficeTeamLabLive.css";
import "./OfficeTeamLabTidy.css";
import OfficeTeamRoleControls from "./OfficeTeamRoleControls";
import { fetchOfficeTeamSnapshot, makeStatusCards, recordOfficeTeamDecision } from "./officeTeamApi";

const BRAND_ICON = "/churvox-app-icon.svg?v=churvox-office-tidy-20260709";
const COMMAND_CARD_LIMIT = 3;

const departments = [
  ["command", "Command", 0],
  ["money", "Money", 0],
  ["bookings", "Bookings", 0],
  ["staff", "Staff", 0],
  ["clients", "Clients", 0],
  ["quality", "Quality", 0],
  ["ops", "Operations", 0],
];

const roles = [
  r("Office Manager", "command", "Ranks today and keeps the owner on the right decisions.", ["all decisions", "risk", "money", "due dates"], ["daily briefing", "priority order", "owner queue"], "Review the top decisions or open a tray?"),
  r("Owner PA", "command", "Turns rough owner instructions into clean admin.", ["client match", "recent work", "missing detail"], ["draft task", "one clean question", "linked action"], "Approve, edit, or park it?"),
  r("Receptionist", "bookings", "Handles bookings, moves, reminders and cancellations.", ["date", "staff", "double booking", "customer history"], ["booking draft", "reminder", "rebook message"], "Create, move, rebook, or park?"),
  r("Recurring Work", "bookings", "Stops regular work and repeat appointments falling through cracks.", ["last visit", "usual cycle", "next booking"], ["next visit", "recurring schedule", "rebook prompt"], "Create next booking, message client, or park?"),
  r("Bookkeeper", "money", "Prepares invoice and accounting admin safely.", ["completed work", "price", "extras", "invoice state"], ["invoice draft", "payment reminder", "Xero-ready check"], "Approve draft, edit, send later, or park?"),
  r("Payments Clerk", "money", "Keeps unpaid money moving with owner-approved follow-ups.", ["due date", "reminders", "payment status"], ["polite reminder", "status correction", "follow-up"], "Send reminder, edit, mark clear, or park?"),
  r("Extras Clerk", "money", "Catches extra time, products and materials before money is missed.", ["staff note", "normal price", "client approval"], ["extra line", "ask-staff prompt", "client approval note"], "Charge, include free, ask staff, or park?"),
  r("Payroll Clerk", "staff", "Prepares staff hours review for owner approval.", ["timers", "manual time", "rates", "odd shifts"], ["hours review", "timer correction", "ask-staff note"], "Approve hours, edit, ask staff, or park?"),
  r("Staff Manager", "staff", "Keeps staff setup, access and follow-through clean.", ["login", "contact", "rate", "acknowledgement"], ["setup checklist", "staff reminder", "reassignment"], "Remind, finish setup, reassign, or park?"),
  r("Dispatcher", "staff", "Keeps the day assigned and moving.", ["today", "tomorrow", "staff load", "locations"], ["run sheet", "reschedule option", "late message"], "Approve run sheet, move, reassign, or park?"),
  r("Inbox Triage", "clients", "Sorts messages and sends them to the right office role.", ["sender", "intent", "record link", "urgency"], ["category", "reply draft", "handoff"], "Reply, create action, assign, or park?"),
  r("Client Onboarding", "clients", "Makes new client records usable before work starts.", ["contact", "service need", "location", "preferences"], ["clean client file", "missing-info request", "welcome reply"], "Ask for info, add manually, continue, or park?"),
  r("Client Memory", "clients", "Turns small details into useful client memory.", ["existing notes", "service history", "messages"], ["preference note", "access note", "next-service reminder"], "Save, edit, ignore, or park?"),
  r("Client Care", "clients", "Protects relationships and keeps customers replied to.", ["waiting replies", "complaints", "recent work"], ["reply draft", "check-in", "issue follow-up"], "Send, edit, ask staff, or park?"),
  r("Review Clerk", "clients", "Finds safe moments to ask happy clients for reviews.", ["repeat client", "paid", "complaint status", "last ask"], ["review request", "do-not-ask warning"], "Ask, edit, ask later, or park?"),
  r("Admin Operator", "quality", "Keeps work, clients, invoices and notes tidy.", ["status", "staff", "price", "linked invoice"], ["record cleanup", "status fix", "missing-field task"], "Fix, update, link, or park?"),
  r("Quality Checker", "quality", "Checks work is safe to complete, invoice and remember.", ["proof", "notes", "extras", "complaint risk"], ["quality flag", "ask-staff prompt", "invoice safety"], "Complete, ask staff, attach proof, or park?"),
  r("Record Keeper", "quality", "Keeps proof and approvals attached to the right records.", ["approval source", "message thread", "record link"], ["attached proof", "record correction", "dispute summary"], "Attach, ask, update, or park?"),
  r("Capacity Planner", "ops", "Finds overloaded, quiet and unbalanced days.", ["bookings", "staff load", "gaps", "future demand"], ["capacity warning", "move suggestion", "quiet-day opportunity"], "Move work, leave it, open space, or park?"),
  r("Stock Clerk", "ops", "Tracks products, parts and supplies used by work.", ["product", "quantity", "stock level", "invoice line"], ["low-stock alert", "product note", "reorder reminder"], "Mark low, add, save, or ignore?"),
  r("Profit Checker", "ops", "Finds underpriced work before it quietly hurts the business.", ["price", "hours", "materials", "normal duration"], ["margin warning", "price review", "quote warning"], "Review price, keep, add extra, or park?"),
  r("Operations Manager", "ops", "Finds repeated business problems and suggests better rules.", ["last 30 days", "repeated issues", "money impact", "process gap"], ["pattern report", "suggested rule", "process improvement"], "Apply rule, review examples, remind staff, or park?"),
];

const playbooks = [
  ["General Service", "work", "staff", "client"],
  ["Hair / Beauty", "appointment", "stylist", "client"],
  ["Barber", "appointment", "barber", "client"],
  ["Nails", "appointment", "nail tech", "client"],
  ["Cleaning", "visit", "cleaner", "customer"],
  ["Trades / Maintenance", "job", "worker", "client"],
];

const demoDecisions = [
  d("demo-1", "Money", "Bookkeeper + Extras", "Top priority", "Completed service has extra charge decision", "Stuart’s work was completed and staff noted extra green waste.", ["completed", "staff note", "normal price", "invoice not sent"], "Invoice draft ready. Extra line is held for owner decision.", "Charge extra, include free, or ask staff first?", ["Add charge", "Include free", "Ask staff", "Edit", "Park"]),
  d("demo-2", "Bookings", "Receptionist", "Next", "Regular client has no next booking", "Jay usually books every 3 weeks but has no next appointment.", ["last visit", "usual cycle", "preferred staff", "calendar space"], "Rebooking message and suggested date are ready.", "Send rebooking message or create booking now?", ["Send", "Book", "Edit date", "Park"]),
  d("demo-3", "Staff", "Payroll Clerk", "Needs check", "Hours review has one odd timer", "Cam has 36.5 hours ready, with one timer much longer than usual.", ["period", "timers", "manual time", "rate"], "Hours review is ready and the odd timer is flagged.", "Approve, edit timer, or ask Cam?", ["Approve", "Edit", "Ask Cam", "Park"]),
  d("demo-4", "Clients", "Client Memory", "Low risk", "Service note should become client memory", "Sarah’s appointment note includes colour, shape and sensitivity detail.", ["existing notes", "latest service", "duplicates"], "Client memory update is ready.", "Save this to client memory?", ["Save", "Save + rebook", "Edit", "Ignore"]),
  d("demo-5", "Quality", "Quality Checker", "Parkable", "Completed work is missing proof", "A completed work record is missing its final proof note.", ["complete", "proof missing", "invoice not sent"], "Ask-staff prompt is ready.", "Ask staff for proof or complete anyway?", ["Ask staff", "Complete", "Park"]),
  d("demo-6", "Operations", "Profit Checker", "Pattern", "Recurring work may be underpriced", "A repeat service has taken longer than normal three times this month.", ["hours", "price", "repeat pattern"], "Price review prompt is ready before the next visit.", "Review the recurring price before it repeats?", ["Review price", "Keep", "Park"]),
];

const fallbackActivity = [
  ["Bookkeeper", "Prepared one invoice decision.", "2 min ago"],
  ["Receptionist", "Found one regular client with no next booking.", "4 min ago"],
  ["Payroll Clerk", "Flagged one timer for owner check.", "8 min ago"],
  ["Client Memory", "Prepared one client note for approval.", "12 min ago"],
];

const buildMap = [
  "Keep public site untouched until this shell is approved",
  "Connect Command Queue to Admin Brain scan results",
  "Make playbook wording flow through the real app",
  "Wire approve, edit and park to safe owner decision routes",
  "Replace demo activity with real mimic activity logs",
  "Move this shell into the owner app when ready",
];

export default function OfficeTeamLabTidy() {
  const [activeDepartment, setActiveDepartment] = useState("command");
  const [activeRoleName, setActiveRoleName] = useState("Office Manager");
  const [activePlaybook, setActivePlaybook] = useState(playbooks[0]);
  const [snapshot, setSnapshot] = useState({ source: "demo", decisions: [], counts: null });
  const [notice, setNotice] = useState("Demo preview. Sign in as an owner to load live Admin Brain decisions.");
  const [resolved, setResolved] = useState({});

  useEffect(() => {
    let mounted = true;
    fetchOfficeTeamSnapshot()
      .then((data) => {
        if (!mounted) return;
        setSnapshot(data || { source: "demo", decisions: [], counts: null });
        setResolved({});
        if (data?.source === "admin-brain") setNotice("Live Admin Brain scan loaded. Owner approval still required before anything changes.");
        else if (data?.source === "clear-live") setNotice("Live scan is clear. Demo cards stay visible so the page can still be reviewed.");
      })
      .catch((err) => mounted && setNotice(`Demo preview. Live scan unavailable: ${err.message || "connection issue"}`));
    return () => { mounted = false; };
  }, []);

  const decisions = snapshot.decisions?.length ? snapshot.decisions : demoDecisions;
  const pendingDecisions = useMemo(() => decisions.filter((item) => !resolved[decisionKey(item)]), [decisions, resolved]);
  const counts = useMemo(() => countDepartments(pendingDecisions), [pendingDecisions]);
  const trayQueue = useMemo(() => activeDepartment === "command" ? pendingDecisions : pendingDecisions.filter((item) => trayKey(item.tray) === activeDepartment), [activeDepartment, pendingDecisions]);
  const boardDecisions = useMemo(() => trayQueue.slice(0, COMMAND_CARD_LIMIT), [trayQueue]);
  const waitingCount = Math.max(0, trayQueue.length - boardDecisions.length);
  const visibleRoles = useMemo(() => roles.filter((item) => item.dept === activeDepartment || (activeDepartment === "command" && item.dept === "command")), [activeDepartment]);
  const activeRole = roles.find((item) => item.name === activeRoleName) || visibleRoles[0] || roles[0];
  const activityRows = pendingDecisions.length ? pendingDecisions.slice(0, 4).map((item) => [item.roleName || item.tray, `${item.title} waiting in Command.`, "queued"]) : fallbackActivity;
  const liveCounts = { total: pendingDecisions.length, high: pendingDecisions.filter((item) => item.level === "Top priority").length, parked: Object.keys(resolved).length };
  const metrics = makeStatusCards(liveCounts, pendingDecisions.length);
  const sourceLabel = snapshot.source === "admin-brain" ? "Live Admin Brain" : snapshot.source === "clear-live" ? "Live scan clear" : "Demo mode";

  function chooseDepartment(key) {
    setActiveDepartment(key);
    const first = roles.find((item) => item.dept === key) || roles[0];
    setActiveRoleName(first.name);
  }

  async function handleDecision(item, action) {
    const id = decisionKey(item);
    setResolved((current) => ({ ...current, [id]: action }));
    setNotice(`${action} moved out of Command. The next waiting decision is now shown. Nothing was sent or synced.`);
    try {
      const result = await recordOfficeTeamDecision(item, action);
      setNotice(result?.localOnly ? `${action} saved in lab preview. The card left Command and the next one replaced it.` : `${action} recorded safely. The card left Command and the next one replaced it.`);
    } catch (err) {
      setResolved((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setNotice(`Could not record ${action}: ${err.message || "try again"}. The card was returned to Command. Nothing was sent or synced.`);
    }
  }

  return (
    <main className="cvOfficeFinal cvOfficeTidy">
      <Topbar />
      <StatusBar metrics={metrics} sourceLabel={sourceLabel} notice={notice} />

      <section className="cvOfficeGrid cvTidyGrid" id="command">
        <section className="cvCommandPanel cvTidyCommand">
          <PanelHeader eyebrow="Needs owner now" title="Command Queue" text={`Showing ${COMMAND_CARD_LIMIT} at a time. Actioned cards leave Command and the next waiting decision replaces them.`} />
          <DepartmentRail active={activeDepartment} counts={counts} onChoose={chooseDepartment} />
          <QueueSummary shown={boardDecisions.length} total={trayQueue.length} waiting={waitingCount} activeDepartment={activeDepartment} />
          <div className="cvDecisionBoard cvTidyDecisionBoard">
            {boardDecisions.length ? boardDecisions.map((item) => <DecisionCard key={decisionKey(item)} item={item} onAction={handleDecision} />) : <EmptyTray activeDepartment={activeDepartment} />}
          </div>
        </section>

        <aside className="cvRightRail cvTidyRail">
          <PlaybookCard activePlaybook={activePlaybook} onPick={setActivePlaybook} />
          <OfficeTeamRoleControls roles={roles} />
          <ActivityCard rows={activityRows} />
        </aside>
      </section>

      <section className="cvTeamWorkbench cvTidyWorkbench" id="team">
        <PanelHeader eyebrow="Office team" title="Roles behind the desk" text="Each mimic checks records, prepares admin and sends one clean decision into Command." />
        <div className="cvTeamLayout">
          <aside className="cvRoleList">{visibleRoles.map((item) => <button key={item.name} className={activeRole.name === item.name ? "active" : ""} onClick={() => setActiveRoleName(item.name)}><strong>{item.name}</strong><span>{item.summary}</span></button>)}</aside>
          <RoleDetail role={activeRole} />
        </div>
      </section>

      <section className="cvBuildMap cvTidyBuild" id="build">
        <PanelHeader eyebrow="Build map" title="Finish path" text="This keeps the hidden build tidy while the real owner app stays protected." />
        <ol>{buildMap.map((item) => <li key={item}>{item}</li>)}</ol>
      </section>
    </main>
  );
}

function Topbar() {
  return <header className="cvOfficeTopbar"><div className="cvOfficeBrand"><img src={BRAND_ICON} alt="Churvox" /><div><strong>Churvox Office Team</strong><span>Command desk · hidden build · owner approval locked</span></div></div><nav><a href="#command">Command</a><a href="#team">Office Team</a><a href="#playbooks">Playbooks</a><a href="#build">Build Map</a></nav></header>;
}

function StatusBar({ metrics, sourceLabel, notice }) {
  return <section className="cvOfficeStatus cvTidyStatus"><div className="cvOfficeStatusLead"><span>Office running · {sourceLabel}</span><h1>Churvox runs the office. The owner approves the decisions.</h1><p>Staff update the work. The office team checks what is missing, prepares the admin and brings the decision back to Command.</p><small className="cvOfficeNotice">{notice}</small></div>{metrics.map((m) => <Metric key={m.label} {...m} />)}</section>;
}

function DepartmentRail({ active, counts, onChoose }) {
  return <div className="cvDepartmentRail cvTidyDepartments">{departments.map(([key, label, fallback]) => <button key={key} className={active === key ? "active" : ""} onClick={() => onChoose(key)}><strong>{counts[key] ?? fallback}</strong><span>{label}</span></button>)}</div>;
}

function QueueSummary({ shown, total, waiting, activeDepartment }) {
  const label = activeDepartment === "command" ? "all trays" : activeDepartment;
  return <div className="cvQueueSummary"><strong>{shown} showing</strong><span>{total} waiting in {label}</span><em>{waiting ? `${waiting} behind this set` : "queue clear after this set"}</em></div>;
}

function PlaybookCard({ activePlaybook, onPick }) {
  return <section className="cvPlaybookCard" id="playbooks"><PanelHeader eyebrow="Business playbook" title={activePlaybook[0]} /><div className="cvPlaybookButtons">{playbooks.map((item) => <button key={item[0]} className={activePlaybook[0] === item[0] ? "active" : ""} onClick={() => onPick(item)}>{item[0]}</button>)}</div><dl className="cvPlaybookTerms"><div><dt>Work word</dt><dd>{activePlaybook[1]}</dd></div><div><dt>Staff word</dt><dd>{activePlaybook[2]}</dd></div><div><dt>Customer word</dt><dd>{activePlaybook[3]}</dd></div></dl></section>;
}

function ActivityCard({ rows }) {
  return <section className="cvActivityCard"><PanelHeader eyebrow="Live office activity" title="Background work" /><ul>{rows.map(([who, text, time]) => <li key={`${who}-${time}-${text}`}><strong>{who}</strong><p>{text}</p><small>{time}</small></li>)}</ul></section>;
}

function RoleDetail({ role }) {
  return <article className="cvRoleDetail"><div className="cvRoleHero"><span>{role.dept}</span><h3>{role.name}</h3><p>{role.summary}</p></div><div className="cvRoleColumns"><RoleBlock title="Checks" items={role.checks} /><RoleBlock title="Prepares" items={role.prepares} /><section><h4>Owner question</h4><p>{role.ownerAsk}</p></section></div></article>;
}

function EmptyTray() {
  return <article className="cvEmptyTray"><strong>No decisions in this tray</strong><p>The office team is still watching. Anything important will appear here before anything is sent, synced or changed.</p><button type="button">Approval lock on</button></article>;
}

function DecisionCard({ item, onAction }) {
  return <article className="cvDecisionCard"><div className="cvDecisionMeta"><span>{item.level}</span><em>{item.tray}</em></div><h3>{item.title}</h3><p>{item.happened}</p><dl><dt>Checked</dt><dd>{(item.checked || []).map((x) => <span key={x}>{x}</span>)}</dd><dt>Prepared</dt><dd>{item.prepared}</dd><dt>Owner decision</dt><dd>{item.need}</dd></dl><div className="cvDecisionActions">{(item.actions || []).map((action, i) => <button key={action} onClick={() => onAction(item, action)} className={i === 0 ? "primary" : ""}>{action}</button>)}</div><small>Approval locked · leaves Command after action · no auto-send</small></article>;
}

function PanelHeader({ eyebrow, title, text }) { return <div className="cvPanelHeader"><div><span>{eyebrow}</span><h2>{title}</h2></div>{text && <p>{text}</p>}</div>; }
function Metric({ value, label, note }) { return <article><strong>{value}</strong><span>{label}</span><small>{note}</small></article>; }
function RoleBlock({ title, items }) { return <section><h4>{title}</h4><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>; }
function r(name, dept, summary, checks, prepares, ownerAsk) { return { name, dept, summary, checks, prepares, ownerAsk }; }
function d(id, tray, roleName, level, title, happened, checked, prepared, need, actions) { return { id, tray, roleName, level, title, happened, checked, prepared, need, actions }; }
function decisionKey(item = {}) { return item.id || item.action_id || item.title; }
function trayKey(tray = "") { const t = String(tray).toLowerCase(); if (t.includes("money")) return "money"; if (t.includes("booking")) return "bookings"; if (t.includes("staff")) return "staff"; if (t.includes("client")) return "clients"; if (t.includes("quality")) return "quality"; if (t.includes("operation")) return "ops"; return "command"; }
function countDepartments(items = []) { return items.reduce((acc, item) => { acc.command += 1; const key = trayKey(item.tray); acc[key] = (acc[key] || 0) + 1; return acc; }, { command: 0, money: 0, bookings: 0, staff: 0, clients: 0, quality: 0, ops: 0 }); }
