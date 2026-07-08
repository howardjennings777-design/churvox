import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_HQ_ACCEPTED_TESTERS_RUNTIME__';
const ROOT_ID = 'churvox-hq-accepted-testers-panel';
const STYLE_ID = 'churvox-hq-accepted-testers-style';
const API_ROOT = String(API_BASE || '').replace(/\/$/, '');

function isHqPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return ['/admin', '/admin/hq', '/churvox-hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage'].includes(path);
}

function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function esc(value) { return String(value ?? '').replace(/\s+/g, ' ').trim().replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function arr(value) { return Array.isArray(value) ? value : []; }
function num(value) { return Number(value || 0).toLocaleString('en-NZ'); }
function dateText(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return String(value); }
}
function lower(value) { return String(value || '').trim().toLowerCase(); }

async function apiGet(path) {
  const headers = { Accept: 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) };
  const response = await fetch(`${API_ROOT}${path}`, { credentials: 'include', headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false || body?.ok === false) {
    const error = new Error(body?.detail || body?.message || body?.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{grid-column:1/-1;margin:0 0 18px;color:#111827;font-family:inherit}
    #${ROOT_ID} *{box-sizing:border-box}
    .hqTesterShell{border:1px solid rgba(34,197,94,.24);border-radius:28px;background:linear-gradient(135deg,#052e16 0%,#0f172a 58%,#f97316 150%);box-shadow:0 20px 54px rgba(15,23,42,.15);overflow:hidden}
    .hqTesterInner{padding:18px;display:grid;gap:14px;color:white}
    .hqTesterTop{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
    .hqTesterTop small{display:inline-flex;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.09);border-radius:999px;padding:7px 10px;color:#bbf7d0;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em}
    .hqTesterTop h3{margin:8px 0 4px;font-size:24px;line-height:1;letter-spacing:-.04em;color:white}
    .hqTesterTop p{margin:0;max-width:760px;color:#e5e7eb;font-size:13px;font-weight:750;line-height:1.45}
    .hqTesterRefresh{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.1);color:white;border-radius:14px;padding:10px 13px;font-weight:950;cursor:pointer}
    .hqTesterMetrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    .hqTesterMetric{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.1);border-radius:18px;padding:12px}
    .hqTesterMetric b{display:block;font-size:28px;line-height:1;color:white;font-weight:1000;letter-spacing:-.04em}
    .hqTesterMetric span{display:block;margin-top:5px;color:#bbf7d0;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}
    .hqTesterColumns{display:grid;grid-template-columns:1fr 1fr;gap:10px}.hqTesterPanel{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);border-radius:18px;padding:12px}.hqTesterPanel h4{margin:0 0 10px;color:white;font-size:14px;font-weight:1000}.hqTesterList{display:grid;gap:7px;max-height:280px;overflow:auto;padding-right:4px}.hqTesterRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);border-radius:15px;padding:10px}.hqTesterRow b{display:block;color:white;font-size:13px}.hqTesterRow span{display:block;color:#d1d5db;font-size:12px;margin-top:2px}.hqTesterRow em{font-style:normal;color:#bbf7d0;font-size:11px;font-weight:950;white-space:nowrap}.hqTesterRow.invited em{color:#fed7aa}
    @media(max-width:860px){.hqTesterTop{display:block}.hqTesterRefresh{margin-top:10px}.hqTesterMetrics{grid-template-columns:1fr 1fr}.hqTesterColumns{grid-template-columns:1fr}.hqTesterRow{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function normalizeTester(user, status = 'accepted') {
  const email = lower(user.email || user.user_email || user.tester_email || '');
  const activeAt = user.last_active || user.last_login || user.last_seen || '';
  const active = Boolean(activeAt);
  return {
    email,
    name: user.business_name || user.company || user.name || user.full_name || email || 'Tester',
    business_name: user.business_name || user.company || '',
    status: active ? 'active' : status,
    accepted: true,
    active,
    plan: user.plan || 'operator',
    subscription_status: user.subscription_status || 'tester_free',
    free_tester_until: user.free_tester_until || '',
    invited_at: user.free_tester_granted_at || user.created_at || '',
    accepted_at: user.created_at || user.free_tester_granted_at || user.updated_at || '',
    last_active: activeAt,
    source: 'hq_existing_data',
    user_id: user.id || user._id || '',
  };
}

function fallbackFromExisting(planReport, overview) {
  const fromPlan = arr(planReport?.free_testers);
  const fromOverview = arr(overview?.lists?.free_testers);
  const byEmail = new Map();
  [...fromPlan, ...fromOverview].forEach((user) => {
    const email = lower(user.email || user.user_email || user.tester_email || user.id || user._id);
    if (!email) return;
    byEmail.set(email, normalizeTester(user));
  });
  const testers = Array.from(byEmail.values());
  const active = testers.filter((tester) => tester.active);
  return {
    success: true,
    source: 'hq_existing_data_fallback',
    counts: {
      total: testers.length,
      accepted: testers.length,
      active: active.length,
      invited_not_accepted: 0,
    },
    testers,
    accepted_testers: testers,
    active_testers: active,
    invited_testers: [],
  };
}

async function loadTesterData() {
  try {
    return await apiGet('/api/admin/owner/testers');
  } catch (firstError) {
    const [planReport, overview] = await Promise.allSettled([apiGet('/api/admin/owner/plan-report'), apiGet('/api/admin/owner-overview')]);
    return fallbackFromExisting(planReport.status === 'fulfilled' ? planReport.value : null, overview.status === 'fulfilled' ? overview.value : null);
  }
}

function testerRow(tester, invited = false) {
  const name = tester.business_name || tester.name || tester.email || 'Tester';
  const meta = `${tester.email || 'no email'} · ${invited ? 'invited' : tester.status || 'accepted'} · accepted ${dateText(tester.accepted_at)}`;
  const end = invited ? `sent ${dateText(tester.invited_at)}` : (tester.active ? `active ${dateText(tester.last_active)}` : 'accepted');
  return `<div class="hqTesterRow ${invited ? 'invited' : ''}"><span><b>${esc(name)}</b><span>${esc(meta)}</span></span><em>${esc(end)}</em></div>`;
}

function render(root, data, error = '') {
  const counts = data?.counts || {};
  const accepted = arr(data?.accepted_testers);
  const active = arr(data?.active_testers);
  const invited = arr(data?.invited_testers);
  const isFallback = data?.source === 'hq_existing_data_fallback';
  root.innerHTML = `
    <section class="hqTesterShell">
      <div class="hqTesterInner">
        <div class="hqTesterTop">
          <div>
            <small>Tester control${isFallback ? ' · fallback' : ''}</small>
            <h3>Accepted testers visible.</h3>
            <p>${isFallback ? 'Using existing HQ plan report/free tester data until the dedicated tester endpoint is available on the live backend.' : 'Shows tester accounts that have actually accepted access or logged in, separate from people who were only invited.'}</p>
          </div>
          <button type="button" class="hqTesterRefresh" data-hq-testers-refresh>Refresh</button>
        </div>
        ${error ? `<div class="hqTesterRow"><b>Could not load testers</b><span>${esc(error)}</span><em>check</em></div>` : `
          <div class="hqTesterMetrics">
            <div class="hqTesterMetric"><b>${num(counts.total)}</b><span>Total testers</span></div>
            <div class="hqTesterMetric"><b>${num(counts.accepted)}</b><span>Accepted</span></div>
            <div class="hqTesterMetric"><b>${num(counts.active)}</b><span>Active</span></div>
            <div class="hqTesterMetric"><b>${num(counts.invited_not_accepted)}</b><span>Invited only</span></div>
          </div>
          <div class="hqTesterColumns">
            <section class="hqTesterPanel"><h4>Accepted / active testers</h4><div class="hqTesterList">${accepted.slice(0, 35).map((tester) => testerRow(tester, false)).join('') || '<div class="hqTesterRow"><b>No accepted testers yet</b><span>When a tester accepts access, they will appear here.</span><em>empty</em></div>'}</div></section>
            <section class="hqTesterPanel"><h4>Invited but not accepted</h4><div class="hqTesterList">${invited.slice(0, 35).map((tester) => testerRow(tester, true)).join('') || '<div class="hqTesterRow"><b>No pending invites visible</b><span>${isFallback ? 'Fallback mode can show accepted testers, but pending invite records need the dedicated tester endpoint.' : 'All visible testers have accepted, or no invites are stored yet.'}</span><em>clear</em></div>'}</div></section>
          </div>`}
      </div>
    </section>`;
}

async function mount() {
  if (!isHqPath()) {
    document.getElementById(ROOT_ID)?.remove();
    return;
  }
  installStyle();
  const main = document.querySelector('main');
  if (!main) return;
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('section');
    root.id = ROOT_ID;
    const afterUnique = document.getElementById('churvox-hq-unique-visitors-once');
    const afterControl = document.getElementById('churvox-platform-owner-bug-watch');
    if (afterUnique?.parentNode) afterUnique.parentNode.insertBefore(root, afterUnique.nextSibling);
    else if (afterControl?.parentNode) afterControl.parentNode.insertBefore(root, afterControl.nextSibling);
    else main.insertBefore(root, main.firstChild);
    root.addEventListener('click', (event) => { if (event.target.closest('[data-hq-testers-refresh]')) mount(); });
  }
  root.innerHTML = '<section class="hqTesterShell"><div class="hqTesterInner"><div class="hqTesterRow"><b>Loading testers…</b><span>Checking accepted and invited tester accounts.</span><em>live</em></div></div></section>';
  try {
    render(root, await loadTesterData());
  } catch (error) {
    render(root, null, error?.message || 'Could not load');
  }
}

function schedule() { [0, 500, 1400, 3200].forEach((delay) => setTimeout(mount, delay)); }

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  setInterval(() => { if (isHqPath()) mount(); }, 60000);
}

export {};
