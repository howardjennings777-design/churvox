// CHURVOX_BILLING_HELP_CONTACT_RUNTIME_20260701
// If checkout/billing has trouble, support must be reachable even when the app is locked.

function isBillingContext() {
  if (typeof window === 'undefined') return false;
  const path = String(window.location.pathname || '');
  const search = String(window.location.search || '');
  return path.startsWith('/billing') || /checkout|session_id|must_choose_plan|first_setup/.test(search);
}

function guardBillingHelpClicks(event) {
  if (!isBillingContext()) return;
  const link = event.target?.closest?.('a[href="/support-board"],a[href="/dashboard#help"],a[href="/support"]');
  if (!link) return;
  event.preventDefault();
  window.location.href = '/contact';
}

function relabelBillingHelpLinks() {
  if (!isBillingContext() || typeof document === 'undefined') return;
  document.querySelectorAll('a[href="/support-board"],a[href="/dashboard#help"],a[href="/support"]').forEach((link) => {
    link.setAttribute('href', '/contact');
    if (/need help|support/i.test(link.textContent || '')) link.textContent = 'Contact support';
  });
}

if (typeof window !== 'undefined' && !window.__CHURVOX_BILLING_HELP_CONTACT_RUNTIME__) {
  window.__CHURVOX_BILLING_HELP_CONTACT_RUNTIME__ = true;
  document.addEventListener('click', guardBillingHelpClicks, true);
  window.addEventListener('load', () => setTimeout(relabelBillingHelpLinks, 300));
  setInterval(relabelBillingHelpLinks, 1200);
}

export {};
