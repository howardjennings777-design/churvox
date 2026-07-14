const FLAG = '__CHURVOX_HQ_LOAD_DRAFTS_VISIBILITY_RUNTIME__';
const LOAD_BUTTON_ID = 'churvox-hq-load-next-five-button';
const OUTREACH_BUTTON_ID = 'churvox-hq-tester-outreach-button';
const OUTREACH_ROOT_ID = 'churvox-hq-tester-outreach-root';
const HIDDEN_ANCHOR_ID = 'churvox-hq-outreach-hidden-anchor';
const BULK_SEND_BUTTON_ID = 'churvox-hq-bulk-send-prepared-button';
const BATCH_STORAGE_KEY = 'churvox-outreach-prepared-batches-v2-loaded';
const BULK_COMPLETE_KEY = 'churvox-outreach-all-10-verified-v1';
const VERSION = 'churvox-hq-bulk-outreach-v1-20260715';
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

let lastNudgeAt = 0;
let allowNativeLoadClick = false;
let bulkLoadBusy = false;
let bulkSendBusy = false;
let bulkSendProgress = { done: 0, total: 0 };

function isHqPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return ['/admin', '/churvox-hq', '/admin/hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage', '/admin/qa-auditor', '/platform'].includes(path);
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitUntil(check, timeoutMs = 30000, intervalMs = 150) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = check();
    if (value) return value;
    await sleep(intervalMs);
  }
  return null;
}

function hqNav() {
  return document.querySelector('.hq2Side nav');
}

function hasOutreachButton(nav) {
  return Array.from(nav?.querySelectorAll('button') || []).some((button) =>
    String(button.textContent || '').trim().toLowerCase().startsWith('outreach')
  );
}

function ensureHiddenOutreachAnchor(nav) {
  if (!nav || hasOutreachButton(nav)) return null;
  let anchor = document.getElementById(HIDDEN_ANCHOR_ID);
  if (anchor) return anchor;

  anchor = document.createElement('button');
  anchor.id = HIDDEN_ANCHOR_ID;
  anchor.type = 'button';
  anchor.textContent = 'Outreach';
  anchor.tabIndex = -1;
  anchor.setAttribute('aria-hidden', 'true');
  anchor.style.display = 'none';

  const testers = Array.from(nav.querySelectorAll('button')).find((button) =>
    String(button.textContent || '').trim().toLowerCase().startsWith('testers')
  );
  if (testers?.nextSibling) nav.insertBefore(anchor, testers.nextSibling);
  else nav.appendChild(anchor);
  return anchor;
}

function loadedBatchCount() {
  try {
    const value = JSON.parse(window.localStorage.getItem(BATCH_STORAGE_KEY) || '[]');
    return Array.isArray(value) ? new Set(value.filter((item) => typeof item === 'string')).size : 0;
  } catch {
    return 0;
  }
}

function bulkVerified() {
  try { return window.localStorage.getItem(BULK_COMPLETE_KEY) === '1'; } catch { return false; }
}

function setBulkVerified(value) {
  try {
    if (value) window.localStorage.setItem(BULK_COMPLETE_KEY, '1');
    else window.localStorage.removeItem(BULK_COMPLETE_KEY);
  } catch {}
}

function clearLegacyBatchProgress() {
  try { window.localStorage.removeItem(BATCH_STORAGE_KEY); } catch {}
}

function makeLoadButtonVisible() {
  const button = document.getElementById(LOAD_BUTTON_ID);
  if (!button) return false;
  button.hidden = false;
  button.removeAttribute('aria-hidden');
  button.style.removeProperty('display');
  button.style.removeProperty('visibility');
  button.style.removeProperty('opacity');
  button.dataset.churvoxVisibilityGuard = VERSION;
  decorateLoadButton(button);
  return true;
}

function nativeLoadClick(button) {
  allowNativeLoadClick = true;
  button.disabled = false;
  button.click();
  allowNativeLoadClick = false;
}

function preparedRow(email) {
  const root = document.getElementById(OUTREACH_ROOT_ID);
  if (!root) return null;
  const canonical = String(email || '').toLowerCase();
  return Array.from(root.querySelectorAll('.htoRow')).find((row) =>
    String(row.textContent || '').toLowerCase().includes(canonical)
  ) || null;
}

function preparedRows() {
  return PREPARED_EMAILS.map((email) => ({ email, row: preparedRow(email) })).filter((item) => item.row);
}

function preparedDraftRows() {
  return preparedRows().filter(({ row }) => {
    const status = String(row.querySelector('.htoStatus')?.textContent || '').trim().toLowerCase().replace(/\s+/g, '_');
    return status === 'draft' && Boolean(row.querySelector('[data-row-action="send"]'));
  });
}

async function openAndVerifyOutreach() {
  const root = document.getElementById(OUTREACH_ROOT_ID);
  if (!root?.classList.contains('open')) document.getElementById(OUTREACH_BUTTON_ID)?.click();
  await waitUntil(() => document.getElementById(OUTREACH_ROOT_ID)?.classList.contains('open'), 10000);
  const refresh = document.querySelector(`#${OUTREACH_ROOT_ID} [data-action="refresh"]`);
  if (refresh) refresh.click();
  return waitUntil(() => preparedRows().length === PREPARED_EMAILS.length, 20000);
}

async function runBulkLoad(button) {
  if (bulkLoadBusy) return;
  bulkLoadBusy = true;
  setBulkVerified(false);
  clearLegacyBatchProgress();

  try {
    for (let index = 0; index < 2; index += 1) {
      button.textContent = `Loading all 10 drafts… (${index * 5}/10)`;
      button.disabled = true;
      const before = loadedBatchCount();
      nativeLoadClick(button);
      const advanced = await waitUntil(() => loadedBatchCount() > before, 45000);
      if (!advanced) throw new Error(`Batch ${index + 1} was not confirmed by Churvox.`);

      if (index === 0) {
        document.querySelector(`#${OUTREACH_ROOT_ID}.open [data-hto-close]`)?.click();
        await sleep(250);
      }
    }

    button.textContent = 'Verifying all 10 drafts…';
    button.disabled = true;
    const verified = await openAndVerifyOutreach();
    if (!verified) {
      clearLegacyBatchProgress();
      throw new Error(`Only ${preparedRows().length} of 10 prepared drafts could be verified in Outreach.`);
    }

    setBulkVerified(true);
    button.textContent = 'All 10 drafts loaded';
    button.disabled = true;
    window.alert('All 10 prepared emails are now in Outreach as drafts. Nothing has been sent.');
  } catch (error) {
    setBulkVerified(false);
    clearLegacyBatchProgress();
    button.disabled = false;
    button.textContent = 'Load all 10 drafts';
    window.alert(error?.message || 'Churvox could not load all 10 drafts.');
  } finally {
    bulkLoadBusy = false;
    decorateLoadButton(button);
    decorateBulkSendButton();
  }
}

function decorateLoadButton(button) {
  if (!button) return;
  if (!button.dataset.churvoxBulkBound) {
    button.dataset.churvoxBulkBound = VERSION;
    button.addEventListener('click', (event) => {
      if (allowNativeLoadClick) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      runBulkLoad(button).catch((error) => window.alert(error?.message || 'Bulk draft loading failed.'));
    }, true);
  }

  if (bulkLoadBusy) return;
  if (bulkVerified()) {
    if (button.textContent !== 'All 10 drafts loaded') button.textContent = 'All 10 drafts loaded';
    button.title = 'All ten prepared tester outreach emails are verified in Outreach';
    button.disabled = true;
  } else {
    if (button.textContent !== 'Load all 10 drafts') button.textContent = 'Load all 10 drafts';
    button.title = 'Import the New Zealand and international tester drafts together';
    button.disabled = false;
  }
}

function postmarkUnavailable() {
  const root = document.getElementById(OUTREACH_ROOT_ID);
  return Array.from(root?.querySelectorAll('.htoNotice.bad') || []).some((notice) =>
    /postmark sending is not configured/i.test(String(notice.textContent || ''))
  );
}

async function clearOutreachSearch() {
  const input = document.querySelector(`#${OUTREACH_ROOT_ID} [data-query]`);
  if (!input || !input.value) return;
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(150);
}

async function waitForSendResult(email, timeoutMs = 35000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const row = preparedRow(email);
    if (row) {
      const status = String(row.querySelector('.htoStatus')?.textContent || '').trim().toLowerCase().replace(/\s+/g, '_');
      if (status && status !== 'draft') return status;
    }
    await sleep(200);
  }
  return '';
}

async function runBulkSend() {
  if (bulkSendBusy) return;
  await clearOutreachSearch();
  const targets = preparedDraftRows();
  if (!targets.length) {
    window.alert('There are no prepared drafts waiting to be sent.');
    return;
  }
  if (postmarkUnavailable()) {
    window.alert('Postmark sending is not configured, so the emails cannot be sent yet.');
    return;
  }

  const approved = window.confirm(
    `Approve and send ${targets.length} prepared tester emails now?\n\n` +
    'This is one owner approval for the prepared list only. It will not grant tester access.'
  );
  if (!approved) return;

  bulkSendBusy = true;
  bulkSendProgress = { done: 0, total: targets.length };
  const sent = [];
  const failed = [];

  try {
    for (const target of targets) {
      bulkSendProgress = { done: sent.length + failed.length, total: targets.length };
      decorateBulkSendButton();
      const row = preparedRow(target.email);
      const sendButton = row?.querySelector('[data-row-action="send"]');
      if (!sendButton) {
        failed.push(target.email);
        continue;
      }

      sendButton.click();
      const status = await waitForSendResult(target.email);
      if (status === 'sent') sent.push(target.email);
      else failed.push(target.email);
      await sleep(250);
    }
  } finally {
    bulkSendBusy = false;
    bulkSendProgress = { done: sent.length + failed.length, total: targets.length };
    decorateBulkSendButton();
  }

  const summary = failed.length
    ? `${sent.length} email${sent.length === 1 ? '' : 's'} sent. ${failed.length} failed or were not confirmed. The failed drafts remain unsent for review.`
    : `All ${sent.length} prepared tester emails were sent. Tester access was not granted.`;
  window.alert(summary);
}

function decorateBulkSendButton() {
  const root = document.getElementById(OUTREACH_ROOT_ID);
  const actions = root?.querySelector('.htoHeadActions');
  if (!root || !actions) return;

  let button = document.getElementById(BULK_SEND_BUTTON_ID);
  if (!button) {
    button = document.createElement('button');
    button.id = BULK_SEND_BUTTON_ID;
    button.type = 'button';
    button.dataset.churvoxBulkSend = VERSION;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      runBulkSend().catch((error) => window.alert(error?.message || 'Bulk approval failed.'));
    });
    actions.insertBefore(button, actions.firstChild);
  }

  if (bulkSendBusy) {
    button.disabled = true;
    const progressText = `Sending ${bulkSendProgress.done}/${bulkSendProgress.total}…`;
    if (button.textContent !== progressText) button.textContent = progressText;
    return;
  }

  const count = preparedDraftRows().length;
  const blocked = postmarkUnavailable();
  button.disabled = count === 0 || blocked;
  const nextText = count ? `Approve & send all (${count})` : 'Prepared drafts sent';
  if (button.textContent !== nextText) button.textContent = nextText;
  button.title = blocked
    ? 'Postmark sending is not configured'
    : count
      ? 'One confirmation sends only the prepared tester outreach drafts'
      : 'No prepared drafts are waiting to be sent';
}

function nudgeLoadRuntime() {
  if (!isHqPath()) return;
  const nav = hqNav();
  if (!nav) return;

  ensureHiddenOutreachAnchor(nav);
  makeLoadButtonVisible();
  decorateBulkSendButton();

  const now = Date.now();
  if (now - lastNudgeAt > 250) {
    lastNudgeAt = now;
    window.dispatchEvent(new Event('churvox-owner-app-ready'));
  }

  window.setTimeout(() => {
    makeLoadButtonVisible();
    decorateBulkSendButton();
    const realOutreach = document.getElementById(OUTREACH_BUTTON_ID);
    if (realOutreach) document.getElementById(HIDDEN_ANCHOR_ID)?.remove();
  }, 120);
}

function schedule() {
  if (!isHqPath()) return;
  [0, 120, 400, 900, 1800, 3500, 7000].forEach((delay) =>
    window.setTimeout(nudgeLoadRuntime, delay)
  );
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = VERSION;
  window.__CHURVOX_DEPLOY_BUILD__ = VERSION;
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-auth-state', schedule);

  let observerTimer = 0;
  const observer = new MutationObserver(() => {
    if (!isHqPath()) return;
    window.clearTimeout(observerTimer);
    observerTimer = window.setTimeout(nudgeLoadRuntime, 100);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(nudgeLoadRuntime, 5000);
}

export {};
