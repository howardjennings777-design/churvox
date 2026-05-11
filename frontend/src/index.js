import "./utils/churvoxWorkerRouteClass";
/* Churvox worker-route body class */
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const syncChurvoxWorkerRouteClass = () => {
    const path = window.location.pathname || "";
    document.body.classList.toggle(
      "churvox-worker-route",
      path.includes("/worker") || path.includes("/v3/worker")
    );
  };

  syncChurvoxWorkerRouteClass();

  const wrapHistoryMethod = (name) => {
    const original = window.history[name];
    if (!original || original.__churvoxWrapped) return;
    const wrapped = function (...args) {
      const result = original.apply(this, args);
      window.dispatchEvent(new Event("churvox-location-change"));
      return result;
    };
    wrapped.__churvoxWrapped = true;
    window.history[name] = wrapped;
  };

  wrapHistoryMethod("pushState");
  wrapHistoryMethod("replaceState");
  window.addEventListener("popstate", syncChurvoxWorkerRouteClass);
  window.addEventListener("churvox-location-change", syncChurvoxWorkerRouteClass);
}

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/aiControlRoomFullscreen.css";
import "./styles/aiControlRoomFinalFit.css";
import "./styles/aiControlRoomLogoFix.css";
import "./styles/aiControlRoomHeaderReference.css";
import "./styles/aiControlRoomElite.css";
import "./styles/aiBusinessOperator.css";
import "./styles/aiOperatorHQ.css";
import "./styles/premiumCommandCentre.css";
import "./styles/premiumCommandCentrePolish.css";
import "./styles/newChurvoxLogo.css";
import "./styles/tenOutOfTenCommandCentre.css";
import "./styles/aiOperatorModals.css";
import "./styles/realDataOnlySmartHub.css";
import "./styles/realAppPremiumShell.css";
import "./styles/churvoxUtilityBridge.css";
import "./styles/invoiceCommandCentre.css";
import "./styles/invoiceCommandCentreHardFix.css";
import "./styles/invoiceFinalCleanup.css";
import "./styles/invoiceOwnerFinalClean.css";
import "./styles/jobsCommandCentre.css";
import "./styles/jobsFinalCleanup.css";
import "./styles/jobsCompactRowsFinal.css";
import "./styles/jobsRowsEmergencyFix.css";
import "./styles/jobsCommandBlankFix.css";
import "./styles/jobsLiveBoardFix.css";
import "./styles/jobsCommandTopCompact.css";
import "./styles/aiStagingBoard.css";
import "./styles/backgroundAiCleanup.css";
import "./styles/smartHubOwnerDashboard.css";
import "./styles/jobsOwnerWorkspace.css";
import "./styles/clientsOwnerWorkspace.css";
import "./styles/clientsFinalEdgeFix.css";
import "./styles/proofToPaidWorkspace.css";
import "./styles/teamOwnerWorkspace.css";
import "./styles/payrollOwnerWorkspace.css";
import "./styles/automationRulesWorkspace.css";
import "./styles/reportsBusinessInsights.css";
import "./styles/unifiedSmartHubHeaders.css";
import "./styles/churvoxFinalDesignSystem.css";
import "./styles/churvoxVisibleRedesign.css";
import "./styles/churvoxUntouchedPagesRedesign.css";
async function clearOldPwaShell() {
  if (typeof window === "undefined") return;

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if (window.caches && typeof window.caches.keys === "function") {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    }
  } catch (err) {
    console.warn("Churvox cache reset skipped:", err);
  }
}

clearOldPwaShell();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
