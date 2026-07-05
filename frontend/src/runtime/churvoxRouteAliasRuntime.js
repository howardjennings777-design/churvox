// Product-safe route aliases and product finishing only.
// This file must not inject old audit panels or rewrite page content.

const PRODUCT_STYLE_ID = 'churvox-product-final-style';

function replaceUrl(pathAndHash) {
  try {
    if (`${window.location.pathname}${window.location.hash}` === pathAndHash) return false;
    window.history.replaceState({}, document.title, pathAndHash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return true;
  } catch (_) {
    return false;
  }
}

function productPage() {
  const raw = (window.location.hash || window.location.pathname.split('/')[1] || '').replace('#', '').toLowerCase();
  const key = raw.replace(/[^a-z0-9]/g, '');
  const aliases = { '': 'today', dashboard: 'today', aiguide: 'today', guide: 'today', setupassistant: 'today', firstrun: 'today', smart: 'today', hub: 'today', help: 'support', inbox: 'messages', message: 'messages', time: 'payroll', dispatch: 'workers', routes: 'workers', map: 'workers', accounting: 'xero', sync: 'xero' };
  const pages = ['today','command','jobs','clients','quotes','invoices','messages','team','payroll','workers','xero','settings','plans','support'];
  return aliases[key] || (pages.includes(key) ? key : 'today');
}

function ensureProductStyle() {
  if (document.getElementById(PRODUCT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PRODUCT_STYLE_ID;
  style.textContent = `
    .cvxProduct[data-product-version="v2"]{background:radial-gradient(circle at 0% -10%,rgba(242,102,34,.12),transparent 28%),linear-gradient(180deg,#f7f2e9 0%,#eee7dc 100%)!important}
    .cvxProduct[data-product-version="v2"] .cvxTop{min-height:68px!important;grid-template-columns:220px minmax(0,1fr) 160px!important;padding:12px 22px!important;background:linear-gradient(135deg,#0b0f0d 0%,#151a17 54%,#351707 100%)!important;box-shadow:0 10px 28px rgba(16,21,19,.22)!important}
    .cvxProduct[data-product-version="v2"] .cvxBrand i{width:30px!important;height:30px!important;border-radius:10px!important}.cvxProduct[data-product-version="v2"] .cvxBrand b{font-size:18px!important}.cvxProduct[data-product-version="v2"] .cvxTitle h1{font-size:25px!important;letter-spacing:-.05em!important}.cvxProduct[data-product-version="v2"] .cvxTitle p{margin-top:4px!important;max-width:850px!important;font-size:12px!important;line-height:1.25!important}
    .cvxProduct[data-product-version="v2"] .cvxNav{top:68px!important;padding:9px 22px!important;gap:7px!important;background:rgba(248,244,237,.95)!important}.cvxProduct[data-product-version="v2"] .cvxNav button{min-height:34px!important;padding:7px 12px!important;border-radius:12px!important;font-size:12px!important;white-space:nowrap}.cvxProduct[data-product-version="v2"] .cvxNav button.active{border-radius:14px!important}
    .cvxProduct[data-product-version="v2"] .cvxWorkspace{width:min(1540px,100%)!important;padding:16px 22px 26px!important}.cvxProduct[data-product-version="v2"] .cvxPage{gap:12px!important;padding-bottom:34px}
    .cvxProduct[data-product-version="v2"] .cvxHero{min-height:118px!important;grid-template-columns:minmax(0,1fr) minmax(250px,360px)!important;align-items:center!important;padding:18px 20px!important;border-radius:22px!important;border-left:5px solid #f26622!important;background:linear-gradient(135deg,rgba(14,18,16,.98),rgba(20,26,22,.96) 58%,rgba(89,32,10,.92))!important;box-shadow:0 14px 34px rgba(16,21,19,.14)!important}.cvxProduct[data-product-version="v2"] .cvxHero:after{width:170px!important;height:170px!important;right:-22px!important;top:-18px!important;opacity:.75!important}.cvxProduct[data-product-version="v2"] .cvxHero small{margin-bottom:7px!important;font-size:10px!important}.cvxProduct[data-product-version="v2"] .cvxHero h2{max-width:920px!important;font-size:clamp(25px,3.1vw,38px)!important;line-height:1!important}.cvxProduct[data-product-version="v2"] .cvxHero p{margin-top:8px!important;font-size:12px!important;line-height:1.35!important}
    .cvxProduct[data-product-version="v2"] .cvxHeroChips{grid-template-columns:1fr!important;gap:7px!important}.cvxProduct[data-product-version="v2"] .cvxHeroChips span{min-height:48px!important;padding:9px 12px!important;border-radius:14px!important}.cvxProduct[data-product-version="v2"] .cvxHeroChips b{font-size:17px!important}.cvxProduct[data-product-version="v2"] .cvxHeroChips small{font-size:9px!important}
    .cvxProduct[data-product-version="v2"] .cvxToolbar{margin-top:-2px!important;padding:8px!important;border-radius:17px!important;background:rgba(255,251,244,.72)!important}.cvxProduct[data-product-version="v2"] .cvxToolbar button,.cvxProduct[data-product-version="v2"] .cvxPanelHead button,.cvxProduct[data-product-version="v2"] .cvxRecordTop button,.cvxProduct[data-product-version="v2"] .cvxDrawerActions button{min-height:36px!important;padding:8px 12px!important;font-size:12px!important}
    .cvxProduct[data-product-version="v2"] .cvxKpis{gap:10px!important}.cvxProduct[data-product-version="v2"] .cvxKpis span{min-height:70px!important;padding:13px!important;border-radius:18px!important}.cvxProduct[data-product-version="v2"] .cvxKpis b{font-size:22px!important}
    .cvxProduct[data-product-version="v2"] .cvxPanel{min-height:145px!important;padding:14px!important;border-radius:20px!important;background:rgba(255,253,249,.96)!important;box-shadow:0 10px 25px rgba(16,21,19,.07)!important}.cvxProduct[data-product-version="v2"] .cvxPanel.dark{background:linear-gradient(135deg,#101513,#1d2621)!important}.cvxProduct[data-product-version="v2"] .cvxPanelHead{margin-bottom:10px!important}.cvxProduct[data-product-version="v2"] .cvxPanelHead h3{font-size:17px!important}
    .cvxProduct[data-product-version="v2"] .cvxList{gap:7px!important}.cvxProduct[data-product-version="v2"] .cvxList>.cvxEmpty:not(:only-child),.cvxProduct[data-product-version="v2"] .cvxTiles>.cvxEmpty:not(:only-child){display:none!important}.cvxProduct[data-product-version="v2"] .cvxRow{min-height:54px!important;grid-template-columns:8px minmax(0,1fr) auto!important;border-radius:14px!important;padding:9px 10px!important}.cvxProduct[data-product-version="v2"] .cvxRow b{font-size:13px!important}.cvxProduct[data-product-version="v2"] .cvxRow small{font-size:11px!important;line-height:1.25!important}.cvxProduct[data-product-version="v2"] .cvxRow em{padding:6px 8px!important;font-size:10px!important}
    .cvxProduct[data-product-version="v2"] .cvxRecordTop h3{font-size:22px!important}.cvxProduct[data-product-version="v2"] .cvxFormGrid{gap:9px!important}.cvxProduct[data-product-version="v2"] .cvxField input,.cvxProduct[data-product-version="v2"] .cvxField textarea,.cvxProduct[data-product-version="v2"] .cvxField select{min-height:39px!important;border-radius:12px!important;padding:8px 10px!important;font-size:13px!important}.cvxProduct[data-product-version="v2"] .cvxPipeline{gap:10px!important}.cvxProduct[data-product-version="v2"] .cvxPipeline>div{min-height:220px!important;border-radius:18px!important;padding:13px!important}.cvxProduct[data-product-version="v2"] .cvxTiles button{min-height:96px!important;border-radius:16px!important}.cvxProduct[data-product-version="v2"] .cvxMoney b{font-size:34px!important}.cvxProduct[data-product-version="v2"] .cvxEmpty{border-radius:14px!important;padding:13px!important}
    .cvxProduct .cvxRow:focus-visible,.cvxProduct .cvxTiles button:focus-visible,.cvxProduct button:focus-visible{outline:3px solid rgba(242,102,34,.34);outline-offset:2px}
    @media(max-width:900px){.cvxProduct[data-product-version="v2"] .cvxTop{grid-template-columns:1fr!important;min-height:102px!important;gap:6px!important}.cvxProduct[data-product-version="v2"] .cvxNav{top:102px!important}.cvxProduct[data-product-version="v2"] .cvxHero{grid-template-columns:1fr!important}}
  `;
  document.head.appendChild(style);
}

function normalisePathAliases() {
  const path = window.location.pathname || '';
  const aliases = { '/help': '/dashboard#support', '/support': '/dashboard#support', '/support-board': '/dashboard#support', '/messages': '/dashboard#messages', '/messages-board': '/dashboard#messages', '/inbox': '/dashboard#messages', '/payroll': '/dashboard#payroll', '/payroll-board': '/dashboard#payroll', '/smart-hub': '/dashboard#today', '/guide': '/dashboard#today', '/ai-guide': '/dashboard#today', '/aiguide': '/dashboard#today', '/command': '/dashboard#command', '/command-desk': '/dashboard#command', '/command-board': '/dashboard#command', '/reports': '/dashboard#invoices', '/reports-board': '/dashboard#invoices', '/dispatch': '/dashboard#workers', '/dispatch-board': '/dashboard#workers', '/schedule': '/dashboard#workers', '/calendar': '/dashboard#workers' };
  const target = aliases[path];
  return Boolean(target && replaceUrl(target));
}

function normaliseFreshHash() {
  if (normalisePathAliases()) return true;
  const path = window.location.pathname || '';
  if (!path.startsWith('/dashboard') && !path.startsWith('/setup')) return false;
  const raw = (window.location.hash || '').replace('#', '').toLowerCase();
  const aliases = { '': 'today', aiguide: 'today', guide: 'today', setupassistant: 'today', firstrun: 'today', smart: 'today', hub: 'today', dispatch: 'workers', despatch: 'workers', schedule: 'workers', calendar: 'workers', map: 'workers', reports: 'invoices', report: 'invoices', support: 'support', help: 'support', command: 'command', 'command-desk': 'command', 'command-board': 'command', payroll: 'payroll', messages: 'messages', inbox: 'messages' };
  const target = aliases[raw];
  if (!target || target === raw) return false;
  return replaceUrl(`/dashboard#${target}`);
}

function ownerToast(message) {
  let node = document.getElementById('churvox-owner-action-toast');
  if (!node) {
    node = document.createElement('div');
    node.id = 'churvox-owner-action-toast';
    node.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:999999;border-radius:14px;padding:12px 14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.22);font:900 13px Inter,system-ui,sans-serif;pointer-events:none';
    document.body.appendChild(node);
  }
  node.textContent = message;
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.remove(), 1700);
}

function handleOwnerShortcutClick(event) {
  const button = event.target?.closest?.('button');
  if (!button) return false;
  if (!button.closest?.('.cvxProduct') && !button.closest?.('.churvoxOptionC')) return false;
  const label = String(button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!label) return false;
  if (/^email support$|^contact support$|^hello@churvox\.com$/.test(label)) { event.preventDefault(); event.stopPropagation(); window.location.href = 'mailto:hello@churvox.com'; return true; }
  const hashRoutes = [[/today|smart hub|ai guide|guide|setup guide|home|dashboard/, 'today'], [/jobs board|job board|recurring/, 'jobs'], [/dispatch|workers|open map|worker jobs|timesheets/, 'workers'], [/payroll|weekly|fortnightly|monthly/, 'payroll'], [/xero|myob|accounting|sync|export pack|refresh status/, 'xero'], [/current plan|usage|manage billing|checkout|plans/, 'plans'], [/messages|inbox|worker messages|client replies/, 'messages'], [/open command|command|approval/, 'command'], [/settings|branding|security|gst/, 'settings'], [/support|setup help|guides/, 'support']];
  for (const [pattern, hash] of hashRoutes) { if (pattern.test(label)) { event.preventDefault(); event.stopPropagation(); replaceUrl(`/dashboard#${hash}`); return true; } }
  if (/csv import|export/.test(label)) { ownerToast(label.includes('import') ? 'CSV import control ready.' : 'Export control ready.'); return false; }
  return false;
}

function cleanVisibleTextNode(text) {
  return String(text || '')
    .replace(/\b(Live Worker View Proof|Live GPS Proof|Worker App Test Job|Worker Timer Proof|Timer Proof|QA FLOW JOB|Playwright Test Customer)\b/gi, (m) => m.toLowerCase().includes('gps') ? 'GPS proof' : m.toLowerCase().includes('worker app') ? 'Worker app job' : m.toLowerCase().includes('timer') ? 'Timer check' : m.toLowerCase().includes('qa') ? 'QA job' : m.toLowerCase().includes('playwright') ? 'Test customer' : 'Job proof')
    .replace(/\bDeep Logic Client\b/gi, 'Client')
    .replace(/\bFinal Smoke Client\b/gi, 'Client')
    .replace(/\b2026\d{8,}\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+[-·]\s*$/g, '')
    .trim();
}

function cleanRecordText() {
  document.querySelectorAll('.cvxProduct[data-product-version="v2"] .cvxRow b,.cvxProduct[data-product-version="v2"] .cvxRow small,.cvxProduct[data-product-version="v2"] .cvxRecordTop h3').forEach((node) => {
    const cleaned = cleanVisibleTextNode(node.textContent);
    if (cleaned && cleaned !== node.textContent) node.textContent = cleaned;
  });
}

function markProductPage() { if (document.body) document.body.dataset.cvxPage = productPage(); }
function runAliases() { ensureProductStyle(); normaliseFreshHash(); markProductPage(); setTimeout(cleanRecordText, 30); }

if (typeof window !== 'undefined' && !window.__CHURVOX_ROUTE_ALIAS_RUNTIME__) {
  window.__CHURVOX_ROUTE_ALIAS_RUNTIME__ = true;
  runAliases();
  window.addEventListener('load', () => setTimeout(runAliases, 80));
  window.addEventListener('hashchange', () => setTimeout(runAliases, 40));
  window.addEventListener('popstate', () => setTimeout(runAliases, 40));
  document.addEventListener('click', (event) => { handleOwnerShortcutClick(event); setTimeout(runAliases, 80); }, true);
  setInterval(cleanRecordText, 2500);
}

export {};
