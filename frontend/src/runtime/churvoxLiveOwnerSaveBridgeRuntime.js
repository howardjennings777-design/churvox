import API_BASE from '../lib/apiBase';

const base = String(API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const lower = (v) => clean(v).toLowerCase();

function headers() {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
  return token ? { 'content-type': 'application/json', Authorization: `Bearer ${token}` } : { 'content-type': 'application/json' };
}

function key(label) {
  return clean(label).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_/-]/g, '').toLowerCase();
}

function collect(root) {
  const data = {};

  root.querySelectorAll('.cocField, .cvxField, label').forEach((label) => {
    const input = label.querySelector('input, textarea, select');
    if (!input) return;

    const labelText =
      label.querySelector('span')?.textContent ||
      input.name ||
      input.placeholder ||
      '';

    const k = key(labelText || input.name);
    if (k) data[k] = input.value;
    if (input.name) data[input.name] = input.value;
  });

  if (root.tagName?.toLowerCase() === 'form') {
    for (const [k, v] of new FormData(root).entries()) data[k] = v;
  }

  return data;
}

function detectKind(root) {
  const text = lower(`${root.dataset?.kind || ''} ${root.querySelector('small, em, h2, h3')?.textContent || ''} ${root.textContent || ''} ${location.hash || ''}`);

  if (text.includes('client')) return 'client';
  if (text.includes('quote')) return 'quote';
  if (text.includes('invoice')) return 'invoice';
  if (text.includes('message')) return 'message';
  if (text.includes('worker') || text.includes('team') || text.includes('person')) return 'worker';

  return 'job';
}

function pick(raw, ...keys) {
  for (const k of keys) {
    if (clean(raw[k])) return clean(raw[k]);
  }
  return '';
}

function payload(kind, raw) {
  if (kind === 'client') {
    return {
      name: pick(raw, 'name', 'client_name', 'client'),
      phone: pick(raw, 'phone', 'mobile'),
      email: pick(raw, 'email'),
      address: pick(raw, 'address', 'site_address'),
      service: pick(raw, 'service', 'service_memory', 'preferred_service'),
      price: pick(raw, 'price', 'price_memory', 'saved_price'),
      schedule: pick(raw, 'schedule', 'preferred_schedule', 'frequency') || 'One-off',
      notes: pick(raw, 'notes', 'access_notes', 'notes_/_access'),
      source: 'owner_live_save_bridge',
    };
  }

  if (kind === 'quote') {
    return {
      title: pick(raw, 'title', 'quote', 'quote_title') || 'Quote',
      client_name: pick(raw, 'client', 'client_name'),
      amount: pick(raw, 'amount', 'amount_nzd', 'price'),
      status: pick(raw, 'status') || 'Draft',
      scope: pick(raw, 'scope', 'description'),
      terms: pick(raw, 'terms'),
      follow_up: pick(raw, 'followup', 'follow_up', 'follow-up'),
      source: 'owner_live_save_bridge',
    };
  }

  if (kind === 'invoice') {
    return {
      invoice_number: pick(raw, 'number', 'invoice', 'invoice_number') || `INV-${Date.now()}`,
      client_name: pick(raw, 'client', 'client_name'),
      job_title: pick(raw, 'job', 'job_title'),
      amount: pick(raw, 'amount', 'amount_nzd', 'price'),
      due_date: pick(raw, 'due', 'due_date'),
      status: pick(raw, 'status') || 'Draft',
      accounting_status: pick(raw, 'sync', 'xero/myob_status', 'xero_status') || 'Command approval',
      line_item: pick(raw, 'line', 'line_item', 'description'),
      evidence: pick(raw, 'evidence', 'proof_/_photos_/_notes'),
      source: 'owner_live_save_bridge',
    };
  }

  if (kind === 'worker') {
    return {
      name: pick(raw, 'name', 'worker'),
      email: pick(raw, 'email'),
      phone: pick(raw, 'phone'),
      role: pick(raw, 'role', 'role/access') || 'Worker',
      access: pick(raw, 'access') || 'Worker app',
      status: pick(raw, 'status', 'clock_status'),
      current_job: pick(raw, 'job', 'current_job'),
      gps: pick(raw, 'gps', 'gps/location'),
      proof: pick(raw, 'proof', 'proof/photos'),
      messages: pick(raw, 'messages', 'worker_messages', 'day_notes'),
      timesheet: pick(raw, 'timesheet', 'hours'),
      payroll_status: pick(raw, 'payroll', 'payroll_review'),
      app_status: pick(raw, 'app', 'worker_app') || 'Active',
      notes: pick(raw, 'notes'),
      source: 'owner_live_save_bridge',
    };
  }

  if (kind === 'message') {
    return {
      from: pick(raw, 'from', 'thread_type') || 'Owner',
      channel: pick(raw, 'channel') || 'Internal',
      client_name: pick(raw, 'client', 'client_name'),
      job_title: pick(raw, 'job', 'job_title'),
      subject: pick(raw, 'subject', 'title') || 'Message',
      message: pick(raw, 'message', 'thread_context', 'context'),
      drafted_reply: pick(raw, 'draft', 'draft_reply', 'drafted_reply'),
      source: 'owner_live_save_bridge',
    };
  }

  return {
    title: pick(raw, 'title', 'job_name', 'job') || 'Job',
    client_name: pick(raw, 'client', 'client_name'),
    address: pick(raw, 'address', 'site_address'),
    service: pick(raw, 'service'),
    assigned_worker_name: pick(raw, 'worker', 'assigned_worker'),
    scheduled_date: pick(raw, 'date', 'scheduled_date'),
    scheduled_time: pick(raw, 'time', 'start_time'),
    price: pick(raw, 'price', 'price_nzd', 'amount'),
    billing: pick(raw, 'billing', 'billing_type'),
    recurring: pick(raw, 'recurring', 'frequency') || 'One-off',
    status: pick(raw, 'status') || 'assigned',
    proof: pick(raw, 'proof', 'proof/photos'),
    notes: pick(raw, 'notes', 'job_notes', 'notes_/_proof_/_access'),
    source: 'owner_live_save_bridge',
  };
}

function endpoint(kind) {
  if (kind === 'client') return '/api/clients';
  if (kind === 'quote') return '/api/quotes';
  if (kind === 'invoice') return '/api/invoices';
  if (kind === 'worker') return '/api/team/workers';
  if (kind === 'message') return '/api/messages';
  return '/api/jobs';
}

function shouldSkip(kind, body) {
  if (kind === 'client') return !body.name;
  if (kind === 'job') return !body.title;
  return false;
}

function postLive(kind, raw) {
  const body = payload(kind, raw);
  if (shouldSkip(kind, body)) return;

  fetch(`${base}${endpoint(kind)}`, {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(body),
  }).catch((err) => {
    console.warn('[Churvox] live owner save bridge failed', err);
  });
}

if (typeof window !== 'undefined' && !window.__churvoxLiveOwnerSaveBridgeRuntime) {
  window.__churvoxLiveOwnerSaveBridgeRuntime = true;

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    const label = lower(button.textContent);
    if (!/^(save|create record|save record|update access)\b/.test(label)) return;

    const root = button.closest('.cocDrawer, .cvxDrawer, #option-f-deep-wiring-modal form');
    if (!root) return;

    if (button.dataset.churvoxLiveSaveBridge === '1') return;
    button.dataset.churvoxLiveSaveBridge = '1';

    postLive(detectKind(root), collect(root));
  }, true);

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!form || form.dataset.churvoxLiveSaveBridge === '1') return;
    if (!form.closest('#option-f-deep-wiring-modal')) return;

    form.dataset.churvoxLiveSaveBridge = '1';
    const kind = form.dataset.kind === 'person' ? 'worker' : (form.dataset.kind || detectKind(form));
    postLive(kind, collect(form));
  }, true);
}
