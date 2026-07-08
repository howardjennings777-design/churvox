import './churvoxBusinessSystemSuiteRuntime';
import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_HQ_BUSINESS_HEALTH_RUNTIME__';
const ROOT_ID = 'churvox-hq-business-health-panel';
const STYLE_ID = 'churvox-hq-business-health-style';
const API_ROOT = String(API_BASE || '').replace(/\/$/, '');

function isHqPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return ['/admin', '/admin/hq', '/churvox-hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage'].includes(path);
}

function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function esc(value) { return String(value ?? '').replace(/\s+/g, ' ').trim().replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function arr(value) { return Array.isArray(value) ? value : []; }
function num(value) { return Number(value || 0).toLocaleString('en-NZ'); }

async function apiGet(path) {
  const headers = { Accept: 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) };
  const response = await fetch(`${API_ROOT}${path}`, { credentials: 'include', headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false || body?.ok === false) throw new Error(body?.detail || body?.message || body?.error || `HTTP ${response.status}`);
  return body;
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{grid-column:1/-1;margin:0 0 10px;font-family:inherit}.hqBizShell{border:1px solid rgba(249,115,22,.18);border-radius:20px;background:linear-gradient(135deg,#111827,#0f172a 58%,#ea580c 165%);box-shadow:0 12px 32px rgba(15,23,42,.12);overflow:hidden;color:white}.hqBizInner{padding:12px;display:grid;gap:10px}.hqBizTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.hqBizTop small{display:inline-flex;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);border-radius:999px;padding:5px 8px;color:#fed7aa;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.1em}.hqBizTop h3{margin:5px 0 0;font-size:18px;line-height:1;letter-spacing:-.035em;color:white}.hqBizTop p{margin:4px 0 0;max-width:760px;color:#e5e7eb;font-size:11px;font-weight:800;line-height:1.35}.hqBizRefresh{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.1);color:white;border-radius:12px;padding:8px 10px;font-size:11px;font-weight:950;cursor:pointer}.hqBizScore{display:grid;grid-template-columns:110px 1fr;gap:10px;align-items:center}.hqBizScore b{display:grid;place-items:center;min-height:72px;border-radius:16px;background:rgba(255,255,255,.1);font-size:34px;letter-spacing:-.06em}.hqBizChecks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.hqBizCheck{border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.07);border-radius:13px;padding:8px}.hqBizCheck strong{display:block;color:white;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hqBizCheck span{display:block;margin-top:4px;color:#d1d5db;font-size:10px;line-height:1.25}.hqBizCheck.ok{border-color:rgba(34,197,94,.35)}.hqBizCheck.bad{border-color:rgba(251,146,60,.45)}.hqBizMini{display:flex;gap:6px;flex-wrap:wrap}.hqBizMini span{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.07);border-radius:999px;padding:5px 8px;color:#fed7aa;font-size:10px;font-weight:900}@media(max-width:900px){.hqBizTop{display:block}.hqBizRefresh{margin-top:8px}.hqBizScore{grid-template-columns:1fr}.hqBizChecks{grid-template-columns:1fr 1fr}}`;
  document.head.appendChild(style);
}

function render(root, data, error = '') {
  const checks = arr(data?.checks);
  const counts = data?.counts || {};
  const ok = checks.filter((item) => item.ok).length;
  const score = Number(data?.score || 0);
  root.innerHTML = `
    <section class="hqBizShell"><div class="hqBizInner">
      <div class="hqBizTop"><div><small>Business logic</small><h3>${score >= 75 ? 'Churvox is acting like a business system.' : 'Business system needs checks.'}</h3><p>Checks the funnel, signup/Stripe gate, tester flow, records, worker loop, Command, money and team logic from backend data.</p></div><button type="button" class="hqBizRefresh" data-hq-business-health-refresh>Refresh</button></div>
      ${error ? `<div class="hqBizCheck bad"><strong>Could not load business health</strong><span>${esc(error)}</span></div>` : `<div class="hqBizScore"><b>${num(score)}%</b><div><div class="hqBizMini"><span>${ok}/${checks.length} checks ok</span><span>${esc(data?.verdict || 'health')}</span><span>${num(counts.users)} users</span><span>${num(counts.jobs)} jobs</span><span>${num(counts.tester_invites)} tester invites</span></div></div></div><div class="hqBizChecks">${checks.slice(0, 8).map((item) => `<div class="hqBizCheck ${item.ok ? 'ok' : 'bad'}"><strong>${esc(item.label)}</strong><span>${esc(item.detail || item.fix || '')}</span></div>`).join('')}</div>`}
    </div></section>`;
}

async function mount() {
  if (!isHqPath()) { document.getElementById(ROOT_ID)?.remove(); return; }
  installStyle();
  const main = document.querySelector('main');
  if (!main) return;
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('section');
    root.id = ROOT_ID;
    const afterTesters = document.getElementById('churvox-hq-accepted-testers-panel');
    const afterUnique = document.getElementById('churvox-hq-unique-visitors-once');
    if (afterTesters?.parentNode) afterTesters.parentNode.insertBefore(root, afterTesters.nextSibling);
    else if (afterUnique?.parentNode) afterUnique.parentNode.insertBefore(root, afterUnique.nextSibling);
    else main.insertBefore(root, main.firstChild);
    root.addEventListener('click', (event) => { if (event.target.closest('[data-hq-business-health-refresh]')) mount(); });
  }
  root.innerHTML = '<section class="hqBizShell"><div class="hqBizInner"><div class="hqBizCheck"><strong>Checking business logic…</strong><span>Funnel, plans, testers, Command, worker loop and money flow.</span></div></div></section>';
  try { render(root, await apiGet('/api/admin/owner/business-logic-health')); }
  catch (error) { render(root, null, error?.message || 'Could not load'); }
}

function schedule() { [0, 700, 1800, 4200].forEach((delay) => setTimeout(mount, delay)); }

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  setInterval(() => { if (isHqPath()) mount(); }, 90000);
}

export {};
