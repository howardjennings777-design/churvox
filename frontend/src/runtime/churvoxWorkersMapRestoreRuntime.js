import API_BASE from '../lib/apiBase';

const STYLE_ID = 'churvox-workers-map-restore-style';
let cache = { at: 0, workers: [] };
let restoring = false;

const css = `
  .cv3WorkerMapPanel {
    min-height: 520px;
    align-self: stretch;
  }
  .cv3WorkerMapPanel > header {
    position: relative;
    z-index: 2;
  }
  .cv3WorkerMapPanel .cv3WorkerMapShell {
    height: clamp(360px, 42vh, 540px);
    margin: 12px 14px 14px;
    border: 1px solid rgba(16,21,19,.10);
    border-radius: 24px;
    overflow: hidden;
    background: #dfe9df;
    position: relative;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.35);
  }
  .cv3WorkerMapPanel iframe {
    width: 100%;
    height: 100%;
    min-height: 100%;
    border: 0;
    display: block;
    filter: saturate(.96) contrast(1.02);
    background: #dfe9df;
  }
  .cv3WorkerMapPinBar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 8px;
    margin: 0 14px 12px;
  }
  .cv3WorkerPin {
    appearance: none;
    border: 1px solid rgba(16,21,19,.10);
    border-radius: 16px;
    padding: 10px 11px;
    background: rgba(255,255,255,.9);
    color: #101513;
    text-align: left;
    cursor: pointer;
  }
  .cv3WorkerPin[disabled] {
    cursor: not-allowed;
    opacity: .68;
    background: rgba(244,241,235,.78);
  }
  .cv3WorkerPin[aria-pressed="true"] {
    border-color: rgba(243,107,33,.85);
    box-shadow: 0 0 0 3px rgba(243,107,33,.16);
  }
  .cv3WorkerPin b { display:block; font-size: 12px; font-weight: 1000; line-height: 1.15; }
  .cv3WorkerPin span { display:block; margin-top:3px; color:#59655f; font-size: 11px; font-weight: 820; line-height: 1.25; overflow-wrap:anywhere; }
  .cv3WorkerPin em { display:inline-flex; margin-top:7px; border-radius:999px; padding:4px 7px; background:rgba(16,21,19,.08); color:#101513; font-size:9px; font-style:normal; font-weight:1000; letter-spacing:.06em; text-transform:uppercase; }
  .cv3WorkerPin[aria-pressed="true"] em { background: rgba(243,107,33,.16); color: #a43f08; }
  .cv3WorkerPinOpen {
    display:inline-flex;
    margin: 0 14px 12px;
    width: fit-content;
    border-radius:999px;
    padding:8px 11px;
    background:#101513;
    color:white;
    text-decoration:none;
    font-size:11px;
    font-weight:1000;
  }
  .cv3WorkerMapPanel .cv3WorkerMapNote {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin: 0 14px 14px;
    color: #51605a;
    font-size: 12px;
    font-weight: 820;
    line-height: 1.35;
  }
  .cv3WorkerMapPanel .cv3WorkerMapNote b {
    color: #101513;
    font-weight: 1000;
  }
  @media(max-width:720px){.cv3WorkerMapPanel{min-height:430px}.cv3WorkerMapPanel .cv3WorkerMapShell{height:300px;margin:12px;border-radius:20px}.cv3WorkerMapPinBar{grid-template-columns:1fr;margin:0 12px 10px}}
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
  } catch {
    return {};
  }
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
  } catch {
    return [];
  }
}
async function loadWorkers() {
  const now = Date.now();
  if (now - cache.at < 15000) return cache.workers;
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
function workerName(worker, index = 0) {
  return first(worker, ['name', 'full_name', 'display_name', 'worker_name', 'email']) || `Worker ${index + 1}`;
}
function workerStatus(worker) {
  return first(worker, ['status', 'clock_status', 'availability', 'app_status', 'invite_status', 'role']) || 'Field worker';
}
function workerJob(worker) {
  return first(worker, ['current_job', 'job', 'job_title', 'assigned_job', 'current_job_title']) || 'No current job';
}
function numberValue(value) {
  const raw = clean(value).replace(/[^0-9.-]/g, '');
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
function latLng(worker) {
  const lat = numberValue(first(worker, ['lat', 'latitude', 'gps_lat', 'last_latitude', 'location_lat', 'current_latitude', 'worker_latitude']));
  const lng = numberValue(first(worker, ['lng', 'lon', 'long', 'longitude', 'gps_lng', 'gps_lon', 'last_longitude', 'location_lng', 'current_longitude', 'worker_longitude']));
  if (lat === null || lng === null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng, place: `${lat},${lng}`, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, kind: 'GPS' };
}
function gpsPairFromText(value) {
  const match = clean(value).match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng, place: `${lat},${lng}`, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, kind: 'GPS' };
}
function workerPlace(worker) {
  const direct = latLng(worker);
  if (direct) return direct;
  const text = first(worker, ['gps', 'location', 'current_location', 'last_location', 'address', 'site_address', 'current_job_address', 'current_address', 'area', 'region']);
  const pair = gpsPairFromText(text);
  if (pair) return pair;
  const job = first(worker, ['current_job', 'job_title', 'assigned_job']);
  const fallback = text || job;
  if (!fallback) return null;
  return { place: fallback, label: fallback, kind: text ? 'Location' : 'Job' };
}
function mapUrl(place, zoom = 13) {
  return `https://www.google.com/maps?q=${encodeURIComponent(place)}&z=${zoom}&output=embed`;
}
function openUrl(place) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}
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
function isWorkersPage() {
  const hash = (window.location.hash || '').toLowerCase();
  if (hash.includes('workers')) return true;
  const title = document.querySelector('.cv3TopCopy h1')?.textContent || document.querySelector('h1')?.textContent || '';
  return /workers/i.test(title) && document.querySelector('.cv3Product');
}
function mapQueryFromDom() {
  const text = Array.from(document.querySelectorAll('.cv3Row small,.cv3Tiles small')).map((node) => clean(node.textContent)).filter(Boolean).join(' ');
  return text || 'Auckland New Zealand';
}
function pinButton(pin, index, active) {
  const hasPlace = Boolean(pin.place?.place);
  return `<button type="button" class="cv3WorkerPin" data-worker-pin-index="${index}" aria-pressed="${active ? 'true' : 'false'}" ${hasPlace ? '' : 'disabled'}>
    <b>${escapeHtml(pin.name)}</b>
    <span>${escapeHtml(pin.place?.label || 'No GPS/location saved yet')}</span>
    <span>${escapeHtml(pin.job)}</span>
    <em>${escapeHtml(hasPlace ? pin.place.kind : 'No pin')}</em>
  </button>`;
}
function makeMapPanel(pins) {
  const section = document.createElement('section');
  section.className = 'cv3Panel cv3WorkerMapPanel span7';
  section.dataset.churvoxSingleWorkerMap = 'true';
  const activeIndex = Math.max(0, pins.findIndex((pin) => pin.place?.place));
  const active = pins[activeIndex]?.place?.place ? pins[activeIndex] : null;
  const startPlace = active?.place?.place || mapQueryFromDom();
  section.innerHTML = `
    <header><div><small>field map</small><h3>Worker map</h3></div></header>
    <div class="cv3WorkerMapShell"><iframe title="Worker map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${mapUrl(startPlace)}"></iframe></div>
    <div class="cv3WorkerMapPinBar">${pins.length ? pins.map((pin, index) => pinButton(pin, index, index === activeIndex && Boolean(active))).join('') : '<button type="button" class="cv3WorkerPin" disabled><b>No workers yet</b><span>Add workers and save GPS/location or current job address.</span><em>No pin</em></button>'}</div>
    ${active ? `<a class="cv3WorkerPinOpen" href="${openUrl(active.place.place)}" target="_blank" rel="noreferrer">Open ${escapeHtml(active.name)} in Maps</a>` : ''}
    <div class="cv3WorkerMapNote"><b>${pins.filter((pin) => pin.place?.place).length || 0} pinned</b><span>Uses live lat/lng first, then GPS text, location, job/site address, or current job text.</span></div>
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
      const iframe = panel.querySelector('iframe');
      if (iframe) {
        iframe.src = mapUrl(pin.place.place, pin.place.kind === 'GPS' ? 15 : 13);
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
  const fresh = makeMapPanel(pins);
  panel.innerHTML = fresh.innerHTML;
  wireMapPanel(panel, pins, Math.max(0, pins.findIndex((pin) => pin.place?.place)));
}
function heroNode(page) {
  return page.querySelector('.cv3Hero') || Array.from(page.children).find((node) => /Know what is happening outside|Workers/i.test(node.textContent || '')) || null;
}
function fieldBoardNode(page) {
  return Array.from(page.querySelectorAll('.cv3Panel')).find((panelNode) => /Field board/i.test(panelNode.textContent || '')) || null;
}
function preferredAnchor(page) {
  return heroNode(page) || fieldBoardNode(page) || page.firstElementChild || null;
}
function removeDuplicateMaps(page) {
  const panels = Array.from(page.querySelectorAll('.cv3WorkerMapPanel,[data-churvox-single-worker-map="true"]'));
  panels.slice(1).forEach((panel) => panel.remove());
  return panels[0] || null;
}
function placeMap(page, panel) {
  const anchor = preferredAnchor(page);
  if (!anchor) {
    page.prepend(panel);
    return;
  }
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
      return;
    }
    if (!isWorkersPage()) return;
    const panel = makeMapPanel(pins);
    placeMap(page, panel);
    removeDuplicateMaps(page);
  } finally {
    restoring = false;
  }
}
function scheduleRestore(delay = 80) {
  setTimeout(restoreMap, delay);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKERS_MAP_RESTORE_RUNTIME__) {
  window.__CHURVOX_WORKERS_MAP_RESTORE_RUNTIME__ = true;
  restoreMap();
  window.addEventListener('load', () => scheduleRestore(120));
  window.addEventListener('hashchange', () => scheduleRestore(120));
  window.addEventListener('popstate', () => scheduleRestore(120));
  window.addEventListener('churvox:data-refresh', () => { cache = { at: 0, workers: [] }; scheduleRestore(160); });
  document.addEventListener('click', () => scheduleRestore(80), true);
  const observer = new MutationObserver(() => scheduleRestore(80));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(restoreMap, 2500);
}

export {};
