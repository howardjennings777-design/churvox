import API_BASE from '../lib/apiBase';

let lastBeacon = 0;

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function apiUrl(path) { return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`; }
function token() { try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch (_) { return ''; } }
function headers() { const auth = token(); return { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }; }
function workerRoute() { return typeof window !== 'undefined' && window.location.pathname.startsWith('/worker'); }
function jobIdFromPath() { return clean(window.location.pathname.match(/\/worker\/jobs\/([^/?#]+)/)?.[1] || ''); }
function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch (_) { return {}; }
  }
  if (body instanceof FormData) return {};
  if (typeof body === 'object') return body;
  return {};
}
function stateFor(url, payload) {
  const text = lower(`${url || ''} ${payload?.state || ''} ${payload?.status || ''} ${payload?.clock_status || ''} ${payload?.live_status || ''} ${payload?.job_status || ''}`);
  if (/clock-out|clock_out|complete|completed|finish|finished|stop|paused/.test(text)) return 'stop';
  if (/clock-in|clock_in|shift-clock-in|gps-ping|live-ping|started|start|on_my_way|in_progress|clocked_in/.test(text)) return 'start';
  return '';
}
function jobFromPayload(payload) {
  return clean(payload?.job_id || payload?.jobId || payload?.id || jobIdFromPath());
}
function enrichPayload(url, payload) {
  const state = stateFor(url, payload) || 'start';
  const location = payload?.location && typeof payload.location === 'object' ? payload.location : {};
  return {
    ...payload,
    state,
    source: clean(payload?.source || `xhr:${String(url || '').split('/api/').pop() || 'worker'}`),
    job_id: jobFromPayload(payload),
    job_title: clean(payload?.job_title || payload?.title || ''),
    location: payload?.location || payload?.address || '',
    address: clean(payload?.address || location.address_label || location.display_name || location.address || ''),
    latitude: payload?.latitude ?? payload?.lat ?? location.latitude ?? location.lat ?? null,
    longitude: payload?.longitude ?? payload?.lng ?? location.longitude ?? location.lng ?? null,
    accuracy: payload?.accuracy ?? location.accuracy ?? null,
  };
}
async function sendBeacon(url, payload, force = false) {
  if (!workerRoute() || !token()) return;
  const enriched = enrichPayload(url, payload || {});
  const hasUseful = enriched.latitude !== null || enriched.longitude !== null || clean(enriched.address || enriched.location || enriched.job_id || enriched.job_title);
  if (!hasUseful && !force) return;
  const now = Date.now();
  if (!force && now - lastBeacon < 1500) return;
  lastBeacon = now;
  try {
    await fetch(apiUrl('/onsite/worker-beacon'), {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify(enriched),
    });
    try { window.dispatchEvent(new CustomEvent('churvox:worker-beacon-sent', { detail: enriched })); } catch (_) {}
  } catch (_) {}
}
function shouldBridge(url) {
  const text = lower(url || '');
  return text.includes('/api/worker/shift-clock-in')
    || text.includes('/api/worker/shift-clock-out')
    || text.includes('/api/worker/gps-ping')
    || text.includes('/api/worker/gps/status')
    || text.includes('/api/worker/live-ping')
    || text.includes('/api/worker/jobs/') && (text.includes('/field-update') || text.includes('/complete'));
}
function patchXHR() {
  if (window.__CHURVOX_WORKER_BEACON_XHR_PATCHED__) return;
  window.__CHURVOX_WORKER_BEACON_XHR_PATCHED__ = true;
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function patchedOpen(method, url) {
    this.__churvoxBeaconUrl = String(url || '');
    this.__churvoxBeaconMethod = String(method || 'GET');
    return originalOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function patchedSend(body) {
    const url = this.__churvoxBeaconUrl || '';
    const payload = parseBody(body);
    if (workerRoute() && shouldBridge(url)) {
      this.addEventListener('loadend', () => {
        const ok = this.status >= 200 && this.status < 400;
        if (ok) sendBeacon(url, payload);
      });
    }
    return originalSend.apply(this, arguments);
  };
}
function clickFallback(event) {
  if (!workerRoute()) return;
  const button = event.target.closest('button, a, [role="button"]');
  const text = lower(button?.textContent || '');
  if (!/clock in|clock out|started|on my way|gps check|start timer|send to owner|finish/.test(text)) return;
  window.setTimeout(() => sendBeacon(`click:${text}`, { state: /clock out|finish|send to owner/.test(text) ? 'stop' : 'start', job_id: jobIdFromPath(), source: 'worker-click-fallback' }), 600);
}
if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_BEACON_BRIDGE__) {
  window.__CHURVOX_WORKER_BEACON_BRIDGE__ = true;
  patchXHR();
  document.addEventListener('click', clickFallback, true);
}

export {};
