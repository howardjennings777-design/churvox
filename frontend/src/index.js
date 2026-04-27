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
import "./styles/churvox-dispatch-compact.css";
import "./styles/churvox-invoices-compact.css";
import { startTeamTownGroupingEnhancer } from "./utils/teamTownGroupingEnhancer";
import { startClientAreaGroupingEnhancer } from "./utils/clientAreaGroupingEnhancer";
import { startAutomationActionFixer } from "./utils/automationActionFixer";

startTeamTownGroupingEnhancer();
startClientAreaGroupingEnhancer();
startAutomationActionFixer();

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
