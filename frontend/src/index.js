import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

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
