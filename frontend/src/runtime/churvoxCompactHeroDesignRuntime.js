const STYLE_ID = 'churvox-compact-hero-design-style';
const FLAG = '__CHURVOX_COMPACT_HERO_DESIGN_RUNTIME__';

const PAGE_ACCENT = {
  today: 'rgba(243,107,33,.18)',
  command: 'rgba(16,21,19,.16)',
  jobs: 'rgba(37,99,235,.15)',
  clients: 'rgba(243,107,33,.16)',
  workers: 'rgba(37,99,235,.15)',
  messages: 'rgba(243,107,33,.16)',
  quotes: 'rgba(168,85,247,.14)',
  invoices: 'rgba(16,185,129,.15)',
  team: 'rgba(14,165,233,.14)',
  payroll: 'rgba(22,163,74,.15)',
  xero: 'rgba(22,163,74,.15)',
  settings: 'rgba(100,116,139,.15)',
  plans: 'rgba(245,158,11,.16)',
  support: 'rgba(244,63,94,.13)',
};

const css = `
  .cv3Product.cvxCompactHeroDesign .cv3Hero {
    position: relative !important;
    min-height: 126px !important;
    max-height: 148px !important;
    height: 136px !important;
    overflow: hidden !important;
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) minmax(430px, .76fr) !important;
    align-items: stretch !important;
    gap: 12px !important;
    border-radius: 28px !important;
    padding: 16px 18px !important;
    border: 1px solid rgba(16,21,19,.08) !important;
    background:
      radial-gradient(circle at 100% 0%, var(--cvx-page-accent, rgba(243,107,33,.16)), transparent 36%),
      radial-gradient(circle at 3% 100%, rgba(16,21,19,.06), transparent 34%),
      linear-gradient(135deg, rgba(255,255,255,.97), rgba(255,248,239,.86)) !important;
    box-shadow: 0 18px 42px rgba(37,28,17,.065), inset 0 1px 0 rgba(255,255,255,.72) !important;
  }
  .cv3Product.cvxCompactHeroDesign .cv3Hero::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: .72;
    background:
      linear-gradient(120deg, transparent 0 58%, rgba(255,255,255,.5) 58% 60%, transparent 60% 100%),
      repeating-linear-gradient(135deg, rgba(16,21,19,.035) 0 1px, transparent 1px 18px);
    mask-image: linear-gradient(90deg, transparent 0%, #000 34%, #000 100%);
  }
  .cv3Product.cvxCompactHeroDesign .cv3Hero::after {
    content: "CV";
    position: absolute;
    right: 24px;
    bottom: -18px;
    color: rgba(16,21,19,.035);
    font-size: 118px;
    line-height: .8;
    font-weight: 900;
    letter-spacing: -.12em;
    pointer-events: none;
  }
  .cv3Product.cvxCompactHeroDesign .cv3Hero > * {
    position: relative;
    z-index: 1;
  }
  .cv3Product.cvxCompactHeroDesign .cv3Hero > div:first-child {
    display: grid !important;
    align-content: center !important;
    min-width: 0 !important;
  }
  .cv3Product.cvxCompactHeroDesign .cv3Hero small {
    margin-bottom: 5px !important;
    font-size: 10px !important;
    letter-spacing: .18em !important;
  }
  .cv3Product.cvxCompactHeroDesign .cv3Hero h2 {
    max-width: 720px !important;
    margin: 0 !important;
    font-size: clamp(25px, 2.35vw, 38px) !important;
    line-height: .98 !important;
    letter-spacing: -.055em !important;
    font-weight: 760 !important;
    color: #101513 !important;
  }
  .cv3Product.cvxCompactHeroDesign .cv3Hero p {
    max-width: 760px !important;
    margin: 8px 0 0 !important;
    font-size: 12px !important;
    line-height: 1.32 !important;
    font-weight: 720 !important;
    color: #39443f !important;
  }
  .cv3Product.cvxCompactHeroDesign .cvxHeroMiddleIntent {
    max-width: 720px !important;
    margin-top: 9px !important;
    padding: 6px 9px !important;
    gap: 7px !important;
    border-radius: 999px !important;
    background: rgba(255,255,255,.58) !important;
  }
  .cv3Product.cvxCompactHeroDesign .cvxHeroMiddleIntent b,
  .cv3Product.cvxCompactHeroDesign .cvxHeroMiddleIntent span {
    font-size: 10.5px !important;
    line-height: 1.1 !important;
  }
  .cv3Product.cvxCompactHeroDesign .cv3HeroStats {
    height: 100% !important;
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 8px !important;
    align-self: stretch !important;
    overflow: hidden !important;
  }
  .cv3Product.cvxCompactHeroDesign .cv3HeroStats span {
    min-height: 0 !important;
    height: 100% !important;
    display: grid !important;
    align-content: center !important;
    justify-items: start !important;
    border-radius: 20px !important;
    padding: 12px !important;
    background: rgba(255,255,255,.66) !important;
    border: 1px solid rgba(16,21,19,.065) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.68) !important;
  }
  .cv3Product.cvxCompactHeroDesign .cv3HeroStats b {
    font-size: clamp(20px, 2.1vw, 31px) !important;
    line-height: .9 !important;
    font-weight: 800 !important;
    letter-spacing: -.045em !important;
  }
  .cv3Product.cvxCompactHeroDesign .cv3HeroStats small {
    margin-top: 7px !important;
    font-size: 9px !important;
    letter-spacing: .16em !important;
    color: #6a746f !important;
  }
  @media (max-width: 1100px) {
    .cv3Product.cvxCompactHeroDesign .cv3Hero {
      height: auto !important;
      max-height: none !important;
      min-height: 136px !important;
      grid-template-columns: 1fr !important;
    }
    .cv3Product.cvxCompactHeroDesign .cv3HeroStats {
      height: auto !important;
      grid-template-columns: repeat(4, minmax(100px, 1fr)) !important;
      overflow-x: auto !important;
    }
    .cv3Product.cvxCompactHeroDesign .cv3HeroStats span { min-height: 74px !important; }
  }
  @media (max-width: 720px) {
    .cv3Product.cvxCompactHeroDesign .cv3Hero {
      min-height: 0 !important;
      border-radius: 24px !important;
      padding: 15px !important;
    }
    .cv3Product.cvxCompactHeroDesign .cv3Hero h2 {
      font-size: 31px !important;
      line-height: 1 !important;
      font-weight: 760 !important;
    }
    .cv3Product.cvxCompactHeroDesign .cv3HeroStats {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
    .cv3Product.cvxCompactHeroDesign .cv3HeroStats span { min-height: 70px !important; }
    .cv3Product.cvxCompactHeroDesign .cvxHeroMiddleIntent { border-radius: 16px !important; }
  }
`;

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function pageId() {
  const path = window.location.pathname || '';
  if (!(path === '/dashboard' || path.startsWith('/dashboard') || path === '/plans')) return '';
  const active = lower(document.querySelector('.cv3Nav button.active b')?.textContent || document.querySelector('.cv3TopCopy h1')?.textContent || '');
  if (active === 'today') return 'today';
  if (active.includes('command')) return 'command';
  if (active.includes('job')) return 'jobs';
  if (active.includes('client')) return 'clients';
  if (active.includes('worker')) return 'workers';
  if (active.includes('message')) return 'messages';
  if (active.includes('quote')) return 'quotes';
  if (active.includes('invoice')) return 'invoices';
  if (active.includes('team')) return 'team';
  if (active.includes('payroll')) return 'payroll';
  if (active.includes('xero')) return 'xero';
  if (active.includes('setting')) return 'settings';
  if (active.includes('plan')) return 'plans';
  if (active.includes('help') || active.includes('support')) return 'support';
  return '';
}
function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}
function run() {
  const product = document.querySelector('.cv3Product');
  const hero = document.querySelector('.cv3Hero');
  const id = pageId();
  if (!product || !hero || !id) return;
  ensureStyle();
  product.classList.add('cvxCompactHeroDesign');
  hero.style.setProperty('--cvx-page-accent', PAGE_ACCENT[id] || PAGE_ACCENT.today);
}
function schedule(delay = 100) { setTimeout(run, delay); }
if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  [80, 260, 700, 1400, 2800, 5200].forEach(schedule);
  window.addEventListener('load', () => schedule(160));
  window.addEventListener('hashchange', () => [80, 260, 700].forEach(schedule));
  window.addEventListener('popstate', () => [80, 260, 700].forEach(schedule));
  window.addEventListener('churvox:data-refresh', () => [100, 500].forEach(schedule));
  window.addEventListener('churvox-owner-app-ready', () => [100, 500].forEach(schedule));
  document.addEventListener('click', () => schedule(140), true);
}
export {};
