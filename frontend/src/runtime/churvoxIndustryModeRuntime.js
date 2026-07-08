import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_INDUSTRY_MODE_RUNTIME__';
const API_ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
const STORE_KEY = 'churvox.industry.context.v1';
const OWNER_PATHS = ['/dashboard', '/plans', '/guide', '/setup', '/setup-guide'];
let state = { profiles: [], context: null, busy: false };

function path() { return window.location.pathname || ''; }
function isOwnerApp() { const p = path(); return OWNER_PATHS.includes(p) || p.startsWith('/dashboard'); }
function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function key(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function ownerRoot() { return document.querySelector('.cvxProduct') || document.querySelector('main') || document.getElementById('root'); }

async function fetchJson(endpoint, options = {}) {
  const headers = { ...(options.headers || {}) };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  try {
    const response = await fetch(`${API_ROOT}${endpoint}`, { credentials: 'include', ...options, headers });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch { return null; }
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; }
}

function saveCache(context) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(context || {})); } catch {}
}

function selectedProfile() {
  const profile = state.context?.industry_profile || readCache()?.industry_profile || {};
  return profile;
}

function selectedBrain() {
  return state.context?.brain || readCache()?.brain || {};
}

function applyBodyContext() {
  const profile = selectedProfile();
  const brain = selectedBrain();
  if (!profile?.key) return;
  document.body.dataset.churvoxIndustryKey = profile.key;
  document.body.dataset.churvoxIndustryMode = profile.mode || brain.mode || 'field_service';
  document.body.dataset.churvoxIndustrySource = state.context?.source || 'local';
  document.body.dataset.churvoxGps = brain?.feature_switches?.gps === false ? 'false' : 'true';
}

const NAV_ALIASES = {
  jobs: ['jobs', 'appointments', 'visits', 'projects', 'bookings', 'sessions'],
  workers: ['workers', 'staff', 'crew', 'technicians', 'cleaners', 'artists', 'groomers', 'practitioners', 'coaches', 'team'],
  quotes: ['quotes', 'quote', 'estimate', 'estimates', 'consult', 'consults', 'proposal', 'proposals', 'plan', 'plans'],
  invoices: ['invoices', 'invoice', 'payments', 'payment'],
};

function navIdFromText(value) {
  const k = key(value);
  for (const [id, aliases] of Object.entries(NAV_ALIASES)) {
    if (aliases.includes(k)) return id;
  }
  return k;
}

function setLabel(labelNode, next, original) {
  if (!labelNode || !next) return;
  if (!labelNode.dataset.cvxOriginalLabel) labelNode.dataset.cvxOriginalLabel = clean(original || labelNode.childNodes[0]?.nodeValue || labelNode.textContent);
  const badge = labelNode.querySelector(':scope > .cvxNavBadge');
  labelNode.textContent = next;
  if (badge) labelNode.appendChild(badge);
}

function applyNavLabels() {
  const labels = selectedBrain()?.labels || selectedProfile()?.labels || {};
  if (!labels || !Object.keys(labels).length) return;
  document.querySelectorAll('.cvxProduct .cvxNav button').forEach((button) => {
    const labelNode = button.querySelector('b') || button;
    const original = labelNode.dataset.cvxOriginalLabel || clean(labelNode.textContent);
    const id = navIdFromText(original);
    if (id === 'jobs' && labels.jobs) setLabel(labelNode, labels.jobs, original);
    if (id === 'workers' && labels.workers) setLabel(labelNode, labels.workers, original);
    if (id === 'quotes' && labels.quote) setLabel(labelNode, `${labels.quote}s`.replace('Consults', 'Consults').replace('Payments', 'Payments'), original);
    if (id === 'invoices' && labels.invoice) setLabel(labelNode, labels.invoice === 'Payment' ? 'Payments' : `${labels.invoice}s`, original);
  });
}

function compactList(items, limit = 3) {
  return (items || []).slice(0, limit).join(', ') || 'Keeps the normal Churvox setup.';
}

function optionMarkup(profile) {
  return `<option value="${profile.key}">${profile.name}</option>`;
}

function groupedOptions(profiles) {
  const groups = [];
  const seen = new Set();
  profiles.forEach((profile) => { if (!seen.has(profile.group)) { seen.add(profile.group); groups.push(profile.group); } });
  return groups.map((group) => {
    const opts = profiles.filter((profile) => profile.group === group).map(optionMarkup).join('');
    return `<optgroup label="${group}">${opts}</optgroup>`;
  }).join('');
}

function currentProfileKey() {
  return selectedProfile()?.key || state.context?.industry_key || readCache()?.industry_key || 'field_service';
}

function currentWorkStyle() {
  return state.context?.work_style || readCache()?.work_style || 'auto';
}

function brainHtml() {
  const profile = selectedProfile();
  const brain = selectedBrain();
  return `
    <span><b>Shows</b><small>${compactList(brain.required_features || profile.required_features, 4)}</small></span>
    <span><b>Optional</b><small>${compactList(brain.optional_features || profile.optional_features, 4)}</small></span>
    <span><b>Hides</b><small>${compactList(brain.hide_by_default || profile.hide_by_default, 4)}</small></span>
    <span><b>Command watches</b><small>${compactList(brain.command_signals || profile.command_signals, 4)}</small></span>`;
}

function mountPanel() {
  if (!isOwnerApp()) return;
  const root = ownerRoot();
  if (!root || document.querySelector('.cvxIndustryMode')) return;
  const profile = selectedProfile();
  const profiles = state.profiles.length ? state.profiles : [profile].filter(Boolean);
  if (!profiles.length) return;
  const panel = document.createElement('section');
  panel.className = `cvxIndustryMode ${state.context?.saved ? 'saved' : ''}`;
  panel.innerHTML = `
    <div class="cvxIndustryModeTop">
      <div>
        <small>Industry Mode</small>
        <h3>Make Churvox fit the business, without changing the engine.</h3>
        <p>Pick the profession once. Churvox keeps the same approval brain, but adapts the language, setup priorities, Command signals and tools so a hairdresser is not forced into tradie GPS clutter.</p>
      </div>
      <strong class="cvxIndustryModePill">Same brain · cleaner screens</strong>
    </div>
    <div class="cvxIndustryModeGrid">
      <label>Profession
        <select data-cvx-industry-select>${groupedOptions(profiles)}</select>
      </label>
      <label>How they work
        <select data-cvx-work-style>
          <option value="auto">Auto / not sure</option>
          <option value="client_site">I go to customers</option>
          <option value="shop">Customers come to me</option>
          <option value="mobile">Mobile appointment business</option>
          <option value="both">Both</option>
        </select>
      </label>
      <button type="button" data-cvx-save-industry>Apply mode</button>
    </div>
    <div class="cvxIndustryBrain">${brainHtml()}</div>
    <div class="cvxIndustryConfirm">Saved. Churvox will keep using this profile for labels, setup and Command decisions.</div>`;
  const hero = root.querySelector('.cvxHero');
  if (hero?.parentNode) hero.parentNode.insertBefore(panel, hero.nextSibling);
  else root.prepend(panel);
  const industrySelect = panel.querySelector('[data-cvx-industry-select]');
  const workSelect = panel.querySelector('[data-cvx-work-style]');
  if (industrySelect) industrySelect.value = currentProfileKey();
  if (workSelect) workSelect.value = currentWorkStyle();
  panel.querySelector('[data-cvx-save-industry]')?.addEventListener('click', async () => {
    const industry_key = industrySelect?.value || 'field_service';
    const work_style = workSelect?.value || 'auto';
    await saveIndustry(industry_key, work_style);
  });
}

function updatePanel() {
  const panel = document.querySelector('.cvxIndustryMode');
  if (!panel) return;
  panel.classList.toggle('saved', Boolean(state.context?.saved));
  const brain = panel.querySelector('.cvxIndustryBrain');
  if (brain) brain.innerHTML = brainHtml();
  const industrySelect = panel.querySelector('[data-cvx-industry-select]');
  const workSelect = panel.querySelector('[data-cvx-work-style]');
  if (industrySelect) industrySelect.value = currentProfileKey();
  if (workSelect) workSelect.value = currentWorkStyle();
}

async function saveIndustry(industry_key, work_style) {
  if (state.busy) return;
  state.busy = true;
  const payload = await fetchJson('/industry/context', { method: 'POST', body: JSON.stringify({ industry_key, work_style }) });
  if (payload?.success && payload?.source === 'churvox_industry_mode') {
    state.context = payload;
    saveCache(payload);
  } else {
    const profile = state.profiles.find((item) => item.key === industry_key) || state.profiles[0];
    state.context = { success: true, source: 'local', saved: false, industry_key, work_style, industry_profile: profile, brain: { ...(profile || {}), labels: profile?.labels || {}, feature_switches: {} } };
    saveCache(state.context);
  }
  state.busy = false;
  applyAll();
  window.dispatchEvent(new CustomEvent('churvox:industry-mode-change', { detail: state.context }));
}

async function loadIndustry() {
  const cached = readCache();
  if (cached) state.context = cached;
  const [profilesPayload, contextPayload] = await Promise.all([
    fetchJson('/industry/profiles'),
    fetchJson('/industry/context'),
  ]);
  if (profilesPayload?.success && Array.isArray(profilesPayload.profiles)) state.profiles = profilesPayload.profiles;
  if (contextPayload?.success && contextPayload.source === 'churvox_industry_mode') {
    state.context = contextPayload;
    saveCache(contextPayload);
  }
  applyAll();
}

function applyAll() {
  applyBodyContext();
  mountPanel();
  updatePanel();
  applyNavLabels();
}

function schedule() {
  if (!isOwnerApp()) return;
  [150, 700, 1800, 4200].forEach((delay) => window.setTimeout(applyAll, delay));
}

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadIndustry, { once: true });
  else loadIndustry();
  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  window.addEventListener('churvox:data-refresh', schedule);
}

export {};
