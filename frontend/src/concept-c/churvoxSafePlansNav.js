// CHURVOX_RELIABLE_PLANS_NAV_20260530_HARDENED
// Keeps a small Plans tab in the Command bottom nav without route loops.
// Safe runtime-only helper: no billing, trial, Stripe, API, auth, or page logic touched.

function normalizeNavLabels(nav) {
  Array.from(nav.querySelectorAll('a')).forEach((link) => {
    const text = String(link.textContent || '').trim().toLowerCase();
    if (text === 'command floor' || text === '⚡ command floor') link.textContent = 'Command';
    if (text === 'client workbench') link.textContent = 'Clients';
    if (text === 'plan command') link.textContent = 'Plans';
    if (text === 'plans') {
      link.href = '/plans';
      link.setAttribute('data-churvox-safe-plans', 'true');
      link.setAttribute('aria-label', 'Plans');
    }
  });
}

function buildPlansLink() {
  const link = document.createElement('a');
  link.href = '/plans';
  link.textContent = 'Plans';
  link.setAttribute('data-churvox-safe-plans', 'true');
  link.setAttribute('aria-label', 'Plans');
  return link;
}

function addPlansToNav(nav) {
  if (!nav) return;
  normalizeNavLabels(nav);
  if (nav.querySelector('a[href="/plans"], [data-churvox-safe-plans="true"]')) return;

  const link = buildPlansLink();
  const links = Array.from(nav.querySelectorAll('a'));
  const money = links.find((a) => /money/i.test(a.textContent || ''));
  const quotes = links.find((a) => /quotes/i.test(a.textContent || ''));
  const tools = links.find((a) => /tools/i.test(a.textContent || ''));

  if (money && money.parentNode === nav) money.insertAdjacentElement('afterend', link);
  else if (quotes && quotes.parentNode === nav) quotes.insertAdjacentElement('beforebegin', link);
  else if (tools && tools.parentNode === nav) tools.insertAdjacentElement('beforebegin', link);
  else nav.appendChild(link);
}

function addPlansOnce() {
  document.querySelectorAll('.xcf10-dock, .xcf-bottom-nav').forEach(addPlansToNav);
}

function startPlansRetry() {
  addPlansOnce();
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    addPlansOnce();
    if (attempts >= 40) window.clearInterval(timer);
  }, 350);
}

function hookHistoryNav() {
  if (window.__churvoxPlansNavHistoryHooked) return;
  window.__churvoxPlansNavHistoryHooked = true;

  ['pushState', 'replaceState'].forEach((method) => {
    const original = window.history && window.history[method];
    if (typeof original !== 'function') return;
    window.history[method] = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      window.setTimeout(startPlansRetry, 50);
      return result;
    };
  });

  window.addEventListener('popstate', () => window.setTimeout(startPlansRetry, 50));
  window.addEventListener('click', () => window.setTimeout(addPlansOnce, 80), true);
}

if (typeof window !== 'undefined') {
  hookHistoryNav();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPlansRetry, { once: true });
  } else {
    startPlansRetry();
  }
  window.addEventListener('load', startPlansRetry, { once: true });
}
