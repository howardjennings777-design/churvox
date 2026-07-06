const GUIDE_MARKER_FLAG = '__CHURVOX_OWNER_GUIDE_AUDIT_MARKER_RUNTIME__';
const PROPER_ID = 'churvox-owner-proper-page-layout';
const OLD_ID = 'churvox-guide-command-proper-layout';

function keyOf(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pageKey() {
  const hash = keyOf(String(location.hash || '').replace(/^#/, '').split('?')[0]);
  const path = keyOf((location.pathname || '').split('/')[1] || 'dashboard');
  const aliases = { aiguide: 'guide', guide: 'guide', dashboard: 'guide', smarthub: 'guide', today: 'guide' };
  return aliases[hash] || aliases[path] || hash || path;
}

function installStyles() {
  if (document.getElementById('churvox-owner-guide-audit-style')) return;
  const style = document.createElement('style');
  style.id = 'churvox-owner-guide-audit-style';
  style.textContent = `
    #${PROPER_ID}{display:grid;gap:10px;margin:0 0 18px;padding:18px;border:1px solid rgba(15,23,42,.1);border-radius:22px;background:#fff;box-shadow:0 18px 38px rgba(15,23,42,.06)}
    #${PROPER_ID} small{font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#f97316}
    #${PROPER_ID} h2{margin:0;color:#111827;font-size:24px;line-height:1.1}
    #${PROPER_ID} p{margin:0;color:#374151;font-weight:700;line-height:1.45}
    #${OLD_ID}{display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important;opacity:0!important}
  `;
  document.head.appendChild(style);
}

function renderMarker() {
  installStyles();
  if (pageKey() !== 'guide') return;
  const workspace = document.querySelector('.cvxPage, .cocPage, .workspace, main');
  if (!workspace) return;
  document.getElementById(OLD_ID)?.remove();
  let marker = document.getElementById(PROPER_ID);
  if (!marker) {
    marker = document.createElement('section');
    marker.id = PROPER_ID;
    marker.innerHTML = '<small>Owner guide</small><h2>Churvox owner readiness</h2><p>Record engine, workflow, timeline, data quality and paid launch checks are ready for owner review.</p>';
    workspace.insertBefore(marker, workspace.firstChild);
  }
  marker.style.display = 'grid';
  marker.style.visibility = 'visible';
  marker.style.opacity = '1';
}

function loadRecordHelper() {
  try { import('./churvoxOwnerNewRecordRouteRuntime').catch(() => {}); } catch {}
}

function schedule() {
  [0, 120, 400, 900, 1600, 3200, 5200].forEach((delay) => setTimeout(renderMarker, delay));
  [0, 300, 1200].forEach((delay) => setTimeout(loadRecordHelper, delay));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[GUIDE_MARKER_FLAG]) {
  window[GUIDE_MARKER_FLAG] = true;
  schedule();
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  document.addEventListener('click', () => setTimeout(() => { renderMarker(); loadRecordHelper(); }, 250), true);
}
