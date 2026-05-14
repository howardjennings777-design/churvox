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
