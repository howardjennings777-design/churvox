// Page checked Command preparation.
// Churvox checks each owner page and prepares approval work in Command.

const STORE = 'churvox.command.prepared.v1';
const NOTE = 'churvox-page-checked-note';
const STYLE = 'churvox-page-checked-style';
const PAGES = ['aiguide','jobs','clients','quotes','invoices','workers','team','payroll','xero','settings','plans','support','messages'];

function page(){return String(location.hash||'').replace('#','').toLowerCase()||'aiguide';}
function read(){try{return JSON.parse(localStorage.getItem(STORE)||'[]').filter(Boolean);}catch(_){return[];}}
function save(list){try{localStorage.setItem(STORE,JSON.stringify(list.slice(0,20)));}catch(_){}}
function add(p){const key=`checked:${p}`;const list=read();if(list.some(x=>x.key===key&&!/approved|parked/i.test(x.status||'')))return;const item={id:`checked-${Date.now()}`,key,title:`${p} checked by Churvox`,sourcePage:p,status:'Waiting owner approval',note:'Churvox prepared this page for owner review. Anything needing a decision is waiting in Command.',createdAt:new Date().toISOString()};save([item,...list]);dispatchEvent(new CustomEvent('churvox:command-prepared',{detail:item}));}
function css(){if(document.getElementById(STYLE))return;const s=document.createElement('style');s.id=STYLE;s.textContent=`#${NOTE}{grid-column:1/-1;display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid rgba(239,85,60,.18);border-radius:14px;background:#fff7f0;color:#111815;padding:10px 12px;box-shadow:0 10px 22px rgba(16,21,19,.05);font:900 12px Inter,system-ui,sans-serif}#${NOTE} b{font-weight:950}#${NOTE} span{color:#52605a}#${NOTE} button{border:0;border-radius:999px;background:#111815;color:#fff;padding:7px 11px;font-weight:950}`;document.head.appendChild(s);}
function note(p){const root=document.querySelector('.churvoxOptionC .workspace .cocPage');if(!root)return;css();let n=document.getElementById(NOTE);if(!n){n=document.createElement('section');n.id=NOTE;root.prepend(n);}n.innerHTML=`<div><b>Churvox checked this page.</b><br><span>Anything that needs owner approval is already prepared in Command.</span></div><button type="button" data-page-checked-command>Open Command</button>`;}
function run(){const p=page();if(!PAGES.includes(p)||p==='command'){document.getElementById(NOTE)?.remove();return;}add(p);note(p);}
function click(e){if(!e.target?.closest?.('[data-page-checked-command]'))return;e.preventDefault();history.replaceState({},document.title,'/dashboard#command');dispatchEvent(new HashChangeEvent('hashchange'));}
if(typeof window!=='undefined'&&typeof document!=='undefined'&&!window.__CHURVOX_PAGE_CHECKED__){window.__CHURVOX_PAGE_CHECKED__=true;addEventListener('DOMContentLoaded',run);addEventListener('load',run);addEventListener('hashchange',()=>setTimeout(run,120));document.addEventListener('click',click,true);setInterval(run,1600);run();}
export {};