const FLAG = '__CHURVOX_HQ_VERIFIED_SMALL_BUSINESS_OUTREACH__';
const VERSION = 'churvox-verified-small-business-outreach-v1-20260716';
const OUTREACH_BUTTON_ID = 'churvox-hq-tester-outreach-button';
const OUTREACH_ROOT_ID = 'churvox-hq-tester-outreach-root';
const IMPORT_BUTTON_ID = 'churvox-hq-assistant-draft-import-button';
const IMPORT_ROOT_ID = 'churvox-hq-assistant-draft-import-root';
const GUIDE_ID = 'churvox-verified-small-business-guide';
const ACTIONS_ID = 'churvox-verified-small-business-actions';
const LOAD_ID = 'churvox-load-verified-small-businesses';
const SEND_ID = 'churvox-send-verified-eligible';
const STYLE_ID = 'churvox-verified-small-business-style';
const LOADED_KEY = 'churvox-verified-small-business-11-loaded-v1';

const OPT_OUT = 'If this is not relevant, reply “no thanks” and I will not contact you again.';

const PROSPECTS = [
  {
    business_name: 'South Auckland Plumbing',
    contact_name: 'South Auckland Plumbing team',
    email: 'admin@saplumbing.co.nz',
    website: 'https://www.saplumbing.co.nz/',
    country: 'New Zealand',
    trade: 'Plumbing and gas fitting',
    source: 'public_business_website',
    send_status: 'eligible_owner_review',
    subject: 'Would South Auckland Plumbing test Churvox for 30 days?',
    body: `Hi South Auckland Plumbing team,\n\nI came across your South Auckland plumbing operation and thought Churvox may suit the way a local trade business manages clients, jobs, workers, quotes and invoices.\n\nI am inviting a small number of owner-led service businesses to test Churvox for 30 days. There is no card required and no phone call—we can handle the test by email. Churvox prepares the admin, while the owner reviews and approves important actions.\n\nI would value honest feedback on what saves time, what is confusing and what still needs improvement. Would you be open to trying it with one real job?\n\n${OPT_OUT}\n\nThanks,\nHoward\nChurvox`,
    note: 'Public business email and local trade operation verified. NZ relevance and publication conditions still require owner review before sending.'
  },
  {
    business_name: 'The House & Building Wash Company',
    contact_name: 'Mark Ridling',
    email: 'service@housewash.co.nz',
    website: 'https://www.housewash.co.nz/',
    country: 'New Zealand',
    trade: 'Exterior property cleaning',
    source: 'public_business_website',
    send_status: 'eligible_owner_review',
    subject: 'Mark, would you test Churvox with one real job?',
    body: `Hi Mark,\n\nI came across The House & Building Wash Company and saw the mix of residential, body-corporate and commercial exterior-cleaning work your Auckland team handles.\n\nI am inviting a small number of owner-led service businesses to test Churvox for 30 days. It keeps clients, jobs, workers, quotes, invoices and admin preparation together, while the owner checks and approves important actions.\n\nThere is no card required and no phone call—we can handle everything by email. I would value direct feedback on whether Churvox makes day-to-day job administration easier and what you would change before relying on it.\n\n${OPT_OUT}\n\nThanks,\nHoward\nChurvox`,
    note: 'Owner name and public service email verified on the official website. NZ send remains subject to owner relevance review.'
  },
  {
    business_name: 'Lloyd Richardson Ltd',
    contact_name: 'Nick',
    email: 'nick@flick.co.nz',
    website: 'https://www.flick.co.nz/',
    country: 'New Zealand',
    trade: 'Property and facilities services',
    source: 'public_business_website',
    send_status: 'eligible_owner_review',
    subject: 'Nick, would you test Churvox for 30 days?',
    body: `Hi Nick,\n\nI came across Lloyd Richardson and the property and facilities work your Wellington team coordinates.\n\nI am inviting a small number of owner-led service businesses to test Churvox for 30 days. Churvox keeps clients, jobs, workers, quotes, invoices and admin preparation together, with the owner reviewing and approving important actions before anything goes out.\n\nThere is no card required and no phone call—we can handle the test by email. I would value honest feedback on where Churvox helps a property-services workflow and where it still falls short.\n\n${OPT_OUT}\n\nThanks,\nHoward\nChurvox`,
    note: 'Director contact and public business email verified on the official website. NZ send remains subject to owner relevance review.'
  },
  {
    business_name: 'London Bin Cleaning',
    contact_name: 'Conan Sammon',
    email: 'info@lbcclean.co.uk',
    website: 'https://www.londonbincleaning.com/',
    country: 'United Kingdom',
    trade: 'Commercial bin and exterior cleaning',
    source: 'public_business_website',
    send_status: 'hold_uk_company_status',
    subject: 'Conan, would London Bin Cleaning test Churvox?',
    body: `Hi Conan,\n\nI came across London Bin Cleaning and saw that your team coordinates commercial bin, bin-store, chute and exterior-cleaning work across London.\n\nI am inviting a small number of owner-led service businesses to test Churvox for 30 days. Churvox helps organise clients, jobs, workers, quotes, invoices and admin preparation while the owner remains in control and approves important actions.\n\nThere is no card required and no phone call—we can handle the test by email. I would value direct feedback on whether it could support a growing mobile cleaning operation and what still needs improvement.\n\n${OPT_OUT}\n\nThanks,\nHoward\nChurvox`,
    note: 'Public email and founder context verified. HOLD: confirm the recipient is a corporate subscriber rather than a sole trader before sending.'
  },
  {
    business_name: 'Novak Brothers Landscaping',
    contact_name: 'Ben, Bryan and Zach',
    email: 'novakbrotherslandscaping@gmail.com',
    website: 'https://www.novakbrothersmidland.com/',
    country: 'United States',
    trade: 'Landscape design and construction',
    source: 'public_business_website',
    send_status: 'hold_us_postal_address',
    subject: 'Would Novak Brothers test Churvox for 30 days?',
    body: `Hi Ben, Bryan and Zach,\n\nI came across Novak Brothers Landscaping and saw that you manage design, excavation, drainage and landscape-construction work around Midland.\n\nI am inviting a small number of owner-led service businesses to test Churvox for 30 days. Churvox keeps clients, jobs, workers, quotes, invoices and admin preparation together while the owner checks and approves important actions.\n\nThere is no card required and no phone call—we can handle the test by email. I would value honest feedback on whether it makes the office side of landscaping work easier and what you would change.\n\n${OPT_OUT}\n\nThanks,\nHoward\nChurvox`,
    note: 'Public email and local landscaping operation verified. HOLD: add Churvox’s valid US postal address and final CAN-SPAM footer before sending.'
  },
  {
    business_name: 'Scrubbydubs Cleaning Service',
    contact_name: 'Lisa Mayo and Ashley Lavigne',
    email: 'support@scrubbydubscleaning.com',
    website: 'https://scrubbydubscleaning.com/',
    country: 'United States',
    trade: 'Residential and commercial cleaning',
    source: 'public_business_website',
    send_status: 'hold_us_postal_address',
    subject: 'Lisa and Ashley, would Scrubbydubs test Churvox?',
    body: `Hi Lisa and Ashley,\n\nI came across Scrubbydubs and saw that your four-person team handles residential and commercial cleaning across Midland and nearby areas.\n\nI am inviting a small number of owner-led service businesses to test Churvox for 30 days. It brings recurring jobs, clients, worker updates, quotes, invoices and admin preparation together while the owner approves important actions.\n\nThere is no card required and no phone call—we can handle everything by email. I would value honest feedback on whether the workflow suits a small growing cleaning team and what feels useful, confusing or missing.\n\n${OPT_OUT}\n\nThanks,\nHoward\nChurvox`,
    note: 'Owners, four-person team and public business email verified. HOLD: add Churvox’s valid US postal address and final CAN-SPAM footer before sending.'
  },
  {
    business_name: 'Handyman Connection of Austin — Westlake',
    contact_name: 'Danielle and Trung',
    email: 'hc3701@handymanconnection.com',
    website: 'https://handymanconnection.com/austin-westlake/',
    country: 'United States',
    trade: 'Home repair and remodeling',
    source: 'public_business_website',
    send_status: 'hold_us_postal_address',
    subject: 'Danielle and Trung, would you test Churvox for 30 days?',
    body: `Hi Danielle and Trung,\n\nI came across your Austin–Westlake operation and saw that you run a woman-owned, family-run home repair and remodeling business.\n\nI am inviting a small number of owner-led service businesses to test Churvox for 30 days. Churvox keeps clients, jobs, workers, quotes, invoices and admin preparation together while the owner checks and approves important actions.\n\nThere is no card required and no phone call—we can handle everything by email. I would value honest feedback on whether it makes repair and remodeling administration easier and what you would change before relying on it.\n\n${OPT_OUT}\n\nThanks,\nHoward\nChurvox`,
    note: 'Local owners, family-run operation and public email verified. HOLD: add Churvox’s valid US postal address and final CAN-SPAM footer before sending.'
  },
  {
    business_name: 'Dirty Time Landscaping LLC',
    contact_name: 'Dirty Time Landscaping team',
    email: 'dirtytimelandscaping@hotmail.com',
    website: 'https://www.dirtytimelandscaping.com/',
    country: 'United States',
    trade: 'Landscaping and outdoor maintenance',
    source: 'public_business_website',
    send_status: 'hold_us_postal_address',
    subject: 'Would Dirty Time Landscaping test Churvox?',
    body: `Hi Dirty Time Landscaping team,\n\nI came across your Port Austin landscaping business and the local outdoor work you coordinate.\n\nI am inviting a small number of owner-led service businesses to test Churvox for 30 days. Churvox keeps clients, jobs, worker updates, quotes, invoices and admin preparation in one place while the owner approves important actions.\n\nThere is no card required and no phone call—we can handle the test by email. I would value honest feedback on whether it reduces double handling and what a small landscaping business would still need.\n\n${OPT_OUT}\n\nThanks,\nHoward\nChurvox`,
    note: 'Public business email and local contact details verified on the official website. HOLD: add Churvox’s valid US postal address and final CAN-SPAM footer before sending.'
  },
  {
    business_name: 'Esch Landscaping LLC',
    contact_name: 'Matt and Lisa Esch',
    email: 'info@eschlandscaping.com',
    website: 'https://www.eschlandscaping.com/',
    country: 'United States',
    trade: 'Landscape construction and maintenance',
    source: 'public_business_website',
    send_status: 'hold_us_postal_address',
    subject: 'Matt and Lisa, would Esch Landscaping test Churvox?',
    body: `Hi Matt and Lisa,\n\nI came across Esch Landscaping and saw the mix of design-and-build, maintenance, construction and seasonal work your team manages.\n\nI am inviting a small number of owner-led service businesses to test Churvox for 30 days. It keeps clients, jobs, workers, quotes, invoices and admin preparation together while the owner remains in control and approves important actions.\n\nThere is no card required and no phone call—we can handle everything by email. I would value direct feedback on whether Churvox can simplify the office side of a multi-service landscaping operation.\n\n${OPT_OUT}\n\nThanks,\nHoward\nChurvox`,
    note: 'Public business email and owner-led landscaping context verified. HOLD: add Churvox’s valid US postal address and final CAN-SPAM footer before sending.'
  },
  {
    business_name: 'Gentner Excavating LLC',
    contact_name: 'Raymond and Martin Gentner',
    email: 'gentner1ac@hotmail.com',
    website: 'https://gentnerexcavating.com/',
    country: 'United States',
    trade: 'Excavating, trucking and site services',
    source: 'public_business_website',
    send_status: 'hold_us_postal_address',
    subject: 'Raymond and Martin, would Gentner Excavating test Churvox?',
    body: `Hi Raymond and Martin,\n\nI came across Gentner Excavating and saw that your family-run operation coordinates excavating, trucking, aggregate, tiling and seasonal work.\n\nI am inviting a small number of owner-led service businesses to test Churvox for 30 days. Churvox keeps clients, jobs, crews, quotes, invoices and admin preparation together, with the owner reviewing important actions before anything moves.\n\nThere is no card required and no phone call—we can handle the test by email. I would value honest feedback on whether Churvox could make crew and job administration easier and where it still falls short.\n\n${OPT_OUT}\n\nThanks,\nHoward\nChurvox`,
    note: 'Family operators and public business email verified on the official website. HOLD: add Churvox’s valid US postal address and final CAN-SPAM footer before sending.'
  },
  {
    business_name: 'Envisioning Green',
    contact_name: 'Steven and Erika Johns',
    email: 'info@envisioninggreen.com',
    website: 'https://envisioninggreen.com/',
    country: 'United States',
    trade: 'Outdoor living design and construction',
    source: 'public_business_website',
    send_status: 'hold_us_postal_address',
    subject: 'Steven and Erika, would Envisioning Green test Churvox?',
    body: `Hi Steven and Erika,\n\nI came across Envisioning Green and saw that your husband-and-wife team manages custom outdoor-living design and construction projects around Caseyville.\n\nI am inviting a small number of owner-led service businesses to test Churvox for 30 days. Churvox brings clients, jobs, workers, quotes, variations, invoices and admin preparation together while the owner checks and approves important actions.\n\nThere is no card required and no phone call—we can handle everything by email. I would value honest feedback on whether Churvox suits project-based outdoor work and what would make it genuinely useful to your team.\n\n${OPT_OUT}\n\nThanks,\nHoward\nChurvox`,
    note: 'Owners, local project model and public business email verified. HOLD: add Churvox’s valid US postal address and final CAN-SPAM footer before sending.'
  }
];

const ALL_EMAILS = PROSPECTS.map((item) => item.email.toLowerCase());
const ELIGIBLE_EMAILS = PROSPECTS.filter((item) => item.send_status === 'eligible_owner_review').map((item) => item.email.toLowerCase());
const HOLD_REASON = new Map(PROSPECTS.filter((item) => item.send_status !== 'eligible_owner_review').map((item) => [
  item.email.toLowerCase(),
  item.send_status === 'hold_us_postal_address' ? 'US postal address required' : 'UK company status review'
]));

let importing = false;
let sending = false;

function isHqPath() {
  const path = String(window.location.pathname || '').toLowerCase();
  return ['/admin', '/churvox-hq', '/admin/hq', '/owner/dashboard', '/platform-dashboard', '/app-owner', '/admin/usage', '/admin/qa-auditor', '/platform'].includes(path);
}

function sleep(ms) { return new Promise((resolve) => window.setTimeout(resolve, ms)); }

async function waitFor(selector, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const node = document.querySelector(selector);
    if (node) return node;
    await sleep(120);
  }
  return null;
}

function root() { return document.getElementById(OUTREACH_ROOT_ID); }
function canonical(value) { return String(value || '').trim().toLowerCase(); }

function rowFor(email) {
  const target = canonical(email);
  return Array.from(root()?.querySelectorAll('.htoRow') || []).find((row) => canonical(row.textContent).includes(target)) || null;
}

function loadedCount() { return ALL_EMAILS.filter((email) => rowFor(email)).length; }

function eligibleDraftRows() {
  return ELIGIBLE_EMAILS.map((email) => ({ email, row: rowFor(email) })).filter(({ row }) => {
    const status = canonical(row.querySelector('.htoStatus')?.textContent).replace(/\s+/g, '_');
    return status === 'draft' && Boolean(row.querySelector('[data-row-action="send"]'));
  });
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #churvox-hq-one-place-guide,#churvox-hq-bulk-send-prepared-button,#churvox-hq-desk-load-all-button,#churvox-hq-load-next-five-button{display:none!important}
    #${GUIDE_ID}{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:17px 18px;border:1px solid #fed7aa;border-radius:18px;background:linear-gradient(135deg,#fff7ed,#fff 68%);box-shadow:0 8px 22px rgba(124,45,18,.07)}
    #${GUIDE_ID} h3{margin:0 0 5px;color:#111827;font-size:18px;letter-spacing:-.035em}
    #${GUIDE_ID} p{margin:0;color:#64748b;font-size:12px;font-weight:750;line-height:1.45}
    #${GUIDE_ID} .cvVerifiedCounts{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
    #${GUIDE_ID} .cvVerifiedCounts span{padding:6px 9px;border:1px solid #e2e8f0;border-radius:999px;background:#fff;color:#334155;font-size:10px;font-weight:900}
    #${GUIDE_ID} .cvVerifiedCounts .ready{border-color:#bbf7d0;background:#f0fdf4;color:#166534}
    #${GUIDE_ID} .cvVerifiedCounts .hold{border-color:#fde68a;background:#fffbeb;color:#92400e}
    #${ACTIONS_ID}{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
    #${ACTIONS_ID} button{min-height:42px;border:0;border-radius:12px;padding:10px 13px;font-weight:950;cursor:pointer}
    #${LOAD_ID}{background:#111827;color:#fff}
    #${SEND_ID}{background:#f97316;color:#111827}
    #${ACTIONS_ID} button:disabled{opacity:.55;cursor:not-allowed}
    .cvOutreachComplianceHold{display:inline-flex;margin-top:5px;padding:4px 7px;border:1px solid #fde68a;border-radius:999px;background:#fffbeb;color:#92400e;font-size:9px;font-weight:950}
    @media(max-width:820px){#${GUIDE_ID}{grid-template-columns:1fr}#${ACTIONS_ID}{justify-content:flex-start}}
  `;
  document.head.appendChild(style);
}

function ensureGuide() {
  const body = root()?.querySelector('.htoBody');
  if (!body) return null;
  let guide = document.getElementById(GUIDE_ID);
  if (!guide) {
    guide = document.createElement('section');
    guide.id = GUIDE_ID;
    guide.innerHTML = `
      <div>
        <h3>Verified small-business outreach</h3>
        <p>11 public business emails are verified. Only the 3 New Zealand drafts can enter bulk approval. The US and UK records stay blocked until their listed compliance checks are complete. Australia has not been loaded because no consent-safe public-email match was verified.</p>
        <div class="cvVerifiedCounts">
          <span>NZ 3</span><span>US 7</span><span>UK 1</span><span>AU 0 verified</span>
          <span class="ready">3 ready for owner review</span><span class="hold">8 held from sending</span>
        </div>
      </div>
      <div id="${ACTIONS_ID}"></div>`;
  }
  if (guide.parentElement !== body || guide !== body.firstElementChild) body.insertBefore(guide, body.firstChild);
  return guide;
}

async function openOutreach() {
  if (!root()?.classList.contains('open')) document.getElementById(OUTREACH_BUTTON_ID)?.click();
  await waitFor(`#${OUTREACH_ROOT_ID}.open`, 10000);
  const search = root()?.querySelector('[data-query]');
  if (search?.value) {
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

async function importProspects() {
  if (importing) return;
  importing = true;
  sync();
  try {
    const importButton = await waitFor(`#${IMPORT_BUTTON_ID}`);
    if (!importButton) throw new Error('Import drafts is not available yet. Refresh Churvox HQ and try again.');
    importButton.click();
    const textarea = await waitFor(`#${IMPORT_ROOT_ID} [data-adi-raw]`);
    if (!textarea) throw new Error('The import panel did not open.');
    textarea.value = JSON.stringify({ drafts: PROSPECTS }, null, 2);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    const ready = await waitFor(`#${IMPORT_ROOT_ID} [data-action="import"]:not([disabled])`, 6000);
    if (!ready) throw new Error('Churvox could not validate the verified prospect pack.');
    ready.click();
    const result = await waitFor(`#${IMPORT_ROOT_ID} .adiResult`, 20000);
    if (!result) throw new Error('Churvox did not confirm the draft import.');
    try { window.localStorage.setItem(LOADED_KEY, '1'); } catch {}
    await sleep(400);
    await openOutreach();
    root()?.querySelector('[data-action="refresh"]')?.click();
    window.alert('11 verified small-business prospects were loaded as drafts. Nothing was sent. Three NZ drafts are available for owner review; eight remain compliance-held.');
  } catch (error) {
    window.alert(error?.message || 'The verified prospect pack could not be loaded.');
  } finally {
    importing = false;
    window.setTimeout(sync, 250);
  }
}

function applyHolds() {
  HOLD_REASON.forEach((reason, email) => {
    const row = rowFor(email);
    if (!row) return;
    const send = row.querySelector('[data-row-action="send"]');
    if (send) {
      send.disabled = true;
      send.title = `Compliance hold: ${reason}`;
      send.dataset.churvoxComplianceHold = VERSION;
    }
    let badge = row.querySelector('.cvOutreachComplianceHold');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'cvOutreachComplianceHold';
      row.querySelector('.htoRowMain, .htoRowBody, div')?.appendChild(badge);
    }
    if (badge.textContent !== `Hold · ${reason}`) badge.textContent = `Hold · ${reason}`;
  });
}

function postmarkUnavailable() {
  return Array.from(root()?.querySelectorAll('.htoNotice.bad') || []).some((notice) => /postmark sending is not configured/i.test(String(notice.textContent || '')));
}

async function waitForSendResult(email, timeoutMs = 35000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const row = rowFor(email);
    const status = canonical(row?.querySelector('.htoStatus')?.textContent).replace(/\s+/g, '_');
    if (status && status !== 'draft') return status;
    await sleep(220);
  }
  return '';
}

async function sendEligible() {
  if (sending) return;
  await openOutreach();
  const targets = eligibleDraftRows();
  if (!targets.length) {
    window.alert('There are no eligible verified drafts waiting for approval. Held US and UK drafts will not send.');
    return;
  }
  if (postmarkUnavailable()) {
    window.alert('Postmark sending is not configured, so the emails cannot be sent yet.');
    return;
  }
  const approved = window.confirm(`Approve and send ${targets.length} verified New Zealand tester emails now?\n\nThe 7 US and 1 UK drafts remain blocked. This does not grant tester access.`);
  if (!approved) return;
  sending = true;
  sync();
  const sent = [];
  const failed = [];
  try {
    for (const target of targets) {
      const send = target.row?.querySelector('[data-row-action="send"]');
      if (!send || send.disabled) { failed.push(target.email); continue; }
      send.click();
      const status = await waitForSendResult(target.email);
      if (status === 'sent') sent.push(target.email); else failed.push(target.email);
      await sleep(250);
    }
  } finally {
    sending = false;
    sync();
  }
  window.alert(failed.length
    ? `${sent.length} sent. ${failed.length} failed or were not confirmed and remain for review.`
    : `All ${sent.length} eligible NZ emails were sent. The eight compliance-held drafts were untouched.`);
}

function syncButtons() {
  const guide = ensureGuide();
  const actions = guide?.querySelector(`#${ACTIONS_ID}`);
  if (!actions) return;
  let load = document.getElementById(LOAD_ID);
  if (!load) {
    load = document.createElement('button');
    load.id = LOAD_ID;
    load.type = 'button';
    load.addEventListener('click', () => importProspects());
    actions.appendChild(load);
  }
  const count = loadedCount();
  load.disabled = importing || count === ALL_EMAILS.length;
  load.textContent = importing ? 'Loading verified drafts…' : count === ALL_EMAILS.length ? 'All 11 verified drafts loaded' : `Load verified 11 drafts${count ? ` (${count}/11 found)` : ''}`;

  let send = document.getElementById(SEND_ID);
  if (!send) {
    send = document.createElement('button');
    send.id = SEND_ID;
    send.type = 'button';
    send.addEventListener('click', () => sendEligible());
    actions.appendChild(send);
  }
  const ready = eligibleDraftRows().length;
  send.disabled = sending || ready === 0 || postmarkUnavailable();
  send.textContent = sending ? 'Sending approved NZ drafts…' : ready ? `Approve & send eligible (${ready})` : 'No eligible drafts waiting';
  send.title = 'Only verified NZ drafts are included. US and UK records remain blocked.';
}

function updateCopy() {
  const outreach = root();
  if (!outreach) return;
  const head = outreach.querySelector('.htoHead');
  const small = head?.querySelector('small');
  const title = head?.querySelector('h2');
  const description = head?.querySelector('p');
  if (small) small.textContent = 'Verified prospects · email only · owner approval';
  if (title) title.textContent = 'Small-business tester outreach';
  if (description) description.textContent = 'Load verified drafts, review the wording and approve only the eligible list. Compliance-held businesses cannot be sent accidentally.';
}

function sync() {
  if (!isHqPath()) return;
  installStyle();
  const outreach = root();
  if (!outreach) return;
  updateCopy();
  ensureGuide();
  applyHolds();
  syncButtons();
  window.__CHURVOX_DEPLOY_BUILD__ = VERSION;
}

function schedule() {
  if (!isHqPath()) return;
  [0, 150, 400, 900, 1800, 3500, 7000].forEach((delay) => window.setTimeout(sync, delay));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[FLAG]) {
  window[FLAG] = VERSION;
  schedule();
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('churvox-auth-state', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  const observer = new MutationObserver(() => window.setTimeout(sync, 80));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(sync, 4000);
}

export {};
