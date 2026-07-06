import API_BASE from '../lib/apiBase';

const API_ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
const LANES = [
  ['Worker problems', 'hot', 'Field issues waiting for owner decision'],
  ['Missing info', 'warn', 'Jobs or records needing admin cleanup'],
  ['Money waiting', 'money', 'Invoices, completed work and paid checks'],
  ['Ready to approve', 'ready', 'Prepared decisions ready for review'],
  ['Day close', '', 'End-of-day admin wrap-up'],
];
let lastHtml = '';
let loading = false;

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isCommand() {
  const path = window.location.pathname || '';
  const hash = (window.location.hash || '').replace('#', '');
  return path.startsWith('/dashboard') && (hash === 'command' || (!hash && document.querySelector('.cvxTopTitle h1')?.textContent?.trim() === 'Command'));
}

function listFrom(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.actions)) return payload.actions;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function laneOf(item) {
  const text = clean([item?.lane, item?.type, item?.kind, item?.action_type, item?.status, item?.title].join(' ')).toLowerCase();
  if (/worker problem|field issue|job issue|problem/.test(text)) return 'Worker problems';
  if (/missing|ledger|incomplete|needs/.test(text)) return 'Missing info';
  if (/invoice|money|paid|payment|overdue/.test(text)) return 'Money waiting';
  if (/day close|close/.test(text)) return 'Day close';
  return 'Ready to approve';
}

async function fetchActions() {
  const response = await fetch(`${API_ROOT}/command/actions`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  return listFrom(data);
}

function buildHtml(actions) {
  const counts = Object.fromEntries(LANES.map(([name]) => [name, 0]));
  actions.forEach((item) => { counts[laneOf(item)] = (counts[laneOf(item)] || 0) + 1; });
  const cards = LANES.map(([name, tone, note]) => `<article class="cvxAdminLedgerLane ${tone}"><b>${counts[name] || 0}</b><span>${name}</span><small>${note}</small></article>`).join('');
  return `<section class="cvxAdminLedgerLanes" data-churvox-command-ledger="true"><header><div><h3>Admin ledger lanes</h3><p>Churvox sorts the owner pile into problems, missing info, money, approvals and day close.</p></div><span class="cvxAdminLedgerStamp">Command only</span></header><div class="cvxAdminLedgerLaneGrid">${cards}</div></section>`;
}

async function apply() {
  if (typeof window === 'undefined' || !isCommand() || loading) return;
  const page = document.querySelector('.cvxPage');
  if (!page) return;
  loading = true;
  try {
    const actions = await fetchActions();
    const html = buildHtml(actions);
    let node = document.querySelector('[data-churvox-command-ledger]');
    if (!node) {
      const hero = page.querySelector('.cvxHero');
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      node = wrap.firstElementChild;
      if (hero?.nextSibling) page.insertBefore(node, hero.nextSibling);
      else page.prepend(node);
      lastHtml = html;
    } else if (lastHtml !== html) {
      node.outerHTML = html;
      lastHtml = html;
    }
  } catch {
    // Quiet by design. Command still works without this visual layer.
  } finally {
    loading = false;
  }
}

function schedule() {
  [0, 350, 900, 1800].forEach((delay) => setTimeout(apply, delay));
}

schedule();
window.addEventListener('hashchange', schedule);
window.addEventListener('popstate', schedule);
window.addEventListener('churvox:data-refresh', schedule);
window.addEventListener('churvox-owner-app-ready', schedule);
