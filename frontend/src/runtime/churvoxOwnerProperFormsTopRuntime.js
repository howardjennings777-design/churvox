// Minimal proper-form alias repair only.
// The old version dynamically loaded record engine/timeline/data-quality panels that fought FreshApp.

const MODAL_ID = 'churvox-owner-proper-page-slip';

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function field(name, label, value, type = 'text', options = []) {
  if (type === 'textarea') return `<label class="wide">${esc(label)}<textarea name="${esc(name)}">${esc(value)}</textarea></label>`;
  if (type === 'select') return `<label>${esc(label)}<select name="${esc(name)}">${options.map((o) => `<option ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  return `<label>${esc(label)}<input name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" /></label>`;
}

const sets = {
  client: { label: 'Clients', intro: 'Editable client file with contact details, service memory, pricing and linked history.', fields: [field('name','Client name',''),field('phone','Phone',''),field('email','Email','','email'),field('address','Service address',''),field('frequency','Preferred frequency','Fortnightly','select',['None','Weekly','Fortnightly','Monthly','Custom']),field('defaultPrice','Default service price',''),field('access','Access notes','','textarea'),field('serviceMemory','Service memory','','textarea')], info: [['Record purpose','Clients are service memory, saved pricing and history.'],['Linked history','Jobs, quotes and invoices should be shown from this file.']] },
  worker: { label: 'Workers', intro: 'Editable worker/field record with GPS, timer, proof and message context.', fields: [field('worker','Worker',''),field('currentJob','Current job',''),field('status','Field status','Assigned','select',['Assigned','Acknowledged','In progress','Completed','Waiting owner approval']),field('gps','GPS / location',''),field('timer','Timer',''),field('proof','Proof status',''),field('message','Worker message','','textarea'),field('ownerNote','Owner note','','textarea')], info: [['Record purpose','Workers page is GPS, proof, timesheets and worker messages.'],['Command rule','Worker issues needing an owner decision are prepared in Command.']] },
  quote: { label: 'Quotes', intro: 'Editable quote record with scope, line items, pricing, follow-up and convert-to-job detail.', fields: [field('client','Client',''),field('quoteNo','Quote number',''),field('status','Quote status','Draft','select',['Draft','Ready for review','Sent','Accepted','Lost','Follow-up due']),field('validUntil','Valid until','','date'),field('priceType','Price type','Fixed + extras','select',['Fixed','Hourly','Fixed + extras','Hourly + extras']),field('total','Quote total',''),field('scope','Scope','','textarea'),field('followUp','Follow-up note','','textarea')], info: [['Record purpose','Quotes are pipeline records and quote-to-job conversion.'],['Command rule','Owner-sensitive send/follow-up decisions appear in Command.']] },
  invoice: { label: 'Invoices', intro: 'Editable invoice record with job match, amount, due date, sync guard and paid status.', fields: [field('client','Client',''),field('invoiceNo','Invoice number',''),field('job','Linked job',''),field('status','Invoice status','Draft','select',['Draft','Ready for review','Sent','Viewed','Paid after refresh','Overdue']),field('amount','Amount',''),field('due','Due date','','date'),field('sync','Accounting sync','Draft sync only'),field('paidRule','Paid rule','Only mark paid after accounting refresh confirms paid'),field('lineItems','Line items','','textarea')], info: [['Record purpose','Invoices show money records, due status and guarded accounting handoff.'],['Guardrails','No automatic invoice sending, no tax filing, no bank payout files.']] },
};

function render(page, title, cfg) {
  return `<section class="properFormBox"><header class="properFormHead"><div><small>${esc(cfg.label)}</small><h2>${esc(title)}</h2><p>${esc(cfg.intro)}</p></div><button type="button" class="properClose" data-proper-form-close>×</button></header><form class="properFormBody" data-proper-edit-form data-page="${esc(page)}" data-title="${esc(title)}"><div class="properFormGrid">${cfg.fields.join('')}</div><div class="properInfo">${cfg.info.map(([a,b]) => `<div class="infoCard"><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div><div class="properActions"><button type="button" class="orange" data-proper-form-save>Save record</button><button type="button" data-proper-form-save-close>Save and close</button><button type="button" class="soft" data-proper-form-command>Review in Command</button><button type="button" class="soft" data-proper-form-close>Close</button></div></form></section>`;
}

function repair() {
  const modal = document.getElementById(MODAL_ID);
  const form = modal?.querySelector('[data-proper-edit-form]');
  const page = form?.dataset?.page || '';
  const cfg = sets[page];
  if (!modal || !cfg || modal.dataset.aliasFixed === page) return;
  const title = form?.dataset?.title || cfg.label.slice(0, -1) || 'Record';
  modal.innerHTML = render(page, title, cfg);
  modal.dataset.aliasFixed = page;
  modal.classList.add('open');
}

function click(event) {
  if (!event.target?.closest?.('[data-proper-slip],[data-core-slip],[data-lite-slip]')) return;
  setTimeout(repair, 20);
  setTimeout(repair, 120);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_PROPER_FORM_ALIASES__) {
  window.__CHURVOX_OWNER_PROPER_FORM_ALIASES__ = true;
  document.addEventListener('click', click, true);
}

export {};
