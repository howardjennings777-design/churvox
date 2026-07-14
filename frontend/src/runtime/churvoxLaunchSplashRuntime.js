import './churvoxForbiddenExampleScrubRuntime';

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
  let node = document.querySelector(`link[rel="${rel}"]`);
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', rel);
    document.head.appendChild(node);
  }
  if (type) node.setAttribute('type', type);
  if (sizes) node.setAttribute('sizes', sizes);
  node.setAttribute('href', href);
  node.setAttribute('data-cvx-runtime', 'safe-brand-icon');
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
}

if (typeof window !== 'undefined' && !window.__CHURVOX_BRAND_META_SAFE__) {
  window.__CHURVOX_BRAND_META_SAFE__ = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureBranding, { once: true });
  else ensureBranding();
  window.addEventListener('load', ensureBranding, { once: true });
}

export {};
