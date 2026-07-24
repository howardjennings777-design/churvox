const LEGACY_HOST = 'grassley-frontend.onrender.com';
const CANONICAL_HOST = 'www.churvox.com';

export function exitLegacyRenderHost() {
  if (typeof window === 'undefined') return false;
  if (window.location.hostname !== LEGACY_HOST) return false;

  const target = new URL(window.location.href);
  target.protocol = 'https:';
  target.host = CANONICAL_HOST;
  target.searchParams.set('fromLegacyRender', '1');
  window.location.replace(target.toString());
  return true;
}

exitLegacyRenderHost();
