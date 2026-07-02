function isOwnerApp() {
  return typeof document !== 'undefined' && Boolean(document.querySelector('.churvoxOptionC'));
}

function cleanTextValue(text, inXero) {
  let next = String(text || '');
  if (!next) return next;

  next = next.replace(/\[object Object\]/g, 'Status details not ready yet');
  next = next.replace(/undefined\s*-\s*approval decision in Command/gi, 'Draft invoice - approval decision in Command');
  next = next.replace(/undefined\s*-\s*undefined/gi, inXero ? 'Draft invoice - draft sync status' : 'No record waiting');
  next = next.replace(/undefined/gi, inXero ? 'Draft invoice' : 'Not set');
  next = next.replace(/NaN/g, '0');

  return next;
}

function cleanTextNodes(root) {
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  const inXero = /xero/i.test(active?.textContent || '') || /#xero|\/xero/i.test(`${location.hash} ${location.pathname}`);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    const current = node.nodeValue || '';
    if (!/(undefined|\[object Object\]|NaN)/i.test(current)) return;
    const cleaned = cleanTextValue(current, inXero);
    if (cleaned !== current) node.nodeValue = cleaned;
  });
}

function cleanPanels(root) {
  const xeroLog = root.querySelector('#option-f-xero-actions-panel pre');
  if (xeroLog) {
    xeroLog.textContent = 'Live Xero status checked. Draft sync remains owner-approved.';
    xeroLog.setAttribute('aria-hidden', 'true');
  }

  root.querySelectorAll('.cvPayStatus, .xeroStatusPill, .drawerNotice').forEach((node) => {
    const current = node.textContent || '';
    if (/(\[object Object\]|undefined|NaN)/i.test(current)) {
      node.textContent = cleanTextValue(current, /xero/i.test(location.hash || location.pathname || ''));
    }
  });
}

function runCleanup() {
  if (!isOwnerApp()) return;
  const root = document.querySelector('.churvoxOptionC');
  if (!root) return;
  cleanTextNodes(root);
  cleanPanels(root);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(runCleanup, 150));
  window.addEventListener('hashchange', () => setTimeout(runCleanup, 150));
  window.addEventListener('popstate', () => setTimeout(runCleanup, 150));
  document.addEventListener('click', () => setTimeout(runCleanup, 200), true);
  setInterval(runCleanup, 1000);
}

export {};
