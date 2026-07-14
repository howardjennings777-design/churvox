const FLAG = '__CHURVOX_CUSTOMER_WORDING_GUARD__';

const EXACT_REPLACEMENTS = [
  ['ECB Property Maintenance', 'Property Services'],
  ['Focus Landscaping', 'Landscaping Services'],
  ['Command desk · owner approval · hidden build', 'Command desk · owner approval required'],
  ['Command desk · hidden build · owner approval locked', 'Command desk · owner approval required'],
  ['Build Map', 'Owner controls'],
  ['Build map', 'Owner controls'],
  ['Demo preview', 'Product preview'],
  ['Demo mode', 'Preview'],
  ['lab preview', 'this workspace'],
  ['Live Admin Brain', 'Churvox'],
  ['Admin Brain', 'Churvox'],
  ['Live scan', 'Business check'],
  ['live scan', 'business check'],
  ['Showing sample layout', 'Current records could not be confirmed'],
  ['sample layout', 'current workspace'],
  ['Sample business', 'Preview workspace'],
  ['sample records', 'preview records'],
  ['Test connection', 'Check connection'],
  ['test connection', 'check connection'],
  ['Test mode', 'Check mode'],
  ['test mode', 'check mode'],
  ['API response', 'connection response'],
  ['API error', 'connection error'],
  ['backend error', 'service error'],
  ['frontend error', 'page error'],
  ['deployment status', 'update status'],
  ['build version', 'system details'],
  ['build number', 'system details'],
  ['build status', 'system status'],
  ['release marker', 'system status'],
  ['debug information', 'support information'],
  ['diagnostic information', 'system information'],
];

const REMOVED_ATTRIBUTES = ['data-version', 'data-build', 'data-build-id', 'data-deploy', 'data-deployment', 'data-marker', 'data-release'];
const TEXT_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt'];

function replaceKnownWording(value) {
  if (typeof value !== 'string' || !value) return value;
  return EXACT_REPLACEMENTS.reduce((text, [blocked, replacement]) => text.includes(blocked) ? text.replaceAll(blocked, replacement) : text, value);
}

function scrubTextNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE || !node.nodeValue) return;
  const next = replaceKnownWording(node.nodeValue);
  if (next !== node.nodeValue) node.nodeValue = next;
}

function scrubElement(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
  if (node.matches?.('[data-cv-allow-verbatim="true"]')) return;

  REMOVED_ATTRIBUTES.forEach((attr) => node.removeAttribute?.(attr));
  TEXT_ATTRIBUTES.forEach((attr) => {
    const value = node.getAttribute?.(attr);
    const next = replaceKnownWording(value);
    if (next !== value) node.setAttribute(attr, next);
  });

  Array.from(node.childNodes || []).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) scrubTextNode(child);
    else if (child.nodeType === Node.ELEMENT_NODE) scrubTree(child);
  });
}

function scrubTree(root = document.body) {
  if (!root || typeof Node === 'undefined') return;
  if (root.nodeType === Node.TEXT_NODE) scrubTextNode(root);
  else if (root.nodeType === Node.ELEMENT_NODE) scrubElement(root);
}

function startGuard() {
  if (typeof document === 'undefined' || !document.body) return;
  scrubTree(document.body);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') scrubTextNode(mutation.target);
      mutation.addedNodes.forEach((node) => scrubTree(node));
      if (mutation.type === 'attributes') scrubElement(mutation.target);
    });
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...REMOVED_ATTRIBUTES, ...TEXT_ATTRIBUTES],
  });
}

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startGuard, { once: true });
  else startGuard();
}

export {};
