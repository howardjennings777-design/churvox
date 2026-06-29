import API_BASE from '../lib/apiBase';

let sending = false;
let lastSent = 0;

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function apiUrl(path) { return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`; }
function token() { try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch (_) { return ''; } }
function headers() { const auth = token(); return { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }; }
function workerRoute() { return window.location.pathname.startsWith('/worker'); }
function currentJobId() {
  const match = window.location.pathname.match(/\/worker\/jobs\/([^/?#]+)/);
  return clean(match?.[1] || document.querySelector('[data-job-id], [data-worker-job-id], [data-id]')?.getAttribute('data-job-id') || document.querySelector('[data-worker-job-id]')?.getAttribute('data-worker-job-id') || '');
}
function siteText() {
  const selectors = ['#directions', '.wc-job-hero', '.wc-next-job', '.wc-card', 'main'];
  for (const selector of selectors) {
    const text = clean(document.querySelector(selector)?.innerText || '');
    if (/address|where|site|directions/i.test(text)) return text;
  }
  return '';
}
function siteLocation() {
  const text = siteText();
  const labelled = text.match(/(?:address|where|site|directions)\s*:?\s*([^\n]+)/i);
  if (labelled?.[1]) return clean(labelled[1]);
  const lines = text.split('\n').map(clean).filter(Boolean);
  const likely = lines.find((line) => /road|rd|street|st|avenue|ave|drive|dr|lane|ln|terrace|place|pl|crescent|suburb|hutt|wellington/i.test(line));
  return clean(likely || '');
}
function actionFromText(text) {
  const t = lower(text);
  if (/clock out|finish|complete|stop timer|stop job|end job|paused|pause/.test(t)) return 'stop';
  if (/\bstarted\b|on my way|clock in|start job|start timer|start work|begin|in progress/.test(t)) return 'start';
  return '';
}
function actionFromRequest(url, method) {
  const target = lower(`${method || ''} ${url || ''}`);
  if (!target.includes('/api/') && !target.includes('/worker')) return '';
  if (/complete|finish|clock-out|clock_out|stop|paused|pause/.test(target)) return 'stop';
  if (/started|start|clock-in|clock_in|timer|in-progress|field-update|live-ping/.test(target)) return 'start';
  return '';
}
async function position() {
  if (!navigator.geolocation) return {};
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 6500, maximumAge: 45000 },
    );
  });
}
async function send(action, source) {
  if (!workerRoute() || !token() || sending) return;
  const now = Date.now();
  if (now - lastSent < 2500) return;
  lastSent = now;
  sending = true;
  try {
    const coords = action === 'start' ? await position() : {};
    await fetch(apiUrl('/worker/gps/status'), {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify({ state: action || 'start', job_id: currentJobId(), location: siteLocation(), source, ...coords }),
    });
  } catch (_) {
  } finally {
    sending = false;
  }
}
function clickHandler(event) {
  if (!workerRoute()) return;
  const button = event.target.closest('button, a, [role="button"]');
  const action = actionFromText(button?.textContent || '');
  if (action) window.setTimeout(() => send(action, 'worker_click'), 500);
}
function patchFetch() {
  if (window.__CHURVOX_WORKER_ONSITE_FETCH_PATCHED__) return;
  window.__CHURVOX_WORKER_ONSITE_FETCH_PATCHED__ = true;
  const originalFetch = window.fetch;
  window.fetch = async function churvoxOnsiteFetch(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    const method = init?.method || input?.method || 'GET';
    const action = workerRoute() ? actionFromRequest(url, method) : '';
    const response = await originalFetch.apply(this, arguments);
    if (action && response && response.ok) window.setTimeout(() => send(action, 'worker_api'), 300);
    return response;
  };
}
if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_ONSITE_HARD__) {
  window.__CHURVOX_WORKER_ONSITE_HARD__ = true;
  patchFetch();
  document.addEventListener('click', clickHandler, true);
}

export {};
