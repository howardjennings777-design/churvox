import API_BASE from '../lib/apiBase';

const API_ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
let cache = { at: 0, jobs: [] };
let lastHtml = '';
let loading = false;

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function pick(row, keys) { for (const key of keys) { if (clean(row?.[key])) return clean(row[key]); } return ''; }
function amount(row) { const raw = row?.price || row?.amount || row?.total || row?.job_price || row?.quote_total || 0; const number = Number(String(raw).replace(/[^0-9.]/g, '')); return Number.isFinite(number) ? number : 0; }
function listFrom(payload) { if (Array.isArray(payload)) return payload; if (Array.isArray(payload?.jobs)) return payload.jobs; if (Array.isArray(payload?.items)) return payload.items; if (Array.isArray(payload?.data)) return payload.data; return []; }
function isOwnerJobsOrToday() { const path = window.location.pathname || ''; const hash = (window.location.hash || '').replace('#', ''); return path.startsWith('/dashboard') && (hash === 'jobs' || hash === 'today' || (!hash && /Today|Jobs/i.test(document.querySelector('.cvxTopTitle h1')?.textContent || ''))); }

function view(row) {
  return {
    title: pick(row, ['title', 'job_title', 'job_name', 'name', 'description']) || 'Job',
    client: pick(row, ['client_name', 'customer_name', 'client']),
    address: pick(row, ['address', 'site_address', 'job_address', 'service_address']),
    worker: pick(row, ['assigned_worker_name', 'worker_name', 'worker', 'assigned_to']),
    date: pick(row, ['scheduled_date', 'date', 'start_date']),
    time: pick(row, ['scheduled_time', 'start_time', 'time']),
    status: pick(row, ['status', 'job_status', 'workflow_status']).toLowerCase(),
    price: amount(row),
    proof: pick(row, ['proof', 'proof_status', 'photo_status', 'proof_photo_count', 'photo_count', 'proof_required', 'photo_required']),
    invoice: pick(row, ['invoice_status', 'invoice', 'invoice_number', 'accounting_status', 'xero_status']),
    issue: pick(row, ['issue', 'problem', 'needs_attention']),
  };
}

function checks(job) {
  const proof = clean(job.proof).toLowerCase();
  const invoice = clean(job.invoice).toLowerCase();
  return [
    ['Client', Boolean(job.client)],
    ['Address', Boolean(job.address)],
    ['Worker', Boolean(job.worker) && !/unassigned|none|no worker/i.test(job.worker)],
    ['Date', Boolean(job.date)],
    ['Time', Boolean(job.time)],
    ['Price', job.price > 0],
    ['Proof', Boolean(proof) && !/no|missing|required/i.test(proof)],
    ['Invoice', Boolean(invoice) && !/no|missing|not/i.test(invoice)],
  ];
}

function score(job) { const rows = checks(job); return rows.filter(([, ok]) => ok).length / rows.length; }
async function fetchJobs() { if (Date.now() - cache.at < 12000 && cache.jobs.length) return cache.jobs; try { const response = await fetch(`${API_ROOT}/jobs`, { credentials: 'include' }); const data = await response.json().catch(() => ({})); cache = { at: Date.now(), jobs: listFrom(data).map(view) }; } catch { cache = { at: Date.now(), jobs: [] }; } return cache.jobs; }

function buildHtml(jobs) {
  const total = jobs.length;
  const cleanJobs = jobs.filter((job) => score(job) === 1).length;
  const missing = jobs.filter((job) => score(job) < 1).length;
  const money = jobs.filter((job) => /complete|done|finished/i.test(job.status) && (!job.invoice || /draft|not|missing|no/i.test(job.invoice))).length;
  const problems = jobs.filter((job) => job.issue || /needs|issue|blocked|check/i.test(job.status)).length;
  const missingCounts = { Client: 0, Address: 0, Worker: 0, Date: 0, Time: 0, Price: 0, Proof: 0, Invoice: 0 };
  jobs.forEach((job) => checks(job).forEach(([label, ok]) => { if (!ok) missingCounts[label] += 1; }));
  const pills = Object.entries(missingCounts).filter(([, count]) => count > 0).map(([label, count]) => `<span>${count} ${label}</span>`).join('') || '<span>All key admin fields clean</span>';
  return `<section class="cvxOwnerJobLedger" data-churvox-owner-job-ledger="true"><header><div><h3>Job admin ledger</h3><p>Churvox checks whether jobs are clean enough to run, invoice or send to Command.</p></div><span class="cvxJobLedgerStamp">${total} jobs checked</span></header><div class="cvxJobLedgerGrid"><article class="cvxJobLedgerCard ready"><b>${cleanJobs}</b><span>Clean jobs</span><small>Client, site, worker, time, price, proof and invoice are covered.</small></article><article class="cvxJobLedgerCard missing"><b>${missing}</b><span>Need admin</span><small>Missing fields Churvox should catch before the owner has to chase.</small></article><article class="cvxJobLedgerCard money"><b>${money}</b><span>Money waiting</span><small>Completed jobs that need invoice or payment follow-through.</small></article><article class="cvxJobLedgerCard problem"><b>${problems}</b><span>Problems</span><small>Jobs with issues, checks or blocked status.</small></article></div><div class="cvxJobLedgerPills">${pills}</div></section>`;
}

async function apply() {
  if (typeof window === 'undefined' || !isOwnerJobsOrToday() || loading) return;
  const page = document.querySelector('.cvxPage');
  if (!page) return;
  loading = true;
  try {
    const jobs = await fetchJobs();
    if (!jobs.length) return;
    const html = buildHtml(jobs);
    let node = document.querySelector('[data-churvox-owner-job-ledger]');
    if (!node) {
      const hero = page.querySelector('.cvxHero');
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      node = wrap.firstElementChild;
      if (hero?.nextSibling) page.insertBefore(node, hero.nextSibling);
      else page.prepend(node);
      lastHtml = html;
    } else if (lastHtml !== html) {
      node.outerHTML = html;
      lastHtml = html;
    }
  } catch {
    // Visual helper only. Owner app keeps working without it.
  } finally {
    loading = false;
  }
}

function schedule() { [0, 350, 900, 1800].forEach((delay) => setTimeout(apply, delay)); }
schedule();
window.addEventListener('hashchange', schedule);
window.addEventListener('popstate', schedule);
window.addEventListener('churvox-owner-app-ready', schedule);
window.addEventListener('churvox:data-refresh', () => { cache = { at: 0, jobs: [] }; schedule(); });
