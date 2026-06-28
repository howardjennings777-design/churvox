const ACTION_STYLE_ID = 'option-f-working-actions-style';
const TOAST_ID = 'option-f-working-toast';
const MODAL_ID = 'option-f-working-modal';
const STORAGE_KEY = 'churvox_option_f_working_actions_v1';

const stateDefaults = {
  jobs: [],
  clients: [],
  quotes: [],
  invoices: [],
  messages: [],
  workers: [],
  command: [],
  audit: [],
};

function loadState() {
  try {
    return { ...stateDefaults, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')) };
  } catch (_) {
    return { ...stateDefaults };
  }
}

function saveState(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function nowLabel() {
  return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' });
}

function recordAudit(action, detail) {
  const state = loadState();
  state.audit = [{ action, detail, at: nowLabel() }, ...(state.audit || [])].slice(0, 30);
  saveState(state);
  renderAuditBadge();
}

function ensureStyles() {
  if (document.getElementById(ACTION_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = ACTION_STYLE_ID;
  style.textContent = `
    #${TOAST_ID}{position:fixed;right:18px;bottom:18px;z-index:999999;display:grid;gap:6px;max-width:360px;padding:13px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.24);font:850 13px/1.35 Inter,system-ui,sans-serif;transform:translateY(18px);opacity:0;pointer-events:none;transition:.18s ease}
    #${TOAST_ID}.show{transform:translateY(0);opacity:1}
    #${TOAST_ID} small{color:rgba(255,255,255,.68);font-weight:800}
    #${MODAL_ID}{position:fixed;inset:0;z-index:999998;display:grid;place-items:center;padding:24px;background:rgba(16,21,19,.38);backdrop-filter:blur(5px)}
    #${MODAL_ID}[hidden]{display:none}
    #${MODAL_ID} .ofWorkModal{width:min(920px,calc(100vw - 28px));max-height:calc(100vh - 32px);overflow:auto;border-radius:22px;background:#fff;color:#111815;box-shadow:0 30px 80px rgba(16,21,19,.3)}
    #${MODAL_ID} .ofWorkHead{display:flex;align-items:start;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid rgba(16,21,19,.08)}
    #${MODAL_ID} h2{margin:0;font-size:30px;line-height:1.05;letter-spacing:0}
    #${MODAL_ID} p{margin:6px 0 0;color:#52605a;font-size:13px;font-weight:850}
    #${MODAL_ID} .ofClose{border:0;border-radius:999px;padding:9px 13px;background:#101513;color:#fff;font-weight:950;cursor:pointer}
    #${MODAL_ID} form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px 22px 22px}
    #${MODAL_ID} label{display:grid;gap:5px;color:#52605a;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.03em}
    #${MODAL_ID} input,#${MODAL_ID} select,#${MODAL_ID} textarea{width:100%;min-height:42px;border:1px solid rgba(16,21,19,.13);border-radius:12px;padding:9px 10px;background:#fff;color:#111815;font:850 14px Inter,system-ui,sans-serif;text-transform:none;letter-spacing:0}
    #${MODAL_ID} textarea{min-height:92px;resize:vertical}
    #${MODAL_ID} label.full{grid-column:1/-1}
    #${MODAL_ID} .ofActions{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;padding-top:8px;border-top:1px solid rgba(16,21,19,.08)}
    #${MODAL_ID} .ofActions button{border:0;border-radius:999px;padding:11px 15px;font-weight:950;cursor:pointer;background:#ea580c;color:#fff}
    #${MODAL_ID} .ofActions button.secondary{background:#101513}
    #${MODAL_ID} .ofActions button.quiet{background:#eef2ed;color:#111815}
    .ofWorkingBadge{position:fixed;left:18px;bottom:18px;z-index:99990;display:flex;align-items:center;gap:8px;border:1px solid rgba(16,21,19,.09);border-radius:999px;padding:9px 12px;background:#fff;color:#111815;box-shadow:0 12px 28px rgba(16,21,19,.12);font:900 12px Inter,system-ui,sans-serif}
    .ofWorkingBadge i{width:8px;height:8px;border-radius:999px;background:#16a34a}
    .churvoxOptionC .ofCreatedRow{outline:2px solid rgba(234,88,12,.18);background:#fff7ed!important}
    @media(max-width:720px){#${MODAL_ID} form{grid-template-columns:1fr}#${MODAL_ID} .ofWorkHead{padding:16px}#${MODAL_ID} form{padding:14px 16px 18px}.ofWorkingBadge{left:10px;right:10px;justify-content:center}}
  `;
  document.head.appendChild(style);
}

function toast(title, detail = '') {
  ensureStyles();
  let node = document.getElementById(TOAST_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = TOAST_ID;
    document.body.appendChild(node);
  }
  node.innerHTML = `<b>${escapeHtml(title)}</b>${detail ? `<small>${escapeHtml(detail)}</small>` : ''}`;
  node.classList.add('show');
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove('show'), 2600);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function field(name, label, value = '', type = 'text', options = null, full = false) {
  const safe = escapeHtml(value);
  if (options) {
    return `<label class="${full ? 'full' : ''}"><span>${label}</span><select name="${name}">${options.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></label>`;
  }
  if (type === 'textarea') return `<label class="${full ? 'full' : ''}"><span>${label}</span><textarea name="${name}">${safe}</textarea></label>`;
  return `<label class="${full ? 'full' : ''}"><span>${label}</span><input name="${name}" type="${type}" value="${safe}" /></label>`;
}

function modalTemplate(config) {
  return `
    <section class="ofWorkModal" role="dialog" aria-modal="true" aria-label="${escapeHtml(config.title)}">
      <div class="ofWorkHead"><div><h2>${escapeHtml(config.title)}</h2><p>${escapeHtml(config.note || '')}</p></div><button type="button" class="ofClose">Close</button></div>
      <form data-kind="${escapeHtml(config.kind)}">
        ${config.fields.join('')}
        <div class="ofActions"><button type="button" class="quiet" data-close>Cancel</button><button type="submit">${escapeHtml(config.submit || 'Save')}</button></div>
      </form>
    </section>
  `;
}

function ensureModal() {
  ensureStyles();
  let modal = document.getElementById(MODAL_ID);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.hidden = true;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => {
      if (event.target.id === MODAL_ID || event.target.matches('.ofClose,[data-close]')) closeModal();
    });
    modal.addEventListener('submit', handleModalSubmit);
  }
  return modal;
}

function openModal(config) {
  const modal = ensureModal();
  modal.innerHTML = modalTemplate(config);
  modal.hidden = false;
  modal.querySelector('input,select,textarea')?.focus();
}

function closeModal() {
  const modal = document.getElementById(MODAL_ID);
  if (modal) modal.hidden = true;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function handleModalSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const kind = form.dataset.kind;
  const data = { id: `${kind}-${Date.now()}`, ...formData(form), createdAt: nowLabel() };
  const state = loadState();
  const key = kind === 'client' ? 'clients' : kind === 'quote' ? 'quotes' : kind === 'invoice' ? 'invoices' : kind === 'message' ? 'messages' : kind === 'worker' ? 'workers' : 'jobs';
  state[key] = [data, ...(state[key] || [])].slice(0, 50);
  saveState(state);
  recordAudit(`Saved ${kind}`, data.name || data.title || data.subject || data.client || 'record');
  closeModal();
  injectCreatedRows();
  toast(`${labelFor(kind)} saved`, 'Saved in this workspace and ready for the next step.');
}

function labelFor(kind) {
  return ({ job: 'Job', client: 'Client', quote: 'Quote', invoice: 'Invoice', message: 'Message', worker: 'Worker day' })[kind] || 'Record';
}

function currentPage() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash) return hash;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? active.textContent.trim().toLowerCase() : '';
}

function openAddJob() {
  openModal({
    kind: 'job',
    title: 'Add job',
    note: 'Create a job with service, worker, date, time, price and repeat schedule.',
    submit: 'Save job',
    fields: [
      field('title', 'Job name', 'New lawn service'),
      field('client', 'Client', '', 'text'),
      field('address', 'Site address', ''),
      field('service', 'Service', 'Lawn mowing', 'text', ['Lawn mowing', 'Hedge trimming', 'Property tidy', 'Cleanup', 'Quote visit', 'Other']),
      field('worker', 'Assigned worker', 'Howard', 'text', ['Howard', 'Alex', 'Sam', 'Tui']),
      field('date', 'Date', new Date().toISOString().slice(0, 10), 'date'),
      field('time', 'Time', '08:00', 'time'),
      field('price', 'Price NZD', '65', 'number'),
      field('billing', 'Billing type', 'Fixed price', 'text', ['Fixed price', 'Hourly', 'Fixed + extras', 'Hourly + extras', 'Package price', 'Quote required']),
      field('recurring', 'Frequency', 'Fortnightly', 'text', ['One-off', 'Weekly', 'Fortnightly', 'Monthly', 'Custom']),
      field('notes', 'Job notes', '', 'textarea', null, true),
    ],
  });
}

function openAddClient() {
  openModal({
    kind: 'client',
    title: 'Add client',
    note: 'Save contact details, service memory, price memory and notes.',
    submit: 'Save client',
    fields: [
      field('name', 'Client name', ''),
      field('phone', 'Phone', ''),
      field('email', 'Email', '', 'email'),
      field('address', 'Address', ''),
      field('service', 'Service memory', 'Fortnightly lawns'),
      field('price', 'Price memory', '$65 regular'),
      field('notes', 'Notes/access', '', 'textarea', null, true),
    ],
  });
}

function openAddQuote() {
  openModal({
    kind: 'quote',
    title: 'New quote',
    note: 'Draft the quote here. Sending approval still waits in Command.',
    submit: 'Save quote draft',
    fields: [
      field('title', 'Quote title', 'New quote'),
      field('client', 'Client', ''),
      field('amount', 'Amount NZD', '180', 'number'),
      field('status', 'Status', 'Draft', 'text', ['Draft', 'Sent', 'Viewed', 'Accepted']),
      field('terms', 'Terms', 'Valid 14 days'),
      field('followUp', 'Follow-up', 'Ready'),
      field('scope', 'Scope', '', 'textarea', null, true),
    ],
  });
}

function openMessage() {
  openModal({
    kind: 'message',
    title: 'Draft message',
    note: 'Prepare a reply. Sending approval remains in Command.',
    submit: 'Save draft',
    fields: [
      field('client', 'Client', ''),
      field('job', 'Job', ''),
      field('subject', 'Subject', 'Customer reply'),
      field('channel', 'Channel', 'SMS', 'text', ['SMS', 'Email', 'Worker app']),
      field('draft', 'Draft reply', '', 'textarea', null, true),
    ],
  });
}

function collectDrawerRecord(drawer) {
  const fields = {};
  drawer.querySelectorAll('.cocField').forEach((label) => {
    const name = label.querySelector('span')?.textContent?.trim() || 'field';
    const input = label.querySelector('input,textarea,select');
    if (input) fields[name] = input.value;
  });
  return fields;
}

function handleDrawerAction(button) {
  const text = button.textContent.trim().toLowerCase();
  const drawer = button.closest('.cocDrawer');
  if (!drawer) return false;
  const record = collectDrawerRecord(drawer);

  if (text === 'close') return false;
  if (text.includes('create quote') || text.includes('new quote')) {
    openAddQuote();
    recordAudit('Opened quote draft', record['Job name'] || record.Name || 'from record');
    return true;
  }
  if (text.includes('add job')) {
    openAddJob();
    recordAudit('Opened job form', record.Name || 'from client');
    return true;
  }
  if (text.includes('message worker')) {
    openMessage();
    recordAudit('Opened worker message', record.Worker || 'worker');
    return true;
  }
  if (text.includes('open timesheet') || text.includes('payroll review')) {
    recordAudit('Opened payroll review', record.Worker || record.Name || 'worker');
    toast('Payroll review opened', 'The worker day is ready for payroll review.');
    return true;
  }
  if (text === 'approve' || text === 'park' || text.includes('edit form')) {
    const action = text === 'approve' ? 'Approved' : text === 'park' ? 'Parked' : 'Editing';
    recordAudit(action, record.Record || record['Approval type'] || 'Command item');
    if (text === 'approve' || text === 'park') markCommandDone(record.Record || record['Approval type'] || action, action);
    toast(`Command item ${action.toLowerCase()}`, record.Record || record['Approval type'] || 'Owner check updated.');
    return text !== 'edit form';
  }
  if (text.startsWith('save') || text.startsWith('edit') || text.includes('update access')) {
    const type = drawer.querySelector('em')?.textContent?.trim() || 'record';
    const state = loadState();
    const key = type.toLowerCase().includes('client') ? 'clients' : type.toLowerCase().includes('quote') ? 'quotes' : type.toLowerCase().includes('invoice') ? 'invoices' : type.toLowerCase().includes('message') ? 'messages' : type.toLowerCase().includes('worker') || type.toLowerCase().includes('person') ? 'workers' : 'jobs';
    state[key] = [{ id: `${key}-${Date.now()}`, ...record, savedAt: nowLabel() }, ...(state[key] || [])].slice(0, 50);
    saveState(state);
    recordAudit(`Saved ${type}`, record.Name || record['Job name'] || record.Quote || record.Invoice || 'record');
    toast(`${type} saved`, 'Changes saved in this workspace.');
    return false;
  }
  return false;
}

function markCommandDone(name, action) {
  document.querySelectorAll('.command .cocRow,.today .cocRow').forEach((row) => {
    if (row.textContent.includes(name)) {
      row.style.opacity = '.45';
      row.style.pointerEvents = 'none';
      row.setAttribute('data-action-status', action);
    }
  });
}

function injectCreatedRows() {
  const page = currentPage();
  const state = loadState();
  if (page === 'jobs') injectCards('.jobsPage .jobCards', state.jobs, jobCard);
  if (page === 'clients') injectRows('.clientsPage .cocPanel:first-of-type .scroll', state.clients, (item) => `${item.name || 'New client'}|${item.address || ''} - ${item.service || 'service saved'}|${item.price || ''}`);
  if (page === 'quotes') injectCards('.quotesPage .workCards', state.quotes, quoteCard);
}

function injectRows(selector, items, render) {
  const root = document.querySelector(selector);
  if (!root || !items?.length) return;
  root.querySelectorAll('[data-created-runtime]').forEach((node) => node.remove());
  items.slice(0, 5).forEach((item) => {
    const [title, meta, tag] = render(item).split('|');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cocRow blue ofCreatedRow';
    button.setAttribute('data-created-runtime', '1');
    button.innerHTML = `<i></i><span><b>${escapeHtml(title)}</b><small>${escapeHtml(meta)}</small></span>${tag ? `<em>${escapeHtml(tag)}</em>` : ''}`;
    root.prepend(button);
  });
}

function injectCards(selector, items, render) {
  const root = document.querySelector(selector);
  if (!root || !items?.length) return;
  root.querySelectorAll('[data-created-runtime]').forEach((node) => node.remove());
  items.slice(0, 4).forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${selector.includes('quote') ? 'workCard' : 'jobCard'} ofCreatedRow`;
    button.setAttribute('data-created-runtime', '1');
    button.innerHTML = render(item);
    root.prepend(button);
  });
}

function jobCard(job) {
  return `<b>${escapeHtml(job.title || 'New job')}</b><small>${escapeHtml(job.client || 'Client')} - ${escapeHtml(job.worker || 'Worker')}</small><span>${escapeHtml(job.date || '')} at ${escapeHtml(job.time || '')} - ${escapeHtml(job.recurring || '')}</span><em>$${escapeHtml(job.price || '0')}</em><i>${escapeHtml(job.billing || 'saved')}</i>`;
}

function quoteCard(quote) {
  return `<b>${escapeHtml(quote.title || 'New quote')}</b><small>${escapeHtml(quote.client || 'Client')} - ${escapeHtml(quote.status || 'Draft')}</small><span>${escapeHtml(quote.scope || 'Scope ready')}</span><em>$${escapeHtml(quote.amount || '0')}</em><i>${escapeHtml(quote.followUp || 'Waiting in Command')}</i>`;
}

function renderAuditBadge() {
  ensureStyles();
  let badge = document.querySelector('.ofWorkingBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'ofWorkingBadge';
    document.body.appendChild(badge);
  }
  const count = loadState().audit.length;
  badge.innerHTML = `<i></i><span>${count ? `${count} saved actions` : 'Working actions ready'}</span>`;
}

function handleClick(event) {
  const button = event.target.closest('button');
  if (!button || !document.querySelector('.churvoxOptionC')) return;
  const text = button.textContent.trim().toLowerCase();
  if (button.closest('.cocDrawer') && handleDrawerAction(button)) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  if (text.includes('add job')) { event.preventDefault(); openAddJob(); return; }
  if (text.includes('add client')) { event.preventDefault(); openAddClient(); return; }
  if (text.includes('new quote')) { event.preventDefault(); openAddQuote(); return; }
  if (text.includes('csv import')) { toast('CSV import ready', 'Next step: wire this to the real upload endpoint.'); recordAudit('CSV import clicked', currentPage()); return; }
  if (text === 'export') { toast('Export prepared', 'Export action saved. Backend file export is the next wiring step.'); recordAudit('Export clicked', currentPage()); return; }
  if (text.includes('new ticket')) { event.preventDefault(); openMessage(); return; }
}

function boot() {
  ensureStyles();
  renderAuditBadge();
  injectCreatedRows();
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', boot);
  window.addEventListener('hashchange', () => setTimeout(() => { boot(); injectCreatedRows(); }, 120));
  window.addEventListener('popstate', () => setTimeout(() => { boot(); injectCreatedRows(); }, 120));
  document.addEventListener('click', handleClick, true);
  setInterval(injectCreatedRows, 1200);
}
