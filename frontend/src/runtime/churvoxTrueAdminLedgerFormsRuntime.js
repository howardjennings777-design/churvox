const STORAGE_KEY = 'churvox:world-admin-ledger';
const FIELD_MARK = 'data-churvox-ledger-field';

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function ledgerDefaults() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      country_code: saved.country_code || 'NZ',
      currency: saved.currency || 'NZD',
      tax_name: saved.tax_name || 'GST',
      tax_rate: String(saved.tax_rate ?? '15'),
      invoice_title: saved.invoice_title || 'Taxable supply information',
      business_id_value: saved.business_id_value || '',
      payment_terms: saved.payment_terms || '7 days',
    };
  } catch {
    return {
      country_code: 'NZ',
      currency: 'NZD',
      tax_name: 'GST',
      tax_rate: '15',
      invoice_title: 'Taxable supply information',
      business_id_value: '',
      payment_terms: '7 days',
    };
  }
}

function visible(node) {
  if (!node) return false;
  const rect = node.getBoundingClientRect();
  const style = window.getComputedStyle(node);
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
}

function visibleDrawer() {
  return [...document.querySelectorAll('.cvxDrawerLayer .cvxDrawer, [role="dialog"], .cvxDrawer')].find(visible) || null;
}

function labelText(label) {
  return clean(label?.querySelector?.('span')?.textContent || label?.textContent || '');
}

function hasLabel(root, label) {
  return [...root.querySelectorAll('label')].some((node) => new RegExp(`^${label}$`, 'i').test(labelText(node)));
}

function isCommandApprovalDrawer(drawer) {
  if (!drawer) return false;
  if (drawer.classList?.contains('approval')) return true;
  const text = clean(drawer.textContent).toLowerCase();
  return /command slip|approval slip|approval type|recommended action|what churvox filled|owner check/.test(text);
}

function removeLedgerFields(drawer) {
  if (!drawer) return;
  drawer.querySelectorAll(`[${FIELD_MARK}="true"]`).forEach((node) => node.remove());
}

function getFieldValueFromDrawer(label) {
  const drawer = visibleDrawer();
  if (!drawer || isCommandApprovalDrawer(drawer)) return '';
  const wanted = [...drawer.querySelectorAll('label')].find((node) => new RegExp(`^${label}$`, 'i').test(labelText(node)));
  const input = wanted?.querySelector?.('input, textarea, select');
  return clean(input?.value || '');
}

function addField(root, label, value, type = 'text', afterPattern = /Amount|Client|Invoice|Quote/i) {
  if (hasLabel(root, label)) return;
  const form = root.querySelector('.cvxForm') || root.querySelector('form') || root;
  const wrapper = document.createElement('label');
  wrapper.className = 'cvxField';
  wrapper.setAttribute(FIELD_MARK, 'true');

  const span = document.createElement('span');
  span.textContent = label;
  wrapper.appendChild(span);

  const input = document.createElement('input');
  input.name = label;
  input.type = type;
  input.value = value || '';
  if (type === 'number') input.step = '0.01';
  wrapper.appendChild(input);

  const after = [...form.querySelectorAll('label')].reverse().find((node) => afterPattern.test(labelText(node)));
  if (after?.parentNode) after.parentNode.insertBefore(wrapper, after.nextSibling);
  else form.appendChild(wrapper);
}

function isQuoteDrawer(drawer) {
  if (isCommandApprovalDrawer(drawer)) return false;
  const text = clean(drawer.textContent).toLowerCase();
  return /quote/.test(text) && (/scope/.test(text) || /terms/.test(text) || /follow-up/.test(text));
}

function isInvoiceDrawer(drawer) {
  if (isCommandApprovalDrawer(drawer)) return false;
  const text = clean(drawer.textContent).toLowerCase();
  return /invoice/.test(text) && (/xero|myob|due date|line item/.test(text));
}

function enhanceDrawer(drawer) {
  if (!drawer || !visible(drawer)) return;
  if (isCommandApprovalDrawer(drawer)) {
    removeLedgerFields(drawer);
    return;
  }
  const defaults = ledgerDefaults();

  if (isQuoteDrawer(drawer)) {
    addField(drawer, 'Currency', defaults.currency, 'text', /Amount|Status|Client/i);
    addField(drawer, 'Tax name', defaults.tax_name, 'text', /Currency|Amount/i);
    addField(drawer, 'Tax rate', defaults.tax_rate, 'number', /Tax name|Currency/i);
    addField(drawer, 'Country pack', defaults.country_code, 'text', /Tax rate|Tax name/i);
  }

  if (isInvoiceDrawer(drawer)) {
    addField(drawer, 'Invoice title', defaults.invoice_title, 'text', /Invoice/i);
    addField(drawer, 'Currency', defaults.currency, 'text', /Amount|Client|Job/i);
    addField(drawer, 'Tax name', defaults.tax_name, 'text', /Currency|Amount/i);
    addField(drawer, 'Tax rate', defaults.tax_rate, 'number', /Tax name|Currency/i);
  }
}

function enhanceVisibleDrawers() {
  document.querySelectorAll('.cvxDrawer, [role="dialog"]').forEach(enhanceDrawer);
}

function enrichAccountingPayload(url, options = {}) {
  const target = String(url || '');
  const method = String(options.method || 'GET').toUpperCase();
  if (!/POST|PUT|PATCH/.test(method)) return options;
  if (!/\/api\/(quotes|invoices)(\/|$)/.test(target)) return options;
  if (!options.body || typeof options.body !== 'string') return options;

  let body;
  try { body = JSON.parse(options.body); } catch { return options; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return options;

  const defaults = ledgerDefaults();
  const isInvoice = /\/api\/invoices(\/|$)/.test(target);

  const next = {
    ...body,
    currency: body.currency || getFieldValueFromDrawer('Currency') || defaults.currency,
    tax_name: body.tax_name || getFieldValueFromDrawer('Tax name') || defaults.tax_name,
    tax_rate: body.tax_rate || getFieldValueFromDrawer('Tax rate') || defaults.tax_rate,
    country_code: body.country_code || getFieldValueFromDrawer('Country pack') || defaults.country_code,
  };

  if (isInvoice) {
    next.invoice_title = body.invoice_title || getFieldValueFromDrawer('Invoice title') || defaults.invoice_title;
    next.business_id_value = body.business_id_value || getFieldValueFromDrawer('Business ID') || defaults.business_id_value || 'not supplied';
    next.auto_sent = false;
    next.owner_approval_required = true;
    next.accounting_handoff = 'draft_sync_or_export_only';
  } else {
    next.payment_terms = body.payment_terms || body.terms || defaults.payment_terms;
  }

  return { ...options, body: JSON.stringify(next) };
}

function patchFetch() {
  if (window.__CHURVOX_TRUE_ADMIN_LEDGER_FETCH_PATCHED__) return;
  window.__CHURVOX_TRUE_ADMIN_LEDGER_FETCH_PATCHED__ = true;
  const original = window.fetch.bind(window);
  window.fetch = (input, options = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    return original(input, enrichAccountingPayload(url, options));
  };
}

function schedule() {
  [0, 150, 400, 900, 1600].forEach((delay) => window.setTimeout(enhanceVisibleDrawers, delay));
}

if (typeof window !== 'undefined') {
  patchFetch();
  schedule();
  document.addEventListener('click', schedule, true);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox:data-refresh', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  window.setInterval(schedule, 1400);
}
