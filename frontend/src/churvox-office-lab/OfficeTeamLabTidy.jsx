import React, { useEffect, useMemo, useState } from "react";
import "./OfficeTeamLabFinal.css";
import "./OfficeTeamLabLive.css";
import "./OfficeTeamLabTidy.css";
import OfficeTeamRoleControls from "./OfficeTeamRoleControls";
import { fetchOfficeTeamSnapshot, makeStatusCards, recordOfficeTeamDecision } from "./officeTeamApi";

const BRAND_ICON = "/churvox-app-icon.svg";
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
  r("Recurring Work", "bookings", "Stops regular work and repeat appointments falling through cracks.", ["last visit", "usual cycle", "next booking"], ["next visit", "recurring schedule", "rebook prompt"], "Create the next booking, contact the client, or park it?"),
  r("Bookkeeper", "money", "Prepares invoice and accounting admin safely.", ["completed work", "price", "extras", "invoice state"], ["invoice draft", "payment reminder", "accounting check"], "Approve the draft, edit it, send later, or park it?"),
  r("Payments Clerk", "money", "Keeps unpaid money moving with owner-approved follow-ups.", ["due date", "reminders", "payment status"], ["polite reminder", "status correction", "follow-up"], "Send the reminder, edit it, mark clear, or park it?"),
  r("Extras Clerk", "money", "Catches extra time, products and materials before money is missed.", ["staff note", "normal price", "client approval"], ["extra line", "staff question", "client approval note"], "Charge, include free, ask staff, or park it?"),
  r("Payroll Clerk", "staff", "Prepares staff hours review for owner approval.", ["timers", "manual time", "rates", "odd shifts"], ["hours review", "timer correction", "staff question"], "Approve hours, edit them, ask staff, or park it?"),
  r("Staff Manager", "staff", "Keeps staff setup, access and follow-through clean.", ["login", "contact", "rate", "acknowledgement"], ["setup checklist", "staff reminder", "reassignment"], "Remind, finish setup, reassign, or park it?"),
  r("Dispatcher", "staff", "Keeps the day assigned and moving.", ["today", "tomorrow", "staff load", "locations"], ["run sheet", "reschedule option", "late message"], "Approve the run sheet, move work, reassign, or park it?"),
  r("Inbox Triage", "clients", "Sorts messages and sends them to the right office role.", ["sender", "intent", "record link", "urgency"], ["category", "reply draft", "handoff"], "Reply, create an action, assign, or park it?"),
  r("Client Onboarding", "clients", "Makes new client records usable before work starts.", ["contact", "service need", "location", "preferences"], ["clean client file", "missing-information request", "welcome reply"], "Ask for information, add it manually, continue, or park it?"),
  r("Client Memory", "clients", "Turns small details into useful client memory.", ["existing notes", "service history", "messages"], ["preference note", "access note", "next-service reminder"], "Save, edit, ignore, or park it?"),
  r("Client Care", "clients", "Protects relationships and keeps customers replied to.", ["waiting replies", "complaints", "recent work"], ["reply draft", "check-in", "issue follow-up"], "Send, edit, ask staff, or park it?"),
  r("Review Clerk", "clients", "Finds appropriate moments to ask happy clients for reviews.", ["repeat client", "paid", "complaint status", "last request"], ["review request", "do-not-ask warning"], "Ask, edit, ask later, or park it?"),
  r("Admin Operator", "quality", "Keeps work, clients, invoices and notes tidy.", ["status", "staff", "price", "linked invoice"], ["record cleanup", "status fix", "missing-field task"], "Fix, update, link, or park it?"),
  r("Quality Checker", "quality", "Checks work is safe to complete, invoice and remember.", ["completion evidence", "notes", "extras", "complaint risk"], ["quality flag", "staff question", "invoice safety"], "Complete, ask staff, attach evidence, or park it?"),
  r("Record Keeper", "quality", "Keeps evidence and approvals attached to the right records.", ["approval source", "message thread", "record link"], ["attached evidence", "record correction", "dispute summary"], "Attach, ask, update, or park it?"),
  r("Capacity Planner", "ops", "Finds overloaded, quiet and unbalanced days.", ["bookings", "staff load", "gaps", "future demand"], ["capacity warning", "move suggestion", "quiet-day opportunity"], "Move work, leave it, open space, or park it?"),
  r("Stock Clerk", "ops", "Tracks products, parts and supplies used by work.", ["product", "quantity", "stock level", "invoice line"], ["low-stock alert", "product note", "reorder reminder"], "Mark low, add, save, or ignore it?"),
  r("Profit Checker", "ops", "Finds underpriced work before it quietly hurts the business.", ["price", "hours", "materials", "normal duration"], ["margin warning", "price review", "quote warning"], "Review the price, keep it, add an extra, or park it?"),
  r("Operations Manager", "ops", "Finds repeated business problems and suggests better rules.", ["recent patterns", "repeated issues", "money impact", "process gap"], ["pattern report", "suggested rule", "process improvement"], "Apply the rule, review it, remind staff, or park it?"),
];

const playbooks = [
  ["General Service", "work", "staff", "client"],
  ["Hair / Beauty", "appointment", "stylist", "client"],
  ["Barber", "appointment", "barber", "client"],
  ["Nails", "appointment", "nail tech", "client"],
  ["Cleaning", "visit", "cleaner", "customer"],
  ["Trades / Maintenance", "job", "worker", "client"],
];

const controlRules = [
  "Churvox prepares the admin and recommendation.",
  "The owner can approve, edit, ask for more information or park the decision.",
  "Nothing sends, syncs, charges, changes records, files tax or pays anyone without approval.",
  "Every decision stays linked to the work and information used to prepare it.",
  "When information is missing, Churvox says what is missing instead of guessing.",
];

export default function OfficeTeamLabTidy() {
  const [activeDepartment, setActiveDepartment] = useState("command");
  const [activeRoleName, setActiveRoleName] = useState("Office Manager");
  const [activePlaybook, setActivePlaybook] = useState(playbooks[0]);
  const [snapshot, setSnapshot] = useState({ source: "ready", decisions: [], counts: null });
  const [notice, setNotice] = useState("Churvox is checking the business records and preparing only the decisions that need you.");
  const [resolved, setResolved] = useState({});

  useEffect(() => {
    let mounted = true;
    fetchOfficeTeamSnapshot()
      .then((data) => {
        if (!mounted) return;
        setSnapshot(data || { source: "ready", decisions: [], counts: null });
        setResolved({});
        if (data?.source === "admin-brain") setNotice("The latest owner decisions are ready. Approval is still required before anything changes.");
        else if (data?.source === "clear-live") setNotice("Churvox checked the current records. Nothing needs your decision right now.");
        else setNotice("Churvox is ready. Decisions will appear when the business records need owner attention.");
      })
      .catch((error) => mounted && setNotice(`The business check could not finish: ${error.message || "connection issue"}. Nothing was changed.`));
    return () => { mounted = false; };
  }, []);

  const decisions = Array.isArray(snapshot.decisions) ? snapshot.decisions : [];
  const pendingDecisions = useMemo(() => decisions.filter((item) => !resolved[decisionKey(item)]), [decisions, resolved]);
  const counts = useMemo(() => countDepartments(pendingDecisions), [pendingDecisions]);
  const trayQueue = useMemo(() => activeDepartment === "command" ? pendingDecisions : pendingDecisions.filter((item) => trayKey(item.tray) === activeDepartment), [activeDepartment, pendingDecisions]);
  const boardDecisions = useMemo(() => trayQueue.slice(0, COMMAND_CARD_LIMIT), [trayQueue]);
  const waitingCount = Math.max(0, trayQueue.length - boardDecisions.length);
  const visibleRoles = useMemo(() => roles.filter((item) => item.dept === activeDepartment || (activeDepartment === "command" && item.dept === "command")), [activeDepartment]);
  const activeRole = roles.find((item) => item.name === activeRoleName) || visibleRoles[0] || roles[0];
  const activityRows = pendingDecisions.slice(0, 4).map((item) => [item.roleName || item.tray, `${item.title} waiting in Command.`, "Waiting"]);
  const statusCounts = { total: pendingDecisions.length, high: pendingDecisions.filter((item) => item.level === "Top priority").length, parked: Object.keys(resolved).length };
  const metrics = makeStatusCards(statusCounts, pendingDecisions.length);
  const sourceLabel = snapshot.source === "admin-brain" ? "Connected" : snapshot.source === "clear-live" ? "Nothing waiting" : "Ready";

  function chooseDepartment(key) {
    setActiveDepartment(key);
    const first = roles.find((item) => item.dept === key) || roles[0];
    setActiveRoleName(first.name);
  }

  async function handleDecision(item, action) {
    const id = decisionKey(item);
    setResolved((current) => ({ ...current, [id]: action }));
    setNotice(`${action} recorded. The next waiting decision is now shown. Nothing was sent or synced.`);
    try {
      const result = await recordOfficeTeamDecision(item, action);
      setNotice(result?.localOnly ? `${action} saved in this workspace. Nothing was sent or synced.` : `${action} recorded safely. Nothing was sent or synced.`);
    } catch (error) {
      setResolved((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setNotice(`Could not record ${action}: ${error.message || "try again"}. The decision was returned to Command. Nothing was sent or synced.`);
    }
  }

  return (
    <main className="cvOfficeFinal cvOfficeTidy">
      <Topbar />
      <StatusBar metrics={metrics} sourceLabel={sourceLabel} notice={notice} />

      <section className="cvOfficeGrid cvTidyGrid" id="command">
        <section className="cvCommandPanel cvTidyCommand">
          <PanelHeader eyebrow="Needs owner now" title="Command Queue" text={`Showing ${COMMAND_CARD_LIMIT} at a time. Completed decisions leave Command and the next waiting decision replaces them.`} />
          <DepartmentRail active={activeDepartment} counts={counts} onChoose={chooseDepartment} />
          <QueueSummary shown={boardDecisions.length} total={trayQueue.length} waiting={waitingCount} activeDepartment={activeDepartment} />
          <div className="cvDecisionBoard cvTidyDecisionBoard">
            {boardDecisions.length ? boardDecisions.map((item) => <DecisionCard key={decisionKey(item)} item={item} onAction={handleDecision} />) : <EmptyTray />}
          </div>
        </section>

        <aside className="cvRightRail cvTidyRail">
          <PlaybookCard activePlaybook={activePlaybook} onPick={setActivePlaybook} />
          <OfficeTeamRoleControls roles={roles} />
          <ActivityCard rows={activityRows} />
        </aside>
      </section>

      <section className="cvTeamWorkbench cvTidyWorkbench" id="team">
        <PanelHeader eyebrow="Office team" title="Roles behind the desk" text="Each office role checks records, prepares admin and sends one clean decision into Command." />
        <div className="cvTeamLayout">
          <aside className="cvRoleList">{visibleRoles.map((item) => <button key={item.name} className={activeRole.name === item.name ? "active" : ""} onClick={() => setActiveRoleName(item.name)}><strong>{item.name}</strong><span>{item.summary}</span></button>)}</aside>
          <RoleDetail role={activeRole} />
        </div>
      </section>

      <section className="cvBuildMap cvTidyBuild" id="owner-controls">
        <PanelHeader eyebrow="Owner controls" title="How every decision works" text="These rules apply throughout Churvox." />
        <ol>{controlRules.map((item) => <li key={item}>{item}</li>)}</ol>
      </section>
    </main>
  );
}

function Topbar() {
  return <header className="cvOfficeTopbar"><div className="cvOfficeBrand"><img src={BRAND_ICON} alt="Churvox" /><div><strong>Churvox Office Team</strong><span>Command desk · owner approval required</span></div></div><nav><a href="#command">Command</a><a href="#team">Office Team</a><a href="#playbooks">Playbooks</a><a href="#owner-controls">Owner controls</a></nav></header>;
}

function StatusBar({ metrics, sourceLabel, notice }) {
  return <section className="cvOfficeStatus cvTidyStatus"><div className="cvOfficeStatusLead"><span>Office status · {sourceLabel}</span><h1>Churvox runs the office. The owner approves the decisions.</h1><p>Staff update the work. The office team checks what is missing, prepares the admin and brings the decision back to Command.</p><small className="cvOfficeNotice">{notice}</small></div>{metrics.map((item) => <Metric key={item.label} {...item} />)}</section>;
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
  return <section className="cvActivityCard"><PanelHeader eyebrow="Office activity" title="Prepared work" />{rows.length ? <ul>{rows.map(([who, text, time]) => <li key={`${who}-${time}-${text}`}><strong>{who}</strong><p>{text}</p><small>{time}</small></li>)}</ul> : <p className="cvOfficeNotice">No prepared office activity is waiting.</p>}</section>;
}

function RoleDetail({ role }) {
  return <article className="cvRoleDetail"><div className="cvRoleHero"><span>{role.dept}</span><h3>{role.name}</h3><p>{role.summary}</p></div><div className="cvRoleColumns"><RoleBlock title="Checks" items={role.checks} /><RoleBlock title="Prepares" items={role.prepares} /><section><h4>Owner question</h4><p>{role.ownerAsk}</p></section></div></article>;
}

function EmptyTray() {
  return <article className="cvEmptyTray"><strong>No decisions in this tray</strong><p>Anything important will appear here before anything is sent, synced or changed.</p><button type="button">Owner approval required</button></article>;
}

function DecisionCard({ item, onAction }) {
  return <article className="cvDecisionCard"><div className="cvDecisionMeta"><span>{item.level}</span><em>{item.tray}</em></div><h3>{item.title}</h3><p>{item.happened}</p><dl><dt>Checked</dt><dd>{(item.checked || []).map((value) => <span key={value}>{value}</span>)}</dd><dt>Prepared</dt><dd>{item.prepared}</dd><dt>Owner decision</dt><dd>{item.need}</dd></dl><div className="cvDecisionActions">{(item.actions || []).map((action, index) => <button key={action} onClick={() => onAction(item, action)} className={index === 0 ? "primary" : ""}>{action}</button>)}</div><small>Owner approval required · leaves Command after action · nothing sends automatically</small></article>;
}

function PanelHeader({ eyebrow, title, text }) { return <div className="cvPanelHeader"><div><span>{eyebrow}</span><h2>{title}</h2></div>{text && <p>{text}</p>}</div>; }
function Metric({ value, label, note }) { return <article><strong>{value}</strong><span>{label}</span><small>{note}</small></article>; }
function RoleBlock({ title, items }) { return <section><h4>{title}</h4><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>; }
function r(name, dept, summary, checks, prepares, ownerAsk) { return { name, dept, summary, checks, prepares, ownerAsk }; }
function decisionKey(item = {}) { return item.id || item.action_id || item.title; }
function trayKey(tray = "") { const value = String(tray).toLowerCase(); if (value.includes("money")) return "money"; if (value.includes("booking")) return "bookings"; if (value.includes("staff")) return "staff"; if (value.includes("client")) return "clients"; if (value.includes("quality")) return "quality"; if (value.includes("operation")) return "ops"; return "command"; }
function countDepartments(items = []) { return items.reduce((counts, item) => { counts.command += 1; const key = trayKey(item.tray); counts[key] = (counts[key] || 0) + 1; return counts; }, { command: 0, money: 0, bookings: 0, staff: 0, clients: 0, quality: 0, ops: 0 }); }
