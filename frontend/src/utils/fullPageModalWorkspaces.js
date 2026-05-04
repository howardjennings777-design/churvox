/*
  Churvox modal workspace upgrader.
  Safe version: never hides popup containers. It only hides small clickable
  actions that explicitly say things like "Open full clients page", while
  keeping the popup itself visible and usable as the workspace.
*/

const OPEN_FULL_PAGE_TEXT = /\b(open|view|go\s+to|launch)\b[\s\S]{0,60}\b(full|whole|main)\b[\s\S]{0,80}\b(page|workspace|view|screen)\b|\b(full|whole|main)\b[\s\S]{0,60}\b(page|workspace|view|screen)\b/i;

const OVERLAY_SELECTOR = [
  '[role="dialog"]',
  '[aria-modal="true"]',
  '[data-radix-dialog-content]',
  '[data-radix-alert-dialog-content]',
  '[data-vaul-drawer]',
  '[class*="fixed"][class*="inset-0"]',
  '[class*="fixed"][class*="right-0"]',
  '[class*="fixed"][class*="bottom-0"]',
  '[class*="fixed"][class*="inset-y-0"]',
].join(',');

const ACTION_SELECTOR = 'button, a, [role="button"]';

function textOf(node) {
  return String(node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function isVisible(node) {
  if (!node || !(node instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(node);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  const rect = node.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isRedundantFullPageAction(node) {
  if (!node || !(node instanceof HTMLElement) || !isVisible(node)) return false;
  const label = textOf(node);
  if (!label || label.length > 90) return false;
  if (!OPEN_FULL_PAGE_TEXT.test(label)) return false;

  // Never hide close/cancel/save/delete style controls by accident.
  if (/\b(close|cancel|save|create|update|delete|remove|submit|send|approve|assign|run)\b/i.test(label)) return false;

  const rect = node.getBoundingClientRect();
  return rect.width <= 420 && rect.height <= 120;
}

function markFullPageWorkspace(container) {
  if (!container || !(container instanceof HTMLElement)) return;
  if (container === document.body || container === document.documentElement) return;
  container.setAttribute('data-churvox-fullpage-workspace', 'true');

  const panels = Array.from(container.querySelectorAll('[role="dialog"], [data-radix-dialog-content], [class*="rounded-3xl"], [class*="rounded-2xl"], [class*="max-w"], [class*="w-full"]'));
  const visiblePanels = panels.filter((el) => el instanceof HTMLElement && isVisible(el));
  const largestPanel = visiblePanels.sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    return (br.width * br.height) - (ar.width * ar.height);
  })[0];

  if (largestPanel && largestPanel !== container) {
    largestPanel.setAttribute('data-churvox-fullpage-workspace-panel', 'true');
  }
}

function hideAction(node) {
  node.setAttribute('data-churvox-open-full-page-hidden', 'true');
  node.setAttribute('aria-hidden', 'true');
  node.setAttribute('tabindex', '-1');
  node.style.setProperty('display', 'none', 'important');
  node.style.setProperty('visibility', 'hidden', 'important');
  node.style.setProperty('pointer-events', 'none', 'important');
}

function upgradeFullPageModalWorkspaces() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const actions = Array.from(document.querySelectorAll(ACTION_SELECTOR));
  actions.forEach((action) => {
    if (!isRedundantFullPageAction(action)) return;
    const overlay = action.closest(OVERLAY_SELECTOR);
    if (overlay) markFullPageWorkspace(overlay);
    hideAction(action);
  });
}

if (typeof window !== 'undefined') {
  let queued = false;
  const run = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      upgradeFullPageModalWorkspaces();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  window.addEventListener('click', () => setTimeout(run, 0), true);

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'data-state', 'aria-hidden'],
  });
}
