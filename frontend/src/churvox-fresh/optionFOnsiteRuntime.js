// CHURVOX_ONSITE_RUNTIME_20260629
// Renames Workers to Onsite and makes the page a live field board: map, active workers, proof, GPS and field warnings.

import API_BASE from '../lib/apiBase';

const PANEL_ID = 'churvox-onsite-live-panel';
let cached = null;
let lastLoad = 0;
let queued = false;
let polling = false;

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function apiUrl(path) { return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`; }
function token() { try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch (_) { return ''; } }
function headers() { const auth = token(); return { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }; }
async function request(method, path, payload) {
  const response = await fetch(apiUrl(path), { method, credentials: 'include', headers: headers(), body: payload === undefined ? undefined : JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  return body?.data?.data || body?.data || body;
}
function renderHtml(node, html) { if (!node || node.innerHTML === html) return; node.innerHTML = html; }
function activePage() {
  const hash = clean((window.location.hash || '').replace('#', '')).toLowerCase();
  const active = clean(document.querySelector('.churvoxOptionC .cocNav button.active')?.textContent).toLowerCase();
  return hash || active || 'today';
}
function root() { return document.querySelector('.churvoxOptionC .workspace .cocPage'); }
function mapUrl(query) { return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`; }
function mapSearch(query) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`; }
function realLocation(value) {
  const text = clean(value);
  if (!text) return '';
  if (/lower hutt wellington new zealand/i.test(text)) return '';
  if (/no gps|no location|not set/i.test(text)) return '';
  return text;
}
async function load(force = false) {
  if (!token()) return cached;
  if (!force && cached && Date.now() - lastLoad < 8000) return cached;
  lastLoad = Date.now();
  try { cached = await request('GET', '/onsite/live'); } catch (_) {}
  return cached;
}
function renameNav() {
  const buttons = Array.from(document.querySelectorAll('.churvoxOptionC .cocNav button'));
  buttons.forEach((button) => {
    if (clean(button.textContent).toLowerCase() === 'workers') {
      button.textContent = 'Onsite';
      button.setAttribute('data-onsite-nav', 'true');
    }
  });
  const title = document.querySelector('.churvoxOptionC .title h1');
  const subtitle = document.querySelector('.churvoxOptionC .title p');
  if (isOnsitePage()) {
    document.documentElement.setAttribute('data-owner-page', 'onsite');
    if (title) title.textContent = 'Onsite';
    if (subtitle) subtitle.textContent = 'Live map, workers doing work, GPS, proof, messages and field warnings.';
  } else if (document.documentElement.getAttribute('data-owner-page') === 'onsite') {
    document.documentElement.removeAttribute('data-owner-page');
  }
}
function isOnsitePage() {
  const page = activePage();
  return page === 'workers' || page === 'onsite';
}
function cleanupTeamCopy() {
  const page = activePage();
  if (page !== 'team') return;
  const title = document.querySelector('.churvoxOptionC .title p');
  if (title) title.textContent = 'Staff records, roles, access, invites, payroll review and worker app setup.';
  const pageRoot = root();
  if (!pageRoot) return;
  Array.from(pageRoot.querySelectorAll('.cocPanel h2')).forEach((heading) => {
    if (/Staff Cards/i.test(heading.textContent || '')) heading.textContent = 'Team Records';
    if (/Payroll Review/i.test(heading.textContent || '')) heading.textContent = 'Payroll / Timesheet Review';
    if (/Editable Person Form/i.test(heading.textContent || '')) heading.textContent = 'Staff Member Form';
  });
}
function onsiteHtml(data) {
  const rows = Array.isArray(data?.onsite) ? data.onsite : [];
  const warnings = Array.isArray(data?.warnings) ? data.warnings : [];
  const counts = data?.counts || {};
  const liveLocations = rows.map((row) => realLocation(row.location || row.gps || row.map_query)).filter(Boolean);
  const query = liveLocations.length ? `${liveLocations.slice(0, 5).join(' ')} New Zealand` : '';
  const mapBlock = query ? `<div class="onsiteMapShell">
      <iframe title="Onsite Google Maps" src="${esc(mapUrl(query))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      <a href="${esc(mapSearch(query))}" target="_blank" rel="noreferrer">Open in Google Maps</a>
    </div>` : `<div class="onsiteMapShell onsiteMapEmpty"><strong>No live location yet</strong><p>Onsite will show the map when a worker is clocked in with a job/site location or GPS proof.</p></div>`;
  return `
    <div class="onsiteHero">
      <div>
        <span>Onsite</span>
        <h2>Live field view.</h2>
        <p>Only workers doing work appear here. Staff records, payroll and old proof panels stay off this page.</p>
      </div>
      <strong>${counts.onsite || rows.length} onsite</strong>
    </div>
    ${mapBlock}
    <div class="onsiteStats">
      <article><b>${counts.onsite || rows.length}</b><small>working now</small></article>
      <article><b>${warnings.length}</b><small>field warnings</small></article>
    </div>
    <div class="onsiteRows">
      ${rows.slice(0, 8).map((row) => `<article data-onsite-worker="${esc(row.id || row.name)}">
        <div><b>${esc(row.name || 'Worker')}</b><small>${esc(row.status || 'Onsite')} · ${esc(row.job || 'No current job')}</small></div>
        <span>${esc(realLocation(row.location || row.gps || row.map_query) || 'No live GPS yet')}</span>
        <em>${esc(row.proof || 'No proof yet')}</em>
        <small>${esc(row.messages || 'No messages')} · ${esc(row.timesheet || 'No time yet')}</small>
      </article>`).join('') || '<p>No worker is live right now. Team records stay on Team.</p>'}
    </div>
    <div class="onsiteWarnings">
      ${warnings.slice(0, 6).map((warning) => `<span>${esc(warning.message || warning.type)}</span>`).join('') || '<span>No live field warnings.</span>'}
    </div>`;
}
function hideOldOnsitePanels() {
  const pageRoot = root();
  if (!pageRoot || !isOnsitePage()) return;
  Array.from(pageRoot.children).forEach((child) => {
    if (child.id === PANEL_ID) return;
    const text = clean(child.innerText || '');
    if (!text) return;
    if (/COMMAND JOB READINESS ENGINE|Every job now says|FIELD PROOF CONTROL|Today shows what the admin engine|Map backup|Google Maps GPS|Onsite Summary|Worker Day Summary|Onsite Cards|Worker Cards|Proof\s*\/\s*Photos|Site Messages|Team timesheets|Timesheets|Slips|SCHEDULE BOARD|Day board|Churvox admin wiring|Worker actions|Page actions|Recent logic|Saved worker day records/i.test(text)) {
      child.setAttribute('data-onsite-old-panel', 'true');
    }
  });
}
async function renderOnsite(force = false) {
  renameNav();
  cleanupTeamCopy();
  if (!isOnsitePage()) {
    document.getElementById(PANEL_ID)?.remove();
    document.querySelectorAll('[data-onsite-old-panel="true"]').forEach((node) => node.removeAttribute('data-onsite-old-panel'));
    return;
  }
  const pageRoot = root();
  if (!pageRoot) return;
  let node = document.getElementById(PANEL_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = PANEL_ID;
    node.className = 'onsiteLivePanel';
    pageRoot.prepend(node);
  }
  const data = await load(force);
  renderHtml(node, onsiteHtml(data || {}));
  hideOldOnsitePanels();
}
function schedule(force = false) {
  if (queued) return;
  queued = true;
  window.setTimeout(async () => {
    queued = false;
    await renderOnsite(force);
  }, 120);
}
function startPolling() {
  if (polling) return;
  polling = true;
  window.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (!isOnsitePage()) return;
    schedule(true);
  }, 6000);
}
if (typeof window !== 'undefined' && !window.__CHURVOX_ONSITE_RUNTIME__) {
  window.__CHURVOX_ONSITE_RUNTIME__ = true;
  window.addEventListener('load', () => { schedule(true); startPolling(); });
  window.addEventListener('hashchange', () => schedule(true));
  window.addEventListener('popstate', () => schedule(true));
  window.addEventListener('churvox:fresh-data-updated', () => schedule(true));
  document.addEventListener('click', () => schedule(false), true);
  const observer = new MutationObserver(() => schedule(false));
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
