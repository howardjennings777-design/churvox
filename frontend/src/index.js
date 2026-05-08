import React from "react";
import ReactDOM from "react-dom/client";
import SmartHubHardReset from "./pages/SmartHubHardReset";
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
    <SmartHubHardReset />
  </React.StrictMode>
);
