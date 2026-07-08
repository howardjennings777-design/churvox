const STYLE_ID = 'churvox-record-sheet-polish-style';
const FLAG = '__CHURVOX_RECORD_SHEET_POLISH_RUNTIME__';

const css = `
  .cv3Drawer:not(.approval),
  .cvxDrawer:not(.approval),
  [role="dialog"] .cv3Drawer:not(.approval) {
    background: #fbf7ef !important;
  }
  .cv3Drawer:not(.approval) > small,
  .cvxDrawer:not(.approval) > small {
    color: #a84b14 !important;
    font-size: 9.5px !important;
    letter-spacing: .14em !important;
    font-weight: 900 !important;
    margin-bottom: 5px !important;
  }
  .cv3Drawer:not(.approval) > h2,
  .cvxDrawer:not(.approval) > h2 {
    max-width: 760px !important;
    margin: 0 !important;
    color: #101513 !important;
    font-size: clamp(24px, 2.25vw, 34px) !important;
    line-height: 1 !important;
    letter-spacing: -.055em !important;
    font-weight: 720 !important;
    text-wrap: balance !important;
    overflow-wrap: anywhere !important;
  }
  .cv3Drawer:not(.approval) > p,
  .cvxDrawer:not(.approval) > p {
    max-width: 760px !important;
    margin: 7px 0 12px !important;
    color: #4d5953 !important;
    font-size: 12.5px !important;
    line-height: 1.35 !important;
    font-weight: 600 !important;
  }
  .cv3Drawer:not(.approval) .cv3Form,
  .cvxDrawer:not(.approval) .cv3Form {
    position: relative !important;
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 11px !important;
    padding: 14px !important;
    border-radius: 26px !important;
    border: 1px solid rgba(16,21,19,.09) !important;
    background:
      radial-gradient(circle at 100% 0%, rgba(243,107,33,.10), transparent 34%),
      linear-gradient(135deg, rgba(255,255,255,.9), rgba(255,249,241,.72)) !important;
    box-shadow: 0 14px 32px rgba(37,28,17,.055), inset 0 1px 0 rgba(255,255,255,.7) !important;
    overflow: hidden !important;
  }
  .cv3Drawer:not(.approval) .cv3Form::after,
  .cvxDrawer:not(.approval) .cv3Form::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: .32;
    background: repeating-linear-gradient(135deg, rgba(16,21,19,.028) 0 1px, transparent 1px 18px);
    mask-image: linear-gradient(90deg, transparent 0%, #000 42%, #000 100%);
  }
  .cv3Drawer:not(.approval) .cv3Form > *,
  .cvxDrawer:not(.approval) .cv3Form > * {
    position: relative;
    z-index: 1;
  }
  .cv3Drawer:not(.approval) .cv3Field,
  .cvxDrawer:not(.approval) .cv3Field {
    margin: 0 !important;
  }
  .cv3Drawer:not(.approval) .cv3Field span,
  .cvxDrawer:not(.approval) .cv3Field span {
    color: #6e4a32 !important;
    font-size: 9.5px !important;
    letter-spacing: .12em !important;
    font-weight: 900 !important;
    text-transform: uppercase !important;
  }
  .cv3Drawer:not(.approval) .cv3Field input,
  .cv3Drawer:not(.approval) .cv3Field textarea,
  .cv3Drawer:not(.approval) .cv3Field select,
  .cvxDrawer:not(.approval) .cv3Field input,
  .cvxDrawer:not(.approval) .cv3Field textarea,
  .cvxDrawer:not(.approval) .cv3Field select {
    min-height: 45px !important;
    border-radius: 15px !important;
    background: rgba(255,255,255,.74) !important;
    border-color: rgba(16,21,19,.1) !important;
    color: #101513 !important;
    font-size: 13px !important;
    font-weight: 650 !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.7) !important;
  }
  .cv3Drawer:not(.approval) .cv3Field textarea,
  .cvxDrawer:not(.approval) .cv3Field textarea {
    min-height: 78px !important;
  }
  .cv3Drawer:not(.approval) .cv3Field.wide,
  .cv3Drawer:not(.approval) label:has(textarea),
  .cvxDrawer:not(.approval) .cv3Field.wide,
  .cvxDrawer:not(.approval) label:has(textarea) {
    grid-column: 1 / -1 !important;
  }
  .cv3Drawer:not(.approval) .cv3DrawerActions,
  .cvxDrawer:not(.approval) .cv3DrawerActions {
    position: sticky !important;
    bottom: 0 !important;
    z-index: 8 !important;
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 7px !important;
    margin-top: 8px !important;
    padding: 12px 0 2px !important;
    background: linear-gradient(180deg, transparent, #fbf7ef 38%) !important;
  }
  .cv3Drawer:not(.approval) .cv3DrawerActions button,
  .cvxDrawer:not(.approval) .cv3DrawerActions button,
  .cv3Drawer:not(.approval) .cvxDrawerExtraActions button,
  .cvxDrawer:not(.approval) .cvxDrawerExtraActions button {
    min-height: 38px !important;
    padding: 9px 13px !important;
    border-radius: 999px !important;
    font-size: 12px !important;
    font-weight: 900 !important;
  }
  .cv3Drawer:not(.approval) .cvxDrawerExtraActions,
  .cvxDrawer:not(.approval) .cvxDrawerExtraActions {
    display: flex !important;
    justify-content: flex-end !important;
    align-items: center !important;
    gap: 7px !important;
    margin-top: 5px !important;
    padding-top: 0 !important;
    border-top: 0 !important;
  }
  .cv3Drawer:not(.approval) .cvxDrawerExtraActions span,
  .cvxDrawer:not(.approval) .cvxDrawerExtraActions span {
    display: none !important;
  }
  .cv3Drawer:not(.approval) .cvxDeleteRecord,
  .cvxDrawer:not(.approval) .cvxDeleteRecord {
    order: -1 !important;
  }
  @media(max-width: 760px) {
    .cv3Drawer:not(.approval) > h2,
    .cvxDrawer:not(.approval) > h2 { font-size: 28px !important; }
    .cv3Drawer:not(.approval) .cv3Form,
    .cvxDrawer:not(.approval) .cv3Form { grid-template-columns: 1fr !important; }
  }
`;

function isOwnerApp() {
  const path = window.location.pathname || '';
  return path === '/dashboard' || path.startsWith('/dashboard') || path === '/plans' || path === '/guide' || path === '/setup' || path === '/setup-guide';
}
function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
  if (style.parentNode === document.head && document.head.lastElementChild !== style) document.head.appendChild(style);
}
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function compressTitle(drawer) {
  const title = drawer.querySelector(':scope > h2');
  if (!title) return;
  const text = clean(title.textContent);
  if (text.length > 58) title.style.maxWidth = '660px';
}
function groupPills(drawer) {
  const actions = drawer.querySelector('.cv3DrawerActions');
  const extra = drawer.querySelector('.cvxDrawerExtraActions');
  if (!actions || !extra || extra.dataset.cvxPillsMoved === 'true') return;
  const buttons = Array.from(extra.querySelectorAll('button'));
  buttons.forEach((button) => actions.insertBefore(button, actions.firstChild));
  extra.dataset.cvxPillsMoved = 'true';
}
function run() {
  if (!isOwnerApp()) return;
  ensureStyle();
  document.querySelectorAll('.cv3Drawer,.cvxDrawer').forEach((drawer) => {
    compressTitle(drawer);
    groupPills(drawer);
  });
}
function schedule(delay = 80) { setTimeout(run, delay); }
if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  [80, 220, 600, 1200, 2500, 5200].forEach(schedule);
  window.addEventListener('load', () => schedule(160));
  window.addEventListener('hashchange', () => schedule(160));
  window.addEventListener('popstate', () => schedule(160));
  window.addEventListener('churvox:data-refresh', () => schedule(160));
  window.addEventListener('churvox-owner-app-ready', () => schedule(160));
  document.addEventListener('click', () => [90, 300].forEach(schedule), true);
  const observer = new MutationObserver(() => schedule(90));
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
export {};
