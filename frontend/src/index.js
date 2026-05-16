import "./utils/churvoxWorkerRouteClass";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

async function resetOldPwaShellIfRequested() {
  if (typeof window === "undefined") return;

  const shouldReset =
    new URLSearchParams(window.location.search || "").get("reset-pwa") === "1" ||
    localStorage.getItem("churvox_reset_pwa_cache") === "1";

  if (!shouldReset) return;

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if (window.caches && typeof window.caches.keys === "function") {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    }

    localStorage.removeItem("churvox_reset_pwa_cache");
  } catch (err) {
    console.warn("Churvox cache reset skipped:", err);
  }
}

function registerChurvoxPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration?.update) {
          registration.update().catch(() => {});
        }
      })
      .catch((err) => {
        console.warn("Churvox PWA registration skipped:", err);
      });
  });
}

resetOldPwaShellIfRequested();
registerChurvoxPwa();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
