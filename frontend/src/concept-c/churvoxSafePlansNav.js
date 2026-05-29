// CHURVOX_RELIABLE_PLANS_NAV_20260530
// Adds a small Plans tab to Command nav without MutationObserver or route loops.
// Runs a short bounded retry because React may render nav after load.

function normalizeNavLabels(nav) {
  Array.from(nav.querySelectorAll('a')).forEach((link) => {
    const text = String(link.textContent || '').trim().toLowerCase();
    if (text === 'command floor') link.textContent = 'Command';
    if (text === 'client workbench') link.textContent = 'Clients';
    if (text === 'plan command') link.textContent = 'Plans';
    if (text === 'plans') {
      link.href = '/plans';
      link.setAttribute('data-churvox-safe-plans', 'true');
    }
  });
}

function addPlansToNav(nav) {
  if (!nav) return;
  normalizeNavLabels(nav);
  if (nav.querySelector('a[href="/plans"], [data-churvox-safe-plans="true"]')) return;

  const link = document.createElement('a');
  link.href = '/plans';
  link.textContent = 'Plans';
  link.setAttribute('data-churvox-safe-plans', 'true');

  const links = Array.from(nav.querySelectorAll('a'));
  const money = links.find((a) => /money/i.test(a.textContent || ''));
  const quotes = links.find((a) => /quotes/i.test(a.textContent || ''));

  if (money && money.parentNode === nav) money.insertAdjacentElement('afterend', link);
  else if (quotes && quotes.parentNode === nav) quotes.insertAdjacentElement('beforebegin', link);
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
    if (attempts >= 12) window.clearInterval(timer);
  }, 400);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPlansRetry, { once: true });
  } else {
    startPlansRetry();
  }
  window.addEventListener('load', startPlansRetry, { once: true });
}
