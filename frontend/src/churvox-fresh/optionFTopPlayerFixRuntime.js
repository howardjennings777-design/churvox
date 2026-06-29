// CHURVOX_TOP_PLAYER_FIX_RUNTIME_20260629
// Makes public Pay Now and schedule board job moves perform real actions.

import API_BASE from '../lib/apiBase';

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function apiUrl(path) { return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`; }
function token() { try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch (_) { return ''; } }
function headers() { const auth = token(); return { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }; }
async function request(method, path, payload, auth = true) {
  const response = await fetch(apiUrl(path), { method, credentials: 'include', headers: auth ? headers() : { 'Content-Type': 'application/json' }, body: payload === undefined ? undefined : JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  return body?.data?.data || body?.data || body;
}
async function publicPayNow(event, tokenValue, button) {
  event.preventDefault();
  const status = document.querySelector('[data-tp-customer-status]');
  const original = clean(button.textContent) || 'Pay Now';
  button.textContent = 'Opening...';
  try {
    const res = await request('GET', `/customer-portal/${encodeURIComponent(tokenValue)}/payment`, undefined, false);
    const url = clean(res?.pay_url || res?.payment_link?.pay_url);
    if (url) {
      window.location.href = url;
      return;
    }
    if (status) status.textContent = 'Payment link is not ready yet. Please contact the business.';
    button.textContent = 'Not ready';
  } catch (_) {
    if (status) status.textContent = 'Payment link could not open yet.';
    button.textContent = 'Try again';
  }
  window.setTimeout(() => { button.textContent = original; }, 1800);
}
async function moveJob(event, button) {
  event.preventDefault();
  if (!token()) return;
  const jobId = clean(button.getAttribute('data-tp-move-job'));
  if (!jobId) return;
  const worker = window.prompt('Move to worker name? Leave blank to keep current.') || '';
  const date = window.prompt('New date? YYYY-MM-DD. Leave blank to keep current.') || '';
  const time = window.prompt('New start time? HH:MM. Leave blank to keep current.') || '';
  if (!worker && !date && !time) return;
  const original = button.textContent;
  button.textContent = 'Moving...';
  try {
    await request('POST', `/schedule/jobs/${encodeURIComponent(jobId)}/move`, { worker, date, time });
    button.textContent = 'Moved';
    try { window.dispatchEvent(new CustomEvent('churvox:fresh-data-updated')); } catch (_) {}
  } catch (_) {
    button.textContent = 'Try again';
  }
  window.setTimeout(() => { button.textContent = original; }, 1600);
}
function handleClick(event) {
  const pay = event.target.closest('[data-tp-pay-public]');
  const tokenMatch = window.location.pathname.match(/\/customer\/([^/?#]+)/);
  if (pay && tokenMatch) {
    publicPayNow(event, decodeURIComponent(tokenMatch[1]), pay);
    return;
  }
  const move = event.target.closest('[data-tp-move-job]');
  if (move) moveJob(event, move);
}
if (typeof window !== 'undefined' && !window.__CHURVOX_TOP_PLAYER_FIX_RUNTIME__) {
  window.__CHURVOX_TOP_PLAYER_FIX_RUNTIME__ = true;
  document.addEventListener('click', handleClick, true);
}

export {};
