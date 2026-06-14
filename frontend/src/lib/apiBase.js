const CHURVOX_BACKEND_FALLBACK = "https://churvox-backend.onrender.com";

function clean(value) {
  return String(value || "").replace(/\/$/, "");
}

function configuredBackend() {
  return clean(
    (typeof import.meta !== "undefined" && process.env && process.env.VITE_BACKEND_URL) ||
      process.env.REACT_APP_BACKEND_URL ||
      ""
  );
}

function resolveApiBase() {
  const configured = configuredBackend();
  if (typeof window === "undefined") return configured || CHURVOX_BACKEND_FALLBACK;

  const host = window.location.hostname || "";
  const isChurvox = host === "www.churvox.com" || host === "churvox.com";
  const isLegacyGrassley = /grassley-backend\.onrender\.com/i.test(configured);

  if (isChurvox && (isLegacyGrassley || !configured)) return CHURVOX_BACKEND_FALLBACK;
  return configured;
}

export const API_BASE = resolveApiBase();

export default API_BASE;
