// Bridges the current Control Board to proven paid-launch runtimes and contracts.
// It adds stable semantic markers only; React continues to own all rendered DOM.

const STYLE_ID = "churvox-product-plans-usage-grid-style";
let observer = null;
let scanning = false;

function ensureGridStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `#churvox-plan-live-usage{grid-column:1/-1;width:100%;min-width:0;box-sizing:border-box}`;
  document.head.appendChild(style);
}

function normalizePlan(value) {
  const key = String(value || "").trim().toLowerCase();
  if (["start", "solo", "starter", "basic"].includes(key)) return "start";
  if (["crew", "team"].includes(key)) return "crew";
  if (["operator", "pro", "professional"].includes(key)) return "operator";
  if (["command", "enterprise"].includes(key)) return "command";
  return "none";
}

function authUser() {
  const live = window.__CHURVOX_AUTH_STATE__?.user || window.__CHURVOX_AUTH_STATE__?.currentUser;
  if (live) return live;
  try {
    const snapshot = JSON.parse(localStorage.getItem("churvox_auth_session_snapshot_v1") || "{}");
    return snapshot?.user || {};
  } catch {
    return {};
  }
}

function decorateControlBoard() {
  const root = document.querySelector(".cv7Product");
  if (!root) return null;
  root.classList.add("cvOwnerReady", "cv3Product");
  const pageClass = [...root.classList].find((name) => name.startsWith("page-"));
  root.dataset.screen = pageClass ? pageClass.replace(/^page-/, "") : "today";
  const user = authUser();
  const plan = normalizePlan(user.current_plan || user.ui_plan || user.plan || user.plan_key || user.tier || user.subscription_plan);
  root.dataset.plan = plan;

  const nav = root.querySelector(".cv7MainNav");
  if (nav) {
    nav.classList.add("cvOwnerNavigation");
    nav.dataset.plan = plan;
  }

  if (root.classList.contains("page-plans")) {
    root.dataset.churvoxPage = "plans";
    const title = root.querySelector(".cv7PageTitle");
    if (title) title.classList.add("cv3Hero", "page-plans");
  }
  return root;
}

function isProductPlansPage() {
  const path = window.location.pathname || "";
  const hash = (window.location.hash || "").replace(/^#/, "");
  return path === "/plans" || (path === "/dashboard" && hash === "plans");
}

async function bridge() {
  const root = decorateControlBoard();
  if (!root || !isProductPlansPage() || scanning) return;
  ensureGridStyle();
  scanning = true;
  try {
    const runtime = await import("./churvoxPlansUsageTruthRuntime");
    runtime.scan?.();
    const billing = await import("./churvoxBillingPortalRuntime");
    billing.scan?.(true);
  } finally {
    scanning = false;
  }
}

function scan() {
  decorateControlBoard();
  bridge();
}

function start() {
  if (observer) return;
  observer = new MutationObserver(() => window.requestAnimationFrame(scan));
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  window.addEventListener("popstate", scan);
  window.addEventListener("hashchange", scan);
  window.addEventListener("churvox-auth-refresh", scan);
  scan();
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

export { bridge, decorateControlBoard };
