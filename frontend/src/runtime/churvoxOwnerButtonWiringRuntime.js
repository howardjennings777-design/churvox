import API_BASE from '../lib/apiBase';

// Owner button wiring guard.
// Gives obvious owner buttons a real destination instead of leaving dead controls around.

const TOAST_ID = 'churvox-owner-button-wiring-toast';

function page() {
  return String(window.location.hash || '#today').replace('#', '').toLowerCase() || 'today';
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function api(path) {
  return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`;
}

function authHeaders(json = true) {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || '';
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

function toast(message, ok = true) {
  let node = document.getElementById(TOAST_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = TOAST_ID;
    node.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:1000014;max-width:420px;border-radius:999px;padding:11px 14px;box-shadow:0 18px 44px rgba(17,21,19,.24);font:900 13px/1.3 Inter,system-ui,sans-serif;color:#fff;background:#111713';
    document.body.appendChild(node);
  }
  node.style.background = ok ? '#111713' : '#7f1d1d';
  node.textContent = message;
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.remove(), 2600);
}

function visibleRows() {
  const nodes = [...document.querySelectorAll('.cvxRow:visible, .cvxList button, .cvxTiles button, article')];
  return nodes.map((node) => clean(node.textContent)).filter(Boolean);
}

function downloadCsv(name, rows) {
  const lines = [['Page', 'Record'], ...rows.map((row) => [page(), row])];
  const csv = lines.map((cols) => cols.map((col) => `"${String(col).replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function parseCsv(text) {
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (rows.length < 2) return [];
  const headers = rows.shift().split(',').map((h) => lower(h).replace(/[^a-z0-9]/g, ''));
  return rows.map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((header, index) => { row[header] = values[index] || ''; });
    return {
      name: row.name || row.client || row.customer || row.customername || row.clientname || '',
      email: row.email || row.customeremail || '',
      phone: row.phone || row.mobile || '',
      address: row.address || row.siteaddress || '',
      notes: row.notes || row.note || '',
    };
  }).filter((row) => row.name || row.email || row.phone || row.address);
}

async function importClients(file) {
  const text = await file.text();
  const clients = parseCsv(text);
  if (!clients.length) {
    toast('CSV had no client rows Churvox could read.', false);
    return;
  }
  const endpoints = ['/clients/import', '/clients/bulk', '/clients'];
  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const body = endpoint === '/clients' ? clients[0] : { clients };
      const response = await fetch(api(endpoint), { method: 'POST', credentials: 'include', headers: authHeaders(true), body: JSON.stringify(body) });
      if (response.ok) {
        toast(endpoint === '/clients' && clients.length > 1 ? 'First client imported. Bulk route not available yet.' : `Imported ${clients.length} client${clients.length === 1 ? '' : 's'}.`);
        window.dispatchEvent(new CustomEvent('churvox:fresh-data-updated'));
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error?.message || 'Import failed';
    }
  }
  toast(`Client import could not finish: ${lastError || 'unknown error'}`, false);
}

function chooseCsv() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,text/csv';
  input.style.display = 'none';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.remove();
    if (file) importClients(file);
  });
  document.body.appendChild(input);
  input.click();
}

function openSupport() {
  window.location.href = 'mailto:hello@churvox.com?subject=Churvox%20support';
}

function handleClick(event) {
  const button = event.target.closest('button');
  if (!button) return;
  const label = lower(button.textContent);
  const current = page();

  if (/^open command$|command$/.test(label) && current !== 'command') {
    event.preventDefault();
    window.location.hash = 'command';
    return;
  }

  if (/csv import|import csv|import clients/.test(label)) {
    event.preventDefault();
    chooseCsv();
    return;
  }

  if (/export clients/.test(label)) {
    event.preventDefault();
    const rows = visibleRows();
    downloadCsv('churvox-clients.csv', rows.length ? rows : ['No visible clients']);
    toast('Client CSV exported.');
    return;
  }

  if (/export today/.test(label)) {
    event.preventDefault();
    const rows = visibleRows();
    downloadCsv('churvox-today.csv', rows.length ? rows : ['No visible Today records']);
    toast('Today CSV exported.');
    return;
  }

  if (/billing help|support|setup help|guide|contact/.test(label) && current === 'support') {
    event.preventDefault();
    openSupport();
    return;
  }
}

if (typeof window !== 'undefined' && !window.__CHURVOX_OWNER_BUTTON_WIRING_RUNTIME__) {
  window.__CHURVOX_OWNER_BUTTON_WIRING_RUNTIME__ = true;
  document.addEventListener('click', handleClick, true);
}

export {};