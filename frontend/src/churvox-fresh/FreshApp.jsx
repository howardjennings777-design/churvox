import React from "react";
import "./fresh.css";
import "./freshAiUsage.css";
import "./freshAlerts.css";
import "./freshApprovals.css";
import "./freshAreas.css";
import "./freshAssets.css";
import "./freshAudit.css";
import "./freshAutomation.css";
import "./freshAvailability.css";
import "./freshBilling.css";
import "./freshButtonContrast.css";
import "./freshCancellations.css";
import "./freshClientPortal.css";
import "./freshClientsLive.css";
import "./freshCommandActivity.css";
import "./freshCommandBoxes.css";
import "./freshCommandFilterCounts.css";
import "./freshCommandFilters.css";
import "./freshCommandFlow.css";
import "./freshCommandLive.css";
import "./freshContracts.css";
import "./freshContrastFix.css";
import "./freshCreditNotes.css";
import "./freshCustomerPortalRequests.css";
import "./freshDataControls.css";
import "./freshDispatchLive.css";
import "./freshDocuments.css";
import "./freshExpenses.css";
import "./freshExports.css";
import "./freshExtras.css";
import "./freshFeedback.css";
import "./freshFlags.css";
import "./freshFollowUps.css";
import "./freshFormContrast.css";
import "./freshGps.css";
import "./freshImports.css";
import "./freshIndustries.css";
import "./freshIntegrations.css";
import "./freshInventory.css";
import "./freshInvoicesLive.css";
import "./freshInvoiceChecker.css";
import "./freshJobsLive.css";
import "./freshLaunch.css";
import "./freshLaunchChecklist.css";
import "./freshLaunchPack.css";
import "./freshDemoMode.css";
import "./freshLeads.css";
import "./freshMessages.css";
import "./freshMini.css";
import "./freshMobileNav.css";
import "./freshOnboarding.css";
import "./freshPayments.css";
import "./freshPayrollLive.css";
import "./freshPhotos.css";
import "./freshPhotoProof.css";
import "./freshPlansLive.css";
import "./freshPolish.css";
import "./freshProfit.css";
import "./freshProfitGuard.css";
import "./freshQa.css";
import "./freshQuality.css";
import "./freshReworkResolver.css";
import "./freshQuickCreate.css";
import "./freshQuotesLive.css";
import "./freshAiQuoteBuilder.css";
import "./freshRecurring.css";
import "./freshRecurringSaver.css";
import "./freshReportsLive.css";
import "./freshReviews.css";
import "./freshRiskScan.css";
import "./freshRoadmap.css";
import "./freshRoles.css";
import "./freshRoutes.css";
import "./freshRoutesContrastFix.css";
import "./freshSafety.css";
import "./freshSearch.css";
import "./freshSearchContrastFinal.css";
import "./freshSearchEditableFinal.css";
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
import "./freshOwnerAiNext.css";
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
import "./freshUltimateContrast.css";
import "./freshVariations.css";
import "./freshWarranties.css";
import "./freshWorker.css";
import "./freshWorkerBrief.css";
import "./freshMissingInfo.css";
import "./freshCustomerMemory.css";
import "./freshBusinessHealth.css";
import "./freshCashflowCoach.css";
import "./freshAskChurvox.css";
import "./freshGlobalActions.css";
import "./freshFirstRunWizard.css";
import "./freshLaunchControl.css";
import "./freshXero.css";
import "./freshGlobalReadable.css";
import "./freshNuclearReadable.css";

import FreshShell from "./FreshShell";
import FreshSimple from "./FreshSimple";
import { forceFreshReadable, installFreshReadableRuntime } from "./freshForceReadable";
import FreshAiUsage from "./FreshAiUsage";
import FreshAlerts from "./FreshAlerts";
import FreshApprovals from "./FreshApprovals";
import FreshAreas from "./FreshAreas";
import FreshAssets from "./FreshAssets";
import FreshAudit from "./FreshAudit";
import FreshAutomation from "./FreshAutomation";
import FreshAvailability from "./FreshAvailability";
import FreshBilling from "./FreshBilling";
import FreshCancellations from "./FreshCancellations";
import FreshClientPortal from "./FreshClientPortal";
import FreshClients from "./FreshClients";
import FreshCommand from "./FreshCommand";
import FreshContracts from "./FreshContracts";
import FreshCreditNotes from "./FreshCreditNotes";
import FreshCustomerPortalRequests from "./FreshCustomerPortalRequests";
import FreshDispatch from "./FreshDispatch";
import FreshDocuments from "./FreshDocuments";
import FreshExpenses from "./FreshExpenses";
import FreshExports from "./FreshExports";
import FreshExtras from "./FreshExtras";
import FreshFeedback from "./FreshFeedback";
import FreshFlags from "./FreshFlags";
import FreshFollowUps from "./FreshFollowUps";
import FreshGps from "./FreshGps";
import FreshImports from "./FreshImports";
import FreshIndustries from "./FreshIndustries";
import FreshIntegrations from "./FreshIntegrations";
import FreshInventory from "./FreshInventory";
import FreshInvoices from "./FreshInvoices";
import FreshInvoiceChecker from "./FreshInvoiceChecker";
import FreshJobs from "./FreshJobs";
import FreshLaunch from "./FreshLaunch";
import FreshLaunchPack from "./FreshLaunchPack";
import FreshDemoMode from "./FreshDemoMode";
import FreshLeads from "./FreshLeads";
import FreshMessages from "./FreshMessages";
import FreshOnboarding from "./FreshOnboarding";
import FreshPayments from "./FreshPayments";
import FreshPayroll from "./FreshPayroll";
import FreshPhotos from "./FreshPhotos";
import FreshPhotoProof from "./FreshPhotoProof";
import FreshPlans from "./FreshPlans";
import FreshProfit from "./FreshProfit";
import FreshProfitGuard from "./FreshProfitGuard";
import FreshPriceLearner from "./FreshPriceLearner";
import FreshPaymentPromise from "./FreshPaymentPromise";
import FreshUpsellFinder from "./FreshUpsellFinder";
import FreshQa from "./FreshQa";
import FreshQuality from "./FreshQuality";
import FreshReworkResolver from "./FreshReworkResolver";
import FreshQuotes from "./FreshQuotes";
import FreshAiQuoteBuilder from "./FreshAiQuoteBuilder";
import FreshRecurring from "./FreshRecurring";
import FreshRecurringSaver from "./FreshRecurringSaver";
import FreshReports from "./FreshReports";
import FreshReviews from "./FreshReviews";
import FreshRoadmap from "./FreshRoadmap";
import FreshRoles from "./FreshRoles";
import FreshRoutes from "./FreshRoutes";
import FreshSafety from "./FreshSafety";
import FreshSecurity from "./FreshSecurity";
import FreshServices from "./FreshServices";
import FreshSettings from "./FreshSettings";
import FreshSetup from "./FreshSetup";
import FreshSmartHub from "./FreshSmartHub";
import FreshMorningBrief from "./FreshMorningBrief";
import FreshMessageTriage from "./FreshMessageTriage";
import FreshSchedulerResolver from "./FreshSchedulerResolver";
import FreshAiOperatorStudio from "./FreshAiOperatorStudio";
import FreshAiQuickCreate from "./FreshAiQuickCreate";
import FreshAiFollowUpWriter from "./FreshAiFollowUpWriter";
import FreshPlanMyDay from "./FreshPlanMyDay";
import FreshSubcontractors from "./FreshSubcontractors";
import FreshSupport from "./FreshSupport";
import FreshTeam from "./FreshTeam";
import FreshTemplates from "./FreshTemplates";
import FreshTimeLogs from "./FreshTimeLogs";
import FreshVariations from "./FreshVariations";
import FreshWarranties from "./FreshWarranties";
import FreshWorker from "./FreshWorker";
import FreshWorkerBrief from "./FreshWorkerBrief";
import FreshWorkerPerformance from "./FreshWorkerPerformance";
import FreshMaterialsReminder from "./FreshMaterialsReminder";
import FreshReviewBooster from "./FreshReviewBooster";
import FreshMissingInfo from "./FreshMissingInfo";
import FreshCustomerMemory from "./FreshCustomerMemory";
import FreshBusinessHealth from "./FreshBusinessHealth";
import FreshCashflowCoach from "./FreshCashflowCoach";
import FreshAskChurvox from "./FreshAskChurvox";
import FreshGlobalActions from "./FreshGlobalActions";
import FreshFirstRunWizard from "./FreshFirstRunWizard";
import FreshSetupAssistant from "./FreshSetupAssistant";
import FreshLaunchControl from "./FreshLaunchControl";
import FreshTrustCenter from "./FreshTrustCenter";
import FreshHelpDesk from "./FreshHelpDesk";
import FreshXero from "./FreshXero";

const pages = new Set([
  "smart",
  "morningbrief",
  "messagetriage",
  "schedulerai",
  "askchurvox",
  "globalactions",
  "aioperator",
  "invoicecheck",
  "quickcreateai",
  "followupwriter",
  "planday",
  "command",
  "jobs",
  "recurring",
  "recurringsaver",
  "leads",
  "dispatch",
  "routes",
  "areas",
  "clients",
  "quotes",
  "quoteai",
  "invoices",
  "payments",
  "creditnotes",
  "customerportal",
  "approvals",
  "alerts",
  "audit",
  "setup",
  "launch",
  "launchpack",
  "launchcontrol",
  "demo",
  "onboarding",
  "firstrun",
  "setupassistant",
  "qa",
  "flags",
  "feedback",
  "roadmap",
  "imports",
  "exports",
  "security",
  "trustcenter",
  "roles",
  "billing",
  "aiusage",
  "templates",
  "gps",
  "xero",
  "myob",
  "nz",
  "team",
  "subcontractors",
  "availability",
  "payroll",
  "time",
  "reports",
  "profit",
  "profitguard",
  "pricelearner",
  "expenses",
  "assets",
  "inventory",
  "materialsai",
  "services",
  "industries",
  "settings",
  "plans",
  "support",
  "helpdesk",
  "integrations",
  "messages",
  "followups",
  "reviews",
  "reviewbooster",
  "quality",
  "reworkresolver",
  "extras",
  "variations",
  "warranties",
  "cancellations",
  "photos",
  "photoproof",
  "documents",
  "contracts",
  "safety",
  "automation",
  "portal",
  "worker",
  "workerbrief",
  "workerperformance",
  "missinginfo",
  "customermemory",
  "upsellfinder",
  "businesshealth",
  "cashflowai",
  "paymentpromise",
]);

function readPageFromHash() {
  if (typeof window === "undefined") return "smart";
  const hash = window.location.hash.replace("#", "").trim().toLowerCase();
  return pages.has(hash) ? hash : "smart";
}

export default function FreshApp() {
  const [page, setPage] = React.useState(readPageFromHash);
  const [dataVersion, setDataVersion] = React.useState(0);

  React.useEffect(() => {
    const onHashChange = () => setPage(readPageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  React.useEffect(() => {
    const onFreshDataUpdated = () => setDataVersion((version) => version + 1);
    window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
    return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
  }, []);

  React.useEffect(() => {
    const cleanupReadable = installFreshReadableRuntime();
    return cleanupReadable;
  }, []);

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(forceFreshReadable);
    return () => window.cancelAnimationFrame(frame);
  }, [page, dataVersion]);

  function goToPage(nextPage) {
    if (!pages.has(nextPage)) return;

    setPage(nextPage);

    const nextUrl = `${window.location.pathname}#${nextPage}`;
    window.history.replaceState(null, "", nextUrl);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  let content = <FreshSimple page={page} />;
  if (page === "smart") content = <FreshSmartHub onNavigate={goToPage} />;
  if (page === "morningbrief") content = <FreshMorningBrief onNavigate={goToPage} />;
  if (page === "askchurvox") content = <FreshAskChurvox onNavigate={goToPage} />;
  if (page === "globalactions") content = <FreshGlobalActions onNavigate={goToPage} />;
  if (page === "aioperator") content = <FreshAiOperatorStudio onNavigate={goToPage} />;
  if (page === "quickcreateai") content = <FreshAiQuickCreate onNavigate={goToPage} />;
  if (page === "followupwriter") content = <FreshAiFollowUpWriter onNavigate={goToPage} />;
  if (page === "command") content = <FreshCommand onNavigate={goToPage} />;
  if (page === "jobs") content = <FreshJobs onNavigate={goToPage} />;
  if (page === "recurring") content = <FreshRecurring onNavigate={goToPage} />;
  if (page === "recurringsaver") content = <FreshRecurringSaver onNavigate={goToPage} />;
  if (page === "leads") content = <FreshLeads onNavigate={goToPage} />;
  if (page === "dispatch") content = <FreshDispatch onNavigate={goToPage} />;
  if (page === "schedulerai") content = <FreshSchedulerResolver onNavigate={goToPage} />;
  if (page === "planday") content = <FreshPlanMyDay onNavigate={goToPage} />;
  if (page === "routes") content = <FreshRoutes onNavigate={goToPage} />;
  if (page === "areas") content = <FreshAreas onNavigate={goToPage} />;
  if (page === "clients") content = <FreshClients onNavigate={goToPage} />;
  if (page === "customermemory") content = <FreshCustomerMemory onNavigate={goToPage} />;
  if (page === "upsellfinder") content = <FreshUpsellFinder onNavigate={goToPage} />;
  if (page === "quotes") content = <FreshQuotes onNavigate={goToPage} />;
  if (page === "quoteai") content = <FreshAiQuoteBuilder onNavigate={goToPage} />;
  if (page === "invoices") content = <FreshInvoices onNavigate={goToPage} />;
  if (page === "invoicecheck") content = <FreshInvoiceChecker onNavigate={goToPage} />;
  if (page === "payments") content = <FreshPayments onNavigate={goToPage} />;
  if (page === "creditnotes") content = <FreshCreditNotes onNavigate={goToPage} />;
  if (page === "customerportal") content = <FreshCustomerPortalRequests onNavigate={goToPage} />;
  if (page === "approvals") content = <FreshApprovals onNavigate={goToPage} />;
  if (page === "alerts") content = <FreshAlerts onNavigate={goToPage} />;
  if (page === "audit") content = <FreshAudit onNavigate={goToPage} />;
  if (page === "setup") content = <FreshSetup onNavigate={goToPage} />;
  if (page === "launch") content = <FreshLaunch onNavigate={goToPage} />;
  if (page === "launchpack") content = <FreshLaunchPack onNavigate={goToPage} />;
  if (page === "launchcontrol") content = <FreshLaunchControl onNavigate={goToPage} />;
  if (page === "demo") content = <FreshDemoMode onNavigate={goToPage} />;
  if (page === "onboarding") content = <FreshOnboarding onNavigate={goToPage} />;
  if (page === "firstrun") content = <FreshFirstRunWizard onNavigate={goToPage} />;
  if (page === "setupassistant") content = <FreshSetupAssistant onNavigate={goToPage} />;
  if (page === "qa") content = <FreshQa onNavigate={goToPage} />;
  if (page === "flags") content = <FreshFlags onNavigate={goToPage} />;
  if (page === "feedback") content = <FreshFeedback onNavigate={goToPage} />;
  if (page === "roadmap") content = <FreshRoadmap onNavigate={goToPage} />;
  if (page === "imports") content = <FreshImports onNavigate={goToPage} />;
  if (page === "exports") content = <FreshExports onNavigate={goToPage} />;
  if (page === "security") content = <FreshSecurity onNavigate={goToPage} />;
  if (page === "trustcenter") content = <FreshTrustCenter onNavigate={goToPage} />;
  if (page === "roles") content = <FreshRoles onNavigate={goToPage} />;
  if (page === "billing") content = <FreshBilling onNavigate={goToPage} />;
  if (page === "aiusage") content = <FreshAiUsage onNavigate={goToPage} />;
  if (page === "templates") content = <FreshTemplates onNavigate={goToPage} />;
  if (page === "gps") content = <FreshGps onNavigate={goToPage} />;
  if (page === "xero") content = <FreshXero onNavigate={goToPage} />;
  if (page === "team") content = <FreshTeam onNavigate={goToPage} />;
  if (page === "subcontractors") content = <FreshSubcontractors onNavigate={goToPage} />;
  if (page === "availability") content = <FreshAvailability onNavigate={goToPage} />;
  if (page === "payroll") content = <FreshPayroll onNavigate={goToPage} />;
  if (page === "time") content = <FreshTimeLogs onNavigate={goToPage} />;
  if (page === "reports") content = <FreshReports onNavigate={goToPage} />;
  if (page === "businesshealth") content = <FreshBusinessHealth onNavigate={goToPage} />;
  if (page === "cashflowai") content = <FreshCashflowCoach onNavigate={goToPage} />;
  if (page === "paymentpromise") content = <FreshPaymentPromise onNavigate={goToPage} />;
  if (page === "profit") content = <FreshProfit onNavigate={goToPage} />;
  if (page === "profitguard") content = <FreshProfitGuard onNavigate={goToPage} />;
  if (page === "pricelearner") content = <FreshPriceLearner onNavigate={goToPage} />;
  if (page === "expenses") content = <FreshExpenses onNavigate={goToPage} />;
  if (page === "assets") content = <FreshAssets onNavigate={goToPage} />;
  if (page === "inventory") content = <FreshInventory onNavigate={goToPage} />;
  if (page === "materialsai") content = <FreshMaterialsReminder onNavigate={goToPage} />;
  if (page === "services") content = <FreshServices onNavigate={goToPage} />;
  if (page === "industries") content = <FreshIndustries onNavigate={goToPage} />;
  if (page === "settings") content = <FreshSettings onNavigate={goToPage} />;
  if (page === "plans") content = <FreshPlans onNavigate={goToPage} />;
  if (page === "support") content = <FreshSupport onNavigate={goToPage} />;
  if (page === "helpdesk") content = <FreshHelpDesk onNavigate={goToPage} />;
  if (page === "integrations") content = <FreshIntegrations onNavigate={goToPage} />;
  if (page === "messages") content = <FreshMessages onNavigate={goToPage} />;
  if (page === "messagetriage") content = <FreshMessageTriage onNavigate={goToPage} />;
  if (page === "followups") content = <FreshFollowUps onNavigate={goToPage} />;
  if (page === "reviews") content = <FreshReviews onNavigate={goToPage} />;
  if (page === "reviewbooster") content = <FreshReviewBooster onNavigate={goToPage} />;
  if (page === "quality") content = <FreshQuality onNavigate={goToPage} />;
  if (page === "reworkresolver") content = <FreshReworkResolver onNavigate={goToPage} />;
  if (page === "extras") content = <FreshExtras onNavigate={goToPage} />;
  if (page === "variations") content = <FreshVariations onNavigate={goToPage} />;
  if (page === "warranties") content = <FreshWarranties onNavigate={goToPage} />;
  if (page === "cancellations") content = <FreshCancellations onNavigate={goToPage} />;
  if (page === "photos") content = <FreshPhotos onNavigate={goToPage} />;
  if (page === "photoproof") content = <FreshPhotoProof onNavigate={goToPage} />;
  if (page === "documents") content = <FreshDocuments onNavigate={goToPage} />;
  if (page === "contracts") content = <FreshContracts onNavigate={goToPage} />;
  if (page === "safety") content = <FreshSafety onNavigate={goToPage} />;
  if (page === "automation") content = <FreshAutomation onNavigate={goToPage} />;
  if (page === "portal") content = <FreshClientPortal onNavigate={goToPage} />;
  if (page === "worker") content = <FreshWorker onNavigate={goToPage} />;
  if (page === "workerbrief") content = <FreshWorkerBrief onNavigate={goToPage} />;
  if (page === "workerperformance") content = <FreshWorkerPerformance onNavigate={goToPage} />;
  if (page === "missinginfo") content = <FreshMissingInfo onNavigate={goToPage} />;

  return (
    <FreshShell active={page} onChange={goToPage}>
      <div key={`${page}-${dataVersion}`} className="freshPageMount">
        {content}
      </div>
    </FreshShell>
  );
}
