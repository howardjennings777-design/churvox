// Churvox owner record engine.
// Stable launch version: records, admin debt, confidence, Command preparation, no constant repainting.

const FORM_KEY = 'churvox.owner.properForms.v1';
const RECORD_KEY = 'churvox.owner.records.v1';
const TIMELINE_KEY = 'churvox.owner.timeline.v1';
const RADAR_KEY = 'churvox.owner.adminDebt.v1';
const COMMAND_KEY = 'churvox.command.prepared.v1';
const PANEL_ID = 'churvox-owner-record-engine-panel';
const STYLE_ID = 'churvox-owner-record-engine-style';

const PAGE_LABELS = { aiguide:'AI Guide', command:'Command', jobs:'Jobs', clients:'Clients', workers:'Workers', quotes:'Quotes', invoices:'Invoices', team:'Team', payroll:'Payroll', xero:'Xero', settings:'Settings', plans:'Plans', support:'Support', messages:'Messages' };
const ALIASES = { today:'aiguide', dashboard:'aiguide', setup:'aiguide', setupassistant:'aiguide', guide:'aiguide', 'ai-guide':'aiguide', 'smart-hub':'aiguide', help:'support', inbox:'messages', 'command-desk':'command', 'command-board':'command', job:'jobs', client:'clients', worker:'workers', quote:'quotes', invoice:'invoices', message:'messages', setting:'settings', plan:'plans' };
const RULES = {
  jobs:{ label:'Job record', required:[['client','client'],['site','address'],['worker','worker'],['date','date'],['time','time'],['price','price'],['scope','scope']], risky:[['price','missing price'],['worker','missing worker'],['date','missing date'],['time','missing time']], next:'Complete the job record and keep approval decisions in Command.' },
  clients:{ label:'Client file', required:[['name','name'],['phone','phone'],['email','email'],['address','address'],['defaultPrice','saved price'],['serviceMemory','service memory']], risky:[['defaultPrice','missing saved price'],['address','missing service address']], next:'Fill service memory so jobs and quotes can be prepared without retyping.' },
  workers:{ label:'Worker field record', required:[['worker','worker'],['currentJob','current job'],['status','status'],['gps','GPS/location'],['timer','timer'],['proof','proof status']], risky:[['proof','missing proof'],['gps','missing GPS'],['status','missing field status']], next:'Keep worker proof, GPS and timer attached to the job record.' },
  quotes:{ label:'Quote record', required:[['client','client'],['quoteNo','quote number'],['status','status'],['validUntil','valid until'],['total','total'],['scope','scope']], risky:[['total','missing total'],['scope','missing scope'],['followUp','missing follow-up']], next:'Keep quote scope, price and follow-up ready before owner-sensitive sending.' },
  invoices:{ label:'Invoice record', required:[['client','client'],['invoiceNo','invoice number'],['job','linked job'],['status','status'],['amount','amount'],['due','due date'],['sync','sync rule'],['paidRule','paid rule']], risky:[['amount','missing amount'],['due','missing due date'],['paidRule','missing paid guard'],['sync','missing draft sync guard']], next:'Keep money status here. Draft/sync/send decisions stay owner-approved in Command.' },
  team:{ label:'Team access record', required:[['name','name'],['email','email'],['role','role'],['visibility','visibility'],['status','invite status'],['permissions','permissions']], risky:[['role','missing role'],['visibility','missing visibility']], next:'Lock role and visibility so each tier only shows the right workspaces.' },
  payroll:{ label:'Payroll review record', required:[['worker','worker'],['period','period'],['from','from date'],['to','to date'],['hours','hours'],['rate','rate'],['guardrail','guardrail']], risky:[['guardrail','missing payroll guardrail'],['hours','missing hours']], next:'Payroll stays review/export only: no tax filing and no payout files.' },
  xero:{ label:'Accounting handoff record', required:[['system','system'],['tenant','tenant'],['connection','connection'],['syncMode','sync mode'],['paidRefresh','paid refresh'],['guardrails','guardrails']], risky:[['syncMode','missing draft-only rule'],['paidRefresh','missing paid refresh rule'],['guardrails','missing guardrails']], next:'Keep accounting draft-only and owner-approved.' },
  settings:{ label:'Business settings record', required:[['business','business name'],['email','email'],['gst','GST'],['logo','logo'],['language','language'],['security','security']], risky:[['gst','missing GST'],['security','missing security note']], next:'Make routine settings editable while sensitive account changes stay confirmed.' },
  plans:{ label:'Plan/billing record', required:[['current','current plan'],['trial','trial/billing state'],['activeTeam','active team count'],['lockedPricing','locked pricing']], risky:[['current','missing current plan'],['lockedPricing','missing locked pricing']], next:'Show current plan, usage, add-ons and checkout state clearly.' },
  support:{ label:'Support ticket record', required:[['topic','topic'],['priority','priority'],['contact','contact'],['status','status'],['problem','problem'],['context','context']], risky:[['contact','missing contact'],['problem','missing request']], next:'Attach page context so the owner never repeats the same support detail.' },
  messages:{ label:'Message record', required:[['from','from'],['thread','thread'],['priority','priority'],['status','status'],['message','message'],['reply','reply draft']], risky:[['message','missing message'],['reply','missing reply draft']], next:'Split worker updates from client replies. Money-sensitive replies wait in Command.' },
  aiguide:{ label:'Owner pulse record', required:[['priority','priority'],['source','source'],['status','status'],['summary','summary'],['next','next action']], risky:[['summary','missing summary'],['next','missing next action']], next:'AI Guide should surface what needs attention, not become another approval desk.' },
  command:{ label:'Command approval record', required:[['client','client'],['record','record'],['risk','risk'],['status','status'],['recommended','recommended action'],['notes','owner notes']], risky:[['risk','missing risk'],['recommended','missing recommended action']], next:'Command is the only approve/edit/park desk.' },
};

function pageKey(){ const raw = String(location.hash || '').replace('#','').toLowerCase() || 'aiguide'; return ALIASES[raw] || raw; }
function normalPage(page){ return ALIASES[String(page || '').toLowerCase()] || String(page || '').toLowerCase() || 'aiguide'; }
function esc(value){ return String(value || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
function read(key, fallback){ try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
function write(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
function missing(value){ return value == null || String(value).trim() === '' || /^none$|^draft$|^n\/a$/i.test(String(value).trim()); }
function recordId(page, title, values){ const main = values?.invoiceNo || values?.quoteNo || values?.name || values?.client || values?.worker || title || page; return `${page}:${String(main).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)}`; }

function timeline(event){
  const list = read(TIMELINE_KEY, []);
  const key = `${event.type}:${event.recordId || event.page}:${event.detail || ''}`;
  if (list.some((x) => x.key === key)) return;
  write(TIMELINE_KEY, [{ ...event, key, at: new Date().toISOString() }, ...list].slice(0, 90));
}

function syncForms(){
  const forms = read(FORM_KEY, []).filter(Boolean);
  const current = read(RECORD_KEY, {});
  let changed = false;
  forms.forEach((form) => {
    const page = normalPage(form.page);
    if (!RULES[page]) return;
    const values = form.values || {};
    const id = recordId(page, form.title, values);
    const existing = current[id];
    const updated = { id, page, title: form.title || RULES[page].label, values, updatedAt: form.savedAt || existing?.updatedAt || new Date().toISOString(), source:'owner-form' };
    if (JSON.stringify(existing) !== JSON.stringify(updated)) {
      current[id] = updated;
      changed = true;
      timeline({ type: existing ? 'record-updated' : 'record-created', recordId:id, page, title:updated.title, detail:`${PAGE_LABELS[page] || page} saved` });
    }
  });
  if (changed) write(RECORD_KEY, current);
  return current;
}

function missingFor(record){ const rule = RULES[record.page]; return rule ? rule.required.filter(([key]) => missing(record.values?.[key])).map(([, label]) => label) : []; }
function riskyFor(record){ const rule = RULES[record.page]; return rule ? rule.risky.filter(([key]) => missing(record.values?.[key])).map(([, label]) => label) : []; }
function confidence(record){ return Math.max(12, Math.min(100, 100 - missingFor(record).length * 11 - riskyFor(record).length * 8)); }
function level(score){ return score >= 90 ? 'Ready' : score >= 70 ? 'Needs check' : score >= 45 ? 'Risky' : 'Blocked'; }

function prepareCommand(issue){
  const list = read(COMMAND_KEY, []).filter(Boolean);
  const key = `debt:${issue.recordId}:${issue.missing.join('|')}`;
  if (list.some((x) => x.key === key && !/approved|parked/i.test(x.status || ''))) return false;
  const item = { id:`cmd-debt-${Date.now()}-${Math.random().toString(16).slice(2)}`, key, title:`${issue.pageLabel}: ${issue.title}`, sourcePage:issue.page, status:'Waiting owner approval', confidence:issue.confidence, note:`${issue.level}. Missing: ${issue.missing.join(', ')}. ${issue.next}`, linkedRecordId:issue.recordId, issueType:'admin-debt', createdAt:new Date().toISOString() };
  write(COMMAND_KEY, [item, ...list].slice(0, 30));
  timeline({ type:'command-prepared', recordId:issue.recordId, page:issue.page, title:issue.title, detail:item.note });
  dispatchEvent(new CustomEvent('churvox:command-prepared', { detail:item }));
  return true;
}

let lastRadarSig = '';
function runRadar(records){
  const issues = Object.values(records || {}).filter(Boolean).map((record) => {
    const miss = missingFor(record);
    const risk = riskyFor(record);
    const score = confidence(record);
    return { recordId:record.id, page:record.page, pageLabel:PAGE_LABELS[record.page] || record.page, title:record.title || RULES[record.page]?.label || 'Record', missing:miss.length ? miss : risk, risky:risk, confidence:score, level:level(score), next:RULES[record.page]?.next || 'Review the record.' };
  }).filter((x) => x.missing.length || x.confidence < 90);
  const sig = JSON.stringify(issues.slice(0, 50));
  if (sig !== lastRadarSig) {
    lastRadarSig = sig;
    write(RADAR_KEY, issues.slice(0, 50));
  }
  issues.filter((x) => x.page !== 'command' && (x.confidence < 90 || x.risky.length)).slice(0, 8).forEach(prepareCommand);
  return issues;
}

function pageCoverage(page, records, issues){
  const pageRecords = Object.values(records || {}).filter((r) => r.page === page);
  const pageIssues = (issues || []).filter((i) => i.page === page);
  const latest = pageRecords[0];
  return { pageRecords, pageIssues, latest, rule:RULES[page], score: latest ? confidence(latest) : 0 };
}

function installStyle(){
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `#${PANEL_ID}{grid-column:1/-1!important;display:grid!important;gap:10px!important;border:1px solid rgba(239,85,60,.18)!important;border-radius:18px!important;background:linear-gradient(135deg,#fff7f0,#fff)!important;box-shadow:0 16px 34px rgba(16,21,19,.06)!important;padding:14px!important;color:#111815!important;font-family:Inter,system-ui,sans-serif!important}#${PANEL_ID} header{display:flex!important;justify-content:space-between!important;gap:12px!important;align-items:flex-start!important}#${PANEL_ID} h3{margin:0!important;color:#111815!important;font-size:18px!important;font-weight:950!important;letter-spacing:-.03em!important}#${PANEL_ID} p{margin:4px 0 0!important;color:#52605a!important;font-size:12px!important;font-weight:850!important;line-height:1.35!important}#${PANEL_ID} .engineGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}#${PANEL_ID} .engineCard{border:1px solid rgba(16,21,19,.08)!important;border-radius:14px!important;background:#fff!important;padding:10px!important;display:grid!important;gap:5px!important;min-height:72px!important}#${PANEL_ID} .engineCard b{font-size:13px!important;color:#111815!important;font-weight:950!important}#${PANEL_ID} .engineCard span{font-size:11px!important;color:#52605a!important;font-weight:850!important;line-height:1.32!important}#${PANEL_ID} .enginePill{white-space:nowrap!important;border-radius:999px!important;background:#111815!important;color:#fff!important;padding:7px 10px!important;font-size:11px!important;font-weight:950!important}#${PANEL_ID} .enginePill.warn{background:#ef553c!important}#${PANEL_ID} .enginePill.ok{background:#206b3c!important}#${PANEL_ID} .debtRows{display:grid!important;gap:7px!important;max-height:190px!important;overflow:auto!important}.debtRow{display:grid!important;grid-template-columns:1fr auto!important;gap:8px!important;align-items:center!important;border:1px solid rgba(16,21,19,.08)!important;border-radius:12px!important;background:#fff!important;padding:9px!important}.debtRow b{display:block!important;font-size:12px!important;color:#111815!important;font-weight:950!important}.debtRow span{display:block!important;font-size:10px!important;color:#52605a!important;font-weight:850!important;line-height:1.3!important}.debtRow em{font-style:normal!important;border-radius:999px!important;background:#fff0e8!important;color:#b9381e!important;padding:5px 7px!important;font-size:9px!important;font-weight:950!important;text-transform:uppercase!important}@media(max-width:850px){#${PANEL_ID} .engineGrid{grid-template-columns:1fr!important}#${PANEL_ID} header{display:grid!important}}`;
  document.head.appendChild(style);
}

let lastPanelHtml = '';
function mount(records, issues){
  const page = pageKey();
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root || !RULES[page]) { document.getElementById(PANEL_ID)?.remove(); lastPanelHtml = ''; return; }
  installStyle();
  let panel = document.getElementById(PANEL_ID);
  if (!panel) { panel = document.createElement('section'); panel.id = PANEL_ID; root.prepend(panel); lastPanelHtml = ''; }
  panel.removeAttribute('data-proper-hidden'); panel.removeAttribute('data-core-hidden'); panel.removeAttribute('data-lite-hidden');
  const cov = pageCoverage(page, records, issues);
  const status = cov.latest ? level(cov.score) : 'No saved records yet';
  const pillClass = cov.score >= 90 ? 'ok' : cov.score >= 70 ? '' : 'warn';
  const debtRows = cov.pageIssues.length ? cov.pageIssues.slice(0,5).map((issue) => `<div class="debtRow"><span><b>${esc(issue.title)}</b>Missing: ${esc(issue.missing.join(', '))}<br>${esc(issue.next)}</span><em>${esc(issue.level)}</em></div>`).join('') : '<div class="debtRow"><span><b>No admin debt found on this page</b>Saved records look ready, or no records have been saved yet.</span><em>clear</em></div>';
  const html = `<header><div><h3>Churvox record engine</h3><p>Forms, page records, admin debt, confidence and Command preparation are now linked for this workspace.</p></div><span class="enginePill ${pillClass}">${esc(status)}${cov.latest ? ` · ${cov.score}%` : ''}</span></header><div class="engineGrid"><div class="engineCard"><b>${cov.pageRecords.length}</b><span>saved ${esc(PAGE_LABELS[page] || page)} record${cov.pageRecords.length === 1 ? '' : 's'} from editable forms.</span></div><div class="engineCard"><b>${cov.pageIssues.length}</b><span>admin-debt item${cov.pageIssues.length === 1 ? '' : 's'} detected for this page.</span></div><div class="engineCard"><b>${esc(cov.rule?.label || 'Workspace')}</b><span>${esc(cov.rule?.next || 'Review this workspace.')}</span></div></div><div class="debtRows">${debtRows}</div>`;
  if (html === lastPanelHtml) return;
  lastPanelHtml = html;
  panel.innerHTML = html;
}

function run(){
  const records = syncForms();
  const issues = runRadar(records);
  mount(records, issues);
  window.__CHURVOX_RECORD_ENGINE__ = { records, issues, timeline: read(TIMELINE_KEY, []), command: read(COMMAND_KEY, []) };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_RECORD_ENGINE__) {
  window.__CHURVOX_OWNER_RECORD_ENGINE__ = true;
  addEventListener('DOMContentLoaded', run);
  addEventListener('load', run);
  addEventListener('hashchange', () => setTimeout(run, 120));
  addEventListener('popstate', () => setTimeout(run, 120));
  addEventListener('churvox:command-prepared', () => setTimeout(run, 200));
  addEventListener('churvox:owner-backend-hydrated', () => setTimeout(run, 400));
  addEventListener('churvox:owner-data-quality', () => setTimeout(run, 500));
  document.addEventListener('click', () => setTimeout(run, 700), true);
  setInterval(run, 12000);
  run();
}

export {};
