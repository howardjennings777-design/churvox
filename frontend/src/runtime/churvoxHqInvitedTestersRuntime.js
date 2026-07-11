import API_BASE from '../lib/apiBase';

const PANEL_ID = 'churvox-hq-invited-testers-panel';
const STYLE_ID = 'churvox-hq-invited-testers-style';
const ENDPOINT = '/api/admin/owner/testers';
let loading = false;
let lastLoaded = 0;
let lastData = null;
let lastError = '';

function text(value, fallback = '') {
  return String(value ?? '').replace(/\s+/g, ' ').trim() || fallback;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function ageOrDate(value) {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return text(value, 'Unavailable');
  return parsed.toLocaleString('en-NZ');
}

function statusClass(status) {
  const value = text(status).toLowerCase();
  if (/active|accepted|access_granted|signed/.test(value)) return 'good';
  if (/expired|failed|blocked|error|revoked/.test(value)) return 'bad';
  return 'warn';
}

function authHeaders() {
  let token = '';
  try { token = localStorage.getItem('token') || localStorage.getItem('authToken') || ''; } catch {}
  return { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function apiUrl(path) {
  const base = String(API_BASE || '').replace(/\/$/, '');
  return `${base}${path}`;
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PANEL_ID}{display:grid;gap:14px}
    #${PANEL_ID} .testerPulse{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    #${PANEL_ID} .testerPulse article{border:1px solid rgba(15,23,42,.1);border-radius:16px;padding:12px;background:#fff;color:#111827;box-shadow:0 10px 30px rgba(15,23,42,.06)}
    #${PANEL_ID} .testerPulse span{display:block;color:#64748b;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}
    #${PANEL_ID} .testerPulse strong{display:block;margin-top:4px;font-size:24px;font-weight:950;color:#111827}
    #${PANEL_ID} .testerGrid{display:grid;gap:12px}
    #${PANEL_ID} .testerList{display:grid;gap:8px}
    #${PANEL_ID} .testerRow{display:grid;grid-template-columns:minmax(180px,1.4fr) minmax(130px,.9fr) minmax(110px,.8fr) minmax(150px,1fr);gap:10px;align-items:center;border:1px solid rgba(15,23,42,.08);border-radius:14px;padding:10px 12px;background:#f8fafc;color:#111827;text-align:left}
    #${PANEL_ID} .testerRow strong{display:block;font-size:13px;color:#111827}.testerRow span{display:block;color:#64748b;font-size:12px;font-weight:800}.testerRow small{display:block;color:#475569;font-size:11px;font-weight:850}.testerPill{display:inline-flex;width:max-content;align-items:center;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:950;text-transform:uppercase}.testerPill.good{background:#dcfce7;color:#166534}.testerPill.warn{background:#fff7ed;color:#9a3412}.testerPill.bad{background:#ffe4e6;color:#991b1b}
    #${PANEL_ID} .testerEmpty{border:1px dashed rgba(15,23,42,.18);border-radius:14px;padding:14px;color:#64748b;background:#f8fafc;font-weight:850}
    @media(max-width:900px){#${PANEL_ID} .testerPulse{grid-template-columns:repeat(2,minmax(0,1fr))}#${PANEL_ID} .testerRow{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function rows(items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return '<div class="testerEmpty">No records returned for this section.</div>';
  return `<div class="testerList">${list.map((item) => {
    const status = text(item.status || item.subscription_status, 'invited');
    const name = text(item.name || item.business_name || item.email, 'Unnamed tester');
    const email = text(item.email || item.user_email || item.tester_email, 'No email');
    return `<button type="button" class="testerRow" data-email="${esc(email)}">
      <div><strong>${esc(name)}</strong><span>${esc(email)}</span></div>
      <div><span>Business</span><strong>${esc(text(item.business_name || item.company || item.business, 'Not set'))}</strong></div>
      <div><span class="testerPill ${statusClass(status)}">${esc(status)}</span><small>${esc(text(item.source, 'tester'))}</small></div>
      <div><span>Invited</span><strong>${esc(ageOrDate(item.invited_at || item.created_at || item.updated_at))}</strong><small>Until: ${esc(ageOrDate(item.free_tester_until || item.free_until))}</small></div>
    </button>`;
  }).join('')}</div>`;
}

function renderPanel(node) {
  const data = lastData || {};
  const counts = data.counts || {};
  const invited = Array.isArray(data.invited_testers) ? data.invited_testers : [];
  const accepted = Array.isArray(data.accepted_testers) ? data.accepted_testers : [];
  const active = Array.isArray(data.active_testers) ? data.active_testers : [];
  const all = Array.isArray(data.testers) ? data.testers : [];
  node.innerHTML = `
    <section class="plhqCard" aria-label="Invited tester roster">
      <header class="plhqCardHead"><div><strong>Invited tester roster</strong></div><span class="plhqPill warn">from /api/admin/owner/testers</span></header>
      ${lastError ? `<div class="plhqNotice bad">${esc(lastError)}</div>` : ''}
      <div class="testerPulse">
        <article><span>Total testers</span><strong>${esc(counts.total ?? all.length ?? 0)}</strong></article>
        <article><span>Invited not accepted</span><strong>${esc(counts.invited_not_accepted ?? invited.length ?? 0)}</strong></article>
        <article><span>Accepted</span><strong>${esc(counts.accepted ?? accepted.length ?? 0)}</strong></article>
        <article><span>Active</span><strong>${esc(counts.active ?? active.length ?? 0)}</strong></article>
      </div>
      <div class="testerGrid">
        <section><header class="plhqCardHead"><div><strong>Invited, not accepted yet</strong></div><span class="plhqPill warn">${esc(invited.length)}</span></header>${rows(invited)}</section>
        <section><header class="plhqCardHead"><div><strong>Accepted / current testers</strong></div><span class="plhqPill good">${esc(accepted.length)}</span></header>${rows(accepted.length ? accepted : all)}</section>
      </div>
      <p style="margin:0;color:#64748b;font-size:12px;font-weight:850">Last loaded: ${esc(lastLoaded ? new Date(lastLoaded).toLocaleString('en-NZ') : 'waiting')}</p>
    </section>`;
}

async function loadRoster(force = false) {
  if (loading) return;
  if (!force && lastLoaded && Date.now() - lastLoaded < 25000) return;
  loading = true;
  try {
    const response = await fetch(apiUrl(ENDPOINT), { credentials: 'include', headers: authHeaders() });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.success === false || body?.ok === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
    lastData = body;
    lastError = '';
    lastLoaded = Date.now();
  } catch (error) {
    lastError = error?.message || 'Tester roster could not be loaded.';
    lastLoaded = Date.now();
  } finally {
    loading = false;
  }
  const node = document.getElementById(PANEL_ID);
  if (node) renderPanel(node);
}

function isTesterTab() {
  const path = window.location.pathname || '';
  if (!['/admin', '/platform', '/churvox-hq', '/admin/hq', '/app-owner'].some((item) => path === item)) return false;
  const title = text(document.querySelector('.plhqHero h2')?.textContent || document.querySelector('h1,h2')?.textContent).toLowerCase();
  return title === 'testers' || title.includes('testers');
}

function ensurePanel() {
  if (typeof window === 'undefined' || !isTesterTab()) return;
  ensureStyle();
  const stack = document.querySelector('.plhqMain .plhqStack');
  if (!stack) return;
  let node = document.getElementById(PANEL_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = PANEL_ID;
    const form = stack.querySelector('.plhqTesterForm');
    if (form && form.nextSibling) stack.insertBefore(node, form.nextSibling);
    else if (form) form.insertAdjacentElement('afterend', node);
    else stack.prepend(node);
    node.innerHTML = '<section class="plhqCard"><header class="plhqCardHead"><div><strong>Invited tester roster</strong></div></header><p>Loading invited testers…</p></section>';
  }
  loadRoster(false);
  if (lastData || lastError) renderPanel(node);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_HQ_INVITED_TESTERS_RUNTIME__) {
  window.__CHURVOX_HQ_INVITED_TESTERS_RUNTIME__ = true;
  const schedule = () => setTimeout(ensurePanel, 80);
  document.addEventListener('click', schedule, true);
  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox-hq-refresh', () => loadRoster(true));
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  [250, 1000, 2500, 6000].forEach((delay) => setTimeout(ensurePanel, delay));
  setInterval(() => { if (isTesterTab()) loadRoster(true); }, 30000);
}
