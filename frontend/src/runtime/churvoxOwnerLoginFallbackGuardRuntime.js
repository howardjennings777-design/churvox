import axios from "axios";

const OWNER_LOGIN_PATH = "/api/auth/login";
const SERVICE_ERROR_STATUS = 520;
const OWNER_LOGIN_TIMEOUT_MS = 30000;

function requestPath(config = {}) {
  try {
    return new URL(String(config.url || ""), window.location.origin).pathname;
  } catch {
    return String(config.url || "");
  }
}

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
  (response) => response,
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

      try {
        window.sessionStorage.setItem("churvox:last-login-diagnostic", JSON.stringify({
          at: new Date().toISOString(),
          original_status: status || null,
          stage,
          route,
          detail: data.detail || "",
          error_type: data.error_type || "",
        }));
      } catch {}

      console.warn("[Churvox login diagnostic]", {
        original_status: status || null,
        stage,
        route,
        detail: data.detail || "",
        error_type: data.error_type || "",
      });

      error.churvoxOriginalStatus = status;
      error.response = {
        ...(error.response || {}),
        status: SERVICE_ERROR_STATUS,
        data: {
          ...data,
          detail: data.detail || "Churvox is restarting. Please wait a moment and sign in again.",
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
