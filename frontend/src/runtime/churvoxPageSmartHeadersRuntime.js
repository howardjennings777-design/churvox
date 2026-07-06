import API_BASE from '../lib/apiBase';

const ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
let cache = { at: 0, data: null };
let busy = false;
let lastKey = '';
let lastHtml = '';

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function list(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.actions)) return payload.actions;
  return [];
}
function pageKey() {
  const path = window.location.pathname || '';
  if (!path.startsWith('/dashboard') && path !== '/plans' && path !== '/guide' && path !== '/setup' && path !== '/setup-guide') return '';
  const hash = lower((window.location.hash || '').replace('#', ''));
  if (hash) return hash;
  const title = lower(document.querySelector('.cvxTopTitle h1')?.textContent || document.querySelector('h1')?.textContent || 'today');
  if (/command/.test(title)) return 'command';
  if (/job/.test(title)) return 'jobs';
  if (/client/.test(title)) return 'clients';
  if (/worker/.test(title)) return 'workers';
  if (/message/.test(title)) return 'messages';
  if (/quote/.test(title)) return 'quotes';
  if (/invoice/.test(title)) return 'invoices';
  if (/team/.test(title)) return 'team';
  if (/payroll/.test(title)) return 'payroll';
  if (/xero|account/.test(title)) return 'xero';
  if (/setting/.test(title)) return 'settings';
  if (/plan/.test(title)) return 'plans';
  if (/help|guide|setup/.test(title)) return 'help';
  return 'today';
}
async function get(path) {
  try {
    const res = await fetch(`${ROOT}${path}`, { credentials: 'include' });
    return await res.json().catch(() => ({}));
  } catch {
    return {};
  }
}
async function loadData() {
  if (Date.now() - cache.at < 15000 && cache.data) return cache.data;
  const [clients, jobs, team, quotes, invoices, messages, command, xero] = await Promise.all([
    get('/clients'), get('/jobs'), get('/team'), get('/quotes'), get('/invoices'), get('/messages'), get('/command/actions'), get('/xero/status')
  ]);
  cache = { at: Date.now(), data: {
    clients: list(clients, 'clients'), jobs: list(jobs, 'jobs'), team: list(team, 'team'), quotes: list(quotes, 'quotes'), invoices: list(invoices, 'invoices'), messages: list(messages, 'messages'), command: list(command, 'actions'), xero
  } };
  return cache.data;
}
function amount(row) { const n = Number(String(row?.price || row?.amount || row?.total || row?.balance || 0).replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : 0; }
function completeJobs(jobs) { return jobs.filter(j => /complete|done|finished/.test(lower(j.status || j.job_status || j.workflow_status))).length; }
function missingJobInfo(jobs) { return jobs.filter(j => !clean(j.client_name || j.client || j.customer_name) || !clean(j.address || j.site_address || j.job_address) || !clean(j.worker || j.worker_name || j.assigned_worker_name) || !clean(j.date || j.scheduled_date) || !clean(j.time || j.scheduled_time) || amount(j) <= 0).length; }
function invoiceReady(jobs, invoices) { return Math.max(0, completeJobs(jobs) - invoices.length); }
function openItems(rows) { return rows.filter(r => !/paid|done|complete|closed|sent/.test(lower(r.status || r.invoice_status || r.quote_status))).length; }
function connected(xero) { return Boolean(xero?.connected || xero?.xero_connected || xero?.is_connected || xero?.tenant_name); }
function stat(a,b,c){return {value:a,label:b,note:c||''};}
function model(key,d){
  const data = {
    today: {label:'Today brain', title:`${d.command.length} owner checks, ${missingJobInfo(d.jobs)} jobs need admin`, copy:'Today should tell the owner what matters now: work, admin, money and problems.', cta:'Open Command', target:'#command', tone:true, stats:[stat(d.jobs.length,'Jobs in system'),stat(d.command.length,'Command checks'),stat(invoiceReady(d.jobs,d.invoices),'Invoice chances')]},
    jobs: {label:'Jobs brain', title:`${d.jobs.length - missingJobInfo(d.jobs)} clean jobs, ${missingJobInfo(d.jobs)} need admin`, copy:'Jobs are the truth record. Churvox checks whether each job is ready to run, finish and invoice.', cta:'Add job', target:'#jobs', stats:[stat(d.jobs.length,'Total jobs'),stat(completeJobs(d.jobs),'Completed'),stat(invoiceReady(d.jobs,d.invoices),'Ready to invoice')]},
    clients: {label:'Client memory', title:`${d.clients.length} clients, ${d.clients.filter(c=>!clean(c.address || c.site_address)).length} missing site details`, copy:'Client pages should remember usual work, site notes, unpaid work and the next job.', cta:'Add client', target:'#clients', stats:[stat(d.clients.length,'Clients'),stat(d.jobs.length,'Linked jobs'),stat(d.invoices.length,'Invoices')]},
    workers: {label:'Worker brain', title:`${d.team.length} people set up`, copy:'Workers should show job load, proof, problems and field status without making the owner hunt.', cta:'Open workers', target:'#workers', stats:[stat(d.team.length,'People'),stat(d.jobs.filter(j=>clean(j.worker || j.worker_name || j.assigned_worker_name)).length,'Assigned jobs'),stat(d.messages.length,'Messages')]},
    messages: {label:'Message sorter', title:`${d.messages.length} messages to sort`, copy:'Messages should become job updates, client questions, worker problems or Command checks.', cta:'Open Command', target:'#command', stats:[stat(d.messages.length,'Messages'),stat(d.command.length,'Command items'),stat(d.jobs.length,'Job context')]},
    quotes: {label:'Quote brain', title:`${d.quotes.length} quotes, ${openItems(d.quotes)} still open`, copy:'Quotes should use client memory and job history so drafts are easier to approve.', cta:'New quote', target:'#quotes', stats:[stat(d.quotes.length,'Quotes'),stat(openItems(d.quotes),'Open'),stat(d.clients.length,'Clients')]},
    invoices: {label:'Money desk', title:`${d.invoices.length} invoices, ${invoiceReady(d.jobs,d.invoices)} jobs may need drafts`, copy:'Invoices should show proof, price, job status and approval readiness before accounting sync.', cta:'Open invoices', target:'#invoices', stats:[stat(d.invoices.length,'Invoices'),stat(invoiceReady(d.jobs,d.invoices),'Draft chances'),stat(completeJobs(d.jobs),'Completed jobs')]},
    team: {label:'Team setup', title:`${d.team.length} team records`, copy:'Team should help owners invite people, test worker access and keep roles clear.', cta:'Add team member', target:'#team', stats:[stat(d.team.length,'Team'),stat(d.jobs.length,'Jobs'),stat(d.messages.length,'Messages')]},
    payroll: {label:'Pay review', title:'Review hours before export', copy:'Payroll should stay a review ledger: hours, adjustments, pay period and clean export.', cta:'Open payroll', target:'#payroll', stats:[stat(d.team.length,'People'),stat(d.jobs.length,'Job records'),stat(completeJobs(d.jobs),'Completed')]},
    xero: {label:'Accounting guard', title:connected(d.xero)?'Accounting is connected':'Accounting needs connection', copy:'Accounting should stay controlled: draft prep, owner review and clear status before anything moves.', cta:'Open accounting', target:'#xero', stats:[stat(connected(d.xero)?'On':'Off','Connection'),stat(d.invoices.length,'Invoices'),stat(invoiceReady(d.jobs,d.invoices),'Draft chances')]},
    settings: {label:'Business setup', title:'Make the business profile complete', copy:'Settings should guide logo, GST, invoice details, branding and owner preferences.', cta:'Open settings', target:'#settings', stats:[stat(d.clients.length?'Set':'Start','Clients'),stat(d.team.length?'Set':'Start','Team'),stat(connected(d.xero)?'On':'Off','Accounting')]},
    plans: {label:'Plan fit', title:'Show the plan around actual use', copy:'Plans should explain what is unlocked based on team size, Command needs and accounting use.', cta:'Review plans', target:'#plans', stats:[stat(d.team.length,'People'),stat(d.jobs.length,'Jobs'),stat(d.command.length,'Checks')]},
    help: {label:'Help guide', title:'Start with what the owner is trying to do', copy:'Help should guide common jobs: first job, worker app, invoice, Command and accounting.', cta:'Open Today', target:'#today', stats:[stat('5','Guides'),stat(d.command.length,'Checks'),stat(d.jobs.length,'Jobs')]}
  };
  return data[key] || data.today;
}
function html(m){return `<section class="cvxPageSmartHeader ${m.tone?'cvxPageSmartHeaderTone':''}" data-churvox-page-smart-header="true"><div class="cvxPageSmartHeaderInner"><div><small>${m.label}</small><h3>${m.title}</h3><p>${m.copy}</p><div class="cvxPageSmartHeaderAction"><button type="button" data-smart-go="${m.target}">${m.cta}</button><button type="button" class="light" data-smart-go="#today">Back to Today</button></div></div><div class="cvxPageSmartHeaderStats">${m.stats.map(s=>`<article class="cvxPageSmartHeaderStat"><b>${s.value}</b><span>${s.label}</span></article>`).join('')}</div></div></section>`}
function bind(node){node.querySelectorAll('[data-smart-go]').forEach(btn=>btn.addEventListener('click',()=>{const target=btn.getAttribute('data-smart-go')||'#today';document.querySelector('[data-churvox-page-smart-header]')?.remove();window.location.hash=target;window.dispatchEvent(new Event('hashchange'));}))}
async function apply(){
  if(typeof window==='undefined'||busy)return;
  const key=pageKey();
  const existing=document.querySelector('[data-churvox-page-smart-header]');
  if(key==='command'){ existing?.remove(); lastKey=''; lastHtml=''; return; }
  const page=document.querySelector('.cvxPage');
  if(!key||!page){ existing?.remove(); return; }
  busy=true;
  try{
    const built=html(model(key,await loadData()));
    if(existing&&lastKey===key&&lastHtml===built)return;
    if(existing)existing.remove();
    const hero=page.querySelector('.cvxHero');
    const wrap=document.createElement('div');
    wrap.innerHTML=built;
    const node=wrap.firstElementChild;
    if(hero?.nextSibling)page.insertBefore(node,hero.nextSibling);else page.prepend(node);
    bind(node);lastKey=key;lastHtml=built;
  }catch{}finally{busy=false}
}
function schedule(){[0,350,900,1800].forEach(t=>setTimeout(apply,t))}
schedule();window.addEventListener('hashchange',schedule);window.addEventListener('popstate',schedule);window.addEventListener('churvox-owner-app-ready',schedule);window.addEventListener('churvox:data-refresh',()=>{cache={at:0,data:null};document.querySelector('[data-churvox-page-smart-header]')?.remove();schedule()});
