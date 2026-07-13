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
import "./OfficeTeamVisionPolish.css";
import "./OfficeTeamVisualRepair.css";
import OfficeTeamRoleControls from "./OfficeTeamRoleControls";
import OfficeTeamSiteSettings from "./OfficeTeamSiteSettings";
import OfficeTeamPlansScreen from "./OfficeTeamPlansScreen";
import OfficeTeamReadinessScreen from "./OfficeTeamReadinessScreen";
import OfficeTeamTodayScreen from "./OfficeTeamTodayScreen";
import OfficeTeamOwnerNavigation from "./OfficeTeamOwnerNavigation";
import OfficeTeamContextStrip from "./OfficeTeamContextStrip";
import { WorkScreen, MoneyScreen, ClientsScreen, StaffScreen } from "./OfficeTeamOperationalScreens";
import { QuotesScreen, InvoicesScreen, IntegrationsScreen, HelpScreen } from "./OfficeTeamExtraScreens";
import { MessagesScreen, WorkerViewScreen } from "./OfficeTeamCommunicationScreens";
import { ScheduleScreen, AutomationScreen, PayrollScreen, BrandingScreen } from "./OfficeTeamBackOfficeScreens";
import { fetchOfficeTeamSnapshot, makeStatusCards, recordOfficeTeamDecision } from "./officeTeamApi";
import { BACKEND_COMMAND_EVENT, fetchBackendCommandAudit, fetchBackendCommandDecisions, readCachedBackendCommandDecisions, recordBackendCommandDecision, runBackendOfficeEngineScan } from "./OfficeTeamCommandApi";
import { fetchOfficeTeamCommandDrafts } from "./OfficeTeamCommandDrafts";
import { readOfficeTeamLocalActivityLog, readOfficeTeamLocalCommandQueue, recordOfficeTeamLocalActivity, removeOfficeTeamLocalCommand, subscribeOfficeTeamLocalActivity, subscribeOfficeTeamLocalCommand } from "./OfficeTeamLocalCommand";
import { readOfficeTeamApprovalTrail, recordOfficeTeamApprovalTrail, subscribeOfficeTeamApprovalTrail } from "./OfficeTeamApprovalTrail";

const BRAND_ICON = "/churvox-app-icon.svg?v=churvox-office-site-20260709";
const COMMAND_CARD_LIMIT = 3;
const SAFE_APPROVAL_TEXT = "Nothing was sent, synced, charged or filed.";
const RECORD_ONLY_TEXT = "Nothing was sent, synced, charged or changed.";
const MISSING_VALUE = "Not found — owner must enter";
const COMMAND_FAST_LOAD_BUILD = "churvox-command-instant-load-20260713d";
if (typeof window !== "undefined") window.__CHURVOX_COMMAND_FAST_LOAD_BUILD__ = COMMAND_FAST_LOAD_BUILD;

const screens = [
  ["today", "Today"], ["command", "Command"], ["work", "Work"], ["schedule", "Schedule"], ["clients", "Clients"],
  ["messages", "Messages"], ["worker", "Worker View"], ["quotes", "Quotes"], ["invoices", "Invoices"], ["money", "Money"],
  ["staff", "Staff"], ["payroll", "Payroll"], ["team", "Office Team"], ["playbooks", "Playbooks"], ["integrations", "Integrations"],
  ["activity", "Activity"], ["automation", "Automation"], ["branding", "Branding"], ["settings", "Settings"], ["plans", "Plans"],
  ["help", "Help"], ["readiness", "Readiness"], ["safety", "Safety"],
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
  decision("starter-1", "Money", "Bookkeeper", "Top priority", "Completed service has an extra-work decision", "A completion note mentions extra work but the amount needs confirmation.", ["completion status", "staff note", "invoice not sent"], "A cautious invoice draft is ready with the uncertain amount left for review.", "Approve this draft direction, enter the missing amount, ask staff, or park it?", ["Approve draft", "Ask staff", "Park"]),
  decision("starter-2", "Bookings", "Receptionist", "Next", "Regular client has no next booking", "A repeat client has no future appointment and the usual cycle needs confirmation.", ["last visit", "recurring rule", "future booking check"], "A rebooking plan is ready with the date left editable.", "Approve the prepared booking plan, choose the date, ask the client, or park it?", ["Approve plan", "Ask client later", "Park"]),
  decision("starter-3", "Staff", "Payroll Clerk", "Needs check", "Hours review has one unusual timer", "One timer differs from the worker’s normal pattern.", ["period", "worker history", "timer note"], "An hours review is ready and the unusual timer is flagged.", "Approve the review direction, ask staff, or park it?", ["Approve review", "Ask staff", "Park"]),
  decision("starter-4", "Clients", "Client Memory", "Low risk", "Service note may help future work", "A service note contains a potentially useful client preference.", ["source note", "sensitivity", "duplicate check"], "A client-memory draft is ready.", "Save this memory, ignore it, or park it?", ["Save client memory", "Ignore", "Park"]),
  decision("starter-5", "Quality", "Quality Checker", "Parkable", "Completed work is missing proof", "A completed work record is missing final evidence.", ["completion status", "proof fields"], "A specific staff request is ready.", "Approve the proof request, clear it personally, or park it?", ["Approve proof request", "Clear personally", "Park"]),
  decision("starter-6", "Accounting", "Accountant", "Accounting check", "GST and accounting review needs approval", "A completed invoice is ready, but tax treatment and export readiness need checking.", ["GST rate", "tax treatment", "export status", "sync locked"], "An accounting review slip is ready for owner approval.", "Approve the accounting review, return it to Bookkeeper, export later, or park it?", ["Approve review", "Send to Bookkeeper", "Export later", "Park"]),
  decision("starter-7", "Operations", "Operations Manager", "Pattern", "Repeat work may need a rule", "The same missing admin step has appeared more than once.", ["pattern count", "affected areas", "current process"], "A process-rule suggestion is ready.", "Approve the process draft, review it later, or park it?", ["Approve process draft", "Review later", "Park"]),
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
  const ownerPath = typeof window !== "undefined" ? String(window.location.pathname || "") : "";
  const isOwnerApp = appMode === "owner" || ownerPath === "/dashboard" || ownerPath.startsWith("/dashboard/");
  const [screen, setScreen] = useState(() => cleanScreen(window.location.hash));
  const [tray, setTray] = useState("command");
  const [activeRole, setActiveRole] = useState("Office Manager");
  const initialCachedCommand = isOwnerApp ? readCachedBackendCommandDecisions() : null;
  const [snapshot, setSnapshot] = useState({ source: "starter", decisions: [] });
  const [backendCommand, setBackendCommand] = useState(initialCachedCommand || { source: "command-unavailable", decisions: [] });
  const [backendAudit, setBackendAudit] = useState({ source: "command-audit-unavailable", audit: [] });
  const [commandLoading, setCommandLoading] = useState(isOwnerApp && !initialCachedCommand);
  const [liveDrafts, setLiveDrafts] = useState([]);
  const [localQueue, setLocalQueue] = useState(() => readOfficeTeamLocalCommandQueue());
  const [localActivity, setLocalActivity] = useState(() => readOfficeTeamLocalActivityLog());
  const [approvalTrail, setApprovalTrail] = useState(() => readOfficeTeamApprovalTrail());
  const [notice, setNotice] = useState(isOwnerApp ? "Owner workspace ready. Churvox is checking the business and preparing only the decisions that need you." : "Churvox control centre ready. Sign in as an owner to load live decisions.");
  const [resolved, setResolved] = useState({});

  useEffect(() => {
    let mounted = true;
    let scanTimer = null;

    if (typeof window !== "undefined") {
      window.__CHURVOX_COMMAND_LOAD_STATE__ = {
        build: COMMAND_FAST_LOAD_BUILD,
        appMode,
        ownerPath,
        isOwnerApp,
        branch: isOwnerApp ? "owner-queue" : "lab-preview",
        mountedAt: Date.now(),
      };
    }

    if (isOwnerApp) {
      const cachedCommand = readCachedBackendCommandDecisions();
      if (cachedCommand) {
        setBackendCommand(cachedCommand);
        setCommandLoading(false);
        setNotice("Command is open from the last confirmed queue. Churvox is refreshing live records behind it.");
      } else {
        setCommandLoading(true);
        setNotice("Opening the current Command queue. The full business check will continue behind it.");
      }

      const loadCurrentQueue = async ({ afterScan = false, scan = null, timeoutMs = 3000, attempts = 1, force = false } = {}) => {
        try {
          if (typeof window !== "undefined") window.__CHURVOX_COMMAND_LOAD_STATE__ = { ...(window.__CHURVOX_COMMAND_LOAD_STATE__ || {}), queueRequestedAt: Date.now() };
          const command = await fetchBackendCommandDecisions({ timeoutMs, attempts, force });
          if (!mounted) return null;
          const nextCommand = scan ? { ...command, scan } : command;
          setBackendCommand(nextCommand || { source: "command-unavailable", decisions: [] });
          setResolved({});
          if (typeof window !== "undefined") window.__CHURVOX_COMMAND_LOAD_STATE__ = { ...(window.__CHURVOX_COMMAND_LOAD_STATE__ || {}), queueResolvedAt: Date.now(), queueSource: command?.source || "unknown", queueCount: command?.decisions?.length || 0 };
          if (!afterScan) {
            if (command?.decisions?.length) setNotice("Command is open. The latest saved owner decisions are ready while Churvox checks for anything new.");
            else if (command?.source === "backend-command-clear") setNotice("The current Command queue is clear. Churvox is checking the live records for anything new.");
            else setNotice("The current Command queue could not be confirmed. Churvox is retrying the live check behind the screen.");
          }
          return command;
        } catch (error) {
          if (typeof window !== "undefined") window.__CHURVOX_COMMAND_LOAD_STATE__ = { ...(window.__CHURVOX_COMMAND_LOAD_STATE__ || {}), queueError: error?.message || "connection issue" };
          if (mounted && !afterScan) setNotice(cachedCommand
            ? `Command is showing the last confirmed queue. Live refresh is still retrying: ${error?.message || "connection issue"}.`
            : `Command opened without waiting for the slow service. Live refresh is still retrying: ${error?.message || "connection issue"}. Nothing was changed.`);
          return null;
        } finally {
          if (mounted && !afterScan) setCommandLoading(false);
        }
      };

      const queuePromise = loadCurrentQueue({ timeoutMs: 3000, attempts: 1 });

      fetchBackendCommandAudit()
        .then((audit) => { if (mounted && audit) setBackendAudit(audit); })
        .catch(() => {});

      queuePromise.finally(() => {
        if (!mounted) return;
        scanTimer = window.setTimeout(async () => {
          try {
            const scan = await runBackendOfficeEngineScan();
            if (!mounted) return;
            const command = await loadCurrentQueue({ afterScan: true, scan, timeoutMs: 8000, attempts: 1, force: true });
            if (!mounted) return;
            const createdCount = Number(scan?.createdCount || 0);
            const existingCount = Number(scan?.existingCount || 0);
            const scanErrors = Array.isArray(scan?.scanErrors) ? scan.scanErrors : [];
            if (scanErrors.length) setNotice(`Current queue is open, but ${scanErrors.length} live data source${scanErrors.length === 1 ? "" : "s"} could not be checked. Do not treat an empty queue as all clear.`);
            else if (createdCount) setNotice(`Churvox prepared ${createdCount} new Command decision${createdCount === 1 ? "" : "s"}. Open the first slip and correct anything that is not right.`);
            else if (existingCount || command?.decisions?.length) setNotice(`${command?.decisions?.length || existingCount} Command decision${(command?.decisions?.length || existingCount) === 1 ? " is" : "s are"} waiting for you.`);
            else setNotice("Churvox checked the live records. Nothing needs your decision right now.");
          } catch (error) {
            if (mounted) setNotice(`The current queue is open. The background business check could not finish: ${error?.message || "connection issue"}. Nothing was changed.`);
          }
        }, 900);
      });

      return () => {
        mounted = false;
        if (scanTimer) window.clearTimeout(scanTimer);
      };
    }

    setCommandLoading(false);
    Promise.allSettled([fetchOfficeTeamSnapshot(), fetchOfficeTeamCommandDrafts()])
      .then(([snapshotResult, draftResult]) => {
        if (!mounted) return;
        const data = snapshotResult.status === "fulfilled" ? snapshotResult.value : { source: "starter", decisions: [] };
        const drafts = draftResult.status === "fulfilled" && Array.isArray(draftResult.value) ? draftResult.value : [];
        setSnapshot(data || { source: "starter", decisions: [] });
        setLiveDrafts(drafts);
        setResolved({});
        if (data?.source === "admin-brain") setNotice("Live office check loaded. Owner approval still comes first.");
        else if (drafts.length) setNotice("Live read-only records are prepared for Command. Nothing has been sent, synced or changed.");
        else if (data?.source === "clear-live") setNotice("Live check is clear. Command stays ready for the next decision.");
        else setNotice("Churvox control centre loaded. Live decisions appear when work needs owner approval.");
      })
      .catch((error) => mounted && setNotice(`Churvox control centre. Live check unavailable: ${error?.message || "connection issue"}`));

    return () => { mounted = false; };
  }, [isOwnerApp, appMode, ownerPath]);

  useEffect(() => {
    if (!isOwnerApp) return () => {};
    const refreshBackendCommand = () => {
      fetchBackendCommandDecisions({ timeoutMs: 8000, attempts: 2, force: true })
        .then((command) => {
          setBackendCommand(command || { source: "command-unavailable", decisions: [] });
          setResolved({});
          setNotice(command?.decisions?.length ? "Command refreshed. A prepared decision is waiting for you." : "Command refreshed. Nothing needs your decision right now.");
        })
        .catch(() => setNotice("Command refresh failed. No fallback or browser-only decisions are being shown. Nothing changed."));
      fetchBackendCommandAudit().then((audit) => { if (audit) setBackendAudit(audit); }).catch(() => {});
    };
    window.addEventListener(BACKEND_COMMAND_EVENT, refreshBackendCommand);
    return () => window.removeEventListener(BACKEND_COMMAND_EVENT, refreshBackendCommand);
  }, [isOwnerApp]);

  useEffect(() => {
    if (!isOwnerApp || screen !== "command") return () => {};
    let active = true;
    let inFlight = false;
    const refreshOpenCommand = async () => {
      if (!active || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const command = await fetchBackendCommandDecisions({ timeoutMs: 8000, attempts: 2, force: true });
        if (!active) return;
        setBackendCommand(command || { source: "command-unavailable", decisions: [] });
        setResolved({});
        if (typeof window !== "undefined") window.__CHURVOX_COMMAND_LIVE_REFRESH__ = {
          build: "churvox-command-open-live-refresh-v11-20260713",
          refreshedAt: Date.now(),
          count: command?.decisions?.length || 0,
          source: command?.source || "unknown",
        };
      } catch (error) {
        if (active && typeof window !== "undefined") window.__CHURVOX_COMMAND_LIVE_REFRESH__ = {
          build: "churvox-command-open-live-refresh-v11-20260713",
          failedAt: Date.now(),
          error: error?.message || "connection issue",
        };
      } finally {
        inFlight = false;
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "hidden") refreshOpenCommand();
    };
    refreshOpenCommand();
    const timer = window.setInterval(refreshOpenCommand, 5000);
    window.addEventListener("focus", refreshOpenCommand);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshOpenCommand);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [isOwnerApp, screen]);

  useEffect(() => isOwnerApp ? () => {} : subscribeOfficeTeamLocalCommand(setLocalQueue), [isOwnerApp]);
  useEffect(() => isOwnerApp ? () => {} : subscribeOfficeTeamLocalActivity(setLocalActivity), [isOwnerApp]);
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
    const backendDecisions = Array.isArray(backendCommand.decisions) ? backendCommand.decisions : [];
    if (isOwnerApp) return backendDecisions;
    const baseDecisions = snapshot.decisions?.length ? snapshot.decisions : liveDrafts.length ? liveDrafts : starterDecisions;
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
    setNotice(`${action} is being recorded as the owner decision.`);

    if (isOwnerApp && item?.raw?.source !== "backend_command_slip") {
      setResolved((current) => { const copy = { ...current }; delete copy[id]; return copy; });
      setNotice("That item is not a confirmed live Command slip, so Churvox did not record or apply the decision.");
      return;
    }

    if (String(id || "").startsWith("local-command-")) {
      const activity = recordOfficeTeamLocalActivity("Cleared", item, action);
      const trail = recordOfficeTeamApprovalTrail(item, action, trailNote);
      const next = removeOfficeTeamLocalCommand(id);
      setLocalQueue(next);
      setLocalActivity(activity);
      setApprovalTrail(trail);
      setNotice(`${action} recorded in the control preview. ${RECORD_ONLY_TEXT}`);
      return;
    }

    if (item?.raw?.source === "backend_command_slip") {
      try {
        const commandResult = await recordBackendCommandDecision(item, action, {
          note: ownerNote || "Owner approved the edited Command form.",
          ownerNote,
          fields: Array.isArray(detail.fields) ? detail.fields : [],
          formTitle: detail.formTitle || makeSlipFormTitle(item),
        });
        const applied = Boolean(commandResult?.result?.execution?.applied);
        const safety = cleanText(commandResult?.safety || (applied ? SAFE_APPROVAL_TEXT : RECORD_ONLY_TEXT));
        const trail = recordOfficeTeamApprovalTrail(item, action, ownerNote ? `Command recorded · ${ownerNote}` : applied ? "Approved draft applied" : "Command recorded");
        setApprovalTrail(trail);
        const [audit, command] = await Promise.all([
          fetchBackendCommandAudit().catch(() => null),
          fetchBackendCommandDecisions().catch(() => null),
        ]);
        if (audit) setBackendAudit(audit);
        if (command) setBackendCommand(command);
        setNotice(applied
          ? `${action} approved. Churvox created the owner-approved internal draft from the edited form. ${safety}`
          : `${action} recorded in Command with the edited form. ${safety}`);
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
      setNotice(`${action} recorded safely for the control preview. ${RECORD_ONLY_TEXT}`);
    } catch {
      setResolved((current) => { const copy = { ...current }; delete copy[id]; return copy; });
      const trail = recordOfficeTeamApprovalTrail(item, action, "Returned to Command");
      setApprovalTrail(trail);
      setNotice(`Could not record ${action}. The item returned to Command. ${RECORD_ONLY_TEXT}`);
    }
  }

  return (
    <main className={`cvOfficeFinal cvOfficeSite ${isOwnerApp ? "cvOwnerReady" : "cvLabPreview"}`} data-screen={screen}>
      <Topbar screen={screen} go={go} appMode={appMode} pendingCount={pending.length} />
      {screen === "today"
        ? <Status metrics={metrics} sourceLabel={sourceLabel} notice={notice} appMode={appMode} />
        : <OfficeTeamContextStrip screen={screen} pendingCount={pending.length} notice={notice} go={go} />}
      <div className="cvSiteScreenDeck">
        <ScreenRouter screen={screen} appMode={appMode} metrics={metrics} pending={pending} resolved={resolved} localQueue={isOwnerApp ? [] : localQueue} localActivity={isOwnerApp ? [] : localActivity} approvalTrail={approvalTrail} backendAudit={backendAudit.audit || []} commandLoading={commandLoading} go={go} tray={tray} setTray={setTray} counts={counts} onAction={actionDecision} activeRole={activeRole} setActiveRole={setActiveRole} />
      </div>
    </main>
  );
}

function ScreenRouter(props) {
  const { screen, appMode } = props;
  if (screen === "today") return <OfficeTeamTodayScreen {...props} />;
  if (screen === "command") return <Command {...props} />;
  if (screen === "work") return <WorkScreen appMode={appMode} />;
  if (screen === "schedule") return <ScheduleScreen appMode={appMode} />;
  if (screen === "clients") return <ClientsScreen appMode={appMode} />;
  if (screen === "messages") return <MessagesScreen appMode={appMode} />;
  if (screen === "worker") return <WorkerViewScreen appMode={appMode} />;
  if (screen === "quotes") return <QuotesScreen appMode={appMode} />;
  if (screen === "invoices") return <InvoicesScreen appMode={appMode} />;
  if (screen === "money") return <MoneyScreen appMode={appMode} />;
  if (screen === "staff") return <StaffScreen appMode={appMode} />;
  if (screen === "payroll") return <PayrollScreen appMode={appMode} />;
  if (screen === "team") return <Team {...props} />;
  if (screen === "playbooks") return <Playbooks />;
  if (screen === "integrations") return <IntegrationsScreen appMode={appMode} />;
  if (screen === "activity") return <Activity {...props} />;
  if (screen === "automation") return <AutomationScreen appMode={appMode} />;
  if (screen === "branding") return <BrandingScreen appMode={appMode} />;
  if (screen === "settings") return <OfficeTeamSiteSettings />;
  if (screen === "plans") return <OfficeTeamPlansScreen />;
  if (screen === "help") return <HelpScreen />;
  if (screen === "readiness") return <OfficeTeamReadinessScreen />;
  if (screen === "safety") return <Safety />;
  return <OfficeTeamTodayScreen {...props} />;
}

function Topbar({ screen, go, appMode, pendingCount }) {
  const isOwnerApp = appMode === "owner";
  const brand = "Churvox";
  const subline = isOwnerApp ? "Routine admin stays behind the scenes · you approve exceptions" : "Command-centred owner control";
  return (
    <header className="cvSiteTopbar">
      <div className="cvOfficeBrand"><img src={BRAND_ICON} alt="Churvox" /><div><strong>{brand}</strong><span>{subline}</span></div></div>
      {isOwnerApp
        ? <OfficeTeamOwnerNavigation screen={screen} go={go} pendingCount={pendingCount} />
        : <nav>{screens.map(([key, label]) => <button key={key} className={screen === key ? "active" : ""} onClick={() => go(key)}>{label}</button>)}</nav>}
      <button type="button" className="cvSiteLogout" data-churvox-native-logout="true" aria-label="Log out of Churvox" onClick={logoutOffice}>Log out</button>
    </header>
  );
}

function Status({ metrics, sourceLabel, notice, appMode }) {
  const isOwnerApp = appMode === "owner";
  const modeLabel = isOwnerApp ? "Today" : "Office running";
  const title = isOwnerApp ? "Churvox handles the admin. You handle the decisions." : "Churvox runs the office. The owner approves the decisions.";
  const text = isOwnerApp ? "Jobs, clients, workers, quotes, invoices and follow-ups are checked in the background. Only exceptions and approvals come back to you." : "Staff update the work. The office team checks what is missing, prepares the admin and brings decisions back to Command.";
  return <section className="cvSiteStatus"><div className="cvSiteStatusLead"><span>{modeLabel} · {sourceLabel}</span><h1>{title}</h1><p>{text}</p><small>{notice}</small></div>{metrics.map((m) => <article key={m.label}><strong>{m.value}</strong><span>{m.label}</span><small>{m.note}</small></article>)}</section>;
}

function commandQueuePriority(item = {}) {
  const level = String(item.level || "").toLowerCase();
  const raw = item.raw || {};
  const payload = raw.payload && typeof raw.payload === "object" ? raw.payload : {};
  if (raw.source_type === "worker_field_problem" || payload.worker_field_problem) return 100;
  if (/top priority|urgent|high/.test(level)) return 80;
  if (/accounting check|needs check/.test(level)) return 50;
  return 30;
}

function Command({ tray, setTray, counts, pending, onAction, commandLoading }) {
  const queueBase = tray === "command" ? pending : pending.filter((item) => trayKey(item.tray) === tray);
  const queue = [...queueBase].sort((left, right) => commandQueuePriority(right) - commandQueuePriority(left));
  const shown = queue.slice(0, COMMAND_CARD_LIMIT);
  const waiting = Math.max(0, queue.length - shown.length);
  const [selectedId, setSelectedId] = useState("");
  const selected = queue.find((item) => keyOf(item) === selectedId) || shown[0] || queue[0] || null;
  function act(item, action, detail) {
    onAction(item, action, detail);
    setSelectedId("");
  }
  return <section className="cvSiteScreen"><Header eyebrow="Command" title="Only the decisions that need the owner" text="Open the slip, check the evidence and correct anything wrong. Approval may create an internal Churvox draft; sending, syncing, charging, tax filing and payments stay locked." /><div className="cvSiteTrayRail">{departments.map(([key, label]) => <button key={key} className={tray === key ? "active" : ""} onClick={() => { setTray(key); setSelectedId(""); }}><strong>{counts[key] || 0}</strong><span>{label}</span></button>)}</div><div className="cvSiteQueueSummary"><strong>{shown.length} showing</strong><span>{queue.length} waiting</span><em>{waiting ? `${waiting} behind this set` : "queue clear after this set"}</em></div><div className="cvSiteCommandLayout"><div className="cvSiteDecisionGrid">{shown.length ? shown.map((item) => <Decision key={keyOf(item)} item={item} selected={keyOf(item) === keyOf(selected)} onOpen={() => setSelectedId(keyOf(item))} />) : commandLoading ? <Empty title="Opening current decisions" text="Churvox is loading the saved owner queue first. The full business check continues behind it." /> : <Empty title="No decisions in this tray" text="Routine work stays out of Command. A slip appears only when the owner is genuinely needed." />}</div><CommandSlip item={selected} onAction={act} /></div></section>;
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

  if (!item) return <aside className="cvCommandSlip"><span>Command slip</span><h3>No owner decision waiting</h3><p>Routine admin remains behind the scenes. A full decision slip opens here only when Churvox needs the owner.</p></aside>;

  const formTitle = makeSlipFormTitle(item);
  const source = item.raw?.source === "backend_command_slip" ? "Live Command" : String(itemKey).startsWith("local-command-") ? "Control preview" : "Imported prepared item";
  const finalAction = selectedAction || actions[0] || "Approve record";
  const effects = makeApprovalEffects(item, draftFields);
  const submit = (action = finalAction) => onAction(item, action, { ownerNote, fields: draftFields, formTitle });
  const changeField = (index, value) => setDraftFields((current) => current.map((field, i) => i === index ? { ...field, value } : field));

  return <aside className="cvCommandSlip cvCommandSlipPlain" aria-label="Command decision slip">
    <div className="cvCommandSlipTop"><span>Command slip</span><em>{item.level || "Review"}</em></div>
    <h3>{item.title}</h3>
    <p className="cvSlipPlainSummary">{plainSlipSummary(item)}</p>
    {Array.isArray(item.checked) && item.checked.length ? <section className="cvSlipEvidence"><b>Evidence checked</b><div>{item.checked.slice(0, 5).map((entry, index) => <span key={`${entry}-${index}`}>{briefDecisionText(entry, 72)}</span>)}</div></section> : null}
    <div className="cvCommandSlipMeta"><b>{item.roleName || item.tray || "Churvox"}</b><small>{item.tray || "Command"}</small><small>{source}</small></div>

    <section className="cvSlipForm" aria-label="Editable prepared approval form">
      <div><span>Prepared form</span><h4>{formTitle}</h4><p>Every value must come from the record or stay visibly unresolved. Edit the draft, then approve only when it is right.</p></div>
      <div className="cvSlipFieldGrid cvSlipEditableGrid">{draftFields.map((field, index) => <label key={`${field.label}-${index}`}><span>{field.label}</span>{field.long ? <textarea value={field.value || ""} onChange={(event) => changeField(index, event.target.value)} /> : <input value={field.value || ""} onChange={(event) => changeField(index, event.target.value)} />}</label>)}</div>
    </section>

    <section className="cvSlipWillDo"><b>If you approve this</b>{effects.map((effect) => <p key={effect}>{effect}</p>)}</section>

    <label className="cvSlipOwnerBox"><span>Owner note / instruction</span><textarea value={ownerNote} onChange={(event) => setOwnerNote(event.target.value)} placeholder="Add only the correction or direction Churvox still needs." /></label>

    <section className="cvCommandSlipSafety"><b>Safety locks</b><span>No auto-send</span><span>No auto-sync</span><span>No auto-charge</span><span>No record change without approval</span></section>

    <footer className="cvSlipDecisionActions">{actions.map((action, i) => <button key={action} type="button" className={i === 0 ? "primary" : ""} onClick={() => { setSelectedAction(action); submit(action); }}>{action}</button>)}</footer>
    <small className="cvSlipNote">Approval sends the edited form to the owner-approved draft executor. External sends, syncs, charges, tax filing and payments remain locked.</small>
  </aside>;
}

function Team({ activeRole, setActiveRole, appMode }) {
  const ownerMode = appMode === "owner" || isOwnerRoute();
  const selected = roles.find((item) => item.name === activeRole) || roles[0];
  return <section className="cvSiteScreen"><Header eyebrow={ownerMode ? "How Churvox works" : "Office Team"} title="Eight clear roles, one owner decision desk" text={ownerMode ? "These roles are the hidden admin engine. The owner does not manage pretend staff or switch experimental modes; Churvox checks records, prepares the work and sends genuine exceptions to Command." : "Each role has one job: check records, prepare the right slip, and bring the owner a clear decision."} /><div className="cvSiteTeamLayout"><aside className="cvSiteRoleList">{roles.map((item) => <button key={item.name} className={selected.name === item.name ? "active" : ""} onClick={() => setActiveRole(item.name)}><strong>{item.name}</strong><span>{item.summary}</span></button>)}</aside><article className="cvSiteRoleDetail"><span>{selected.dept}</span><h2>{selected.name}</h2><p>{selected.summary}</p><div className="cvSiteRoleColumns"><Info title="Checks" items={selected.checks} /><Info title="Prepares" items={selected.prepares} /><section><h3>Owner question</h3><p>{selected.ownerAsk}</p></section><section><h3>Sends to</h3><p>{selected.feeds}</p></section><section><h3>Guardrail</h3><p>{selected.guard}</p></section></div></article>{ownerMode ? <section className="cvOwnerRoleTruth"><span>Owner experience</span><h3>You should not have to operate the office team</h3><p>Churvox decides which role should inspect a record. The owner sees the evidence-backed result in Command, corrects anything wrong and approves only when needed.</p><p>Role behaviour is not changed from this explanation page. Any future control will be added only when it genuinely changes the live engine.</p></section> : <OfficeTeamRoleControls roles={roles} />}</div></section>;
}

function Playbooks() {
  return <section className="cvSiteScreen"><Header eyebrow="Playbooks" title="Same system, different business wording" text="Churvox should fit the business language instead of forcing every business to sound the same." /><div className="cvSitePlaybookGrid">{playbooks.map(([name, work, staff, customer, examples]) => <article key={name}><span>{name}</span><dl><div><dt>Work</dt><dd>{work}</dd></div><div><dt>Staff</dt><dd>{staff}</dd></div><div><dt>Customer</dt><dd>{customer}</dd></div></dl><small>{examples}</small></article>)}</div></section>;
}

function Activity({ pending, resolved, localActivity = [], approvalTrail = [], backendAudit = [] }) {
  const ownerRoute = isOwnerRoute();
  const cleared = Object.entries(resolved);
  if (ownerRoute) {
    return <section className="cvSiteScreen"><Header eyebrow="Activity" title="A truthful record of what Churvox did" text="This page shows the live Command trail and current owner queue. Browser-only preview activity and raw record IDs are not shown in the owner workspace." /><div className="cvSiteActivityLayout"><section><h2>Waiting now</h2>{pending.length ? pending.slice(0, 8).map((item) => <article key={keyOf(item)}><strong>{item.roleName || item.tray}</strong><p>{item.title}</p><small>Waiting in {item.tray || "Command"}</small></article>) : <Empty title="Nothing waiting" text="Command is clear." />}</section><section><h2>Command history</h2>{backendAudit.length ? backendAudit.slice(0, 12).map((item, index) => <article key={item.id || `${item.title}-${index}`}><strong>{item.status || item.action || "Recorded"}</strong><p>{item.title || "Command decision"}</p><small>{item.safety || item.detail || "Recorded safely"}</small></article>) : <Empty title="No Command history yet" text="Live approvals, parked decisions and superseded slips will appear here." />}</section><section><h2>This session</h2>{cleared.length ? cleared.map(([id, action]) => <article key={id}><strong>{action}</strong><p>Decision removed from the current queue.</p><small>Command refresh confirms the lasting result.</small></article>) : <Empty title="No decisions cleared this session" text="Open Command when a real decision needs you." />}</section></div></section>;
  }
  return <section className="cvSiteScreen"><Header eyebrow="Activity" title="Office activity and approval trail" text="A clear log of checked, prepared, parked and owner-reviewed work." /><div className="cvSiteActivityLayout"><section><h2>Waiting now</h2>{pending.slice(0, 8).map((item) => <article key={keyOf(item)}><strong>{item.roleName || item.tray}</strong><p>{item.title} waiting in Command.</p><small>{item.tray}</small></article>)}</section><section><h2>Command record</h2>{backendAudit.length ? backendAudit.slice(0, 8).map((item) => <article key={item.id}><strong>{item.status}</strong><p>{item.title}</p><small>{item.safety}</small></article>) : <Empty title="No Command records yet" text="Command approvals will appear here after the owner reviews prepared work." />}</section><section><h2>Owner approval trail</h2>{approvalTrail.length ? approvalTrail.slice(0, 8).map((item) => <article key={item.id}><strong>{item.status} · {item.action}</strong><p>{item.title}</p><small>{item.safety}</small></article>) : <Empty title="No owner decisions yet" text="Action a Command card and the approval trail will appear here." />}</section><section><h2>Prepared work trail</h2>{localActivity.length ? localActivity.slice(0, 8).map((item) => <article key={item.id}><strong>{item.status} · {item.tray}</strong><p>{item.title}</p><small>{item.note}</small></article>) : <Empty title="No prepared work trail yet" text="Prepared work will appear here as Churvox brings items back to Command." />}</section><section><h2>Cleared this session</h2>{cleared.length ? cleared.map(([id, action]) => <article key={id}><strong>{action}</strong><p>Moved out of Command.</p></article>) : <Empty title="Nothing cleared yet" text="Action a Command card and it will appear here." />}</section></div></section>;
}

function Safety() {
  return <section className="cvSiteScreen"><Header eyebrow="Safety" title="Owner-control rules" text="Owner approval first. Safe recording second. Nothing moves without a clear decision." /><div className="cvSiteSafetyGrid">{safetyRules.map((rule, index) => <article key={rule}><strong>{index + 1}</strong><p>{rule}</p></article>)}</div><div className="cvSiteBuildSteps"><span>Control path</span><strong>How Churvox keeps the owner in charge</strong><p>Every screen follows the same rule: prepare the work, bring the decision to Command, and wait for owner approval.</p><ol><li>Start with Today as the owner control screen.</li><li>Keep Command as the approval queue.</li><li>Match wording to the business type.</li><li>Record every owner decision in Activity.</li><li>Keep worker updates simple and phone-friendly.</li><li>Keep money and sync actions approval-only.</li></ol></div></section>;
}

function Header({ eyebrow, title, text }) { return <header className="cvSiteScreenHeader"><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></header>; }
function Decision({ item, onOpen, selected }) {
  const happened = briefDecisionText(item.happened, 96);
  const prepared = briefDecisionText(item.prepared, 88);
  const need = briefDecisionText(item.need, 88);
  return <article className={`cvSiteDecisionCard ${selected ? "selected" : ""}`}><div><span>{item.level}</span><em>{item.tray}</em></div><h3>{item.title}</h3><p>{happened}</p><dl><dt>Checked</dt><dd>{(item.checked || []).slice(0, 5).map((x, index) => <small key={`${x}-${index}`}>{briefDecisionText(x, 64)}</small>)}</dd><dt>Prepared</dt><dd>{prepared}</dd><dt>Owner decision</dt><dd>{need}</dd></dl><footer><button type="button" className="openSlip" onClick={onOpen}>Open slip</button></footer></article>;
}
function Info({ title, items }) { return <section><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>; }
function Empty({ title, text }) { return <article className="cvSiteEmpty"><strong>{title}</strong><p>{text}</p></article>; }
function role(name, dept, summary, checks, prepares, ownerAsk, feeds, guard) { return { name, dept, summary, checks, prepares, ownerAsk, feeds, guard }; }
function decision(id, tray, roleName, level, title, happened, checked, prepared, need, actions) { return { id, tray, roleName, level, title, happened, checked, prepared, need, actions }; }
function keyOf(item = {}) { return item.id || item.action_id || item.title; }
function trayKey(tray = "") { const t = String(tray).toLowerCase(); if (t.includes("account")) return "accounting"; if (t.includes("xero")) return "accounting"; if (t.includes("money")) return "money"; if (t.includes("booking")) return "bookings"; if (t.includes("staff")) return "staff"; if (t.includes("client")) return "clients"; if (t.includes("quality")) return "quality"; if (t.includes("operation")) return "ops"; return "command"; }
function countDepartments(items = []) { return items.reduce((acc, item) => { acc.command += 1; acc[trayKey(item.tray)] = (acc[trayKey(item.tray)] || 0) + 1; return acc; }, { command: 0, money: 0, accounting: 0, bookings: 0, staff: 0, clients: 0, quality: 0, ops: 0 }); }
function cleanScreen(hash) { const key = String(hash || "").replace("#", "").trim().toLowerCase(); return screenAliases[key] || "today"; }
function makeSourceLabel({ isOwnerApp, backendCommand, snapshot, liveDrafts }) { if (isOwnerApp && backendCommand?.source === "backend-command") return "Command live"; if (isOwnerApp && backendCommand?.source === "backend-command-clear") return "Command clear"; if (isOwnerApp) return "Command unavailable"; if (snapshot?.source === "admin-brain") return "live check"; if (liveDrafts?.length) return "live rows"; return "control mode"; }
function isOwnerRoute() { return typeof window !== "undefined" && window.location.pathname.includes("dashboard"); }
function logoutOffice() { try { localStorage.removeItem("token"); localStorage.removeItem("owner_portal_session"); localStorage.removeItem("platform_owner_email"); sessionStorage.clear(); } catch {} window.location.href = "/login"; }
function cleanText(value) { return String(value || "").trim(); }
function firstValue(...values) { return values.map(cleanText).find(Boolean) || ""; }
function payloadOf(item = {}) { return item?.raw?.payload && typeof item.raw.payload === "object" ? item.raw.payload : {}; }
function briefDecisionText(value, limit = 96) {
  const raw = cleanText(value).replace(/\s+/g, " ");
  const concise = raw.split(/\bEvidence used:/i)[0].trim() || raw;
  if (!concise) return "Owner review needed.";
  return concise.length > limit ? `${concise.slice(0, Math.max(1, limit - 1)).trimEnd()}…` : concise;
}
function plainSlipSummary(item = {}) { return briefDecisionText(firstValue(item.happened, item.detail, item.raw?.found, "Churvox found something that needs an owner decision."), 108); }
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
  const roleName = firstValue(item.roleName, payload.office_role, item.tray, "Churvox");
  const record = firstValue(payload.record_title, payload.job_title, raw.title, item.title, "Selected record");
  if (form.includes("booking")) return [
    field("Prepared by", roleName), field("Client", firstValue(payload.customer, payload.client, payload.name, MISSING_VALUE)), field("Usual cycle", firstValue(payload.cycle, payload.frequency, payload.recurrence, MISSING_VALUE)), field("Last visit", firstValue(payload.last_visit, payload.last_date, MISSING_VALUE)), field("Suggested next booking", firstValue(payload.next_date, payload.suggested_date, MISSING_VALUE)), field("Worker", firstValue(payload.worker, payload.worker_name, MISSING_VALUE)), field("Prepared message", firstValue(payload.message, payload.prepared_message, MISSING_VALUE), true), field("Evidence note", plainSlipSummary(item), true),
  ];
  if (form.includes("invoice") || form.includes("payment")) return [
    field("Prepared by", roleName), field("Client", firstValue(payload.customer, payload.client, payload.customer_name, MISSING_VALUE)), field("Job", record), field("Line items", firstValue(payload.line_items, payload.items, MISSING_VALUE), true), field("Draft total", firstValue(payload.amount, payload.amount_due, payload.total, MISSING_VALUE)), field("Payment link", firstValue(payload.payment_link, "Locked until a separate owner action")), field("Invoice note", firstValue(payload.invoice_note, payload.note, MISSING_VALUE), true),
  ];
  if (form.includes("hours")) return [
    field("Prepared by", roleName), field("Worker", firstValue(payload.worker, payload.worker_name, payload.staff, MISSING_VALUE)), field("Job / shift", record), field("Recorded time", firstValue(payload.hours, payload.duration, MISSING_VALUE)), field("Expected time", firstValue(payload.expected_hours, payload.baseline, MISSING_VALUE)), field("Issue", plainSlipSummary(item), true), field("Staff note", firstValue(payload.note, payload.worker_note, MISSING_VALUE), true),
  ];
  if (form.includes("client")) return [
    field("Prepared by", roleName), field("Client", firstValue(payload.customer, payload.client, payload.name, record)), field("Detail to save", firstValue(payload.note, payload.notes, payload.memory, MISSING_VALUE), true), field("Source", firstValue(raw.source_type, item.tray, MISSING_VALUE)), field("Use for", firstValue(payload.use_for, "Future work only where relevant")),
  ];
  if (form.includes("quality")) return [
    field("Prepared by", roleName), field("Job", record), field("Missing evidence", firstValue(payload.missing, payload.missing_evidence, plainSlipSummary(item)), true), field("Staff request", firstValue(payload.staff_request, payload.request, MISSING_VALUE), true), field("Invoice hold", firstValue(payload.invoice_hold, "Owner decides after reviewing the evidence")),
  ];
  if (form.includes("accounting")) return [
    field("Prepared by", roleName), field("System", firstValue(payload.system, MISSING_VALUE)), field("Record", record), field("GST / code", firstValue(payload.gst, payload.tax, payload.code, MISSING_VALUE)), field("Export status", firstValue(payload.status, payload.export_status, MISSING_VALUE)), field("Accounting note", firstValue(payload.note, payload.accounting_note, MISSING_VALUE), true),
  ];
  if (form.includes("reply")) return [
    field("Prepared by", roleName), field("Client", firstValue(payload.customer, payload.client, MISSING_VALUE)), field("Original message", firstValue(payload.message, payload.original_message, plainSlipSummary(item)), true), field("Prepared reply", firstValue(payload.reply, payload.prepared_reply, MISSING_VALUE), true), field("Send status", "Locked until a separate owner-approved send action"),
  ];
  return [field("Prepared by", roleName), field("Area", firstValue(item.tray, raw.source_type, MISSING_VALUE)), field("Record", record), field("Status", firstValue(payload.status, raw.status, item.level, MISSING_VALUE)), field("Prepared action", firstValue(payload.prepared_action, item.prepared, MISSING_VALUE), true)];
}
function objectFormFields(item, form = {}) {
  const base = [field("Prepared by", firstValue(item.roleName, payloadOf(item).office_role, item.tray, "Churvox"))];
  const rows = Object.entries(form).filter(([, value]) => value !== undefined && value !== null && value !== "").slice(0, 30).map(([key, value]) => field(labelize(key), displayValue(value), shouldUseLongField(key, value)));
  return [...base, ...rows];
}
function makeApprovalEffects(item = {}, fields = []) {
  const payload = payloadOf(item);
  const fromPayload = item.willDo || payload.will_do || item.raw?.will_do;
  if (Array.isArray(fromPayload) && fromPayload.length) return fromPayload.map(displayValue);
  const form = makeSlipFormTitle(item).toLowerCase();
  if (form.includes("booking")) return ["Save the booking/rebooking draft", "Keep customer messages unsent until a separate owner action", "Record the owner approval trail"];
  if (form.includes("invoice") || form.includes("payment")) return ["Save the invoice/payment draft", "Keep invoice send, sync and charge locked", "Use the edited fields above as the approved draft"];
  if (form.includes("hours")) return ["Save the hours review draft", "No payroll payment, tax filing or bank file is created", "Use the edited notes for staff follow-up"];
  if (form.includes("client")) return ["Prepare the client memory update", "Do not overwrite the live client record blindly", "Keep an audit note of what was approved"];
  if (form.includes("quality")) return ["Prepare the staff proof request", "Hold completion/invoice decisions until proof is checked", "Record what the owner approved"];
  if (form.includes("accounting")) return ["Save accounting review notes", "Do not sync Xero/MYOB or file tax", "Return corrections to Bookkeeper if needed"];
  return fields.length ? ["Use the edited form as the approved internal draft", "Record the owner decision", "Keep send, sync and charge locked"] : ["Record the owner decision", "Nothing is sent, synced or charged"];
}
function field(label, value, long = false) { return { label, value: displayValue(value), long: long || shouldUseLongField(label, value) }; }
function displayValue(value) { if (Array.isArray(value)) return value.map(displayValue).join(" · "); if (value && typeof value === "object") return Object.entries(value).map(([k, v]) => `${labelize(k)}: ${displayValue(v)}`).join(" · "); return cleanText(value); }
function shouldUseLongField(label, value) { return /note|message|reply|line|scope|action|request|detail|issue|evidence/i.test(String(label || "")) || displayValue(value).length > 48; }
function labelize(key) { return String(key || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
