import API_BASE from '../lib/apiBase';

const LAYER_ID = 'option-f-plans-usage-panel';
const STYLE_ID = 'option-f-plans-usage-style';
const STORE_KEY = 'churvox_option_f_plan_usage_cache_v1';
let loading = false;
let loaded = false;
let usage = null;

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const apiUrl = (path) => `${String(API_BASE || '').replace(/\/$/, '')}/api${path}`;
function headers() { try { const auth = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || ''; return auth ? { Authorization: `Bearer ${auth}` } : {}; } catch (_) { return {}; } }
function isPlansPage() { const path = clean(window.location.pathname || '').toLowerCase(); const hash = clean((window.location.hash || '').replace('#', '')).toLowerCase(); if (path === '/plans' || path.endsWith('/plans') || hash === 'plans') return true; const active = document.querySelector('.churvoxOptionC .cocNav button.active'); return clean(active?.textContent).toLowerCase() === 'plans'; }

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `#${LAYER_ID}{display:grid;grid-column:1/-1;gap:12px;padding:16px;border:1px solid rgba(16,21,19,.09);border-radius:18px;background:#fff;box-shadow:0 16px 36px rgba(16,21,19,.06);color:#111815}#${LAYER_ID} h3{margin:0;font-size:18px}#${LAYER_ID} p{margin:0;color:#52605a;font-size:12px;font-weight:850;line-height:1.4}#${LAYER_ID} .usageGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}#${LAYER_ID} .usageCard{display:grid;gap:5px;min-height:72px;padding:12px;border-radius:14px;background:#f8faf9;border:1px solid rgba(16,21,19,.07)}#${LAYER_ID} .usageCard b{font-size:24px}#${LAYER_ID} .usageCard span{font-size:11px;font-weight:950;text-transform:uppercase;color:#52605a}#${LAYER_ID} .usageBar{height:8px;border-radius:999px;background:#e8eee9;overflow:hidden}#${LAYER_ID} .usageBar i{display:block;height:100%;width:var(--usage,0%);background:#ea580c;border-radius:999px}#${LAYER_ID} .usageNotes{display:grid;gap:6px;margin:0;padding:0;list-style:none}#${LAYER_ID} .usageNotes li{font-size:12px;font-weight:850;color:#28332e}@media(max-width:780px){#${LAYER_ID} .usageGrid{grid-template-columns:1fr 1fr}}@media(max-width:520px){#${LAYER_ID} .usageGrid{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
}

function numberValue(...values) { for (const value of values) { const n = Number(value); if (Number.isFinite(n)) return n; } return 0; }
function rowUsed(row) { return row && typeof row === 'object' ? numberValue(row.used, row.count, row.current, row.value) : numberValue(row); }
function rowLimit(row) { return row && typeof row === 'object' ? numberValue(row.limit, row.max, row.allowed, row.total) : numberValue(row); }
function pick(...values) { for (const value of values) if (value !== undefined && value !== null && clean(value)) return value; return ''; }
function payload(raw) { return raw?.data?.data || raw?.data || raw?.usage || raw || {}; }
function percent(used, limit) { return limit ? Math.max(0, Math.min(100, Math.round((Number(used || 0) / Number(limit || 1)) * 100))) : 0; }
function activeAccountingSync(data, addons) { return Boolean(addons.accounting_sync || addons.accounting_sync_addon || addons.xero || addons.myob || data.accounting_sync_active || data.accounting_sync_addon_active || data.accounting_addon_active || data.xero_addon_active || data.myob_addon_active || data.sync_addon_active); }

function normalizedUsage() {
  const data = payload(usage);
  const limits = data.limits || data.plan_limits || data.allowances || {};
  const used = data.used || data.usage || data.current || {};
  const addons = data.addons || data.add_ons || data.billing_addons || {};
  const clientsRow = used.clients;
  const jobsRow = used.jobs_month || used.jobs;
  const aiRow = used.ai_actions_month || used.ai_actions || used.ai_operator_actions;
  const teamRow = used.workers || used.team;
  return {
    plan: pick(data.plan_label, data.plan, data.current_plan, data.subscription_plan, data.tier, 'Current'),
    clientsUsed: rowUsed(clientsRow) || numberValue(data.clients_used, data.active_clients, data.client_count),
    clientsLimit: rowLimit(clientsRow) || numberValue(limits.clients, data.client_limit, data.max_clients),
    jobsUsed: rowUsed(jobsRow) || numberValue(data.jobs_used, data.jobs_this_month),
    jobsLimit: rowLimit(jobsRow) || numberValue(limits.jobs_month, limits.jobs, limits.jobs_per_month, data.jobs_limit, data.monthly_job_limit),
    aiUsed: rowUsed(aiRow) || numberValue(data.ai_actions_used, data.ai_operator_actions_used),
    aiLimit: rowLimit(aiRow) || numberValue(limits.ai_actions_month, limits.ai_actions, limits.ai_operator_actions, data.ai_action_limit, data.ai_operator_action_limit),
    teamUsed: rowUsed(teamRow) || numberValue(data.active_team_members, data.workers_used),
    teamLimit: rowLimit(teamRow) || numberValue(limits.workers, limits.team, limits.active_team_members, data.team_limit, data.worker_limit),
    growthPacks: numberValue(addons.growth_pack, addons.command_growth_pack, data.growth_packs, data.extra_user_blocks),
    accountingSync: activeAccountingSync(data, addons),
  };
}

async function loadUsage(force = false) {
  if (loading || (loaded && !force)) return;
  loading = true;
  try { const response = await fetch(apiUrl('/plan/usage'), { credentials: 'include', headers: headers() }); if (!response.ok) throw new Error(`HTTP ${response.status}`); usage = await response.json().catch(() => ({})); loaded = true; try { localStorage.setItem(STORE_KEY, JSON.stringify({ at: Date.now(), usage })); } catch (_) {} }
  catch (_) { try { const cached = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); if (cached?.usage) usage = cached.usage; } catch (_) {} loaded = true; }
  finally { loading = false; renderUsage(); }
}

function card(label, used, limit) { const hasLimit = Number(limit || 0) > 0; const pct = hasLimit ? percent(used, limit) : 0; return `<article class="usageCard"><span>${esc(label)}</span><b>${esc(hasLimit ? `${used}/${limit}` : used || '—')}</b><div class="usageBar" style="--usage:${pct}%"><i></i></div></article>`; }
function renderUsage() {
  if (!isPlansPage()) { document.getElementById(LAYER_ID)?.remove(); return; }
  ensureStyle();
  const account = document.getElementById('option-f-plans-pricing-desk');
  if (!account) return;
  if (!loaded && !loading) loadUsage();
  if (!usage) return;
  let node = document.getElementById(LAYER_ID);
  if (!node) { node = document.createElement('section'); node.id = LAYER_ID; const flow = account.querySelector('.ofBillingFlow'); if (flow) flow.insertAdjacentElement('afterend', node); else account.appendChild(node); }
  const data = normalizedUsage();
  node.innerHTML = `<h3>Live plan usage</h3><p>Shows current plan usage from the backend plan-usage route.</p><div class="usageGrid">${card('Clients', data.clientsUsed, data.clientsLimit)}${card('Jobs this month', data.jobsUsed, data.jobsLimit)}${card('AI actions', data.aiUsed, data.aiLimit)}${card('Active team', data.teamUsed, data.teamLimit)}</div><ul class="usageNotes"><li>Current plan: ${esc(data.plan)}</li><li>Growth packs active: ${esc(data.growthPacks || 0)}</li><li>Accounting sync add-on: ${data.accountingSync ? 'Active / included' : 'Not active or not reported'}</li></ul>`;
}
function schedule(force = false) { window.setTimeout(() => renderUsage(), 80); window.setTimeout(() => renderUsage(), 300); if (force) window.setTimeout(() => loadUsage(true), 160); }

if (typeof window !== 'undefined' && !window.__CHURVOX_OPTION_F_PLANS_USAGE__) {
  window.__CHURVOX_OPTION_F_PLANS_USAGE__ = true;
  window.addEventListener('load', () => schedule(true));
  window.addEventListener('hashchange', () => schedule(true));
  window.addEventListener('popstate', () => schedule(true));
  window.addEventListener('churvox-auth-refresh', () => loadUsage(true));
  document.addEventListener('click', (event) => { if (event.target.closest('[data-of-refresh-billing]')) loadUsage(true); schedule(false); }, true);
  document.addEventListener('change', () => schedule(false), true);
}

export {};