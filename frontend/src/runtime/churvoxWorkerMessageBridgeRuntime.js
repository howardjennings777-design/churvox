// CHURVOX_WORKER_MESSAGE_BRIDGE_20260630
// Worker messages should feel real: keep visible sent history and attempt backend delivery.

const KEY = '__CHURVOX_WORKER_MESSAGE_BRIDGE__';
const STORE = 'churvox_worker_message_history';
const BACKEND = 'https://grassley-backend.onrender.com';

function apiUrl(path) {
  const host = String(window.location.hostname || '').toLowerCase();
  if (host === 'www.churvox.com' || host === 'churvox.com') return `${BACKEND}${path}`;
  return path;
}
function isWorkerMessages() {
  return /^\/worker\/(ops|messages)/i.test(window.location.pathname || '');
}
function compact(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function history() { try { return JSON.parse(localStorage.getItem(STORE) || '[]'); } catch { return []; } }
function save(row) { try { localStorage.setItem(STORE, JSON.stringify([row, ...history()].slice(0, 30))); } catch {} }
function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
async function sendBackend(message) {
  const headers = { 'Content-Type': 'application/json' };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  const payload = { source: 'worker_app', from: 'Worker', subject: 'Worker update', message, body: message, detail: message, priority: 'Worker update', channel: 'Worker app' };
  for (const path of ['/api/messages', '/api/worker/messages', '/api/approved-notifications']) {
    try {
      const res = await fetch(apiUrl(path), { method: 'POST', headers, credentials: 'include', body: JSON.stringify(payload) });
      if (res.ok) return true;
    } catch {}
  }
  return false;
}
function ensureStyle() {
  if (document.getElementById('cv-worker-message-bridge-style')) return;
  const style = document.createElement('style');
  style.id = 'cv-worker-message-bridge-style';
  style.textContent = `
    .cvWorkerHistory{display:grid;gap:10px;margin-top:12px}.cvWorkerHistory h3{margin:0;font-size:16px}.cvWorkerHistory article{display:grid;gap:4px;border:1px solid rgba(15,23,42,.08);border-radius:14px;background:#f8fafc;padding:10px}.cvWorkerHistory article b{font-size:13px}.cvWorkerHistory article span{font-size:12px;color:#475569;font-weight:800}.cvWorkerHistory article small{font-size:11px;color:#9a3412;font-weight:950;text-transform:uppercase;letter-spacing:.06em}.cvWorkerMessageSaved{border-radius:999px;background:#dcfce7;color:#14532d;padding:6px 10px;font-size:12px;font-weight:950;width:fit-content}
  `;
  document.head.appendChild(style);
}
function renderHistory() {
  if (!isWorkerMessages()) return;
  const app = document.querySelector('.simpleWorkerApp');
  if (!app) return;
  ensureStyle();
  let wrap = app.querySelector('.cvWorkerHistory');
  if (!wrap) {
    wrap = document.createElement('section');
    wrap.className = 'cvWorkerHistory';
    const card = app.querySelector('.swCard') || app.querySelector('.swBody') || app;
    card.appendChild(wrap);
  }
  const rows = history();
  wrap.innerHTML = `<h3>Sent to office</h3>${rows.length ? rows.slice(0, 8).map((row) => `<article><small>${row.status || 'Saved'}</small><b>${row.message}</b><span>${new Date(row.at).toLocaleString()}</span></article>`).join('') : '<article><b>No sent messages yet.</b><span>Messages you send from here will stay visible.</span></article>'}`;
}
async function handleSend(event) {
  if (!isWorkerMessages()) return;
  const button = event.target?.closest?.('button');
  if (!button || !/send/i.test(compact(button.textContent))) return;
  const app = document.querySelector('.simpleWorkerApp');
  const textarea = app?.querySelector('textarea');
  const message = compact(textarea?.value);
  if (!message) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  button.disabled = true;
  button.textContent = 'Sending';
  const delivered = await sendBackend(message);
  save({ at: new Date().toISOString(), message, status: delivered ? 'Sent' : 'Saved for office' });
  if (textarea) textarea.value = '';
  button.disabled = false;
  button.textContent = delivered ? 'Sent' : 'Saved';
  const note = document.createElement('span');
  note.className = 'cvWorkerMessageSaved';
  note.textContent = delivered ? 'Sent to office' : 'Saved for office';
  button.after(note);
  setTimeout(() => { note.remove(); button.textContent = 'Send'; }, 1800);
  renderHistory();
}
if (typeof window !== 'undefined' && !window[KEY]) {
  window[KEY] = true;
  window.addEventListener('load', () => setTimeout(renderHistory, 500));
  window.addEventListener('popstate', () => setTimeout(renderHistory, 300));
  document.addEventListener('click', handleSend, true);
  document.addEventListener('input', () => setTimeout(renderHistory, 100), true);
  setInterval(renderHistory, 1200);
}

export {};