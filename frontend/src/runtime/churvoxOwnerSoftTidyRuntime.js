// Soft owner page tidy runtime.
// Keeps old owner page panels compact while the clean/recovery workspace stays first.

const STYLE_ID = 'churvox-owner-soft-tidy-style';

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .churvoxOptionC .cocPage{
      gap:12px!important;
      align-items:start!important;
    }
    .churvoxOptionC .cocPage > section[id^="churvox-owner"],
    .churvoxOptionC .cocPage > section[id^="churvox-guide"],
    .churvoxOptionC .cocPage > section[id^="churvox-messages"]{
      order:-20!important;
    }
    .churvoxOptionC .cocPage > .cocPanel,
    .churvoxOptionC .cocPage > article,
    .churvoxOptionC .cocPage > div:not([id]){
      border-radius:16px!important;
      border:1px solid rgba(16,21,19,.07)!important;
      background:rgba(255,255,255,.72)!important;
      box-shadow:0 10px 22px rgba(16,21,19,.045)!important;
      max-height:360px!important;
      overflow:auto!important;
    }
    .churvoxOptionC .cocPage > .cocPanel:nth-of-type(n+6),
    .churvoxOptionC .cocPage > article:nth-of-type(n+6){
      max-height:180px!important;
      opacity:.78!important;
    }
    .churvoxOptionC .cocRows,
    .churvoxOptionC .scroll,
    .churvoxOptionC .ledgerList,
    .churvoxOptionC .jobCards,
    .churvoxOptionC .workerCards,
    .churvoxOptionC .workCards{
      max-height:300px!important;
      overflow:auto!important;
    }
  `;
  document.head.appendChild(style);
}

function tidy() {
  installStyle();
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root) return;
  const clean = root.querySelector('#churvox-owner-core-clean-layout, #churvox-guide-command-proper-layout, #churvox-owner-page-recovery');
  if (clean && root.firstElementChild !== clean) root.prepend(clean);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_SOFT_TIDY__) {
  window.__CHURVOX_OWNER_SOFT_TIDY__ = true;
  window.addEventListener('DOMContentLoaded', tidy);
  window.addEventListener('load', tidy);
  window.addEventListener('hashchange', () => setTimeout(tidy, 100));
  window.addEventListener('popstate', () => setTimeout(tidy, 100));
  document.addEventListener('click', () => setTimeout(tidy, 140), true);
  setInterval(tidy, 1000);
  tidy();
}

export {};
