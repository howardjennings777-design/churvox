// PHASE_4E_WORKHORSE_REMAINING_PAGE_NAMES
// Runtime safety pass: keeps the new Workhorse names visible while the full component rewrite continues.
const workhorsePageNames = [
  'Job Control Board',
  'Clients',
  'Invoice Forge',
  'Quotes',
  'Field Workbench',
  'Automation',
  'Reports',
  'Settings',
  'Dispatch',
  'Notifications',
  'Integrations',
  'SMS Desk',
  'Plans',
];

const replacements = new Map([
  ['Jobs & Dispatch', 'Job Control Board'],
  ['Clients', 'Clients'],
  ['Customer Hub', 'Clients'],
  ['Client CRM', 'Clients'],
  ['Invoices', 'Invoice Forge'],
  ['Invoice Studio', 'Invoice Forge'],
  ['Money Desk', 'Invoice Forge'],
  ['Quotes', 'Quotes'],
  ['Quote Studio', 'Quotes'],
  ['My Jobs', 'Field Workbench'],
  ['Today\'s Work', 'Field Workbench'],
  ['Assigned Jobs', 'Assigned Work'],
  ['Automation', 'Automation'],
  ['Reports', 'Reports'],
  ['Settings', 'Settings'],
  ['Dispatch', 'Dispatch'],
  ['Notifications', 'Notifications'],
  ['Integrations', 'Integrations'],
  ['SMS', 'SMS Desk'],
  ['Plans', 'Plans'],
  ['Pricing', 'Plans'],
]);

const replaceNodeText = (node) => {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const original = node.nodeValue;
  const trimmed = String(original || '').trim();
  const next = replacements.get(trimmed);
  if (next) node.nodeValue = original.replace(trimmed, next);
};

const applyWorkhorseNames = () => {
  if (typeof document === 'undefined') return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(replaceNodeText);
};

if (typeof window !== 'undefined') {
  window.__CHURVOX_WORKHORSE_PAGE_NAMES__ = workhorsePageNames;
  window.requestAnimationFrame(applyWorkhorseNames);
  window.setTimeout(applyWorkhorseNames, 400);
  window.setTimeout(applyWorkhorseNames, 1200);
  const observer = new MutationObserver(() => applyWorkhorseNames());
  window.addEventListener('DOMContentLoaded', () => {
    applyWorkhorseNames();
    if (document.body) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
}

export default workhorsePageNames;
