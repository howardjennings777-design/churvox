import axios from "axios";
import API_BASE from "../lib/apiBase";

const RETRYABLE_AUTH_PATHS = ["/api/auth/me", "/api/auth/check", "/api/auth/session"];
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const DELAYS = [1200, 2600, 4800];
const LOGOUT_MARKER = "churvox:logged-out";

function requestPath(config = {}) {
  try {
    return new URL(String(config.url || ""), window.location.origin).pathname;
  } catch {
    return String(config.url || "");
  }
}

function explicitlyLoggedOut() {
  try {
    return Boolean(sessionStorage.getItem(LOGOUT_MARKER));
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function wakeBackend() {
  const base = String(API_BASE || "https://grassley-backend.onrender.com").replace(/\/$/, "");
  try {
    await fetch(`${base}/api/healthz`, {
      method: "GET",
      mode: "no-cors",
      credentials: "omit",
      cache: "no-store",
      keepalive: true,
    });
  } catch {}
}

if (typeof window !== "undefined") {
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error?.config;
      if (!config || explicitlyLoggedOut()) return Promise.reject(error);

      const method = String(config.method || "get").toLowerCase();
      const path = requestPath(config);
      const status = error?.response?.status;
      const retryablePath = method === "get" && RETRYABLE_AUTH_PATHS.some((item) => path.endsWith(item));
      const retryableFailure = !error?.response || RETRYABLE_STATUSES.has(status);
      const attempt = Number(config.__churvoxBackendWakeAttempt || 0);

      if (!retryablePath || !retryableFailure || attempt >= DELAYS.length) {
        return Promise.reject(error);
      }

      config.__churvoxBackendWakeAttempt = attempt + 1;
      await wakeBackend();
      await sleep(DELAYS[attempt]);
      return axios(config);
    }
  );
}

export { DELAYS, RETRYABLE_AUTH_PATHS, wakeBackend };
