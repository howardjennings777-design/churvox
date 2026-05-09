const RAW_BACKEND_URL =
  (
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_BACKEND_URL) ||
    (typeof process !== "undefined" && process?.env?.REACT_APP_BACKEND_URL) ||
    "https://grassley-backend.onrender.com"
  ).replace(/\/$/, "");

const trimTrailingSlash = (value = "") => String(value).replace(/\/+$/, "");

const withApiSuffix = (base) => {
  const clean = trimTrailingSlash(base);
  if (!clean) return "/api";
  return clean.endsWith("/api") ? clean : `${clean}/api`;
};

export const API_BASE_URL = withApiSuffix(RAW_BACKEND_URL);

const getStoredToken = () => {
  if (typeof localStorage === "undefined") return "";
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken") ||
    ""
  );
};

const normalizePath = (path = "") => {
  if (!path) return "";
  return String(path).startsWith("/") ? path : `/${path}`;
};

export async function apiRequest(method, path, body, options = {}) {
  const token = getStoredToken();
  const headers = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const requestInit = {
    method,
    credentials: "include",
    ...options,
    headers,
  };

  if (body !== undefined) {
    requestInit.body =
      typeof body === "string" || body instanceof FormData ? body : JSON.stringify(body);
    if (body instanceof FormData) delete requestInit.headers["Content-Type"];
  }

  try {
    const response = await fetch(`${API_BASE_URL}${normalizePath(path)}`, requestInit);
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message =
        payload?.message || payload?.error || payload?.detail || `Request failed (${response.status})`;
      return {
        success: false,
        ok: false,
        status: response.status,
        data: payload,
        error: message,
        message,
      };
    }

    return {
      success: true,
      ok: true,
      status: response.status,
      data: payload,
    };
  } catch (err) {
    const message = err?.message || "Network request failed";
    return {
      success: false,
      ok: false,
      status: 0,
      data: null,
      error: message,
      message,
    };
  }
}

export const get = (path, options) => apiRequest("GET", path, undefined, options);
export const post = (path, body, options) => apiRequest("POST", path, body, options);
export const put = (path, body, options) => apiRequest("PUT", path, body, options);
export const patch = (path, body, options) => apiRequest("PATCH", path, body, options);
export const del = (path, options) => apiRequest("DELETE", path, undefined, options);
export const remove = del;

const api = { apiRequest, get, post, put, patch, del, remove, API_BASE_URL };

export default api;
