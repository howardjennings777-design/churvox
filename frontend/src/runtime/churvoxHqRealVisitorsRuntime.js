import API_BASE from '../lib/apiBase';

const STYLE_ID = 'churvox-hq-real-visitors-style';
let installed = false;
let lastSignature = '';

const css = `
  .aomRealVisitorsCard {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
    margin: 0 0 16px;
    border: 1px solid rgba(5,150,105,.22);
    border-radius: 26px;
    background: linear-gradient(135deg, rgba(236,253,245,.96), rgba(255,255,255,.92));
    color: #101513;
    padding: 16px;
    box-shadow: 0 18px 45px rgba(16,21,19,.07);
  }
  .aomRealVisitorsCard small {
    display: inline-flex;
    width: fit-content;
    border-radius: 999px;
    padding: 5px 8px;
    background: rgba(5,150,105,.12);
    color: #047857;
    font-size: 10px;
    font-weight: 1000;
    letter-spacing: .11em;
    text-transform: uppercase;
  }
  .aomRealVisitorsCard h3 {
    margin: 7px 0 4px;
    font-size: clamp(24px, 3vw, 42px);
    line-height: .92;
    letter-spacing: -.065em;
    font-weight: 1000;
  }
  .aomRealVisitorsCard p {
    margin: 0;
    color: #51605a;
    font-size: 13px;
    font-weight: 850;
    line-height: 1.45;
  }
  .aomRealVisitorsNumber {
    min-width: 118px;
    border-radius: 22px;
    background: #101513;
    color: white;
    padding: 14px;
    text-align: center;
  }
  .aomRealVisitorsNumber b {
    display: block;
    font-size: 38px;
    line-height: .9;
    font-weight: 1000;
    letter-spacing: -.06em;
  }
  .aomRealVisitorsNumber span {
    display: block;
    margin-top: 6px;
    color: rgba(255,255,255,.72);
    font-size: 10px;
    font-weight: 1000;
    letter-spacing: .1em;
    text-transform: uppercase;
  }
  .aomRealVisitorsCard.error {
    border-color: rgba(220,38,38,.22);
    background: linear-gradient(135deg, rgba(254,242,242,.96), rgba(255,255,255,.92));
  }
  .aomRealVisitorsCard.error small { background: rgba(220,38,38,.11); color: #b91c1c; }
  @media(max-width:720px){.aomRealVisitorsCard{grid-template-columns:1fr}.aomRealVisitorsNumber{width:100%}}
`;

function isHq() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '';
  return ['/admin', '/churvox-hq', '/admin/hq', '/owner/dashboard', '/platform-dashboard', '/app-owner'].includes(path);
}

function ensureStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

function token() {
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
}

async function fetchRealVisitors() {
  const headers = { Accept: 'application/json' };
  const auth = token();
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const response = await fetch(`${String(API_BASE || '').replace(/\/$/, '')}/api/admin/owner/unique-visitors`, { credentials: 'include', headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || body?.error || `Unique visitor endpoint failed ${response.status}`);
  return body;
}

function findAnchor() {
  const hero = document.querySelector('.aomMain .aomHero');
  if (hero) return hero;
  return document.querySelector('.aomMain');
}

function upsertCard(body, error = '') {
  if (!isHq()) return;
  ensureStyle();
  const anchor = findAnchor();
  if (!anchor) return;
  const counts = body?.counts || {};
  const total = Number(counts.unique_total || 0);
  const today = Number(counts.new_unique_today || 0);
  const active7 = Number(counts.unique_active_7d || 0);
  const active30 = Number(counts.unique_active_30d || 0);
  const pageviews = Number(counts.pageviews_total || 0);
  const source = body?.source || 'real endpoint';
  const signature = error ? `error:${error}` : `${total}|${today}|${active7}|${active30}|${pageviews}|${source}`;
  if (signature === lastSignature && document.querySelector('.aomRealVisitorsCard')) return;
  lastSignature = signature;
  let card = document.querySelector('.aomRealVisitorsCard');
  if (!card) {
    card = document.createElement('section');
    card.className = 'aomRealVisitorsCard';
    anchor.insertAdjacentElement('afterend', card);
  }
  card.className = `aomRealVisitorsCard ${error ? 'error' : ''}`;
  card.innerHTML = error ? `
    <div><small>real visitor tracker</small><h3>Unique visits not connected yet.</h3><p>${escapeHtml(error)}. This means HQ is not showing a real visitor count until backend deploy finishes.</p></div>
    <div class="aomRealVisitorsNumber"><b>—</b><span>offline</span></div>
  ` : `
    <div><small>real visitor tracker · ${escapeHtml(source)}</small><h3>Real public unique visits</h3><p>Counts public marketing-site visitors only. Admin, dashboard, worker app, plans/setup, owner traffic and fake/test records are filtered out. ${today} new today · ${active7} active 7d · ${active30} active 30d · ${pageviews} pageviews.</p></div>
    <div class="aomRealVisitorsNumber"><b>${total}</b><span>unique</span></div>
  `;
  window.__CHURVOX_HQ_REAL_UNIQUE_VISITORS__ = body;
  syncExistingMetric(total, today, active7, active30);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function syncExistingMetric(total, today, active7, active30) {
  const metrics = Array.from(document.querySelectorAll('.aomMetric'));
  metrics.forEach((metric) => {
    const label = (metric.querySelector('small')?.textContent || '').trim().toLowerCase();
    if (label !== 'unique visits') return;
    const value = metric.querySelector(':scope > b');
    const note = metric.querySelector('p');
    if (value) value.textContent = String(total);
    if (note) note.textContent = `${today} new today · ${active7} active 7d · ${active30} active 30d · real public traffic`;
  });
  document.querySelectorAll('.aomPulse div').forEach((row) => {
    const label = (row.querySelector('span')?.textContent || '').trim().toLowerCase();
    if (label === 'unique visits') {
      const value = row.querySelector('b');
      if (value) value.textContent = String(total);
    }
  });
}

async function run() {
  if (!isHq()) return;
  try {
    const body = await fetchRealVisitors();
    upsertCard(body);
  } catch (error) {
    upsertCard(null, error?.message || 'Unique visitor endpoint failed');
  }
}

function schedule(delay = 200) { setTimeout(run, delay); }

if (typeof window !== 'undefined' && !installed) {
  installed = true;
  [300, 1200, 3000].forEach(schedule);
  window.addEventListener('load', () => schedule(400));
  window.addEventListener('popstate', () => schedule(300));
  window.addEventListener('hashchange', () => schedule(300));
  setInterval(() => { if (isHq()) run(); }, 30000);
}

export {};
