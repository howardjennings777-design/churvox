// CHURVOX_OS_V2_PRODUCT_UPGRADE_20260630
// Product layer: live-mode empty states, Command-only approvals, saved drawer queue, Today cockpit labels, and Admin Trail trust notes.

const ROOT = '.churvoxOptionC';
const STYLE_ID = 'churvox-os-v2-style';
const SAVE_KEY = 'churvox_os_v2_saved_records';
const BACKEND = 'https://grassley-backend.onrender.com';
const DEMO_NAMES = ['Mere H.', 'Belmont Villas', 'Naenae Dairy', 'Petone Units', 'Wainui School', 'Birchville Dairy'];

function apiUrl(path) {
  const host = String(window.location.hostname || '').toLowerCase();
  if (host === 'www.churvox.com' || host === 'churvox.com') return `${BACKEND}${path}`;
  return path;
}
function root() { return document.querySelector(ROOT); }
function text(node) { return String(node?.textContent || '').replace(/\s+/g, ' ').trim(); }
function fieldValue(field) {
  const input = field?.querySelector('input,textarea,select');
  return input ? input.value : '';
}
function fieldsFromDrawer(drawer) {
  const out = {};
  drawer.querySelectorAll('.cocField').forEach((field) => {
    const label = text(field.querySelector('span')) || 'Field';
    out[label] = fieldValue(field);
  });
  return out;
}
function currentPage() {
  const hash = String(window.location.hash || '').replace(/^#/, '').toLowerCase();
  const path = String(window.location.pathname || '').replace(/^\//, '').split('/')[0].toLowerCase();
  if (hash) return hash;
  if (path === 'dashboard' || path === '') return 'today';
  return path;
}
function isCommandPage() { return currentPage() === 'command' || String(window.location.hash || '').toLowerCase().includes('command'); }
function isCommandDrawer(drawer) { return drawer?.classList.contains('approvalSlip') || /approval|command/i.test(text(drawer?.querySelector('h2'))); }
function readSaved() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '[]'); } catch { return []; } }
function writeSaved(row) { try { localStorage.setItem(SAVE_KEY, JSON.stringify([row, ...readSaved()].slice(0, 80))); } catch {} }
function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const token = localStorage.getItem('token') || '';
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {}
  return headers;
}
async function sendSave(row) {
  try {
    const res = await fetch(apiUrl('/api/os-v2/saved-records'), { method: 'POST', credentials: 'include', headers: authHeaders(), body: JSON.stringify(row) });
    if (!res.ok) return false;
    const body = await res.json().catch(() => ({}));
    return body?.success !== false;
  } catch {
    return false;
  }
}
function flash(message, tone = 'good') {
  let node = document.getElementById('cv-os-v2-toast');
  if (!node) {
    node = document.createElement('div');
    node.id = 'cv-os-v2-toast';
    document.body.appendChild(node);
  }
  node.className = `show ${tone}`;
  node.textContent = message;
  clearTimeout(window.__cvOsV2ToastTimer);
  window.__cvOsV2ToastTimer = setTimeout(() => { node.className = ''; }, 2600);
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #cv-os-v2-toast{position:fixed;right:18px;bottom:18px;z-index:2147483647;max-width:min(420px,calc(100vw - 36px));padding:14px 16px;border-radius:18px;background:#111815;color:#fff;font:900 13px/1.35 Inter,system-ui,sans-serif;box-shadow:0 24px 70px rgba(17,24,21,.28);transform:translateY(18px);opacity:0;pointer-events:none;transition:.18s ease}#cv-os-v2-toast.show{transform:translateY(0);opacity:1}#cv-os-v2-toast.warn{background:#9a3412}#cv-os-v2-toast.good{background:#166534}
    .cvOsV2Banner{display:grid;gap:6px;margin:0 0 14px;padding:14px 16px;border:1px solid rgba(234,88,12,.22);border-radius:22px;background:linear-gradient(135deg,#fff7ed,#fff);box-shadow:0 14px 34px rgba(15,23,42,.06)}.cvOsV2Banner b{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#9a3412}.cvOsV2Banner p{margin:0;color:#334155;font-size:13px;font-weight:850;line-height:1.35}
    .cvOsV2Cockpit{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 14px}.cvOsV2Lane{border:1px solid rgba(15,23,42,.09);border-radius:22px;background:#fff;padding:14px;box-shadow:0 12px 28px rgba(15,23,42,.06)}.cvOsV2Lane span{display:inline-flex;border-radius:999px;background:#111815;color:#fff;padding:5px 9px;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}.cvOsV2Lane b{display:block;margin-top:9px;font-size:18px;line-height:1.05}.cvOsV2Lane small{display:block;margin-top:5px;color:#64748b;font-weight:800;line-height:1.3}
    .cvOsV2Trail{display:grid;gap:10px;margin:16px 0;padding:14px;border:1px solid rgba(15,23,42,.10);border-radius:18px;background:linear-gradient(135deg,#f8fafc,#fff)}.cvOsV2Trail>span{font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em;color:#ea580c}.cvOsV2Trail div{display:grid;gap:2px}.cvOsV2Trail b{font-size:12px;color:#111815}.cvOsV2Trail p{margin:0;color:#475569;font-size:12px;font-weight:800;line-height:1.35}.cvOsV2QueueNote{display:grid;gap:4px;margin:10px 0 0;padding:10px 12px;border-radius:14px;background:#ecfdf5;color:#14532d;font-weight:900;font-size:12px}.cvOsV2QueueNote.warn{background:#fff7ed;color:#9a3412}.cvOsV2Empty{grid-column:1/-1;border:1px dashed rgba(15,23,42,.2);border-radius:22px;background:#fff;padding:18px;text-align:left}.cvOsV2Empty b{display:block;color:#111815}.cvOsV2Empty p{margin:6px 0 0;color:#64748b;font-weight:850}.cvOsV2DemoSoft{opacity:.55;filter:saturate(.55)}
    .churvoxOptionC .cocDrawer:not(.approvalSlip) .approvalActions button[data-cv-command-only="true"]{background:#111815!important;color:#fff!important}.churvoxOptionC .cocPanel h2 .cvOsV2Mini{display:inline-flex;margin-left:8px;border-radius:999px;background:#fff7ed;color:#9a3412;padding:3px 7px;font-size:9px;font-weight:950;vertical-align:middle}
    @media(max-width:760px){.cvOsV2Cockpit{grid-template-columns:1fr}.cvOsV2Banner{margin:0 0 10px}.cvOsV2Lane b{font-size:16px}}
  `;
  document.head.appendChild(style);
}

function addLiveBanner(app) {
  if (app.querySelector('.cvOsV2Banner')) return;
  const workspace = app.querySelector('.workspace') || app.querySelector('.cocPage') || app;
  const banner = document.createElement('section');
  banner.className = 'cvOsV2Banner';
  banner.innerHTML = '<b>Churvox OS v2</b><p>Live account mode: pages use saved records first, empty states stay clean, and approval decisions stay in Command.</p>';
  workspace.prepend(banner);
}

function addCockpit(app) {
  const page = app.querySelector('.cocPage.today');
  if (!page || page.querySelector('.cvOsV2Cockpit')) return;
  const cockpit = document.createElement('section');
  cockpit.className = 'cvOsV2Cockpit';
  cockpit.innerHTML = [
    ['Do now', 'Open the next owner decision', 'Approve, edit or park from Command only.'],
    ['Watch today', 'Jobs, workers and money in motion', 'Keep the day visible without office clutter.'],
    ['Ready for Command', 'Admin Churvox has prepared', 'Quotes, invoices, messages and checks wait for approval.'],
  ].map(([a,b,c]) => `<div class="cvOsV2Lane"><span>${a}</span><b>${b}</b><small>${c}</small></div>`).join('');
  page.prepend(cockpit);
}

function addPanelBadges(app) {
  app.querySelectorAll('.cocPanel h2').forEach((h2) => {
    if (h2.querySelector('.cvOsV2Mini')) return;
    const label = text(h2);
    let mini = '';
    if (/approval|command|owner/i.test(label)) mini = 'Command';
    else if (/jobs|clients|quotes|invoices|worker|team|message/i.test(label)) mini = 'Live';
    if (!mini) return;
    const node = document.createElement('span');
    node.className = 'cvOsV2Mini';
    node.textContent = mini;
    h2.appendChild(node);
  });
}

function softenDemoRows(app) {
  const all = text(app);
  const demoHits = DEMO_NAMES.filter((name) => all.includes(name)).length;
  if (demoHits < 3) return;
  app.querySelectorAll('.cocRow,.jobCard,.workerCard,.workCard,.ledgerRow').forEach((row) => {
    const rowText = text(row);
    if (DEMO_NAMES.some((name) => rowText.includes(name))) row.classList.add('cvOsV2DemoSoft');
  });
}

function ensureEmptyStates(app) {
  app.querySelectorAll('.scroll,.jobCards,.workerCards,.workCards,.ledgerList,.proofGrid,.teamQuickGrid').forEach((list) => {
    if (list.children.length || list.querySelector('.cvOsV2Empty')) return;
    const empty = document.createElement('div');
    empty.className = 'cvOsV2Empty';
    empty.innerHTML = '<b>No saved records here yet.</b><p>Add the first record, or let Churvox prepare it and approve it from Command.</p>';
    list.appendChild(empty);
  });
}

function adminTrailFor(drawer) {
  if (!drawer || drawer.querySelector('.cvOsV2Trail')) return;
  const title = text(drawer.querySelector('h2')) || 'Record';
  const command = isCommandDrawer(drawer);
  const section = document.createElement('section');
  section.className = 'cvOsV2Trail';
  section.innerHTML = `
    <span>Admin Trail</span>
    <div><b>What Churvox filled</b><p>${command ? 'A prepared approval slip from job, client, worker, message, money and accounting state.' : `The ${title.toLowerCase()} fields above are the editable working record.`}</p></div>
    <div><b>Where it came from</b><p>Saved records, worker updates, customer messages, time, photos, notes and pricing memory.</p></div>
    <div><b>What needs approval</b><p>${command ? 'Approve, edit or park here in Command.' : 'Money, sending, accounting sync and final owner decisions move to Command.'}</p></div>
    <div><b>What happens next</b><p>${command ? 'Your decision updates the record and keeps the admin trail visible.' : 'Save the record here, then use Command when owner approval is required.'}</p></div>
  `;
  const form = drawer.querySelector('.cocField')?.parentElement;
  if (form) form.after(section); else drawer.appendChild(section);
}

function recordKind(drawer) {
  const title = text(drawer.querySelector('h2')).toLowerCase();
  if (title.includes('job')) return 'job';
  if (title.includes('client')) return 'client';
  if (title.includes('quote')) return 'quote';
  if (title.includes('invoice')) return 'invoice';
  if (title.includes('worker') || title.includes('person') || title.includes('timesheet')) return 'worker';
  if (title.includes('message')) return 'message';
  if (title.includes('approval')) return 'command';
  return 'record';
}

async function queueSave(drawer, buttonLabel) {
  const row = { at: new Date().toISOString(), kind: recordKind(drawer), action: buttonLabel, fields: fieldsFromDrawer(drawer) };
  writeSaved(row);
  let note = drawer.querySelector('.cvOsV2QueueNote');
  if (!note) {
    note = document.createElement('div');
    note.className = 'cvOsV2QueueNote';
    drawer.querySelector('.approvalActions')?.before(note);
  }
  note.classList.remove('warn');
  note.innerHTML = '<b>Saving in Churvox OS...</b><span>Keeping an admin trail for this record.</span>';
  const ok = await sendSave(row);
  if (ok) {
    note.innerHTML = '<b>Saved in Churvox OS.</b><span>Record changes are stored in the backend queue and visible in the admin trail.</span>';
    flash('Saved to Churvox OS.', 'good');
  } else {
    note.classList.add('warn');
    note.innerHTML = '<b>Saved on this device.</b><span>Backend queue was not available, so this change is kept locally for retry.</span>';
    flash('Saved locally. Backend queue unavailable.', 'warn');
  }
}

function commandOnlyGuard(event) {
  const button = event.target?.closest?.('button');
  if (!button) return;
  const label = text(button).toLowerCase();
  const drawer = button.closest('.cocDrawer');
  const ownerDecision = /approve|park|send|sync|file|payout/.test(label);
  if (!ownerDecision) return;
  if (drawer && isCommandDrawer(drawer)) return;
  if (isCommandPage() && button.closest('.ownerActions')) return;
  if (/save|edit|close|add|new|message|timesheet|access/.test(label) && !/approve|park|send|sync/.test(label)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  button.setAttribute('data-cv-command-only', 'true');
  flash('That decision belongs in Command. Opening the approval desk.', 'warn');
  setTimeout(() => { window.location.href = '/dashboard#command'; }, 500);
}

function saveClick(event) {
  const button = event.target?.closest?.('.cocDrawer .approvalActions button');
  if (!button) return;
  const label = text(button);
  const drawer = button.closest('.cocDrawer');
  if (!drawer) return;
  if (/^save|update access|edit quote|edit invoice/i.test(label)) {
    event.preventDefault();
    event.stopPropagation();
    queueSave(drawer, label);
  }
}

function run() {
  const app = root();
  if (!app) return;
  installStyle();
  addLiveBanner(app);
  addCockpit(app);
  addPanelBadges(app);
  softenDemoRows(app);
  ensureEmptyStates(app);
  const drawer = app.querySelector('.cocDrawer');
  if (drawer) adminTrailFor(drawer);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_OS_V2_PRODUCT_UPGRADE__) {
  window.__CHURVOX_OS_V2_PRODUCT_UPGRADE__ = true;
  window.addEventListener('load', () => setTimeout(run, 250));
  window.addEventListener('hashchange', () => setTimeout(run, 180));
  window.addEventListener('popstate', () => setTimeout(run, 180));
  document.addEventListener('click', commandOnlyGuard, true);
  document.addEventListener('click', saveClick, true);
  document.addEventListener('input', () => setTimeout(run, 120), true);
  document.addEventListener('change', () => setTimeout(run, 120), true);
  const observer = new MutationObserver(() => run());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(run, 1400);
}

export {};
