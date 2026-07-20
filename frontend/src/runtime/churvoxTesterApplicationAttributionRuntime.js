const ENDPOINT = '/api/public/tester-applications';
const RUNTIME_KEY = '__CHURVOX_TESTER_APPLICATION_ATTRIBUTION_RUNTIME__';

function clean(value, limit = 300) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function requestMethod(input, init = {}) {
  return String(init?.method || input?.method || 'GET').toUpperCase();
}

function requestPath(input) {
  try {
    const raw = typeof input === 'string' || input instanceof URL ? input : input?.url;
    return new URL(String(raw || ''), window.location.origin).pathname;
  } catch {
    return '';
  }
}

function parseBody(body) {
  if (typeof body !== 'string' || !body.trim()) return null;
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function attribution() {
  let params;
  try { params = new URLSearchParams(window.location.search || ''); }
  catch { params = new URLSearchParams(); }

  return {
    utm_source: clean(params.get('utm_source'), 120) || 'direct',
    utm_medium: clean(params.get('utm_medium'), 120),
    utm_campaign: clean(params.get('utm_campaign'), 120) || 'founding_10',
    utm_content: clean(params.get('utm_content'), 120),
    referrer: clean(document.referrer, 300),
    landing_path: clean(`${window.location.pathname || '/'}${window.location.search || ''}`, 300),
    locale: clean(navigator.language, 40),
  };
}

if (typeof window !== 'undefined' && typeof window.fetch === 'function' && !window[RUNTIME_KEY]) {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = function churvoxAttributedFetch(input, init = {}) {
    if (requestMethod(input, init) !== 'POST' || requestPath(input) !== ENDPOINT) {
      return nativeFetch(input, init);
    }

    const payload = parseBody(init?.body);
    if (!payload) return nativeFetch(input, init);

    const tracked = attribution();
    const nextPayload = {
      ...payload,
      utm_source: clean(payload.utm_source, 120) || tracked.utm_source,
      utm_medium: clean(payload.utm_medium, 120) || tracked.utm_medium,
      utm_campaign: clean(payload.utm_campaign, 120) || tracked.utm_campaign,
      utm_content: clean(payload.utm_content, 120) || tracked.utm_content,
      referrer: clean(payload.referrer, 300) || tracked.referrer,
      landing_path: clean(payload.landing_path, 300) || tracked.landing_path,
      locale: clean(payload.locale, 40) || tracked.locale,
    };

    return nativeFetch(input, { ...init, body: JSON.stringify(nextPayload) });
  };

  window[RUNTIME_KEY] = Object.freeze({
    version: 'churvox-tester-attribution-20260720',
    endpoint: ENDPOINT,
  });
}
