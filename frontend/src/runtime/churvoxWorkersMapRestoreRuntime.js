import API_BASE from '../lib/apiBase';

const STYLE_ID = 'churvox-workers-map-real-style';
let cache = { at: 0, workers: [] };
let restoring = false;
let forceNextRefresh = false;

const css = `
  .cv3WorkerMapPanel {
    grid-column: 1 / -1 !important;
    width: 100% !important;
    min-height: 520px;
    align-self: stretch;
    display: block !important;
    overflow: visible !important;
  }
  .cv3WorkerMapPanel > header { position: relative; z-index: 2; }
  .cv3WorkerMapShell {
    min-height: 420px;
    height: clamp(420px, 54vh, 680px);
    margin: 14px;
    border: 1px solid rgba(16,21,19,.10);
    border-radius: 24px;
    overflow: hidden;
    background: #dfe9df;
    position: relative;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.35), 0 16px 38px rgba(16,21,19,.08);
  }
  .cv3WorkerMapShell iframe {
    width: 100%; height: 100%; min-height: 100%; border: 0; display: block;
    filter: saturate(.98) contrast(1.03); background: #dfe9df;
  }
  .cv3WorkerMapEmpty {
    min-height: 330px;
    display: grid;
    place-items: center;
    text-align: center;
    padding: 28px;
    color: #51605a;
  }
  .cv3WorkerMapEmpty b { display:block; color:#101513; font-size:22px; font-weight:1000; letter-spacing:-.04em; }
  .cv3WorkerMapEmpty span { display:block; max-width:620px; margin-top:8px; font-size:13px; font-weight:850; line-height:1.55; }
  .cv3WorkerMapPinBar { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; margin: 0 14px 12px; }
  .cv3WorkerPin { appearance:none; border:1px solid rgba(16,21,19,.10); border-radius:16px; padding:10px 11px; background:rgba(255,255,255,.92); color:#101513; text-align:left; cursor:pointer; }
  .cv3WorkerPin[disabled] { cursor:not-allowed; opacity:.72; background:rgba(244,241,235,.82); }
  .cv3WorkerPin[aria-pressed="true"] { border-color:rgba(243,107,33,.85); box-shadow:0 0 0 3px rgba(243,107,33,.16); }
  .cv3WorkerPin b { display:block; font-size:12px; font-weight:1000; line-height:1.15; }
  .cv3WorkerPin span { display:block; margin-top:3px; color:#59655f; font-size:11px; font-weight:820; line-height:1.25; overflow-wrap:anywhere; }
  .cv3WorkerPin em { display:inline-flex; margin-top:7px; border-radius:999px; padding:4px 7px; background:rgba(16,21,19,.08); color:#101513; font-size:9px; font-style:normal; font-weight:1000; letter-spacing:.06em; text-transform:uppercase; }
  .cv3WorkerPin[aria-pressed="true"] em { background:rgba(243,107,33,.16); color:#a43f08; }
  .cv3WorkerPinOpen { display:inline-flex; margin:0 14px 12px; width:fit-content; border-radius:999px; padding:8px 11px; background:#101513; color:white; text-decoration:none; font-size:11px; font-weight:1000; }
  .cv3WorkerMapNote { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:0 14px 14px; color:#51605a; font-size:12px; font-weight:820; line-height:1.35; }
  .cv3WorkerMapNote b { color:#101513; font-weight:1000; }
  @media(max-width:720px){.cv3WorkerMapPanel{min-height:470px}.cv3WorkerMapShell{height:330px;min-height:330px;margin:12px;border-radius:20px}.cv3WorkerMapPinBar{grid-template-columns:1fr;margin:0 12px 10px}}
`;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  } else if (style.textContent !== css) {
    style.textContent = css;
  }
}

function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function authHeaders() {
  try {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}
function rowsFromPayload(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.team)) return body.team;
  if (Array.isArray(body?.workers)) return body.workers;
  if (Array.isArray(body?.data?.team)) return body.data.team;
  if (Array.isArray(body?.data?.workers)) return body.data.workers;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.results)) return body.results;
  return [];
}
async function fetchWorkers(path) {
  try {
    const response = await fetch(`${API_BASE}/api${path}`, { credentials: 'include', headers: authHeaders() });
    if (!response.ok) return [];
    return rowsFromPayload(await response.json()).filter(Boolean);
  } catch { return []; }
}
async function loadWorkers() {
  const now = Date.now();
  if (!forceNextRefresh && now - cache.at < 15000) return cache.workers;
  forceNextRefresh = false;
  const paths = ['/team', '/team/workers', '/workers'];
  const seen = new Set();
  const workers = [];
  for (const path of paths) {
    const rows = await fetchWorkers(path);
    rows.forEach((row, index) => {
      const key = clean(row.id || row._id || row.user_id || row.email || row.phone || row.name || row.full_name || `${path}-${index}`).toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      workers.push(row);
    });
  }
  cache = { at: now, workers };
  return cache.workers;
}
function first(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && clean(value)) return clean(value);
  }
  return '';
}
function workerName(worker, index = 0) { return first(worker, ['name', 'full_name', 'display_name', 'worker_name', 'email']) || `Worker ${index + 1}`; }
function workerStatus(worker) { return first(worker, ['status', 'clock_status', 'availability', 'app_status', 'invite_status', 'role']) || 'Field worker'; }
function workerJob(worker) { return first(worker, ['current_job_address', 'site_address', 'job_address', 'current_job', 'job', 'job_title', 'assigned_job', 'current_job_title']) || 'No current job'; }
function numberValue(value) {
  const raw = clean(value).replace(/[^0-9.-]/g, '');
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}
function latLng(worker) {
  const lat = numberValue(first(worker, ['lat', 'latitude', 'gps_lat', 'last_latitude', 'location_lat', 'current_latitude', 'worker_latitude']));
  const lng = numberValue(first(worker, ['lng', 'lon', 'long', 'longitude', 'gps_lng', 'gps_lon', 'last_longitude', 'location_lng', 'current_longitude', 'worker_longitude']));
  if (lat === null || lng === null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { place: `${lat},${lng}`, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, kind: 'GPS' };
}
function gpsPairFromText(value) {
  const match = clean(value).match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { place: `${lat},${lng}`, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, kind: 'GPS' };
}
function workerPlace(worker) {
  const direct = latLng(worker);
  if (direct) return direct;
  const gpsText = first(worker, ['gps', 'gps_text', 'location_gps', 'last_location_gps']);
  const gpsPair = gpsPairFromText(gpsText);
  if (gpsPair) return gpsPair;
  const location = first(worker, [
    'current_location', 'last_location', 'location',
    'current_job_address', 'job_address', 'site_address', 'address', 'current_address',
    'suburb', 'area', 'region'
  ]);
  if (!location) return null;
  return { place: location, label: location, kind: /address|street|road|rd|avenue|ave|lane|drive|dr|terrace|terr/i.test(location) ? 'Address' : 'Location' };
}
function mapUrl(place, zoom = 14) { return `https://www.google.com/maps?q=${encodeURIComponent(place)}&z=${zoom}&output=embed`; }
function openUrl(place) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`; }
function pinData(workers) {
  return workers.map((worker, index) => {
    const place = workerPlace(worker);
    return {
      id: clean(worker.id || worker._id || worker.user_id || worker.email || worker.phone || workerName(worker, index) || index),
      name: workerName(worker, index),
      status: workerStatus(worker),
      job: workerJob(worker),
      place,
    };
  }).filter((pin) => pin.name);
}
function pinSignature(pins) { return pins.map((pin) => [pin.id, pin.name, pin.place?.place || '', pin.status, pin.job].join('|')).join('||') || 'no-workers'; }
function isWorkersPage() {
  const hash = (window.location.hash || '').toLowerCase();
  if (hash.includes('workers')) return true;
  const title = document.querySelector('.cv3TopCopy h1')?.textContent || document.querySelector('h1')?.textContent || '';
  return /workers/i.test(title) && document.querySelector('.cv3Product');
}
function pinButton(pin, index, active) {
  const hasPlace = Boolean(pin.place?.place);
  return `<button type="button" class="cv3WorkerPin" data-worker-pin-index="${index}" aria-pressed="${active ? 'true' : 'false'}" ${hasPlace ? '' : 'disabled'}>
    <b>${escapeHtml(pin.name)}</b>
    <span>${escapeHtml(pin.place?.label || 'No real location saved yet')}</span>
    <span>${escapeHtml(pin.job)}</span>
    <em>${escapeHtml(hasPlace ? pin.place.kind : 'No pin')}</em>
  </button>`;
}
function makeMapPanel(pins) {
  const section = document.createElement('section');
  section.className = 'cv3Panel cv3WorkerMapPanel span12';
  section.dataset.churvoxSingleWorkerMap = 'true';
  section.dataset.workerPinSignature = pinSignature(pins);
  const activeIndex = Math.max(0, pins.findIndex((pin) => pin.place?.place));
  const active = pins[activeIndex]?.place?.place ? pins[activeIndex] : null;
  const pinned = pins.filter((pin) => pin.place?.place);
  section.innerHTML = `
    <header><div><small>real field map</small><h3>Worker map</h3></div></header>
    <div class="cv3WorkerMapShell">${active ? `<iframe title="${escapeHtml(active.name)} worker map" loading="eager" referrerpolicy="no-referrer-when-downgrade" src="${mapUrl(active.place.place, active.place.kind === 'GPS' ? 15 : 14)}"></iframe>` : `<div class="cv3WorkerMapEmpty"><div><b>No real worker location saved yet</b><span>Churvox will not fake a pin. Save worker GPS, live location, site address, current job address, suburb or area and this map will pin that worker.</span></div></div>`}</div>
    <div class="cv3WorkerMapPinBar">${pins.length ? pins.map((pin, index) => pinButton(pin, index, index === activeIndex && Boolean(active))).join('') : '<button type="button" class="cv3WorkerPin" disabled><b>No workers yet</b><span>Add workers first, then save GPS/location or job address.</span><em>No pin</em></button>'}</div>
    ${active ? `<a class="cv3WorkerPinOpen" href="${openUrl(active.place.place)}" target="_blank" rel="noreferrer">Open ${escapeHtml(active.name)} in Maps</a>` : ''}
    <div class="cv3WorkerMapNote"><b>${pinned.length} real pin${pinned.length === 1 ? '' : 's'}</b><span>No Auckland/default fallback. Uses real lat/lng first, then saved GPS text, location, site address or job address.</span></div>
  `;
  wireMapPanel(section, pins, activeIndex);
  return section;
}
function wireMapPanel(panel, pins, startIndex = 0) {
  panel.querySelectorAll('[data-worker-pin-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.getAttribute('data-worker-pin-index'));
      const pin = pins[index];
      if (!pin?.place?.place) return;
      let iframe = panel.querySelector('iframe');
      const shell = panel.querySelector('.cv3WorkerMapShell');
      if (!iframe && shell) {
        shell.innerHTML = '<iframe title="Worker map" loading="eager" referrerpolicy="no-referrer-when-downgrade"></iframe>';
        iframe = shell.querySelector('iframe');
      }
      if (iframe) {
        iframe.src = mapUrl(pin.place.place, pin.place.kind === 'GPS' ? 15 : 14);
        iframe.title = `${pin.name} worker map`;
      }
      panel.querySelectorAll('.cv3WorkerPin').forEach((node) => node.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
      let link = panel.querySelector('.cv3WorkerPinOpen');
      if (!link) {
        link = document.createElement('a');
        link.className = 'cv3WorkerPinOpen';
        link.target = '_blank';
        link.rel = 'noreferrer';
        const note = panel.querySelector('.cv3WorkerMapNote');
        if (note) note.insertAdjacentElement('beforebegin', link);
        else panel.appendChild(link);
      }
      link.href = openUrl(pin.place.place);
      link.textContent = `Open ${pin.name} in Maps`;
    });
  });
  const firstButton = panel.querySelector(`[data-worker-pin-index="${startIndex}"]`);
  if (firstButton) firstButton.setAttribute('aria-pressed', 'true');
}
function updateMapPanel(panel, pins) {
  const signature = pinSignature(pins);
  if (!forceNextRefresh && panel.dataset.workerPinSignature === signature && panel.querySelector('.cv3WorkerMapShell')) {
    wireMapPanel(panel, pins, Math.max(0, pins.findIndex((pin) => pin.place?.place)));
    return;
  }
  const fresh = makeMapPanel(pins);
  panel.className = fresh.className;
  panel.dataset.workerPinSignature = signature;
  panel.innerHTML = fresh.innerHTML;
  wireMapPanel(panel, pins, Math.max(0, pins.findIndex((pin) => pin.place?.place)));
}
function heroNode(page) { return page.querySelector('.cv3Hero') || Array.from(page.children).find((node) => /Know what is happening outside|Workers/i.test(node.textContent || '')) || null; }
function preferredAnchor(page) { return heroNode(page) || page.firstElementChild || null; }
function removeDuplicateMaps(page) {
  const panels = Array.from(page.querySelectorAll('.cv3WorkerMapPanel,[data-churvox-single-worker-map="true"]'));
  panels.slice(1).forEach((panel) => panel.remove());
  return panels[0] || null;
}
function placeMap(page, panel) {
  const anchor = preferredAnchor(page);
  if (!anchor) return page.prepend(panel);
  if (panel.previousElementSibling === anchor) return;
  anchor.insertAdjacentElement('afterend', panel);
}
async function restoreMap() {
  if (typeof document === 'undefined' || restoring || !isWorkersPage()) return;
  const page = document.querySelector('.cv3Page');
  if (!page) return;
  ensureStyle();
  restoring = true;
  try {
    const workers = await loadWorkers();
    const pins = pinData(workers);
    const existing = removeDuplicateMaps(page);
    if (existing) {
      updateMapPanel(existing, pins);
      placeMap(page, existing);
      forceNextRefresh = false;
      return;
    }
    if (!isWorkersPage()) return;
    const panel = makeMapPanel(pins);
    placeMap(page, panel);
    removeDuplicateMaps(page);
  } finally { restoring = false; }
}
function scheduleRestore(delay = 80) { setTimeout(restoreMap, delay); }
function scheduleBurst() { [80, 300, 900, 1800, 3600].forEach(scheduleRestore); }

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKERS_REAL_MAP_RUNTIME__) {
  window.__CHURVOX_WORKERS_REAL_MAP_RUNTIME__ = true;
  scheduleBurst();
  window.addEventListener('load', scheduleBurst);
  window.addEventListener('hashchange', scheduleBurst);
  window.addEventListener('popstate', scheduleBurst);
  window.addEventListener('churvox:data-refresh', () => { cache = { at: 0, workers: [] }; forceNextRefresh = true; scheduleBurst(); });
}

export {};
