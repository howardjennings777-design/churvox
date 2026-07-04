const STYLE_ID = 'option-f-decided-pages-style';
const LAYER_ID = 'churvox-decided-page-layer';

const pages = {
  aiguide: {
    kicker: 'SMART HUB / AI GUIDE',
    title: 'Run the business from one clear starting point.',
    text: 'Setup, first jobs, worker app, pricing, billing and owner approval basics stay here. Churvox prepares the admin. You approve.',
    tools: ['Open Command', 'Add first job', 'Setup guide'],
    cards: [
      ['Today check', 'Jobs moving, money due, worker messages and missing details surface here.'],
      ['First setup', 'Clients, jobs, workers, pricing, billing and approval rules are checked before launch.'],
      ['Admin engine', 'Anything risky is prepared and sent to Command instead of being auto-run.'],
    ],
  },
  command: {
    kicker: 'OWNER APPROVAL DESK',
    title: 'Approve, edit or park. Nowhere else.',
    text: 'Command is the single decision desk. Other pages can show records, but owner approval actions belong here.',
    tools: ['Approve', 'Edit', 'Park'],
    cards: [
      ['Waiting for approval', 'Draft invoices, quote follow-ups, missing job info and risky money actions queue here.'],
      ['Approval slip', 'Each item should open as a filled form so the owner can quickly check and decide.'],
      ['Command memory', 'Approved, edited and parked decisions should feed back into jobs, clients, quotes and invoices.'],
    ],
  },
  jobs: {
    kicker: 'JOBS DESK',
    title: 'Jobs are for work records, not approval clutter.',
    text: 'Jobs need clean cards and editable job forms with client, site, service, worker, price, date, time and repeat frequency.',
    tools: ['Add job', 'Recurring', 'Import jobs'],
    cards: [
      ['Editable job form', 'Price, date, time, service, assigned worker, billing type and weekly/fortnightly/monthly/custom repeat.'],
      ['Proof and status', 'Assigned, acknowledged, in progress, proof ready, completed and needs check.'],
      ['Recurring lives here', 'Recurring is part of Jobs, not a separate sidebar page.'],
    ],
  },
  clients: {
    kicker: 'CLIENT WORKBENCH',
    title: 'Clients need proper records and memory.',
    text: 'Add client, CSV import/export, saved service notes, price memory, address, job history and editable client form.',
    tools: ['Add client', 'CSV import', 'Export'],
    cards: [
      ['Client form', 'Name, phone, email, address, preferred service, saved price, schedule and access notes.'],
      ['Service memory', 'Job history, notes, repeat service and pricing memory stay connected to the client.'],
      ['Fast import', 'Client CSV import must be visible and useful.'],
    ],
  },
  quotes: {
    kicker: 'QUOTE PIPELINE',
    title: 'Quotes should move cleanly from draft to job.',
    text: 'Draft, sent, viewed and accepted quotes need follow-up and conversion without clutter.',
    tools: ['New quote', 'Follow-ups', 'Convert accepted'],
    cards: [
      ['Draft quote', 'Scope, price, terms, client and next step are clear.'],
      ['Follow-up ready', 'Churvox can prepare the follow-up, but owner sending stays controlled.'],
      ['Accepted to job', 'Accepted quotes should turn into jobs with details carried through.'],
    ],
  },
  invoices: {
    kicker: 'MONEY DESK',
    title: 'Invoices show money state clearly.',
    text: 'Drafts, due today, overdue, paid and sync-ready invoices need owner review before sending or syncing.',
    tools: ['New invoice', 'Review drafts', 'Open Xero'],
    cards: [
      ['Draft invoices', 'Prepared from job, client, worker time, proof and price details.'],
      ['Due and overdue', 'Money due should be obvious without hunting through records.'],
      ['Paid check', 'Only mark paid after accounting refresh confirms paid.'],
    ],
  },
  team: {
    kicker: 'TEAM CONTROL',
    title: 'Staff, roles and app access stay tidy.',
    text: 'Owners need a clean team page for staff, subcontractors, invites, roles and worker app access.',
    tools: ['Add staff', 'Invite worker', 'CSV import'],
    cards: [
      ['Roles', 'Owner, manager, worker, subcontractor and payroll-only access stay separate.'],
      ['Worker invite', 'New staff should get the right app access without seeing owner-only areas.'],
      ['Staff records', 'Contact info, role, access and active/inactive state are easy to manage.'],
    ],
  },
  payroll: {
    kicker: 'PAYROLL REVIEW',
    title: 'Payroll is review and export only.',
    text: 'Use worker time logs and slips to review pay periods. No tax filing and no bank payout files.',
    tools: ['Weekly', 'Fortnightly', 'Export CSV'],
    cards: [
      ['Timesheets', 'Worker start, pause, resume, complete and manual adjustments feed review.'],
      ['Pay period', 'Weekly, fortnightly and monthly views should be selectable.'],
      ['No government filing', 'Churvox does not submit taxes or create bank payout files.'],
    ],
  },
  workers: {
    kicker: 'WORKER FIELD VIEW',
    title: 'Workers page owns maps, GPS and field activity.',
    text: 'Google Maps, current jobs, proof, messages, worker status and timesheets belong here.',
    tools: ['Open map', 'Worker jobs', 'Messages'],
    cards: [
      ['Google Maps GPS', 'Maps live on Workers, not inside Jobs.'],
      ['Worker app', 'Simple job instructions, directions, messages, start and finish flow.'],
      ['Proof and notes', 'Photos, notes, issues and completion details return to the owner desk.'],
    ],
  },
  xero: {
    kicker: 'ACCOUNTING HANDOFF',
    title: 'Xero stays draft-sync only and owner-approved.',
    text: 'No automatic invoice sending, no tax filing, no payout files. Risky accounting decisions stay in Command.',
    tools: ['Connect setup', 'Refresh status', 'Sync latest draft'],
    cards: [
      ['Draft invoices only', 'Invoices are prepared as drafts before accounting sync.'],
      ['Owner-approved sync', 'Approval and sync decisions remain in Command.'],
      ['Paid status guard', 'Only mark paid after accounting refresh confirms paid.'],
    ],
  },
  settings: {
    kicker: 'BUSINESS CONTROLS',
    title: 'Settings should be practical and clean.',
    text: 'Business branding, logo, GST, country, notifications, security and owner setup belong here.',
    tools: ['Business branding', 'Security', 'Save settings'],
    cards: [
      ['Business details', 'Business name, email, logo, country and GST rate.'],
      ['Notifications', 'Owner and worker notification controls stay simple.'],
      ['Security', 'Account, password, data and access controls are easy to find.'],
    ],
  },
  plans: {
    kicker: 'PLANS AND BILLING',
    title: 'Locked pricing, real billing and no hidden changes.',
    text: 'Start $39, Crew $89, Operator $149, Command $299, Growth Pack $99, Accounting Sync Add-on $39 plus GST.',
    tools: ['Refresh billing', 'Manage billing', 'View usage'],
    cards: [
      ['Current plan', 'Show the live current plan clearly. Command should show as current when active.'],
      ['Usage', 'Clients, jobs this month, AI actions and active team usage.'],
      ['Stripe checkout', 'Checkout opens only when a real owner chooses it.'],
    ],
  },
  support: {
    kicker: 'HELP DESK',
    title: 'Support should route the owner to the right fix.',
    text: 'Setup help, imports, payroll, plans, security, Xero and Command guidance stay visible.',
    tools: ['New ticket', 'Open Command', 'Email support'],
    cards: [
      ['Setup help', 'First setup and missing business details.'],
      ['Accounting sync help', 'Xero/MYOB draft sync rules and guardrails.'],
      ['Contact', 'hello@churvox.com for support.'],
    ],
  },
};

function pageKey() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash && pages[hash]) return hash;
  if (/\/plans\/?$/i.test(window.location.pathname || '')) return 'plans';
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  const text = (active?.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (text === 'aiguide') return 'aiguide';
  return pages[text] ? text : 'aiguide';
}

function style() {
  if (document.getElementById(STYLE_ID)) return;
  const node = document.createElement('style');
  node.id = STYLE_ID;
  node.textContent = `
    #${LAYER_ID}{grid-column:1/-1!important;display:grid!important;gap:12px!important;margin:0 0 4px!important;order:-50!important}
    #${LAYER_ID} .decidedHero{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:16px!important;align-items:end!important;min-height:150px!important;border-radius:18px!important;padding:20px!important;color:#fff!important;background:radial-gradient(circle at 88% 18%,rgba(240,100,47,.38),transparent 30%),linear-gradient(135deg,#101513,#1b2220 60%,#ef553c)!important;box-shadow:0 15px 34px rgba(16,21,19,.14)!important;overflow:hidden!important}
    #${LAYER_ID} .decidedHero small{display:inline-flex!important;width:max-content!important;border-radius:999px!important;background:rgba(255,255,255,.13)!important;padding:6px 10px!important;color:#ffd7c6!important;font-size:10px!important;font-weight:950!important;letter-spacing:.08em!important;text-transform:uppercase!important}
    #${LAYER_ID} .decidedHero h2{margin:8px 0 7px!important;color:#fff!important;font-size:30px!important;line-height:.95!important;font-weight:950!important;letter-spacing:-.055em!important}
    #${LAYER_ID} .decidedHero p{margin:0!important;color:rgba(255,255,255,.86)!important;font-size:13px!important;font-weight:850!important;max-width:850px!important}
    #${LAYER_ID} .decidedTools{display:flex!important;flex-wrap:wrap!important;gap:8px!important;justify-content:flex-end!important}
    #${LAYER_ID} .decidedTools button{border:0!important;border-radius:999px!important;padding:10px 14px!important;background:#fff!important;color:#101513!important;font-size:12px!important;font-weight:950!important;white-space:nowrap!important;cursor:pointer!important}
    #${LAYER_ID} .decidedTools button:first-child{background:#ef553c!important;color:#fff!important;box-shadow:0 10px 22px rgba(239,85,60,.28)!important}
    #${LAYER_ID} .decidedCards{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important}
    #${LAYER_ID} .decidedCard{min-height:120px!important;border:1px solid rgba(16,21,19,.08)!important;border-radius:16px!important;background:rgba(255,255,255,.78)!important;padding:16px!important;box-shadow:0 12px 28px rgba(16,21,19,.06)!important;overflow:hidden!important;position:relative!important}
    #${LAYER_ID} .decidedCard:before{content:""!important;position:absolute!important;inset:0 0 auto!important;height:5px!important;background:#ef553c!important}
    #${LAYER_ID} .decidedCard b{display:block!important;margin:4px 0 7px!important;color:#111815!important;font-size:15px!important;font-weight:950!important;letter-spacing:-.02em!important}
    #${LAYER_ID} .decidedCard span{display:block!important;color:#44504c!important;font-size:12px!important;font-weight:800!important;line-height:1.4!important}
    @media(max-width:980px){#${LAYER_ID} .decidedHero,#${LAYER_ID} .decidedCards{grid-template-columns:1fr!important}#${LAYER_ID} .decidedTools{justify-content:flex-start!important}}
  `;
  document.head.appendChild(node);
}

function htmlFor(page) {
  const item = pages[page] || pages.aiguide;
  return `
    <section class="decidedHero">
      <div><small>${item.kicker}</small><h2>${item.title}</h2><p>${item.text}</p></div>
      <div class="decidedTools">${item.tools.map((tool) => `<button type="button">${tool}</button>`).join('')}</div>
    </section>
    <section class="decidedCards">${item.cards.map(([title, text]) => `<article class="decidedCard"><b>${title}</b><span>${text}</span></article>`).join('')}</section>
  `;
}

function mount() {
  style();
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  const page = pageKey();
  let layer = document.getElementById(LAYER_ID);
  if (!layer) {
    layer = document.createElement('div');
    layer.id = LAYER_ID;
    root.prepend(layer);
  }
  if (layer.dataset.page !== page) {
    layer.dataset.page = page;
    layer.innerHTML = htmlFor(page);
  }
}

function schedule() {
  window.requestAnimationFrame(() => setTimeout(mount, 80));
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', schedule);
  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  document.addEventListener('click', schedule, true);
  setInterval(schedule, 900);
  schedule();
}

export {};
