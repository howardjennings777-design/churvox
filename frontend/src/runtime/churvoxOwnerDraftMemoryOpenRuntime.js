// Owner draft memory open runtime.
// Lets recently prepared draft cards open as review slips without rewriting the existing panel.

import './churvoxGuideCommandAssuranceRuntime';
import './churvoxOwnerCorePagesCleanRuntime';
import './churvoxOwnerSoftTidyRuntime';
import './churvoxOwnerHashNormalizeRuntime';
import './churvoxOwnerPagesLiteCleanRuntime';

const PANEL_ID = 'churvox-owner-draft-memory-panel';
const MODAL_ID = 'churvox-owner-draft-open-modal';
const STYLE_ID = 'churvox-owner-draft-open-style';
const STORE_KEY = 'churvox.owner.createDrafts.v1';

function pageKey() {
  const hash = String(window.location.hash || '').replace('#', '').toLowerCase();
  if (hash === 'command') return 'command';
  if (['jobs', 'clients', 'quotes', 'invoices'].includes(hash)) return hash;
  return '';
}

function readDrafts() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]').filter(Boolean); } catch (_) { return []; }
}

function writeDrafts(drafts) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(drafts.slice(0, 12))); } catch (_) {}
}

function visibleDrafts() {
  const page = pageKey();
  const all = readDrafts();
  if (page === 'command') return all.filter((draft) => /command/i.test(draft.status || '')).slice(0, 4);
  return all.filter((draft) => draft.page === page).slice(0, 4);
}

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PANEL_ID} .draft{cursor:pointer!important;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease!important}
    #${PANEL_ID} .draft:hover{transform:translateY(-1px)!important;border-color:rgba(239,85,60,.35)!important;box-shadow:0 14px 28px rgba(16,21,19,.08)!important}
    #${MODAL_ID}{position:fixed;inset:0;z-index:1000003;display:none;place-items:center;background:rgba(16,21,19,.5);padding:18px}
    #${MODAL_ID}.open{display:grid}
    #${MODAL_ID} .box{width:min(960px,96vw);max-height:92vh;overflow:auto;border-radius:24px;background:#f7f8f4;color:#111815;box-shadow:0 30px 90px rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.62)}
    #${MODAL_ID} .head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 20px;background:linear-gradient(115deg,#101513,#202a26 70%,#ef553c);color:#fff}
    #${MODAL_ID} .head small{display:block;color:#ffd7c6;font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
    #${MODAL_ID} .head h2{margin:4px 0;color:#fff;font-size:28px;line-height:1;font-weight:950}
    #${MODAL_ID} .head p{margin:0;color:rgba(255,255,255,.82);font-weight:850}
    #${MODAL_ID} .close{border:0;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;width:34px;height:34px;font-size:22px}
    #${MODAL_ID} .body{display:grid;gap:14px;padding:18px 20px}
    #${MODAL_ID} .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    #${MODAL_ID} label{display:grid;gap:5px;font-size:10px;text-transform:uppercase;color:#52605a;font-weight:950}
    #${MODAL_ID} input,#${MODAL_ID} textarea{width:100%;border:1px solid rgba(16,21,19,.12);border-radius:12px;background:#fff;color:#111815;padding:10px;font-weight:850;text-transform:none}
    #${MODAL_ID} .actions{display:flex;gap:8px;flex-wrap:wrap}
    #${MODAL_ID} .actions button{border:0;border-radius:999px;min-height:36px;padding:8px 14px;background:#111815;color:#fff;font-weight:950}
    #${MODAL_ID} .actions button:nth-child(2){background:#ef553c}
    #${MODAL_ID} .actions button:nth-child(3){background:#e4e7e7;color:#111815}
    @media(max-width:620px){#${MODAL_ID} .grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function openDraft(draft) {
  installStyle();
  let modal = document.getElementById(MODAL_ID);
  if (!modal) { modal = document.createElement('div'); modal.id = MODAL_ID; document.body.appendChild(modal); }
  const values = draft.values || {};
  const rows = Object.entries(values).map(([key, value]) => {
    const long = /note|scope|line items|proof|access|rule/i.test(key);
    return `<label>${esc(key)}${long ? `<textarea rows="3">${esc(value)}</textarea>` : `<input value="${esc(value)}" />`}</label>`;
  }).join('');
  modal.dataset.draftId = draft.id;
  modal.innerHTML = `<section class="box"><div class="head"><div><small>${esc(draft.page || 'draft')}</small><h2>${esc(draft.title || 'Prepared draft')}</h2><p>${esc(draft.status || 'Ready for owner review')}</p></div><button type="button" class="close" data-draft-open-close>×</button></div><div class="body"><div class="grid">${rows}</div><div class="actions"><button type="button" data-draft-open-keep>Keep draft</button><button type="button" data-draft-open-command>Send to Command</button><button type="button" data-draft-open-remove>Remove</button><button type="button" data-draft-open-close>Close</button></div></div></section>`;
  modal.classList.add('open');
}

function setStatus(id, status) {
  writeDrafts(readDrafts().map((draft) => draft.id === id ? { ...draft, status, savedAt: new Date().toISOString() } : draft));
  window.dispatchEvent(new CustomEvent('churvox:owner-draft-saved'));
}

function removeDraft(id) {
  writeDrafts(readDrafts().filter((draft) => draft.id !== id));
  window.dispatchEvent(new CustomEvent('churvox:owner-draft-saved'));
}

function clickHandler(event) {
  installStyle();
  const panel = document.getElementById(PANEL_ID);
  const card = event.target?.closest?.(`#${PANEL_ID} .draft`);
  if (card && panel) {
    event.preventDefault();
    event.stopPropagation();
    const cards = Array.from(panel.querySelectorAll('.draft'));
    const draft = visibleDrafts()[cards.indexOf(card)];
    if (draft) openDraft(draft);
    return;
  }
  const modal = document.getElementById(MODAL_ID);
  if (!modal?.classList.contains('open')) return;
  const id = modal.dataset.draftId;
  if (event.target === modal || event.target.closest('[data-draft-open-close]')) { modal.classList.remove('open'); return; }
  if (event.target.closest('[data-draft-open-keep]')) { setStatus(id, 'Saved draft'); modal.classList.remove('open'); return; }
  if (event.target.closest('[data-draft-open-command]')) {
    setStatus(id, 'Sent to Command');
    modal.classList.remove('open');
    window.history.replaceState({}, document.title, '/dashboard#command');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  if (event.target.closest('[data-draft-open-remove]')) { removeDraft(id); modal.classList.remove('open'); }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_DRAFT_OPEN__) {
  window.__CHURVOX_OWNER_DRAFT_OPEN__ = true;
  document.addEventListener('click', clickHandler, true);
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') document.getElementById(MODAL_ID)?.classList.remove('open'); });
  window.addEventListener('load', installStyle);
  installStyle();
}

export {};