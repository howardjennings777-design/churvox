// CHURVOX_OPTION_F_HIDE_SEED_DEMO_RUNTIME_20260630
// Prevents seeded sample records from looking like live business data without re-render loops.

const STYLE_ID = 'option-f-hide-seed-demo-style';
const SEED_PATTERNS = [
  'Naenae lawn reset',
  'Petone unit cleanup',
  'Belmont hedge trim',
  'Wainui quote visit',
  'Birchville tidy',
  'Mere H.',
  'Belmont Villas',
  'Naenae Dairy',
  'Petone Units',
  'Wainui School',
  'Birchville Dairy',
  'Fence repair',
  'Grounds tidy',
  'Hedge package',
  'Friday request',
  'Extra green waste',
  'Alex clock-out',
];

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ofSeedDemoHidden{display:none!important}
    .ofLiveEmptyNote{display:grid;grid-column:1/-1;gap:4px;margin:8px 0;padding:10px 12px;border:1px solid rgba(16,21,19,.08);border-radius:12px;background:#f8faf9;color:#111815;font:900 12px/1.35 Inter,system-ui,sans-serif}
    .ofLiveEmptyNote small{color:#52605a;font-weight:850}
  `;
  document.head.appendChild(style);
}

function isSeedText(text) {
  const value = String(text || '');
  return SEED_PATTERNS.some((pattern) => value.includes(pattern));
}

function pageKey() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash) return hash;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active ? String(active.textContent || '').trim().toLowerCase() : 'today';
}

function setHidden(node, hidden) {
  if (!node) return;
  if (hidden && !node.classList.contains('ofSeedDemoHidden')) node.classList.add('ofSeedDemoHidden');
  if (!hidden && node.classList.contains('ofSeedDemoHidden')) node.classList.remove('ofSeedDemoHidden');
}

function ensureEmptyNote(panel, label) {
  if (!panel) return;
  const html = `<b>No live ${label} yet</b><small>Sample records are hidden so the owner only sees real business data.</small>`;
  let note = panel.querySelector(':scope > .ofLiveEmptyNote');
  if (!note) {
    note = document.createElement('div');
    note.className = 'ofLiveEmptyNote';
    panel.appendChild(note);
  }
  if (note.innerHTML !== html) note.innerHTML = html;
}

function removeEmptyNote(panel) {
  panel?.querySelector(':scope > .ofLiveEmptyNote')?.remove();
}

function setStatValue(stat, value) {
  const target = stat?.querySelector('b');
  if (target && target.textContent !== value) target.textContent = value;
}

function clearSeededStats(root) {
  const hiddenSeedCount = root.querySelectorAll('.ofSeedDemoHidden').length;
  if (!hiddenSeedCount) return;
  const liveSelectors = '.cocRow,.jobCard,.workerCard,.workCard,.ledgerRow,.bubble';
  const hasVisibleLiveRecords = Array.from(root.querySelectorAll(liveSelectors)).some((node) => !node.classList.contains('ofSeedDemoHidden'));
  if (hasVisibleLiveRecords) return;
  root.querySelectorAll('.miniStat').forEach((stat) => {
    const label = String(stat.querySelector('small')?.textContent || '').toLowerCase();
    if (/jobs|working|waiting|due|quotes|invoices|clients|team|workers/.test(label)) setStatValue(stat, /due/.test(label) ? '$0' : '0');
  });
  root.querySelectorAll('.money').forEach((node) => { if (node.textContent !== '$0') node.textContent = '$0'; });
}

function hideSeedRows() {
  ensureStyle();
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;

  const selectors = '.cocRow,.jobCard,.workerCard,.workCard,.ledgerRow,.chip,.bubble';
  root.querySelectorAll(selectors).forEach((node) => setHidden(node, isSeedText(node.textContent)));

  root.querySelectorAll('.cocPanel').forEach((panel) => {
    const records = Array.from(panel.querySelectorAll(selectors));
    const visibleRecords = records.filter((node) => !node.classList.contains('ofSeedDemoHidden'));
    const onlySeedRecords = records.length > 0 && visibleRecords.length === 0 && isSeedText(panel.textContent);
    if (onlySeedRecords) {
      const heading = panel.querySelector('h2')?.textContent || pageKey();
      ensureEmptyNote(panel, heading.toLowerCase());
    } else {
      removeEmptyNote(panel);
    }
  });

  clearSeededStats(root);

  if (pageKey() === 'command') {
    root.querySelectorAll('.cocPanel').forEach((panel) => {
      if (!isSeedText(panel.textContent)) return;
      const h2 = panel.querySelector('h2')?.textContent || '';
      if (/filled approval form|owner actions/i.test(h2)) {
        panel.querySelector('.formGrid')?.remove();
        const h3 = panel.querySelector('h3');
        const p = panel.querySelector('p');
        if (h3 && h3.textContent !== 'No live approvals waiting') h3.textContent = 'No live approvals waiting';
        const message = 'Real Command items will appear here when Churvox has prepared owner-approved work.';
        if (p && p.textContent !== message) p.textContent = message;
        panel.querySelectorAll('button').forEach((button) => {
          if (!button.disabled) button.disabled = true;
          if (!button.textContent) button.textContent = 'Waiting';
        });
      }
    });
  }
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  const run = () => {
    scheduled = false;
    hideSeedRows();
  };
  if (window.requestAnimationFrame) window.requestAnimationFrame(run);
  else setTimeout(run, 16);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_HIDE_SEED_DEMO__) {
  window.__CHURVOX_HIDE_SEED_DEMO__ = true;
  window.addEventListener('load', () => setTimeout(schedule, 500));
  window.addEventListener('hashchange', () => setTimeout(schedule, 120));
  window.addEventListener('popstate', () => setTimeout(schedule, 120));
  document.addEventListener('click', () => setTimeout(schedule, 160), true);
  document.addEventListener('input', schedule, true);
  document.addEventListener('change', schedule, true);
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => Array.from(mutation.addedNodes || []).some((node) => node.nodeType === 1 && !node.classList?.contains('ofLiveEmptyNote')))) schedule();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(schedule, 1500);
}

export {};