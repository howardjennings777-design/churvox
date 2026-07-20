import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_HQ_FEEDBACK_RUNTIME__';
const ROOT_ID = 'churvox-hq-feedback-runtime';
const STYLE_ID = 'churvox-hq-feedback-runtime-style';
const API_ROOT = String(API_BASE || '').replace(/\/$/, '');
let items = [];
let summary = {};

function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function token() { try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch { return ''; } }
function headers() { const value = token(); return { Accept: 'application/json', 'Content-Type': 'application/json', ...(value ? { Authorization: `Bearer ${value}` } : {}) }; }
function isHq() { const path = String(window.location.pathname || '').toLowerCase(); return ['/admin', '/churvox-hq', '/admin/hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage', '/admin/qa-auditor', '/platform'].includes(path); }

async function api(path, options = {}) {
  const response = await fetch(`${API_ROOT}/api${path}`, { credentials: 'include', ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || 'Could not load feedback');
  return body;
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{position:fixed;right:16px;bottom:16px;z-index:2147483000;font-family:inherit;color:#0f172a}
    #${ROOT_ID} *{box-sizing:border-box}
    .hqfButton{border:1px solid #fb923c;background:linear-gradient(135deg,#f97316,#111827);color:#fff;border-radius:999px;padding:12px 16px;font-weight:950;box-shadow:0 14px 44px rgba(15,23,42,.2);cursor:pointer}.hqfButton b{display:inline-grid;place-items:center;min-width:24px;height:24px;margin-left:8px;padding:0 6px;border-radius:999px;background:#fff;color:#c2410c}
    .hqfModal{position:fixed;inset:20px;display:grid;grid-template-rows:auto auto 1fr;border:1px solid #fed7aa;border-radius:28px;background:#f8fafc;box-shadow:0 30px 100px rgba(15,23,42,.35);overflow:hidden}
    .hqfHead{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:20px;background:linear-gradient(135deg,#111827,#7c2d12,#f97316);color:#fff}.hqfHead small{font-weight:950;text-transform:uppercase;letter-spacing:.12em}.hqfHead h2{margin:6px 0 0;font-size:30px;letter-spacing:-.05em}.hqfHead p{margin:7px 0 0}.hqfHead button{border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.12);color:#fff;border-radius:13px;padding:10px 13px;font-weight:900;cursor:pointer}
    .hqfStats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;padding:14px 20px;background:#fff;border-bottom:1px solid #e2e8f0}.hqfStats article{border:1px solid #e2e8f0;border-radius:16px;padding:12px}.hqfStats b{display:block;font-size:24px}.hqfStats small{color:#64748b;font-weight:850}
    .hqfBody{overflow:auto;padding:16px 20px 24px}.hqfRows{display:grid;gap:10px}.hqfRow{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr) auto;gap:12px;align-items:start;padding:15px;border:1px solid #e2e8f0;border-radius:18px;background:#fff}.hqfRow.stuck{border-color:#fecaca;background:#fff7f7}.hqfRow.confusing{border-color:#fde68a;background:#fffdf4}.hqfRow.easy{border-color:#bbf7d0}.hqfRow h3{margin:0 0 6px;font-size:16px}.hqfRow p{margin:0;color:#475569;line-height:1.45;font-size:13px}.hqfRow small{display:block;margin-top:7px;color:#64748b;font-weight:750}.hqfMeta{display:grid;gap:5px;font-size:12px;color:#475569}.hqfActions{display:grid;gap:7px}.hqfActions button{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:11px;padding:9px 10px;font-weight:850;cursor:pointer}.hqfActions button.primary{background:#111827;color:#fff;border-color:#111827}.hqfEmpty{padding:30px;text-align:center;color:#64748b;font-weight:800}
    @media(max-width:850px){.hqfModal{inset:6px}.hqfStats{grid-template-columns:repeat(2,1fr)}.hqfRow{grid-template-columns:1fr}.hqfActions{grid-template-columns:repeat(3,1fr)}}
  `;
  document.head.appendChild(style);
}

function root() {
  let node = document.getElementById(ROOT_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = ROOT_ID;
    document.body.appendChild(node);
  }
  return node;
}

function renderButton() {
  installStyle();
  const count = Number(summary.needs_review || 0);
  root().innerHTML = `<button type="button" class="hqfButton" data-hqf-open>Tester feedback <b>${count}</b></button>`;
}

function renderModal(message = '') {
  installStyle();
  const stats = [
    ['Total', summary.total || items.length],
    ['Needs review', summary.needs_review || 0],
    ['Easy', summary.easy || 0],
    ['Confusing', summary.confusing || 0],
    ['Stuck', summary.stuck || 0],
  ];
  root().innerHTML = `
    <section class="hqfModal" data-version="CHURVOX_HQ_FEEDBACK_20260720">
      <header class="hqfHead"><div><small>Real user signals</small><h2>First-win feedback</h2>${message ? `<p>${esc(message)}</p>` : ''}</div><button type="button" data-hqf-close>Close</button></header>
      <div class="hqfStats">${stats.map(([label, value]) => `<article><b>${esc(value)}</b><small>${esc(label)}</small></article>`).join('')}</div>
      <div class="hqfBody"><div class="hqfRows">${items.length ? items.map((item) => {
        const id = item.id || item._id || '';
        return `<article class="hqfRow ${esc(item.choice || '')}" data-hqf-id="${esc(id)}"><div><h3>${esc(item.title || item.choice || 'Feedback')}</h3><p>${esc(item.note || 'No written note.')}</p><small>${esc(item.business_name || item.user_email || 'Business')} · ${esc(item.created_at || '')}</small></div><div class="hqfMeta"><b>${esc(item.area || 'app')}</b><span>${esc(item.action || item.onboarding_step || '')}</span><span>Status: ${esc(item.status || 'received')}</span><span>Priority: ${esc(item.priority || 'low')}</span></div><div class="hqfActions"><button class="primary" type="button" data-hqf-status="in_progress">Work on it</button><button type="button" data-hqf-status="done">Done</button><button type="button" data-hqf-status="parked">Park</button></div></article>`;
      }).join('') : '<div class="hqfEmpty">No feedback has been submitted yet.</div>'}</div></div>
    </section>`;
}

async function load(open = false) {
  if (!isHq() || !token()) return;
  try {
    const body = await api('/platform/feedback');
    items = Array.isArray(body.items) ? body.items : [];
    summary = body.summary || {};
    if (open) renderModal(); else renderButton();
  } catch {
    if (open) renderModal('Feedback could not be loaded right now.'); else renderButton();
  }
}

async function updateStatus(button) {
  const row = button.closest('[data-hqf-id]');
  const id = row?.getAttribute('data-hqf-id');
  const status = button.getAttribute('data-hqf-status');
  if (!id || !status) return;
  button.disabled = true;
  button.textContent = 'Saving…';
  try {
    await api(`/platform/feedback/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await load(true);
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Try again';
    renderModal(error?.message || 'Could not update feedback.');
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-hqf-open]')) { load(true); return; }
    if (event.target.closest('[data-hqf-close]')) { renderButton(); return; }
    const status = event.target.closest('[data-hqf-status]');
    if (status) updateStatus(status);
  }, true);
  load(false);
  window.setInterval(() => { if (isHq() && !document.querySelector(`#${ROOT_ID} .hqfModal`)) load(false); }, 30000);
}

export {};
