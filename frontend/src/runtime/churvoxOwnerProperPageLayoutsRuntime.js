// Proper owner page layouts.
// One authoritative layout per owner page: records/workspaces outside Command, approvals only inside Command.

const ID = 'churvox-owner-proper-page-layout';
const STYLE_ID = 'churvox-owner-proper-page-style';
const SLIP_ID = 'churvox-owner-proper-page-slip';
const STORE_KEY = 'churvox.command.prepared.v1';

const LABELS = {
  aiguide: 'AI Guide', command: 'Command', jobs: 'Jobs', clients: 'Clients', workers: 'Workers', quotes: 'Quotes', invoices: 'Invoices',
  team: 'Team', payroll: 'Payroll', xero: 'Xero', settings: 'Settings', plans: 'Plans', support: 'Support', messages: 'Messages',
};

const PAGES = Object.keys(LABELS);

function pageKey() {
  const raw = String(window.location.hash || '').replace('#', '').toLowerCase() || 'aiguide';
  const aliases = {
    today: 'aiguide', dashboard: 'aiguide', setup: 'aiguide', setupassistant: 'aiguide', firstrun: 'aiguide', guide: 'aiguide', 'ai-guide': 'aiguide', 'smart-hub': 'aiguide',
    help: 'support', inbox: 'messages', 'command-desk': 'command', 'command-board': 'command',
  };
  return aliases[raw] || raw;
}

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function readPrepared() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]').filter(Boolean); } catch (_) { return []; }
}

function writePrepared(items) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(items.slice(0, 30))); } catch (_) {}
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .churvoxOptionC[data-proper-pages="true"] #churvox-owner-core-clean-layout,
    .churvoxOptionC[data-proper-pages="true"] #churvox-owner-lite-clean{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;opacity:0!important}
    .churvoxOptionC[data-proper-pages="true"] .cocPage>[data-proper-hidden="true"]{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;opacity:0!important}
    #${ID}{grid-column:1/-1!important;display:grid!important;gap:14px!important;color:#111815!important;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important}
    #${ID} *{box-sizing:border-box!important}
    #${ID} .properHero{position:relative!important;overflow:hidden!important;display:grid!important;grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr)!important;gap:14px!important;border-radius:24px!important;background:linear-gradient(118deg,#101513 0%,#1d2823 58%,#ef553c 100%)!important;color:#fff!important;padding:20px!important;box-shadow:0 22px 58px rgba(16,21,19,.18)!important}
    #${ID} .properHero:after{content:''!important;position:absolute!important;inset:auto -45px -70px auto!important;width:230px!important;height:230px!important;border-radius:999px!important;background:radial-gradient(circle,rgba(255,255,255,.18),rgba(255,255,255,0) 65%)!important;pointer-events:none!important}
    #${ID} .eyebrow{display:inline-flex!important;align-items:center!important;width:max-content!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:999px!important;background:rgba(255,255,255,.1)!important;color:#ffd7c6!important;padding:6px 9px!important;font-size:10px!important;font-weight:950!important;letter-spacing:.1em!important;text-transform:uppercase!important;margin-bottom:10px!important}
    #${ID} h1{margin:0!important;color:#fff!important;font-size:clamp(29px,4vw,46px)!important;line-height:.94!important;font-weight:950!important;letter-spacing:-.06em!important}
    #${ID} .properHero p{max-width:760px!important;margin:10px 0 0!important;color:rgba(255,255,255,.84)!important;font-size:13px!important;font-weight:850!important;line-height:1.45!important}
    #${ID} .heroStack{position:relative!important;z-index:1!important;display:grid!important;gap:9px!important;align-content:start!important}
    #${ID} .heroStat{border:1px solid rgba(255,255,255,.15)!important;border-radius:16px!important;background:rgba(255,255,255,.105)!important;padding:12px!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)!important}
    #${ID} .heroStat b{display:block!important;color:#fff!important;font-size:18px!important;font-weight:950!important;line-height:1!important}#${ID} .heroStat span{display:block!important;margin-top:5px!important;color:rgba(255,255,255,.76)!important;font-size:11px!important;font-weight:850!important;line-height:1.25!important}
    #${ID} .properBody{display:grid!important;grid-template-columns:1.02fr .98fr!important;gap:14px!important;align-items:start!important}
    #${ID} .panel{border:1px solid rgba(16,21,19,.08)!important;border-radius:20px!important;background:#fff!important;box-shadow:0 16px 34px rgba(16,21,19,.06)!important;padding:15px!important;display:grid!important;gap:11px!important;min-width:0!important}
    #${ID} .panel.soft{background:#f7f8f4!important}#${ID} .panel.dark{background:#111815!important;color:#fff!important}#${ID} .panel.orange{background:linear-gradient(135deg,#fff7f0,#fff)!important;border-color:rgba(239,85,60,.18)!important}
    #${ID} .panel h2,#${ID} .panel h3{margin:0!important;color:#111815!important;font-size:20px!important;line-height:1.05!important;font-weight:950!important;letter-spacing:-.035em!important}#${ID} .panel.dark h2,#${ID} .panel.dark h3{color:#fff!important}
    #${ID} .panel p{margin:0!important;color:#52605a!important;font-size:12px!important;font-weight:850!important;line-height:1.45!important}#${ID} .panel.dark p{color:rgba(255,255,255,.75)!important}
    #${ID} .span2{grid-column:1/-1!important}.tight{gap:8px!important}
    #${ID} .chips{display:flex!important;gap:7px!important;flex-wrap:wrap!important}#${ID} .chip{display:inline-flex!important;align-items:center!important;gap:6px!important;border-radius:999px!important;background:#f0f3ef!important;color:#111815!important;padding:7px 9px!important;font-size:11px!important;font-weight:950!important}#${ID} .chip.orange{background:#fff0e8!important;color:#b9381e!important}#${ID} .chip.dark{background:#111815!important;color:#fff!important}
    #${ID} .rows{display:grid!important;gap:8px!important;max-height:360px!important;overflow:auto!important;scrollbar-width:thin!important}#${ID} .row{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;gap:9px!important;align-items:center!important;border:1px solid rgba(16,21,19,.075)!important;border-radius:14px!important;background:#fff!important;padding:10px!important;min-height:54px!important}#${ID} .row i{width:10px!important;height:10px!important;border-radius:999px!important;background:#ef553c!important;box-shadow:0 0 0 4px rgba(239,85,60,.08)!important}#${ID} .row b{display:block!important;color:#111815!important;font-size:13px!important;font-weight:950!important;line-height:1.15!important}#${ID} .row span{display:block!important;color:#52605a!important;font-size:11px!important;font-weight:850!important;line-height:1.3!important}#${ID} .tag{white-space:nowrap!important;border-radius:999px!important;background:#f0f3ef!important;color:#52605a!important;padding:5px 7px!important;font-size:9px!important;font-weight:950!important;text-transform:uppercase!important}#${ID} .tag.hot{background:#fff0e8!important;color:#b9381e!important}.tag.ok{background:#eaf8ef!important;color:#206b3c!important}
    #${ID} .calendar{display:grid!important;grid-template-columns:86px 1fr!important;gap:8px!important}.slot{display:grid!important;grid-template-columns:86px 1fr!important;gap:10px!important;align-items:stretch!important}.time{border-radius:13px!important;background:#111815!important;color:#fff!important;padding:10px!important;text-align:center!important;font-size:12px!important;font-weight:950!important}.jobBlock{border:1px solid rgba(16,21,19,.08)!important;border-radius:15px!important;background:#fff!important;padding:11px!important;display:grid!important;gap:5px!important}.jobBlock b{font-size:14px!important;font-weight:950!important}.jobBlock span{font-size:11px!important;color:#52605a!important;font-weight:850!important}
    #${ID} .pipeline{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important}.lane{border:1px solid rgba(16,21,19,.08)!important;border-radius:16px!important;background:#f7f8f4!important;padding:10px!important;display:grid!important;gap:8px!important;align-content:start!important}.lane h3{font-size:14px!important}.lane .mini{border-radius:12px!important;background:#fff!important;border:1px solid rgba(16,21,19,.06)!important;padding:9px!important;display:grid!important;gap:4px!important}.mini b{font-size:12px!important}.mini span{font-size:10px!important;color:#52605a!important;font-weight:850!important}
    #${ID} .moneyGrid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important}.moneyTile{border-radius:17px!important;background:#111815!important;color:#fff!important;padding:13px!important;display:grid!important;gap:6px!important}.moneyTile:nth-child(even){background:#ef553c!important}.moneyTile b{font-size:20px!important;font-weight:950!important}.moneyTile span{font-size:11px!important;font-weight:850!important;color:rgba(255,255,255,.78)!important}
    #${ID} .mapPanel{min-height:270px!important;border-radius:20px!important;background:linear-gradient(135deg,#1b2a25,#0f1512)!important;position:relative!important;overflow:hidden!important;border:1px solid rgba(16,21,19,.1)!important}.mapPanel:before{content:''!important;position:absolute!important;inset:20px!important;border-radius:999px!important;border:2px dashed rgba(255,255,255,.15)!important}.pin{position:absolute!important;border-radius:999px!important;background:#ef553c!important;color:#fff!important;padding:7px 9px!important;font-size:10px!important;font-weight:950!important;box-shadow:0 12px 24px rgba(0,0,0,.22)!important}.pin.one{left:18%;top:28%}.pin.two{right:22%;top:42%}.pin.three{left:44%;bottom:22%}
    #${ID} .formGrid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.field{display:grid!important;gap:5px!important}.field label{font-size:10px!important;text-transform:uppercase!important;letter-spacing:.04em!important;color:#52605a!important;font-weight:950!important}.fakeInput{border:1px solid rgba(16,21,19,.1)!important;border-radius:13px!important;background:#fff!important;color:#111815!important;padding:10px!important;font-size:12px!important;font-weight:900!important;min-height:38px!important}
    #${ID} .planGrid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important}.plan{border:1px solid rgba(16,21,19,.08)!important;border-radius:18px!important;background:#fff!important;padding:13px!important;display:grid!important;gap:8px!important}.plan.pop{border-color:rgba(239,85,60,.35)!important;background:#fff7f0!important}.price{font-size:23px!important;font-weight:950!important;color:#111815!important}.price small{font-size:10px!important;color:#52605a!important;font-weight:900!important}
    #${ID} button{border:0!important;border-radius:999px!important;min-height:34px!important;padding:8px 12px!important;background:#111815!important;color:#fff!important;font-size:11px!important;font-weight:950!important;cursor:pointer!important}#${ID} button.orange{background:#ef553c!important}#${ID} button.softBtn{background:#e7ebe7!important;color:#111815!important}#${ID} button:focus{outline:3px solid rgba(239,85,60,.24)!important;outline-offset:2px!important}
    #${SLIP_ID}{position:fixed!important;inset:0!important;z-index:1000010!important;display:none!important;place-items:center!important;background:rgba(16,21,19,.54)!important;padding:18px!important}#${SLIP_ID}.open{display:grid!important}#${SLIP_ID} .box{width:min(880px,96vw)!important;max-height:92vh!important;overflow:auto!important;border-radius:24px!important;background:#f7f8f4!important;color:#111815!important;box-shadow:0 34px 100px rgba(0,0,0,.34)!important;border:1px solid rgba(255,255,255,.72)!important}#${SLIP_ID} header{display:flex!important;justify-content:space-between!important;gap:12px!important;padding:18px 20px!important;background:linear-gradient(115deg,#101513,#202a26 70%,#ef553c)!important;color:#fff!important}#${SLIP_ID} h2{margin:3px 0!important;color:#fff!important;font-size:28px!important;line-height:1!important;font-weight:950!important}#${SLIP_ID} small{color:#ffd7c6!important;font-size:10px!important;font-weight:950!important;text-transform:uppercase!important;letter-spacing:.08em!important}#${SLIP_ID} p{margin:0!important;color:rgba(255,255,255,.78)!important;font-size:12px!important;font-weight:850!important}#${SLIP_ID} .close{width:36px!important;height:36px!important;border-radius:999px!important;background:rgba(255,255,255,.14)!important;color:#fff!important;font-size:22px!important;padding:0!important}#${SLIP_ID} .body{padding:18px 20px!important;display:grid!important;gap:13px!important}.slipGrid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.slipField{display:grid!important;gap:5px!important}.slipField span{font-size:10px!important;text-transform:uppercase!important;letter-spacing:.05em!important;color:#52605a!important;font-weight:950!important}.slipValue{border:1px solid rgba(16,21,19,.1)!important;border-radius:13px!important;background:#fff!important;color:#111815!important;padding:10px!important;font-size:12px!important;font-weight:900!important;min-height:39px!important}.slipActions{display:flex!important;gap:8px!important;flex-wrap:wrap!important}.slipActions button:nth-child(2){background:#ef553c!important}.slipActions button:nth-child(3){background:#e7ebe7!important;color:#111815!important}
    .proper-layout--jobs .properBody{grid-template-columns:1.15fr .85fr!important}.proper-layout--workers .properBody{grid-template-columns:.95fr 1.05fr!important}.proper-layout--command .properBody{grid-template-columns:1.25fr .75fr!important}.proper-layout--settings .properBody{grid-template-columns:.9fr 1.1fr!important}.proper-layout--plans .properBody,.proper-layout--quotes .properBody,.proper-layout--invoices .properBody{grid-template-columns:1fr!important}
    @media(max-width:1100px){#${ID} .properHero,#${ID} .properBody,#${ID} .pipeline,#${ID} .moneyGrid,#${ID} .planGrid{grid-template-columns:1fr 1fr!important}#${ID} .span2{grid-column:1/-1!important}}
    @media(max-width:720px){#${ID} .properHero,#${ID} .properBody,#${ID} .pipeline,#${ID} .moneyGrid,#${ID} .planGrid,#${ID} .formGrid,#${SLIP_ID} .slipGrid{grid-template-columns:1fr!important}#${ID} .heroStat{padding:10px!important}}
  `;
  document.head.appendChild(style);
}

function hero(page, title, text, stats) {
  return `<section class="properHero"><div><span class="eyebrow">${esc(LABELS[page])}</span><h1>${esc(title)}</h1><p>${esc(text)}</p></div><aside class="heroStack">${stats.map(([a,b]) => `<div class="heroStat"><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</aside></section>`;
}

function row(title, text, tag, hot = false) {
  return `<div class="row" data-proper-slip="${esc(title)}"><i></i><span><b>${esc(title)}</b>${esc(text)}</span><em class="tag ${hot ? 'hot' : ''}">${esc(tag)}</em></div>`;
}

function button(title, label = 'View record', cls = '') {
  return `<button type="button" class="${esc(cls)}" data-proper-slip="${esc(title)}">${esc(label)}</button>`;
}

function guideLayout() {
  return hero('aiguide', 'Today is simple: Churvox finds the admin work.', 'A proper owner home: what moved today, what Churvox prepared, and what only needs approval inside Command.', [['Checked', 'all owner workspaces'], ['Command', 'decisions only']]) + `
    <section class="properBody">
      <article class="panel orange"><h2>Today pulse</h2><p>Jobs, worker proof, messages and money are grouped by what the owner actually needs to know.</p><div class="rows">${row('Jobs moving today','3 booked, 1 worker update, 1 proof note waiting.','today',true)}${row('Money watch','Drafts, overdue follow-up and paid refresh stay visible.','money')}${row('Worker messages','Field updates are separated from client replies.','field')}</div></article>
      <article class="panel"><h2>Churvox prepared</h2><p>Missing info and risky decisions are already prepared in Command. The owner is not asked to fix loose forms here.</p><div class="chips"><span class="chip orange">Price gaps</span><span class="chip">Proof notes</span><span class="chip">Invoice decisions</span><span class="chip">Sync guardrails</span></div>${button('Prepared Command summary','Review summary','orange')}</article>
      <article class="panel soft span2"><h2>Owner workbench</h2><div class="pipeline"><div class="lane"><h3>Jobs</h3><div class="mini"><b>Today schedule</b><span>Records and status only.</span></div></div><div class="lane"><h3>Money</h3><div class="mini"><b>Invoices due</b><span>Draft/sync/send decisions stay in Command.</span></div></div><div class="lane"><h3>Field</h3><div class="mini"><b>GPS + proof</b><span>Worker info, not approval clutter.</span></div></div><div class="lane"><h3>Command</h3><div class="mini"><b>Approve / edit / park</b><span>Only approval desk.</span></div></div></div></article>
    </section>`;
}

function commandLayout() {
  const items = readPrepared().filter(Boolean).slice(0, 8);
  const preparedRows = items.length ? items.map((item) => `<div class="row" data-command-id="${esc(item.id)}"><i></i><span><b>${esc(item.title || 'Prepared item')}</b>${esc(item.status || 'Waiting owner approval')} · prepared from ${esc(item.sourcePage || 'workspace')}<br>${esc(item.note || 'Churvox prepared this for owner review.')}</span><em class="tag hot">approval</em></div>`).join('') : `<div class="row"><i></i><span><b>No prepared approval items yet</b>When Churvox cannot confidently complete something, it appears here.</span><em class="tag ok">clear</em></div>`;
  return hero('command', 'Approve, edit or park. This is the only approval desk.', 'Command is where Churvox places prepared decisions. Non-Command pages stay clean records and workspaces.', [['Owner approval', 'required for risky actions'], ['Guarded', 'draft sync and send checks']]) + `
    <section class="properBody">
      <article class="panel orange"><h2>Prepared approval queue</h2><p>Churvox prepared these. The owner decides here — not from Jobs, Clients, Workers or Money pages.</p><div class="rows">${preparedRows}</div><div class="chips"><button data-proper-approve>Approve</button><button class="orange" data-proper-edit>Edit</button><button class="softBtn" data-proper-park>Park</button><button class="softBtn" data-proper-clear>Clear done</button></div></article>
      <article class="panel dark"><h2>Command rule</h2><p>Only Command has approval actions. Every other page shows records, status, history, forms and workspace tools.</p><div class="chips"><span class="chip dark">Approve</span><span class="chip dark">Edit</span><span class="chip dark">Park</span></div>${button('Command guardrails','Review guardrails')}</article>
      <article class="panel span2"><h2>Approval slip should feel filled, not half-started</h2><div class="formGrid"><div class="field"><label>Client</label><div class="fakeInput">Filled from record</div></div><div class="field"><label>Job / invoice / quote</label><div class="fakeInput">Matched by Churvox</div></div><div class="field"><label>Risk</label><div class="fakeInput">Highlighted clearly</div></div><div class="field"><label>Owner decision</label><div class="fakeInput">Approve, edit or park</div></div></div></article>
    </section>`;
}

function jobsLayout() {
  return hero('jobs', 'Jobs are records, dates, workers and status — not approvals.', 'The Jobs page is for running work: schedule, recurring, worker, price, status and proof. Missing decisions are already prepared in Command.', [['5 max', 'visible jobs per box'], ['Recurring', 'inside Jobs']]) + `
    <section class="properBody">
      <article class="panel"><h2>Today run sheet</h2><div class="slot"><div class="time">8:30</div><div class="jobBlock"><b>Mow + edge · North Shore</b><span>Worker: Cam · Price: $85 · Status: Assigned</span>${button('Mow + edge job record')}</div></div><div class="slot"><div class="time">10:15</div><div class="jobBlock"><b>Garden tidy · ECB</b><span>Worker: Stuart · Recurring: fortnightly · Proof expected</span>${button('Garden tidy job record')}</div></div><div class="slot"><div class="time">1:00</div><div class="jobBlock"><b>Quote visit · New lead</b><span>Address checked · Client note attached</span>${button('Quote visit job record')}</div></div></article>
      <article class="panel orange"><h2>Job form that makes sense</h2><div class="formGrid"><div class="field"><label>Client</label><div class="fakeInput">Dropdown + saved address</div></div><div class="field"><label>Date / time</label><div class="fakeInput">Calendar + start window</div></div><div class="field"><label>Price</label><div class="fakeInput">Fixed, hourly, extras</div></div><div class="field"><label>Repeat</label><div class="fakeInput">Weekly / fortnightly / monthly</div></div></div>${button('Full editable job form','Open job form','orange')}</article>
      <article class="panel soft span2"><h2>Job records</h2><div class="rows">${row('Assigned jobs','Worker, site, time, price and client notes stay in the record.','status')}${row('Proof received','Photos and notes live with the job record.','proof')}${row('Missing worker or price','Churvox prepares owner decision in Command automatically.','prepared',true)}${row('Completed one-off','Archive prompt belongs after completion, not before.','archive')}</div></article>
    </section>`;
}

function clientsLayout() {
  return hero('clients', 'Clients are service memory, history and details.', 'The Clients page should feel like a proper client file: contact info, access notes, saved pricing, job history, quotes and invoices.', [['Memory', 'site notes and pricing'], ['CSV', 'import/export ready']]) + `
    <section class="properBody">
      <article class="panel orange"><h2>Selected client file</h2><div class="formGrid"><div class="field"><label>Name</label><div class="fakeInput">ECB Property Maintenance</div></div><div class="field"><label>Phone / email</label><div class="fakeInput">Saved contact details</div></div><div class="field"><label>Address</label><div class="fakeInput">Service address + access note</div></div><div class="field"><label>Default price</label><div class="fakeInput">Stored per service</div></div></div>${button('Client editable form','Edit client','orange')}</article>
      <article class="panel"><h2>Client history</h2><div class="rows">${row('Last job','Completed, proof saved and invoice link visible.','job')}${row('Open quote','Follow-up prepared by Churvox if needed.','quote')}${row('Invoice history','Sent, paid, overdue and draft status in one timeline.','money')}</div></article>
      <article class="panel soft span2"><h2>Import, records and service memory</h2><div class="pipeline"><div class="lane"><h3>CSV import</h3><div class="mini"><b>Add many clients</b><span>Clean columns and errors shown clearly.</span></div></div><div class="lane"><h3>Site memory</h3><div class="mini"><b>Gate, dogs, access</b><span>Useful notes stay visible.</span></div></div><div class="lane"><h3>Pricing</h3><div class="mini"><b>Saved service prices</b><span>Quotes/jobs can reuse pricing.</span></div></div><div class="lane"><h3>History</h3><div class="mini"><b>Jobs + invoices</b><span>Everything linked to the client.</span></div></div></div></article>
    </section>`;
}

function workersLayout() {
  return hero('workers', 'Workers are field status, GPS, proof, time and messages.', 'The Workers page is not an approval page. It shows what is happening in the field and what records came back from the worker app.', [['GPS', 'map and route view'], ['Proof', 'photos and notes']]) + `
    <section class="properBody">
      <article class="panel"><h2>Live field map</h2><div class="mapPanel"><span class="pin one">Cam · Job 1</span><span class="pin two">Stuart · Proof</span><span class="pin three">New task</span></div><p>Google Maps belongs here with workers, routes and job locations.</p></article>
      <article class="panel orange"><h2>Worker activity</h2><div class="rows">${row('Cam acknowledged job','8:10am · heading to site.','live')}${row('Proof photo uploaded','Before/after photos attached to job.','proof')}${row('Timesheet running','Start, pause, resume and complete tracked.','time')}${row('Worker issue','Decision is prepared in Command when owner input is needed.','prepared',true)}</div></article>
      <article class="panel soft span2"><h2>Worker app controls</h2><div class="pipeline"><div class="lane"><h3>Jobs</h3><div class="mini"><b>Acknowledge / start / complete</b><span>Simple phone actions.</span></div></div><div class="lane"><h3>Messages</h3><div class="mini"><b>Worker to boss</b><span>Updates land in Messages.</span></div></div><div class="lane"><h3>Proof</h3><div class="mini"><b>Photos + notes</b><span>Attached to the job record.</span></div></div><div class="lane"><h3>GPS</h3><div class="mini"><b>Map and route</b><span>Visible here, not in Jobs clutter.</span></div></div></div></article>
    </section>`;
}

function quotesLayout() {
  return hero('quotes', 'Quotes are a pipeline, not a pile of forms.', 'Drafts, follow-ups, accepted quotes and quote-to-job conversion live here. Approval or risky sends are prepared in Command.', [['Pipeline', 'draft to accepted'], ['Follow-up', 'prepared safely']]) + `
    <section class="properBody">
      <article class="panel span2"><h2>Quote pipeline</h2><div class="pipeline"><div class="lane"><h3>Draft</h3><div class="mini"><b>Garden tidy quote</b><span>Scope and price filled.</span></div>${button('Draft quote record')}</div><div class="lane"><h3>Ready</h3><div class="mini"><b>Fence clean quote</b><span>Ready for owner review in Command.</span></div>${button('Ready quote record')}</div><div class="lane"><h3>Sent</h3><div class="mini"><b>Weekly lawns</b><span>Follow-up due tomorrow.</span></div>${button('Sent quote record')}</div><div class="lane"><h3>Accepted</h3><div class="mini"><b>Hedge trimming</b><span>Convert to job.</span></div>${button('Accepted quote record','Create job')}</div></div></article>
      <article class="panel orange"><h2>Quote builder</h2><div class="formGrid"><div class="field"><label>Client</label><div class="fakeInput">Client + site selected</div></div><div class="field"><label>Scope</label><div class="fakeInput">Clean line items</div></div><div class="field"><label>Price</label><div class="fakeInput">Fixed / hourly / extras</div></div><div class="field"><label>Follow-up</label><div class="fakeInput">Reminder prepared</div></div></div></article>
      <article class="panel"><h2>Quote memory</h2><p>Won/lost notes, client pricing and accepted scope should feed future jobs without the owner retyping everything.</p>${button('Quote memory record')}</article>
    </section>`;
}

function invoicesLayout() {
  return hero('invoices', 'Invoices show money status. Risky decisions stay in Command.', 'Invoices are records, due dates, paid status and guarded accounting handoff. Draft sync only. Owner-approved. Paid only after refresh confirms paid.', [['Draft only', 'Xero/MYOB guardrail'], ['Paid', 'confirmed by refresh']]) + `
    <section class="properBody">
      <article class="panel span2"><h2>Money status</h2><div class="moneyGrid"><div class="moneyTile"><b>$1,240</b><span>Drafts prepared</span></div><div class="moneyTile"><b>$860</b><span>Sent and due</span></div><div class="moneyTile"><b>$310</b><span>Overdue follow-up</span></div><div class="moneyTile"><b>2</b><span>Paid after refresh</span></div></div></article>
      <article class="panel orange"><h2>Invoice records</h2><div class="rows">${row('Draft invoice from job','Client, job, amount and proof already matched.','draft')}${row('Ready to send','Owner decision appears in Command, not here.','prepared',true)}${row('Overdue invoice','Follow-up can be prepared by Churvox.','due')}${row('Paid confirmation','Only mark paid after accounting refresh confirms it.','guard')}</div></article>
      <article class="panel"><h2>Accounting guardrails</h2><p>No automatic invoice sending. No tax filing. No bank payout files. Xero/MYOB stays draft sync and owner-approved.</p>${button('Invoice guardrails','Review guardrails')}</article>
    </section>`;
}

function teamLayout() {
  return hero('team', 'Team is people, roles, invites and access.', 'Team controls who can use Churvox and what they can see. Field work itself stays on Workers.', [['Roles', 'owner, staff, subcontractor'], ['Access', 'tier-driven views']]) + `
    <section class="properBody">
      <article class="panel orange"><h2>People list</h2><div class="rows">${row('Owner account','Full access and billing control.','owner')}${row('Worker account','Jobs, proof, GPS and messages.','worker')}${row('Subcontractor','Limited job view and proof upload.','limited')}</div></article>
      <article class="panel"><h2>Invite worker</h2><div class="formGrid"><div class="field"><label>Name</label><div class="fakeInput">Worker name</div></div><div class="field"><label>Email</label><div class="fakeInput">Invite email</div></div><div class="field"><label>Role</label><div class="fakeInput">Staff / subcontractor</div></div><div class="field"><label>Access</label><div class="fakeInput">Tier-controlled</div></div></div>${button('Invite worker form','Open invite','orange')}</article>
      <article class="panel soft span2"><h2>Team admin</h2><div class="chips"><span class="chip">CSV import</span><span class="chip">Active team members</span><span class="chip">Permissions</span><span class="chip orange">Growth Pack capacity</span></div></article>
    </section>`;
}

function payrollLayout() {
  return hero('payroll', 'Payroll is review and export only.', 'Timesheets, periods and worker totals live here. Churvox must not file tax or create bank payout files.', [['Export only', 'no government filing'], ['No payouts', 'no bank files']]) + `
    <section class="properBody">
      <article class="panel"><h2>Pay period</h2><div class="formGrid"><div class="field"><label>Period</label><div class="fakeInput">Weekly / fortnightly / monthly</div></div><div class="field"><label>Total hours</label><div class="fakeInput">42.5 hrs</div></div><div class="field"><label>Adjustments</label><div class="fakeInput">Manual review only</div></div><div class="field"><label>Export</label><div class="fakeInput">CSV for owner/bookkeeper</div></div></div>${button('Payroll period review','Open period')}</article>
      <article class="panel orange"><h2>Worker totals</h2><div class="rows">${row('Cam','18.5 hrs · 3 jobs · proof complete.','ready')}${row('Stuart','24 hrs · 5 jobs · one adjustment note.','review',true)}${row('Subcontractor','Invoice reference attached.','external')}</div></article>
      <article class="panel dark span2"><h2>Hard guardrails</h2><p>No tax filing. No government submission. No bank payout files. Payroll is a review/export workspace only.</p></article>
    </section>`;
}

function xeroLayout() {
  return hero('xero', 'Accounting handoff is guarded draft sync.', 'Xero/MYOB is for draft invoice sync, export packs and paid refresh checks. Nothing sensitive runs without owner approval.', [['Draft sync', 'owner-approved'], ['Paid guard', 'refresh confirms paid']]) + `
    <section class="properBody">
      <article class="panel orange"><h2>Connection status</h2><div class="rows">${row('Xero tenant','Connected tenant and token status visible.','connected')}${row('Draft invoice sync','Invoices sync as drafts only.','draft')}${row('Paid refresh','Paid status updates only after accounting confirms.','guard')}</div></article>
      <article class="panel"><h2>Export pack</h2><p>Xero CSV, MYOB CSV and bookkeeper pack stay available without changing the guarded sync rule.</p><div class="chips"><span class="chip">Xero CSV</span><span class="chip">MYOB CSV</span><span class="chip">Bookkeeper ZIP</span></div>${button('Accounting export pack','Open export')}</article>
      <article class="panel dark span2"><h2>Guardrails</h2><p>No automatic invoice sending, no tax filing, no bank payout files, and only mark paid after accounting refresh confirms paid.</p></article>
    </section>`;
}

function settingsLayout() {
  return hero('settings', 'Settings are business controls, not clutter.', 'Business details, branding, GST, notifications, security and data export should be easy to edit and hard to break.', [['Business', 'profile and GST'], ['Security', 'owner controls']]) + `
    <section class="properBody">
      <article class="panel orange"><h2>Business profile</h2><div class="formGrid"><div class="field"><label>Business name</label><div class="fakeInput">Churvox business</div></div><div class="field"><label>GST</label><div class="fakeInput">15% NZ GST</div></div><div class="field"><label>Logo</label><div class="fakeInput">Upload / preview</div></div><div class="field"><label>Language</label><div class="fakeInput">Plain NZ English</div></div></div>${button('Business settings form','Edit settings','orange')}</article>
      <article class="panel"><h2>Owner controls</h2><div class="rows">${row('Notifications','Email, worker app and future SMS controls.','notify')}${row('Security','Password, sessions and delete account controls.','secure')}${row('Data exports','Owner CSV exports and account data.','export')}</div></article>
      <article class="panel soft span2"><h2>Settings rule</h2><p>Risky account changes should be clearly prepared and confirmed. Routine profile changes stay simple.</p></article>
    </section>`;
}

function plansLayout() {
  return hero('plans', 'Plans show current plan, usage and locked pricing.', 'No price surprises. The plans page should show what plan the owner is on, usage, checkout and add-ons clearly.', [['Locked', 'pricing unchanged'], ['Usage', 'team and plan limits']]) + `
    <section class="properBody">
      <article class="panel span2"><h2>Locked pricing</h2><div class="planGrid"><div class="plan"><h3>Start</h3><div class="price">$39 <small>/month + GST</small></div><p>Simple owner start.</p></div><div class="plan"><h3>Crew</h3><div class="price">$89 <small>/month + GST</small></div><p>Growing team.</p></div><div class="plan pop"><h3>Operator</h3><div class="price">$149 <small>/month + GST</small></div><p>Most Popular.</p></div><div class="plan"><h3>Command</h3><div class="price">$299 <small>/month + GST</small></div><p>Approval desk power.</p></div></div></article>
      <article class="panel orange"><h2>Current plan</h2><p>Show current plan, trial state, billing state and checkout recovery clearly.</p>${button('Current plan details','View billing')}</article>
      <article class="panel"><h2>Add-ons</h2><div class="rows">${row('Command Growth Pack','+$99/month + GST · adds 50 active team members and capacity.','add-on')}${row('Accounting Sync Add-on','+$39/month + GST for non-Command tiers.','add-on')}</div></article>
    </section>`;
}

function supportLayout() {
  return hero('support', 'Support is help, setup and contact in one place.', 'The Support page should help owners get unstuck fast: setup help, billing help, sync help and direct contact.', [['Contact', 'hello@churvox.com'], ['Help', 'setup and troubleshooting']]) + `
    <section class="properBody">
      <article class="panel orange"><h2>Help ticket</h2><div class="formGrid"><div class="field"><label>Topic</label><div class="fakeInput">Setup / billing / sync / worker app</div></div><div class="field"><label>Priority</label><div class="fakeInput">Normal / urgent</div></div><div class="field"><label>Email</label><div class="fakeInput">hello@churvox.com</div></div><div class="field"><label>Status</label><div class="fakeInput">Open</div></div></div>${button('Support ticket form','Open ticket','orange')}</article>
      <article class="panel"><h2>Quick help</h2><div class="rows">${row('First setup','Business profile, first client, first job and worker invite.','setup')}${row('Accounting sync','Xero/MYOB draft sync and export pack help.','sync')}${row('Worker app','iPhone-friendly worker flow and messages.','worker')}</div></article>
      <article class="panel soft span2"><h2>Support memory</h2><p>Known issues, last contact and setup progress should be saved so the owner does not repeat themselves.</p></article>
    </section>`;
}

function messagesLayout() {
  return hero('messages', 'Messages separate worker updates from client replies.', 'Worker-to-boss messages, client replies and prepared responses live here. Anything risky is prepared in Command before sending.', [['Inbox', 'worker and client split'], ['Prepared', 'replies checked first']]) + `
    <section class="properBody">
      <article class="panel"><h2>Worker updates</h2><div class="rows">${row('Cam: job complete','Proof uploaded and note attached.','worker')}${row('Stuart: access issue','Gate locked. Churvox prepared owner decision in Command.','prepared',true)}${row('Worker app test','Boss-to-worker and worker-to-boss loop visible.','test')}</div></article>
      <article class="panel orange"><h2>Client replies</h2><div class="rows">${row('Quote reply','Client asked for Friday option.','client')}${row('Invoice question','Prepared response should be reviewed in Command if money-sensitive.','money',true)}${row('Booking reply','Churvox can draft suggested times.','booking')}</div></article>
      <article class="panel soft span2"><h2>Prepared replies</h2><p>Messages should feel like an inbox, not a form dump. Churvox drafts what it can and highlights anything that needs owner approval.</p>${button('Prepared reply example','Open prepared reply')}</article>
    </section>`;
}

function layoutFor(page) {
  if (page === 'command') return commandLayout();
  if (page === 'jobs') return jobsLayout();
  if (page === 'clients') return clientsLayout();
  if (page === 'workers') return workersLayout();
  if (page === 'quotes') return quotesLayout();
  if (page === 'invoices') return invoicesLayout();
  if (page === 'team') return teamLayout();
  if (page === 'payroll') return payrollLayout();
  if (page === 'xero') return xeroLayout();
  if (page === 'settings') return settingsLayout();
  if (page === 'plans') return plansLayout();
  if (page === 'support') return supportLayout();
  if (page === 'messages') return messagesLayout();
  return guideLayout();
}

function openSlip(title) {
  installStyle();
  const page = pageKey();
  let modal = document.getElementById(SLIP_ID);
  if (!modal) { modal = document.createElement('div'); modal.id = SLIP_ID; document.body.appendChild(modal); }
  const fields = [
    ['Workspace', LABELS[page] || page],
    ['Record', title],
    ['Churvox status', page === 'command' ? 'Ready for owner decision' : 'Checked and saved as a workspace record'],
    ['Approval rule', page === 'command' ? 'Approve, edit or park lives here.' : 'Anything needing approval is already prepared in Command.'],
  ].map(([k, v]) => `<div class="slipField"><span>${esc(k)}</span><div class="slipValue">${esc(v)}</div></div>`).join('');
  const commandAction = page === 'command' ? '<button type="button" data-proper-close>Keep in Command</button>' : '<button type="button" data-proper-nav-command>Review in Command</button>';
  modal.innerHTML = `<section class="box"><header><div><small>${esc(LABELS[page] || page)}</small><h2>${esc(title)}</h2><p>${page === 'command' ? 'Owner decision slip.' : 'Workspace record. Churvox has already checked it.'}</p></div><button type="button" class="close" data-proper-close>×</button></header><div class="body"><div class="slipGrid">${fields}</div><div class="slipActions"><button type="button" data-proper-close>Save record</button>${commandAction}<button type="button" data-proper-close>Close</button></div></div></section>`;
  modal.classList.add('open');
}

function applyCommandStatus(status) {
  const items = readPrepared();
  const first = items.find((x) => !/approved|parked/i.test(x.status || '')) || items[0];
  if (!first) return;
  writePrepared(items.map((item) => item.id === first.id ? { ...item, status } : item));
  window.dispatchEvent(new CustomEvent('churvox:command-prepared', { detail: first }));
  mount();
}

function cleanSiblings(root, page) {
  const app = document.querySelector('.churvoxOptionC');
  if (app) app.dataset.properPages = page ? 'true' : 'false';
  Array.from(root.children).forEach((child) => {
    const keep = child.id === ID || child.id === 'churvox-page-checked-note' || child.id === 'churvox-owner-draft-memory-panel' || child.id === 'churvox-command-prepared-queue';
    child.removeAttribute('data-core-hidden');
    child.removeAttribute('data-lite-hidden');
    if (page && !keep) child.setAttribute('data-proper-hidden', 'true');
    else child.removeAttribute('data-proper-hidden');
  });
}

function mount() {
  const page = pageKey();
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  const old = document.getElementById(ID);
  if (!root || !PAGES.includes(page)) { old?.remove(); if (root) cleanSiblings(root, ''); return; }
  installStyle();
  let node = old;
  if (!node) { node = document.createElement('section'); node.id = ID; root.prepend(node); }
  node.removeAttribute('data-core-hidden');
  node.removeAttribute('data-lite-hidden');
  node.className = `proper-layout proper-layout--${page}`;
  if (node.dataset.page !== page || page === 'command') {
    node.dataset.page = page;
    node.innerHTML = layoutFor(page);
  }
  cleanSiblings(root, page);
}

function click(event) {
  const slip = event.target?.closest?.('[data-proper-slip]');
  if (slip) { event.preventDefault(); event.stopPropagation(); openSlip(slip.dataset.properSlip || 'Record'); return; }
  if (event.target?.closest?.('[data-proper-approve]')) { event.preventDefault(); applyCommandStatus('Approved by owner'); return; }
  if (event.target?.closest?.('[data-proper-edit]')) { event.preventDefault(); applyCommandStatus('Editing in Command'); return; }
  if (event.target?.closest?.('[data-proper-park]')) { event.preventDefault(); applyCommandStatus('Parked by owner'); return; }
  if (event.target?.closest?.('[data-proper-clear]')) { event.preventDefault(); writePrepared(readPrepared().filter((x) => !/approved|parked/i.test(x.status || ''))); mount(); return; }
  const modal = document.getElementById(SLIP_ID);
  if (modal?.classList.contains('open')) {
    if (event.target === modal || event.target.closest('[data-proper-close]')) { modal.classList.remove('open'); return; }
    if (event.target.closest('[data-proper-nav-command]')) { modal.classList.remove('open'); history.replaceState({}, document.title, '/dashboard#command'); dispatchEvent(new HashChangeEvent('hashchange')); }
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_PROPER_PAGES__) {
  window.__CHURVOX_OWNER_PROPER_PAGES__ = true;
  window.addEventListener('DOMContentLoaded', mount);
  window.addEventListener('load', mount);
  window.addEventListener('hashchange', () => setTimeout(mount, 90));
  window.addEventListener('popstate', () => setTimeout(mount, 90));
  window.addEventListener('churvox:command-prepared', () => setTimeout(mount, 90));
  window.addEventListener('churvox:fresh-data-updated', () => setTimeout(mount, 90));
  document.addEventListener('click', click, true);
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') document.getElementById(SLIP_ID)?.classList.remove('open'); });
  setInterval(mount, 450);
  mount();
}

export {};
