// Automatic Command preparation notice.
// Churvox prepares uncertain work in Command. Pages do not ask the owner to send it.

const QUEUE_KEY = 'churvox.command.prepared.v1';
const NOTICE_ID = 'churvox-auto-command-notice';
const STYLE_ID = 'churvox-auto-command-notice-style';
const PAGES = ['jobs','clients','quotes','invoices','workers','team','payroll','xero','settings','plans','support','messages','aiguide'];

function pageKey() {
  return String(window.location.hash || '').replace('#', '').toLowerCase() || 'aiguide';
}

function readItems() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]').filter(Boolean); } catch (_) { return []; }
}

function writeItems(items) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(0, 25))); } catch (_) {}
}

function addPrepared(page, title, note) {
  const key = `${page}:${title}`.toLowerCase();
  const items = readItems();
  if (items.some((item) => item.key === key && !/approved|parked/i.test(item.status || ''))) return;
  const item = {
    id: `auto-${Date.now()}`,
    key,
    title,
    sourcePage: page,
    status: 'Waiting owner approval',
    note,
    createdAt: new Date().toISOString(),
  };
  writeItems([item, ...items]);
  window.dispatchEvent(new CustomEvent('churvox:command-prepared', { detail: item }));
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${NOTICE_ID}{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid rgba(239,85,60,.18);border-radius:14px;background:#fff7f0;color:#111815;padding:10px 12px;box-shadow:0 10px 22px rgba(16,21,19,.05);font:900 12px Inter,system-ui,sans-serif}
    #${NOTICE_ID} b{font-weight:950;color:#111815}
    #${NOTICE_ID} span{color:#52605a;font-weight:850}
    #${NOTICE_ID} button{border:0;border-radius:999px;background:#111815;color:#fff;padding:7px 11px;font-weight:950}
  `;
  document.head.appendChild(style);
}

function pageChecks(page) {
  const text = document.querySelector('.churvoxOptionC .workspace')?.textContent || '';
  const checks = [];
  if (/missing|not set|pick date|pick time|\$0\.00|needs check|incomplete/i.test(text)) checks.push('Missing detail highlighted');
  if (/proof|photo|worker note|completion/i.test(text)) checks.push('Proof or worker note needs review');
  if (/draft|invoice|sync|paid|overdue/i.test(text)) checks.push('Money or sync item prepared');
  if (!checks.length && ['jobs','quotes','invoices','clients'].includes(page)) checks.push('Record checked by Churvox');
  return checks.slice(0, 3);
}

function mountNotice(page, count) {
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root || page === 'command') return;
  installStyle();
  let node = document.getElementById(NOTICE_ID);
  if (!node) { node = document.createElement('section'); node.id = NOTICE_ID; root.prepend(node); }
  node.innerHTML = `<div><b>Churvox checked this page.</b><br><span>${count} prepared item${count === 1 ? '' : 's'} already waiting in Command if owner approval is needed.</span></div><button type="button" data-auto-command-open>Open Command</button>`;
}

function run() {
  const page = pageKey();
  if (!PAGES.includes(page) || page === 'command') return;
  const checks = pageChecks(page);
  checks.forEach((title) => addPrepared(page, title, 'Churvox prepared what it could and placed the owner decision in Command.'));
  mountNotice(page, checks.length);
}

function click(event) {
  if (!event.target?.closest?.('[data-auto-command-open]')) return;
  event.preventDefault();
  window.history.replaceState({}, document.title, '/dashboard#command');
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_AUTO_COMMAND_QUEUE__) {
  window.__CHURVOX_AUTO_COMMAND_QUEUE__ = true;
  window.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  window.addEventListener('hashchange', () => setTimeout(run, 120));
  window.addEventListener('popstate', () => setTimeout(run, 120));
  document.addEventListener('click', click, true);
  setInterval(run, 1500);
  run();
}

export {};