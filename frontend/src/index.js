import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ChurvoxErrorBoundary from "./components/ChurvoxErrorBoundary";
import "./index.css";
import "./styles/churvox-theme.css";
import "./styles/churvox-hotfix-contrast.css";
import "./styles/churvox-unified-headers.css";
import "./styles/churvox-team-area-groups.css";
import "./styles/churvox-client-area-groups.css";
import "./styles/churvox-jobs-compact.css";
import "./styles/churvox-job-detail-command.css";
import "./styles/churvox-invoices-compact.css";
import "./styles/churvox-invoices-card-fix.css";
import "./styles/churvox-payroll-compact.css";
import "./styles/churvox-worker-premium.css";
import "./styles/churvox-owner-premium-cleanup.css";
import "./styles/churvox-automation-cleanup.css";
import "./styles/smart-hub-automation-readable.css";
import "./styles/churvox-restore-original-colors.css";
import { startTeamTownGroupingEnhancer } from "./utils/teamTownGroupingEnhancer";
import { startClientAreaGroupingEnhancer } from "./utils/clientAreaGroupingEnhancer";
import { startAutomationActionFixer } from "./utils/automationActionFixer";
import { startWorkerFlowEnhancer } from "./utils/workerFlowEnhancer";
import { startAskChurvoxAnswerFixer } from "./utils/askChurvoxAnswerFixer";
import { startSmartHubReadabilityFixer } from "./utils/smartHubReadabilityFixer";

const clearOldPwaCaches = async () => {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (error) {
    console.warn("Churvox cache cleanup skipped:", error);
  }
};

clearOldPwaCaches();

startTeamTownGroupingEnhancer();
startClientAreaGroupingEnhancer();
startAutomationActionFixer();
startWorkerFlowEnhancer();
startAskChurvoxAnswerFixer();
startSmartHubReadabilityFixer();

const rootEl = document.getElementById("root");
const root = ReactDOM.createRoot(rootEl);
root.render(
  <React.StrictMode>
    <ChurvoxErrorBoundary>
      <App />
    </ChurvoxErrorBoundary>
  </React.StrictMode>
);
