import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/premium.css";
import "./styles/churvoxFullPageModals.css";
import "./styles/churvox-executive-master.css";
import "./styles/churvox-autonomous-home.css";
import "./styles/churvox-autonomous-features.css";
import "./styles/churvox-autonomous-pricing.css";
import "./styles/churvox-autonomous-auth.css";
import "./styles/churvox-autonomous-office-desk.css";
import "./styles/churvox-autonomous-workspaces.css";
import "./styles/churvox-autonomous-chrome.css";
import "./styles/churvox-autonomous-final-sweep.css";
import "./pages/marketing/AutonomousHomePage.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
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
