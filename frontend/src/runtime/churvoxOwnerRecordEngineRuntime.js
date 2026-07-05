// Churvox owner record engine.
// Runs quiet record/admin-debt logic without showing a moving page panel.

const FORM_KEY = 'churvox.owner.properForms.v1';
const RECORD_KEY = 'churvox.owner.records.v1';
const TIMELINE_KEY = 'churvox.owner.timeline.v1';
const RADAR_KEY = 'churvox.owner.adminDebt.v1';
const COMMAND_KEY = 'churvox.command.prepared.v1';
const PANEL_ID = 'churvox-owner-record-engine-panel';

const PAGE_LABELS = { aiguide:'AI Guide', command:'Command', jobs:'Jobs', clients:'Clients', workers:'Workers', quotes:'Quotes', invoices:'Invoices', team:'Team', payroll:'Payroll', xero:'Xero', settings:'Settings', plans:'Plans', support:'Support', messages:'Messages' };
const ALIASES = { today:'aiguide', dashboard:'aiguide', setup:'aiguide', setupassistant:'aiguide', guide:'aiguide', 'ai-guide':'aiguide', 'smart-hub':'aiguide', help:'support', inbox:'messages', 'command-desk':'command', 'command-board':'command', job:'jobs', client:'clients', worker:'workers', quote:'quotes', invoice:'invoices', message:'messages', setting:'settings', plan:'plans' };
const RULES = {
  jobs:{ label:'Job record', required:[['client','client'],['site','address'],['worker','worker'],['date','date'],['time','time'],['price','price'],['scope','scope']], risky:[['price','missing price'],['worker','missing worker'],['date','missing date'],['time','missing time']], next:'Churvox prepares the missing job details in Command for owner approval.' },
  clients:{ label:'Client file', required:[['name','name'],['phone','phone'],['email','email'],['address','address'],['defaultPrice','saved price'],['serviceMemory','service memory']], risky:[['defaultPrice','missing saved price'],['address','missing service address']], next:'Churvox highlights missing client memory in Command.' },
  workers:{ label:'Worker field record', required:[['worker','worker'],['currentJob','current job'],['status','status'],['gps','GPS/location'],['timer','timer'],['proof','proof status']], risky:[['proof','missing proof'],['gps','missing GPS'],['status','missing field status']], next:'Churvox prepares worker proof/GPS issues in Command.' },
  quotes:{ label:'Quote record', required:[['client','client'],['quoteNo','quote number'],['status','status'],['validUntil','valid until'],['total','total'],['scope','scope']], risky:[['total','missing total'],['scope','missing scope'],['followUp','missing follow-up']], next:'Churvox prepares quote gaps and follow-up decisions in Command.' },
  invoices:{ label:'Invoice record', required:[['client','client'],['invoiceNo','invoice number'],['job','linked job'],['status','status'],['amount','amount'],['due','due date'],['sync','sync rule'],['paidRule','paid rule']], risky:[['amount','missing amount'],['due','missing due date'],['paidRule','missing paid guard'],['sync','missing draft sync guard']], next:'Churvox prepares money/sync decisions in Command.' },
  team:{ label:'Team access record', required:[['name','name'],['email','email'],['role','role'],['visibility','visibility'],['status','invite status'],['permissions','permissions']], risky:[['role','missing role'],['visibility','missing visibility']], next:'Churvox highlights access risks in Command.' },
  payroll:{ label:'Payroll review record', required:[['worker','worker'],['period','period'],['from','from date'],['to','to date'],['hours','hours'],['rate','rate'],['guardrail','guardrail']], risky:[['guardrail','missing payroll guardrail'],['hours','missing hours']], next:'Churvox prepares payroll review/export issues in Command.' },
  xero:{ label:'Accounting handoff record', required:[['system','system'],['tenant','tenant'],['connection','connection'],['syncMode','sync mode'],['paidRefresh','paid refresh'],['guardrails','guardrails']], risky:[['syncMode','missing draft-only rule'],['paidRefresh','missing paid refresh rule'],['guardrails','missing guardrails']], next:'Churvox prepares accounting handoff issues in Command.' },
  settings:{ label:'Business settings record', required:[['business','business name'],['email','email'],['gst','GST'],['logo','logo'],['language','language'],['security','security']], risky:[['gst','missing GST'],['security','missing security note']], next:'Churvox prepares sensitive setting gaps in Command.' },
  plans:{ label:'Plan/billing record', required:[['current','current plan'],['trial','trial/billing state'],['activeTeam','active team count'],['lockedPricing','locked pricing']], risky:[['current','missing current plan'],['lockedPricing','missing locked pricing']], next:'Churvox prepares billing/plan gaps in Command.' },
  support:{ label:'Support ticket record', required:[['topic','topic'],['priority','priority'],['contact','contact'],['status','status'],['problem','problem'],['context','context']], risky:[['contact','missing contact'],['problem','missing request']], next:'Churvox prepares support context in Command.' },
  messages:{ label:'Message record', required:[['from','from'],['thread','thread'],['priority','priority'],['status','status'],['message','message'],['reply','reply draft']], risky:[['message','missing message'],['reply','missing reply draft']], next:'Churvox prepares message decisions in Command.' },
  aiguide:{ label:'Owner pulse record', required:[['priority','priority'],['source','source'],['status','status'],['summary','summary'],['next','next action']], risky:[['summary','missing summary'],['next','missing next action']], next:'Churvox prepares owner pulse gaps in Command.' },
  command:{ label:'Command approval record', required:[['client','client'],['record','record'],['risk','risk'],['status','status'],['recommended','recommended action'],['notes','owner notes']], risky:[['risk','missing risk'],['recommended','missing recommended action']], next:'Command is the only approve/edit/park desk.' },
};

function normalPage(page){ return ALIASES[String(page || '').toLowerCase()] || String(page || '').toLowerCase() || 'aiguide'; }
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

function run(){
  document.getElementById(PANEL_ID)?.remove();
  const records = syncForms();
  const issues = runRadar(records);
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