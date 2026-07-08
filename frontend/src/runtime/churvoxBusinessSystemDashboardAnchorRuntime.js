const ANCHOR_ID = 'churvox-business-system-dashboard-anchor';
const STYLE_ID = 'churvox-business-system-dashboard-anchor-style';

function removeAnchor() {
  document.getElementById(ANCHOR_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  removeAnchor();
  window.addEventListener('load', removeAnchor);
  window.addEventListener('hashchange', removeAnchor);
  window.addEventListener('popstate', removeAnchor);
  window.addEventListener('churvox-owner-app-ready', removeAnchor);
  window.addEventListener('churvox:data-refresh', removeAnchor);
}

export {};
