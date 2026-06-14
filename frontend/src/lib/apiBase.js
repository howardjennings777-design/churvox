function clean(value) {
  return String(value || "").replace(/\/+$/, "");
}

function stripApiSuffix(value) {
  return clean(value).replace(/\/api$/i, "");
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
    return "";
  }

  return configuredBackend();
}

export const API_BASE = resolveApiBase();

export default API_BASE;
