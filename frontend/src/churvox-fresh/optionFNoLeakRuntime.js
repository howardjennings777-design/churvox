const MAIN_STORE = 'churvox_option_f_working_actions_v1';
const STYLE_ID = 'option-f-no-leak-style';

function loadMain() {
  try { return JSON.parse(localStorage.getItem(MAIN_STORE) || '{}'); } catch (_) { return {}; }
}

function titleOf(record) {
  return String(record?.title || record?.['Job name'] || record?.number || record?.Invoice || record?.subject || record?.name || record?.Worker || record?.worker || record?.Quote || '').trim();
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ofNoLeakHidden{display:none!important}
    .ofNoLeakHeldNote{grid-column:1/-1;display:grid;gap:5px;margin:6px 0 0;padding:10px 12px;border:1px solid rgba(234,88,12,.18);border-radius:12px;background:#fff7ed;color:#9a3412;font:900 12px/1.35 Inter,system-ui,sans-serif}
    .ofNoLeakHeldNote small{color:#52605a;font-weight:850}
  `;
  document.head.appendChild(style);
}

function blockedRecords() {
  const state = loadMain();
  const blocked = [];
  ['jobs', 'clients', 'quotes', 'invoices', 'messages', 'workers'].forEach((type) => {
    (state[type] || []).forEach((record) => {
      if (record?._blockedByCommand || record?._doNotShowToday || record?._commandMissing) blocked.push({ type, title: titleOf(record), missing: record._commandMissing || 'needs Command check' });
    });
  });
  return blocked.filter((item) => item.title);
}

function page() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash) return hash;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? active.textContent.trim().toLowerCase() : '';
}

function applyNoLeak() {
  ensureStyle();
  const blocked = blockedRecords();
  const blockedTitles = blocked.map((item) => item.title);
  document.querySelectorAll('.ofNoLeakHidden').forEach((node) => node.classList.remove('ofNoLeakHidden'));
  document.querySelectorAll('.ofNoLeakHeldNote').forEach((node) => node.remove());

  if (!blockedTitles.length) return;

  document.querySelectorAll('.cocRow,.jobCard,.workCard,.ledgerRow,.workerCard').forEach((node) => {
    const text = node.textContent || '';
    const hit = blocked.find((item) => text.includes(item.title));
    if (hit && (page() === 'today' || node.hasAttribute('data-created-runtime'))) node.classList.add('ofNoLeakHidden');
  });

  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root || page() === 'command') return;
  const shown = blocked.slice(0, 3).map((item) => `${item.title}: ${item.missing}`).join(' | ');
  root.insertAdjacentHTML('beforeend', `<section class="ofNoLeakHeldNote"><b>${blocked.length} record${blocked.length === 1 ? '' : 's'} held for Command</b><small>${shown}</small></section>`);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(applyNoLeak, 900));
  window.addEventListener('hashchange', () => setTimeout(applyNoLeak, 140));
  window.addEventListener('popstate', () => setTimeout(applyNoLeak, 140));
  document.addEventListener('click', () => setTimeout(applyNoLeak, 180));
  setInterval(applyNoLeak, 1700);
}
