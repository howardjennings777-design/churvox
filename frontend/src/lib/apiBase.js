function clean(value) {
  return String(value || "").replace(/\/+$/, "");
}

function stripApiSuffix(value) {
  return clean(value).replace(/\/api$/i, "");
}

const PRODUCTION_BACKEND_URL = "https://grassley-backend.onrender.com";
const OUTREACH_GET_PATH = "/api/admin/owner/tester-outreach";
const OUTREACH_FETCH_GUARD = "__CHURVOX_OUTREACH_SIMPLE_GET_GUARD__";

function installOutreachSimpleGetGuard() {
  if (typeof window === "undefined" || typeof window.fetch !== "function" || window[OUTREACH_FETCH_GUARD]) return;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input, init = undefined) => {
    try {
      const request = typeof Request !== "undefined" && input instanceof Request ? input : null;
      const url = new URL(typeof input === "string" ? input : request?.url || String(input || ""), window.location.href);
      const method = String(init?.method || request?.method || "GET").toUpperCase();

      if (method === "GET" && url.pathname === OUTREACH_GET_PATH) {
        const nextHeaders = new Headers(init?.headers || request?.headers || {});
        nextHeaders.delete("content-type");
        nextHeaders.delete("authorization");
        return nativeFetch(input, {
          ...(init || {}),
          method: "GET",
          credentials: "include",
          headers: nextHeaders,
        });
      }
    } catch {
      // Keep every unrelated request on the normal fetch path.
    }
    return nativeFetch(input, init);
  };

  window[OUTREACH_FETCH_GUARD] = true;
}

function configuredBackend() {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  return stripApiSuffix(
    env.REACT_APP_BACKEND_URL ||
      env.VITE_BACKEND_URL ||
      env.BACKEND_URL ||
      ""
  );
}

function isChurvoxHost(host = "") {
  const cleanHost = String(host || "").toLowerCase();
  return cleanHost === "www.churvox.com" || cleanHost === "churvox.com";
}

function resolveApiBase() {
  if (typeof window !== "undefined" && isChurvoxHost(window.location.hostname)) {
    return PRODUCTION_BACKEND_URL;
  }

  return configuredBackend() || "";
}

installOutreachSimpleGetGuard();

export const API_BASE = resolveApiBase();
export default API_BASE;
