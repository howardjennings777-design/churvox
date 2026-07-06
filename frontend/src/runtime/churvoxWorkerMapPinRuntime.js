import API_BASE from '../lib/apiBase';

const ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
let memo = { at: 0, workers: [] };
let busy = false;

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function isWorkersPage() {
  const path = window.location.pathname || '';
  const hash = clean((window.location.hash || '').replace('#', '')).toLowerCase();
  const title = clean(document.querySelector('.cvxTopTitle h1')?.textContent || document.querySelector('h1')?.textContent).toLowerCase();
  return path.startsWith('/dashboard') && (hash === 'workers' || (!hash && /workers?/.test(title)));
}
function list(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.workers)) return payload.workers;
  if (Array.isArray(payload?.team)) return payload.team;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}
async function getWorkers() {
  if (Date.now() - memo.at < 15000 && memo.workers.length) return memo.workers;
  const paths = ['/team', '/team/workers', '/workers'];
  for (const path of paths) {
    try {
      const res = await fetch(`${ROOT}${path}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      const rows = list(data).filter(Boolean);
      if (rows.length) {
        memo = { at: Date.now(), workers: rows };
        return rows;
      }
    } catch {}
  }
  memo = { at: Date.now(), workers: [] };
  return [];
}
function firstRealWorker(rows) {
  return rows.find((w) => clean(w.name || w.full_name || w.email || w.worker_name)) || rows[0] || null;
}
function workerName(worker) {
  return clean(worker?.name || worker?.full_name || worker?.worker_name || worker?.email || 'Worker');
}
function workerPlace(worker) {
  const lat = clean(worker?.lat || worker?.latitude || worker?.gps_lat || worker?.last_latitude || worker?.location_lat);
  const lng = clean(worker?.lng || worker?.longitude || worker?.gps_lng || worker?.last_longitude || worker?.location_lng);
  if (lat && lng) return `${lat},${lng}`;
  return clean(worker?.gps || worker?.location || worker?.address || worker?.current_address || worker?.site_address || worker?.area || worker?.region || 'Auckland New Zealand');
}
function workerStatus(worker) {
  return clean(worker?.status || worker?.app || worker?.availability || worker?.role || 'Field worker');
}
function workerJob(worker) {
  return clean(worker?.current_job || worker?.job || worker?.job_title || worker?.assigned_job || 'Current worker pin');
}
function mapsUrl(place) {
  return `https://www.google.com/maps?q=${encodeURIComponent(place)}&output=embed`;
}
function openUrl(place) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}
function removeExtraPinMap() {
  document.querySelectorAll('[data-churvox-worker-pin-map]').forEach((node) => node.remove());
}
function gpsPanel(page) {
  return [...page.querySelectorAll('.cvxPanel')].find((panel) => /gps map/i.test(clean(panel.querySelector('h3')?.textContent || panel.textContent || '')));
}
function mapMeta(worker, place) {
  const name = workerName(worker);
  const status = workerStatus(worker);
  const job = workerJob(worker);
  return `<div class="cvxWorkerMapMeta" data-worker-map-meta="true"><b>${name}</b><span>${place}</span><em>${status}</em><em>${job}</em><a href="${openUrl(place)}" target="_blank" rel="noreferrer">Open map</a></div>`;
}
async function apply() {
  if (typeof window === 'undefined' || busy) return;
  removeExtraPinMap();
  if (!isWorkersPage()) return;
  const page = document.querySelector('.cvxPage');
  const hero = page?.querySelector('.cvxHero');
  if (!page || !hero) return;
  busy = true;
  try {
    const worker = firstRealWorker(await getWorkers());
    if (!worker) return;
    const place = workerPlace(worker);
    const panel = gpsPanel(page);
    const iframe = panel?.querySelector('iframe');
    if (!panel || !iframe) return;
    iframe.src = mapsUrl(place);
    iframe.title = `${workerName(worker)} worker map`;
    panel.querySelector('[data-worker-map-meta]')?.remove();
    const map = panel.querySelector('.cvxMap') || iframe.parentElement || panel;
    const wrap = document.createElement('div');
    wrap.innerHTML = mapMeta(worker, place);
    map.prepend(wrap.firstElementChild);
  } catch {} finally { busy = false; }
}
function schedule() { [0, 300, 900, 1800, 3500, 6000].forEach((delay) => setTimeout(apply, delay)); }
schedule();
window.addEventListener('hashchange', schedule);
window.addEventListener('popstate', schedule);
window.addEventListener('churvox-owner-app-ready', schedule);
window.addEventListener('churvox:data-refresh', () => { memo = { at: 0, workers: [] }; schedule(); });
