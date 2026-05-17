window.__CHURVOX_APPROVAL_POLISH__ = "PHASE_190_APPROVAL_DESK_WARNING_AND_PRIORITY_POLISH_20260517002650";
window.__CHURVOX_PRIORITY_PANEL__ = "PHASE_189_FORCE_OWNER_PRIORITY_BESIDE_APPROVAL_DESK_20260517002155";
window.__CHURVOX_TOP_NAV_HEIGHT_FIX__ = "PHASE_188_FIX_GIANT_TOP_NAV_BLACK_SPACE_20260517001841";
window.__CHURVOX_TOP_NAV_PRIORITY_PANEL__ = "PHASE_187_TOP_NAV_OWNER_PRIORITY_PANEL_20260517001430";
window.__CHURVOX_APPROVAL_DESK_ABOVE_FOLD__ = "PHASE_186_BRING_APPROVAL_DESK_ABOVE_THE_FOLD_20260517001144";
window.__CHURVOX_APPROVAL_DESK_LAYOUT_FIX__ = "PHASE_185_FIX_APPROVAL_DESK_WIDTH_AND_LIVE_FEED_20260517000510";
window.__CHURVOX_APPROVAL_DESK_LAYOUT__ = "PHASE_184_APPROVAL_DESK_LIVE_FEED_FLOW_20260517000100";
window.__CHURVOX_COLOR_THEME__ = "PHASE_183_OBSIDIAN_SAND_COPPER_SIGNAL_THEME_20260516235318";
window.__CHURVOX_THEME__ = "PHASE_180_CARBON_CLAY_THEME_FOUNDATION";
window.__CHURVOX_PHASE_163_DEPLOY_MARKER__ = "PHASE_163_FORCE_FRONTEND_BACKEND_RENDER_DEPLOY_20260516211617";
window.__CHURVOX_RENDER_DEPLOY_MARKER__ = "PHASE_162_FORCE_REAL_RENDER_FRONTEND_DEPLOY_20260516211342";

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


// PHASE_190_APPROVAL_DESK_WARNING_AND_PRIORITY_POLISH
// Clean the owner view: hide scary optional sync warnings and make Owner Priority
// match the real approval count.
(function churvoxApprovalDeskPolish() {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    function clean(value) {
      return String(value || "").replace(/\s+/g, " ").trim();
    }

    function hideOptionalWarnings() {
      Array.from(document.querySelectorAll("section, article, div, p")).forEach((el) => {
        const text = clean(el.textContent).toLowerCase();
        if (
          text.includes("machine warning") ||
          text.includes("live data is taking longer") ||
          text.includes("some live data is still syncing")
        ) {
          el.style.display = "none";
          el.setAttribute("aria-hidden", "true");
        }
      });
    }

    function approvalCount() {
      const headerCount = Array.from(document.querySelectorAll("b, strong"))
        .map((el) => clean(el.textContent))
        .find((text) => /^\d+$/.test(text));

      const slips = Array.from(document.querySelectorAll("button, article, section"))
        .filter((el) => clean(el.textContent).toLowerCase().includes("open approval slip")).length;

      return slips || Number(headerCount || 0) || 0;
    }

    function updatePriorityPanel() {
      const panel = document.getElementById("churvox-phase-189-owner-priority");

      const count = approvalCount();
      const countEl = panel.querySelector("[data-priority-count]");
      if (countEl) countEl.textContent = String(count);

      const title = panel.querySelector("header strong");
      const body = panel.querySelector("header p");
      const footerTitle = panel.querySelector("footer strong");
      const footerBody = panel.querySelector("footer p");

      if (count <= 0) {
        if (title) title.textContent = "Nothing needs approval right now.";
        if (body) body.textContent = "Churvox is still watching jobs, workers, quotes, invoices and missing client details. When admin is ready, it will appear here.";
        if (footerTitle) footerTitle.textContent = "Live watchlist";
        if (footerBody) footerBody.textContent = "New work, proof, invoice risk and follow-ups will refresh the desk automatically.";
      } else {
        if (title) title.textContent = "Approve the first slip first.";
        if (body) body.textContent = "Churvox has already checked the admin path. Crew, proof, invoices, follow-ups and payment risks are parked here for owner approval.";
        if (footerTitle) footerTitle.textContent = "Next move";
        if (footerBody) footerBody.textContent = "Open the top approval slip, check what Churvox prepared, then approve or edit.";
      }
    }

    let timer = null;
    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        hideOptionalWarnings();
        updatePriorityPanel();
      }, 100);
    }

    window.addEventListener("load", schedule);
    document.addEventListener("click", schedule, true);

    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    schedule();
  } catch {
    // keep app boot safe
  }
})();




// PHASE_189_FORCE_OWNER_PRIORITY_BESIDE_APPROVAL_DESK
// Keeps Approval Desk as the main working screen:
// compact hero, force a right-side Owner Priority panel if React live feed is missing.
(function churvoxForceOwnerPriorityPanel() {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    function clean(value) {
      return String(value || "").replace(/\s+/g, " ").trim();
    }

    function findApprovalDesk() {
      const candidates = Array.from(document.querySelectorAll("section, article, div, main"));
      return candidates.find((el) => {
        const text = clean(el.textContent).toLowerCase();
        return text.includes("approval desk") && text.includes("open approval slip");
      });
    }

    function countApprovalSlips() {
      return Array.from(document.querySelectorAll("button, article, section"))
        .filter((el) => clean(el.textContent).toLowerCase().includes("open approval slip")).length;
    }

    function installPanel() {
      const approvalDesk = findApprovalDesk();
      if (!approvalDesk) return;

      const existing = document.getElementById("churvox-phase-189-owner-priority");
      if (existing) {
        const count = countApprovalSlips();
        const countEl = existing.querySelector("[data-priority-count]");
        if (countEl) countEl.textContent = String(count || "");
        return;
      }

      const shell = document.createElement("aside");
      shell.id = "churvox-phase-189-owner-priority";
      shell.innerHTML = `
        <header>
          <span>OWNER PRIORITY</span>
          <strong>Approve the first slip first.</strong>
          <p>Churvox has already checked the admin path. Crew, proof, invoices, follow-ups and payment risks are parked here for owner approval.</p>
        </header>

        <section class="cx-priority-count">
          <small>Ready now</small>
          <b data-priority-count>${countApprovalSlips() || ""}</b>
        </section>

        <div class="cx-priority-flow">
          <article><i></i><span>Work comes in</span></article>
          <article><i></i><span>Churvox checks it</span></article>
          <article><i></i><span>Admin is prepared</span></article>
          <article><i></i><span>Owner approves</span></article>
        </div>

        <footer>
          <strong>Live watchlist</strong>
          <p>Worker updates, new jobs, invoices, quotes and missing client details refresh the desk automatically.</p>
        </footer>
      `;

      approvalDesk.insertAdjacentElement("afterend", shell);

      const parent = approvalDesk.parentElement;
      if (parent) {
        parent.classList.add("cx-phase-189-approval-layout");
      }
    }

    let timer = null;
    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(installPanel, 120);
    }

    window.addEventListener("load", schedule);
    document.addEventListener("click", schedule, true);

    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    schedule();
  } catch {
    // keep app boot safe
  }
})();




// PHASE_182_GLOBAL_AI_AUTO_REFRESH_AND_CREW_MATCH
// When records change, Approval Desk refreshes. When area/region/address is selected,
// Churvox immediately suggests a crew match from live worker context.
(function churvoxAutoAiAdminWiring() {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const API_CHANGE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
    const IMPORTANT_PATHS = [
      "/jobs",
      "/clients",
      "/quotes",
      "/invoices",
      "/team",
      "/worker",
      "/ai",
    ];

    function normalise(value) {
      return String(value || "").toLowerCase().trim();
    }

    function dispatchRefresh(reason) {
      try {
        window.dispatchEvent(new CustomEvent("churvox:refresh-live-data", {
          detail: { reason, at: new Date().toISOString() },
        }));
      } catch {
        // safe
      }
    }

    if (!window.__CHURVOX_PHASE_182_FETCH_PATCHED__) {
      window.__CHURVOX_PHASE_182_FETCH_PATCHED__ = true;
      const originalFetch = window.fetch;

      window.fetch = async function churvoxAiAwareFetch(input, init) {
        const method = String((init && init.method) || "GET").toUpperCase();
        const url = typeof input === "string" ? input : String((input && input.url) || "");
        const touchesImportantRecord = IMPORTANT_PATHS.some((path) => url.includes(path));

        const response = await originalFetch.apply(this, arguments);

        if (API_CHANGE_METHODS.has(method) && touchesImportantRecord && response && response.ok) {
          window.setTimeout(() => dispatchRefresh(`record-${method.toLowerCase()}`), 450);
          window.setTimeout(() => dispatchRefresh(`record-${method.toLowerCase()}-settled`), 1800);
        }

        return response;
      };
    }

    function workerName(worker, fallback = "Worker") {
      return (
        worker?.name ||
        worker?.full_name ||
        worker?.worker_name ||
        worker?.email ||
        fallback
      );
    }

    function workerRegion(worker) {
      return normalise(worker?.region || worker?.service_area || worker?.area || worker?.suburb || worker?.location);
    }

    function workerStatus(worker) {
      return normalise(worker?.status || worker?.availability || "available");
    }

    function fieldLooksLikeAreaField(el) {
      if (!el) return false;
      const text = [
        el.name,
        el.id,
        el.placeholder,
        el.getAttribute("aria-label"),
        el.closest("label")?.innerText,
      ].map(normalise).join(" ");

      return /area|region|suburb|city|address|location|site/.test(text);
    }

    function scoreWorker(worker, areaValue) {
      const area = normalise(areaValue);
      const region = workerRegion(worker);
      const status = workerStatus(worker);
      let score = 0;
      const reasons = [];

      if (region && area && (area.includes(region) || region.includes(area))) {
        score += 6;
        reasons.push(`works in ${region}`);
      }

      if (!status.includes("busy") && !status.includes("off") && !status.includes("leave")) {
        score += 3;
        reasons.push("appears available");
      }

      if (worker?.email || worker?.phone || worker?.mobile) {
        score += 1;
        reasons.push("has contact details saved");
      }

      if (!reasons.length) reasons.push("best available worker from the crew list");

      return { worker, score, reasons };
    }

    function removeCrewPopup() {
      document.getElementById("churvox-phase-182-crew-match")?.remove();
    }

    function showCrewSuggestion(inputValue) {
      const ctx = window.__CHURVOX_LIVE_AI_CONTEXT__ || {};
      const team = Array.isArray(ctx.team) ? ctx.team : [];

      if (!team.length || !String(inputValue || "").trim()) return;

      const best = team
        .map((worker) => scoreWorker(worker, inputValue))
        .sort((a, b) => b.score - a.score)[0];

      if (!best || !best.worker) return;

      const name = workerName(best.worker);
      const reasons = best.reasons.slice(0, 3);
      const area = String(inputValue || "").trim();

      removeCrewPopup();

      const popup = document.createElement("section");
      popup.id = "churvox-phase-182-crew-match";
      popup.innerHTML = `
        <button type="button" class="cx-crew-match-close" aria-label="Close">×</button>
        <span>CREW MATCH READY</span>
        <strong>${name}</strong>
        <p>Churvox checked the selected area <b>${area}</b> and matched the best available worker.</p>
        <ul>
          ${reasons.map((reason) => `<li>${reason}</li>`).join("")}
        </ul>
        <small>Saved as an Approval Desk suggestion. Owner approves before anything changes.</small>
      `;

      document.body.appendChild(popup);
      popup.querySelector(".cx-crew-match-close")?.addEventListener("click", removeCrewPopup);

      try {
        localStorage.setItem("churvox_last_crew_match_suggestion", JSON.stringify({
          worker: name,
          area,
          reasons,
          at: new Date().toISOString(),
        }));
      } catch {
        // safe
      }

      window.setTimeout(() => {
        const current = document.getElementById("churvox-phase-182-crew-match");
        if (current) current.classList.add("settled");
      }, 6500);
    }

    function handleAreaInput(event) {
      const el = event.target;
      if (!el || !["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return;
      if (!fieldLooksLikeAreaField(el)) return;

      const value = el.value || el.textContent || "";
      if (String(value).trim().length < 3) return;

      window.clearTimeout(window.__CHURVOX_PHASE_182_CREW_TIMER__);
      window.__CHURVOX_PHASE_182_CREW_TIMER__ = window.setTimeout(() => showCrewSuggestion(value), 360);
    }

    document.addEventListener("input", handleAreaInput, true);
    document.addEventListener("change", handleAreaInput, true);

    if (!document.getElementById("churvox-phase-182-ai-css")) {
      const style = document.createElement("style");
      style.id = "churvox-phase-182-ai-css";
      style.textContent = `
        #churvox-phase-182-crew-match {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 999999;
          width: min(390px, calc(100vw - 28px));
          padding: 22px;
          border-radius: 28px;
          background:
            radial-gradient(circle at 90% 0%, rgba(184, 242, 74, 0.22), transparent 10rem),
            linear-gradient(145deg, #14130f, #242116);
          color: #fffaf0;
          border: 1px solid rgba(184, 242, 74, 0.28);
          box-shadow: 0 30px 90px rgba(20, 19, 15, 0.35);
          transform: translateY(0);
          animation: churvoxCrewMatchIn 280ms ease both;
          font-family: inherit;
        }

        #churvox-phase-182-crew-match.settled {
          opacity: 0.92;
        }

        #churvox-phase-182-crew-match span {
          display: inline-flex;
          margin-bottom: 10px;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(184, 242, 74, 0.14);
          color: #b8f24a;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.13em;
        }

        #churvox-phase-182-crew-match strong {
          display: block;
          color: #fffaf0;
          font-size: 28px;
          line-height: 0.95;
          letter-spacing: -0.05em;
          font-weight: 950;
        }

        #churvox-phase-182-crew-match p,
        #churvox-phase-182-crew-match small {
          color: rgba(255, 250, 240, 0.74);
          font-weight: 760;
          line-height: 1.45;
        }

        #churvox-phase-182-crew-match ul {
          display: grid;
          gap: 6px;
          padding-left: 18px;
          margin: 14px 0;
          color: #fffaf0;
          font-weight: 850;
        }

        #churvox-phase-182-crew-match .cx-crew-match-close {
          position: absolute;
          right: 12px;
          top: 12px;
          width: 32px;
          height: 32px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 250, 240, 0.12);
          color: #fffaf0;
          cursor: pointer;
        }

        @keyframes churvoxCrewMatchIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
  } catch {
    // keep app boot safe
  }
})();




// PHASE_181_APPROVAL_DESK_NON_BORING_LAYOUT
// Last-mile visible wording cleanup only. Does not touch API paths or logic.
(function churvoxApprovalDeskWording() {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const replacements = new Map([
      ["Operator Machine", "Approval Desk"],
      ["Smart Hub", "Approval Desk"],
      ["AI admin machine", "AI-prepared admin"],
      ["Work Slip", "Approval Slip"],
      ["Open Work Slip", "Open Approval Slip"],
      ["Job Queue", "Work"],
      ["JOB QUEUE", "WORK"],
      ["Proof-to-Paid", "Proof & Pay"],
      ["Start the machine", "Start the approval desk"],
      ["Open Operator Machine", "Open Approval Desk"],
    ]);

    function patchText() {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      nodes.forEach((node) => {
        let text = node.nodeValue || "";
        let next = text;
        replacements.forEach((value, key) => {
          next = next.split(key).join(value);
        });
        if (next !== text) node.nodeValue = next;
      });
    }

    let timer = null;
    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(patchText, 80);
    }

    window.addEventListener("load", schedule);
    document.addEventListener("click", schedule, true);

    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

    schedule();
  } catch {
    // keep app boot safe
  }
})();




// PHASE_179_SIMPLIFY_JOBS_PANEL_NO_QUEUE
// Owner-facing cleanup: no "Job Queue" language and no manual dispatch-style filters.
// Jobs show as normal jobs with search. The Operator Machine handles crew/proof/invoice
// decisions in the background.
(function churvoxSimplifyJobsPanel() {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    function cleanText(value) {
      return String(value || "").replace(/\s+/g, " ").trim();
    }

    function setTextIfExact(oldText, newText) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      nodes.forEach((node) => {
        if (cleanText(node.nodeValue) === oldText) {
          node.nodeValue = String(node.nodeValue).replace(oldText, newText);
        }
      });
    }

    function setTextIfContains(matchText, newText) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);

      nodes.forEach((node) => {
        if (cleanText(node.nodeValue).includes(matchText)) {
          node.nodeValue = newText;
        }
      });
    }

    function hideChipByText(text) {
      const wanted = String(text).toLowerCase();
      const items = Array.from(document.querySelectorAll("button, a, [role='button'], span, div"));
      items.forEach((el) => {
        if (cleanText(el.textContent).toLowerCase() !== wanted) return;

        const clickable = el.closest("button, a, [role='button']") || el;
        clickable.style.display = "none";
        clickable.setAttribute("aria-hidden", "true");
      });
    }

    function patchJobsPanel() {
      if (!document.body) return;

      setTextIfExact("JOB QUEUE", "JOBS");
      setTextIfExact("Job Queue", "Jobs");
      setTextIfExact("What needs job attention.", "Jobs");
      setTextIfExact("What needs job attention", "Jobs");

      setTextIfContains(
        "Filter the work, then open one Work Slip to review, edit, dispatch or invoice.",
        "Search jobs, then open a Work Slip. The machine handles crew, proof and invoices in the background."
      );

      setTextIfContains(
        "Filter the work, then open one Work Slip",
        "Search jobs, then open a Work Slip. The machine handles crew, proof and invoices in the background."
      );

      setTextIfExact("Needs dispatch", "Needs crew");
      setTextIfExact("DISPATCH NEEDED", "READY TO ASSIGN");
      setTextIfExact("Dispatch needed", "Ready to assign");

      setTextIfExact("No jobs match this view.", "No jobs found.");
      setTextIfExact("Try another filter or add a new job intake.", "Use search or add a new job intake.");

      ["Priority", "Needs dispatch", "Needs crew", "Active", "Completed", "All jobs"].forEach(hideChipByText);

      Array.from(document.querySelectorAll("input")).forEach((input) => {
        const placeholder = cleanText(input.getAttribute("placeholder"));
        if (/search jobs/i.test(placeholder)) {
          input.setAttribute("placeholder", "Search jobs");
        }
      });

      if (!document.getElementById("churvox-phase-179-jobs-panel-css")) {
        const style = document.createElement("style");
        style.id = "churvox-phase-179-jobs-panel-css";
        style.textContent = `
          /* PHASE_179_SIMPLIFY_JOBS_PANEL_NO_QUEUE */
          [data-churvox-hidden-job-filter="true"] {
            display: none !important;
          }
        `;
        document.head.appendChild(style);
      }
    }

    let timer = null;
    function schedulePatch() {
      window.clearTimeout(timer);
      timer = window.setTimeout(patchJobsPanel, 80);
    }

    window.addEventListener("load", schedulePatch);
    document.addEventListener("click", schedulePatch, true);
    document.addEventListener("input", schedulePatch, true);

    const observer = new MutationObserver(schedulePatch);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    schedulePatch();
  } catch {
    // Keep app boot safe.
  }
})();




// PHASE_147_PROFESSIONAL_INVOICE_OVERLAY
// This sits on top of the forced Phase 146 invoice and replaces the visual with
// a cleaner, professional A4-style invoice while keeping the same approval buttons.
(function churvoxProfessionalInvoiceOverlay() {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    function text(el, fallback = "") {
      return String(el?.textContent || fallback || "").replace(/\s+/g, " ").trim();
    }

    function moneyNumber(value) {
      const raw = String(value || "").replace(/[^0-9.]/g, "");
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }

    function money(value) {
      const n = moneyNumber(value);
      if (!n || n <= 0) return "$0.00";
      return new Intl.NumberFormat("en-NZ", {
        style: "currency",
        currency: "NZD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    }

    function ensureStyle() {
      if (document.getElementById("churvox-phase-147-professional-invoice-style")) return;

      const style = document.createElement("style");
      style.id = "churvox-phase-147-professional-invoice-style";
      style.textContent = `
        .cx-phase-146-invoice-paper {
          display: none !important;
        }

        .cx-phase-147-invoice-paper {
          width: min(100%, 920px) !important;
          min-height: 1040px !important;
          margin: 18px auto 24px !important;
          background: #fffef9 !important;
          color: #151510 !important;
          border: 1px solid rgba(21,21,16,0.16) !important;
          border-radius: 14px !important;
          overflow: hidden !important;
          box-shadow: 0 24px 70px rgba(21,21,16,0.18) !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }

        .cx-phase-147-top-strip {
          height: 12px !important;
          background: linear-gradient(90deg, #151510 0%, #151510 76%, #c8ff42 76%, #c8ff42 100%) !important;
        }

        .cx-phase-147-header {
          display: grid !important;
          grid-template-columns: 1fr 280px !important;
          gap: 36px !important;
          padding: 42px 52px 28px !important;
          border-bottom: 1px solid rgba(21,21,16,0.12) !important;
        }

        .cx-phase-147-business h2 {
          margin: 0 0 10px !important;
          color: #151510 !important;
          font-size: 30px !important;
          line-height: 1 !important;
          letter-spacing: -0.05em !important;
          font-weight: 950 !important;
        }

        .cx-phase-147-business p,
        .cx-phase-147-meta p,
        .cx-phase-147-card p,
        .cx-phase-147-payment p {
          margin: 4px 0 !important;
          color: #625d50 !important;
          font-size: 13px !important;
          line-height: 1.45 !important;
          font-weight: 650 !important;
        }

        .cx-phase-147-title {
          text-align: right !important;
        }

        .cx-phase-147-title span,
        .cx-phase-147-label,
        .cx-phase-147-payment span {
          display: block !important;
          color: #6f6a5b !important;
          font-size: 10px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
          letter-spacing: 0.14em !important;
          text-transform: uppercase !important;
        }

        .cx-phase-147-title h1 {
          margin: 8px 0 16px !important;
          color: #151510 !important;
          font-size: 54px !important;
          line-height: 0.9 !important;
          letter-spacing: -0.085em !important;
          font-weight: 950 !important;
        }

        .cx-phase-147-meta {
          display: grid !important;
          gap: 8px !important;
          padding: 16px !important;
          background: #f7efd9 !important;
          border: 1px solid rgba(21,21,16,0.12) !important;
          border-radius: 14px !important;
          text-align: left !important;
        }

        .cx-phase-147-meta div {
          display: flex !important;
          justify-content: space-between !important;
          gap: 14px !important;
        }

        .cx-phase-147-meta strong {
          color: #151510 !important;
          font-size: 13px !important;
          font-weight: 950 !important;
        }

        .cx-phase-147-parties {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 18px !important;
          padding: 28px 52px !important;
        }

        .cx-phase-147-card {
          min-height: 170px !important;
          padding: 22px !important;
          background: #fbf6ea !important;
          border: 1px solid rgba(21,21,16,0.11) !important;
          border-radius: 14px !important;
        }

        .cx-phase-147-card strong {
          display: block !important;
          margin: 12px 0 10px !important;
          color: #151510 !important;
          font-size: 22px !important;
          line-height: 1.08 !important;
          font-weight: 950 !important;
          letter-spacing: -0.04em !important;
        }

        .cx-phase-147-table {
          margin: 8px 52px 28px !important;
          border: 1px solid rgba(21,21,16,0.16) !important;
          border-radius: 12px !important;
          overflow: hidden !important;
        }

        .cx-phase-147-table-head,
        .cx-phase-147-table-row {
          display: grid !important;
          grid-template-columns: minmax(280px, 1fr) 70px 120px 120px !important;
        }

        .cx-phase-147-table-head {
          background: #151510 !important;
          color: #fffef9 !important;
        }

        .cx-phase-147-table-head span {
          padding: 14px 16px !important;
          color: #fffef9 !important;
          font-size: 10px !important;
          font-weight: 950 !important;
          letter-spacing: 0.12em !important;
          text-transform: uppercase !important;
        }

        .cx-phase-147-table-row {
          min-height: 170px !important;
          background: #fffef9 !important;
        }

        .cx-phase-147-table-row > div,
        .cx-phase-147-table-row > span {
          padding: 22px 16px !important;
          color: #151510 !important;
          border-top: 1px solid rgba(21,21,16,0.08) !important;
          font-size: 13px !important;
          font-weight: 800 !important;
        }

        .cx-phase-147-table-row > span {
          text-align: right !important;
        }

        .cx-phase-147-table-row strong {
          display: block !important;
          margin: 0 0 8px !important;
          color: #151510 !important;
          font-size: 16px !important;
          font-weight: 950 !important;
        }

        .cx-phase-147-table-row p {
          margin: 0 !important;
          color: #625d50 !important;
          font-size: 13px !important;
          line-height: 1.45 !important;
          font-weight: 650 !important;
        }

        .cx-phase-147-bottom {
          display: grid !important;
          grid-template-columns: 1fr 330px !important;
          gap: 28px !important;
          padding: 0 52px 52px !important;
        }

        .cx-phase-147-payment {
          padding: 20px !important;
          background: #fbf6ea !important;
          border: 1px solid rgba(21,21,16,0.11) !important;
          border-radius: 14px !important;
        }

        .cx-phase-147-totals {
          padding: 18px 20px !important;
          background: #fbf6ea !important;
          border: 1px solid rgba(21,21,16,0.13) !important;
          border-radius: 14px !important;
        }

        .cx-phase-147-totals div {
          display: flex !important;
          justify-content: space-between !important;
          gap: 18px !important;
          padding: 11px 0 !important;
          color: #6f6a5b !important;
          border-bottom: 1px solid rgba(21,21,16,0.1) !important;
          font-size: 13px !important;
          font-weight: 850 !important;
        }

        .cx-phase-147-totals strong {
          color: #151510 !important;
          font-weight: 950 !important;
        }

        .cx-phase-147-totals .total {
          align-items: center !important;
          margin-top: 8px !important;
          padding-top: 18px !important;
          border-top: 2px solid #151510 !important;
          border-bottom: 0 !important;
          color: #151510 !important;
          font-size: 17px !important;
        }

        .cx-phase-147-totals .total strong {
          min-width: 145px !important;
          padding: 10px 13px !important;
          background: #151510 !important;
          color: #fffef9 !important;
          border-radius: 12px !important;
          text-align: right !important;
          font-size: 21px !important;
          letter-spacing: -0.04em !important;
        }

        @media (max-width: 860px) {
          .cx-phase-147-invoice-paper {
            min-height: auto !important;
          }

          .cx-phase-147-header,
          .cx-phase-147-parties,
          .cx-phase-147-bottom {
            grid-template-columns: 1fr !important;
            padding-left: 24px !important;
            padding-right: 24px !important;
          }

          .cx-phase-147-title {
            text-align: left !important;
          }

          .cx-phase-147-table {
            margin-left: 24px !important;
            margin-right: 24px !important;
            overflow-x: auto !important;
          }

          .cx-phase-147-table-head,
          .cx-phase-147-table-row {
            min-width: 680px !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    function buildOverlay() {
      ensureStyle();

      const oldPaper = document.querySelector(".cx-phase-146-invoice-paper");
      if (!oldPaper) return;

      const modal = oldPaper.closest(".cx-phase-146-invoice-modal") || oldPaper.parentElement;
      if (!modal) return;

      let newPaper = modal.querySelector(".cx-phase-147-invoice-paper");
      if (!newPaper) {
        newPaper = document.createElement("section");
        newPaper.className = "cx-phase-147-invoice-paper";
        oldPaper.insertAdjacentElement("beforebegin", newPaper);
      }

      const infoCards = oldPaper.querySelectorAll(".cx-phase-146-invoice-info article");
      const businessCard = infoCards[0];
      const clientCard = infoCards[1];

      const businessName = text(businessCard?.querySelector("strong"), "Your business");
      const businessLines = Array.from(businessCard?.querySelectorAll("p") || []).map((p) => text(p)).filter(Boolean);
      const clientName = text(clientCard?.querySelector("strong"), "Client name needed");
      const clientLines = Array.from(clientCard?.querySelectorAll("p") || []).map((p) => text(p)).filter(Boolean);

      const amountText = text(oldPaper.querySelector(".cx-phase-146-totals .total strong"), "$0.00");
      const amount = moneyNumber(amountText);
      const subtotal = amount > 0 ? amount / 1.15 : 0;
      const gst = amount > 0 ? amount - subtotal : 0;
      const lineTitle = text(oldPaper.querySelector(".cx-phase-146-line-row strong"), "Completed service");
      const lineDescription = text(oldPaper.querySelector(".cx-phase-146-line-row p"), "Completed service prepared for owner approval.");
      const reference = text(oldPaper.querySelector(".cx-phase-146-invoice-no strong"), "DRAFT");

      newPaper.innerHTML = `
        <div class="cx-phase-147-top-strip"></div>

        <header class="cx-phase-147-header">
          <section class="cx-phase-147-business">
            <h2>${businessName}</h2>
            <p>${businessLines[0] || "hello@yourbusiness.co.nz"}</p>
            <p>${businessLines[1] || "Business phone"}</p>
            <p>${businessLines[2] && businessLines[2] !== "15" ? businessLines[2] : "GST / tax details not set"}</p>
          </section>

          <section class="cx-phase-147-title">
            <span>Tax invoice</span>
            <h1>Invoice</h1>
            <div class="cx-phase-147-meta">
              <div><p>Invoice #</p><strong>${reference}</strong></div>
              <div><p>Issue date</p><strong>${new Date().toISOString().slice(0, 10)}</strong></div>
              <div><p>Due date</p><strong>Due on receipt</strong></div>
            </div>
          </section>
        </header>

        <section class="cx-phase-147-parties">
          <article class="cx-phase-147-card">
            <span class="cx-phase-147-label">Bill to</span>
            <strong>${clientName}</strong>
            <p>${clientLines[0] || "client@email.co.nz"}</p>
            <p>${clientLines[1] || "Client address"}</p>
            <p>${clientLines[2] || ""}</p>
          </article>

          <article class="cx-phase-147-card">
            <span class="cx-phase-147-label">Job / work details</span>
            <strong>${lineTitle}</strong>
            <p>${lineDescription}</p>
          </article>
        </section>

        <section class="cx-phase-147-table">
          <div class="cx-phase-147-table-head">
            <span>Description</span>
            <span>Qty</span>
            <span>Rate</span>
            <span>Amount</span>
          </div>

          <div class="cx-phase-147-table-row">
            <div>
              <strong>${lineTitle}</strong>
              <p>${lineDescription}</p>
            </div>
            <span>1</span>
            <span>${amount > 0 ? money(amount) : "Set amount"}</span>
            <span>${amount > 0 ? money(amount) : "Set amount"}</span>
          </div>
        </section>

        <section class="cx-phase-147-bottom">
          <article class="cx-phase-147-payment">
            <span>Payment details</span>
            <p>Add bank account, payment link, or payment instructions before sending.</p>
            <span>Notes</span>
            <p>Thank you for your business.</p>
          </article>

          <article class="cx-phase-147-totals">
            <div><span>Subtotal</span><strong>${amount > 0 ? money(subtotal) : "$0.00"}</strong></div>
            <div><span>GST 15%</span><strong>${amount > 0 ? money(gst) : "$0.00"}</strong></div>
            <div class="total"><span>Total due</span><strong>${amount > 0 ? money(amount) : "Amount required"}</strong></div>
          </article>
        </section>
      `;
    }

    let timer = null;
    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(buildOverlay, 120);
    }

    window.addEventListener("load", schedule);
    document.addEventListener("click", schedule, true);
    document.addEventListener("input", schedule, true);
    document.addEventListener("change", schedule, true);

    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    schedule();
  } catch {
    // keep app boot safe
  }
})();




// PHASE_146_FORCE_EXACT_OLD_INVOICE_READY_MODAL
// This targets the OLD visible invoice modal from the screenshot:
// "Invoice ready" + "Approve & email PDF" + "Amount owing".
// It force-inserts a proper invoice document into that exact modal.
(function churvoxForceOldInvoiceReadyModal() {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    function moneyText(value) {
      const raw = String(value || "").replace(/[^0-9.]/g, "");
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return "$0.00";
      return new Intl.NumberFormat("en-NZ", {
        style: "currency",
        currency: "NZD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    }

    function clean(value, fallback) {
      const text = String(value || "").replace(/\s+/g, " ").trim();
      return text || fallback || "";
    }

    function readInputByLabel(root, labelWords, fallback) {
      const words = labelWords.map((word) => String(word).toLowerCase());

      const labels = Array.from(root.querySelectorAll("label"));
      for (const label of labels) {
        const labelText = clean(label.textContent, "").toLowerCase();
        const hit = words.every((word) => labelText.includes(word));
        if (!hit) continue;

        const field = label.querySelector("input, textarea, select");
        if (field && clean(field.value, "")) return clean(field.value, fallback);
      }

      const fields = Array.from(root.querySelectorAll("input, textarea, select"));
      for (const field of fields) {
        const wrapper = field.closest("label, div, section, article") || field.parentElement;
        const labelText = clean(wrapper ? wrapper.textContent : "", "").toLowerCase();
        const hit = words.every((word) => labelText.includes(word));
        if (hit && clean(field.value, "")) return clean(field.value, fallback);
      }

      return fallback || "";
    }

    function findAmount(root) {
      const fieldAmount =
        readInputByLabel(root, ["total", "invoice"], "") ||
        readInputByLabel(root, ["amount", "owing"], "") ||
        readInputByLabel(root, ["invoice", "amount"], "");

      if (fieldAmount) return fieldAmount;

      const text = clean(root.textContent, "");
      const matches = [
        text.match(/Amount owing\s*\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/i),
        text.match(/Total invoice\s*\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/i),
        text.match(/\$\s*([0-9]+(?:\.[0-9]{1,2})?)/i),
      ].filter(Boolean);

      return matches[0] ? matches[0][1] : "";
    }

    function findInvoiceModal() {
      const candidates = Array.from(document.querySelectorAll("div, section, dialog, article"))
        .filter((el) => {
          const text = clean(el.textContent, "").toLowerCase();
          if (!text.includes("invoice")) return false;
          if (!text.includes("approve") || !text.includes("pdf")) return false;
          return text.includes("invoice ready") || text.includes("amount owing") || text.includes("fill the invoice");
        })
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return { el, area: Math.max(rect.width, 1) * Math.max(rect.height, 1), rect };
        })
        .filter((item) => item.rect.width > 360 && item.rect.height > 360)
        .sort((a, b) => a.area - b.area);

      return candidates[0]?.el || null;
    }

    function ensureStyle() {
      if (document.getElementById("churvox-phase-146-invoice-style")) return;

      const style = document.createElement("style");
      style.id = "churvox-phase-146-invoice-style";
      style.textContent = `
        .cx-phase-146-invoice-modal {
          max-width: min(96vw, 1040px) !important;
          width: min(96vw, 1040px) !important;
        }

        .cx-phase-146-invoice-paper {
          width: min(100%, 920px) !important;
          min-height: 1060px !important;
          margin: 18px auto 24px !important;
          background: #fffdf7 !important;
          color: #151510 !important;
          border: 1px solid rgba(21, 21, 16, 0.18) !important;
          border-radius: 18px !important;
          overflow: hidden !important;
          box-shadow: 0 34px 110px rgba(21, 21, 16, 0.22) !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }

        .cx-phase-146-invoice-header {
          display: grid !important;
          grid-template-columns: 1fr 210px !important;
          gap: 28px !important;
          padding: 48px 54px 42px !important;
          background: linear-gradient(90deg, #151510 0%, #151510 64%, #c8ff42 64%, #c8ff42 100%) !important;
        }

        .cx-phase-146-invoice-header span {
          display: block !important;
          color: rgba(255,255,255,0.75) !important;
          font-size: 11px !important;
          font-weight: 950 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        .cx-phase-146-invoice-header h1 {
          margin: 12px 0 10px !important;
          color: #fffdf7 !important;
          font-size: clamp(64px, 8vw, 104px) !important;
          line-height: 0.86 !important;
          letter-spacing: -0.1em !important;
          font-weight: 950 !important;
        }

        .cx-phase-146-invoice-header p {
          max-width: 520px !important;
          margin: 0 !important;
          color: rgba(255,255,255,0.76) !important;
          font-size: 15px !important;
          line-height: 1.55 !important;
          font-weight: 750 !important;
        }

        .cx-phase-146-invoice-no {
          padding: 18px !important;
          border-radius: 18px !important;
          background: #fffdf7 !important;
          color: #151510 !important;
          text-align: right !important;
        }

        .cx-phase-146-invoice-no small {
          display: block !important;
          color: #6f6a5b !important;
          font-size: 11px !important;
          font-weight: 900 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
        }

        .cx-phase-146-invoice-no b {
          display: inline-flex !important;
          margin: 7px 0 18px !important;
          padding: 7px 12px !important;
          border-radius: 999px !important;
          background: #c8ff42 !important;
          color: #151510 !important;
          font-size: 11px !important;
          font-weight: 950 !important;
          text-transform: uppercase !important;
        }

        .cx-phase-146-invoice-no strong {
          display: block !important;
          color: #151510 !important;
          font-size: 24px !important;
          font-weight: 950 !important;
        }

        .cx-phase-146-invoice-info {
          display: grid !important;
          grid-template-columns: 1fr 1fr 0.9fr !important;
          gap: 18px !important;
          padding: 38px 54px 24px !important;
        }

        .cx-phase-146-invoice-info article {
          min-height: 168px !important;
          padding: 22px !important;
          border: 1px solid rgba(21,21,16,0.12) !important;
          border-radius: 18px !important;
          background: #f7efd9 !important;
        }

        .cx-phase-146-invoice-info span,
        .cx-phase-146-invoice-payment span {
          display: block !important;
          color: #6f6a5b !important;
          font-size: 11px !important;
          font-weight: 950 !important;
          letter-spacing: 0.13em !important;
          text-transform: uppercase !important;
        }

        .cx-phase-146-invoice-info strong {
          display: block !important;
          margin: 12px 0 10px !important;
          color: #151510 !important;
          font-size: 22px !important;
          line-height: 1.05 !important;
          font-weight: 950 !important;
          letter-spacing: -0.04em !important;
        }

        .cx-phase-146-invoice-info p {
          margin: 5px 0 !important;
          color: #625d50 !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
          font-weight: 750 !important;
        }

        .cx-phase-146-invoice-lines {
          margin: 28px 54px 30px !important;
          border: 1px solid rgba(21,21,16,0.16) !important;
          border-radius: 14px !important;
          overflow: hidden !important;
        }

        .cx-phase-146-line-head,
        .cx-phase-146-line-row {
          display: grid !important;
          grid-template-columns: minmax(280px, 1fr) 74px 132px 132px !important;
        }

        .cx-phase-146-line-head {
          background: #151510 !important;
          color: #fffdf7 !important;
        }

        .cx-phase-146-line-head span {
          padding: 15px 18px !important;
          color: #fffdf7 !important;
          font-size: 11px !important;
          font-weight: 950 !important;
          letter-spacing: 0.12em !important;
          text-transform: uppercase !important;
        }

        .cx-phase-146-line-row {
          min-height: 170px !important;
          background: #fffdf7 !important;
        }

        .cx-phase-146-line-row > div,
        .cx-phase-146-line-row > span {
          padding: 24px 18px !important;
          border-top: 1px solid rgba(21,21,16,0.08) !important;
          color: #151510 !important;
          font-size: 14px !important;
          font-weight: 850 !important;
        }

        .cx-phase-146-line-row > span {
          text-align: right !important;
        }

        .cx-phase-146-line-row strong {
          display: block !important;
          margin-bottom: 10px !important;
          color: #151510 !important;
          font-size: 18px !important;
          font-weight: 950 !important;
        }

        .cx-phase-146-line-row p {
          margin: 0 !important;
          color: #625d50 !important;
          font-size: 14px !important;
          line-height: 1.5 !important;
          font-weight: 700 !important;
        }

        .cx-phase-146-summary {
          display: grid !important;
          grid-template-columns: 1fr minmax(300px, 380px) !important;
          gap: 26px !important;
          padding: 0 54px 54px !important;
        }

        .cx-phase-146-invoice-payment,
        .cx-phase-146-totals {
          padding: 22px !important;
          border: 1px solid rgba(21,21,16,0.13) !important;
          border-radius: 18px !important;
          background: #f7efd9 !important;
        }

        .cx-phase-146-invoice-payment p {
          margin: 9px 0 20px !important;
          color: #625d50 !important;
          font-size: 14px !important;
          line-height: 1.5 !important;
          font-weight: 750 !important;
        }

        .cx-phase-146-totals div {
          display: flex !important;
          justify-content: space-between !important;
          gap: 20px !important;
          padding: 12px 0 !important;
          border-bottom: 1px solid rgba(21,21,16,0.1) !important;
          color: #6f6a5b !important;
          font-size: 14px !important;
          font-weight: 900 !important;
        }

        .cx-phase-146-totals strong {
          color: #151510 !important;
          font-weight: 950 !important;
        }

        .cx-phase-146-totals .total {
          align-items: center !important;
          margin-top: 10px !important;
          padding-top: 18px !important;
          border-top: 2px solid #151510 !important;
          border-bottom: 0 !important;
          color: #151510 !important;
          font-size: 19px !important;
        }

        .cx-phase-146-totals .total strong {
          min-width: 160px !important;
          padding: 12px 15px !important;
          border-radius: 14px !important;
          background: #151510 !important;
          color: #fffdf7 !important;
          text-align: right !important;
          font-size: 24px !important;
          letter-spacing: -0.04em !important;
        }

        .cx-phase-146-hidden-old-invoice {
          display: none !important;
        }

        @media (max-width: 860px) {
          .cx-phase-146-invoice-header,
          .cx-phase-146-invoice-info,
          .cx-phase-146-summary {
            grid-template-columns: 1fr !important;
            padding-left: 24px !important;
            padding-right: 24px !important;
          }

          .cx-phase-146-invoice-no {
            text-align: left !important;
          }

          .cx-phase-146-invoice-lines {
            margin-left: 24px !important;
            margin-right: 24px !important;
            overflow-x: auto !important;
          }

          .cx-phase-146-line-head,
          .cx-phase-146-line-row {
            min-width: 700px !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    function renderProperInvoice(root) {
      ensureStyle();

      const title =
        clean(root.querySelector("h1,h2,h3")?.textContent, "") ||
        "Invoice draft";

      const businessName =
        readInputByLabel(root, ["business"], "") ||
        "Your business";

      const businessEmail =
        readInputByLabel(root, ["business", "email"], "") ||
        "hello@yourbusiness.co.nz";

      const businessPhone =
        readInputByLabel(root, ["business", "phone"], "") ||
        "Business phone";

      const gst =
        readInputByLabel(root, ["gst"], "") ||
        readInputByLabel(root, ["tax"], "") ||
        "GST / tax number";

      const clientName =
        readInputByLabel(root, ["client", "name"], "") ||
        clean(title.replace(/^invoice\s+for\s+/i, ""), "Client name needed");

      const customerEmail =
        readInputByLabel(root, ["customer", "email"], "") ||
        readInputByLabel(root, ["client", "email"], "") ||
        "client@email.co.nz";

      const clientAddress =
        readInputByLabel(root, ["client", "address"], "") ||
        readInputByLabel(root, ["customer", "address"], "") ||
        "Client address";

      const description =
        readInputByLabel(root, ["description"], "") ||
        readInputByLabel(root, ["line"], "") ||
        "Completed service prepared for owner approval.";

      const rawAmount = findAmount(root);
      const amountText = rawAmount ? moneyText(rawAmount) : "Amount required";
      const amountNumber = Number(String(rawAmount || "").replace(/[^0-9.]/g, ""));
      const subtotal = Number.isFinite(amountNumber) && amountNumber > 0 ? amountNumber / 1.15 : 0;
      const gstAmount = Number.isFinite(amountNumber) && amountNumber > 0 ? amountNumber - subtotal : 0;

      const invoiceRef =
        clean(root.textContent.match(/reference\s+([a-z0-9]+)/i)?.[1], "") ||
        "DRAFT";

      let paper = root.querySelector(".cx-phase-146-invoice-paper");
      if (!paper) {
        paper = document.createElement("section");
        paper.className = "cx-phase-146-invoice-paper";
        paper.setAttribute("aria-label", "Proper invoice template forced live");

        const header = root.querySelector("header") || root.firstElementChild;
        if (header && header.parentElement === root) {
          header.insertAdjacentElement("afterend", paper);
        } else {
          root.prepend(paper);
        }
      }

      paper.innerHTML = `
        <header class="cx-phase-146-invoice-header">
          <div>
            <span>PROPER INVOICE TEMPLATE · PHASE 146</span>
            <h1>INVOICE</h1>
            <p>Prepared by Churvox. Owner checks, edits and approves before sending the PDF.</p>
          </div>
          <aside class="cx-phase-146-invoice-no">
            <small>Status</small>
            <b>Draft</b>
            <small>Reference</small>
            <strong>${invoiceRef}</strong>
          </aside>
        </header>

        <section class="cx-phase-146-invoice-info">
          <article>
            <span>From</span>
            <strong>${businessName}</strong>
            <p>${businessEmail}</p>
            <p>${businessPhone}</p>
            <p>${gst}</p>
          </article>

          <article>
            <span>Bill to</span>
            <strong>${clientName}</strong>
            <p>${customerEmail}</p>
            <p>${clientAddress}</p>
          </article>

          <article>
            <span>Invoice dates</span>
            <p><strong>Issue date</strong></p>
            <p>${new Date().toISOString().slice(0, 10)}</p>
            <p><strong>Due date</strong></p>
            <p>Due on receipt / owner terms</p>
          </article>
        </section>

        <section class="cx-phase-146-invoice-lines">
          <div class="cx-phase-146-line-head">
            <span>Description</span>
            <span>Qty</span>
            <span>Rate</span>
            <span>Amount</span>
          </div>
          <div class="cx-phase-146-line-row">
            <div>
              <strong>Completed service</strong>
              <p>${description}</p>
            </div>
            <span>1</span>
            <span>${amountText}</span>
            <span>${amountText}</span>
          </div>
        </section>

        <section class="cx-phase-146-summary">
          <article class="cx-phase-146-invoice-payment">
            <span>Payment details</span>
            <p>Add bank account, payment link, or payment instructions before sending.</p>
            <span>Notes</span>
            <p>Thank you for your business.</p>
          </article>

          <article class="cx-phase-146-totals">
            <div><span>Subtotal</span><strong>${subtotal > 0 ? moneyText(subtotal) : "$0.00"}</strong></div>
            <div><span>GST 15%</span><strong>${gstAmount > 0 ? moneyText(gstAmount) : "$0.00"}</strong></div>
            <div class="total"><span>Total due</span><strong>${amountText}</strong></div>
          </article>
        </section>
      `;

      root.classList.add("cx-phase-146-invoice-modal");

      const footer = Array.from(root.querySelectorAll("footer, div, section"))
        .find((el) => clean(el.textContent, "").toLowerCase().includes("approve") && clean(el.textContent, "").toLowerCase().includes("pdf"));

      const keep = new Set([paper]);

      const topHeader = root.querySelector(":scope > header");
      if (topHeader) keep.add(topHeader);

      if (footer) {
        let node = footer;
        while (node && node !== root) {
          keep.add(node);
          node = node.parentElement;
        }
      }

      Array.from(root.children).forEach((child) => {
        if (!keep.has(child) && child !== paper) {
          child.classList.add("cx-phase-146-hidden-old-invoice");
        }
      });
    }

    function scan() {
      const root = findInvoiceModal();
      if (!root) return;

      renderProperInvoice(root);
    }

    let timer = null;
    function scheduleScan() {
      window.clearTimeout(timer);
      timer = window.setTimeout(scan, 80);
    }

    window.addEventListener("load", scheduleScan);
    document.addEventListener("click", scheduleScan, true);
    document.addEventListener("input", scheduleScan, true);
    document.addEventListener("change", scheduleScan, true);

    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    scheduleScan();
  } catch {
    // keep app boot safe
  }
})();



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
