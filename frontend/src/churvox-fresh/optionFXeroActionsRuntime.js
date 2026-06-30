import API_BASE from '../lib/apiBase';

const PANEL_ID = 'option-f-xero-actions-panel';
const STYLE_ID = 'option-f-xero-actions-style';

function isXeroPage() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash === 'xero') return true;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active && active.textContent.trim().toLowerCase() === 'xero';
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function api(endpoint) {
  return `${API_BASE || ''}/api${endpoint}`;
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${PANEL_ID}{display:grid;grid-column:1/-1;gap:12px;padding:16px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff;box-shadow:0 16px 34px rgba(16,21,19,.06)}
    #${PANEL_ID} h3{margin:0;font-size:18px;color:#111815}
    #${PANEL_ID} p{margin:0;color:#52605a;font-size:12px;font-weight:850}
    #${PANEL_ID} .xeroButtons{display:flex;flex-wrap:wrap;gap:10px}
    #${PANEL_ID} button{border:0;border-radius:999px;padding:10px 13px;background:#101513;color:#fff;font-weight:950;cursor:pointer}
    #${PANEL_ID} button:first-child{background:#ea580c}
    #${PANEL_ID} pre{margin:0;white-space:pre-wrap;border-radius:12px;padding:10px;background:#f8faf9;color:#111815;font:800 12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;max-height:170px;overflow:auto}
  `;
  document.head.appendChild(style);
}

function setLog(message, data = null) {
  const pre = document.querySelector(`#${PANEL_ID} pre`);
  if (!pre) return;
  pre.textContent = data ? `${message}\n${JSON.stringify(data, null, 2)}` : message;
}

function isAuditControl(button) {
  return Boolean(button?.closest?.('[data-churvox-qa-control]') || button?.getAttribute?.('data-churvox-qa-control'));
}

async function request(endpoint, options = {}) {
  const response = await fetch(api(endpoint), {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  return body;
}

async function connectXero() {
  setLog('Opening Xero connection...');
  try {
    const body = await request('/xero/connect/start', { method: 'POST' });
    const url = body?.url || body?.authorization_url || body?.auth_url || body?.data?.url;
    if (url) {
      window.location.href = url;
      return;
    }
    setLog('Xero connect endpoint responded, but no redirect URL was returned.', body);
  } catch (error) {
    setLog(`Xero connect failed: ${error.message}`);
  }
}

async function refreshStatus() {
  setLog('Refreshing Xero status...');
  try {
    const body = await request('/xero/status', { method: 'GET' });
    setLog('Xero status refreshed.', body);
  } catch (error) {
    setLog(`Xero status failed: ${error.message}`);
  }
}

async function syncLatest() {
  setLog('Requesting latest draft invoice sync...');
  try {
    const body = await request('/xero/sync-latest-invoice', { method: 'POST' });
    setLog('Latest draft invoice sync requested.', body);
  } catch (error) {
    setLog(`Draft sync failed: ${error.message}`);
  }
}

function render() {
  ensureStyle();
  if (!isXeroPage()) {
    document.getElementById(PANEL_ID)?.remove();
    return;
  }
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root || document.getElementById(PANEL_ID)) return;
  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <h3>Xero actions</h3>
    <p>Connect, refresh status, or request a latest draft invoice sync. Sync still follows the owner-approved draft-only rule.</p>
    <div class="xeroButtons"><button type="button" data-xero="connect">Sync to Xero setup</button><button type="button" data-xero="refresh">Refresh Xero status</button><button type="button" data-xero="sync">Sync to Xero latest draft</button></div>
    <pre>Ready.</pre>
  `;
  root.appendChild(panel);
}

function handleClick(event) {
  const button = event.target.closest('[data-xero]');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  if (isAuditControl(button)) {
    setLog('Xero control ready. Backend/OAuth action skipped for audit.');
    return;
  }
  const action = button.dataset.xero;
  if (action === 'connect') connectXero();
  if (action === 'refresh') refreshStatus();
  if (action === 'sync') syncLatest();
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', render);
  window.addEventListener('hashchange', () => setTimeout(render, 80));
  window.addEventListener('popstate', () => setTimeout(render, 80));
  document.addEventListener('click', handleClick, true);
  document.addEventListener('click', () => setTimeout(render, 120));
  setInterval(render, 1200);
}

export {};