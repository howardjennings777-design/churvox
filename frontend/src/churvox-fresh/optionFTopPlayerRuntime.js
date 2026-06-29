// CHURVOX_TOP_PLAYER_RUNTIME_20260629
// Customer portal, Pay Now, schedule board, offline sync, SMS, setup, reports, support and usage controls.

import API_BASE from '../lib/apiBase';

const IDS = {
  portal: 'tp-customer-portal-page',
  invoices: 'tp-payments-invoices-panel',
  schedule: 'tp-schedule-board-panel',
  setup: 'tp-setup-wizard-panel',
  reports: 'tp-reporting-panel',
  support: 'tp-support-panel',
  usage: 'tp-usage-guard-panel',
  workerOffline: 'tp-worker-offline-panel',
};
const OFFLINE_KEY = 'churvox_worker_full_offline_queue_v1';
let cache = {};
let queued = false;

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function apiUrl(path) { return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`; }
function token() { try { return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; } catch (_) { return ''; } }
function headers() { const auth = token(); return { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }; }
async function request(method, path, payload, auth = true) {
  const response = await fetch(apiUrl(path), { method, credentials: 'include', headers: auth ? headers() : { 'Content-Type': 'application/json' }, body: payload === undefined ? undefined : JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  return body?.data?.data || body?.data || body;
}
function readJson(key, fallback) { try { const parsed = JSON.parse(localStorage.getItem(key) || ''); return parsed ?? fallback; } catch (_) { return fallback; } }
function writeJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
function money(value) { return Number(value || 0).toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 2 }); }
function root() { return document.querySelector('.churvoxOptionC .workspace .cocPage'); }
function pageName() {
  const hash = clean((window.location.hash || '').replace('#', '')).toLowerCase();
  if (hash) return hash;
  const active = clean(document.querySelector('.churvoxOptionC .cocNav button.active')?.textContent).toLowerCase();
  return active || 'today';
}
function renderHtml(node, html) { if (!node || node.innerHTML === html) return; node.innerHTML = html; }
async function cached(key, loader, ttl = 20000) {
  const hit = cache[key];
  if (hit && Date.now() - hit.at < ttl) return hit.value;
  try {
    const value = await loader();
    cache[key] = { value, at: Date.now() };
    return value;
  } catch (_) { return hit?.value || null; }
}
function panel(id, className, anchor = null) {
  const page = root();
  if (!page) return null;
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement('section');
    node.id = id;
    node.className = `tpPanel ${className || ''}`;
    if (anchor) anchor.insertAdjacentElement('afterend', node);
    else page.appendChild(node);
  }
  return node;
}

async function renderCustomerPortal() {
  const match = window.location.pathname.match(/\/customer\/([^/?#]+)/);
  if (!match) return false;
  const tokenValue = decodeURIComponent(match[1]);
  let node = document.getElementById(IDS.portal);
  if (!node) {
    node = document.createElement('main');
    node.id = IDS.portal;
    document.body.innerHTML = '';
    document.body.appendChild(node);
  }
  const data = await cached(`portal:${tokenValue}`, () => request('GET', `/customer-portal/${encodeURIComponent(tokenValue)}`, undefined, false), 8000);
  if (!data?.success) {
    renderHtml(node, `<section class="tpCustomerPage"><h1>Link not available</h1><p>This customer link is missing or expired.</p></section>`);
    return true;
  }
  const record = data.record || {};
  const business = data.business || {};
  const link = data.link || {};
  const isQuote = link.target_type === 'quote';
  renderHtml(node, `<section class="tpCustomerPage">
    <div class="tpCustomerCard">
      <span>${esc(business.business_name || business.trading_name || 'Churvox customer portal')}</span>
      <h1>${isQuote ? 'Quote' : 'Invoice'} ${esc(record.number || record.title || record.invoice_id || record.quote_id || '')}</h1>
      <p>${esc(record.client_name || record.customer_name || 'Customer')} · ${esc(record.status || 'ready')}</p>
      <strong>${money(record.amount || record.total || 0)}</strong>
      <div class="tpCustomerActions">
        ${!isQuote ? `<a href="#" data-tp-pay-public>Pay Now</a>` : `<button type="button" data-tp-accept-quote>Accept quote</button>`}
        <button type="button" data-tp-message-business>Message business</button>
      </div>
      <textarea data-tp-customer-message placeholder="Ask a question or leave a note"></textarea>
      <small data-tp-customer-status>Secure customer view powered by Churvox.</small>
    </div>
  </section>`);
  return true;
}

async function renderInvoicesPanel() {
  const page = pageName();
  if (page !== 'invoices') { document.getElementById(IDS.invoices)?.remove(); return; }
  const node = panel(IDS.invoices, 'tpInvoices');
  if (!node) return;
  const [vault, usage] = await Promise.all([
    cached('vault', () => request('GET', '/invoices/vault')),
    cached('usage', () => request('GET', '/billing/usage-guard')),
  ]);
  const invoices = Array.isArray(vault?.invoices) ? vault.invoices : [];
  renderHtml(node, `<div class="tpHead"><div><span>Payments + portal</span><h2>Pay Now, customer portal and invoice archive.</h2><p>Create a customer link, generate Stripe payment links, keep PDF records and paid history.</p></div><strong>${invoices.length} records</strong></div>
    <div class="tpGrid4"><article><b>${invoices.filter(i => /paid/i.test(`${i.status} ${i.paid_status}`)).length}</b><small>paid</small></article><article><b>${invoices.filter(i => /sent|queued/i.test(`${i.send_status}`)).length}</b><small>sent/queued</small></article><article><b>${money(invoices.reduce((s,i)=>s+Number(i.amount||0),0))}</b><small>stored value</small></article><article><b>${esc(usage?.plan || 'plan')}</b><small>usage guard</small></article></div>
    <div class="tpRows">${invoices.slice(0, 8).map(inv => `<article data-tp-invoice-id="${esc(inv.invoice_id || inv.id || inv.number)}"><div><b>${esc(inv.number || inv.invoice_id)}</b><small>${esc(inv.client_name || 'Customer')} · ${esc(inv.status || inv.paid_status || 'saved')}</small></div><button type="button" data-tp-pay-link>Pay link</button><button type="button" data-tp-portal-link>Portal link</button></article>`).join('') || '<p>No invoice vault records yet. Approve/send an invoice to create one.</p>'}</div>`);
}

async function renderSchedulePanel() {
  const page = pageName();
  if (!['today', 'jobs', 'workers'].includes(page)) { document.getElementById(IDS.schedule)?.remove(); return; }
  const node = panel(IDS.schedule, 'tpSchedule');
  if (!node) return;
  const board = await cached('schedule', () => request('GET', '/schedule/board'), 15000);
  const columns = board?.columns || {};
  const warnings = board?.warnings || [];
  renderHtml(node, `<div class="tpHead"><div><span>Schedule board</span><h2>Day board, worker columns and warnings.</h2><p>Move jobs, catch late work and keep route pressure visible.</p></div><strong>${warnings.length} warnings</strong></div>
    <div class="tpWarningRow">${warnings.slice(0, 6).map(w => `<span>${esc(w.type)}: <b>${esc(w.title || w.worker || 'job')}</b></span>`).join('') || '<span>No schedule warnings right now.</span>'}</div>
    <div class="tpBoard">${Object.entries(columns).slice(0, 6).map(([worker, jobs]) => `<article><h3>${esc(worker)}</h3>${jobs.slice(0, 7).map(job => `<button type="button" data-tp-move-job="${esc(job._id || job.id)}"><b>${esc(job.title || job.job_name || 'Job')}</b><small>${esc(job.scheduled_time || job.time || job.status || 'scheduled')}</small></button>`).join('') || '<p>No jobs</p>'}</article>`).join('') || '<p>No scheduled jobs yet.</p>'}</div>`);
}

async function renderSetupPanel() {
  const page = pageName();
  if (!['help', 'settings', 'today'].includes(page)) { document.getElementById(IDS.setup)?.remove(); return; }
  const node = panel(IDS.setup, 'tpSetup');
  if (!node) return;
  const wizard = await cached('setup', () => request('GET', '/setup/wizard'), 20000);
  const steps = wizard?.steps || [];
  renderHtml(node, `<div class="tpHead"><div><span>Setup wizard</span><h2>First 10 minutes made clear.</h2><p>Business profile, client, job, worker, invoice, payment, SMS and accounting.</p></div><strong>${steps.filter(s=>s.done).length}/${steps.length}</strong></div>
    <div class="tpChecklist">${steps.map(step => `<article class="${step.done ? 'done' : ''}"><b>${step.done ? '✓' : '+'}</b><span>${esc(step.label)}</span></article>`).join('') || '<p>Setup checklist will load after sign-in.</p>'}</div>`);
}

async function renderReportsPanel() {
  const page = pageName();
  if (!['today', 'invoices', 'jobs'].includes(page)) { document.getElementById(IDS.reports)?.remove(); return; }
  const node = panel(IDS.reports, 'tpReports');
  if (!node) return;
  const report = await cached('report', () => request('GET', '/reports/dashboard'), 20000);
  const s = report?.summary || {};
  renderHtml(node, `<div class="tpHead"><div><span>Profit reports</span><h2>Money, margin and job performance.</h2><p>Shows whether work is actually making money, not just creating jobs.</p></div><strong>${money(s.estimated_margin || 0)}</strong></div>
    <div class="tpGrid4"><article><b>${money(s.total_invoiced || 0)}</b><small>invoiced</small></article><article><b>${money(s.total_paid || 0)}</b><small>paid</small></article><article><b>${s.overdue_invoices || 0}</b><small>overdue</small></article><article><b>${s.quote_win_count || 0}</b><small>accepted quotes</small></article></div>`);
}

async function renderUsagePanel() {
  const page = pageName();
  if (page !== 'plans') { document.getElementById(IDS.usage)?.remove(); return; }
  const node = panel(IDS.usage, 'tpUsage');
  if (!node) return;
  const usage = await cached('usage', () => request('GET', '/billing/usage-guard'), 12000);
  const counts = usage?.counts || {};
  const limits = usage?.limits || {};
  renderHtml(node, `<div class="tpHead"><div><span>Usage guard</span><h2>No surprise limits.</h2><p>Current plan usage, upgrade reasons and warnings before anything breaks.</p></div><strong>${esc(usage?.plan || 'plan')}</strong></div>
    <div class="tpGrid4">${['jobs','workers','ai_actions','invoices'].map(k => `<article><b>${esc(counts[k] || 0)}${limits[k] ? `/${esc(limits[k])}` : ''}</b><small>${esc(k.replace('_',' '))}</small></article>`).join('')}</div>
    <div class="tpWarningRow">${(usage?.warnings || []).map(w => `<span>${esc(w.message)}</span>`).join('') || '<span>Usage looks healthy.</span>'}</div>`);
}

async function renderSupportPanel() {
  const page = pageName();
  if (page !== 'help') { document.getElementById(IDS.support)?.remove(); return; }
  const node = panel(IDS.support, 'tpSupport');
  if (!node) return;
  const tickets = await cached('tickets', () => request('GET', '/support/tickets'), 10000);
  renderHtml(node, `<div class="tpHead"><div><span>Support desk</span><h2>Real tickets, bug reports and setup help.</h2><p>Owners and workers can report what is stuck instead of disappearing.</p></div><strong>${(tickets?.tickets || []).length} tickets</strong></div>
    <div class="tpSupportForm"><input data-tp-ticket-subject placeholder="What is stuck?"/><textarea data-tp-ticket-message placeholder="Tell us what happened. Add route/screenshot note if needed."></textarea><button type="button" data-tp-ticket-send>Send ticket</button></div>
    <div class="tpRows">${(tickets?.tickets || []).slice(0, 6).map(t => `<article><div><b>${esc(t.subject)}</b><small>${esc(t.status)} · ${esc(t.priority)}</small></div></article>`).join('') || '<p>No support tickets yet.</p>'}</div>`);
}

function renderWorkerOfflinePanel() {
  if (!window.location.pathname.startsWith('/worker')) { document.getElementById(IDS.workerOffline)?.remove(); return; }
  const main = document.querySelector('.wc-screen .wc-main, .wc-main, main');
  if (!main) return;
  let node = document.getElementById(IDS.workerOffline);
  if (!node) { node = document.createElement('section'); node.id = IDS.workerOffline; node.className = 'tpPanel tpWorkerOffline'; main.prepend(node); }
  const queue = readJson(OFFLINE_KEY, []);
  renderHtml(node, `<div class="tpHead"><div><span>Offline worker mode</span><h2>Work keeps going with bad signal.</h2><p>Clock, proof, notes and finish events can queue and sync later.</p></div><strong>${queue.length} queued</strong></div><button type="button" data-tp-offline-sync>Sync now</button>`);
}

async function createPayLink(id, button) {
  if (!id) return;
  const original = button.textContent; button.textContent = 'Creating...';
  try { const res = await request('POST', `/invoices/${encodeURIComponent(id)}/payment-link`, {}); button.textContent = res?.payment_link?.status === 'stripe_ready' ? 'Pay link ready' : 'Needs Stripe'; }
  catch (_) { button.textContent = 'Try again'; }
  setTimeout(() => { button.textContent = original; }, 1800);
}
async function createPortalLink(id, button, kind = 'invoice') {
  if (!id) return;
  const original = button.textContent; button.textContent = 'Creating...';
  try { const res = await request('POST', '/customer-portal/links', { target_type: kind, target_id: id }); navigator.clipboard?.writeText(res?.link?.public_url || ''); button.textContent = 'Link copied'; }
  catch (_) { button.textContent = 'Try again'; }
  setTimeout(() => { button.textContent = original; }, 1800);
}
async function sendTicket(button) {
  const rootNode = button.closest('.tpSupport');
  const subject = clean(rootNode?.querySelector('[data-tp-ticket-subject]')?.value);
  const message = clean(rootNode?.querySelector('[data-tp-ticket-message]')?.value);
  if (!subject && !message) { button.textContent = 'Add details'; return; }
  const original = button.textContent; button.textContent = 'Sending...';
  try { await request('POST', '/support/tickets', { subject, message, route: window.location.pathname + window.location.hash }); cache.tickets = null; button.textContent = 'Sent'; schedule(); }
  catch (_) { button.textContent = 'Try again'; }
  setTimeout(() => { button.textContent = original; }, 1800);
}
async function syncOffline(button) {
  const queue = readJson(OFFLINE_KEY, []);
  const original = button.textContent; button.textContent = 'Syncing...';
  try { await request('POST', '/worker/offline/full-sync', { operations: queue }); writeJson(OFFLINE_KEY, []); button.textContent = 'Synced'; schedule(); }
  catch (_) { button.textContent = 'Try again'; }
  setTimeout(() => { button.textContent = original; }, 1800);
}

async function handleCustomerClick(event) {
  const tokenMatch = window.location.pathname.match(/\/customer\/([^/?#]+)/);
  if (!tokenMatch) return false;
  const tokenValue = decodeURIComponent(tokenMatch[1]);
  const accept = event.target.closest('[data-tp-accept-quote]');
  const msg = event.target.closest('[data-tp-message-business]');
  const pay = event.target.closest('[data-tp-pay-public]');
  if (!accept && !msg && !pay) return false;
  event.preventDefault();
  const status = document.querySelector('[data-tp-customer-status]');
  if (accept) {
    try { await request('POST', `/customer-portal/${encodeURIComponent(tokenValue)}/accept-quote`, { accepted: true }, false); if (status) status.textContent = 'Quote accepted.'; } catch (_) { if (status) status.textContent = 'Could not accept yet.'; }
  }
  if (msg) {
    const message = clean(document.querySelector('[data-tp-customer-message]')?.value);
    try { await request('POST', `/customer-portal/${encodeURIComponent(tokenValue)}/message`, { message }, false); if (status) status.textContent = 'Message sent.'; } catch (_) { if (status) status.textContent = 'Could not send yet.'; }
  }
  if (pay) { if (status) status.textContent = 'Payment link is prepared by the business from the invoice screen.'; }
  return true;
}

function handleClick(event) {
  handleCustomerClick(event);
  const pay = event.target.closest('[data-tp-pay-link]');
  const portal = event.target.closest('[data-tp-portal-link]');
  const ticket = event.target.closest('[data-tp-ticket-send]');
  const offline = event.target.closest('[data-tp-offline-sync]');
  if (pay || portal) {
    event.preventDefault();
    const row = (pay || portal).closest('[data-tp-invoice-id]');
    const id = row?.getAttribute('data-tp-invoice-id');
    if (pay) createPayLink(id, pay);
    if (portal) createPortalLink(id, portal, 'invoice');
  }
  if (ticket) { event.preventDefault(); sendTicket(ticket); }
  if (offline) { event.preventDefault(); syncOffline(offline); }
}

async function schedule() {
  if (queued) return;
  queued = true;
  setTimeout(async () => {
    queued = false;
    if (await renderCustomerPortal()) return;
    renderWorkerOfflinePanel();
    if (!document.querySelector('.churvoxOptionC')) return;
    await Promise.all([renderInvoicesPanel(), renderSchedulePanel(), renderSetupPanel(), renderReportsPanel(), renderUsagePanel(), renderSupportPanel()]);
  }, 180);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_TOP_PLAYER_RUNTIME__) {
  window.__CHURVOX_TOP_PLAYER_RUNTIME__ = true;
  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox:fresh-data-updated', schedule);
  document.addEventListener('click', handleClick, true);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
