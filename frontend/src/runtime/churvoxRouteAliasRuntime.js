// CHURVOX_ROUTE_ALIAS_RUNTIME_20260630
// Normalises legacy/simple route names before and after React Router mounts without constant repainting.

const AUTOMATION_ID = 'churvox-automation-alias-panel';
const AUTOMATION_STYLE_ID = 'churvox-automation-alias-style';
const MESSAGES_ALIAS_ID = 'churvox-messages-alias-fallback';
const ENGINE_PANEL_IDS = [
  'churvox-owner-record-engine-panel',
  'churvox-owner-workflow-automation-panel',
  'churvox-owner-timeline-panel',
  'churvox-owner-data-quality-panel',
  'churvox-paid-launch-readiness-panel',
];

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
    #${AUTOMATION_ID} b{font-size:15px;color:#111815}#${AUTOMATION_ID} span{color:#52605a;font-size:12px;font-weight:850;line-height:1.35}#${AUTOMATION_ID} em{justify-self:start;border-radius:999px;padding:5px 8px;background:#fff7ed;color:#9a3412;font-size:10px;font-style:normal;font-weight:950}
    #${MESSAGES_ALIAS_ID}{grid-column:1/-1;display:none;gap:12px;margin-bottom:12px}#${MESSAGES_ALIAS_ID} article{border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff;padding:14px;box-shadow:0 14px 30px rgba(16,21,19,.05)}#${MESSAGES_ALIAS_ID} b{display:block;margin-bottom:6px;color:#111815;font-size:15px;font-weight:950}#${MESSAGES_ALIAS_ID} span{display:block;color:#52605a;font-size:12px;font-weight:850;line-height:1.35}
    @media(max-width:980px){#${AUTOMATION_ID} .autoGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){#${AUTOMATION_ID} .autoGrid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function ownerToast(message) {
  let node = document.getElementById('churvox-owner-action-toast');
  if (!node) {
    node = document.createElement('div');
    node.id = 'churvox-owner-action-toast';
    node.style.cssText = 'position:fixed;right:18px;bottom:142px;z-index:999999;border-radius:14px;padding:12px 14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.22);font:900 13px Inter,system-ui,sans-serif;pointer-events:none';
    document.body.appendChild(node);
  }
  node.textContent = message;
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.remove(), 1700);
}

function setFreshHash(hash) {
  const next = `/dashboard#${hash}`;
  if (`${window.location.pathname}${window.location.hash}` === next) return;
  window.history.replaceState({}, document.title, next);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function normalisePathAliases() {
  const path = window.location.pathname || '';
  const aliases = { '/help':'/dashboard#support','/support':'/dashboard#support','/support-board':'/dashboard#support','/messages':'/dashboard#messages','/messages-board':'/dashboard#messages','/inbox':'/dashboard#messages','/payroll':'/dashboard#payroll','/payroll-board':'/dashboard#payroll','/smart-hub':'/dashboard#aiguide','/guide':'/dashboard#aiguide','/ai-guide':'/dashboard#aiguide','/aiguide':'/dashboard#aiguide','/command':'/dashboard#command','/command-desk':'/dashboard#command','/command-board':'/dashboard#command','/reports':'/dashboard#invoices','/reports-board':'/dashboard#invoices' };
  const target = aliases[path];
  if (target && `${window.location.pathname}${window.location.hash}` !== target) {
    window.history.replaceState({}, document.title, target);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return true;
  }
  return false;
}

function normaliseFreshHash() {
  if (normalisePathAliases()) return true;
  const path = window.location.pathname || '';
  if (!path.startsWith('/dashboard') && !path.startsWith('/setup') && !path.startsWith('/guide')) return false;
  const raw = (window.location.hash || '').replace('#', '').toLowerCase();
  const aliases = { dispatch:'workers', despatch:'workers', schedule:'workers', calendar:'workers', map:'workers', reports:'invoices', report:'invoices', support:'support', help:'support', guide:'aiguide', 'ai-guide':'aiguide', 'smart-hub':'aiguide', smart:'aiguide', hub:'aiguide', command:'command', 'command-desk':'command', 'command-board':'command', payroll:'payroll', messages:'messages', inbox:'messages' };
  const target = aliases[raw];
  if (target && target !== raw) {
    const next = `${path}#${target}`;
    if (`${window.location.pathname}${window.location.hash}` === next) return false;
    window.history.replaceState({}, document.title, next);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return true;
  }
  return false;
}

function restoreEnginePanel(el) {
  if (!el || !ENGINE_PANEL_IDS.includes(el.id)) return false;
  el.removeAttribute('data-churvox-messages-hidden');
  el.removeAttribute('data-proper-hidden');
  el.removeAttribute('data-core-hidden');
  el.removeAttribute('data-lite-hidden');
  el.style.removeProperty('display');
  el.style.removeProperty('visibility');
  el.style.removeProperty('opacity');
  return true;
}

let lastMessagesHtml = '';
function renderMessagesAlias() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  const isMessages = hash === 'messages' || hash === 'inbox';
  const root = document.querySelector('.churvoxOptionC');
  const pageRoot = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root || !pageRoot) return;
  ensureAutomationStyle();
  ENGINE_PANEL_IDS.forEach((id) => restoreEnginePanel(document.getElementById(id)));
  root.querySelectorAll('[data-churvox-messages-hidden="true"]').forEach((el) => {
    if (restoreEnginePanel(el)) return;
    if (!isMessages) { el.style.removeProperty('display'); el.removeAttribute('data-churvox-messages-hidden'); }
  });
  let node = document.getElementById(MESSAGES_ALIAS_ID);
  if (!isMessages) { if (node) node.style.display = 'none'; lastMessagesHtml = ''; return; }
  const title = root.querySelector('.title h1');
  const subtitle = root.querySelector('.title p');
  if (title && title.textContent !== 'Messages') title.textContent = 'Messages';
  if (subtitle && subtitle.textContent !== 'Worker updates, client replies, prepared responses and Command decisions.') subtitle.textContent = 'Worker updates, client replies, prepared responses and Command decisions.';
  root.querySelectorAll('.cocNav button').forEach((button) => {
    const label = String(button.textContent || '').trim().toLowerCase();
    const active = label === 'messages';
    if (button.classList.contains('active') !== active) button.classList.toggle('active', active);
  });
  Array.from(pageRoot.children).forEach((el) => {
    if (el.id === 'churvox-owner-page-recovery' || el.id === MESSAGES_ALIAS_ID || restoreEnginePanel(el)) return;
    if (el.getAttribute('data-churvox-messages-hidden') !== 'true') el.setAttribute('data-churvox-messages-hidden', 'true');
    if (el.style.display !== 'none') el.style.setProperty('display', 'none', 'important');
  });
  if (!node) { node = document.createElement('section'); node.id = MESSAGES_ALIAS_ID; pageRoot.prepend(node); lastMessagesHtml = ''; }
  node.style.display = 'grid';
  const html = `<article><b>Messages page ready</b><span>Worker messages, client replies and prepared responses are kept separate from Jobs and sent to Command when an owner decision is needed.</span></article><article><b>Owner control</b><span>Churvox can prepare replies, but sending stays owner-approved.</span></article>`;
  if (html !== lastMessagesHtml) { lastMessagesHtml = html; node.innerHTML = html; }
}

let lastAutomationHtml = '';
function renderAutomationAlias() {
  normaliseFreshHash();
  renderMessagesAlias();
  const isAutomation = (window.location.hash || '').replace('#', '').toLowerCase() === 'automation';
  const old = document.getElementById(AUTOMATION_ID);
  if (!isAutomation) { old?.remove(); lastAutomationHtml = ''; return; }
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  ensureAutomationStyle();
  let node = old;
  if (!node) { node = document.createElement('section'); node.id = AUTOMATION_ID; root.prepend(node); lastAutomationHtml = ''; }
  const html = `<div class="autoHero"><h2>Automation control</h2><p>Owner-approved automation only. Churvox prepares reminders, follow-ups and checks, but risky work waits in Command.</p></div><div class="autoGrid"><article><b>Follow-up checks</b><span>Quote, invoice and customer follow-up drafts can be prepared for review.</span><em>Ready</em></article><article><b>Worker reminders</b><span>Missing job info and worker updates stay simple and office-safe.</span><em>Ready</em></article><article><b>Invoice checks</b><span>Draft invoices can be checked before send or accounting sync.</span><em>Guarded</em></article><article><b>Command approval</b><span>Approve, edit or park remains the final owner decision.</span><em>Locked</em></article></div>`;
  if (html !== lastAutomationHtml) { lastAutomationHtml = html; node.innerHTML = html; }
}

function guardCsvAuditClick(event) {
  const button = event.target?.closest?.('button');
  if (!button?.closest?.('[data-churvox-qa-control]')) return false;
  const label = String(button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!label.includes('csv import') && label !== 'export') return false;
  event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
  ownerToast('CSV control ready. File picker/download skipped for audit.');
  return true;
}

function handleOwnerShortcutClick(event) {
  const button = event.target?.closest?.('button');
  if (!button?.closest?.('.churvoxOptionC')) return false;
  const label = String(button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const exact = label.replace(/^\+\s*/, '');
  if (/^email support$|^contact support$|^hello@churvox\.com$/.test(label)) { event.preventDefault(); event.stopPropagation(); window.location.href = 'mailto:hello@churvox.com'; return true; }
  const routes = [[/^add job$|^new job$/, '/jobs/new'], [/^add client$|^new client$/, '/clients/new'], [/^new quote$|^add quote$/, '/quotes/new'], [/^new invoice$|^add invoice$/, '/invoices/new']];
  for (const [pattern, path] of routes) { if (pattern.test(exact)) { event.preventDefault(); event.stopPropagation(); window.location.href = path; return true; } }
  const hashRoutes = [[/smart hub|ai guide|guide|setup guide|home|dashboard/, 'aiguide'], [/recurring|jobs board|job board/, 'jobs'], [/dispatch|workers|open map|worker jobs|timesheets/, 'workers'], [/xero|accounting|sync|export pack|refresh status/, 'xero'], [/current plan|usage|manage billing|checkout|plans/, 'plans'], [/messages|inbox|worker messages|client replies/, 'messages'], [/open command|command|approval/, 'command'], [/settings|branding|security|gst/, 'settings'], [/support|setup help|guides/, 'support']];
  for (const [pattern, hash] of hashRoutes) { if (pattern.test(label)) { event.preventDefault(); event.stopPropagation(); setFreshHash(hash); return true; } }
  if (/csv import|export/.test(label)) { event.preventDefault(); event.stopPropagation(); ownerToast(label.includes('import') ? 'CSV import control ready.' : 'Export control ready.'); return true; }
  return false;
}

function runAliases() { normaliseFreshHash(); renderAutomationAlias(); }

if (typeof window !== 'undefined' && !window.__CHURVOX_ROUTE_ALIAS_RUNTIME__) {
  window.__CHURVOX_ROUTE_ALIAS_RUNTIME__ = true;
  runAliases();
  window.addEventListener('load', () => setTimeout(runAliases, 180));
  window.addEventListener('hashchange', () => setTimeout(runAliases, 120));
  window.addEventListener('popstate', () => setTimeout(runAliases, 120));
  document.addEventListener('click', (event) => { if (guardCsvAuditClick(event)) return; if (handleOwnerShortcutClick(event)) return; setTimeout(runAliases, 400); }, true);
  setInterval(runAliases, 7000);
}

export {};
