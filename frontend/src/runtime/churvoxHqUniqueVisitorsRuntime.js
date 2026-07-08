import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_HQ_UNIQUE_VISITORS_RUNTIME__';
const ROOT_ID = 'churvox-hq-unique-visitors-once';
const STYLE_ID = 'churvox-hq-unique-visitors-style';
const API_ROOT = String(API_BASE || '').replace(/\/$/, '');

function isHqPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return ['/admin', '/admin/hq', '/churvox-hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage'].includes(path);
}

function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function esc(value) { return String(value ?? '').replace(/\s+/g, ' ').trim().replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function arr(value) { return Array.isArray(value) ? value : []; }
function num(value) { return Number(value || 0).toLocaleString('en-NZ'); }
function dateText(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return String(value); }
}

async function apiGet(path) {
  const headers = { Accept: 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) };
  const response = await fetch(`${API_ROOT}${path}`, { credentials: 'include', headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false || body?.ok === false) throw new Error(body?.detail || body?.message || body?.error || `HTTP ${response.status}`);
  return body;
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{grid-column:1/-1;margin:0 0 18px;color:#111827;font-family:inherit}
    #${ROOT_ID} *{box-sizing:border-box}
    .hqUniqueShell{border:1px solid rgba(249,115,22,.24);border-radius:28px;background:linear-gradient(135deg,#111827 0%,#1f2937 46%,#f97316 150%);box-shadow:0 20px 54px rgba(15,23,42,.16);overflow:hidden}
    .hqUniqueInner{padding:18px;display:grid;gap:14px;color:white}
    .hqUniqueTop{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
    .hqUniqueTop small{display:inline-flex;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.09);border-radius:999px;padding:7px 10px;color:#fed7aa;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em}
    .hqUniqueTop h3{margin:8px 0 4px;font-size:24px;line-height:1;letter-spacing:-.04em;color:white}
    .hqUniqueTop p{margin:0;max-width:760px;color:#e5e7eb;font-size:13px;font-weight:750;line-height:1.45}
    .hqUniqueRefresh{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.1);color:white;border-radius:14px;padding:10px 13px;font-weight:950;cursor:pointer}
    .hqUniqueMetrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    .hqUniqueMetric{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.1);border-radius:18px;padding:12px}
    .hqUniqueMetric b{display:block;font-size:28px;line-height:1;color:white;font-weight:1000;letter-spacing:-.04em}
    .hqUniqueMetric span{display:block;margin-top:5px;color:#fed7aa;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}
    .hqUniqueList{display:grid;gap:7px;max-height:340px;overflow:auto;padding-right:4px}
    .hqUniqueRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);border-radius:16px;padding:10px}
    .hqUniqueRow b{display:block;color:white;font-size:13px}.hqUniqueRow span{display:block;color:#d1d5db;font-size:12px;margin-top:2px}.hqUniqueRow em{font-style:normal;color:#fed7aa;font-size:11px;font-weight:950;white-space:nowrap}
    @media(max-width:860px){.hqUniqueTop{display:block}.hqUniqueRefresh{margin-top:10px}.hqUniqueMetrics{grid-template-columns:1fr 1fr}.hqUniqueRow{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function render(root, data, error = '') {
  const counts = data?.counts || {};
  const visitors = arr(data?.visitors);
  root.innerHTML = `
    <section class="hqUniqueShell">
      <div class="hqUniqueInner">
        <div class="hqUniqueTop">
          <div>
            <small>Real unique visitors</small>
            <h3>One person counted once.</h3>
            <p>This uses a stable browser visitor ID and the backend stores one unique visitor record. Pageviews are still tracked, but this list does not repeat the same visitor every time they refresh or come back.</p>
          </div>
          <button type="button" class="hqUniqueRefresh" data-hq-unique-refresh>Refresh</button>
        </div>
        ${error ? `<div class="hqUniqueRow"><b>Could not load unique visitors</b><span>${esc(error)}</span><em>check</em></div>` : `
          <div class="hqUniqueMetrics">
            <div class="hqUniqueMetric"><b>${num(counts.unique_total)}</b><span>Total unique</span></div>
            <div class="hqUniqueMetric"><b>${num(counts.new_unique_today)}</b><span>New today</span></div>
            <div class="hqUniqueMetric"><b>${num(counts.unique_active_7d)}</b><span>Active 7 days</span></div>
            <div class="hqUniqueMetric"><b>${num(counts.pageviews_total)}</b><span>Pageviews</span></div>
          </div>
          <div class="hqUniqueList">
            ${visitors.slice(0, 25).map((visitor) => {
              const name = visitor.user_email || visitor.business_name || visitor.last_referrer || visitor.last_source || 'Unknown visitor';
              const meta = `${visitor.first_path || visitor.last_path || 'site visit'} · first ${dateText(visitor.first_seen || visitor.created_at)} · last ${dateText(visitor.last_seen)}`;
              return `<div class="hqUniqueRow"><span><b>${esc(name)}</b><span>${esc(meta)}</span></span><em>${num(visitor.pageview_count || visitor.visit_count || 1)} views</em></div>`;
            }).join('') || '<div class="hqUniqueRow"><b>No unique visitors yet</b><span>Once someone lands on Churvox, they will appear here once.</span><em>empty</em></div>'}
          </div>`}
      </div>
    </section>`;
}

async function mount() {
  if (!isHqPath()) {
    document.getElementById(ROOT_ID)?.remove();
    return;
  }
  installStyle();
  const main = document.querySelector('main');
  if (!main) return;
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('section');
    root.id = ROOT_ID;
    const existing = document.getElementById('churvox-platform-owner-bug-watch');
    if (existing?.parentNode) existing.parentNode.insertBefore(root, existing.nextSibling);
    else main.insertBefore(root, main.firstChild);
    root.addEventListener('click', (event) => { if (event.target.closest('[data-hq-unique-refresh]')) mount(); });
  }
  root.innerHTML = '<section class="hqUniqueShell"><div class="hqUniqueInner"><div class="hqUniqueRow"><b>Loading unique visitors…</b><span>Checking real visitors counted once.</span><em>live</em></div></div></section>';
  try {
    render(root, await apiGet('/api/admin/owner/unique-visitors'));
  } catch (error) {
    render(root, null, error?.message || 'Could not load');
  }
}

function schedule() { [0, 400, 1200, 3000].forEach((delay) => setTimeout(mount, delay)); }

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  setInterval(() => { if (isHqPath()) mount(); }, 45000);
}

export {};
