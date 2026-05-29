// CHURVOX_SAFE_PLANS_NAV_20260530
// Adds a small Plans tab to Command nav without MutationObserver or route event loops.

function addPlansOnce() {
  const navs = document.querySelectorAll('.xcf10-dock, .xcf-bottom-nav');

  navs.forEach((nav) => {
    if (nav.querySelector('[data-churvox-safe-plans="true"]')) return;

    const existing = Array.from(nav.querySelectorAll('a')).find((a) => {
      const text = String(a.textContent || '').trim().toLowerCase();
      return text === 'plans' || a.getAttribute('href') === '/plans';
    });

    if (existing) {
      existing.textContent = 'Plans';
      existing.setAttribute('href', '/plans');
      existing.setAttribute('data-churvox-safe-plans', 'true');
      return;
    }

    const link = document.createElement('a');
    link.href = '/plans';
    link.textContent = 'Plans';
    link.setAttribute('data-churvox-safe-plans', 'true');

    const money = Array.from(nav.querySelectorAll('a')).find((a) => /money/i.test(a.textContent || ''));
    if (money && money.parentNode === nav) money.insertAdjacentElement('afterend', link);
    else nav.appendChild(link);
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(addPlansOnce, 100);
    setTimeout(addPlansOnce, 750);
  });
}
