// Clean owner core page layouts.
// Replaces messy stacked runtime panels on AI Guide, Command and Clients with one controlled workspace.

const CLEAN_ID = 'churvox-owner-core-clean-layout';
const STYLE_ID = 'churvox-owner-core-clean-style';
const SLIP_ID = 'churvox-owner-core-clean-slip';

function currentPage() {
  const hash = String(window.location.hash || '').replace('#', '').toLowerCase();
  if (!hash || ['today', 'dashboard', 'setup', 'setupassistant', 'firstrun', 'aiguide', 'guide', 'ai-guide', 'smart-hub'].includes(hash)) return 'aiguide';
  if (['command', 'command-desk', 'command-board'].includes(hash)) return 'command';
  if (hash === 'clients') return 'clients';
  return '';
}

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .churvoxOptionC[data-core-clean="true"] .cocPage > [data-core-hidden="true"]{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;opacity:0!important}
    #${CLEAN_ID}{grid-column:1/-1!important;display:grid!important;gap:12px!important;color:#111815!important}
    #${CLEAN_ID} .coreHero{display:grid!important;grid-template-columns:1.25fr .75fr!important;gap:12px!important;border-radius:20px!important;background:linear-gradient(115deg,#101513,#1f2925 68%,#ef553c)!important;color:#fff!important;padding:18px!important;box-shadow:0 18px 44px rgba(16,21,19,.16)!important;overflow:hidden!important}
    #${CLEAN_ID} .coreHero small{display:block!important;color:#ffd7c6!important;font-size:10px!important;font-weight:950!important;letter-spacing:.08em!important;text-transform:uppercase!important;margin-bottom:8px!important}
    #${CLEAN_ID} .coreHero h2{margin:0!important;color:#fff!important;font-size:34px!important;line-height:.95!important;font-weight:950!important;letter-spacing:-.05em!important}
    #${CLEAN_ID} .coreHero p{margin:8px 0 0!important;color:rgba(255,255,255,.84)!important;font-size:13px!important;font-weight:850!important;line-height:1.35!important}
    #${CLEAN_ID} .coreMetricWrap{display:grid!important;gap:8px!important;align-content:start!important}
    #${CLEAN_ID} .coreMetric{border:1px solid rgba(255,255,255,.16)!important;border-radius:14px!important;background:rgba(255,255,255,.1)!important;padding:11px!important}
    #${CLEAN_ID} .coreMetric b{display:block!important;color:#fff!important;font-size:18px!important;font-weight:950!important}
    #${CLEAN_ID} .coreMetric span{color:rgba(255,255,255,.78)!important;font-size:11px!important;font-weight:850!important}
    #${CLEAN_ID} .coreGrid{display:grid!important;grid-template-columns:1fr 1fr 1fr!important;gap:12px!important}
    #${CLEAN_ID} .coreCard{border:1px solid rgba(16,21,19,.08)!important;border-radius:17px!important;background:#fff!important;box-shadow:0 14px 30px rgba(16,21,19,.06)!important;padding:15px!important;display:grid!important;gap:9px!important;min-height:136px!important;overflow:hidden!important}
    #${CLEAN_ID} .coreCard h3{margin:0!important;color:#111815!important;font-size:18px!important;font-weight:950!important}
    #${CLEAN_ID} .coreCard p{margin:0!important;color:#52605a!important;font-size:12px!important;font-weight:850!important;line-height:1.38!important}
    #${CLEAN_ID} .coreWide{grid-column:1/-1!important}
    #${CLEAN_ID} .coreList{display:grid!important;gap:7px!important;max-height:330px!important;overflow:auto!important}
    #${CLEAN_ID} .coreRow{display:grid!important;grid-template-columns:auto 1fr auto!important;gap:8px!important;align-items:center!important;border:1px solid rgba(16,21,19,.07)!important;border-radius:12px!important;background:#f7f8f4!important;padding:8px!important;cursor:pointer!important}
    #${CLEAN_ID} .coreRow i{width:9px!important;height:9px!important;border-radius:999px!important;background:#ef553c!important}
    #${CLEAN_ID} .coreRow b{font-size:12px!important;color:#111815!important}.coreRow span{font-size:11px!important;color:#52605a!important;font-weight:850!important}.coreRow em{font-style:normal!important;font-size:9px!important;font-weight:950!important;color:#9a3412!important;background:#fff7ed!important;border-radius:999px!important;padding:4px 6px!important;text-transform:uppercase!important}
    #${CLEAN_ID} .coreActions{display:flex!important;gap:8px!important;flex-wrap:wrap!important;align-items:center!important}
    #${CLEAN_ID} button{border:0!important;border-radius:999px!important;min-height:32px!important;padding:7px 11px!important;background:#111815!important;color:#fff!important;font-size:11px!important;font-weight:950!important}
    #${CLEAN_ID} button.orange{background:#ef553c!important}
    #${SLIP_ID}{position:fixed!important;inset:0!important;z-index:1000005!important;display:none!important;place-items:center!important;background:rgba(16,21,19,.5)!important;padding:18px!important}
    #${SLIP_ID}.open{display:grid!important}#${SLIP_ID} .box{width:min(860px,96vw)!important;max-height:92vh!important;overflow:auto!important;border-radius:24px!important;background:#f7f8f4!important;color:#111815!important;box-shadow:0 30px 90px rgba(0,0,0,.3)!important;border:1px solid rgba(255,255,255,.62)!important}#${SLIP_ID} header{display:flex!important;justify-content:space-between!important;gap:12px!important;align-items:flex-start!important;padding:18px 20px!important;background:linear-gradient(115deg,#101513,#202a26 70%,#ef553c)!important;color:#fff!important}#${SLIP_ID} small{display:block!important;color:#ffd7c6!important;font-size:10px!important;font-weight:950!important;letter-spacing:.08em!important;text-transform:uppercase!important}#${SLIP_ID} h2{margin:4px 0!important;color:#fff!important;font-size:28px!important;line-height:1!important;font-weight:950!important}#${SLIP_ID} p{margin:0!important;color:rgba(255,255,255,.82)!important;font-weight:850!important}#${SLIP_ID} .close{border:0!important;border-radius:999px!important;background:rgba(255,255,255,.16)!important;color:#fff!important;width:34px!important;height:34px!important;font-size:22px!important}#${SLIP_ID} .body{display:grid!important;gap:14px!important;padding:18px 20px!important}#${SLIP_ID} .grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}#${SLIP_ID} label{display:grid!important;gap:5px!important;font-size:10px!important;text-transform:uppercase!important;color:#52605a!important;font-weight:950!important}#${SLIP_ID} input,#${SLIP_ID} textarea{width:100%!important;border:1px solid rgba(16,21,19,.12)!important;border-radius:12px!important;background:#fff!important;color:#111815!important;padding:10px!important;font-weight:850!important;text-transform:none!important}#${SLIP_ID} .actions{display:flex!important;gap:8px!important;flex-wrap:wrap!important}#${SLIP_ID} .actions button{border:0!important;border-radius:999px!important;min-height:36px!important;padding:8px 14px!important;background:#111815!important;color:#fff!important;font-weight:950!important}#${SLIP_ID} .actions button:nth-child(2){background:#ef553c!important}#${SLIP_ID} .actions button:nth-child(3){background:#e4e7e7!important;color:#111815!important}
    @media(max-width:1050px){#${CLEAN_ID} .coreHero,#${CLEAN_ID} .coreGrid{grid-template-columns:1fr 1fr!important}#${CLEAN_ID} .coreWide{grid-column:1/-1!important}}@media(max-width:720px){#${CLEAN_ID} .coreHero,#${CLEAN_ID} .coreGrid,#${SLIP_ID} .grid{grid-template-columns:1fr!important}#${CLEAN_ID} .coreHero h2{font-size:28px!important}}
  `;
  document.head.appendChild(style);
}

function rows(items) {
  return items.map(([title, text, tag]) => `<div class="coreRow" data-core-slip="${esc(title)}"><i></i><span><b>${esc(title)}</b><br>${esc(text)}</span><em>${esc(tag)}</em></div>`).join('');
}

function guideLayout() {
  return `<section class="coreHero"><div><small>AI GUIDE / SMART HUB</small><h2>Everything the owner needs next.</h2><p>Setup, jobs, money, worker updates and Command handoffs in one clean owner home.</p></div><aside class="coreMetricWrap"><div class="coreMetric"><b>4</b><span>priority areas</span></div><div class="coreMetric"><b>Safe</b><span>risk waits in Command</span></div></aside></section><section class="coreGrid"><article class="coreCard"><h3>Today pulse</h3><p>Jobs moving, worker proof, messages and invoices due are pulled into one view.</p><div class="coreActions"><button data-core-slip="Today pulse">Open pulse</button><button class="orange" data-core-route="command">Send risky item</button></div></article><article class="coreCard"><h3>Setup checklist</h3><p>Business profile, GST, first client, first job, team invite, worker app and billing basics.</p><button data-core-slip="Setup checklist">Review setup</button></article><article class="coreCard"><h3>Admin debt radar</h3><p>Missing price, worker, date, address, proof, invoice or client detail gets caught early.</p><button data-core-slip="Admin debt radar">Open gaps</button></article><article class="coreCard coreWide"><h3>Next best actions</h3><div class="coreList">${rows([['Setup gap','Business profile, GST, worker app and billing basics.','check'],['Money today','Drafts due, overdue follow-ups and sync-ready invoices.','money'],['Worker update','Proof, GPS, timesheets and worker messages.','field'],['Command handoff','Anything risky waits for owner approval.','approval']])}</div></article></section>`;
}

function commandLayout() {
  return `<section class="coreHero"><div><small>COMMAND APPROVAL DESK</small><h2>Approve, edit or park. Nothing risky runs itself.</h2><p>Draft invoices, proof issues, prepared replies and accounting handoffs come here before sensitive actions happen.</p></div><aside class="coreMetricWrap"><div class="coreMetric"><b>Owner required</b><span>approval stays locked</span></div><div class="coreMetric"><b>Draft only</b><span>accounting handoff is guarded</span></div></aside></section><section class="coreGrid"><article class="coreCard"><h3>Waiting approval</h3><div class="coreList">${rows([['Draft invoice ready','Client, job, proof and amount prepared.','approve'],['Worker proof issue','Photo note needs owner decision.','edit'],['Quote follow-up','Prepared reply ready for review.','park'],['Accounting handoff','Draft-only guard checked.','guarded']])}</div></article><article class="coreCard"><h3>Filled slip preview</h3><p>Every approval opens with client, job, amount, proof, worker, note and recommended action filled.</p><button class="orange" data-core-slip="Filled approval slip">Open filled slip</button></article><article class="coreCard"><h3>Guardrails</h3><p>No automatic sending. No filing. No payout files. Paid status waits for accounting confirmation.</p><button data-core-slip="Command guardrails">Review guardrails</button></article><article class="coreCard coreWide"><h3>Decision bar</h3><p>Use Command for decisions only. Records live on their own pages; approval lives here.</p><div class="coreActions"><button data-core-slip="Approve ready item">Approve</button><button class="orange" data-core-slip="Edit prepared slip">Edit</button><button data-core-slip="Park for later">Park</button><button data-core-slip="Send back for details">Send back</button></div></article></section>`;
}

function clientsLayout() {
  return `<section class="coreHero"><div><small>CLIENT WORKBENCH</small><h2>Clients, service memory and history.</h2><p>One clean place for client details, service notes, saved pricing, access notes, jobs, quotes and invoices.</p></div><aside class="coreMetricWrap"><div class="coreMetric"><b>Memory</b><span>prices and notes stay with client</span></div><div class="coreMetric"><b>History</b><span>jobs, quotes and invoices linked</span></div></aside></section><section class="coreGrid"><article class="coreCard"><h3>Selected client</h3><p>Name, phone, email, address, access notes and preferred schedule in one record.</p><button class="orange" data-core-route="clients-new">Add client</button></article><article class="coreCard"><h3>Service memory</h3><p>Saved price, service notes, preferred frequency and site access stay easy to see.</p><button data-core-slip="Client service memory">Open memory</button></article><article class="coreCard"><h3>Import / export</h3><p>CSV import and client exports should be clear setup tools, not scattered controls.</p><button data-core-slip="Client import help">Import help</button></article><article class="coreCard coreWide"><h3>Client records</h3><div class="coreList">${rows([['Mokopuna','Phone, address, gate code and service history available.','active'],['Final Smoke Client','Service saved and ready for linked jobs.','saved'],['New client draft','Add details, service memory and schedule.','draft']])}</div></article></section>`;
}

function openSlip(title) {
  installStyle();
  let modal = document.getElementById(SLIP_ID);
  if (!modal) { modal = document.createElement('div'); modal.id = SLIP_ID; document.body.appendChild(modal); }
  const page = currentPage() || 'owner';
  const form = [['Page', page], ['Item', title], ['Prepared status', 'Ready for owner review'], ['Owner rule', 'Churvox does the admin. You approve.']].map(([k,v]) => `<label>${esc(k)}${/rule/i.test(k) ? `<textarea rows="3">${esc(v)}</textarea>` : `<input value="${esc(v)}" />`}</label>`).join('');
  modal.innerHTML = `<section class="box"><header><div><small>${esc(page)}</small><h2>${esc(title)}</h2><p>Review this prepared Churvox item.</p></div><button type="button" class="close" data-core-close>×</button></header><div class="body"><div class="grid">${form}</div><div class="actions"><button type="button" data-core-close>Keep</button><button type="button" data-core-command>Send to Command</button><button type="button" data-core-close>Park</button><button type="button" data-core-close>Close</button></div></div></section>`;
  modal.classList.add('open');
}

function layoutFor(page) {
  if (page === 'command') return commandLayout();
  if (page === 'clients') return clientsLayout();
  return guideLayout();
}

function cleanSiblings(root, page) {
  const app = document.querySelector('.churvoxOptionC');
  if (app) app.dataset.coreClean = page ? 'true' : 'false';
  Array.from(root.children).forEach((child) => {
    const keep = child.id === CLEAN_ID || child.id === 'churvox-owner-draft-memory-panel';
    if (page && !keep) child.setAttribute('data-core-hidden', 'true');
    else child.removeAttribute('data-core-hidden');
  });
}

function mount() {
  const page = currentPage();
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  const old = document.getElementById(CLEAN_ID);
  if (!root || !page) { old?.remove(); if (root) cleanSiblings(root, ''); return; }
  installStyle();
  let node = old;
  if (!node) { node = document.createElement('section'); node.id = CLEAN_ID; root.prepend(node); }
  if (node.dataset.page !== page) { node.dataset.page = page; node.innerHTML = layoutFor(page); }
  cleanSiblings(root, page);
}

function clickHandler(event) {
  const route = event.target?.closest?.('[data-core-route]');
  if (route) { event.preventDefault(); const val = route.dataset.coreRoute; window.location.href = val === 'clients-new' ? '/clients/new' : `/dashboard#${val}`; return; }
  const slip = event.target?.closest?.('[data-core-slip]');
  if (slip) { event.preventDefault(); event.stopPropagation(); openSlip(slip.dataset.coreSlip || 'Review item'); return; }
  const modal = document.getElementById(SLIP_ID);
  if (modal?.classList.contains('open')) {
    if (event.target === modal || event.target.closest('[data-core-close]')) { modal.classList.remove('open'); return; }
    if (event.target.closest('[data-core-command]')) { modal.classList.remove('open'); window.history.replaceState({}, document.title, '/dashboard#command'); window.dispatchEvent(new HashChangeEvent('hashchange')); }
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_CORE_CLEAN__) {
  window.__CHURVOX_OWNER_CORE_CLEAN__ = true;
  window.addEventListener('DOMContentLoaded', mount);
  window.addEventListener('load', mount);
  window.addEventListener('hashchange', () => setTimeout(mount, 80));
  window.addEventListener('popstate', () => setTimeout(mount, 80));
  window.addEventListener('churvox:fresh-data-updated', mount);
  document.addEventListener('click', clickHandler, true);
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') document.getElementById(SLIP_ID)?.classList.remove('open'); });
  setInterval(mount, 600);
  mount();
}

export {};