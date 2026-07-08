const FLAG = '__CHURVOX_FORBIDDEN_EXAMPLE_SCRUB_RUNTIME__';
const BLOCKED = 'ECB Property Maintenance';
const REPLACEMENT = 'Local Property Services';

function replaceInTextNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  if (node.nodeValue && node.nodeValue.includes(BLOCKED)) node.nodeValue = node.nodeValue.replaceAll(BLOCKED, REPLACEMENT);
}

function scrubAttributes(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
  ['placeholder', 'value', 'title', 'aria-label', 'alt'].forEach((attr) => {
    const value = node.getAttribute?.(attr);
    if (value && value.includes(BLOCKED)) node.setAttribute(attr, value.replaceAll(BLOCKED, REPLACEMENT));
  });
}

function scrub(root = document.body) {
  if (typeof document === 'undefined' || !root) return;
  scrubAttributes(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode;
  while (node) {
    replaceInTextNode(node);
    scrubAttributes(node);
    node = walker.nextNode();
  }
}

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scrub(), { once: true });
  else scrub();
  window.addEventListener('load', () => scrub());
  window.addEventListener('churvox-owner-app-ready', () => scrub());
  window.addEventListener('churvox:data-refresh', () => scrub());
  [100, 500, 1500, 4000].forEach((delay) => window.setTimeout(() => scrub(), delay));
  try {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes?.forEach((node) => scrub(node));
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch {}
}

export {};
