const FLAG = '__CHURVOX_HQ_ONE_CLICK_DRAFT_IMPORT_RUNTIME__';
const HASH_PREFIX = 'churvox-outreach-batch=';
const IMPORT_BUTTON_ID = 'churvox-hq-assistant-draft-import-button';
const IMPORT_ROOT_ID = 'churvox-hq-assistant-draft-import-root';
const LOAD_BUTTON_ID = 'churvox-hq-load-next-five-button';
const BATCH_STORAGE_KEY = 'churvox-outreach-batch-01-loaded';
const MAX_BATCH = 25;

const PREPARED_BATCH = [
  {
    "business_name": "Crewcut Lawn & Garden — Wellington",
    "contact_name": "Tracy and Sabir",
    "email": "info@crewcut.co.nz",
    "website": "https://www.crewcut.co.nz/wellington",
    "country": "New Zealand",
    "trade": "Lawn and garden care",
    "source": "public_business_website",
    "subject": "Would your Wellington team test Churvox for 30 days?",
    "body": "Hi Tracy and Sabir,\n\nI came across Crewcut’s Wellington team and saw that you coordinate local operators across lawn mowing, gardening, section tidies and commercial work.\n\nI’m inviting a small group of New Zealand trade and service businesses to test Churvox for 30 days. Churvox keeps clients, jobs, quotes, invoices and admin preparation together while the business owner stays in control and approves important actions.\n\nThere’s no card required and no phone call—we can handle everything by email. I’d value honest feedback on whether it suits a multi-operator field-service workflow and what feels useful, confusing or missing.\n\nWould you be open to trying it?\n\nThanks,\nHoward\nChurvox",
    "note": "Public business contact verified 15 July 2026 on Crewcut Wellington's official website. General address may route through the national office; review before approval."
  },
  {
    "business_name": "Clean Planet — Wellington region",
    "contact_name": "Mohan Singh",
    "email": "info@cleanplanet.co.nz",
    "website": "https://cleanplanet.co.nz/",
    "country": "New Zealand",
    "trade": "Commercial cleaning and grounds care",
    "source": "public_business_website",
    "subject": "Mohan, would you test Churvox with your Wellington operation?",
    "body": "Hi Mohan,\n\nI came across Clean Planet and saw that you support commercial cleaning work across Wellington CBD, Hutt Valley, Kapiti Coast and Porirua.\n\nI’m inviting a small group of New Zealand service businesses to test Churvox for 30 days. It brings clients, recurring and one-off jobs, quotes, invoices and admin preparation into one place while the owner stays in control and approves important actions.\n\nThere’s no card required and no phone call—we can handle the whole test by email. I’d value honest feedback on whether the workflow suits a business coordinating work across several areas and what feels useful, confusing or missing.\n\nWould you be open to trying it?\n\nThanks,\nHoward\nChurvox",
    "note": "Public business contact and Wellington-region contact verified 15 July 2026 on Clean Planet's official website. General address may route through head office; review before approval."
  },
  {
    "business_name": "The House & Building Wash Company",
    "contact_name": "Mark Ridling",
    "email": "service@housewash.co.nz",
    "website": "https://www.housewash.co.nz/",
    "country": "New Zealand",
    "trade": "Exterior property cleaning",
    "source": "public_business_website",
    "subject": "Mark, would you test Churvox for 30 days?",
    "body": "Hi Mark,\n\nI came across The House & Building Wash Company and saw that your Auckland team handles residential, body corporate and commercial exterior-cleaning work.\n\nI’m inviting a small group of New Zealand trade and service businesses to test Churvox for 30 days. Churvox helps organise clients, jobs, quotes, invoices and admin preparation while the owner remains in control and approves important actions.\n\nThere’s no card required and no phone call—we can handle everything by email. I’d value straight feedback on whether it would make day-to-day job administration easier and what you would change before relying on it.\n\nWould you be open to trying it?\n\nThanks,\nHoward\nChurvox",
    "note": "Owner name and public service email verified 15 July 2026 on the company's official website."
  },
  {
    "business_name": "Lloyd Richardson Ltd",
    "contact_name": "Nick",
    "email": "nick@flick.co.nz",
    "website": "https://www.flick.co.nz/",
    "country": "New Zealand",
    "trade": "Property and facilities management",
    "source": "public_business_website",
    "subject": "Nick, could Churvox support your property-services workflow?",
    "body": "Hi Nick,\n\nI came across Lloyd Richardson and saw that your Wellington team works across residential and commercial property management, facilities management and project delivery.\n\nI’m inviting a small group of New Zealand service businesses to test Churvox for 30 days. It keeps clients, jobs, quotes, invoices and admin preparation together, with the owner reviewing and approving important actions before anything goes out.\n\nThere’s no card required and no phone call—we can handle the test by email. I’d value honest feedback on where Churvox could help a property-services workflow and where it still falls short.\n\nWould you be open to trying it?\n\nThanks,\nHoward\nChurvox",
    "note": "Director name and public business email verified 15 July 2026 on Lloyd Richardson's official website."
  },
  {
    "business_name": "Chem-Dry New Zealand",
    "contact_name": "Chem-Dry team",
    "email": "cs@chemdry.co.nz",
    "website": "https://www.chemdry.co.nz/contact",
    "country": "New Zealand",
    "trade": "Carpet cleaning and restoration",
    "source": "public_business_website",
    "subject": "Would a local Chem-Dry owner test Churvox for 30 days?",
    "body": "Hi Chem-Dry team,\n\nI saw that your New Zealand network supports local owners across carpet cleaning, flood restoration, upholstery and commercial cleaning services.\n\nI’m inviting a small group of New Zealand trade and service businesses to test Churvox for 30 days. Churvox keeps clients, jobs, quotes, invoices and admin preparation together while each business owner stays in control and approves important actions.\n\nThere’s no card required and no phone call—we can handle everything by email. Would one local owner be open to testing it and giving honest feedback about what works, what is confusing and what is still missing?\n\nThanks,\nHoward\nChurvox",
    "note": "Public customer-service email and NZ network information verified 15 July 2026 on Chem-Dry's official website. Review whether a national contact is appropriate before approval."
  }
];

function isHqPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return ['/admin', '/churvox-hq', '/admin/hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage', '/admin/qa-auditor', '/platform'].includes(path);
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function decodeBase64Url(value) {
  const normal = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normal + '='.repeat((4 - (normal.length % 4 || 4)) % 4);
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
  let escaped = '';
  bytes.forEach((byte) => { escaped += `%${byte.toString(16).padStart(2, '0')}`; });
  return decodeURIComponent(escaped);
}

function normaliseBatch(value) {
  const items = Array.isArray(value)
    ? value
    : (Array.isArray(value?.drafts)
      ? value.drafts
      : (Array.isArray(value?.prospects)
        ? value.prospects
        : (Array.isArray(value?.items) ? value.items : [])));
  if (!items.length) throw new Error('This batch does not contain any prepared drafts.');
  if (items.length > MAX_BATCH) throw new Error(`A prepared batch can contain at most ${MAX_BATCH} drafts.`);
  const invalid = items.findIndex((item) => !item || typeof item !== 'object' || Array.isArray(item));
  if (invalid >= 0) throw new Error(`Prepared draft ${invalid + 1} is invalid.`);
  return items;
}

function readPreparedBatch() {
  const hash = String(window.location.hash || '').replace(/^#/, '');
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const encoded = hash.slice(HASH_PREFIX.length);
  if (!encoded) throw new Error('The prepared draft link is empty.');
  const decoded = decodeBase64Url(encoded);
  const parsed = JSON.parse(decoded);
  return normaliseBatch(parsed);
}

function clearPreparedHash() {
  try {
    window.history.replaceState(window.history.state, document.title, `${window.location.pathname}${window.location.search}`);
  } catch {}
}

async function waitFor(selector, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const node = document.querySelector(selector);
    if (node) return node;
    await sleep(120);
  }
  return null;
}

function showFallback(message) {
  const text = String(message || 'Could not load the prepared drafts.');
  try { window.alert(text); } catch {}
}

function batchAlreadyLoaded() {
  try { return window.localStorage.getItem(BATCH_STORAGE_KEY) === '1'; } catch { return false; }
}

function markBatchLoaded() {
  try { window.localStorage.setItem(BATCH_STORAGE_KEY, '1'); } catch {}
}

function setLoadButtonState(button, state) {
  if (!button) return;
  if (state === 'loading') {
    button.disabled = true;
    button.textContent = 'Loading 5 drafts…';
    return;
  }
  if (state === 'loaded') {
    button.disabled = true;
    button.textContent = '5 drafts loaded';
    button.title = 'Batch 1 is already in Outreach';
    return;
  }
  button.disabled = false;
  button.textContent = 'Load next 5 drafts';
  button.title = 'Add five prepared tester outreach drafts';
}

async function importPreparedDrafts(value, source = 'prepared-link') {
  const drafts = normaliseBatch(value);
  const importButton = await waitFor(`#${IMPORT_BUTTON_ID}`);
  if (!importButton) {
    throw new Error('Import drafts is not available yet. Refresh Churvox HQ and try again.');
  }

  importButton.click();

  const textarea = await waitFor(`#${IMPORT_ROOT_ID} [data-adi-raw]`);
  if (!textarea) {
    throw new Error('The Import drafts panel did not open. Refresh Churvox HQ and try again.');
  }

  textarea.value = JSON.stringify({ drafts }, null, 2);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));

  const readyImport = await waitFor(`#${IMPORT_ROOT_ID} [data-action="import"]:not([disabled])`, 5000);
  if (!readyImport) {
    throw new Error('The prepared drafts loaded, but Churvox could not validate them.');
  }

  readyImport.click();

  const result = await waitFor(`#${IMPORT_ROOT_ID} .adiResult`, 15000);
  if (!result) {
    throw new Error('Churvox did not confirm the draft import.');
  }

  if (source === 'visible-button') markBatchLoaded();

  const openOutreach = document.querySelector(`#${IMPORT_ROOT_ID} [data-action="open-outreach"]`);
  if (openOutreach) {
    await sleep(500);
    openOutreach.click();
  }
}

async function processPreparedBatch() {
  if (!isHqPath()) return;
  let drafts;
  try {
    drafts = readPreparedBatch();
  } catch (error) {
    clearPreparedHash();
    showFallback(error.message);
    return;
  }
  if (!drafts) return;

  clearPreparedHash();
  try {
    await importPreparedDrafts(drafts, 'prepared-link');
  } catch (error) {
    showFallback(error.message);
  }
}

function ensureVisibleButton() {
  if (!isHqPath()) return;
  const nav = document.querySelector('.hq2Side nav');
  if (!nav) return;

  let button = document.getElementById(LOAD_BUTTON_ID);
  if (button) {
    setLoadButtonState(button, batchAlreadyLoaded() ? 'loaded' : 'ready');
    return;
  }

  const outreach = Array.from(nav.querySelectorAll('button')).find((item) =>
    String(item.textContent || '').trim().toLowerCase().startsWith('outreach')
  );
  if (!outreach) return;

  button = document.createElement('button');
  button.id = LOAD_BUTTON_ID;
  button.type = 'button';
  button.className = outreach.className;
  setLoadButtonState(button, batchAlreadyLoaded() ? 'loaded' : 'ready');

  button.addEventListener('click', async () => {
    if (button.disabled) return;
    setLoadButtonState(button, 'loading');
    try {
      await importPreparedDrafts(PREPARED_BATCH, 'visible-button');
      setLoadButtonState(button, 'loaded');
    } catch (error) {
      setLoadButtonState(button, 'ready');
      showFallback(error.message);
    }
  });

  if (outreach.nextSibling) nav.insertBefore(button, outreach.nextSibling);
  else nav.appendChild(button);
}

function schedule() {
  if (!isHqPath()) return;
  window.setTimeout(() => { processPreparedBatch().catch((error) => showFallback(error.message)); }, 250);
  [0, 400, 1000, 2200].forEach((delay) => window.setTimeout(ensureVisibleButton, delay));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  schedule();
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  window.setInterval(() => { if (isHqPath()) ensureVisibleButton(); }, 30000);
}

export {};
