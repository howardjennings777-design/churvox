import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/premium.css";
import "./styles/churvoxUnifiedTheme.css";
import "./styles/churvoxFullPageModals.css";
import "./styles/launchCardPolish.css";
import "./styles/ownerClarityFix.css";
import "./styles/settingsClarityFix.css";
import "./styles/ownerNavigationFinalFix.css";

const BUILD_CACHE_KEY = "churvox_build_cache_reset_20260508_ai_control_room";

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

    if (window.localStorage && window.localStorage.getItem(BUILD_CACHE_KEY) !== "done") {
      window.localStorage.setItem(BUILD_CACHE_KEY, "done");
      window.location.reload();
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
