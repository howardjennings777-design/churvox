// CHURVOX_PLATFORM_VISITOR_TRACKING_20260708_UNIQUE_VISITOR_ID

import API_BASE from "./apiBase";

let sent = false;
const VISITOR_ID_KEY = "churvox_unique_visitor_id_v1";

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

export function trackPlatformVisit() {
  if (sent || typeof window === "undefined") return;
  sent = true;

  try {
    const body = {
      visitor_id: makeVisitorId(),
      path: window.location.pathname + window.location.hash,
      title: document.title || "Churvox",
      referrer: document.referrer || "",
      source: new URLSearchParams(window.location.search).get("utm_source") || "",
      first_seen_only: false,
    };

    fetch(`${API_BASE}/api/platform/visit`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch (_) {
    // Never block the app for tracking.
  }
}
