// CHURVOX_ONSITE_RUNTIME_20260629
// Makes Onsite a single-purpose live field board: map, active workers and field warnings only.
// Fallback rule: if live GPS is missing, use current job site addresses so the boss still sees a useful map.

import API_BASE from '../lib/apiBase';

const PANEL_ID = 'churvox-onsite-live-panel';
let cached = null;
let lastLoad = 0;
let queued = false;
let polling = false;

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
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
function listFrom(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
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
  if (/no gps|no location|not set|undefined|null/i.test(text)) return '';
  return text;
}
function jobTitle(job) { return clean(job?.title || job?.job_name || job?.job_title || job?.description || 'Job'); }
function jobAddress(job) { return realLocation(job?.address || job?.site_address || job?.service_address || job?.job_address || job?.location || ''); }
function jobWorker(job) { return clean(job?.assigned_worker_name || job?.worker_name || job?.worker || job?.assigned_to_name || job?.assigned_to || job?.assigned_worker_email || job?.worker_email || 'Worker'); }
function jobStatus(job) { return lower(job?.status || job?.job_status || job?.workflow_status || 'assigned'); }
function jobIsDone(job) { return /complete|completed|done|finished|cancelled|archived/i.test(jobStatus(job)); }
function jobTime(job) { return clean(job?.scheduled_time || job?.time || job?.start_time || ''); }
function isTodayOrReady(job) {
  const status = jobStatus(job);
  if (/in_progress|started|active|on_my_way|assigned|ready|scheduled/.test(status)) return true;
  const date = clean(job?.scheduled_date || job?.date || job?.start || job?.due_date).slice(0, 10);
  if (!date) return true;
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return date >= today;
}
function liveMapQuery(rows) {
  for (const row of rows) {
    const coordinate = realLocation(row.map_query || row.location || row.gps);
    if (coordinate && /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(coordinate)) return coordinate;
  }
  for (const row of rows) {
    const address = realLocation(row.location || row.gps || row.map_query);
    if (address) return /new zealand|nz$/i.test(address) ? address : `${address}, New Zealand`;
  }
  return '';
}
async function jobFallbackRows() {
  try {
    const res = await request('GET', '/jobs');
    const jobs = listFrom(res).filter((job) => !jobIsDone(job) && jobAddress(job) && isTodayOrReady(job));
    return jobs.slice(0, 8).map((job) => ({
      id: clean(job?.id || job?._id || job?.job_id || jobTitle(job)),
      name: jobWorker(job),
      status: /in_progress|started|active|on_my_way/.test(jobStatus(job)) ? 'Live job' : 'Job site',
      job: jobTitle(job),
      location: jobAddress(job),
      gps: jobAddress(job),
      map_query: jobAddress(job),
      proof: 'Mapped from job address',
      messages: jobTime(job) ? `${jobTime(job)} scheduled` : 'No worker GPS yet',
      timesheet: 'GPS fallback',
      source: 'job_address_fallback',
      active: true,
    }));
  } catch (_) {
    return [];
  }
}
async function load(force = false) {
  if (!token()) return cached;
  if (!force && cached && Date.now() - lastLoad < 8000) return cached;
  lastLoad = Date.now();
  let data = null;
  try { data = await request('GET', '/onsite/live'); } catch (_) { data = null; }
  const liveRows = Array.isArray(data?.onsite) ? data.onsite : [];
  const hasLiveMap = Boolean(liveMapQuery(liveRows));
  if (!hasLiveMap) {
    const fallbackRows = await jobFallbackRows();
    if (fallbackRows.length) {
      data = data || {};
      data.onsite = liveRows.length ? liveRows.concat(fallbackRows) : fallbackRows;
      data.warnings = Array.isArray(data.warnings) ? data.warnings : [];
      data.warnings.unshift({ type: 'gps_fallback', message: 'Showing job site map until live worker GPS arrives.' });
      data.counts = { ...(data.counts || {}), onsite: data.onsite.length, warnings: data.warnings.length };
      data.map_source = 'job_address_fallback';
    }
  }
  cached = data;
  return cached;
}
function isOnsitePage() {
  const page = activePage();
  return page === 'workers' || page === 'onsite';
}
function setPageFlags() {
  const onsite = isOnsitePage();
  document.documentElement.toggleAttribute('data-onsite-hard-lock', onsite);
  document.documentElement.toggleAttribute('data-owner-page', onsite);
  if (onsite) document.documentElement.setAttribute('data-owner-page', 'onsite');
  const pageRoot = root();
  if (pageRoot) pageRoot.classList.toggle('onsiteOnlyPage', onsite);
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
    if (title) title.textContent = 'Onsite';
    if (subtitle) subtitle.textContent = 'Live map, workers doing work, GPS, proof, messages and field warnings.';
  }
}
function cleanupTeamCopy() {
  const page = activePage();
  if (page !== 'team') return;
  const title = document.querySelector('.churvoxOptionC .title p');
  if (title) title.textContent = 'Staff records, roles, access, invites, payroll review and worker app setup.';
}
function onsiteHtml(data) {
  const rows = Array.isArray(data?.onsite) ? data.onsite : [];
  const warnings = Array.isArray(data?.warnings) ? data.warnings : [];
  const counts = data?.counts || {};
  const query = liveMapQuery(rows);
  const fallback = data?.map_source === 'job_address_fallback';
  const mapBlock = query ? `<div class="onsiteMapShell ${fallback ? 'onsiteMapFallback' : ''}">
      ${fallback ? '<span class="onsiteMapBadge">Job site map · waiting for live GPS</span>' : ''}
      <iframe title="Onsite Google Maps" src="${esc(mapUrl(query))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      <a href="${esc(mapSearch(query))}" target="_blank" rel="noreferrer">Open in Google Maps</a>
    </div>` : `<div class="onsiteMapShell onsiteMapEmpty"><strong>No job site or live location yet</strong><p>Onsite will map live GPS first. If GPS is missing, it will map the current job address.</p></div>`;
  return `
    <div class="onsiteHero">
      <div>
        <span>Onsite</span>
        <h2>Live field view.</h2>
        <p>GPS is first choice. If GPS fails, Churvox maps the current job address so the boss still sees where work is meant to happen.</p>
      </div>
      <strong>${counts.onsite || rows.length} onsite</strong>
    </div>
    ${mapBlock}
    <div class="onsiteStats">
      <article><b>${counts.onsite || rows.length}</b><small>mapped jobs/workers</small></article>
      <article><b>${warnings.length}</b><small>field warnings</small></article>
    </div>
    <div class="onsiteRows">
      ${rows.slice(0, 8).map((row) => `<article data-onsite-worker="${esc(row.id || row.name)}" class="${row.source === 'job_address_fallback' ? 'onsiteFallbackRow' : ''}">
        <div><b>${esc(row.name || 'Worker')}</b><small>${esc(row.status || 'Onsite')} · ${esc(row.job || 'No current job')}</small></div>
        <span>${esc(realLocation(row.location || row.gps || row.map_query) || 'No live GPS yet')}</span>
        <em>${esc(row.proof || 'No proof yet')}</em>
        <small>${esc(row.messages || 'No messages')} · ${esc(row.timesheet || 'No time yet')}</small>
      </article>`).join('') || '<p>No worker or job site can be mapped yet.</p>'}
    </div>
    <div class="onsiteWarnings">
      ${warnings.slice(0, 6).map((warning) => `<span>${esc(warning.message || warning.type)}</span>`).join('') || '<span>No live field warnings.</span>'}
    </div>`;
}
function hardLockOnsitePage() {
  const pageRoot = root();
  if (!pageRoot || !isOnsitePage()) return;
  pageRoot.classList.add('onsiteOnlyPage');
  Array.from(pageRoot.children).forEach((child) => {
    if (child.id === PANEL_ID) {
      child.removeAttribute('data-onsite-old-panel');
      child.removeAttribute('aria-hidden');
      return;
    }
    if (child.getAttribute('data-onsite-old-panel') !== 'true') child.setAttribute('data-onsite-old-panel', 'true');
    if (child.getAttribute('aria-hidden') !== 'true') child.setAttribute('aria-hidden', 'true');
  });
}
async function renderOnsite(force = false) {
  setPageFlags();
  renameNav();
  cleanupTeamCopy();
  if (!isOnsitePage()) {
    document.getElementById(PANEL_ID)?.remove();
    document.querySelectorAll('[data-onsite-old-panel="true"]').forEach((node) => {
      node.removeAttribute('data-onsite-old-panel');
      node.removeAttribute('aria-hidden');
    });
    root()?.classList.remove('onsiteOnlyPage');
    return;
  }
  const pageRoot = root();
  if (!pageRoot) return;
  let node = document.getElementById(PANEL_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = PANEL_ID;
    node.className = 'onsiteLivePanel';
  }
  if (pageRoot.firstElementChild !== node) pageRoot.prepend(node);
  const data = await load(force);
  renderHtml(node, onsiteHtml(data || {}));
  hardLockOnsitePage();
}
function schedule(force = false) {
  if (queued) return;
  queued = true;
  window.setTimeout(async () => {
    queued = false;
    await renderOnsite(force);
  }, 80);
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
