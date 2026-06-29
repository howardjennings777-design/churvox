import API_BASE from '../lib/apiBase';

let busy = false;

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function apiUrl(path) { return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`; }
function token() { try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch (_) { return ''; } }
function headers() { const auth = token(); return { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }; }
function workerRoute() { return window.location.pathname.startsWith('/worker'); }
function jobId() {
  const match = window.location.pathname.match(/\/worker\/jobs\/([^/?#]+)/);
  return clean(match?.[1] || document.querySelector('[data-job-id]')?.getAttribute('data-job-id') || '');
}
function pageLocation() {
  const text = clean(document.querySelector('#directions, .wc-job-hero, .wc-card')?.innerText || '');
  const addressMatch = text.match(/(?:address|where|site)\s*:?\s*([^\n]+)/i);
  return clean(addressMatch?.[1] || '');
}
function clockAction(button) {
  const text = lower(button?.textContent);
  if (/clock in|start job|start timer|start/.test(text)) return 'start';
  if (/clock out|finish|complete|stop/.test(text)) return 'stop';
  return '';
}
async function position() {
  if (!navigator.geolocation) return {};
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 },
    );
  });
}
async function send(action) {
  if (busy || !token()) return;
  busy = true;
  try {
    const coords = action === 'start' ? await position() : {};
    await fetch(apiUrl('/worker/gps/status'), {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify({ state: action, job_id: jobId(), location: pageLocation(), ...coords }),
    });
  } catch (_) {
  } finally {
    busy = false;
  }
}
function handleClick(event) {
  if (!workerRoute()) return;
  const button = event.target.closest('button');
  const action = clockAction(button);
  if (!action) return;
  window.setTimeout(() => send(action), 350);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_ONSITE_SIGNAL__) {
  window.__CHURVOX_WORKER_ONSITE_SIGNAL__ = true;
  document.addEventListener('click', handleClick, true);
}

export {};
