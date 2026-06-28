// CHURVOX_LOGO_LAUNCH_SPLASH_20260629
// Shows a short branded launch screen for the worker app and first-load app shell.

const STYLE_ID = 'churvox-launch-splash-style';
const NODE_ID = 'churvox-launch-splash';
const SESSION_KEY = 'churvox-launch-splash-seen-v1';

function isWorkerApp() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/worker');
}

function shouldShow() {
  if (typeof window === 'undefined') return false;
  if (isWorkerApp()) return true;
  if (window.location.pathname === '/dashboard' || window.location.pathname === '/plans') {
    return !window.sessionStorage.getItem(SESSION_KEY);
  }
  return false;
}

function markSvg() {
  return `
    <svg viewBox="0 0 256 256" aria-hidden="true" class="cvxSplashMark">
      <defs>
        <linearGradient id="cvxSplashBg" x1="28" y1="18" x2="226" y2="236" gradientUnits="userSpaceOnUse"><stop stop-color="#252a31"/><stop offset=".55" stop-color="#111820"/><stop offset="1" stop-color="#05070b"/></linearGradient>
        <linearGradient id="cvxSplashOrange" x1="44" y1="44" x2="212" y2="214" gradientUnits="userSpaceOnUse"><stop stop-color="#ffbd72"/><stop offset=".42" stop-color="#ff7a22"/><stop offset="1" stop-color="#ef5b1d"/></linearGradient>
        <linearGradient id="cvxSplashWhite" x1="72" y1="88" x2="214" y2="160" gradientUnits="userSpaceOnUse"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#d9dee7"/></linearGradient>
      </defs>
      <rect x="12" y="12" width="232" height="232" rx="54" fill="url(#cvxSplashBg)"/>
      <rect x="16" y="16" width="224" height="224" rx="50" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="3"/>
      <path d="M190 63A82 82 0 0 0 71 66" fill="none" stroke="url(#cvxSplashOrange)" stroke-width="28" stroke-linecap="round"/>
      <path d="M64 181A82 82 0 0 0 195 181" fill="none" stroke="url(#cvxSplashOrange)" stroke-width="28" stroke-linecap="round"/>
      <path d="M43 105h50M33 132h59M53 159h52" fill="none" stroke="url(#cvxSplashOrange)" stroke-width="12" stroke-linecap="round"/>
      <path d="M73 137L112 122L145 151L207 92" fill="none" stroke="url(#cvxSplashWhite)" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="73" cy="137" r="14" fill="#f8fafc"/><circle cx="112" cy="122" r="13" fill="#f8fafc"/><circle cx="207" cy="92" r="13" fill="#f8fafc"/>
    </svg>`;
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${NODE_ID}{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 25%,rgba(255,122,34,.24),transparent 28%),linear-gradient(145deg,#05070b 0%,#111820 54%,#2c1209 100%);color:#fffaf3;font-family:Inter,system-ui,sans-serif;overflow:hidden;transition:opacity .34s ease,visibility .34s ease}#${NODE_ID}.hide{opacity:0;visibility:hidden}#${NODE_ID}:before{content:"";position:absolute;inset:-40%;background:conic-gradient(from 180deg,transparent,rgba(255,122,34,.18),transparent 34%);animation:cvxSplashSweep 2.8s linear infinite}#${NODE_ID}:after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:42px 42px;mask-image:radial-gradient(circle at 50% 45%,#000,transparent 72%)}.cvxSplashCard{position:relative;z-index:1;display:grid;justify-items:center;gap:16px;text-align:center}.cvxSplashMark{width:min(144px,38vw);height:auto;filter:drop-shadow(0 24px 44px rgba(0,0,0,.48));animation:cvxSplashPop .72s cubic-bezier(.2,.9,.25,1.2)}.cvxSplashCard h1{margin:0;font-size:clamp(34px,10vw,74px);line-height:.9;letter-spacing:-.08em;font-weight:1000}.cvxSplashCard p{margin:0;max-width:360px;color:#ffd7ba;font-size:13px;font-weight:900;line-height:1.45}.cvxSplashBar{width:min(260px,68vw);height:6px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}.cvxSplashBar i{display:block;width:42%;height:100%;border-radius:999px;background:linear-gradient(90deg,#ffbd72,#f06423);animation:cvxSplashLoad .92s ease-in-out infinite alternate}@keyframes cvxSplashSweep{to{transform:rotate(360deg)}}@keyframes cvxSplashPop{from{transform:scale(.8) translateY(16px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}@keyframes cvxSplashLoad{to{transform:translateX(142%)}}
    @media (prefers-reduced-motion: reduce){#${NODE_ID}:before,.cvxSplashMark,.cvxSplashBar i{animation:none!important}}
  `;
  document.head.appendChild(style);
}

function showSplash() {
  if (!shouldShow() || document.getElementById(NODE_ID)) return;
  ensureStyle();
  const node = document.createElement('div');
  node.id = NODE_ID;
  node.innerHTML = `<section class="cvxSplashCard">${markSvg()}<div><h1>Churvox</h1><p>${isWorkerApp() ? 'Worker app loading. Clock in, do the job, add proof.' : 'Churvox does the admin. The owner checks and approves.'}</p></div><span class="cvxSplashBar"><i></i></span></section>`;
  document.body.appendChild(node);
  window.sessionStorage.setItem(SESSION_KEY, '1');
  window.setTimeout(() => node.classList.add('hide'), isWorkerApp() ? 1250 : 950);
  window.setTimeout(() => node.remove(), isWorkerApp() ? 1650 : 1300);
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showSplash, { once: true });
  else showSplash();
}

export {};
