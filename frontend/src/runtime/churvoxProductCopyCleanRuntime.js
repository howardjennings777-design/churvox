// Final visible-copy cleaner for the owner product.
// Removes build/dev/test language and old seeded proof wording from live Churvox pages, slips and forms.

const STYLE_ID = 'churvox-product-copy-clean-style';

const TEXT_REPLACEMENTS = [
  [/\bLive Worker View Proof\s*20\d{10,}\b/gi, 'Worker job'],
  [/\bLive Worker View Proof\b/gi, 'Worker job'],
  [/\bLive GPS Proof Client\b/gi, 'Client'],
  [/\bLive GPS Proof\s*20\d{10,}\b/gi, 'Worker'],
  [/\bLive GPS Proof\b/gi, 'Worker'],
  [/\bWorker App Check Job\s*20\d{10,}\b/gi, 'Worker app job'],
  [/\bWorker App Check Job\b/gi, 'Worker app job'],
  [/\bWorker Timer Proof\s*20\d{10,}\b/gi, 'Timer job'],
  [/\bWorker Timer Proof\b/gi, 'Timer job'],
  [/\bTimer Proof\s*20\d{10,}\b/gi, 'Timer job'],
  [/\bTimer Proof\b/gi, 'Timer job'],
  [/\bQA FLOW JOB\b/gi, 'Job'],
  [/\bPlaywright Test Customer\b/gi, 'Customer'],
  [/\bDeep Logic Client\b/gi, 'Client'],
  [/\bFinal Smoke Client\b/gi, 'Client'],
  [/\bSafe to delete\.?\b/gi, 'Owner note ready.'],
  [/\bproof job\b/gi, 'job'],
  [/\bProof\b/g, 'Record'],
  [/\bproof\b/g, 'record'],
  [/\b20\d{10,}\b/g, ''],
  [/\bProduct workbench\b/gi, 'Churvox control'],
  [/\bSmart admin scan\b/gi, 'Churvox checks'],
  [/\bSmart Admin Audit\b/gi, 'Churvox checks'],
  [/\bSmart audit\b/gi, 'Churvox check'],
  [/\bAI review item\b/gi, 'Admin review'],
  [/\bAI missing-info fill\b/gi, 'Churvox info check'],
  [/\bAI fill watching\b/gi, 'Churvox is checking records'],
  [/\bAI filled\b/gi, 'Churvox filled'],
  [/\bAI routed unresolved item\b/gi, 'Churvox sent item to Command'],
  [/\bAI\b/g, 'Churvox'],
  [/\bBuild the run sheet\b/gi, 'Run the job sheet'],
  [/\bbuild the run sheet\b/gi, 'run the job sheet'],
  [/\bBuild\b/g, 'Run'],
  [/\bbuild\b/g, 'run'],
  [/\bDead buttons\b/gi, 'Clear actions'],
  [/\bdead buttons\b/gi, 'clear actions'],
  [/\bdead button\b/gi, 'inactive control'],
  [/\bRuntime\b/g, ''],
  [/\bruntime\b/g, ''],
  [/\bLaunch audit\b/gi, 'Product check'],
  [/\blaunch audit\b/gi, 'product check'],
  [/\bAudit\b/g, 'Check'],
  [/\baudit\b/g, 'check'],
  [/\bLaunch\b/g, 'Product'],
  [/\blaunch\b/g, 'product'],
  [/\bE2E\b/g, 'Full flow'],
  [/\bPlaywright\b/g, 'System'],
  [/\bTest Customer\b/g, 'Customer'],
  [/\btest customer\b/g, 'customer'],
  [/\bTest\b/g, 'Check'],
  [/\btest\b/g, 'check'],
  [/\bDemo\b/g, 'Example'],
  [/\bdemo\b/g, 'example'],
  [/\bPlaceholder\b/g, 'Needs detail'],
  [/\bplaceholder\b/g, 'needs detail'],
  [/\bMock\b/g, 'Draft'],
  [/\bmock\b/g, 'draft'],
  [/\bSeed\b/g, 'Saved'],
  [/\bseed\b/g, 'saved'],
  [/\bBeta\b/g, 'Trial'],
  [/\bbeta\b/g, 'trial'],
  [/\bDebug\b/g, 'Check'],
  [/\bdebug\b/g, 'check'],
  [/\bConsole\b/g, 'System'],
  [/\bconsole\b/g, 'system'],
  [/\s{2,}/g, ' '],
  [/\s+([.,:;!?])/g, '$1'],
];

const SELECTORS = [
  '.cvxProduct',
  '.cvxProductControlLayer',
  '.cvxSmartAuditLayer',
  '.recordWorkspacePopupOverlay',
  '.recordWorkspacePopupBackdrop',
  '.cvxDrawerLayer',
  '.cvxDrawer',
  '.properSlipLayer',
  '.properSlip',
  '.cocDrawerLayer',
  '.cocDrawer',
  '[role="dialog"]',
];

const css = `
  .cvxBuildWordHidden { display: none !important; }

  .cvxProduct[data-product-version="v2"] .cvxDrawerClose,
  .cvxProduct[data-product-version="v2"] [data-cvx-close-control],
  .cvxProduct[data-product-version="v2"] [data-cvx-smart-close],
  .cvxProductControlClose,
  .cvxSmartAuditClose {
    width: auto !important;
    max-width: max-content !important;
    min-width: 62px !important;
    justify-self: end !important;
    align-self: start !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .cvxProduct[data-product-version="v2"] .cvxDrawerHead,
  .cvxSmartAuditSlipHead,
  .cvxProductControlHead {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto !important;
    gap: 10px !important;
    align-items: start !important;
  }
`;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  } else if (style.textContent !== css) {
    style.textContent = css;
  }
  if (style.parentNode === document.head && document.head.lastElementChild !== style) document.head.appendChild(style);
}

function cleanText(value) {
  let next = String(value ?? '');
  TEXT_REPLACEMENTS.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement);
  });
  next = next.replace(/\s{2,}/g, ' ').replace(/\s+([.,:;!?])/g, '$1').trim();
  return next === '' && String(value ?? '').trim() !== '' ? String(value ?? '') : next;
}

function shouldSkip(node) {
  const parent = node?.parentElement;
  if (!parent) return true;
  const tag = parent.tagName;
  if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE'].includes(tag)) return true;
  if (parent.closest('[data-cvx-copy-clean-skip]')) return true;
  return false;
}

function cleanTextNodes(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (shouldSkip(node)) return NodeFilter.FILTER_REJECT;
      if (!/Live Worker View Proof|Live GPS Proof|Worker App Check Job|Worker Timer Proof|Timer Proof|QA FLOW JOB|Playwright Test Customer|Deep Logic Client|Final Smoke Client|Safe to delete|20\d{10,}|Product workbench|Smart admin scan|Smart Admin Audit|Smart audit|AI\b|Build|build|dead button|Runtime|runtime|Audit|audit|Launch|launch|E2E|Playwright|Test|test|Demo|demo|Placeholder|placeholder|Mock|mock|Seed|seed|Beta|beta|Debug|debug|Console|console/.test(node.nodeValue || '')) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const cleaned = cleanText(node.nodeValue);
    if (cleaned !== node.nodeValue) node.nodeValue = cleaned;
  });
}

function cleanFormValues(root) {
  if (!root) return;
  root.querySelectorAll('input, textarea, option, button, [aria-label], [title], [placeholder]').forEach((node) => {
    if (node.matches('input, textarea')) {
      const cleaned = cleanText(node.value);
      if (cleaned !== node.value) {
        node.value = cleaned;
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    if (node.matches('option')) {
      const cleaned = cleanText(node.textContent);
      if (cleaned !== node.textContent) node.textContent = cleaned;
    }
    ['aria-label', 'title', 'placeholder'].forEach((attr) => {
      if (!node.hasAttribute?.(attr)) return;
      const value = node.getAttribute(attr);
      const cleaned = cleanText(value);
      if (cleaned !== value) node.setAttribute(attr, cleaned);
    });
  });
}

function cleanVisibleCopy() {
  ensureStyle();
  const roots = new Set();
  SELECTORS.forEach((selector) => document.querySelectorAll(selector).forEach((node) => roots.add(node)));
  roots.forEach((root) => {
    cleanTextNodes(root);
    cleanFormValues(root);
  });
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PRODUCT_COPY_CLEAN_RUNTIME__) {
  window.__CHURVOX_PRODUCT_COPY_CLEAN_RUNTIME__ = true;
  cleanVisibleCopy();
  window.addEventListener('load', () => setTimeout(cleanVisibleCopy, 100));
  window.addEventListener('hashchange', () => setTimeout(cleanVisibleCopy, 120));
  window.addEventListener('popstate', () => setTimeout(cleanVisibleCopy, 120));
  document.addEventListener('click', () => setTimeout(cleanVisibleCopy, 160), true);
  const observer = new MutationObserver(() => setTimeout(cleanVisibleCopy, 80));
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setTimeout(cleanVisibleCopy, 450);
  setTimeout(cleanVisibleCopy, 1300);
  setInterval(cleanVisibleCopy, 2500);
}

export {};