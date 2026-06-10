import React from "react";
import "./fresh.css";
import "./freshFeedback.css";
import "./freshJobsLive.css";
import "./freshInvoicesLive.css";
import "./freshClientsLive.css";
import "./freshQuotesLive.css";
import "./freshDispatchLive.css";
import "./freshTeamLive.css";
import "./freshPayrollLive.css";
import "./freshReportsLive.css";
import "./freshSettingsLive.css";
import "./freshPlansLive.css";
import "./freshContrastFix.css";
import "./freshCommandBoxes.css";
import "./freshCommandLive.css";
import "./freshCommandActivity.css";
import "./freshCommandFilters.css";
import "./freshCommandFilterCounts.css";
import "./freshMobileNav.css";
import "./freshPolish.css";
import "./freshTopbar.css";
import "./freshQuickCreate.css";
import "./freshButtonContrast.css";
import "./freshFormContrast.css";
import "./freshDataControls.css";
import "./freshCommandFlow.css";
import "./freshTopStatus.css";
import "./freshLaunchChecklist.css";
import "./freshUltimateContrast.css";
import "./freshSearchContrastFinal.css";
import "./freshRiskScan.css";
import "./freshSearchReallyFinal.css";
import "./freshSearchTypingFix.css";
import "./freshSearchVisibleText.css";
import "./freshSearchEditableFinal.css";
import "./freshWorker.css";
import "./freshClientPortal.css";
import "./freshAutomation.css";
import "./freshPhotos.css";
import "./freshExtras.css";
import "./freshMessages.css";
import "./freshRoutes.css";
import "./freshRoutesContrastFix.css";
import "./freshIntegrations.css";
import "./freshAssets.css";
import "./freshServices.css";
import "./freshLeads.css";
import "./freshRecurring.css";
import "./freshAvailability.css";
import "./freshTimeLogs.css";
import "./freshExpenses.css";
import "./freshDocuments.css";
import "./freshProfit.css";
import "./freshFollowUps.css";
import "./freshSafety.css";
import "./freshInventory.css";
import "./freshAreas.css";
import "./freshReviews.css";
import "./freshQuality.css";
import "./freshPayments.css";
import "./freshCreditNotes.css";
import "./freshCustomerPortalRequests.css";
import "./freshApprovals.css";
import "./freshAlerts.css";
import "./freshAudit.css";
import "./freshSetup.css";
import "./freshLaunch.css";
import "./freshOnboarding.css";
import "./freshQa.css";
import "./freshFlags.css";
import "./freshImports.css";
import "./freshExports.css";
import "./freshSecurity.css";
import "./freshRoles.css";
import "./freshBilling.css";
import "./freshAiUsage.css";
import "./freshTemplates.css";
import "./freshGps.css";
import "./freshXero.css";
import "./freshGlobalReadable.css";
import "./freshNuclearReadable.css";

import FreshShell from "./FreshShell";
import FreshCommand from "./FreshCommand";
import FreshClients from "./FreshClients";
import FreshJobs from "./FreshJobs";
import FreshDispatch from "./FreshDispatch";
import FreshInvoices from "./FreshInvoices";
import FreshQuotes from "./FreshQuotes";
import FreshTeam from "./FreshTeam";
import FreshPayroll from "./FreshPayroll";
import FreshReports from "./FreshReports";
import FreshSettings from "./FreshSettings";
import FreshPlans from "./FreshPlans";
import FreshSupport from "./FreshSupport";
import FreshPayments from "./FreshPayments";
import FreshCreditNotes from "./FreshCreditNotes";
import FreshCustomerPortalRequests from "./FreshCustomerPortalRequests";
import FreshApprovals from "./FreshApprovals";
import FreshAlerts from "./FreshAlerts";
import FreshAudit from "./FreshAudit";
import FreshSetup from "./FreshSetup";
import FreshLaunch from "./FreshLaunch";
import FreshOnboarding from "./FreshOnboarding";
import FreshQa from "./FreshQa";
import FreshFlags from "./FreshFlags";
import FreshImports from "./FreshImports";
import FreshExports from "./FreshExports";
import FreshSecurity from "./FreshSecurity";
import FreshRoles from "./FreshRoles";
import FreshBilling from "./FreshBilling";
import FreshAiUsage from "./FreshAiUsage";
import FreshTemplates from "./FreshTemplates";
import FreshGps from "./FreshGps";
import FreshXero from "./FreshXero";
import FreshQuality from "./FreshQuality";
import FreshReviews from "./FreshReviews";
import FreshAreas from "./FreshAreas";
import FreshInventory from "./FreshInventory";
import FreshSafety from "./FreshSafety";
import FreshFollowUps from "./FreshFollowUps";
import FreshProfit from "./FreshProfit";
import FreshDocuments from "./FreshDocuments";
import FreshExpenses from "./FreshExpenses";
import FreshTimeLogs from "./FreshTimeLogs";
import FreshAvailability from "./FreshAvailability";
import FreshRecurring from "./FreshRecurring";
import FreshLeads from "./FreshLeads";
import FreshServices from "./FreshServices";
import FreshAssets from "./FreshAssets";
import FreshIntegrations from "./FreshIntegrations";
import FreshRoutes from "./FreshRoutes";
import FreshMessages from "./FreshMessages";
import FreshExtras from "./FreshExtras";
import FreshPhotos from "./FreshPhotos";
import FreshAutomation from "./FreshAutomation";
import FreshClientPortal from "./FreshClientPortal";
import FreshWorker from "./FreshWorker";
import FreshSimple from "./FreshSimple";
import FreshFeedback from "./FreshFeedback";
import { forceFreshReadable, installFreshReadableRuntime } from "./freshForceReadable";

const pages = new Set([
  "command",
  "jobs",
  "recurring",
  "leads",
  "dispatch",
  "routes",
  "areas",
  "clients",
  "quotes",
  "invoices",
  "payments",
  "creditnotes",
  "customerportal",
  "approvals",
  "alerts",
  "audit",
  "setup",
  "launch",
  "onboarding",
  "qa",
  "flags",
  "imports",
  "exports",
  "security",
  "roles",
  "billing",
  "aiusage",
  "templates",
  "gps",
  "xero",
  "team",
  "availability",
  "payroll",
  "time",
  "reports",
  "profit",
  "expenses",
  "assets",
  "inventory",
  "services",
  "settings",
  "plans",
  "support",
  "integrations",
  "messages",
  "followups",
  "reviews",
  "quality",
  "extras",
  "photos",
  "documents",
  "safety",
  "automation",
  "portal",
  "worker",
]);

function readPageFromHash() {
  const hash = window.location.hash.replace("#", "").trim().toLowerCase();
  return pages.has(hash) ? hash : "command";
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
  if (page === "command") content = <FreshCommand onNavigate={goToPage} />;
  if (page === "jobs") content = <FreshJobs onNavigate={goToPage} />;
  if (page === "recurring") content = <FreshRecurring onNavigate={goToPage} />;
  if (page === "leads") content = <FreshLeads onNavigate={goToPage} />;
  if (page === "dispatch") content = <FreshDispatch onNavigate={goToPage} />;
  if (page === "routes") content = <FreshRoutes onNavigate={goToPage} />;
  if (page === "areas") content = <FreshAreas onNavigate={goToPage} />;
  if (page === "clients") content = <FreshClients onNavigate={goToPage} />;
  if (page === "quotes") content = <FreshQuotes onNavigate={goToPage} />;
  if (page === "invoices") content = <FreshInvoices onNavigate={goToPage} />;
  if (page === "payments") content = <FreshPayments onNavigate={goToPage} />;
  if (page === "creditnotes") content = <FreshCreditNotes onNavigate={goToPage} />;
  if (page === "customerportal") content = <FreshCustomerPortalRequests onNavigate={goToPage} />;
  if (page === "approvals") content = <FreshApprovals onNavigate={goToPage} />;
  if (page === "alerts") content = <FreshAlerts onNavigate={goToPage} />;
  if (page === "audit") content = <FreshAudit onNavigate={goToPage} />;
  if (page === "setup") content = <FreshSetup onNavigate={goToPage} />;
  if (page === "launch") content = <FreshLaunch onNavigate={goToPage} />;
  if (page === "onboarding") content = <FreshOnboarding onNavigate={goToPage} />;
  if (page === "qa") content = <FreshQa onNavigate={goToPage} />;
  if (page === "flags") content = <FreshFlags onNavigate={goToPage} />;
  if (page === "imports") content = <FreshImports onNavigate={goToPage} />;
  if (page === "exports") content = <FreshExports onNavigate={goToPage} />;
  if (page === "security") content = <FreshSecurity onNavigate={goToPage} />;
  if (page === "roles") content = <FreshRoles onNavigate={goToPage} />;
  if (page === "billing") content = <FreshBilling onNavigate={goToPage} />;
  if (page === "aiusage") content = <FreshAiUsage onNavigate={goToPage} />;
  if (page === "templates") content = <FreshTemplates onNavigate={goToPage} />;
  if (page === "gps") content = <FreshGps onNavigate={goToPage} />;
  if (page === "xero") content = <FreshXero onNavigate={goToPage} />;
  if (page === "team") content = <FreshTeam onNavigate={goToPage} />;
  if (page === "availability") content = <FreshAvailability onNavigate={goToPage} />;
  if (page === "payroll") content = <FreshPayroll onNavigate={goToPage} />;
  if (page === "time") content = <FreshTimeLogs onNavigate={goToPage} />;
  if (page === "reports") content = <FreshReports onNavigate={goToPage} />;
  if (page === "profit") content = <FreshProfit onNavigate={goToPage} />;
  if (page === "expenses") content = <FreshExpenses onNavigate={goToPage} />;
  if (page === "assets") content = <FreshAssets onNavigate={goToPage} />;
  if (page === "inventory") content = <FreshInventory onNavigate={goToPage} />;
  if (page === "services") content = <FreshServices onNavigate={goToPage} />;
  if (page === "settings") content = <FreshSettings onNavigate={goToPage} />;
  if (page === "plans") content = <FreshPlans onNavigate={goToPage} />;
  if (page === "support") content = <FreshSupport onNavigate={goToPage} />;
  if (page === "integrations") content = <FreshIntegrations onNavigate={goToPage} />;
  if (page === "messages") content = <FreshMessages onNavigate={goToPage} />;
  if (page === "followups") content = <FreshFollowUps onNavigate={goToPage} />;
  if (page === "reviews") content = <FreshReviews onNavigate={goToPage} />;
  if (page === "quality") content = <FreshQuality onNavigate={goToPage} />;
  if (page === "extras") content = <FreshExtras onNavigate={goToPage} />;
  if (page === "photos") content = <FreshPhotos onNavigate={goToPage} />;
  if (page === "documents") content = <FreshDocuments onNavigate={goToPage} />;
  if (page === "safety") content = <FreshSafety onNavigate={goToPage} />;
  if (page === "automation") content = <FreshAutomation onNavigate={goToPage} />;
  if (page === "portal") content = <FreshClientPortal onNavigate={goToPage} />;
  if (page === "worker") content = <FreshWorker onNavigate={goToPage} />;

  return (
    <>
      <FreshShell active={page} onChange={goToPage}>
        <div key={`${page}-${dataVersion}`} className="freshPageMount">
          {content}
        </div>
      </FreshShell>
      <FreshFeedback />
    </>
  );
}
