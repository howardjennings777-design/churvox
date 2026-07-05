// Stops Plans billing nav clicks from being mistaken for slip/action buttons.
// Loaded early and uses window capture so global slip handlers never see these clicks.

function findSection(section) {
  const layer = document.getElementById('option-f-plans-pricing-desk');
  if (!layer) return null;
  if (section === 'usage') {
    const usage = [...document.querySelectorAll('section,article,div')].find((node) => /live plan usage/i.test(node.textContent || ''));
    if (usage) return usage;
  }
  return layer.querySelector(`[data-of-billing-section="${CSS.escape(section)}"]`);
}

function handlePlansBillingNavClick(event) {
  const button = event.target?.closest?.('[data-of-billing-nav]');
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

  const section = button.getAttribute('data-of-billing-nav') || 'overview';
  const target = findSection(section);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PLANS_BILLING_NAV_CLICK_GUARD__) {
  window.__CHURVOX_PLANS_BILLING_NAV_CLICK_GUARD__ = true;
  window.addEventListener('click', handlePlansBillingNavClick, true);
}

export {};