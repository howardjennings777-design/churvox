import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_INVOICE_PAYMENT_LINK_RUNTIME__';
const ROOT_ID = 'churvox-invoice-payment-links';
const STYLE_ID = 'churvox-invoice-payment-links-style';
const API_ROOT = String(API_BASE || '').replace(/\/$/, '');
let timer = null;
let cachedInvoices = [];

function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function token() { try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch { return ''; } }
function headers() { const value = token(); return { Accept: 'application/json', 'Content-Type': 'application/json', ...(value ? { Authorization: `Bearer ${value}` } : {}) }; }
function onInvoicesPage() { const hash = String(window.location.hash || '').toLowerCase(); return String(window.location.pathname || '').startsWith('/dashboard') && (hash.includes('invoice') || hash.includes('payment')); }
function host() { return document.querySelector('.cvxWorkspace .cvxPage, .cocPage, .officeTeamLab main, .churvoxOptionC .workspace, main'); }
function money(value, currency = 'NZD') { const amount = Number(String(value ?? 0).replace(/[^0-9.-]/g, '')) || 0; try { return amount.toLocaleString('en-NZ', { style: 'currency', currency: String(currency || 'NZD').toUpperCase() }); } catch { return `$${amount.toFixed(2)}`; } }
function invoiceId(invoice = {}) { return String(invoice.invoice_id || invoice.id || invoice._id || invoice.invoice_number || invoice.number || '').trim(); }
function isPaid(invoice = {}) { const status = `${invoice.status || ''} ${invoice.payment_status || ''} ${invoice.paid_status || ''}`.toLowerCase(); const due = Number(invoice.amount_due ?? invoice.balance_due ?? NaN); const paid = Number(invoice.amount_paid || 0); return /paid|settled/.test(status) || (Number.isFinite(due) && due <= 0 && paid > 0); }

async function api(path, options = {}) {
  const response = await fetch(`${API_ROOT}/api${path}`, { credentials: 'include', ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.message || `Request failed (${response.status})`);
  return body?.data?.data || body?.data || body;
}

async function loadInvoices() {
  for (const path of ['/invoices/vault', '/invoices']) {
    try {
      const body = await api(path);
      const rows = body?.invoices || body?.items || body?.records || (Array.isArray(body) ? body : []);
      if (Array.isArray(rows)) return rows;
    } catch {}
  }
  return [];
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{margin:0 0 18px;font-family:inherit;color:#0f172a}
    #${ROOT_ID} *{box-sizing:border-box}
    .iplShell{border:1px solid #fed7aa;border-radius:24px;background:linear-gradient(135deg,#fff,#fff7ed);box-shadow:0 16px 46px rgba(15,23,42,.08);overflow:hidden}
    .iplHead{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:18px;border-bottom:1px solid #fed7aa}.iplHead small{color:#c2410c;font-weight:950;text-transform:uppercase;letter-spacing:.1em}.iplHead h2{margin:6px 0 4px;font-size:24px;letter-spacing:-.04em}.iplHead p{margin:0;color:#64748b;font-size:13px;font-weight:700}.iplHead button{border:1px solid #fed7aa;background:#fff;color:#c2410c;border-radius:13px;padding:10px 12px;font-weight:900;cursor:pointer}
    .iplRows{display:grid}.iplRow{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:10px;align-items:center;padding:14px 18px;border-top:1px solid #f1f5f9}.iplRow:first-child{border-top:0}.iplRow b{display:block}.iplRow small{display:block;margin-top:4px;color:#64748b;font-weight:750}.iplAmount{font-weight:950;white-space:nowrap}.iplRow button,.iplRow a{border:0;border-radius:12px;background:linear-gradient(135deg,#f97316,#111827);color:#fff;padding:10px 12px;text-decoration:none;font-weight:900;cursor:pointer;white-space:nowrap}.iplRow button.secondary,.iplRow a.secondary{border:1px solid #cbd5e1;background:#fff;color:#0f172a}.iplRow.paid{background:#f0fdf4}.iplStatus{padding:12px 18px;border-top:1px solid #fed7aa;color:#475569;font-size:12px;font-weight:800}.iplEmpty{padding:18px;color:#64748b;font-weight:750}
    @media(max-width:760px){.iplHead{align-items:flex-start;flex-direction:column}.iplRow{grid-template-columns:1fr}.iplAmount{justify-self:start}.iplRow button,.iplRow a{width:100%;text-align:center}}
  `;
  document.head.appendChild(style);
}

function publicUrl(invoice = {}) {
  const tokenValue = invoice.public_token || invoice.portal_token || invoice.share_token || invoice.invoice_token;
  return tokenValue ? `${window.location.origin}/invoice/${encodeURIComponent(tokenValue)}` : '';
}

function render(message = '') {
  if (!onInvoicesPage()) { document.getElementById(ROOT_ID)?.remove(); return; }
  installStyle();
  const target = host();
  if (!target) return;
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('section');
    root.id = ROOT_ID;
    target.insertBefore(root, target.firstChild);
  }
  const rows = cachedInvoices.slice(0, 12);
  root.innerHTML = `
    <section class="iplShell" data-version="CHURVOX_INVOICE_PAYMENT_LINKS_20260720">
      <header class="iplHead"><div><small>Customer payments</small><h2>Create the secure link only when you approve.</h2><p>The customer pays through Stripe. Churvox verifies the result and updates the invoice. Nothing is sent automatically.</p></div><button type="button" data-ipl-refresh>Refresh invoices</button></header>
      <div class="iplRows">${rows.length ? rows.map((invoice) => {
        const id = invoiceId(invoice);
        const paid = isPaid(invoice);
        const link = publicUrl(invoice);
        const amount = invoice.amount_due ?? invoice.balance_due ?? invoice.total ?? invoice.amount ?? 0;
        const number = invoice.invoice_number || invoice.number || id || 'Invoice';
        const customer = invoice.customer_name || invoice.client_name || invoice.client || 'Customer';
        return `<article class="iplRow ${paid ? 'paid' : ''}" data-ipl-id="${esc(id)}"><div><b>${esc(number)}</b><small>${esc(customer)} · ${esc(paid ? 'Paid' : invoice.status || invoice.payment_status || 'Ready')}</small></div><span class="iplAmount">${esc(money(amount, invoice.currency || 'NZD'))}</span>${paid ? '<b>Paid ✓</b>' : '<button type="button" data-ipl-create>Create & copy link</button>'}${link ? `<a class="secondary" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Open invoice</a>` : ''}</article>`;
      }).join('') : '<div class="iplEmpty">No invoice records were returned yet. Create or approve an invoice first.</div>'}</div>
      <div class="iplStatus" aria-live="polite">${esc(message || 'Owner click creates the Stripe checkout. The customer link is copied after it is ready.')}</div>
    </section>`;
}

async function refresh(message = '') {
  if (!onInvoicesPage() || !token()) return;
  cachedInvoices = await loadInvoices();
  render(message);
}

async function createLink(button) {
  const row = button.closest('[data-ipl-id]');
  const id = row?.getAttribute('data-ipl-id');
  if (!id) return;
  const status = document.querySelector(`#${ROOT_ID} .iplStatus`);
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Creating secure link…';
  if (status) status.textContent = 'Checking the business Stripe account and preparing the approved checkout.';
  try {
    const body = await api(`/invoices/${encodeURIComponent(id)}/payment-link`, { method: 'POST', body: '{}' });
    const url = body?.public_invoice_url || body?.payment_link?.public_invoice_url || '';
    if (url && navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
    button.textContent = url ? 'Invoice link copied' : 'Payment link ready';
    if (status) status.textContent = body?.message || (url ? 'Secure invoice link copied. Nothing has been sent automatically.' : 'Secure payment link attached to the invoice.');
    await refresh(status?.textContent || 'Payment link ready.');
  } catch (error) {
    button.disabled = false;
    button.textContent = original;
    if (status) status.textContent = error?.message || 'Could not create the payment link.';
  }
}

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => refresh().catch(() => render('Could not load invoices right now.')), 600);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  document.addEventListener('click', (event) => {
    const create = event.target.closest('[data-ipl-create]');
    if (create) { createLink(create); return; }
    if (event.target.closest('[data-ipl-refresh]')) refresh('Invoice list refreshed.');
  }, true);
  schedule();
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  window.addEventListener('churvox:fresh-data-updated', schedule);
}

export {};
