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

function normalizeSetupGuideRoute() {
  const path = window.location.pathname || '';
  const hash = String(window.location.hash || '').toLowerCase();
  const setupPath = /^\/(guide|setup|setup-guide)\/?$/i.test(path);
  const setupHash = ['#setup', '#setupguide', '#setup-guide', '#setupassistant', '#firstrun'].includes(hash);
  if (!setupPath && !setupHash) return;

  const title = document.querySelector('.churvoxOptionC .title h1');
  if (title && /^(today|ai guide|churvox guide)$/i.test((title.textContent || '').trim())) {
    title.textContent = 'Setup Guide';
  }

  const subtitle = document.querySelector('.churvoxOptionC .title p');
  if (subtitle && !/setup|first jobs|approval/i.test(subtitle.textContent || '')) {
    subtitle.textContent = 'Setup, first jobs, worker app, pricing, billing and owner approval basics.';
  }

  document.querySelectorAll('.churvoxOptionC .cocNav button').forEach((button) => {
    if (/^(ai guide|setup guide)$/i.test((button.textContent || '').trim())) {
      button.textContent = 'Setup Guide';
      button.classList.add('active');
    }
  });
}

function openFreshSection(section) {
  const target = String(section || '').toLowerCase();
  if (!target) return;
  const path = `/dashboard#${target}`;
  window.history.replaceState({}, '', path);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  setTimeout(() => {
    const wanted = target === 'workers' ? /workers/i : new RegExp(`^${target}$`, 'i');
    const button = Array.from(document.querySelectorAll('.churvoxOptionC .cocNav button'))
      .find((node) => wanted.test((node.textContent || '').trim().replace(/\s+/g, '')) || wanted.test((node.textContent || '').trim()));
    if (button) button.click();
  }, 20);
}

function installSetupGuideClicks() {
  if (window.__CHURVOX_SETUP_GUIDE_CLICKS__) return;
  window.__CHURVOX_SETUP_GUIDE_CLICKS__ = true;
  document.addEventListener('click', (event) => {
    const row = event.target?.closest?.('.aiGuidePage .cocRow, .aiGuidePage button');
    if (!row) return;
    const text = String(row.textContent || '').toLowerCase();
    let target = '';
    if (/client/.test(text)) target = 'clients';
    else if (/job/.test(text)) target = 'jobs';
    else if (/command|approve|approval|park/.test(text)) target = 'command';
    else if (/worker/.test(text)) target = 'workers';
    else if (/price|pricing|billing|plan/.test(text)) target = 'plans';
    else if (/xero|myob|accounting|sync/.test(text)) target = 'xero';
    else if (/setting|business/.test(text)) target = 'settings';
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    openFreshSection(target);
  }, true);
}

function run() {
  scrubText(document.body);
  scrubAttributes(document.body);
  normalizeSetupGuideRoute();
  installSetupGuideClicks();
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => setTimeout(run, 0));
  window.addEventListener('load', () => setTimeout(run, 20));
  window.addEventListener('hashchange', () => setTimeout(run, 40));
  window.addEventListener('popstate', () => setTimeout(run, 40));
  document.addEventListener('click', () => setTimeout(run, 40), true);
window.addEventListener('DOMContentLoaded', () => {
  run();
});

setTimeout(run, 0);

  setTimeout(run, 0);
}

export {};
