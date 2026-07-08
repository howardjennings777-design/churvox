import { getIndustry, industryCapabilities, industryOptions, industryWords, normalizeIndustry } from '../config/churvoxIndustrySystem';
import { loadBusinessSettings, saveBusinessSettings } from '../lib/businessSettings';

const STYLE_ID = 'churvox-app-industry-runtime-style';
const MARK = 'data-churvox-industry-runtime';
let running = false;

const css = `
  .cv3IndustryModePill { display: none !important; }
  .cv3IndustryPanel { grid-column: 1 / -1 !important; border-color: rgba(243,107,33,.2) !important; background: linear-gradient(135deg, rgba(255,255,255,.94), rgba(255,244,232,.86)) !important; }
  .cv3IndustryPanelBody { display: grid; grid-template-columns: minmax(0, .8fr) minmax(360px, 1.2fr); gap: 16px; align-items: start; padding: 0 14px 14px; }
  .cv3IndustryPanelBody label { display: grid; gap: 7px; color: #101513; font-size: 11px; font-weight: 1000; letter-spacing: .12em; text-transform: uppercase; }
  .cv3IndustryPanelBody select { width: 100%; border: 1px solid rgba(16,21,19,.12); border-radius: 16px; background: white; color: #101513; padding: 12px; font-size: 14px; font-weight: 900; }
  .cv3IndustryServices { display: flex; flex-wrap: wrap; gap: 8px; }
  .cv3IndustryServices span { border: 1px solid rgba(16,21,19,.08); border-radius: 999px; padding: 8px 10px; background: rgba(255,255,255,.72); color: #3f4943; font-size: 11px; font-weight: 900; }
  .cv3IndustryHint { margin: 9px 0 0; color: #5d6862; font-size: 12px; font-weight: 820; line-height: 1.45; }
  .cv3IndustryLogic { display:flex; flex-wrap:wrap; gap:8px; margin-top: 12px; }
  .cv3IndustryLogic span { border-radius:999px; padding:7px 9px; background:rgba(16,21,19,.08); color:#303a34; font-size:10px; font-weight:1000; letter-spacing:.05em; text-transform:uppercase; }
  .cv3IndustryHidden { display: none !important; }
  .cv3IndustryNoMap { grid-column: 1 / -1 !important; border-color: rgba(16,21,19,.09) !important; background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(248,246,240,.9)) !important; }
  .cv3IndustryNoMapBody { padding: 0 14px 14px; color:#52605a; font-size:13px; font-weight:850; line-height:1.5; }
  .cv3IndustryNoMapBody b { display:block; color:#101513; font-size:18px; font-weight:1000; letter-spacing:-.04em; margin-bottom:4px; }
  @media(max-width:760px){.cv3IndustryPanelBody{grid-template-columns:1fr}}
`;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  } else if (style.textContent !== css) {
    style.textContent = css;
  }
}

function isOwnerApp() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '';
  return path === '/dashboard' || path === '/plans' || path === '/guide' || path === '/setup' || path === '/setup-guide' || path.startsWith('/dashboard');
}

function readUser() {
  try {
    const raw = localStorage.getItem('churvox_auth_snapshot_v1') || localStorage.getItem('churvox_auth_snapshot') || '';
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user || parsed;
  } catch { return null; }
}

function currentSettings() { return loadBusinessSettings(readUser()); }
function currentIndustryKey() { return normalizeIndustry(currentSettings().industry_mode || currentSettings().trade_industry_type); }
function currentIndustry() { return getIndustry(currentIndustryKey()); }
function currentCaps() { return industryCapabilities(currentIndustryKey()); }
function currentWords() { return industryWords(currentIndustryKey()); }

function applyRootState() {
  const key = currentIndustryKey();
  const industry = getIndustry(key);
  const caps = currentCaps();
  document.documentElement.dataset.churvoxIndustry = key;
  document.documentElement.dataset.churvoxIndustryTitle = industry.title;
  document.documentElement.dataset.churvoxUsesFieldMap = caps.usesFieldMap ? 'true' : 'false';
}

function cleanupGlobalIndustryUi() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.cv3IndustryModePill').forEach((node) => node.remove());
  if (!isSettingsPage()) document.querySelectorAll('.cv3IndustryPanel,[data-churvox-industry-runtime="true"]').forEach((node) => node.remove());
}

function pageName() {
  const hash = (window.location.hash || '').replace(/^#/, '').split('?')[0].toLowerCase();
  const title = (document.querySelector('.cv3TopCopy h1')?.textContent || '').toLowerCase();
  return hash || title;
}
function isSettingsPage() { return pageName().includes('settings'); }
function isWorkersPage() { return /workers|cleaners|staff|technicians|painters|crew/.test(pageName()); }
function isQuotesPage() { return pageName().includes('quotes'); }

function escapeHtml(value) {
  return String(value || '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function renderIndustryPanel() {
  if (!isSettingsPage()) return;
  const page = document.querySelector('.cv3Page');
  const hero = page?.querySelector('.cv3Hero');
  if (!page || !hero) return;
  let panel = page.querySelector('.cv3IndustryPanel');
  const settings = currentSettings();
  const industryKey = currentIndustryKey();
  const industry = currentIndustry();
  const caps = currentCaps();
  const hidden = [!caps.usesFieldMap && 'field map', !caps.usesProof && 'proof/photo pressure', !caps.usesSiteAddress && 'site-address pressure', !caps.usesQuotes && 'quote page noise', !caps.usesTimesheets && 'timesheet pressure'].filter(Boolean);
  if (!panel) {
    panel = document.createElement('section');
    panel.className = 'cv3Panel cv3IndustryPanel span12';
    panel.setAttribute(MARK, 'true');
    hero.insertAdjacentElement('afterend', panel);
  }
  panel.innerHTML = `
    <header><div><small>business brain</small><h3>Industry mode</h3></div></header>
    <div class="cv3IndustryPanelBody">
      <div>
        <label><span>Business type</span><select class="cv3IndustrySelect">${industryOptions(true).map((option) => `<option value="${option.value}" ${option.value === industryKey ? 'selected' : ''}>${option.label}</option>`).join('')}</select></label>
        <p class="cv3IndustryHint">This controls service options, page wording and which noisy field-service parts Churvox soft-hides. Change it here when the business type is wrong.</p>
        <div class="cv3IndustryLogic">${hidden.length ? hidden.map((item) => `<span>hides ${escapeHtml(item)}</span>`).join('') : '<span>full field-service mode</span>'}</div>
      </div>
      <div><b>${escapeHtml(industry.title)}</b><p class="cv3IndustryHint">${escapeHtml(industry.intro)}</p><div class="cv3IndustryServices">${(industry.services || []).map((service) => `<span>${escapeHtml(service)}</span>`).join('')}</div></div>
    </div>`;
  const select = panel.querySelector('.cv3IndustrySelect');
  select?.addEventListener('change', (event) => {
    const nextKey = normalizeIndustry(event.target.value);
    const nextIndustry = getIndustry(nextKey);
    saveBusinessSettings({ ...currentSettings(), trade_industry_type: nextKey, industry_mode: nextKey, default_job_types: nextIndustry.services || [] });
    applyAll(true);
  });
}

function labelText(node) {
  const label = node.closest('label');
  return (label?.querySelector('span')?.textContent || label?.textContent || '').trim().toLowerCase();
}
function fieldLabel(node) { return node.closest('label')?.querySelector('span'); }
function renameLabel(node, newText) { const span = fieldLabel(node); if (span && newText) span.textContent = newText; }
function hideField(node, hide = true) { const label = node.closest('label'); if (label) label.classList.toggle('cv3IndustryHidden', Boolean(hide)); }

function updateServiceSelectsAndFields() {
  const industry = currentIndustry();
  const caps = currentCaps();
  const services = industry.services || [];
  document.querySelectorAll('.cv3Drawer select, .cv3Preview select, .cv3Panel select').forEach((select) => {
    if (select.classList.contains('cv3IndustrySelect')) return;
    const label = labelText(select);
    if (/service|preferred service|work type|job type/.test(label)) {
      renameLabel(select, caps.serviceLabel || 'Service');
      const current = select.value;
      const values = Array.from(new Set([current, ...services, 'Other'].filter(Boolean)));
      const oldValue = select.value;
      select.innerHTML = values.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
      select.value = values.includes(oldValue) ? oldValue : values[0] || '';
    }
  });
  document.querySelectorAll('.cv3Drawer input, .cv3Drawer textarea, .cv3Preview input, .cv3Preview textarea, .cv3Panel input, .cv3Panel textarea').forEach((input) => {
    const label = labelText(input);
    if (/site address|address/.test(label)) renameLabel(input, caps.addressLabel || 'Site address');
    if (/gps|location/.test(label)) hideField(input, caps.usesFieldMap === false);
    if (/proof|photo/.test(label)) {
      renameLabel(input, caps.proofLabel || 'Proof/photos');
      hideField(input, false);
    }
    if (/timesheet/.test(label)) hideField(input, caps.usesTimesheets === false);
  });
}

function updatePageWords() {
  const words = currentWords();
  const caps = currentCaps();
  const labels = { Jobs: words.jobs, Workers: words.workers, Team: words.team || words.workers };
  document.querySelectorAll('.cv3Nav button b, .cv3TopCopy h1').forEach((node) => {
    const txt = (node.textContent || '').trim();
    if (labels[txt]) node.textContent = labels[txt];
    if (txt === 'Quotes' && caps.usesQuotes === false) node.closest('button')?.classList.add('cv3IndustryHidden');
  });
  document.querySelectorAll('.cv3Hero small').forEach((node) => {
    if ((node.textContent || '').trim().toLowerCase() === 'jobs') node.textContent = words.jobs.toLowerCase();
    if ((node.textContent || '').trim().toLowerCase() === 'workers') node.textContent = words.workers.toLowerCase();
  });
}

function updateEmptyCopy() {
  const industry = currentIndustry();
  const words = currentWords();
  document.querySelectorAll('.cv3Empty').forEach((empty) => {
    const title = empty.querySelector('b')?.textContent || '';
    const text = empty.querySelector('span');
    if (/No jobs yet|No appointments yet|No visits yet/i.test(title) && text) {
      empty.querySelector('b').textContent = `No ${words.jobs.toLowerCase()} yet`;
      text.textContent = industry.emptyJob || text.textContent;
    }
  });
}

function applyIndustryHides() {
  const caps = currentCaps();
  const industry = currentIndustry();
  if (caps.usesFieldMap === false) {
    document.querySelectorAll('.cv3WorkerMapPanel,[data-churvox-single-worker-map="true"]').forEach((node) => node.remove());
    if (isWorkersPage()) {
      const page = document.querySelector('.cv3Page');
      const hero = page?.querySelector('.cv3Hero');
      if (page && hero && !page.querySelector('.cv3IndustryNoMap')) {
        const panel = document.createElement('section');
        panel.className = 'cv3Panel cv3IndustryNoMap span12';
        panel.innerHTML = `<header><div><small>${escapeHtml(industry.short)} mode</small><h3>Map hidden for this business type</h3></div></header><div class="cv3IndustryNoMapBody"><b>Appointments and staff matter more than field pins here.</b>Churvox keeps staff, client notes, services, appointments, reminders and payments visible without pretending this is a GPS dispatch business.</div>`;
        hero.insertAdjacentElement('afterend', panel);
      }
    }
  } else {
    document.querySelectorAll('.cv3IndustryNoMap').forEach((node) => node.remove());
  }
  if (caps.usesQuotes === false && isQuotesPage()) {
    const page = document.querySelector('.cv3Page');
    const hero = page?.querySelector('.cv3Hero');
    if (page && hero && !page.querySelector('.cv3IndustryNoMap')) {
      const panel = document.createElement('section');
      panel.className = 'cv3Panel cv3IndustryNoMap span12';
      panel.innerHTML = `<header><div><small>${escapeHtml(industry.short)} mode</small><h3>Quotes are soft-hidden for this business type</h3></div></header><div class="cv3IndustryNoMapBody"><b>Most appointments go straight to payment/invoice.</b>You can still use quotes if you need them, but Churvox keeps the main flow focused on appointments, clients, staff and money.</div>`;
      hero.insertAdjacentElement('afterend', panel);
    }
  }
}

function applyAll(force = false) {
  if (!isOwnerApp() || running) return;
  running = true;
  try {
    ensureStyle();
    applyRootState();
    cleanupGlobalIndustryUi();
    renderIndustryPanel();
    updateServiceSelectsAndFields();
    updatePageWords();
    updateEmptyCopy();
    applyIndustryHides();
    if (force) window.dispatchEvent(new Event('churvox:data-refresh'));
  } finally { running = false; }
}

function schedule(delay = 100) { setTimeout(() => applyAll(false), delay); }

if (typeof window !== 'undefined' && !window.__CHURVOX_APP_INDUSTRY_RUNTIME__) {
  window.__CHURVOX_APP_INDUSTRY_RUNTIME__ = true;
  [100, 600, 1400, 3000].forEach(schedule);
  window.addEventListener('load', () => schedule(200));
  window.addEventListener('hashchange', () => [60, 180, 500, 1000].forEach(schedule));
  window.addEventListener('popstate', () => [60, 180, 500, 1000].forEach(schedule));
  window.addEventListener('churvox-business-settings-updated', () => [80, 300].forEach(schedule));
  window.addEventListener('churvox:data-refresh', () => [200, 900].forEach(schedule));
  document.addEventListener('click', () => schedule(120), true);
}

export {};
