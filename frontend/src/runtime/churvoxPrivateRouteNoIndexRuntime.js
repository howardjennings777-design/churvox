// Keeps authenticated, billing and tokenised customer URLs out of search indexes.

const PRIVATE_PREFIXES = [
  '/admin',
  '/platform',
  '/app-owner',
  '/owner/',
  '/dashboard',
  '/worker',
  '/billing',
  '/plans',
  '/setup',
  '/guide',
  '/q/',
  '/quote/',
  '/invoice/',
  '/client/',
  '/proof/',
  '/login',
  '/signin',
  '/sign-in',
  '/signup',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/invite/',
  '/delete-account',
  '/office-team-lab',
  '/office-lab',
  '/new-command-lab',
];

const INDEXABLE_PATHS = new Set([
  '/',
  '/product',
  '/features',
  '/pricing',
  '/demo',
  '/about',
  '/security',
  '/support',
  '/contact',
  '/legal/privacy',
  '/legal/terms',
  '/privacy',
  '/terms',
  '/refunds-cancellations',
]);

function normalizedPath() {
  const path = String(window.location.pathname || '/').replace(/\/+$/, '') || '/';
  return path;
}

function isPrivate(path) {
  if (path.startsWith('/industries/')) return false;
  if (INDEXABLE_PATHS.has(path)) return false;
  return PRIVATE_PREFIXES.some((prefix) => path === prefix.replace(/\/$/, '') || path.startsWith(prefix));
}

function meta(name) {
  let node = document.head.querySelector(`meta[name="${name}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute('name', name);
    document.head.appendChild(node);
  }
  return node;
}

function canonical() {
  let node = document.head.querySelector('link[rel="canonical"]');
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', 'canonical');
    document.head.appendChild(node);
  }
  return node;
}

function applySearchPolicy() {
  const path = normalizedPath();
  const privateRoute = isPrivate(path);
  meta('robots').setAttribute('content', privateRoute ? 'noindex, nofollow, noarchive, nosnippet' : 'index, follow, max-image-preview:large');
  meta('googlebot').setAttribute('content', privateRoute ? 'noindex, nofollow, noarchive, nosnippet' : 'index, follow, max-image-preview:large');

  const canonicalNode = canonical();
  if (privateRoute) {
    canonicalNode.removeAttribute('href');
  } else {
    canonicalNode.setAttribute('href', `${window.location.origin}${path}`);
  }
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PRIVATE_ROUTE_NOINDEX__) {
  window.__CHURVOX_PRIVATE_ROUTE_NOINDEX__ = true;
  applySearchPolicy();
  window.addEventListener('load', applySearchPolicy);
  window.addEventListener('popstate', () => setTimeout(applySearchPolicy, 0));
  window.addEventListener('hashchange', () => setTimeout(applySearchPolicy, 0));
  document.addEventListener('click', () => setTimeout(applySearchPolicy, 50), true);
}

export {};
