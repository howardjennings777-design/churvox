// CHURVOX_OPTION_F_PLANS_ISOLATION_RUNTIME_20260629
// Keeps the account billing Plans page from being polluted by generic workspace wiring panels.

const LAYER_ID = 'option-f-plans-pricing-desk';

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function isPlansPage() {
  const path = clean(window.location.pathname || '');
  const hash = clean((window.location.hash || '').replace('#', ''));
  if (path === '/plans' || path.endsWith('/plans') || hash === 'plans') return true;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return clean(active?.textContent) === 'plans';
}

function isolatePlans() {
  if (!isPlansPage()) return;
  const account = document.getElementById(LAYER_ID);
  if (!account || account.dataset.accountCenter !== '3') return;
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;

  root.querySelectorAll('.ofHardActions,.ofHardSaved,.ofHardAudit,.ofPlanActions,.ofPlanIncluded,.ofPlanGst,.churvoxStripeLiveStatus,.churvoxStripeLiveDetails').forEach((node) => {
    if (!account.contains(node)) node.remove();
  });

  root.querySelectorAll('[data-plan-action],[data-hard-action="plan-operator"],[data-hard-action="plan-command"],[data-stripe-live-plan],[data-stripe-plan]').forEach((node) => {
    if (!account.contains(node)) node.removeAttribute('data-plan-action');
  });
}

function schedule() {
  window.setTimeout(isolatePlans, 40);
  window.setTimeout(isolatePlans, 180);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_OPTION_F_PLANS_ISOLATION__) {
  window.__CHURVOX_OPTION_F_PLANS_ISOLATION__ = true;
  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  document.addEventListener('click', schedule, true);
  document.addEventListener('change', schedule, true);
  const observer = new MutationObserver(() => {
    if (isPlansPage()) schedule();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
