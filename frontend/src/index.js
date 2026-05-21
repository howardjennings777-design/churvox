import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/premium.css";
import "./styles/churvoxUnifiedTheme.css";
import "./styles/churvoxFullPageModals.css";
// Loaded LAST — Churvox AI Operator Front Desk theme (cream / charcoal / lime).
// Re-binds --px-*, --ch-*, --cx-force-* tokens and overrides hero/button/sidebar.
import "./styles/churvox-front-desk-theme.css";
// Pass 4 — legacy inline hex overlay (re-skins Jobs / Clients / Quotes /
// Invoices / Team / Calendar / Proof inline blue/navy/purple classes).
import "./styles/churvox-legacy-overlay.css";
// Pass 7 — Operator Command dark theme. Flips --cx-* tokens to the dark
// command-centre palette and overrides common Tailwind utilities.
import "./styles/churvox-operator-command.css";
// Final command fix — loaded absolute last to stop old premium.css blue/light
// styling leaking back into worker/app buttons, AI panels, sidebar and mobile nav.
import "./styles/churvox-command-final-fix.css";
import "./styles/churvox-fullscreen-light-reset.css";

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
