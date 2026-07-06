// CHURVOX_REAL_PWA_ICON_AND_LAUNCH_20260707
// Keeps the installed-app icon and first-load splash aligned with the real PNG PWA system.

const STYLE_ID = 'churvox-launch-splash-style';
const NODE_ID = 'churvox-launch-splash';
const SESSION_KEY = 'churvox-launch-splash-seen-v2-real-pwa';
const ICON_VERSION = 'real-pwa-icon-20260707';

function isWorkerApp() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/worker');
}

function isOwnerApp() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '';
  return path === '/app' || path === '/dashboard' || path === '/plans' || path.startsWith('/dashboard');
}

function shouldShow() {
  if (typeof window === 'undefined') return false;
  if (isWorkerApp()) return true;
  if (isOwnerApp()) return !window.sessionStorage.getItem(SESSION_KEY);
  return false;
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
    node.setAttribute('data-cvx-runtime', 'real-pwa-icon');
  });
}

function ensureBranding() {
  if (typeof document === 'undefined' || !document.head) return;
  document.title = isWorkerApp()
    ? 'Churvox Worker App'
    : 'Churvox App - Owner Command';
  setMeta('theme-color', '#0b100e');
  setMeta('apple-mobile-web-app-title', isWorkerApp() ? 'Churvox Worker' : 'Churvox');
  setMeta('description', 'Churvox does the admin. You approve. Owner-approved job admin for service businesses.');
  upsertLinks('icon', `/app-icon-192.png?v=${ICON_VERSION}`, 'image/png', '192x192');
  upsertLinks('apple-touch-icon', `/apple-touch-icon.png?v=${ICON_VERSION}`, 'image/png', '180x180');
  upsertLinks('manifest', `/manifest.json?v=${ICON_VERSION}`);
}

function markSvg() {
  return `
    <svg viewBox="0 0 128 128" aria-hidden="true" class="cvxSplashMark">
      <defs>
        <linearGradient id="cvxRealSplashBg" x1="18" y1="10" x2="112" y2="118" gradientUnits="userSpaceOnUse">
          <stop stop-color="#161c18"/><stop offset="0.58" stop-color="#090d0b"/><stop offset="1" stop-color="#030404"/>
        </linearGradient>
        <linearGradient id="cvxRealSplashOrange" x1="21" y1="18" x2="105" y2="109" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ffad55"/><stop offset="0.5" stop-color="#f97316"/><stop offset="1" stop-color="#dc3f17"/>
        </linearGradient>
        <linearGradient id="cvxRealSplashWhite" x1="39" y1="43" x2="95" y2="86" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ffffff"/><stop offset="1" stop-color="#dce3ec"/>
        </linearGradient>
        <filter id="cvxRealSplashLift" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.36"/>
        </filter>
      </defs>
      <rect x="7" y="7" width="114" height="114" rx="29" fill="url(#cvxRealSplashBg)"/>
      <rect x="8.5" y="8.5" width="111" height="111" rx="27.5" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
      <g filter="url(#cvxRealSplashLift)">
        <path d="M92 38C85 27 73 21 60 21C37 21 18 40 18 64C18 88 37 107 60 107C75 107 87 100 95 89" fill="none" stroke="url(#cvxRealSplashOrange)" stroke-width="15" stroke-linecap="round"/>
        <path d="M39 66L56 82L92 43" fill="none" stroke="url(#cvxRealSplashWhite)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <circle cx="95" cy="38" r="6.5" fill="#f97316"/>
    </svg>`;
}

function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `
    #${NODE_ID}{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 25%,rgba(249,115,22,.30),transparent 30%),radial-gradient(circle at 20% 86%,rgba(249,115,22,.15),transparent 28%),linear-gradient(135deg,#050706 0%,#101511 58%,#1b0f07 100%);color:#fff;font-family:Inter,system-ui,sans-serif;overflow:hidden;transition:opacity .34s ease,visibility .34s ease;pointer-events:none!important}#${NODE_ID}.hide{opacity:0;visibility:hidden}#${NODE_ID}:before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 0 55%,rgba(249,115,22,.11) 76%,transparent 100%),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(180deg,rgba(255,255,255,.028) 1px,transparent 1px);background-size:auto,48px 48px,48px 48px}.cvxSplashCard{position:relative;z-index:1;width:min(420px,100%);min-height:min(650px,calc(100svh - 44px));display:grid;align-content:center;justify-items:center;gap:14px;border:1px solid rgba(255,255,255,.13);border-radius:44px;padding:34px 24px;text-align:center;background:radial-gradient(circle at 50% 24%,rgba(255,255,255,.08),transparent 32%),linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.025)),linear-gradient(180deg,#151a17,#050706 70%,#120905);box-shadow:0 34px 110px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.10);overflow:hidden}.cvxSplashCard:after{content:"";position:absolute;left:16%;right:16%;bottom:-3px;height:3px;border-radius:999px;background:linear-gradient(90deg,transparent,#f97316,transparent);box-shadow:0 0 34px rgba(249,115,22,.8)}.cvxSplashMark{width:132px;height:132px;display:block;margin-bottom:6px;border-radius:35px;filter:drop-shadow(0 24px 60px rgba(0,0,0,.40));animation:cvxSplashPop .72s cubic-bezier(.2,.9,.25,1.2)}.cvxSplashCard h1{margin:0;color:#fff;font-size:clamp(50px,13vw,72px);line-height:.88;font-weight:1000;letter-spacing:-.082em}.cvxSplashCard p{margin:0;color:rgba(255,255,255,.72);font-size:17px;line-height:1.35;font-weight:800}.cvxSplashCard p b{color:#f97316}.cvxSplashBar{width:min(220px,72%);height:7px;margin-top:30px;border-radius:999px;background:rgba(255,255,255,.10);overflow:hidden}.cvxSplashBar i{display:block;width:46%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#f97316,#ffad55);box-shadow:0 0 20px rgba(249,115,22,.65);animation:cvxSplashLoad 1.05s ease-in-out infinite alternate}.cvxSplashCard small{margin-top:4px;color:rgba(255,255,255,.48);font-size:10px;line-height:1;font-weight:1000;letter-spacing:.16em;text-transform:uppercase}@keyframes cvxSplashPop{from{transform:scale(.8) translateY(16px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}@keyframes cvxSplashLoad{to{transform:translateX(135%)}}
    @media (max-width:520px){#${NODE_ID}{padding:0}.cvxSplashCard{width:100%;min-height:100svh;border-radius:0;border-left:0;border-right:0}}
    @media (prefers-reduced-motion:reduce){.cvxSplashMark,.cvxSplashBar i{animation:none!important}}
  `;
}

function showSplash() {
  if (!shouldShow() || document.getElementById(NODE_ID)) return;
  ensureStyle();
  const node = document.createElement('div');
  node.id = NODE_ID;
  node.innerHTML = `<section class="cvxSplashCard">${markSvg()}<h1>Churvox</h1><p>Does the admin. <b>You approve.</b></p><span class="cvxSplashBar"><i></i></span><small>${isWorkerApp() ? 'Opening worker app' : 'Opening owner command floor'}</small></section>`;
  document.body.appendChild(node);
  window.sessionStorage.setItem(SESSION_KEY, '1');
  window.setTimeout(() => node.classList.add('hide'), isWorkerApp() ? 1050 : 1050);
  window.setTimeout(() => node.remove(), isWorkerApp() ? 1350 : 1350);
}

function bootLaunchBranding() {
  ensureBranding();
  showSplash();
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootLaunchBranding, { once: true });
  else bootLaunchBranding();
}

export {};
