// CHURVOX_10_OUT_OF_10_RUNTIME_20260629
// Covers the 10 big frustrations: worker simplicity, photo proof, fair GPS, less chasing,
// less double-entry, schedule chaos, job costing, pricing clarity, support, and bloat.

import API_BASE from '../lib/apiBase';

const READINESS_PANEL_ID = 'churvox-ten-readiness-panel';
const WORKER_PANEL_ID = 'churvox-ten-worker-controls';
const HELP_PANEL_ID = 'churvox-ten-help-checklist';
const TIER_PANEL_ID = 'churvox-ten-tier-explain';
const PHOTO_LOG_KEY = 'churvox_worker_photo_log_v1';
const QUEUE_KEY = 'churvox_worker_backend_queue_v1';
let queued = false;
let lastLoad = 0;
let cachedReadiness = null;
let cachedChecklist = null;
let cachedTiers = null;

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function apiUrl(path) {
  return `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`;
}

function token() {
  try {
    return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || '';
  } catch (_) {
    return '';
  }
}

function headers() {
  const auth = token();
  return { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) };
}

async function request(method, path, payload) {
  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: headers(),
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || `HTTP ${response.status}`);
  if (body?.jobs || body?.items || body?.plans || body?.addons || body?.slip || body?.gps || body?.message_draft || body?.invoice || body?.quote) return body;
  return body?.data?.data || body?.data || body;
}

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '');
    return parsed ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

function renderHtml(node, html) {
  if (!node || node.innerHTML === html) return;
  node.innerHTML = html;
}

function isWorkerRoute() {
  return window.location.pathname.startsWith('/worker');
}

function isOwnerRoute() {
  return !isWorkerRoute() && Boolean(document.querySelector('.churvoxOptionC .workspace .cocPage'));
}

function pageName() {
  const hash = clean((window.location.hash || '').replace('#', '')).toLowerCase();
  if (hash) return hash;
  if (window.location.pathname.endsWith('/plans')) return 'plans';
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return clean(active?.textContent || 'today').toLowerCase();
}

function ownerMain() {
  return document.querySelector('.churvoxOptionC .workspace .cocPage');
}

function workerMain() {
  return document.querySelector('.wc-screen .wc-main, .wc-main, main');
}

function currentJobId() {
  const match = window.location.pathname.match(/\/worker\/jobs\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function stateLabel(state) {
  return String(state || '').replace(/_/g, ' ');
}

function stateScore(job) {
  const states = job?.states || [];
  if (states.includes('ready_to_invoice')) return 'Ready to invoice';
  if (states.includes('missing_proof')) return 'Missing proof';
  if (states.includes('worker_issue')) return 'Worker issue';
  if (states.includes('running_over_time')) return 'Running over';
  if (states.includes('margin_warning')) return 'Margin risk';
  if (states.includes('ready_for_quote')) return 'Quote ready';
  if (states.includes('watching')) return 'Watching';
  return stateLabel(states[0] || 'checking');
}

function topAction(job) {
  const states = job?.states || [];
  if (states.includes('ready_to_invoice')) return ['Prepare invoice', 'invoice'];
  if (states.includes('ready_for_quote') || states.includes('needs_price_decision')) return ['Prepare quote', 'quote'];
  if (states.includes('worker_issue') || states.includes('schedule_warning') || states.includes('running_over_time')) return ['Draft customer update', 'message'];
  return ['View job readiness', 'view'];
}

function readinessHtml(data) {
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  const counts = data?.counts || {};
  const risky = jobs.filter((job) => job.needs_owner_review).length;
  const ready = jobs.filter((job) => job.ready_to_invoice).length;
  const avg = jobs.length ? Math.round(jobs.reduce((sum, job) => sum + Number(job.confidence || 0), 0) / jobs.length) : 100;
  return `
    <div class="tenTop">
      <div>
        <span class="tenEyebrow">Command job readiness engine</span>
        <h2>Every job now says what is ready, risky, or missing.</h2>
        <p>Proof, schedule, time, price, margin, extras and customer requests are checked before Churvox drafts invoices, quotes or messages.</p>
      </div>
      <div class="tenScore">${avg}% confidence</div>
    </div>
    <div class="tenMetricGrid">
      <article><strong>${jobs.length}</strong><small>jobs checked</small></article>
      <article><strong>${ready}</strong><small>ready to invoice</small></article>
      <article><strong>${risky}</strong><small>need owner review</small></article>
      <article><strong>${Object.keys(counts).length}</strong><small>risk types found</small></article>
    </div>
    <div class="tenStateRow">
      ${Object.entries(counts).slice(0, 9).map(([key, value]) => `<span>${esc(stateLabel(key))}: <b>${esc(value)}</b></span>`).join('') || '<span>No major readiness problems found yet.</span>'}
    </div>
    <div class="tenJobList">
      ${jobs.slice(0, 8).map((job) => {
        const [label, action] = topAction(job);
        return `<article data-ten-job-id="${esc(job.job_id)}">
          <div><strong>${esc(job.title || 'Job')}</strong><small>${esc(job.client || 'No customer')} · ${esc(stateScore(job))} · ${esc(job.confidence || 0)}%</small></div>
          <p>${esc((job.states || []).map(stateLabel).join(' · ') || 'checking')}</p>
          <div class="tenActions">
            <button type="button" data-ten-job-action="${esc(action)}">${esc(label)}</button>
            <button type="button" data-ten-job-action="message">Draft update</button>
          </div>
        </article>`;
      }).join('') || '<p class="tenTiny">No jobs found yet. Add jobs and Churvox will check proof, schedule, price and admin readiness.</p>'}
    </div>`;
}

async function loadReadiness(force = false) {
  if (!token()) return cachedReadiness;
  if (!force && cachedReadiness && Date.now() - lastLoad < 15000) return cachedReadiness;
  lastLoad = Date.now();
  try {
    cachedReadiness = await request('GET', '/command/readiness');
  } catch (_) {}
  return cachedReadiness;
}

async function insertReadinessPanel() {
  if (!isOwnerRoute()) return;
  const page = pageName();
  if (!['today', 'smart hub', 'command', 'jobs', 'workers', 'team'].includes(page)) {
    document.getElementById(READINESS_PANEL_ID)?.remove();
    return;
  }
  const root = ownerMain();
  if (!root) return;
  let node = document.getElementById(READINESS_PANEL_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = READINESS_PANEL_ID;
    node.className = 'tenReadinessPanel';
    const first = root.querySelector('#churvox-real-review-owner-panel, .cocPanel, section');
    if (first) first.insertAdjacentElement('beforebegin', node);
    else root.prepend(node);
  }
  const data = await loadReadiness();
  renderHtml(node, readinessHtml(data || { jobs: [], counts: {} }));
}

function photoLog() {
  const list = readJson(PHOTO_LOG_KEY, []);
  return Array.isArray(list) ? list : [];
}

function savePhotoLog(list) {
  writeJson(PHOTO_LOG_KEY, list.slice(0, 20));
}

function queueItems() {
  const list = readJson(QUEUE_KEY, []);
  return Array.isArray(list) ? list : [];
}

function workerHtml() {
  const jid = currentJobId();
  const photos = photoLog().filter((item) => !jid || item.job_id === jid).slice(0, 6);
  const pending = queueItems().filter((item) => !jid || item.job_id === jid).length;
  return `
    <div class="tenTop compact">
      <div>
        <span class="tenEyebrow">Worker protection controls</span>
        <h2>Proof, GPS and time are clear.</h2>
        <p>GPS is only job proof while clocked in. Photos show local status. If the job is running long, send one clean Command slip.</p>
      </div>
      <div class="tenScore">${pending ? `${pending} waiting` : 'Clear'}</div>
    </div>
    <div class="tenWorkerControls">
      <button type="button" data-ten-gps="start">GPS on for this job</button>
      <button type="button" data-ten-gps="stop">GPS off</button>
      <button type="button" data-ten-more-time="30">Need 30 min</button>
      <button type="button" data-ten-more-time="60">Need 60 min</button>
    </div>
    <div class="tenPhotoLog">
      ${photos.map((photo) => `<article><img src="${esc(photo.data_url)}" alt="${esc(photo.kind || 'proof photo')}"><div><strong>${esc(photo.kind || 'proof')}</strong><small>${esc(photo.status || 'saved locally')} · ${esc(photo.at || '')}</small></div></article>`).join('') || '<p class="tenTiny">Photo thumbnails will show here after before/after proof is captured.</p>'}
    </div>
    <p class="tenTiny" data-ten-worker-status>Worker controls ready.</p>`;
}

function insertWorkerPanel() {
  if (!isWorkerRoute() || !/^\/worker\/jobs\//.test(window.location.pathname)) return;
  const root = workerMain();
  if (!root) return;
  let node = document.getElementById(WORKER_PANEL_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = WORKER_PANEL_ID;
    node.className = 'tenWorkerPanel';
    const anchor = document.querySelector('#churvox-worker-photo-safe-queue, #churvox-worker-note-to-slip, #churvox-proof-passport, .wc-finish');
    if (anchor) anchor.insertAdjacentElement('afterend', node);
    else root.appendChild(node);
  }
  renderHtml(node, workerHtml());
}

async function insertHelpPanel() {
  if (!isOwnerRoute()) return;
  const page = pageName();
  if (!['help', 'settings'].includes(page)) {
    document.getElementById(HELP_PANEL_ID)?.remove();
    return;
  }
  const root = ownerMain();
  if (!root) return;
  let node = document.getElementById(HELP_PANEL_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = HELP_PANEL_ID;
    node.className = 'tenHelpPanel';
    root.prepend(node);
  }
  if (!cachedChecklist && token()) {
    try { cachedChecklist = await request('GET', '/help/setup-checklist'); } catch (_) {}
  }
  const items = cachedChecklist?.items || [];
  renderHtml(node, `
    <div class="tenTop"><div><span class="tenEyebrow">Setup and support</span><h2>Less confusion, fewer support tickets.</h2><p>This is the checklist that stops owners and workers getting lost.</p></div><div class="tenScore">${items.length || 8} steps</div></div>
    <div class="tenChecklist">${items.map((item) => `<article><strong>${esc(item.label)}</strong><small>${esc(item.why)}</small></article>`).join('') || '<p class="tenTiny">Setup checklist will load after sign-in.</p>'}</div>`);
}

async function insertTierPanel() {
  if (!isOwnerRoute()) return;
  const page = pageName();
  if (page !== 'plans') {
    document.getElementById(TIER_PANEL_ID)?.remove();
    return;
  }
  const root = ownerMain();
  if (!root) return;
  let node = document.getElementById(TIER_PANEL_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = TIER_PANEL_ID;
    node.className = 'tenTierPanel';
    root.prepend(node);
  }
  if (!cachedTiers && token()) {
    try { cachedTiers = await request('GET', '/plans/tier-explain'); } catch (_) {}
  }
  const plans = cachedTiers?.plans || [];
  const addons = cachedTiers?.addons || [];
  renderHtml(node, `
    <div class="tenTop"><div><span class="tenEyebrow">Clear pricing guard</span><h2>No sneaky lockouts.</h2><p>Each tier explains why a feature is locked and what the upgrade actually gives.</p></div><div class="tenScore">Plain pricing</div></div>
    <div class="tenTierGrid">${plans.map((plan) => `<article><strong>${esc(plan.plan)} · ${esc(plan.price)}</strong><small>${esc(plan.best_for)} — ${esc(plan.why_locked)}</small></article>`).join('')}</div>
    <div class="tenStateRow">${addons.map((addon) => `<span>${esc(addon.name)}: <b>${esc(addon.price)}</b></span>`).join('')}</div>`);
}

async function doJobAction(jobId, action) {
  if (!jobId || !token()) return;
  const map = {
    invoice: `/jobs/${encodeURIComponent(jobId)}/prepare-invoice-draft`,
    quote: `/jobs/${encodeURIComponent(jobId)}/prepare-quote-draft`,
    message: `/jobs/${encodeURIComponent(jobId)}/prepare-message-draft`,
  };
  if (!map[action]) return;
  try {
    await request('POST', map[action], { source: 'owner_readiness_panel' });
    cachedReadiness = null;
    await loadReadiness(true);
    schedule();
  } catch (_) {}
}

async function workerMoreTime(minutes) {
  const jid = currentJobId();
  const status = document.querySelector('[data-ten-worker-status]');
  if (!jid || !token()) return;
  try {
    await request('POST', `/worker/jobs/${encodeURIComponent(jid)}/more-time`, { minutes, reason: 'Worker says the job needs more time.' });
    if (status) status.textContent = `Sent ${minutes} minute time request to Command.`;
  } catch (_) {
    if (status) status.textContent = 'Could not send yet. Try again when signal is back.';
  }
}

async function workerGps(state) {
  const jid = currentJobId();
  const status = document.querySelector('[data-ten-worker-status]');
  if (!token()) return;
  try {
    const body = await request('POST', '/worker/gps/status', { state, job_id: jid });
    if (status) status.textContent = body?.gps?.state === 'active_on_job' ? 'GPS is on for this job only.' : 'GPS is off.';
  } catch (_) {
    if (status) status.textContent = 'GPS status could not sync yet.';
  }
}

function saveThumbnail(input) {
  const jid = currentJobId();
  const file = input?.files?.[0];
  if (!jid || !file) return;
  const kind = input.getAttribute('data-rr-photo-kind') || 'proof';
  const reader = new FileReader();
  reader.onload = () => {
    const item = { id: `thumb-${Date.now()}`, job_id: jid, kind, name: file.name || `${kind}-photo`, data_url: String(reader.result || ''), status: 'saved locally / syncing', at: new Date().toLocaleString() };
    savePhotoLog([item, ...photoLog().filter((old) => old.name !== item.name)].slice(0, 20));
    insertWorkerPanel();
  };
  try { reader.readAsDataURL(file); } catch (_) {}
}

function handleClick(event) {
  const jobAction = event.target.closest('[data-ten-job-action]');
  if (jobAction) {
    event.preventDefault();
    const job = jobAction.closest('[data-ten-job-id]');
    doJobAction(job?.getAttribute('data-ten-job-id'), jobAction.getAttribute('data-ten-job-action'));
    return;
  }
  const moreTime = event.target.closest('[data-ten-more-time]');
  if (moreTime) {
    event.preventDefault();
    workerMoreTime(Number(moreTime.getAttribute('data-ten-more-time') || 30));
    return;
  }
  const gps = event.target.closest('[data-ten-gps]');
  if (gps) {
    event.preventDefault();
    workerGps(gps.getAttribute('data-ten-gps'));
  }
}

function handleChange(event) {
  const input = event.target.closest('[data-rr-photo-kind]');
  if (input) saveThumbnail(input);
}

function schedule() {
  if (queued) return;
  queued = true;
  window.setTimeout(async () => {
    queued = false;
    if (isWorkerRoute()) insertWorkerPanel();
    if (isOwnerRoute()) {
      await insertReadinessPanel();
      await insertHelpPanel();
      await insertTierPanel();
    }
  }, 180);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_10_OUT_OF_10_RUNTIME__) {
  window.__CHURVOX_10_OUT_OF_10_RUNTIME__ = true;
  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox:fresh-data-updated', schedule);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('change', handleChange, true);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
