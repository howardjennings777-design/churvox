// Owner record timeline panel.

const TIMELINE_KEY = 'churvox.owner.timeline.v1';
const PANEL_ID = 'churvox-owner-timeline-panel';
const STYLE_ID = 'churvox-owner-timeline-style';

function pageKey() { return String(location.hash || '').replace('#','').toLowerCase() || 'aiguide'; }
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
function esc(value) { return String(value || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `#${PANEL_ID}{grid-column:1/-1!important;display:grid!important;gap:9px!important;border:1px solid rgba(16,21,19,.08)!important;border-radius:17px!important;background:#f7f8f4!important;padding:12px!important;color:#111815!important;min-height:154px!important;contain:layout paint!important}#${PANEL_ID} h3{margin:0!important;font:950 16px Inter,system-ui,sans-serif!important}#${PANEL_ID} p{margin:0!important;color:#52605a!important;font:850 12px Inter,system-ui,sans-serif!important}#${PANEL_ID} .rows{display:grid!important;gap:7px!important;max-height:210px!important;overflow:auto!important;scrollbar-gutter:stable!important}#${PANEL_ID} .row{display:grid!important;grid-template-columns:1fr auto!important;gap:8px!important;border:1px solid rgba(16,21,19,.07)!important;border-radius:12px!important;background:#fff!important;padding:9px!important;min-height:51px!important}#${PANEL_ID} b{display:block!important;font-size:12px!important;font-weight:950!important}#${PANEL_ID} span{display:block!important;color:#52605a!important;font-size:10px!important;font-weight:850!important}#${PANEL_ID} em{font-style:normal!important;border-radius:999px!important;background:#fff0e8!important;color:#b9381e!important;padding:5px 7px!important;font-size:9px!important;font-weight:950!important;text-transform:uppercase!important}`;
  document.head.appendChild(style);
}

let lastHtml = '';
function mount() {
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  installStyle();
  let panel = document.getElementById(PANEL_ID);
  if (!panel) { panel = document.createElement('section'); panel.id = PANEL_ID; root.appendChild(panel); lastHtml = ''; }
  panel.removeAttribute('data-proper-hidden');
  panel.removeAttribute('data-core-hidden');
  panel.removeAttribute('data-lite-hidden');
  const page = pageKey();
  const timeline = read(TIMELINE_KEY, []).filter(Boolean);
  const rows = timeline.filter((x) => !x.page || x.page === page || page === 'command' || page === 'aiguide').slice(0, 8);
  const bodyRows = rows.length ? rows.map((x) => `<div class="row"><span><b>${esc(x.title || x.recordId || x.type || 'Activity')}</b>${esc(x.detail || x.status || '')}<br>${esc(x.at || x.created_at || '')}</span><em>${esc(String(x.type || 'activity').replace(/-/g,' '))}</em></div>`) : [`<div class="row"><span><b>No timeline yet</b>Save or approve a record and Churvox will show the history here.</span><em>empty</em></div>`];
  while (bodyRows.length < 2) bodyRows.push('<div class="row" aria-hidden="true"><span><b>&nbsp;</b>&nbsp;</span><em>&nbsp;</em></div>');
  const body = bodyRows.join('');
  const html = `<h3>Record timeline</h3><p>History for autofill, saved records, prepared Command items and owner decisions.</p><div class="rows">${body}</div>`;
  if (html === lastHtml) return;
  lastHtml = html;
  panel.innerHTML = html;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_TIMELINE_PANEL__) {
  window.__CHURVOX_OWNER_TIMELINE_PANEL__ = true;
  addEventListener('DOMContentLoaded', mount);
  addEventListener('load', mount);
  addEventListener('hashchange', () => setTimeout(mount, 160));
  addEventListener('churvox:command-prepared', () => setTimeout(mount, 220));
  addEventListener('churvox:owner-record-autofilled', () => setTimeout(mount, 220));
  addEventListener('churvox:owner-decision-applied', () => setTimeout(mount, 220));
  addEventListener('churvox:owner-workflow-automation', () => setTimeout(mount, 220));
  addEventListener('churvox:owner-data-quality', () => setTimeout(mount, 240));
  document.addEventListener('click', () => setTimeout(mount, 800), true);
  setInterval(mount, 10000);
  mount();
}

export {};
