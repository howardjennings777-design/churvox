import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_INDUSTRY_ISOLATION_RUNTIME__';
const STORE_KEY = 'churvox.industry.context.v1';
const API_ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
let state = { context: null, loaded: false };

function path() { return window.location.pathname || ''; }
function isOwnerApp() { const p = path(); return p === '/dashboard' || p.startsWith('/dashboard') || p === '/plans' || p === '/setup' || p === '/setup-guide' || p === '/guide'; }
function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function key(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function readCache() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; } }
function saveCache(context) { try { localStorage.setItem(STORE_KEY, JSON.stringify(context || {})); } catch {} }
function brain() { return state.context?.brain || readCache()?.brain || {}; }
function labels() { return brain()?.labels || state.context?.industry_profile?.labels || {}; }
function policy() { return brain()?.feature_policy || brain()?.feature_switches || {}; }
function hiddenNav() { return new Set([...(brain()?.hidden_nav || []), ...(policy()?.hide_payroll ? ['payroll'] : []), ...(policy()?.hide_xero_until_money_setup ? ['xero'] : [])].map(key)); }
function formLabels() { return brain()?.form_labels || {}; }
function formPlaceholders() { return brain()?.form_placeholders || {}; }
function pageCopy() { return brain()?.page_copy || {}; }

async function fetchContext() {
  const headers = {};
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  try {
    const response = await fetch(`${API_ROOT}/industry/context`, { credentials: 'include', headers });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    if (payload?.success) return payload;
  } catch {}
  return null;
}

const NAV_ALIASES = {
  today: ['today', 'smart hub', 'hub'],
  command: ['command'],
  jobs: ['jobs', 'appointments', 'visits', 'projects', 'bookings', 'sessions'],
  clients: ['clients', 'owners', 'students'],
  workers: ['workers', 'crew', 'staff', 'technicians', 'cleaners', 'artists', 'groomers', 'practitioners', 'coaches', 'team'],
  messages: ['messages'],
  quotes: ['quotes', 'consults', 'plans', 'proposals', 'estimates'],
  invoices: ['invoices', 'payments'],
  payroll: ['payroll'],
  xero: ['xero'],
  settings: ['settings'],
  plans: ['plans'],
  help: ['help'],
};
function navIdFromText(value) {
  const k = key(value);
  for (const [id, aliases] of Object.entries(NAV_ALIASES)) if (aliases.map(key).includes(k)) return id;
  return k;
}
function setNodeTextKeepBadge(node, text) {
  if (!node || !text) return;
  const badges = Array.from(node.querySelectorAll(':scope > .cvxNavBadge'));
  node.textContent = text;
  badges.forEach((badge) => node.appendChild(badge));
}
function plural(label) {
  if (!label) return '';
  if (['Payment', 'Plan', 'Consult', 'Proposal', 'Estimate'].includes(label)) return label === 'Payment' ? 'Payments' : `${label}s`;
  return label.endsWith('s') ? label : `${label}s`;
}
function applyNav() {
  const map = labels();
  const hidden = hiddenNav();
  document.querySelectorAll('.cvxProduct .cvxNav button').forEach((button) => {
    const labelNode = button.querySelector('b') || button;
    if (!labelNode.dataset.cvxOriginalLabel) labelNode.dataset.cvxOriginalLabel = clean(labelNode.textContent);
    const id = navIdFromText(labelNode.dataset.cvxOriginalLabel || labelNode.textContent);
    button.dataset.cvxIndustryNavId = id;
    button.hidden = hidden.has(key(id));
    button.classList.toggle('cvxIndustryHidden', hidden.has(key(id)));
    if (id === 'jobs' && map.jobs) setNodeTextKeepBadge(labelNode, map.jobs);
    if (id === 'workers' && map.workers) setNodeTextKeepBadge(labelNode, map.workers);
    if (id === 'clients' && map.client) setNodeTextKeepBadge(labelNode, plural(map.client));
    if (id === 'quotes' && map.quote) setNodeTextKeepBadge(labelNode, plural(map.quote));
    if (id === 'invoices' && map.invoice) setNodeTextKeepBadge(labelNode, plural(map.invoice));
  });
}

const FIELD_ALIASES = {
  job_title: ['job title', 'job name', 'title', 'service', 'project', 'appointment', 'visit', 'booking', 'session'],
  client_name: ['client', 'client name', 'customer', 'customer name', 'owner', 'student'],
  site_address: ['address', 'site address', 'service address', 'appointment location', 'location'],
  scheduled_date: ['date', 'scheduled date', 'booking date'],
  scheduled_time: ['time', 'scheduled time', 'start time'],
  assigned_worker: ['worker', 'assigned worker', 'staff', 'technician', 'crew', 'cleaner', 'artist', 'groomer', 'coach'],
  worker_notes: ['notes', 'worker notes', 'instructions', 'description', 'client notes', 'session notes'],
  proof: ['proof', 'photos', 'checklist'],
  price: ['price', 'amount', 'total', 'payment amount'],
  quote: ['quote', 'estimate', 'proposal', 'consult', 'plan'],
  invoice: ['invoice', 'payment'],
};
function fieldIdFromLabel(value) {
  const k = key(value);
  for (const [id, aliases] of Object.entries(FIELD_ALIASES)) if (aliases.map(key).includes(k)) return id;
  return '';
}
function applyFormLabels() {
  const fLabels = formLabels();
  const fPlaceholders = formPlaceholders();
  if (!Object.keys(fLabels).length && !Object.keys(fPlaceholders).length) return;
  document.querySelectorAll('label,.cvxField,.field,.formRow').forEach((wrap) => {
    const labelNode = wrap.matches('label') ? wrap : wrap.querySelector('span,label,b,small');
    const control = wrap.matches('label') ? wrap.querySelector('input,textarea,select') : wrap.querySelector('input,textarea,select');
    const original = labelNode?.dataset?.cvxOriginalFieldLabel || clean(labelNode?.childNodes?.[0]?.nodeValue || labelNode?.textContent || control?.placeholder || '');
    if (labelNode && !labelNode.dataset.cvxOriginalFieldLabel) labelNode.dataset.cvxOriginalFieldLabel = original;
    const id = fieldIdFromLabel(original);
    if (!id) return;
    if (labelNode && fLabels[id]) {
      const badge = labelNode.querySelector?.(':scope > .cvxNavBadge');
      labelNode.textContent = fLabels[id];
      if (badge) labelNode.appendChild(badge);
    }
    if (control && fPlaceholders[id]) control.setAttribute('placeholder', fPlaceholders[id]);
  });
}

function applyFeatureVisibility() {
  const p = policy();
  const hideSelectors = [];
  if (p.gps === false || p.route_view === false) hideSelectors.push('[data-feature="gps"]', '[data-feature="route"]', '.gpsTool', '.routeTool', '[aria-label*="GPS" i]', '[aria-label*="route" i]');
  if (p.worker_app === false) hideSelectors.push('[data-feature="worker-app"]', '.workerAppPrompt');
  if (p.checklists === true) document.body.dataset.cvxIndustryChecklists = 'true';
  if (p.deposits === true) document.body.dataset.cvxIndustryDeposits = 'true';
  if (p.rebooking === true) document.body.dataset.cvxIndustryRebooking = 'true';
  if (p.project_stages === true) document.body.dataset.cvxIndustryProjectStages = 'true';
  hideSelectors.forEach((selector) => document.querySelectorAll(selector).forEach((node) => { node.hidden = true; node.classList.add('cvxIndustryHidden'); }));
}

function applyPageCopy() {
  const copy = pageCopy();
  if (copy.command_prompt) {
    document.querySelectorAll('.cvxHero p,.cvxPageHeader p,.cvxCommandHint').forEach((node) => {
      const text = clean(node.textContent).toLowerCase();
      if (text.includes('command') || text.includes('approval') || text.includes('owner')) node.textContent = copy.command_prompt;
    });
  }
  if (copy.jobs_empty) {
    document.querySelectorAll('.empty p,.cvxEmpty p,.emptyState p').forEach((node) => {
      if (clean(node.textContent).toLowerCase().includes('job')) node.textContent = copy.jobs_empty;
    });
  }
}

function applyDataFlags() {
  const ctx = state.context || readCache() || {};
  const b = brain();
  const p = policy();
  document.body.dataset.cvxIndustryIsolation = ctx.industry_isolation_ready ? 'ready' : 'basic';
  document.body.dataset.cvxIndustryKey = ctx.industry_key || ctx.industry_profile?.key || b.profile_key || 'field_service';
  document.body.dataset.cvxIndustryMode = ctx.industry_profile?.mode || b.mode || 'field_service';
  Object.entries(p || {}).forEach(([name, value]) => {
    document.body.dataset[`cvxIndustry${name.replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`] = String(Boolean(value));
  });
}

function applyIndustry() {
  if (!isOwnerApp()) return;
  applyDataFlags();
  applyNav();
  applyFormLabels();
  applyFeatureVisibility();
  applyPageCopy();
}

async function load() {
  if (!isOwnerApp()) return;
  const cached = readCache();
  if (cached) state.context = cached;
  applyIndustry();
  const fresh = await fetchContext();
  if (fresh) {
    state.context = fresh;
    state.loaded = true;
    saveCache(fresh);
    applyIndustry();
    window.dispatchEvent(new CustomEvent('churvox:industry-isolation-ready', { detail: fresh }));
  }
}

function schedule() {
  if (!isOwnerApp()) return;
  [80, 350, 900, 2200, 5000].forEach((delay) => window.setTimeout(applyIndustry, delay));
}

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
  window.addEventListener('load', schedule);
  window.addEventListener('popstate', () => { load(); schedule(); });
  window.addEventListener('hashchange', () => { load(); schedule(); });
  window.addEventListener('churvox-owner-app-ready', schedule);
  window.addEventListener('churvox:data-refresh', schedule);
  window.addEventListener('churvox:industry-mode-change', (event) => { state.context = event.detail; saveCache(event.detail); applyIndustry(); });
}

export {};
