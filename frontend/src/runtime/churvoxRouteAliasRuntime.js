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
  const aliases = {
    '': 'today',
    dashboard: 'today',
    aiguide: 'today',
    guide: 'today',
    setupassistant: 'today',
    firstrun: 'today',
    smart: 'today',
    hub: 'today',
    help: 'support',
    inbox: 'messages',
    message: 'messages',
    time: 'payroll',
    dispatch: 'workers',
    routes: 'workers',
    map: 'workers',
    accounting: 'xero',
    sync: 'xero',
  };
  const pages = ['today','command','jobs','clients','quotes','invoices','messages','team','payroll','workers','xero','settings','plans','support'];
  return aliases[key] || (pages.includes(key) ? key : 'today');
}

function ensureProductStyle() {
  if (document.getElementById(PRODUCT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PRODUCT_STYLE_ID;
  style.textContent = `
    .cvxProduct .cvxPanel,.cvxProduct .cvxHero,.cvxProduct .cvxKpis span,.cvxProduct .cvxPlans article,.cvxProduct .cvxTiles button{animation:cvxSettle .18s ease-out both}
    @keyframes cvxSettle{from{opacity:.88;transform:translateY(4px)}to{opacity:1;transform:none}}
    .cvxProduct .cvxPage{padding-bottom:34px}
    .cvxProduct .cvxNav button{white-space:nowrap}
    .cvxProduct .cvxPanelHead button:empty{display:none!important}
    .cvxProduct .cvxList > .cvxEmpty:not(:only-child){display:none!important}
    .cvxProduct .cvxTiles > .cvxEmpty:not(:only-child){display:none!important}
    .cvxProduct .cvxRow:focus-visible,.cvxProduct .cvxTiles button:focus-visible,.cvxProduct button:focus-visible{outline:3px solid rgba(242,102,34,.34);outline-offset:2px}
  `;
  document.head.appendChild(style);
}

function normalisePathAliases() {
  const path = window.location.pathname || '';
  const aliases = {
    '/help': '/dashboard#support',
    '/support': '/dashboard#support',
    '/support-board': '/dashboard#support',
    '/messages': '/dashboard#messages',
    '/messages-board': '/dashboard#messages',
    '/inbox': '/dashboard#messages',
    '/payroll': '/dashboard#payroll',
    '/payroll-board': '/dashboard#payroll',
    '/smart-hub': '/dashboard#today',
    '/guide': '/dashboard#today',
    '/ai-guide': '/dashboard#today',
    '/aiguide': '/dashboard#today',
    '/command': '/dashboard#command',
    '/command-desk': '/dashboard#command',
    '/command-board': '/dashboard#command',
    '/reports': '/dashboard#invoices',
    '/reports-board': '/dashboard#invoices',
    '/dispatch': '/dashboard#workers',
    '/dispatch-board': '/dashboard#workers',
    '/schedule': '/dashboard#workers',
    '/calendar': '/dashboard#workers',
  };
  const target = aliases[path];
  return Boolean(target && replaceUrl(target));
}

function normaliseFreshHash() {
  if (normalisePathAliases()) return true;
  const path = window.location.pathname || '';
  if (!path.startsWith('/dashboard') && !path.startsWith('/setup') && !path.startsWith('/plans')) return false;

  const raw = (window.location.hash || '').replace('#', '').toLowerCase();
  const aliases = {
    '': 'today',
    aiguide: 'today',
    guide: 'today',
    setupassistant: 'today',
    firstrun: 'today',
    smart: 'today',
    hub: 'today',
    dispatch: 'workers',
    despatch: 'workers',
    schedule: 'workers',
    calendar: 'workers',
    map: 'workers',
    reports: 'invoices',
    report: 'invoices',
    support: 'support',
    help: 'support',
    command: 'command',
    'command-desk': 'command',
    'command-board': 'command',
    payroll: 'payroll',
    messages: 'messages',
    inbox: 'messages',
  };
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

  if (/^email support$|^contact support$|^hello@churvox\.com$/.test(label)) {
    event.preventDefault();
    event.stopPropagation();
    window.location.href = 'mailto:hello@churvox.com';
    return true;
  }

  const hashRoutes = [
    [/today|smart hub|ai guide|guide|setup guide|home|dashboard/, 'today'],
    [/jobs board|job board|recurring/, 'jobs'],
    [/dispatch|workers|open map|worker jobs|timesheets/, 'workers'],
    [/payroll|weekly|fortnightly|monthly/, 'payroll'],
    [/xero|myob|accounting|sync|export pack|refresh status/, 'xero'],
    [/current plan|usage|manage billing|checkout|plans/, 'plans'],
    [/messages|inbox|worker messages|client replies/, 'messages'],
    [/open command|command|approval/, 'command'],
    [/settings|branding|security|gst/, 'settings'],
    [/support|setup help|guides/, 'support'],
  ];

  for (const [pattern, hash] of hashRoutes) {
    if (pattern.test(label)) {
      event.preventDefault();
      event.stopPropagation();
      replaceUrl(`/dashboard#${hash}`);
      return true;
    }
  }

  if (/csv import|export/.test(label)) {
    ownerToast(label.includes('import') ? 'CSV import control ready.' : 'Export control ready.');
    return false;
  }

  return false;
}

function markProductPage() {
  if (!document.body) return;
  document.body.dataset.cvxPage = productPage();
}

function runAliases() {
  ensureProductStyle();
  normaliseFreshHash();
  markProductPage();
}

if (typeof window !== 'undefined' && !window.__CHURVOX_ROUTE_ALIAS_RUNTIME__) {
  window.__CHURVOX_ROUTE_ALIAS_RUNTIME__ = true;
  runAliases();
  window.addEventListener('load', () => setTimeout(runAliases, 80));
  window.addEventListener('hashchange', () => setTimeout(runAliases, 40));
  window.addEventListener('popstate', () => setTimeout(runAliases, 40));
  document.addEventListener('click', (event) => {
    handleOwnerShortcutClick(event);
    setTimeout(runAliases, 80);
  }, true);
}

export {};
