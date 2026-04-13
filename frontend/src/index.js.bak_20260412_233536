
if (typeof window !== "undefined") {
  window.__CHURVOX_BUILD_FORCE__ = "checkout-hard-force-v5";
}
if (typeof navigator !== "undefined" && navigator.serviceWorker) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister()));
}
if (typeof window !== "undefined" && window.caches) {
  caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
}


if (typeof window !== "undefined") {
  window.__CHURVOX_BUILD_FORCE__ = "checkout-hard-force-v4";
}
if (typeof navigator !== "undefined" && navigator.serviceWorker) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister()));
}
if (typeof window !== "undefined" && window.caches) {
  caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
}


if (typeof window !== "undefined") {
  window.__CHURVOX_BUILD_FORCE__ = "checkout-hard-force-v3";
}

if (typeof navigator !== "undefined" && navigator.serviceWorker) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
}

if (typeof window !== "undefined" && window.caches) {
  caches.keys().then((keys) => {
    keys.forEach((key) => caches.delete(key));
  });
}


if (typeof navigator !== "undefined" && navigator.serviceWorker) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
}

import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import "./hard-tap-fix.css";
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  }).catch(() => {});
}

// Register service worker for PWA install support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);