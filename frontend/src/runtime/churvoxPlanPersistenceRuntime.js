// CHURVOX_PLAN_PERSISTENCE_20260630
// Keeps selected plan/country/trial state visible through signup, Stripe, billing return, and setup.

const KEY = 'churvox:selected-plan';
const COUNTRY_KEY = 'churvox:billing-country';
const LAST_STATUS_KEY = 'churvox:last-plan-status';
const PLAN_WORDS = ['start', 'crew', 'operator', 'command'];

function now() { return new Date().toISOString(); }
function read() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
function write(patch) { try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch, updated_at: now() })); } catch {} }
function params() { try { return new URLSearchParams(window.location.search || ''); } catch { return new URLSearchParams(); } }
function planFromText(value) {
  const text = String(value || '').toLowerCase();
  return PLAN_WORDS.find((plan) => new RegExp(`(^|[^a-z])${plan}([^a-z]|$)`).test(text)) || '';
}
function saveFromUrl() {
  const p = params();
  const plan = planFromText(p.get('plan') || p.get('selected_plan') || p.get('tier') || '');
  const country = String(p.get('country') || p.get('region') || '').toUpperCase();
  const checkout = String(p.get('checkout') || p.get('success') || p.get('session_id') || '').trim();
  if (plan) write({ plan, source: 'url' });
  if (country) { try { localStorage.setItem(COUNTRY_KEY, country); } catch {} write({ country }); }
  if (checkout) { try { localStorage.setItem(LAST_STATUS_KEY, JSON.stringify({ checkout, plan: plan || read().plan || '', at: now() })); } catch {} }
}
function saveFromClick(event) {
  const link = event.target?.closest?.('a,button');
  if (!link) return;
  const href = String(link.getAttribute?.('href') || '');
  const label = String(link.textContent || '');
  const plan = planFromText(`${href} ${label}`);
  if (!plan) return;
  write({ plan, source: 'click' });
}
function expose() {
  try {
    window.__churvoxSelectedPlan = read();
    window.dispatchEvent(new CustomEvent('churvox-plan-persisted', { detail: read() }));
  } catch {}
}
function run() { saveFromUrl(); expose(); }

if (typeof window !== 'undefined' && !window.__CHURVOX_PLAN_PERSISTENCE__) {
  window.__CHURVOX_PLAN_PERSISTENCE__ = true;
  window.addEventListener('load', run);
  window.addEventListener('popstate', run);
  window.addEventListener('hashchange', run);
  document.addEventListener('click', saveFromClick, true);
  setInterval(expose, 2000);
}

export {};
