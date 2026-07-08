// CHURVOX_BRAND_META_ONLY_20260708B
// Keeps installed-app icon/meta aligned without adding a second loading screen.

const ICON_VERSION = 'churvox-integrated-mark-20260708b';

function isWorkerApp() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/worker');
}

function setMeta(name, content) {
  let node = document.querySelector(`meta[name="${name}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute('name', name);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
}

function upsertLinks(rel, href, type, sizes) {
  const nodes = Array.from(document.querySelectorAll(`link[rel="${rel}"]`));
  if (!nodes.length) {
    const node = document.createElement('link');
    node.setAttribute('rel', rel);
    nodes.push(node);
    document.head.appendChild(node);
  }
  nodes.forEach((node) => {
    if (type) node.setAttribute('type', type);
    if (sizes) node.setAttribute('sizes', sizes);
    node.setAttribute('href', href);
    node.setAttribute('data-cvx-runtime', 'integrated-brand-icon');
  });
}

function removeOldSplashes() {
  ['#churvox-launch-splash', '#churvox-worker-pre-react-shell', '.churvoxLaunchSplash', '[data-churvox-splash]', '[data-churvox-worker-pre-react]'].forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => node.remove());
  });
}

function ensureBranding() {
  if (typeof document === 'undefined' || !document.head) return;
  document.title = isWorkerApp() ? 'Churvox Field' : 'Churvox';
  setMeta('theme-color', '#07100c');
  setMeta('apple-mobile-web-app-title', isWorkerApp() ? 'Churvox Field' : 'Churvox');
  setMeta('description', 'Churvox does the admin. You approve. Owner-approved job admin for service businesses.');
  upsertLinks('icon', `/app-icon-192.png?v=${ICON_VERSION}`, 'image/png', '192x192');
  upsertLinks('apple-touch-icon', `/apple-touch-icon.png?v=${ICON_VERSION}`, 'image/png', '180x180');
  upsertLinks('manifest', `/manifest.json?v=${ICON_VERSION}`);
  removeOldSplashes();
}

if (typeof window !== 'undefined' && !window.__CHURVOX_BRAND_META_ONLY__) {
  window.__CHURVOX_BRAND_META_ONLY__ = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureBranding, { once: true });
  else ensureBranding();
  window.addEventListener('load', ensureBranding);
  window.addEventListener('popstate', ensureBranding);
  window.addEventListener('hashchange', ensureBranding);
}

export {};
