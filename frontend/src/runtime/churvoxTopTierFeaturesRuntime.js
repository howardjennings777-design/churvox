// CHURVOX_TOP_TIER_FEATURE_LAYER_20260704_SAFE
// Adds the 9 top-tier Churvox improvements as a defensive UI layer.
// It does not remove React-owned nodes and only redraws when content changes.

(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__CHURVOX_TOP_TIER_FEATURE_LAYER_SAFE__) return;
  window.__CHURVOX_TOP_TIER_FEATURE_LAYER_SAFE__ = true;

  const MAIN_STORE = 'churvox_option_f_working_actions_v1';
  const OPS_STORE = 'churvox_option_f_operations_v1';
  const OFFLINE_STORE = 'churvox_worker_offline_queue_v1';
  const STYLE_ID = 'churvox-top-tier-style';
  const PUBLIC_ID = 'churvox-public-proof-flow';
  const PANEL_ID = 'churvox-top-tier-panel';
  const OFFLINE_ID = 'churvox-worker-offline-capture';
  const TOAST_ID = 'churvox-top-tier-toast';

  const empty = { jobs: [], clients: [], quotes: [], invoices: [], messages: [], workers: [], command: [], audit: [] };
  const opsEmpty = { commandQueue: [], audit: [] };

  const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const lower = (value) => clean(value).toLowerCase();
  const list = (value) => Array.isArray(value) ? value : [];
  const cash = (value) => {
    const n = Number(clean(value).replace(/[^0-9.-]/g, '') || 0);
    return Number.isFinite(n) ? n : 0;
  };
  const dollars = (value) => cash(value) > 0 ? `$${cash(value).toLocaleString('en-NZ', { maximumFractionDigits: 0 })}` : 'amount missing';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const now = () => new Date().toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' });
  const uid = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  function load(key, fallback) {
    try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || '{}') || {}) }; } catch { return { ...fallback }; }
  }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function state() { return load(MAIN_STORE, empty); }
  function ops() { return load(OPS_STORE, opsEmpty); }
  function title(row, fallback = 'Job') { return clean(row?.title || row?.job_name || row?.job || row?.number || row?.subject || row?.name || fallback); }
  function client(row) { return clean(row?.client || row?.client_name || row?.customer || row?.customer_name || row?.name || 'Customer not set'); }
  function status(row) { return lower(row?.status || row?.job_status || row?.workflow_status || row?.payment_status || row?.last_payment_status || ''); }
  function done(row) { return /complete|done|finished|closed/.test(status(row)); }
  function paid(row) { return /paid|succeeded|processed|complete/.test(status(row)); }
  function invoiced(job, invoices) {
    const t = lower(title(job, ''));
    const c = lower(client(job));
    return list(invoices).some((invoice) => lower(`${invoice.job || invoice.title || ''} ${invoice.client || ''}`).includes(t) || (c && lower(invoice.client).includes(c)));
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${TOAST_ID}{position:fixed;right:16px;bottom:76px;z-index:999999;max-width:360px;padding:12px 14px;border-radius:16px;background:#111827;color:#fff;box-shadow:0 20px 50px rgba(15,23,42,.25);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}#${TOAST_ID}.show{opacity:1;transform:translateY(0)}#${TOAST_ID} small{display:block;margin-top:4px;color:rgba(255,255,255,.72)}
      #${PUBLIC_ID},#${PANEL_ID},#${OFFLINE_ID}{box-sizing:border-box;font-family:Inter,system-ui,sans-serif}
      #${PUBLIC_ID}{width:min(1180px,calc(100% - 32px));margin:0 auto 18px;border:1px solid rgba(15,23,42,.08);border-radius:30px;background:linear-gradient(135deg,#111827,#1f2937 58%,#f97316);box-shadow:0 24px 70px rgba(15,23,42,.14);padding:18px;color:#fff}
      #${PUBLIC_ID} .tt-head,#${PANEL_ID} .tt-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;margin-bottom:14px}#${PUBLIC_ID} small,#${PANEL_ID} small{display:inline-flex;border-radius:999px;padding:5px 9px;background:rgba(249,115,22,.16);color:#fed7aa;font-size:10px;font-weight:1000;letter-spacing:.10em;text-transform:uppercase}#${PUBLIC_ID} h2,#${PANEL_ID} h2{margin:6px 0 0;font-size:clamp(27px,4vw,46px);line-height:.94;letter-spacing:-.06em;font-weight:1000}#${PUBLIC_ID} p{margin:0;max-width:590px;color:rgba(255,255,255,.78);font-size:14px;font-weight:850;line-height:1.45}
      #${PUBLIC_ID} .tt-grid,#${PANEL_ID} .tt-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}#${PUBLIC_ID} article,#${PANEL_ID} article{border:1px solid rgba(255,255,255,.13);border-radius:20px;background:rgba(255,255,255,.08);padding:13px}#${PUBLIC_ID} b,#${PANEL_ID} b{display:block;color:inherit;font-size:15px;font-weight:1000;line-height:1.05}#${PUBLIC_ID} span,#${PANEL_ID} span{display:block;margin-top:5px;color:rgba(255,255,255,.72);font-size:12px;font-weight:850;line-height:1.32}
      #${PANEL_ID}{margin:0 0 14px;border:1px solid rgba(249,115,22,.22);border-radius:28px;background:linear-gradient(135deg,#111827,#18212f 62%,#7c2d12);color:#fff;box-shadow:0 18px 48px rgba(15,23,42,.14);padding:15px}#${PANEL_ID} .tt-grid{grid-template-columns:repeat(5,minmax(0,1fr))}#${PANEL_ID} .tt-pill{border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:7px 10px;background:rgba(255,255,255,.08);font-size:11px;font-weight:1000;color:#fff;white-space:nowrap}#${PANEL_ID} .tt-score{height:8px;border-radius:999px;background:rgba(255,255,255,.14);overflow:hidden;margin-top:10px}#${PANEL_ID} .tt-score i{display:block;height:100%;border-radius:inherit;background:#fb923c}#${PANEL_ID} button{display:inline-flex;margin-top:9px;border:0;border-radius:999px;background:#f97316;color:#111827;padding:9px 11px;font-size:11px;font-weight:1000;cursor:pointer}#${PANEL_ID} .wide{grid-column:span 2}#${PANEL_ID} ol{display:grid;gap:5px;margin:9px 0 0;padding:0;list-style:none}#${PANEL_ID} li{display:flex;justify-content:space-between;gap:10px;border-top:1px solid rgba(255,255,255,.1);padding-top:5px;font-size:11px;font-weight:900;color:rgba(255,255,255,.75)}
      #${OFFLINE_ID}{position:sticky;top:8px;z-index:70;margin:8px;border:1px solid rgba(249,115,22,.25);border-radius:20px;background:#111827;color:#fff;padding:12px;font:900 13px/1.35 Inter,system-ui,sans-serif;box-shadow:0 14px 34px rgba(15,23,42,.16)}#${OFFLINE_ID} b{display:block;margin-bottom:3px}#${OFFLINE_ID} button{margin-top:8px;border:0;border-radius:999px;background:#f97316;color:#111827;padding:8px 11px;font-size:11px;font-weight:1000}
      @media(max-width:1080px){#${PANEL_ID} .tt-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#${PANEL_ID} .wide{grid-column:span 2}#${PUBLIC_ID} .tt-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:680px){#${PUBLIC_ID},#${PANEL_ID}{width:calc(100% - 18px);border-radius:22px;padding:12px}#${PUBLIC_ID} .tt-head,#${PANEL_ID} .tt-head{display:grid}#${PUBLIC_ID} .tt-grid,#${PANEL_ID} .tt-grid{grid-template-columns:1fr}#${PANEL_ID} .wide{grid-column:span 1}}
    `;
    document.head.appendChild(style);
  }

  function toast(message, detail = '') {
    ensureStyle();
    let node = document.getElementById(TOAST_ID);
    if (!node) { node = document.createElement('div'); node.id = TOAST_ID; document.body.appendChild(node); }
    node.innerHTML = `<b>${escapeHtml(message)}</b>${detail ? `<small>${escapeHtml(detail)}</small>` : ''}`;
    node.classList.add('show');
    clearTimeout(node._timer);
    node._timer = setTimeout(() => node.classList.remove('show'), 2400);
  }

  function renderPublic() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (!['/', '/features', '/pricing'].includes(path)) { document.getElementById(PUBLIC_ID)?.remove(); return; }
    const hero = document.querySelector('.publicHero');
    if (!hero) return;
    ensureStyle();
    let panel = document.getElementById(PUBLIC_ID);
    if (!panel) { panel = document.createElement('section'); panel.id = PUBLIC_ID; hero.insertAdjacentElement('afterend', panel); }
    const html = `<div class="tt-head"><div><small>Why it saves time</small><h2>Messy work becomes ready-to-approve admin.</h2></div><p>Worker finished, money checked, invoice prepared, customer update ready and Command waiting for owner approval.</p></div><div class="tt-grid"><article><b>Before</b><span>Jobs in texts, notes scattered, invoices delayed and the owner chasing details.</span></article><article><b>Worker update</b><span>Start, finish, notes, photos, directions and payment source stay tied to the job.</span></article><article><b>Ready to invoice</b><span>Churvox checks client, price, time, notes, payment and invoice line.</span></article><article><b>Command approval</b><span>The owner approves, edits or parks from one desk.</span></article></div>`;
    if (panel.dataset.sig !== html) { panel.dataset.sig = html; panel.innerHTML = html; }
  }

  function setupScore(s) {
    const checks = [
      ['Business', true], ['Client', list(s.clients).length > 0], ['Job', list(s.jobs).length > 0], ['Worker', list(s.workers).length > 0],
      ['Price', list(s.jobs).some((j) => cash(j.price || j.amount || j.total) > 0)], ['Invoice', list(s.invoices).length > 0 || list(s.jobs).some((j) => done(j) && cash(j.price || j.amount) > 0)],
      ['Command', list(s.command).length > 0], ['Customer update', list(s.command).some((i) => /customer update/i.test(`${i.type} ${i.title}`))],
    ];
    const complete = checks.filter(([, ok]) => ok).length;
    return { percent: Math.round((complete / checks.length) * 100), missing: checks.filter(([, ok]) => !ok).map(([label]) => label) };
  }
  function readyJobs(s) {
    return list(s.jobs).filter((job) => done(job) && cash(job.price || job.amount || job.total) > 0 && client(job) !== 'Customer not set' && !invoiced(job, s.invoices)).slice(0, 6);
  }
  function moneyOpen(s) {
    const rows = [];
    list(s.jobs).forEach((job) => { if (done(job) && !invoiced(job, s.invoices)) rows.push({ type: 'Done not invoiced', title: title(job), detail: `${client(job)} · ${dollars(job.price || job.amount || job.total)}` }); });
    list(s.invoices).forEach((invoice) => { if (!paid(invoice)) rows.push({ type: 'Invoice not paid', title: title(invoice, 'Invoice'), detail: `${client(invoice)} · ${dollars(invoice.amount || invoice.total)}` }); });
    list(s.jobs).forEach((job) => { if (done(job) && !/paid|processed|succeeded/i.test(`${job.payment_status || ''} ${job.last_payment_status || ''}`)) rows.push({ type: 'Payment unknown', title: title(job), detail: client(job) }); });
    return rows.slice(0, 6);
  }
  function radar(s) {
    return [
      ...readyJobs(s).map((job) => ({ type: 'Ready to invoice', title: title(job), detail: `${client(job)} · ${dollars(job.price || job.amount || job.total)}` })),
      ...moneyOpen(s),
      ...list(s.command).filter((i) => !/approved|complete|done/i.test(i.status || '')).map((i) => ({ type: i.type || 'Command item', title: title(i, 'Command item'), detail: i.missing || i.filled || i.status || 'Needs owner decision' })),
      ...list(s.messages).map((m) => ({ type: 'Customer message', title: title(m, 'Message'), detail: m.client || m.from || 'Needs reply' })),
    ].slice(0, 5);
  }
  function latestJob(s) { return list(s.jobs)[0] || null; }
  function timeline(job) {
    if (!job) return [['Request', 'waiting'], ['Quote', 'price needed'], ['Worker', 'assign worker'], ['Finish', 'worker app'], ['Invoice', 'ready check']];
    return [['Request', client(job)], ['Job booked', clean(`${job.date || job.scheduled_date || 'date missing'} ${job.time || job.start || ''}`)], ['Worker', clean(job.worker || job.assigned_worker || job.assigned_worker_name || 'worker missing')], ['Finish', done(job) ? 'finished' : (status(job) || 'not finished')], ['Payment', clean(job.last_payment_source_label || job.payment_source_label || job.payment_status || 'not recorded')], ['Invoice', cash(job.price || job.amount || job.total) > 0 ? 'ready to check' : 'price missing']];
  }
  function addCommand(type, label, detail, source = {}) {
    const s = state(); const o = ops();
    const item = { id: uid('command'), type, title: label, client: client(source), status: 'Waiting for owner', owner: 'Approve', filled: detail, detail, evidence: 'Prepared by Churvox from the job record.', check: 'Approve, edit or park in Command.', createdAt: now() };
    s.command = [item, ...list(s.command)].slice(0, 120); s.audit = [{ action: type, detail: label, at: now() }, ...list(s.audit)].slice(0, 80);
    o.commandQueue = [item, ...list(o.commandQueue)].slice(0, 120); o.audit = [{ action: type, detail: label, at: now() }, ...list(o.audit)].slice(0, 80);
    save(MAIN_STORE, s); save(OPS_STORE, o); toast('Sent to Command', label); window.dispatchEvent(new Event('hashchange')); setTimeout(renderOwner, 120);
  }

  function ownerTarget() {
    return document.querySelector('.churvoxOptionC .workspace .cocPage') || document.querySelector('.churvoxOptionC .workspace') || document.querySelector('.churvoxOptionC') || document.querySelector('.freshApp');
  }
  function renderOwner() {
    const active = window.location.pathname === '/dashboard' || window.location.pathname === '/plans' || Boolean(document.querySelector('.churvoxOptionC'));
    if (!active) { document.getElementById(PANEL_ID)?.remove(); return; }
    const target = ownerTarget(); if (!target) return;
    ensureStyle();
    const s = state(); const score = setupScore(s); const r = radar(s); const moneyRows = moneyOpen(s); const ready = readyJobs(s); const job = latestJob(s); const line = timeline(job);
    let panel = document.getElementById(PANEL_ID); if (!panel) { panel = document.createElement('section'); panel.id = PANEL_ID; target.prepend(panel); }
    const html = `<div class="tt-head"><div><small>Top Churvox layer</small><h2>Ready, missing, money and approval in one view.</h2></div><div class="tt-pill">Setup ${score.percent}%</div></div><div class="tt-grid"><article><b>Setup Score</b><span>${escapeHtml(score.missing.slice(0, 3).join(', ') || 'Core setup looks ready.')}</span><div class="tt-score"><i style="width:${score.percent}%"></i></div></article><article><b>Command Radar</b><span>${escapeHtml(r[0] ? `${r[0].type}: ${r[0].title}` : 'No urgent owner decisions yet.')}</span><button data-tt="command">Open Command</button></article><article><b>Money Not Finished</b><span>${escapeHtml(moneyRows[0] ? `${moneyRows[0].type}: ${moneyRows[0].title}` : 'Nothing stuck right now.')}</span><button data-tt="money">View money</button></article><article><b>Ready to Invoice</b><span>${ready.length ? `${ready.length} job${ready.length === 1 ? '' : 's'} ready` : 'No finished priced job waiting'}</span><button data-tt="invoice">Prepare check</button></article><article><b>Customer Update</b><span>Prepare a message from the latest job before sending.</span><button data-tt="customer">Prepare update</button></article><article class="wide"><b>Job Truth Timeline</b><span>${escapeHtml(job ? title(job) : 'Add a job to start the timeline.')}</span><ol>${line.map(([a, b]) => `<li><em>${escapeHtml(a)}</em><strong>${escapeHtml(b || 'missing')}</strong></li>`).join('')}</ol></article><article><b>Worker No-Thinking Mode</b><span>Today, Jobs, Messages and Me. Assigned work only.</span></article><article><b>Offline Worker Capture</b><span>Worker actions are queued locally when the connection drops.</span></article></div>`;
    if (panel.dataset.sig !== html) { panel.dataset.sig = html; panel.innerHTML = html; }
  }

  function renderOffline() {
    if (!window.location.pathname.startsWith('/worker')) { document.getElementById(OFFLINE_ID)?.remove(); return; }
    ensureStyle();
    let queue = []; try { queue = JSON.parse(localStorage.getItem(OFFLINE_STORE) || '[]') || []; } catch {}
    const offline = navigator.onLine === false;
    let panel = document.getElementById(OFFLINE_ID);
    if (!offline && !queue.length) { panel?.remove(); return; }
    const target = document.querySelector('.simpleWorkerApp') || document.body;
    if (!panel) { panel = document.createElement('section'); panel.id = OFFLINE_ID; target.prepend(panel); }
    const html = `<b>${offline ? 'Offline worker capture' : 'Offline queue saved'}</b><span>${queue.length} action${queue.length === 1 ? '' : 's'} waiting on this device. Churvox keeps worker updates simple and safe.</span>${queue.length ? '<button data-tt="clear-offline">Clear queue after checking</button>' : ''}`;
    if (panel.dataset.sig !== html) { panel.dataset.sig = html; panel.innerHTML = html; }
  }

  function handleClick(event) {
    const action = event.target?.closest?.('[data-tt]')?.getAttribute('data-tt');
    if (action === 'command') { window.location.hash = '#command'; return; }
    if (action === 'money') { window.location.hash = '#invoices'; return; }
    if (action === 'invoice') { const s = state(); const job = readyJobs(s)[0] || latestJob(s); addCommand('Ready to invoice', job ? `Invoice check: ${title(job)}` : 'Invoice check ready', job ? `${client(job)} · ${dollars(job.price || job.amount || job.total)} · check price, notes, payment and invoice line.` : 'Invoice check prepared from current records.', job || {}); return; }
    if (action === 'customer') { const job = latestJob(state()); addCommand('Customer update slip', job ? `Customer update: ${title(job)}` : 'Customer update ready', job ? `Hi ${client(job)}, the ${title(job).toLowerCase()} has been completed. Notes and payment/invoice status are ready for owner review before sending.` : 'Customer update prepared from latest job record.', job || {}); return; }
    if (action === 'clear-offline') { save(OFFLINE_STORE, []); renderOffline(); return; }
    if (window.location.pathname.startsWith('/worker') && navigator.onLine === false) {
      const btn = event.target?.closest?.('button,a'); const label = lower(btn?.textContent || '');
      if (/start|finish|send|message|payment|take/.test(label)) { const q = JSON.parse(localStorage.getItem(OFFLINE_STORE) || '[]'); q.push({ id: uid('offline'), label: clean(btn.textContent), path: window.location.pathname, at: now() }); save(OFFLINE_STORE, q.slice(-80)); renderOffline(); toast('Saved offline', `${clean(btn.textContent)} queued on this device.`); }
    }
  }

  function renderAll() { try { renderPublic(); } catch {} try { renderOwner(); } catch {} try { renderOffline(); } catch {} }
  document.addEventListener('click', handleClick, true);
  window.addEventListener('load', () => setTimeout(renderAll, 700));
  window.addEventListener('hashchange', () => setTimeout(renderAll, 250));
  window.addEventListener('popstate', () => setTimeout(renderAll, 250));
  window.addEventListener('online', renderOffline);
  window.addEventListener('offline', renderOffline);
  window.addEventListener('DOMContentLoaded', renderAll);
  window.setInterval(renderAll, 4000);
})();

export {};
