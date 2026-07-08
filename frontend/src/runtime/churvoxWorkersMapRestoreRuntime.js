import API_BASE from '../lib/apiBase';

const STYLE_ID = 'churvox-workers-map-restore-style';
let cache = { at: 0, workers: [] };

const css = `
  .cv3WorkerMapPanel { min-height: 420px; }
  .cv3WorkerMapPanel .cv3WorkerMapShell {
    height: 350px;
    margin: 14px;
    border: 1px solid rgba(16,21,19,.10);
    border-radius: 24px;
    overflow: hidden;
    background: #e8efe8;
    position: relative;
  }
  .cv3WorkerMapPanel iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
    filter: saturate(.92) contrast(.98);
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
  @media(max-width:720px){.cv3WorkerMapPanel .cv3WorkerMapShell{height:280px;margin:12px;border-radius:20px}}
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
  return [];
}
async function loadWorkers() {
  const now = Date.now();
  if (now - cache.at < 15000) return cache.workers;
  try {
    const response = await fetch(`${API_BASE}/api/team`, { credentials: 'include', headers: authHeaders() });
    if (!response.ok) throw new Error('team fetch failed');
    cache = { at: now, workers: rowsFromPayload(await response.json()) };
  } catch {
    cache = { at: now, workers: [] };
  }
  return cache.workers;
}
function workerLocation(worker) {
  return clean(worker.gps || worker.location || worker.current_location || worker.address || worker.site_address || worker.current_job_address || worker.current_job || worker.job_title || '');
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
function makeMapPanel(query, workerCount) {
  const section = document.createElement('section');
  section.className = 'cv3Panel cv3WorkerMapPanel span7';
  section.innerHTML = `
    <header><div><small>field map</small><h3>Worker map</h3></div></header>
    <div class="cv3WorkerMapShell"><iframe title="Worker map" loading="lazy" src="https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed"></iframe></div>
    <div class="cv3WorkerMapNote"><b>${workerCount || 'Field'} view</b><span>Uses worker GPS/location notes, current job address, or job text when live GPS is not available.</span></div>
  `;
  return section;
}
async function restoreMap() {
  if (typeof document === 'undefined' || !isWorkersPage()) return;
  ensureStyle();
  const page = document.querySelector('.cv3Page');
  if (!page || page.querySelector('.cv3WorkerMapPanel')) return;
  const workers = await loadWorkers();
  const query = workers.map(workerLocation).filter(Boolean).join(' ') || mapQueryFromDom();
  const panel = makeMapPanel(query || 'Auckland New Zealand', workers.length);
  const fieldBoard = Array.from(page.querySelectorAll('.cv3Panel')).find((panelNode) => /Field board/i.test(panelNode.textContent || ''));
  if (fieldBoard) fieldBoard.insertAdjacentElement('afterend', panel);
  else page.appendChild(panel);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKERS_MAP_RESTORE_RUNTIME__) {
  window.__CHURVOX_WORKERS_MAP_RESTORE_RUNTIME__ = true;
  restoreMap();
  window.addEventListener('load', () => setTimeout(restoreMap, 120));
  window.addEventListener('hashchange', () => setTimeout(restoreMap, 120));
  window.addEventListener('popstate', () => setTimeout(restoreMap, 120));
  window.addEventListener('churvox:data-refresh', () => { cache = { at: 0, workers: [] }; setTimeout(restoreMap, 160); });
  document.addEventListener('click', () => setTimeout(restoreMap, 80), true);
  const observer = new MutationObserver(() => setTimeout(restoreMap, 80));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(restoreMap, 2500);
}

export {};
