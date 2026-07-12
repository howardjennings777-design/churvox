import API_BASE from "../lib/apiBase";

const VERSION = "CHURVOX_PLANS_USAGE_TRUTH_20260712";
const PANEL_ID = "churvox-plan-live-usage";
const LABELS = [
  ["active_team_members", "active_team_members", "Active team members"],
  ["clients", "clients", "Clients"],
  ["jobs_this_month", "jobs_per_month", "Jobs this month"],
  ["ai_actions", "ai_actions", "AI actions this month"],
];

let loading = false;
let lastLoadedAt = 0;
let observer = null;

function isPlansPage() {
  return window.location.pathname === "/plans" && Boolean(document.querySelector(".cvPlansPage"));
}

function apiUrl(path) {
  const base = String(API_BASE || "https://grassley-backend.onrender.com").replace(/\/$/, "");
  return `${base}/api/${String(path || "").replace(/^\/+/, "").replace(/^api\//, "")}`;
}

function token() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

function text(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function number(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function planLabel(value) {
  return { start: "Start", solo: "Start", crew: "Crew", team: "Crew", operator: "Operator", pro: "Operator", command: "Command", enterprise: "Command" }[String(value || "").toLowerCase()] || "Current plan";
}

function ensureStyles() {
  if (document.getElementById("churvox-plan-live-usage-style")) return;
  const style = document.createElement("style");
  style.id = "churvox-plan-live-usage-style";
  style.textContent = `
    #${PANEL_ID} {
      margin: 16px 0 22px;
      padding: 20px;
      border: 1px solid rgba(15, 23, 42, .12);
      border-left: 6px solid #f97316;
      border-radius: 22px;
      background: #fff;
      box-shadow: 0 14px 40px rgba(15, 23, 42, .07);
      color: #111827;
    }
    #${PANEL_ID} .cvUsageHead {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;
    }
    #${PANEL_ID} .cvUsageHead > div { display: grid; gap: 4px; }
    #${PANEL_ID} .cvUsageHead small {
      color: #c2410c;
      font-size: 11px;
      font-weight: 1000;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    #${PANEL_ID} .cvUsageHead h3 {
      margin: 0;
      color: #111827;
      font-size: clamp(20px, 2.3vw, 28px);
      font-weight: 1000;
      letter-spacing: -.035em;
    }
    #${PANEL_ID} .cvUsageHead p,
    #${PANEL_ID} .cvUsageStatus {
      margin: 0;
      color: #64748b;
      font-size: 13px;
      font-weight: 760;
      line-height: 1.45;
    }
    #${PANEL_ID} .cvUsageRefresh {
      min-width: 126px;
      min-height: 42px;
      border: 1px solid rgba(15, 23, 42, .14);
      border-radius: 999px;
      background: #111827;
      color: #fff;
      font-size: 12px;
      font-weight: 1000;
      cursor: pointer;
    }
    #${PANEL_ID} .cvUsageRefresh:disabled { opacity: .55; cursor: wait; }
    #${PANEL_ID} .cvUsageGrid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-top: 14px;
    }
    #${PANEL_ID} .cvUsageCard {
      min-width: 0;
      padding: 14px;
      border: 1px solid rgba(15, 23, 42, .09);
      border-radius: 16px;
      background: #f8fafc;
    }
    #${PANEL_ID} .cvUsageCard b {
      display: block;
      color: #334155;
      font-size: 12px;
      font-weight: 900;
    }
    #${PANEL_ID} .cvUsageCard strong {
      display: block;
      margin: 5px 0 3px;
      color: #111827;
      font-size: 23px;
      font-weight: 1000;
      letter-spacing: -.035em;
    }
    #${PANEL_ID} .cvUsageCard span {
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
    }
    #${PANEL_ID}[data-state="error"] {
      border-left-color: #b91c1c;
      background: #fff7f7;
    }
    #${PANEL_ID}[data-state="error"] .cvUsageStatus { color: #991b1b; }
    @media (max-width: 900px) {
      #${PANEL_ID} .cvUsageGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 560px) {
      #${PANEL_ID} { padding: 16px; }
      #${PANEL_ID} .cvUsageHead { align-items: stretch; flex-direction: column; }
      #${PANEL_ID} .cvUsageRefresh { width: 100%; }
      #${PANEL_ID} .cvUsageGrid { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
}

function markStaticCards() {
  document.querySelectorAll(".cvPlanAllowance p").forEach((paragraph) => {
    if (/usage count hidden/i.test(paragraph.textContent || "")) paragraph.textContent = "Live current-plan usage is shown below.";
  });
  const headerParagraph = document.querySelector(".cvPlanPanelHeader p");
  if (headerParagraph && /static limits/i.test(headerParagraph.textContent || "")) {
    headerParagraph.textContent = "Plan allowances stay fixed. Current usage is verified separately below.";
  }
}

function ensurePanel() {
  if (!isPlansPage()) return null;
  ensureStyles();
  markStaticCards();
  let panel = document.getElementById(PANEL_ID);
  if (panel) return panel;
  const planPanel = document.querySelector(".cvPlanPanel");
  if (!planPanel) return null;
  panel = document.createElement("section");
  panel.id = PANEL_ID;
  panel.dataset.version = VERSION;
  panel.dataset.state = "loading";
  panel.innerHTML = `
    <div class="cvUsageHead">
      <div>
        <small>Verified current usage</small>
        <h3>Loading your live plan usage</h3>
        <p>Churvox will not assume zero when the backend cannot verify a count.</p>
      </div>
      <button type="button" class="cvUsageRefresh">Refresh usage</button>
    </div>
    <p class="cvUsageStatus" role="status">Checking the live plan usage endpoint…</p>
    <div class="cvUsageGrid" aria-live="polite"></div>
  `;
  panel.querySelector(".cvUsageRefresh")?.addEventListener("click", () => loadUsage(true));
  planPanel.insertAdjacentElement("afterend", panel);
  return panel;
}

function renderLoading(panel) {
  panel.dataset.state = "loading";
  const button = panel.querySelector(".cvUsageRefresh");
  if (button) {
    button.disabled = true;
    button.textContent = "Checking…";
  }
  const status = panel.querySelector(".cvUsageStatus");
  if (status) status.textContent = "Checking the live plan usage endpoint…";
}

function renderError(panel, message) {
  panel.dataset.state = "error";
  const heading = panel.querySelector("h3");
  if (heading) heading.textContent = "Live usage is unavailable";
  const status = panel.querySelector(".cvUsageStatus");
  if (status) status.textContent = `${message || "The backend did not verify current usage."} No usage number has been assumed.`;
  const grid = panel.querySelector(".cvUsageGrid");
  if (grid) grid.innerHTML = "";
  const button = panel.querySelector(".cvUsageRefresh");
  if (button) {
    button.disabled = false;
    button.textContent = "Try again";
  }
}

function renderUsage(panel, data) {
  const used = data?.used || data?.usage || {};
  const limits = data?.limits || {};
  const slots = data?.slots_left || {};
  if (data?.usage_verified !== true) {
    const detail = Object.values(data?.usage_errors || {}).filter(Boolean).join("; ");
    renderError(panel, detail || "One or more usage counters could not be verified.");
    return;
  }

  const cards = [];
  for (const [usedKey, limitKey, label] of LABELS) {
    const usedValue = number(used[usedKey]);
    const limitValue = number(limits[limitKey]);
    if (usedValue === null || limitValue === null) {
      renderError(panel, `${label} was not returned as a verified number.`);
      return;
    }
    const slotKey = usedKey === "jobs_this_month" ? "jobs_this_month" : usedKey;
    const remaining = number(slots[slotKey]);
    cards.push(`<article class="cvUsageCard"><b>${label}</b><strong>${usedValue.toLocaleString("en-NZ")} / ${limitValue.toLocaleString("en-NZ")}</strong><span>${remaining === null ? "Remaining count unavailable" : `${remaining.toLocaleString("en-NZ")} remaining`}</span></article>`);
  }

  panel.dataset.state = "ready";
  const heading = panel.querySelector("h3");
  if (heading) heading.textContent = `${planLabel(data?.plan || data?.current_plan)} usage`;
  const status = panel.querySelector(".cvUsageStatus");
  if (status) status.textContent = `Verified from live business records${data?.guarded_at ? ` · ${new Date(data.guarded_at).toLocaleString("en-NZ")}` : ""}.`;
  const grid = panel.querySelector(".cvUsageGrid");
  if (grid) grid.innerHTML = cards.join("");
  const button = panel.querySelector(".cvUsageRefresh");
  if (button) {
    button.disabled = false;
    button.textContent = "Refresh usage";
  }
}

async function loadUsage(force = false) {
  if (!isPlansPage() || loading) return;
  if (!force && Date.now() - lastLoadedAt < 15000) return;
  const panel = ensurePanel();
  if (!panel) return;
  loading = true;
  renderLoading(panel);
  try {
    const authToken = token();
    if (!authToken) throw new Error("Sign in again to verify plan usage.");
    const response = await fetch(apiUrl("plan/usage"), {
      credentials: "include",
      headers: { Accept: "application/json", Authorization: `Bearer ${authToken}` },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.success === false) throw new Error(text(body?.detail || body?.error || body?.message, `Usage request failed (${response.status}).`));
    if (body?.limit_source !== "locked_paid_launch_limits_2026_07_12") throw new Error("The backend returned an outdated plan-limit source.");
    renderUsage(panel, body);
    lastLoadedAt = Date.now();
  } catch (error) {
    renderError(panel, error?.message || "Live usage could not be loaded.");
  } finally {
    loading = false;
  }
}

function scan() {
  if (!isPlansPage()) return;
  const panel = ensurePanel();
  if (panel) loadUsage(false);
}

function start() {
  if (observer || typeof document === "undefined") return;
  observer = new MutationObserver(() => window.requestAnimationFrame(scan));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("focus", () => loadUsage(false));
  window.addEventListener("popstate", scan);
  window.addEventListener("hashchange", scan);
  window.addEventListener("churvox:plan-updated", () => loadUsage(true));
  window.addEventListener("churvox-auth-refresh", () => loadUsage(true));
  scan();
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

export { VERSION, loadUsage, scan };
