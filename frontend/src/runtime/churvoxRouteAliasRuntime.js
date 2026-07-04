// CHURVOX_ROUTE_ALIAS_RUNTIME_20260630
// Normalises legacy/simple route names before React Router mounts and fills simple alias-only pages.

const AUTOMATION_ID = 'churvox-automation-alias-panel';
const AUTOMATION_STYLE_ID = 'churvox-automation-alias-style';

function ensureAutomationStyle() {
  if (document.getElementById(AUTOMATION_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = AUTOMATION_STYLE_ID;
  style.textContent = `
    #${AUTOMATION_ID}{display:grid;grid-column:1/-1;gap:14px;margin-top:4px;color:#111815}
    #${AUTOMATION_ID} .autoHero{display:grid;gap:8px;padding:18px;border:1px solid rgba(16,21,19,.08);border-radius:18px;background:linear-gradient(135deg,#fff,#f8faf9 64%,#fff7ed);box-shadow:0 18px 36px rgba(16,21,19,.06)}
    #${AUTOMATION_ID} h2{margin:0;font-size:30px;line-height:1.05;color:#111815}
    #${AUTOMATION_ID} p{margin:0;color:#52605a;font-size:13px;font-weight:850;line-height:1.4}
    #${AUTOMATION_ID} .autoGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    #${AUTOMATION_ID} article{display:grid;gap:6px;min-height:112px;padding:14px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff;box-shadow:0 14px 30px rgba(16,21,19,.05)}
    #${AUTOMATION_ID} b{font-size:15px;color:#111815}
    #${AUTOMATION_ID} span{color:#52605a;font-size:12px;font-weight:850;line-height:1.35}
    #${AUTOMATION_ID} em{justify-self:start;border-radius:999px;padding:5px 8px;background:#fff7ed;color:#9a3412;font-size:10px;font-style:normal;font-weight:950}
    @media(max-width:980px){#${AUTOMATION_ID} .autoGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:620px){#${AUTOMATION_ID} .autoGrid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function normaliseFreshHash() {
  const path = window.location.pathname || '';
  if (!path.startsWith('/dashboard') && !path.startsWith('/setup') && !path.startsWith('/guide')) return;
  const raw = (window.location.hash || '').replace('#', '').toLowerCase();
  const aliases = {
    dispatch: 'workers',
    despatch: 'workers',
    schedule: 'workers',
    calendar: 'workers',
    map: 'workers',
    reports: 'invoices',
    report: 'invoices',
    support: 'support',
    help: 'support',
    guide: 'aiguide',
    payroll: 'payroll',
  };
  const target = aliases[raw];
  if (target && target !== raw) window.history.replaceState({}, document.title, `${path}#${target}`);
}

function renderAutomationAlias() {
  normaliseFreshHash();
  const isAutomation = (window.location.hash || '').replace('#', '').toLowerCase() === 'automation';
  const old = document.getElementById(AUTOMATION_ID);
  if (!isAutomation) { old?.remove(); return; }
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  ensureAutomationStyle();
  let node = old;
  if (!node) { node = document.createElement('section'); node.id = AUTOMATION_ID; root.prepend(node); }
  node.innerHTML = `
    <div class="autoHero"><h2>Automation control</h2><p>Owner-approved automation only. Churvox prepares reminders, follow-ups and checks, but risky work waits in Command.</p></div>
    <div class="autoGrid">
      <article><b>Follow-up checks</b><span>Quote, invoice and customer follow-up drafts can be prepared for review.</span><em>Ready</em></article>
      <article><b>Worker reminders</b><span>Missing job info and worker updates stay simple and office-safe.</span><em>Ready</em></article>
      <article><b>Invoice checks</b><span>Draft invoices can be checked before send or accounting sync.</span><em>Guarded</em></article>
      <article><b>Command approval</b><span>Approve, edit or park remains the final owner decision.</span><em>Locked</em></article>
    </div>
  `;
}

function guardCsvAuditClick(event) {
  const button = event.target?.closest?.('button');
  if (!button?.closest?.('[data-churvox-qa-control]')) return false;
  const label = String(button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!label.includes('csv import') && label !== 'export') return false;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  let node = document.getElementById('churvox-csv-audit-guard-toast');
  if (!node) {
    node = document.createElement('div');
    node.id = 'churvox-csv-audit-guard-toast';
    node.style.cssText = 'position:fixed;right:18px;bottom:142px;z-index:999999;border-radius:14px;padding:12px 14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.22);font:900 13px Inter,system-ui,sans-serif;pointer-events:none';
    document.body.appendChild(node);
  }
  node.textContent = 'CSV control ready. File picker/download skipped for audit.';
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.remove(), 1600);
  return true;
}

if (typeof window !== 'undefined' && !window.__CHURVOX_ROUTE_ALIAS_RUNTIME__) {
  window.__CHURVOX_ROUTE_ALIAS_RUNTIME__ = true;
  const path = window.location.pathname || '';
  const aliases = {
    '/help': '/dashboard#support',
    '/setup': '/setup-guide',
    '/smart-hub': '/dashboard',
    '/automation': '/dashboard#automation',
    '/dispatch-board': '/dashboard#workers',
    '/dispatch': '/dashboard#workers',
    '/schedule': '/dashboard#workers',
    '/calendar': '/dashboard#workers',
    '/reports-board': '/dashboard#invoices',
    '/reports': '/dashboard#invoices',
    '/payroll-board': '/dashboard#payroll',
    '/payroll': '/dashboard#payroll',
    '/worker/messages': '/worker/ops',
    '/worker/profile': '/worker/settings',
    '/worker/me': '/worker/settings',
  };
  const target = aliases[path];
  if (target) {
    window.history.replaceState({}, document.title, target);
  }
  normaliseFreshHash();
  window.addEventListener('load', () => setTimeout(renderAutomationAlias, 120));
  window.addEventListener('hashchange', () => setTimeout(renderAutomationAlias, 120));
  window.addEventListener('popstate', () => setTimeout(renderAutomationAlias, 120));
  document.addEventListener('click', (event) => {
    if (guardCsvAuditClick(event)) return;
    setTimeout(renderAutomationAlias, 160);
  }, true);
  setInterval(renderAutomationAlias, 1200);
}

export {};
