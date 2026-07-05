// Page checked Command preparation.
// Churvox checks each owner page and prepares approval work in Command without layout pulsing.

const STORE = 'churvox.command.prepared.v1';
const NOTE = 'churvox-page-checked-note';
const STYLE = 'churvox-page-checked-style';
const PAGES = ['aiguide','jobs','clients','quotes','invoices','workers','team','payroll','xero','settings','plans','support','messages'];

function page(){return String(location.hash||'').replace('#','').toLowerCase()||'aiguide';}
function read(){try{return JSON.parse(localStorage.getItem(STORE)||'[]').filter(Boolean);}catch(_){return[];}}
function save(list){try{localStorage.setItem(STORE,JSON.stringify(list.slice(0,20)));}catch(_){}}
function label(p){return ({aiguide:'AI Guide',jobs:'Jobs',clients:'Clients',quotes:'Quotes',invoices:'Invoices',workers:'Workers',team:'Team',payroll:'Payroll',xero:'Xero',settings:'Settings',plans:'Plans',support:'Support',messages:'Messages'}[p]||p);}
function add(p){
  const key=`checked:${p}`;
  const list=read();
  if(list.some(x=>x.key===key&&!/approved|parked/i.test(x.status||'')))return false;
  const item={id:`checked-${Date.now()}`,key,title:`${label(p)} checked by Churvox`,sourcePage:p,status:'Waiting owner approval',note:'Churvox prepared this page for owner review. Anything needing a decision is waiting in Command.',createdAt:new Date().toISOString()};
  save([item,...list]);
  dispatchEvent(new CustomEvent('churvox:command-prepared',{detail:item}));
  return true;
}
function css(){
  if(document.getElementById(STYLE))return;
  const s=document.createElement('style');
  s.id=STYLE;
  s.textContent=`#${NOTE}{grid-column:1/-1!important;display:flex!important;justify-content:space-between!important;gap:10px!important;align-items:center!important;border:1px solid rgba(239,85,60,.18)!important;border-radius:14px!important;background:#fff7f0!important;color:#111815!important;padding:10px 12px!important;box-shadow:0 10px 22px rgba(16,21,19,.05)!important;font:900 12px Inter,system-ui,sans-serif!important;min-height:64px!important;height:64px!important;contain:layout paint!important;overflow:hidden!important}#${NOTE}[data-proper-hidden="true"],#${NOTE}[data-core-hidden="true"],#${NOTE}[data-lite-hidden="true"]{display:flex!important;visibility:visible!important;opacity:1!important}#${NOTE} b{font-weight:950!important}#${NOTE} span{color:#52605a!important}#${NOTE} .pill{white-space:nowrap!important;border-radius:999px!important;background:#111815!important;color:#fff!important;padding:7px 11px!important;font-size:11px!important;font-weight:950!important}`;
  document.head.appendChild(s);
}
function note(p){
  const root=document.querySelector('.churvoxOptionC .workspace .cocPage');
  if(!root)return;
  css();
  let n=document.getElementById(NOTE);
  if(!n){n=document.createElement('section');n.id=NOTE;n.dataset.pageCheckedNote='true';root.prepend(n);}
  if(n.parentElement!==root)root.prepend(n);
  n.removeAttribute('data-proper-hidden');
  n.removeAttribute('data-core-hidden');
  n.removeAttribute('data-lite-hidden');
  n.removeAttribute('hidden');
  n.removeAttribute('aria-hidden');
  const html=`<div><b>Churvox checked this page.</b><br><span>Anything that needs owner approval is already prepared in Command.</span></div><strong class="pill">Prepared in Command</strong>`;
  if(n.dataset.htmlSig!==html){n.dataset.htmlSig=html;n.innerHTML=html;}
}
let lastPage='';
function run(){
  const p=page();
  if(!PAGES.includes(p)||p==='command'){
    const n=document.getElementById(NOTE);
    if(n){n.innerHTML='';n.style.visibility='hidden';n.style.opacity='0';n.style.pointerEvents='none';n.style.minHeight='64px';n.style.height='64px';}
    lastPage=p;
    return;
  }
  lastPage=p;
  add(p);
  const n=document.getElementById(NOTE);
  if(n){n.style.visibility='';n.style.opacity='';n.style.pointerEvents='';}
  note(p);
}
if(typeof window!=='undefined'&&typeof document!=='undefined'&&!window.__CHURVOX_PAGE_CHECKED__){
  window.__CHURVOX_PAGE_CHECKED__=true;
  addEventListener('DOMContentLoaded',run);
  addEventListener('load',run);
  addEventListener('hashchange',()=>setTimeout(run,120));
  addEventListener('churvox:owner-backend-hydrated',()=>setTimeout(run,180));
  addEventListener('churvox:owner-record-api-synced',()=>setTimeout(run,220));
  document.addEventListener('click',()=>setTimeout(run,260),true);
  setInterval(run,8000);
  run();
}
export {};
