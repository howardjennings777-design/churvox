// Owner header logo + fit polish.
// Replaces the orange placeholder block with a proper Churvox mark and keeps the header tidy.

const STYLE_ID = 'churvox-owner-header-logo-style';

const markSvg = `
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="cvxOwnerMarkGradient" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stop-color="#ff7a2a" />
        <stop offset="1" stop-color="#e5441f" />
      </linearGradient>
    </defs>
    <rect x="7" y="7" width="50" height="50" rx="15" fill="#101411" />
    <path d="M43.5 21.5c-3-3.1-6.9-4.9-11.3-4.9-8.6 0-15.4 6.8-15.4 15.4s6.8 15.4 15.4 15.4c4.4 0 8.3-1.8 11.3-4.9l-6.2-6.1c-1.3 1.2-3 1.9-5 1.9-3.6 0-6.3-2.7-6.3-6.3s2.7-6.3 6.3-6.3c2 0 3.7.7 5 1.9l6.2-6.1Z" fill="url(#cvxOwnerMarkGradient)" />
    <path d="M18 32h17.5" stroke="#fff4ea" stroke-width="5" stroke-linecap="round" />
    <path d="M38.5 32h7.5" stroke="#ff7a2a" stroke-width="5" stroke-linecap="round" />
  </svg>
`;

const css = `
  .cvxProduct[data-product-version="v2"] .cvxTop {
    grid-template-columns: minmax(180px, 235px) minmax(0, 1fr) minmax(84px, 130px) !important;
    align-items: center !important;
    gap: 12px !important;
    padding: 9px clamp(12px, 1.6vw, 22px) !important;
    min-height: 58px !important;
    overflow: hidden !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxBrand {
    display: grid !important;
    grid-template-columns: 42px minmax(0, 1fr) !important;
    align-items: center !important;
    gap: 9px !important;
    min-width: 0 !important;
    max-width: 100% !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxBrand i {
    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;
    display: grid !important;
    place-items: center !important;
    border-radius: 14px !important;
    background: transparent !important;
    box-shadow: 0 12px 28px rgba(10, 14, 12, .25) !important;
    overflow: hidden !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxBrand i svg {
    width: 42px !important;
    height: 42px !important;
    display: block !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxBrand b {
    font-size: 16px !important;
    line-height: .96 !important;
    letter-spacing: -.035em !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxBrand small {
    margin-top: 2px !important;
    font-size: 8.5px !important;
    line-height: 1 !important;
    letter-spacing: .09em !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxTitle {
    min-width: 0 !important;
    max-width: 100% !important;
    overflow: hidden !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxTitle h1 {
    font-size: clamp(19px, 1.75vw, 24px) !important;
    line-height: 1 !important;
    margin: 0 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxTitle p {
    margin-top: 4px !important;
    font-size: clamp(10px, .92vw, 12px) !important;
    line-height: 1.2 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxAccount {
    min-width: 0 !important;
    max-width: 130px !important;
    overflow: hidden !important;
    justify-self: end !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxNav {
    display: flex !important;
    gap: 5px !important;
    padding: 6px clamp(10px, 1.5vw, 20px) !important;
    max-width: 100vw !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    scrollbar-width: thin !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxNav button {
    flex: 0 0 auto !important;
    min-height: 32px !important;
    padding: 7px 10px !important;
    border-radius: 999px !important;
    font-size: 11px !important;
    white-space: nowrap !important;
  }

  @media (max-width: 920px) {
    .cvxProduct[data-product-version="v2"] .cvxTop {
      grid-template-columns: minmax(164px, 210px) minmax(0, 1fr) !important;
    }
    .cvxProduct[data-product-version="v2"] .cvxAccount { display: none !important; }
  }

  @media (max-width: 640px) {
    .cvxProduct[data-product-version="v2"] .cvxTop {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 7px !important;
    }
    .cvxProduct[data-product-version="v2"] .cvxBrand { grid-template-columns: 38px minmax(0, 1fr) !important; }
    .cvxProduct[data-product-version="v2"] .cvxBrand i,
    .cvxProduct[data-product-version="v2"] .cvxBrand i svg { width: 38px !important; height: 38px !important; min-width: 38px !important; }
    .cvxProduct[data-product-version="v2"] .cvxTitle p { white-space: normal !important; display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; }
  }
`;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  } else if (style.textContent !== css) {
    style.textContent = css;
  }
  if (style.parentNode === document.head && document.head.lastElementChild !== style) document.head.appendChild(style);
}

function replaceMark() {
  const mark = document.querySelector('.cvxProduct[data-product-version="v2"] .cvxBrand i');
  if (!mark || mark.dataset.cvxLogoMark === 'done') return;
  mark.innerHTML = markSvg;
  mark.dataset.cvxLogoMark = 'done';
  mark.setAttribute('aria-hidden', 'true');
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
  setTimeout(run, 350);
  setTimeout(run, 1200);
  setInterval(run, 2500);
}

export {};