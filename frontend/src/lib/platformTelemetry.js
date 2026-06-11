// CHURVOX_PLATFORM_VISITOR_TRACKING_20260611

import API_BASE from "./apiBase";

let sent = false;

export function trackPlatformVisit() {
  if (sent || typeof window === "undefined") return;
  sent = true;

  try {
    const body = {
      path: window.location.pathname + window.location.hash,
      title: document.title || "Churvox",
      referrer: document.referrer || "",
      source: new URLSearchParams(window.location.search).get("utm_source") || "",
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
