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
  return clean(worker?.address || worker?.location || worker?.current_address || worker?.site_address || worker?.area || worker?.region || 'Auckland New Zealand');
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
function removePinMap() {
  document.querySelector('[data-churvox-worker-pin-map]')?.remove();
}
function build(worker) {
  const name = workerName(worker);
  const place = workerPlace(worker);
  const status = workerStatus(worker);
  const job = workerJob(worker);
  return `<section class="cvxWorkerPinMap" data-churvox-worker-pin-map="true"><header><div><b>${name} worker pin</b><small>${place}</small></div><a href="${openUrl(place)}" target="_blank" rel="noreferrer">Open map</a></header><iframe title="${name} worker map" src="${mapsUrl(place)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe><div class="pinMeta"><span>${status}</span><span>${job}</span><span>Worker location</span></div></section>`;
}
async function apply() {
  if (typeof window === 'undefined' || busy) return;
  if (!isWorkersPage()) { removePinMap(); return; }
  const page = document.querySelector('.cvxPage');
  if (!page) return;
  busy = true;
  try {
    const worker = firstRealWorker(await getWorkers());
    if (!worker) return;
    removePinMap();
    const hero = page.querySelector('.cvxHero');
    const wrap = document.createElement('div');
    wrap.innerHTML = build(worker);
    const node = wrap.firstElementChild;
    if (hero?.nextSibling) page.insertBefore(node, hero.nextSibling);
    else page.prepend(node);
  } catch {} finally { busy = false; }
}
function schedule() { [0, 300, 900, 1800].forEach((delay) => setTimeout(apply, delay)); }
schedule();
window.addEventListener('hashchange', schedule);
window.addEventListener('popstate', schedule);
window.addEventListener('churvox-owner-app-ready', schedule);
window.addEventListener('churvox:data-refresh', () => { memo = { at: 0, workers: [] }; schedule(); });
