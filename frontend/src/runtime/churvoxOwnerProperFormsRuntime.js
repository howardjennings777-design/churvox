// Page-specific editable owner forms for the proper owner layout.
// Slips must feel like real records, not generic previews.

const MODAL_ID = 'churvox-owner-proper-page-slip';
const STYLE_ID = 'churvox-owner-proper-forms-style';
const DRAFT_KEY = 'churvox.owner.properForms.v1';
const COMMAND_KEY = 'churvox.command.prepared.v1';

const LABELS = {
  aiguide: 'AI Guide', command: 'Command', jobs: 'Jobs', clients: 'Clients', workers: 'Workers', quotes: 'Quotes', invoices: 'Invoices',
  team: 'Team', payroll: 'Payroll', xero: 'Xero', settings: 'Settings', plans: 'Plans', support: 'Support', messages: 'Messages',
};

function pageKey() {
  const raw = String(location.hash || '').replace('#', '').toLowerCase() || 'aiguide';
  return ({ today:'aiguide', dashboard:'aiguide', setup:'aiguide', setupassistant:'aiguide', guide:'aiguide', 'ai-guide':'aiguide', 'smart-hub':'aiguide', help:'support', inbox:'messages', 'command-desk':'command', 'command-board':'command' }[raw] || raw);
}

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]').filter(Boolean); } catch (_) { return []; }
}

function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value.slice(0, 40))); } catch (_) {}
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${MODAL_ID}.open{display:grid!important}
    #${MODAL_ID} .properFormBox{width:min(980px,96vw)!important;max-height:92vh!important;overflow:auto!important;border-radius:24px!important;background:#f7f8f4!important;color:#111815!important;box-shadow:0 34px 100px rgba(0,0,0,.34)!important;border:1px solid rgba(255,255,255,.72)!important}
    #${MODAL_ID} .properFormHead{display:flex!important;justify-content:space-between!important;gap:12px!important;padding:18px 20px!important;background:linear-gradient(115deg,#101513,#202a26 70%,#ef553c)!important;color:#fff!important}
    #${MODAL_ID} .properFormHead small{display:block!important;color:#ffd7c6!important;font-size:10px!important;font-weight:950!important;letter-spacing:.08em!important;text-transform:uppercase!important}
    #${MODAL_ID} .properFormHead h2{margin:4px 0!important;color:#fff!important;font-size:30px!important;line-height:.98!important;font-weight:950!important;letter-spacing:-.04em!important}
    #${MODAL_ID} .properFormHead p{margin:0!important;color:rgba(255,255,255,.8)!important;font-size:12px!important;font-weight:850!important;line-height:1.35!important}
    #${MODAL_ID} .properClose{border:0!important;border-radius:999px!important;background:rgba(255,255,255,.14)!important;color:#fff!important;width:36px!important;height:36px!important;font-size:22px!important;font-weight:950!important}
    #${MODAL_ID} .properFormBody{display:grid!important;gap:14px!important;padding:18px 20px!important}
    #${MODAL_ID} .properFormGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:11px!important}
    #${MODAL_ID} .properFormGrid.two{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    #${MODAL_ID} label{display:grid!important;gap:6px!important;align-content:start!important;color:#52605a!important;font-size:10px!important;font-weight:950!important;letter-spacing:.045em!important;text-transform:uppercase!important}
    #${MODAL_ID} input,#${MODAL_ID} select,#${MODAL_ID} textarea{width:100%!important;border:1px solid rgba(16,21,19,.13)!important;border-radius:13px!important;background:#fff!important;color:#111815!important;padding:10px 11px!important;font-size:13px!important;font-weight:850!important;text-transform:none!important;outline:none!important;box-shadow:inset 0 1px 0 rgba(16,21,19,.02)!important}
    #${MODAL_ID} textarea{min-height:92px!important;resize:vertical!important;line-height:1.35!important}
    #${MODAL_ID} input:focus,#${MODAL_ID} select:focus,#${MODAL_ID} textarea:focus{border-color:rgba(239,85,60,.5)!important;box-shadow:0 0 0 3px rgba(239,85,60,.14)!important}
    #${MODAL_ID} .wide{grid-column:1/-1!important}
    #${MODAL_ID} .properInfo{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important}
    #${MODAL_ID} .infoCard{border:1px solid rgba(16,21,19,.08)!important;border-radius:16px!important;background:#fff!important;padding:12px!important;display:grid!important;gap:6px!important}
    #${MODAL_ID} .infoCard b{font-size:13px!important;color:#111815!important;font-weight:950!important}.infoCard span{font-size:11px!important;color:#52605a!important;font-weight:850!important;line-height:1.35!important}
    #${MODAL_ID} .properActions{display:flex!important;gap:8px!important;flex-wrap:wrap!important;align-items:center!important;padding-top:2px!important}
    #${MODAL_ID} .properActions button{border:0!important;border-radius:999px!important;min-height:38px!important;padding:9px 15px!important;background:#111815!important;color:#fff!important;font-size:12px!important;font-weight:950!important}
    #${MODAL_ID} .properActions button.orange{background:#ef553c!important}.properActions button.soft{background:#e5e9e5!important;color:#111815!important}.properActions button.red{background:#8f2417!important;color:#fff!important}
    #${MODAL_ID} .saveNote{display:none!important;border-radius:999px!important;background:#eaf8ef!important;color:#206b3c!important;padding:8px 11px!important;font-size:11px!important;font-weight:950!important}#${MODAL_ID}[data-saved="true"] .saveNote{display:inline-flex!important}
    @media(max-width:900px){#${MODAL_ID} .properFormGrid,#${MODAL_ID} .properFormGrid.two,#${MODAL_ID} .properInfo{grid-template-columns:1fr!important}}
  `;
  document.head.appendChild(style);
}

const OPTIONS = {
  status: ['Draft','Assigned','Acknowledged','In progress','Completed','Waiting owner approval','Paid','Overdue','Parked'],
  repeat: ['None','Weekly','Fortnightly','Monthly','Custom'],
  priceType: ['Fixed','Hourly','Fixed + extras','Hourly + extras'],
  role: ['Owner','Staff','Worker','Subcontractor','Bookkeeper'],
  priority: ['Normal','High','Urgent'],
  invoiceStatus: ['Draft','Ready for review','Sent','Viewed','Paid after refresh','Overdue'],
  quoteStatus: ['Draft','Ready for review','Sent','Accepted','Lost','Follow-up due'],
  payrollPeriod: ['Weekly','Fortnightly','Monthly','Custom'],
  visibility: ['Owner only','Team visible','Worker visible','Bookkeeper visible'],
};

function field(name, label, value, type = 'text', opts = []) {
  const v = esc(value);
  if (type === 'textarea') return `<label class="${opts.includes('wide') ? 'wide' : ''}">${esc(label)}<textarea name="${esc(name)}">${v}</textarea></label>`;
  if (type === 'select') return `<label>${esc(label)}<select name="${esc(name)}">${opts.map((o) => `<option ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  return `<label class="${opts.includes('wide') ? 'wide' : ''}">${esc(label)}<input name="${esc(name)}" type="${esc(type)}" value="${v}" /></label>`;
}

function infer(title) {
  const t = String(title || '').toLowerCase();
  if (/invoice|money|paid|overdue|draft invoice/.test(t)) return 'invoice';
  if (/quote|scope|follow/.test(t)) return 'quote';
  if (/worker|cam|stuart|gps|proof|timesheet|field/.test(t)) return 'worker';
  if (/client|service memory|ecb|mokopuna/.test(t)) return 'client';
  if (/pay|timesheet|period/.test(t)) return 'payroll';
  if (/xero|myob|accounting|sync|export/.test(t)) return 'xero';
  if (/plan|billing|price|usage/.test(t)) return 'plans';
  if (/message|reply|inbox/.test(t)) return 'messages';
  if (/team|invite|access|role/.test(t)) return 'team';
  if (/setting|gst|logo|business/.test(t)) return 'settings';
  if (/support|ticket|help/.test(t)) return 'support';
  if (/job|mow|garden|recurring|assigned|schedule/.test(t)) return 'jobs';
  if (/command|approval|approve|park|guard/.test(t)) return 'command';
  return pageKey();
}

function forms(page, title) {
  const checked = 'Churvox checked this record. Anything risky is already prepared in Command.';
  const data = {
    jobs: {
      intro: 'Editable job record with client, site, worker, price, time, repeat and proof details.',
      fields: [field('client','Client','ECB Property Maintenance'),field('site','Job address','12 Beach Road, North Shore'),field('worker','Assigned worker','Cam'),field('date','Date','2026-07-06','date'),field('time','Start time','08:30','time'),field('status','Status','Assigned','select',OPTIONS.status),field('priceType','Price type','Fixed','select',OPTIONS.priceType),field('price','Price','$85'),field('repeat','Repeat','Fortnightly','select',OPTIONS.repeat),field('scope','Job scope','Mow lawns, edge paths, clear clippings, upload before/after proof.','textarea',['wide']),field('notes','Site/access notes','Gate code saved. Watch dog in back section.','textarea',['wide'])],
      info: [['Record purpose','Jobs are for work records, schedule, worker, status and proof.'],['Command rule','Missing price/date/worker/proof is prepared in Command automatically.']],
    },
    clients: {
      intro: 'Editable client file with contact details, service memory, pricing and linked history.',
      fields: [field('name','Client name','ECB Property Maintenance'),field('phone','Phone','021 000 000'),field('email','Email','stuart@example.com','email'),field('address','Service address','12 Beach Road, North Shore'),field('frequency','Preferred frequency','Fortnightly','select',OPTIONS.repeat),field('defaultPrice','Default service price','$85'),field('access','Access notes','Gate code, dog warning, preferred entry point.','textarea',['wide']),field('serviceMemory','Service memory','Mow, edge and blow down. Leave green waste beside bins.','textarea',['wide'])],
      info: [['Record purpose','Clients are service memory, saved pricing and history.'],['Linked history','Jobs, quotes and invoices should be shown from this file.']],
    },
    workers: {
      intro: 'Editable worker/field record with GPS, timer, proof and message context.',
      fields: [field('worker','Worker','Cam'),field('currentJob','Current job','Mow + edge · North Shore'),field('status','Field status','In progress','select',OPTIONS.status),field('gps','GPS / location','North Shore job site'),field('timer','Timer','01:25 running'),field('proof','Proof status','Photos uploaded'),field('message','Worker message','Customer asked to trim around side path as extra.','textarea',['wide']),field('ownerNote','Owner note','Extra work needs price check before invoicing.','textarea',['wide'])],
      info: [['Record purpose','Workers page is GPS, proof, timesheets and worker messages.'],['Command rule','Worker issues needing an owner decision are prepared in Command.']],
    },
    quotes: {
      intro: 'Editable quote record with scope, line items, pricing, follow-up and convert-to-job detail.',
      fields: [field('client','Client','New lead'),field('quoteNo','Quote number','Q-1024'),field('status','Quote status','Draft','select',OPTIONS.quoteStatus),field('validUntil','Valid until','2026-07-20','date'),field('priceType','Price type','Fixed + extras','select',OPTIONS.priceType),field('total','Quote total','$420 + GST'),field('scope','Scope','Garden tidy, hedge trim, green waste removal and optional recurring maintenance.','textarea',['wide']),field('followUp','Follow-up note','Churvox can prepare a follow-up if no reply after 3 days.','textarea',['wide'])],
      info: [['Record purpose','Quotes are pipeline records and quote-to-job conversion.'],['Command rule','Owner-sensitive send/follow-up decisions appear in Command.']],
    },
    invoices: {
      intro: 'Editable invoice record with job match, amount, due date, sync guard and paid status.',
      fields: [field('client','Client','ECB Property Maintenance'),field('invoiceNo','Invoice number','INV-1048'),field('job','Linked job','Mow + edge · North Shore'),field('status','Invoice status','Draft','select',OPTIONS.invoiceStatus),field('amount','Amount','$85 + GST'),field('due','Due date','2026-07-20','date'),field('sync','Accounting sync','Draft sync only'),field('paidRule','Paid rule','Only mark paid after accounting refresh confirms paid'),field('lineItems','Line items','Mow lawns, edge paths, blow down paved areas.','textarea',['wide'])],
      info: [['Record purpose','Invoices show money records, due status and guarded accounting handoff.'],['Guardrails','No automatic invoice sending, no tax filing, no bank payout files.']],
    },
    team: {
      intro: 'Editable team/access record with role, invite status and visibility.',
      fields: [field('name','Person name','Worker name'),field('email','Email','worker@example.com','email'),field('role','Role','Worker','select',OPTIONS.role),field('visibility','Visibility','Worker visible','select',OPTIONS.visibility),field('status','Invite status','Draft','select',OPTIONS.status),field('capacity','Active team member','Yes'),field('permissions','Permissions','Can view assigned jobs, update status, upload proof and message owner.','textarea',['wide'])],
      info: [['Record purpose','Team manages people, roles, invites and access.'],['Worker work','Field activity belongs on Workers, not Team.']],
    },
    payroll: {
      intro: 'Editable payroll review record with period, worker hours, adjustments and export-only guardrails.',
      fields: [field('worker','Worker','Cam'),field('period','Pay period','Weekly','select',OPTIONS.payrollPeriod),field('from','From','2026-07-01','date'),field('to','To','2026-07-07','date'),field('hours','Hours','18.5'),field('rate','Rate','$32/hr'),field('adjustment','Adjustment note','Review extra 30 minutes for site access delay.','textarea',['wide']),field('guardrail','Guardrail','Export only. No tax filing. No bank payout files.','textarea',['wide'])],
      info: [['Record purpose','Payroll is review, totals and CSV export only.'],['Hard rule','Do not file tax or create bank payout files.']],
    },
    xero: {
      intro: 'Editable accounting handoff record with connection, draft sync and paid-refresh details.',
      fields: [field('system','System','Xero'),field('tenant','Tenant','churvox'),field('connection','Connection status','Connected'),field('syncMode','Sync mode','Draft invoice sync only'),field('invoice','Invoice','INV-1048'),field('paidRefresh','Paid refresh','Manual accounting refresh confirms paid'),field('guardrails','Guardrails','Owner-approved, no automatic invoice sending, no tax filing, no bank payout files.','textarea',['wide'])],
      info: [['Record purpose','Xero/MYOB is accounting handoff and export pack.'],['Command rule','Risky sync/send/payment decisions are owner-approved in Command.']],
    },
    settings: {
      intro: 'Editable business settings form with profile, GST, branding and security controls.',
      fields: [field('business','Business name','Churvox business'),field('email','Business email','hello@churvox.com','email'),field('gst','GST rate','15%'),field('logo','Logo status','Uploaded'),field('language','Language','Plain NZ English'),field('security','Security','Owner login protected'),field('notifications','Notifications','Email on, SMS coming soon','textarea',['wide']),field('export','Data/export note','Owner can export CSV records.','textarea',['wide'])],
      info: [['Record purpose','Settings are business controls and account preferences.'],['Risky changes','Sensitive account changes should be confirmed clearly.']],
    },
    plans: {
      intro: 'Editable billing/plan view with current plan, usage and locked pricing.',
      fields: [field('current','Current plan','Operator'),field('trial','Trial/billing state','90-day trial/test where applied'),field('activeTeam','Active team members','2'),field('addon','Accounting Sync Add-on','Available for non-Command tiers'),field('usage','Usage note','Show plan usage, billing status and checkout recovery.','textarea',['wide']),field('lockedPricing','Locked pricing','Start $39, Crew $89, Operator $149, Command $299, Growth Pack $99, Accounting Sync $39 + GST.','textarea',['wide'])],
      info: [['Record purpose','Plans show current plan, usage, billing and checkout.'],['Pricing rule','Do not change pricing unless explicitly asked.']],
    },
    support: {
      intro: 'Editable support ticket with topic, priority, contact and setup context.',
      fields: [field('topic','Topic','Setup help'),field('priority','Priority','Normal','select',OPTIONS.priority),field('contact','Contact email','hello@churvox.com','email'),field('status','Ticket status','Draft','select',OPTIONS.status),field('problem','Problem / request','Describe what the owner needs help with.','textarea',['wide']),field('context','Churvox context','Include page, plan, last action and screenshots if available.','textarea',['wide'])],
      info: [['Record purpose','Support is help, tickets and setup guidance.'],['Useful detail','Ticket should carry page context so owner does not repeat themselves.']],
    },
    messages: {
      intro: 'Editable message record with sender, thread, draft reply and owner-safety status.',
      fields: [field('from','From','Worker / client'),field('thread','Thread','Job update'),field('priority','Priority','Normal','select',OPTIONS.priority),field('status','Message status','Draft','select',OPTIONS.status),field('message','Message','Customer asked for extra work while worker is on site.','textarea',['wide']),field('reply','Prepared reply','Thanks — I’ll check the extra and confirm before adding it.','textarea',['wide'])],
      info: [['Record purpose','Messages split worker updates, client replies and prepared replies.'],['Command rule','Money-sensitive or risky replies are prepared in Command first.']],
    },
    aiguide: {
      intro: 'Editable owner pulse item with priority, source page and what Churvox already checked.',
      fields: [field('priority','Priority','High','select',OPTIONS.priority),field('source','Source page','AI Guide'),field('status','Status','Waiting owner approval','select',OPTIONS.status),field('summary','Summary','Churvox checked today’s jobs, worker proof, messages and money watch.','textarea',['wide']),field('next','Next action','Only approval decisions should be handled in Command.','textarea',['wide'])],
      info: [['Record purpose','AI Guide is the owner cockpit.'],['Command rule','It should point to decisions, not become another approval desk.']],
    },
    command: {
      intro: 'Editable Command approval slip. This is the only place for approve, edit or park.',
      fields: [field('client','Client','Matched client'),field('record','Record','Prepared approval item'),field('risk','Risk / missing item','Owner decision required'),field('status','Status','Waiting owner approval','select',OPTIONS.status),field('recommended','Recommended action','Approve if the prepared detail is correct, edit if not, or park for later.','textarea',['wide']),field('notes','Owner notes','Add your decision notes here.','textarea',['wide'])],
      info: [['Record purpose','Command is the approval desk.'],['Actions','Approve, edit and park only live here.']],
    },
  };
  return data[page] || data[infer(title)] || data.aiguide;
}

function modalHtml(page, title, cfg) {
  const actionButtons = page === 'command'
    ? '<button type="button" class="orange" data-proper-form-approve>Approve</button><button type="button" data-proper-form-edit>Edit in Command</button><button type="button" class="soft" data-proper-form-park>Park</button>'
    : '<button type="button" class="orange" data-proper-form-save>Save record</button><button type="button" data-proper-form-save-close>Save and close</button><button type="button" class="soft" data-proper-form-command>Review in Command</button>';
  return `<section class="properFormBox"><header class="properFormHead"><div><small>${esc(LABELS[page] || page)}</small><h2>${esc(title)}</h2><p>${esc(cfg.intro)}</p></div><button type="button" class="properClose" data-proper-form-close>×</button></header><form class="properFormBody" data-proper-edit-form data-page="${esc(page)}" data-title="${esc(title)}"><div class="properFormGrid">${cfg.fields.join('')}</div><div class="properInfo">${cfg.info.map(([a,b]) => `<div class="infoCard"><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div><div class="properActions">${actionButtons}<button type="button" class="soft" data-proper-form-close>Close</button><span class="saveNote">Saved locally for this owner session</span></div></form></section>`;
}

function openForm(title) {
  installStyle();
  const inferred = infer(title);
  const page = pageKey() === 'command' ? 'command' : inferred;
  const cfg = forms(page, title);
  let modal = document.getElementById(MODAL_ID);
  if (!modal) { modal = document.createElement('div'); modal.id = MODAL_ID; document.body.appendChild(modal); }
  modal.innerHTML = modalHtml(page, title || 'Record', cfg);
  modal.dataset.saved = 'false';
  modal.classList.add('open');
}

function serialise(form) {
  const out = { page: form.dataset.page, title: form.dataset.title, savedAt: new Date().toISOString(), values: {} };
  form.querySelectorAll('input,select,textarea').forEach((el) => { out.values[el.name] = el.value; });
  return out;
}

function saveForm(closeAfter = false) {
  const modal = document.getElementById(MODAL_ID);
  const form = modal?.querySelector('[data-proper-edit-form]');
  if (!form) return;
  const record = serialise(form);
  const current = readJson(DRAFT_KEY);
  writeJson(DRAFT_KEY, [record, ...current]);
  modal.dataset.saved = 'true';
  if (closeAfter) modal.classList.remove('open');
}

function writeCommandDecision(status) {
  const modal = document.getElementById(MODAL_ID);
  const form = modal?.querySelector('[data-proper-edit-form]');
  const record = form ? serialise(form) : { page: 'command', title: 'Command item', values: {} };
  const current = readJson(COMMAND_KEY);
  const item = { id: `cmd-form-${Date.now()}`, title: record.title || 'Command approval', sourcePage: record.page || 'command', status, note: record.values?.recommended || record.values?.notes || 'Owner decision recorded in Command.', createdAt: new Date().toISOString() };
  writeJson(COMMAND_KEY, [item, ...current]);
  window.dispatchEvent(new CustomEvent('churvox:command-prepared', { detail: item }));
  if (modal) { modal.dataset.saved = 'true'; modal.classList.remove('open'); }
}

function click(event) {
  const trigger = event.target?.closest?.('[data-proper-slip],[data-core-slip],[data-lite-slip]');
  if (trigger) {
    const title = trigger.dataset.properSlip || trigger.dataset.coreSlip || trigger.dataset.liteSlip || trigger.textContent || 'Record';
    setTimeout(() => openForm(title), 0);
    return;
  }
  const modal = document.getElementById(MODAL_ID);
  if (!modal?.classList.contains('open')) return;
  if (event.target === modal || event.target.closest('[data-proper-form-close]')) { event.preventDefault(); modal.classList.remove('open'); return; }
  if (event.target.closest('[data-proper-form-save]')) { event.preventDefault(); saveForm(false); return; }
  if (event.target.closest('[data-proper-form-save-close]')) { event.preventDefault(); saveForm(true); return; }
  if (event.target.closest('[data-proper-form-command]')) { event.preventDefault(); saveForm(true); history.replaceState({}, document.title, '/dashboard#command'); dispatchEvent(new HashChangeEvent('hashchange')); return; }
  if (event.target.closest('[data-proper-form-approve]')) { event.preventDefault(); writeCommandDecision('Approved by owner'); return; }
  if (event.target.closest('[data-proper-form-edit]')) { event.preventDefault(); writeCommandDecision('Editing in Command'); return; }
  if (event.target.closest('[data-proper-form-park]')) { event.preventDefault(); writeCommandDecision('Parked by owner'); }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_PROPER_FORMS__) {
  window.__CHURVOX_OWNER_PROPER_FORMS__ = true;
  document.addEventListener('click', click, true);
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') document.getElementById(MODAL_ID)?.classList.remove('open'); });
  installStyle();
}

export {};
