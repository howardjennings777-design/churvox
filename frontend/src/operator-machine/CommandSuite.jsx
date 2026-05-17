import React, { useEffect, useMemo, useState } from "react";
import "./CommandSuite.css";

const PAGE_MAP = {
  dashboard: "dashboard",
  jobs: "work",
  work: "work",
  clients: "clients",
  team: "crew",
  crew: "crew",
  quotes: "quotes",
  invoices: "invoices",
  proof: "proof",
  payments: "proof",
  payroll: "payroll",
  plans: "plans",
  settings: "settings",
};

const NAV_ITEMS = [
  ["Dashboard", "dashboard", "target"],
  ["Work", "jobs", "briefcase"],
  ["Clients", "clients", "client"],
  ["Crew", "team", "crew"],
  ["Quotes", "quotes", "document"],
  ["Invoices", "invoices", "money"],
  ["Proof & Pay", "proof", "photo"],
  ["Payroll", "payroll", "pulse"],
  ["Plans", "plans", "shield"],
  ["Settings", "settings", "gear"],
];

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function rowsFrom(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object" && Array.isArray(value.items)) return value.items;
    if (value && typeof value === "object" && Array.isArray(value.results)) return value.results;
    if (value && typeof value === "object" && Array.isArray(value.data)) return value.data;
  }
  return [];
}

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "$0";
  return `$${n.toLocaleString()}`;
}

function statusOf(item = {}) {
  return clean(item.status || item.job_status || item.workflow_status || item.state || "Ready");
}

function areaOf(item = {}) {
  return clean(item.area || item.region || item.suburb || item.location || item.address || "Not set");
}

function clientName(item = {}) {
  return clean(
    item.client_name ||
      item.clientName ||
      item.customer_name ||
      item.customerName ||
      item.client ||
      item.name ||
      "Client"
  );
}

function workerName(item = {}) {
  return clean(
    item.worker_name ||
      item.assigned_worker_name ||
      item.assignedWorkerName ||
      item.employee_name ||
      item.full_name ||
      item.name ||
      "Unassigned"
  );
}

function titleOf(item = {}, fallback = "Record") {
  return clean(
    item.title ||
      item.name ||
      item.job_title ||
      item.jobTitle ||
      item.description ||
      item.invoice_number ||
      item.quote_number ||
      item.number ||
      fallback
  );
}

function idOf(item = {}, index = 0) {
  return clean(item.id || item._id || item.uuid || item.number || item.invoice_number || item.quote_number || `row-${index}`);
}

function textOf(item = {}) {
  return Object.values(item || {}).map((value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return "";
    return clean(value);
  }).join(" ").toLowerCase();
}

function slipText(item = {}) {
  return [
    item.kind,
    item.eyebrow,
    item.title,
    item.need,
    item.prepared,
    item.detail,
    item.status,
    item.reason,
    item.ai_reason,
  ].map(clean).join(" ").toLowerCase();
}

function riskFor(item = {}) {
  const text = slipText(item) || textOf(item);
  if (
    text.includes("missing") ||
    text.includes("blocked") ||
    text.includes("failed") ||
    text.includes("overdue") ||
    text.includes("risk") ||
    text.includes("amount") ||
    text.includes("no email") ||
    text.includes("no phone")
  ) {
    return { label: "High risk", tone: "high" };
  }
  if (
    text.includes("quote") ||
    text.includes("follow") ||
    text.includes("payment") ||
    text.includes("reminder") ||
    text.includes("worker") ||
    text.includes("crew") ||
    text.includes("dispatch")
  ) {
    return { label: "Medium", tone: "medium" };
  }
  return { label: "Low risk", tone: "low" };
}

function aiReason(item = {}, fallback = "Churvox prepared this for review.") {
  return clean(item.prepared || item.need || item.ai_reason || item.reason, fallback);
}

function Icon({ type }) {
  return <i className={`cs-icon ${type || "spark"}`} aria-hidden="true" />;
}


const PHASE_235_FORCED_COMMANDSUITE_THEME = `
/* PHASE_235_FORCED_COMMANDSUITE_THEME */
:root {
  --cs-black: #0d0b0a !important;
  --cs-black-2: #17120f !important;
  --cs-orange: #b85720 !important;
  --cs-orange-2: #d56b2a !important;
  --cs-orange-3: #e48643 !important;
  --cs-paper: #fff8ef !important;
  --cs-cream: #fbf4ea !important;
  --cs-soft: #f4ede3 !important;
  --cs-muted: #6d6258 !important;
  --cs-front-bg:
    radial-gradient(circle at 78% 6%, rgba(184, 87, 32, 0.24), transparent 30rem),
    radial-gradient(circle at 6% 20%, rgba(255, 248, 239, 0.08), transparent 26rem),
    radial-gradient(circle at 58% 100%, rgba(184, 87, 32, 0.10), transparent 36rem),
    linear-gradient(135deg, #0d0b0a 0%, #17120f 48%, #221713 100%) !important;
}

html,
body,
#root,
.App,
.om-shell,
.om-main,
.cs-page {
  background: var(--cs-front-bg) !important;
}

.om-main {
  background: var(--cs-front-bg) !important;
  min-height: calc(100vh - 78px) !important;
}

.cs-page {
  background: transparent !important;
}

.om-nav {
  background: #0d0b0a !important;
  border-bottom: 1px solid rgba(213, 107, 42, 0.24) !important;
  box-shadow: 0 12px 32px rgba(13, 11, 10, 0.34) !important;
}

.cs-hero {
  background:
    radial-gradient(circle at 82% 20%, rgba(255, 248, 239, 0.08), transparent 26rem),
    linear-gradient(116deg, #0d0b0a 0%, #17120f 50.5%, #b85720 50.6%, #d56b2a 100%) !important;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.34) !important;
}

.cs-hero h1,
.cs-hero p,
.cs-stat strong,
.cs-stat span {
  color: #fff8ef !important;
}

.cs-hero h1 mark,
.cs-hero span:first-child {
  color: #e48643 !important;
}

.cs-stat {
  background: rgba(13, 11, 10, 0.92) !important;
  border: 1px solid rgba(255, 248, 239, 0.10) !important;
  box-shadow: 0 20px 44px rgba(0, 0, 0, 0.26) !important;
}

.cs-command-cards article,
.cs-ai-card,
.cs-desk,
.cs-workspace,
.cs-flow,
.cs-table,
.cs-row,
.cs-empty,
.cs-modal,
.cs-card,
.cs-panel,
.cs-list,
.cs-table-wrap,
.cs-plan-card,
.cs-pricing-card,
.cs-billing-card,
.cs-setting-card,
.cs-proof-card,
.cs-payroll-card,
.cs-client-card,
.cs-job-card,
.cs-quote-card,
.cs-invoice-card,
.cs-crew-card {
  background:
    radial-gradient(circle at top right, rgba(184, 87, 32, 0.06), transparent 18rem),
    linear-gradient(180deg, rgba(255, 248, 239, 0.97), rgba(251, 244, 234, 0.95)) !important;
  color: #0d0b0a !important;
  border: 1px solid rgba(255, 248, 239, 0.12) !important;
  box-shadow: 0 18px 56px rgba(0, 0, 0, 0.18) !important;
}

.cs-desk h2,
.cs-workspace h2,
.cs-command-cards strong,
.cs-command-cards span,
.cs-ai-card strong,
.cs-flow article strong,
.cs-flow > div span,
.cs-empty strong,
.cs-row strong,
.cs-approval-row strong,
.cs-modal h2,
.cs-table > header span,
.cs-page h1,
.cs-page h2,
.cs-page h3,
.cs-page h4 {
  color: #0d0b0a !important;
}

.cs-command-cards p,
.cs-ai-card p,
.cs-desk header p,
.cs-workspace header p,
.cs-flow article p,
.cs-row p,
.cs-row div,
.cs-approval-row p,
.cs-empty,
.cs-modal p,
.cs-page p,
.cs-page small {
  color: #6d6258 !important;
}

.cs-desk > header span,
.cs-workspace > header span,
.cs-approval-row > span,
.cs-table > header span,
.cs-modal header span,
.cs-risk,
.cs-page label,
.cs-page legend {
  color: #b85720 !important;
}

.cs-page input,
.cs-page textarea,
.cs-page select,
.cs-modal input,
.cs-modal textarea,
.cs-modal select {
  background: #fff8ef !important;
  color: #0d0b0a !important;
  border: 1px solid rgba(13, 11, 10, 0.14) !important;
}

.cs-approval-row button,
.cs-row button,
.cs-view,
.cs-modal button:not(.ghost),
.cs-page button:not(.ghost):not(.active),
.cs-page a.button,
.cs-page .button {
  color: #fff8ef !important;
  background:
    radial-gradient(circle at 28% 0%, rgba(255,255,255,0.18), transparent 28%),
    linear-gradient(135deg, #17120f, #2a211b 54%, #b85720) !important;
  border: 1px solid rgba(13, 11, 10, 0.22) !important;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22) !important;
}

.cs-filters,
.cs-tabs,
.cs-subnav,
.cs-mobile-nav,
.cs-filter-bar {
  background: rgba(255, 248, 239, 0.84) !important;
  border: 1px solid rgba(255, 248, 239, 0.16) !important;
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.16) !important;
}
`;

function usePhase235ForcedCommandSuiteTheme() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    let style = document.getElementById("phase-235-forced-commandsuite-theme");
    if (!style) {
      style = document.createElement("style");
      style.id = "phase-235-forced-commandsuite-theme";
      document.head.appendChild(style);
    }

    style.textContent = PHASE_235_FORCED_COMMANDSUITE_THEME;
    document.documentElement.setAttribute("data-churvox-theme-phase", "235");
    document.body?.setAttribute("data-churvox-theme-phase", "235");
  }, []);
}



const PHASE_236_EXACT_FRONT_PAGE_THEME = `
/* PHASE_236_EXACT_FRONT_PAGE_THEME
   Same visual language as the front page:
   dark outer canvas, cream panels, black/copper command hero.
*/
:root {
  --cs-black: #0d0b0a !important;
  --cs-black-2: #17120f !important;
  --cs-orange: #b85720 !important;
  --cs-orange-2: #d56b2a !important;
  --cs-orange-3: #e48643 !important;
  --cs-paper: #fff8ef !important;
  --cs-cream: #fbf4ea !important;
  --cs-soft: #f4ede3 !important;
  --cs-warm: #eadbc9 !important;
  --cs-muted: #6d6258 !important;
  --cs-line: rgba(13, 11, 10, 0.12) !important;
  --cs-front-page-bg:
    radial-gradient(circle at 78% 6%, rgba(184, 87, 32, 0.24), transparent 30rem),
    radial-gradient(circle at 6% 20%, rgba(255, 248, 239, 0.08), transparent 26rem),
    radial-gradient(circle at 58% 100%, rgba(184, 87, 32, 0.10), transparent 36rem),
    linear-gradient(135deg, #0d0b0a 0%, #17120f 48%, #221713 100%) !important;
}

html,
body,
#root,
.App,
.om-shell,
.om-main,
.cs-page {
  background: var(--cs-front-page-bg) !important;
  color: #0d0b0a !important;
}

.om-shell,
.om-main {
  min-height: 100vh !important;
}

.cs-page {
  background: transparent !important;
}

.om-nav {
  background: #0d0b0a !important;
  border-bottom: 1px solid rgba(213, 107, 42, 0.24) !important;
  box-shadow: 0 12px 32px rgba(13, 11, 10, 0.34) !important;
}

/* Main top hero: keep the exact dashboard/front-page black + copper block */
.cs-hero {
  background:
    radial-gradient(circle at 82% 20%, rgba(255, 248, 239, 0.08), transparent 26rem),
    linear-gradient(116deg, #0d0b0a 0%, #17120f 50.5%, #b85720 50.6%, #d56b2a 100%) !important;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.34) !important;
}

.cs-hero h1,
.cs-hero p,
.cs-hero span:first-child,
.cs-hero h1 mark {
  color: #fff8ef !important;
}

.cs-hero h1 mark,
.cs-hero span:first-child {
  color: #e48643 !important;
}

/* All page content panels sit like front-page cream sections on the dark background */
.cs-command-cards article,
.cs-ai-card,
.cs-desk,
.cs-workspace,
.cs-flow,
.cs-table,
.cs-row,
.cs-empty,
.cs-modal,
.cs-card,
.cs-panel,
.cs-list,
.cs-table-wrap,
.cs-plan-card,
.cs-pricing-card,
.cs-billing-card,
.cs-setting-card,
.cs-proof-card,
.cs-payroll-card,
.cs-client-card,
.cs-job-card,
.cs-quote-card,
.cs-invoice-card,
.cs-crew-card,
.cs-plan-cards article,
.cs-plan-addons,
.cs-plan-addons button,
.cs-sms-packs,
.cs-sms-packs button,
.cs-plan-compare,
.cs-trial-box {
  background:
    radial-gradient(circle at top right, rgba(184, 87, 32, 0.06), transparent 18rem),
    linear-gradient(180deg, rgba(255, 248, 239, 0.98), rgba(251, 244, 234, 0.95)) !important;
  color: #0d0b0a !important;
  border: 1px solid rgba(255, 248, 239, 0.16) !important;
  box-shadow: 0 18px 56px rgba(0, 0, 0, 0.18) !important;
}

/* Stat cards stay dark like command cards */
.cs-stat {
  background: rgba(13, 11, 10, 0.92) !important;
  border: 1px solid rgba(255, 248, 239, 0.10) !important;
  box-shadow: 0 20px 44px rgba(0, 0, 0, 0.26) !important;
}

.cs-stat strong,
.cs-stat span {
  color: #fff8ef !important;
}

.cs-stat .cs-icon {
  color: #e48643 !important;
}

/* Text on cream panels */
.cs-desk h2,
.cs-workspace h2,
.cs-command-cards strong,
.cs-command-cards span,
.cs-ai-card strong,
.cs-flow article strong,
.cs-flow > div span,
.cs-empty strong,
.cs-row strong,
.cs-approval-row strong,
.cs-modal h2,
.cs-table > header span,
.cs-page h1,
.cs-page h2,
.cs-page h3,
.cs-page h4 {
  color: #0d0b0a !important;
}

.cs-command-cards p,
.cs-ai-card p,
.cs-desk header p,
.cs-workspace header p,
.cs-flow article p,
.cs-row p,
.cs-row div,
.cs-approval-row p,
.cs-empty,
.cs-modal p,
.cs-page p,
.cs-page small {
  color: #6d6258 !important;
}

/* Copper labels */
.cs-desk > header span,
.cs-workspace > header span,
.cs-approval-row > span,
.cs-table > header span,
.cs-modal header span,
.cs-risk,
.cs-page label,
.cs-page legend {
  color: #b85720 !important;
}

/* Forms */
.cs-page input,
.cs-page textarea,
.cs-page select,
.cs-modal input,
.cs-modal textarea,
.cs-modal select {
  background: #fff8ef !important;
  color: #0d0b0a !important;
  border: 1px solid rgba(13, 11, 10, 0.14) !important;
}

/* Buttons */
.cs-approval-row button,
.cs-row button,
.cs-view,
.cs-modal button:not(.ghost),
.cs-page button:not(.ghost):not(.active),
.cs-page a.button,
.cs-page .button {
  color: #fff8ef !important;
  background:
    radial-gradient(circle at 28% 0%, rgba(255,255,255,0.18), transparent 28%),
    linear-gradient(135deg, #17120f, #2a211b 54%, #b85720) !important;
  border: 1px solid rgba(13, 11, 10, 0.22) !important;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22) !important;
}

.cs-view.ghost,
.cs-modal button.ghost,
.cs-page button.ghost {
  color: #0d0b0a !important;
  background: rgba(255, 248, 239, 0.84) !important;
  border: 1px solid rgba(13, 11, 10, 0.10) !important;
}

/* Top row tabs under nav */
.cs-filters,
.cs-tabs,
.cs-subnav,
.cs-mobile-nav,
.cs-filter-bar {
  background: rgba(255, 248, 239, 0.84) !important;
  border: 1px solid rgba(255, 248, 239, 0.16) !important;
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.16) !important;
}

.cs-filters button,
.cs-tabs button,
.cs-subnav button,
.cs-mobile-nav button,
.cs-filter-bar button {
  color: #0d0b0a !important;
  background: rgba(255, 248, 239, 0.74) !important;
  border-color: rgba(13, 11, 10, 0.10) !important;
}

.cs-filters button.active,
.cs-tabs button.active,
.cs-subnav button.active,
.cs-mobile-nav button.active,
.cs-filter-bar button.active {
  color: #fff8ef !important;
  background: linear-gradient(135deg, #17120f, #2a211b 54%, #b85720) !important;
}
`;

function usePhase236ExactFrontPageTheme() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    let style = document.getElementById("phase-236-exact-front-page-theme");
    if (!style) {
      style = document.createElement("style");
      style.id = "phase-236-exact-front-page-theme";
      document.head.appendChild(style);
    }

    style.textContent = PHASE_236_EXACT_FRONT_PAGE_THEME;
    document.documentElement.setAttribute("data-churvox-theme-phase", "236");
    document.body?.setAttribute("data-churvox-theme-phase", "236");
  }, []);
}


function filterRows(rows, filter) {
  if (!filter || filter === "All") return rows;
  const key = filter.toLowerCase().replace(/[^a-z0-9]/g, "");
  const matches = rows.filter((row) => textOf(row).replace(/[^a-z0-9]/g, "").includes(key));
  return matches.length ? matches : rows;
}


function authHeadersForBilling() {
  const headers = { "Content-Type": "application/json" };
  try {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("churvox_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // ignore storage errors
  }
  return headers;
}

function billingApiBase() {
  const raw =
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "";

  const configured = String(raw || "").replace(/\/$/, "");
  if (configured) return configured;

  try {
    const host = window.location.hostname || "";
    if (host.includes("churvox.com")) {
      return "https://grassley-backend.onrender.com";
    }
  } catch {
    // ignore browser access errors
  }

  return "";
}


function formatTrialStatus(status = {}) {
  if (status.has_paid_subscription) {
    return {
      tone: "paid",
      title: "Paid plan active",
      body: "Your Churvox access is unlocked.",
      cta: "Manage plan",
    };
  }

  if (status.trial_expired || status.requires_payment) {
    return {
      tone: "expired",
      title: "Your 14-day trial has ended",
      body: "Choose a paid plan to unlock Churvox again.",
      cta: "Choose a plan",
    };
  }

  if (status.trial_active) {
    const days = Number(status.days_left || 0);
    return {
      tone: "active",
      title: `${days || 1} day${days === 1 ? "" : "s"} left in your trial`,
      body: "Your 14-day trial is active. Churvox will lock until payment when it ends.",
      cta: "Choose plan early",
    };
  }

  return {
    tone: "ready",
    title: "Start your 14-day free trial",
    body: "No card needed. Try Operator first, then choose a plan when ready.",
    cta: "Start 14-day trial",
  };
}


function LockedTrialPage({ billingStatus, goToPage }) {
  const info = formatTrialStatus(billingStatus);

  return (
    <section className="cs-page cs-locked-page" data-phase="PHASE_220_EXPIRED_TRIAL_LOCK_VIEW">
      <header className="cs-hero cs-locked-hero">
        <section>
          <span>Trial ended</span>
          <h1>
            Your 14-day trial has ended.
            <mark>Choose a plan to unlock Churvox.</mark>
          </h1>
          <p>
            Work, clients, crew, quotes, invoices, proof, payroll and settings are locked until payment is active.
          </p>

          <div className={`cs-trial-status-pill ${info.tone}`}>
            <strong>{info.title}</strong>
            <span>{info.body}</span>
          </div>

          <button type="button" className="cs-locked-pay-button" onClick={() => goToPage("plans")}>
            View plans and unlock
          </button>
        </section>

        <section className="cs-lock-list">
          {["Work locked", "Clients locked", "Crew locked", "Invoices locked"].map((item) => (
            <article key={item}>
              <Icon type="shield" />
              <strong>{item}</strong>
              <p>Payment required after the trial period.</p>
            </article>
          ))}
        </section>
      </header>
    </section>
  );
}

function openTop() {
  try {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch {
    window.scrollTo(0, 0);
  }
}

function Stat({ label, value, icon, onClick }) {
  return (
    <button type="button" className="cs-stat" onClick={onClick}>
      <Icon type={icon || "target"} />
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

function AiCard({ title, body, tone = "normal", icon = "spark", onClick }) {
  return (
    <button type="button" className={`cs-ai-card ${tone}`} onClick={onClick}>
      <Icon type={icon} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </button>
  );
}

function Table({ rows, columns, onOpen, emptyText = "Nothing here yet.", actionLabel = "Open Slip" }) {
  const gridTemplateColumns = `repeat(${columns.length}, minmax(150px, 1fr)) 170px`;

  return (
    <section className="cs-table">
      <header style={{ gridTemplateColumns }}>
        {columns.map((column) => (
          <span key={column.key}>{column.label}</span>
        ))}
        <span>Action</span>
      </header>

      {rows.length ? rows.map((row, index) => (
        <article
          className="cs-row"
          key={idOf(row, index)}
          style={{ gridTemplateColumns }}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(row)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onOpen(row);
          }}
        >
          {columns.map((column) => (
            <div key={column.key}>{column.render ? column.render(row, index) : clean(row[column.key], "—")}</div>
          ))}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(row);
            }}
          >
            {actionLabel} <em>›</em>
          </button>
        </article>
      )) : (
        <section className="cs-empty">
          <strong>{emptyText}</strong>
          <p>As work flows in, Churvox will prepare the admin and show the next best action here.</p>
        </section>
      )}
    </section>
  );
}

function DetailModal({ selected, onClose, onApprove, setPage }) {
  if (!selected) return null;

  const route = selected.__route;
  const modalType = clean(selected.__modalType, "Detail");
  const title = clean(selected.__modalTitle || selected.title || selected.name, titleOf(selected, "Record detail"));
  const detail = selected.__body || aiReason(selected, "Churvox prepared this item so you can review it without digging through the app.");

  const isPlan = selected.amount || /plan|pricing/i.test(modalType);
  const isSetting = /setting|control/i.test(modalType) || selected.id === "settings";
  const isCrew = /crew|worker/i.test(modalType) || selected.role || selected.position;
  const isClient = /client/i.test(modalType) || selected.email || selected.phone || selected.mobile;
  const isInvoice = /invoice/i.test(modalType) || selected.invoice_number;
  const isQuote = /quote/i.test(modalType) || selected.quote_number;
  const isWork = /work|job/i.test(modalType) || selected.job_title || selected.jobTitle;

  const rows = [];

  if (isPlan) {
    rows.push(["Plan", clean(selected.name || selected.title, "Plan")]);
    rows.push(["Price", selected.amount ? `$${selected.amount}/mo + GST` : "See plan"]);
    rows.push(["Best for", statusOf(selected)]);
    rows.push(["Churvox prepares", clean(selected.prepared, detail)]);
  } else if (isSetting) {
    rows.push(["Setting", title]);
    rows.push(["Status", statusOf(selected)]);
    rows.push(["Controls", clean(selected.prepared, detail)]);
    rows.push(["Owner action", "Review and save the setting."]);
  } else if (isCrew) {
    rows.push(["Worker", workerName(selected)]);
    rows.push(["Role", clean(selected.role || selected.position, "Worker")]);
    rows.push(["Area", areaOf(selected)]);
    rows.push(["AI action", detail]);
  } else if (isClient) {
    rows.push(["Client", clientName(selected)]);
    rows.push(["Contact", clean(selected.email || selected.phone || selected.mobile, "Missing")]);
    rows.push(["Area", areaOf(selected)]);
    rows.push(["AI action", detail]);
  } else if (isInvoice) {
    rows.push(["Invoice", clean(selected.invoice_number || selected.number || title, "Invoice")]);
    rows.push(["Client", clientName(selected)]);
    rows.push(["Amount", money(selected.amount || selected.total)]);
    rows.push(["AI action", detail]);
  } else if (isQuote) {
    rows.push(["Quote", clean(selected.quote_number || selected.number || title, "Quote")]);
    rows.push(["Client", clientName(selected)]);
    rows.push(["Amount", money(selected.amount || selected.total)]);
    rows.push(["AI action", detail]);
  } else if (isWork) {
    rows.push(["Work", titleOf(selected, "Work")]);
    rows.push(["Client", clientName(selected)]);
    rows.push(["Crew", workerName(selected)]);
    rows.push(["AI action", detail]);
  } else {
    rows.push(["Status", statusOf(selected)]);
    rows.push(["Client", clientName(selected)]);
    rows.push(["Area", areaOf(selected)]);
    rows.push(["AI action", detail]);
  }

  const actionLabel = isPlan
    ? `Choose ${clean(selected.name || selected.title, "plan")}`
    : clean(selected.__actionLabel, selected.__approval ? "Approve next move" : "Save / approve");

  return (
    <section className="cs-modal-backdrop" onClick={onClose}>
      <article className="cs-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <span>{modalType}</span>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <h2>{title}</h2>
        <p>{detail}</p>

        <dl>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <footer>
          <button type="button" className="ghost" onClick={onClose}>Close</button>

          {route ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setPage?.(route);
                onClose();
                openTop();
              }}
            >
              Open page
            </button>
          ) : null}

          <button type="button" onClick={() => onApprove(selected)}>
            {actionLabel}
          </button>
        </footer>
      </article>
    </section>
  );
}

function SmartPage({ config, rows, columns, aiCards, onOpen, activeFilter, setActiveFilter, openInfo, goToPage }) {
  const loweredTitle = clean(config.workspaceTitle).toLowerCase();

  const actionLabel = config.actionLabel ||
    (loweredTitle.includes("pricing") ? "Review plan" :
    loweredTitle.includes("control") || loweredTitle.includes("settings") ? "Open setting" :
    loweredTitle.includes("client") ? "Open client" :
    loweredTitle.includes("crew") ? "Open crew" :
    loweredTitle.includes("quote") ? "Open quote" :
    loweredTitle.includes("invoice") ? "Open invoice" :
    loweredTitle.includes("proof") ? "Open proof" :
    loweredTitle.includes("payroll") || loweredTitle.includes("timesheet") ? "Review hours" :
    "Open slip");

  const modalType = config.modalType ||
    (loweredTitle.includes("pricing") ? "Plan review" :
    loweredTitle.includes("control") || loweredTitle.includes("settings") ? "Setting" :
    loweredTitle.includes("client") ? "Client profile" :
    loweredTitle.includes("crew") ? "Crew profile" :
    loweredTitle.includes("quote") ? "Quote slip" :
    loweredTitle.includes("invoice") ? "Invoice slip" :
    loweredTitle.includes("proof") ? "Proof & Pay slip" :
    loweredTitle.includes("payroll") || loweredTitle.includes("timesheet") ? "Payroll review" :
    "Work slip");

  function openSmartRow(row) {
    onOpen({
      ...row,
      __modalType: modalType,
      __modalTitle: titleOf(row, config.workspaceTitle),
      __body: aiReason(row, config.workspaceBody),
      __actionLabel: actionLabel,
      __route: config.route,
    });
  }

  const filteredRows = filterRows(rows, activeFilter);

  return (
    <section className="cs-page">
      <header className="cs-hero compact">
        <section>
          <span>{config.kicker}</span>
          <h1>{config.title}<mark>{config.accent}</mark></h1>
          <p>{config.body}</p>
        </section>

        <section className="cs-stats">
          {config.stats.map((stat) => (
            <Stat
              key={stat.label}
              {...stat}
              onClick={() => openInfo({
                __modalType: "Smart Metric",
                __modalTitle: stat.label,
                __body: `${stat.label}: ${stat.value}. Churvox tracks this live for the ${config.workspaceTitle} workspace.`,
                __route: stat.route,
                status: "Live",
              })}
            />
          ))}
        </section>
      </header>

      <section className="cs-ai-strip">
        {aiCards.map((card) => (
          <AiCard
            key={card.title}
            {...card}
            onClick={() => openInfo({
              __modalType: "AI Prepared Action",
              __modalTitle: card.title,
              __body: card.body,
              __route: card.route,
              status: "Prepared",
            })}
          />
        ))}
      </section>

      <section className="cs-workspace">
        <header>
          <div>
            <span>{config.workspaceKicker}</span>
            <h2>{config.workspaceTitle}</h2>
            <p>{config.workspaceBody}</p>
          </div>

          <div className="cs-filters">
            {config.filters.map((filter) => (
              <button
                type="button"
                key={filter}
                className={activeFilter === filter ? "active" : ""}
                onClick={() => setActiveFilter(activeFilter === filter ? "All" : filter)}
              >
                {filter}
              </button>
            ))}

            {config.jumpTo ? (
              <button type="button" className="strong" onClick={() => goToPage(config.jumpTo)}>
                Open related page
              </button>
            ) : null}
          </div>
        </header>

        <Table rows={filteredRows} columns={columns} onOpen={openSmartRow} emptyText={config.emptyText} actionLabel={actionLabel} />
      </section>
    </section>
  );
}



function PlansCommandPage({
  planName,
  openInfo,
  goToPage,
  startTrial,
  startCheckout,
  billingBusy,
  billingNotice,
  billingStatus,
}) {
  const plans = [
    {
      id: "start",
      name: "Start",
      price: 39,
      strap: "Start clean",
      badge: "Solo ready",
      body: "For one operator who wants work, clients and invoices tidy without the mess.",
      bestFor: "Solo operators",
      included: ["Work and client control", "Basic invoices and quotes", "Simple owner approval flow", "Mobile-ready workspace"],
      ai: "Churvox keeps the basics organised and surfaces what needs action.",
      icon: "target",
    },
    {
      id: "crew",
      name: "Crew",
      price: 89,
      strap: "Run the team",
      badge: "Crew workflow",
      body: "For businesses assigning jobs, tracking worker updates and keeping proof connected.",
      bestFor: "Small teams",
      included: ["Crew assignment", "Worker updates", "Proof and photos", "Client/job history"],
      ai: "Churvox checks crew fit, proof and unfinished admin.",
      icon: "crew",
    },
    {
      id: "operator",
      name: "Operator",
      price: 149,
      strap: "AI runs the admin",
      badge: "Most popular",
      featured: true,
      body: "The main Churvox plan. AI prepares admin actions and the owner approves.",
      bestFor: "Growing trade teams",
      included: ["AI Operator Actions", "Approval Desk", "Quote and invoice prep", "Follow-up suggestions", "MYOB add-on available"],
      ai: "Churvox prepares invoices, follow-ups, crew suggestions and missing-detail checks.",
      icon: "spark",
    },
    {
      id: "command",
      name: "Command",
      price: 299,
      strap: "Full command centre",
      badge: "MYOB included",
      body: "For larger teams needing payroll workspace, advanced roles, MYOB and more capacity.",
      bestFor: "Serious operators",
      included: ["MYOB included", "Payroll workspace", "Advanced roles", "Higher limits", "Priority support"],
      ai: "Churvox watches the whole admin path from work intake to payment follow-up.",
      icon: "shield",
    },
  ];

  const addons = [
    {
      id: "command_growth_pack",
      title: "Command Growth Pack",
      price: "$99/mo + GST",
      body: "Adds 50 more active team members plus extra jobs, AI Operator Actions, automation runs and admin/payroll capacity.",
      type: "growth_pack",
      icon: "crew",
    },
    {
      id: "myob_addon",
      title: "MYOB Sync",
      price: "$39/mo + GST",
      body: "Optional on Operator. Included by default on Command.",
      type: "myob_addon",
      icon: "document",
    },
  ];

  const smsPacks = [
    { id: "sms_100", credits: 100, label: "100 SMS credits", body: "Small reminder pack.", icon: "card" },
    { id: "sms_500", credits: 500, label: "500 SMS credits", body: "Best for steady teams.", icon: "card" },
    { id: "sms_1000", credits: 1000, label: "1000 SMS credits", body: "For high volume reminders.", icon: "card" },
  ];

  const compare = [
    ["AI Operator Actions", "Basic", "Crew checks", "Strong", "Full"],
    ["Active team members", "1", "Small crew", "Growing team", "50 included"],
    ["MYOB", "—", "—", "$39 add-on", "Included"],
    ["Payroll workspace", "—", "—", "—", "Included"],
    ["Owner Approval Desk", "Yes", "Yes", "Advanced", "Advanced"],
  ];

  const trialInfo = formatTrialStatus(billingStatus || {});

  function openPlan(plan) {
    openInfo({
      ...plan,
      amount: plan.price,
      status: plan.badge,
      prepared: plan.ai,
      __modalType: "Plan review",
      __modalTitle: `${plan.name} plan`,
      __body: `${plan.body} ${plan.ai}`,
      __actionLabel: `Choose ${plan.name}`,
      __route: "plans",
    });
  }

  return (
    <section className="cs-page cs-plans-page" data-phase="PHASE_216_STRIPE_WIRED_PLANS">
      <header className="cs-hero cs-plans-hero">
        <section>
          <span>Plans command</span>
          <h1>
            Choose how much admin
            <mark>Churvox handles.</mark>
          </h1>
          <p>
            Start with a 14-day trial, then choose Start, Crew, Operator or Command.
            Add SMS credits, MYOB or Command Growth Pack when the business needs it.
          </p>

          <div className={`cs-trial-box ${trialInfo.tone}`}>
            <strong>{trialInfo.title}</strong>
            <span>{trialInfo.body}</span>
            <button
              type="button"
              disabled={billingBusy === "trial" || billingStatus?.trial_active || billingStatus?.requires_payment}
              onClick={() => startTrial("operator")}
            >
              {billingBusy === "trial"
                ? "Starting trial..."
                : billingStatus?.requires_payment
                  ? "Trial ended — choose plan"
                  : billingStatus?.trial_active
                    ? "Trial active"
                    : "Start 14-day trial"}
            </button>
          </div>

          {billingNotice ? <p className="cs-billing-notice">{billingNotice}</p> : null}
        </section>

        <section className="cs-plan-price-stack">
          {plans.map((plan) => (
            <button
              type="button"
              key={plan.id}
              className={plan.featured ? "featured" : ""}
              onClick={() => openPlan(plan)}
            >
              <Icon type={plan.icon} />
              <span>{plan.name}</span>
              <strong>${plan.price}</strong>
            </button>
          ))}
        </section>
      </header>

      <section className="cs-plan-cards">
        {plans.map((plan) => (
          <article className={plan.featured ? "featured" : ""} key={plan.id}>
            <header>
              <span>{plan.badge}</span>
              <h2>{plan.name}</h2>
              <p>{plan.strap}</p>
            </header>

            <div className="cs-plan-price">
              <strong>${plan.price}</strong>
              <span>/mo + GST</span>
            </div>

            <p>{plan.body}</p>

            <div className="cs-plan-trial-strip">
              <strong>14-day free trial</strong>
              <span>No card needed. Locks after trial until payment.</span>
            </div>

            <ul>
              {plan.included.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <section>
              <b>AI role</b>
              <p>{plan.ai}</p>
            </section>

            <div className="cs-plan-actions">
              <button type="button" className="ghost" onClick={() => openPlan(plan)}>
                Review
              </button>
              <button
                type="button"
                disabled={billingBusy === plan.id}
                onClick={() => startCheckout({ type: "plan", plan: plan.id, key: plan.id })}
              >
                {billingBusy === plan.id ? "Opening Stripe..." : plan.featured ? "Choose Operator" : `Choose ${plan.name}`}
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="cs-plan-addons">
        <header>
          <div>
            <span>Scale when ready</span>
            <h2>Add-ons wired to Stripe</h2>
            <p>Growth Pack, MYOB and SMS credits are separate so the owner only pays for what they need.</p>
          </div>
        </header>

        <div>
          {addons.map((addon) => (
            <button
              type="button"
              key={addon.id}
              disabled={billingBusy === addon.id}
              onClick={() => startCheckout({ type: addon.id === "command_growth_pack" ? "command_growth_pack" : addon.type, addon: addon.id, key: addon.id })}
            >
              <Icon type={addon.icon} />
              <strong>{addon.title}</strong>
              <span>{addon.price}</span>
              <p>{addon.body}</p>
              <em>{billingBusy === addon.id ? "Opening Stripe..." : "Buy add-on"}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="cs-sms-packs">
        <header>
          <div>
            <span>SMS credits</span>
            <h2>Buy reminder credits</h2>
            <p>Use credits for customer reminders and future SMS flows. SMS packs checkout through Stripe.</p>
          </div>
        </header>

        <div>
          {smsPacks.map((pack) => (
            <button
              type="button"
              key={pack.id}
              disabled={billingBusy === pack.id}
              onClick={() => startCheckout({ type: "sms", sms_pack: pack.id, key: pack.id })}
            >
              <Icon type={pack.icon} />
              <strong>{pack.label}</strong>
              <p>{pack.body}</p>
              <em>{billingBusy === pack.id ? "Opening Stripe..." : "Buy SMS pack"}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="cs-plan-compare">
        <header>
          <div>
            <span>What changes</span>
            <h2>Plan comparison</h2>
            <p>Operator is the main AI admin plan. Command is the full control centre.</p>
          </div>

          <button type="button" onClick={() => goToPage("dashboard")}>
            Back to Command Desk
          </button>
        </header>

        <div className="cs-plan-compare-table">
          <article className="head">
            <span>Feature</span>
            <span>Start</span>
            <span>Crew</span>
            <span>Operator</span>
            <span>Command</span>
          </article>

          {compare.map((row) => (
            <article key={row[0]}>
              {row.map((cell) => (
                <span key={cell}>{cell}</span>
              ))}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export default function CommandSuite({
  page,
  setPage,
  data,
  machine,
  planName,
  visibleApprovals,
  hiddenApprovalCount,
  showAllApprovals,
  setShowAllApprovals,
  onOpenSlip,
}) {
  usePhase236ExactFrontPageTheme();
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [billingBusy, setBillingBusy] = useState("");
  const [billingNotice, setBillingNotice] = useState("");
  const [billingStatus, setBillingStatus] = useState(null);
  const current = PAGE_MAP[page] || "dashboard";
  const appLocked = Boolean(billingStatus?.requires_payment || billingStatus?.trial_expired);


  async function billingPost(path, payload) {
    const base = billingApiBase();
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      credentials: "include",
      headers: authHeadersForBilling(),
      body: JSON.stringify(payload || {}),
    });

    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }

    if (!res.ok || body.success === false) {
      const message = body.detail || body.message || body.error || `Billing request failed (${res.status})`;
      console.error("Churvox billing request failed", { path, status: res.status, body, payload });
      throw new Error(message);
    }

    return body;
  }


  async function billingGet(path) {
    const base = billingApiBase();
    const res = await fetch(`${base}${path}`, {
      method: "GET",
      credentials: "include",
      headers: authHeadersForBilling(),
    });

    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }

    if (!res.ok || body.success === false) {
      const message = body.detail || body.message || body.error || `Billing status failed (${res.status})`;
      throw new Error(message);
    }

    return body;
  }

  async function refreshBillingStatus() {
    try {
      const body = await billingGet("/api/billing/status");
      setBillingStatus(body);
      return body;
    } catch (err) {
      console.warn("Could not load billing status", err);
      return null;
    }
  }

  async function startTrial(plan = "operator") {
    setBillingBusy("trial");
    setBillingNotice("");
    try {
      const body = await billingPost("/api/billing/start-trial", { plan, plan_type: plan });
      setBillingStatus(body);
      setBillingNotice(body.message || "14-day trial started.");
      setToast(body.message || "14-day trial started.");
    } catch (err) {
      setBillingNotice(err.message || "Could not start trial.");
      setToast(err.message || "Could not start trial.");
    } finally {
      setBillingBusy("");
      window.setTimeout(() => setToast(""), 3200);
    }
  }

  async function startCheckout(item) {
    const key = item?.key || item?.plan || item?.addon || item?.sms_pack || "checkout";
    setBillingBusy(key);
    setBillingNotice("");
    try {
      const body = await billingPost("/api/billing/checkout", item);
      const url = body.checkout_url || body.url;
      if (!url) throw new Error("Stripe checkout URL was not returned.");
      window.location.href = url;
    } catch (err) {
      setBillingNotice(err.message || "Could not open Stripe checkout.");
      setToast(err.message || "Could not open Stripe checkout.");
      setBillingBusy("");
      window.setTimeout(() => setToast(""), 4200);
    }
  }


  useEffect(() => {
    // PHASE_220_LOAD_BILLING_STATUS
    refreshBillingStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const stripeStatus = params.get("stripe");

    if (!sessionId || stripeStatus !== "success") return;

    const storageKey = `churvox_checkout_confirmed_${sessionId}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // ignore session storage errors
    }

    billingPost("/api/billing/confirm-checkout", { session_id: sessionId })
      .then((body) => {
        const msg = body.message || "Stripe checkout confirmed.";
        setBillingNotice(msg);
        setToast(msg);
        refreshBillingStatus();
        const url = new URL(window.location.href);
        url.searchParams.delete("session_id");
        url.searchParams.delete("stripe");
        url.searchParams.delete("item");
        window.history.replaceState({}, "", url.toString());
        window.setTimeout(() => setToast(""), 3400);
      })
      .catch((err) => {
        const msg = err.message || "Could not confirm Stripe checkout.";
        setBillingNotice(msg);
        setToast(msg);
        window.setTimeout(() => setToast(""), 4200);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const model = useMemo(() => {
    const raw = data?.raw || data || {}; // PHASE_219_FRONTEND_PARTIAL_DATA_SAFE
    const jobs = rowsFrom(raw.jobs, data?.jobs, raw.work, data?.work);
    const clients = rowsFrom(raw.clients, data?.clients, raw.customers, data?.customers);
    const crew = rowsFrom(raw.workers, data?.workers, raw.team, data?.team, raw.crew, data?.crew);
    const quotes = rowsFrom(raw.quotes, data?.quotes);
    const invoices = rowsFrom(raw.invoices, data?.invoices);
    const payments = rowsFrom(raw.payments, data?.payments, raw.transactions, data?.transactions);
    const approvalRows = rowsFrom(machine?.approval, visibleApprovals);
    const input = rowsFrom(machine?.input);
    const processing = rowsFrom(machine?.processing);

    return { raw, jobs, clients, crew, quotes, invoices, payments, approvals: approvalRows, input, processing };
  }, [data, machine, visibleApprovals]);

  function goToPage(nextPage) {
    const mappedPage = PAGE_MAP[nextPage] || nextPage;

    if (billingStatus?.requires_payment && mappedPage !== "plans") {
      setActiveFilter("All");
      setPage?.("plans");
      setBillingNotice("Your 14-day trial has ended. Choose a paid plan to unlock Churvox.");
      openTop();
      return;
    }

    setActiveFilter("All");
    setPage?.(nextPage);
    openTop();
  }

  function openRecord(record) {
    setSelected(record);
  }

  function openInfo(record) {
    setSelected(record);
  }

  function approveRecord(record) {
    if (record?.__approval && onOpenSlip) {
      onOpenSlip(record.__raw || record);
      setSelected(null);
      return;
    }

    setToast("Approved. Churvox marked this next move as reviewed.");
    setSelected(null);
    window.setTimeout(() => setToast(""), 2400);
  }

  const approvals = model.approvals.map((item) => ({ ...item, __approval: true, __raw: item }));

  const readyToInvoice = model.invoices.filter((item) => /draft|ready|unpaid|owing/i.test(statusOf(item))).length ||
    model.jobs.filter((item) => /complete|ready/i.test(statusOf(item))).length;

  const crewActive = model.crew.filter((item) => /active|working|on|ready/i.test(statusOf(item))).length ||
    model.jobs.filter((item) => /active|progress|started/i.test(statusOf(item))).length;

  const dashboardStats = [
    { label: "Plan", value: planName || "Command", icon: "target" },
    { label: "New inputs", value: model.input.length, icon: "tray" },
    { label: "Prepared", value: model.processing.length + approvals.length, icon: "document" },
    { label: "Approvals", value: approvals.length, icon: "shield" },
  ];

  const pages = {
    work: {
      config: {
        kicker: "Work command",
        title: "All work,",
        accent: "already sorted.",
        body: "Jobs enter once. Churvox checks client, area, crew fit, proof and invoice readiness in the background.",
        stats: [
          { label: "New", value: model.jobs.filter((j) => /new|pending/i.test(statusOf(j))).length, icon: "tray" },
          { label: "Assigned", value: model.jobs.filter((j) => workerName(j) !== "Unassigned").length, icon: "crew" },
          { label: "Active", value: model.jobs.filter((j) => /active|progress|started/i.test(statusOf(j))).length, icon: "pulse" },
          { label: "Ready invoice", value: model.jobs.filter((j) => /complete|ready/i.test(statusOf(j))).length, icon: "money", route: "invoices" },
        ],
        workspaceKicker: "Work board",
        workspaceTitle: "Work slips",
        modalType: "Work slip",
        actionLabel: "Open work",
        route: "jobs",
        workspaceBody: "Tap a row to review client, crew, proof and invoice readiness.",
        filters: ["Needs action", "Unassigned", "Today", "Active", "Completed", "Ready to invoice"],
        emptyText: "No work found.",
      },
      rows: model.jobs,
      aiCards: [
        { title: "Best crew match", body: "When area is selected, Churvox suggests the best worker using area, workload and clashes.", icon: "crew", route: "team" },
        { title: "Invoice readiness", body: "Completed work is checked for proof, notes and pricing before invoice prep.", icon: "money", route: "invoices" },
        { title: "Schedule guard", body: "Crew clashes and risky timing are flagged before approval.", icon: "shield" },
      ],
      columns: [
        { key: "title", label: "Work", render: (row) => <strong>{titleOf(row, "Work slip")}</strong> },
        { key: "client", label: "Client", render: clientName },
        { key: "area", label: "Area", render: areaOf },
        { key: "crew", label: "Crew", render: workerName },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI suggestion", render: (row) => aiReason(row, "Churvox is checking crew fit and invoice readiness.") },
      ],
    },

    clients: {
      config: {
        kicker: "Client command",
        title: "Every client record,",
        accent: "cleaned and ready.",
        body: "Churvox watches missing details, unpaid invoices, open quotes and follow-up opportunities.",
        stats: [
          { label: "Clients", value: model.clients.length, icon: "client" },
          { label: "Missing details", value: model.clients.filter((c) => !clean(c.email || c.phone || c.mobile)).length, icon: "alert" },
          { label: "Open quotes", value: model.quotes.length, icon: "document", route: "quotes" },
          { label: "Unpaid", value: model.invoices.filter((i) => /unpaid|overdue|owing/i.test(statusOf(i))).length, icon: "money", route: "invoices" },
        ],
        workspaceKicker: "Client list",
        workspaceTitle: "Client records",
        modalType: "Client profile",
        actionLabel: "Open client",
        route: "clients",
        workspaceBody: "Tap a client to see work history, quotes, invoices and AI next action.",
        filters: ["Needs details", "Active work", "Owing", "Follow-up", "All clients"],
        emptyText: "No clients found.",
      },
      rows: model.clients,
      aiCards: [
        { title: "Missing details", body: "Churvox flags missing phone, email, address or payment details.", icon: "alert" },
        { title: "Follow-up ready", body: "Clients with old quotes or unpaid invoices are prepared for owner review.", icon: "spark" },
        { title: "Duplicate check", body: "Similar names, phones and addresses can be flagged before records get messy.", icon: "shield" },
      ],
      columns: [
        { key: "name", label: "Client", render: clientName },
        { key: "contact", label: "Contact", render: (row) => clean(row.email || row.phone || row.mobile, "Missing") },
        { key: "area", label: "Area", render: areaOf },
        { key: "work", label: "Active work", render: () => "Checked" },
        { key: "owing", label: "Owing", render: (row) => money(row.owing || row.balance || row.amount_due) },
        { key: "ai", label: "AI status", render: (row) => aiReason(row, "Client record checked.") },
      ],
    },

    crew: {
      config: {
        kicker: "Crew command",
        title: "Crew matched,",
        accent: "to the right work.",
        body: "Churvox checks area, availability, workload, job history and schedule risk before suggesting crew.",
        stats: [
          { label: "Crew", value: model.crew.length, icon: "crew" },
          { label: "Active", value: crewActive, icon: "pulse" },
          { label: "Available", value: model.crew.filter((w) => /available|ready/i.test(statusOf(w))).length, icon: "shield" },
          { label: "Review", value: model.crew.filter((w) => /missing|late|risk/i.test(statusOf(w))).length, icon: "alert" },
        ],
        workspaceKicker: "Crew list",
        workspaceTitle: "Crew profiles",
        modalType: "Crew profile",
        actionLabel: "Open crew",
        route: "team",
        workspaceBody: "Tap a worker to see today’s work, notes, proof history and suggested assignments.",
        filters: ["Available", "Active", "Overloaded", "Needs update", "All crew"],
        emptyText: "No crew found.",
      },
      rows: model.crew,
      aiCards: [
        { title: "Best worker found", body: "Unassigned work gets a recommended crew match with the reason attached.", icon: "crew", route: "jobs" },
        { title: "Live updates", body: "Worker notes, pauses, proof photos and completions feed owner/admin automatically.", icon: "pulse", route: "proof" },
        { title: "Clash warning", body: "Churvox warns before assigning someone into a schedule clash.", icon: "alert" },
      ],
      columns: [
        { key: "name", label: "Worker", render: workerName },
        { key: "role", label: "Role", render: (row) => clean(row.role || row.position, "Worker") },
        { key: "area", label: "Area", render: areaOf },
        { key: "current", label: "Current work", render: (row) => clean(row.current_job || row.currentJob, "None") },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI note", render: (row) => aiReason(row, "Crew availability checked.") },
      ],
    },

    quotes: {
      config: {
        kicker: "Quote command",
        title: "Quotes prepared,",
        accent: "followed up and ready to win.",
        body: "Churvox watches quote age, missing pricing, follow-up timing and accepted quote conversion.",
        stats: [
          { label: "Drafts", value: model.quotes.filter((q) => /draft/i.test(statusOf(q))).length, icon: "document" },
          { label: "Sent", value: model.quotes.filter((q) => /sent/i.test(statusOf(q))).length, icon: "tray" },
          { label: "Awaiting", value: model.quotes.filter((q) => /await|pending/i.test(statusOf(q))).length, icon: "pulse" },
          { label: "Accepted", value: model.quotes.filter((q) => /accept/i.test(statusOf(q))).length, icon: "shield" },
        ],
        workspaceKicker: "Quote list",
        workspaceTitle: "Quote slips",
        modalType: "Quote slip",
        actionLabel: "Open quote",
        route: "quotes",
        workspaceBody: "Tap a quote to approve follow-up, convert to work, or convert to invoice.",
        filters: ["Follow-up due", "Drafts", "Awaiting", "Accepted", "All quotes"],
        emptyText: "No quotes found.",
      },
      rows: model.quotes,
      aiCards: [
        { title: "Follow-up prepared", body: "Old quotes get a polite follow-up drafted for owner approval.", icon: "spark" },
        { title: "Missing price check", body: "Quotes missing amount or detail are flagged before sending.", icon: "alert" },
        { title: "Convert when accepted", body: "Accepted quotes can become work or invoice prep without retyping.", icon: "shield", route: "jobs" },
      ],
      columns: [
        { key: "number", label: "Quote", render: (row) => clean(row.quote_number || row.number || row.id, "Quote") },
        { key: "client", label: "Client", render: clientName },
        { key: "work", label: "Work", render: titleOf },
        { key: "amount", label: "Amount", render: (row) => money(row.amount || row.total) },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI action", render: (row) => aiReason(row, "Follow-up timing checked.") },
      ],
    },

    invoices: {
      config: {
        kicker: "Invoice command",
        title: "Invoices prepared,",
        accent: "from completed work.",
        body: "Churvox links invoices to work, clients, proof, payment status and reminders.",
        stats: [
          { label: "Drafts", value: model.invoices.filter((i) => /draft/i.test(statusOf(i))).length, icon: "document" },
          { label: "Sent", value: model.invoices.filter((i) => /sent/i.test(statusOf(i))).length, icon: "tray" },
          { label: "Owing", value: model.invoices.filter((i) => /unpaid|owing/i.test(statusOf(i))).length, icon: "money" },
          { label: "Overdue", value: model.invoices.filter((i) => /overdue/i.test(statusOf(i))).length, icon: "alert" },
        ],
        workspaceKicker: "Invoice list",
        workspaceTitle: "Invoice slips",
        modalType: "Invoice slip",
        actionLabel: "Open invoice",
        route: "invoices",
        workspaceBody: "Tap an invoice to review proof, AI description, missing details and send readiness.",
        filters: ["Drafts", "Ready to send", "Owing", "Overdue", "Paid"],
        emptyText: "No invoices found.",
      },
      rows: model.invoices,
      aiCards: [
        { title: "Draft invoice ready", body: "Completed work becomes invoice prep with proof and notes attached.", icon: "money", route: "proof" },
        { title: "Reminder prepared", body: "Unpaid invoices get customer reminders drafted for approval.", icon: "spark" },
        { title: "Missing email check", body: "Churvox flags invoices that cannot be sent yet.", icon: "alert", route: "clients" },
      ],
      columns: [
        { key: "number", label: "Invoice", render: (row) => clean(row.invoice_number || row.number || row.id, "Invoice") },
        { key: "client", label: "Client", render: clientName },
        { key: "work", label: "Linked work", render: titleOf },
        { key: "amount", label: "Amount", render: (row) => money(row.amount || row.total) },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI action", render: (row) => aiReason(row, "Invoice checked.") },
      ],
    },

    proof: {
      config: {
        kicker: "Proof & Pay",
        title: "Proof in.",
        accent: "Payment ready.",
        body: "Worker proof, job notes and completion details flow into invoice and payment readiness.",
        stats: [
          { label: "Completed", value: model.jobs.filter((j) => /complete/i.test(statusOf(j))).length, icon: "shield" },
          { label: "Photos", value: model.jobs.filter((j) => Array.isArray(j.photos) && j.photos.length).length, icon: "photo" },
          { label: "Ready invoice", value: readyToInvoice, icon: "money", route: "invoices" },
          { label: "Follow-up", value: model.payments.length, icon: "card" },
        ],
        workspaceKicker: "Proof feed",
        workspaceTitle: "Proof and payment slips",
        modalType: "Proof & Pay slip",
        actionLabel: "Open proof",
        route: "proof",
        workspaceBody: "Tap proof to check photos, completion notes, invoice readiness and payment action.",
        filters: ["Completed", "Photos", "Ready invoice", "Payment follow-up", "All proof"],
        emptyText: "No proof items found.",
      },
      rows: model.jobs.filter((j) => /complete|proof|photo|ready/i.test(statusOf(j))).length ? model.jobs.filter((j) => /complete|proof|photo|ready/i.test(statusOf(j))) : model.jobs,
      aiCards: [
        { title: "Proof checked", body: "Photos and worker notes are attached before invoice prep.", icon: "photo" },
        { title: "Invoice path ready", body: "Completed work becomes draft invoice context automatically.", icon: "money", route: "invoices" },
        { title: "Payment follow-up", body: "Unpaid or overdue payment actions are surfaced for approval.", icon: "card" },
      ],
      columns: [
        { key: "job", label: "Work", render: titleOf },
        { key: "client", label: "Client", render: clientName },
        { key: "worker", label: "Worker", render: workerName },
        { key: "proof", label: "Proof", render: (row) => Array.isArray(row.photos) && row.photos.length ? `${row.photos.length} photos` : "Checked" },
        { key: "invoice", label: "Invoice", render: (row) => clean(row.invoice_status || row.invoiceStatus, "Ready check") },
        { key: "ai", label: "AI action", render: (row) => aiReason(row, "Proof checked for invoice readiness.") },
      ],
    },

    payroll: {
      config: {
        kicker: "Payroll command",
        title: "Hours prepared,",
        accent: "for payroll review.",
        body: "Churvox prepares hours, pauses, job links, notes and export readiness without exposing owner billing mess.",
        stats: [
          { label: "Crew", value: model.crew.length, icon: "crew" },
          { label: "Hours", value: model.jobs.reduce((sum, j) => sum + Number(j.hours || j.total_hours || 0), 0), icon: "pulse" },
          { label: "Review", value: model.jobs.filter((j) => /missing|pause|review/i.test(statusOf(j))).length, icon: "alert" },
          { label: "Export", value: "Ready", icon: "document" },
        ],
        workspaceKicker: "Payroll review",
        workspaceTitle: "Timesheet slips",
        modalType: "Payroll review",
        actionLabel: "Review hours",
        route: "payroll",
        workspaceBody: "Tap a payroll slip to review worker hours, jobs, pauses and notes.",
        filters: ["Needs review", "Approved", "Missing clock-off", "Export ready"],
        emptyText: "No payroll records found.",
      },
      rows: model.crew.length ? model.crew : model.jobs,
      aiCards: [
        { title: "Missing clock-off", body: "Churvox flags time entries that need owner/admin review.", icon: "alert" },
        { title: "Long pause check", body: "Pauses and unusual time patterns are surfaced before approval.", icon: "pulse" },
        { title: "Export ready", body: "Approved hours can be exported for payroll handoff.", icon: "document" },
      ],
      columns: [
        { key: "worker", label: "Worker", render: workerName },
        { key: "hours", label: "Hours", render: (row) => clean(row.hours || row.total_hours || row.approved_hours, "0") },
        { key: "jobs", label: "Jobs", render: (row) => clean(row.jobs_count || row.job_count || row.current_job, "—") },
        { key: "pauses", label: "Pauses", render: (row) => clean(row.pause_total || row.pauses, "Checked") },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI flag", render: (row) => aiReason(row, "Payroll details checked.") },
      ],
    },

    plans: {
      config: {
        kicker: "Plan command",
        title: "Choose how much admin,",
        accent: "Churvox handles.",
        body: "Start simple, then grow into AI Operator Actions, MYOB sync, payroll workspace and advanced roles.",
        stats: [
          { label: "Start", value: "$39", icon: "target" },
          { label: "Crew", value: "$89", icon: "crew" },
          { label: "Operator", value: "$149", icon: "spark" },
          { label: "Command", value: "$299", icon: "shield" },
        ],
        workspaceKicker: "Plans",
        workspaceTitle: "Churvox pricing",
        modalType: "Plan review",
        actionLabel: "Review plan",
        route: "plans",
        workspaceBody: "Tap a plan to review what Churvox prepares for you.",
        filters: ["Monthly", "AI Operator", "MYOB", "Command"],
        emptyText: "No plans loaded.",
      },
      rows: [
        { id: "start", name: "Start", amount: 39, status: "Basic admin", prepared: "For solo operators getting work under control." },
        { id: "crew", name: "Crew", amount: 89, status: "Team workflow", prepared: "For businesses assigning work and tracking crew." },
        { id: "operator", name: "Operator", amount: 149, status: "Most popular", prepared: "AI Operator Actions prepare admin for approval." },
        { id: "command", name: "Command", amount: 299, status: "Full command", prepared: "MYOB included, payroll workspace, advanced roles and higher limits." },
      ],
      aiCards: [
        { title: "Operator is the main plan", body: "Best fit when Churvox prepares admin and the owner approves.", icon: "spark" },
        { title: "Command includes MYOB", body: "Command adds MYOB, payroll workspace and larger capacity.", icon: "shield" },
        { title: "Growth pack ready", body: "Command can grow by 50 active team member blocks.", icon: "crew" },
      ],
      columns: [
        { key: "name", label: "Plan", render: (row) => <strong>{row.name}</strong> },
        { key: "amount", label: "Price", render: (row) => `$${row.amount}/mo + GST` },
        { key: "status", label: "Best for", render: statusOf },
        { key: "included", label: "Included", render: (row) => row.prepared },
        { key: "ai", label: "AI value", render: () => "Churvox prepares admin. You approve." },
      ],
    },

    settings: {
      config: {
        kicker: "Settings command",
        title: "Business controls,",
        accent: "without the mess.",
        body: "Control roles, notifications, AI approval mode, billing, MYOB, SMS credits and security.",
        stats: [
          { label: "Business", value: "Ready", icon: "briefcase" },
          { label: "Roles", value: model.crew.length || "Set", icon: "crew" },
          { label: "AI mode", value: "Approve", icon: "spark" },
          { label: "Security", value: "On", icon: "shield" },
        ],
        workspaceKicker: "Settings",
        workspaceTitle: "Control centre",
        modalType: "Setting",
        actionLabel: "Open setting",
        route: "settings",
        workspaceBody: "Tap a setting to manage business controls and AI behaviour.",
        filters: ["Business", "Roles", "AI Operator", "Billing", "MYOB", "SMS", "Security"],
        emptyText: "No settings found.",
      },
      rows: [
        { id: "business", title: "Business profile", status: "Ready", prepared: "Company details, industry and contact information." },
        { id: "roles", title: "Team roles", status: "Ready", prepared: "Owner, manager, worker, office admin and payroll permissions." },
        { id: "ai", title: "AI approval mode", status: "Prepare and ask", prepared: "Churvox prepares admin but never sends without approval." },
        { id: "billing", title: "Billing and plan", status: "Checked", prepared: "Plan, subscription and add-ons." },
        { id: "myob", title: "MYOB connection", status: "Optional", prepared: "Sync settings and accounting controls." },
        { id: "sms", title: "SMS credits", status: "Coming soon", prepared: "Credit packs and reminder controls." },
        { id: "security", title: "Security", status: "On", prepared: "Login, account and access controls." },
      ],
      aiCards: [
        { title: "Approval mode", body: "Draft only, prepare and ask, or high-confidence auto-prepare. Never auto-send without approval.", icon: "shield" },
        { title: "Role safety", body: "Payroll and worker users stay locked to the areas they need.", icon: "crew" },
        { title: "Integration control", body: "MYOB, SMS and billing settings stay grouped without clutter.", icon: "document" },
      ],
      columns: [
        { key: "title", label: "Setting", render: titleOf },
        { key: "status", label: "Status", render: statusOf },
        { key: "prepared", label: "What it controls", render: (row) => row.prepared },
        { key: "owner", label: "Owner action", render: () => "Review settings" },
        { key: "ai", label: "AI note", render: () => "Configured for approval-first admin." },
      ],
    },
  };

  const pageConfig = pages[current] || pages.work;

  return (
    <section className="cs-suite" data-phase="PHASE_212_WIRED_COMMAND_SUITE">
      <nav className="cs-subnav" aria-label="Command Suite pages">
        {NAV_ITEMS.map(([label, target, icon]) => {
          const active = PAGE_MAP[target] === current;
          return (
            <button
              type="button"
              key={target}
              className={active ? "active" : ""}
              onClick={() => goToPage(target)}
            >
              <Icon type={icon} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {appLocked && current !== "plans" ? (
        <LockedTrialPage billingStatus={billingStatus} goToPage={goToPage} />
      ) : current === "dashboard" ? (
        <section className="cs-page">
          <header className="cs-hero">
            <section>
              <span>Command Desk</span>
              <h1>
                Churvox prepares the admin.
                <mark>You approve the next move.</mark>
              </h1>
              <p>
                Work comes in, Churvox checks the admin path, then shows the owner one clean approval slip.
              </p>
            </section>

            <section className="cs-stats">
              {dashboardStats.map((stat) => (
                <Stat
                  key={stat.label}
                  {...stat}
                  onClick={() => openInfo({
                    __modalType: "Live metric",
                    __modalTitle: stat.label,
                    __body: `${stat.label}: ${stat.value}. Churvox keeps this updated from your business data.`,
                    status: "Live",
                  })}
                />
              ))}
            </section>
          </header>

          <section className="cs-command-cards">
            <button type="button" onClick={() => openInfo({ __modalType: "Approval queue", __modalTitle: "Ready for approval", __body: "These are owner-ready approval slips prepared by Churvox.", status: "Ready" })}>
              <Icon type="briefcase" />
              <div><strong>{approvals.length}</strong><span>Ready for approval</span><p>Owner-ready admin waiting for your decision.</p></div>
              <b>›</b>
            </button>
            <button type="button" onClick={() => goToPage("invoices")}>
              <Icon type="money" />
              <div><strong>{readyToInvoice}</strong><span>Ready to invoice</span><p>Completed work ready for invoice prep.</p></div>
              <b>›</b>
            </button>
            <button type="button" onClick={() => goToPage("team")}>
              <Icon type="crew" />
              <div><strong>{crewActive}</strong><span>Crew active today</span><p>Worker notes, proof and updates flowing in.</p></div>
              <b>›</b>
            </button>
          </section>

          <section className="cs-desk">
            <header>
              <Icon type="clipboard" />
              <h2>Approval Desk</h2>
              <i />
              <p>Review what Churvox prepared, approve it, or edit before it goes out.</p>
            </header>

            <section className="cs-approval-list">
              {approvals.length ? approvals.slice(0, showAllApprovals ? approvals.length : 5).map((item, index) => {
                const risk = riskFor(item);
                return (
                  <article
                    className="cs-approval-row"
                    key={idOf(item, index)}
                    role="button"
                    tabIndex={0}
                    onClick={() => openRecord(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") openRecord(item);
                    }}
                  >
                    <span>{clean(item.eyebrow || item.kind, "Approval")}</span>
                    <strong>{titleOf(item, "Approval slip")}</strong>
                    <p>{aiReason(item)}</p>
                    <b className={`cs-risk ${risk.tone}`}>{risk.label}</b>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openRecord(item);
                      }}
                    >
                      Open Approval Slip <em>›</em>
                    </button>
                  </article>
                );
              }) : (
                <section className="cs-empty">
                  <strong>No approvals waiting.</strong>
                  <p>When work comes in, Churvox prepares the admin and places clean approval slips here.</p>
                </section>
              )}

              {hiddenApprovalCount > 0 && !showAllApprovals ? (
                <button type="button" className="cs-view" onClick={() => setShowAllApprovals?.(true)}>
                  View all {approvals.length} approvals
                </button>
              ) : null}

              {showAllApprovals && approvals.length > 5 ? (
                <button type="button" className="cs-view ghost" onClick={() => setShowAllApprovals?.(false)}>
                  Show top 5 only
                </button>
              ) : null}
            </section>
          </section>

          <section className="cs-flow">
            <button type="button" onClick={() => openInfo({ __modalType: "AI Watch", __modalTitle: "AI is watching", __body: "Churvox watches each step from work intake to payment follow-up.", status: "Active" })}>
              <Icon type="eye" />
              <div><strong>AI is watching</strong><p>Every job. Every detail. Every time.</p></div>
            </button>
            <div>
              {[
                ["Work", "jobs"],
                ["Crew", "team"],
                ["Proof", "proof"],
                ["Invoice", "invoices"],
                ["Payment", "proof"],
              ].map(([label, route], index, arr) => (
                <React.Fragment key={`${label}-${route}`}>
                  <button type="button" onClick={() => goToPage(route)}>{label}</button>
                  {index < arr.length - 1 ? <b>›</b> : null}
                </React.Fragment>
              ))}
            </div>
          </section>
        </section>
      ) : current === "plans" ? (
        <PlansCommandPage
          planName={planName}
          openInfo={openInfo}
          goToPage={goToPage}
          startTrial={startTrial}
          startCheckout={startCheckout}
          billingBusy={billingBusy}
          billingNotice={billingNotice}
          billingStatus={billingStatus}
        />
      ) : (
        <SmartPage
          config={pageConfig.config}
          rows={pageConfig.rows}
          columns={pageConfig.columns}
          aiCards={pageConfig.aiCards}
          onOpen={openRecord}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          openInfo={openInfo}
          goToPage={goToPage}
        />
      )}

      {toast ? <aside className="cs-toast">{toast}</aside> : null}

      <DetailModal
        selected={selected}
        onClose={() => setSelected(null)}
        onApprove={approveRecord}
        setPage={goToPage}
      />
    </section>
  );
}
