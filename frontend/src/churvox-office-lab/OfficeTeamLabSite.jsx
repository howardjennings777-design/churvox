import React, { useEffect, useMemo, useState } from "react";
import "./OfficeTeamLabFinal.css";
import "./OfficeTeamLabLive.css";
import "./OfficeTeamLabSite.css";
import "./OfficeTeamLabSitePlus.css";
import "./OfficeTeamNavPolish.css";
import OfficeTeamRoleControls from "./OfficeTeamRoleControls";
import OfficeTeamSiteSettings from "./OfficeTeamSiteSettings";
import OfficeTeamPlansScreen from "./OfficeTeamPlansScreen";
import { WorkScreen, MoneyScreen, ClientsScreen, StaffScreen } from "./OfficeTeamOperationalScreens";
import { QuotesScreen, InvoicesScreen, IntegrationsScreen, HelpScreen } from "./OfficeTeamExtraScreens";
import { MessagesScreen, WorkerViewScreen } from "./OfficeTeamCommunicationScreens";
import { ScheduleScreen, AutomationScreen, PayrollScreen, BrandingScreen } from "./OfficeTeamBackOfficeScreens";
import { fetchOfficeTeamSnapshot, makeStatusCards, recordOfficeTeamDecision } from "./officeTeamApi";

const BRAND_ICON = "/churvox-app-icon.svg?v=churvox-office-site-20260709";
const COMMAND_CARD_LIMIT = 3;
const screens = [["today", "Today"], ["command", "Command"], ["work", "Work"], ["schedule", "Schedule"], ["clients", "Clients"], ["messages", "Messages"], ["worker", "Worker View"], ["quotes", "Quotes"], ["invoices", "Invoices"], ["money", "Money"], ["staff", "Staff"], ["payroll", "Payroll"], ["team", "Office Team"], ["playbooks", "Playbooks"], ["integrations", "Integrations"], ["activity", "Activity"], ["automation", "Automation"], ["branding", "Branding"], ["settings", "Settings"], ["plans", "Plans"], ["help", "Help"], ["safety", "Safety"]];
const departments = [["command", "All"], ["money", "Money"], ["bookings", "Bookings"], ["staff", "Staff"], ["clients", "Clients"], ["quality", "Quality"], ["ops", "Ops"]];

const roles = [
  r("Office Manager", "command", "Ranks the day and keeps the owner focused.", ["all decisions", "risk", "money impact"], ["daily briefing", "priority order", "owner queue"], "Review the top decisions or open a tray?"),
  r("Receptionist", "bookings", "Handles bookings, moves, reminders and cancellations.", ["date", "staff", "double booking"], ["booking draft", "reminder", "rebook message"], "Create, move, rebook or park?"),
  r("Bookkeeper", "money", "Prepares invoice and account admin safely.", ["completed work", "price", "extras"], ["invoice draft", "reminder", "accounting check"], "Approve draft, edit, send later or park?"),
  r("Payroll Clerk", "staff", "Prepares staff hours review for owner approval.", ["timers", "manual time", "odd shifts"], ["hours review", "timer correction"], "Approve hours, edit, ask staff or park?"),
  r("Client Memory", "clients", "Turns small details into useful client memory.", ["existing notes", "history", "messages"], ["preference note", "access note", "next-service reminder"], "Save, edit, ignore or park?"),
  r("Quality Checker", "quality", "Checks work is safe to complete, invoice and remember.", ["proof", "notes", "extras"], ["quality flag", "ask-staff prompt"], "Complete, ask staff, attach proof or park?"),
  r("Operations Manager", "ops", "Finds repeated business problems and suggests better rules.", ["patterns", "repeat issues", "process gaps"], ["pattern report", "suggested rule"], "Apply rule, review examples or park?"),
];

const demoDecisions = [
  d("demo-1", "Money", "Bookkeeper", "Top priority", "Completed service has extra decision", "Staff noted extra green waste after completion.", ["completed", "staff note", "invoice not sent"], "Draft is ready and the extra line is held for owner review.", "Charge extra, include free or ask staff first?", ["Add charge", "Include free", "Ask staff", "Park"]),
  d("demo-2", "Bookings", "Receptionist", "Next", "Regular client has no next booking", "A repeat client usually books every 3 weeks but has no next appointment.", ["last visit", "usual cycle", "calendar space"], "Rebooking message and suggested date are ready.", "Send rebooking message or create booking now?", ["Send", "Book", "Edit date", "Park"]),
  d("demo-3", "Staff", "Payroll Clerk", "Needs check", "Hours review has one odd timer", "One timer is much longer than usual.", ["period", "timers", "manual time"], "Hours review is ready and the odd timer is flagged.", "Approve, edit timer or ask staff?", ["Approve", "Edit", "Ask staff", "Park"]),
  d("demo-4", "Clients", "Client Memory", "Low risk", "Service note should become client memory", "A service note includes useful preference details.", ["existing notes", "latest service", "duplicates"], "Client memory update is ready.", "Save this to client memory?", ["Save", "Edit", "Ignore"]),
  d("demo-5", "Quality", "Quality Checker", "Parkable", "Completed work is missing proof", "A completed work record is missing its final proof note.", ["complete", "proof missing", "not sent"], "Ask-staff prompt is ready.", "Ask staff for proof or complete anyway?", ["Ask staff", "Complete", "Park"]),
  d("demo-6", "Operations", "Operations Manager", "Pattern", "Repeat work may need a rule", "A repeated issue has shown up more than once this month.", ["pattern", "repeat", "process gap"], "A process rule suggestion is ready.", "Review the rule or leave it?", ["Review rule", "Leave", "Park"]),
];

const playbooks = [
  ["General Service", "work", "staff", "client", "service / booking / visit / job"],
  ["Hair / Beauty", "appointment", "stylist", "client", "colour note / rebook / deposit"],
  ["Barber", "appointment", "barber", "client", "cut preference / regular cycle"],
  ["Nails", "appointment", "nail tech", "client", "shape / colour / repair"],
  ["Cleaning", "visit", "cleaner", "customer", "access note / recurring run"],
  ["Trades", "job", "worker", "client", "materials / proof / invoice"],
];

const rules = ["Owner approval comes first.", "No auto-send from the lab.", "No auto-sync from the lab.", "No money changes from the lab.", "Failed action recording returns the card to Command.", "Public pages stay untouched until this hidden build feels right."];

export default function OfficeTeamLabSite() {
  const [screen, setScreen] = useState(() => cleanScreen(window.location.hash));
  const [tray, setTray] = useState("command");
  const [activeRole, setActiveRole] = useState("Office Manager");
  const [snapshot, setSnapshot] = useState({ source: "demo", decisions: [], counts: null });
  const [notice, setNotice] = useState("Demo preview. Sign in as an owner to load live Admin Brain decisions.");
  const [resolved, setResolved] = useState({});

  useEffect(() => {
    let mounted = true;
    fetchOfficeTeamSnapshot().then((data) => {
      if (!mounted) return;
      setSnapshot(data || { source: "demo", decisions: [], counts: null });
      setResolved({});
      if (data?.source === "admin-brain") setNotice("Live Admin Brain scan loaded. Owner approval still required.");
      else if (data?.source === "clear-live") setNotice("Live scan is clear. Demo cards stay visible for review.");
    }).catch((err) => mounted && setNotice(`Demo preview. Live scan unavailable: ${err.message || "connection issue"}`));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    function onPop() {
      setScreen(cleanScreen(window.location.hash));
      window.scrollTo({ top: 0 });
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const decisions = snapshot.decisions?.length ? snapshot.decisions : demoDecisions;
  const pending = useMemo(() => decisions.filter((item) => !resolved[keyOf(item)]), [decisions, resolved]);
  const counts = useMemo(() => countDepartments(pending), [pending]);
  const metrics = makeStatusCards({ total: pending.length, high: pending.filter((item) => item.level === "Top priority").length, parked: Object.keys(resolved).length }, pending.length);
  const sourceLabel = snapshot.source === "admin-brain" ? "Live Admin Brain" : snapshot.source === "clear-live" ? "Live clear" : "Demo mode";

  function go(next) {
    setScreen(next);
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#${next}`);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function actionDecision(item, action) {
    const id = keyOf(item);
    setResolved((current) => ({ ...current, [id]: action }));
    setNotice(`${action} moved out of Command. The next waiting decision replaces it.`);
    try {
      await recordOfficeTeamDecision(item, action);
      setNotice(`${action} recorded safely. Nothing was sent or synced.`);
    } catch (err) {
      setResolved((current) => {
        const copy = { ...current };
        delete copy[id];
        return copy;
      });
      setNotice(`Could not record ${action}. The card returned to Command. Nothing was sent or synced.`);
    }
  }

  return <main className="cvOfficeFinal cvOfficeSite"><Topbar screen={screen} go={go} /><Status metrics={metrics} sourceLabel={sourceLabel} notice={notice} /><div className="cvSiteScreenDeck">{screen === "today" && <Today metrics={metrics} pending={pending} resolved={resolved} go={go} />}{screen === "command" && <Command tray={tray} setTray={setTray} counts={counts} decisions={pending} onAction={actionDecision} />}{screen === "work" && <WorkScreen />}{screen === "schedule" && <ScheduleScreen />}{screen === "clients" && <ClientsScreen />}{screen === "messages" && <MessagesScreen />}{screen === "worker" && <WorkerViewScreen />}{screen === "quotes" && <QuotesScreen />}{screen === "invoices" && <InvoicesScreen />}{screen === "money" && <MoneyScreen />}{screen === "staff" && <StaffScreen />}{screen === "payroll" && <PayrollScreen />}{screen === "team" && <Team roles={roles} activeRole={activeRole} setActiveRole={setActiveRole} />}{screen === "playbooks" && <Playbooks />}{screen === "integrations" && <IntegrationsScreen />}{screen === "activity" && <Activity pending={pending} resolved={resolved} />}{screen === "automation" && <AutomationScreen />}{screen === "branding" && <BrandingScreen />}{screen === "settings" && <OfficeTeamSiteSettings />}{screen === "plans" && <OfficeTeamPlansScreen />}{screen === "help" && <HelpScreen />}{screen === "safety" && <Safety />}</div></main>;
}

function Topbar({ screen, go }) { return <header className="cvSiteTopbar"><div className="cvOfficeBrand"><img src={BRAND_ICON} alt="Churvox" /><div><strong>Churvox Office Team</strong><span>Hidden internal website · owner approval locked</span></div></div><nav>{screens.map(([key, label]) => <button key={key} className={screen === key ? "active" : ""} onClick={() => go(key)}>{label}</button>)}</nav></header>; }
function Status({ metrics, sourceLabel, notice }) { return <section className="cvSiteStatus"><div className="cvSiteStatusLead"><span>Office running · {sourceLabel}</span><h1>Churvox runs the office. The owner approves the decisions.</h1><p>Staff update the work. The office team checks what is missing, prepares the admin and brings decisions back to Command.</p><small>{notice}</small></div>{metrics.map((m) => <article key={m.label}><strong>{m.value}</strong><span>{m.label}</span><small>{m.note}</small></article>)}</section>; }
function Today({ metrics, pending, resolved, go }) { const top = pending.slice(0, 3); return <section className="cvSiteScreen"><Header eyebrow="Today" title="Your office team has checked the business" text="Start here. The owner sees what matters, opens Command when a decision is needed, and leaves the rest with the office team." /><div className="cvSiteTodayGrid"><article className="cvSiteBriefing"><span>Daily briefing</span><h2>{pending.length ? `${pending.length} decisions are prepared. ${top.length} are ready first.` : "No urgent decisions waiting right now."}</h2><p>Churvox is shaped like an office team: staff update the work, the mimics check the records, and Command asks the owner only when a decision is needed.</p><div className="cvSiteBriefingActions"><button className="primary" onClick={() => go("command")}>Open Command</button><button onClick={() => go("work")}>Work</button><button onClick={() => go("schedule")}>Schedule</button><button onClick={() => go("messages")}>Messages</button><button onClick={() => go("worker")}>Worker View</button><button onClick={() => go("quotes")}>Quotes</button><button onClick={() => go("invoices")}>Invoices</button><button onClick={() => go("money")}>Money</button><button onClick={() => go("clients")}>Clients</button><button onClick={() => go("staff")}>Staff</button><button onClick={() => go("payroll")}>Payroll</button><button onClick={() => go("automation")}>Automation</button><button onClick={() => go("branding")}>Branding</button><button onClick={() => go("plans")}>Plans</button><button onClick={() => go("integrations")}>Integrations</button></div></article><div className="cvSiteTodayStack"><article className="cvSiteTodayPanel"><span>Next decisions</span><strong>{metrics[1]?.value || 0} need owner</strong><p>Command only shows the next few, then replaces each card after action.</p><div className="cvSiteMiniList">{top.map((item) => <article key={keyOf(item)}><b>{item.title}</b><small>{item.tray} · {item.roleName}</small></article>)}</div></article><article className="cvSiteActionPanel"><span>Safety lock</span><strong>Nothing auto-sent</strong><p>No send, sync, charge, payout, tax or record change happens from this lab without owner approval.</p><button onClick={() => go("safety")}>View safety rules</button></article><article className="cvSiteActionPanel"><span>Cleared</span><strong>{Object.keys(resolved).length} this session</strong><p>Actioned decisions leave Command and move into activity history.</p></article></div></div></section>; }
function Command({ tray, setTray, counts, decisions, onAction }) { const queue = tray === "command" ? decisions : decisions.filter((item) => trayKey(item.tray) === tray); const shown = queue.slice(0, COMMAND_CARD_LIMIT); const waiting = Math.max(0, queue.length - shown.length); return <section className="cvSiteScreen"><Header eyebrow="Command" title="Owner decision queue" text="Only the next few decisions show. Once one is actioned, it leaves Command and the next waiting item replaces it." /><div className="cvSiteTrayRail">{departments.map(([key, label]) => <button key={key} className={tray === key ? "active" : ""} onClick={() => setTray(key)}><strong>{counts[key] || 0}</strong><span>{label}</span></button>)}</div><div className="cvSiteQueueSummary"><strong>{shown.length} showing</strong><span>{queue.length} waiting</span><em>{waiting ? `${waiting} behind this set` : "queue clear after this set"}</em></div><div className="cvSiteDecisionGrid">{shown.length ? shown.map((item) => <Decision key={keyOf(item)} item={item} onAction={onAction} />) : <Empty title="No decisions in this tray" text="Anything important will appear here before anything is sent, synced or changed." />}</div></section>; }
function Team({ roles, activeRole, setActiveRole }) { const role = roles.find((item) => item.name === activeRole) || roles[0]; return <section className="cvSiteScreen"><Header eyebrow="Office Team" title="Roles behind the desk" text="Each mimic checks records, prepares admin and sends one clean decision into Command." /><div className="cvSiteTeamLayout"><aside className="cvSiteRoleList">{roles.map((item) => <button key={item.name} className={role.name === item.name ? "active" : ""} onClick={() => setActiveRole(item.name)}><strong>{item.name}</strong><span>{item.summary}</span></button>)}</aside><article className="cvSiteRoleDetail"><span>{role.dept}</span><h2>{role.name}</h2><p>{role.summary}</p><div className="cvSiteRoleColumns"><Info title="Checks" items={role.checks} /><Info title="Prepares" items={role.prepares} /><section><h3>Owner question</h3><p>{role.ownerAsk}</p></section></div></article><OfficeTeamRoleControls roles={roles} /></div></section>; }
function Playbooks() { return <section className="cvSiteScreen"><Header eyebrow="Playbooks" title="Same system, different business wording" text="Churvox should fit the business language instead of forcing every business to sound the same." /><div className="cvSitePlaybookGrid">{playbooks.map(([name, work, staff, customer, examples]) => <article key={name}><span>{name}</span><dl><div><dt>Work</dt><dd>{work}</dd></div><div><dt>Staff</dt><dd>{staff}</dd></div><div><dt>Customer</dt><dd>{customer}</dd></div></dl><small>{examples}</small></article>)}</div></section>; }
function Activity({ pending, resolved }) { const cleared = Object.entries(resolved); return <section className="cvSiteScreen"><Header eyebrow="Activity" title="Office activity log" text="This becomes the real log of checked, prepared, parked and approved work." /><div className="cvSiteActivityLayout"><section><h2>Waiting now</h2>{pending.slice(0, 8).map((item) => <article key={keyOf(item)}><strong>{item.roleName || item.tray}</strong><p>{item.title} waiting in Command.</p><small>{item.tray}</small></article>)}</section><section><h2>Cleared this session</h2>{cleared.length ? cleared.map(([id, action]) => <article key={id}><strong>{action}</strong><p>Moved out of Command.</p><small>{id}</small></article>) : <Empty title="Nothing cleared yet" text="Action a Command card and it will appear here." />}</section></div></section>; }
function Safety() { return <section className="cvSiteScreen"><Header eyebrow="Safety" title="Rules before this moves into the real app" text="Owner approval first. Safe recording second. Public site untouched until ready." /><div className="cvSiteSafetyGrid">{rules.map((rule, index) => <article key={rule}><strong>{index + 1}</strong><p>{rule}</p></article>)}</div><div className="cvSiteBuildSteps"><span>Finish path</span><strong>How this becomes the real owner app</strong><p>This keeps the hidden site moving toward the real product without breaking public pages.</p><ol><li>Use Today as the owner starting screen.</li><li>Move Command queue into the real owner app.</li><li>Connect role modes to real settings.</li><li>Connect playbook wording to business type.</li><li>Replace demo activity with mimic logs.</li><li>Polish public marketing around this story.</li></ol></div></section>; }
function Header({ eyebrow, title, text }) { return <header className="cvSiteScreenHeader"><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></header>; }
function Decision({ item, onAction }) { return <article className="cvSiteDecisionCard"><div><span>{item.level}</span><em>{item.tray}</em></div><h3>{item.title}</h3><p>{item.happened}</p><dl><dt>Checked</dt><dd>{(item.checked || []).map((x) => <small key={x}>{x}</small>)}</dd><dt>Prepared</dt><dd>{item.prepared}</dd><dt>Owner decision</dt><dd>{item.need}</dd></dl><footer>{(item.actions || []).map((action, i) => <button key={action} className={i === 0 ? "primary" : ""} onClick={() => onAction(item, action)}>{action}</button>)}</footer><small>Approval locked · leaves Command after action</small></article>; }
function Info({ title, items }) { return <section><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>; }
function Empty({ title, text }) { return <article className="cvSiteEmpty"><strong>{title}</strong><p>{text}</p></article>; }
function r(name, dept, summary, checks, prepares, ownerAsk) { return { name, dept, summary, checks, prepares, ownerAsk }; }
function d(id, tray, roleName, level, title, happened, checked, prepared, need, actions) { return { id, tray, roleName, level, title, happened, checked, prepared, need, actions }; }
function keyOf(item = {}) { return item.id || item.action_id || item.title; }
function trayKey(tray = "") { const t = String(tray).toLowerCase(); if (t.includes("money")) return "money"; if (t.includes("booking")) return "bookings"; if (t.includes("staff")) return "staff"; if (t.includes("client")) return "clients"; if (t.includes("quality")) return "quality"; if (t.includes("operation")) return "ops"; return "command"; }
function countDepartments(items = []) { return items.reduce((acc, item) => { acc.command += 1; const key = trayKey(item.tray); acc[key] = (acc[key] || 0) + 1; return acc; }, { command: 0, money: 0, bookings: 0, staff: 0, clients: 0, quality: 0, ops: 0 }); }
function cleanScreen(hash = "") { const key = String(hash || "").replace(/^#/, ""); return screens.some(([id]) => id === key) ? key : "today"; }
