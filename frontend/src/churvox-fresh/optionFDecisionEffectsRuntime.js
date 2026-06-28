const MAIN_STORE = 'churvox_option_f_working_actions_v1';
const OPS_STORE = 'churvox_option_f_operations_v1';
const EFFECT_STORE = 'churvox_option_f_decision_effects_v1';
const STYLE_ID = 'option-f-decision-effects-style';

const mainDefaults = { jobs: [], clients: [], quotes: [], invoices: [], messages: [], workers: [], command: [], audit: [] };
const opsDefaults = { audit: [], commandQueue: [], invoices: [], messages: [], workerDays: [], teamPeople: [] };
const effectDefaults = { effects: [] };

function load(key, fallback) {
  try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || '{}')) }; } catch (_) { return { ...fallback }; }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function main() { return load(MAIN_STORE, mainDefaults); }
function ops() { return load(OPS_STORE, opsDefaults); }
function effects() { return load(EFFECT_STORE, effectDefaults); }
function saveMain(value) { save(MAIN_STORE, value); }
function saveOps(value) { save(OPS_STORE, value); }
function saveEffects(value) { save(EFFECT_STORE, value); }

function now() {
  return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' });
}

function text(record, keys) {
  for (const key of keys) {
    const raw = record?.[key];
    if (raw !== undefined && raw !== null && String(raw).trim()) return String(raw).trim();
  }
  return '';
}

function money(item) {
  return Number(String(item?.amount || item?.Amount || 0).replace(/[^0-9.-]/g, '') || 0);
}

function findCommand(id) {
  return [...(ops().commandQueue || []), ...(main().command || [])].find((item) => item.id === id || item.issueKey === id || item.flowKey === id);
}

function addEffect(effect) {
  const state = effects();
  if ((state.effects || []).some((item) => item.key === effect.key)) return false;
  state.effects = [{ ...effect, at: now() }, ...(state.effects || [])].slice(0, 60);
  saveEffects(state);
  return true;
}

function applyApprove(item) {
  if (!item) return;
  const state = main();
  const opState = ops();
  const type = `${item.type || ''}`.toLowerCase();
  const key = `approved:${item.id || item.issueKey || item.flowKey}`;
  let detail = '';

  if (/invoice ready/.test(type)) {
    const invoiceNumber = text(item, ['number', 'Invoice']) || `INV-${Date.now().toString().slice(-5)}`;
    const exists = (state.invoices || []).some((invoice) => text(invoice, ['number', 'Invoice']) === invoiceNumber || (text(invoice, ['job', 'Job']) && text(invoice, ['job', 'Job']) === item.title));
    if (!exists) {
      state.invoices = [{ id: `approved-invoice-${Date.now()}`, number: invoiceNumber, client: item.client || '', job: item.title || '', amount: money(item), status: 'Draft', sync: 'Owner approved', line: item.filled || item.title || 'Approved work', evidence: item.evidence || 'Command approved', createdAt: now() }, ...(state.invoices || [])].slice(0, 80);
    }
    detail = `Draft invoice approved for ${item.title || item.client || invoiceNumber}`;
  }

  if (/invoice sync ready/.test(type)) {
    state.invoices = (state.invoices || []).map((invoice) => {
      const sameInvoice = text(invoice, ['number', 'Invoice']) === item.title || text(invoice, ['client', 'Client']) === item.client;
      return sameInvoice ? { ...invoice, sync: 'Owner approved sync', syncApprovedAt: now() } : invoice;
    });
    detail = `Draft sync approved for ${item.title || item.client || 'invoice'}`;
  }

  if (/message ready/.test(type)) {
    state.messages = (state.messages || []).map((message) => {
      const sameMessage = text(message, ['subject', 'Subject']) === item.title || text(message, ['client', 'Client']) === item.client;
      return sameMessage ? { ...message, status: 'Approved to send', sentApprovedAt: now() } : message;
    });
    detail = `Message approved for ${item.client || item.title || 'thread'}`;
  }

  if (/quote ready/.test(type)) {
    state.quotes = (state.quotes || []).map((quote) => {
      const sameQuote = text(quote, ['title', 'Quote']) === item.title || text(quote, ['client', 'Client']) === item.client;
      return sameQuote ? { ...quote, status: 'Sent', sentApprovedAt: now() } : quote;
    });
    detail = `Quote approved for ${item.client || item.title || 'client'}`;
  }

  if (/timesheet|proof|slip/.test(type)) {
    state.workers = (state.workers || []).map((worker) => {
      const label = `${text(worker, ['name', 'Worker', 'worker'])} ${text(worker, ['job', 'Current job'])}`;
      return item.title && item.title.includes(text(worker, ['name', 'Worker', 'worker'])) ? { ...worker, payroll: 'Ready', slip: 'Approved', approvedAt: now() } : worker;
    });
    detail = `Worker slip approved for ${item.title || 'worker'}`;
  }

  if (/job fix needed/.test(type)) {
    state.jobs = (state.jobs || []).map((job) => {
      if (job._commandIssueKey && job._commandIssueKey === item.issueKey) return { ...job, _adminOverride: true, _blockedByCommand: false, _doNotShowToday: false, _commandMissing: '', approvedAt: now() };
      return job;
    });
    detail = `Job exception approved for ${item.title || 'job'}`;
  }

  if (!detail) detail = `Approved ${item.type || 'Command item'}`;
  addEffect({ key, action: 'Approve', detail });
  state.audit = [{ action: 'Command approval applied', detail, at: now() }, ...(state.audit || [])].slice(0, 60);
  opState.audit = [{ action: 'Command approval applied', detail, at: now() }, ...(opState.audit || [])].slice(0, 60);
  saveMain(state);
  saveOps(opState);
  renderPanel();
}

function applyPark(item) {
  if (!item) return;
  const state = main();
  const key = `parked:${item.id || item.issueKey || item.flowKey}`;
  const detail = `Parked ${item.type || 'Command item'}: ${item.title || item.client || 'record'}`;
  addEffect({ key, action: 'Park', detail });
  state.audit = [{ action: 'Command park applied', detail, at: now() }, ...(state.audit || [])].slice(0, 60);
  saveMain(state);
  renderPanel();
}

function page() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash) return hash;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? active.textContent.trim().toLowerCase() : '';
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ofDecisionEffects{grid-column:1/-1;display:grid;gap:10px;padding:14px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff;box-shadow:0 14px 30px rgba(16,21,19,.05)}
    .ofDecisionEffects h3{margin:0;font-size:15px;color:#111815}.ofDecisionEffectsRows{display:grid;gap:7px}.ofDecisionEffectsRows span{display:grid;grid-template-columns:130px 1fr auto;gap:10px;align-items:center;min-height:40px;padding:8px 10px;border-radius:12px;background:#f8faf9;color:#52605a;font-size:12px;font-weight:850}.ofDecisionEffectsRows b{color:#111815}.ofDecisionEffectsRows em{font-style:normal;color:#9a3412;font-weight:950}
    @media(max-width:760px){.ofDecisionEffectsRows span{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function renderPanel() {
  ensureStyle();
  document.querySelectorAll('.ofDecisionEffects').forEach((node) => node.remove());
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root || page() !== 'command') return;
  const rows = (effects().effects || []).slice(0, 6);
  const body = rows.map((item) => `<span><b>${escapeHtml(item.action)}</b><small>${escapeHtml(item.detail)}</small><em>${escapeHtml(item.at)}</em></span>`).join('') || '<span><b>Ready</b><small>Approvals will apply visible admin effects here.</small><em>Waiting</em></span>';
  root.insertAdjacentHTML('beforeend', `<section class="ofDecisionEffects"><h3>Applied approval effects</h3><div class="ofDecisionEffectsRows">${body}</div></section>`);
}

function handleClick(event) {
  const button = event.target.closest('button');
  if (!button) return;
  const commandId = button.dataset.commandId;
  const brainApprove = button.dataset.brainApprove;
  const brainPark = button.dataset.brainPark;
  if (commandId && button.dataset.commandAction === 'approved') setTimeout(() => applyApprove(findCommand(commandId)), 80);
  if (commandId && button.dataset.commandAction === 'parked') setTimeout(() => applyPark(findCommand(commandId)), 80);
  if (brainApprove) setTimeout(() => applyApprove(findCommand(brainApprove)), 80);
  if (brainPark) setTimeout(() => applyPark(findCommand(brainPark)), 80);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(renderPanel, 1200));
  window.addEventListener('hashchange', () => setTimeout(renderPanel, 180));
  document.addEventListener('click', handleClick, true);
  document.addEventListener('click', () => setTimeout(renderPanel, 260));
  setInterval(renderPanel, 2500);
}
