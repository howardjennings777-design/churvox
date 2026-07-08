import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_WORKER_PAYMENT_BRIDGE_RUNTIME__';
const API_ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;

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
    if (root.contains(node)) return;
    const copy = clean(node.textContent).toLowerCase();
    if (/add job|new record|job form|working job form|save record|owner approvals|admin ledger|command lanes/.test(copy) && copy.length < 1500) node.remove();
  });
}

function enhancePayment(root) {
  const card = root?.querySelector('.fieldPaymentCard.locked');
  if (!card || card.dataset.paymentBridge === 'true') return;
  card.dataset.paymentBridge = 'true';

  const statusBox = Array.from(card.querySelectorAll('.fieldMiniGrid span')).find((node) => clean(node.textContent).toLowerCase().startsWith('status'));
  if (statusBox) statusBox.innerHTML = '<b>Status</b>Waiting on office';

  const heading = card.querySelector('h2');
  if (heading) heading.textContent = 'Card payment locked';

  const para = card.querySelector('p');
  const reason = clean(para?.textContent).toLowerCase();
  const needsAmount = /amount/.test(reason) || clean(card.textContent).toLowerCase().includes('office sets amount');

  const actions = document.createElement('div');
  actions.className = 'fieldPaymentBridgeActions';
  actions.innerHTML = needsAmount
    ? '<button type="button" class="swLight warning" data-request-payment-amount="true">Ask office to set amount</button><button type="button" class="swPrimary" disabled>Take card payment locked</button>'
    : '<button type="button" class="swPrimary" disabled>Take card payment locked</button>';
  card.appendChild(actions);

  const ask = actions.querySelector('[data-request-payment-amount]');
  if (ask) {
    ask.addEventListener('click', async () => {
      ask.disabled = true;
      ask.textContent = 'Sending request';
      try {
        await post('/worker/field-slip', {
          type: 'payment_amount_needed',
          kind: 'payment_amount_needed',
          job_id: jobIdFromPath(),
          source: 'churvox-field-payment-card',
          summary: 'Worker needs office to set payment amount',
          text: 'Worker tried to take a card payment, but this job has no amount set.',
          note: 'Please set the job amount so the worker can collect card payment.',
        });
        ask.textContent = 'Sent to office';
      } catch (error) {
        ask.disabled = false;
        ask.textContent = 'Ask office to set amount';
        alert(error.message || 'Could not send request');
      }
    });
  }
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
