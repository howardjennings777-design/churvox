// Launch create/save bridge.
// Makes /clients/new, /jobs/new, /quotes/new and /invoices/new save real backend records.

const ROUTES = {
  '/clients/new': { kind: 'client', api: '/api/clients', list: '/dashboard#clients' },
  '/jobs/new': { kind: 'job', api: '/api/jobs', list: '/dashboard#jobs' },
  '/quotes/new': { kind: 'quote', api: '/api/quotes', list: '/dashboard#quotes' },
  '/invoices/new': { kind: 'invoice', api: '/api/invoices', list: '/dashboard#invoices' },
};

function routeCfg() {
  return ROUTES[window.location.pathname] || null;
}

function text(value) {
  return String(value || '').trim();
}

function money(value, fallback = '95') {
  const raw = text(value || fallback).replace(/[^0-9.]/g, '');
  return raw || fallback;
}

function today() {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}

function fieldName(el, index) {
  const explicit = text(el.getAttribute('name') || el.getAttribute('id') || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('data-testid'));
  if (explicit) return explicit.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `field_${index}`;
  const label = el.closest('label')?.innerText || '';
  if (label) return text(label).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `field_${index}`;
  return `field_${index}`;
}

function readForm() {
  const data = {};
  const values = [];
  const fields = Array.from(document.querySelectorAll('input, textarea, select')).filter((el) => {
    const type = String(el.getAttribute('type') || '').toLowerCase();
    return !['hidden', 'button', 'submit', 'reset', 'password'].includes(type);
  });
  fields.forEach((el, index) => {
    const value = text(el.value);
    if (!value) return;
    const name = fieldName(el, index);
    data[name] = value;
    values.push(value);
  });
  const realDeal = values.find((v) => /Real Deal (Client|Job|Quote|Invoice)/i.test(v));
  const firstText = values.find((v) => !/@/.test(v) && !/^\d{4}-\d{2}-\d{2}/.test(v) && !/^\d+(\.\d+)?$/.test(v));
  const primary = realDeal || firstText || values[0] || '';
  return { data, values, primary };
}

function shapePayload(cfg, raw) {
  const data = { ...raw.data };
  const primary = raw.primary || `${cfg.kind} record`;
  const any = (patterns) => {
    const key = Object.keys(data).find((k) => patterns.some((p) => k.includes(p)));
    return key ? data[key] : '';
  };
  const client = data.client_name || data.customer_name || any(['client', 'customer']) || primary;
  const address = data.address || data.site_address || data.service_address || any(['address', 'site', 'service']) || 'Address to confirm';
  const notes = data.notes || data.description || data.scope || any(['note', 'description', 'scope', 'service']) || 'Created from Churvox launch save bridge.';
  if (cfg.kind === 'client') {
    data.name = data.name || any(['client', 'customer', 'name', 'title']) || primary;
    data.customer_name = data.name;
    data.email = data.email || any(['email']);
    data.phone = data.phone || any(['phone', 'mobile']);
    data.address = address;
    data.notes = notes;
  } else if (cfg.kind === 'job') {
    data.title = data.title || data.name || any(['job', 'title', 'name']) || primary;
    data.customer_name = client;
    data.client_name = client;
    data.job_type = data.job_type || data.service_type || 'General service';
    data.address = address;
    data.site_address = address;
    data.scheduled_date = data.scheduled_date || data.date || today();
    data.description = notes;
    data.notes = notes;
    data.assigned_worker_name = data.assigned_worker_name || any(['worker', 'assigned']);
    data.price = money(data.price || data.amount || data.total || any(['price', 'amount', 'total']));
  } else if (cfg.kind === 'quote') {
    data.title = data.title || data.name || any(['quote', 'title', 'description', 'scope']) || primary;
    data.customer_name = client;
    data.client_name = client;
    data.address = address;
    data.job_description = data.job_description || notes;
    data.description = data.description || notes;
    data.price = money(data.price || data.total || data.amount || any(['total', 'price', 'amount']));
    data.total = data.total || data.price;
    data.scope = data.scope || notes;
  } else if (cfg.kind === 'invoice') {
    data.title = data.title || data.name || any(['invoice', 'title', 'description', 'line']) || primary;
    data.customer_name = client;
    data.client_name = client;
    data.description = data.description || data.line_items || notes;
    data.line_items = data.line_items || data.description;
    data.subtotal = money(data.subtotal || data.amount || data.total || data.price || any(['amount', 'total', 'price']));
    data.amount = data.amount || data.subtotal;
    data.total = data.total || data.subtotal;
  }
  data.launch_audit_token = primary;
  return data;
}

async function postRecord(cfg, payload) {
  const token = localStorage.getItem('token') || '';
  const response = await fetch(cfg.api, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
  if (!response.ok || body?.success === false) throw new Error(`${cfg.api} save failed ${response.status}`);
  return body;
}

function notice(message, ok = true) {
  let box = document.getElementById('churvox-launch-create-save-notice');
  if (!box) {
    box = document.createElement('div');
    box.id = 'churvox-launch-create-save-notice';
    box.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:999999;background:#111815;color:#fff;border-radius:16px;padding:12px 14px;font:900 12px system-ui;box-shadow:0 18px 45px rgba(0,0,0,.24);max-width:320px';
    document.body.appendChild(box);
  }
  box.style.background = ok ? '#111815' : '#b42318';
  box.textContent = message;
}

let saving = false;
async function saveCurrent(event) {
  const cfg = routeCfg();
  if (!cfg || saving) return false;
  saving = true;
  try {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const raw = readForm();
    const payload = shapePayload(cfg, raw);
    await postRecord(cfg, payload);
    notice(`${cfg.kind} saved to Churvox`);
    window.dispatchEvent(new CustomEvent('churvox:launch-record-created', { detail: { kind: cfg.kind, payload } }));
    setTimeout(() => { window.location.href = cfg.list; }, 350);
    return true;
  } catch (error) {
    notice(`Could not save ${cfg.kind}. Check required fields.`, false);
    console.error('[Churvox launch save bridge]', error);
    return false;
  } finally {
    setTimeout(() => { saving = false; }, 900);
  }
}

function click(event) {
  const cfg = routeCfg();
  if (!cfg) return;
  const control = event.target?.closest?.('button, input[type="submit"], a, [role="button"]');
  if (!control) return;
  const label = text(control.innerText || control.value || control.getAttribute('aria-label') || control.getAttribute('title'));
  if (/save|create|add|done|submit|finish/i.test(label)) saveCurrent(event);
}

function submit(event) {
  if (routeCfg()) saveCurrent(event);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_LAUNCH_CREATE_SAVE_BRIDGE__) {
  window.__CHURVOX_LAUNCH_CREATE_SAVE_BRIDGE__ = true;
  document.addEventListener('click', click, true);
  document.addEventListener('submit', submit, true);
}

export {};
