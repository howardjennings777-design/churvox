import API_BASE from '../lib/apiBase';

const FLAG = '__CHURVOX_INDUSTRY_MODE_RUNTIME_SAFE__';
const API_ROOT = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
const STORE_KEY = 'churvox.industry.context.v1';
const BUSINESS_REQUIRED_KEY = 'churvox_business_profile_required';
const PLAN_REQUIRED_KEY = 'churvox_plan_choice_required';
const OWNER_PATHS = ['/dashboard', '/plans', '/guide', '/setup', '/setup-guide'];
let state = { profiles: [], context: null, busy: false };

function path() { return window.location.pathname || ''; }
function params() { try { return new URLSearchParams(window.location.search || ''); } catch { return new URLSearchParams(); } }
function storedAuthUser() { try { return JSON.parse(localStorage.getItem('churvox_auth_session_snapshot_v1') || '{}')?.user || {}; } catch { return {}; } }
function isWorkerSession() { const user = storedAuthUser(); const role = clean(user.role || user.user_role || user.account_type).toLowerCase().replace(/[ -]/g, '_'); return new Set(["worker", "staff", "employee", "subcontractor", "contractor", "technician", "field_worker"]).has(role) || user.is_worker === true || user.worker_id; }
function isOwnerApp() { const p = path(); return !isWorkerSession() && (OWNER_PATHS.includes(p) || p.startsWith('/dashboard')); }
function isSetupPath() { return ['/setup-guide', '/setup', '/guide'].includes(path()); }
function isPlansPath() { return path() === '/plans'; }
function token() { try { return localStorage.getItem('token') || ''; } catch { return ''; } }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function key(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function ownerRoot() { return document.querySelector('.cvxProduct') || document.querySelector('main') || document.getElementById('root'); }
function esc(value) { return clean(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

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

function readCache() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; } }
function saveCache(context) { try { localStorage.setItem(STORE_KEY, JSON.stringify(context || {})); } catch {} }
function markBusinessRequired() { try { localStorage.setItem(BUSINESS_REQUIRED_KEY, 'true'); } catch {} }
function clearBusinessRequired() { try { localStorage.removeItem(BUSINESS_REQUIRED_KEY); } catch {} }
function planStillRequired() { try { return localStorage.getItem(PLAN_REQUIRED_KEY) === 'true'; } catch { return false; } }

function selectedProfile() { return state.context?.industry_profile || readCache()?.industry_profile || {}; }
function selectedBrain() { return state.context?.brain || readCache()?.brain || {}; }
function businessProfile() { return state.context?.business_profile || readCache()?.business_profile || {}; }
function profileComplete() { return Boolean(state.context?.business_profile_completed || businessProfile()?.completed || state.context?.saved); }
function currentProfileKey() { return selectedProfile()?.key || state.context?.industry_key || businessProfile()?.industry_key || readCache()?.industry_key || 'field_service'; }
function currentWorkStyle() { return businessProfile()?.work_style || state.context?.work_style || readCache()?.work_style || 'auto'; }
function nextAfterProfile() {
  const forced = params().get('next');
  if (forced === 'dashboard' || forced === 'plans') return forced;
  return state.context?.next_after_profile || readCache()?.next_after_profile || 'dashboard';
}

function wantsProfileNow() {
  const q = params();
  if (q.get('business_profile_done') === '1') return false;
  if (q.get('business_profile') === '1' || q.get('profile') === '1' || q.get('tester') === '1') return true;
  return isSetupPath() && q.get('first_setup') === '1';
}

function shouldMountPanel() {
  if (!isOwnerApp()) return false;
  if (isPlansPath() && !wantsProfileNow()) return false;
  if (isSetupPath()) return true;
  if (wantsProfileNow()) return true;
  return false;
}

function removePanelIfNotNeeded() {
  if (shouldMountPanel()) return;
  document.querySelectorAll('.cvxIndustryMode').forEach((node) => node.remove());
}

function applyBodyContext() {
  const profile = selectedProfile();
  const brain = selectedBrain();
  if (!profile?.key) return;
  document.body.dataset.churvoxIndustryKey = profile.key;
  document.body.dataset.churvoxIndustryMode = profile.mode || brain.mode || 'field_service';
  document.body.dataset.churvoxIndustrySource = state.context?.source || 'local';
  document.body.dataset.churvoxGps = brain?.feature_switches?.gps === false ? 'false' : 'true';
  document.body.dataset.churvoxBusinessProfileCompleted = profileComplete() ? 'true' : 'false';
}

function maybeGateBusinessProfile() {
  if (!isOwnerApp()) return;
  if (isPlansPath()) return;
  if (isSetupPath()) return;
  if (wantsProfileNow()) return;
  if (planStillRequired()) return;
  if (!state.context?.business_profile_required) return;
  if (profileComplete()) return;
  markBusinessRequired();
  try {
    const next = encodeURIComponent(`${path()}${window.location.hash || ''}`);
    window.location.replace(`/setup-guide?business_profile=1&next=dashboard&from=${next}`);
  } catch {}
}

const NAV_ALIASES = {
  jobs: ['jobs', 'appointments', 'visits', 'projects', 'bookings', 'sessions'],
  workers: ['workers', 'staff', 'crew', 'technicians', 'cleaners', 'artists', 'groomers', 'practitioners', 'coaches', 'team'],
  quotes: ['quotes', 'quote', 'estimate', 'estimates', 'consult', 'consults', 'proposal', 'proposals', 'plan', 'plans'],
  invoices: ['invoices', 'invoice', 'payments', 'payment'],
};
function navIdFromText(value) {
  const k = key(value);
  for (const [id, aliases] of Object.entries(NAV_ALIASES)) if (aliases.includes(k)) return id;
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
    if (id === 'quotes' && labels.quote) setLabel(labelNode, labels.quote === 'Consult' ? 'Consults' : labels.quote === 'Plan' ? 'Plans' : labels.quote === 'Proposal' ? 'Proposals' : `${labels.quote}s`, original);
    if (id === 'invoices' && labels.invoice) setLabel(labelNode, labels.invoice === 'Payment' ? 'Payments' : `${labels.invoice}s`, original);
  });
}

function compactList(items, limit = 4) { return (items || []).slice(0, limit).join(', ') || 'Keeps the normal Churvox setup.'; }
function optionMarkup(profile) { return `<option value="${esc(profile.key)}">${esc(profile.name)}</option>`; }
function groupedOptions(profiles) {
  const groups = [];
  const seen = new Set();
  profiles.forEach((profile) => { if (!seen.has(profile.group)) { seen.add(profile.group); groups.push(profile.group); } });
  return groups.map((group) => {
    const opts = profiles.filter((profile) => profile.group === group).map(optionMarkup).join('');
    return `<optgroup label="${esc(group)}">${opts}</optgroup>`;
  }).join('');
}
function brainHtml() {
  const profile = selectedProfile();
  const brain = selectedBrain();
  return `
    <span><b>Shows</b><small>${esc(compactList(brain.required_features || profile.required_features, 4))}</small></span>
    <span><b>Optional</b><small>${esc(compactList(brain.optional_features || profile.optional_features, 4))}</small></span>
    <span><b>Hides</b><small>${esc(compactList(brain.hide_by_default || profile.hide_by_default, 4))}</small></span>
    <span><b>Command watches</b><small>${esc(compactList(brain.command_signals || profile.command_signals, 4))}</small></span>`;
}

function stepCopy() {
  if (state.context?.tester_access || params().get('tester') === '1') {
    return { kicker: 'Tester business profile', title: 'Tell Churvox what this tester business actually does.', body: 'Tester accounts skip plan choice because access is controlled from HQ. They still need this profile so Churvox knows the industry, wording and tools to show.', button: 'Save profile and open app' };
  }
  return { kicker: 'Business profile setup', title: 'Set up the business profile.', body: 'Pick the profession once. Churvox keeps the same approval engine, then adapts labels, setup priorities, Command signals and tools.', button: 'Save profile and open app' };
}

function mountPanel() {
  if (!shouldMountPanel()) return;
  const root = ownerRoot();
  if (!root || document.querySelector('.cvxIndustryMode')) return;
  const profile = selectedProfile();
  const profiles = state.profiles.length ? state.profiles : [profile].filter(Boolean);
  if (!profiles.length) return;
  const copy = stepCopy();
  const bp = businessProfile();
  const requiredClass = state.context?.business_profile_required && !profileComplete() ? ' required' : '';
  const panel = document.createElement('section');
  panel.className = `cvxIndustryMode${requiredClass} ${profileComplete() ? 'saved' : ''}`;
  panel.innerHTML = `
    <div class="cvxIndustryModeTop">
      <div><small>${esc(copy.kicker)}</small><h3>${esc(copy.title)}</h3><p>${esc(copy.body)}</p></div>
      <strong class="cvxIndustryModePill">Profile setup · Same engine</strong>
    </div>
    <div class="cvxIndustryModeGrid">
      <label>Business name<input data-cvx-business-name value="${esc(bp.business_name || '')}" placeholder="Example: Local property services" /></label>
      <label>Profession / industry<select data-cvx-industry-select>${groupedOptions(profiles)}</select></label>
      <label>How they work<select data-cvx-work-style><option value="auto">Choose how this business works</option><option value="client_site">I go to customers</option><option value="shop">Customers come to me</option><option value="mobile">Mobile appointment business</option><option value="both">Both</option></select></label>
      <label>Service area<input data-cvx-service-area value="${esc(bp.service_area || '')}" placeholder="Example: Lower Hutt, Wellington" /></label>
      <label>Main services<input data-cvx-main-services value="${esc(bp.main_services || '')}" placeholder="Example: mowing, hedges, garden tidy" /></label>
      <label>Team size<select data-cvx-team-size><option value="">Choose team size</option><option value="solo">Solo</option><option value="2-5">2-5</option><option value="6-15">6-15</option><option value="16-50">16-50</option><option value="50+">50+</option></select></label>
      <label>Business phone<input data-cvx-business-phone value="${esc(bp.business_phone || '')}" placeholder="Optional" /></label>
      <button type="button" data-cvx-save-industry>${esc(copy.button)}</button>
    </div>
    <div class="cvxIndustryBrain">${brainHtml()}</div>
    <div class="cvxIndustryConfirm">Saved. Churvox will keep using this profile for labels, setup and Command decisions.</div>
    <div class="cvxIndustryError" style="display:none"></div>`;
  const hero = root.querySelector('.cvxHero');
  if (hero?.parentNode) hero.parentNode.insertBefore(panel, hero.nextSibling);
  else root.prepend(panel);
  const industrySelect = panel.querySelector('[data-cvx-industry-select]');
  const workSelect = panel.querySelector('[data-cvx-work-style]');
  const teamSelect = panel.querySelector('[data-cvx-team-size]');
  if (industrySelect) industrySelect.value = currentProfileKey();
  if (workSelect) workSelect.value = currentWorkStyle();
  if (teamSelect) teamSelect.value = bp.team_size || '';
  panel.querySelector('[data-cvx-save-industry]')?.addEventListener('click', async () => saveFromPanel(panel));
}

function updatePanel() {
  const panel = document.querySelector('.cvxIndustryMode');
  if (!panel) return;
  panel.classList.toggle('saved', profileComplete());
  panel.classList.toggle('required', Boolean(state.context?.business_profile_required && !profileComplete()));
  const brain = panel.querySelector('.cvxIndustryBrain');
  if (brain) brain.innerHTML = brainHtml();
  const industrySelect = panel.querySelector('[data-cvx-industry-select]');
  const workSelect = panel.querySelector('[data-cvx-work-style]');
  const teamSelect = panel.querySelector('[data-cvx-team-size]');
  if (industrySelect) industrySelect.value = currentProfileKey();
  if (workSelect) workSelect.value = currentWorkStyle();
  if (teamSelect && businessProfile()?.team_size) teamSelect.value = businessProfile().team_size;
}

function showError(panel, message) {
  const node = panel.querySelector('.cvxIndustryError');
  if (!node) return;
  node.textContent = message;
  node.style.display = 'block';
}

async function saveFromPanel(panel) {
  const business_name = clean(panel.querySelector('[data-cvx-business-name]')?.value);
  const industry_key = panel.querySelector('[data-cvx-industry-select]')?.value || 'field_service';
  const work_style = panel.querySelector('[data-cvx-work-style]')?.value || 'auto';
  const business_phone = clean(panel.querySelector('[data-cvx-business-phone]')?.value);
  const service_area = clean(panel.querySelector('[data-cvx-service-area]')?.value);
  const main_services = clean(panel.querySelector('[data-cvx-main-services]')?.value);
  const team_size = clean(panel.querySelector('[data-cvx-team-size]')?.value);
  if (!business_name) return showError(panel, 'Add the business name first.');
  if (!work_style || work_style === 'auto') return showError(panel, 'Choose how this business works so Churvox knows whether to show GPS, appointments, routes or shop-based tools.');
  await saveIndustry({ industry_key, work_style, business_name, business_phone, service_area, main_services, team_size });
}

async function saveIndustry(payloadToSave) {
  if (state.busy) return;
  state.busy = true;
  const panel = document.querySelector('.cvxIndustryMode');
  panel?.querySelector('[data-cvx-save-industry]')?.setAttribute('disabled', 'disabled');
  const payload = await fetchJson('/industry/context', { method: 'POST', body: JSON.stringify(payloadToSave) });
  if (payload?.success && payload?.source === 'churvox_industry_mode') {
    state.context = payload;
    saveCache(payload);
  } else {
    const profile = state.profiles.find((item) => item.key === payloadToSave.industry_key) || state.profiles[0];
    state.context = { success: true, source: 'local', saved: true, industry_key: payloadToSave.industry_key, work_style: payloadToSave.work_style, business_profile_completed: Boolean(payloadToSave.business_name && payloadToSave.work_style !== 'auto'), business_profile: { ...payloadToSave, completed: true }, industry_profile: profile, brain: { ...(profile || {}), labels: profile?.labels || {}, feature_switches: {} } };
    saveCache(state.context);
  }
  state.busy = false;
  panel?.querySelector('[data-cvx-save-industry]')?.removeAttribute('disabled');
  if (profileComplete()) clearBusinessRequired();
  else markBusinessRequired();
  applyAll();
  window.dispatchEvent(new CustomEvent('churvox:industry-mode-change', { detail: state.context }));
  if (profileComplete()) {
    const next = nextAfterProfile();
    if (next === 'plans') window.location.assign('/plans?business_profile_done=1');
    else window.location.assign('/dashboard?business_profile_done=1');
  }
}

async function loadIndustry() {
  if (!isOwnerApp()) return;
  const cached = readCache();
  if (cached) state.context = cached;
  const [profilesPayload, contextPayload] = await Promise.all([fetchJson('/industry/profiles'), fetchJson('/industry/context')]);
  if (profilesPayload?.success && Array.isArray(profilesPayload.profiles)) state.profiles = profilesPayload.profiles;
  if (contextPayload?.success && contextPayload.source === 'churvox_industry_mode') {
    state.context = contextPayload;
    saveCache(contextPayload);
  }
  if (state.context?.business_profile_required && !profileComplete()) markBusinessRequired();
  if (profileComplete()) clearBusinessRequired();
  applyAll();
}

function applyAll() {
  applyBodyContext();
  maybeGateBusinessProfile();
  removePanelIfNotNeeded();
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
