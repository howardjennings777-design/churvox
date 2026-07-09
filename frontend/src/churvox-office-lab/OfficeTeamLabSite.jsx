import React, { useEffect, useMemo, useState } from "react";
import "./OfficeTeamLabFinal.css";
import "./OfficeTeamLabLive.css";
import "./OfficeTeamLabSite.css";
import "./OfficeTeamLabSitePlus.css";
import "./OfficeTeamNavPolish.css";
import OfficeTeamRoleControls from "./OfficeTeamRoleControls";
import OfficeTeamSiteSettings from "./OfficeTeamSiteSettings";
import OfficeTeamPlansScreen from "./OfficeTeamPlansScreen";
import OfficeTeamReadinessScreen from "./OfficeTeamReadinessScreen";
import OfficeTeamTodayScreen from "./OfficeTeamTodayScreen";
import { WorkScreen, MoneyScreen, ClientsScreen, StaffScreen } from "./OfficeTeamOperationalScreens";
import { QuotesScreen, InvoicesScreen, IntegrationsScreen, HelpScreen } from "./OfficeTeamExtraScreens";
import { MessagesScreen, WorkerViewScreen } from "./OfficeTeamCommunicationScreens";
import { ScheduleScreen, AutomationScreen, PayrollScreen, BrandingScreen } from "./OfficeTeamBackOfficeScreens";
import { fetchOfficeTeamSnapshot, makeStatusCards, recordOfficeTeamDecision } from "./officeTeamApi";
import { fetchOfficeTeamCommandDrafts } from "./OfficeTeamCommandDrafts";
import { readOfficeTeamLocalActivityLog, readOfficeTeamLocalCommandQueue, recordOfficeTeamLocalActivity, removeOfficeTeamLocalCommand, subscribeOfficeTeamLocalActivity, subscribeOfficeTeamLocalCommand } from "./OfficeTeamLocalCommand";
import { readOfficeTeamApprovalTrail, recordOfficeTeamApprovalTrail, subscribeOfficeTeamApprovalTrail } from "./OfficeTeamApprovalTrail";

const BRAND_ICON = "/churvox-app-icon.svg?v=churvox-office-site-20260709";
const COMMAND_CARD_LIMIT = 3;

const screens = [
  ["today", "Today"], ["command", "Command"], ["work", "Work"], ["schedule", "Schedule"], ["clients", "Clients"],
  ["messages", "Messages"], ["worker", "Worker View"], ["quotes", "Quotes"], ["invoices", "Invoices"], ["money", "Money"],
  ["staff", "Staff"], ["payroll", "Payroll"], ["team", "Office Team"], ["playbooks", "Playbooks"], ["integrations", "Integrations"],
  ["activity", "Activity"], ["automation", "Automation"], ["branding", "Branding"], ["settings", "Settings"], ["plans", "Plans"],
  ["help", "Help"], ["readiness", "Readiness"], ["safety", "Safety"],
];

const screenAliases = {
  "": "today",
  dashboard: "today",
  home: "today",
  hub: "today",
  "smart-hub": "today",
  cockpit: "command",
  command: "command",
  "command-board": "command",
  jobs: "work",
  job: "work",
  work: "work",
  recurring: "work",
  calendar: "schedule",
  schedule: "schedule",
  clients: "clients",
  customers: "clients",
  messages: "messages",
  inbox: "messages",
  workers: "worker",
  worker: "worker",
  dispatch: "worker",
  quotes: "quotes",
  invoices: "invoices",
  reports: "invoices",
  money: "money",
  accounting: "money",
  xero: "integrations",
  staff: "staff",
  payroll: "payroll",
  "office-team": "team",
  playbooks: "playbooks",
  integrations: "integrations",
  activity: "activity",
  automation: "automation",
  branding: "branding",
  settings: "settings",
  plans: "plans",
  billing: "plans",
  support: "help",
  help: "help",
  readiness: "readiness",
  safety: "safety",
};

const departments = [["command", "All"], ["money", "Money"], ["bookings", "Bookings"], ["staff", "Staff"], ["clients", "Clients"], ["quality", "Quality"], ["ops", "Ops"]];

const roles = [
  role("Office Manager", "command", "Ranks the day and keeps the owner focused.", ["all decisions", "risk", "priority"], ["daily briefing", "owner queue"], "Review the top decisions or open a tray?"),
  role("Receptionist", "bookings", "Prepares bookings, moves, reminders and rebooks.", ["date", "staff", "calendar"], ["booking draft", "rebook message"], "Create, move, rebook or park?"),
  role("Bookkeeper", "money", "Prepares invoice and accounting admin safely.", ["completed work", "price", "extras"], ["invoice draft", "accounting check"], "Approve draft, edit or park?"),
  role("Payroll Clerk", "staff", "Prepares hours review for owner approval.", ["timers", "manual time", "odd shifts"], ["hours review", "timer correction"], "Approve hours, edit or ask staff?"),
  role("Client Memory", "clients", "Turns useful details into client memory.", ["notes", "history", "messages"], ["preference note", "access note"], "Save, edit or ignore?"),
  role("Quality Checker", "quality", "Checks work is ready before completion or invoice.", ["proof", "notes", "extras"], ["quality flag", "ask-staff prompt"], "Complete, ask staff or attach proof?"),
  role("Operations Manager", "ops", "Finds repeated problems and better rules.", ["patterns", "repeat issues"], ["pattern report", "rule suggestion"], "Apply rule, review or park?"),
];

const demoDecisions = [
  decision("demo-1", "Money", "Bookkeeper", "Top priority", "Completed service has extra decision", "Staff noted extra green waste after completion.", ["completed", "staff note", "not sent"], "Draft is ready and the extra line is held for review.", "Charge extra, include free or ask staff first?", ["Add charge", "Include free", "Ask staff", "Park"]),
  decision("demo-2", "Bookings", "Receptionist", "Next", "Regular client has no next booking", "A repeat client usually books every 3 weeks but has no next appointment.", ["last visit", "usual cycle", "space found"], "Rebooking message and suggested date are ready.", "Send rebooking message or create booking now?", ["Send", "Book", "Edit date", "Park"]),
  decision("demo-3", "Staff", "Payroll Clerk", "Needs check", "Hours review has one odd timer", "One timer is much longer than usual.", ["period", "timers", "manual time"], "Hours review is ready and the odd timer is flagged.", "Approve, edit timer or ask staff?", ["Approve", "Edit", "Ask staff", "Park"]),
  decision("demo-4", "Clients", "Client Memory", "Low risk", "Service note should become client memory", "A service note includes useful preference details.", ["notes", "service", "duplicates"], "Client memory update is ready.", "Save this to client memory?", ["Save", "Edit", "Ignore"]),
  decision("demo-5", "Quality", "Quality Checker", "Parkable", "Completed work is missing proof", "A completed work record is missing its final proof note.", ["complete", "proof missing"], "Ask-staff prompt is ready.", "Ask staff for proof or complete anyway?", ["Ask staff", "Complete", "Park"]),
  decision("demo-6", "Operations", "Operations Manager", "Pattern", "Repeat work may need a rule", "A repeated issue has shown up more than once this month.", ["pattern", "repeat", "gap"], "A process rule suggestion is ready.", "Review the rule or leave it?", ["Review rule", "Leave", "Park"]),
];

const playbooks = [
  ["General Service", "work", "staff", "client", "service / booking / visit / job"],
  ["Hair / Beauty", "appointment", "stylist", "client", "colour note / rebook / deposit"],
  ["Barber", "appointment", "barber", "client", "cut preference / regular cycle"],
  ["Nails", "appointment", "nail tech", "client", "shape / colour / repair"],
  ["Cleaning", "visit", "cleaner", "customer", "access note / recurring run"],
  ["Trades", "job", "worker", "client", "materials / proof / invoice"],
];

const safetyRules = ["Owner approval comes first", "Prepared-only preview", "No blind sends or syncs", "Failed records return to Command", "Public pages stay untouched"];

export default function OfficeTeamLabSite({ appMode = "lab" }) {
  const isOwnerApp = appMode === "owner";
  const [screen, setScreen] = useState(() => cleanScreen(window.location.hash));
  const [tray, setTray] = useState("command");
  const [activeRole, setActiveRole] = useState("Office Manager");
  const [snapshot, setSnapshot] = useState({ source: "demo", decisions: [] });
  const [liveDrafts, setLiveDrafts] = useState([]);
  const [localQueue, setLocalQueue] = useState(() => readOfficeTeamLocalCommandQueue());
  const [localActivity, setLocalActivity] = useState(() => readOfficeTeamLocalActivityLog());
  const [approvalTrail, setApprovalTrail] = useState(() => readOfficeTeamApprovalTrail());
  const [notice, setNotice] = useState(isOwnerApp ? "New owner app shell. Office team prepares decisions; owner approval is still locked." : "Demo preview. Sign in as an owner to load live Admin Brain decisions.");
  const [resolved, setResolved] = useState({});

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([fetchOfficeTeamSnapshot(), fetchOfficeTeamCommandDrafts()])
      .then(([scanResult, draftResult]) => {
        if (!mounted) return;
        const data = scanResult.status === "fulfilled" ? scanResult.value : { source: "demo", decisions: [] };
        const drafts = draftResult.status === "fulfilled" && Array.isArray(draftResult.value) ? draftResult.value : [];
        setSnapshot(data || { source: "demo", decisions: [] });
        setLiveDrafts(drafts);
        setResolved({});
        if (data?.source === "admin-brain") setNotice("Live Admin Brain scan loaded. Owner approval still required.");
        else if (drafts.length) setNotice("Live read-only records prepared into Command preview. Nothing has been sent, synced or changed.");
        else if (data?.source === "clear-live") setNotice("Live scan is clear. Demo cards stay visible for review.");
        else setNotice(isOwnerApp ? "Owner app shell loaded. Live scan unavailable, so safe fallback decisions stay visible." : "Demo preview. Sign in as an owner to load live Command data.");
      })
      .catch((err) => mounted && setNotice(`${isOwnerApp ? "Owner app" : "Demo preview"}. Live scan unavailable: ${err.message || "connection issue"}`));
    return () => { mounted = false; };
  }, [isOwnerApp]);

  useEffect(() => subscribeOfficeTeamLocalCommand(setLocalQueue), []);
  useEffect(() => subscribeOfficeTeamLocalActivity(setLocalActivity), []);
  useEffect(() => subscribeOfficeTeamApprovalTrail(setApprovalTrail), []);

  useEffect(() => {
    const onPop = () => { setScreen(cleanScreen(window.location.hash)); window.scrollTo({ top: 0 }); };
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onPop);
    };
  }, []);

  const decisions = useMemo(() => {
    const baseDecisions = snapshot.decisions?.length ? snapshot.decisions : liveDrafts.length ? liveDrafts : demoDecisions;
    return localQueue.length ? [...localQueue, ...baseDecisions] : baseDecisions;
  }, [snapshot.decisions, liveDrafts, localQueue]);
  const pending = useMemo(() => decisions.filter((item) => !resolved[keyOf(item)]), [decisions, resolved]);
  const counts = useMemo(() => countDepartments(pending), [pending]);
  const metrics = makeStatusCards({ total: pending.length, high: pending.filter((item) => item.level === "Top priority").length, parked: Object.keys(resolved).length }, pending.length);
  const sourceLabel = localQueue.length ? "Local Command" : snapshot.source === "admin-brain" ? "Live Admin Brain" : liveDrafts.length ? "Live prepared" : snapshot.source === "clear-live" ? "Live clear" : "Demo mode";

  function go(next) {
    const cleanNext = cleanScreen(`#${next}`);
    setScreen(cleanNext);
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#${cleanNext}`);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function actionDecision(item, action) {
    const id = keyOf(item);
    setResolved((current) => ({ ...current, [id]: action }));
    setNotice(`${action} moved out of Command. The next waiting decision replaces it.`);
    if (String(id || "").startsWith("local-command-")) {
      const activity = recordOfficeTeamLocalActivity("Cleared", item, action);
      const trail = recordOfficeTeamApprovalTrail(item, action, "Owner reviewed");
      const next = removeOfficeTeamLocalCommand(id);
      setLocalQueue(next);
      setLocalActivity(activity);
      setApprovalTrail(trail);
      setNotice(`${action} cleared the local Command card. Approval trail saved. Nothing was sent or synced.`);
      return;
    }
    try {
      await recordOfficeTeamDecision(item, action);
      const trail = recordOfficeTeamApprovalTrail(item, action, "Owner reviewed");
      setApprovalTrail(trail);
      setNotice(`${action} recorded safely. Approval trail saved. Nothing was sent or synced.`);
    } catch {
      setResolved((current) => { const copy = { ...current }; delete copy[id]; return copy; });
      const trail = recordOfficeTeamApprovalTrail(item, action, "Returned to Command");
      setApprovalTrail(trail);
      setNotice(`Could not record ${action}. The card returned to Command.`);
    }
  }

  return <main className="cvOfficeFinal cvOfficeSite"><Topbar screen={screen} go={go} appMode={appMode} /><Status metrics={metrics} sourceLabel={sourceLabel} notice={notice} appMode={appMode} /><div className="cvSiteScreenDeck"><ScreenRouter screen={screen} metrics={metrics} pending={pending} resolved={resolved} localActivity={localActivity} approvalTrail={approvalTrail} go={go} tray={tray} setTray={setTray} counts={counts} onAction={actionDecision} activeRole={activeRole} setActiveRole={setActiveRole} /></div></main>;
}

function ScreenRouter(props) {
  const { screen } = props;
  if (screen === "today") return <OfficeTeamTodayScreen {...props} />;
  if (screen === "command") return <Command {...props} />;
  if (screen === "work") return <WorkScreen />;
  if (screen === "schedule") return <ScheduleScreen />;
  if (screen === "clients") return <ClientsScreen />;
  if (screen === "messages") return <MessagesScreen />;
  if (screen === "worker") return <WorkerViewScreen />;
  if (screen === "quotes") return <QuotesScreen />;
  if (screen === "invoices") return <InvoicesScreen />;
  if (screen === "money") return <MoneyScreen />;
  if (screen === "staff") return <StaffScreen />;
  if (screen === "payroll") return <PayrollScreen />;
  if (screen === "team") return <Team {...props} />;
  if (screen === "playbooks") return <Playbooks />;
  if (screen === "integrations") return <IntegrationsScreen />;
  if (screen === "activity") return <Activity {...props} />;
  if (screen === "automation") return <AutomationScreen />;
  if (screen === "branding") return <BrandingScreen />;
  if (screen === "settings") return <OfficeTeamSiteSettings />;
  if (screen === "plans") return <OfficeTeamPlansScreen />;
  if (screen === "help") return <HelpScreen />;
  if (screen === "readiness") return <OfficeTeamReadinessScreen />;
  if (screen === "safety") return <Safety />;
  return <OfficeTeamTodayScreen {...props} />;
}

function Topbar({ screen, go, appMode }) {
  const subline = appMode === "owner" ? "New owner app · office team prepares · owner approves" : "Hidden internal website · owner approval locked";
  return <header className="cvSiteTopbar"><div className="cvOfficeBrand"><img src={BRAND_ICON} alt="Churvox" /><div><strong>Churvox Office Team</strong><span>{subline}</span></div></div><nav>{screens.map(([key, label]) => <button key={key} className={screen === key ? "active" : ""} onClick={() => go(key)}>{label}</button>)}</nav></header>;
}

function Status({ metrics, sourceLabel, notice, appMode }) {
  const modeLabel = appMode === "owner" ? "Owner app" : "Office running";
  return <section className="cvSiteStatus"><div className="cvSiteStatusLead"><span>{modeLabel} · {sourceLabel}</span><h1>Churvox runs the office. The owner approves the decisions.</h1><p>Staff update the work. The office team checks what is missing, prepares the admin and brings decisions back to Command.</p><small>{notice}</small></div>{metrics.map((m) => <article key={m.label}><strong>{m.value}</strong><span>{m.label}</span><small>{m.note}</small></article>)}</section>;
}

function Command({ tray, setTray, counts, pending, onAction }) {
  const queue = tray === "command" ? pending : pending.filter((item) => trayKey(item.tray) === tray);
  const shown = queue.slice(0, COMMAND_CARD_LIMIT);
  const waiting = Math.max(0, queue.length - shown.length);
  return <section className="cvSiteScreen"><Header eyebrow="Command" title="Owner decision queue" text="Only the next few decisions show. Once one is actioned, it leaves Command and the next waiting item replaces it." /><div className="cvSiteTrayRail">{departments.map(([key, label]) => <button key={key} className={tray === key ? "active" : ""} onClick={() => setTray(key)}><strong>{counts[key] || 0}</strong><span>{label}</span></button>)}</div><div className="cvSiteQueueSummary"><strong>{shown.length} showing</strong><span>{queue.length} waiting</span><em>{waiting ? `${waiting} behind this set` : "queue clear after this set"}</em></div><div className="cvSiteDecisionGrid">{shown.length ? shown.map((item) => <Decision key={keyOf(item)} item={item} onAction={onAction} />) : <Empty title="No decisions in this tray" text="Anything important will appear here before anything is sent, synced or changed." />}</div></section>;
}

function Team({ activeRole, setActiveRole }) {
  const selected = roles.find((item) => item.name === activeRole) || roles[0];
  return <section className="cvSiteScreen"><Header eyebrow="Office Team" title="Roles behind the desk" text="Each mimic checks records, prepares admin and sends one clean decision into Command." /><div className="cvSiteTeamLayout"><aside className="cvSiteRoleList">{roles.map((item) => <button key={item.name} className={selected.name === item.name ? "active" : ""} onClick={() => setActiveRole(item.name)}><strong>{item.name}</strong><span>{item.summary}</span></button>)}</aside><article className="cvSiteRoleDetail"><span>{selected.dept}</span><h2>{selected.name}</h2><p>{selected.summary}</p><div className="cvSiteRoleColumns"><Info title="Checks" items={selected.checks} /><Info title="Prepares" items={selected.prepares} /><section><h3>Owner question</h3><p>{selected.ownerAsk}</p></section></div></article><OfficeTeamRoleControls roles={roles} /></div></section>;
}

function Playbooks() {
  return <section className="cvSiteScreen"><Header eyebrow="Playbooks" title="Same system, different business wording" text="Churvox should fit the business language instead of forcing every business to sound the same." /><div className="cvSitePlaybookGrid">{playbooks.map(([name, work, staff, customer, examples]) => <article key={name}><span>{name}</span><dl><div><dt>Work</dt><dd>{work}</dd></div><div><dt>Staff</dt><dd>{staff}</dd></div><div><dt>Customer</dt><dd>{customer}</dd></div></dl><small>{examples}</small></article>)}</div></section>;
}

function Activity({ pending, resolved, localActivity = [], approvalTrail = [] }) {
  const cleared = Object.entries(resolved);
  return <section className="cvSiteScreen"><Header eyebrow="Activity" title="Office activity and approval trail" text="This becomes the real log of checked, prepared, parked and owner-reviewed work." /><div className="cvSiteActivityLayout"><section><h2>Waiting now</h2>{pending.slice(0, 8).map((item) => <article key={keyOf(item)}><strong>{item.roleName || item.tray}</strong><p>{item.title} waiting in Command.</p><small>{item.tray}</small></article>)}</section><section><h2>Owner approval trail</h2>{approvalTrail.length ? approvalTrail.slice(0, 8).map((item) => <article key={item.id}><strong>{item.status} · {item.action}</strong><p>{item.title}</p><small>{item.safety}</small></article>) : <Empty title="No owner decisions yet" text="Action a Command card and the approval trail will appear here." />}</section><section><h2>Local office trail</h2>{localActivity.length ? localActivity.slice(0, 8).map((item) => <article key={item.id}><strong>{item.status} · {item.tray}</strong><p>{item.title}</p><small>{item.note}</small></article>) : <Empty title="No local trail yet" text="Prepare a Command card from any screen and it will appear here." />}</section><section><h2>Cleared this session</h2>{cleared.length ? cleared.map(([id, action]) => <article key={id}><strong>{action}</strong><p>Moved out of Command.</p><small>{id}</small></article>) : <Empty title="Nothing cleared yet" text="Action a Command card and it will appear here." />}</section></div></section>;
}

function Safety() {
  return <section className="cvSiteScreen"><Header eyebrow="Safety" title="Rules before this moves into the real app" text="Owner approval first. Safe recording second. Public site untouched until ready." /><div className="cvSiteSafetyGrid">{safetyRules.map((rule, index) => <article key={rule}><strong>{index + 1}</strong><p>{rule}</p></article>)}</div><div className="cvSiteBuildSteps"><span>Finish path</span><strong>How this becomes the real owner app</strong><p>This keeps the hidden site moving toward the real product without breaking public pages.</p><ol><li>Use Today as the owner starting screen.</li><li>Move Command queue into the real owner app.</li><li>Connect role modes to real settings.</li><li>Connect playbook wording to business type.</li><li>Replace demo activity with mimic logs.</li><li>Polish public marketing around this story.</li></ol></div></section>;
}

function Header({ eyebrow, title, text }) { return <header className="cvSiteScreenHeader"><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></header>; }
function Decision({ item, onAction }) { return <article className="cvSiteDecisionCard"><div><span>{item.level}</span><em>{item.tray}</em></div><h3>{item.title}</h3><p>{item.happened}</p><dl><dt>Checked</dt><dd>{(item.checked || []).map((x) => <small key={x}>{x}</small>)}</dd><dt>Prepared</dt><dd>{item.prepared}</dd><dt>Owner decision</dt><dd>{item.need}</dd></dl><footer>{(item.actions || []).map((action, i) => <button key={action} className={i === 0 ? "primary" : ""} onClick={() => onAction(item, action)}>{action}</button>)}</footer><small>Approval locked · leaves Command after action</small></article>; }
function Info({ title, items }) { return <section><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>; }
function Empty({ title, text }) { return <article className="cvSiteEmpty"><strong>{title}</strong><p>{text}</p></article>; }
function role(name, dept, summary, checks, prepares, ownerAsk) { return { name, dept, summary, checks, prepares, ownerAsk }; }
function decision(id, tray, roleName, level, title, happened, checked, prepared, need, actions) { return { id, tray, roleName, level, title, happened, checked, prepared, need, actions }; }
function keyOf(item = {}) { return item.id || item.action_id || item.title; }
function trayKey(tray = "") { const t = String(tray).toLowerCase(); if (t.includes("money")) return "money"; if (t.includes("booking")) return "bookings"; if (t.includes("staff")) return "staff"; if (t.includes("client")) return "clients"; if (t.includes("quality")) return "quality"; if (t.includes("operation")) return "ops"; return "command"; }
function countDepartments(items = []) { return items.reduce((acc, item) => { acc.command += 1; const key = trayKey(item.tray); acc[key] = (acc[key] || 0) + 1; return acc; }, { command: 0, money: 0, bookings: 0, staff: 0, clients: 0, quality: 0, ops: 0 }); }
function cleanScreen(hash = "") {
  const key = String(hash || "").replace(/^#/, "").trim().toLowerCase();
  if (screens.some(([id]) => id === key)) return key;
  const mapped = screenAliases[key] || key;
  return screens.some(([id]) => id === mapped) ? mapped : "today";
}
