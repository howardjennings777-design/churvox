import API_BASE from '../lib/apiBase';

const STYLE_ID = 'churvox-tidy-real-slip-style';
const CACHE_MS = 15000;
let cache = { at: 0, command: [], records: [] };

const css = `
  .cv3RealSlip {
    display: grid;
    gap: 10px;
    margin: 0 0 14px;
    padding: 14px;
    border: 1px solid rgba(16,21,19,.10);
    border-left: 5px solid #f36b21;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(255,255,252,.96), rgba(255,247,237,.86));
  }
  .cv3RealSlipHead { display: flex; align-items: start; justify-content: space-between; gap: 12px; }
  .cv3RealSlipHead b { display:block; color:#101513; font-size:15px; font-weight:1000; letter-spacing:-.03em; }
  .cv3RealSlipHead span { display:block; margin-top:3px; color:#58655f; font-size:12px; font-weight:760; line-height:1.35; }
  .cv3RealSlipHead em { border-radius:999px; padding:6px 9px; background:#101513; color:#fff; font-size:10px; font-weight:1000; font-style:normal; white-space:nowrap; }
  .cv3RealSlipGrid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
  .cv3RealSlipGrid div { min-height:44px; border:1px solid rgba(16,21,19,.08); border-radius:13px; padding:9px 10px; background:rgba(255,255,255,.78); }
  .cv3RealSlipGrid small { display:block; color:#7b8781; font-size:9px; font-weight:1000; letter-spacing:.08em; text-transform:uppercase; }
  .cv3RealSlipGrid strong { display:block; margin-top:3px; color:#101513; font-size:12px; font-weight:900; line-height:1.28; overflow-wrap:anywhere; }
  .cv3RealSlipMissing { border-radius:13px; padding:10px 11px; background:rgba(245,158,11,.13); color:#704500; font-size:12px; font-weight:850; line-height:1.35; }
  @media(max-width:760px){.cv3RealSlipGrid{grid-template-columns:1fr}.cv3RealSlipHead{display:grid}}
`;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  } else if (style.textContent !== css) {
    style.textContent = css;
  }
}

function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function money(value) {
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) && n > 0 ? `$${n.toFixed(2)}` : '';
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function first(obj, keys, fallback = '') {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && clean(value)) return clean(value);
  }
  return fallback;
}
function rowsFromPayload(body, key = '') {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.[key])) return body[key];
  if (Array.isArray(body?.data?.[key])) return body.data[key];
  for (const name of ['actions', 'items', 'records', 'results', 'data', 'jobs', 'clients', 'workers', 'team', 'quotes', 'invoices', 'messages', 'notifications']) {
    if (Array.isArray(body?.[name])) return body[name];
    if (Array.isArray(body?.data?.[name])) return body.data[name];
  }
  return [];
}
function authHeaders() {
  try {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
async function fetchRows(endpoint, key) {
  try {
    const response = await fetch(`${API_BASE}/api${endpoint}`, { credentials: 'include', headers: authHeaders() });
    if (!response.ok) return [];
    return rowsFromPayload(await response.json(), key);
  } catch {
    return [];
  }
}
function idOf(row) {
  const raw = row?.id || row?._id || row?.job_id || row?.client_id || row?.quote_id || row?.invoice_id || row?.user_id || row?.message_id || '';
  return typeof raw === 'object' ? clean(raw.$oid || raw.oid || raw.id || raw._id) : clean(raw);
}
function detailObject(item) {
  if (item?.details && typeof item.details === 'object' && !Array.isArray(item.details)) return item.details;
  if (item?.prepared_details && typeof item.prepared_details === 'object') return item.prepared_details;
  if (item?.context && typeof item.context === 'object') return item.context;
  return {};
}
function textOf(obj) {
  if (!obj) return '';
  const detail = detailObject(obj);
  return lower([
    obj.title, obj.summary, obj.type, obj.kind, obj.action, obj.status,
    obj.name, obj.client, obj.client_name, obj.customer_name, obj.job_title, obj.quote_title, obj.invoice_number,
    obj.description, obj.notes, obj.address, obj.site_address,
    ...Object.values(detail).filter((value) => typeof value === 'string' || typeof value === 'number'),
  ].join(' '));
}
function normalizeCommand(item, index) {
  const details = detailObject(item);
  const payload = item?.payload || {};
  const client = first(item, ['client', 'client_name', 'customer_name']) || first(payload, ['client', 'client_name', 'customer_name']) || clean(details.Client || details.Customer || '');
  const title = first(item, ['title', 'summary', 'record_title', 'name']) || first(payload, ['title', 'job_title', 'quote_title', 'invoice_number']) || clean(details.Record || details.Job || details.Quote || details.Invoice || `Command slip ${index + 1}`);
  const amount = money(item?.amount || item?.total || payload.amount || payload.total || payload.price || details.Amount || details.Price);
  return {
    ...item,
    _kind: 'command',
    _title: title,
    _client: client,
    _amount: amount,
    _type: first(item, ['approvalType', 'type', 'kind', 'action_type', 'action']) || clean(details.Type || 'Approval'),
    _missing: first(item, ['missing', '_commandMissing', 'reason', 'check']) || clean(details.Missing || details['Missing fields'] || ''),
    _text: textOf(item),
  };
}
function normalizeRecord(item, type, index) {
  const client = first(item, ['client', 'client_name', 'customer_name', 'name']);
  const title = type === 'client'
    ? first(item, ['name', 'client_name', 'customer_name']) || `Client ${index + 1}`
    : type === 'invoice'
      ? first(item, ['invoice_number', 'number', 'title']) || `Invoice ${index + 1}`
      : first(item, ['title', 'job_title', 'quote_title', 'name', 'description']) || `${type} ${index + 1}`;
  return { ...item, _kind: type, _title: title, _client: client, _amount: money(item.amount || item.total || item.price), _text: textOf(item) };
}
async function loadData() {
  const now = Date.now();
  if (now - cache.at < CACHE_MS) return cache;
  const [command, jobs, clients, workers, quotes, invoices, messages] = await Promise.all([
    fetchRows('/ai/actions', 'actions'), fetchRows('/jobs', 'jobs'), fetchRows('/clients', 'clients'), fetchRows('/team', 'team'),
    fetchRows('/quotes', 'quotes'), fetchRows('/invoices', 'invoices'), fetchRows('/messages', 'messages'),
  ]);
  cache = {
    at: now,
    command: command.map(normalizeCommand),
    records: [
      ...jobs.map((item, index) => normalizeRecord(item, 'job', index)),
      ...clients.map((item, index) => normalizeRecord(item, 'client', index)),
      ...workers.map((item, index) => normalizeRecord(item, 'worker', index)),
      ...quotes.map((item, index) => normalizeRecord(item, 'quote', index)),
      ...invoices.map((item, index) => normalizeRecord(item, 'invoice', index)),
      ...messages.map((item, index) => normalizeRecord(item, 'message', index)),
    ],
  };
  return cache;
}
function fieldControlByLabel(root, labelRegex) {
  const fields = Array.from(root.querySelectorAll('label,.cv3Field,.cvxField'));
  for (const field of fields) {
    const label = field.querySelector('span,small,b')?.textContent || '';
    if (!labelRegex.test(label)) continue;
    const control = field.querySelector('input,textarea,select');
    if (control) return control;
  }
  return null;
}
function fieldValue(root, regex) {
  const control = fieldControlByLabel(root, regex);
  return clean(control?.value || control?.textContent || '');
}
function setField(root, regex, value) {
  const control = fieldControlByLabel(root, regex);
  if (!control || !clean(value)) return;
  if (control.tagName === 'SELECT') {
    const wanted = lower(value);
    const option = Array.from(control.options || []).find((opt) => lower(opt.textContent).includes(wanted) || wanted.includes(lower(opt.textContent)));
    if (option) control.value = option.value;
  } else {
    control.value = value;
    control.textContent = value;
  }
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
}
function currentSlipText(dialog) {
  return lower([
    fieldValue(dialog, /approval type/i), fieldValue(dialog, /record/i), fieldValue(dialog, /client/i), fieldValue(dialog, /amount/i), dialog.textContent,
  ].join(' '));
}
function score(command, record, hay) {
  let points = 0;
  const title = lower(command?._title || record?._title);
  const client = lower(command?._client || record?._client);
  const type = lower(command?._type || record?._kind);
  if (title && hay.includes(title)) points += 8;
  if (client && hay.includes(client)) points += 5;
  if (type && hay.includes(type)) points += 2;
  if (command?._text && title && command._text.includes(title)) points += 2;
  return points;
}
function findBest(dialog, data) {
  const hay = currentSlipText(dialog);
  const commandRanked = data.command.map((item) => ({ item, points: score(item, null, hay) })).sort((a, b) => b.points - a.points);
  const command = commandRanked[0]?.points > 0 ? commandRanked[0].item : data.command[0];
  const targetText = lower([command?._title, command?._client, command?._type, hay].join(' '));
  const recordRanked = data.records.map((item) => {
    let points = 0;
    if (item._title && targetText.includes(lower(item._title))) points += 8;
    if (item._client && targetText.includes(lower(item._client))) points += 5;
    if (targetText.includes(item._kind)) points += 2;
    if (command?._text && item._text && (command._text.includes(lower(item._title)) || item._text.includes(lower(command._title)))) points += 4;
    return { item, points };
  }).sort((a, b) => b.points - a.points);
  return { command, record: recordRanked[0]?.points > 0 ? recordRanked[0].item : null };
}
function approvalType(command, record) {
  const kind = lower(record?._kind || command?._type || command?._title);
  if (/invoice|payment/.test(kind)) return 'Invoice draft approval';
  if (/quote/.test(kind)) return 'Quote approval';
  if (/job|recurring|schedule/.test(kind)) return 'Job approval';
  if (/client|customer/.test(kind)) return 'Client record approval';
  if (/worker|staff|team|dispatch/.test(kind)) return 'Worker update approval';
  if (/message|reply/.test(kind)) return 'Message reply approval';
  return 'Owner approval';
}
function pairsFor(command, record, dialog) {
  const source = record || command || {};
  const details = detailObject(source);
  const pairs = [
    ['Type', record?._kind || command?._type || fieldValue(dialog, /approval type/i)],
    ['Client', record?._client || command?._client || fieldValue(dialog, /client/i)],
    ['Record', record?._title || command?._title || fieldValue(dialog, /record/i)],
    ['Address', first(source, ['address', 'site_address']) || clean(details.Address || '')],
    ['Service', first(source, ['service', 'service_type']) || clean(details.Service || details.Scope || '')],
    ['Worker', first(source, ['worker', 'worker_name', 'assigned_worker_name', 'name'])],
    ['Date / time', [first(source, ['scheduled_date', 'date', 'start_date']), first(source, ['scheduled_time', 'time', 'start_time'])].filter(Boolean).join(' ')],
    ['Amount', record?._amount || command?._amount || money(first(source, ['amount', 'total', 'price'])) || fieldValue(dialog, /amount/i)],
    ['Status', first(source, ['status', 'job_status', 'invoice_status'])],
    ['Next step', first(command, ['recommended', 'action', 'next_step']) || first(source, ['next_step', 'follow_up'])],
  ];
  return pairs.filter(([, value]) => clean(value)).slice(0, 8);
}
function filledText(command, record, pairs) {
  const lines = [];
  const action = first(command, ['filled', 'summary', 'action', 'recommended']) || first(record, ['next_step', 'follow_up']);
  if (action) lines.push(`Prepared: ${action}`);
  pairs.forEach(([label, value]) => lines.push(`${label}: ${value}`));
  return lines.join('\n').trim() || 'Real details found. Check the fields before approval.';
}
function evidenceText(command, record) {
  const bits = [];
  if (record?._kind) bits.push(`${record._kind} record matched`);
  if (record?._title) bits.push(record._title);
  if (record?._client) bits.push(record._client);
  const reason = first(command, ['reason', 'evidence', 'check']);
  if (reason) bits.push(reason);
  return bits.join(' · ') || 'Matched against live Churvox records.';
}
function ownerCheckText(command, record) {
  const missing = command?._missing || first(command, ['missing', '_commandMissing']);
  if (missing) return `Check: ${missing}`;
  if (record?._kind === 'invoice') return 'Check amount, due date and client before sending or syncing.';
  if (record?._kind === 'quote') return 'Check scope, price and client before sending.';
  if (record?._kind === 'job') return 'Check client, worker, date, price and recurrence.';
  if (record?._kind === 'message') return 'Check the reply before sending.';
  return 'Approve if correct. Edit if needed. Park if not ready.';
}
function renderSection(dialog, command, record, pairs) {
  let section = dialog.querySelector('.cv3RealSlip');
  const htmlPairs = pairs.map(([label, value]) => `<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`).join('');
  const missing = command?._missing;
  const confidence = record ? 'Matched record' : command ? 'Command data' : 'Needs check';
  const html = `
    <div class="cv3RealSlipHead"><div><b>Prepared by Churvox</b><span>Real fields only. Owner checks before it moves.</span></div><em>${escapeHtml(confidence)}</em></div>
    <div class="cv3RealSlipGrid">${htmlPairs || '<div><small>Record</small><strong>No linked record found yet.</strong></div>'}</div>
    ${missing ? `<div class="cv3RealSlipMissing"><b>Check:</b> ${escapeHtml(missing)}</div>` : ''}
  `;
  if (!section) {
    section = document.createElement('section');
    section.className = 'cv3RealSlip';
    const anchor = Array.from(dialog.children).find((node) => /approval slip|command slip/i.test(node.textContent || '')) || dialog.firstElementChild;
    (anchor || dialog).insertAdjacentElement('afterend', section);
  }
  section.innerHTML = html;
}
function shouldHydrate(dialog) {
  if (!dialog || dialog.dataset.cv3RealSlip === 'done' || dialog.dataset.cv3RealSlip === 'working') return false;
  return /approval slip|command slip|what churvox prepared|evidence checked|owner check/i.test(dialog.textContent || '');
}
async function hydrateDialog(dialog) {
  if (!shouldHydrate(dialog)) return;
  dialog.dataset.cv3RealSlip = 'working';
  const data = await loadData();
  const { command, record } = findBest(dialog, data);
  const pairs = pairsFor(command, record, dialog);
  setField(dialog, /approval type/i, approvalType(command, record));
  setField(dialog, /record/i, record?._title || command?._title || fieldValue(dialog, /record/i));
  setField(dialog, /client/i, record?._client || command?._client || fieldValue(dialog, /client/i));
  setField(dialog, /amount/i, record?._amount || command?._amount || fieldValue(dialog, /amount/i) || 'Not money related');
  setField(dialog, /what churvox prepared/i, filledText(command, record, pairs));
  setField(dialog, /evidence checked/i, evidenceText(command, record));
  setField(dialog, /owner check/i, ownerCheckText(command, record));
  renderSection(dialog, command, record, pairs);
  dialog.dataset.cv3RealSlip = 'done';
}
function hydrateVisible() {
  ensureStyle();
  document.querySelectorAll('.cv3Drawer,.cvxDrawer,.recordWorkspacePopupPanel,.recordWorkspacePopup,[role="dialog"]').forEach((dialog) => hydrateDialog(dialog));
}

if (typeof window !== 'undefined' && !window.__CHURVOX_TIDY_REAL_SLIP_RUNTIME__) {
  window.__CHURVOX_TIDY_REAL_SLIP_RUNTIME__ = true;
  hydrateVisible();
  window.addEventListener('load', () => setTimeout(hydrateVisible, 120));
  window.addEventListener('hashchange', () => setTimeout(hydrateVisible, 120));
  window.addEventListener('popstate', () => setTimeout(hydrateVisible, 120));
  document.addEventListener('click', () => setTimeout(hydrateVisible, 80), true);
  const observer = new MutationObserver(() => setTimeout(hydrateVisible, 80));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(hydrateVisible, 2500);
}

export {};
