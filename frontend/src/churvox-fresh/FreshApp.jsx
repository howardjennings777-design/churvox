import React from "react";
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
import FreshSimple from "./FreshSimple";
import FreshTodaysWork from "./FreshTodaysWork";
import FreshJobs from "./FreshJobs";
import FreshClients from "./FreshClients";
import FreshQuotes from "./FreshQuotes";
import FreshInvoices from "./FreshInvoices";
import FreshCalendar from "./FreshCalendar";
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
import FreshRoutes from "./FreshRoutes";
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
import FreshAskChurvox from "./FreshAskChurvox";
import FreshQuoteAI from "./FreshQuoteAI";
import FreshInvoiceChecker from "./FreshInvoiceChecker";
import FreshPlanMyDay from "./FreshPlanMyDay";
import FreshWorkerBrief from "./FreshWorkerBrief";
import FreshCommand from "./FreshCommand";
import FreshAiOperatorStudio from "./FreshAiOperatorStudio";
import FreshAiQuickCreate from "./FreshAiQuickCreate";
import FreshAiFollowUpWriter from "./FreshAiFollowUpWriter";
import FreshMaterialsReminder from "./FreshMaterialsReminder";
import FreshMaterialsAI from "./FreshMaterialsAI";
import FreshNz from "./FreshNz";
import FreshPortal from "./FreshPortal";
import { installPillContrastRuntime } from "./freshPillContrastRuntime";
import "./freshFinalContrastLock.css";
import "./freshPillContrastSystem.css";
import "./freshOwnerShellFinal.css";

const pages = {
  today: FreshTodaysWork,
  todayswork: FreshTodaysWork,
  worktoday: FreshTodaysWork,
  smart: FreshTodaysWork,
  hub: FreshTodaysWork,
  dashboard: FreshTodaysWork,
  jobs: FreshJobs,
  clients: FreshClients,
  quotes: FreshQuotes,
  invoices: FreshInvoices,
  calendar: FreshTodaysWork,
  schedule: FreshTodaysWork,
  dispatch: FreshTodaysWork,
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
  routes: FreshRoutes,
  inventory: FreshInventory,
  xero: FreshXero,
  contractors: FreshContractorHub,
  subcontractors: FreshContractorHub,
  messages: FreshMessages,
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
  askchurvox: FreshAskChurvox,
  quoteai: FreshQuoteAI,
  invoicecheck: FreshInvoiceChecker,
  planday: FreshPlanMyDay,
  workerbrief: FreshWorkerBrief,
  command: FreshCommand,
  aioperatorstudio: FreshAiOperatorStudio,
  quickcreateai: FreshAiQuickCreate,
  followupwriter: FreshAiFollowUpWriter,
  materialsreminder: FreshMaterialsReminder,
  materialsai: FreshMaterialsAI,
  nz: FreshNz,
  portal: FreshPortal,
};

function getInitialPage() {
  try {
    const hash = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
    if (["smart", "hub", "dashboard"].includes(hash)) return "today";
    if (hash && pages[hash]) return hash;

    const path = String(window.location.pathname || "").trim().toLowerCase();
    if (path === "/dashboard" || path === "/fresh") return "today";
    if (path === "/plans") return "plans";

    const saved = window.localStorage.getItem("churvox:fresh-page") || "command";
    return ["smart", "hub", "dashboard"].includes(saved) ? "command" : saved;
  } catch {
    return "today";
  }
}

export default function FreshApp() {
  React.useEffect(() => installPillContrastRuntime(), []);

  const [page, setPage] = React.useState(getInitialPage);
  const Page = pages[page] || FreshSimple;

  React.useEffect(() => {
    const applyHashRoute = () => {
      const hash = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
      if (["smart", "hub", "dashboard"].includes(hash)) setPage("today");
      else if (hash && pages[hash]) setPage(hash);
      else if (window.location.pathname === "/dashboard") setPage("today");
    };

    applyHashRoute();
    window.addEventListener("hashchange", applyHashRoute);
    return () => window.removeEventListener("hashchange", applyHashRoute);
  }, []);

  function navigate(next) {
    const safeNext = ["smart", "hub", "dashboard"].includes(next) ? "today" : (next || "today");
    setPage(safeNext);
    try {
      window.localStorage.setItem("churvox:fresh-page", safeNext);
    } catch {}
  }

  return (
    <FreshShell active={page} onNavigate={navigate}>
      <Page page={page} onNavigate={navigate} />
    </FreshShell>
  );
}
