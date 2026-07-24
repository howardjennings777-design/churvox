import axios from "axios";
import API_BASE from "../lib/apiBase";
import "./churvoxBackendWakeRetryRuntime";
import "./churvoxOwnerLoginFallbackGuardRuntime";

const MARKER = "churvox:logged-out";
const RESTORE_PATHS = ["/api/auth/me", "/api/auth/check", "/api/auth/session"];
const NEW_SESSION_PATHS = ["/api/auth/login", "/api/worker/auth/login", "/api/auth/worker-login", "/api/auth/register"];
const CACHE_RESET_KEY = "churvox:owner-ui-cache-reset";
const CACHE_RESET_VERSION = "owner-readable-logout-20260724-v4";
const OWNER_STYLE_ID = "churvox-owner-readable-logout-style";
const FALLBACK_LOGOUT_ID = "churvox-owner-fallback-logout";

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

const OWNER_READABLE_CSS = `
  .cvOwnerReady {
    font-size: 18px !important;
    line-height: 1.55 !important;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  .cvOwnerReady .cvSiteTopbar {
    overflow: visible !important;
    padding-right: 146px !important;
  }

  .cvOwnerReady :where(p, li, dd, dt, label) {
    font-size: 17px !important;
    line-height: 1.55 !important;
  }

  .cvOwnerReady :where(button, a) {
    font-size: 16px !important;
    line-height: 1.3 !important;
  }

  .cvOwnerReady :where(
    small,
    .cvSiteScreen span,
    .cvSiteStatus span,
    .cvSiteTopbar span,
    .cvOwnerMoreMenu span,
    .cvCommandSlip span,
    .cvCommandSlip small
  ) {
    font-size: 15px !important;
    line-height: 1.45 !important;
  }

  .cvOwnerReady :where(input, textarea, select) {
    min-height: 46px !important;
    font-size: 17px !important;
    line-height: 1.45 !important;
  }

  .cvOwnerReady :where(button, a[role="button"]) {
    min-height: 46px;
  }

  .cvOwnerReady .cvSiteLogout,
  .cvOwnerReady .cvEmergencyLogoutPinned,
  #${FALLBACK_LOGOUT_ID} {
    position: fixed !important;
    top: max(12px, env(safe-area-inset-top, 0px)) !important;
    right: 12px !important;
    z-index: 2147483000 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    visibility: visible !important;
    width: 116px !important;
    min-width: 116px !important;
    max-width: 116px !important;
    min-height: 50px !important;
    margin: 0 !important;
    padding: 0 18px !important;
    border: 2px solid #f97316 !important;
    border-radius: 999px !important;
    color: #ffffff !important;
    background: #17120e !important;
    box-shadow: 0 14px 34px rgba(0, 0, 0, .34) !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    font-family: inherit !important;
    font-size: 16px !important;
    font-weight: 950 !important;
    line-height: 1 !important;
    text-transform: none !important;
    white-space: nowrap !important;
    cursor: pointer !important;
  }

  .cvOwnerReady .cvSiteLogout:hover,
  .cvOwnerReady .cvSiteLogout:focus-visible,
  #${FALLBACK_LOGOUT_ID}:hover,
  #${FALLBACK_LOGOUT_ID}:focus-visible {
    color: #17120e !important;
    background: #fff7ec !important;
    outline: 3px solid rgba(249, 115, 22, .45) !important;
    outline-offset: 2px !important;
  }

  @media (max-width: 760px) {
    .cvOwnerReady {
      font-size: 18px !important;
    }

    .cvOwnerReady .cvSiteTopbar {
      padding-right: 138px !important;
    }

    .cvOwnerReady :where(p, li, dd, dt, label) {
      font-size: 17px !important;
    }

    .cvOwnerReady :where(button, a) {
      font-size: 16px !important;
    }

    .cvOwnerReady :where(small, .cvSiteScreen span, .cvSiteStatus span, .cvSiteTopbar span) {
      font-size: 15px !important;
    }
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
    const raw = String(config.url || "");
    return new URL(raw, window.location.origin).pathname;
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

function installOwnerReadableStyle() {
  if (typeof document === "undefined") return;
  let style = document.getElementById(OWNER_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = OWNER_STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== OWNER_READABLE_CSS) style.textContent = OWNER_READABLE_CSS;
}

function visible(element) {
  if (!(element instanceof HTMLElement) || !element.isConnected) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none"
    && style.visibility !== "hidden"
    && Number(style.opacity || 1) > 0.05
    && style.pointerEvents !== "none"
    && rect.width >= 96
    && rect.height >= 42
    && rect.right > 0
    && rect.bottom > 0
    && rect.left < window.innerWidth
    && rect.top < window.innerHeight;
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

function makeFallbackLogout() {
  const button = document.createElement("button");
  button.id = FALLBACK_LOGOUT_ID;
  button.type = "button";
  button.textContent = "Log out";
  button.setAttribute("aria-label", "Log out of Churvox");
  button.setAttribute("data-churvox-emergency-logout", "true");
  button.addEventListener("click", () => forceOwnerLogout(button));
  return button;
}

function ensureOwnerLogout() {
  if (typeof document === "undefined" || !isOwnerPath()) return;
  installOwnerReadableStyle();

  const fallback = document.getElementById(FALLBACK_LOGOUT_ID);
  if (!hasAuthProof()) {
    fallback?.remove();
    return;
  }

  const candidates = Array.from(document.querySelectorAll(
    ".cvSiteLogout, .cvxVisibleLogout, [data-churvox-native-logout=\"true\"], [data-churvox-visible-logout=\"true\"]"
  ));
  const native = candidates.find((element) => element.id !== FALLBACK_LOGOUT_ID);
  if (native) {
    native.classList.add("cvEmergencyLogoutPinned");
    if (visible(native)) {
      fallback?.remove();
      return;
    }
  }

  const button = fallback || makeFallbackLogout();
  if (!button.isConnected) document.body.appendChild(button);
}

async function resetStaleOwnerShellOnce() {
  if (typeof window === "undefined" || !isOwnerPath() || !hasAuthProof()) return;
  let previous = "";
  try { previous = localStorage.getItem(CACHE_RESET_KEY) || ""; } catch {}
  if (previous === CACHE_RESET_VERSION) return;

  try { localStorage.setItem(CACHE_RESET_KEY, CACHE_RESET_VERSION); } catch {}

  try {
    const work = [];
    if ("caches" in window) {
      work.push(window.caches.keys().then((names) => Promise.all(names.map((name) => window.caches.delete(name)))));
    }
    if ("serviceWorker" in navigator) {
      work.push(navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))));
    }
    await Promise.allSettled(work);
  } catch {}
}

if (typeof window !== "undefined") {
  installOwnerReadableStyle();
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

  const scheduleOwnerRepair = () => {
    resetStaleOwnerShellOnce();
    [0, 80, 220, 600, 1400, 3000].forEach((delay) => window.setTimeout(ensureOwnerLogout, delay));
  };
  scheduleOwnerRepair();
  window.addEventListener("load", scheduleOwnerRepair);
  window.addEventListener("resize", scheduleOwnerRepair);
  window.addEventListener("orientationchange", scheduleOwnerRepair);
  window.addEventListener("hashchange", scheduleOwnerRepair);
  window.addEventListener("popstate", scheduleOwnerRepair);
  window.addEventListener("churvox-auth-state", scheduleOwnerRepair);
  window.addEventListener("churvox-owner-app-ready", scheduleOwnerRepair);

  if (typeof MutationObserver !== "undefined" && document.documentElement) {
    const observer = new MutationObserver(() => window.setTimeout(ensureOwnerLogout, 40));
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden", "aria-hidden"] });
  }
}

export { MARKER, clearLoggedOut, loggedOut };
