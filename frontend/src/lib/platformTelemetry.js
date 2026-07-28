// CHURVOX_PLATFORM_VISITOR_TRACKING_20260729_FULL_FUNNEL

import API_BASE from "./apiBase";

const sentPaths = new Set();
const sentEvents = new Set();
const VISITOR_ID_KEY = "churvox_unique_visitor_id_v1";
let routeTrackingInstalled = false;
let interactionTrackingInstalled = false;
let routeFrame = 0;

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

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
  if (cleanPath === "/demo" || cleanPath === "/public/demo") return "demo_viewed";
  if (cleanPath === "/signup" || cleanPath === "/register") return "signup_started";
  if (cleanPath === "/verify-email") return "verification_page_viewed";
  if (cleanPath === "/dashboard") return "dashboard_opened";
  if (cleanPath === "/request" || cleanPath === "/public/request") return "customer_request_page_viewed";
  return "";
}

function contextBody(extra = {}) {
  return {
    visitor_id: makeVisitorId(),
    path: window.location.pathname + window.location.search + window.location.hash,
    title: document.title || "Churvox",
    referrer: document.referrer || "",
    source: new URLSearchParams(window.location.search).get("utm_source") || "",
    medium: new URLSearchParams(window.location.search).get("utm_medium") || "",
    campaign: new URLSearchParams(window.location.search).get("utm_campaign") || "",
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
  const run = () => {
    routeFrame = 0;
    trackPlatformVisit();
  };
  routeFrame = typeof window.requestAnimationFrame === "function" ? window.requestAnimationFrame(run) : window.setTimeout(run, 0);
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

function closestAction(target) {
  return target?.closest?.("a,button,[data-funnel-event],[data-stripe-live-action]") || null;
}

function clickSignal(element) {
  if (!element) return null;
  const explicit = clean(element.getAttribute("data-funnel-event"));
  const label = clean(element.getAttribute("aria-label") || element.textContent).slice(0, 180);
  const href = clean(element.getAttribute("href") || element.closest?.("a")?.getAttribute("href")).slice(0, 800);
  const stripeAction = clean(element.getAttribute("data-stripe-live-action"));
  const stripePlan = clean(element.getAttribute("data-stripe-live-plan") || element.getAttribute("data-stripe-plan"));
  const combined = `${label} ${href}`.toLowerCase();

  if (explicit) return { event: explicit, label, href };
  if (stripeAction) return { event: "billing_cta_clicked", label, href, action: stripeAction, plan: stripePlan };
  if (/\/signup|\/register|start (a )?(14-day )?(free )?trial|start free trial|create account/.test(combined)) return { event: "trial_cta_clicked", label, href };
  if (/\/demo|view demo|open the demo|play walkthrough/.test(combined)) return { event: "demo_cta_clicked", label, href };
  if (/\/pricing|view pricing|plans? & billing/.test(combined)) return { event: "pricing_cta_clicked", label, href };
  if (/request a quote|send request/.test(combined)) return { event: "customer_request_cta_clicked", label, href };
  return null;
}

function formSignal(form) {
  if (!form) return null;
  const classes = clean(form.className).toLowerCase();
  const action = clean(form.getAttribute("action"));
  if (/cvpublicauthcard/.test(classes) || /signup|register/.test(action)) return "signup_submitted";
  if (/crqcard/.test(classes) || /customer-request/.test(action)) return "customer_request_submitted";
  return "";
}

function installInteractionTracking() {
  if (interactionTrackingInstalled || typeof window === "undefined" || typeof document === "undefined") return;
  interactionTrackingInstalled = true;

  document.addEventListener("click", (event) => {
    const signal = clickSignal(closestAction(event.target));
    if (!signal) return;
    trackPlatformEvent(signal.event, {
      label: signal.label,
      href: signal.href,
      action: signal.action || "",
      plan: signal.plan || "",
      dedupe_key: signal.plan || signal.href || signal.label,
    });
  }, true);

  document.addEventListener("submit", (event) => {
    const signal = formSignal(event.target);
    if (signal) trackPlatformEvent(signal, { dedupe_key: signal });
  }, true);

  window.addEventListener("churvox:funnel", (event) => {
    const detail = event?.detail || {};
    if (!detail.event) return;
    const { event: eventName, ...rest } = detail;
    trackPlatformEvent(eventName, rest);
  });

  window.addEventListener("churvox-auth-refresh", () => {
    try {
      if (window.location.pathname === "/verify-email" && window.localStorage.getItem("churvox_email_verified") === "true") {
        trackPlatformEvent("email_verified", { dedupe_key: "verified" });
      }
    } catch {}
  });
}

export function trackPlatformEvent(event, details = {}) {
  if (typeof window === "undefined" || !event) return;
  try {
    const safeDetails = { ...details };
    const requestedDedupe = clean(safeDetails.dedupe_key);
    const dedupePath = clean(safeDetails.dedupe_path) || window.location.pathname + window.location.search + window.location.hash;
    delete safeDetails.dedupe_key;
    delete safeDetails.dedupe_path;
    const body = contextBody({ event, ...safeDetails });
    const dedupe = `${event}|${dedupePath}|${requestedDedupe}`;
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
  installInteractionTracking();

  try {
    const body = contextBody({ first_seen_only: false });
    const pathKey = body.path;
    if (sentPaths.has(pathKey)) return;
    sentPaths.add(pathKey);
    post("/api/platform/visit", body);

    const event = pathEvent(window.location.pathname);
    if (event) trackPlatformEvent(event, { dedupe_key: window.location.pathname, dedupe_path: window.location.pathname });
  } catch (_) {
    // Never block the app for tracking.
  }
}
