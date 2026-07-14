import API_BASE from '../lib/apiBase';

const STYLE_ID = 'churvox-office-decision-surface-style';
const FLAG = '__CHURVOX_OFFICE_DECISION_SURFACE_RUNTIME__';
let lastSig = '';
let observerStarted = false;

const css = `
  .cvxAdminBrainSurface {
    grid-column: 1 / -1;
    display: grid;
    gap: 12px;
    margin: 0;
    padding: 14px;
    border-radius: 26px;
    border: 1px solid rgba(16,21,19,.1);
    background:
      radial-gradient(circle at 100% 0%, rgba(243,107,33,.18), transparent 34%),
      linear-gradient(135deg, rgba(16,21,19,.96), rgba(38,24,16,.92));
    color: #fff;
    box-shadow: 0 22px 48px rgba(37,28,17,.14), inset 0 1px 0 rgba(255,255,255,.08);
    overflow: hidden;
    position: relative;
  }
  .cvxAdminBrainSurface::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: .18;
    background: repeating-linear-gradient(135deg, rgba(255,255,255,.14) 0 1px, transparent 1px 18px);
    mask-image: linear-gradient(90deg, transparent 0%, #000 42%, #000 100%);
  }
  .cvxAdminBrainSurface > * { position: relative; z-index: 1; }
  .cvxAdminBrainHead { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 12px; align-items: start; }
  .cvxAdminBrainHead small { display: block; color: #ffb879; font-size: 10px; font-weight: 1000; letter-spacing: .14em; text-transform: uppercase; }
  .cvxAdminBrainHead h3 { margin: 5px 0 0; font-size: clamp(22px, 2.5vw, 34px); line-height: .98; letter-spacing: -.055em; font-weight: 780; }
  .cvxAdminBrainHead p { margin: 7px 0 0; color: rgba(255,255,255,.78); font-size: 13px; line-height: 1.35; font-weight: 650; }
  .cvxAdminBrainMeta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: flex-end; }
  .cvxAdminBrainMeta em, .cvxAdminBrainMeta button { border: 0; border-radius: 999px; padding: 8px 10px; font-style: normal; font-size: 11px; font-weight: 1000; white-space: nowrap; }
  .cvxAdminBrainMeta em { background: #f36b21; color: #fff; }
  .cvxAdminBrainMeta button { background: rgba(255,255,255,.12); color: #fff; cursor: pointer; }
  .cvxAdminBrainGrid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }
  .cvxAdminBrainGrid article { border: 1px solid rgba(255,255,255,.1); border-radius: 18px; padding: 11px; background: rgba(255,255,255,.07); min-height: 116px; cursor: pointer; }
  .cvxAdminBrainGrid small { display: block; color: #ffb879; font-size: 9px; font-weight: 1000; letter-spacing: .12em; text-transform: uppercase; }
  .cvxAdminBrainGrid b { display: block; margin-top: 6px; color: #fff; font-size: 13px; line-height: 1.2; font-weight: 850; }
  .cvxAdminBrainGrid span { display: block; margin-top: 7px; color: rgba(255,255,255,.72); font-size: 11.5px; line-height: 1.35; font-weight: 620; }
  .cvxAdminBrainGrid i { display: inline-flex; margin-top: 8px; border-radius: 999px; padding: 5px 7px; background: rgba(255,184,121,.16); color: #ffd2ad; font-style: normal; font-size: 9px; font-weight: 1000; letter-spacing: .09em; text-transform: uppercase; }
  @media(max-width: 980px) { .cvxAdminBrainGrid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
  @media(max-width: 620px) { .cvxAdminBrainHead, .cvxAdminBrainGrid { grid-template-columns: 1fr; } .cvxAdminBrainMeta { justify-content: flex-start; } }
`;

function storedAuthUser() { try { return JSON.parse(localStorage.getItem('churvox_auth_session_snapshot_v1') || '{}')?.user || {}; } catch { return {}; } }
function isWorkerSession() { const user = storedAuthUser(); const role = String(user.role || user.user_role || user.account_type || '').trim().toLowerCase().replace(/[ -]/g, '_'); return new Set(["worker", "staff", "employee", "subcontractor", "contractor", "technician", "field_worker"]).has(role) || user.is_worker === true || Boolean(user.worker_id); }
function isOwnerApp() {
  const path = window.location.pathname || '';
  return !isWorkerSession() && (path === '/dashboard' || path.startsWith('/dashboard') || path === '/plans' || path === '/guide' || path === '/setup' || path === '/setup-guide');
}

function pageId() {
  const hash = String(window.location.hash || '').replace(/^#/, '').split('?')[0].toLowerCase();
  if (!hash && window.location.pathname === '/dashboard') return 'today';
  return hash || 'today';
}
function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}
function host() { return String(API_BASE || '').replace(/\/$/, ''); }
function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function headers() { const currentToken = token(); return { Accept: 'application/json', ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}) }; }
function escapeHtml(value) { return String(value || '').replace(/[&<>"]/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[character])); }
async function fetchDecisions() {
  const response = await fetch(`${host()}/api/admin-brain/scan`, { credentials: 'include', headers: headers() });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok || body?.success === false) throw new Error(body?.message || body?.detail || `Office check failed ${response.status}`);
  return body;
}
function anchor() {
  const page = document.querySelector('.cv3Page');
  if (!page) return null;
  return page.querySelector(':scope > .cv3Hero') || page.querySelector(':scope > .cvxPageStartRow') || page.querySelector(':scope > .cv3Toolbar') || page.firstElementChild;
}
function goCommand() {
  try {
    if (window.location.hash !== '#command') window.location.hash = '#command';
    window.dispatchEvent(new Event('hashchange'));
    window.dispatchEvent(new Event('churvox:data-refresh'));
  } catch {}
}
function pageRankedActions(actions, page) {
  if (page === 'today' || page === 'command') return actions;
  const target = page.replace(/s$/, '');
  return [...actions].sort((left, right) => {
    const leftRank = String(left.record_type || '').toLowerCase() === target ? 0 : 1;
    const rightRank = String(right.record_type || '').toLowerCase() === target ? 0 : 1;
    return leftRank - rightRank;
  });
}
function render(body) {
  if (!isOwnerApp()) return;
  const page = pageId();
  if (!['today', 'command', 'jobs', 'clients', 'messages', 'invoices', 'quotes'].includes(page)) {
    document.querySelectorAll('.cvxAdminBrainSurface').forEach((node) => node.remove());
    return;
  }
  if (!body) return;
  const actions = Array.isArray(body?.actions) ? body.actions : Array.isArray(body?.items) ? body.items : [];
  const counts = body?.counts || {};
  const ranked = pageRankedActions(actions, page);
  const signature = `${page}|${counts.total || actions.length}|${ranked.slice(0,4).map((action) => action.id || action.title).join('|')}`;
  if (signature === lastSig && document.querySelector('.cvxAdminBrainSurface')) return;
  lastSig = signature;
  ensureStyle();
  const target = anchor();
  if (!target) return;
  let card = document.querySelector('.cvxAdminBrainSurface');
  if (!card) {
    card = document.createElement('section');
    card.className = 'cvxAdminBrainSurface';
    target.insertAdjacentElement('afterend', card);
  } else if (card.previousElementSibling !== target) {
    target.insertAdjacentElement('afterend', card);
  }
  const top = ranked.slice(0, 4);
  const rows = top.length
    ? top.map((item) => `<article data-cvx-open-command="true"><small>${escapeHtml(item.record_type || item.kind || 'office')}</small><b>${escapeHtml(item.problem || item.title || 'Owner decision')}</b><span>${escapeHtml(item.why || item.suggestion || item.summary || 'Owner review needed.').slice(0, 150)}</span><i>${escapeHtml(item.priority || 'medium')}</i></article>`).join('')
    : `<article><small>clear</small><b>No office decisions need attention</b><span>Churvox is checking jobs, clients, invoices, quotes, messages and workers.</span><i>clear</i></article>`;
  card.innerHTML = `<header class="cvxAdminBrainHead"><div><small>Churvox office check</small><h3>Churvox found ${counts.total ?? actions.length} owner decision${Number(counts.total ?? actions.length) === 1 ? '' : 's'}</h3><p>These are the current decisions Churvox prepared across jobs, clients, workers, quotes, invoices and messages. Nothing sends, syncs, charges or changes records unless the owner approves the next step.</p></div><div class="cvxAdminBrainMeta"><em>${counts.high || 0} high</em><button type="button" data-cvx-open-command="true">Review in Command</button></div></header><div class="cvxAdminBrainGrid">${rows}</div>`;
  card.querySelectorAll('[data-cvx-open-command="true"]').forEach((node) => node.addEventListener('click', goCommand));
}
async function run() {
  if (!isOwnerApp()) return;
  try { render(await fetchDecisions()); } catch {}
}
function schedule(delay = 200) { setTimeout(run, delay); }
function observe() {
  if (observerStarted || typeof MutationObserver === 'undefined') return;
  observerStarted = true;
  const root = document.getElementById('root') || document.body;
  const observer = new MutationObserver(() => schedule(180));
  observer.observe(root, { childList: true, subtree: true });
}
if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  [300, 900, 1800, 3600, 7000].forEach(schedule);
  window.addEventListener('load', () => { observe(); schedule(500); });
  window.addEventListener('hashchange', () => [160, 700].forEach(schedule));
  window.addEventListener('popstate', () => [160, 700].forEach(schedule));
  window.addEventListener('churvox:data-refresh', () => [250, 900].forEach(schedule));
  window.addEventListener('churvox-owner-app-ready', () => [250, 900].forEach(schedule));
  if (document.readyState !== 'loading') observe();
}
export {};
