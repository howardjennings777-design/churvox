// Lite clean owner page layouts for the remaining owner pages.

const ID = 'churvox-owner-lite-clean';
const STYLE_ID = 'churvox-owner-lite-clean-style';
const SLIP_ID = 'churvox-owner-lite-slip';

const PAGES = {
  jobs: ['JOBS WORK BOARD', 'Jobs, proof and recurring work.', 'Job list|Editable form|Recurring setup|Proof review', 'client, worker, price, date, time and status'],
  workers: ['WORKER FIELD VIEW', 'Workers, GPS, time and proof.', 'Worker map|Worker jobs|Timesheets|Messages', 'field activity belongs here'],
  quotes: ['QUOTE PIPELINE', 'Quotes from draft to accepted job.', 'Draft quote|Follow up|Accepted to job|Review drafts', 'scope, price, status and follow-up'],
  invoices: ['MONEY DESK', 'Invoices, due money and guarded sync.', 'Draft invoice|Due / overdue|Accounting handoff|Paid guard', 'draft only and owner approved'],
  team: ['TEAM CONTROL', 'People, roles, invites and access.', 'Staff list|Invite worker|CSV import|Access rules', 'people and permissions only'],
  payroll: ['PAYROLL REVIEW', 'Timesheets, periods and export only.', 'Timesheets|Pay periods|Worker slips|Guardrails', 'no tax filing and no payout files'],
  workers: ['WORKER FIELD VIEW', 'Workers, GPS, proof and messages.', 'Worker map|Worker jobs|Timesheets|Messages', 'maps and live field activity'],
  xero: ['ACCOUNTING HANDOFF', 'Xero/MYOB draft sync only.', 'Connection status|Draft sync|Export pack|Paid guard', 'no auto sending, no tax filing'],
  settings: ['BUSINESS CONTROLS', 'Profile, GST, branding and security.', 'Business details|Notifications|Security|Exports', 'practical owner controls'],
  plans: ['PLANS AND BILLING', 'Current plan, usage and checkout.', 'Current plan|Usage|Billing|Locked pricing', 'pricing stays locked'],
  support: ['SUPPORT DESK', 'Help, setup and support messages.', 'New ticket|Setup help|Billing help|Sync help', 'hello@churvox.com'],
  messages: ['MESSAGES', 'Worker updates and client replies.', 'Worker messages|Client replies|Prepared reply|Needs decision', 'owner controls sending'],
};

function key(){const h=String(location.hash||'').replace('#','').toLowerCase();return PAGES[h]?h:'';}
function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function style(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
    .churvoxOptionC[data-lite-clean="true"] .cocPage>[data-lite-hidden="true"]{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;opacity:0!important}
    #${ID}{grid-column:1/-1!important;display:grid!important;gap:12px!important;color:#111815!important}
    #${ID} .hero{display:grid!important;grid-template-columns:1.2fr .8fr!important;gap:12px!important;border-radius:20px!important;background:linear-gradient(115deg,#101513,#1f2925 68%,#ef553c)!important;color:#fff!important;padding:18px!important;box-shadow:0 18px 44px rgba(16,21,19,.16)!important}
    #${ID} small{display:block!important;color:#ffd7c6!important;font-size:10px!important;font-weight:950!important;letter-spacing:.08em!important;text-transform:uppercase!important;margin-bottom:8px!important}
    #${ID} h2{margin:0!important;color:#fff!important;font-size:34px!important;line-height:.95!important;font-weight:950!important;letter-spacing:-.05em!important}
    #${ID} p{margin:8px 0 0!important;color:rgba(255,255,255,.84)!important;font-size:13px!important;font-weight:850!important;line-height:1.35!important}
    #${ID} .metric{border:1px solid rgba(255,255,255,.16)!important;border-radius:14px!important;background:rgba(255,255,255,.1)!important;padding:11px!important;color:#fff!important;font-weight:950!important}
    #${ID} .grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important}
    #${ID} .card{border:1px solid rgba(16,21,19,.08)!important;border-radius:17px!important;background:#fff!important;box-shadow:0 14px 30px rgba(16,21,19,.06)!important;padding:15px!important;display:grid!important;gap:9px!important;min-height:128px!important}
    #${ID} .card h3{margin:0!important;color:#111815!important;font-size:17px!important;font-weight:950!important}#${ID} .card span{color:#52605a!important;font-size:12px!important;font-weight:850!important;line-height:1.35!important}
    #${ID} button{border:0!important;border-radius:999px!important;min-height:32px!important;padding:7px 11px!important;background:#111815!important;color:#fff!important;font-size:11px!important;font-weight:950!important}#${ID} .orange{background:#ef553c!important}
    #${SLIP_ID}{position:fixed!important;inset:0!important;z-index:1000007!important;display:none!important;place-items:center!important;background:rgba(16,21,19,.5)!important;padding:18px!important}#${SLIP_ID}.open{display:grid!important}#${SLIP_ID} .box{width:min(760px,96vw)!important;border-radius:22px!important;background:#f7f8f4!important;color:#111815!important;box-shadow:0 30px 90px rgba(0,0,0,.3)!important}#${SLIP_ID} header{display:flex!important;justify-content:space-between!important;gap:12px!important;padding:18px 20px!important;background:linear-gradient(115deg,#101513,#202a26 70%,#ef553c)!important;color:#fff!important}#${SLIP_ID} h2{margin:0!important;color:#fff!important;font-size:25px!important}#${SLIP_ID} .body{padding:18px 20px!important;display:grid!important;gap:12px!important}#${SLIP_ID} textarea{width:100%!important;min-height:110px!important;border:1px solid rgba(16,21,19,.12)!important;border-radius:12px!important;background:#fff!important;color:#111815!important;padding:10px!important;font-weight:850!important}#${SLIP_ID} .actions{display:flex!important;gap:8px!important;flex-wrap:wrap!important}#${SLIP_ID} .actions button{border:0!important;border-radius:999px!important;min-height:36px!important;padding:8px 14px!important;background:#111815!important;color:#fff!important;font-weight:950!important}
    @media(max-width:1000px){#${ID} .hero,#${ID} .grid{grid-template-columns:1fr 1fr!important}}@media(max-width:680px){#${ID} .hero,#${ID} .grid{grid-template-columns:1fr!important}#${ID} h2{font-size:28px!important}}
  `;document.head.appendChild(s);
}

function render(page){const d=PAGES[page];const cards=d[2].split('|').map((x,i)=>`<article class="card"><h3>${esc(x)}</h3><span>${esc(d[3])}</span><button class="${i===0?'orange':''}" data-lite-slip="${esc(x)}">Open</button></article>`).join('');return `<section class="hero"><div><small>${esc(d[0])}</small><h2>${esc(d[1])}</h2><p>${esc(d[3])}. Churvox does the admin. You approve.</p></div><aside><div class="metric">Clean workspace</div><div class="metric">No duplicate stacks</div></aside></section><section class="grid">${cards}</section>`;}
function hide(root,page){const app=document.querySelector('.churvoxOptionC');if(app)app.dataset.liteClean=page?'true':'false';Array.from(root.children).forEach(c=>{const keep=c.id===ID||c.id==='churvox-owner-draft-memory-panel';if(page&&!keep)c.setAttribute('data-lite-hidden','true');else c.removeAttribute('data-lite-hidden');});}
function mount(){const page=key();const root=document.querySelector('.churvoxOptionC .workspace .cocPage');const old=document.getElementById(ID);if(!root||!page){old?.remove();if(root)hide(root,'');return;}style();let node=old;if(!node){node=document.createElement('section');node.id=ID;root.prepend(node);}if(node.dataset.page!==page){node.dataset.page=page;node.innerHTML=render(page);}hide(root,page);}
function openSlip(title){style();let m=document.getElementById(SLIP_ID);if(!m){m=document.createElement('div');m.id=SLIP_ID;document.body.appendChild(m);}m.innerHTML=`<section class="box"><header><h2>${esc(title)}</h2><button data-lite-close>×</button></header><div class="body"><textarea>${esc(title)} is ready for owner review. Churvox does the admin. You approve.</textarea><div class="actions"><button data-lite-close>Keep</button><button data-lite-command>Send to Command</button><button data-lite-close>Close</button></div></div></section>`;m.classList.add('open');}
function click(e){const s=e.target?.closest?.('[data-lite-slip]');if(s){e.preventDefault();e.stopPropagation();openSlip(s.dataset.liteSlip);return;}const m=document.getElementById(SLIP_ID);if(m?.classList.contains('open')){if(e.target===m||e.target.closest('[data-lite-close]')){m.classList.remove('open');return;}if(e.target.closest('[data-lite-command]')){m.classList.remove('open');history.replaceState({},document.title,'/dashboard#command');dispatchEvent(new HashChangeEvent('hashchange'));}}}

if(typeof window!=='undefined'&&typeof document!=='undefined'&&!window.__CHURVOX_LITE_CLEAN__){window.__CHURVOX_LITE_CLEAN__=true;addEventListener('DOMContentLoaded',mount);addEventListener('load',mount);addEventListener('hashchange',()=>setTimeout(mount,80));addEventListener('popstate',()=>setTimeout(mount,80));document.addEventListener('click',click,true);addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById(SLIP_ID)?.classList.remove('open');});setInterval(mount,700);mount();}

export {};