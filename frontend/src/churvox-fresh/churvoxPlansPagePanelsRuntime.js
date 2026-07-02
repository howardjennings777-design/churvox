function isPlansPage() {
  const hash = String(window.location.hash || '').replace('#', '').toLowerCase();
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return hash === 'plans' || /plans/i.test(active?.textContent || '');
}

function panelCount(page) {
  return page ? page.querySelectorAll('.cocPanel').length : 0;
}

function row(title, meta, tone = 'blue') {
  return `<button type="button" class="cocRow ${tone} churvoxPlansRestoreRow"><i></i><span><b>${title}</b><small>${meta}</small></span></button>`;
}

function ensurePlansPanels() {
  if (!isPlansPage()) {
    document.querySelectorAll('.churvoxPlansRestorePanel').forEach((node) => node.remove());
    return;
  }

  const page = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!page) return;
  if (page.querySelector('.churvoxPlansRestorePanel')) return;
  if (panelCount(page) >= 3) return;

  page.insertAdjacentHTML('beforeend', `<section class="cocPanel blue churvoxPlansRestorePanel"><h2>Plan Rules</h2>
    ${row('14-day trial', 'No card needed during trial setup', 'blue')}
    ${row('Owner approval stays required', 'Command remains the approval desk', 'blue')}
    ${row('Accounting sync add-on', 'Draft sync only for non-Command tiers', 'blue')}
  </section>`);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(ensurePlansPanels, 120));
  window.addEventListener('hashchange', () => setTimeout(ensurePlansPanels, 120));
  window.addEventListener('popstate', () => setTimeout(ensurePlansPanels, 120));
  document.addEventListener('click', () => setTimeout(ensurePlansPanels, 180), true);
  setInterval(ensurePlansPanels, 900);
}

export {};
