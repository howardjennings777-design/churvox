import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_PLATFORM_OWNER_CONTROL_CENTRE_RUNTIME__';
const ROOT_ID = 'churvox-platform-owner-bug-watch';
const STYLE_ID = 'churvox-platform-owner-light-style';
const API_ROOT = String(API_BASE || '').replace(/\/$/, '');

function isPlatformOwnerPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return path === '/admin' || path === '/admin/hq' || path === '/churvox-hq' || path === '/owner/dashboard' || path === '/platform-dashboard' || path === '/app-owner';
}

function token() {
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
}

function headers() {
  return { Accept: 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) };
}

async function apiGet(path) {
  const response = await fetch(`${API_ROOT}${path}`, { credentials: 'include', headers: headers() });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false || body?.success === false) throw new Error(body?.detail || body?.message || body?.error || `HTTP ${response.status}`);
  return body;
}

function arr(value) { return Array.isArray(value) ? value : []; }
function txt(value, fallback = '—') { return String(value ?? '').replace(/\s+/g, ' ').trim() || fallback; }
function money(value) { return Number(value || 0).toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }); }
function low(value) { return String(value || '').toLowerCase(); }

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body:has(#${ROOT_ID}){background:#f7f3ea!important}
    body:has(#${ROOT_ID}) main{background:#f7f3ea!important;color:#0f172a!important}
    body:has(#${ROOT_ID}) aside{background:rgba(255,255,255,.96)!important;border-color:#e2e8f0!important;color:#0f172a!important}
    body:has(#${ROOT_ID}) aside section,body:has(#${ROOT_ID}) header,body:has(#${ROOT_ID}) article{background:#fff!important;border-color:#e2e8f0!important;color:#0f172a!important;box-shadow:0 14px 36px rgba(15,23,42,.06)!important}
    body:has(#${ROOT_ID}) h1,body:has(#${ROOT_ID}) h2,body:has(#${ROOT_ID}) h3,body:has(#${ROOT_ID}) b{color:#0f172a!important}
    body:has(#${ROOT_ID}) p,body:has(#${ROOT_ID}) span,body:has(#${ROOT_ID}) td{color:#475569!important}
    body:has(#${ROOT_ID}) table{background:#fff!important;color:#0f172a!important}
    body:has(#${ROOT_ID}) thead{background:#f8fafc!important;color:#64748b!important}
    body:has(#${ROOT_ID}) tr{border-color:#e2e8f0!important}
    body:has(#${ROOT_ID}) input,body:has(#${ROOT_ID}) select,body:has(#${ROOT_ID}) textarea{background:#fff!important;border-color:#cbd5e1!important;color:#0f172a!important}
    #${ROOT_ID}{margin:0 0 22px;grid-column:1/-1;color:#0f172a;font-family:inherit}
    #${ROOT_ID} *{box-sizing:border-box}
    .hqControlShell{position:relative;overflow:hidden;border:1px solid #fed7aa;border-radius:34px;background:linear-gradient(135deg,#fff 0%,#fff7ed 48%,#f8fafc 100%);box-shadow:0 24px 80px rgba(15,23,42,.1)}
    .hqControlShell:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 88% 8%,rgba(249,115,22,.2),transparent 28%),linear-gradient(90deg,rgba(15,23,42,.05) 1px,transparent 1px);background-size:auto,46px 46px;pointer-events:none}
    .hqControlInner{position:relative;display:grid;gap:16px;padding:22px}
    .hqControlTop{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:start}
    .hqControlBadge{display:inline-flex;gap:8px;align-items:center;border:1px solid #fed7aa;background:#fff7ed;color:#c2410c;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.12em}
    .hqControlBadge:before{content:"";width:9px;height:9px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 5px rgba(34,197,94,.13)}
    .hqControlTop h2{margin:10px 0 6px;font-size:clamp(28px,4vw,56px);line-height:.95;letter-spacing:-.07em;color:#0f172a}
    .hqControlTop p{margin:0;max-width:760px;color:#475569;font-size:14px;font-weight:750;line-height:1.55}
    .hqControlActions{display:flex;gap:10px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
    .hqControlActions small{width:100%;text-align:right;color:#64748b;font-weight:850}
    .hqControlBtn{border:1px solid #fed7aa;background:#fff;color:#0f172a;border-radius:16px;padding:11px 14px;font-weight:950;cursor:pointer;box-shadow:0 10px 24px rgba(15,23,42,.06)}
    .hqControlBtn.primary{background:linear-gradient(135deg,#f97316,#111827);color:#fff;border-color:transparent}
    .hqMetricGrid{display:grid;grid-template-columns:repeat(6,minmax(118px,1fr));gap:10px}
    .hqMetric{border:1px solid #e2e8f0;background:rgba(255,255,255,.86);border-radius:22px;padding:14px;box-shadow:0 12px 28px rgba(15,23,42,.05)}
    .hqMetric b{display:block;font-size:26px;line-height:1;color:#0f172a;font-weight:1000;letter-spacing:-.05em}
    .hqMetric small{display:block;margin-top:7px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:950}
    .hqMetric em{display:block;margin-top:7px;color:#334155;font-style:normal;font-size:12px;font-weight:800}
    .hqBugGrid{display:grid;grid-template-columns:1.1fr .9fr;gap:12px}
    .hqBugPanel{border:1px solid #e2e8f0;background:#fff;border-radius:24px;padding:15px;box-shadow:0 12px 28px rgba(15,23,42,.05)}
    .hqBugPanel h3{margin:0 0 10px;color:#0f172a;font-size:16px;font-weight:1000;letter-spacing:-.025em}
    .hqBugList{display:grid;gap:8px}
    .hqBugItem{display:grid;grid-template-columns:1fr auto;gap:10px;border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc;padding:12px}
    .hqBugItem b{display:block;color:#0f172a;font-size:14px}.hqBugItem span{display:block;margin-top:3px;color:#64748b;font-size:12px;font-weight:750}.hqBugItem em{align-self:center;border-radius:999px;padding:6px 9px;font-style:normal;font-size:11px;font-weight:950;white-space:nowrap}
    .hqBugItem.clear em{background:#dcfce7;color:#166534}.hqBugItem.watch em{background:#ffedd5;color:#9a3412}.hqBugItem.bad em{background:#fee2e2;color:#991b1b}
    @media(max-width:1200px){.hqMetricGrid{grid-template-columns:repeat(3,minmax(0,1fr))}.hqBugGrid{grid-template-columns:1fr}}
    @media(max-width:720px){.hqControlTop{grid-template-columns:1fr}.hqControlActions{justify-content:flex-start}.hqControlActions small{text-align:left}.hqMetricGrid{grid-template-columns:1fr 1fr}.hqControlInner{padding:16px}}
  `;
  document.head.appendChild(style);
}

function makeIssue(level, title, detail) {
  return { level, title, detail };
}

function buildSignals(state) {
  const issues = [];
  const overview = state.overview || {};
  const metrics = overview.metrics || {};
  const lists = overview.lists || {};
  const collections = arr(overview.collections_seen);
  const endpointErrors = arr(state.endpointErrors);
  endpointErrors.forEach((item) => issues.push(makeIssue('bad', `${item.name} API problem`, item.error)));
  if (collections.length && !collections.includes('users')) issues.push(makeIssue('bad', 'Users collection not visible', 'Admin control needs the users collection.'));
  if (state.loaded && Number(metrics.total_users || arr(lists.users).length || 0) === 0) issues.push(makeIssue('watch', 'No users returned', 'The API loaded but returned no user records.'));
  const billingIssues = arr(lists.users).filter((user) => /past|fail|required|locked|unpaid|cancel/i.test(txt(user.subscription_status || user.billing_status || user.status, ''))).length;
  if (billingIssues) issues.push(makeIssue('watch', `${billingIssues} billing/access issue${billingIssues === 1 ? '' : 's'}`, 'Open Billing and inspect accounts needing payment/access help.'));
  const retentionFailures = arr(overview.retention_email_state?.last_result?.failures || overview.retention_email_state?.failures);
  if (retentionFailures.length) issues.push(makeIssue('watch', `${retentionFailures.length} email send failure${retentionFailures.length === 1 ? '' : 's'}`, 'Check lifecycle email/Postmark status.'));
  const supportSignals = arr(lists.businesses).filter((user) => {
    const id = String(user.business_id || user.id || user._id || '');
    const jobs = arr(lists.jobs).filter((job) => String(job.business_id || job.owner_id || '') === id).length;
    const clients = arr(lists.clients).filter((client) => String(client.business_id || client.owner_id || '') === id).length;
    return !jobs || !clients;
  }).length;
  if (supportSignals) issues.push(makeIssue('watch', `${supportSignals} setup/support signal${supportSignals === 1 ? '' : 's'}`, 'Some businesses may need onboarding help.'));
  return issues.length ? issues : [makeIssue('clear', 'No urgent bugs detected', 'Core HQ data loaded and no serious warning was found.')];
}

function htmlEscape(value) {
  return txt(value, '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function render(root, state) {
  const overview = state.overview || {};
  const metrics = overview.metrics || {};
  const lists = overview.lists || {};
  const signals = buildSignals(state);
  const badCount = signals.filter((item) => item.level === 'bad').length;
  const watchCount = signals.filter((item) => item.level === 'watch').length;
  const statusText = badCount ? 'Bug needs attention' : watchCount ? 'Watch list active' : 'Looks healthy';
  root.innerHTML = `
    <div class="hqControlShell">
      <div class="hqControlInner">
        <div class="hqControlTop">
          <div>
            <span class="hqControlBadge">Churvox owner control</span>
            <h2>HQ control centre</h2>
            <p>This is for you, the app owner. It watches users, plans, testers, support signals and bug indicators without showing this cockpit inside customer accounts.</p>
          </div>
          <div class="hqControlActions">
            <small>${state.loadedAt ? `Updated ${state.loadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Loading live data'}</small>
            <button type="button" class="hqControlBtn" data-hq-refresh="1">Refresh</button>
            <button type="button" class="hqControlBtn primary" data-hq-bug-tab="1">Bug Watch: ${badCount + watchCount || 'Clear'}</button>
          </div>
        </div>
        <div class="hqMetricGrid">
          <span class="hqMetric"><b>${Number(metrics.total_users || arr(lists.users).length || 0)}</b><small>Total users</small><em>All accounts visible</em></span>
          <span class="hqMetric"><b>${Number(metrics.paid_users || 0)}</b><small>Paid users</small><em>${money(metrics.monthly_revenue_estimate || 0)} MRR est.</em></span>
          <span class="hqMetric"><b>${Number(metrics.free_tester_users || 0)}</b><small>Free testers</small><em>Owner granted</em></span>
          <span class="hqMetric"><b>${Number(metrics.active_now || arr(lists.active_now).length || 0)}</b><small>Active now</small><em>Live users/visitors</em></span>
          <span class="hqMetric"><b>${badCount}</b><small>Bug alerts</small><em>${statusText}</em></span>
          <span class="hqMetric"><b>${watchCount}</b><small>Watch signals</small><em>Support/billing</em></span>
        </div>
        <div class="hqBugGrid">
          <section class="hqBugPanel">
            <h3>Bug Watch</h3>
            <div class="hqBugList">
              ${signals.slice(0, 6).map((item) => `<div class="hqBugItem ${item.level}"><span><b>${htmlEscape(item.title)}</b><span>${htmlEscape(item.detail)}</span></span><em>${htmlEscape(item.level)}</em></div>`).join('')}
            </div>
          </section>
          <section class="hqBugPanel">
            <h3>Control summary</h3>
            <div class="hqBugList">
              <div class="hqBugItem clear"><span><b>Owner lock</b><span>HQ is locked to hello@churvox.com.</span></span><em>secure</em></div>
              <div class="hqBugItem ${state.endpointErrors.length ? 'bad' : 'clear'}"><span><b>Admin APIs</b><span>${state.endpointErrors.length ? `${state.endpointErrors.length} endpoint problem(s)` : 'Overview, plan and retention endpoints loaded.'}</span></span><em>${state.endpointErrors.length ? 'check' : 'ok'}</em></div>
              <div class="hqBugItem watch"><span><b>Customer app untouched</b><span>This cockpit only runs on admin/HQ routes.</span></span><em>admin only</em></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

async function loadState() {
  const calls = [
    ['overview', '/api/admin/owner-overview'],
    ['plan report', '/api/admin/owner/plan-report'],
    ['retention', '/api/admin/owner/retention-email-status'],
  ];
  const results = await Promise.allSettled(calls.map(([, path]) => apiGet(path)));
  const endpointErrors = [];
  const state = { loaded: false, loadedAt: new Date(), endpointErrors, overview: null };
  results.forEach((result, index) => {
    const [name] = calls[index];
    if (result.status === 'rejected') endpointErrors.push({ name, error: result.reason?.message || 'Request failed' });
    if (name === 'overview' && result.status === 'fulfilled') {
      state.loaded = true;
      state.overview = result.value;
    }
  });
  return state;
}

async function ensureControlCentre() {
  if (!isPlatformOwnerPath()) {
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
    const target = main.querySelector('section.min-w-0, section[class*="p-4"], header') || main.firstElementChild || main;
    if (target && target !== main) target.insertBefore(root, target.firstChild);
    else main.insertBefore(root, main.firstChild);
    root.addEventListener('click', (event) => {
      if (event.target.closest('[data-hq-refresh]')) ensureControlCentre();
      if (event.target.closest('[data-hq-bug-tab]')) {
        const buttons = [...document.querySelectorAll('button')];
        const bug = buttons.find((button) => /bug watch/i.test(button.textContent || ''));
        bug?.click();
      }
    });
  }
  root.innerHTML = '<div class="hqControlShell"><div class="hqControlInner"><div class="hqBugPanel"><h3>Loading HQ control centre…</h3></div></div></div>';
  try {
    render(root, await loadState());
  } catch (error) {
    render(root, { loaded: false, loadedAt: new Date(), endpointErrors: [{ name: 'HQ cockpit', error: error?.message || 'Could not load' }], overview: null });
  }
}

function schedule() {
  [0, 300, 1000, 2500].forEach((delay) => setTimeout(ensureControlCentre, delay));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  setInterval(() => { if (isPlatformOwnerPath()) ensureControlCentre(); }, 30000);
}
