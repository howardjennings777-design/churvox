import React from "react";
import { useAuth } from "../context/AuthContext";
import "./fresh.css";
import "./freshAIActions.css";
import "./freshAIHub.css";
import "./freshAlerts.css";
import "./freshApprovals.css";
import "./freshAutomation.css";
import "./freshAvailability.css";
import "./freshBilling.css";
import "./freshClients.css";
import "./freshCommand.css";
import "./freshCommandDesk.css";
import "./freshDispatch.css";
import "./freshDocuments.css";
import "./freshExpenses.css";
import "./freshExports.css";
import "./freshExtras.css";
import "./freshFeedback.css";
import "./freshFlags.css";
import "./freshFollowUps.css";
import "./freshGps.css";
import "./freshImports.css";
import "./freshIntegrations.css";
import "./freshInventory.css";
import "./freshInvoices.css";
import "./freshJobs.css";
import "./freshJobsNeedsInvoice.css";
import "./freshLaunch.css";
import "./freshLeads.css";
import "./freshMessages.css";
import "./freshOnboarding.css";
import "./freshPayments.css";
import "./freshPayroll.css";
import "./freshPhotos.css";
import "./freshPlans.css";
import "./freshProfit.css";
import "./freshQuality.css";
import "./freshQuotes.css";
import "./freshRecurring.css";
import "./freshReports.css";
import "./freshReviews.css";
import "./freshRoadmap.css";
import "./freshRoutes.css";
import "./freshSafety.css";
import "./freshSearch.css";
import "./freshSearchReallyFinal.css";
import "./freshSearchTypingFix.css";
import "./freshSearchVisibleText.css";
import "./freshSecurity.css";
import "./freshTrustCenter.css";
import "./freshHelpDesk.css";
import "./freshServices.css";
import "./freshSettingsLive.css";
import "./freshSetup.css";
import "./freshSmartHub.css";
import "./freshSmartCoreFlow.css";
import "./freshTellLauncher.css";
import "./freshOwnerAiNext.css";
import "./freshCommandOwnerDesk.css";
import "./freshAiOperatorStudio.css";
import "./freshAiQuickCreate.css";
import "./freshAiFollowUpWriter.css";
import "./freshPlanMyDay.css";
import "./freshOperatorTools.css";
import "./freshSubcontractors.css";
import "./freshTeamLive.css";
import "./freshTemplates.css";
import "./freshTimeLogs.css";
import "./freshTopStatus.css";
import "./freshTopbar.css";
import "./freshTodaysWork.css";
import "./freshUltimateContrast.css";
import "./freshVariations.css";
import "./freshWarranties.css";
import FreshShell from "./FreshShell";
import FreshPlanGate from "./FreshPlanGate";
import FreshSimple from "./FreshSimple";
import FreshJobs from "./FreshJobs";
import FreshClients from "./FreshClients";
import FreshQuotes from "./FreshQuotes";
import FreshInvoices from "./FreshInvoices";
import FreshTeam from "./FreshTeam";
import FreshSettings from "./FreshSettings";
import FreshPlans from "./FreshPlans";
import FreshSupport from "./FreshSupport";
import FreshHelpDesk from "./FreshHelpDesk";
import FreshTrustCenter from "./FreshTrustCenter";
import FreshLaunchControl from "./FreshLaunchControl";
import FreshImports from "./FreshImports";
import FreshExports from "./FreshExports";
import FreshPayroll from "./FreshPayroll";
import FreshTimeLogs from "./FreshTimeLogs";
import FreshWorkerCommand from "./FreshWorkerCommand";
import FreshReports from "./FreshReports";
import FreshPayments from "./FreshPayments";
import FreshAutomation from "./FreshAutomation";
import FreshTopStatus from "./FreshTopStatus";
import FreshDocuments from "./FreshDocuments";
import FreshPhotos from "./FreshPhotos";
import FreshInventory from "./FreshInventory";
import FreshXero from "./FreshXero";
import FreshContractorHub from "./FreshContractorHub";
import FreshMessages from "./FreshMessages";
import FreshReviews from "./FreshReviews";
import FreshVariations from "./FreshVariations";
import FreshLeads from "./FreshLeads";
import FreshFeedback from "./FreshFeedback";
import FreshExpenses from "./FreshExpenses";
import FreshWarranties from "./FreshWarranties";
import FreshRecurring from "./FreshRecurring";
import FreshServices from "./FreshServices";
import FreshQuality from "./FreshQuality";
import FreshSafety from "./FreshSafety";
import FreshRoadmap from "./FreshRoadmap";
import FreshExtras from "./FreshExtras";
import FreshPlanMyDay from "./FreshPlanMyDay";
import FreshCommand from "./FreshCommand";
import FreshMaterialsReminder from "./FreshMaterialsReminder";
import FreshMaterialsAI from "./FreshMaterialsAI";
import FreshNz from "./FreshNz";
import FreshPortal from "./FreshPortal";
import { installPillContrastRuntime } from "./freshPillContrastRuntime";
import "./freshFinalContrastLock.css";
import "./freshPillContrastSystem.css";
import "./freshOwnerShellFinal.css";
import "./freshCommandOperatingSystem.css";
import "./freshCommandPreviewFix.css";

const PLAN_DAY_ALIASES = ["today", "todayswork", "worktoday", "smart", "hub", "dashboard", "calendar", "schedule", "dispatch", "routes"];
const COMMAND_ALIASES = ["askchurvox", "aioperatorstudio", "quickcreateai", "followupwriter", "quoteai", "invoicecheck", "workerbrief"];
const MESSAGE_ALIASES = ["inbox", "workermessages", "worker-messages", "workerinbox", "worker-inbox"];
const JOB_RECORD_ALIASES = ["topstatus", "documents", "photos", "inventory", "recurring", "services", "quality", "safety", "warranties", "materialsreminder", "materialsai", "extras"];
const CLIENT_RECORD_ALIASES = ["feedback", "reviews", "reviewbooster"];
const QUOTE_RECORD_ALIASES = ["variations"];
const PAYMENT_RECORD_ALIASES = ["expenses"];
const TEAM_RECORD_ALIASES = ["contractors", "subcontractors"];
const SUPPORT_ALIASES = ["help", "supportdesk", "support-desk", "contact", "contactsupport"];

const pages = {
  planday: FreshPlanMyDay,
  today: FreshPlanMyDay,
  todayswork: FreshPlanMyDay,
  worktoday: FreshPlanMyDay,
  smart: FreshPlanMyDay,
  hub: FreshPlanMyDay,
  dashboard: FreshPlanMyDay,
  calendar: FreshPlanMyDay,
  schedule: FreshPlanMyDay,
  dispatch: FreshPlanMyDay,
  routes: FreshPlanMyDay,
  jobs: FreshJobs,
  clients: FreshClients,
  quotes: FreshQuotes,
  invoices: FreshInvoices,
  team: FreshTeam,
  settings: FreshSettings,
  plans: FreshPlans,
  support: FreshSupport,
  helpdesk: FreshHelpDesk,
  trust: FreshTrustCenter,
  launchcontrol: FreshLaunchControl,
  imports: FreshImports,
  exports: FreshExports,
  payroll: FreshPayroll,
  time: FreshTimeLogs,
  workercommand: FreshWorkerCommand,
  reports: FreshReports,
  payments: FreshPayments,
  automation: FreshAutomation,
  topstatus: FreshTopStatus,
  documents: FreshDocuments,
  photos: FreshPhotos,
  inventory: FreshInventory,
  xero: FreshXero,
  contractors: FreshContractorHub,
  subcontractors: FreshContractorHub,
  messages: FreshMessages,
  inbox: FreshMessages,
  workermessages: FreshMessages,
  workerinbox: FreshMessages,
  reviews: FreshReviews,
  variations: FreshVariations,
  leads: FreshLeads,
  feedback: FreshFeedback,
  expenses: FreshExpenses,
  warranties: FreshWarranties,
  recurring: FreshRecurring,
  services: FreshServices,
  quality: FreshQuality,
  safety: FreshSafety,
  roadmap: FreshRoadmap,
  extras: FreshExtras,
  command: FreshCommand,
  askchurvox: FreshCommand,
  aioperatorstudio: FreshCommand,
  quickcreateai: FreshCommand,
  followupwriter: FreshCommand,
  quoteai: FreshCommand,
  invoicecheck: FreshCommand,
  workerbrief: FreshCommand,
  materialsreminder: FreshMaterialsReminder,
  materialsai: FreshMaterialsAI,
  nz: FreshNz,
  portal: FreshPortal,
};

function canonicalPage(value, fallback = "planday") {
  const key = String(value || "").trim().toLowerCase();
  if (PLAN_DAY_ALIASES.includes(key)) return "planday";
  if (COMMAND_ALIASES.includes(key)) return "command";
  if (MESSAGE_ALIASES.includes(key)) return "messages";
  if (JOB_RECORD_ALIASES.includes(key)) return "jobs";
  if (CLIENT_RECORD_ALIASES.includes(key)) return "clients";
  if (QUOTE_RECORD_ALIASES.includes(key)) return "quotes";
  if (PAYMENT_RECORD_ALIASES.includes(key)) return "payments";
  if (TEAM_RECORD_ALIASES.includes(key)) return "team";
  if (SUPPORT_ALIASES.includes(key)) return "support";
  return key || fallback;
}

function pageHash(page) {
  return page === "planday" ? "dashboard" : page;
}

function syncPageHash(page) {
  try {
    if (typeof window === "undefined") return;
    const safePage = pages[page] ? page : "planday";
    const hash = pageHash(safePage);
    const currentHash = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
    if (canonicalPage(currentHash, "") === safePage) return;

    const nextUrl = `${window.location.pathname}${window.location.search}#${hash}`;
    window.history.replaceState({}, "", nextUrl);
  } catch {}
}

function inferCommandRecordPage(text) {
  const value = String(text || "").toLowerCase();
  if (/xero|accounting|sync/.test(value)) return "xero";
  if (/payroll|pay period|timesheet|wage/.test(value)) return "payroll";
  if (/payment|paid|unpaid|overdue|balance/.test(value)) return "payments";
  if (/invoice|bill|charge|money|admin debt/.test(value)) return "invoices";
  if (/quote|estimate|proposal/.test(value)) return "quotes";
  if (/client|customer|contact|phone|email/.test(value)) return "clients";
  if (/worker|team|staff|dispatch|acknowledge/.test(value)) return "team";
  return "jobs";
}

function installCommandOpenRecordRuntime() {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (window.__churvoxCommandOpenRecordRuntimeInstalled) return;
    window.__churvoxCommandOpenRecordRuntimeInstalled = true;
    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("button");
      if (!button) return;
      const buttonText = String(button.textContent || "").trim().toLowerCase();
      if (!buttonText.includes("open linked record") && buttonText !== "open record") return;
      const commandPage = button.closest(".freshCommandStablePage") || document.querySelector(".freshCommandStablePage");
      if (!commandPage) return;
      const activeText = [
        commandPage.querySelector(".freshCommandFixDetail")?.textContent,
        commandPage.querySelector(".freshJobsDetailCard")?.textContent,
        commandPage.querySelector(".freshCommandFixItem.active")?.textContent,
      ].filter(Boolean).join(" ");
      const nextPage = inferCommandRecordPage(activeText);
      window.setTimeout(() => {
        try {
          window.localStorage.setItem("churvox:fresh-page", nextPage);
          const nextHash = pageHash(nextPage);
          if (window.location.hash.replace(/^#/, "") !== nextHash) window.location.hash = nextHash;
          else window.dispatchEvent(new HashChangeEvent("hashchange"));
        } catch {}
      }, 0);
    });
  } catch {}
}

function cleanClientHandoffText(value, emptyLabel) {
  const text = String(value || "").trim();
  return text === emptyLabel ? "" : text;
}

function readClientCardForQuote(button) {
  const page = button.closest(".freshClientsPage") || document.querySelector(".freshClientsPage");
  if (!page) return null;
  const title = page.querySelector(".freshJobsDetailCard h2")?.textContent?.trim() || "";
  const boxes = Array.from(page.querySelectorAll(".freshMiniGrid div"));
  const valueFor = (label) => {
    const box = boxes.find((item) => String(item.querySelector("span")?.textContent || "").trim().toLowerCase() === label);
    return String(box?.querySelector("b")?.textContent || "").trim();
  };
  const contact = valueFor("contact");
  const email = String(contact).split("/").map((item) => item.trim()).find((item) => item.includes("@")) || "";
  const phone = String(contact).split("/").map((item) => item.trim()).find((item) => !item.includes("@") && item !== "No contact saved") || "";
  const address = cleanClientHandoffText(valueFor("service address"), "No address saved");
  return { name: title, client_name: title, customer_name: title, email, phone, address };
}

function installClientQuoteRuntime() {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (window.__churvoxClientQuoteRuntimeInstalled) return;
    window.__churvoxClientQuoteRuntimeInstalled = true;
    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("button");
      if (!button || !button.closest(".freshClientsPage")) return;
      if (String(button.textContent || "").trim().toLowerCase() !== "create quote") return;
      const draft = readClientCardForQuote(button);
      if (!draft?.name) return;
      event.preventDefault();
      event.stopPropagation();
      window.localStorage.setItem("churvox:fresh-open-quote-modal:v1", JSON.stringify(draft));
      window.localStorage.setItem("churvox:fresh-page", "quotes");
      window.location.hash = pageHash("quotes");
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("churvox:open-quote-popup", { detail: draft }));
      }, 80);
    }, true);
  } catch {}
}

function getInitialPage() {
  try {
    const hash = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
    const hashPage = canonicalPage(hash, "");
    if (hashPage && pages[hashPage]) return hashPage;

    const path = String(window.location.pathname || "").trim().toLowerCase();
    if (path === "/dashboard" || path === "/fresh") return "planday";
    if (path === "/plans") return "plans";

    const pathKey = path.replace(/^\/+/, "").split("/")[0];
    const pathPage = canonicalPage(pathKey, "");
    if (pathPage && pages[pathPage]) return pathPage;

    const saved = canonicalPage(window.localStorage.getItem("churvox:fresh-page") || "planday");
    return pages[saved] ? saved : "planday";
  } catch {
    return "planday";
  }
}

export default function FreshApp() {
  const { user } = useAuth();
  React.useEffect(() => {
    installPillContrastRuntime();
    installCommandOpenRecordRuntime();
    installClientQuoteRuntime();
  }, []);

  const [page, setPage] = React.useState(getInitialPage);
  const [planGateRefresh, setPlanGateRefresh] = React.useState(0);
  const Page = pages[page] || FreshSimple;

  React.useEffect(() => {
    const refreshAccess = () => setPlanGateRefresh((value) => value + 1);
    ["storage", "churvox:plan-updated", "churvox-auth-refresh", "churvox:fresh-data-updated"].forEach((name) => window.addEventListener(name, refreshAccess));
    return () => ["storage", "churvox:plan-updated", "churvox-auth-refresh", "churvox:fresh-data-updated"].forEach((name) => window.removeEventListener(name, refreshAccess));
  }, []);

  React.useEffect(() => {
    const applyHashRoute = () => {
      const hash = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
      const hashPage = canonicalPage(hash, "");
      if (hashPage && pages[hashPage]) setPage(hashPage);
      else if (window.location.pathname === "/dashboard") setPage("planday");
    };

    applyHashRoute();
    window.addEventListener("hashchange", applyHashRoute);
    return () => window.removeEventListener("hashchange", applyHashRoute);
  }, []);

  function navigate(next) {
    const safeNext = canonicalPage(next);
    setPage(safeNext);
    syncPageHash(safeNext);
    try {
      window.localStorage.setItem("churvox:fresh-page", safeNext);
    } catch {}
  }

  return (
    <FreshShell active={page} onNavigate={navigate}>
      <FreshPlanGate key={`${page}-${planGateRefresh}`} page={page} user={user} onNavigate={navigate}>
        <Page page={page} onNavigate={navigate} />
      </FreshPlanGate>
    </FreshShell>
  );
}
