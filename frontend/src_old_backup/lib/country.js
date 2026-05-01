/**
 * Best-effort first-visit country detection.
 *
 * Uses ONLY lightweight signals the browser already has — no third-party geo
 * API calls, no network requests. The result is a non-authoritative hint:
 * the backend still treats saved user/business country as the source of truth.
 *
 * Returns an ISO country name string (e.g. "Australia", "United States").
 */

// Timezone → country (good coverage for our supported currencies + graceful others)
const TZ_TO_COUNTRY = {
  // NZ
  "Pacific/Auckland": "New Zealand",
  "Pacific/Chatham": "New Zealand",
  // Australia
  "Australia/Sydney": "Australia",
  "Australia/Melbourne": "Australia",
  "Australia/Brisbane": "Australia",
  "Australia/Perth": "Australia",
  "Australia/Adelaide": "Australia",
  "Australia/Darwin": "Australia",
  "Australia/Hobart": "Australia",
  // USA
  "America/New_York": "United States",
  "America/Chicago": "United States",
  "America/Denver": "United States",
  "America/Phoenix": "United States",
  "America/Los_Angeles": "United States",
  "America/Anchorage": "United States",
  "Pacific/Honolulu": "United States",
  // UK
  "Europe/London": "United Kingdom",
  // Canada
  "America/Toronto": "Canada",
  "America/Vancouver": "Canada",
  "America/Edmonton": "Canada",
  "America/Winnipeg": "Canada",
  "America/Halifax": "Canada",
  "America/St_Johns": "Canada",
  "America/Regina": "Canada",
};

// Locale region suffix (e.g. "en-NZ", "en-AU", "en-US") → country
const LOCALE_REGION_TO_COUNTRY = {
  NZ: "New Zealand",
  AU: "Australia",
  US: "United States",
  GB: "United Kingdom",
  UK: "United Kingdom",
  CA: "Canada",
};

export function detectCountryHint() {
  try {
    // 1) Cached previous detection — prevents UI flicker on reloads
    const cached = typeof window !== "undefined" && window.localStorage?.getItem("cx_country_hint");
    if (cached) return cached;

    // 2) Timezone — most reliable browser-side signal
    const tz = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || "";
    if (tz && TZ_TO_COUNTRY[tz]) return _cache(TZ_TO_COUNTRY[tz]);

    // 3) Navigator language region
    const langs = [].concat(navigator.languages || []).concat([navigator.language || ""]);
    for (const l of langs) {
      const parts = String(l || "").split("-");
      const region = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
      if (LOCALE_REGION_TO_COUNTRY[region]) return _cache(LOCALE_REGION_TO_COUNTRY[region]);
    }
  } catch {
    /* ignore — fall through to default */
  }
  return _cache("New Zealand"); // safe Churvox default
}

function _cache(val) {
  try { window.localStorage?.setItem("cx_country_hint", val); } catch { /* ignore */ }
  return val;
}

export function clearCountryHint() {
  try { window.localStorage?.removeItem("cx_country_hint"); } catch { /* ignore */ }
}
