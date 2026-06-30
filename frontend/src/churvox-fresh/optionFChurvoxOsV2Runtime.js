// CHURVOX_OWNER_CLARITY_LAYER_20260630
// Product layer: clear owner wording, live-mode empty states, Command-only decisions, saved record trail, and Today cockpit labels.

const ROOT = '.churvoxOptionC';
const STYLE_ID = 'churvox-owner-clarity-style';
const SAVE_KEY = 'churvox_os_v2_saved_records';
const BACKEND = 'https://grassley-backend.onrender.com';
const SEED_NAMES = ['Mere H.', 'Belmont Villas', 'Naenae Dairy', 'Petone Units', 'Wainui School', 'Birchville Dairy'];

function apiUrl(path) {
  const host = String(window.location.hostname || '').toLowerCase();
  if (host === 'www.churvox.com' || host === 'churvox.com') return `${BACKEND}${path}`;
  return path;
}
function root() { return document.querySelector(ROOT); }
function cleanText(node) { return String(node?.textContent || '').replace(/\s+/g, ' ').trim(); }
function currentPage() {
  const hash = String(window.location.hash || '').replace(/^#/, '').toLowerCase();
  const path = String(window.location.pathname || '').replace(/^\//, '').split('/')[0].toLowerCase();
  if (hash) return hash;
  if (path === 'dashboard' || path === '') return 'today';
  return path;
}
function isCommandPage() { return currentPage() === 'command' || String(window.location.hash || '').toLowerCase().includes('command'); }
function isCommandDrawer(drawer) { return drawer?.classList.contains('approvalSlip') || /approval|command/i.test(cleanText(drawer?.querySelector('h2'))); }
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
function fieldValue(field) {
  const input = field?.querySelector('input,textarea,select');
  return input ? input.value : '';
}
function fieldsFromDrawer(drawer) {
  const out = {};
  drawer.querySelectorAll('.cocField').forEach((field) => {
    const label = cleanText(field.querySelector('span')) || 'Field';
    out[label] = fieldValue(field);
  });
  return out;
}
async function sendSave(row) {
  try {
    const res = await fetch(apiUrl('/api/os-v2/saved-records'), {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify(row),
    });
    if (!res.ok) return false;
    const body = await res.json().catch(() => ({}));
    return body?.success !== false;
  } catch {
    return false;
  }
}
function flash(message, tone = 'good') {
  let node = document.getElementById('cv-owner-clarity-toast');
  if (!node) {
    node = document.createElement('div');
    node.id = 'cv-owner-clarity-toast';
    document.body.appendChild(node);
  }
  node.className = `show ${tone}`;
  node.textContent = message;
  clearTimeout(window.__cvOwnerClarityToastTimer);
  window.__cvOwnerClarityToastTimer = setTimeout(() => { node.className = ''; }, 2600);
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #cv-owner-clarity-toast{position:fixed;right:18px;bottom:18px;z-index:2147483647;max-width:min(420px,calc(100vw - 36px));padding:14px 16px;border-radius:18px;background:#111815;color:#fff;font:900 13px/1.35 Inter,system-ui,sans-serif;box-shadow:0 24px 70px rgba(17,24,21,.28);transform:translateY(18px);opacity:0;pointer-events:none;transition:.18s ease}#cv-owner-clarity-toast.show{transform:translateY(0);opacity:1}#cv-owner-clarity-toast.warn{background:#9a3412}#cv-owner-clarity-toast.good{background:#166534}
    .cvOwnerClarityBanner{display:grid;gap:6px;margin:0 0 14px;padding:14px 16px;border:1px solid rgba(234,88,12,.22);border-radius:22px;background:linear-gradient(135deg,#fff7ed,#fff);box-shadow:0 14px 34px rgba(15,23,42,.06)}.cvOwnerClarityBanner b{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#9a3412}.cvOwnerClarityBanner p{margin:0;color:#334155;font-size:13px;font-weight:850;line-height:1.35}
    .cvOwnerCockpit{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 14px}.cvOwnerLane{border:1px solid rgba(15,23,42,.09);border-radius:22px;background:#fff;padding:14px;box-shadow:0 12px 28px rgba(15,23,42,.06)}.cvOwnerLane span{display:inline-flex;border-radius:999px;background:#111815;color:#fff;padding:5px 9px;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}.cvOwnerLane b{display:block;margin-top:9px;font-size:18px;line-height:1.05}.cvOwnerLane small{display:block;margin-top:5px;color:#64748b;font-weight:800;line-height:1.3}
    .cvAdminTrail{display:grid;gap:10px;margin:16px 0;padding:14px;border:1px solid rgba(15,23,42,.10);border-radius:18px;background:linear-gradient(135deg,#f8fafc,#fff)}.cvAdminTrail>span{font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em;color:#ea580c}.cvAdminTrail div{display:grid;gap:2px}.cvAdminTrail b{font-size:12px;color:#111815}.cvAdminTrail p{margin:0;color:#475569;font-size:12px;font-weight:800;line-height:1.35}
    .cvSaveNote{display:grid;gap:4px;margin:10px 0 0;padding:10px 12px;border-radius:14px;background:#ecfdf5;color:#14532d;font-weight:900;font-size:12px}.cvSaveNote.warn{background:#fff7ed;color:#9a3412}.cvEmptyState{grid-column:1/-1;border:1px dashed rgba(15,23,42,.2);border-radius:22px;background:#fff;padding:18px;text-align:left}.cvEmptyState b{display:block;color:#111815}.cvEmptyState p{margin:6px 0 0;color:#64748b;font-weight:850}.cvSeedHidden{display:none!important}
    .churvoxOptionC .cocDrawer:not(.approvalSlip) .approvalActions button[data-cv-command-only="true"]{background:#111815!important;color:#fff!important}.churvoxOptionC .cocPanel h2 .cvCommandMini{display:inline-flex;margin-left:8px;border-radius:999px;background:#fff7ed;color:#9a3412;padding:3px 7px;font-size:9px;font-weight:950;vertical-align:middle}
    @media(max-width:760px){.cvOwnerCockpit{grid-template-columns:1fr}.cvOwnerClarityBanner{margin:0 0 10px}.cvOwnerLane b{font-size:16px}}
  `;
  document.head.appendChild(style);
}

function addOwnerBanner(app) {
  if (app.querySelector('.cvOwnerClarityBanner')) return;
  const workspace = app.querySelector('.workspace') || app.querySelector('.cocPage') || app;
  const banner = document.createElement('section');
  banner.className = 'cvOwnerClarityBanner';
  banner.innerHTML = '<b>Churvox is preparing the admin</b><p>Review details on each page. Final owner decisions stay in Command.</p>';
  workspace.prepend(banner);
}

function addCockpit(app) {
  const page = app.querySelector('.cocPage.today');
  if (!page || page.querySelector('.cvOwnerCockpit')) return;
  const cockpit = document.createElement('section');
  cockpit.className = 'cvOwnerCockpit';
  cockpit.innerHTML = [
    ['Do now', 'Handle the next decision', 'Anything needing approval belongs in Command.'],
    ['Watch today', 'Jobs, workers and money in motion', 'See the day without office clutter.'],
    ['Ready for Command', 'Admin prepared for approval', 'Quotes, invoices and key changes wait there.'],
  ].map(([a,b,c]) => `<div class="cvOwnerLane"><span>${a}</span><b>${b}</b><small>${c}</small></div>`).join('');
  page.prepend(cockpit);
}

function addCommandBadges(app) {
  app.querySelectorAll('.cocPanel h2').forEach((h2) => {
    if (h2.querySelector('.cvCommandMini')) return;
    const label = cleanText(h2);
    if (!/approval|command|owner/i.test(label)) return;
    const node = document.createElement('span');
    node.className = 'cvCommandMini';
    node.textContent = 'Command';
    h2.appendChild(node);
  });
}

function hideSeedRows(app) {
  const all = cleanText(app);
  const seedHits = SEED_NAMES.filter((name) => all.includes(name)).length;
  if (seedHits < 3) return;
  app.querySelectorAll('.cocRow,.jobCard,.workerCard,.workCard,.ledgerRow').forEach((row) => {
    const rowText = cleanText(row);
    if (SEED_NAMES.some((name) => rowText.includes(name))) row.classList.add('cvSeedHidden');
  });
}

function ensureEmptyStates(app) {
  app.querySelectorAll('.scroll,.jobCards,.workerCards,.workCards,.ledgerList,.proofGrid,.teamQuickGrid').forEach((list) => {
    const visible = Array.from(list.children).filter((child) => !child.classList.contains('cvSeedHidden') && !child.classList.contains('cvEmptyState'));
    if (visible.length || list.querySelector('.cvEmptyState')) return;
    const empty = document.createElement('div');
    empty.className = 'cvEmptyState';
    empty.innerHTML = '<b>Nothing here yet.</b><p>Add the first record, or let Churvox prepare it and review it in Command.</p>';
    list.appendChild(empty);
  });
}

function adminTrailFor(drawer) {
  if (!drawer || drawer.querySelector('.cvAdminTrail')) return;
  const title = cleanText(drawer.querySelector('h2')) || 'Record';
  const command = isCommandDrawer(drawer);
  const section = document.createElement('section');
  section.className = 'cvAdminTrail';
  section.innerHTML = `
    <span>Admin Trail</span>
    <div><b>What Churvox prepared</b><p>${command ? 'A clear owner decision from the latest job, client, worker, money or accounting details.' : `The ${title.toLowerCase()} details above are the working record.`}</p></div>
    <div><b>Where it came from</b><p>Saved records, worker updates, customer messages, time, photos, notes and pricing memory.</p></div>
    <div><b>What needs approval</b><p>${command ? 'Approve, edit or park here in Command.' : 'Sending, syncing, money and final owner decisions move to Command.'}</p></div>
    <div><b>What happens next</b><p>${command ? 'Your decision updates the record and keeps the trail clear.' : 'Save changes here. Use Command when an owner decision is needed.'}</p></div>
  `;
  const form = drawer.querySelector('.cocField')?.parentElement;
  if (form) form.after(section); else drawer.appendChild(section);
}

function recordKind(drawer) {
  const title = cleanText(drawer.querySelector('h2')).toLowerCase();
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
  let note = drawer.querySelector('.cvSaveNote');
  if (!note) {
    note = document.createElement('div');
    note.className = 'cvSaveNote';
    drawer.querySelector('.approvalActions')?.before(note);
  }
  note.classList.remove('warn');
  note.innerHTML = '<b>Saving...</b><span>Churvox is keeping the admin trail clear.</span>';
  const ok = await sendSave(row);
  if (ok) {
    note.innerHTML = '<b>Saved for review.</b><span>This record is safely kept with the admin trail.</span>';
    flash('Saved for review.', 'good');
  } else {
    note.classList.add('warn');
    note.innerHTML = '<b>Kept here for now.</b><span>Churvox could not reach the server, so this stays on this device until it can be saved.</span>';
    flash('Kept here for now.', 'warn');
  }
}

function isMessageSend(label) {
  return /send message|message|reply|note|help/.test(label) && !/invoice|quote|sync|approval|approve/.test(label);
}

function commandOnlyGuard(event) {
  const button = event.target?.closest?.('button');
  if (!button) return;
  const app = button.closest(ROOT);
  if (!app) return;
  const label = cleanText(button).toLowerCase();
  if (isMessageSend(label)) return;
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
  flash('That decision lives in Command.', 'warn');
  setTimeout(() => { window.location.href = '/dashboard#command'; }, 450);
}

function saveClick(event) {
  const button = event.target?.closest?.('.cocDrawer .approvalActions button');
  if (!button || !button.closest(ROOT)) return;
  const label = cleanText(button);
  const drawer = button.closest('.cocDrawer');
  if (!drawer) return;
  if (/^save|update access|edit quote|edit invoice/i.test(label)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    queueSave(drawer, label);
  }
}

function run() {
  const app = root();
  if (!app) return;
  installStyle();
  addOwnerBanner(app);
  addCockpit(app);
  addCommandBadges(app);
  hideSeedRows(app);
  ensureEmptyStates(app);
  const drawer = app.querySelector('.cocDrawer');
  if (drawer) adminTrailFor(drawer);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_OWNER_CLARITY_LAYER__) {
  window.__CHURVOX_OWNER_CLARITY_LAYER__ = true;
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
