// CHURVOX_OPTION_F_AI_FILL_MISSING_20260629
// Conservative admin helper: fill obvious missing fields, then route unresolved work to Command.

const MAIN_STORE = 'churvox_option_f_working_actions_v1';
const OPS_STORE = 'churvox_option_f_operations_v1';
const AI_STORE = 'churvox_option_f_ai_fill_missing_v1';
const STYLE_ID = 'option-f-ai-fill-style';

const mainDefaults = { jobs: [], clients: [], quotes: [], invoices: [], messages: [], workers: [], command: [], audit: [] };
const opsDefaults = { audit: [], commandQueue: [], invoices: [], messages: [], workerDays: [], teamPeople: [] };
const aiDefaults = { filled: {}, blocked: {}, audit: [] };

function load(key, fallback) {
  try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || '{}')) }; } catch (_) { return { ...fallback }; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function main() { return load(MAIN_STORE, mainDefaults); }
function ops() { return load(OPS_STORE, opsDefaults); }
function ai() { return load(AI_STORE, aiDefaults); }
function saveMain(value) { save(MAIN_STORE, value); }
function saveOps(value) { save(OPS_STORE, value); }
function saveAi(value) { save(AI_STORE, value); }

function now() { return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' }); }
function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function blank(value) { const v = lower(value); return !v || v === 'none' || v === 'not set' || v === 'undefined' || v === 'null' || v === 'no customer'; }
function money(value) { const raw = clean(value).replace(/[^0-9.-]/g, ''); const n = Number(raw || 0); return Number.isFinite(n) ? n : 0; }
function text(record, keys) { for (const key of keys) { const raw = record?.[key]; if (raw !== undefined && raw !== null && clean(raw)) return clean(raw); } return ''; }
function id(value) { return clean(text(value, ['id', '_id', '_backendId', 'job_id', 'number', 'title', 'Job name', 'name', 'Name', 'subject']) || JSON.stringify(value || {}).slice(0, 70)); }
function keyFor(type, record, suffix = '') { return `${type}:${id(record)}:${suffix}`.toLowerCase(); }
function hash(value) { let out = 0; const input = String(value || ''); for (let i = 0; i < input.length; i += 1) out = ((out << 5) - out) + input.charCodeAt(i) | 0; return Math.abs(out); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function html(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }

function clientName(record) { return text(record, ['client', 'Client', 'client_name', 'customer_name', 'name', 'Name', 'customer']); }
function clientAddress(record) { return text(record, ['address', 'Address', 'site_address', 'service_address', 'job_address']); }
function serviceText(record) { return text(record, ['service', 'Service', 'service_type', 'job_type', 'scope', 'Scope', 'description', 'title', 'Job name']); }
function recordText(record) { return Object.values(record || {}).filter((value) => ['string', 'number'].includes(typeof value)).join(' '); }

function sameClient(a, b) {
  const left = lower(a);
  const right = lower(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function buildMemory(state) {
  const clients = state.clients || [];
  const quotes = state.quotes || [];
  return {
    clients,
    quotes,
    clientFor(record) {
      const name = clientName(record);
      return clients.find((client) => sameClient(name, clientName(client))) || null;
    },
    quoteFor(record) {
      const name = clientName(record);
      const service = lower(serviceText(record));
      return quotes.find((quote) => sameClient(name, clientName(quote)) && (!service || lower(serviceText(quote)).includes(service) || service.includes(lower(serviceText(quote))))) || null;
    },
  };
}

function parseDateClue(record) {
  const raw = lower(recordText(record));
  const today = new Date();
  const atLocal = (date) => {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
  };
  if (/\btoday\b/.test(raw)) return atLocal(today);
  if (/\btomorrow\b/.test(raw)) { const d = new Date(today); d.setDate(d.getDate() + 1); return atLocal(d); }
  const iso = raw.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  const nz = raw.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);
  if (nz) return `${nz[3]}-${String(nz[2]).padStart(2, '0')}-${String(nz[1]).padStart(2, '0')}`;
  return '';
}

function parseTimeClue(record) {
  const raw = lower(recordText(record));
  const m = raw.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) || raw.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!m) return '';
  let hour = Number(m[1]);
  const minute = Number(m[2] || 0);
  const suffix = m[3] || '';
  if (suffix === 'pm' && hour < 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function inferJob(job, memory) {
  const next = { ...job };
  const filled = [];
  const client = memory.clientFor(job);
  const quote = memory.quoteFor(job);
  const title = lower(text(job, ['title', 'Job name', 'job_name']));

  if (blank(clientName(next)) && client) {
    next.client = clientName(client);
    next.client_name = clientName(client);
    filled.push('client from client memory');
  }
  if (blank(clientAddress(next)) && clientAddress(client)) {
    next.address = clientAddress(client);
    next.site_address = clientAddress(client);
    filled.push('address from client memory');
  }
  if (blank(text(next, ['service', 'Service', 'service_type'])) && !blank(serviceText(next))) {
    next.service = serviceText(next);
    filled.push('service from job title/details');
  }
  if (blank(text(next, ['service', 'Service', 'service_type'])) && client && !blank(text(client, ['service memory', 'Service memory', 'service_memory']))) {
    next.service = text(client, ['service memory', 'Service memory', 'service_memory']);
    filled.push('service from client memory');
  }
  if (money(text(next, ['price', 'Price NZD', 'amount'])) <= 0) {
    const clientPrice = money(text(client || {}, ['price memory', 'Price memory', 'price_memory', 'regular_price']));
    const quotePrice = money(text(quote || {}, ['amount', 'Amount', 'price', 'total']));
    if (quotePrice > 0) { next.price = quotePrice; filled.push('price from accepted quote'); }
    else if (clientPrice > 0) { next.price = clientPrice; filled.push('price from client memory'); }
  }
  if (blank(text(next, ['recurring', 'Frequency'])) && /weekly|fortnightly|monthly|one[- ]?off/.test(title)) {
    next.recurring = title.includes('fortnight') ? 'Fortnightly' : title.includes('month') ? 'Monthly' : title.includes('weekly') ? 'Weekly' : 'One-off';
    filled.push('frequency from job title');
  }
  if (blank(text(next, ['date', 'Scheduled date', 'scheduled_date']))) {
    const parsedDate = parseDateClue(next);
    if (parsedDate) { next.date = parsedDate; next.scheduled_date = parsedDate; filled.push('date from record text'); }
  }
  if (blank(text(next, ['time', 'Start time', 'scheduled_time']))) {
    const parsedTime = parseTimeClue(next);
    if (parsedTime) { next.time = parsedTime; next.scheduled_time = parsedTime; filled.push('time from record text'); }
  }

  if (filled.length) {
    next._aiFilled = unique([...(Array.isArray(next._aiFilled) ? next._aiFilled : []), ...filled]);
    next._aiFilledAt = now();
  }
  return { record: next, filled };
}

function inferClient(client) {
  const next = { ...client };
  const filled = [];
  if (blank(text(next, ['service memory', 'Service memory', 'service_memory'])) && !blank(text(next, ['notes', 'Notes']))) {
    const notes = lower(text(next, ['notes', 'Notes']));
    if (/lawn|garden|hedge|clean|bin|waste|repair|maintenance/.test(notes)) {
      next.service_memory = notes.includes('lawn') ? 'Lawns and garden work' : notes.includes('hedge') ? 'Hedge/garden work' : notes.includes('clean') ? 'Cleaning/service visit' : 'Service visit';
      filled.push('service memory from notes');
    }
  }
  if (money(text(next, ['price memory', 'Price memory', 'price_memory'])) <= 0) {
    const priceMatch = recordText(next).match(/\$\s?(\d{2,5}(?:\.\d{1,2})?)/);
    if (priceMatch) { next.price_memory = Number(priceMatch[1]); filled.push('price memory from notes'); }
  }
  if (filled.length) {
    next._aiFilled = unique([...(Array.isArray(next._aiFilled) ? next._aiFilled : []), ...filled]);
    next._aiFilledAt = now();
  }
  return { record: next, filled };
}

function missingJob(job) {
  const missing = [];
  if (blank(clientName(job))) missing.push('client');
  if (blank(text(job, ['worker', 'Assigned worker', 'assigned_worker_name', 'worker_name']))) missing.push('assigned worker');
  if (blank(text(job, ['date', 'Scheduled date', 'scheduled_date']))) missing.push('date');
  if (blank(text(job, ['time', 'Start time', 'scheduled_time']))) missing.push('time');
  if (blank(clientAddress(job))) missing.push('address');
  if (blank(text(job, ['service', 'Service', 'service_type']))) missing.push('service');
  const billing = lower(text(job, ['billing', 'Billing type']));
  if (money(text(job, ['price', 'Price NZD', 'amount'])) <= 0 && !billing.includes('quote')) missing.push('price');
  return missing;
}

function missingClient(client) {
  const missing = [];
  if (blank(clientName(client))) missing.push('name');
  if (blank(text(client, ['phone', 'Phone'])) && blank(text(client, ['email', 'Email']))) missing.push('phone or email');
  if (blank(clientAddress(client))) missing.push('address');
  return missing;
}

function missingQuote(quote) {
  const missing = [];
  if (blank(clientName(quote))) missing.push('client');
  if (blank(serviceText(quote))) missing.push('scope');
  if (money(text(quote, ['amount', 'Amount', 'price', 'total'])) <= 0) missing.push('amount');
  return missing;
}

function missingInvoice(invoice) {
  const missing = [];
  if (blank(clientName(invoice))) missing.push('client');
  if (blank(text(invoice, ['due', 'Due date', 'due_date']))) missing.push('due date');
  if (money(text(invoice, ['amount', 'Amount', 'total', 'amount_due'])) <= 0) missing.push('amount');
  if (blank(text(invoice, ['line', 'Line item', 'description']))) missing.push('line item');
  return missing;
}

function commandExists(state, opState, key) {
  return [...(state.command || []), ...(opState.commandQueue || [])].some((item) => item.issueKey === key || item.flowKey === key || item.id === key);
}

function addCommand(state, opState, aiState, key, item) {
  if (commandExists(state, opState, key)) return false;
  const payload = {
    id: `ai-${hash(key)}`,
    status: 'waiting',
    owner: item.owner || 'Edit',
    createdAt: now(),
    issueKey: key,
    flowKey: key,
    aiFilled: item.aiFilled || '',
    ...item,
  };
  state.command = [payload, ...(state.command || [])].slice(0, 130);
  opState.commandQueue = [payload, ...(opState.commandQueue || [])].slice(0, 130);
  aiState.blocked[key] = { at: now(), type: item.type, title: item.title, missing: item.missing, aiFilled: item.aiFilled || '' };
  aiState.audit = [{ action: 'AI routed unresolved item', detail: `${item.type}: ${item.title}`, at: now() }, ...(aiState.audit || [])].slice(0, 80);
  state.audit = [{ action: 'AI routed unresolved item', detail: `${item.type}: ${item.title}`, at: now() }, ...(state.audit || [])].slice(0, 80);
  return true;
}

function markBlocked(record, missing) {
  if (!missing.length) return { ...record, _blockedByCommand: false, _doNotShowToday: false, _commandMissing: '', _aiCheckedAt: now() };
  return { ...record, _blockedByCommand: true, _doNotShowToday: true, _commandMissing: missing.join(', '), _aiCheckedAt: now() };
}

function runAiFill() {
  const state = main();
  const opState = ops();
  const aiState = ai();
  const memory = buildMemory(state);
  let changed = false;
  let filledCount = 0;

  state.clients = (state.clients || []).map((client) => {
    const result = inferClient(client);
    if (result.filled.length) { changed = true; filledCount += result.filled.length; }
    const missing = missingClient(result.record);
    if (missing.length) {
      addCommand(state, opState, aiState, keyFor('client-ai-fix', result.record, missing.join('|')), {
        type: 'Client issue ready',
        title: clientName(result.record) || 'Client missing details',
        client: clientName(result.record) || 'Not set',
        sourceType: 'clients',
        sourceId: text(result.record, ['id']),
        missing: missing.join(', '),
        filled: 'Churvox filled what it could from notes. Remaining details need owner check.',
        aiFilled: result.filled.join(', '),
        evidence: result.filled.length ? `AI filled: ${result.filled.join(', ')}` : 'No reliable source found for missing client details.',
        check: 'Edit the client record or park it.',
      });
    }
    return { ...result.record, _commandMissing: missing.join(', '), _aiCheckedAt: now() };
  });

  state.jobs = (state.jobs || []).map((job) => {
    const result = inferJob(job, memory);
    if (result.filled.length) { changed = true; filledCount += result.filled.length; }
    const missing = missingJob(result.record);
    const next = markBlocked(result.record, missing);
    if (missing.length) {
      addCommand(state, opState, aiState, keyFor('job-ai-fix', next, missing.join('|')), {
        type: 'Job fix needed',
        title: text(next, ['title', 'Job name']) || 'Job missing details',
        client: clientName(next) || 'Not set',
        sourceType: 'jobs',
        sourceId: text(next, ['id']),
        missing: missing.join(', '),
        filled: 'Churvox filled what it could. This job stays out of Today until the missing fields are fixed.',
        aiFilled: result.filled.join(', '),
        evidence: result.filled.length ? `AI filled: ${result.filled.join(', ')}` : 'No reliable source found. Worker app will not treat this as ready work.',
        check: 'Add missing job details, then approve from Command.',
      });
    }
    return next;
  });

  state.quotes = (state.quotes || []).map((quote) => {
    const missing = missingQuote(quote);
    if (missing.length) {
      addCommand(state, opState, aiState, keyFor('quote-ai-fix', quote, missing.join('|')), {
        type: 'Quote fix needed',
        title: text(quote, ['title', 'Quote']) || 'Quote missing details',
        client: clientName(quote) || 'Not set',
        sourceType: 'quotes',
        sourceId: text(quote, ['id']),
        missing: missing.join(', '),
        filled: 'Quote is not ready to send until these fields are fixed.',
        evidence: 'Churvox could not safely infer quote scope/amount/client.',
        check: 'Edit quote in Command before approval.',
      });
    }
    return { ...quote, _commandMissing: missing.join(', '), _aiCheckedAt: now() };
  });

  state.invoices = (state.invoices || []).map((invoice) => {
    const missing = missingInvoice(invoice);
    if (missing.length) {
      addCommand(state, opState, aiState, keyFor('invoice-ai-fix', invoice, missing.join('|')), {
        type: 'Invoice fix needed',
        title: text(invoice, ['number', 'Invoice']) || 'Invoice missing details',
        client: clientName(invoice) || 'Not set',
        sourceType: 'invoices',
        sourceId: text(invoice, ['id']),
        missing: missing.join(', '),
        filled: 'Invoice is blocked until the missing money/details are fixed.',
        evidence: 'Churvox will not invent invoice totals, due dates or line items without a source.',
        check: 'Edit invoice in Command before approval or sync.',
      });
    }
    return { ...invoice, _commandMissing: missing.join(', '), _aiCheckedAt: now() };
  });

  if (filledCount) {
    aiState.audit = [{ action: 'AI filled missing fields', detail: `${filledCount} field${filledCount === 1 ? '' : 's'} filled from reliable memory`, at: now() }, ...(aiState.audit || [])].slice(0, 80);
    state.audit = [{ action: 'AI filled missing fields', detail: `${filledCount} field${filledCount === 1 ? '' : 's'} filled from reliable memory`, at: now() }, ...(state.audit || [])].slice(0, 80);
  }

  saveMain(state);
  saveOps(opState);
  saveAi(aiState);
  if (changed || filledCount) renderPanel(aiState, filledCount);
}

function page() {
  const hashValue = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hashValue) return hashValue;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? active.textContent.trim().toLowerCase() : '';
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ofAiFillPanel{grid-column:1/-1;display:grid;gap:10px;padding:14px;border:1px solid rgba(16,21,19,.08);border-left:5px solid #0ea5e9;border-radius:16px;background:#fff;box-shadow:0 14px 30px rgba(16,21,19,.05)}
    .ofAiFillPanel h3{margin:0;font-size:15px;color:#111815}.ofAiFillPanel p{margin:0;color:#52605a;font-size:12px;font-weight:850;line-height:1.4}.ofAiFillRows{display:grid;gap:7px}.ofAiFillRows span{display:grid;grid-template-columns:150px 1fr auto;gap:10px;align-items:center;min-height:40px;padding:8px 10px;border-radius:12px;background:#f8faf9;color:#52605a;font-size:12px;font-weight:850}.ofAiFillRows b{color:#111815}.ofAiFillRows em{font-style:normal;color:#075985;font-weight:950}
    @media(max-width:760px){.ofAiFillRows span{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function renderPanel(aiState = ai(), filledCount = 0) {
  ensureStyle();
  document.querySelectorAll('.ofAiFillPanel').forEach((node) => node.remove());
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  const current = page();
  if (!['today', 'command', 'jobs', 'clients', 'quotes', 'invoices', 'workers'].includes(current)) return;
  const rows = Object.values(aiState.blocked || {}).slice(-4).reverse();
  const body = rows.map((item) => `<span><b>${html(item.type)}</b><small>${html(item.title)}${item.missing ? ` - still missing ${html(item.missing)}` : ''}${item.aiFilled ? ` - AI filled ${html(item.aiFilled)}` : ''}</small><em>${html(item.at)}</em></span>`).join('') || '<span><b>AI fill watching</b><small>Churvox fills only from reliable client/job/quote memory.</small><em>Safe mode</em></span>';
  root.insertAdjacentHTML('beforeend', `<section class="ofAiFillPanel"><h3>AI missing-info fill</h3><p>Churvox fills obvious admin gaps from saved memory. Anything uncertain is held from Today and appears in Command.</p>${filledCount ? `<p>${filledCount} field${filledCount === 1 ? '' : 's'} filled this pass.</p>` : ''}<div class="ofAiFillRows">${body}</div></section>`);
}

let running = false;
function scheduleRun() {
  if (running) return;
  running = true;
  setTimeout(() => { running = false; runAiFill(); }, 220);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(runAiFill, 1900));
  window.addEventListener('hashchange', () => setTimeout(runAiFill, 260));
  window.addEventListener('popstate', () => setTimeout(runAiFill, 260));
  document.addEventListener('input', scheduleRun, true);
  document.addEventListener('change', scheduleRun, true);
  setInterval(runAiFill, 2400);
}

export {};
