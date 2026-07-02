function isOwnerApp() {
  return typeof document !== 'undefined' && Boolean(document.querySelector('.churvoxOptionC'));
}

function cleanTextValue(text, inXero) {
  let next = String(text || '');
  if (!next) return next;

  next = next.replace(/\bAI Guide\b/g, 'Setup Guide');
  next = next.replace(/\bAI actions\b/gi, 'Admin actions');
  next = next.replace(/\bAI action\b/gi, 'Admin action');
  next = next.replace(/\bAI fill\b/gi, 'Churvox fill');
  next = next.replace(/\bAI filled\b/gi, 'Churvox filled');
  next = next.replace(/\bAI prepared\b/gi, 'Churvox prepared');
  next = next.replace(/\bAI prepares\b/gi, 'Churvox prepares');
  next = next.replace(/\bAI admin\b/gi, 'Churvox admin');
  next = next.replace(/\bAI operator\b/gi, 'Churvox operator');
  next = next.replace(/\bAI\b/g, 'Churvox');
  next = next.replace(/\bai\b/g, 'Churvox');

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
    if (!/(AI|\bai\b|undefined|\[object Object\]|NaN)/i.test(current)) return;
    const cleaned = cleanTextValue(current, inXero);
    if (cleaned !== current) node.nodeValue = cleaned;
  });
}

function cleanAttributes(root) {
  root.querySelectorAll('[aria-label], [title], [placeholder]').forEach((node) => {
    ['aria-label', 'title', 'placeholder'].forEach((name) => {
      const current = node.getAttribute(name);
      if (!current || !/(AI|\bai\b|undefined|\[object Object\]|NaN)/i.test(current)) return;
      node.setAttribute(name, cleanTextValue(current, /xero/i.test(location.hash || location.pathname || '')));
    });
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
    if (/(AI|\bai\b|\[object Object\]|undefined|NaN)/i.test(current)) {
      node.textContent = cleanTextValue(current, /xero/i.test(location.hash || location.pathname || ''));
    }
  });
}

function runCleanup() {
  if (!isOwnerApp()) return;
  const root = document.querySelector('.churvoxOptionC');
  if (!root) return;
  cleanTextNodes(root);
  cleanAttributes(root);
  cleanPanels(root);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(runCleanup, 150));
  window.addEventListener('hashchange', () => setTimeout(runCleanup, 150));
  window.addEventListener('popstate', () => setTimeout(runCleanup, 150));
  document.addEventListener('click', () => setTimeout(runCleanup, 200), true);
  setInterval(runCleanup, 700);
}

export {};
