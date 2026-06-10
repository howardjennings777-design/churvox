import React from "react";
import "./fresh.css";
import "./freshFeedback.css";
import "./freshRoadmap.css";
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
import "./freshVariations.css";
import "./freshWarranties.css";
import "./freshContracts.css";
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
import "./freshIndustries.css";
import "./freshSubcontractors.css";
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
import FreshIndustries from "./FreshIndustries";
import FreshSubcontractors from "./FreshSubcontractors";
import FreshAssets from "./FreshAssets";
import FreshIntegrations from "./FreshIntegrations";
import FreshRoutes from "./FreshRoutes";
import FreshMessages from "./FreshMessages";
import FreshExtras from "./FreshExtras";
import FreshVariations from "./FreshVariations";
import FreshWarranties from "./FreshWarranties";
import FreshContracts from "./FreshContracts";
import FreshPhotos from "./FreshPhotos";
import FreshAutomation from "./FreshAutomation";
import FreshClientPortal from "./FreshClientPortal";
import FreshWorker from "./FreshWorker";
import FreshSimple from "./FreshSimple";
import FreshFeedback from "./FreshFeedback";
import FreshRoadmap from "./FreshRoadmap";
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
  "feedback",
  "roadmap",
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
  "subcontractors",
  "availability",
  "payroll",
  "time",
  "reports",
  "profit",
  "expenses",
  "assets",
  "inventory",
  "services",
  "industries",
  "settings",
  "plans",
  "support",
  "integrations",
  "messages",
  "followups",
  "reviews",
  "quality",
  "extras",
  "variations",
  "warranties",
  "photos",
  "documents",
  "contracts",
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
    return (
    <FreshShell active={page} onChange={goToPage}>
      <div key={`${page}-${dataVersion}`} className="freshPageMount">
        {content}
      </div>
    </FreshShell>
  );
}
