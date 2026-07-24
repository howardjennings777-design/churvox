// Keep the exact React plan identity after generic checkout enhancement.
// This prevents "Command Growth Pack" from being shortened to "Command".

const ACTIONS = {
  Start: { label: 'Start trial', action: 'start_trial' },
  Crew: { label: 'Start trial', action: 'start_trial' },
  Operator: { label: 'Start Operator trial', action: 'start_trial' },
  Command: { label: 'Start Command', action: 'start_trial' },
  'Command Growth Pack': { label: 'Add growth pack', action: 'add_on' },
  'Accounting Sync Add-on': { label: 'Add accounting sync', action: 'add_on' },
};

function repair() {
  document.querySelectorAll('[data-plan-card][data-stripe-plan]').forEach((card) => {
    const name = String(card.getAttribute('data-stripe-plan') || '').trim();
    const config = ACTIONS[name];
    if (!config) return;
    card.setAttribute('data-plan-name', name);
    const button = card.querySelector('button[data-stripe-live-plan], a[data-stripe-live-plan], button[data-stripe-live-action], a[data-stripe-live-action]');
    if (!button || button.disabled) return;
    button.setAttribute('data-stripe-live-plan', name);
    button.setAttribute('data-stripe-live-action', config.action);
    button.textContent = config.label;
  });
}

function start() {
  repair();
  const observer = new MutationObserver(() => window.requestAnimationFrame(repair));
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-stripe-live-plan', 'data-stripe-plan'] });
  window.addEventListener('hashchange', repair);
  window.addEventListener('popstate', repair);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}

export { repair };
