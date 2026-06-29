// CHURVOX_INVOICE_VAULT_RUNTIME_20260629
// Adds branded invoice archive, PDF view links, paid lookback, and important invoice records.

import API_BASE from '../lib/apiBase';

const PANEL_ID = 'churvox-invoice-vault-panel';
let cached = null;
let lastLoad = 0;
let queued = false;

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function apiUrl(path) {
  return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`;
}

function token() {
  try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch (_) { return ''; }
}

function headers() {
  const auth = token();
  return { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) };
}

function pdfHeaders() {
  const auth = token();
  return auth ? { Authorization: `Bearer ${auth}` } : {};
}

async function request(method, path, payload) {
  const response = await fetch(apiUrl(path), { method, credentials: 'include', headers: headers(), body: payload === undefined ? undefined : JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  return body?.data?.data || body?.data || body;
}

function isInvoicePage() {
  const pathname = clean(window.location.pathname || '').toLowerCase();
  const hash = clean((window.location.hash || '').replace('#', '')).toLowerCase();
  return pathname === '/invoices' || pathname.startsWith('/invoices/') || hash === 'invoices' || hash === 'money';
}

function root() {
  return document.querySelector('.churvoxOptionC .workspace .cocPage');
}

function renderHtml(node, html) {
  if (!node || node.innerHTML === html) return;
  node.innerHTML = html;
}

function money(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 2 });
}

async function loadVault(force = false) {
  if (!token() || !isInvoicePage()) return cached;
  if (!force && cached && Date.now() - lastLoad < 20000) return cached;
  lastLoad = Date.now();
  try { cached = await request('GET', '/invoices/vault'); } catch (_) { cached = cached || { invoices: [], items: [] }; }
  return cached;
}

function panelHtml(data) {
  const invoices = Array.isArray(data?.invoices) ? data.invoices : Array.isArray(data?.items) ? data.items : [];
  const paid = invoices.filter((invoice) => /paid/i.test(`${invoice.paid_status} ${invoice.status}`));
  const sent = invoices.filter((invoice) => /sent/i.test(`${invoice.send_status} ${invoice.status}`));
  const important = invoices.filter((invoice) => invoice.important !== false);
  return `
    <div class="ivTop">
      <div>
        <span>Invoice vault</span>
        <h2>Branded PDF records, paid history and important invoice proof.</h2>
        <p>Each approved invoice gets a snapshot so later job/client edits do not wipe the record.</p>
      </div>
      <strong>${invoices.length} saved</strong>
    </div>
    <div class="ivStats">
      <article><b>${sent.length}</b><small>sent / queued</small></article>
      <article><b>${paid.length}</b><small>paid records</small></article>
      <article><b>${important.length}</b><small>important</small></article>
      <article><b>${money(invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0))}</b><small>vault value</small></article>
    </div>
    <div class="ivRows">
      ${invoices.slice(0, 10).map((invoice) => {
        const id = invoice.invoice_id || invoice.id || invoice.number || 'invoice';
        return `<article data-iv-id="${esc(id)}">
          <div><strong>${esc(invoice.number || invoice.invoice_id || 'Invoice')}</strong><small>${esc(invoice.client_name || 'Customer')} · ${esc(invoice.status || invoice.paid_status || 'saved')} · ${esc(invoice.send_status || 'archived')}</small></div>
          <b>${money(invoice.amount || 0)}</b>
          <button type="button" data-iv-pdf>Open PDF</button>
          <button type="button" data-iv-paid>Mark paid</button>
        </article>`;
      }).join('') || '<p class="ivEmpty">No invoice snapshots yet. The vault fills when invoices are approved/sent or archived.</p>'}
    </div>`;
}

async function insertPanel() {
  if (!isInvoicePage()) {
    document.getElementById(PANEL_ID)?.remove();
    return;
  }
  const page = root();
  if (!page) return;
  let node = document.getElementById(PANEL_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = PANEL_ID;
    node.className = 'invoiceVaultPanel';
    page.appendChild(node);
  }
  const data = await loadVault();
  renderHtml(node, panelHtml(data || { invoices: [] }));
}

async function markPaid(id, button) {
  if (!id || !token() || !isInvoicePage()) return;
  const original = button.textContent;
  button.textContent = 'Saving...';
  try {
    await request('POST', `/invoices/${encodeURIComponent(id)}/mark-paid`, {});
    cached = null;
    await loadVault(true);
    schedule();
  } catch (_) {
    button.textContent = 'Try again';
    window.setTimeout(() => { button.textContent = original; }, 1500);
  }
}

async function openPdf(id, button) {
  if (!id || !token() || !isInvoicePage()) return;
  const original = button.textContent;
  button.textContent = 'Opening...';
  try {
    const response = await fetch(apiUrl(`/invoices/${encodeURIComponent(id)}/pdf`), { method: 'GET', credentials: 'include', headers: pdfHeaders() });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    button.textContent = 'Opened';
    window.setTimeout(() => { button.textContent = original; }, 1500);
  } catch (_) {
    button.textContent = 'Try again';
    window.setTimeout(() => { button.textContent = original; }, 1500);
  }
}

function handleClick(event) {
  if (!isInvoicePage()) return;
  const paid = event.target.closest('[data-iv-paid]');
  const pdf = event.target.closest('[data-iv-pdf]');
  if (!paid && !pdf) return;
  event.preventDefault();
  const row = (paid || pdf).closest('[data-iv-id]');
  const id = row?.getAttribute('data-iv-id');
  if (paid) markPaid(id, paid);
  if (pdf) openPdf(id, pdf);
}

function schedule() {
  if (queued) return;
  queued = true;
  window.setTimeout(async () => {
    queued = false;
    await insertPanel();
  }, 180);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_INVOICE_VAULT_RUNTIME__) {
  window.__CHURVOX_INVOICE_VAULT_RUNTIME__ = true;
  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox:fresh-data-updated', schedule);
  document.addEventListener('click', handleClick, true);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
