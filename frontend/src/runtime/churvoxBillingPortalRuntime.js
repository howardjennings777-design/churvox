import API_BASE from "../lib/apiBase";

const BUTTON_ID = "churvox-manage-billing";
const STYLE_ID = "churvox-manage-billing-style";
let checking = false;
let checkedAt = 0;

function onPlans() {
  const path = window.location.pathname || "";
  const hash = (window.location.hash || "").replace(/^#/, "");
  return path === "/plans" || (path === "/dashboard" && hash === "plans");
}

function token() {
  try { return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || ""; }
  catch { return ""; }
}

function url(path) {
  return `${String(API_BASE || "").replace(/\/$/, "")}/api/${String(path || "").replace(/^\/+/, "").replace(/^api\//, "")}`;
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${BUTTON_ID}{min-height:44px;border:0;border-radius:999px;padding:11px 18px;background:#111827;color:#fff;font-weight:950;cursor:pointer;box-shadow:0 10px 24px rgba(15,23,42,.14)}
    #${BUTTON_ID}:disabled{opacity:.6;cursor:wait}
    .churvoxBillingPortalBar{grid-column:1/-1;width:100%;min-width:0;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:14px;margin:14px 0 18px;padding:15px 17px;border:1px solid rgba(15,23,42,.12);border-radius:18px;background:#fff;color:#111827;box-shadow:0 12px 30px rgba(15,23,42,.06);position:relative;z-index:2}
    .churvoxBillingPortalBar div{display:grid;gap:3px;min-width:0}.churvoxBillingPortalBar b{font-size:15px}.churvoxBillingPortalBar span{font-size:12px;color:#64748b;font-weight:750}
    @media(max-width:560px){.churvoxBillingPortalBar{align-items:stretch;flex-direction:column}#${BUTTON_ID}{width:100%}}
  `;
  document.head.appendChild(style);
}

function root() {
  return document.querySelector(".cv7Product, .cv3Product, .freshPricingPage, .freshPricingShell, .churvoxOptionC");
}

function insertButton() {
  if (!onPlans() || document.getElementById(BUTTON_ID)) return null;
  const pageRoot = root();
  if (!pageRoot) return null;
  const anchor = pageRoot.querySelector(".cv7PageTitle, .cv3Hero.page-plans, .freshPricingHero, #churvox-plan-live-usage") || pageRoot.firstElementChild;
  if (!anchor) return null;
  ensureStyle();
  const bar = document.createElement("section");
  bar.className = "churvoxBillingPortalBar";
  bar.innerHTML = `<div><b>Subscription and payment details</b><span>Stripe opens the secure customer portal. Churvox does not change the plan until Stripe confirms it.</span></div><button id="${BUTTON_ID}" type="button">Manage billing</button>`;
  anchor.insertAdjacentElement("afterend", bar);
  const button = bar.querySelector(`#${BUTTON_ID}`);
  button?.addEventListener("click", openPortal);
  return button;
}

async function request(path, options = {}) {
  const authToken = token();
  const response = await fetch(url(path), {
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || `Billing request failed (${response.status}).`);
  return body?.data || body;
}

async function openPortal() {
  const button = document.getElementById(BUTTON_ID);
  if (!button || button.disabled) return;
  button.disabled = true;
  button.textContent = "Opening secure billing…";
  try {
    const body = await request("billing/create-portal-session", { method: "POST", body: "{}" });
    const portalUrl = String(body?.url || body?.portal_url || "");
    if (!/^https:\/\//i.test(portalUrl)) throw new Error("Stripe did not return a secure billing URL.");
    window.location.assign(portalUrl);
  } catch (error) {
    button.disabled = false;
    button.textContent = "Manage billing";
    window.dispatchEvent(new CustomEvent("churvox:billing-portal-error", { detail: { message: error?.message || "Billing could not be opened." } }));
  }
}

async function scan(force = false) {
  if (!onPlans()) return;
  if (checking || (!force && Date.now() - checkedAt < 15000)) return;
  const pageRoot = root();
  if (!pageRoot || !token()) return;
  checking = true;
  try {
    const status = await request("billing/subscription-status");
    const stripeBacked = Boolean(status?.stripe_customer_id || status?.stripe_subscription_id);
    if (stripeBacked) insertButton();
    else document.getElementById(BUTTON_ID)?.closest(".churvoxBillingPortalBar")?.remove();
    checkedAt = Date.now();
  } catch {
    document.getElementById(BUTTON_ID)?.closest(".churvoxBillingPortalBar")?.remove();
  } finally {
    checking = false;
  }
}

function start() {
  const observer = new MutationObserver(() => window.requestAnimationFrame(() => scan(false)));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ["popstate", "hashchange", "churvox-auth-refresh", "churvox:plan-updated"].forEach((event) => window.addEventListener(event, () => scan(true)));
  scan(true);
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

export { scan, openPortal };
