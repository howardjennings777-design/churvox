// CHURVOX_PLATFORM_VISITOR_TRACKING_20260728_REAL_FUNNEL

import API_BASE from "./apiBase";

const sentPaths = new Set();
const sentEvents = new Set();
const VISITOR_ID_KEY = "churvox_unique_visitor_id_v1";
let routeTrackingInstalled = false;
let routeFrame = 0;

function makeVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const generated = (crypto?.randomUUID?.() || `cvx_${Date.now()}_${Math.random().toString(16).slice(2)}`).replace(/[^a-zA-Z0-9_-]/g, "");
    localStorage.setItem(VISITOR_ID_KEY, generated);
    return generated;
  } catch {
    return `cvx_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function pathEvent(pathname = "") {
  const cleanPath = `/${String(pathname || "").split("?")[0].replace(/^\/+|\/+$/g, "")}`;
  if (cleanPath === "/") return "homepage_viewed";
  if (cleanPath === "/pricing") return "pricing_viewed";
  if (cleanPath === "/signup" || cleanPath === "/register") return "signup_started";
  return "";
}

function contextBody(extra = {}) {
  return {
    visitor_id: makeVisitorId(),
    path: window.location.pathname + window.location.search + window.location.hash,
    title: document.title || "Churvox",
    referrer: document.referrer || "",
    source: new URLSearchParams(window.location.search).get("utm_source") || "",
    ...extra,
  };
}

function post(path, body) {
  fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

function scheduleRouteVisit() {
  if (routeFrame || typeof window === "undefined") return;
  routeFrame = window.requestAnimationFrame(() => {
    routeFrame = 0;
    trackPlatformVisit();
  });
}

function installRouteTracking() {
  if (routeTrackingInstalled || typeof window === "undefined") return;
  routeTrackingInstalled = true;

  for (const method of ["pushState", "replaceState"]) {
    const original = window.history?.[method];
    if (typeof original !== "function") continue;
    window.history[method] = function churvoxTrackedHistoryState(...args) {
      const result = original.apply(this, args);
      scheduleRouteVisit();
      return result;
    };
  }
  window.addEventListener("popstate", scheduleRouteVisit);
  window.addEventListener("hashchange", scheduleRouteVisit);
}

export function trackPlatformEvent(event, details = {}) {
  if (typeof window === "undefined" || !event) return;
  try {
    const body = contextBody({ event, ...details });
    const dedupe = `${event}|${body.path}`;
    if (sentEvents.has(dedupe)) return;
    sentEvents.add(dedupe);
    post("/api/platform/funnel-event", body);
  } catch (_) {
    // Analytics must never block a customer action.
  }
}

export function trackPlatformVisit() {
  if (typeof window === "undefined") return;
  installRouteTracking();

  try {
    const body = contextBody({ first_seen_only: false });
    const pathKey = body.path;
    if (sentPaths.has(pathKey)) return;
    sentPaths.add(pathKey);
    post("/api/platform/visit", body);

    const event = pathEvent(window.location.pathname);
    if (event) trackPlatformEvent(event);
  } catch (_) {
    // Never block the app for tracking.
  }
}
