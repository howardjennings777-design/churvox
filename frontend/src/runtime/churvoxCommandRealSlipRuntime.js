import API_BASE from '../lib/apiBase';

// Command slips must be prepared admin work, not generic placeholders.
// This hydrates visible approval slips from real Command/AI action details and saved records.

const STYLE_ID = 'churvox-command-real-slip-style';
const GENERIC_RE = /prepared for owner review|prepared from live business records|approve, edit or park in command|ai review item/i;
const CACHE_MS = 15000;
let cache = { at: 0, items: [] };
let running = false;

const css = `
  .cvxRealPreparedSlip {
    display: grid;
    gap: 10px;
    margin: 14px 0;
    padding: 14px;
    border: 1px solid rgba(17,21,19,.10);
    border-left: 5px solid #f36b21;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(255,255,252,.92), rgba(255,247,237,.84));
    box-shadow: 0 12px 30px rgba(17,21,19,.06);
  }
  .cvxRealPreparedSlipHead {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 10px;
    align-items: start;
  }
  .cvxRealPreparedSlipHead b {
    display: block;
    color: #111713;
    font-size: 15px;
    font-weight: 1000;
    letter-spacing: -.03em;
  }
  .cvxRealPreparedSlipHead span {
    display: block;
    margin-top: 3px;
    color: #5f6a64;
    font-size: 12px;
    font-weight: 760;
    line-height: 1.35;
  }
  .cvxRealPreparedConfidence {
    border-radius: 999px;
    padding: 6px 9px;
    background: #111713;
    color: #fff;
    font-size: 10px;
    font-weight: 1000;
    letter-spacing: .06em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .cvxRealPreparedGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .cvxRealPreparedGrid div {
    min-height: 46px;
    border: 1px solid rgba(17,21,19,.08);
    border-radius: 13px;
    padding: 9px 10px;
    background: rgba(255,255,255,.72);
  }
  .cvxRealPreparedGrid small {
    display: block;
    color: #7b8781;
    font-size: 9px;
    font-weight: 1000;
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .cvxRealPreparedGrid strong {
    display: block;
    margin-top: 3px;
    overflow-wrap: anywhere;
    color: #111713;
    font-size: 12px;
    font-weight: 900;
    line-height: 1.28;
  }
  .cvxRealPreparedMissing {
    border-radius: 13px;
    padding: 10px 11px;
    background: rgba(245,158,11,.12);
    color: #704500;
    font-size: 12px;
    font-weight: 850;
    line-height: 1.35;
  }
  @media(max-width: 760px){.cvxRealPreparedGrid{grid-template-columns:1fr}}
`;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }
  if (style.parentNode === document.head && document.head.lastElementChild !== style) document.head.appendChild(style);
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function rowsFromPayload(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.actions)) return body.actions;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.data?.actions)) return body.data.actions;
  return [];
}

async function fetchRows(endpoint) {
  try {
    const response = await fetch(`${API_BASE}/api${endpoint}`, { credentials: 'include', headers: authHeaders() });
    if (!response.ok) return [];
    return rowsFromPayload(await response.json());
  } catch (_) {
    return [];
  }
}

function readStore(key, fallback = {}) {
  try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || '{}')) }; } catch (_) { return { ...fallback }; }
}

function localCommandRows() {
  const main = readStore('churvox_option_f_working_actions_v1', { command: [] });
  const ops = readStore('churvox_option_f_operations_v1', { commandQueue: [] });
  return [...(main.command || []), ...(ops.commandQueue || [])];
}

function numberMoney(value) {
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function first(obj, keys, fallback = '') {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && clean(value)) return clean(value);
  }
  return fallback;
}

function detailsObject(item) {
  if (item?.details && typeof item.details === 'object' && !Array.isArray(item.details)) return item.details;
  if (item?.prepared_details && typeof item.prepared_details === 'object') return item.prepared_details;
  if (item?.context && typeof item.context === 'object') return item.context;
  return {};
}

function itemText(item) {
  const details = detailsObject(item);
  return lower([
    item?.title, item?.summary, item?.type, item?.action, item?.client, item?.client_name, item?.customer_name,
    item?.match?.label, item?.match?.reason, item?.payload?.client_name, item?.payload?.customer_name,
    ...Object.values(details || {}).map((v) => typeof v === 'string' || typeof v === 'number' ? v : ''),
  ].join(' '));
}

function normalizeItem(item) {
  const details = detailsObject(item);
  const payload = item?.payload || {};
  const match = item?.match || {};
  const amount = numberMoney(item?.amount || item?.total || payload.amount || payload.price || details.Price || details.Amount);
  const client = first(item, ['client', 'client_name', 'customer_name'], '') || first(payload, ['client', 'client_name', 'customer_name'], '') || clean(details.Customer || details.Client || match.label || '');
  const title = clean(item?.title || item?.summary || details.Record || details.Job || match.label || 'Prepared admin item');
  const type = clean(item?.type || item?.action || details.Type || match.record_type || 'Prepared approval');
  const missing = clean(item?.missing || item?._commandMissing || details.Missing || details['Missing fields'] || match.reason || '');
  return { raw: item, details, payload, match, title, type, client, amount, missing, text: itemText(item) };
}

async function allCommandItems() {
  const now = Date.now();
  if (now - cache.at < CACHE_MS && cache.items.length) return cache.items;
  const rows = [
    ...(await fetchRows('/ai/actions')),
    ...(await fetchRows('/ai-review-items')),
    ...localCommandRows(),
  ];
  const seen = new Set();
  const items = rows.map(normalizeItem).filter((item) => {
    const key = `${item.title}|${item.type}|${item.client}|${item.missing}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  cache = { at: now, items };
  return items;
}

function findDialogCandidates() {
  return Array.from(document.querySelectorAll('.cvxDrawer,.recordWorkspacePopupPanel,.recordWorkspacePopup,.cocDrawer,.properSlip,[role="dialog"]'))
    .filter((node) => /approval slip|what churvox filled|evidence checked|owner check/i.test(node.textContent || ''));
}

function fieldControlByLabel(root, labelRegex) {
  const fields = Array.from(root.querySelectorAll('label,.cvxField,div'));
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

function matchItem(dialog, items) {
  const record = fieldValue(dialog, /record/i);
  const client = fieldValue(dialog, /client/i);
  const approvalType = fieldValue(dialog, /approval type/i);
  const hay = lower([record, client, approvalType, dialog.textContent].join(' '));
  if (!items.length) return null;
  return items.find((item) => item.text.includes(lower(record)) || lower(record).includes(item.title.toLowerCase()))
    || items.find((item) => client && (item.text.includes(lower(client)) || lower(client).includes(item.client.toLowerCase())))
    || items.find((item) => approvalType && item.text.includes(lower(approvalType)))
    || items[0];
}

function valueFromDetails(item, label, fallback = '') {
  const details = item?.details || {};
  const foundKey = Object.keys(details).find((key) => lower(key) === lower(label) || lower(key).includes(lower(label)) || lower(label).includes(lower(key)));
  return clean(foundKey ? details[foundKey] : fallback);
}

function preparedPairs(item, dialog) {
  const details = item?.details || {};
  const payload = item?.payload || {};
  const match = item?.match || {};
  const pairs = [
    ['Client', item?.client || fieldValue(dialog, /client/i) || valueFromDetails(item, 'Customer')],
    ['Record', item?.title || fieldValue(dialog, /record/i)],
    ['Source', item?.raw?.source || 'Command / live records'],
    ['Record type', match.record_type || item?.raw?.sourceType || item?.type],
    ['Address', valueFromDetails(item, 'Address') || payload.address || payload.site_address],
    ['Service / scope', valueFromDetails(item, 'Job') || valueFromDetails(item, 'Scope') || payload.service || payload.description],
    ['Price / amount', valueFromDetails(item, 'Price') || valueFromDetails(item, 'Amount') || (item?.amount ? `$${item.amount.toFixed(2)}` : '')],
    ['Status', valueFromDetails(item, 'Status') || item?.raw?.status],
    ['Prepared action', valueFromDetails(item, 'What Churvox prepared') || item?.raw?.filled || item?.raw?.summary],
    ['Why approval is needed', valueFromDetails(item, 'Why it needs approval') || item?.raw?.check || item?.missing],
  ];
  return pairs.filter(([, value]) => clean(value));
}

function actionTypeFor(item, dialog) {
  const record = lower(item?.title || fieldValue(dialog, /record/i));
  const type = lower(item?.type || '');
  if (/invoice|payment/.test(record + type)) return 'Invoice draft approval';
  if (/quote/.test(record + type)) return 'Quote / follow-up approval';
  if (/client|customer/.test(record + type)) return 'Client record approval';
  if (/worker|staff|assignment|dispatch/.test(record + type)) return 'Worker / dispatch approval';
  if (/job/.test(record + type)) return 'Job admin approval';
  return item?.type || 'Prepared approval';
}

function filledText(item, dialog) {
  const pairs = preparedPairs(item, dialog);
  const found = valueFromDetails(item, 'What Churvox found');
  const prepared = valueFromDetails(item, 'What Churvox prepared') || item?.raw?.filled || item?.raw?.summary;
  const lines = [];
  if (prepared) lines.push(`Prepared action: ${prepared}`);
  if (found) lines.push(`Found: ${found}`);
  if (pairs.length) {
    lines.push('');
    lines.push('Prepared record fields:');
    pairs.slice(0, 10).forEach(([label, value]) => lines.push(`- ${label}: ${value}`));
  }
  if (item?.missing) {
    lines.push('');
    lines.push(`Needs owner check: ${item.missing}`);
  }
  return lines.join('\n').trim() || 'Churvox pulled the available record details and prepared this for owner approval. Missing fields are shown above.';
}

function evidenceText(item) {
  const details = item?.details || {};
  const evidence = item?.raw?.evidence || item?.raw?.reason || item?.raw?.match?.reason || valueFromDetails(item, 'What Churvox found');
  const source = item?.raw?.source || 'live Churvox records';
  const confidence = item?.raw?.ai_confidence ? `${Math.round(Number(item.raw.ai_confidence) * 100)}% confidence` : 'owner review required';
  const entries = Object.keys(details).length ? `Details checked: ${Object.keys(details).slice(0, 8).join(', ')}` : '';
  return [
    `Source checked: ${source}.`,
    evidence ? `Evidence: ${evidence}.` : '',
    entries,
    `Confidence: ${confidence}.`,
  ].filter(Boolean).join('\n');
}

function ownerCheckText(item, dialog) {
  const approval = fieldValue(dialog, /recommended action/i) || item?.raw?.owner || 'Approve';
  const missing = item?.missing;
  const base = item?.raw?.check || valueFromDetails(item, 'Why it needs approval');
  const rules = [];
  if (base) rules.push(base);
  if (missing) rules.push(`Check/fix missing: ${missing}.`);
  rules.push(`${approval}: confirm the prepared fields are right. Save edit if you change anything. Park if this should not move forward.`);
  return rules.join('\n');
}

function renderPreparedSection(dialog, item) {
  let section = dialog.querySelector('.cvxRealPreparedSlip');
  const pairs = preparedPairs(item, dialog);
  const confidence = item?.raw?.ai_confidence ? `${Math.round(Number(item.raw.ai_confidence) * 100)}% checked` : 'Owner check';
  const missing = item?.missing;
  const htmlPairs = pairs.slice(0, 8).map(([label, value]) => `<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`).join('');
  const htmlBlock = `
    <div class="cvxRealPreparedSlipHead">
      <div><b>Prepared by Churvox</b><span>Real record context pulled into Command before the owner approves anything.</span></div>
      <em class="cvxRealPreparedConfidence">${escapeHtml(confidence)}</em>
    </div>
    <div class="cvxRealPreparedGrid">${htmlPairs || '<div><small>Record context</small><strong>Not enough linked details found. Owner must complete the missing fields before approval.</strong></div>'}</div>
    ${missing ? `<div class="cvxRealPreparedMissing"><b>Needs owner check:</b> ${escapeHtml(missing)}</div>` : ''}
  `;
  if (!section) {
    section = document.createElement('section');
    section.className = 'cvxRealPreparedSlip';
    const anchor = Array.from(dialog.querySelectorAll('h2,h1')).find((node) => /approval slip/i.test(node.textContent || ''))?.parentElement;
    (anchor || dialog).insertAdjacentElement(anchor ? 'afterend' : 'afterbegin', section);
  }
  section.innerHTML = htmlBlock;
}

function isGenericSlip(dialog) {
  return GENERIC_RE.test(dialog.textContent || '') || !dialog.querySelector('.cvxRealPreparedSlip');
}

async function hydrateOne(dialog) {
  if (!dialog || dialog.dataset.cvxRealSlipHydrated === 'working') return;
  if (!isGenericSlip(dialog)) return;
  dialog.dataset.cvxRealSlipHydrated = 'working';
  const items = await allCommandItems();
  const item = matchItem(dialog, items) || normalizeItem({
    title: fieldValue(dialog, /record/i) || 'Prepared approval',
    type: fieldValue(dialog, /approval type/i) || 'Prepared approval',
    client: fieldValue(dialog, /client/i),
    amount: fieldValue(dialog, /amount/i),
    missing: 'Confirm required record details before approval',
    summary: 'Churvox prepared the available information for owner approval.',
  });

  setField(dialog, /approval type/i, actionTypeFor(item, dialog));
  setField(dialog, /record/i, item.title);
  setField(dialog, /client/i, item.client || fieldValue(dialog, /client/i) || 'Client not linked');
  setField(dialog, /amount/i, item.amount > 0 ? `$${item.amount.toFixed(2)}` : 'Not money related');
  setField(dialog, /what churvox filled/i, filledText(item, dialog));
  setField(dialog, /evidence checked/i, evidenceText(item));
  setField(dialog, /owner check/i, ownerCheckText(item, dialog));
  renderPreparedSection(dialog, item);
  dialog.dataset.cvxRealSlipHydrated = 'done';
}

function hydrateVisibleSlips() {
  ensureStyle();
  findDialogCandidates().forEach((dialog) => hydrateOne(dialog));
}

if (typeof window !== 'undefined' && !window.__CHURVOX_COMMAND_REAL_SLIP_RUNTIME__) {
  window.__CHURVOX_COMMAND_REAL_SLIP_RUNTIME__ = true;
  hydrateVisibleSlips();
  window.addEventListener('load', () => setTimeout(hydrateVisibleSlips, 120));
  window.addEventListener('hashchange', () => setTimeout(hydrateVisibleSlips, 120));
  window.addEventListener('popstate', () => setTimeout(hydrateVisibleSlips, 120));
  document.addEventListener('click', () => setTimeout(hydrateVisibleSlips, 120), true);
  const observer = new MutationObserver(() => setTimeout(hydrateVisibleSlips, 80));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(hydrateVisibleSlips, 2500);
}

export {};