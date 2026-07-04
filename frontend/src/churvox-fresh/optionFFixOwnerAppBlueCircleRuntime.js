const STYLE_ID = 'option-f-fix-owner-blue-circle-style';

function inject() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    html body:has(.churvoxOptionC){background:#eeeeea!important;overflow:hidden!important}
    html body:has(.churvoxOptionC) #root{height:100vh!important;overflow:hidden!important;background:#eeeeea!important}
    html body #root .churvoxOptionC{display:flex!important;flex-direction:column!important;width:100vw!important;height:100vh!important;min-height:100vh!important;max-width:100vw!important;overflow:hidden!important;background:#eeeeea!important;color:#111815!important;padding:0!important}
    html body #root .churvoxOptionC .cocBar{position:relative!important;z-index:80!important;display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center!important;gap:20px!important;width:auto!important;height:auto!important;min-height:74px!important;margin:18px 20px 8px!important;padding:17px 20px!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:17px!important;background:radial-gradient(circle at 86% 46%,rgba(240,100,47,.32),transparent 28%),linear-gradient(115deg,#101513 0%,#171b19 48%,#4c2a1c 100%)!important;color:#fff!important;box-shadow:0 18px 46px rgba(16,21,19,.18)!important;overflow:hidden!important;transform:none!important;opacity:1!important}
    html body #root .churvoxOptionC .cocBar .brand{display:flex!important;align-items:center!important;gap:9px!important;color:#fff!important;min-width:190px!important}
    html body #root .churvoxOptionC .cocBar .brand i{display:block!important;width:29px!important;height:29px!important;border-radius:10px!important;background:#ef553c!important;box-shadow:0 0 0 4px rgba(239,85,60,.16)!important}
    html body #root .churvoxOptionC .cocBar .brand b{display:block!important;color:#fff!important;font-size:17px!important;font-weight:950!important;letter-spacing:-.03em!important}
    html body #root .churvoxOptionC .cocBar .brand small{display:block!important;color:rgba(255,255,255,.78)!important;font-size:8px!important;font-weight:950!important;text-transform:uppercase!important;letter-spacing:.08em!important}
    html body #root .churvoxOptionC .cocBar .title h1{margin:0!important;color:#fff!important;font-size:38px!important;line-height:.86!important;letter-spacing:-.065em!important;font-weight:950!important}
    html body #root .churvoxOptionC .cocBar .title p{margin:4px 0 0!important;color:rgba(255,255,255,.82)!important;font-size:11px!important;font-weight:900!important}
    html body #root .churvoxOptionC .cocBar .owner{justify-self:end!important;display:block!important;text-align:right!important;width:auto!important;height:auto!important;border:0!important;background:transparent!important;border-radius:0!important;box-shadow:none!important;padding:0!important;transform:none!important}
    html body #root .churvoxOptionC .cocBar .owner span{display:none!important}
    html body #root .churvoxOptionC .cocBar .owner b{display:block!important;color:rgba(255,255,255,.86)!important;font-size:12px!important;max-width:170px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
    html body #root .churvoxOptionC .cocNav{position:relative!important;z-index:90!important;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;width:auto!important;max-width:none!important;height:auto!important;min-height:46px!important;margin:0 20px 12px!important;padding:7px!important;border:0!important;border-radius:16px!important;background:rgba(255,255,255,.72)!important;box-shadow:0 12px 28px rgba(16,21,19,.08)!important;backdrop-filter:blur(18px)!important;overflow-x:auto!important;overflow-y:hidden!important;transform:none!important}
    html body #root .churvoxOptionC .cocNav button{display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;width:auto!important;min-width:auto!important;max-width:none!important;height:auto!important;min-height:32px!important;max-height:36px!important;aspect-ratio:auto!important;margin:0!important;padding:8px 14px!important;border:0!important;border-radius:999px!important;background:#e4e7e7!important;color:#1e2422!important;font-size:12px!important;font-weight:950!important;line-height:1!important;text-align:center!important;white-space:nowrap!important;box-shadow:none!important;transform:none!important;opacity:1!important}
    html body #root .churvoxOptionC .cocNav button.active{background:#ef553c!important;color:#fff!important;box-shadow:0 8px 22px rgba(239,85,60,.28)!important}
    html body #root .churvoxOptionC .workspace{position:relative!important;z-index:1!important;display:block!important;flex:1 1 auto!important;width:auto!important;height:auto!important;margin:0 20px 22px!important;padding:0!important;overflow-y:auto!important;overflow-x:hidden!important;border:0!important;background:transparent!important;color:#111815!important;grid-column:auto!important;grid-row:auto!important}
    html body #root .churvoxOptionC .cocPage{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;align-items:start!important;background:transparent!important;color:#111815!important;padding:0 0 22px!important;min-height:auto!important}
    html body #root .churvoxOptionC .cocPanel{position:relative!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;gap:10px!important;min-height:96px!important;border:1px solid rgba(16,21,19,.08)!important;border-radius:16px!important;background:rgba(255,255,255,.78)!important;color:#111815!important;box-shadow:0 13px 30px rgba(16,21,19,.06)!important;padding:16px!important;transform:none!important}
    html body #root .churvoxOptionC .cocPanel.full,html body #root .churvoxOptionC .cocPanel.wide{grid-column:1/-1!important}
    html body #root .churvoxOptionC .cocPanel h2,html body #root .churvoxOptionC .cocPanel h3{color:#111815!important;margin:0!important;font-weight:950!important}
    html body #root .churvoxOptionC .cocPanel p,html body #root .churvoxOptionC .cocPanel span,html body #root .churvoxOptionC .cocPanel small{color:#44504c!important;font-weight:800!important}
    html body #root .churvoxOptionC .toolbar{grid-column:1/-1!important;display:flex!important;gap:9px!important;flex-wrap:wrap!important;background:transparent!important;padding:0!important;position:relative!important}
    html body #root .churvoxOptionC .toolbar button,html body #root .churvoxOptionC .action{border:0!important;border-radius:999px!important;background:#111815!important;color:#fff!important;min-height:36px!important;max-height:none!important;width:auto!important;aspect-ratio:auto!important;padding:10px 15px!important;font-size:12px!important;font-weight:950!important}
    html body #root .churvoxOptionC .toolbar button:first-child,html body #root .churvoxOptionC .action:not(.dark):not(.quiet){background:#ef553c!important;color:#fff!important}
    html body #root .churvoxOptionC button[aria-label='Log out'],html body #root .churvoxOptionC .logout,html body #root .churvoxOptionC .logOut{width:auto!important;height:auto!important;min-height:32px!important;border-radius:999px!important;padding:8px 14px!important;aspect-ratio:auto!important;background:#111815!important;color:#fff!important;box-shadow:none!important;position:static!important;transform:none!important}
    @media(max-width:980px){html body #root .churvoxOptionC .cocBar{grid-template-columns:1fr!important;margin:12px!important}html body #root .churvoxOptionC .cocBar .title h1{font-size:30px!important}html body #root .churvoxOptionC .cocNav{margin:0 12px 10px!important}html body #root .churvoxOptionC .workspace{margin:0 12px 16px!important}html body #root .churvoxOptionC .cocPage{grid-template-columns:1fr!important}}
  `;
  document.head.appendChild(style);
}

function mark() {
  const root = document.querySelector('.churvoxOptionC');
  if (root) root.setAttribute('data-blue-circle-fix', 'true');
}

function run() {
  inject();
  mark();
}

if (typeof window !== 'undefined') {
  run();
  window.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  window.addEventListener('hashchange', () => setTimeout(run, 80));
  window.addEventListener('popstate', () => setTimeout(run, 80));
  document.addEventListener('click', () => setTimeout(run, 120), true);
  setInterval(run, 700);
}

export {};
