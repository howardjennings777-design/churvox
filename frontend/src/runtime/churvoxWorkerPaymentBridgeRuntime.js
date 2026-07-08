import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_WORKER_PAYMENT_BRIDGE_RUNTIME__';
const API_ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
const cache = new Map();

function isWorkerJobRoute() {
  return /^\/worker\/jobs\//i.test(window.location.pathname || '');
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function jobIdFromPath() {
  const parts = (window.location.pathname || '').split('/').filter(Boolean);
  const index = parts.indexOf('jobs');
  return index >= 0 ? clean(parts[index + 1]) : '';
}

function escapeHtml(value) {
  return clean(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

async function get(path) {
  const response = await fetch(`${API_ROOT}${path}`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.detail || data.error || 'Could not load payment');
  return data?.data || data;
}

async function post(path, body) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.detail || data.error || 'Could not send request');
  return data;
}

function removeLeakedOwnerBits(root) {
  if (!root) return;
  document.querySelectorAll('section,div,main,aside,form').forEach((node) => {
    if (root.contains(node) || node.contains(root)) return;
    const copy = clean(node.textContent).toLowerCase();
    if (/add job|new record|job form|working job form|save record|owner approvals|admin ledger|command lanes/.test(copy) && copy.length < 1500) node.remove();
  });
}

function statusLabel(summary, terminalReady) {
  if (!summary?.due_cents) return 'Amount missing';
  if (summary.payment_status === 'paid') return 'Paid';
  if (summary.payment_status === 'part_paid') return 'Part paid';
  if (!terminalReady) return 'Office setup needed';
  return 'Ready to collect';
}

function statusText(summary, terminalReady) {
  if (!summary?.due_cents) return 'Office needs to set the job amount before the worker can collect money.';
  if (summary.payment_status === 'paid') return 'Customer has paid this job. No card payment needed.';
  if (summary.payment_status === 'part_paid') return 'Customer has paid part of this job. Check the balance before collecting more.';
  if (!terminalReady) return 'Payment amount exists, but office still needs to finish card payment setup.';
  return 'Collect the outstanding balance for this job.';
}

function findTakePaymentButton(card) {
  return Array.from(card.querySelectorAll('button')).find((button) => clean(button.textContent).toLowerCase().includes('take card payment'));
}

function renderBreakdown(card, summary, terminalReady) {
  const old = card.querySelector('.fieldPaymentBreakdown');
  old?.remove();

  const status = statusLabel(summary, terminalReady);
  const body = statusText(summary, terminalReady);
  const due = summary?.due_label || 'Office sets amount';
  const paid = summary?.paid_label || '$0';
  const balance = summary?.balance_label || '$0';
  const last = summary?.last_status ? summary.last_status.replace(/_/g, ' ') : 'No payment yet';
  const canCollect = Boolean(terminalReady && summary?.due_cents > 0 && summary?.balance_cents > 0 && summary?.payment_status !== 'part_paid');
  const needsOffice = !summary?.due_cents || summary?.payment_status === 'part_paid' || !terminalReady;

  const block = document.createElement('div');
  block.className = `fieldPaymentBreakdown ${summary?.payment_status || 'unknown'}`;
  block.innerHTML = `
    <div class="fieldPaymentStatus"><b>${escapeHtml(status)}</b><span>${escapeHtml(body)}</span></div>
    <div class="fieldPaymentLedger">
      <span><b>Job amount</b>${escapeHtml(due)}</span>
      <span><b>Customer paid</b>${escapeHtml(paid)}</span>
      <span><b>Balance left</b>${escapeHtml(balance)}</span>
      <span><b>Last payment</b>${escapeHtml(last)}</span>
    </div>
    <div class="fieldPaymentBridgeActions">
      ${canCollect ? '<button type="button" class="swPrimary" data-cvx-allow-react-payment="true">Take balance card payment</button>' : ''}
      ${needsOffice ? '<button type="button" class="swLight warning" data-request-payment-check="true">Ask office to check payment</button>' : ''}
    </div>
  `;
  card.appendChild(block);

  const reactButton = findTakePaymentButton(card);
  if (reactButton) {
    if (canCollect) {
      reactButton.textContent = 'Take balance card payment';
      reactButton.style.display = '';
      const proxy = block.querySelector('[data-cvx-allow-react-payment]');
      proxy?.addEventListener('click', () => reactButton.click());
      proxy?.removeAttribute('data-cvx-allow-react-payment');
      if (proxy) proxy.style.display = 'none';
    } else {
      reactButton.style.display = 'none';
    }
  }

  const ask = block.querySelector('[data-request-payment-check]');
  ask?.addEventListener('click', async () => {
    ask.disabled = true;
    ask.textContent = 'Sending to office';
    try {
      await post('/worker/field-slip', {
        type: summary?.due_cents ? 'payment_check_needed' : 'payment_amount_needed',
        kind: summary?.due_cents ? 'payment_check_needed' : 'payment_amount_needed',
        job_id: jobIdFromPath(),
        source: 'churvox-field-payment-card',
        summary: summary?.due_cents ? 'Worker needs office to check job payment' : 'Worker needs office to set payment amount',
        text: `Worker checked payment. Amount: ${due}. Paid: ${paid}. Balance: ${balance}. Status: ${status}.`,
        note: `Payment check needed. Amount: ${due}. Paid: ${paid}. Balance: ${balance}.`,
      });
      ask.textContent = 'Sent to office';
    } catch (error) {
      ask.disabled = false;
      ask.textContent = 'Ask office to check payment';
      alert(error.message || 'Could not send request');
    }
  });
}

async function loadAndRenderPayment(card) {
  const jid = jobIdFromPath();
  if (!jid || card.dataset.paymentSummaryLoading === 'true') return;
  card.dataset.paymentSummaryLoading = 'true';
  try {
    const existingStatus = clean(card.textContent).toLowerCase();
    const terminalReady = card.classList.contains('ready') || /card payment ready|take card payment/.test(existingStatus);
    const summary = cache.get(jid) || await get(`/payments/on-site/job-summary/${encodeURIComponent(jid)}`);
    cache.set(jid, summary);
    renderBreakdown(card, summary, terminalReady);
    card.dataset.paymentBridge = 'true';
  } catch (error) {
    card.dataset.paymentBridge = 'error';
  } finally {
    card.dataset.paymentSummaryLoading = 'false';
  }
}

function enhancePayment(root) {
  const card = root?.querySelector('.fieldPaymentCard');
  if (!card) return;
  const statusBox = Array.from(card.querySelectorAll('.fieldMiniGrid span')).find((node) => clean(node.textContent).toLowerCase().startsWith('status'));
  if (statusBox && card.classList.contains('locked')) statusBox.innerHTML = '<b>Status</b>Checking payment';
  const heading = card.querySelector('h2');
  if (heading) heading.textContent = 'Customer payment';
  loadAndRenderPayment(card);
}

function cleanNow() {
  if (!isWorkerJobRoute()) return;
  const root = document.querySelector('.simpleWorkerApp.churvoxFieldApp');
  if (!root) return;
  removeLeakedOwnerBits(root);
  enhancePayment(root);
}

function schedule() {
  if (!isWorkerJobRoute()) return;
  [0, 80, 200, 500, 1000, 1800, 3200].forEach((delay) => window.setTimeout(cleanNow, delay));
}

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
  window.addEventListener('load', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox:data-refresh', schedule);
  const observer = new MutationObserver(cleanNow);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
