// Command language guard.
// Keeps the product promise right: Churvox prepares admin, owner reviews in Command.

const STORE_KEY = 'churvox.owner.createDrafts.v1';

const REPLACEMENTS = [
  [/Send to Command/g, 'Review in Command'],
  [/send to Command/g, 'appears in Command'],
  [/Sent to Command/g, 'Prepared in Command'],
  [/sent to Command/g, 'prepared in Command'],
  [/Send risky item/g, 'Review in Command'],
  [/send risky item/g, 'review in Command'],
  [/goes to Command/g, 'appears in Command'],
  [/go to Command/g, 'appear in Command'],
  [/send back to Command/g, 'review in Command'],
  [/Send back to Command/g, 'Review in Command'],
  [/needs to be sent to Command/g, 'appears in Command for owner approval'],
  [/sent into Command/g, 'prepared in Command'],
];

function cleanText(value) {
  let next = String(value || '');
  REPLACEMENTS.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement);
  });
  return next;
}

function cleanNodeText(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('script,style,textarea,input')) return NodeFilter.FILTER_REJECT;
      return /Command|command/.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const cleaned = cleanText(node.nodeValue);
    if (cleaned !== node.nodeValue) node.nodeValue = cleaned;
  });
}

function cleanControls(root) {
  if (!root) return;
  root.querySelectorAll('button,input,textarea,[aria-label],[title]').forEach((el) => {
    if ('value' in el && typeof el.value === 'string') {
      const value = cleanText(el.value);
      if (value !== el.value) el.value = value;
    }
    if (el.textContent && /Command|command/.test(el.textContent)) {
      const value = cleanText(el.textContent);
      if (value !== el.textContent) el.textContent = value;
    }
    ['aria-label', 'title', 'placeholder'].forEach((attr) => {
      if (!el.hasAttribute?.(attr)) return;
      const current = el.getAttribute(attr);
      const value = cleanText(current);
      if (value !== current) el.setAttribute(attr, value);
    });
  });
}

function cleanDraftMemory() {
  try {
    const drafts = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    let changed = false;
    const cleaned = drafts.map((draft) => {
      if (!draft || typeof draft !== 'object') return draft;
      const next = { ...draft };
      ['status', 'title', 'page'].forEach((key) => {
        if (typeof next[key] === 'string') {
          const value = cleanText(next[key]);
          if (value !== next[key]) { next[key] = value; changed = true; }
        }
      });
      return next;
    });
    if (changed) localStorage.setItem(STORE_KEY, JSON.stringify(cleaned));
  } catch (_) {}
}

function run() {
  cleanNodeText(document.body);
  cleanControls(document.body);
  cleanDraftMemory();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_COMMAND_LANGUAGE_GUARD__) {
  window.__CHURVOX_COMMAND_LANGUAGE_GUARD__ = true;
  window.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  window.addEventListener('hashchange', () => setTimeout(run, 80));
  window.addEventListener('popstate', () => setTimeout(run, 80));
  window.addEventListener('churvox:owner-draft-saved', run);
  document.addEventListener('click', () => setTimeout(run, 120), true);
  setInterval(run, 700);
  run();
}

export {};
