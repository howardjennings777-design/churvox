// Prepared Command queue logic.
// Churvox prepares items. Anything needing owner approval appears in Command.

const STORE_KEY = 'churvox.command.prepared.v1';
const PANEL_ID = 'churvox-command-prepared-queue';
const STYLE_ID = 'churvox-command-prepared-queue-style';

function pageKey() { return String(window.location.hash || '').replace('#', '').toLowerCase() || 'aiguide'; }
function readItems() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]').filter(Boolean); } catch (_) { return []; } }
function writeItems(items) { try { localStorage.setItem(STORE_KEY, JSON.stringify(items.slice(0, 20))); } catch (_) {} }

function titleFromTarget(target) {
  const row = target.closest?.('[data-lite-slip],[data-core-slip],[data-gc-slip],[data-wm-slip],[data-more-slip]');
  const attr = row?.dataset?.liteSlip || row?.dataset?.coreSlip || row?.dataset?.gcSlip || row?.dataset?.wmSlip || row?.dataset?.moreSlip;
  return attr || target.textContent?.trim() || 'Prepared item';
}

function prepareItem(title, sourcePage) {
  const item = { id: `cmd-${Date.now()}-${Math.random().toString(16).slice(2)}`, title: title || 'Prepared item', sourcePage: sourcePage || pageKey(), status: 'Waiting owner approval', note: 'Churvox prepared this for owner review. You approve.', createdAt: new Date().toISOString() };
  writeItems([item, ...readItems()]);
  window.dispatchEvent(new CustomEvent('churvox:command-prepared', { detail: item }));
  return item;
}

function maybePrepareFromClick(event) {
  const button = event.target?.closest?.('button,[data-lite-command],[data-core-command],[data-gc-command],[data-wm-command],[data-more-command],[data-action-slip-choice="command"],[data-draft-open-command],[data-create-command]');
  if (!button) return;
  const text = String(button.textContent || '').toLowerCase();
  const isCommandReview = button.matches?.('[data-lite-command],[data-core-command],[data-gc-command],[data-wm-command],[data-more-command],[data-action-slip-choice="command"],[data-draft-open-command],[data-create-command]') || text.includes('review in command') || text.includes('open command') || text.includes('prepared in command');
  if (!isCommandReview) return;
  const page = pageKey();
  if (page === 'command') return;
  prepareItem(titleFromTarget(button), page);
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `#${PANEL_ID}{display:grid;gap:10px;border:1px solid rgba(239,85,60,.18);border-radius:17px;background:linear-gradient(135deg,#fff,#fff7f0);box-shadow:0 14px 30px rgba(16,21,19,.06);padding:14px;color:#111815}#${PANEL_ID} header{display:flex;justify-content:space-between;gap:12px;align-items:center}#${PANEL_ID} h3{margin:0;color:#111815;font-size:17px;font-weight:950}#${PANEL_ID} small{color:#64706b;font-size:11px;font-weight:900}#${PANEL_ID} .items{display:grid;gap:8px}#${PANEL_ID} .item{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;border:1px solid rgba(16,21,19,.08);border-radius:13px;background:#fff;padding:10px}#${PANEL_ID} b{display:block;color:#111815;font-size:13px;font-weight:950}#${PANEL_ID} span{display:block;color:#52605a;font-size:11px;font-weight:850;line-height:1.35}#${PANEL_ID} .actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}#${PANEL_ID} button{border:0;border-radius:999px;min-height:30px;padding:6px 10px;background:#111815;color:#fff;font-size:10px;font-weight:950}#${PANEL_ID} button:nth-child(2){background:#ef553c}#${PANEL_ID} button:nth-child(3){background:#e4e7e7;color:#111815}`;
  document.head.appendChild(style);
}

let lastHtml = '';
function mountPanel() {
  if (pageKey() !== 'command') { document.getElementById(PANEL_ID)?.remove(); lastHtml = ''; return; }
  const host = document.getElementById('churvox-owner-core-clean-layout') || document.getElementById('churvox-guide-command-proper-layout') || document.getElementById('churvox-owner-page-recovery') || document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!host) return;
  installStyle();
  let panel = document.getElementById(PANEL_ID);
  if (!panel) { panel = document.createElement('section'); panel.id = PANEL_ID; host.prepend(panel); lastHtml = ''; }
  const items = readItems().slice(0, 6);
  const rows = items.length ? items.map((item) => `<article class="item" data-command-id="${item.id}"><div><b>${item.title}</b><span>${item.status} · prepared from ${item.sourcePage}</span><span>${item.note}</span></div><div class="actions"><button data-command-approve>Approve</button><button data-command-edit>Edit</button><button data-command-park>Park</button></div></article>`).join('') : '<small>No prepared approval items yet.</small>';
  const html = `<header><div><h3>Prepared for Command</h3><small>Churvox prepares it here. You approve.</small></div><button type="button" data-command-clear>Clear done</button></header><div class="items">${rows}</div>`;
  if (html === lastHtml) return;
  lastHtml = html;
  panel.innerHTML = html;
}

function commandActions(event) {
  const panel = event.target?.closest?.(`#${PANEL_ID}`);
  if (!panel) return;
  const row = event.target.closest('[data-command-id]');
  if (event.target.closest('[data-command-clear]')) { writeItems(readItems().filter((x) => !/approved|parked/i.test(x.status || ''))); lastHtml = ''; mountPanel(); return; }
  if (!row) return;
  const id = row.dataset.commandId;
  const status = event.target.closest('[data-command-approve]') ? 'Approved by owner' : event.target.closest('[data-command-edit]') ? 'Editing in Command' : event.target.closest('[data-command-park]') ? 'Parked by owner' : '';
  if (!status) return;
  writeItems(readItems().map((item) => item.id === id ? { ...item, status } : item));
  lastHtml = '';
  mountPanel();
}

function run() { mountPanel(); }

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_COMMAND_PREPARED_QUEUE__) {
  window.__CHURVOX_COMMAND_PREPARED_QUEUE__ = true;
  document.addEventListener('click', maybePrepareFromClick, true);
  document.addEventListener('click', commandActions, true);
  window.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  window.addEventListener('hashchange', () => setTimeout(run, 120));
  window.addEventListener('churvox:command-prepared', () => setTimeout(run, 120));
  setInterval(run, 6000);
  run();
}

export {};
