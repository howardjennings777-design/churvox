function isSettingsPage() {
  const hash = String(window.location.hash || '').replace('#', '').toLowerCase();
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return hash === 'settings' || /settings/i.test(active?.textContent || '');
}

function panelCount(page) {
  return page ? page.querySelectorAll('.cocPanel').length : 0;
}

function row(title, meta, tone = 'blue') {
  return `<button type="button" class="cocRow ${tone} churvoxSettingsRestoreRow"><i></i><span><b>${title}</b><small>${meta}</small></span></button>`;
}

function ensureSettingsPanels() {
  if (!isSettingsPage()) {
    document.querySelectorAll('.churvoxSettingsRestorePanel').forEach((node) => node.remove());
    return;
  }

  const page = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!page) return;
  if (page.querySelector('.churvoxSettingsRestorePanel')) return;
  if (panelCount(page) >= 3) return;

  page.insertAdjacentHTML('beforeend', `<section class="cocPanel amber churvoxSettingsRestorePanel"><h2>Setup Checklist</h2>
    ${row('Business details', 'Name, logo, email, GST and country stay tidy', 'amber')}
    ${row('Worker app rules', 'Keep field access simple and role based', 'amber')}
    ${row('Exports and backups', 'CSV defaults and data export controls stay visible', 'amber')}
  </section>`);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(ensureSettingsPanels, 120));
  window.addEventListener('hashchange', () => setTimeout(ensureSettingsPanels, 120));
  window.addEventListener('popstate', () => setTimeout(ensureSettingsPanels, 120));
  document.addEventListener('click', () => setTimeout(ensureSettingsPanels, 180), true);
  setInterval(ensureSettingsPanels, 900);
}

export {};
