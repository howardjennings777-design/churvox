import axios from "axios";

const OWNER_LOGIN_PATH = "/api/auth/login";
const SERVICE_ERROR_STATUS = 520;

function requestPath(config = {}) {
  try {
    return new URL(String(config.url || ""), window.location.origin).pathname;
  } catch {
    return String(config.url || "");
  }
}

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
      error.churvoxOriginalStatus = status;
      error.response = {
        ...(error.response || {}),
        status: SERVICE_ERROR_STATUS,
        data: {
          ...data,
          detail: data.detail || "Churvox is restarting. Please wait a moment and sign in again.",
          retryable: true,
          original_status: status || null,
        },
      };
    }

    return Promise.reject(error);
  }
);
