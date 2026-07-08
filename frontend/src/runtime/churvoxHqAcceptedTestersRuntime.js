import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_HQ_ACCEPTED_TESTERS_RUNTIME__';
const ROOT_ID = 'churvox-hq-accepted-testers-panel';
const STYLE_ID = 'churvox-hq-accepted-testers-style';
const HISTORY_KEY = 'churvox.hq.tester.invite.history.v1';
const API_ROOT = String(API_BASE || '').replace(/\/$/, '');

function isHqPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return ['/admin', '/admin/hq', '/churvox-hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage'].includes(path);
}

function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function esc(value) { return String(value ?? '').replace(/\s+/g, ' ').trim().replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function arr(value) { return Array.isArray(value) ? value : []; }
function num(value) { return Number(value || 0).toLocaleString('en-NZ'); }
function lower(value) { return String(value || '').trim().toLowerCase(); }
function dateText(value) { if (!value) return '—'; try { return new Date(value).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return String(value); } }
function localInviteHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } }

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
    #${ROOT_ID}{grid-column:1/-1;margin:0 0 10px;color:#111827;font-family:inherit}.hqTesterShell{border:1px solid rgba(34,197,94,.2);border-radius:20px;background:linear-gradient(135deg,#052e16 0%,#0f172a 60%,#ea580c 160%);box-shadow:0 12px 32px rgba(15,23,42,.12);overflow:hidden}.hqTesterInner{padding:12px;display:grid;gap:10px;color:white}.hqTesterTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.hqTesterTop small{display:inline-flex;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);border-radius:999px;padding:5px 8px;color:#bbf7d0;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.1em}.hqTesterTop h3{margin:5px 0 0;font-size:18px;line-height:1;letter-spacing:-.035em;color:white}.hqTesterTop p{margin:4px 0 0;max-width:760px;color:#e5e7eb;font-size:11px;font-weight:800;line-height:1.35}.hqTesterRefresh{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.1);color:white;border-radius:12px;padding:8px 10px;font-size:11px;font-weight:950;cursor:pointer}.hqTesterMetrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.hqTesterMetric{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);border-radius:14px;padding:8px 10px}.hqTesterMetric b{display:block;font-size:20px;line-height:1;color:white;font-weight:1000;letter-spacing:-.04em}.hqTesterMetric span{display:block;margin-top:4px;color:#bbf7d0;font-size:9px;font-weight:1000;text-transform:uppercase;letter-spacing:.07em}.hqTesterColumns{display:grid;grid-template-columns:1fr 1fr;gap:8px}.hqTesterPanel{border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.07);border-radius:14px;padding:9px}.hqTesterPanel h4{margin:0 0 7px;color:white;font-size:12px;font-weight:1000}.hqTesterList{display:grid;gap:6px;max-height:132px;overflow:auto;padding-right:4px}.hqTesterRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.07);border-radius:12px;padding:8px 9px}.hqTesterRow b{display:block;color:white;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hqTesterRow span{display:block;color:#d1d5db;font-size:10px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hqTesterRow em{font-style:normal;color:#bbf7d0;font-size:10px;font-weight:950;white-space:nowrap}.hqTesterRow.invited em{color:#fed7aa}@media(max-width:860px){.hqTesterTop{display:block}.hqTesterRefresh{margin-top:8px}.hqTesterMetrics{grid-template-columns:1fr 1fr}.hqTesterColumns{grid-template-columns:1fr}.hqTesterRow{grid-template-columns:1fr}.hqTesterList{max-height:180px}}
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
    accepted: status !== 'invited' && status !== 'pending_signup',
    active,
    plan: user.plan || 'operator',
    subscription_status: user.subscription_status || status,
    free_tester_until: user.free_tester_until || user.free_until || '',
    invited_at: user.invited_at || user.free_tester_granted_at || user.created_at || user.updated_at || '',
    accepted_at: user.accepted_at || user.created_at || user.free_tester_granted_at || user.updated_at || '',
    last_active: activeAt,
    source: user.source || 'hq_existing_data',
    user_id: user.id || user._id || '',
  };
}

function invitedFromRow(row) {
  const payload = row?.payload || {};
  const result = row?.result || row?.tester || {};
  const merged = { ...row, ...payload, ...result };
  const email = lower(merged.email || merged.user_email || merged.tester_email);
  if (!email) return null;
  return normalizeTester({ ...merged, email, invited_at: merged.created_at || merged.updated_at || row?.created_at, source: 'hq_control_log' }, merged.status || 'invited');
}

function mergeByEmail(...lists) {
  const map = new Map();
  lists.flat().filter(Boolean).forEach((item) => {
    const email = lower(item.email || item.user_email || item.tester_email);
    if (!email) return;
    const prev = map.get(email) || {};
    map.set(email, { ...prev, ...item, email });
  });
  return Array.from(map.values());
}

function fallbackFromExisting(planReport, overview, controlLog) {
  const accepted = mergeByEmail(
    arr(planReport?.free_testers).map((user) => normalizeTester(user, 'accepted')),
    arr(overview?.lists?.free_testers).map((user) => normalizeTester(user, 'accepted'))
  );
  const invited = mergeByEmail(
    arr(controlLog?.testers).map(invitedFromRow),
    arr(controlLog?.items).filter((row) => row?.action === 'tester_intake').map(invitedFromRow),
    localInviteHistory().map((row) => normalizeTester(row, row.status || 'invited'))
  ).filter((row) => row.email && !accepted.some((user) => lower(user.email) === lower(row.email)));
  const active = accepted.filter((tester) => tester.active);
  const testers = mergeByEmail(accepted, invited);
  return {
    success: true,
    source: 'hq_existing_data_fallback',
    counts: { total: testers.length, accepted: accepted.length, active: active.length, invited_not_accepted: invited.length },
    testers,
    accepted_testers: accepted,
    active_testers: active,
    invited_testers: invited,
  };
}

async function loadTesterData() {
  try { return await apiGet('/api/admin/owner/testers'); }
  catch {
    const [planReport, overview, controlLog] = await Promise.allSettled([apiGet('/api/admin/owner/plan-report'), apiGet('/api/admin/owner-overview'), apiGet('/api/admin/owner/control-log')]);
    return fallbackFromExisting(planReport.status === 'fulfilled' ? planReport.value : null, overview.status === 'fulfilled' ? overview.value : null, controlLog.status === 'fulfilled' ? controlLog.value : null);
  }
}

function testerRow(tester, invited = false) {
  const name = tester.business_name || tester.name || tester.email || 'Tester';
  const meta = `${tester.email || 'no email'} · ${tester.plan || 'operator'} · ${invited ? 'invited ' + dateText(tester.invited_at) : 'accepted ' + dateText(tester.accepted_at)}`;
  const end = invited ? (tester.status || 'pending') : (tester.active ? `active ${dateText(tester.last_active)}` : 'accepted');
  return `<div class="hqTesterRow ${invited ? 'invited' : ''}"><span><b>${esc(name)}</b><span>${esc(meta)}</span></span><em>${esc(end)}</em></div>`;
}
function emptyRow(title, body, tag = 'empty') { return `<div class="hqTesterRow"><b>${esc(title)}</b><span>${esc(body)}</span><em>${esc(tag)}</em></div>`; }

function render(root, data, error = '') {
  const counts = data?.counts || {};
  const accepted = arr(data?.accepted_testers);
  const invited = arr(data?.invited_testers);
  const isFallback = data?.source === 'hq_existing_data_fallback';
  const acceptedHtml = accepted.slice(0, 12).map((tester) => testerRow(tester, false)).join('') || emptyRow('No accepted testers yet', 'Accepted testers will show here.', 'empty');
  const invitedHtml = invited.slice(0, 12).map((tester) => testerRow(tester, true)).join('') || emptyRow('No invited testers found', 'When you invite someone, their email and business will show here.', 'empty');
  root.innerHTML = `
    <section class="hqTesterShell"><div class="hqTesterInner">
      <div class="hqTesterTop"><div><small>Tester control${isFallback ? ' · fallback' : ''}</small><h3>Tester invites</h3><p>${isFallback ? 'Showing accepted testers plus stored HQ invite records/control-log fallback.' : 'Accepted testers and invited testers shown separately.'}</p></div><button type="button" class="hqTesterRefresh" data-hq-testers-refresh>Refresh</button></div>
      ${error ? `<div class="hqTesterRow"><b>Could not load testers</b><span>${esc(error)}</span><em>check</em></div>` : `
      <div class="hqTesterMetrics"><div class="hqTesterMetric"><b>${num(counts.total)}</b><span>Total</span></div><div class="hqTesterMetric"><b>${num(counts.accepted)}</b><span>Accepted</span></div><div class="hqTesterMetric"><b>${num(counts.active)}</b><span>Active</span></div><div class="hqTesterMetric"><b>${num(counts.invited_not_accepted)}</b><span>Invited</span></div></div>
      <div class="hqTesterColumns"><section class="hqTesterPanel"><h4>Accepted / active</h4><div class="hqTesterList">${acceptedHtml}</div></section><section class="hqTesterPanel"><h4>Invited, not accepted yet</h4><div class="hqTesterList">${invitedHtml}</div></section></div>`}
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
    const afterUnique = document.getElementById('churvox-hq-unique-visitors-once');
    const afterControl = document.getElementById('churvox-platform-owner-bug-watch');
    if (afterUnique?.parentNode) afterUnique.parentNode.insertBefore(root, afterUnique.nextSibling);
    else if (afterControl?.parentNode) afterControl.parentNode.insertBefore(root, afterControl.nextSibling);
    else main.insertBefore(root, main.firstChild);
    root.addEventListener('click', (event) => { if (event.target.closest('[data-hq-testers-refresh]')) mount(); });
  }
  root.innerHTML = '<section class="hqTesterShell"><div class="hqTesterInner"><div class="hqTesterRow"><b>Loading testers…</b><span>Checking invites and accepted testers.</span><em>live</em></div></div></section>';
  try { render(root, await loadTesterData()); }
  catch (error) { render(root, null, error?.message || 'Could not load'); }
}
function schedule() { [0, 500, 1400, 3200].forEach((delay) => setTimeout(mount, delay)); }

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  window.addEventListener('churvox:hq-tester-history-change', schedule);
  setInterval(() => { if (isHqPath()) mount(); }, 60000);
}

export {};
