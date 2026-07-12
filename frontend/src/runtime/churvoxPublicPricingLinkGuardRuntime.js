// Keeps public homepage cards as plan-navigation cards.
// The live checkout runtime intentionally turns /pricing cards into signup CTAs,
// but homepage cards should keep moving visitors to the full pricing page.

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isHomepage() {
  return typeof window !== 'undefined' && window.location.pathname === '/';
}

function isLoggedIn() {
  try { return Boolean(localStorage.getItem('token') || localStorage.getItem('authToken')); } catch (_) { return false; }
}

function restoreHomepagePlanLinks() {
  if (!isHomepage() || isLoggedIn()) return;
  document.querySelectorAll('.cp26PlanGrid article').forEach((card) => {
    const action = Array.from(card.querySelectorAll('a,button')).find((node) => /trial|start|choose|plan|view/i.test(node.textContent || ''));
    if (!action) return;
    const label = clean(action.textContent || '');
    if (/trial|start/i.test(label)) action.textContent = 'View plan';
    action.setAttribute('href', '/pricing');
    action.removeAttribute('data-churvox-signup-plan');
    action.removeAttribute('data-stripe-live-plan');
    card.dataset.signupReady = '1';
  });
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PUBLIC_PRICING_LINK_GUARD__) {
  window.__CHURVOX_PUBLIC_PRICING_LINK_GUARD__ = true;
  window.addEventListener('load', () => setTimeout(restoreHomepagePlanLinks, 50));
  document.addEventListener('click', () => setTimeout(restoreHomepagePlanLinks, 80), true);
  const observer = new MutationObserver(() => restoreHomepagePlanLinks());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  restoreHomepagePlanLinks();
}

export {};
