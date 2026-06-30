// CHURVOX_WORKER_BLANK_FALLBACK_20260630
// If a worker route renders an empty body after auth/navigation, show the simple no-fuss worker shell instead of a blank page.

const FALLBACK_ID = 'churvox-worker-blank-fallback';
const STYLE_ID = 'churvox-worker-blank-fallback-style';

function isWorkerRoute() {
  return /^\/worker(?:\/|$)/i.test(window.location.pathname || '');
}

function text() {
  return String(document.body?.innerText || document.body?.textContent || '').replace(/\s+/g, ' ').trim();
}

function hasWorkerText() {
  return /Churvox|Worker|Today|Jobs|Messages|Help|Start current job|All jobs done|Message office/i.test(text());
}

function currentTab() {
  const path = window.location.pathname || '';
  if (/\/worker\/ops|\/worker\/messages/i.test(path)) return 'Messages';
  if (/\/worker\/help/i.test(path)) return 'Help';
  if (/\/worker\/settings|\/worker\/profile|\/worker\/me/i.test(path)) return 'Me';
  if (/\/worker\/jobs/i.test(path)) return 'Jobs';
  return 'Today';
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${FALLBACK_ID}{min-height:100dvh;background:#f5f7f1;color:#111815;font-family:Inter,system-ui,sans-serif;padding:18px;box-sizing:border-box;display:grid;gap:14px;align-content:start}
    #${FALLBACK_ID} .swHero{border-radius:24px;background:linear-gradient(135deg,#101513,#1d2521);color:#fff;padding:22px;box-shadow:0 18px 44px rgba(16,21,19,.18)}
    #${FALLBACK_ID} .swHero span{display:inline-flex;border-radius:999px;background:#ea580c;padding:6px 10px;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}
    #${FALLBACK_ID} h1{margin:10px 0 4px;font-size:36px;line-height:1;font-weight:1000;letter-spacing:-.05em}
    #${FALLBACK_ID} p{margin:0;color:#52605a;font-size:14px;font-weight:850;line-height:1.45}
    #${FALLBACK_ID} .swHero p{color:rgba(255,255,255,.78)}
    #${FALLBACK_ID} .swCard{display:grid;gap:8px;border:1px solid rgba(16,21,19,.08);border-radius:18px;background:#fff;padding:16px;box-shadow:0 14px 30px rgba(16,21,19,.06)}
    #${FALLBACK_ID} .swCard span{font-size:11px;font-weight:950;text-transform:uppercase;color:#9a3412;letter-spacing:.06em}
    #${FALLBACK_ID} .swCard h2{margin:0;font-size:22px;color:#111815}
    #${FALLBACK_ID} .swPrimary{display:inline-flex;justify-content:center;align-items:center;text-decoration:none;border:0;border-radius:999px;background:#ea580c;color:#fff;padding:12px 14px;font-weight:950}
    #${FALLBACK_ID} .swNav{position:fixed;left:10px;right:10px;bottom:10px;display:grid;grid-template-columns:repeat(5,1fr);gap:6px;border-radius:18px;background:#101513;padding:8px;box-shadow:0 18px 44px rgba(16,21,19,.28)}
    #${FALLBACK_ID} .swNav a{text-align:center;text-decoration:none;border-radius:12px;color:#fff;padding:10px 4px;font-size:12px;font-weight:950}
    #${FALLBACK_ID} .swNav a.active{background:#ea580c}
  `;
  document.head.appendChild(style);
}

function nav(tab) {
  return [['Today','/worker/today'],['Jobs','/worker/jobs'],['Messages','/worker/ops'],['Help','/worker/help'],['Me','/worker/settings']]
    .map(([label, href]) => `<a class="${label === tab ? 'active' : ''}" href="${href}">${label}</a>`).join('');
}

function body(tab) {
  if (tab === 'Messages') return '<section class="swCard"><span>Messages</span><h2>Message office</h2><p>Use this screen to send office updates when the live worker app is still loading.</p><a class="swPrimary" href="/worker/help">Need help</a></section>';
  if (tab === 'Help') return '<section class="swCard"><span>Help</span><h2>Need help?</h2><p>Wrong address, unclear job, customer issue, or unsafe work: message the office.</p><a class="swPrimary" href="/worker/ops">Message office</a></section>';
  if (tab === 'Me') return '<section class="swCard"><span>Worker</span><h2>Profile</h2><p>Your worker screen is available. Refresh if the live profile has not loaded yet.</p></section>';
  if (tab === 'Jobs') return '<section class="swCard"><span>Jobs</span><h2>One job at a time</h2><p>Start current job when your live queue loads. No office clutter.</p><a class="swPrimary" href="/worker/today">Back to today</a></section>';
  return '<section class="swCard"><span>Today</span><h2>Info only</h2><p>Today shows schedule, jobs and messages. Jobs are worked one at a time.</p><a class="swPrimary" href="/worker/jobs">Open jobs</a></section>';
}

function renderFallback() {
  if (!isWorkerRoute()) {
    document.getElementById(FALLBACK_ID)?.remove();
    return;
  }
  if (hasWorkerText() && !document.getElementById(FALLBACK_ID)) return;
  if (document.querySelector('.simpleWorkerApp') && text().length > 20) {
    document.getElementById(FALLBACK_ID)?.remove();
    return;
  }
  ensureStyle();
  let node = document.getElementById(FALLBACK_ID);
  if (!node) {
    node = document.createElement('main');
    node.id = FALLBACK_ID;
    const root = document.getElementById('root') || document.body;
    root.appendChild(node);
  }
  const tab = currentTab();
  node.innerHTML = `<section class="swHero"><span>${tab}</span><h1>Worker</h1><p>Simple worker screen. Today, jobs and messages stay clear.</p></section>${body(tab)}<nav class="swNav">${nav(tab)}</nav>`;
}

function schedule() {
  setTimeout(renderFallback, 1200);
  setTimeout(renderFallback, 3200);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_BLANK_FALLBACK__) {
  window.__CHURVOX_WORKER_BLANK_FALLBACK__ = true;
  window.addEventListener('load', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  document.addEventListener('click', () => setTimeout(renderFallback, 800), true);
  setInterval(renderFallback, 2500);
}

export {};