import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
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
import { startTeamTownGroupingEnhancer } from "./utils/teamTownGroupingEnhancer";
import { startClientAreaGroupingEnhancer } from "./utils/clientAreaGroupingEnhancer";
import { startAutomationActionFixer } from "./utils/automationActionFixer";
import { startWorkerFlowEnhancer } from "./utils/workerFlowEnhancer";

startTeamTownGroupingEnhancer();
startClientAreaGroupingEnhancer();
startAutomationActionFixer();
startWorkerFlowEnhancer();

// Register service worker for PWA installability (iPhone Add to Home Screen + Chrome install)
// Network-first SW — no aggressive caching, new deploys always picked up
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Check for SW updates on each page load
      reg.update().catch(() => {});
    }).catch((err) => {
      console.warn("SW registration failed:", err);
    });
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
