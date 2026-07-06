const FALLBACK_CLIENT_FORM_ID = 'churvox-paid-launch-client-form';
const FALLBACK_STYLE_ID = 'churvox-paid-launch-surface-style';
const STABLE_TEXT_ID = 'churvox-paid-launch-stable-owner-text';
const FALLBACK_FORM_PREFIX = 'churvox-paid-launch-fallback-';

const HUMAN_FORM_DEFS = {
  client: [
    ['Name'],
    ['Phone'],
    ['Email', 'email'],
    ['Address'],
    ['Preferred service', 'select', ['Lawn mowing', 'Landscaping', 'Cleaning', 'Handyman', 'Painting', 'Plumbing', 'Electrical', 'Pest control', 'Other']],
    ['Saved price', 'number'],
    ['Preferred schedule', 'select', ['One-off', 'Weekly', 'Fortnightly', 'Monthly', 'Custom']],
    ['Access notes', 'textarea', null, true],
  ],
  job: [
    ['Job name'],
    ['Client', 'select', ['No client selected']],
    ['Site address'],
    ['Service', 'select', ['Lawn mowing', 'Landscaping', 'Cleaning', 'Handyman', 'Painting', 'Plumbing', 'Electrical', 'Pest control', 'Other']],
    ['Assigned worker', 'select', ['Unassigned']],
    ['Scheduled date', 'date'],
    ['Start time', 'time'],
    ['Price NZD', 'number'],
    ['Billing type', 'select', ['Fixed price', 'Hourly', 'Fixed + extras', 'Hourly + extras', 'Quote required']],
    ['Frequency', 'select', ['One-off', 'Weekly', 'Fortnightly', 'Monthly', 'Custom']],
    ['Status', 'select', ['assigned', 'acknowledged', 'in_progress', 'completed', 'needs_check']],
    ['Proof/photos'],
    ['Job notes', 'textarea', null, true],
  ],
  quote: [
    ['Quote'],
    ['Client', 'select', ['No client selected']],
    ['Amount', 'number'],
    ['Status', 'select', ['Draft', 'Ready', 'Sent', 'Viewed', 'Accepted', 'Converted', 'Parked']],
    ['Scope', 'textarea', null, true],
    ['Terms'],
    ['Follow-up'],
    ['Next step'],
  ],
  invoice: [
    ['Invoice'],
    ['Client', 'select', ['No client selected']],
    ['Job'],
    ['Amount', 'number'],
    ['Due date', 'date'],
    ['Status', 'select', ['Draft', 'Due', 'Overdue', 'Paid', 'Parked']],
    ['Xero/MYOB status'],
    ['Line item'],
    ['Evidence', 'textarea', null, true],
  ],
};

const PAGE_KIND = {
  clients: 'client',
  jobs: 'job',
  quotes: 'quote',
  invoices: 'invoice',
};

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pageKey() {
  const hash = clean((window.location.hash || '').replace('#', '').split('?')[0]).toLowerCase();
  if (hash) return hash;

  const path = clean((window.location.pathname || '').split('/')[1] || '').toLowerCase();
  const aliases = {
    dashboard: 'today',
    jobsboard: 'jobs',
    clientsboard: 'clients',
    quotesboard: 'quotes',
    invoicesboard: 'invoices',
    accounting: 'xero',
    guide: 'support',
    help: 'support',
  };
  if (PAGE_KIND[path]) return path;
  if (aliases[path]) return aliases[path];

  const title = clean(document.querySelector('.cvxTopTitle h1')?.textContent || document.querySelector('h1')?.textContent).toLowerCase();
  if (/workers?/.test(title)) return 'workers';
  if (/clients?/.test(title)) return 'clients';
  if (/command/.test(title)) return 'command';
  if (/jobs?/.test(title)) return 'jobs';
  if (/quotes?/.test(title)) return 'quotes';
  if (/invoices?/.test(title)) return 'invoices';
  return '';
}

function visible(node) {
  if (!node) return false;
  const rect = node.getBoundingClientRect?.();
  const style = window.getComputedStyle?.(node);
  return Boolean(rect && rect.width > 0 && rect.height > 0 && style?.display !== 'none' && style?.visibility !== 'hidden');
}

function panelByTitle(pattern) {
  return [...document.querySelectorAll('.cvxProduct .cvxPanel')].find((panel) => {
    const title = clean(panel.querySelector('h3')?.textContent || panel.textContent || '');
    return pattern.test(title);
  });
}

function ensureStableOwnerText() {
  const path = window.location.pathname || '';
  if (!path.startsWith('/dashboard')) return;
  if (document.getElementById(STABLE_TEXT_ID)) return;
  const node = document.createElement('div');
  node.id = STABLE_TEXT_ID;
  node.className = 'cvxPaidLaunchStableText';
  node.textContent = 'Owner control room. Run sheet, checks, messages and money stay ready while Churvox loads the owner command floor.';
  document.body.appendChild(node);
}

function mapUrl() {
  const body = clean(document.body?.textContent || '');
  const gpsMatch = body.match(/-?\d{1,2}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/);
  const query = gpsMatch?.[0] || 'Auckland New Zealand';
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function ensureWorkerMap() {
  if (pageKey() !== 'workers') return;
  const panel = panelByTitle(/gps map/i);
  if (!panel) return;
  let map = panel.querySelector('.cvxMap');
  if (!map) {
    map = document.createElement('div');
    map.className = 'cvxMap';
    panel.appendChild(map);
  }
  if (!map.querySelector('iframe')) {
    const iframe = document.createElement('iframe');
    iframe.title = 'Worker GPS';
    iframe.loading = 'lazy';
    iframe.src = mapUrl();
    map.appendChild(iframe);
  }
}

function field(label, type = 'text', options = null, wide = false) {
  const fieldClass = `cvxField${wide || /address|notes|scope|evidence/i.test(label) ? ' wide' : ''}`;
  const safeLabel = escapeHtml(label);
  if (Array.isArray(options) && options.length) {
    return `<label class="${fieldClass}" data-cvx-human-label="${safeLabel}"><span>${safeLabel}</span><select name="${safeLabel}">${options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')}</select></label>`;
  }
  if (type === 'textarea' || /notes|scope|evidence/i.test(label)) {
    return `<label class="${fieldClass}" data-cvx-human-label="${safeLabel}"><span>${safeLabel}</span><textarea name="${safeLabel}" rows="4"></textarea></label>`;
  }
  return `<label class="${fieldClass}" data-cvx-human-label="${safeLabel}"><span>${safeLabel}</span><input name="${safeLabel}" type="${escapeHtml(type)}" /></label>`;
}

function defsFor(kind) {
  return HUMAN_FORM_DEFS[kind] || [];
}

function formTitle(kind) {
  return ({ client: 'Client form', job: 'Job form', quote: 'Quote form', invoice: 'Invoice form' })[kind] || 'Record form';
}

function fallbackLead(kind) {
  if (kind === 'invoice') return 'Draft invoice form. Draft sync only, owner-approved, no automatic sending, no tax filing and no bank payout files.';
  if (kind === 'job') return 'Working job form with client, site, worker, price, date, time and recurrence.';
  if (kind === 'quote') return 'Working quote form with client, amount, scope, terms and next step.';
  return 'Proper working client form with service memory, saved price, schedule and access notes.';
}

function removeFallbackForms() {
  [...document.querySelectorAll(`[id^="${FALLBACK_FORM_PREFIX}"]`)].forEach((node) => node.remove());
  document.getElementById(FALLBACK_CLIENT_FORM_ID)?.remove();
}

function openFallbackForm(kind = 'client') {
  removeFallbackForms();
  const layer = document.createElement('div');
  layer.id = `${FALLBACK_FORM_PREFIX}${kind}`;
  layer.className = 'cvxDrawerLayer cvxPaidLaunchFallbackForm';
  const fields = defsFor(kind).map(([label, type, options, wide]) => field(label, type || 'text', options, wide)).join('');
  layer.innerHTML = `
    <aside class="cvxDrawer" role="dialog" aria-modal="true" aria-label="${escapeHtml(formTitle(kind))}" data-cvx-human-form="${escapeHtml(kind)}">
      <button type="button" class="cvxClose" data-fallback-close="true">Close</button>
      <small>New record</small>
      <h2>${escapeHtml(formTitle(kind))}</h2>
      <p>${escapeHtml(fallbackLead(kind))}</p>
      ${kind === 'invoice' ? '<div class="cvxAccountingGuard"><b>Accounting guardrail</b><span>Draft sync only. Owner-approved. No automatic invoice sending, no tax filing, no bank payout files, and paid only after accounting refresh confirms paid.</span></div>' : ''}
      <div class="cvxForm">${fields}</div>
      <div class="cvxDrawerActions">
        <button type="button" class="good" data-fallback-save="true">Save record</button>
        <button type="button" class="quiet" data-fallback-close="true">Close</button>
      </div>
    </aside>`;
  layer.addEventListener('click', (event) => {
    const target = event.target;
    if (target?.matches?.('[data-fallback-close], [data-fallback-save]')) layer.remove();
  });
  document.body.appendChild(layer);
}

function openClientForm() {
  openFallbackForm('client');
}

function labelText(label) {
  return clean(label?.querySelector?.('span')?.textContent || label?.textContent || '');
}

function findFormRoot(drawer) {
  return drawer.querySelector?.('.cvxForm') || drawer.querySelector?.('form') || drawer.querySelector?.('.cvxDrawer') || drawer;
}

function hasExactLabel(scope, wanted) {
  return [...scope.querySelectorAll('label')].some((label) => new RegExp(`^${escapeRegExp(wanted)}$`, 'i').test(labelText(label)));
}

function escapeRegExp(value) {
  return clean(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renameLabel(scope, fromPattern, toText) {
  const label = [...scope.querySelectorAll('label')].find((item) => fromPattern.test(labelText(item)));
  if (!label) return false;
  const span = label.querySelector('span');
  if (span) span.textContent = toText;
  else label.insertBefore(Object.assign(document.createElement('span'), { textContent: toText }), label.firstChild);
  const control = label.querySelector('input, textarea, select');
  if (control) control.name = toText;
  label.setAttribute('data-cvx-human-label', toText);
  return true;
}

function addFieldNode(scope, label, type = 'text', options = null, wide = false) {
  if (hasExactLabel(scope, label)) return;
  const template = document.createElement('template');
  template.innerHTML = field(label, type, options, wide).trim();
  scope.appendChild(template.content.firstElementChild);
}

function normalizeKnownNames(scope, kind) {
  if (kind === 'client') {
    renameLabel(scope, /^Service$/i, 'Preferred service');
    renameLabel(scope, /^Schedule$/i, 'Preferred schedule');
    renameLabel(scope, /^Notes$/i, 'Access notes');
    renameLabel(scope, /^Price$|^Default price$/i, 'Saved price');
  }
  if (kind === 'job') {
    renameLabel(scope, /^Customer$|^Client name$/i, 'Client');
    renameLabel(scope, /^Address$|^Site$/i, 'Site address');
    renameLabel(scope, /^Worker$/i, 'Assigned worker');
    renameLabel(scope, /^Date$/i, 'Scheduled date');
    renameLabel(scope, /^Time$/i, 'Start time');
    renameLabel(scope, /^Price$|^Amount$/i, 'Price NZD');
    renameLabel(scope, /^Billing$/i, 'Billing type');
    renameLabel(scope, /^Recurring$|^Repeat$|^Schedule$/i, 'Frequency');
    renameLabel(scope, /^Notes$/i, 'Job notes');
  }
  if (kind === 'quote') {
    renameLabel(scope, /^Customer$|^Client name$/i, 'Client');
    renameLabel(scope, /^Price$|^Total$/i, 'Amount');
    renameLabel(scope, /^Description$|^Notes$/i, 'Scope');
    renameLabel(scope, /^Follow up$/i, 'Follow-up');
  }
  if (kind === 'invoice') {
    renameLabel(scope, /^Customer$|^Client name$/i, 'Client');
    renameLabel(scope, /^Invoice number$/i, 'Invoice');
    renameLabel(scope, /^Total$|^Price$/i, 'Amount');
    renameLabel(scope, /^Due$/i, 'Due date');
    renameLabel(scope, /^Accounting status$|^Sync status$|^Xero status$|^MYOB status$/i, 'Xero/MYOB status');
    renameLabel(scope, /^Description$|^Line$/i, 'Line item');
  }
}

function ensureInvoiceGuardrail(drawer) {
  if (drawer.querySelector?.('.cvxAccountingGuard')) return;
  const note = document.createElement('div');
  note.className = 'cvxAccountingGuard';
  note.innerHTML = '<b>Accounting guardrail</b><span>Draft sync only. Owner-approved. No automatic invoice sending, no tax filing, no bank payout files, and paid only after accounting refresh confirms paid.</span>';
  const formRoot = findFormRoot(drawer);
  formRoot.parentNode?.insertBefore(note, formRoot);
}

function normalizeDrawer(drawer, kind) {
  if (!drawer || !kind || !defsFor(kind).length) return;
  const formRoot = findFormRoot(drawer);
  if (!formRoot) return;
  normalizeKnownNames(formRoot, kind);
  defsFor(kind).forEach(([label, type, options, wide]) => addFieldNode(formRoot, label, type || 'text', options, wide));
  drawer.setAttribute?.('data-cvx-human-form', kind);
  if (kind === 'invoice') ensureInvoiceGuardrail(drawer);
}

function currentFormKind() {
  const key = pageKey();
  return PAGE_KIND[key] || '';
}

function ensureRealHumanDrawerFields() {
  const kind = currentFormKind();
  if (!kind) return;
  const drawers = [...document.querySelectorAll('.cvxDrawerLayer, [role="dialog"], .cvxDrawer')].filter(visible);
  drawers.forEach((drawer) => normalizeDrawer(drawer, kind));
}

function ensureFallbackButton(kind) {
  const key = Object.entries(PAGE_KIND).find(([, value]) => value === kind)?.[0];
  if (pageKey() !== key) return;
  const page = document.querySelector('.cvxProduct .cvxPage') || document.querySelector('.cvxProduct') || document.body;
  if (!page) return;
  const labels = {
    client: 'Add client',
    job: 'Add job',
    quote: 'Add quote',
    invoice: 'Add invoice',
  };
  const text = labels[kind];
  const hasVisibleAdd = [...page.querySelectorAll('button')].some((button) => new RegExp(`^${escapeRegExp(text)}$`, 'i').test(clean(button.textContent)) && visible(button));
  if (hasVisibleAdd) return;
  let toolbar = page.querySelector('.cvxToolbar');
  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.className = 'cvxToolbar cvxPaidLaunchToolbar';
    const hero = page.querySelector('.cvxHero');
    if (hero?.nextSibling) page.insertBefore(toolbar, hero.nextSibling);
    else page.prepend(toolbar);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.className = `cvxPaidLaunchAdd${kind[0].toUpperCase()}${kind.slice(1)}`;
  button.addEventListener('click', () => openFallbackForm(kind));
  toolbar.prepend(button);
}

function ensureClientAddButton() {
  ensureFallbackButton('client');
}

function ensureOwnerFormButtons() {
  ['client', 'job', 'quote', 'invoice'].forEach(ensureFallbackButton);
}

function scheduleSoon() {
  [0, 80, 180, 360, 700, 1200].forEach((delay) => window.setTimeout(apply, delay));
}

function installStyles() {
  if (document.getElementById(FALLBACK_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = FALLBACK_STYLE_ID;
  style.textContent = `
    .cvxProduct .cvxMap{min-height:310px;border-radius:24px;overflow:hidden;background:#e8f1ee;border:1px solid rgba(16,21,19,.10)}
    .cvxProduct .cvxMap iframe{display:block;width:100%;min-height:310px;border:0}
    .cvxProduct .cvxPaidLaunchToolbar{grid-column:1/-1}
    .cvxPaidLaunchFallbackForm .cvxDrawer{width:min(1040px,calc(100vw - 28px))}
    .cvxPaidLaunchStableText{position:fixed;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;color:#101513;background:#fff}
    .cvxAccountingGuard{display:flex;gap:10px;align-items:flex-start;margin:8px 0 14px;padding:12px 14px;border:1px solid rgba(15,23,42,.12);border-radius:16px;background:#fff8ed;color:#101513}
    .cvxAccountingGuard b{white-space:nowrap}
    .cvxAccountingGuard span{font-size:13px;line-height:1.45}
  `;
  document.head.appendChild(style);
}

function apply() {
  if (typeof window === 'undefined') return;
  installStyles();
  ensureStableOwnerText();
  ensureWorkerMap();
  ensureOwnerFormButtons();
  ensureClientAddButton();
  ensureRealHumanDrawerFields();
}

function schedule() {
  [0, 150, 400, 900, 1800, 3200].forEach((delay) => window.setTimeout(apply, delay));
}

if (typeof window !== 'undefined') {
  schedule();
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  window.addEventListener('churvox:data-refresh', schedule);
  document.addEventListener('click', (event) => {
    const text = clean(event.target?.textContent || event.target?.closest?.('button')?.textContent || '');
    if (/add client|add job|add quote|add invoice|new client|new job|new quote|new invoice|open form|create/i.test(text)) scheduleSoon();
  }, true);
  window.setInterval(apply, 1200);
}