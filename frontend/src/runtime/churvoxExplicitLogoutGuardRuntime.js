import axios from "axios";
import API_BASE from "../lib/apiBase";
import "./churvoxBackendWakeRetryRuntime";
import "./churvoxOwnerLoginFallbackGuardRuntime";

const MARKER = "churvox:logged-out";
const RESTORE_PATHS = ["/api/auth/me", "/api/auth/check", "/api/auth/session"];
const NEW_SESSION_PATHS = ["/api/auth/login", "/api/worker/auth/login", "/api/auth/worker-login", "/api/auth/register"];
const CACHE_RESET_KEY = "churvox:owner-ui-cache-reset";
const CACHE_RESET_VERSION = "owner-premium-workspace-20260724-v1";
const STYLE_ID = "churvox-owner-native-logout-style";
const BUTTON_ID = "churvox-owner-native-logout";

const AUTH_KEYS = [
  "token",
  "authToken",
  "access_token",
  "owner_portal_session",
  "platform_owner_email",
  "churvox_auth_session_snapshot_v1",
  "churvox_auth_snapshot_v1",
  "churvox_auth_snapshot",
  "churvox_plan_choice_required",
  "churvox_business_profile_required",
  "churvox_first_setup_pending",
  "churvox:stable-current-plan:v1",
  "churvox:plan-override",
  "churvox:addon:accounting_sync",
  "churvox:addon:command_growth_pack",
  "churvox:billing-plan",
  "churvox:pending-checkout:v1",
];

const CSS = `
  #${BUTTON_ID}{
    position:static!important;
    inset:auto!important;
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
    width:auto!important;
    min-width:0!important;
    max-width:none!important;
    height:32px!important;
    min-height:32px!important;
    max-height:32px!important;
    margin:6px 0 0 auto!important;
    padding:0 10px!important;
    border:1px solid rgba(255,255,255,.14)!important;
    border-radius:8px!important;
    background:rgba(255,255,255,.06)!important;
    color:rgba(255,255,255,.72)!important;
    box-shadow:none!important;
    font:700 11px/1 Inter,ui-sans-serif,system-ui,sans-serif!important;
    white-space:nowrap!important;
    cursor:pointer!important;
  }
  #${BUTTON_ID}:hover,
  #${BUTTON_ID}:focus-visible{
    border-color:rgba(239,107,46,.55)!important;
    background:rgba(239,107,46,.12)!important;
    color:#fff!important;
    outline:none!important;
  }
  #${BUTTON_ID}:disabled{opacity:.6!important;cursor:wait!important;}
  @media(max-width:900px){
    #${BUTTON_ID}{height:30px!important;min-height:30px!important;max-height:30px!important;margin-top:3px!important;padding:0 8px!important;font-size:10px!important;}
  }
`;

function loggedOut() {
  try {
    const raw = Number(sessionStorage.getItem(MARKER) || 0);
    if (!raw) return false;
    if (Date.now() - raw > 1000 * 60 * 60 * 12) {
      sessionStorage.removeItem(MARKER);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function clearLoggedOut() {
  try { sessionStorage.removeItem(MARKER); } catch {}
}

function pathOf(config = {}) {
  try {
    return new URL(String(config.url || ""), window.location.origin).pathname;
  } catch {
    return String(config.url || "");
  }
}

function isOwnerPath() {
  if (typeof window === "undefined") return false;
  const path = String(window.location.pathname || "");
  return path === "/dashboard" || path.startsWith("/dashboard/") || path === "/plans" || path === "/guide" || path === "/setup" || path === "/setup-guide";
}

function hasAuthProof() {
  if (typeof window === "undefined") return false;
  if (window.__CHURVOX_AUTH_STATE__?.authenticated === true) return true;
  try {
    if (localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token")) return true;
    const raw = localStorage.getItem("churvox_auth_session_snapshot_v1");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.token || parsed?.user?.email || parsed?.user?.id || parsed?.user?._id);
  } catch {
    return false;
  }
}

function installStyle() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("churvoxOwnerReadableMode");
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== CSS) style.textContent = CSS;
}

function clearAuthStorage() {
  try { AUTH_KEYS.forEach((key) => localStorage.removeItem(key)); } catch {}
  try { AUTH_KEYS.forEach((key) => sessionStorage.removeItem(key)); } catch {}
  try { sessionStorage.setItem(MARKER, String(Date.now())); } catch {}
}

async function forceOwnerLogout(button) {
  if (button) {
    button.disabled = true;
    button.textContent = "Signing out…";
  }
  try {
    const base = String(API_BASE || "https://grassley-backend.onrender.com").replace(/\/$/, "");
    const auth = (() => {
      try { return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || ""; } catch { return ""; }
    })();
    await axios.post(`${base}/api/auth/logout`, {}, {
      withCredentials: true,
      timeout: 6000,
      headers: auth ? { Authorization: `Bearer ${auth}` } : undefined,
    });
  } catch {}
  clearAuthStorage();
  window.location.replace("/login?logged_out=1");
}

function makeLogout() {
  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.textContent = "Log out";
  button.setAttribute("aria-label", "Log out of Churvox");
  button.setAttribute("data-churvox-native-logout", "true");
  button.addEventListener("click", () => forceOwnerLogout(button));
  return button;
}

function removeLegacyOwnerLogout() {
  document.querySelectorAll(
    "#churvox-owner-fallback-logout, #churvox-runtime-logout-button, #churvox-product-runtime-logout-button, .cvxVisibleLogout, .cvxLogoutNavButton, .cvEmergencyLogoutPinned"
  ).forEach((element) => {
    if (element.id !== BUTTON_ID) element.remove();
  });
}

function ensureOwnerLogout() {
  if (typeof document === "undefined") return;
  if (!isOwnerPath()) {
    document.getElementById(BUTTON_ID)?.remove();
    return;
  }
  installStyle();
  removeLegacyOwnerLogout();
  const account = document.querySelector(".cv3Account");
  if (!account) return;
  let button = document.getElementById(BUTTON_ID);
  if (!button) button = makeLogout();
  if (button.parentElement !== account) account.appendChild(button);
}

async function resetStaleOwnerShellOnce() {
  if (typeof window === "undefined" || !isOwnerPath() || !hasAuthProof()) return;
  let previous = "";
  try { previous = localStorage.getItem(CACHE_RESET_KEY) || ""; } catch {}
  if (previous === CACHE_RESET_VERSION) return;
  try { localStorage.setItem(CACHE_RESET_KEY, CACHE_RESET_VERSION); } catch {}
  try {
    const work = [];
    if ("caches" in window) work.push(window.caches.keys().then((names) => Promise.all(names.map((name) => window.caches.delete(name)))));
    if ("serviceWorker" in navigator) work.push(navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))));
    await Promise.allSettled(work);
  } catch {}
}

if (typeof window !== "undefined") {
  installStyle();
  resetStaleOwnerShellOnce();

  if (window.location.pathname === "/admin/login") {
    const params = new URLSearchParams(window.location.search || "");
    params.set("admin", "1");
    if (!params.get("email")) params.set("email", "hello@churvox.com");
    window.history.replaceState(window.history.state, "", `/login?${params.toString()}`);
  }

  const params = new URLSearchParams(window.location.search || "");
  if (params.get("logged_out") === "1") {
    try { sessionStorage.setItem(MARKER, String(Date.now())); } catch {}
  }

  axios.interceptors.request.use((config) => {
    const path = pathOf(config);
    if (NEW_SESSION_PATHS.some((item) => path.endsWith(item))) {
      clearLoggedOut();
      return config;
    }
    if (loggedOut() && RESTORE_PATHS.some((item) => path.endsWith(item))) {
      const error = new Error("Explicit logout prevents restoring an older browser session.");
      error.response = { status: 401, data: { detail: "Signed out" } };
      return Promise.reject(error);
    }
    return config;
  });

  const schedule = () => {
    resetStaleOwnerShellOnce();
    [0, 80, 220, 600, 1400].forEach((delay) => window.setTimeout(ensureOwnerLogout, delay));
  };
  schedule();
  window.setInterval(ensureOwnerLogout, 2500);
  window.addEventListener("load", schedule);
  window.addEventListener("hashchange", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("churvox-auth-state", schedule);
  window.addEventListener("churvox-owner-app-ready", schedule);
  if (typeof MutationObserver !== "undefined" && document.documentElement) {
    const observer = new MutationObserver(() => window.setTimeout(ensureOwnerLogout, 60));
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}

export { MARKER, clearLoggedOut, loggedOut };
