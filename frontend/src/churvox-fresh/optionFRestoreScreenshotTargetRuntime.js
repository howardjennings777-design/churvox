const STYLE_ID = 'option-f-restore-screenshot-target-style';
const VERSION = 'CHURVOX_OWNER_SCREENSHOT_TARGET_20260705';

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body:has(.churvoxOptionC){background:#eeeeea!important;overflow:hidden!important}
    body:has(.churvoxOptionC) #root{height:100vh!important;overflow:hidden!important;background:#eeeeea!important}
    .churvoxOptionC,.churvoxOptionC *{box-sizing:border-box!important;scrollbar-color:rgba(80,88,86,.38) transparent!important}
    .churvoxOptionC{display:flex!important;flex-direction:column!important;width:100vw!important;height:100vh!important;max-width:100vw!important;overflow:hidden!important;background:#eeeeea!important;color:#111815!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;padding:0!important}
    .churvoxOptionC .cocBar{position:relative!important;z-index:20!important;display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center!important;gap:20px!important;margin:18px 20px 8px!important;padding:17px 20px!important;min-height:74px!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:17px!important;overflow:hidden!important;background:radial-gradient(circle at 86% 46%,rgba(240,100,47,.32),transparent 28%),radial-gradient(circle at 52% 16%,rgba(255,255,255,.10),transparent 12%),linear-gradient(115deg,#101513 0%,#171b19 48%,#4c2a1c 100%)!important;box-shadow:0 18px 46px rgba(16,21,19,.18)!important;color:#fff!important}
    .churvoxOptionC .cocBar:before{content:""!important;position:absolute!important;inset:0!important;background:repeating-linear-gradient(135deg,rgba(255,255,255,.045) 0 1px,transparent 1px 16px),linear-gradient(90deg,rgba(255,255,255,.08),transparent 36%,rgba(240,100,47,.12))!important;opacity:.9!important;pointer-events:none!important}
    .churvoxOptionC .cocBar>*{position:relative!important;z-index:1!important}
    .churvoxOptionC .brand{display:flex!important;align-items:center!important;gap:9px!important;min-width:190px!important;color:#fff!important}
    .churvoxOptionC .brand i{width:29px!important;height:29px!important;display:block!important;border-radius:10px!important;background:#ef553c!important;box-shadow:0 0 0 4px rgba(239,85,60,.16),0 12px 26px rgba(0,0,0,.22)!important}
    .churvoxOptionC .brand b{font-size:17px!important;font-weight:950!important;letter-spacing:-.03em!important;color:#fff!important;text-shadow:0 2px 12px rgba(0,0,0,.24)!important}
    .churvoxOptionC .brand small{font-size:8px!important;font-weight:950!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:rgba(255,255,255,.78)!important}
    .churvoxOptionC .title h1{margin:0!important;color:#fff!important;font-size:38px!important;line-height:.86!important;letter-spacing:-.065em!important;font-weight:950!important;text-shadow:0 2px 14px rgba(0,0,0,.27)!important}
    .churvoxOptionC .title p{margin:4px 0 0!important;color:rgba(255,255,255,.82)!important;font-size:11px!important;line-height:1.2!important;font-weight:900!important}
    .churvoxOptionC .owner{justify-self:end!important;text-align:right!important;display:flex!important;align-items:center!important;gap:8px!important}
    .churvoxOptionC .owner span{display:none!important}
    .churvoxOptionC .owner b{max-width:160px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:rgba(255,255,255,.84)!important;font-size:12px!important}
    .churvoxOptionC .cocNav{position:relative!important;z-index:25!important;display:flex!important;flex-direction:row!important;align-items:center!important;gap:7px!important;width:auto!important;min-height:46px!important;margin:0 20px 12px!important;padding:7px!important;overflow-x:auto!important;overflow-y:hidden!important;border:0!important;border-radius:16px!important;background:rgba(255,255,255,.64)!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important;box-shadow:0 12px 28px rgba(16,21,19,.08)!important;flex:0 0 auto!important}
    .churvoxOptionC .cocNav button{width:auto!important;white-space:nowrap!important;min-height:32px!important;padding:8px 14px!important;border:0!important;border-radius:999px!important;background:#e4e7e7!important;color:#1e2422!important;font-size:12px!important;font-weight:950!important;line-height:1!important;text-align:center!important;box-shadow:none!important;cursor:pointer!important;transition:transform .14s ease,background .14s ease,color .14s ease!important}
    .churvoxOptionC .cocNav button:hover{transform:translateY(-1px)!important;background:#fff!important;color:#101513!important}
    .churvoxOptionC .cocNav button.active{background:#ef553c!important;color:#fff!important;box-shadow:0 8px 22px rgba(239,85,60,.28)!important}
    .churvoxOptionC .workspace{display:block!important;flex:1 1 auto!important;width:auto!important;margin:0 20px 22px!important;padding:0!important;overflow-y:auto!important;overflow-x:hidden!important;border:0!important;background:transparent!important;grid-column:auto!important;grid-row:auto!important}
    .churvoxOptionC .cocPage{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;align-items:start!important;min-height:auto!important;padding:0 0 22px!important;background:transparent!important}
    .churvoxOptionC .cocPanel{position:relative!important;overflow:hidden!important;border:1px solid rgba(16,21,19,.08)!important;border-radius:16px!important;background:rgba(255,255,255,.74)!important;box-shadow:0 13px 30px rgba(16,21,19,.06)!important;padding:16px!important;color:#111815!important;min-height:96px!important;gap:10px!important}
    .churvoxOptionC .cocPanel.full,.churvoxOptionC .cocPanel.wide,#option-f-xero-actions-panel,#churvox-xero-payments-panel{grid-column:1/-1!important}
    .churvoxOptionC .cocPanel:before{content:""!important;position:absolute!important;inset:0 0 auto!important;height:5px!important;background:#ef553c!important;opacity:.96!important}
    .churvoxOptionC .cocPanel h2,.churvoxOptionC .cocPanel h3{margin:0!important;color:#111815!important;font-weight:950!important;letter-spacing:-.025em!important}
    .churvoxOptionC .cocPanel h2{font-size:17px!important}.churvoxOptionC .cocPanel h3{font-size:16px!important}
    .churvoxOptionC .cocPanel p,.churvoxOptionC .cocPanel span{font-weight:800!important;color:#44504c!important}
    .churvoxOptionC .toolbar{grid-column:1/-1!important;display:flex!important;gap:9px!important;flex-wrap:wrap!important;position:relative!important;background:transparent!important;padding:0!important}
    .churvoxOptionC .toolbar button,.churvoxOptionC .action,#option-f-xero-actions-panel button,#churvox-xero-payments-panel button{border:0!important;border-radius:999px!important;background:#111815!important;color:#fff!important;min-height:36px!important;padding:10px 15px!important;font-size:12px!important;font-weight:950!important;cursor:pointer!important;box-shadow:none!important}
    .churvoxOptionC .toolbar button:first-child,.churvoxOptionC .action:not(.dark):not(.quiet),#option-f-xero-actions-panel button:first-of-type,#churvox-xero-payments-panel .cvPayButton{background:#ef553c!important;color:#fff!important}
    .churvoxOptionC .cocRows{display:grid!important;gap:8px!important;max-height:360px!important;overflow:auto!important;padding-right:2px!important}
    .churvoxOptionC .cocRow{display:flex!important;align-items:center!important;gap:10px!important;width:100%!important;min-height:52px!important;border:1px solid rgba(16,21,19,.07)!important;border-radius:12px!important;background:rgba(255,255,255,.72)!important;padding:10px!important;color:#111815!important;text-align:left!important}
    .churvoxOptionC .cocRow i{width:18px!important;height:18px!important;border-radius:999px!important;background:#ef553c!important;flex:0 0 auto!important}.churvoxOptionC .cocRow span{display:grid!important;gap:2px!important;min-width:0!important}.churvoxOptionC .cocRow b{font-size:13px!important;font-weight:950!important;color:#111815!important}.churvoxOptionC .cocRow small{font-size:11px!important;color:#5a6561!important;font-weight:800!important}.churvoxOptionC .cocRow em{margin-left:auto!important;border-radius:999px!important;background:#fff1ea!important;color:#9e3f1f!important;padding:5px 8px!important;font-size:10px!important;font-weight:950!important;font-style:normal!important;white-space:nowrap!important}
    .churvoxOptionC .miniStats,.churvoxOptionC .cocStats,.churvoxOptionC .moneyStrip{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important}.churvoxOptionC .miniStat,.churvoxOptionC .moneyStrip span{display:grid!important;align-content:center!important;min-height:74px!important;border-radius:13px!important;background:rgba(255,255,255,.78)!important;border:1px solid rgba(16,21,19,.08)!important;padding:12px!important;text-align:left!important}.churvoxOptionC .miniStat b,.churvoxOptionC .moneyStrip b{font-size:21px!important;line-height:1!important;font-weight:950!important;color:#111815!important}.churvoxOptionC .miniStat small,.churvoxOptionC .moneyStrip small{font-size:10px!important;font-weight:950!important;color:#58625f!important;text-transform:uppercase!important}
    .churvoxOptionC .planList{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important}.churvoxOptionC .planList>div{display:grid!important;align-content:start!important;gap:9px!important;min-height:210px!important;padding:16px!important;border-radius:15px!important;background:rgba(255,255,255,.78)!important;border:1px solid rgba(16,21,19,.08)!important;text-align:left!important}.churvoxOptionC .planList>div.highlight{border-color:#ef553c!important;box-shadow:0 0 0 1px rgba(239,85,60,.15)!important}.churvoxOptionC .planList b{font-size:20px!important}.churvoxOptionC .planList em{font-size:34px!important;font-style:normal!important;font-weight:950!important;color:#111815!important}.churvoxOptionC .planList span{font-size:12px!important;font-weight:800!important;color:#44504c!important}
    #option-f-xero-actions-panel{order:-2!important;background:rgba(255,255,255,.74)!important;border-radius:16px!important;padding:16px!important;box-shadow:0 13px 30px rgba(16,21,19,.06)!important}
    #option-f-xero-actions-panel pre{max-height:92px!important;white-space:pre-wrap!important;background:transparent!important;border:0!important;color:#111815!important;font:800 12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace!important;overflow:auto!important;padding:6px 0!important}
    #option-f-xero-actions-panel pre.raw-hidden{font-family:Inter,system-ui,sans-serif!important;color:#44504c!important}
    #churvox-xero-payments-panel{order:10!important;background:#f8f5ef!important;border-radius:18px!important}
    #churvox-xero-payments-panel .cvPayHero{background:radial-gradient(circle at 88% 18%,rgba(249,115,22,.36),transparent 28%),linear-gradient(135deg,#111827,#1f2937 58%,#f97316)!important}
    .churvoxOptionC [data-churvox-object-cleaned]{white-space:normal!important}
    @media(max-width:980px){.churvoxOptionC .cocBar{grid-template-columns:1fr!important;margin:12px!important}.churvoxOptionC .title h1{font-size:30px!important}.churvoxOptionC .cocNav{margin:0 12px 10px!important}.churvoxOptionC .workspace{margin:0 12px 16px!important}.churvoxOptionC .cocPage,.churvoxOptionC .planList,.churvoxOptionC .miniStats,.churvoxOptionC .cocStats,.churvoxOptionC .moneyStrip{grid-template-columns:1fr!important}}
  `;
  document.head.appendChild(style);
}

function hideRawJson() {
  const pre = document.querySelector('#option-f-xero-actions-panel pre');
  if (!pre) return;
  const text = pre.textContent || '';
  if (!/[{}\[\]"]/.test(text) && !text.includes('success')) return;
  const connected = /connected"?\s*:\s*true|xero_connected"?\s*:\s*true/i.test(text);
  const tenant = (text.match(/tenant_name"?\s*:\s*"([^"]+)"/i) || text.match(/tenantName"?\s*:\s*"([^"]+)"/i) || [])[1];
  const configured = /configured"?\s*:\s*true/i.test(text);
  const parts = [];
  if (/status refreshed|Xero status refreshed/i.test(text)) parts.push('Xero status refreshed.');
  if (connected) parts.push(`Connected${tenant ? `: ${tenant}` : ''}.`);
  else if (configured) parts.push('Xero is configured. Connect from the owner action when ready.');
  if (/draft_invoice_sync_ready"?\s*:\s*true/i.test(text)) parts.push('Draft invoice sync is ready.');
  parts.push('Draft sync only. Owner approval remains required.');
  pre.textContent = parts.join(' ');
  pre.classList.add('raw-hidden');
}

function cleanObjectText(root = document) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    if ((node.nodeValue || '').includes('[object Object]')) {
      node.nodeValue = node.nodeValue.replace(/\[object Object\]/g, 'Status ready');
      node.parentElement?.setAttribute('data-churvox-object-cleaned', 'true');
    }
  });
}

function mark() {
  const root = document.querySelector('.churvoxOptionC');
  if (root) root.setAttribute('data-owner-layout-version', VERSION);
}

function run() {
  injectStyle();
  mark();
  hideRawJson();
  cleanObjectText();
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  window.addEventListener('hashchange', () => setTimeout(run, 80));
  window.addEventListener('popstate', () => setTimeout(run, 80));
  document.addEventListener('click', () => setTimeout(run, 150), true);
  const observer = new MutationObserver(() => run());
  window.addEventListener('load', () => {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  setInterval(run, 900);
  run();
}

export {};
