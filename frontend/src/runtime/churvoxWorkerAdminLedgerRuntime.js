import API_BASE from '../lib/apiBase';

const API_ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const objectId = (value) => {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') return objectId(value.$oid || value.id || value._id || value.job_id || '');
  return '';
};
const jobId = (job) => objectId(job?.id || job?._id || job?.job_id);
const jobTitle = (job) => clean(job?.title || job?.job_name || job?.job_title || job?.service_type || 'Job');
const customer = (job) => clean(job?.client_name || job?.customer_name || job?.client || 'Customer');
const address = (job) => clean(job?.address || job?.site_address || job?.service_address || job?.location || '');
const status = (job) => clean(job?.status || job?.job_status || job?.workflow_status).toLowerCase();
const isDone = (job) => /complete|done|finished|cancelled|archived/.test(status(job));
const moneyValue = (job) => job?.payment_due || job?.amount_due || job?.invoice_total || job?.total || job?.price || job?.quote_total || job?.job_price || 0;
const centsFromJob = (job) => {
  const number = Number(String(moneyValue(job) || '').replace(/[^0-9.]/g, ''));
  return number > 0 ? Math.round(number * 100) : 0;
};
const asList = (value) => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : Array.isArray(value?.jobs) ? value.jobs : Array.isArray(value?.items) ? value.items : [];

const PROBLEMS = [
  ['access', 'Access blocked', 'Worker cannot access the site.'],
  ['client_away', 'Customer away', 'Customer is not home or not available.'],
  ['extra_work', 'Extra work', 'Extra work is needed before this job can be finished.'],
  ['late', 'Running late', 'Worker is running late and the schedule may need owner review.'],
  ['materials', 'Need materials', 'Worker needs materials or equipment to finish this job.'],
  ['bigger', 'Bigger than expected', 'The job is bigger than expected and may need a price or scope check.'],
  ['owner_help', 'Owner help needed', 'Worker needs the owner to review this job before it continues.'],
  ['custom', 'Use my note', 'Worker note needs owner review.'],
];

let cache = { at: 0, jobs: [] };
async function workerJobs() {
  if (Date.now() - cache.at < 10000 && cache.jobs.length) return cache.jobs;
  try {
    const response = await fetch(`${API_ROOT}/worker/jobs`, { credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    cache = { at: Date.now(), jobs: asList(data).filter((job) => jobId(job)) };
  } catch {
    cache = { at: Date.now(), jobs: [] };
  }
  return cache.jobs;
}

function checks(job) {
  const proofText = clean(job?.proof || job?.proof_status || job?.photo_status || job?.proof_photo_count || job?.photo_count || job?.photo_required || job?.proof_required);
  return [
    ['Client', customer(job) !== 'Customer'],
    ['Address', Boolean(address(job))],
    ['Time', Boolean(clean(job?.scheduled_time || job?.time || job?.scheduled_date || job?.date))],
    ['Amount', centsFromJob(job) > 0],
    ['Status', Boolean(status(job))],
    ['Proof', /yes|done|complete|added|uploaded|[1-9]/i.test(proofText)],
  ];
}

function ledgerHtml(job) {
  const rows = checks(job);
  const done = rows.filter(([, ok]) => ok).length;
  return `<section class="swLedger" data-churvox-worker-ledger="true"><div class="swLedgerTop"><b>${done}/${rows.length} ready</b><span>Admin ledger</span></div><div class="swLedgerChecks">${rows.map(([label, ok]) => `<span class="swLedgerPill ${ok ? 'done' : 'missing'}">${ok ? '✓' : '•'} ${label}</span>`).join('')}</div></section>`;
}

function currentJob(jobs) {
  const pathId = clean((window.location.pathname || '').split('/').pop());
  return jobs.find((job) => jobId(job) === pathId) || jobs.find((job) => !isDone(job)) || jobs[0];
}

async function postProblem(job, problem) {
  const [key, label, text] = problem;
  try {
    const response = await fetch(`${API_ROOT}/worker/field-slip`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'worker_problem', kind: 'worker_problem', problem_key: key, problem_label: label, job_id: jobId(job), job_title: jobTitle(job), client_name: customer(job), text, note: text, summary: `${label}: ${jobTitle(job)}`, source: 'worker-app' }),
    });
    if (!response.ok) throw new Error('not saved');
    notice('Sent to Command');
  } catch {
    notice('Could not send to Command');
  }
}

function notice(text) {
  const node = document.createElement('div');
  node.className = 'swLedgerToast';
  node.textContent = text;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2200);
}

function problemHtml() {
  return `<section class="swCard swActionCard swProblemButtons" data-churvox-worker-problems="true"><span>Problem buttons</span><h2>One tap to Command</h2><p>Tap the closest problem. Churvox turns it into a clean owner slip with the job attached.</p><div class="swProblemGrid">${PROBLEMS.map(([key, label]) => `<button type="button" data-problem-key="${key}">${label}</button>`).join('')}</div></section>`;
}

async function applyWorkerAdminLedger() {
  if (typeof window === 'undefined' || !window.location.pathname.startsWith('/worker')) return;
  const body = document.querySelector('.swBody');
  if (!body) return;
  const jobs = await workerJobs();
  const job = currentJob(jobs);
  if (!job) return;
  const existingLedger = document.querySelector('[data-churvox-worker-ledger]');
  if (!existingLedger) {
    const anchor = document.querySelector('.swCurrentJob') || body.firstElementChild;
    const wrap = document.createElement('div');
    wrap.innerHTML = ledgerHtml(job);
    anchor?.insertAdjacentElement('afterend', wrap.firstElementChild);
  }
  if (/^\/worker\/jobs\//.test(window.location.pathname) && !document.querySelector('[data-churvox-worker-problems]')) {
    const workControls = Array.from(document.querySelectorAll('.swActionCard')).find((node) => /Work controls|Simple field flow/i.test(node.textContent || ''));
    const wrap = document.createElement('div');
    wrap.innerHTML = problemHtml();
    const panel = wrap.firstElementChild;
    panel.querySelectorAll('[data-problem-key]').forEach((button) => {
      button.addEventListener('click', () => {
        const problem = PROBLEMS.find(([key]) => key === button.dataset.problemKey) || PROBLEMS[PROBLEMS.length - 1];
        postProblem(job, problem);
      });
    });
    workControls?.insertAdjacentElement('afterend', panel);
  }
}

function schedule() {
  [0, 350, 900, 1800].forEach((delay) => setTimeout(applyWorkerAdminLedger, delay));
}

schedule();
window.addEventListener('popstate', schedule);
window.addEventListener('hashchange', schedule);
window.addEventListener('churvox:data-refresh', () => { cache = { at: 0, jobs: [] }; schedule(); });
