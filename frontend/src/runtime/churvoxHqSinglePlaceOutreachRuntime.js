const FLAG = '__CHURVOX_HQ_SINGLE_PLACE_OUTREACH_RUNTIME__';
const VERSION = 'churvox-hq-one-place-outreach-v1-20260715';
const OUTREACH_BUTTON_ID = 'churvox-hq-tester-outreach-button';
const OUTREACH_ROOT_ID = 'churvox-hq-tester-outreach-root';
const LOAD_ENGINE_ID = 'churvox-hq-load-next-five-button';
const IMPORT_ENGINE_ID = 'churvox-hq-assistant-draft-import-button';
const IMPORT_ROOT_ID = 'churvox-hq-assistant-draft-import-root';
const BULK_SEND_BUTTON_ID = 'churvox-hq-bulk-send-prepared-button';
const DESK_LOAD_BUTTON_ID = 'churvox-hq-desk-load-all-button';
const GUIDE_ID = 'churvox-hq-one-place-guide';
const GUIDE_ACTIONS_ID = 'churvox-hq-one-place-actions';
const STYLE_ID = 'churvox-hq-one-place-style';
const PREPARED_EMAILS = [
  'info@crewcut.co.nz',
  'info@cleanplanet.co.nz',
  'service@housewash.co.nz',
  'nick@flick.co.nz',
  'cs@chemdry.co.nz',
  'enquiries@electrodry.com.au',
  'hc6701@handymanconnection.com',
  'info@thecleaningcompany.ie',
  'info@lbcclean.co.uk',
  'hc3701@handymanconnection.com',
];

let loadMonitor = 0;
let loadTimeout = 0;
let syncing = false;

function isHqPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return ['/admin', '/churvox-hq', '/admin/hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage', '/admin/qa-auditor', '/platform'].includes(path);
}

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${LOAD_ENGINE_ID},#${IMPORT_ENGINE_ID}{display:none!important}
    #${IMPORT_ROOT_ID}{display:none!important;pointer-events:none!important}
    #${GUIDE_ID}{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;padding:16px 18px;border:1px solid #fed7aa;border-radius:18px;background:linear-gradient(135deg,#fff7ed,#fff 65%);box-shadow:0 8px 22px rgba(124,45,18,.07)}
    #${GUIDE_ID} h3{margin:0 0 5px;font-size:18px;letter-spacing:-.035em;color:#111827}
    #${GUIDE_ID} p{margin:0;color:#64748b;font-size:12px;font-weight:750;line-height:1.45}
    #${GUIDE_ID} .churvoxOnePlaceSteps{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
    #${GUIDE_ID} .churvoxOnePlaceStep{display:inline-flex;align-items:center;gap:6px;border:1px solid #e2e8f0;border-radius:999px;background:#fff;padding:6px 9px;color:#334155;font-size:10px;font-weight:900}
    #${GUIDE_ID} .churvoxOnePlaceStep b{display:grid;place-items:center;width:18px;height:18px;border-radius:999px;background:#111827;color:#fff;font-size:9px}
    #${GUIDE_ACTIONS_ID}{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}
    #${GUIDE_ACTIONS_ID} button{border:0;border-radius:12px;padding:11px 14px;font-weight:950;cursor:pointer;white-space:nowrap}
    #${DESK_LOAD_BUTTON_ID}{background:#111827!important;color:#fff!important}
    #${BULK_SEND_BUTTON_ID}{background:#f97316!important;color:#111827!important}
    #${GUIDE_ACTIONS_ID} button:disabled{opacity:.55;cursor:not-allowed}
    #${OUTREACH_ROOT_ID} .htoHeadActions{align-items:center;flex-wrap:wrap}
    @media(max-width:820px){#${GUIDE_ID}{grid-template-columns:1fr}#${GUIDE_ACTIONS_ID}{justify-content:flex-start}}
  `;
  document.head.appendChild(style);
}

function hideOldControls() {
  [LOAD_ENGINE_ID, IMPORT_ENGINE_ID].forEach((id) => {
    const button = document.getElementById(id);
    if (!button) return;
    button.hidden = true;
    button.tabIndex = -1;
    button.setAttribute('aria-hidden', 'true');
    button.dataset.churvoxEngineOnly = VERSION;
  });
}

function outreachRoot() {
  return document.getElementById(OUTREACH_ROOT_ID);
}

function preparedRows() {
  const root = outreachRoot();
  if (!root) return [];
  return PREPARED_EMAILS.filter((email) =>
    Array.from(root.querySelectorAll('.htoRow')).some((row) =>
      String(row.textContent || '').toLowerCase().includes(email)
    )
  );
}

function preparedDraftCount() {
  const root = outreachRoot();
  if (!root) return 0;
  return PREPARED_EMAILS.filter((email) =>
    Array.from(root.querySelectorAll('.htoRow')).some((row) => {
      if (!String(row.textContent || '').toLowerCase().includes(email)) return false;
      const status = String(row.querySelector('.htoStatus')?.textContent || '').trim().toLowerCase();
      return status === 'draft' && Boolean(row.querySelector('[data-row-action="send"]'));
    })
  ).length;
}

function ensureGuide(root) {
  const body = root?.querySelector('.htoBody');
  if (!body) return null;
  let guide = document.getElementById(GUIDE_ID);
  if (!guide) {
    guide = document.createElement('section');
    guide.id = GUIDE_ID;
    guide.innerHTML = `
      <div>
        <h3>Outreach in one place</h3>
        <p>Load the prepared businesses, review every email below, then approve the prepared list once. Nothing sends or grants access without your approval.</p>
        <div class="churvoxOnePlaceSteps">
          <span class="churvoxOnePlaceStep"><b>1</b>Load drafts</span>
          <span class="churvoxOnePlaceStep"><b>2</b>Review below</span>
          <span class="churvoxOnePlaceStep"><b>3</b>Approve once</span>
        </div>
      </div>
      <div id="${GUIDE_ACTIONS_ID}"></div>`;
    body.insertBefore(guide, body.firstChild);
  } else if (guide.parentElement !== body || guide !== body.firstElementChild) {
    body.insertBefore(guide, body.firstChild);
  }
  return guide;
}

function loadEngine() {
  return document.getElementById(LOAD_ENGINE_ID);
}

function loadIsComplete(engine) {
  return /all 10 drafts loaded/i.test(String(engine?.textContent || '')) || preparedRows().length === PREPARED_EMAILS.length;
}

function syncDeskLoadButton() {
  const root = outreachRoot();
  const guide = ensureGuide(root);
  const actions = guide?.querySelector(`#${GUIDE_ACTIONS_ID}`);
  if (!actions) return;

  let button = document.getElementById(DESK_LOAD_BUTTON_ID);
  if (!button) {
    button = document.createElement('button');
    button.id = DESK_LOAD_BUTTON_ID;
    button.type = 'button';
    button.addEventListener('click', startLoadFromDesk);
    actions.appendChild(button);
  }

  const engine = loadEngine();
  const engineText = String(engine?.textContent || '');
  const busy = /loading|verifying/i.test(engineText) || Boolean(loadMonitor);
  const complete = loadIsComplete(engine);

  if (complete) {
    setText(button, 'All 10 drafts loaded');
    button.disabled = true;
    button.title = 'All prepared drafts are visible below';
  } else if (busy) {
    setText(button, engineText || 'Loading all 10 drafts…');
    button.disabled = true;
  } else {
    setText(button, 'Load all 10 drafts');
    button.disabled = !engine;
    button.title = engine ? 'Load all prepared NZ and international emails here' : 'Preparing the outreach loader';
  }
}

function moveBulkSendIntoGuide() {
  const root = outreachRoot();
  const guide = ensureGuide(root);
  const actions = guide?.querySelector(`#${GUIDE_ACTIONS_ID}`);
  const send = document.getElementById(BULK_SEND_BUTTON_ID);
  if (!actions || !send) return;
  if (send.parentElement !== actions) actions.appendChild(send);
  const count = preparedDraftCount();
  if (!send.disabled && count) setText(send, `Approve & send all (${count})`);
}

function keepOutreachOpen() {
  const root = outreachRoot();
  if (root?.classList.contains('open')) return;
  document.getElementById(OUTREACH_BUTTON_ID)?.click();
}

function clearOutreachSearch() {
  const input = outreachRoot()?.querySelector('[data-query]');
  if (!input || !input.value) return;
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function stopLoadMonitor() {
  window.clearInterval(loadMonitor);
  window.clearTimeout(loadTimeout);
  loadMonitor = 0;
  loadTimeout = 0;
  document.body?.classList.remove('churvoxSinglePlaceImporting');
  syncAll();
}

function startLoadFromDesk(event) {
  event?.preventDefault();
  event?.stopPropagation();
  const engine = loadEngine();
  if (!engine || loadMonitor || loadIsComplete(engine)) return;

  clearOutreachSearch();
  document.body?.classList.add('churvoxSinglePlaceImporting');
  engine.hidden = true;
  engine.disabled = false;
  engine.click();

  loadMonitor = window.setInterval(() => {
    hideOldControls();
    keepOutreachOpen();
    clearOutreachSearch();
    syncAll();
    const text = String(engine.textContent || '');
    if (/all 10 drafts loaded/i.test(text) || preparedRows().length === PREPARED_EMAILS.length) stopLoadMonitor();
    else if (/load all 10 drafts/i.test(text) && !/loading|verifying/i.test(text) && preparedRows().length > 0) stopLoadMonitor();
  }, 180);

  loadTimeout = window.setTimeout(() => stopLoadMonitor(), 120000);
  syncDeskLoadButton();
}

function updateDeskCopy(root) {
  const head = root?.querySelector('.htoHead');
  setText(head?.querySelector('small'), 'One owner outreach desk · email only');
  setText(head?.querySelector('h2'), 'Tester outreach');
  setText(head?.querySelector('p'), 'Load, review, approve and send from this one screen. Churvox keeps every draft and reply together.');
}

function syncAll() {
  if (syncing || !isHqPath()) return;
  syncing = true;
  try {
    installStyle();
    hideOldControls();
    const root = outreachRoot();
    if (!root) return;
    updateDeskCopy(root);
    ensureGuide(root);
    syncDeskLoadButton();
    moveBulkSendIntoGuide();
  } finally {
    syncing = false;
  }
}

function schedule() {
  if (!isHqPath()) return;
  [0, 120, 350, 800, 1600, 3200, 6500].forEach((delay) => window.setTimeout(syncAll, delay));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = VERSION;
  window.__CHURVOX_DEPLOY_BUILD__ = VERSION;
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-auth-state', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);

  let observerTimer = 0;
  const observer = new MutationObserver(() => {
    if (!isHqPath()) return;
    window.clearTimeout(observerTimer);
    observerTimer = window.setTimeout(syncAll, 80);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(syncAll, 4000);
}

export {};
