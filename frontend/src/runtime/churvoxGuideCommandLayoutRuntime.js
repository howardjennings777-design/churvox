// Proper AI Guide and Command layout runtime.
// Gives the owner home and approval desk their own layouts instead of generic recovery cards.

const LAYOUT_ID = 'churvox-guide-command-proper-layout';
const MODAL_ID = 'churvox-guide-command-layout-slip';
const STYLE_ID = 'churvox-guide-command-layout-style';

function pageKey() {
  const hash = String(window.location.hash || '').replace('#', '').toLowerCase();
  if (!hash || hash === 'today' || hash === 'aiguide' || hash === 'guide' || hash === 'ai-guide' || hash === 'smart-hub') return 'aiguide';
  if (hash === 'command' || hash === 'command-desk' || hash === 'command-board') return 'command';
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
    #${LAYOUT_ID}{grid-column:1/-1;display:grid;gap:12px;color:#111815;margin-bottom:0}
    .gcHero{display:grid;grid-template-columns:1.3fr .7fr;gap:12px;border-radius:20px;background:linear-gradient(115deg,#101513,#1f2925 68%,#ef553c);color:#fff;padding:18px;box-shadow:0 18px 44px rgba(16,21,19,.16);overflow:hidden}
    .gcHero small{display:block;color:#ffd7c6;font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}
    .gcHero h2{margin:0;color:#fff;font-size:34px;line-height:.95;font-weight:950;letter-spacing:-.05em}
    .gcHero p{margin:8px 0 0;color:rgba(255,255,255,.84);font-size:13px;font-weight:850;line-height:1.35}
    .gcHero aside{display:grid;gap:8px;align-content:start}
    .gcMetric{border:1px solid rgba(255,255,255,.16);border-radius:14px;background:rgba(255,255,255,.1);padding:11px}
    .gcMetric b{display:block;color:#fff;font-size:18px;font-weight:950}.gcMetric span{color:rgba(255,255,255,.78);font-size:11px;font-weight:850}
    .gcGrid{display:grid;grid-template-columns:1.05fr 1fr 1fr;gap:12px}.gcCard{border:1px solid rgba(16,21,19,.08);border-radius:17px;background:#fff;box-shadow:0 14px 30px rgba(16,21,19,.06);padding:15px;display:grid;gap:9px;min-height:142px}.gcCard h3{margin:0;color:#111815;font-size:18px;font-weight:950}.gcCard p{margin:0;color:#52605a;font-size:12px;font-weight:850;line-height:1.38}.gcCard button,.gcActions button{border:0;border-radius:999px;min-height:32px;padding:7px 11px;background:#111815;color:#fff;font-size:11px;font-weight:950}.gcCard button.orange,.gcActions button.orange{background:#ef553c}.gcActions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.gcList{display:grid;gap:7px}.gcRow{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;border:1px solid rgba(16,21,19,.07);border-radius:12px;background:#f7f8f4;padding:8px;cursor:pointer}.gcRow i{width:9px;height:9px;border-radius:999px;background:#ef553c}.gcRow b{font-size:12px;color:#111815}.gcRow span{font-size:11px;color:#52605a;font-weight:850}.gcRow em{font-style:normal;font-size:9px;font-weight:950;color:#9a3412;background:#fff7ed;border-radius:999px;padding:4px 6px;text-transform:uppercase}.gcWide{grid-column:1/-1}.gcCommandBoard{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}.gcDecisionBar{display:flex;gap:8px;flex-wrap:wrap;border:1px solid rgba(239,85,60,.16);border-radius:16px;background:#fff8f4;padding:12px}.gcDecisionBar button{border:0;border-radius:999px;min-height:34px;padding:8px 13px;font-size:11px;font-weight:950}.gcDecisionBar button:nth-child(1){background:#111815;color:#fff}.gcDecisionBar button:nth-child(2){background:#ef553c;color:#fff}.gcDecisionBar button:nth-child(3){background:#e4e7e7;color:#111815}
    #${MODAL_ID}{position:fixed;inset:0;z-index:1000004;display:none;place-items:center;background:rgba(16,21,19,.5);padding:18px}#${MODAL_ID}.open{display:grid}#${MODAL_ID} .box{width:min(900px,96vw);max-height:92vh;overflow:auto;border-radius:24px;background:#f7f8f4;color:#111815;box-shadow:0 30px 90px rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.62)}#${MODAL_ID} header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:18px 20px;background:linear-gradient(115deg,#101513,#202a26 70%,#ef553c);color:#fff}#${MODAL_ID} small{display:block;color:#ffd7c6;font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}#${MODAL_ID} h2{margin:4px 0;color:#fff;font-size:28px;line-height:1;font-weight:950}#${MODAL_ID} p{margin:0;color:rgba(255,255,255,.82);font-weight:850}#${MODAL_ID} .close{border:0;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;width:34px;height:34px;font-size:22px}#${MODAL_ID} .body{display:grid;gap:14px;padding:18px 20px}#${MODAL_ID} .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#${MODAL_ID} label{display:grid;gap:5px;font-size:10px;text-transform:uppercase;color:#52605a;font-weight:950}#${MODAL_ID} input,#${MODAL_ID} textarea{width:100%;border:1px solid rgba(16,21,19,.12);border-radius:12px;background:#fff;color:#111815;padding:10px;font-weight:850;text-transform:none}#${MODAL_ID} .actions{display:flex;gap:8px;flex-wrap:wrap}#${MODAL_ID} .actions button{border:0;border-radius:999px;min-height:36px;padding:8px 14px;background:#111815;color:#fff;font-weight:950}#${MODAL_ID} .actions button:nth-child(2){background:#ef553c}#${MODAL_ID} .actions button:nth-child(3){background:#e4e7e7;color:#111815}
    @media(max-width:1080px){.gcHero,.gcGrid,.gcCommandBoard{grid-template-columns:1fr 1fr}.gcWide{grid-column:1/-1}}@media(max-width:720px){.gcHero,.gcGrid,.gcCommandBoard{grid-template-columns:1fr}.gcHero h2{font-size:28px}#${MODAL_ID} .grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

const guideRows = [
  ['Setup gap', 'Business profile, GST, worker app and billing basics.', 'check'],
  ['Money today', 'Drafts due, overdue follow-ups and sync-ready invoices.', 'money'],
  ['Worker update', 'Proof, GPS, timesheets and worker messages.', 'field'],
  ['Command handoff', 'Anything risky waits for owner approval.', 'approval'],
];

const commandRows = [
  ['Draft invoice ready', 'Client, job, proof and amount prepared.', 'approve'],
  ['Worker proof issue', 'Photo note needs owner decision.', 'edit'],
  ['Quote follow-up', 'Prepared reply ready for review.', 'park'],
  ['Accounting sync', 'Draft-only sync guard checked.', 'guarded'],
];

function guideLayout() {
  return `<section class="gcHero"><div><small>AI GUIDE / SMART HUB</small><h2>Everything the owner needs next.</h2><p>Churvox surfaces setup gaps, today’s admin, money, worker updates and the next safe owner decision without making you hunt through pages.</p></div><aside><div class="gcMetric"><b>4</b><span>admin areas to check</span></div><div class="gcMetric"><b>Owner safe</b><span>risk goes to Command</span></div></aside></section><section class="gcGrid"><article class="gcCard"><h3>Today pulse</h3><p>Jobs moving, worker proof, client replies and invoices due are pulled into a plain owner view.</p><div class="gcActions"><button data-gc-slip="Today pulse">Open pulse</button><button class="orange" data-gc-route="command">Send risky item</button></div></article><article class="gcCard"><h3>Setup checklist</h3><p>Business profile, GST, first client, first job, team invite, worker app and billing basics stay visible.</p><button data-gc-slip="Setup checklist">Review setup</button></article><article class="gcCard"><h3>Admin debt radar</h3><p>Missing price, date, worker, address, proof, invoice or client detail is caught early.</p><button data-gc-slip="Admin debt radar">Open gaps</button></article><article class="gcCard gcWide"><h3>Next best actions</h3><div class="gcList">${guideRows.map(([a,b,c]) => `<div class="gcRow" data-gc-slip="${esc(a)}"><i></i><span><b>${esc(a)}</b><br>${esc(b)}</span><em>${esc(c)}</em></div>`).join('')}</div></article></section>`;
}

function commandLayout() {
  return `<section class="gcHero"><div><small>COMMAND APPROVAL DESK</small><h2>Approve, edit or park. Nothing risky runs itself.</h2><p>Command is the owner decision desk. Draft invoices, proof issues, prepared replies and accounting handoffs come here before anything sensitive happens.</p></div><aside><div class="gcMetric"><b>Owner required</b><span>approval stays locked</span></div><div class="gcMetric"><b>Draft only</b><span>Xero/MYOB guardrails</span></div></aside></section><section class="gcCommandBoard"><article class="gcCard"><h3>Waiting approval</h3><div class="gcList">${commandRows.map(([a,b,c]) => `<div class="gcRow" data-gc-slip="${esc(a)}"><i></i><span><b>${esc(a)}</b><br>${esc(b)}</span><em>${esc(c)}</em></div>`).join('')}</div></article><article class="gcCard"><h3>Filled slip preview</h3><p>Each approval should open with client, job, amount, proof, worker, note and recommended action already filled.</p><button class="orange" data-gc-slip="Filled approval slip">Open filled slip</button></article><article class="gcCard"><h3>Guardrails</h3><p>No automatic invoice sending. No tax filing. No bank payout files. Only mark paid after accounting refresh confirms paid.</p><button data-gc-slip="Command guardrails">Review guardrails</button></article><article class="gcCard gcWide"><h3>Decision bar</h3><p>Use Command for decisions only. Records live on their own pages; approval lives here.</p><div class="gcDecisionBar"><button data-gc-slip="Approve ready item">Approve</button><button data-gc-slip="Edit prepared slip">Edit</button><button data-gc-slip="Park for later">Park</button><button data-gc-slip="Send back for details">Send back</button></div></article></section>`;
}

function openSlip(title) {
  installStyle();
  let modal = document.getElementById(MODAL_ID);
  if (!modal) { modal = document.createElement('div'); modal.id = MODAL_ID; document.body.appendChild(modal); }
  const page = pageKey() || 'aiguide';
  const rows = [
    ['Page', page === 'command' ? 'Command approval desk' : 'AI Guide / Smart Hub'],
    ['Item', title],
    ['Prepared status', 'Ready for owner review'],
    ['Owner decision', page === 'command' ? 'Approve, edit, park or send back' : 'Review or send risky item to Command'],
    ['Owner rule', 'Churvox does the admin. You approve.'],
  ].map(([k,v]) => `<label>${esc(k)}${/decision|rule/i.test(k) ? `<textarea rows="3">${esc(v)}</textarea>` : `<input value="${esc(v)}" />`}</label>`).join('');
  modal.innerHTML = `<section class="box"><header><div><small>${esc(page)}</small><h2>${esc(title)}</h2><p>Review the prepared Churvox item before deciding.</p></div><button type="button" class="close" data-gc-close>×</button></header><div class="body"><div class="grid">${rows}</div><div class="actions"><button type="button" data-gc-close>Keep</button><button type="button" data-gc-command>Send to Command</button><button type="button" data-gc-close>Park</button><button type="button" data-gc-close>Close</button></div></div></section>`;
  modal.classList.add('open');
}

function mount() {
  const page = pageKey();
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  const old = document.getElementById(LAYOUT_ID);
  if (!root || !page) { old?.remove(); document.getElementById('churvox-owner-page-recovery')?.style.removeProperty('display'); return; }
  installStyle();
  document.getElementById('churvox-owner-page-recovery')?.style.setProperty('display', 'none', 'important');
  let node = old;
  if (!node) { node = document.createElement('section'); node.id = LAYOUT_ID; root.prepend(node); }
  if (node.dataset.page !== page) { node.dataset.page = page; node.innerHTML = page === 'command' ? commandLayout() : guideLayout(); }
}

function clickHandler(event) {
  const route = event.target?.closest?.('[data-gc-route]');
  if (route) { event.preventDefault(); window.history.replaceState({}, document.title, `/dashboard#${route.dataset.gcRoute}`); window.dispatchEvent(new HashChangeEvent('hashchange')); return; }
  const slip = event.target?.closest?.('[data-gc-slip]');
  if (slip) { event.preventDefault(); event.stopPropagation(); openSlip(slip.dataset.gcSlip || 'Review item'); return; }
  const modal = document.getElementById(MODAL_ID);
  if (modal?.classList.contains('open')) {
    if (event.target === modal || event.target.closest('[data-gc-close]')) { modal.classList.remove('open'); return; }
    if (event.target.closest('[data-gc-command]')) { modal.classList.remove('open'); window.history.replaceState({}, document.title, '/dashboard#command'); window.dispatchEvent(new HashChangeEvent('hashchange')); }
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_GUIDE_COMMAND_LAYOUT__) {
  window.__CHURVOX_GUIDE_COMMAND_LAYOUT__ = true;
  window.addEventListener('DOMContentLoaded', mount);
  window.addEventListener('load', mount);
  window.addEventListener('hashchange', () => setTimeout(mount, 80));
  window.addEventListener('popstate', () => setTimeout(mount, 80));
  window.addEventListener('churvox:fresh-data-updated', mount);
  document.addEventListener('click', clickHandler, true);
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') document.getElementById(MODAL_ID)?.classList.remove('open'); });
  setInterval(mount, 1000);
  mount();
}

export {};