const LEGACY_HOSTS = new Set(['grassley-frontend.onrender.com', 'www.churvox.com', 'churvox.com']);
const SITES_ORIGIN = 'https://churvox.howardjennings77.chatgpt.site';

export function exitLegacyRenderHost() {
  if (typeof window === 'undefined') return false;
  if (!LEGACY_HOSTS.has(window.location.hostname)) return false;

  const target = new URL(window.location.pathname + window.location.search + window.location.hash, SITES_ORIGIN);
  target.searchParams.set('fromLegacyBuild', '1');
  window.location.replace(target.toString());
  return true;
}

exitLegacyRenderHost();
