const STYLE_ID = 'option-f-today-schedule-guard-style';

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ofScheduleHeld{display:none!important}
    .ofScheduleNote{grid-column:1/-1;margin:8px 0 0;padding:10px 12px;border-radius:12px;background:#fff7ed;color:#9a3412;border:1px solid rgba(234,88,12,.18);font:900 12px/1.35 Inter,system-ui,sans-serif}
    .ofScheduleNote small{display:block;margin-top:3px;color:#52605a;font-weight:850}
  `;
  document.head.appendChild(style);
}

function page() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash) return hash;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? active.textContent.trim().toLowerCase() : '';
}

function validScheduledText(text) {
  const clean = String(text || '').trim();
  if (!clean || /undefined|null|invalid|no date|no time/i.test(clean)) return false;
  return /^\d{1,2}:\d{2}/.test(clean) || /^\d{1,2}(am|pm)\b/i.test(clean);
}

function guardToday() {
  ensureStyle();
  document.querySelectorAll('.ofScheduleNote').forEach((node) => node.remove());
  document.querySelectorAll('.ofScheduleHeld').forEach((node) => node.classList.remove('ofScheduleHeld'));
  if (page() !== 'today') return;

  const rows = [...document.querySelectorAll('.today .cocPanel h2')].find((heading) => /jobs today/i.test(heading.textContent || ''))?.closest('.cocPanel')?.querySelectorAll('.cocRow') || [];
  let held = 0;
  rows.forEach((row) => {
    const title = row.querySelector('b')?.textContent || row.textContent || '';
    if (!validScheduledText(title)) {
      row.classList.add('ofScheduleHeld');
      held += 1;
    }
  });
  if (held) {
    const root = document.querySelector('.today');
    root?.insertAdjacentHTML('beforeend', `<section class="ofScheduleNote"><b>${held} unscheduled job${held === 1 ? '' : 's'} held from Today</b><small>Jobs need date and time before they belong on Today. Fix details in Command.</small></section>`);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(guardToday, 1000));
  window.addEventListener('hashchange', () => setTimeout(guardToday, 150));
  document.addEventListener('click', () => setTimeout(guardToday, 200));
  setInterval(guardToday, 1900);
}
