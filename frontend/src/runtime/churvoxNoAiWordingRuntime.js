function replaceAiWording(text) {
  let next = String(text || '');
  if (!next) return next;

  next = next.replace(/\bAI Guide\b/g, 'Setup Guide');
  next = next.replace(/\bAI actions\b/gi, 'Admin actions');
  next = next.replace(/\bAI action\b/gi, 'Admin action');
  next = next.replace(/\bAI operator\b/gi, 'Churvox operator');
  next = next.replace(/\bAI admin\b/gi, 'Churvox admin');
  next = next.replace(/\bAI assistant\b/gi, 'Churvox assistant');
  next = next.replace(/\bAI generated\b/gi, 'Churvox prepared');
  next = next.replace(/\bAI prepared\b/gi, 'Churvox prepared');
  next = next.replace(/\bAI prepares\b/gi, 'Churvox prepares');
  next = next.replace(/\bAI filled\b/gi, 'Churvox filled');
  next = next.replace(/\bAI fill\b/gi, 'Churvox fill');
  next = next.replace(/\bAI\b/g, 'Churvox');
  next = next.replace(/\bai\b/g, 'Churvox');

  return next;
}

function scrubText(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (/^(script|style|textarea|input|code|pre)$/i.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return /\bAI\b|\bai\b/.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const current = node.nodeValue || '';
    const next = replaceAiWording(current);
    if (next !== current) node.nodeValue = next;
  });
}

function scrubAttributes(root) {
  if (!root) return;
  root.querySelectorAll('[aria-label], [title], [placeholder], [alt]').forEach((node) => {
    ['aria-label', 'title', 'placeholder', 'alt'].forEach((name) => {
      const current = node.getAttribute(name);
      if (!current || !/\bAI\b|\bai\b/.test(current)) return;
      node.setAttribute(name, replaceAiWording(current));
    });
  });
}

function run() {
  scrubText(document.body);
  scrubAttributes(document.body);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(run, 60));
  window.addEventListener('hashchange', () => setTimeout(run, 80));
  window.addEventListener('popstate', () => setTimeout(run, 80));
  document.addEventListener('click', () => setTimeout(run, 120), true);
  setInterval(run, 900);
}

export {};
