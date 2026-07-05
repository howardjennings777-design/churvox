// Owner page containment runtime.
// Keeps recovered owner pages tidy: capped lists, clean card scroll areas, visible tap states, and one main workspace scroll.

import './churvoxOwnerCreateRouteRecoveryRuntime';

const STYLE_ID = 'churvox-owner-page-containment-style';

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .churvoxOptionC .workspace{
      overflow-y:auto!important;
      overflow-x:hidden!important;
      scrollbar-width:thin!important;
      scrollbar-color:#aeb5b1 transparent!important;
    }
    .churvoxOptionC .workspace::-webkit-scrollbar{width:10px!important}
    .churvoxOptionC .workspace::-webkit-scrollbar-thumb{background:#aeb5b1!important;border-radius:999px!important}
    .churvoxOptionC .workspace::-webkit-scrollbar-track{background:transparent!important}

    .churvoxOptionC .cocPage{align-items:start!important}
    .churvoxOptionC .cocPanel,
    .churvoxOptionC .recoveryCard,
    .churvoxOptionC .recoveryForm,
    .churvoxOptionC .jobCard,
    .churvoxOptionC .workerCard,
    .churvoxOptionC .workCard,
    .churvoxOptionC .ledgerRow,
    .churvoxOptionC .cocRow{
      max-width:100%!important;
      overflow:hidden!important;
    }

    .churvoxOptionC .cocRows,
    .churvoxOptionC .scroll,
    .churvoxOptionC .ledgerList,
    .churvoxOptionC .jobCards,
    .churvoxOptionC .workerCards,
    .churvoxOptionC .workCards{
      max-height:420px!important;
      overflow-y:auto!important;
      overflow-x:hidden!important;
      padding-right:3px!important;
      scrollbar-width:thin!important;
      scrollbar-color:#b6bdb9 transparent!important;
    }

    .churvoxOptionC .cocRows > *:nth-child(n+7),
    .churvoxOptionC .scroll > *:nth-child(n+7),
    .churvoxOptionC .ledgerList > *:nth-child(n+7),
    .churvoxOptionC .jobCards > *:nth-child(n+7),
    .churvoxOptionC .workerCards > *:nth-child(n+7),
    .churvoxOptionC .workCards > *:nth-child(n+7){
      margin-top:0!important;
    }

    #churvox-owner-page-recovery .recoveryCard,
    #churvox-owner-page-recovery .recoveryField,
    #churvox-owner-page-recovery [data-churvox-recovery-action]{
      transition:transform .14s ease, box-shadow .14s ease, border-color .14s ease!important;
    }
    #churvox-owner-page-recovery .recoveryCard:hover,
    #churvox-owner-page-recovery .recoveryField:hover{
      transform:translateY(-1px)!important;
      border-color:rgba(239,85,60,.34)!important;
      box-shadow:0 18px 38px rgba(16,21,19,.09)!important;
    }
    #churvox-owner-page-recovery [data-churvox-recovery-action]:hover{
      transform:translateY(-1px)!important;
      box-shadow:0 12px 24px rgba(16,21,19,.14)!important;
    }

    #churvox-owner-page-recovery .recoveryForm{
      max-height:360px!important;
      overflow-y:auto!important;
      scrollbar-width:thin!important;
    }
    #churvox-owner-page-recovery .recoveryForm > b{
      position:sticky!important;
      top:0!important;
      z-index:2!important;
      padding:8px 0!important;
      background:rgba(255,255,255,.94)!important;
      border-bottom:1px solid rgba(16,21,19,.06)!important;
    }

    .churvoxOptionC .cocPanel h2,
    .churvoxOptionC .cocPanel h3,
    #churvox-owner-page-recovery b{
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }

    .churvoxOptionC .map,
    .churvoxOptionC .googleMapShell,
    .churvoxOptionC .googleMap{
      max-height:420px!important;
      min-height:260px!important;
    }

    @media(max-width:720px){
      .churvoxOptionC .cocRows,
      .churvoxOptionC .scroll,
      .churvoxOptionC .ledgerList,
      .churvoxOptionC .jobCards,
      .churvoxOptionC .workerCards,
      .churvoxOptionC .workCards,
      #churvox-owner-page-recovery .recoveryForm{
        max-height:340px!important;
      }
    }
  `;
  document.head.appendChild(style);
}

function markListCounts() {
  document.querySelectorAll('.churvoxOptionC .cocRows, .churvoxOptionC .scroll, .churvoxOptionC .ledgerList, .churvoxOptionC .jobCards, .churvoxOptionC .workerCards, .churvoxOptionC .workCards').forEach((list) => {
    if (list.dataset.churvoxContained === 'true') return;
    list.dataset.churvoxContained = 'true';
    const count = list.children?.length || 0;
    if (count > 6 && !list.previousElementSibling?.classList?.contains('churvoxContainedHint')) {
      const hint = document.createElement('small');
      hint.className = 'churvoxContainedHint';
      hint.textContent = `${count} items — scroll inside this box`;
      hint.style.cssText = 'display:block;margin:-2px 0 8px;color:#64706b;font:900 11px Inter,system-ui,sans-serif';
      list.parentElement?.insertBefore(hint, list);
    }
  });
}

function run() {
  installStyle();
  markListCounts();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_PAGE_CONTAINMENT__) {
  window.__CHURVOX_OWNER_PAGE_CONTAINMENT__ = true;
  window.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  window.addEventListener('hashchange', () => setTimeout(run, 100));
  window.addEventListener('churvox:fresh-data-updated', run);
  document.addEventListener('click', () => setTimeout(run, 120), true);
  setInterval(run, 1600);
  run();
}

export {};