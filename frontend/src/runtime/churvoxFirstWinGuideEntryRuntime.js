import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_FIRST_WIN_GUIDE_ENTRY_RUNTIME__';
const ROOT_ID = 'churvox-first-win-guide-entry';
const STYLE_ID = 'churvox-first-win-guide-entry-style';
const FIRST_SETUP_KEY = 'churvox_first_setup_pending';
const PLAN_REQUIRED_KEY = 'churvox_plan_choice_required';
const COMMAND_INBOX_KEY = 'churvox:fresh-command-inbox:v1';
const API_ROOT = String(API_BASE || '').replace(/\/$/, '');

const FALLBACK_STEPS = [
  { key: 'business_profile', title: 'Set the business details', why: 'Add only the details needed for a professional quote, invoice and customer message.', action: 'Add business details', page: 'settings', proof: 'Business details not finished', time: '1 min' },
  { key: 'first_client', title: 'Add the client for your first job', why: 'Use one real customer so the rest of the guide works with genuine business information.', action: 'Add first client', page: 'clients', proof: 'No client yet', time: '1 min' },
  { key: 'first_job', title: 'Organise one real job', why: 'Add the work, date, price and worker or yourself. This is the record Churvox will build from.', action: 'Create first job', page: 'jobs', proof: 'No job yet', time: '90 sec' },
  { key: 'first_invoice', title: 'Prepare the invoice from that job', why: 'See how completed work becomes a controlled invoice without retyping the whole job.', action: 'Prepare invoice', page: 'invoices', proof: 'No invoice yet', time: '1 min' },
  { key: 'command_approval', title: 'Approve the prepared admin', why: 'Open Command and see the product promise in action: Churvox prepares it and the owner decides.', action: 'Open Command', page: 'command', proof: 'No Command approval yet', time: '30 sec' },
];

function isAppPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return ['/dashboard', '/guide', '/setup', '/setup-guide'].includes(path) || path.startsWith('/dashboard');
}

function wantsGuide() {
  if (!isAppPath()) return false;
  const path = String(window.location.pathname || '').toLowerCase();
  const hash = String(window.location.hash || '');
  const search = new URLSearchParams(window.location.search || '');
  if (path === '/guide' || path === '/setup' || path === '/setup-guide') return true;
  if (hash) return false;
  if (search.get('first_setup') === '1' || search.get('tester') === '1') return true;
  try { return path === '/dashboard' && localStorage.getItem(FIRST_SETUP_KEY) === 'true'; } catch { return false; }
}

function normaliseToGuidePath() {
  if (!wantsGuide()) return;
  const path = String(window.location.pathname || '').toLowerCase();
  const hash = String(window.location.hash || '');
  if (path === '/dashboard' && !hash) {
    try { window.history.replaceState({}, '', `/setup-guide${window.location.search || '?first_setup=1'}`); } catch {}
  }
}

function authHeaders() {
  try {
    const token = localStorage.getItem('token') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function api(path, options = {}) {
  const response = await fetch(`${API_ROOT}/api${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false || body?.success === false) throw new Error(body?.detail || body?.message || 'Guide is offline');
  return body;
}

function fallbackProgress() {
  return { ok: true, percent: 0, done: 0, total: FALLBACK_STEPS.length, steps: FALLBACK_STEPS, message: 'Add one real client, organise one real job and see what Churvox prepares. The rest can come later.' };
}

function safe(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function stepTitle(step) {
  const map = {
    business_profile: 'Set the business details',
    first_client: 'Add the client for your first job',
    first_job: 'Organise one real job',
    first_invoice: 'Prepare the invoice from that job',
    command_approval: 'Approve the prepared admin',
  };
  return map[step?.key] || step?.title || 'Next setup step';
}

function enrichStep(step = {}) {
  const fallback = FALLBACK_STEPS.find((item) => item.key === step.key) || {};
  return { ...fallback, ...step, title: stepTitle(step), why: step.why || fallback.why || 'This gets the new business to its first useful Churvox result.', action: step.action || fallback.action || 'Open step', page: step.page || fallback.page || 'today', proof: step.proof || fallback.proof || (step.done ? 'Done' : 'Waiting'), time: step.time || fallback.time || '1 min' };
}

function prepare(progress) {
  const base = progress && progress.ok ? progress : fallbackProgress();
  const rawSteps = Array.isArray(base.steps) && base.steps.length ? base.steps : FALLBACK_STEPS;
  const steps = rawSteps.map(enrichStep);
  const done = Number(base.done ?? steps.filter((s) => s.done).length);
  const total = Number(base.total || steps.length || FALLBACK_STEPS.length);
  const percent = Number(base.percent ?? Math.round((done / Math.max(total, 1)) * 100));
  const completed = Boolean(base.completed || percent >= 100 || done >= total);
  return { ...base, steps, done, total, percent: Math.max(0, Math.min(100, percent)), completed, next_step: base.next_step ? enrichStep(base.next_step) : steps.find((s) => !s.done) || null };
}

async function loadProgress() {
  try { return prepare(await api('/onboarding/progress')); } catch { return prepare(fallbackProgress()); }
}

function go(page) {
  const target = page || 'today';
  document.body.classList.remove('cvxFirstWinGuideMode');
  document.getElementById(ROOT_ID)?.remove();
  try {
    if (target === 'today') {
      localStorage.removeItem(FIRST_SETUP_KEY);
      localStorage.removeItem(PLAN_REQUIRED_KEY);
    } else {
      localStorage.setItem(FIRST_SETUP_KEY, 'true');
    }
    window.history.pushState({}, '', `/dashboard${target === 'today' ? '' : `#${target}`}`);
    window.dispatchEvent(new Event('hashchange'));
    window.dispatchEvent(new Event('popstate'));
  } catch {
    window.location.href = `/dashboard${target === 'today' ? '' : `#${target}`}`;
  }
}

function sendToCommand(progress) {
  const next = progress.next_step || progress.steps.find((s) => !s.done) || progress.steps[0];
  if (!next) return;
  try {
    const saved = localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const list = Array.isArray(current) ? current : [];
    const slip = {
      id: `first-win-guide-${next.key}-${Date.now()}`,
      group: 'First Win Guide',
      title: `Help finish the first real job flow: ${next.title}`,
      info: `${progress.percent || 0}% complete · ${next.time || '1 min'}`,
      urgency: 'High',
      found: `The new owner has not finished: ${next.title}.`,
      prepared: `Churvox prepared the next action: ${next.action}.`,
      why: next.why || 'A new owner should reach a useful result before configuring everything.',
      owner: 'Open the step, complete it, or mark it done if it has already been handled.',
      area: 'First Win Guide',
      page: 'firstrun',
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...list].slice(0, 80)));
    window.dispatchEvent(new CustomEvent('churvox:fresh-data-updated', { detail: { type: 'first-win-guide' } }));
  } catch {}
  go('command');
}

async function markDone(stepKey) {
  if (!stepKey) return;
  try { await api(`/onboarding/step/${encodeURIComponent(stepKey)}/done`, { method: 'POST' }); } catch {}
  await renderGuide(true);
}

async function hideGuide() {
  try { await api('/onboarding/state', { method: 'POST', body: JSON.stringify({ dismissed: true }) }); } catch {}
  try {
    localStorage.removeItem(FIRST_SETUP_KEY);
    localStorage.removeItem(PLAN_REQUIRED_KEY);
  } catch {}
  document.body.classList.remove('cvxFirstWinGuideMode');
  document.getElementById(ROOT_ID)?.remove();
  go('today');
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body.cvxFirstWinGuideMode .cvxWorkspace{display:block!important;overflow:auto!important;padding:18px!important;background:#f7f3ea!important}
    body.cvxFirstWinGuideMode .cvxWorkspace>.cvxPage{display:none!important}
    #${ROOT_ID}{font-family:inherit;color:#0f172a;max-width:1180px;margin:0 auto 24px}
    #${ROOT_ID} *{box-sizing:border-box}
    .fwGuideShell{position:relative;overflow:hidden;border:1px solid #fed7aa;border-radius:34px;background:linear-gradient(135deg,#ffffff 0%,#fff7ed 50%,#f8fafc 100%);box-shadow:0 24px 80px rgba(15,23,42,.1)}
    .fwGuideShell:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 92% 8%,rgba(249,115,22,.2),transparent 28%),linear-gradient(90deg,rgba(15,23,42,.045) 1px,transparent 1px);background-size:auto,48px 48px;pointer-events:none}
    .fwGuideInner{position:relative;display:grid;gap:18px;padding:24px}
    .fwGuideHero{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:20px;align-items:center}
    .fwGuideHero span.kicker{display:inline-flex;width:max-content;border:1px solid #fed7aa;background:#fff7ed;color:#c2410c;border-radius:999px;padding:7px 12px;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.12em}
    .fwGuideHero h1{margin:12px 0 8px;color:#0f172a;font-size:clamp(36px,6vw,72px);line-height:.9;letter-spacing:-.08em;font-weight:1000}
    .fwGuideHero p{max-width:760px;margin:0;color:#475569;font-size:15px;line-height:1.65;font-weight:780}
    .fwGuideProgress{justify-self:end;display:grid;place-items:center;width:176px;height:176px;border-radius:40px;border:1px solid #fed7aa;background:#fff;box-shadow:0 18px 48px rgba(15,23,42,.08)}
    .fwGuideProgress b{font-size:48px;letter-spacing:-.08em;color:#0f172a}.fwGuideProgress small{margin-top:-24px;color:#64748b;font-weight:900;text-align:center}
    .fwBar{height:12px;border-radius:999px;background:#e2e8f0;overflow:hidden}.fwBar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#f97316,#0f172a)}
    .fwNext{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;border:1px solid #fed7aa;background:#fff;border-radius:28px;padding:18px;box-shadow:0 18px 48px rgba(15,23,42,.06)}
    .fwNext small{color:#c2410c;text-transform:uppercase;letter-spacing:.12em;font-weight:950}.fwNext h2{margin:8px 0;color:#0f172a;font-size:28px;line-height:1;font-weight:1000;letter-spacing:-.05em}.fwNext p{margin:0;color:#475569;font-weight:760;line-height:1.55}.fwNext em{display:block;margin-top:10px;color:#64748b;font-style:normal;font-size:13px;font-weight:850}
    .fwActions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}.fwActions button,.fwFooter button{border:1px solid #e2e8f0;background:#fff;color:#0f172a;border-radius:16px;padding:12px 15px;font-weight:950;cursor:pointer}.fwActions button.primary{background:linear-gradient(135deg,#f97316,#111827);color:#fff;border-color:transparent}.fwActions button.command{border-color:#fed7aa;background:#fff7ed;color:#c2410c}
    .fwSteps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.fwStep{border:1px solid #e2e8f0;background:#fff;border-radius:22px;padding:14px;min-height:130px;box-shadow:0 12px 30px rgba(15,23,42,.04)}.fwStep.active{border-color:#fb923c;background:#fff7ed}.fwStep.done{border-color:#bbf7d0;background:#f0fdf4}.fwStep strong{display:grid;place-items:center;width:32px;height:32px;border-radius:12px;background:#0f172a;color:#fff;font-weight:1000}.fwStep.done strong{background:#16a34a}.fwStep b{display:block;margin-top:12px;color:#0f172a;font-size:14px;line-height:1.15}.fwStep small{display:block;margin-top:8px;color:#64748b;font-size:12px;font-weight:800;line-height:1.35}
    .fwGuideDeep{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.fwGuideDeep article{border:1px solid #e2e8f0;background:#fff;border-radius:24px;padding:16px}.fwGuideDeep b{color:#0f172a}.fwGuideDeep p{margin:7px 0 0;color:#64748b;font-size:13px;font-weight:750;line-height:1.5}
    .fwFooter{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.fwFooter button.danger{color:#991b1b;border-color:#fecaca;background:#fef2f2}
    @media(max-width:980px){.fwGuideHero,.fwNext{grid-template-columns:1fr}.fwGuideProgress{justify-self:start;width:150px;height:150px}.fwSteps,.fwGuideDeep{grid-template-columns:1fr 1fr}.fwActions{justify-content:flex-start}}
    @media(max-width:640px){.fwGuideInner{padding:16px}.fwSteps,.fwGuideDeep{grid-template-columns:1fr}.fwGuideHero h1{font-size:42px}.fwActions button,.fwFooter button{width:100%}}
  `;
  document.head.appendChild(style);
}

function render(progress) {
  const root = document.getElementById(ROOT_ID);
  if (!root) return;
  const next = progress.next_step || progress.steps.find((s) => !s.done);
  const doneText = progress.completed ? 'First job flow ready' : `${progress.done || 0}/${progress.total || progress.steps.length} useful steps done`;
  root.innerHTML = `
    <section class="fwGuideShell">
      <div class="fwGuideInner">
        <div class="fwGuideHero">
          <div>
            <span class="kicker">Your first useful result</span>
            <h1>${progress.completed ? 'Your first Churvox job flow is ready.' : 'Let’s get one real job organised.'}</h1>
            <p>${safe(progress.message || 'Add one real client, organise one real job and see what Churvox prepares. You do not need to configure the whole business first.')}</p>
          </div>
          <div class="fwGuideProgress"><b>${progress.percent || 0}%</b><small>${safe(doneText)}</small></div>
        </div>
        <div class="fwBar"><i style="width:${Math.max(0, Math.min(progress.percent || 0, 100))}%"></i></div>
        ${next ? `<div class="fwNext"><div><small>One clear next step · ${safe(next.time || '1 min')}</small><h2>${safe(next.title)}</h2><p>${safe(next.why)}</p><em>${safe(next.proof || '')}</em></div><div class="fwActions"><button type="button" class="primary" data-fw-open="${safe(next.page)}">${safe(next.action || 'Open step')}</button><button type="button" data-fw-done="${safe(next.key)}">I’ve done this</button><button type="button" class="command" data-fw-command="1">Ask Command to hold it</button></div></div>` : `<div class="fwNext"><div><small>First useful result complete</small><h2>Nice — one real job has shown you the Churvox loop.</h2><p>Next, run that job through completion and payment, or open Today and work from the owner control room.</p></div><div class="fwActions"><button type="button" class="primary" data-fw-open="today">Open Today</button><button type="button" data-fw-open="command">Open Command</button></div></div>`}
        <div class="fwSteps">${progress.steps.map((step, index) => `<article class="fwStep ${step.done ? 'done' : ''} ${next && step.key === next.key ? 'active' : ''}"><strong>${step.done ? '✓' : index + 1}</strong><b>${safe(step.title)}</b><small>${safe(step.done ? 'Done' : step.proof || step.time || 'Waiting')}</small></article>`).join('')}</div>
        <div class="fwGuideDeep">
          <article><b>What you will see</b><p>A client request becomes a job, the job becomes completed work and the completed work becomes prepared admin.</p></article>
          <article><b>What you can ignore for now</b><p>Advanced settings, integrations and every optional business field. They can be handled after the first useful result.</p></article>
          <article><b>What stays controlled</b><p>Nothing sends, charges, pays, syncs or files tax without the owner choosing the action.</p></article>
        </div>
        <div class="fwFooter"><button type="button" data-fw-refresh="1">Refresh progress</button><button type="button" class="danger" data-fw-hide="1">Continue without guide</button></div>
      </div>
    </section>
  `;
  root.__fwProgress = progress;
}

async function renderGuide(force = false) {
  normaliseToGuidePath();
  if (!wantsGuide() && !force) {
    document.body.classList.remove('cvxFirstWinGuideMode');
    document.getElementById(ROOT_ID)?.remove();
    return;
  }
  installStyle();
  const workspace = document.querySelector('.cvxWorkspace');
  if (!workspace) return;
  document.body.classList.add('cvxFirstWinGuideMode');
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('section');
    root.id = ROOT_ID;
    workspace.insertBefore(root, workspace.firstChild);
  }
  root.innerHTML = '<section class="fwGuideShell"><div class="fwGuideInner"><div class="fwNext"><div><small>Loading</small><h2>Finding your next useful step…</h2><p>Checking the real business records already in Churvox.</p></div></div></div></section>';
  render(await loadProgress());
}

function installEvents() {
  document.addEventListener('click', (event) => {
    const open = event.target.closest('[data-fw-open]');
    if (open) { go(open.getAttribute('data-fw-open') || 'today'); return; }
    const done = event.target.closest('[data-fw-done]');
    if (done) { markDone(done.getAttribute('data-fw-done')); return; }
    const command = event.target.closest('[data-fw-command]');
    if (command) { sendToCommand(document.getElementById(ROOT_ID)?.__fwProgress || prepare(fallbackProgress())); return; }
    const refresh = event.target.closest('[data-fw-refresh]');
    if (refresh) { renderGuide(true); return; }
    const hide = event.target.closest('[data-fw-hide]');
    if (hide) { hideGuide(); }
  });
}

function schedule() {
  [0, 250, 800, 1600, 3000].forEach((delay) => setTimeout(() => renderGuide(false), delay));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  installEvents();
  normaliseToGuidePath();
  schedule();
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  setInterval(() => { if (wantsGuide()) renderGuide(false); }, 2500);
}
