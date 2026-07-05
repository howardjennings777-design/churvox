// Owner draft memory runtime.
// Shows locally captured create-route drafts back inside the owner workspace.

const PANEL_ID = 'churvox-owner-draft-memory-panel';
const STYLE_ID = 'churvox-owner-draft-memory-style';
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

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PANEL_ID}{grid-column:1/-1;display:grid;gap:8px;border:1px solid rgba(239,85,60,.18);border-radius:16px;background:linear-gradient(135deg,#fff,#fff8f4);box-shadow:0 14px 30px rgba(16,21,19,.06);padding:14px;margin-bottom:0;color:#111815}
    #${PANEL_ID} header{display:flex;justify-content:space-between;align-items:center;gap:12px}
    #${PANEL_ID} h3{margin:0;color:#111815;font-size:16px;font-weight:950}
    #${PANEL_ID} small{color:#64706b;font-size:11px;font-weight:900}
    #${PANEL_ID} .draftRows{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    #${PANEL_ID} .draft{border:1px solid rgba(16,21,19,.08);border-radius:13px;background:#fff;padding:10px;display:grid;gap:5px}
    #${PANEL_ID} b{color:#111815;font-size:13px;font-weight:950}
    #${PANEL_ID} span{color:#52605a;font-size:11px;font-weight:850;line-height:1.3}
    #${PANEL_ID} em{justify-self:start;border-radius:999px;padding:4px 7px;background:#111815;color:#fff;font-style:normal;font-size:9px;font-weight:950;text-transform:uppercase}
    #${PANEL_ID} button{border:0;border-radius:999px;background:#e4e7e7;color:#111815;font-size:11px;font-weight:950;padding:7px 10px}
    @media(max-width:920px){#${PANEL_ID} .draftRows{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:620px){#${PANEL_ID} .draftRows{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function relevantDrafts(page) {
  const all = readDrafts();
  if (page === 'command') return all.filter((draft) => /command/i.test(draft.status || '')).slice(0, 4);
  return all.filter((draft) => draft.page === page).slice(0, 4);
}

function mountPanel() {
  const page = pageKey();
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  const old = document.getElementById(PANEL_ID);
  if (!page || !root) { old?.remove(); return; }
  const drafts = relevantDrafts(page);
  if (!drafts.length) { old?.remove(); return; }
  installStyle();
  let panel = old;
  if (!panel) { panel = document.createElement('section'); panel.id = PANEL_ID; root.prepend(panel); }
  const rows = drafts.map((draft) => {
    const values = draft.values || {};
    const firstValue = Object.entries(values).find(([key]) => !/owner rule/i.test(key));
    return `<article class="draft"><b>${esc(draft.title || 'Draft')}</b><span>${esc(firstValue ? `${firstValue[0]}: ${firstValue[1] || 'not set'}` : 'Draft captured')}</span><em>${esc(draft.status || 'Saved')}</em></article>`;
  }).join('');
  panel.innerHTML = `<header><div><h3>Recently prepared drafts</h3><small>Captured from quick create forms on this device.</small></div><button type="button" data-clear-drafts>Clear</button></header><div class="draftRows">${rows}</div>`;
}

function clearDrafts(event) {
  if (!event.target?.closest?.(`#${PANEL_ID} [data-clear-drafts]`)) return;
  localStorage.removeItem(STORE_KEY);
  mountPanel();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_DRAFT_MEMORY__) {
  window.__CHURVOX_OWNER_DRAFT_MEMORY__ = true;
  window.addEventListener('DOMContentLoaded', mountPanel);
  window.addEventListener('load', mountPanel);
  window.addEventListener('hashchange', () => setTimeout(mountPanel, 120));
  window.addEventListener('churvox:owner-draft-saved', () => setTimeout(mountPanel, 160));
  document.addEventListener('click', clearDrafts, true);
  setInterval(mountPanel, 1500);
  mountPanel();
}

export {};