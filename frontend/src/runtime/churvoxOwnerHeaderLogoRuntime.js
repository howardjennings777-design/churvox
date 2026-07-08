import './churvoxDecisionSlipRuntime';

// Proper Churvox owner-app logo integration.
// This replaces the old CV tile with a real inline mark, tight sizing and header fit.

const STYLE_ID = 'churvox-owner-header-logo-style';

const markSvg = `
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" class="cvxIntegratedMarkSvg">
    <defs>
      <linearGradient id="cvxMarkShell" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
        <stop stop-color="#17211c" />
        <stop offset="0.55" stop-color="#0b100e" />
        <stop offset="1" stop-color="#050606" />
      </linearGradient>
      <linearGradient id="cvxMarkHeat" x1="14" y1="10" x2="52" y2="56" gradientUnits="userSpaceOnUse">
        <stop stop-color="#ffc06f" />
        <stop offset="0.42" stop-color="#f97316" />
        <stop offset="1" stop-color="#de4519" />
      </linearGradient>
      <linearGradient id="cvxMarkSteel" x1="20" y1="21" x2="47" y2="44" gradientUnits="userSpaceOnUse">
        <stop stop-color="#ffffff" />
        <stop offset="1" stop-color="#d7dee8" />
      </linearGradient>
      <filter id="cvxMarkLift" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="8" stdDeviation="5" flood-color="#000000" flood-opacity="0.35" />
      </filter>
    </defs>
    <rect x="5" y="5" width="54" height="54" rx="17" fill="url(#cvxMarkShell)" />
    <path d="M14 18h36M14 46h36" stroke="#ffffff" stroke-opacity="0.06" stroke-width="5" stroke-linecap="round" />
    <path d="M50 11c6 13 4 29-4 40-9 11-22 16-37 13" fill="none" stroke="#f97316" stroke-opacity="0.13" stroke-width="11" stroke-linecap="round" />
    <g filter="url(#cvxMarkLift)">
      <path d="M44.2 19.7C40.9 15.9 36.1 14 30.9 14 21.2 14 13.4 21.8 13.4 31.6S21.2 49.2 31 49.2c6.1 0 11.4-3 14.7-7.7" fill="none" stroke="url(#cvxMarkHeat)" stroke-width="8.5" stroke-linecap="round" />
      <path d="M22.5 33.4l7 6.8 14.7-17" fill="none" stroke="url(#cvxMarkSteel)" stroke-width="6.8" stroke-linecap="round" stroke-linejoin="round" />
    </g>
    <circle cx="47.5" cy="19" r="4.4" fill="#f97316" />
    <circle cx="47.5" cy="19" r="1.7" fill="#111827" />
  </svg>
`;

const css = `
  .cvxProduct .cvxTop {
    grid-template-columns: minmax(230px, 285px) minmax(0, 1fr) minmax(150px, 240px) !important;
    min-height: 76px !important;
    align-items: center !important;
  }

  .cvxProduct .cvxBrand {
    position: relative !important;
    display: grid !important;
    grid-template-columns: 50px minmax(0, 1fr) !important;
    align-items: center !important;
    gap: 11px !important;
    min-width: 0 !important;
    padding: 6px 9px 6px 6px !important;
    border-radius: 22px !important;
    background: linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.025)) !important;
    border: 1px solid rgba(255,255,255,.10) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 12px 30px rgba(0,0,0,.12) !important;
  }

  .cvxProduct .cvxBrand:hover {
    transform: translateY(-1px) !important;
    border-color: rgba(249,115,22,.34) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.12), 0 16px 34px rgba(0,0,0,.16) !important;
  }

  .cvxProduct .cvxBrand span:first-child,
  .cvxProduct .cvxBrand i:first-child,
  .cvxProduct .cvxBrand .cvxIntegratedLogoMark {
    width: 50px !important;
    height: 50px !important;
    min-width: 50px !important;
    display: grid !important;
    place-items: center !important;
    border-radius: 18px !important;
    color: transparent !important;
    background: transparent !important;
    box-shadow: none !important;
    overflow: visible !important;
    letter-spacing: 0 !important;
    font-size: 0 !important;
  }

  .cvxProduct .cvxBrand .cvxIntegratedMarkSvg,
  .cvxProduct .cvxBrand span:first-child svg,
  .cvxProduct .cvxBrand i:first-child svg {
    width: 50px !important;
    height: 50px !important;
    display: block !important;
    filter: drop-shadow(0 12px 22px rgba(0,0,0,.28)) !important;
  }

  .cvxProduct .cvxBrand b {
    min-width: 0 !important;
    display: grid !important;
    gap: 4px !important;
    color: #fff !important;
    font-size: 21px !important;
    line-height: .9 !important;
    font-weight: 1000 !important;
    letter-spacing: -.06em !important;
    text-shadow: 0 1px 18px rgba(0,0,0,.24) !important;
  }

  .cvxProduct .cvxBrand small {
    color: #ffb879 !important;
    font-size: 8.5px !important;
    line-height: 1 !important;
    font-weight: 1000 !important;
    letter-spacing: .12em !important;
    text-transform: uppercase !important;
    white-space: nowrap !important;
  }

  .cvxProduct .cvxTopTitle { min-width: 0 !important; }
  .cvxProduct .cvxTopTitle h1 { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
  .cvxProduct .cvxTopTitle p { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }

  @media (max-width: 980px) {
    .cvxProduct .cvxTop {
      grid-template-columns: minmax(210px, 255px) minmax(0, 1fr) !important;
    }
    .cvxProduct .cvxBusiness { display: none !important; }
  }

  @media (max-width: 650px) {
    .cvxProduct .cvxTop {
      grid-template-columns: minmax(0, 1fr) !important;
      min-height: auto !important;
      gap: 8px !important;
    }
    .cvxProduct .cvxBrand {
      grid-template-columns: 46px minmax(0, 1fr) !important;
      width: 100% !important;
      max-width: 100% !important;
    }
    .cvxProduct .cvxBrand span:first-child,
    .cvxProduct .cvxBrand i:first-child,
    .cvxProduct .cvxBrand .cvxIntegratedLogoMark,
    .cvxProduct .cvxBrand .cvxIntegratedMarkSvg,
    .cvxProduct .cvxBrand span:first-child svg,
    .cvxProduct .cvxBrand i:first-child svg {
      width: 46px !important;
      height: 46px !important;
      min-width: 46px !important;
    }
    .cvxProduct .cvxBrand b { font-size: 20px !important; }
    .cvxProduct .cvxTopTitle p { white-space: normal !important; display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; }
  }
`;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
  if (style.parentNode === document.head && document.head.lastElementChild !== style) document.head.appendChild(style);
}

function replaceMark() {
  const brands = document.querySelectorAll('.cvxProduct .cvxBrand');
  brands.forEach((brand) => {
    const first = brand.querySelector('span:first-child, i:first-child, .cvxIntegratedLogoMark');
    if (!first || first.dataset.cvxLogoMark === 'integrated') return;
    first.classList.add('cvxIntegratedLogoMark');
    first.innerHTML = markSvg;
    first.dataset.cvxLogoMark = 'integrated';
    first.setAttribute('aria-hidden', 'true');
  });
}

function run() {
  ensureStyle();
  replaceMark();
}

if (typeof window !== 'undefined' && !window.__CHURVOX_OWNER_HEADER_LOGO_RUNTIME__) {
  window.__CHURVOX_OWNER_HEADER_LOGO_RUNTIME__ = true;
  run();
  window.addEventListener('load', () => setTimeout(run, 80));
  window.addEventListener('hashchange', () => setTimeout(run, 80));
  window.addEventListener('popstate', () => setTimeout(run, 80));
  window.addEventListener('resize', () => setTimeout(run, 40));
  window.addEventListener('churvox-owner-app-ready', () => setTimeout(run, 80));
  window.addEventListener('churvox:data-refresh', () => setTimeout(run, 80));
  setTimeout(run, 120);
  setTimeout(run, 500);
  setTimeout(run, 1200);
  setInterval(run, 1600);
}

export {};
