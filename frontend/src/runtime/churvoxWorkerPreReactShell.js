// CHURVOX_WORKER_PRE_REACT_SHELL_20260630
// Last-resort worker shell: if React leaves /worker/* empty, keep the worker route visible.

const ID = 'churvox-worker-pre-react-shell';
const STYLE = 'churvox-worker-pre-react-shell-style';

function isWorkerRoute() {
  return /^\/worker(?:\/|$)/i.test(window.location.pathname || '');
}
function text() {
  try { return String(document.body?.innerText || '').replace(/\s+/g, ' ').trim(); } catch { return ''; }
}
function tab() {
  const path = window.location.pathname || '';
  if (/\/worker\/jobs/i.test(path)) return 'Jobs';
  if (/\/worker\/(ops|messages)/i.test(path)) return 'Messages';
  if (/\/worker\/help/i.test(path)) return 'Help';
  if (/\/worker\/(settings|profile)/i.test(path)) return 'Me';
  return 'Today';
}
function css() {
  if (document.getElementById(STYLE)) return;
  const s = document.createElement('style');
  s.id = STYLE;
  s.textContent = `#${ID}{min-height:100dvh;padding:18px 18px 96px;background:#f5f7f1;color:#111827;font-family:Inter,system-ui,sans-serif;box-sizing:border-box;display:grid;gap:14px;align-content:start;visibility:visible!important;opacity:1!important}#${ID},#${ID} *{visibility:visible!important;-webkit-text-fill-color:initial!important}#${ID} .hero{border-radius:24px;background:linear-gradient(135deg,#111827,#1f2937 58%,#f97316);color:#fff;padding:22px;box-shadow:0 18px 44px rgba(15,23,42,.18)}#${ID} .hero span{display:inline-flex;border-radius:999px;background:#f97316;color:#111827;padding:6px 10px;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.10em}#${ID} h1{margin:10px 0 4px;color:#fff;font-size:40px;line-height:.9;font-weight:1000;letter-spacing:-.06em}#${ID} p{margin:0;color:#475569;font-size:14px;font-weight:850;line-height:1.4}#${ID} .hero p{color:rgba(255,255,255,.82)}#${ID} .card{display:grid;gap:8px;border:1px solid rgba(15,23,42,.08);border-radius:20px;background:#fff;padding:16px;box-shadow:0 14px 30px rgba(15,23,42,.06)}#${ID} .card span{font-size:11px;font-weight:1000;text-transform:uppercase;color:#9a3412;letter-spacing:.08em}#${ID} .card h2{margin:0;color:#111827;font-size:24px;line-height:1;font-weight:1000;letter-spacing:-.04em}#${ID} .button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;border-radius:999px;background:#111827;color:#fff!important;text-decoration:none;font-weight:1000}#${ID} nav{position:fixed;left:10px;right:10px;bottom:10px;display:grid;grid-template-columns:repeat(5,1fr);gap:6px;border-radius:18px;background:#111827;padding:8px;box-shadow:0 18px 44px rgba(15,23,42,.26)}#${ID} nav a{display:grid;place-items:center;min-height:40px;border-radius:12px;color:#fff!important;text-decoration:none;font-size:12px;font-weight:1000}#${ID} nav a.active{background:#f97316;color:#111827!important}`;
  document.head.appendChild(s);
}
function body(current) {
  if (current === 'Jobs') return '<section class="card"><span>Jobs</span><h2>One job at a time</h2><p>Start current job, finish job, send to office, or all jobs done.</p><a class="button" href="/worker/today">Back to Today</a></section>';
  if (current === 'Messages') return '<section class="card"><span>Messages</span><h2>Message office</h2><p>Send office updates. Sent messages stay visible.</p><a class="button" href="/worker/help">Need help</a></section>';
  if (current === 'Help') return '<section class="card"><span>Help</span><h2>Message office</h2><p>Wrong address, customer issue, unsafe work, need more info, or other.</p><a class="button" href="/worker/messages">Message office</a></section>';
  if (current === 'Me') return '<section class="card"><span>Me</span><h2>Worker profile</h2><p>Today, Jobs, Messages, Help and Me stay simple.</p></section>';
  return '<section class="card"><span>Today</span><h2>Info only</h2><p>Today shows schedule, jobs and messages. Jobs are worked one at a time.</p><a class="button" href="/worker/jobs">Open jobs</a></section>';
}
function nav(current) {
  return [['Today','/worker/today'],['Jobs','/worker/jobs'],['Messages','/worker/messages'],['Help','/worker/help'],['Me','/worker/profile']]
    .map(([label, href]) => `<a class="${label === current ? 'active' : ''}" href="${href}">${label}</a>`).join('');
}
function render() {
  if (!isWorkerRoute()) return;
  const current = tab();
  css();
  let node = document.getElementById(ID);
  const liveText = text();
  if (!node && liveText.length > 40 && !/loading churvox|today jobs messages/i.test(liveText)) return;
  if (!node) {
    node = document.createElement('main');
    node.id = ID;
    const root = document.getElementById('root') || document.body;
    root.appendChild(node);
  }
  node.innerHTML = `<section class="hero"><span>${current}</span><h1>Worker</h1><p>Today, jobs and messages stay clear.</p></section>${body(current)}<nav>${nav(current)}</nav>`;
}
function schedule() {
  if (!isWorkerRoute()) return;
  setTimeout(render, 50);
  setTimeout(render, 150);
  setTimeout(render, 450);
  setTimeout(render, 1000);
  setTimeout(render, 2200);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_PRE_REACT_SHELL__) {
  window.__CHURVOX_WORKER_PRE_REACT_SHELL__ = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
  window.addEventListener('load', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('error', schedule);
  window.addEventListener('unhandledrejection', schedule);
  setInterval(schedule, 1200);
}

export {};
