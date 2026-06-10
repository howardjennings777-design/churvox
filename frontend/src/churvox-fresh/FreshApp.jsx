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
  "clients",
  "quotes",
  "invoices",
  "team",
  "availability",
  "payroll",
  "time",
  "reports",
  "expenses",
  "assets",
  "services",
  "settings",
  "plans",
  "support",
  "integrations",
  "messages",
  "extras",
  "photos",
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
  if (page === "clients") content = <FreshClients onNavigate={goToPage} />;
  if (page === "quotes") content = <FreshQuotes onNavigate={goToPage} />;
  if (page === "invoices") content = <FreshInvoices onNavigate={goToPage} />;
  if (page === "team") content = <FreshTeam onNavigate={goToPage} />;
  if (page === "availability") content = <FreshAvailability onNavigate={goToPage} />;
  if (page === "payroll") content = <FreshPayroll onNavigate={goToPage} />;
  if (page === "time") content = <FreshTimeLogs onNavigate={goToPage} />;
  if (page === "reports") content = <FreshReports onNavigate={goToPage} />;
  if (page === "expenses") content = <FreshExpenses onNavigate={goToPage} />;
  if (page === "assets") content = <FreshAssets onNavigate={goToPage} />;
  if (page === "services") content = <FreshServices onNavigate={goToPage} />;
  if (page === "settings") content = <FreshSettings onNavigate={goToPage} />;
  if (page === "plans") content = <FreshPlans onNavigate={goToPage} />;
  if (page === "support") content = <FreshSupport onNavigate={goToPage} />;
  if (page === "integrations") content = <FreshIntegrations onNavigate={goToPage} />;
  if (page === "messages") content = <FreshMessages onNavigate={goToPage} />;
  if (page === "extras") content = <FreshExtras onNavigate={goToPage} />;
  if (page === "photos") content = <FreshPhotos onNavigate={goToPage} />;
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
