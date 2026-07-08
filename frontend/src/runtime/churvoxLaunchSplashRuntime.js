// CHURVOX_FIELD_MARK_AND_LAUNCH_20260708
// Keeps installed-app icon and first-load splash aligned with the Churvox Field mark.

const STYLE_ID = 'churvox-launch-splash-style';
const NODE_ID = 'churvox-launch-splash';
const SESSION_KEY = 'churvox-launch-splash-seen-v3-field-mark';
const ICON_VERSION = 'churvox-field-mark-20260708';

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
  if (isWorkerApp()) return false;
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
    node.setAttribute('data-cvx-runtime', 'field-mark-icon');
  });
}

function ensureBranding() {
  if (typeof document === 'undefined' || !document.head) return;
  document.title = isWorkerApp()
    ? 'Churvox Field'
    : 'Churvox App - Owner Command';
  setMeta('theme-color', '#07100c');
  setMeta('apple-mobile-web-app-title', isWorkerApp() ? 'Churvox Field' : 'Churvox');
  setMeta('description', 'Churvox does the admin. You approve. Owner-approved job admin for service businesses.');
  upsertLinks('icon', `/app-icon-192.png?v=${ICON_VERSION}`, 'image/png', '192x192');
  upsertLinks('apple-touch-icon', `/apple-touch-icon.png?v=${ICON_VERSION}`, 'image/png', '180x180');
  upsertLinks('manifest', `/manifest.json?v=${ICON_VERSION}`);
}

function markSvg() {
  return `
    <svg viewBox="0 0 128 128" aria-hidden="true" class="cvxSplashMark">
      <defs>
        <linearGradient id="cvxFieldBg" x1="15" y1="10" x2="116" y2="119" gradientUnits="userSpaceOnUse"><stop stop-color="#17211b"/><stop offset="0.5" stop-color="#0f172a"/><stop offset="1" stop-color="#050706"/></linearGradient>
        <linearGradient id="cvxFieldOrange" x1="22" y1="16" x2="108" y2="110" gradientUnits="userSpaceOnUse"><stop stop-color="#ffb35c"/><stop offset="0.45" stop-color="#f97316"/><stop offset="1" stop-color="#c2410c"/></linearGradient>
        <filter id="cvxFieldLift" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.36"/></filter>
      </defs>
      <rect x="7" y="7" width="114" height="114" rx="29" fill="url(#cvxFieldBg)"/>
      <rect x="8.5" y="8.5" width="111" height="111" rx="27.5" fill="none" stroke="#ffffff" stroke-opacity="0.09" stroke-width="2"/>
      <path d="M23 35C39 23 61 18 82 25C102 31 116 47 119 66" fill="none" stroke="url(#cvxFieldOrange)" stroke-width="5" stroke-linecap="round" opacity=".9"/>
      <path d="M112 96C94 110 68 113 47 103C30 95 19 79 16 62" fill="none" stroke="url(#cvxFieldOrange)" stroke-width="5" stroke-linecap="round" opacity=".62"/>
      <g filter="url(#cvxFieldLift)">
        <path d="M78 38H52C41 38 32 47 32 59V70C32 81 41 90 52 90H78" fill="none" stroke="#f8fafc" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M54 38L69 90" fill="none" stroke="#f8fafc" stroke-width="12" stroke-linecap="round"/>
        <path d="M69 90L99 38" fill="none" stroke="#f8fafc" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <path d="M52 38C41 38 32 47 32 59V70C32 81 41 90 52 90" fill="none" stroke="url(#cvxFieldOrange)" stroke-width="4" stroke-linecap="round" opacity=".98"/>
      <path d="M69 90L99 38" fill="none" stroke="url(#cvxFieldOrange)" stroke-width="4" stroke-linecap="round" opacity=".98"/>
    </svg>`;
}

function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `#${NODE_ID}{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 25%,rgba(249,115,22,.30),transparent 30%),linear-gradient(135deg,#050706 0%,#101511 58%,#1b0f07 100%);color:#fff;font-family:Inter,system-ui,sans-serif;overflow:hidden;transition:opacity .34s ease,visibility .34s ease;pointer-events:none!important}#${NODE_ID}.hide{opacity:0;visibility:hidden}.cvxSplashCard{position:relative;z-index:1;width:min(420px,100%);min-height:min(650px,calc(100svh - 44px));display:grid;align-content:center;justify-items:center;gap:14px;border:1px solid rgba(255,255,255,.13);border-radius:44px;padding:34px 24px;text-align:center;background:radial-gradient(circle at 50% 24%,rgba(255,255,255,.08),transparent 32%),linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.025)),linear-gradient(180deg,#151a17,#050706 70%,#120905);box-shadow:0 34px 110px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.10);overflow:hidden}.cvxSplashMark{width:132px;height:132px;display:block;margin-bottom:6px;border-radius:35px;filter:drop-shadow(0 24px 60px rgba(0,0,0,.40));animation:cvxSplashPop .72s cubic-bezier(.2,.9,.25,1.2)}.cvxSplashCard h1{margin:0;color:#fff;font-size:clamp(50px,13vw,72px);line-height:.88;font-weight:1000;letter-spacing:-.082em}.cvxSplashCard p{margin:0;color:rgba(255,255,255,.72);font-size:17px;line-height:1.35;font-weight:800}.cvxSplashCard p b{color:#f97316}.cvxSplashBar{width:min(220px,72%);height:7px;margin-top:30px;border-radius:999px;background:rgba(255,255,255,.10);overflow:hidden}.cvxSplashBar i{display:block;width:46%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#f97316,#ffad55);box-shadow:0 0 20px rgba(249,115,22,.65);animation:cvxSplashLoad 1.05s ease-in-out infinite alternate}.cvxSplashCard small{margin-top:4px;color:rgba(255,255,255,.48);font-size:10px;line-height:1;font-weight:1000;letter-spacing:.16em;text-transform:uppercase}@keyframes cvxSplashPop{from{transform:scale(.8) translateY(16px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}@keyframes cvxSplashLoad{to{transform:translateX(135%)}}@media (max-width:520px){#${NODE_ID}{padding:0}.cvxSplashCard{width:100%;min-height:100svh;border-radius:0;border-left:0;border-right:0}}@media (prefers-reduced-motion:reduce){.cvxSplashMark,.cvxSplashBar i{animation:none!important}}`;
}

function showSplash() {
  if (!shouldShow() || document.getElementById(NODE_ID)) return;
  ensureStyle();
  const node = document.createElement('div');
  node.id = NODE_ID;
  node.innerHTML = `<section class="cvxSplashCard">${markSvg()}<h1>Churvox</h1><p>Does the admin. <b>You approve.</b></p><span class="cvxSplashBar"><i></i></span><small>Opening owner command floor</small></section>`;
  document.body.appendChild(node);
  window.sessionStorage.setItem(SESSION_KEY, '1');
  window.setTimeout(() => node.classList.add('hide'), 1050);
  window.setTimeout(() => node.remove(), 1350);
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
