// CHURVOX_TOP_TIER_FEATURE_LAYER_20260704
// Safe additive feature layer: public proof, setup score, Command radar, money checks,
// job truth timeline, customer update slips, ready-to-invoice checks and worker offline capture.
// No React-owned DOM nodes are removed here.

(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__CHURVOX_TOP_TIER_FEATURE_LAYER__) return;
  window.__CHURVOX_TOP_TIER_FEATURE_LAYER__ = true;

  const MAIN_STORE = 'churvox_option_f_working_actions_v1';
  const OPS_STORE = 'churvox_option_f_operations_v1';
  const OFFLINE_STORE = 'churvox_worker_offline_queue_v1';
  const STYLE_ID = 'churvox-top-tier-feature-style';
  const PANEL_ID = 'churvox-top-tier-panel';
  const PUBLIC_ID = 'churvox-public-proof-flow';
  const WORKER_OFFLINE_ID = 'churvox-worker-offline-capture';
  const TOAST_ID = 'churvox-top-tier-toast';

  const defaults = { jobs: [], clients: [], quotes: [], invoices: [], messages: [], workers: [], command: [], audit: [] };
  const opsDefaults = { commandQueue: [], audit: [], invoices: [], messages: [], workerDays: [], teamPeople: [] };

  function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
  function lower(value) { return clean(value).toLowerCase(); }
  function money(value) {
    const n = Number(clean(value).replace(/[^0-9.-]/g, '') || 0);
    return Number.isFinite(n) ? n : 0;
  }
  function nzMoney(value) {
    const n = money(value);
    return n > 0 ? `$${n.toLocaleString('en-NZ', { maximumFractionDigits: 0 })}` : 'Amount missing';
  }
  function safeArray(value) { return Array.isArray(value) ? value : []; }
  function now() { return new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' }); }
  function id(prefix) { return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`; }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }
  function load(key, fallback) {
    try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || '{}') || {}) }; } catch { return { ...fallback }; }
  }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function main() { return load(MAIN_STORE, defaults); }
  function ops() { return load(OPS_STORE, opsDefaults); }
  function saveMain(value) { save(MAIN_STORE, value); }
  function saveOps(value) { save(OPS_STORE, value); }
  function titleOf(row, fallback = 'Job') { return clean(row?.title || row?.job_name || row?.job || row?.number || row?.subject || row?.name || fallback); }
  function clientOf(row) { return clean(row?.client || row?.client_name || row?.customer || row?.customer_name || row?.name || 'Customer not set'); }
  function statusOf(row) { return lower(row?.status || row?.job_status || row?.workflow_status || ''); }
  function isDone(row) { return /complete|done|finished|closed/.test(statusOf(row)); }
  function isPaid(row) { return /paid|succeeded|processed|complete/.test(lower(row?.payment_status || row?.last_payment_status || row?.status)); }
  function hasInvoiceForJob(job, invoices) {
    const title = lower(titleOf(job, ''));
    const client = lower(clientOf(job));
    return safeArray(invoices).some((invoice) => lower(`${invoice.job || invoice.title || ''} ${invoice.client || ''}`).includes(title) || (client && lower(invoice.client).includes(client)));
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${TOAST_ID}{position:fixed;right:18px;bottom:78px;z-index:999999;max-width:380px;padding:12px 14px;border-radius:16px;background:#111827;color:#fff;box-shadow:0 22px 52px rgba(15,23,42,.25);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}#${TOAST_ID}.show{opacity:1;transform:translateY(0)}#${TOAST_ID} small{display:block;margin-top:4px;color:rgba(255,255,255,.72)}
      #${PUBLIC_ID},#${PANEL_ID}{box-sizing:border-box;font-family:Inter,system-ui,sans-serif}
      #${PUBLIC_ID}{width:min(1180px,calc(100% - 32px));margin:0 auto 18px;border:1px solid rgba(15,23,42,.08);border-radius:30px;background:linear-gradient(135deg,#111827,#1f2937 58%,#f97316);box-shadow:0 24px 70px rgba(15,23,42,.14);padding:18px;color:#fff}
      #${PUBLIC_ID} .tt-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;margin-bottom:14px}#${PUBLIC_ID} small,#${PANEL_ID} small{display:inline-flex;border-radius:999px;padding:5px 9px;background:rgba(249,115,22,.16);color:#fed7aa;font-size:10px;font-weight:1000;letter-spacing:.10em;text-transform:uppercase}#${PUBLIC_ID} h2,#${PANEL_ID} h2{margin:6px 0 0;font-size:clamp(28px,4vw,48px);line-height:.94;letter-spacing:-.065em;font-weight:1000}#${PUBLIC_ID} p{margin:0;max-width:580px;color:rgba(255,255,255,.78);font-size:14px;font-weight:850;line-height:1.45}
      #${PUBLIC_ID} .tt-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}#${PUBLIC_ID} article,#${PANEL_ID} article{border:1px solid rgba(255,255,255,.12);border-radius:20px;background:rgba(255,255,255,.08);padding:13px}#${PUBLIC_ID} b,#${PANEL_ID} b{display:block;color:inherit;font-size:15px;font-weight:1000;line-height:1.05}#${PUBLIC_ID} span,#${PANEL_ID} span{display:block;margin-top:5px;color:rgba(255,255,255,.72);font-size:12px;font-weight:850;line-height:1.32}
      #${PANEL_ID}{margin:0 0 14px;border:1px solid rgba(249,115,22,.22);border-radius:28px;background:linear-gradient(135deg,#111827,#18212f 62%,#7c2d12);color:#fff;box-shadow:0 18px 48px rgba(15,23,42,.14);padding:15px}#${PANEL_ID} .tt-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}#${PANEL_ID} h2{font-size:clamp(26px,3vw,42px)}#${PANEL_ID} .tt-pill{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:7px 10px;background:rgba(255,255,255,.08);font-size:11px;font-weight:1000;color:#fff;white-space:nowrap}#${PANEL_ID} .tt-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}#${PANEL_ID} article{min-height:114px;background:rgba(255,255,255,.075)}#${PANEL_ID} .tt-action{display:inline-flex;margin-top:9px;border:0;border-radius:999px;background:#f97316;color:#111827;padding:9px 11px;font-size:11px;font-weight:1000;cursor:pointer}#${PANEL_ID} .tt-muted{color:rgba(255,255,255,.66)!important}#${PANEL_ID} .tt-score{height:8px;border-radius:999px;background:rgba(255,255,255,.14);overflow:hidden;margin-top:10px}#${PANEL_ID} .tt-score i{display:block;height:100%;background:#fb923c;border-radius:inherit}#${PANEL_ID} .tt-timeline{grid-column:span 2}#${PANEL_ID} .tt-timeline ol{margin:9px 0 0;padding:0;display:grid;gap:5px;list-style:none}#${PANEL_ID} .tt-timeline li{display:flex;justify-content:space-between;gap:10px;border-top:1px solid rgba(255,255,255,.10);padding-top:5px;font-size:11px;font-weight:900;color:rgba(255,255,255,.75)}
      #${WORKER_OFFLINE_ID}{position:sticky;top:8px;z-index:70;margin:8px;border:1px solid rgba(249,115,22,.25);border-radius:20px;background:#111827;color:#fff;padding:12px;font:900 13px/1.35 Inter,system-ui,sans-serif;box-shadow:0 14px 34px rgba(15,23,42,.16)}#${WORKER_OFFLINE_ID} b{display:block;margin-bottom:3px}#${WORKER_OFFLINE_ID} button{margin-top:8px;border:0;border-radius:999px;background:#f97316;color:#111827;padding:8px 11px;font-size:11px;font-weight:1000}
      @media(max-width:1080px){#${PANEL_ID} .tt-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#${PANEL_ID} .tt-timeline{grid-column:span 2}#${PUBLIC_ID} .tt-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:680px){#${PUBLIC_ID},#${PANEL_ID}{width:calc(100% - 18px);border-radius:22px;padding:12px}#${PUBLIC_ID} .tt-head,#${PANEL_ID} .tt-top{display:grid}#${PUBLIC_ID} .tt-grid,#${PANEL_ID} .tt-grid{grid-template-columns:1fr}#${PANEL_ID} .tt-timeline{grid-column:span 1}#${PUBLIC_ID} article:nth-child(n+5){display:none}}
    `;
    document.head.appendChild(style);
  }

  function toast(title, detail = '') {
    ensureStyle();
    let node = document.getElementById(TOAST_ID);
    if (!node) { node = document.createElement('div'); node.id = TOAST_ID; document.body.appendChild(node); }
    node.innerHTML = `<b>${esc(title)}</b>${detail ? `<small>${esc(detail)}</small>` : ''}`;
    node.classList.add('show');
    clearTimeout(node._timer);
    node._timer = setTimeout(() => node.classList.remove('show'), 2600);
  }

  function renderPublicProof() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (!['/', '/features', '/pricing'].includes(path)) { document.getElementById(PUBLIC_ID)?.remove(); return; }
    const hero = document.querySelector('.publicHero');
    if (!hero || document.getElementById(PUBLIC_ID)) return;
    ensureStyle();
    const panel = document.createElement('section');
    panel.id = PUBLIC_ID;
    panel.innerHTML = `
      <div class="tt-head">
        <div><small>Why it saves time</small><h2>Messy work becomes ready-to-approve admin.</h2></div>
        <p>Show the owner the whole move: worker finished, money checked, invoice prepared, customer update ready and Command waiting for approval.</p>
      </div>
      <div class="tt-grid">
        <article><b>Before</b><span>Jobs in texts, worker notes scattered, invoices delayed and the owner chasing details.</span></article>
        <article><b>Worker update</b><span>Start, finish, notes, photos, directions and on-site payment source stay tied to the job.</span></article>
        <article><b>Ready to invoice</b><span>Churvox checks client, price, time, notes, payment and invoice line before it moves.</span></article>
        <article><b>Command approval</b><span>The owner approves, edits or parks the prepared admin from one desk.</span></article>
      </div>
    `;
    hero.insertAdjacentElement('afterend', panel);
  }

  function setupScore(state) {
    const checks = [
      ['Business details', true],
      ['First client', safeArray(state.clients).length > 0],
      ['First job', safeArray(state.jobs).length > 0],
      ['Worker invited', safeArray(state.workers).length > 0],
      ['Pricing set', safeArray(state.jobs).some((job) => money(job.price || job.amount || job.total) > 0)],
      ['Invoice ready', safeArray(state.invoices).length > 0 || safeArray(state.jobs).some((job) => isDone(job) && money(job.price || job.amount) > 0)],
      ['Command reviewed', safeArray(state.command).some((item) => /approved|parked|edited|ready/i.test(item.status || item.owner || ''))],
      ['Customer update ready', safeArray(state.command).some((item) => /customer update/i.test(`${item.type} ${item.title}`))],
    ];
    const done = checks.filter(([, ok]) => ok).length;
    return { percent: Math.round((done / checks.length) * 100), checks, missing: checks.filter(([, ok]) => !ok).map(([label]) => label) };
  }

  function buildReadyToInvoice(state) {
    return safeArray(state.jobs).filter((job) => {
      if (!isDone(job)) return false;
      if (money(job.price || job.amount || job.total) <= 0) return false;
      if (!clientOf(job) || clientOf(job) === 'Customer not set') return false;
      return !hasInvoiceForJob(job, state.invoices);
    }).slice(0, 8);
  }

  function buildMoneyNotFinished(state) {
    const rows = [];
    safeArray(state.jobs).forEach((job) => {
      if (isDone(job) && !hasInvoiceForJob(job, state.invoices)) rows.push({ type: 'Done not invoiced', title: titleOf(job), detail: `${clientOf(job)} · ${nzMoney(job.price || job.amount || job.total)}` });
    });
    safeArray(state.invoices).forEach((invoice) => {
      if (!isPaid(invoice)) rows.push({ type: 'Invoice not paid', title: titleOf(invoice, 'Invoice'), detail: `${clientOf(invoice)} · ${nzMoney(invoice.amount || invoice.total)}` });
    });
    safeArray(state.jobs).forEach((job) => {
      if (isDone(job) && !/paid|processed|succeeded/i.test(`${job.payment_status || ''} ${job.last_payment_status || ''}`)) rows.push({ type: 'Payment unknown', title: titleOf(job), detail: clientOf(job) });
    });
    return rows.slice(0, 8);
  }

  function buildRadar(state) {
    const ready = buildReadyToInvoice(state);
    const moneyOpen = buildMoneyNotFinished(state);
    const command = safeArray(state.command).filter((item) => !/approved|done|complete/i.test(item.status || '')).slice(0, 4);
    const messages = safeArray(state.messages).slice(0, 2).map((message) => ({ type: 'Customer message', title: titleOf(message, 'Message'), detail: message.client || message.from || 'Needs reply' }));
    return [
      ...ready.map((job) => ({ type: 'Ready to invoice', title: titleOf(job), detail: `${clientOf(job)} · ${nzMoney(job.price || job.amount || job.total)}`, source: job })),
      ...moneyOpen,
      ...command.map((item) => ({ type: item.type || 'Command item', title: titleOf(item, 'Command item'), detail: item.missing || item.filled || item.status || 'Needs owner decision' })),
      ...messages,
    ].slice(0, 5);
  }

  function latestJob(state) {
    const jobs = safeArray(state.jobs);
    return jobs[0] || null;
  }

  function timelineForJob(job) {
    if (!job) return [
      ['Request', 'Waiting for first job'],
      ['Quote', 'Add quote or job price'],
      ['Worker', 'Assign worker'],
      ['Finish', 'Worker finish will appear here'],
      ['Invoice', 'Ready check will appear here'],
    ];
    return [
      ['Request', clientOf(job)],
      ['Job booked', clean(`${job.date || job.scheduled_date || 'date missing'} ${job.time || job.start || ''}`)],
      ['Worker', clean(job.worker || job.assigned_worker || job.assigned_worker_name || 'worker missing')],
      ['Finish', isDone(job) ? 'finished' : (statusOf(job) || 'not finished')],
      ['Payment', clean(job.last_payment_source_label || job.payment_source_label || job.payment_status || 'not recorded')],
      ['Invoice', money(job.price || job.amount || job.total) > 0 ? 'ready to check' : 'price missing'],
    ];
  }

  function addCommandItem(type, title, detail, source = {}) {
    const state = main();
    const opState = ops();
    const item = {
      id: id('top-command'),
      type,
      title,
      client: source.client || source.client_name || source.customer || source.name || clientOf(source),
      status: 'Waiting for owner',
      owner: 'Approve',
      detail,
      filled: detail,
      evidence: 'Prepared by Churvox from the job record.',
      check: 'Owner can approve, edit or park in Command.',
      sourceType: source.sourceType || 'top-tier-layer',
      sourceId: source.id || source._id || '',
      createdAt: now(),
    };
    state.command = [item, ...safeArray(state.command)].slice(0, 120);
    state.audit = [{ action: type, detail: title, at: now() }, ...safeArray(state.audit)].slice(0, 80);
    opState.commandQueue = [item, ...safeArray(opState.commandQueue)].slice(0, 120);
    opState.audit = [{ action: type, detail: title, at: now() }, ...safeArray(opState.audit)].slice(0, 80);
    saveMain(state);
    saveOps(opState);
    toast('Sent to Command', title);
    window.dispatchEvent(new Event('hashchange'));
    setTimeout(renderOwnerPanel, 120);
  }

  function createCustomerUpdate(job) {
    const title = job ? `Customer update: ${titleOf(job)}` : 'Customer update ready';
    const detail = job
      ? `Hi ${clientOf(job)}, the ${titleOf(job).toLowerCase()} has been completed. Notes and payment/invoice status are ready for owner review before sending.`
      : 'Customer update prepared from the latest job record.';
    addCommandItem('Customer update slip', title, detail, job || {});
  }

  function createInvoiceCheck(job) {
    const title = job ? `Invoice check: ${titleOf(job)}` : 'Invoice check ready';
    const detail = job
      ? `${clientOf(job)} · ${nzMoney(job.price || job.amount || job.total)} · check price, notes, payment and invoice line before sending.`
      : 'Invoice check prepared from current records.';
    addCommandItem('Ready to invoice', title, detail, job || {});
  }

  function ownerTarget() {
    return document.querySelector('.churvoxOptionC .workspace .cocPage') ||
      document.querySelector('.churvoxOptionC .workspace') ||
      document.querySelector('.churvoxOptionC') ||
      document.querySelector('.freshApp');
  }

  function renderOwnerPanel() {
    const isOwnerApp = Boolean(document.querySelector('.churvoxOptionC') || window.location.pathname === '/dashboard' || window.location.pathname === '/plans');
    if (!isOwnerApp) { document.getElementById(PANEL_ID)?.remove(); return; }
    const target = ownerTarget();
    if (!target) return;
    const state = main();
    const score = setupScore(state);
    const radar = buildRadar(state);
    const moneyRows = buildMoneyNotFinished(state);
    const ready = buildReadyToInvoice(state);
    const job = latestJob(state);
    const timeline = timelineForJob(job);
    ensureStyle();
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('section');
      panel.id = PANEL_ID;
      target.prepend(panel);
    }
    const radarHtml = radar.length ? radar.map((item) => `<li><b>${esc(item.type)}</b><span>${esc(item.title)} · ${esc(item.detail || '')}</span></li>`).join('') : '<li><b>Quiet</b><span>No urgent owner decisions yet.</span></li>';
    const moneyHtml = moneyRows.length ? moneyRows.slice(0, 3).map((item) => `<span>${esc(item.type)} · ${esc(item.title)}</span>`).join('') : '<span>Nothing stuck right now.</span>';
    const readyHtml = ready.length ? `${ready.length} job${ready.length === 1 ? '' : 's'} ready` : 'No finished priced job waiting';
    panel.innerHTML = `
      <div class="tt-top">
        <div><small>Top Churvox layer</small><h2>Ready, missing, money and approval in one view.</h2></div>
        <div class="tt-pill">Setup ${score.percent}%</div>
      </div>
      <div class="tt-grid">
        <article><b>Setup Score</b><span>${esc(score.missing.slice(0, 3).join(', ') || 'Core setup looks ready.')}</span><div class="tt-score"><i style="width:${score.percent}%"></i></div></article>
        <article><b>Command Radar</b><span>${esc(radar[0] ? `${radar[0].type}: ${radar[0].title}` : 'No decision pressure yet.')}</span><button class="tt-action" data-tt-action="open-command">Open Command</button></article>
        <article><b>Money Not Finished</b>${moneyHtml}<button class="tt-action" data-tt-action="open-money">View money</button></article>
        <article><b>Ready to Invoice</b><span>${esc(readyHtml)}</span><button class="tt-action" data-tt-action="invoice-check">Prepare check</button></article>
        <article><b>Customer Update</b><span>Prepare a customer message from the latest job before sending.</span><button class="tt-action" data-tt-action="customer-update">Prepare update</button></article>
        <article class="tt-timeline"><b>Job Truth Timeline</b><span>${esc(job ? titleOf(job) : 'Add a job to start the timeline.')}</span><ol>${timeline.map(([label, value]) => `<li><em>${esc(label)}</em><strong>${esc(value || 'missing')}</strong></li>`).join('')}</ol></article>
        <article><b>Worker No-Thinking Mode</b><span>Workers only need Today, Jobs, Messages and Me. Assigned work only.</span></article>
        <article><b>Offline Worker Capture</b><span>Worker notes/actions are queued locally when connection drops.</span></article>
      </div>
      <template data-tt-radar>${radarHtml}</template>
    `;
  }

  function handleOwnerClick(event) {
    const button = event.target?.closest?.('[data-tt-action]');
    if (!button) return;
    const action = button.getAttribute('data-tt-action');
    const state = main();
    const job = latestJob(state);
    if (action === 'open-command') { window.location.hash = '#command'; return; }
    if (action === 'open-money') { window.location.hash = '#invoices'; return; }
    if (action === 'customer-update') { createCustomerUpdate(job); return; }
    if (action === 'invoice-check') { createInvoiceCheck(buildReadyToInvoice(state)[0] || job); }
  }

  function readOfflineQueue() {
    try { return JSON.parse(localStorage.getItem(OFFLINE_STORE) || '[]') || []; } catch { return []; }
  }
  function writeOfflineQueue(queue) { try { localStorage.setItem(OFFLINE_STORE, JSON.stringify(queue.slice(-80))); } catch {} }
  function queueOfflineAction(label) {
    const queue = readOfflineQueue();
    queue.push({ id: id('offline'), label, path: window.location.pathname, at: now() });
    writeOfflineQueue(queue);
    renderWorkerOffline();
    toast('Saved offline', `${label} queued on this device.`);
  }
  function renderWorkerOffline() {
    const isWorker = window.location.pathname.startsWith('/worker');
    if (!isWorker) { document.getElementById(WORKER_OFFLINE_ID)?.remove(); return; }
    ensureStyle();
    const queue = readOfflineQueue();
    const offline = navigator.onLine === false;
    let panel = document.getElementById(WORKER_OFFLINE_ID);
    if (!offline && !queue.length) { panel?.remove(); return; }
    const target = document.querySelector('.simpleWorkerApp') || document.body;
    if (!panel) { panel = document.createElement('section'); panel.id = WORKER_OFFLINE_ID; target.prepend(panel); }
    panel.innerHTML = `<b>${offline ? 'Offline worker capture' : 'Offline queue saved'}</b><span>${queue.length} action${queue.length === 1 ? '' : 's'} waiting on this device. Churvox keeps the worker simple and sends updates when connection is back.</span>${queue.length ? '<button type="button" data-tt-action="clear-offline">Clear queue after checking</button>' : ''}`;
  }
  function handleWorkerClick(event) {
    if (!window.location.pathname.startsWith('/worker')) return;
    const clear = event.target?.closest?.('[data-tt-action="clear-offline"]');
    if (clear) { writeOfflineQueue([]); renderWorkerOffline(); return; }
    if (navigator.onLine !== false) return;
    const button = event.target?.closest?.('button, a');
    if (!button) return;
    const label = lower(button.textContent);
    if (/start|finish|send|message|payment|take/.test(label)) queueOfflineAction(clean(button.textContent || 'Worker action'));
  }

  function renderAll() {
    try { renderPublicProof(); } catch (err) { console.warn('Churvox public proof skipped', err); }
    try { renderOwnerPanel(); } catch (err) { console.warn('Churvox top tier panel skipped', err); }
    try { renderWorkerOffline(); } catch (err) { console.warn('Churvox worker offline skipped', err); }
  }

  window.addEventListener('load', () => setTimeout(renderAll, 700));
  window.addEventListener('hashchange', () => setTimeout(renderAll, 250));
  window.addEventListener('popstate', () => setTimeout(renderAll, 250));
  window.addEventListener('online', renderWorkerOffline);
  window.addEventListener('offline', renderWorkerOffline);
  document.addEventListener('click', handleOwnerClick, true);
  document.addEventListener('click', handleWorkerClick, true);
  const observer = new MutationObserver(() => {
    clearTimeout(window.__CHURVOX_TOP_TIER_RENDER_TIMER__);
    window.__CHURVOX_TOP_TIER_RENDER_TIMER__ = setTimeout(renderAll, 250);
  });
  window.addEventListener('DOMContentLoaded', () => {
    ensureStyle();
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    renderAll();
  });
})();

export {};
