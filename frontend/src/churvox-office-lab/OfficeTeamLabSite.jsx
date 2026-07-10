import React, { useEffect, useMemo, useState } from "react";
import "./OfficeTeamLabFinal.css";
import "./OfficeTeamLabLive.css";
import "./OfficeTeamLabSite.css";
import "./OfficeTeamLabSitePlus.css";
import "./OfficeTeamNavPolish.css";
import "./OfficeTeamOwnerReady.css";
import "./OfficeTeamPremiumPolish.css";
import "./OfficeTeamLogicPolish.css";
import "./OfficeTeamSlipForm.css";
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
import { BACKEND_COMMAND_EVENT, fetchBackendCommandAudit, fetchBackendCommandDecisions, recordBackendCommandDecision, runBackendOfficeEngineScan } from "./OfficeTeamCommandApi";
import { fetchOfficeTeamCommandDrafts } from "./OfficeTeamCommandDrafts";
import { readOfficeTeamLocalActivityLog, readOfficeTeamLocalCommandQueue, recordOfficeTeamLocalActivity, removeOfficeTeamLocalCommand, subscribeOfficeTeamLocalActivity, subscribeOfficeTeamLocalCommand } from "./OfficeTeamLocalCommand";
import { readOfficeTeamApprovalTrail, recordOfficeTeamApprovalTrail, subscribeOfficeTeamApprovalTrail } from "./OfficeTeamApprovalTrail";

const BRAND_ICON = "/churvox-app-icon.svg?v=churvox-office-site-20260709";
const COMMAND_CARD_LIMIT = 3;
const SAFE_APPROVAL_TEXT = "Nothing was sent, synced, charged or changed.";

const screens = [
  ["today", "Today"], ["command", "Command"], ["work", "Work"], ["schedule", "Schedule"], ["clients", "Clients"],
  ["messages", "Messages"], ["worker", "Worker View"], ["quotes", "Quotes"], ["invoices", "Invoices"], ["money", "Money"],
  ["staff", "Staff"], ["payroll", "Payroll"], ["team", "Office Team"], ["playbooks", "Playbooks"], ["integrations", "Integrations"],
  ["activity", "Activity"], ["automation", "Automation"], ["branding", "Branding"], ["settings", "Settings"], ["plans", "Plans"],
  ["help", "Help"], ["readiness", "Readiness"], ["safety", "Safety"],
];

const ownerScreens = [
  ["today", "Today"], ["command", "Command"], ["work", "Jobs"], ["schedule", "Schedule"], ["clients", "Clients"],
  ["messages", "Messages"], ["worker", "Workers"], ["quotes", "Quotes"], ["invoices", "Invoices"], ["money", "Money"],
  ["staff", "Staff"], ["payroll", "Payroll"], ["team", "Office Team"], ["integrations", "Xero"], ["activity", "Activity"], ["settings", "Settings"],
  ["plans", "Plans"], ["help", "Help"],
];

const screenAliases = {
  "": "today", dashboard: "today", home: "today", hub: "today", "smart-hub": "today",
  cockpit: "command", command: "command", "command-board": "command",
  jobs: "work", job: "work", work: "work", recurring: "work",
  calendar: "schedule", schedule: "schedule", clients: "clients", customers: "clients",
  messages: "messages", inbox: "messages", workers: "worker", worker: "worker", dispatch: "worker",
  quotes: "quotes", invoices: "invoices", reports: "invoices", money: "money", accounting: "money", accountant: "money", xero: "integrations",
  staff: "staff", payroll: "payroll", "office-team": "team", playbooks: "playbooks", integrations: "integrations",
  activity: "activity", automation: "automation", branding: "branding", settings: "settings", plans: "plans", billing: "plans",
  support: "help", help: "help", readiness: "readiness", safety: "safety",
};

const departments = [["command", "All"], ["money", "Money"], ["accounting", "Accounting"], ["bookings", "Bookings"], ["staff", "Staff"], ["clients", "Clients"], ["quality", "Quality"], ["ops", "Ops"]];

const roles = [
  role("Office Manager", "command", "Ranks the day and keeps the owner focused.", ["all decisions", "risk", "priority"], ["daily briefing", "owner queue"], "Review the top decisions or open a tray?", "Command", "Does not send, charge, sync or change records."),
  role("Receptionist", "bookings", "Prepares bookings, moves, reminders and rebooks.", ["date", "staff", "calendar"], ["booking draft", "rebook message"], "Approve the prepared booking plan, edit it, ask the client, or park it?", "Command booking slip", "Does not book, move or message without owner approval."),
  role("Bookkeeper", "money", "Prepares invoice drafts and payment follow-up safely.", ["completed work", "price", "extras"], ["invoice draft", "payment-link request", "overdue follow-up draft"], "Approve the invoice direction, edit it, ask staff, or park it?", "Command money slip", "Does not send invoices, mark paid, charge cards or sync accounting."),
  role("Accountant", "accounting", "Checks GST, accounting export, Xero/MYOB readiness and month-end risk.", ["GST setting", "invoice totals", "payment status", "export readiness", "sync risk"], ["accounting review slip", "GST check", "bookkeeper handoff", "Xero approval note"], "Approve the accounting review, fix the issue, export, or park it?", "Command accounting slip", "Does not file tax, submit to government, sync ledgers or change accounting records."),
  role("Payroll Clerk", "staff", "Prepares hours review for owner approval.", ["timers", "manual time", "odd shifts"], ["hours review", "timer correction"], "Approve hours, edit notes, or ask staff?", "Command staff slip", "Does not pay staff, file taxes or create bank files."),
  role("Client Memory", "clients", "Turns useful details into client memory.", ["notes", "history", "messages"], ["preference note", "access note"], "Save, edit, ignore, or park this memory?", "Command client slip", "Does not overwrite client records without owner approval."),
  role("Quality Checker", "quality", "Checks work is ready before completion or invoice.", ["proof", "notes", "extras"], ["quality flag", "ask-staff prompt"], "Approve the proof request, review completion, or park it?", "Command quality slip", "Does not complete jobs or invoice work by itself."),
  role("Operations Manager", "ops", "Finds repeated problems and better rules.", ["patterns", "repeat issues", "capacity gaps"], ["pattern report", "rule suggestion"], "Approve the rule draft, edit it, or park it?", "Command ops slip", "Does not change rules automatically."),
];

const starterDecisions = [
  decision("starter-1", "Money", "Bookkeeper", "Top priority", "Completed service has extra decision", "Staff noted extra green waste after completion.", ["completed", "staff note", "not sent"], "Draft is ready and the extra line is held for review.", "Approve this draft direction, edit it, ask staff, or park it?", ["Approve draft", "Edit draft", "Ask staff", "Park"]),
  decision("starter-2", "Bookings", "Receptionist", "Next", "Regular client has no next booking", "A repeat client usually books every 3 weeks but has no next appointment.", ["last visit", "usual cycle", "space found"], "Rebooking message and suggested date are ready.", "Approve the prepared rebooking plan, edit the date, or park it?", ["Approve plan", "Edit date", "Ask client later", "Park"]),
  decision("starter-3", "Staff", "Payroll Clerk", "Needs check", "Hours review has one odd timer", "One timer is much longer than usual.", ["period", "timers", "manual time"], "Hours review is ready and the odd timer is flagged.", "Approve the review direction, edit timer notes, or ask staff?", ["Approve review", "Edit notes", "Ask staff", "Park"]),
  decision("starter-4", "Clients", "Client Memory", "Low risk", "Service note should become client memory", "A service note includes useful preference details.", ["notes", "service", "duplicates"], "Client memory update is ready.", "Approve this memory draft, edit it, ignore it, or park it?", ["Approve draft", "Edit draft", "Ignore", "Park"]),
  decision("starter-5", "Quality", "Quality Checker", "Parkable", "Completed work is missing proof", "A completed work record is missing its final proof note.", ["complete", "proof missing"], "Ask-staff prompt is ready.", "Approve the proof request, review completion, or park it?", ["Approve request", "Review completion", "Park"]),
  decision("starter-6", "Accounting", "Accountant", "Accounting check", "GST and Xero review needs approval", "A completed invoice is ready, but GST/accounting export should be checked before any sync.", ["GST rate", "invoice total", "export status", "no sync"], "Accounting review slip is ready for owner approval.", "Approve the accounting review, send it back to Bookkeeper, export, or park it?", ["Approve review", "Send to Bookkeeper", "Export later", "Park"]),
  decision("starter-7", "Operations", "Operations Manager", "Pattern", "Repeat work may need a rule", "A repeated issue has shown up more than once this month.", ["pattern", "repeat", "gap"], "A process rule suggestion is ready.", "Approve the rule draft, edit it, or park it?", ["Approve draft", "Edit draft", "Park"]),
];

const playbooks = [
  ["General Service", "work", "staff", "client", "service / booking / visit / job"],
  ["Hair / Beauty", "appointment", "stylist", "client", "colour note / rebook / deposit"],
  ["Barber", "appointment", "barber", "client", "cut preference / regular cycle"],
  ["Nails", "appointment", "nail tech", "client", "shape / colour / repair"],
  ["Cleaning", "visit", "cleaner", "customer", "access note / recurring run"],
  ["Trades", "job", "worker", "client", "materials / proof / invoice"],
];

const safetyRules = ["Owner approval comes first", "Prepared-only approvals", "No blind sends or syncs", "Failed records return to Command", "Every change stays owner-controlled"];

export default function OfficeTeamLabSite({ appMode = "lab" }) {
  const isOwnerApp = appMode === "owner";
  const [screen, setScreen] = useState(() => cleanScreen(window.location.hash));
  const [tray, setTray] = useState("command");
  const [activeRole, setActiveRole] = useState("Office Manager");
  const [snapshot, setSnapshot] = useState({ source: "starter", decisions: [] });
  const [backendCommand, setBackendCommand] = useState({ source: "command-unavailable", decisions: [] });
  const [backendAudit, setBackendAudit] = useState({ source: "command-audit-unavailable", audit: [] });
  const [liveDrafts, setLiveDrafts] = useState([]);
  const [localQueue, setLocalQueue] = useState(() => readOfficeTeamLocalCommandQueue());
  const [localActivity, setLocalActivity] = useState(() => readOfficeTeamLocalActivityLog());
  const [approvalTrail, setApprovalTrail] = useState(() => readOfficeTeamApprovalTrail());
  const [notice, setNotice] = useState(isOwnerApp ? "Owner workspace ready. The office team checks the work, prepares slips, and waits for your approval." : "Churvox control centre ready. Sign in as an owner to load live decisions.");
  const [resolved, setResolved] = useState({});

  useEffect(() => {
    let mounted = true;
    const commandPromise = isOwnerApp
      ? runBackendOfficeEngineScan().catch(() => null).then((scan) => fetchBackendCommandDecisions().then((command) => ({ ...command, scan })))
      : Promise.resolve({ source: "skip", decisions: [] });
    Promise.allSettled([
      fetchOfficeTeamSnapshot(),
      fetchOfficeTeamCommandDrafts(),
      commandPromise,
      isOwnerApp ? fetchBackendCommandAudit() : Promise.resolve({ source: "skip", audit: [] }),
    ])
      .then(([scanResult, draftResult, commandResult, auditResult]) => {
        if (!mounted) return;
        const data = scanResult.status === "fulfilled" ? scanResult.value : { source: "starter", decisions: [] };
        const drafts = draftResult.status === "fulfilled" && Array.isArray(draftResult.value) ? draftResult.value : [];
        const command = commandResult.status === "fulfilled" ? commandResult.value : { source: "command-unavailable", decisions: [] };
        const audit = auditResult.status === "fulfilled" ? auditResult.value : { source: "command-audit-unavailable", audit: [] };
        setSnapshot(data || { source: "starter", decisions: [] });
        setBackendCommand(command || { source: "command-unavailable", decisions: [] });
        setBackendAudit(audit || { source: "command-audit-unavailable", audit: [] });
        setLiveDrafts(drafts);
        setResolved({});
        const createdCount = Number(command?.scan?.createdCount || 0);
        const existingCount = Number(command?.scan?.existingCount || 0);
        if (isOwnerApp && createdCount) setNotice(`Office team prepared ${createdCount} new Command slip${createdCount === 1 ? "" : "s"}. Open each slip, check the draft, then approve.`);
        else if (isOwnerApp && existingCount) setNotice(`Office team checked live records. ${existingCount} open slip${existingCount === 1 ? "" : "s"} are still waiting for owner approval.`);
        else if (isOwnerApp && command?.decisions?.length) setNotice("Command slips loaded. Open a slip, review it, then approve, edit, ask, snooze or park it.");
        else if (isOwnerApp && command?.source === "backend-command-clear") setNotice("The office team checked live records. Command is clear for now.");
        else if (data?.source === "admin-brain") setNotice(isOwnerApp ? "Live business check loaded. Owner approval still comes first." : "Live office check loaded. Owner approval still comes first.");
        else if (drafts.length) setNotice("Live read-only records are prepared for Command. Nothing has been sent, synced or changed.");
        else if (data?.source === "clear-live") setNotice(isOwnerApp ? "Live check is clear. Command will stay empty until real work needs owner approval." : "Live check is clear. Command stays ready for the next decision.");
        else setNotice(isOwnerApp ? "Owner workspace loaded. Real approvals appear when work needs you." : "Churvox control centre loaded. Live decisions appear when work needs owner approval.");
      })
      .catch((err) => mounted && setNotice(`${isOwnerApp ? "Owner workspace" : "Churvox control centre"}. Live check unavailable: ${err.message || "connection issue"}`));
    return () => { mounted = false; };
  }, [isOwnerApp]);

  useEffect(() => {
    if (!isOwnerApp) return () => {};
    const refreshBackendCommand = () => {
      Promise.allSettled([fetchBackendCommandDecisions(), fetchBackendCommandAudit()])
        .then(([commandResult, auditResult]) => {
          const command = commandResult.status === "fulfilled" ? commandResult.value : { source: "command-unavailable", decisions: [] };
          const audit = auditResult.status === "fulfilled" ? auditResult.value : { source: "command-audit-unavailable", audit: [] };
          setBackendCommand(command || { source: "command-unavailable", decisions: [] });
          setBackendAudit(audit || { source: "command-audit-unavailable", audit: [] });
          setResolved({});
          setNotice(command?.decisions?.length ? "Command refreshed. A prepared slip is waiting for owner approval." : "Command refreshed. No prepared decisions are waiting.");
        })
        .catch(() => setNotice("Command refresh failed. Nothing was sent, synced, charged or changed."));
    };
    window.addEventListener(BACKEND_COMMAND_EVENT, refreshBackendCommand);
    return () => window.removeEventListener(BACKEND_COMMAND_EVENT, refreshBackendCommand);
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
    const backendDecisions = isOwnerApp && backendCommand.decisions?.length ? backendCommand.decisions : [];
    const baseDecisions = backendDecisions.length ? backendDecisions : snapshot.decisions?.length ? snapshot.decisions : liveDrafts.length ? liveDrafts : isOwnerApp ? [] : starterDecisions;
    return localQueue.length ? [...localQueue, ...baseDecisions] : baseDecisions;
  }, [backendCommand.decisions, snapshot.decisions, liveDrafts, localQueue, isOwnerApp]);
  const pending = useMemo(() => decisions.filter((item) => !resolved[keyOf(item)]), [decisions, resolved]);
  const counts = useMemo(() => countDepartments(pending), [pending]);
  const metrics = makeStatusCards({ total: pending.length, high: pending.filter((item) => item.level === "Top priority").length, parked: Object.keys(resolved).length }, pending.length);
  const sourceLabel = makeSourceLabel({ isOwnerApp, backendCommand, snapshot, liveDrafts });

  function go(next) {
    const cleanNext = cleanScreen(`#${next}`);
    setScreen(cleanNext);
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#${cleanNext}`);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function actionDecision(item, action, detail = {}) {
    const id = keyOf(item);
    const ownerNote = cleanText(detail.ownerNote || "");
    const trailNote = ownerNote ? `Owner note: ${ownerNote}` : "Owner reviewed";
    setResolved((current) => ({ ...current, [id]: action }));
    setNotice(`${action} recorded as the owner decision. The prepared slip left Command. ${SAFE_APPROVAL_TEXT}`);
    if (String(id || "").startsWith("local-command-")) {
      const activity = recordOfficeTeamLocalActivity("Cleared", item, action);
      const trail = recordOfficeTeamApprovalTrail(item, action, trailNote);
      const next = removeOfficeTeamLocalCommand(id);
      setLocalQueue(next);
      setLocalActivity(activity);
      setApprovalTrail(trail);
      setNotice(`${action} recorded as the owner decision. Approval trail saved. ${SAFE_APPROVAL_TEXT}`);
      return;
    }
    if (item?.raw?.source === "backend_command_slip") {
      try {
        await recordBackendCommandDecision(item, action, {
          note: ownerNote || SAFE_APPROVAL_TEXT,
          ownerNote,
          fields: Array.isArray(detail.fields) ? detail.fields : [],
          formTitle: detail.formTitle || makeSlipFormTitle(item),
        });
        const trail = recordOfficeTeamApprovalTrail(item, action, ownerNote ? `Command recorded · ${ownerNote}` : "Command recorded");
        setApprovalTrail(trail);
        const audit = await fetchBackendCommandAudit().catch(() => null);
        if (audit) setBackendAudit(audit);
        setNotice(`${action} recorded in Command with the approved form snapshot. ${SAFE_APPROVAL_TEXT}`);
      } catch {
        setResolved((current) => { const copy = { ...current }; delete copy[id]; return copy; });
        const trail = recordOfficeTeamApprovalTrail(item, action, "Returned to Command");
        setApprovalTrail(trail);
        setNotice(`Could not record ${action} in Command. The slip returned to Command.`);
      }
      return;
    }
    try {
      await recordOfficeTeamDecision(item, action);
      const trail = recordOfficeTeamApprovalTrail(item, action, trailNote);
      setApprovalTrail(trail);
      setNotice(`${action} recorded safely for owner approval. Approval trail saved. ${SAFE_APPROVAL_TEXT}`);
    } catch {
      setResolved((current) => { const copy = { ...current }; delete copy[id]; return copy; });
      const trail = recordOfficeTeamApprovalTrail(item, action, "Returned to Command");
      setApprovalTrail(trail);
      setNotice(`Could not record ${action}. The slip returned to Command. ${SAFE_APPROVAL_TEXT}`);
    }
  }

  return <main className={`cvOfficeFinal cvOfficeSite ${isOwnerApp ? "cvOwnerReady" : "cvLabPreview"}`}><Topbar screen={screen} go={go} appMode={appMode} /><Status metrics={metrics} sourceLabel={sourceLabel} notice={notice} appMode={appMode} /><div className="cvSiteScreenDeck"><ScreenRouter screen={screen} metrics={metrics} pending={pending} resolved={resolved} localQueue={localQueue} localActivity={localActivity} approvalTrail={approvalTrail} backendAudit={backendAudit.audit || []} go={go} tray={tray} setTray={setTray} counts={counts} onAction={actionDecision} activeRole={activeRole} setActiveRole={setActiveRole} /></div></main>;
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
  const isOwnerApp = appMode === "owner";
  const navScreens = isOwnerApp ? ownerScreens : screens;
  const brand = "Churvox";
  const subline = isOwnerApp ? "Owner workspace · office team prepares · you approve" : "Command-centred owner control";
  return <header className="cvSiteTopbar"><div className="cvOfficeBrand"><img src={BRAND_ICON} alt="Churvox" /><div><strong>{brand}</strong><span>{subline}</span></div></div><nav>{navScreens.map(([key, label]) => <button key={key} className={screen === key ? "active" : ""} onClick={() => go(key)}>{label}</button>)}</nav><button type="button" className="cvSiteLogout" onClick={logoutOffice}>Log out</button></header>;
}

function Status({ metrics, sourceLabel, notice, appMode }) {
  const isOwnerApp = appMode === "owner";
  const modeLabel = isOwnerApp ? "Owner workspace" : "Office running";
  const title = isOwnerApp ? "The office team prepares it. You approve." : "Churvox runs the office. The owner approves the decisions.";
  const text = isOwnerApp ? "Jobs, clients, workers, quotes, invoices, payroll checks, accounting checks and follow-ups come back to Command before anything is sent, synced, charged or changed." : "Staff update the work. The office team checks what is missing, prepares the admin and brings decisions back to Command.";
  return <section className="cvSiteStatus"><div className="cvSiteStatusLead"><span>{modeLabel} · {sourceLabel}</span><h1>{title}</h1><p>{text}</p><small>{notice}</small></div>{metrics.map((m) => <article key={m.label}><strong>{m.value}</strong><span>{m.label}</span><small>{m.note}</small></article>)}</section>;
}

function Command({ tray, setTray, counts, pending, onAction }) {
  const queue = tray === "command" ? pending : pending.filter((item) => trayKey(item.tray) === tray);
  const shown = queue.slice(0, COMMAND_CARD_LIMIT);
  const waiting = Math.max(0, queue.length - shown.length);
  const [selectedId, setSelectedId] = useState("");
  const selected = queue.find((item) => keyOf(item) === selectedId) || shown[0] || queue[0] || null;
  function act(item, action, detail) {
    onAction(item, action, detail);
    setSelectedId("");
  }
  return <section className="cvSiteScreen"><Header eyebrow="Command" title="Owner decision queue" text="Open the slip, check the editable draft form, change anything needed, then approve or park it. Nothing sends, syncs, charges or changes records from this screen." /><div className="cvSiteTrayRail">{departments.map(([key, label]) => <button key={key} className={tray === key ? "active" : ""} onClick={() => { setTray(key); setSelectedId(""); }}><strong>{counts[key] || 0}</strong><span>{label}</span></button>)}</div><div className="cvSiteQueueSummary"><strong>{shown.length} showing</strong><span>{queue.length} waiting</span><em>{waiting ? `${waiting} behind this set` : "queue clear after this set"}</em></div><div className="cvSiteCommandLayout"><div className="cvSiteDecisionGrid">{shown.length ? shown.map((item) => <Decision key={keyOf(item)} item={item} selected={keyOf(item) === keyOf(selected)} onOpen={() => setSelectedId(keyOf(item))} />) : <Empty title="No decisions in this tray" text="Anything important will appear here before anything is sent, synced or changed." />}</div><CommandSlip item={selected} onAction={act} /></div></section>;
}

function CommandSlip({ item, onAction }) {
  const itemKey = keyOf(item || {});
  const actions = Array.isArray(item?.actions) ? item.actions : [];
  const [ownerNote, setOwnerNote] = useState("");
  const [selectedAction, setSelectedAction] = useState(actions[0] || "Approve record");
  const [draftFields, setDraftFields] = useState(() => makeSlipFields(item));
  useEffect(() => {
    const nextActions = Array.isArray(item?.actions) ? item.actions : [];
    setOwnerNote("");
    setSelectedAction(nextActions[0] || "Approve record");
    setDraftFields(makeSlipFields(item));
  }, [item]);

  if (!item) return <aside className="cvCommandSlip"><span>Command slip</span><h3>No open slip</h3><p>When the office team prepares work for the owner, the full decision slip opens here.</p></aside>;

  const formTitle = makeSlipFormTitle(item);
  const source = item.raw?.source === "backend_command_slip" ? "Live Command" : String(itemKey).startsWith("local-command-") ? "Prepared in this workspace" : "Starter structure";
  const finalAction = selectedAction || actions[0] || "Approve record";
  const effects = makeApprovalEffects(item, draftFields);
  const submit = (action = finalAction) => onAction(item, action, { ownerNote, fields: draftFields, formTitle });
  const changeField = (index, value) => setDraftFields((current) => current.map((field, i) => i === index ? { ...field, value } : field));

  return <aside className="cvCommandSlip cvCommandSlipPlain" aria-label="Command decision slip">
    <div className="cvCommandSlipTop"><span>Command slip</span><em>{item.level || "Review"}</em></div>
    <h3>{item.title}</h3>
    <p className="cvSlipPlainSummary">{plainSlipSummary(item)}</p>
    <div className="cvCommandSlipMeta"><b>{item.roleName || item.tray || "Churvox"}</b><small>{item.tray || "Command"}</small><small>{source}</small></div>

    <section className="cvSlipForm" aria-label="Editable prepared approval form">
      <div><span>Prepared form</span><h4>{formTitle}</h4><p>Edit the draft below, then approve only when it looks right.</p></div>
      <div className="cvSlipFieldGrid cvSlipEditableGrid">{draftFields.map((field, index) => <label key={`${field.label}-${index}`}><span>{field.label}</span>{field.long ? <textarea value={field.value || ""} onChange={(event) => changeField(index, event.target.value)} /> : <input value={field.value || ""} onChange={(event) => changeField(index, event.target.value)} />}</label>)}</div>
    </section>

    <section className="cvSlipWillDo"><b>If you approve this</b>{effects.map((effect) => <p key={effect}>{effect}</p>)}</section>

    <label className="cvSlipOwnerBox"><span>Owner note / instruction</span><textarea value={ownerNote} onChange={(event) => setOwnerNote(event.target.value)} placeholder="Add an instruction if needed. Example: move the booking to Friday, change total to 150, ask staff first, or park it." /></label>

    <section className="cvCommandSlipSafety"><b>Safety locks</b><span>No auto-send</span><span>No auto-sync</span><span>No auto-charge</span><span>No record change without approval</span></section>

    <footer className="cvSlipDecisionActions">{actions.map((action, i) => <button key={action} type="button" className={i === 0 ? "primary" : ""} onClick={() => { setSelectedAction(action); submit(action); }}>{action}</button>)}</footer>
    <small className="cvSlipNote">Your click records the owner decision and approved form snapshot only. The next executor step still must respect Command approval.</small>
  </aside>;
}

function Team({ activeRole, setActiveRole }) {
  const selected = roles.find((item) => item.name === activeRole) || roles[0];
  return <section className="cvSiteScreen"><Header eyebrow="Office Team" title="Office roles with clear jobs" text="Each role has one job: check records, prepare the right slip, and bring the owner a clear decision." /><div className="cvSiteTeamLayout"><aside className="cvSiteRoleList">{roles.map((item) => <button key={item.name} className={selected.name === item.name ? "active" : ""} onClick={() => setActiveRole(item.name)}><strong>{item.name}</strong><span>{item.summary}</span></button>)}</aside><article className="cvSiteRoleDetail"><span>{selected.dept}</span><h2>{selected.name}</h2><p>{selected.summary}</p><div className="cvSiteRoleColumns"><Info title="Checks" items={selected.checks} /><Info title="Prepares" items={selected.prepares} /><section><h3>Owner question</h3><p>{selected.ownerAsk}</p></section><section><h3>Sends to</h3><p>{selected.feeds}</p></section><section><h3>Guardrail</h3><p>{selected.guard}</p></section></div></article><OfficeTeamRoleControls roles={roles} /></div></section>;
}

function Playbooks() {
  return <section className="cvSiteScreen"><Header eyebrow="Playbooks" title="Same system, different business wording" text="Churvox should fit the business language instead of forcing every business to sound the same." /><div className="cvSitePlaybookGrid">{playbooks.map(([name, work, staff, customer, examples]) => <article key={name}><span>{name}</span><dl><div><dt>Work</dt><dd>{work}</dd></div><div><dt>Staff</dt><dd>{staff}</dd></div><div><dt>Customer</dt><dd>{customer}</dd></div></dl><small>{examples}</small></article>)}</div></section>;
}

function Activity({ pending, resolved, localActivity = [], approvalTrail = [], backendAudit = [] }) {
  const ownerRoute = isOwnerRoute();
  const cleared = Object.entries(resolved);
  return <section className="cvSiteScreen"><Header eyebrow="Activity" title={ownerRoute ? "Activity and approval trail" : "Office activity and approval trail"} text={ownerRoute ? "A clear record of what Churvox prepared, what is waiting, and what the owner has approved." : "A clear log of checked, prepared, parked and owner-reviewed work."} /><div className="cvSiteActivityLayout"><section><h2>Waiting now</h2>{pending.slice(0, 8).map((item) => <article key={keyOf(item)}><strong>{item.roleName || item.tray}</strong><p>{item.title} waiting in Command.</p><small>{item.tray}</small></article>)}</section><section><h2>Command record</h2>{backendAudit.length ? backendAudit.slice(0, 8).map((item) => <article key={item.id}><strong>{item.status}</strong><p>{item.title}</p><small>{item.safety}</small></article>) : <Empty title="No Command records yet" text="Command approvals will appear here after the owner reviews prepared work." />}</section><section><h2>Owner approval trail</h2>{approvalTrail.length ? approvalTrail.slice(0, 8).map((item) => <article key={item.id}><strong>{item.status} · {item.action}</strong><p>{item.title}</p><small>{item.safety}</small></article>) : <Empty title="No owner decisions yet" text="Action a Command card and the approval trail will appear here." />}</section><section><h2>Prepared work trail</h2>{localActivity.length ? localActivity.slice(0, 8).map((item) => <article key={item.id}><strong>{item.status} · {item.tray}</strong><p>{item.title}</p><small>{item.note}</small></article>) : <Empty title="No prepared work trail yet" text="Prepared work will appear here as Churvox brings items back to Command." />}</section><section><h2>Cleared this session</h2>{cleared.length ? cleared.map(([id, action]) => <article key={id}><strong>{action}</strong><p>Moved out of Command.</p><small>{id}</small></article>) : <Empty title="Nothing cleared yet" text="Action a Command card and it will appear here." />}</section></div></section>;
}

function Safety() {
  return <section className="cvSiteScreen"><Header eyebrow="Safety" title="Owner-control rules" text="Owner approval first. Safe recording second. Nothing moves without a clear decision." /><div className="cvSiteSafetyGrid">{safetyRules.map((rule, index) => <article key={rule}><strong>{index + 1}</strong><p>{rule}</p></article>)}</div><div className="cvSiteBuildSteps"><span>Control path</span><strong>How Churvox keeps the owner in charge</strong><p>Every screen follows the same rule: prepare the work, bring the decision to Command, and wait for owner approval.</p><ol><li>Start with Today as the owner control screen.</li><li>Keep Command as the approval queue.</li><li>Match wording to the business type.</li><li>Record every owner decision in Activity.</li><li>Keep worker updates simple and phone-friendly.</li><li>Keep money and sync actions approval-only.</li></ol></div></section>;
}

function Header({ eyebrow, title, text }) { return <header className="cvSiteScreenHeader"><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></header>; }
function Decision({ item, onOpen, selected }) { return <article className={`cvSiteDecisionCard ${selected ? "selected" : ""}`}><div><span>{item.level}</span><em>{item.tray}</em></div><h3>{item.title}</h3><p>{item.happened}</p><dl><dt>Checked</dt><dd>{(item.checked || []).map((x) => <small key={x}>{x}</small>)}</dd><dt>Prepared</dt><dd>{item.prepared}</dd><dt>Owner decision</dt><dd>{item.need}</dd></dl><footer><button type="button" className="openSlip" onClick={onOpen}>Open slip</button></footer><small>Open the full slip to edit and record the owner decision</small></article>; }
function Info({ title, items }) { return <section><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>; }
function Empty({ title, text }) { return <article className="cvSiteEmpty"><strong>{title}</strong><p>{text}</p></article>; }
function role(name, dept, summary, checks, prepares, ownerAsk, feeds, guard) { return { name, dept, summary, checks, prepares, ownerAsk, feeds, guard }; }
function decision(id, tray, roleName, level, title, happened, checked, prepared, need, actions) { return { id, tray, roleName, level, title, happened, checked, prepared, need, actions }; }
function keyOf(item = {}) { return item.id || item.action_id || item.title; }
function trayKey(tray = "") { const t = String(tray).toLowerCase(); if (t.includes("account")) return "accounting"; if (t.includes("xero")) return "accounting"; if (t.includes("money")) return "money"; if (t.includes("booking")) return "bookings"; if (t.includes("staff")) return "staff"; if (t.includes("client")) return "clients"; if (t.includes("quality")) return "quality"; if (t.includes("operation")) return "ops"; return "command"; }
function countDepartments(items = []) { return items.reduce((acc, item) => { acc.command += 1; acc[trayKey(item.tray)] = (acc[trayKey(item.tray)] || 0) + 1; return acc; }, { command: 0, money: 0, accounting: 0, bookings: 0, staff: 0, clients: 0, quality: 0, ops: 0 }); }
function cleanScreen(hash) { const key = String(hash || "").replace("#", "").trim().toLowerCase(); return screenAliases[key] || "today"; }
function makeSourceLabel({ isOwnerApp, backendCommand, snapshot, liveDrafts }) { if (isOwnerApp && backendCommand?.source === "backend-command") return "Command live"; if (isOwnerApp && backendCommand?.source === "backend-command-clear") return "Command clear"; if (snapshot?.source === "admin-brain") return "live check"; if (liveDrafts?.length) return "live rows"; return isOwnerApp ? "owner mode" : "control mode"; }
function isOwnerRoute() { return typeof window !== "undefined" && window.location.pathname.includes("dashboard"); }
function logoutOffice() { try { localStorage.removeItem("token"); localStorage.removeItem("owner_portal_session"); localStorage.removeItem("platform_owner_email"); sessionStorage.clear(); } catch {} window.location.href = "/login"; }
function cleanText(value) { return String(value || "").trim(); }
function firstValue(...values) { return values.map(cleanText).find(Boolean) || ""; }
function payloadOf(item = {}) { return item?.raw?.payload && typeof item.raw.payload === "object" ? item.raw.payload : {}; }
function plainSlipSummary(item = {}) { return firstValue(item.happened, item.detail, item.raw?.found, "The office team found something that needs owner approval."); }
function makeSlipFormTitle(item = {}) {
  const text = `${item.tray || ""} ${item.roleName || ""} ${item.raw?.action_type || ""} ${item.title || ""}`.toLowerCase();
  if (/timer|hours|payroll|staff/.test(text)) return "Hours review form";
  if (/invoice|payment|money|bookkeeper/.test(text)) return "Invoice / payment review form";
  if (/account|gst|xero|myob|tax/.test(text)) return "Accounting review form";
  if (/booking|schedule|recurring|date|rebook/.test(text)) return "Booking review form";
  if (/client|memory|preference|access/.test(text)) return "Client memory form";
  if (/quality|proof|photo|complete/.test(text)) return "Quality check form";
  if (/message|reply/.test(text)) return "Reply approval form";
  if (/operation|pattern|rule/.test(text)) return "Operations review form";
  return "Owner approval form";
}
function makeSlipFields(item = {}) {
  if (!item) return [];
  const payload = payloadOf(item);
  const raw = item.raw || {};
  const preparedForm = item.form || payload.prepared_form || payload.form || raw.prepared_form;
  if (preparedForm && typeof preparedForm === "object" && !Array.isArray(preparedForm)) {
    return objectFormFields(item, preparedForm);
  }
  const form = makeSlipFormTitle(item).toLowerCase();
  const role = firstValue(item.roleName, payload.office_role, item.tray, "Churvox");
  const record = firstValue(payload.record_title, payload.job_title, raw.title, item.title, "Selected record");
  if (form.includes("booking")) return [
    field("Prepared by", role), field("Client", firstValue(payload.customer, "Repeat client")), field("Usual cycle", "Every 3 weeks"), field("Last visit", "Needs date check"), field("Suggested next booking", "Choose date and time"), field("Worker", firstValue(payload.worker, "Choose worker")), field("Prepared message", "We can book your next visit once the owner approves the date.", true), field("Internal note", plainSlipSummary(item), true),
  ];
  if (form.includes("invoice") || form.includes("payment")) return [
    field("Prepared by", role), field("Client", firstValue(payload.customer, "Customer to confirm")), field("Job", record), field("Line items", firstValue(payload.line_items, "Base service + extra green waste"), true), field("Draft total", firstValue(payload.amount, payload.amount_due, "Needs amount")), field("Payment link", firstValue(payload.payment_link, "Prepare only")), field("Invoice note", firstValue(item.prepared, "Draft invoice is ready for owner review."), true),
  ];
  if (form.includes("hours")) return [
    field("Prepared by", role), field("Worker", firstValue(payload.worker, payload.staff, "Worker to confirm")), field("Job / shift", record), field("Timer", firstValue(payload.hours, "Long timer flagged")), field("Expected time", "Normal time needs check"), field("Issue", plainSlipSummary(item), true), field("Prepared action", firstValue(item.prepared, "Approve hours, edit notes, or ask staff."), true),
  ];
  if (form.includes("client")) return [
    field("Prepared by", role), field("Client", firstValue(payload.customer, payload.name, record)), field("Detail to save", firstValue(payload.note, payload.notes, item.prepared, "Client memory detail"), true), field("Source", firstValue(raw.source_type, item.tray, "Service note")), field("Use for", "Future jobs, messages and access notes"),
  ];
  if (form.includes("quality")) return [
    field("Prepared by", role), field("Job", record), field("Missing", "Final proof / completion note"), field("Staff request", firstValue(item.prepared, "Ask staff to add final proof."), true), field("Hold invoice?", "Owner decides"),
  ];
  if (form.includes("accounting")) return [
    field("Prepared by", role), field("System", firstValue(payload.system, "Xero / MYOB")), field("Record", record), field("GST / code", firstValue(payload.gst, "Needs check")), field("Export status", firstValue(payload.status, "Do not sync yet")), field("Accounting note", firstValue(item.prepared, "Accounting review is ready for owner approval."), true),
  ];
  if (form.includes("reply")) return [
    field("Prepared by", role), field("Client", firstValue(payload.customer, "Client")), field("Original message", firstValue(payload.message, plainSlipSummary(item)), true), field("Prepared reply", firstValue(payload.reply, item.prepared, "Reply needs owner approval."), true), field("Send status", "Do not send yet"),
  ];
  return [field("Prepared by", role), field("Area", firstValue(item.tray, raw.source_type)), field("Record", record), field("Status", firstValue(payload.status, raw.status, item.level)), field("Prepared action", firstValue(item.prepared, plainSlipSummary(item)), true)];
}
function objectFormFields(item, form = {}) {
  const base = [field("Prepared by", firstValue(item.roleName, payloadOf(item).office_role, item.tray, "Churvox"))];
  const rows = Object.entries(form).filter(([, value]) => value !== undefined && value !== null && value !== "").slice(0, 10).map(([key, value]) => field(labelize(key), displayValue(value), shouldUseLongField(key, value)));
  return [...base, ...rows];
}
function makeApprovalEffects(item = {}, fields = []) {
  const payload = payloadOf(item);
  const fromPayload = item.willDo || payload.will_do || item.raw?.will_do;
  if (Array.isArray(fromPayload) && fromPayload.length) return fromPayload.map(displayValue);
  const form = makeSlipFormTitle(item).toLowerCase();
  if (form.includes("booking")) return ["Save the booking/rebooking draft", "Keep customer messages unsent until you choose to send", "Record the owner approval trail"];
  if (form.includes("invoice") || form.includes("payment")) return ["Save the invoice/payment draft", "Keep invoice send, sync and charge locked", "Use the edited fields above as the approved draft"];
  if (form.includes("hours")) return ["Save the hours review draft", "No payroll payment, tax filing or bank file is created", "Use your edited notes for the staff follow-up"];
  if (form.includes("client")) return ["Prepare the client memory update", "Do not overwrite the client record without owner approval", "Keep an audit note of what was approved"];
  if (form.includes("quality")) return ["Prepare the staff proof request", "Hold completion/invoice decisions until proof is checked", "Record what the owner approved"];
  if (form.includes("accounting")) return ["Save accounting review notes", "Do not sync Xero/MYOB or file tax", "Send changes back to Bookkeeper if needed"];
  return fields.length ? ["Use the edited form as the approved draft", "Record the owner decision", "Keep send, sync and charge locked"] : ["Record the owner decision", "Nothing is sent, synced or charged"];
}
function field(label, value, long = false) { return { label, value: displayValue(value), long: long || shouldUseLongField(label, value) }; }
function displayValue(value) { if (Array.isArray(value)) return value.map(displayValue).join(" · "); if (value && typeof value === "object") return Object.entries(value).map(([k, v]) => `${labelize(k)}: ${displayValue(v)}`).join(" · "); return cleanText(value); }
function shouldUseLongField(label, value) { return /note|message|reply|line|scope|action|request|detail|issue/i.test(String(label || "")) || displayValue(value).length > 48; }
function labelize(key) { return String(key || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
