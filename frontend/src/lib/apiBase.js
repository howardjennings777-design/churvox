function clean(value) {
  return String(value || "").replace(/\/+$/, "");
}

function stripApiSuffix(value) {
  return clean(value).replace(/\/api$/i, "");
}

const OUTREACH_GET_PATH = "/api/admin/owner/tester-outreach";
const HQ_READ_PREFIXES = ["/api/admin/owner", "/api/platform/hq"];
const OUTREACH_FETCH_GUARD = "__CHURVOX_OUTREACH_SIMPLE_GET_GUARD__";

function isHqReadPath(pathname = "") {
  return HQ_READ_PREFIXES.some((prefix) => String(pathname || "").startsWith(prefix));
}

function installOutreachSimpleGetGuard() {
  if (typeof window === "undefined" || typeof window.fetch !== "function" || window[OUTREACH_FETCH_GUARD]) return;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = undefined) => {
    try {
      const request = typeof Request !== "undefined" && input instanceof Request ? input : null;
      const url = new URL(typeof input === "string" ? input : request?.url || String(input || ""), window.location.href);
      const method = String(init?.method || request?.method || "GET").toUpperCase();
      const isHqRead = method === "GET" && isHqReadPath(url.pathname);

      if (isHqRead) {
        const suppliedHeaders = new Headers(init?.headers || request?.headers || {});
        const firstHeaders = new Headers(suppliedHeaders);
        const outreachRead = url.pathname === OUTREACH_GET_PATH;

        // Outreach has always been cookie-only. Other HQ reads get one normal
        // attempt first, then retry cookie-only when an old bearer token points
        // at a previous owner identity.
        if (outreachRead) {
          firstHeaders.delete("content-type");
          firstHeaders.delete("authorization");
        }

        const firstResponse = await nativeFetch(input, {
          ...(init || {}),
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: firstHeaders,
        });

        if (!outreachRead && [401, 403].includes(firstResponse.status) && suppliedHeaders.has("authorization")) {
          const cookieOnlyHeaders = new Headers(suppliedHeaders);
          cookieOnlyHeaders.delete("authorization");
          cookieOnlyHeaders.delete("content-type");
          return nativeFetch(input, {
            ...(init || {}),
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: cookieOnlyHeaders,
          });
        }

        return firstResponse;
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

function isFrontendProxyHost(host = "") {
  const cleanHost = String(host || "").trim().toLowerCase();
  return (
    cleanHost === "www.churvox.com" ||
    cleanHost === "churvox.com" ||
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1" ||
    cleanHost === "0.0.0.0" ||
    cleanHost === "::1"
  );
}

function resolveApiBase() {
  // Production and local branch previews both use the frontend's same-origin
  // /api proxy. This keeps auth cookies first-party, avoids browser CORS
  // differences, and makes a built branch exercise the same request path as
  // churvox.com. Hosted previews without the proxy may still use an explicit
  // configured backend URL.
  if (typeof window !== "undefined" && isFrontendProxyHost(window.location.hostname)) {
    return "";
  }

  return configuredBackend() || "";
}

installOutreachSimpleGetGuard();

export const API_BASE = resolveApiBase();
export default API_BASE;
