import "./utils/churvoxWorkerRouteClass";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// PHASE_132_FAST_LOADING_PRECONNECT
function preconnectChurvoxBackend() {
  if (typeof document === "undefined") return;

  try {
    const href = "https://grassley-backend.onrender.com";
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;

    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = href;
    preconnect.crossOrigin = "anonymous";
    document.head.appendChild(preconnect);

    const dns = document.createElement("link");
    dns.rel = "dns-prefetch";
    dns.href = href;
    document.head.appendChild(dns);
  } catch {
    // keep boot safe
  }
}



async function resetStalePwaCacheOnce() {
  if (typeof window === "undefined") return;

  const version = "css-mime-cache-fix-2026-05-16";
  const key = "churvox_cache_fix_version";

  try {
    if (localStorage.getItem(key) === version) return;
    localStorage.setItem(key, version);

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if (window.caches && typeof window.caches.keys === "function") {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((cacheKey) => window.caches.delete(cacheKey)));
    }

    if (!new URLSearchParams(window.location.search || "").has("cache-fixed")) {
      window.location.replace(`${window.location.pathname || "/"}?cache-fixed=${Date.now()}`);
    }
  } catch (err) {
    console.warn("Churvox stale cache reset skipped:", err);
  }
}


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

preconnectChurvoxBackend();
resetOldPwaShellIfRequested();
resetStalePwaCacheOnce();
registerChurvoxPwa();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
