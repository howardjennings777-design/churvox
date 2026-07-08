const ID = 'churvox-worker-pre-react-shell';
const STYLE = 'churvox-worker-pre-react-shell-style';
const MARK = '/churvox-app-icon.svg?v=churvox-integrated-mark-20260708b';

function isWorkerRoute() {
  return /^\/worker(?:\/|$)/i.test(window.location.pathname || '');
}

function currentTab() {
  const path = window.location.pathname || '';
  if (/\/worker\/jobs/i.test(path)) return 'Jobs';
  if (/\/worker\/(ops|messages)/i.test(path)) return 'Messages';
  if (/\/worker\/help/i.test(path)) return 'Help';
  if (/\/worker\/(settings|profile)/i.test(path)) return 'Me';
  return 'Today';
}

function reactReady() {
  return Boolean(document.querySelector('.simpleWorkerApp'));
}

function css() {
  if (document.getElementById(STYLE)) return;
  const s = document.createElement('style');
  s.id = STYLE;
  s.textContent = `
    #${ID}{position:fixed;inset:0;z-index:9998;min-height:100dvh;display:grid;grid-template-rows:1fr auto;gap:18px;padding:calc(env(safe-area-inset-top,0px) + 18px) 16px calc(92px + env(safe-area-inset-bottom,0px));box-sizing:border-box;background:radial-gradient(circle at 16% 4%,rgba(249,115,22,.30),transparent 17rem),linear-gradient(180deg,#07100c 0,#111827 58%,#f7f0e7 58%,#f7f0e7 100%);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff;overflow:hidden}
    #${ID},#${ID} *{box-sizing:border-box;visibility:visible!important}
    #${ID} .splash{display:grid;align-content:center;justify-items:start;gap:22px;min-height:0}
    #${ID} .logo{width:min(220px,68vw);height:64px;background:url('${MARK}') left center/contain no-repeat;filter:drop-shadow(0 16px 30px rgba(0,0,0,.34))}
    #${ID} .panel{width:100%;display:grid;gap:14px;border:1px solid rgba(255,255,255,.12);border-radius:32px;padding:22px;background:linear-gradient(135deg,#0f172a,#111827 56%,#f97316);box-shadow:0 24px 58px rgba(2,6,23,.34);position:relative;overflow:hidden}
    #${ID} .panel:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 88% 10%,rgba(255,255,255,.22),transparent 24%),repeating-linear-gradient(135deg,rgba(255,255,255,.055) 0 1px,transparent 1px 18px)}
    #${ID} .panel>*{position:relative;z-index:1}
    #${ID} .pill{width:max-content;border-radius:999px;background:rgba(255,255,255,.14);color:#fed7aa;padding:7px 11px;font-size:11px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}
    #${ID} h1{margin:0;color:#fff;font-size:clamp(40px,12vw,58px);line-height:.86;font-weight:1000;letter-spacing:-.09em}
    #${ID} p{margin:0;color:rgba(255,255,255,.82);font-size:14px;font-weight:820;line-height:1.38}
    #${ID} .loading{display:flex;align-items:center;gap:10px;color:#fed7aa;font-size:13px;font-weight:950}
    #${ID} .spin{width:24px;height:24px;border:3px solid rgba(255,255,255,.32);border-top-color:#f97316;border-radius:999px;animation:spinWorker .8s linear infinite}
    #${ID} nav{position:fixed;left:12px;right:12px;bottom:calc(10px + env(safe-area-inset-bottom,0px));display:grid;grid-template-columns:repeat(5,1fr);gap:6px;border:1px solid rgba(15,23,42,.1);border-radius:24px;background:rgba(255,255,255,.95);padding:7px;box-shadow:0 18px 44px rgba(15,23,42,.22)}
    #${ID} nav a{display:grid;place-items:center;min-height:48px;border-radius:17px;color:#64748b!important;text-decoration:none;font-size:12px;font-weight:1000}
    #${ID} nav a.active{background:#111827;color:#fff!important}
    @keyframes spinWorker{to{transform:rotate(360deg)}}
  `;
  document.head.appendChild(s);
}

function nav(tab) {
  return [['Today', '/worker/today'], ['Jobs', '/worker/jobs'], ['Messages', '/worker/messages'], ['Help', '/worker/help'], ['Me', '/worker/profile']]
    .map(([label, href]) => `<a class="${label === tab ? 'active' : ''}" href="${href}">${label}</a>`).join('');
}

function render() {
  if (!isWorkerRoute()) return;
  const old = document.getElementById(ID);
  if (reactReady()) {
    old?.remove();
    return;
  }
  css();
  const tab = currentTab();
  const root = document.getElementById('root') || document.body;
  const node = old || document.createElement('main');
  node.id = ID;
  node.innerHTML = `<section class="splash"><div class="logo" aria-label="Churvox"></div><section class="panel"><span class="pill">${tab}</span><h1>Worker app loading.</h1><p>Getting jobs, directions, proof and messages ready for the field.</p><div class="loading"><i class="spin"></i><span>Checking live run sheet</span></div></section></section><nav>${nav(tab)}</nav>`;
  if (!old) root.appendChild(node);
}

function schedule() {
  if (!isWorkerRoute()) return;
  [0, 35, 100, 260, 700, 1400, 2600].forEach((delay) => setTimeout(render, delay));
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_PRE_REACT_SHELL__) {
  window.__CHURVOX_WORKER_PRE_REACT_SHELL__ = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
  window.addEventListener('load', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  setInterval(schedule, 1200);
}

export {};
