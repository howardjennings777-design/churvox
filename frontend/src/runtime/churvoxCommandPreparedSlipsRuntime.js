// CHURVOX_COMMAND_PREPARED_SLIPS_20260630
// Shows backend-prepared Command slips when available. Stops quietly if backend route is not deployed.

const BACKEND = 'https://grassley-backend.onrender.com';
const STYLE_ID = 'churvox-command-prepared-slips-style';
const PANEL_ID = 'churvox-command-prepared-slips';
let disabled = false;
let missingRouteSeen = false;
let lastFetchAt = 0;

function apiUrl(path) {
  const host = String(window.location.hostname || '').toLowerCase();
  if (host === 'www.churvox.com' || host === 'churvox.com') return `${BACKEND}${path}`;
  return path;
}
function isCommand() {
  return String(window.location.hash || '').toLowerCase().includes('command') || String(window.location.pathname || '').includes('command');
}
function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function headers() {
  const out = { 'Content-Type': 'application/json' };
  const t = token();
  if (t) out.Authorization = `Bearer ${t}`;
  return out;
}
async function loadSlips() {
  if (disabled || missingRouteSeen) return [];
  const now = Date.now();
  if (now - lastFetchAt < 15000) return [];
  lastFetchAt = now;
  try {
    const res = await fetch(apiUrl('/api/command/prepared-slips'), { credentials: 'include', headers: headers() });
    if (res.status === 404 || res.status === 422) {
      missingRouteSeen = true;
      disabled = true;
      return [];
    }
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body.slips) ? body.slips : Array.isArray(body.items) ? body.items : [];
  } catch {
    return [];
  }
}
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PANEL_ID}{display:grid;gap:10px;margin:0 0 14px;padding:14px;border:1px solid rgba(249,115,22,.24);border-radius:22px;background:#fff7ed;box-shadow:0 18px 38px rgba(15,23,42,.08);color:#111827}#${PANEL_ID} header{display:flex;justify-content:space-between;gap:12px;align-items:center}#${PANEL_ID} header b{font-size:16px}#${PANEL_ID} header span{border-radius:999px;background:#111827;color:#fff;padding:5px 9px;font-size:11px;font-weight:1000}#${PANEL_ID} .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}#${PANEL_ID} article{border:1px solid rgba(15,23,42,.08);border-radius:16px;background:#fff;padding:10px}#${PANEL_ID} small{display:inline-flex;border-radius:999px;background:#ffedd5;color:#9a3412;padding:4px 7px;font-size:9px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}#${PANEL_ID} h3{margin:7px 0 4px;font-size:14px;line-height:1.05;color:#111827}#${PANEL_ID} p{margin:0;color:#475569;font-size:12px;font-weight:850;line-height:1.3}@media(max-width:820px){#${PANEL_ID} .grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}
function target() {
  return document.querySelector('.churvoxOptionC .workspace') || document.querySelector('.churvoxOptionC .cocPage') || document.querySelector('.freshApp') || document.querySelector('.churvoxOptionC');
}
async function render() {
  if (disabled || missingRouteSeen) { document.getElementById(PANEL_ID)?.remove(); return; }
  if (!isCommand()) { document.getElementById(PANEL_ID)?.remove(); return; }
  const parent = target();
  if (!parent) return;
  const slips = (await loadSlips()).slice(0, 6);
  if (!slips.length) { document.getElementById(PANEL_ID)?.remove(); return; }
  ensureStyle();
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    parent.prepend(panel);
  }
  panel.innerHTML = `<header><b>Prepared for Command</b><span>${slips.length} ready</span></header><div class="grid">${slips.slice(0, 3).map((slip) => `<article><small>${slip.source || slip.kind || 'Command'}</small><h3>${slip.title || 'Ready for review'}</h3><p>${slip.detail || 'Prepared for owner review.'}</p></article>`).join('')}</div>`;
}

if (typeof window !== 'undefined' && !window.__CHURVOX_COMMAND_PREPARED_SLIPS__) {
  window.__CHURVOX_COMMAND_PREPARED_SLIPS__ = true;
  window.addEventListener('load', () => setTimeout(render, 1000));
  window.addEventListener('hashchange', () => setTimeout(render, 350));
  window.addEventListener('popstate', () => setTimeout(render, 350));
  document.addEventListener('click', () => setTimeout(render, 500), true);
  setInterval(render, 30000);
}

export {};
