// CHURVOX_PAID_LAUNCH_FIRST_RUN_SETUP_20260701
// Stronger first-run checklist for paid launch. Shows after signup/checkout/setup routes only.

const KEY = 'churvox_first_setup_pending';
const DONE_KEY = 'churvox:first-run-setup-dismissed';
const STYLE_ID = 'churvox-first-run-setup-style';
const ROOT_ID = 'churvox-first-run-setup';

const STEPS = [
  { label: 'Business details', href: '/dashboard#settings', text: 'Name, country, GST, email and basic controls.' },
  { label: 'Plan + billing', href: '/dashboard#plans', text: 'Confirm the selected tier and add-ons.' },
  { label: 'Add first client', href: '/dashboard#clients', text: 'Save contact details, address, service notes and price memory.' },
  { label: 'Add worker', href: '/dashboard#team', text: 'Invite staff or keep it owner-only for now.' },
  { label: 'Create first job', href: '/dashboard#jobs', text: 'Set client, worker, date, time, price and recurrence.' },
  { label: 'Quote or invoice', href: '/dashboard#quotes', text: 'Create the first money record from real job details.' },
  { label: 'Run Command sweep', href: '/dashboard#command', text: 'Let Churvox find missing admin that needs approval.' },
  { label: 'Accounting optional', href: '/dashboard#xero', text: 'Draft sync only. No tax filing. No payout files.' },
];

function isSetupRoute() {
  const path = String(window.location.pathname || '');
  const hash = String(window.location.hash || '');
  const search = String(window.location.search || '');
  return (
    localStorage.getItem(KEY) === 'true' ||
    /first_setup=1|must_choose_plan=1|checkout=saved|checkout=success|session_id=/.test(search) ||
    path === '/setup' ||
    path === '/setup-guide' ||
    path === '/plans' ||
    hash === '#firstrun' ||
    hash === '#setupassistant'
  );
}

function shouldShow() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (localStorage.getItem(DONE_KEY) === 'true') return false;
  return isSetupRoute();
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.48);backdrop-filter:blur(10px);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827}
    #${ROOT_ID} .panel{width:min(1080px,100%);max-height:min(860px,calc(100vh - 28px));overflow:auto;border:1px solid rgba(15,23,42,.12);border-radius:30px;background:radial-gradient(circle at top left,rgba(249,115,22,.15),transparent 26rem),#fff;box-shadow:0 34px 110px rgba(15,23,42,.32)}
    #${ROOT_ID} header{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:start;padding:24px;border-bottom:1px solid rgba(15,23,42,.08)}
    #${ROOT_ID} small.kicker{display:inline-flex;width:max-content;border-radius:999px;background:#ffedd5;color:#c2410c;padding:7px 10px;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.14em}
    #${ROOT_ID} h2{margin:12px 0 8px;font-size:clamp(32px,5vw,58px);line-height:.92;letter-spacing:-.08em;color:#111827}
    #${ROOT_ID} p{margin:0;color:#475569;font-size:15px;line-height:1.55;font-weight:780}
    #${ROOT_ID} .close{width:40px;height:40px;border:0;border-radius:999px;background:#f1f5f9;color:#334155;font-size:24px;font-weight:1000;cursor:pointer}
    #${ROOT_ID} .body{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:18px;padding:18px 24px 24px}
    #${ROOT_ID} .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    #${ROOT_ID} a.step{display:grid;gap:6px;min-height:96px;border:1px solid rgba(15,23,42,.10);border-radius:20px;background:#fff;color:#111827;text-decoration:none;padding:14px;box-shadow:0 12px 28px rgba(15,23,42,.06)}
    #${ROOT_ID} a.step b{font-size:16px;letter-spacing:-.03em}
    #${ROOT_ID} a.step span{color:#64748b;font-size:13px;font-weight:780;line-height:1.35}
    #${ROOT_ID} a.step:first-child,#${ROOT_ID} a.step:nth-child(7){background:#111827;color:#fff}
    #${ROOT_ID} a.step:first-child span,#${ROOT_ID} a.step:nth-child(7) span{color:#fed7aa}
    #${ROOT_ID} aside{display:grid;gap:12px;align-content:start}
    #${ROOT_ID} .support,#${ROOT_ID} .rules{border:1px solid rgba(15,23,42,.10);border-radius:22px;background:#fff7ed;padding:16px;box-shadow:0 12px 28px rgba(15,23,42,.05)}
    #${ROOT_ID} .rules{background:#f8fafc}
    #${ROOT_ID} .support b,#${ROOT_ID} .rules b{display:block;margin-bottom:7px;font-size:17px;letter-spacing:-.035em}
    #${ROOT_ID} .support a,#${ROOT_ID} .rules a{display:inline-flex;margin-top:10px;border-radius:999px;background:#f97316;color:#111827;text-decoration:none;padding:10px 13px;font-weight:1000;font-size:13px}
    #${ROOT_ID} .done{border:0;border-radius:999px;background:#111827;color:#fff;padding:12px 16px;font-weight:1000;cursor:pointer;width:100%}
    @media(max-width:860px){#${ROOT_ID}{padding:10px;place-items:end center}#${ROOT_ID} .panel{max-height:calc(100vh - 20px);border-radius:24px}#${ROOT_ID} header{padding:18px}#${ROOT_ID} .body{grid-template-columns:1fr;padding:12px 18px 18px}#${ROOT_ID} .grid{grid-template-columns:1fr}#${ROOT_ID} a.step{min-height:78px}#${ROOT_ID} h2{font-size:36px}}
  `;
  document.head.appendChild(style);
}

function close() {
  try {
    localStorage.setItem(DONE_KEY, 'true');
    localStorage.removeItem(KEY);
  } catch {}
  document.getElementById(ROOT_ID)?.remove();
}

function startDashboard() {
  try { localStorage.removeItem(KEY); } catch {}
  window.location.href = '/dashboard';
}

function render() {
  if (!shouldShow()) {
    document.getElementById(ROOT_ID)?.remove();
    return;
  }
  ensureStyle();
  let node = document.getElementById(ROOT_ID);
  if (!node) {
    node = document.createElement('aside');
    node.id = ROOT_ID;
    document.body.appendChild(node);
  }
  node.innerHTML = `
    <section class="panel" role="dialog" aria-modal="true" aria-label="Churvox setup checklist">
      <header>
        <div>
          <small class="kicker">Paid launch setup</small>
          <h2>Get Churvox ready before real work starts.</h2>
          <p>Set up the basics once. After that, jobs, workers, messages, quotes and invoices can flow into Command for owner approval.</p>
        </div>
        <button class="close" type="button" aria-label="Close setup">×</button>
      </header>
      <div class="body">
        <div class="grid">
          ${STEPS.map((step, index) => `<a class="step" href="${step.href}"><b>${index + 1}. ${step.label}</b><span>${step.text}</span></a>`).join('')}
        </div>
        <aside>
          <div class="rules"><b>Safe launch rules</b><p>Command owns approvals. Draft accounting sync only. No automatic invoice sending. No tax filing. No bank payout files.</p><a href="/security">Read trust page</a></div>
          <div class="support"><b>Need help setting up?</b><p>Email Churvox with your account email and what page you are on. Screenshots help.</p><a href="/contact">Contact support</a></div>
          <button class="done" type="button">I’ll set this up from Dashboard</button>
        </aside>
      </div>
    </section>`;
  node.querySelector('.close')?.addEventListener('click', close, { once: true });
  node.querySelector('.done')?.addEventListener('click', startDashboard, { once: true });
}

if (typeof window !== 'undefined' && !window.__CHURVOX_FIRST_RUN_SETUP__) {
  window.__CHURVOX_FIRST_RUN_SETUP__ = true;
  window.addEventListener('load', () => setTimeout(render, 500));
  window.addEventListener('hashchange', () => setTimeout(render, 160));
  window.addEventListener('popstate', () => setTimeout(render, 160));
  window.addEventListener('churvox-auth-refresh', () => setTimeout(render, 500));
  window.addEventListener('storage', () => setTimeout(render, 500));
  setInterval(render, 2200);
}

export {};
