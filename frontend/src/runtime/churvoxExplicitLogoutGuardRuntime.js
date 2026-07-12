import axios from "axios";
import "./churvoxBackendWakeRetryRuntime";

const MARKER = "churvox:logged-out";
const RESTORE_PATHS = ["/api/auth/me", "/api/auth/check", "/api/auth/session"];
const NEW_SESSION_PATHS = ["/api/auth/login", "/api/worker/auth/login", "/api/auth/worker-login", "/api/auth/register"];

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

if (typeof window !== "undefined") {
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
}

export { MARKER, clearLoggedOut, loggedOut };
