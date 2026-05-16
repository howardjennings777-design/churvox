
// PHASE_145_FORCE_INVOICE_TEMPLATE_FROM_JS
// Force the proper invoice template styling from JS too, so a bad CSS MIME response
// cannot make the invoice look like the old rough card.
(function churvoxForceProperInvoiceCss() {
  try {
    if (typeof document === "undefined") return;
    if (document.getElementById("churvox-force-proper-invoice-css")) return;

    const style = document.createElement("style");
    style.id = "churvox-force-proper-invoice-css";
    style.textContent = `
      .cx-proper-invoice-force-wrap {
        width: 100% !important;
        display: grid !important;
        gap: 26px !important;
        padding: 4px 0 0 !important;
      }

      .cx-proper-invoice-paper {
        width: min(100%, 930px) !important;
        min-height: 1120px !important;
        margin: 0 auto !important;
        background: #fffdf7 !important;
        color: #151510 !important;
        border: 1px solid rgba(21, 21, 16, 0.18) !important;
        border-radius: 18px !important;
        overflow: hidden !important;
        box-shadow: 0 34px 120px rgba(21, 21, 16, 0.24) !important;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      }

      .cx-proper-invoice-header {
        display: grid !important;
        grid-template-columns: 1fr 210px !important;
        gap: 28px !important;
        align-items: start !important;
        padding: 50px 56px 44px !important;
        background: linear-gradient(90deg, #151510 0%, #151510 64%, #c8ff42 64%, #c8ff42 100%) !important;
      }

      .cx-proper-invoice-brand span,
      .cx-proper-invoice-info span,
      .cx-proper-invoice-payment span,
      .cx-proper-invoice-editor header span {
        display: block !important;
        font-size: 11px !important;
        line-height: 1 !important;
        font-weight: 950 !important;
        letter-spacing: 0.13em !important;
        text-transform: uppercase !important;
      }

      .cx-proper-invoice-brand span,
      .cx-proper-invoice-brand p {
        color: rgba(255, 253, 247, 0.78) !important;
      }

      .cx-proper-invoice-brand h1 {
        margin: 12px 0 12px !important;
        color: #fffdf7 !important;
        font-size: clamp(64px, 8vw, 108px) !important;
        line-height: 0.86 !important;
        letter-spacing: -0.1em !important;
        font-weight: 950 !important;
      }

      .cx-proper-invoice-brand p {
        max-width: 520px !important;
        margin: 0 !important;
        font-size: 15px !important;
        line-height: 1.55 !important;
        font-weight: 750 !important;
      }

      .cx-proper-invoice-number {
        padding: 20px !important;
        background: #fffdf7 !important;
        color: #151510 !important;
        border-radius: 18px !important;
        text-align: right !important;
        box-shadow: 0 12px 32px rgba(21, 21, 16, 0.14) !important;
      }

      .cx-proper-invoice-number small {
        display: block !important;
        margin-top: 10px !important;
        color: #6f6a5b !important;
        font-size: 11px !important;
        font-weight: 900 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.08em !important;
      }

      .cx-proper-invoice-number b {
        display: inline-flex !important;
        margin: 4px 0 12px !important;
        padding: 7px 12px !important;
        border-radius: 999px !important;
        background: #c8ff42 !important;
        color: #151510 !important;
        font-size: 11px !important;
        font-weight: 950 !important;
        text-transform: uppercase !important;
      }

      .cx-proper-invoice-number strong {
        display: block !important;
        margin-top: 5px !important;
        color: #151510 !important;
        font-size: 26px !important;
        line-height: 1 !important;
        font-weight: 950 !important;
      }

      .cx-proper-invoice-info {
        display: grid !important;
        grid-template-columns: 1fr 1fr 0.9fr !important;
        gap: 18px !important;
        padding: 40px 56px 24px !important;
      }

      .cx-proper-invoice-info article {
        min-height: 170px !important;
        padding: 22px !important;
        background: #f7efd9 !important;
        border: 1px solid rgba(21, 21, 16, 0.12) !important;
        border-radius: 18px !important;
      }

      .cx-proper-invoice-info span,
      .cx-proper-invoice-payment span,
      .cx-proper-invoice-editor header span {
        color: #6f6a5b !important;
      }

      .cx-proper-invoice-info strong {
        display: block !important;
        margin: 11px 0 10px !important;
        color: #151510 !important;
        font-size: 22px !important;
        line-height: 1.05 !important;
        font-weight: 950 !important;
        letter-spacing: -0.04em !important;
      }

      .cx-proper-invoice-info p {
        margin: 5px 0 !important;
        color: #625d50 !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        font-weight: 750 !important;
      }

      .cx-proper-invoice-dates div {
        display: flex !important;
        justify-content: space-between !important;
        gap: 12px !important;
        padding: 11px 0 !important;
        border-bottom: 1px solid rgba(21, 21, 16, 0.1) !important;
      }

      .cx-proper-invoice-lines {
        margin: 28px 56px 30px !important;
        border: 1px solid rgba(21, 21, 16, 0.16) !important;
        border-radius: 14px !important;
        overflow: hidden !important;
      }

      .cx-proper-invoice-lines .head,
      .cx-proper-invoice-lines .line {
        display: grid !important;
        grid-template-columns: minmax(280px, 1fr) 74px 132px 132px !important;
      }

      .cx-proper-invoice-lines .head {
        background: #151510 !important;
        color: #fffdf7 !important;
      }

      .cx-proper-invoice-lines .head span {
        padding: 15px 18px !important;
        color: #fffdf7 !important;
        font-size: 11px !important;
        font-weight: 950 !important;
        letter-spacing: 0.12em !important;
        text-transform: uppercase !important;
      }

      .cx-proper-invoice-lines .line {
        min-height: 170px !important;
        background: #fffdf7 !important;
      }

      .cx-proper-invoice-lines .line > div,
      .cx-proper-invoice-lines .line > span {
        padding: 24px 18px !important;
        border-top: 1px solid rgba(21, 21, 16, 0.08) !important;
        color: #151510 !important;
        font-size: 14px !important;
        font-weight: 850 !important;
      }

      .cx-proper-invoice-lines .line > span {
        text-align: right !important;
      }

      .cx-proper-invoice-lines .line strong {
        display: block !important;
        margin-bottom: 10px !important;
        color: #151510 !important;
        font-size: 18px !important;
        font-weight: 950 !important;
      }

      .cx-proper-invoice-lines .line p {
        margin: 0 !important;
        color: #625d50 !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        font-weight: 700 !important;
      }

      .cx-proper-invoice-summary {
        display: grid !important;
        grid-template-columns: 1fr minmax(300px, 380px) !important;
        gap: 26px !important;
        padding: 0 56px 56px !important;
      }

      .cx-proper-invoice-payment,
      .cx-proper-invoice-totals {
        padding: 22px !important;
        border: 1px solid rgba(21, 21, 16, 0.13) !important;
        border-radius: 18px !important;
        background: #f7efd9 !important;
      }

      .cx-proper-invoice-totals div {
        display: flex !important;
        justify-content: space-between !important;
        gap: 20px !important;
        padding: 12px 0 !important;
        border-bottom: 1px solid rgba(21, 21, 16, 0.1) !important;
        color: #6f6a5b !important;
        font-size: 14px !important;
        font-weight: 900 !important;
      }

      .cx-proper-invoice-totals .total {
        align-items: center !important;
        margin-top: 10px !important;
        padding-top: 18px !important;
        border-top: 2px solid #151510 !important;
        border-bottom: 0 !important;
        color: #151510 !important;
        font-size: 19px !important;
      }

      .cx-proper-invoice-totals .total strong {
        min-width: 160px !important;
        padding: 12px 15px !important;
        border-radius: 14px !important;
        background: #151510 !important;
        color: #fffdf7 !important;
        text-align: right !important;
        font-size: 24px !important;
        letter-spacing: -0.04em !important;
      }

      .cx-proper-invoice-editor {
        width: min(100%, 930px) !important;
        margin: 0 auto !important;
        padding: 24px !important;
        background: #f3ead4 !important;
        border: 1px solid rgba(21, 21, 16, 0.13) !important;
        border-radius: 22px !important;
      }

      .cx-proper-invoice-editor-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 14px !important;
        margin-top: 20px !important;
      }

      .cx-proper-invoice-editor-grid label.wide {
        grid-column: 1 / -1 !important;
      }

      .cx-proper-invoice-editor-grid input,
      .cx-proper-invoice-editor-grid select,
      .cx-proper-invoice-editor-grid textarea {
        width: 100% !important;
        min-height: 46px !important;
        padding: 13px 14px !important;
        border: 1px solid rgba(21, 21, 16, 0.16) !important;
        border-radius: 14px !important;
        background: #fffdf7 !important;
        color: #151510 !important;
        font-size: 15px !important;
        font-weight: 750 !important;
      }

      .cx-proper-invoice-editor-grid textarea {
        min-height: 110px !important;
        resize: vertical !important;
      }

      @media (max-width: 860px) {
        .cx-proper-invoice-paper {
          min-height: auto !important;
        }

        .cx-proper-invoice-header,
        .cx-proper-invoice-info,
        .cx-proper-invoice-summary,
        .cx-proper-invoice-editor-grid {
          grid-template-columns: 1fr !important;
        }

        .cx-proper-invoice-header,
        .cx-proper-invoice-info,
        .cx-proper-invoice-summary {
          padding-left: 24px !important;
          padding-right: 24px !important;
        }

        .cx-proper-invoice-lines {
          margin-left: 24px !important;
          margin-right: 24px !important;
          overflow-x: auto !important;
        }

        .cx-proper-invoice-lines .head,
        .cx-proper-invoice-lines .line {
          min-width: 700px !important;
        }
      }
    `;

    document.head.appendChild(style);
  } catch {
    // keep app boot safe
  }
})();


// PHASE_144_FORCE_CSS_MIME_AND_CACHE_CLEAR
// PHASE_143_FORCE_REAL_PROPER_INVOICE_COMPONENT
// PHASE_142_FORCE_PROPER_INVOICE_TEMPLATE_LIVE
// PHASE_141_PROPER_A4_INVOICE_TEMPLATE
// PHASE_138_FIX_EXACT_BAD_INVOICE_JSX_LINE
// PHASE_137_FIX_INVOICE_JSX_BUILD_ERROR
// PHASE_136_REAL_EDITABLE_INVOICE_TEMPLATE
// PHASE_135_CLASSIC_INVOICE_SHEET_POLISH
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
