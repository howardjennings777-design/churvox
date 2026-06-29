// CHURVOX_FIELD_PROOF_RUNTIME_20260629
// Field proof, fair GPS, offline safety, clean worker flow, and owner approval slips.

const WORKER_PANEL_ID = 'churvox-real-review-worker-panel';
const PASSPORT_ID = 'churvox-proof-passport';
const NOTE_SLIP_ID = 'churvox-worker-note-to-slip';
const ME_PANEL_ID = 'churvox-worker-me-proof-log';
const OWNER_PANEL_ID = 'churvox-real-review-owner-panel';
const AUDIT_KEY = 'churvox_real_review_audit_v1';
const PROOF_KEY = 'churvox_worker_proof_passport_v1';
const FIELD_NOTES_KEY = 'churvox_worker_field_notes_v1';
const INBOX_KEY = 'churvox:fresh-command-inbox:v1';
const OPS_KEY = 'churvox_option_f_operations_v1';

let queued = false;

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function lower(value) {
  return clean(value).toLowerCase();
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

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
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
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/worker');
}

function isOwnerRoute() {
  return typeof window !== 'undefined' && !window.location.pathname.startsWith('/worker') && Boolean(document.querySelector('.churvoxOptionC .workspace .cocPage'));
}

function getOwnerPage() {
  const hash = lower((window.location.hash || '').replace('#', ''));
  if (hash) return hash;
  if (window.location.pathname.endsWith('/plans')) return 'plans';
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return lower(active?.textContent || 'today') || 'today';
}

function workerMain() {
  return document.querySelector('.wc-screen .wc-main, .wc-main, main');
}

function ownerMain() {
  return document.querySelector('.churvoxOptionC .workspace .cocPage');
}

function currentJobId() {
  const match = window.location.pathname.match(/\/worker\/jobs\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : 'worker-day';
}

function proofState() {
  const all = readJson(PROOF_KEY, {});
  const id = currentJobId();
  return { all, id, state: all[id] || {} };
}

function setProofStep(step, value = true) {
  const { all, id, state } = proofState();
  all[id] = { ...state, [step]: value, updatedAt: new Date().toISOString() };
  writeJson(PROOF_KEY, all);
}

function proofItems() {
  const { state } = proofState();
  return [
    ['arrival', 'Clock / arrival captured'],
    ['beforePhoto', 'Before photo added'],
    ['afterPhoto', 'After photo added'],
    ['workNote', 'Worker note clear'],
    ['extras', 'Materials / extras checked'],
    ['finish', 'Finish summary ready'],
  ].map(([key, label]) => ({ key, label, done: Boolean(state[key]) }));
}

function missingProof() {
  return proofItems().filter((item) => !item.done);
}

function countOfflineHints() {
  try {
    return Object.keys(localStorage).filter((key) => /offline|queue|pending|sync/i.test(key)).reduce((total, key) => {
      const value = localStorage.getItem(key) || '';
      if (!value || value === '[]' || value === '{}') return total;
      return total + 1;
    }, 0);
  } catch (_) {
    return 0;
  }
}

function fieldNotes() {
  const list = readJson(FIELD_NOTES_KEY, []);
  return Array.isArray(list) ? list : [];
}

function saveFieldNote(type, text) {
  const note = {
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    text: clean(text),
    job_id: currentJobId(),
    created_at: new Date().toISOString(),
  };
  const notes = [note, ...fieldNotes()].slice(0, 60);
  writeJson(FIELD_NOTES_KEY, notes);
  setProofStep(type === 'issue' ? 'issueFlag' : 'workNote', true);
  if (type === 'issue' || type === 'customer_request' || type === 'extra') pushCommandSlip(note);
  try { window.dispatchEvent(new CustomEvent('churvox:fresh-data-updated')); } catch (_) {}
  return note;
}

function pushCommandSlip(note) {
  const title = note.type === 'issue'
    ? 'Worker issue needs owner decision'
    : note.type === 'customer_request'
      ? 'Customer request from worker'
      : 'Worker extra needs review';
  const slip = {
    id: `review-${note.id}`,
    source: 'worker-field-truth',
    category: 'Command',
    action: note.type === 'issue' ? 'Review issue' : 'Review field note',
    title,
    summary: note.text || 'Worker sent a field note for owner approval.',
    found: `Job ${note.job_id}`,
    prepared: 'Churvox turned the worker note into an owner approval slip. Nothing goes to the customer without approval.',
    why: 'Problems and extras should not clutter Jobs. They belong in Command for approve, edit or park.',
    priority: note.type === 'issue' ? 'high' : 'medium',
    details: { job_id: note.job_id, field_note_type: note.type, field_note: note.text },
    status: 'waiting_owner_review',
    created_at: note.created_at,
    real_review_layer: true,
  };

  const inbox = readJson(INBOX_KEY, []);
  const inboxList = Array.isArray(inbox) ? inbox : [];
  writeJson(INBOX_KEY, [slip, ...inboxList.filter((item) => item?.id !== slip.id)].slice(0, 100));

  const ops = readJson(OPS_KEY, {});
  const queue = Array.isArray(ops.commandQueue) ? ops.commandQueue : [];
  writeJson(OPS_KEY, { ...ops, commandQueue: [slip, ...queue.filter((item) => item?.id !== slip.id)].slice(0, 100), updatedAt: new Date().toISOString() });
}

function workerTrustHtml() {
  const offlineCount = countOfflineHints();
  const missing = missingProof().length;
  return `
    <div class="rrTop">
      <div>
        <span class="rrEyebrow">Field proof</span>
        <h2>Made for workers, not office clutter.</h2>
        <p>Today, Jobs, Proof, Help and Me stay simple. Churvox catches missing proof and sends issues to Command instead of making the worker think like an admin.</p>
      </div>
      <div class="rrScore">${missing ? `${missing} proof checks left` : 'Proof looks ready'}</div>
    </div>
    <div class="rrGrid">
      <article><strong>Fair GPS</strong><small>Shown as job proof only. GPS belongs in the worker flow, not the owner Jobs page.</small></article>
      <article><strong>Proof safety</strong><small>Before/after photos, notes, extras and finish info are checked before admin is prepared.</small></article>
      <article><strong>Offline aware</strong><small>${offlineCount ? `${offlineCount} local sync hint${offlineCount === 1 ? '' : 's'} found.` : 'Ready for offline queue and retry states.'}</small></article>
      <article><strong>Less chasing</strong><small>Issues, extras and customer requests become Command slips for owner review.</small></article>
    </div>`;
}

function insertWorkerTrustPanel() {
  if (!isWorkerRoute()) return;
  const root = workerMain();
  if (!root) return;
  let node = document.getElementById(WORKER_PANEL_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = WORKER_PANEL_ID;
    node.className = 'real-review-worker-panel';
    const anchor = root.querySelector('.wc-welcome, .wc-job-hero, .wc-clock-card, .wc-next-job');
    if (anchor) anchor.insertAdjacentElement('afterend', node);
    else root.prepend(node);
  }
  renderHtml(node, workerTrustHtml());
}

function proofPassportHtml() {
  const items = proofItems();
  const done = items.filter((item) => item.done).length;
  return `
    <div class="rrTop compact">
      <div>
        <span class="rrEyebrow">Proof passport</span>
        <h2>${done}/${items.length} ready for owner approval</h2>
        <p>Churvox should not ask the owner to invoice or message a customer until field proof is clear.</p>
      </div>
      <div class="rrScore">${done === items.length ? 'Invoice-ready' : 'Missing info'}</div>
    </div>
    <div class="rrProofList">
      ${items.map((item) => `<button type="button" class="${item.done ? 'done' : ''}" data-rr-proof-step="${esc(item.key)}"><span>${item.done ? '✓' : '+'}</span>${esc(item.label)}</button>`).join('')}
    </div>
    <p class="rrTiny">Tap a proof check as it is captured. This saves locally first so the field flow still feels safe when coverage is rough.</p>`;
}

function insertProofPassport() {
  if (!isWorkerRoute() || !/^\/worker\/jobs\//.test(window.location.pathname)) return;
  const root = workerMain();
  if (!root) return;
  let node = document.getElementById(PASSPORT_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = PASSPORT_ID;
    node.className = 'real-review-passport';
    const anchor = document.querySelector('#worker-proof, .wc-timer-card, .wc-job-hero');
    if (anchor) anchor.insertAdjacentElement('afterend', node);
    else root.appendChild(node);
  }
  renderHtml(node, proofPassportHtml());
}

function noteSlipHtml() {
  return `
    <div class="rrTop compact">
      <div>
        <span class="rrEyebrow">Note to slip</span>
        <h2>Worker note becomes owner admin.</h2>
        <p>Use this for extras, customer requests or job problems. It will route to Command, not Jobs.</p>
      </div>
    </div>
    <textarea data-rr-field-note rows="3" placeholder="Example: Customer asked for hedge trim next month. Used 2 green bags. Back gate latch is broken."></textarea>
    <div class="rrActions">
      <button type="button" data-rr-save-note="extra">Save extra / material</button>
      <button type="button" data-rr-save-note="customer_request">Customer request</button>
      <button type="button" class="danger" data-rr-save-note="issue">Flag issue to Command</button>
    </div>
    <p class="rrTiny" data-rr-note-status>Nothing sent yet.</p>`;
}

function insertNoteToSlip() {
  if (!isWorkerRoute() || !/^\/worker\/jobs\//.test(window.location.pathname)) return;
  const root = workerMain();
  if (!root) return;
  let node = document.getElementById(NOTE_SLIP_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = NOTE_SLIP_ID;
    node.className = 'real-review-note-slip';
    const anchor = document.querySelector('#worker-proof, #materials, #finish, .wc-finish');
    if (anchor) anchor.insertAdjacentElement('afterend', node);
    else root.appendChild(node);
  }
  if (!node.dataset.rendered) {
    renderHtml(node, noteSlipHtml());
    node.dataset.rendered = 'true';
  }
}

function insertMePanel() {
  if (!isWorkerRoute() || window.location.pathname !== '/worker/settings') return;
  const root = workerMain();
  if (!root) return;
  let node = document.getElementById(ME_PANEL_ID);
  if (!node) {
    node = document.createElement('section');
    node.id = ME_PANEL_ID;
    node.className = 'real-review-me-panel';
    root.appendChild(node);
  }
  const notes = fieldNotes();
  const proof = readJson(PROOF_KEY, {});
  const jobsWithProof = Object.keys(proof || {}).length;
  const html = `
    <div class="rrTop compact">
      <div>
        <span class="rrEyebrow">Me</span>
        <h2>My proof, hours and sent notes.</h2>
        <p>Workers can see what they submitted, what is waiting, and what protects their pay/job history.</p>
      </div>
    </div>
    <div class="rrGrid three">
      <article><strong>${jobsWithProof}</strong><small>jobs with local proof checks</small></article>
      <article><strong>${notes.length}</strong><small>field notes / extras submitted</small></article>
      <article><strong>${notes.filter((item) => item.type === 'issue').length}</strong><small>issues routed to Command</small></article>
    </div>
    <div class="rrMiniList">
      ${notes.slice(0, 5).map((note) => `<article><strong>${esc((note.type || 'note').replace('_', ' '))}</strong><small>${esc(note.text || 'No note text')}</small></article>`).join('') || '<p class="rrTiny">No field notes saved on this device yet.</p>'}
    </div>`;
  renderHtml(node, html);
}

function commandItems() {
  const inbox = readJson(INBOX_KEY, []);
  const ops = readJson(OPS_KEY, {});
  const queue = Array.isArray(ops.commandQueue) ? ops.commandQueue : [];
  const list = [...(Array.isArray(inbox) ? inbox : []), ...queue];
  const byId = new Map();
  list.filter(Boolean).forEach((item) => byId.set(String(item.id || item.title), item));
  return Array.from(byId.values());
}

function featureChecks() {
  return [
    ['Worker Today flow', Boolean(document.querySelector('.worker-flow-nav, .worker-bottom-nav, #churvox-worker-flow-nav'))],
    ['Proof Passport', Boolean(document.getElementById(PASSPORT_ID)) || /^\/worker\/jobs\//.test(window.location.pathname)],
    ['Fair GPS message', Boolean(document.getElementById(WORKER_PANEL_ID)) || !isWorkerRoute()],
    ['Command slip routing', commandItems().some((item) => item?.real_review_layer || item?.source === 'worker-field-truth')],
    ['Backend bridge loaded', Boolean(window.__CHURVOX_OPTION_F_OLD_BACKEND_BRIDGE__)],
    ['Worker field runtime loaded', Boolean(window.__CHURVOX_WORKER_FIELD_FLOW_RUNTIME__)],
  ];
}

function runAudit() {
  const checks = featureChecks().map(([label, ok]) => ({ label, ok, at: new Date().toISOString() }));
  const result = { at: new Date().toISOString(), route: window.location.pathname + window.location.hash, checks, passed: checks.filter((item) => item.ok).length, total: checks.length };
  writeJson(AUDIT_KEY, result);
  return result;
}

function ownerPanelHtml(page) {
  const items = commandItems();
  const reviewItems = items.filter((item) => item?.real_review_layer || item?.backend_bridge || /proof|worker|invoice|quote|timesheet|request|sync/i.test(`${item?.title || ''} ${item?.summary || ''} ${item?.category || ''}`));
  const audit = readJson(AUDIT_KEY, runAudit());
  const commandOnly = page === 'command';
  return `
    <div class="rrTop">
      <div>
        <span class="rrEyebrow">Field proof control</span>
        <h2>${commandOnly ? 'Command catches field problems before they hit customers.' : 'Today shows what the admin engine is checking.'}</h2>
        <p>Churvox checks photo/offline gaps, GPS trust, missing job info, schedule pressure, invoice proof and worker admin.</p>
      </div>
      <div class="rrScore">${audit.passed}/${audit.total} checks</div>
    </div>
    <div class="rrGrid">
      <article><strong>Missing-info engine</strong><small>Jobs stay clean. Missing proof, extras and issues route to Command.</small></article>
      <article><strong>Proof before billing</strong><small>Before/after, notes, time, extras and worker issues become invoice readiness.</small></article>
      <article><strong>Owner control</strong><small>Churvox drafts the admin. The owner still approves, edits or parks it.</small></article>
      <article><strong>Worker trust</strong><small>GPS and proof are explained inside the worker flow so it feels fair.</small></article>
    </div>
    ${commandOnly ? `<div class="rrCommandQueue"><h3>Command-ready field slips</h3>${reviewItems.slice(0, 6).map((item) => `
      <article data-rr-command-id="${esc(item.id || item.title)}">
        <strong>${esc(item.title || 'Command slip')}</strong>
        <small>${esc(item.summary || item.prepared || 'Prepared for owner review.')}</small>
        <div><button type="button" data-rr-command-action="approve">Approve</button><button type="button" data-rr-command-action="edit">Edit</button><button type="button" data-rr-command-action="park">Park</button></div>
      </article>`).join('') || '<p class="rrTiny">No worker field slips waiting yet. When a worker flags an issue or extra, it lands here.</p>'}</div>` : ''}
    <div class="rrActions"><button type="button" data-rr-run-audit>Run site checks</button>${!commandOnly ? '<button type="button" data-rr-open-command>Open Command</button>' : ''}</div>`;
}

function insertOwnerPanel() {
  if (!isOwnerRoute()) return;
  const page = getOwnerPage();
  const allowed = ['today', 'smart hub', 'command', 'jobs', 'workers', 'team'].includes(page);
  let node = document.getElementById(OWNER_PANEL_ID);
  if (!allowed) {
    node?.remove();
    return;
  }
  const root = ownerMain();
  if (!root) return;
  if (!node) {
    node = document.createElement('section');
    node.id = OWNER_PANEL_ID;
    node.className = 'real-review-owner-panel';
    const first = root.querySelector('.cocPanel, .optionFControlDepth, section');
    if (first) first.insertAdjacentElement('beforebegin', node);
    else root.prepend(node);
  }
  renderHtml(node, ownerPanelHtml(page));
}

function markCommandItem(id, action) {
  const update = (item) => {
    if (String(item?.id || item?.title) !== String(id)) return item;
    return { ...item, owner_decision: action, status: action === 'park' ? 'parked' : action === 'edit' ? 'needs_owner_edit' : 'approved', decided_at: new Date().toISOString() };
  };
  const inbox = readJson(INBOX_KEY, []);
  if (Array.isArray(inbox)) writeJson(INBOX_KEY, inbox.map(update));
  const ops = readJson(OPS_KEY, {});
  if (Array.isArray(ops.commandQueue)) writeJson(OPS_KEY, { ...ops, commandQueue: ops.commandQueue.map(update), updatedAt: new Date().toISOString() });
}

function handleClick(event) {
  const proof = event.target.closest('[data-rr-proof-step]');
  if (proof) {
    event.preventDefault();
    setProofStep(proof.getAttribute('data-rr-proof-step'), true);
    insertProofPassport();
    insertWorkerTrustPanel();
    return;
  }

  const saveNote = event.target.closest('[data-rr-save-note]');
  if (saveNote) {
    event.preventDefault();
    const root = saveNote.closest(`#${NOTE_SLIP_ID}`);
    const input = root?.querySelector('[data-rr-field-note]');
    const status = root?.querySelector('[data-rr-note-status]');
    const text = clean(input?.value || '');
    if (!text) {
      if (status) status.textContent = 'Add a short field note first.';
      return;
    }
    const type = saveNote.getAttribute('data-rr-save-note') || 'extra';
    saveFieldNote(type, text);
    if (input) input.value = '';
    if (status) status.textContent = type === 'issue' ? 'Issue sent to Command for owner decision.' : 'Saved and routed to Command for owner review.';
    schedule();
    return;
  }

  const audit = event.target.closest('[data-rr-run-audit]');
  if (audit) {
    event.preventDefault();
    runAudit();
    schedule();
    return;
  }

  const openCommand = event.target.closest('[data-rr-open-command]');
  if (openCommand) {
    event.preventDefault();
    window.location.hash = '#command';
    schedule();
    return;
  }

  const commandAction = event.target.closest('[data-rr-command-action]');
  if (commandAction) {
    event.preventDefault();
    const item = commandAction.closest('[data-rr-command-id]');
    const id = item?.getAttribute('data-rr-command-id');
    const action = commandAction.getAttribute('data-rr-command-action') || 'park';
    if (id) markCommandItem(id, action);
    commandAction.textContent = action === 'park' ? 'Parked' : action === 'edit' ? 'Marked for edit' : 'Approved';
    schedule();
  }
}

function schedule() {
  if (queued) return;
  queued = true;
  window.setTimeout(() => {
    queued = false;
    if (isWorkerRoute()) {
      insertWorkerTrustPanel();
      insertProofPassport();
      insertNoteToSlip();
      insertMePanel();
    } else {
      insertOwnerPanel();
    }
  }, 100);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_REAL_REVIEW_FIELD_TRUTH_RUNTIME__) {
  window.__CHURVOX_REAL_REVIEW_FIELD_TRUTH_RUNTIME__ = true;
  window.churvoxRealReviewAudit = runAudit;
  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox:fresh-data-updated', schedule);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('click', schedule, true);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
