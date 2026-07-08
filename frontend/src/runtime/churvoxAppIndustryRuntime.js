import { getIndustry, industryOptions, normalizeIndustry } from '../config/churvoxIndustrySystem';
import { loadBusinessSettings, saveBusinessSettings } from '../lib/businessSettings';

const STYLE_ID = 'churvox-app-industry-runtime-style';
const MARK = 'data-churvox-industry-runtime';
let running = false;

const css = `
  .cv3IndustryModePill { display: none !important; }
  .cv3IndustryPanel {
    grid-column: 1 / -1 !important;
    border-color: rgba(243,107,33,.2) !important;
    background: linear-gradient(135deg, rgba(255,255,255,.94), rgba(255,244,232,.86)) !important;
  }
  .cv3IndustryPanelBody {
    display: grid;
    grid-template-columns: minmax(0, .8fr) minmax(360px, 1.2fr);
    gap: 16px;
    align-items: start;
    padding: 0 14px 14px;
  }
  .cv3IndustryPanelBody label {
    display: grid;
    gap: 7px;
    color: #101513;
    font-size: 11px;
    font-weight: 1000;
    letter-spacing: .12em;
    text-transform: uppercase;
  }
  .cv3IndustryPanelBody select {
    width: 100%;
    border: 1px solid rgba(16,21,19,.12);
    border-radius: 16px;
    background: white;
    color: #101513;
    padding: 12px;
    font-size: 14px;
    font-weight: 900;
  }
  .cv3IndustryServices {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .cv3IndustryServices span {
    border: 1px solid rgba(16,21,19,.08);
    border-radius: 999px;
    padding: 8px 10px;
    background: rgba(255,255,255,.72);
    color: #3f4943;
    font-size: 11px;
    font-weight: 900;
  }
  .cv3IndustryHint {
    margin: 9px 0 0;
    color: #5d6862;
    font-size: 12px;
    font-weight: 820;
    line-height: 1.45;
  }
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
  } catch {
    return null;
  }
}

function currentSettings() {
  return loadBusinessSettings(readUser());
}

function currentIndustry() {
  return getIndustry(currentSettings().industry_mode || currentSettings().trade_industry_type);
}

function currentIndustryKey() {
  return normalizeIndustry(currentSettings().industry_mode || currentSettings().trade_industry_type);
}

function applyRootState() {
  const key = currentIndustryKey();
  const industry = getIndustry(key);
  document.documentElement.dataset.churvoxIndustry = key;
  document.documentElement.dataset.churvoxIndustryTitle = industry.title;
}

function cleanupGlobalIndustryUi() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.cv3IndustryModePill').forEach((node) => node.remove());
  if (!isSettingsPage()) {
    document.querySelectorAll('.cv3IndustryPanel,[data-churvox-industry-runtime="true"]').forEach((node) => node.remove());
  }
}

function isSettingsPage() {
  const hash = (window.location.hash || '').toLowerCase();
  const title = document.querySelector('.cv3TopCopy h1')?.textContent || '';
  return hash.includes('settings') || /settings/i.test(title);
}

function renderIndustryPanel() {
  if (!isSettingsPage()) return;
  const page = document.querySelector('.cv3Page');
  const hero = page?.querySelector('.cv3Hero');
  if (!page || !hero) return;
  let panel = page.querySelector('.cv3IndustryPanel');
  const settings = currentSettings();
  const industryKey = normalizeIndustry(settings.industry_mode || settings.trade_industry_type);
  const industry = getIndustry(industryKey);
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
        <p class="cv3IndustryHint">This controls service options and wording quietly across Churvox. Change it here when the business type is wrong.</p>
      </div>
      <div><b>${industry.title}</b><p class="cv3IndustryHint">${industry.intro}</p><div class="cv3IndustryServices">${(industry.services || []).map((service) => `<span>${service}</span>`).join('')}</div></div>
    </div>
  `;
  const select = panel.querySelector('.cv3IndustrySelect');
  select?.addEventListener('change', (event) => {
    const nextKey = normalizeIndustry(event.target.value);
    const nextIndustry = getIndustry(nextKey);
    saveBusinessSettings({ ...currentSettings(), trade_industry_type: nextKey, industry_mode: nextKey, default_job_types: nextIndustry.services || [] });
    applyAll(true);
  });
}

function labelTextForSelect(select) {
  const label = select.closest('label');
  return (label?.querySelector('span')?.textContent || label?.textContent || '').trim().toLowerCase();
}

function updateServiceSelects() {
  const industry = currentIndustry();
  const services = industry.services || [];
  document.querySelectorAll('.cv3Drawer select, .cv3Preview select, .cv3Panel select').forEach((select) => {
    if (select.classList.contains('cv3IndustrySelect')) return;
    const label = labelTextForSelect(select);
    if (!/service|preferred service|work type|job type/.test(label)) return;
    const current = select.value;
    const values = Array.from(new Set([current, ...services, 'Other'].filter(Boolean)));
    const oldValue = select.value;
    select.innerHTML = values.map((item) => `<option value="${item}">${item}</option>`).join('');
    select.value = values.includes(oldValue) ? oldValue : values[0] || '';
  });
}

function updateEmptyCopy() {
  const industry = currentIndustry();
  document.querySelectorAll('.cv3Empty').forEach((empty) => {
    const title = empty.querySelector('b')?.textContent || '';
    const text = empty.querySelector('span');
    if (/No jobs yet/i.test(title) && text) text.textContent = industry.emptyJob || text.textContent;
  });
}

function applyAll(force = false) {
  if (!isOwnerApp() || running) return;
  running = true;
  try {
    ensureStyle();
    applyRootState();
    cleanupGlobalIndustryUi();
    renderIndustryPanel();
    updateServiceSelects();
    updateEmptyCopy();
    if (force) window.dispatchEvent(new Event('churvox:data-refresh'));
  } finally {
    running = false;
  }
}

function schedule(delay = 100) {
  setTimeout(() => applyAll(false), delay);
}

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
