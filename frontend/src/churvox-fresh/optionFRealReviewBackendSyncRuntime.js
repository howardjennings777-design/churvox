// CHURVOX_REAL_REVIEW_BACKEND_SYNC_RUNTIME_20260629
// Syncs the worker proof passport, photo retry queue, worker slips and Command decisions to backend routes.

import API_BASE from '../lib/apiBase';

const PROOF_KEY = 'churvox_worker_proof_passport_v1';
const FIELD_NOTES_KEY = 'churvox_worker_field_notes_v1';
const QUEUE_KEY = 'churvox_worker_backend_queue_v1';
const INBOX_KEY = 'churvox:fresh-command-inbox:v1';
const OPS_KEY = 'churvox_option_f_operations_v1';
const PHOTO_PANEL_ID = 'churvox-worker-photo-safe-queue';
const STATUS_ID = 'churvox-worker-photo-safe-status';
let queued = false;
let flushing = false;
let lastFieldSlipLoad = 0;
const passportLoadAt = {};

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
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

function headers(extra = {}) {
  const auth = token();
  return { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...extra };
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

function sameObject(a, b) {
  try {
    return JSON.stringify(a || {}) === JSON.stringify(b || {});
  } catch (_) {
    return false;
  }
}

function isWorkerRoute() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/worker');
}

function isOwnerRoute() {
  return typeof window !== 'undefined' && !window.location.pathname.startsWith('/worker') && Boolean(document.querySelector('.churvoxOptionC .workspace .cocPage'));
}

function currentJobId() {
  const match = window.location.pathname.match(/\/worker\/jobs\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function existingProof(jobId = currentJobId()) {
  const all = readJson(PROOF_KEY, {});
  return { all, state: all[jobId] || {} };
}

function setLocalProof(jobId, update, quiet = false) {
  if (!jobId) return;
  const { all, state } = existingProof(jobId);
  const comparableNext = { ...state, ...update };
  const comparableNow = { ...state };
  delete comparableNext.updatedAt;
  delete comparableNow.updatedAt;
  if (sameObject(comparableNow, comparableNext)) return;
  all[jobId] = { ...comparableNext, updatedAt: new Date().toISOString() };
  writeJson(PROOF_KEY, all);
  if (!quiet) {
    try { window.dispatchEvent(new CustomEvent('churvox:fresh-data-updated')); } catch (_) {}
  }
}

function backendStepsFromLocal(state) {
  return {
    arrival: Boolean(state.arrival),
    before_photo: Boolean(state.beforePhoto || state.before_photo),
    after_photo: Boolean(state.afterPhoto || state.after_photo),
    worker_note: Boolean(state.workNote || state.worker_note),
    extras: Boolean(state.extras),
    finish_summary: Boolean(state.finish || state.finishSummary || state.finish_summary),
  };
}

function localStepsFromBackend(steps = {}) {
  return {
    arrival: Boolean(steps.arrival),
    beforePhoto: Boolean(steps.before_photo),
    afterPhoto: Boolean(steps.after_photo),
    workNote: Boolean(steps.worker_note),
    extras: Boolean(steps.extras),
    finish: Boolean(steps.finish_summary),
  };
}

function queue() {
  const list = readJson(QUEUE_KEY, []);
  return Array.isArray(list) ? list : [];
}

function saveQueue(list) {
  writeJson(QUEUE_KEY, Array.isArray(list) ? list.slice(0, 80) : []);
  renderPhotoPanel();
}

function enqueue(op) {
  const id = op.id || `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const next = [{ ...op, id, queued_at: new Date().toISOString() }, ...queue().filter((item) => item.id !== id)].slice(0, 80);
  saveQueue(next);
  return id;
}

async function flushQueue() {
  if (flushing || !token()) return;
  const list = queue();
  if (!list.length) return;
  flushing = true;
  setPhotoStatus('Syncing saved field proof...');
  const remaining = [];
  for (const op of list) {
    try {
      if (op.type === 'photo') await request('POST', `/worker/jobs/${encodeURIComponent(op.job_id)}/proof-photos`, op.payload);
      else if (op.type === 'field_slip') await request('POST', `/worker/jobs/${encodeURIComponent(op.job_id)}/field-slip`, op.payload);
      else if (op.type === 'passport') await request('POST', `/worker/jobs/${encodeURIComponent(op.job_id)}/proof-passport`, op.payload);
    } catch (_) {
      remaining.push(op);
    }
  }
  flushing = false;
  saveQueue(remaining);
  setPhotoStatus(remaining.length ? `${remaining.length} item${remaining.length === 1 ? '' : 's'} still waiting for signal.` : 'All field proof synced.');
  if (!remaining.length) window.setTimeout(() => setPhotoStatus('Photo safe queue ready.'), 1800);
}

async function syncPassport(jobId = currentJobId()) {
  if (!jobId || !token()) return;
  const { state } = existingProof(jobId);
  const payload = { steps: backendStepsFromLocal(state), offline_token: `proof-${jobId}-${Date.now()}` };
  try {
    const body = await request('POST', `/worker/jobs/${encodeURIComponent(jobId)}/proof-passport`, payload);
    const steps = body?.passport?.steps || body?.steps || {};
    if (steps && Object.keys(steps).length) setLocalProof(jobId, localStepsFromBackend(steps), true);
  } catch (_) {
    enqueue({ type: 'passport', job_id: jobId, payload });
  }
}

async function loadPassport(jobId = currentJobId(), force = false) {
  if (!jobId || !token()) return;
  if (!force && Date.now() - (passportLoadAt[jobId] || 0) < 15000) return;
  passportLoadAt[jobId] = Date.now();
  try {
    const body = await request('GET', `/worker/jobs/${encodeURIComponent(jobId)}/proof-passport`);
    const passport = body?.passport || body;
    if (passport?.steps) setLocalProof(jobId, localStepsFromBackend(passport.steps), true);
  } catch (_) {}
}

function fieldNotes() {
  const list = readJson(FIELD_NOTES_KEY, []);
  return Array.isArray(list) ? list : [];
}

function updateFieldNotes(list) {
  writeJson(FIELD_NOTES_KEY, list.slice(0, 80));
}

async function syncLatestNote(jobId = currentJobId()) {
  if (!jobId || !token()) return;
  const notes = fieldNotes();
  const note = notes.find((item) => item && item.job_id === jobId && !item.backend_synced) || notes.find((item) => item && !item.backend_synced);
  if (!note) return;
  const payload = { id: `review-${note.id}`, type: note.type || 'field_note', text: note.text || note.note || '', source: 'worker_note_to_command' };
  try {
    await request('POST', `/worker/jobs/${encodeURIComponent(jobId)}/field-slip`, payload);
    updateFieldNotes(notes.map((item) => item.id === note.id ? { ...item, backend_synced: true, synced_at: new Date().toISOString() } : item));
    loadFieldSlips(true);
  } catch (_) {
    enqueue({ id: `slip-${note.id}`, type: 'field_slip', job_id: jobId, payload });
  }
}

function mergeCommandItems(items) {
  if (!Array.isArray(items) || !items.length) return;
  const normalized = items.map((item) => ({ ...item, real_review_layer: true, source: item.source || 'worker-field-truth' }));
  const inbox = readJson(INBOX_KEY, []);
  const inboxList = Array.isArray(inbox) ? inbox : [];
  const byId = new Map(inboxList.map((item) => [String(item.id || item.title), item]));
  normalized.forEach((item) => byId.set(String(item.id || item.title), { ...byId.get(String(item.id || item.title)), ...item }));
  writeJson(INBOX_KEY, Array.from(byId.values()).slice(0, 100));

  const ops = readJson(OPS_KEY, {});
  const queueList = Array.isArray(ops.commandQueue) ? ops.commandQueue : [];
  const queueById = new Map(queueList.map((item) => [String(item.id || item.title), item]));
  normalized.forEach((item) => queueById.set(String(item.id || item.title), { ...queueById.get(String(item.id || item.title)), ...item }));
  writeJson(OPS_KEY, { ...ops, commandQueue: Array.from(queueById.values()).slice(0, 100), updatedAt: new Date().toISOString() });
  try { window.dispatchEvent(new CustomEvent('churvox:fresh-data-updated')); } catch (_) {}
}

async function loadFieldSlips(force = false) {
  if (!isOwnerRoute() || !token()) return;
  if (!force && Date.now() - lastFieldSlipLoad < 15000) return;
  lastFieldSlipLoad = Date.now();
  try {
    const body = await request('GET', '/command/field-slips');
    mergeCommandItems(body?.items || body?.actions || body?.data || []);
  } catch (_) {}
}

async function decideFieldSlip(slipId, decision) {
  if (!slipId || !token()) return;
  try {
    await request('POST', `/command/field-slips/${encodeURIComponent(slipId)}/${encodeURIComponent(decision || 'park')}`, { source: 'owner_command' });
    await loadFieldSlips(true);
  } catch (_) {}
}

function setPhotoStatus(text) {
  const node = document.getElementById(STATUS_ID);
  if (node) node.textContent = text;
}

function photoPanelHtml() {
  const pending = queue().filter((item) => item.type === 'photo').length;
  return `
    <div class="rrTop compact">
      <div>
        <span class="rrEyebrow">Photo safe queue</span>
        <h2>Photos save first, then sync.</h2>
        <p>Built for rough coverage. Before/after proof is compressed, queued if needed, and retried when signal comes back.</p>
      </div>
      <div class="rrScore">${pending ? `${pending} waiting` : 'Synced'}</div>
    </div>
    <div class="rrPhotoActions">
      <label><input type="file" accept="image/*" capture="environment" data-rr-photo-kind="before">Before photo</label>
      <label><input type="file" accept="image/*" capture="environment" data-rr-photo-kind="after">After photo</label>
      <button type="button" data-rr-retry-photo-sync>Retry sync</button>
    </div>
    <p class="rrTiny" id="${STATUS_ID}">${pending ? `${pending} photo${pending === 1 ? '' : 's'} waiting for upload.` : 'Photo safe queue ready.'}</p>`;
}

function insertPhotoPanel() {
  if (!isWorkerRoute() || !/^\/worker\/jobs\//.test(window.location.pathname)) return;
  const root = document.querySelector('.wc-screen .wc-main, .wc-main, main');
  if (!root) return;
  let node = document.getElementById(PHOTO_PANEL_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = PHOTO_PANEL_ID;
    node.className = 'real-review-photo-queue real-review-passport';
    const anchor = document.querySelector('#churvox-proof-passport, #worker-proof, .wc-finish');
    if (anchor) anchor.insertAdjacentElement('afterend', node);
    else root.appendChild(node);
  }
  renderHtml(node, photoPanelHtml());
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read photo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load photo'));
      img.onload = () => {
        const max = 1280;
        const ratio = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.76);
        resolve({ dataUrl, size: dataUrl.length, mime: 'image/jpeg' });
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

async function handlePhotoInput(input) {
  const jobId = currentJobId();
  const file = input?.files?.[0];
  if (!jobId || !file) return;
  const kind = input.getAttribute('data-rr-photo-kind') || 'proof';
  setPhotoStatus('Saving photo safely...');
  try {
    const compressed = await compressImage(file);
    const payload = { kind, filename: file.name || `${kind}-photo.jpg`, mime_type: compressed.mime, size_bytes: compressed.size, photo_data: compressed.dataUrl, offline_token: `photo-${jobId}-${kind}-${Date.now()}` };
    const opId = `photo-${jobId}-${kind}-${Date.now()}`;
    enqueue({ id: opId, type: 'photo', job_id: jobId, payload });
    setLocalProof(jobId, kind === 'before' ? { beforePhoto: true } : kind === 'after' ? { afterPhoto: true } : { workNote: true });
    await flushQueue();
    await syncPassport(jobId);
  } catch (error) {
    setPhotoStatus(error?.message || 'Photo saved locally and will retry.');
  } finally {
    input.value = '';
    renderPhotoPanel();
  }
}

function handleClick(event) {
  const retry = event.target.closest('[data-rr-retry-photo-sync]');
  if (retry) {
    event.preventDefault();
    flushQueue();
    return;
  }

  const proofButton = event.target.closest('[data-rr-proof-step]');
  if (proofButton) {
    window.setTimeout(() => syncPassport(), 250);
    return;
  }

  const saveNote = event.target.closest('[data-rr-save-note]');
  if (saveNote) {
    window.setTimeout(() => syncLatestNote(), 350);
    return;
  }

  const commandAction = event.target.closest('[data-rr-command-action]');
  if (commandAction) {
    const item = commandAction.closest('[data-rr-command-id]');
    const id = item?.getAttribute('data-rr-command-id') || '';
    const action = commandAction.getAttribute('data-rr-command-action') || 'park';
    window.setTimeout(() => decideFieldSlip(id, action), 200);
  }
}

function handleChange(event) {
  const input = event.target.closest('[data-rr-photo-kind]');
  if (input) handlePhotoInput(input);
}

function renderPhotoPanel() {
  if (isWorkerRoute()) insertPhotoPanel();
}

function schedule() {
  if (queued) return;
  queued = true;
  window.setTimeout(() => {
    queued = false;
    if (isWorkerRoute()) {
      insertPhotoPanel();
      loadPassport();
      flushQueue();
    } else if (isOwnerRoute()) {
      loadFieldSlips();
    }
  }, 180);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_REAL_REVIEW_BACKEND_SYNC__) {
  window.__CHURVOX_REAL_REVIEW_BACKEND_SYNC__ = true;
  window.churvoxFlushWorkerProofQueue = flushQueue;
  window.addEventListener('load', schedule);
  window.addEventListener('online', flushQueue);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox:fresh-data-updated', schedule);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('change', handleChange, true);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
