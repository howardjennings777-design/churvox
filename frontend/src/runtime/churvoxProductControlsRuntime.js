// Churvox product controls runtime.
// Gives remaining owner controls real product behaviour without changing pricing or approval guardrails.

const STYLE_ID = 'churvox-product-controls-runtime-style';
const MODAL_ID = 'churvox-product-control-modal';

const css = `
  .cvxProductControlLayer {
    position: fixed;
    inset: 0;
    z-index: 1000000;
    display: grid;
    place-items: center;
    padding: 22px;
    background: rgba(13, 17, 15, .48);
    backdrop-filter: blur(8px);
  }

  .cvxProductControlModal {
    width: min(860px, calc(100vw - 44px));
    max-height: calc(100vh - 44px);
    overflow: auto;
    border: 1px solid rgba(255,255,255,.55);
    border-radius: 28px;
    background: linear-gradient(180deg, rgba(255,255,252,.98), rgba(248,244,237,.98));
    box-shadow: 0 34px 110px rgba(10, 14, 12, .38);
  }

  .cvxProductControlHead {
    position: sticky;
    top: 0;
    z-index: 2;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
    padding: 18px 20px;
    border-bottom: 1px solid rgba(17,21,19,.10);
    background: rgba(255,255,252,.94);
    backdrop-filter: blur(12px);
  }

  .cvxProductControlHead small {
    display: inline-flex;
    margin-bottom: 7px;
    border-radius: 999px;
    padding: 5px 8px;
    background: #111713;
    color: #fff;
    font-size: 10px;
    font-weight: 1000;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .cvxProductControlHead h2 {
    margin: 0;
    color: #111713;
    font-size: 28px;
    line-height: 1;
    font-weight: 1000;
    letter-spacing: -.06em;
  }

  .cvxProductControlHead p {
    margin: 7px 0 0;
    color: #5f6a64;
    font-size: 13px;
    line-height: 1.4;
    font-weight: 760;
  }

  .cvxProductControlClose {
    border: 0;
    border-radius: 999px;
    padding: 9px 12px;
    background: #111713;
    color: #fff;
    font-size: 12px;
    font-weight: 1000;
    cursor: pointer;
  }

  .cvxProductControlBody {
    display: grid;
    gap: 14px;
    padding: 18px 20px 20px;
  }

  .cvxProductControlGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .cvxProductControlCard {
    display: grid;
    gap: 7px;
    border: 1px solid rgba(17,21,19,.10);
    border-radius: 18px;
    padding: 14px;
    background: rgba(255,255,255,.78);
  }

  .cvxProductControlCard b {
    color: #111713;
    font-size: 15px;
    font-weight: 1000;
    letter-spacing: -.03em;
  }

  .cvxProductControlCard span,
  .cvxProductControlCard p,
  .cvxProductControlStatus {
    margin: 0;
    color: #5f6a64;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 760;
  }

  .cvxProductControlField {
    display: grid;
    gap: 6px;
  }

  .cvxProductControlField span {
    color: #6f7973;
    font-size: 10px;
    font-weight: 1000;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .cvxProductControlField input,
  .cvxProductControlField textarea,
  .cvxProductControlField select {
    width: 100%;
    min-height: 40px;
    border: 1px solid rgba(17,21,19,.12);
    border-radius: 13px;
    padding: 9px 10px;
    background: #fff;
    color: #111713;
    font: inherit;
    font-size: 13px;
    font-weight: 760;
  }

  .cvxProductControlField textarea {
    min-height: 92px;
    resize: vertical;
  }

  .cvxProductControlActions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid rgba(17,21,19,.10);
  }

  .cvxProductControlActions button,
  .cvxProductControlFileButton {
    min-height: 38px;
    border: 0;
    border-radius: 999px;
    padding: 9px 13px;
    background: linear-gradient(135deg, #f36b21, #ffad5b);
    color: #211006;
    font-size: 12px;
    font-weight: 1000;
    cursor: pointer;
  }

  .cvxProductControlActions button.dark {
    background: #111713;
    color: #fff;
  }

  .cvxProductControlActions button.quiet {
    border: 1px solid rgba(17,21,19,.12);
    background: #fff;
    color: #111713;
  }

  .cvxProductControlPreview {
    max-height: 260px;
    overflow: auto;
    border: 1px solid rgba(17,21,19,.10);
    border-radius: 16px;
    background: #fff;
  }

  .cvxProductControlPreview table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  .cvxProductControlPreview th,
  .cvxProductControlPreview td {
    border-bottom: 1px solid rgba(17,21,19,.08);
    padding: 8px 9px;
    text-align: left;
    vertical-align: top;
  }

  .cvxProductControlPreview th {
    position: sticky;
    top: 0;
    background: #f7f3ec;
    color: #111713;
    font-weight: 1000;
  }

  @media (max-width: 720px) {
    .cvxProductControlLayer { padding: 10px; place-items: end center; }
    .cvxProductControlModal { width: calc(100vw - 20px); max-height: calc(100vh - 20px); border-radius: 23px; }
    .cvxProductControlGrid { grid-template-columns: 1fr; }
  }
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

function closeModal() {
  document.getElementById(MODAL_ID)?.remove();
}

function showModal({ eyebrow = 'Churvox control', title, text, body, actions = '' }) {
  ensureStyle();
  closeModal();
  const layer = document.createElement('div');
  layer.id = MODAL_ID;
  layer.className = 'cvxProductControlLayer';
  layer.innerHTML = `
    <section class="cvxProductControlModal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <header class="cvxProductControlHead">
        <div><small>${escapeHtml(eyebrow)}</small><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text || '')}</p></div>
        <button type="button" class="cvxProductControlClose" data-cvx-close-control>Close</button>
      </header>
      <div class="cvxProductControlBody">${body || ''}${actions ? `<div class="cvxProductControlActions">${actions}</div>` : ''}</div>
    </section>
  `;
  document.body.appendChild(layer);
  layer.addEventListener('click', (event) => {
    if (event.target === layer || event.target.closest('[data-cvx-close-control]')) closeModal();
  });
  window.dispatchEvent(new Event('resize'));
  return layer;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function toast(message) {
  let node = document.getElementById('churvox-product-control-toast');
  if (!node) {
    node = document.createElement('div');
    node.id = 'churvox-product-control-toast';
    node.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:1000002;border-radius:999px;padding:11px 14px;background:#111713;color:#fff;box-shadow:0 18px 44px rgba(17,21,19,.22);font:900 13px Inter,system-ui,sans-serif;max-width:calc(100vw - 32px);text-align:center';
    document.body.appendChild(node);
  }
  node.textContent = message;
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.remove(), 2100);
}

function routeTo(hash) {
  window.history.replaceState({}, document.title, `/dashboard#${hash}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function visibleRowsCsv() {
  const rows = Array.from(document.querySelectorAll('.cvxProduct .cvxRow')).map((row) => {
    const title = row.querySelector('b')?.textContent?.trim() || '';
    const meta = row.querySelector('small')?.textContent?.trim() || '';
    const tag = row.querySelector('em')?.textContent?.trim() || '';
    return [title, meta, tag];
  }).filter((row) => row.some(Boolean));
  return [['Title', 'Details', 'Status/Amount'], ...rows];
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quote = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quote && next === '"') { cell += '"'; i += 1; continue; }
    if (char === '"') { quote = !quote; continue; }
    if (char === ',' && !quote) { row.push(cell.trim()); cell = ''; continue; }
    if ((char === '\n' || char === '\r') && !quote) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function openCsvImport(label) {
  const lower = label.toLowerCase();
  const type = lower.includes('client') ? 'clients' : lower.includes('worker') || lower.includes('team') ? 'team' : lower.includes('invoice') ? 'invoices' : lower.includes('quote') ? 'quotes' : 'records';
  const layer = showModal({
    eyebrow: 'CSV import',
    title: `Import ${type}`,
    text: 'Choose a CSV, preview it, then use the matching Churvox form to save clean records. Imports stay owner-controlled.',
    body: `
      <div class="cvxProductControlCard">
        <b>CSV file</b>
        <span>Supported columns: name/title, phone, email, address, service, price, notes. Churvox previews the file before anything is saved.</span>
        <input class="cvxProductControlFile" type="file" accept=".csv,text/csv" />
      </div>
      <div class="cvxProductControlStatus">No file selected yet.</div>
      <div class="cvxProductControlPreview" hidden></div>
    `,
    actions: `
      <button type="button" class="dark" data-cvx-download-template>Download template</button>
      <button type="button" data-cvx-open-form>Open ${type === 'clients' ? 'client' : type === 'team' ? 'worker' : 'record'} form</button>
      <button type="button" class="quiet" data-cvx-close-control>Done</button>
    `,
  });

  const fileInput = layer.querySelector('.cvxProductControlFile');
  const status = layer.querySelector('.cvxProductControlStatus');
  const preview = layer.querySelector('.cvxProductControlPreview');

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text).slice(0, 51);
    if (!rows.length) {
      status.textContent = 'No usable rows found.';
      preview.hidden = true;
      return;
    }
    const headers = rows[0];
    const bodyRows = rows.slice(1);
    status.textContent = `${Math.max(rows.length - 1, 0)} rows found. Previewing first ${bodyRows.length}.`;
    preview.hidden = false;
    preview.innerHTML = `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${bodyRows.map((r) => `<tr>${headers.map((_, i) => `<td>${escapeHtml(r[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  });

  layer.querySelector('[data-cvx-download-template]')?.addEventListener('click', () => {
    downloadCsv(`${type}-template.csv`, [['name', 'phone', 'email', 'address', 'service', 'price', 'notes'], ['Example customer', '021 000 000', 'hello@example.co.nz', '12 Example Street', 'Lawn mowing', '75', 'Gate code / access notes']]);
  });

  layer.querySelector('[data-cvx-open-form]')?.addEventListener('click', () => {
    closeModal();
    if (type === 'clients') routeTo('clients');
    else if (type === 'team') routeTo('team');
    else if (type === 'invoices') routeTo('invoices');
    else if (type === 'quotes') routeTo('quotes');
    else routeTo('jobs');
    toast('Open the new-record form from this page to save the clean record.');
  });
}

function openExport(label) {
  const rows = visibleRowsCsv();
  if (rows.length <= 1) {
    toast('No visible records to export on this page yet.');
    return;
  }
  const hash = (window.location.hash || '#today').replace('#', '') || 'today';
  downloadCsv(`churvox-${hash}-export.csv`, rows);
  toast('Export downloaded.');
}

function openSettingsSlip(label) {
  const saved = JSON.parse(localStorage.getItem('churvoxOwnerProductSettings') || '{}');
  const title = label || 'Business setting';
  const key = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const layer = showModal({
    eyebrow: 'Settings',
    title,
    text: 'Owner settings are kept simple. Save the working preference here; high-risk account changes still stay guarded.',
    body: `
      <div class="cvxProductControlGrid">
        <label class="cvxProductControlField"><span>Business label</span><input data-cvx-setting="businessLabel" value="${escapeHtml(saved.businessLabel || '')}" placeholder="Your trading name" /></label>
        <label class="cvxProductControlField"><span>GST rate</span><input data-cvx-setting="gstRate" value="${escapeHtml(saved.gstRate || '15%')}" /></label>
        <label class="cvxProductControlField"><span>Worker rule</span><select data-cvx-setting="workerRule"><option>Owner approves risky changes</option><option>Workers can complete jobs only</option><option>Manager can review first</option></select></label>
        <label class="cvxProductControlField"><span>Export format</span><select data-cvx-setting="exportFormat"><option>Xero CSV</option><option>MYOB CSV</option><option>Bookkeeper pack</option></select></label>
        <label class="cvxProductControlField" style="grid-column:1/-1"><span>Notes</span><textarea data-cvx-setting="${key}" placeholder="Add owner notes for this setting">${escapeHtml(saved[key] || '')}</textarea></label>
      </div>
    `,
    actions: `<button type="button" data-cvx-save-settings>Save setting</button><button type="button" class="dark" data-cvx-go-command>Open Command</button><button type="button" class="quiet" data-cvx-close-control>Close</button>`,
  });
  layer.querySelector('[data-cvx-save-settings]')?.addEventListener('click', () => {
    const next = { ...saved };
    layer.querySelectorAll('[data-cvx-setting]').forEach((input) => { next[input.getAttribute('data-cvx-setting')] = input.value; });
    localStorage.setItem('churvoxOwnerProductSettings', JSON.stringify(next));
    toast('Setting saved locally for this owner session.');
  });
  layer.querySelector('[data-cvx-go-command]')?.addEventListener('click', () => { closeModal(); routeTo('command'); });
}

function openSupportGuide(label) {
  const title = label || 'Support guide';
  const guides = {
    'setup help': ['Setup help', 'Add clients first, create jobs from client records, assign workers, then review risky sends or syncs in Command.'],
    'csv import': ['CSV import', 'Import clients or team lists from CSV, preview the file, then save clean records into Churvox.'],
    'worker app': ['Worker app', 'Workers should see assigned jobs, start/stop work, add proof/photos, and send notes back to the owner.'],
    'billing': ['Billing', 'Plans stay locked. Checkout and billing changes should use the Plans page and Stripe-managed flow.'],
    'xero guardrails': ['Xero guardrails', 'Draft sync only. No automatic invoice sending, no tax filing, no bank payout files, paid only after accounting refresh confirms paid.'],
    'approve in command': ['Approve in Command', 'Command is the owner approval desk. Approve, edit, or park slips there only.'],
  };
  const key = Object.keys(guides).find((item) => title.toLowerCase().includes(item));
  const guide = guides[key] || [title, 'This guide opens as a product slip so support does not feel like a dead button.'];
  showModal({
    eyebrow: 'Support',
    title: guide[0],
    text: guide[1],
    body: `<div class="cvxProductControlGrid"><div class="cvxProductControlCard"><b>What to do</b><span>${escapeHtml(guide[1])}</span></div><div class="cvxProductControlCard"><b>Need help?</b><span>Email hello@churvox.com with a screenshot and the page name.</span></div></div>`,
    actions: `<button type="button" onclick="window.location.href='mailto:hello@churvox.com'">Email support</button><button type="button" class="dark" data-cvx-go-command>Open Command</button><button type="button" class="quiet" data-cvx-close-control>Close</button>`,
  }).querySelector('[data-cvx-go-command]')?.addEventListener('click', () => { closeModal(); routeTo('command'); });
}

function openPlan(label) {
  const plan = (label.match(/Start|Crew|Operator|Command/i) || ['Plans'])[0];
  showModal({
    eyebrow: 'Plans',
    title: `${plan} plan`,
    text: 'Pricing stays locked. Checkout should happen through the proper billing flow, not a fake button.',
    body: `<div class="cvxProductControlGrid"><div class="cvxProductControlCard"><b>${escapeHtml(plan)}</b><span>Open the public plans/checkout route to manage this plan.</span></div><div class="cvxProductControlCard"><b>Owner control</b><span>Plan changes should be deliberate and Stripe-managed.</span></div></div>`,
    actions: `<button type="button" data-cvx-open-plans>Open checkout page</button><button type="button" class="dark" data-cvx-go-owner-plans>Owner Plans</button><button type="button" class="quiet" data-cvx-close-control>Close</button>`,
  });
  document.querySelector('[data-cvx-open-plans]')?.addEventListener('click', () => { window.location.href = `/plans?plan=${encodeURIComponent(plan.toLowerCase())}`; });
  document.querySelector('[data-cvx-go-owner-plans]')?.addEventListener('click', () => { closeModal(); routeTo('plans'); });
}

function enrichPlans() {
  document.querySelectorAll('.cvxProduct[data-product-version="v2"] .cvxPlans article').forEach((article) => {
    if (article.querySelector('[data-cvx-plan-action]')) return;
    const title = article.querySelector('b')?.textContent?.trim() || 'Plan';
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('data-cvx-plan-action', title);
    button.textContent = title === 'Operator' ? 'Choose Most Popular' : `Choose ${title}`;
    button.style.cssText = 'margin-top:8px;min-height:38px;border:0;border-radius:999px;padding:9px 12px;background:#111713;color:#fff;font-weight:1000;cursor:pointer';
    article.appendChild(button);
  });
}

function showAccountingGuardrail() {
  showModal({
    eyebrow: 'Accounting guardrail',
    title: 'Owner-approved draft sync only',
    text: 'Churvox can prepare drafts and exports, but risky accounting actions stay guarded.',
    body: `<div class="cvxProductControlGrid"><div class="cvxProductControlCard"><b>Allowed</b><span>Draft sync, export packs, owner review, payment refresh.</span></div><div class="cvxProductControlCard"><b>Blocked</b><span>No automatic invoice sending, no tax filing, no bank payout files.</span></div></div>`,
    actions: `<button type="button" data-cvx-go-command>Review in Command</button><button type="button" class="quiet" data-cvx-close-control>Close</button>`,
  }).querySelector('[data-cvx-go-command]')?.addEventListener('click', () => { closeModal(); routeTo('command'); });
}

function handleClick(event) {
  const target = event.target.closest('button, article');
  if (!target || !target.closest('.cvxProduct')) return;
  const label = (target.getAttribute('data-cvx-plan-action') || target.textContent || '').replace(/\s+/g, ' ').trim();
  const lower = label.toLowerCase();
  if (!label) return;

  if (lower.includes('csv import')) { event.preventDefault(); event.stopPropagation(); openCsvImport(label); return; }
  if (lower.includes('export clients') || lower === 'export' || lower.includes('export pack')) { event.preventDefault(); event.stopPropagation(); openExport(label); return; }
  if (lower.includes('business branding') || lower === 'gst' || lower.includes('security') || lower.includes('worker app rules') || lower.includes('csv exports') || lower.includes('delete account')) { event.preventDefault(); event.stopPropagation(); openSettingsSlip(label); return; }
  if (lower.includes('setup help') || lower.includes('guide') || lower.includes('worker app') || lower.includes('billing') || lower.includes('xero guardrails') || lower.includes('approve in command')) { event.preventDefault(); event.stopPropagation(); openSupportGuide(label); return; }
  if (lower.includes('choose start') || lower.includes('choose crew') || lower.includes('choose operator') || lower.includes('choose command')) { event.preventDefault(); event.stopPropagation(); openPlan(label); return; }
  if (lower.includes('guardrail') || lower.includes('draft sync only') || lower.includes('refresh status')) { event.preventDefault(); event.stopPropagation(); showAccountingGuardrail(); }
}

function runProductControls() {
  ensureStyle();
  enrichPlans();
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PRODUCT_CONTROLS_RUNTIME__) {
  window.__CHURVOX_PRODUCT_CONTROLS_RUNTIME__ = true;
  runProductControls();
  window.addEventListener('load', () => setTimeout(runProductControls, 100));
  window.addEventListener('hashchange', () => setTimeout(runProductControls, 100));
  window.addEventListener('popstate', () => setTimeout(runProductControls, 100));
  document.addEventListener('click', handleClick, true);
  setInterval(runProductControls, 2500);
}

export {};
