import { createOperatorAction } from "./operatorActions";

const MAX_QUEUE = 24;
const SENSIBLE_QUOTE_DAYS = 5;

const asArray = (v) => (Array.isArray(v) ? v : []);
const str = (v) => String(v || "").trim();
const low = (v) => str(v).toLowerCase();
const idOf = (r) => r?.id || r?._id || r?.invoice_id || r?.job_id;
const ts = (v) => {
  const d = new Date(v || 0);
  return Number.isNaN(d.getTime()) ? null : d;
};

function push(actions, partial) {
  if (actions.length >= MAX_QUEUE) return;
  actions.push(createOperatorAction(partial));
}

export function buildOperatorQueue({ jobs = [], invoices = [], quotes = [], leads = [], enquiries = [], moneyReviews = [], myobStatus = {}, team = [] }) {
  const actions = [];
  const allLeads = [...asArray(leads), ...asArray(enquiries)];
  const invoicedJobIds = new Set(asArray(invoices).map((i) => str(i.job_id || i.source_job_id || i.linked_job_id)).filter(Boolean));

  asArray(jobs).filter((j) => !j.assigned_worker_id && !j.worker_id && !j.assigned_to).slice(0, 4).forEach((j) => push(actions, {
    type: 'assign_worker', title: `Assign worker: ${j.title || j.client_name || 'Job'}`,
    summary: 'Active job has no confirmed worker assignment.', reason: 'Unassigned jobs can miss service windows.',
    risk: 'Wrong assignment can impact delivery quality.', confidence_label: 'Ready for owner review',
    source_records: [idOf(j)].filter(Boolean), recommended_next_step: 'Review worker recommendation and approve assignment',
    execute_mode: 'safe_execute', related_workspace: '/jobs', payload: { job_id: idOf(j) }
  }));

  asArray(jobs).filter((j) => ['completed','done','closed'].includes(low(j.status || j.job_status)) && !invoicedJobIds.has(str(idOf(j)))).slice(0, 3).forEach((j) => {
    push(actions, { type:'draft_invoice', title:`Draft invoice: ${j.title || idOf(j) || 'Completed job'}`, summary:'Completed job appears not yet invoiced.', reason:'Completed work should move into billing queue.', risk:'Draft only. No invoice auto-send.', confidence_label:'Draft only', source_records:[idOf(j)].filter(Boolean), recommended_next_step:'Review draft invoice details', execute_mode:'draft_only', related_workspace:'/invoices', payload:{ job_id:idOf(j) } });
    push(actions, { type:'proof_review', title:`Proof review: ${j.title || idOf(j) || 'Completed job'}`, summary:'Check notes/photos before client-facing billing.', reason:'Proof quality protects disputes and rework.', risk:'Review only.', confidence_label:'Needs review', source_records:[idOf(j)].filter(Boolean), recommended_next_step:'Confirm proof completeness', execute_mode:'review_only', related_workspace:'/jobs', payload:{ job_id:idOf(j) } });
  });

  asArray(invoices).filter((i) => ['open','overdue','partially_paid'].includes(low(i.status || i.payment_status))).slice(0,4).forEach((i) => push(actions, {
    type:'payment_reminder', title:`Payment reminder: ${i.invoice_number || idOf(i) || 'Invoice'}`, summary:'Invoice remains open or overdue.', reason:'Follow-up can reduce collection delays.', risk:'Draft only. No reminder auto-send.', confidence_label:'Draft only', source_records:[idOf(i)].filter(Boolean), recommended_next_step:'Review reminder message', execute_mode:'draft_only', related_workspace:'/invoices', payload:{ invoice_id:idOf(i) }
  }));

  const now = new Date();
  asArray(quotes).filter((q) => low(q.status || q.quote_status) === 'open').filter((q)=>{const d=ts(q.created_at||q.date||q.updated_at); if(!d) return false; return (now-d)/(1000*60*60*24) >= SENSIBLE_QUOTE_DAYS;}).slice(0,3).forEach((q)=>push(actions,{type:'quote_followup',title:`Quote follow-up: ${q.quote_number || idOf(q) || 'Quote'}`,summary:'Open quote has been waiting for customer response.',reason:'Older open quotes can go cold without follow-up.',risk:'Draft follow-up only.',confidence_label:'Needs review',source_records:[idOf(q)].filter(Boolean),recommended_next_step:'Review follow-up draft timing',execute_mode:'draft_only',related_workspace:'/quotes',payload:{quote_id:idOf(q)}}));

  allLeads.filter((l)=>!l.job_id&&!l.quote_id&&!l.client_id).slice(0,2).forEach((l)=>['lead_to_job','lead_to_quote','lead_to_client'].forEach((t)=>push(actions,{type:t,title:`Lead conversion review: ${l.name || l.email || idOf(l) || 'Lead'}`,summary:'Unlinked enquiry can be converted into workflow.',reason:'Lead has no linked job, quote, or client record.',risk:'Review only until owner confirms route.',confidence_label:'Needs review',source_records:[idOf(l)].filter(Boolean),recommended_next_step:'Pick preferred conversion path',execute_mode:'review_only',related_workspace:'/clients',payload:{lead_id:idOf(l)}})));

  asArray(moneyReviews).slice(0,3).forEach((m)=>push(actions,{type:'money_leak_review',title:m.title || 'Money leak review',summary:m.summary || 'Money Radar found an item for review.',reason:'Potential revenue leakage or process gap detected.',risk:'Review only.',confidence_label:'Needs review',source_records:[idOf(m)].filter(Boolean),recommended_next_step:'Open Money Radar and validate signal',execute_mode:'review_only',related_workspace:'/invoices',payload:m}));

  asArray(jobs).filter((j)=>j.is_recurring || j.recurring || j.repeat_job).filter((j)=>{const d=ts(j.next_due_at||j.next_visit_at||j.scheduled_date); if(!d) return false; const days=(d-now)/(1000*60*60*24); return days>=0 && days<=7;}).slice(0,2).forEach((j)=>push(actions,{type:'rebook_recurring',title:`Rebook recurring: ${j.title || idOf(j) || 'Recurring job'}`,summary:'Recurring job due soon.',reason:'Early rebooking protects utilisation and revenue.',risk:'Draft schedule only.',confidence_label:'Ready for owner review',source_records:[idOf(j)].filter(Boolean),recommended_next_step:'Review and confirm schedule',execute_mode:'draft_only',related_workspace:'/jobs',payload:{job_id:idOf(j)}}));

  asArray(myobStatus.invoice_queue || myobStatus.payment_queue).slice(0,2).forEach((row)=>push(actions,{type:'myob_sync_review',title:'MYOB sync review',summary:'Accounting queue item needs review.',reason:'Sync queue has pending item.',risk:'Review only when write access disabled.',confidence_label:'Needs review',source_records:[idOf(row)].filter(Boolean),recommended_next_step:'Open MYOB Control Centre',execute_mode:'review_only',related_workspace:'/settings',payload:row}));

  asArray(jobs).filter((j)=>low(j.issue_flag||j.help_flag||j.worker_issue) === 'true' || low(j.issue_flag||j.help_flag||j.worker_issue) === 'yes').slice(0,2).forEach((j)=>push(actions,{type:'worker_issue_review',title:`Worker issue: ${j.title || idOf(j) || 'Job'}`,summary:'Worker flagged an issue/help request.',reason:'Issue flag should be reviewed quickly.',risk:'Review only.',confidence_label:'Needs review',source_records:[idOf(j)].filter(Boolean),recommended_next_step:'Open job and respond to worker issue',execute_mode:'review_only',related_workspace:'/jobs',payload:{job_id:idOf(j)}}));

  asArray(team).filter((w)=>str(w.note_to_admin || w.admin_note || w.note)).slice(0,2).forEach((w)=>push(actions,{type:'note_to_admin_review',title:`Admin note: ${w.name || w.email || 'Team member'}`,summary:'Team note requires owner/admin review.',reason:'Worker/admin communication needs acknowledgement.',risk:'Review only.',confidence_label:'Needs review',source_records:[idOf(w)].filter(Boolean),recommended_next_step:'Open crew workspace and review note',execute_mode:'review_only',related_workspace:'/team',payload:{worker_id:idOf(w),note:w.note_to_admin || w.admin_note || w.note}}));

  return actions;
}
