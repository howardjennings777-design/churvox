// Cleans customer-facing marketing wording without touching forms.

function cleanMarketingText() {
  if (typeof document === 'undefined') return;
  const root = document.querySelector('.publicSite');
  if (!root) return;

  const replacements = [
    ['Product workbench', 'Churvox control'],
    ['Smart admin scan', 'Churvox checks'],
    ['Smart Admin Audit', 'Churvox checks'],
    ['AI review item', 'Admin review'],
    ['AI filled', 'Churvox filled'],
    ['Build the run sheet', 'Run the job sheet'],
    ['build the run sheet', 'run the job sheet'],
    ['Built for service businesses', 'Made for service businesses'],
    ['Built for service businesses that move fast', 'Made for service businesses that move fast'],
    ['Demo account', 'Trial account'],
    ['Test account', 'Trial account'],
    ['Test customer', 'Customer'],
    ['Coming soon', 'Planned'],
    ['coming soon', 'planned'],
    ['Placeholder', 'Needs detail'],
    ['placeholder', 'needs detail'],
    ['Mockup', 'Preview'],
    ['mockup', 'preview'],
    ['Beta version', 'Trial version'],
    ['beta version', 'trial version'],
    ['Playwright', 'System'],
  ];

  const clean = (value) => {
    let next = String(value || '');
    replacements.forEach(([from, to]) => { next = next.split(from).join(to); });
    return next.replace(/\s{2,}/g, ' ').replace(/\s+([.,:;!?])/g, '$1');
  };

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const parent = node.parentElement;
    if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE'].includes(parent.tagName)) return;
    const next = clean(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  });
}

if (typeof window !== 'undefined' && !window.__CHURVOX_MARKETING_COPY_CLEANER__) {
  window.__CHURVOX_MARKETING_COPY_CLEANER__ = true;
  cleanMarketingText();
  window.addEventListener('load', () => setTimeout(cleanMarketingText, 120));
  window.addEventListener('popstate', () => setTimeout(cleanMarketingText, 120));
  window.addEventListener('hashchange', () => setTimeout(cleanMarketingText, 120));
  setTimeout(cleanMarketingText, 500);
  setInterval(cleanMarketingText, 2500);
}

export {};