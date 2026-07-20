import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_FIRST_WIN_FEEDBACK_RUNTIME__';
const ROOT_ID = 'churvox-first-win-feedback';
const STYLE_ID = 'churvox-first-win-feedback-style';
const SEEN_KEY = 'churvox:first-win-feedback-seen:v1';
const API_ROOT = String(API_BASE || '').replace(/\/$/, '');
const MILESTONES = ['first_client', 'first_job', 'first_invoice', 'command_approval', 'first_payment'];
let timer = null;

function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function token() { try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch { return ''; } }
function headers() { const value = token(); return { Accept: 'application/json', 'Content-Type': 'application/json', ...(value ? { Authorization: `Bearer ${value}` } : {}) }; }
function isOwnerApp() { const path = String(window.location.pathname || '').toLowerCase(); return path === '/dashboard' || path.startsWith('/dashboard') || ['/guide', '/setup', '/setup-guide', '/plans'].includes(path); }
function seen() { try { const value = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; } }
function markSeen(key) { try { const value = seen(); value[key] = new Date().toISOString(); localStorage.setItem(SEEN_KEY, JSON.stringify(value)); } catch {} }

async function api(path, options = {}) {
  const response = await fetch(`${API_ROOT}/api${path}`, { credentials: 'include', ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || 'Could not save feedback');
  return body;
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{position:fixed;right:18px;bottom:18px;z-index:2147483000;font-family:inherit;color:#0f172a}
    #${ROOT_ID} *{box-sizing:border-box}
    .fwfPill{border:1px solid #fed7aa;background:#fff;color:#c2410c;border-radius:999px;padding:10px 14px;font-weight:900;box-shadow:0 12px 34px rgba(15,23,42,.14);cursor:pointer}
    .fwfCard{width:min(420px,calc(100vw - 24px));border:1px solid #fed7aa;border-radius:24px;background:#fff;box-shadow:0 24px 80px rgba(15,23,42,.22);overflow:hidden}
    .fwfHead{padding:18px;background:linear-gradient(135deg,#fff7ed,#fff,#f8fafc)}.fwfHead small{color:#c2410c;font-weight:950;text-transform:uppercase;letter-spacing:.1em}.fwfHead h3{margin:7px 0 5px;font-size:24px;letter-spacing:-.04em}.fwfHead p{margin:0;color:#64748b;font-weight:700;line-height:1.45}
    .fwfBody{padding:16px;display:grid;gap:12px}.fwfChoices{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.fwfChoices button{border:1px solid #e2e8f0;background:#fff;border-radius:14px;padding:12px 8px;font-weight:900;cursor:pointer}.fwfChoices button[data-fwf-choice="easy"]{border-color:#bbf7d0;background:#f0fdf4}.fwfChoices button[data-fwf-choice="confusing"]{border-color:#fde68a;background:#fffbeb}.fwfChoices button[data-fwf-choice="stuck"]{border-color:#fecaca;background:#fef2f2}
    .fwfNote{display:none;gap:9px}.fwfNote.open{display:grid}.fwfNote textarea{width:100%;min-height:88px;border:1px solid #cbd5e1;border-radius:14px;padding:11px;font:inherit}.fwfNote button{border:0;border-radius:14px;background:linear-gradient(135deg,#f97316,#111827);color:#fff;padding:11px 13px;font-weight:950;cursor:pointer}
    .fwfFooter{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:0 16px 16px}.fwfFooter button{border:0;background:transparent;color:#64748b;font-weight:850;cursor:pointer}.fwfFooter span{color:#64748b;font-size:12px;font-weight:750}.fwfStatus{color:#475569;font-size:12px;font-weight:800}
    @media(max-width:560px){#${ROOT_ID}{right:8px;bottom:8px}.fwfChoices{grid-template-columns:1fr}.fwfCard{width:calc(100vw - 16px)}}
  `;
  document.head.appendChild(style);
}

function labelFor(step = {}) {
  const map = {
    first_client: ['Your first client is in', 'Adding the client'],
    first_job: ['Your first job is ready', 'Creating the job'],
    first_invoice: ['Your first invoice is prepared', 'Preparing the invoice'],
    command_approval: ['Your first Command approval is done', 'Using Command'],
    first_payment: ['Your first payment is confirmed', 'Getting the invoice paid'],
    general: ['How is Churvox going?', 'Using this screen'],
  };
  return map[step.key] || [step.title || map.general[0], step.title || map.general[1]];
}

function renderPrompt(step = { key: 'general' }, forced = false) {
  installStyle();
  document.getElementById(ROOT_ID)?.remove();
  const labels = labelFor(step);
  const root = document.createElement('section');
  root.id = ROOT_ID;
  root.dataset.step = step.key || 'general';
  root.dataset.forced = forced ? '1' : '0';
  root.innerHTML = `
    <div class="fwfCard">
      <div class="fwfHead"><small>Quick feedback</small><h3>${esc(labels[0])}</h3><p>Was that easy? One tap helps us fix what actually matters.</p></div>
      <div class="fwfBody">
        <div class="fwfChoices">
          <button type="button" data-fwf-choice="easy">Yes, easy</button>
          <button type="button" data-fwf-choice="confusing">A little confusing</button>
          <button type="button" data-fwf-choice="stuck">I got stuck</button>
        </div>
        <div class="fwfNote"><textarea data-fwf-note placeholder="What felt confusing or where did you get stuck?"></textarea><button type="button" data-fwf-send>Send feedback</button></div>
        <div class="fwfStatus" aria-live="polite"></div>
      </div>
      <div class="fwfFooter"><button type="button" data-fwf-later>Ask me later</button><span>Support stays by email.</span></div>
    </div>`;
  root.__step = { ...step, actionLabel: labels[1] };
  document.body.appendChild(root);
}

function renderPill() {
  if (document.getElementById(ROOT_ID)) return;
  installStyle();
  const root = document.createElement('section');
  root.id = ROOT_ID;
  root.innerHTML = '<button type="button" class="fwfPill" data-fwf-open>Give feedback</button>';
  document.body.appendChild(root);
}

async function submit(choice, note = '') {
  const root = document.getElementById(ROOT_ID);
  const step = root?.__step || { key: 'general', title: 'General feedback', actionLabel: 'Using Churvox' };
  const status = root?.querySelector('.fwfStatus');
  if (status) status.textContent = 'Saving…';
  try {
    await api('/feedback/experience', {
      method: 'POST',
      body: JSON.stringify({
        choice,
        note,
        onboarding_step: step.key || 'general',
        action: step.actionLabel || step.title || 'Using Churvox',
        area: String(window.location.hash || window.location.pathname || 'app').replace(/^#/, ''),
        route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        device: navigator.userAgent,
        source: 'in_app_first_win',
      }),
    });
    markSeen(step.key || 'general');
    if (status) status.textContent = 'Saved — thank you.';
    window.setTimeout(() => { root?.remove(); renderPill(); }, 900);
  } catch (error) {
    if (status) status.textContent = error?.message || 'Could not save. Try again.';
  }
}

function chooseMilestone(progress) {
  const already = seen();
  const steps = Array.isArray(progress?.steps) ? progress.steps : [];
  return steps.find((step) => {
    if (!MILESTONES.includes(step.key) || !step.done || already[step.key]) return false;
    try {
      const until = Number(localStorage.getItem(`${SEEN_KEY}:snooze:${step.key}`) || 0);
      if (until > Date.now()) return false;
    } catch {}
    return true;
  });
}

async function checkProgress() {
  if (!isOwnerApp() || !token()) return;
  try {
    const progress = await api('/onboarding/progress');
    const milestone = chooseMilestone(progress);
    if (milestone && !document.querySelector(`#${ROOT_ID} .fwfCard`)) renderPrompt(milestone, false);
    else if (!document.getElementById(ROOT_ID)) renderPill();
  } catch {
    if (!document.getElementById(ROOT_ID)) renderPill();
  }
}

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(checkProgress, 700);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-fwf-open]')) { document.getElementById(ROOT_ID)?.remove(); renderPrompt({ key: 'general', title: 'General feedback' }, true); return; }
    const choiceButton = event.target.closest('[data-fwf-choice]');
    if (choiceButton) {
      const choice = choiceButton.getAttribute('data-fwf-choice');
      if (choice === 'easy') submit('easy', '');
      else {
        const note = document.querySelector(`#${ROOT_ID} .fwfNote`);
        note?.classList.add('open');
        const status = document.querySelector(`#${ROOT_ID} .fwfStatus`);
        if (status) status.textContent = choice === 'stuck' ? 'Tell us where you got stuck.' : 'One sentence is enough.';
        const root = document.getElementById(ROOT_ID);
        if (root) root.dataset.choice = choice;
        note?.querySelector('textarea')?.focus();
      }
      return;
    }
    if (event.target.closest('[data-fwf-send]')) {
      const root = document.getElementById(ROOT_ID);
      submit(root?.dataset.choice || 'confusing', root?.querySelector('[data-fwf-note]')?.value || '');
      return;
    }
    if (event.target.closest('[data-fwf-later]')) {
      const root = document.getElementById(ROOT_ID);
      const key = root?.__step?.key || 'general';
      try { localStorage.setItem(`${SEEN_KEY}:snooze:${key}`, String(Date.now() + 86400000)); } catch {}
      root?.remove();
      renderPill();
    }
  }, true);
  schedule();
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox:fresh-data-updated', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  window.setInterval(checkProgress, 20000);
}

export {};
