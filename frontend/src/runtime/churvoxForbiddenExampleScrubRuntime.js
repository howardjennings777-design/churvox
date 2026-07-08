const FLAG = '__CHURVOX_FORBIDDEN_EXAMPLE_SCRUB_RUNTIME_SAFE__';
const BLOCKED = 'ECB Property Maintenance';
const REPLACEMENT = 'Local Property Services';

function replaceText(value) {
  return typeof value === 'string' && value.includes(BLOCKED) ? value.replaceAll(BLOCKED, REPLACEMENT) : value;
}

function scrubElement(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
  ['placeholder', 'value', 'title', 'aria-label', 'alt'].forEach((attr) => {
    const value = node.getAttribute?.(attr);
    const next = replaceText(value);
    if (next !== value) node.setAttribute(attr, next);
  });
  Array.from(node.childNodes || []).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const next = replaceText(child.nodeValue);
      if (next !== child.nodeValue) child.nodeValue = next;
    }
  });
}

function scrubVisibleExamples() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('input,textarea,[placeholder],article,section,span,p,h1,h2,h3,small,div').forEach((node) => {
    if (String(node.textContent || node.getAttribute?.('placeholder') || '').includes(BLOCKED)) scrubElement(node);
  });
}

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  const run = () => window.requestIdleCallback ? window.requestIdleCallback(scrubVisibleExamples, { timeout: 1200 }) : window.setTimeout(scrubVisibleExamples, 900);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('churvox-owner-app-ready', run);
}

export {};
