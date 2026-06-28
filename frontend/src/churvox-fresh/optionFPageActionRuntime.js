import API_BASE from '../lib/apiBase';

function installOptionFRefreshGuard() {
  if (typeof window === 'undefined' || window.__churvoxOptionFRefreshGuard) return;
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);
  const blockedDelays = new Set([1600, 1800, 2400, 3000, 4200]);
  const blockedHandles = new Set();
  let nextBlockedHandle = 900000;

  function guardedSetInterval(handler, delay, ...args) {
    if (blockedDelays.has(Number(delay))) {
      const handle = nextBlockedHandle += 1;
      blockedHandles.add(handle);
      return handle;
    }
    return nativeSetInterval(handler, delay, ...args);
  }

  function guardedClearInterval(handle) {
    if (blockedHandles.delete(handle)) return undefined;
    return nativeClearInterval(handle);
  }

  window.__churvoxOptionFRefreshGuard = true;
  window.setInterval = guardedSetInterval;
  window.clearInterval = guardedClearInterval;

  window.setTimeout(() => {
    if (window.setInterval === guardedSetInterval) window.setInterval = nativeSetInterval;
    if (window.clearInterval === guardedClearInterval) window.clearInterval = nativeClearInterval;
  }, 8000);
}

installOptionFRefreshGuard();

const STORE = 'churvox_option_f_page_actions_v1';
const MAIN_STORE = 'churvox_option_f_working_actions_v1';
const MODAL_ID = 'option-f-page-action-modal';
const STYLE_ID = 'option-f-page-action-style';
const TOAST_ID = 'option-f-page-action-toast';

const defaults = {
  commandDecisions: [],
  settings: {},
  tickets: [],
  recurringRules: [],
  dispatchRuns: [],
  quoteFollowups: [],
  acceptedJobs: [],
};

function load() {
  try { return { ...defaults, ...(JSON.parse(localStorage.getItem(STORE) || '{}')) }; } catch (_) { return { ...defaults }; }
}

function save(state) {
  localStorage.setItem(STORE, JSON.stringify(state));
}

function loadMain() {
  try { return JSON.parse(localStorage.getItem(MAIN_STORE) || '{}'); } catch (_) { return {}; }
}

function saveMain(state) {
  localStorage.setItem(MAIN_STORE, JSON.stringify(state));
}

function now() {
  return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' });
}

function page() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash) return hash;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? active.textContent.trim().toLowerCase() : '';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${TOAST_ID}{position:fixed;right:18px;bottom:150px;z-index:999999;max-width:360px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.22);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}
    #${TOAST_ID}.show{opacity:1;transform:translateY(0)}
    #${MODAL_ID}{position:fixed;inset:0;z-index:999998;display:grid;place-items:center;padding:24px;background:rgba(16,21,19,.42);backdrop-filter:blur(5px)}
    #${MODAL_ID}[hidden]{display:none}
    #${MODAL_ID} .pageActionModal{width:min(920px,calc(100vw - 28px));max-height:calc(100vh - 32px);overflow:auto;border-radius:22px;background:#fff;color:#111815;box-shadow:0 30px 80px rgba(16,21,19,.3)}
    #${MODAL_ID} header{display:flex;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid rgba(16,21,19,.08)}
    #${MODAL_ID} h2{margin:0;font-size:30px;line-height:1.05;letter-spacing:0}
    #${MODAL_ID} p{margin:6px 0 0;color:#52605a;font-size:13px;font-weight:850}
    #${MODAL_ID} .close{border:0;border-radius:999px;padding:9px 13px;background:#101513;color:#fff;font-weight:950;cursor:pointer}
    #${MODAL_ID} form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:18px 22px 22px}
    #${MODAL_ID} label{display:grid;gap:5px;color:#52605a;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.03em}
    #${MODAL_ID} input,#${MODAL_ID} select,#${MODAL_ID} textarea{width:100%;min-height:42px;border:1px solid rgba(16,21,19,.13);border-radius:12px;padding:9px 10px;background:#fff;color:#111815;font:850 14px Inter,system-ui,sans-serif;text-transform:none;letter-spacing:0}
    #${MODAL_ID} textarea{min-height:96px;resize:vertical}
    #${MODAL_ID} label.full{grid-column:1/-1}
    #${MODAL_ID} .actions{grid-column:1/-1;display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px;padding-top:10px;border-top:1px solid rgba(16,21,19,.08)}
    #${MODAL_ID} .actions button{border:0;border-radius:999px;padding:11px 15px;background:#ea580c;color:#fff;font-weight:950;cursor:pointer}
    #${MODAL_ID} .actions button.secondary{background:#eef2ed;color:#111815}
    .optionFDecisionHistory,.optionFSettingsSaveBar,.optionFHelpTickets,.optionFQuickResult{display:grid;grid-column:1/-1;gap:10px;padding:14px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff;box-shadow:0 14px 30px rgba(16,21,19,.05)}
    .optionFDecisionHistory h3,.optionFSettingsSaveBar h3,.optionFHelpTickets h3,.optionFQuickResult h3{margin:0;font-size:15px;color:#111815}
    .optionFDecisionHistory div,.optionFHelpTickets div,.optionFQuickResult div{display:grid;gap:8px}
    .optionFDecisionHistory span,.optionFHelpTickets span,.optionFQuickResult span{display:grid;grid-template-columns:140px 1fr auto;gap:10px;align-items:center;min-height:42px;padding:8px 10px;border-radius:12px;background:#f8faf9;color:#52605a;font-size:12px;font-weight:850}
    .optionFDecisionHistory b,.optionFHelpTickets b,.optionFQuickResult b{color:#111815}.optionFDecisionHistory em,.optionFHelpTickets em,.optionFQuickResult em{font-style:normal;color:#9a3412;font-weight:950}
    .optionFSettingsSaveBar .settingsActions{display:flex;flex-wrap:wrap;gap:10px}.optionFSettingsSaveBar button{border:0;border-radius:999px;padding:10px 13px;background:#101513;color:#fff;font-weight:950;cursor:pointer}.optionFSettingsSaveBar button:first-child{background:#ea580c}
    @media(max-width:720px){#${MODAL_ID} form{grid-template-columns:1fr}.optionFDecisionHistory span,.optionFHelpTickets span,.optionFQuickResult span{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function toast(message) {
  ensureStyle();
  let node = document.getElementById(TOAST_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = TOAST_ID;
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove('show'), 2800);
}

function field(name, label, value = '', type = 'text', options = null, full = false) {
  if (options) return `<label class="${full ? 'full' : ''}"><span>${label}</span><select name="${name}">${options.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></label>`;
  if (type === 'textarea') return `<label class="${full ? 'full' : ''}"><span>${label}</span><textarea name="${name}">${escapeHtml(value)}</textarea></label>`;
  return `<label class="${full ? 'full' : ''}"><span>${label}</span><input type="${type}" name="${name}" value="${escapeHtml(value)}" /></label>`;
}

function openModal(config) {
  ensureStyle();
  let modal = document.getElementById(MODAL_ID);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.hidden = true;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => {
      if (event.target.id === MODAL_ID || event.target.closest('[data-close]')) closeModal();
    });
    modal.addEventListener('submit', submitModal);
  }
  modal.innerHTML = `<section class="pageActionModal"><header><div><h2>${escapeHtml(config.title)}</h2><p>${escapeHtml(config.note || '')}</p></div><button type="button" class="close" data-close>Close</button></header><form data-kind="${escapeHtml(config.kind)}">${config.fields.join('')}<div class="actions"><button type="button" class="secondary" data-close>Cancel</button><button type="submit">${escapeHtml(config.submit || 'Save')}</button></div></form></section>`;
  modal.hidden = false;
  modal.querySelector('input,select,textarea')?.focus();
}

function closeModal() {
  const modal = document.getElementById(MODAL_ID);
  if (modal) modal.hidden = true;
}

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function apiPost(endpoint, data) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE || ''}/api${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(data),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  return body;
}

async function submitModal(event) {
  event.preventDefault();
  const form = event.target;
  const kind = form.dataset.kind;
  const data = { id: `${kind}-${Date.now()}`, ...formObject(form), createdAt: now() };
  const state = load();
  if (kind === 'ticket') {
    state.tickets = [data, ...(state.tickets || [])].slice(0, 30);
    save(state);
    try { await apiPost('/support/tickets', data); data.synced = true; } catch (_) {}
    toast('Help ticket saved');
  }
  if (kind === 'recurring') {
    state.recurringRules = [data, ...(state.recurringRules || [])].slice(0, 30);
    save(state);
    toast('Recurring rule saved');
  }
  if (kind === 'dispatch') {
    state.dispatchRuns = [data, ...(state.dispatchRuns || [])].slice(0, 30);
    save(state);
    toast('Dispatch run saved');
  }
  if (kind === 'followup') {
    state.quoteFollowups = [data, ...(state.quoteFollowups || [])].slice(0, 30);
    save(state);
    toast('Follow-up saved');
  }
  closeModal();
  renderPageAddons();
}

function commandDecision(action) {
  const state = load();
  const selected = document.querySelector('.command [title], .command h3')?.textContent?.trim() || 'Command item';
  state.commandDecisions = [{ action, item: selected, at: now() }, ...(state.commandDecisions || [])].slice(0, 25);
  save(state);
  toast(`${action} saved`);
  renderPageAddons();
}

function saveSettings() {
  const state = load();
  const fields = {};
  document.querySelectorAll('.cocPage .cocField').forEach((label) => {
    const name = label.querySelector('span')?.textContent?.trim();
    const input = label.querySelector('input,textarea,select');
    if (name && input) fields[name] = input.value;
  });
  state.settings = { ...state.settings, ...fields, savedAt: now() };
  save(state);
  toast('Settings saved');
}

function openTicket() {
  openModal({ kind: 'ticket', title: 'New help ticket', note: 'Tell support what is stuck. This saves locally and tries the support endpoint.', submit: 'Save ticket', fields: [field('area', 'Area', 'Setup', 'text', ['Setup', 'Billing', 'Worker app', 'CSV import', 'Xero', 'Other']), field('priority', 'Priority', 'Normal', 'text', ['Normal', 'Urgent', 'Stuck']), field('contact', 'Contact email', 'hello@churvox.com', 'email'), field('message', 'What is happening?', '', 'textarea', null, true)] });
}

function openRecurring() {
  openModal({ kind: 'recurring', title: 'Recurring jobs', note: 'Create a repeat rule for weekly, fortnightly, monthly or custom work.', submit: 'Save repeat rule', fields: [field('name', 'Rule name', 'Regular lawn run'), field('frequency', 'Frequency', 'Fortnightly', 'text', ['Weekly', 'Fortnightly', 'Monthly', 'Custom']), field('startDate', 'Start date', new Date().toISOString().slice(0, 10), 'date'), field('worker', 'Default worker', 'Howard'), field('price', 'Default price', '65', 'number'), field('notes', 'Notes', '', 'textarea', null, true)] });
}

function openDispatch() {
  openModal({ kind: 'dispatch', title: 'Dispatch board', note: 'Plan a simple run without putting maps inside Jobs.', submit: 'Save dispatch run', fields: [field('run', 'Run name', 'Morning run'), field('worker', 'Worker', 'Howard'), field('date', 'Date', new Date().toISOString().slice(0, 10), 'date'), field('jobs', 'Jobs in run', 'Naenae lawn reset, Petone unit cleanup', 'textarea', null, true), field('notes', 'Route notes', '', 'textarea', null, true)] });
}

function openFollowups() {
  openModal({ kind: 'followup', title: 'Quote follow-ups', note: 'Prepare the next follow-up. Sending still waits in Command.', submit: 'Save follow-up', fields: [field('quote', 'Quote', 'Fence repair'), field('client', 'Client', 'Mere H.'), field('when', 'When', 'Tomorrow'), field('message', 'Draft follow-up', 'Just checking if you had any questions about the quote.', 'textarea', null, true)] });
}

function acceptedToJobs() {
  const main = loadMain();
  const accepted = (main.quotes || []).filter((quote) => /accepted/i.test(quote.status || quote.Status || ''));
  const state = load();
  state.acceptedJobs = [...accepted.map((quote) => ({ quote: quote.title || quote.Quote || 'Accepted quote', client: quote.client || quote.Client || '', at: now() })), ...(state.acceptedJobs || [])].slice(0, 30);
  save(state);
  toast(accepted.length ? `${accepted.length} accepted quote(s) prepared as jobs` : 'No accepted saved quotes yet');
  renderPageAddons();
}

function renderPageAddons() {
  ensureStyle();
  document.querySelectorAll('.optionFDecisionHistory,.optionFSettingsSaveBar,.optionFHelpTickets,.optionFQuickResult').forEach((node) => node.remove());
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  const state = load();
  const p = page();
  if (p === 'command') {
    const section = document.createElement('section');
    section.className = 'optionFDecisionHistory';
    const rows = (state.commandDecisions || []).slice(0, 5).map((item) => `<span><b>${escapeHtml(item.action)}</b><small>${escapeHtml(item.item)}</small><em>${escapeHtml(item.at)}</em></span>`).join('') || '<span><b>No decisions yet</b><small>Approve, edit or park to build history.</small><em>Ready</em></span>';
    section.innerHTML = `<h3>Decision history</h3><div>${rows}</div>`;
    root.appendChild(section);
  }
  if (p === 'settings') {
    const section = document.createElement('section');
    section.className = 'optionFSettingsSaveBar';
    section.innerHTML = `<h3>Settings actions</h3><div class="settingsActions"><button type="button" data-settings-save>Save settings</button><button type="button" data-settings-export>Export settings</button></div>`;
    root.appendChild(section);
  }
  if (p === 'help') {
    const section = document.createElement('section');
    section.className = 'optionFHelpTickets';
    const rows = (state.tickets || []).slice(0, 5).map((item) => `<span><b>${escapeHtml(item.area)}</b><small>${escapeHtml(item.message || item.priority)}</small><em>${escapeHtml(item.at || item.createdAt || 'Saved')}</em></span>`).join('') || '<span><b>No tickets yet</b><small>Use New ticket to save one.</small><em>Ready</em></span>';
    section.innerHTML = `<h3>Ticket history</h3><div>${rows}</div>`;
    root.appendChild(section);
  }
  if (p === 'jobs' && (state.recurringRules?.length || state.dispatchRuns?.length)) {
    const section = document.createElement('section');
    section.className = 'optionFQuickResult';
    const rows = [...(state.recurringRules || []).slice(0, 3).map((item) => `<span><b>Recurring</b><small>${escapeHtml(item.name)} - ${escapeHtml(item.frequency)}</small><em>${escapeHtml(item.createdAt || '')}</em></span>`), ...(state.dispatchRuns || []).slice(0, 3).map((item) => `<span><b>Dispatch</b><small>${escapeHtml(item.run)} - ${escapeHtml(item.worker)}</small><em>${escapeHtml(item.createdAt || '')}</em></span>`)].join('');
    section.innerHTML = `<h3>Saved job controls</h3><div>${rows}</div>`;
    root.appendChild(section);
  }
}

function handleClick(event) {
  const button = event.target.closest('button');
  if (!button || !document.querySelector('.churvoxOptionC')) return;
  const text = button.textContent.trim().toLowerCase();
  const p = page();
  if (p === 'command' && ['approve', 'edit', 'park'].includes(text)) { commandDecision(text[0].toUpperCase() + text.slice(1)); return; }
  if (text === 'recurring') { event.preventDefault(); openRecurring(); return; }
  if (text === 'dispatch board') { event.preventDefault(); openDispatch(); return; }
  if (text === 'follow-ups') { event.preventDefault(); openFollowups(); return; }
  if (text === 'accepted to jobs') { event.preventDefault(); acceptedToJobs(); return; }
  if (text.includes('new ticket')) { event.preventDefault(); openTicket(); return; }
  if (button.matches('[data-settings-save]')) { event.preventDefault(); saveSettings(); return; }
  if (button.matches('[data-settings-export]')) {
    event.preventDefault();
    const blob = new Blob([JSON.stringify(load().settings || {}, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'churvox-settings.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('Settings exported');
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', renderPageAddons);
  window.addEventListener('hashchange', () => setTimeout(renderPageAddons, 100));
  window.addEventListener('popstate', () => setTimeout(renderPageAddons, 100));
  document.addEventListener('click', handleClick, true);
  document.addEventListener('click', () => setTimeout(renderPageAddons, 150));
  setInterval(renderPageAddons, 1600);
}
