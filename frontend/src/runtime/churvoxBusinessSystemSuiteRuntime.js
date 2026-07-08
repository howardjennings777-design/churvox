import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_BUSINESS_SYSTEM_SUITE_RUNTIME__';
const OWNER_ID = 'churvox-business-system-suite-panel';
const HQ_ID = 'churvox-hq-tester-friction-panel';
const STYLE_ID = 'churvox-business-system-suite-style';
const API_ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
let ownerMounting = false;
let observerStarted = false;

function path() { return window.location.pathname || ''; }
function isOwnerApp() { const p = path(); return p === '/dashboard' || p.startsWith('/dashboard'); }
function isHq() { const p = path().toLowerCase(); return ['/admin', '/admin/hq', '/churvox-hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage'].includes(p); }
function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function esc(value) { return String(value ?? '').replace(/\s+/g, ' ').trim().replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
function arr(value) { return Array.isArray(value) ? value : []; }
function num(value) { return Number(value || 0).toLocaleString('en-NZ'); }
function short(value, fallback = '') { const text = String(value || fallback || '').replace(/\s+/g, ' ').trim(); return text.length > 118 ? `${text.slice(0, 115)}…` : text; }

async function apiGet(endpoint) {
  const headers = { Accept: 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) };
  const res = await fetch(`${API_ROOT}${endpoint}`, { credentials: 'include', headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) throw new Error(body?.detail || body?.message || body?.error || `HTTP ${res.status}`);
  return body;
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${OWNER_ID},#${HQ_ID}{grid-column:1/-1;margin:0 0 12px;font-family:inherit}.cvxBizSuite{border:1px solid rgba(249,115,22,.18);border-radius:22px;background:linear-gradient(135deg,#111827,#0f172a 56%,#ea580c 170%);box-shadow:0 14px 38px rgba(15,23,42,.13);overflow:hidden;color:white}.cvxBizSuiteInner{padding:13px;display:grid;gap:11px}.cvxBizTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.cvxBizTop small{display:inline-flex;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);border-radius:999px;padding:5px 8px;color:#fed7aa;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.1em}.cvxBizTop h3{margin:5px 0 0;font-size:20px;line-height:1;letter-spacing:-.04em;color:white}.cvxBizTop p{margin:4px 0 0;max-width:820px;color:#e5e7eb;font-size:11px;font-weight:800;line-height:1.35}.cvxBizRefresh{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.1);color:white;border-radius:12px;padding:8px 10px;font-size:11px;font-weight:950;cursor:pointer}.cvxBizGrid{display:grid;grid-template-columns:130px 1.2fr 1fr;gap:9px}.cvxBizScore{display:grid;place-items:center;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);border-radius:16px;min-height:120px}.cvxBizScore b{font-size:38px;letter-spacing:-.07em}.cvxBizScore span{font-size:10px;font-weight:1000;color:#fed7aa;text-transform:uppercase}.cvxBizCard{border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.07);border-radius:16px;padding:10px;min-width:0}.cvxBizCard h4{margin:0 0 8px;color:white;font-size:12px;font-weight:1000}.cvxBizList{display:grid;gap:6px;max-height:165px;overflow:auto;padding-right:4px}.cvxBizRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);border-radius:12px;padding:8px}.cvxBizRow b{display:block;color:white;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cvxBizRow span{display:block;margin-top:2px;color:#d1d5db;font-size:10px;line-height:1.25}.cvxBizRow em{font-style:normal;color:#fed7aa;font-size:10px;font-weight:950;white-space:nowrap}.cvxBizSubGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.cvxBizPill{border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.07);border-radius:14px;padding:8px;color:#e5e7eb;font-size:10px;font-weight:850}.cvxBizPill b{display:block;color:white;font-size:12px;margin-bottom:3px}.cvxBizRow.good{border-color:rgba(34,197,94,.28)}.cvxBizRow.next{border-color:rgba(251,146,60,.35)}@media(max-width:980px){.cvxBizTop{display:block}.cvxBizRefresh{margin-top:8px}.cvxBizGrid{grid-template-columns:1fr}.cvxBizSubGrid{grid-template-columns:1fr 1fr}.cvxBizRow{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
}

function row(title, detail, tag = '', cls = '') {
  return `<div class="cvxBizRow ${cls}"><span><b>${esc(title)}</b><span>${esc(detail)}</span></span><em>${esc(tag)}</em></div>`;
}
function empty(title, body) { return row(title, body, 'empty'); }

async function loadOwnerData() {
  const [auto, feed, closeout, reasons, proof, memory] = await Promise.allSettled([
    apiGet('/business/autopilot-score'),
    apiGet('/office/live-feed'),
    apiGet('/owner/daily-closeout'),
    apiGet('/command/reason-cards'),
    apiGet('/jobs/proof-pack'),
    apiGet('/client-memory'),
  ]);
  return {
    auto: auto.status === 'fulfilled' ? auto.value : null,
    feed: feed.status === 'fulfilled' ? feed.value : null,
    closeout: closeout.status === 'fulfilled' ? closeout.value : null,
    reasons: reasons.status === 'fulfilled' ? reasons.value : null,
    proof: proof.status === 'fulfilled' ? proof.value : null,
    memory: memory.status === 'fulfilled' ? memory.value : null,
  };
}

function renderOwner(root, data) {
  const auto = data.auto || {};
  const feed = arr(data.feed?.events);
  const closeout = data.closeout || {};
  const reasons = arr(data.reasons?.cards);
  const proof = arr(data.proof?.checklist);
  const memory = arr(data.memory?.timeline);
  const nextItems = arr(auto.items).filter((item) => !item.ok);
  root.innerHTML = `
    <section class="cvxBizSuite"><div class="cvxBizSuiteInner">
      <div class="cvxBizTop"><div><small>Churvox business system</small><h3>Autopilot, field feed and closeout.</h3><p>This is the layer that makes Churvox behave like a business, not just pages: setup score, live office feed, Command reasons, proof packs, client memory and daily closeout.</p></div><button type="button" class="cvxBizRefresh" data-cvx-biz-refresh>Refresh</button></div>
      <div class="cvxBizGrid">
        <div class="cvxBizScore"><div><b>${num(auto.score)}</b><span>% ready</span></div></div>
        <section class="cvxBizCard"><h4>Next best moves</h4><div class="cvxBizList">${nextItems.slice(0, 5).map((item) => row(item.title, item.detail, item.action, 'next')).join('') || arr(auto.items).slice(0, 5).map((item) => row(item.title, item.detail, 'done', 'good')).join('') || empty('No score yet', 'Create real data and Churvox will score the business setup.')}</div></section>
        <section class="cvxBizCard"><h4>Office live feed</h4><div class="cvxBizList">${feed.slice(0, 6).map((item) => row(item.title, short(item.detail, item.source), item.kind)).join('') || empty('No live feed yet', 'Worker updates, payments, invoices and job changes will appear here.')}</div></section>
      </div>
      <div class="cvxBizSubGrid">
        <section class="cvxBizPill"><b>Daily closeout</b>${esc(arr(closeout.summary).join(' ') || 'No closeout yet.')}</section>
        <section class="cvxBizPill"><b>Command reasons</b>${esc(reasons[0]?.why || 'Reason cards appear when Command has real decisions.')}</section>
        <section class="cvxBizPill"><b>Proof pack</b>${esc(proof.slice(0, 4).join(' · ') || 'Industry proof checklist appears here.')}</section>
        <section class="cvxBizPill"><b>Client memory</b>${esc(memory[0]?.title || 'Client jobs, invoices, notes and payments build a memory timeline.')}</section>
      </div>
    </div></section>`;
}

function findOwnerMountTarget() {
  return document.querySelector('.cvxProduct main') || document.querySelector('.cvxProduct') || document.querySelector('[data-owner-dashboard]') || document.querySelector('main') || document.body;
}

function placeOwnerRoot(root, target) {
  const hero = target.querySelector?.('.cvxHero,.cvxPageHeader,.cvxDashboardHero,.cvxOwnerHero');
  if (hero?.parentNode) hero.parentNode.insertBefore(root, hero.nextSibling);
  else target.insertBefore(root, target.firstChild || null);
}

async function mountOwner(force = false) {
  if (!isOwnerApp()) { document.getElementById(OWNER_ID)?.remove(); return; }
  if (ownerMounting && !force) return;
  ownerMounting = true;
  installStyle();
  const target = findOwnerMountTarget();
  if (!target) { ownerMounting = false; return; }
  let root = document.getElementById(OWNER_ID);
  if (!root || !document.body.contains(root)) {
    root = document.createElement('section');
    root.id = OWNER_ID;
    root.addEventListener('click', (event) => { if (event.target.closest('[data-cvx-biz-refresh]')) mountOwner(true); });
  }
  if (!root.parentNode || !document.body.contains(root)) placeOwnerRoot(root, target);
  if (force || !root.dataset.loaded) root.innerHTML = '<section class="cvxBizSuite"><div class="cvxBizSuiteInner"><div class="cvxBizRow"><b>Loading business system…</b><span>Checking Autopilot, live feed, Command reasons, proof and closeout.</span><em>live</em></div></div></section>';
  try { renderOwner(root, await loadOwnerData()); root.dataset.loaded = '1'; }
  catch (error) { root.innerHTML = `<section class="cvxBizSuite"><div class="cvxBizSuiteInner">${row('Churvox business system', error?.message || 'Backend may need deploy.', 'check')}</div></section>`; root.dataset.loaded = '1'; }
  ownerMounting = false;
}

async function mountHq() {
  if (!isHq()) { document.getElementById(HQ_ID)?.remove(); return; }
  installStyle();
  const main = document.querySelector('main');
  if (!main) return;
  let root = document.getElementById(HQ_ID);
  if (!root) {
    root = document.createElement('section');
    root.id = HQ_ID;
    const afterHealth = document.getElementById('churvox-hq-business-health-panel');
    const afterTesters = document.getElementById('churvox-hq-accepted-testers-panel');
    if (afterHealth?.parentNode) afterHealth.parentNode.insertBefore(root, afterHealth.nextSibling);
    else if (afterTesters?.parentNode) afterTesters.parentNode.insertBefore(root, afterTesters.nextSibling);
    else main.insertBefore(root, main.firstChild);
    root.addEventListener('click', (event) => { if (event.target.closest('[data-cvx-friction-refresh]')) mountHq(); });
  }
  root.innerHTML = '<section class="cvxBizSuite"><div class="cvxBizSuiteInner"><div class="cvxBizRow"><b>Loading tester friction…</b><span>Checking invites, visits, signup and stuck signals.</span><em>HQ</em></div></div></section>';
  try {
    const data = await apiGet('/admin/owner/tester-friction');
    const stages = data.stages || {};
    const issues = arr(data.issues);
    const testers = arr(data.testers);
    root.innerHTML = `<section class="cvxBizSuite"><div class="cvxBizSuiteInner"><div class="cvxBizTop"><div><small>Tester feedback</small><h3>Where testers get stuck.</h3><p>Shows invite → signup/login → dashboard signals so HQ can see the test funnel, not just visitor numbers.</p></div><button class="cvxBizRefresh" data-cvx-friction-refresh>Refresh</button></div><div class="cvxBizSubGrid"><section class="cvxBizPill"><b>Invited</b>${num(stages.invited)}</section><section class="cvxBizPill"><b>Accepted</b>${num(stages.accepted)}</section><section class="cvxBizPill"><b>Signup visits</b>${num(stages.visited_signup)}</section><section class="cvxBizPill"><b>Dashboard visits</b>${num(stages.visited_dashboard)}</section></div><div class="cvxBizGrid" style="grid-template-columns:1fr 1fr"><section class="cvxBizCard"><h4>Stuck signals</h4><div class="cvxBizList">${issues.map((item) => row('Possible friction', item, 'check')).join('') || empty('No stuck signal yet', 'No obvious tester friction found from stored HQ data.')}</div></section><section class="cvxBizCard"><h4>Recent invited testers</h4><div class="cvxBizList">${testers.slice(0, 8).map((tester) => row(tester.business_name || tester.name || tester.email || 'Tester', tester.email || tester.status || 'invited', tester.status || 'tester')).join('') || empty('No testers yet', 'Invite testers from HQ and they will show here.')}</div></section></div></div></section>`;
  } catch (error) {
    root.innerHTML = `<section class="cvxBizSuite"><div class="cvxBizSuiteInner">${row('Tester feedback not loaded yet', error?.message || 'Backend may need deploy.', 'check')}</div></section>`;
  }
}

function schedule() {
  [200, 900, 2600, 6000, 10000, 18000, 30000, 45000, 65000, 85000].forEach((delay) => setTimeout(() => { mountOwner(); mountHq(); }, delay));
}

function keepAlive() {
  if (observerStarted || typeof MutationObserver === 'undefined') return;
  observerStarted = true;
  const observer = new MutationObserver(() => {
    if (isOwnerApp() && !document.getElementById(OWNER_ID)) window.setTimeout(() => mountOwner(), 120);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  schedule();
  keepAlive();
  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  window.addEventListener('churvox:data-refresh', schedule);
}

export {};
