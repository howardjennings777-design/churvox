import axios from "axios";

const OWNER_LOGIN_PATH = "/api/auth/login";
const LOGGED_OUT_MARKER = "churvox:logged-out";
const CONFIRMED_LOGIN_NAVIGATION = "churvox:confirmed-login-navigation";
// Keep temporary owner-login failures on a standard retryable 5xx status.
// AuthContext retries 503 responses; changing them to a custom 520 stopped
// after the first Render failure even though the diagnostic said retryable.
const SERVICE_ERROR_STATUS = 503;
const OWNER_LOGIN_TIMEOUT_MS = 30000;
const SERVICE_MESSAGE = "Churvox login is temporarily unavailable while the service restarts. Please try again shortly.";

function requestPath(config = {}) {
  try {
    return new URL(String(config.url || ""), window.location.origin).pathname;
  } catch {
    return String(config.url || "");
  }
}

function clearConfirmedLoginNavigation() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search || "");
    if (params.get("logged_out") === "1") return;
    if (window.sessionStorage.getItem(CONFIRMED_LOGIN_NAVIGATION) !== "1") return;
    window.sessionStorage.removeItem(LOGGED_OUT_MARKER);
    window.sessionStorage.removeItem(CONFIRMED_LOGIN_NAVIGATION);
  } catch {}
}

clearConfirmedLoginNavigation();

axios.interceptors.request.use((config) => {
  const path = requestPath(config || {});
  if (path.endsWith(OWNER_LOGIN_PATH)) {
    config.timeout = Math.max(Number(config.timeout || 0), OWNER_LOGIN_TIMEOUT_MS);
    config.headers = {
      ...(config.headers || {}),
      "X-Churvox-Login-Client": "paid-launch-20260712",
    };
  }
  return config;
});

axios.interceptors.response.use(
  (response) => {
    const path = requestPath(response?.config || {});
    if (path.endsWith(OWNER_LOGIN_PATH)) {
      try {
        window.sessionStorage.removeItem(LOGGED_OUT_MARKER);
        // LoginPage performs a full secure route replacement after session
        // confirmation. Carry success across that one navigation so a stale
        // logout marker cannot be recreated on the fresh dashboard document.
        window.sessionStorage.setItem(CONFIRMED_LOGIN_NAVIGATION, "1");
      } catch {}
    }
    return response;
  },
  (error) => {
    const path = requestPath(error?.config || {});
    const status = Number(error?.response?.status || 0);
    const serviceFailure = !status || status >= 500;

    if (path.endsWith(OWNER_LOGIN_PATH) && serviceFailure) {
      const data = error?.response?.data && typeof error.response.data === "object"
        ? error.response.data
        : {};
      const headers = error?.response?.headers || {};
      const stage = data.stage || headers["x-churvox-login-stage"] || headers["X-Churvox-Login-Stage"] || "unknown";
      const route = data.login_route || data.version || headers["x-churvox-login-route"] || headers["X-Churvox-Login-Route"] || "unknown";
      const originalDetail = data.detail || "";

      try {
        window.sessionStorage.setItem("churvox:last-login-diagnostic", JSON.stringify({
          at: new Date().toISOString(),
          original_status: status || null,
          stage,
          route,
          detail: originalDetail,
          error_type: data.error_type || "",
        }));
      } catch {}

      console.warn("[Churvox login diagnostic]", {
        original_status: status || null,
        stage,
        route,
        detail: originalDetail,
        error_type: data.error_type || "",
      });

      error.churvoxOriginalStatus = status;
      error.response = {
        ...(error.response || {}),
        status: SERVICE_ERROR_STATUS,
        data: {
          ...data,
          detail: SERVICE_MESSAGE,
          original_detail: originalDetail,
          retryable: true,
          original_status: status || null,
          stage,
          route,
        },
      };
    }

    return Promise.reject(error);
  }
);
