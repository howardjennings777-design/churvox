import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_FIRST_WIN_GUIDE_ENTRY_RUNTIME_V2__';
const ROOT_ID = 'churvox-first-win-guide-entry';
const STYLE_ID = 'churvox-first-win-guide-entry-style-v2';
const FIRST_SETUP_KEY = 'churvox_first_setup_pending';
const API_ROOT = String(API_BASE || '').replace(/\/$/, '');

const FALLBACK_STEPS = [
  { key: 'business_profile', title: 'Set your business basics', why: 'Quotes, invoices and customer messages need the right business details.', action: 'Open Settings', page: 'settings', proof: 'Waiting for setup', time: '1 min' },
  { key: 'first_client', title: 'Add your first real client', why: 'A real customer record makes the rest of Churvox useful.', action: 'Open Clients', page: 'clients', proof: 'No client yet', time: '1 min' },
  { key: 'first_job', title: 'Create your first job', why: 'This starts the real job-to-invoice workflow.', action: 'Open Jobs', page: 'work', proof: 'No job yet', time: '1 min' },
  { key: 'first_invoice', title: 'Prepare your first invoice', why: 'This turns completed work into an owner-controlled money step.', action: 'Open Invoices', page: 'invoices', proof: 'No invoice yet', time: '2 min' },
  { key: 'command_approval', title: 'Approve one thing in Command', why: 'This teaches the product promise: Churvox prepares the admin and you approve.', action: 'Open Command', page: 'command', proof: 'No approval yet', time: '30 sec' },
  { key: 'first_payment', title: 'Get your first invoice paid', why: 'The complete first win is a finished job becoming verified money received.', action: 'Open Payments', page: 'invoices', proof: 'No paid invoice yet', time: 'Customer step' },
];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function token() {
  try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch { return ''; }
}

function authHeaders() {
  const value = token();
  return { Accept: 'application/json', 'Content-Type': 'application/json', ...(value ? { Authorization: `Bearer ${value}` } : {}) };
}

async function api(path, options = {}) {
  const response = await fetch(`${API_ROOT}/api${path}`, {
    credentials: 'include',
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false || body?.ok === false) throw new Error(body?.detail || body?.message || 'Guide is offline');
  return body;
}

function appPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return path === '/dashboard' || path === '/guide' || path === '/setup' || path === '/setup-guide' || path.startsWith('/dashboard');
}

function explicitlyRequested() {
  const path = String(window.location.pathname || '').toLowerCase();
  const params = new URLSearchParams(window.location.search || '');
  if (['/guide', '/setup', '/setup-guide'].includes(path)) return true;
  if (params.get('first_setup') === '1' || params.get('tester') === '1' || params.get('guide') === '1') return true;
  try { return localStorage.getItem(FIRST_SETUP_KEY) === 'true'; } catch { return false; }
}

function prepare(progress = {}) {
  const steps = Array.isArray(progress.steps) && progress.steps.length
    ? progress.steps.map((step) => ({ ...FALLBACK_STEPS.find((item) => item.key === step.key), ...step }))
    : FALLBACK_STEPS;
  const done = Number(progress.done ?? steps.filter((step) => step.done).length);
  const total = Number(progress.total || steps.length);
  const percent = Number(progress.percent ?? Math.round((done / Math.max(total, 1)) * 100));
  return {
    ...progress,
    steps,
    done,
    total,
    percent: Math.max(0, Math.min(100, percent)),
    completed: Boolean(progress.completed || done >= total),
    next_step: progress.next_step || steps.find((step) => !step.done) || null,
  };
}

async function loadProgress() {
  try { return prepare(await api('/onboarding/progress')); }
  catch { return prepare({ steps: FALLBACK_STEPS, show_guide: explicitlyRequested(), message: 'One clear step at a time.' }); }
}

function workspace() {
  return document.querySelector('.cvxWorkspace, .cocWorkspace, .churvoxOptionC .workspace, .officeTeamLab main, main');
}

function go(page) {
  const target = page || 'today';
  try {
    if (target === 'today') {
      localStorage.removeItem(FIRST_SETUP_KEY);
      window.history.pushState({}, '', '/dashboard');
    } else {
      localStorage.setItem(FIRST_SETUP_KEY, 'true');
      window.history.pushState({}, '', `/dashboard#${target}`);
    }
    window.dispatchEvent(new Event('hashchange'));
    window.dispatchEvent(new Event('popstate'));
  } catch {
    window.location.href = target === 'today' ? '/dashboard' : `/dashboard#${target}`;
  }
  document.getElementById(ROOT_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function hideGuide() {
  try { await api('/onboarding/state', { method: 'POST', body: JSON.stringify({ dismissed: true }) }); } catch {}
  try { localStorage.removeItem(FIRST_SETUP_KEY); } catch {}
  document.getElementById(ROOT_ID)?.remove();
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{font-family:inherit;color:#111827;margin:0 auto 22px;max-width:1280px;width:100%}
    #${ROOT_ID} *{box-sizing:border-box}
    .fw2Shell{position:relative;overflow:hidden;border:1px solid #fed7aa;border-radius:28px;background:linear-gradient(135deg,#fff 0%,#fff7ed 54%,#f8fafc 100%);box-shadow:0 20px 60px rgba(15,23,42,.09)}
    .fw2Shell:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 92% 5%,rgba(249,115,22,.18),transparent 30%);pointer-events:none}
    .fw2Inner{position:relative;padding:22px;display:grid;gap:16px}
    .fw2Hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center}
    .fw2Kicker{display:inline-flex;border:1px solid #fed7aa;background:#fff;color:#c2410c;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.12em}
    .fw2Hero h2{margin:10px 0 6px;font-size:clamp(28px,4vw,52px);line-height:.95;letter-spacing:-.06em;font-weight:1000;color:#0f172a}
    .fw2Hero p{margin:0;max-width:760px;color:#475569;font-weight:720;line-height:1.55}
    .fw2Score{display:grid;place-items:center;min-width:150px;min-height:112px;border:1px solid #fed7aa;border-radius:24px;background:#fff;box-shadow:0 12px 34px rgba(15,23,42,.07)}
    .fw2Score b{font-size:38px;letter-spacing:-.06em}.fw2Score small{color:#64748b;font-weight:850}
    .fw2Bar{height:10px;border-radius:999px;background:#e2e8f0;overflow:hidden}.fw2Bar i{display:block;height:100%;background:linear-gradient(90deg,#f97316,#111827);border-radius:999px}
    .fw2Next{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:17px;border:1px solid #fed7aa;border-radius:22px;background:#fff}
    .fw2Next small{color:#c2410c;font-weight:950;text-transform:uppercase;letter-spacing:.09em}.fw2Next h3{margin:7px 0 5px;font-size:25px;letter-spacing:-.04em}.fw2Next p{margin:0;color:#475569;font-weight:700}.fw2Next em{display:block;margin-top:8px;color:#64748b;font-size:12px;font-style:normal;font-weight:800}
    .fw2Actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.fw2Actions button,.fw2Footer button{border:1px solid #dbe3ec;background:#fff;color:#0f172a;border-radius:14px;padding:11px 13px;font-weight:900;cursor:pointer}.fw2Actions .primary{background:linear-gradient(135deg,#f97316,#111827);color:#fff;border-color:transparent}.fw2Actions .example{border-color:#fed7aa;background:#fff7ed;color:#c2410c}
    .fw2Steps{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px}.fw2Step{min-height:104px;border:1px solid #e2e8f0;border-radius:18px;background:#fff;padding:12px}.fw2Step.active{border-color:#fb923c;background:#fff7ed}.fw2Step.done{border-color:#bbf7d0;background:#f0fdf4}.fw2Step strong{display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:#111827;color:#fff}.fw2Step.done strong{background:#16a34a}.fw2Step b{display:block;margin-top:9px;font-size:13px;line-height:1.15}.fw2Step small{display:block;margin-top:6px;color:#64748b;font-size:11px;font-weight:750;line-height:1.25}
    .fw2Footer{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.fw2Footer p{margin:0;color:#64748b;font-size:12px;font-weight:750}.fw2Footer .hide{color:#991b1b;border-color:#fecaca;background:#fff}
    @media(max-width:900px){.fw2Hero,.fw2Next{grid-template-columns:1fr}.fw2Score{justify-self:stretch;min-height:90px}.fw2Actions{justify-content:flex-start}.fw2Steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
}

function render(progress) {
  const root = document.getElementById(ROOT_ID);
  if (!root) return;
  const next = progress.next_step || progress.steps.find((step) => !step.done);
  root.__fwProgress = progress;
  root.innerHTML = `
    <section class="fw2Shell" data-version="CHURVOX_FIRST_WIN_GUIDE_V2_20260720">
      <div class="fw2Inner">
        <div class="fw2Hero">
          <div><span class="fw2Kicker">First Win Guide</span><h2>${progress.completed ? 'You completed the full first win.' : 'One clear next step.'}</h2><p>${esc(progress.message || 'Add a real client, run one job, prepare the invoice, approve the admin and confirm payment.')}</p></div>
          <div class="fw2Score"><b>${progress.percent}%</b><small>${progress.done}/${progress.total} complete</small></div>
        </div>
        <div class="fw2Bar"><i style="width:${progress.percent}%"></i></div>
        ${next ? `<div class="fw2Next"><div><small>Do this next · ${esc(next.time || '1 min')}</small><h3>${esc(next.title)}</h3><p>${esc(next.why || '')}</p><em>${esc(next.proof || '')}</em></div><div class="fw2Actions"><button class="primary" type="button" data-fw2-open="${esc(next.page || 'today')}">${esc(next.action || 'Open step')}</button><button type="button" data-fw2-refresh="1">Check again</button><button class="example" type="button" data-fw2-example="1">See 2-minute example</button></div></div>` : `<div class="fw2Next"><div><small>Complete</small><h3>Client → job → invoice → approval → paid.</h3><p>You have completed the first useful Churvox loop with real records.</p></div><div class="fw2Actions"><button class="primary" type="button" data-fw2-open="today">Open Today</button><button class="example" type="button" data-fw2-example="1">Replay example</button></div></div>`}
        <div class="fw2Steps">${progress.steps.map((step, index) => `<article class="fw2Step ${step.done ? 'done' : ''} ${next?.key === step.key ? 'active' : ''}"><strong>${step.done ? '✓' : index + 1}</strong><b>${esc(step.title)}</b><small>${esc(step.done ? 'Done' : step.proof || step.time || 'Waiting')}</small></article>`).join('')}</div>
        <div class="fw2Footer"><p>Progress comes from live business records. Nothing sends, charges or changes without the required approval.</p><div><button type="button" data-fw2-refresh="1">Refresh</button> <button class="hide" type="button" data-fw2-hide="1">Hide for now</button></div></div>
      </div>
    </section>`;
}

async function renderGuide(force = false) {
  if (!appPath()) return;
  const progress = await loadProgress();
  const show = force || explicitlyRequested() || progress.show_guide;
  if (!show) {
    document.getElementById(ROOT_ID)?.remove();
    return;
  }
  installStyle();
  const host = workspace();
  if (!host) return;
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('section');
    root.id = ROOT_ID;
    host.insertBefore(root, host.firstChild);
  }
  render(progress);
}

function schedule(force = false) {
  [0, 300, 900, 1800].forEach((delay) => window.setTimeout(() => renderGuide(force), delay));
}

function loadCompanionRuntimes() {
  const path = String(window.location.pathname || '').toLowerCase();
  const owner = appPath() || path === '/plans';
  const hq = ['/admin', '/churvox-hq', '/admin/hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage', '/admin/qa-auditor', '/platform'].includes(path);
  if (owner) {
    import('./churvoxFirstWinFeedbackRuntime').catch(() => {});
    import('./churvoxInvoicePaymentLinkRuntime').catch(() => {});
  }
  if (hq) import('./churvoxHqFeedbackRuntime').catch(() => {});
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  document.addEventListener('click', (event) => {
    const open = event.target.closest('[data-fw2-open]');
    if (open) { go(open.getAttribute('data-fw2-open')); return; }
    if (event.target.closest('[data-fw2-example]')) { window.location.href = '/demo?industry=property-maintenance&from=first-win'; return; }
    if (event.target.closest('[data-fw2-refresh]')) { renderGuide(true); return; }
    if (event.target.closest('[data-fw2-hide]')) hideGuide();
  }, true);
  loadCompanionRuntimes();
  schedule(false);
  window.addEventListener('hashchange', () => { loadCompanionRuntimes(); schedule(false); });
  window.addEventListener('popstate', () => { loadCompanionRuntimes(); schedule(false); });
  window.addEventListener('churvox-owner-app-ready', () => schedule(false));
  window.addEventListener('churvox:fresh-data-updated', () => schedule(false));
  window.setInterval(() => { if (appPath()) renderGuide(false); }, 15000);
}

export {};
