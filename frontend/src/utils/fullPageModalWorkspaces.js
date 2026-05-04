/*
  Churvox modal workspace upgrader.
  Older Smart Hub/workspace popups sometimes render as custom fixed panels instead
  of Radix dialogs. This makes those popups behave like full-page workspaces and
  removes every redundant "Open full page" / "Open full clients page" escape action.
*/

const OPEN_FULL_PAGE_TEXT = /\b(open|view|go\s+to|launch)\b[\s\S]{0,60}\b(full|whole|main)\b[\s\S]{0,80}\b(page|workspace|view|screen)\b|\b(full|whole|main)\b[\s\S]{0,60}\b(page|workspace|view|screen)\b/i;
const WORKSPACE_HINT_TEXT = /workspace|drawer|details|review|approval|invoice|quote|client|clients|job|jobs|worker|workers|crew|dispatch|settings|automation|payroll|report|sms|notification/i;

const OVERLAY_SELECTOR = [
  '[role="dialog"]',
  '[aria-modal="true"]',
  '[data-radix-dialog-content]',
  '[data-radix-alert-dialog-content]',
  '[data-vaul-drawer]',
  '[data-state="open"]',
  '[class*="fixed"][class*="inset-0"]',
  '[class*="fixed"][class*="right-0"]',
  '[class*="fixed"][class*="bottom-0"]',
  '[class*="fixed"][class*="inset-y-0"]',
  '[class*="fixed"][class*="z-"]',
].join(',');

const CLICKABLE_SELECTOR = [
  'button',
  'a',
  '[role="button"]',
  '[tabindex]',
  '.cursor-pointer',
  '[onclick]',
].join(',');

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

function isSmallActionElement(node) {
  if (!node || !(node instanceof HTMLElement)) return false;
  const rect = node.getBoundingClientRect();
  const tag = node.tagName.toLowerCase();
  return ['button', 'a'].includes(tag) || node.getAttribute('role') === 'button' || (rect.width < 380 && rect.height < 110);
}

function markHiddenOpenFullPageAction(node) {
  if (!node || !(node instanceof HTMLElement)) return;
  node.setAttribute('data-churvox-open-full-page-hidden', 'true');
  node.setAttribute('aria-hidden', 'true');
  node.setAttribute('tabindex', '-1');
  node.style.setProperty('display', 'none', 'important');
  node.style.setProperty('visibility', 'hidden', 'important');
  node.style.setProperty('pointer-events', 'none', 'important');
  node.style.setProperty('width', '0', 'important');
  node.style.setProperty('height', '0', 'important');
  node.style.setProperty('padding', '0', 'important');
  node.style.setProperty('margin', '0', 'important');
  node.style.setProperty('border', '0', 'important');
}

function findPanelInside(container) {
  if (!container || !(container instanceof HTMLElement)) return null;
  const candidates = Array.from(container.querySelectorAll([
    '[role="dialog"]',
    '[data-radix-dialog-content]',
    '[data-vaul-drawer]',
    '[class*="rounded-3xl"]',
    '[class*="rounded-2xl"]',
    '[class*="max-w"]',
    '[class*="w-full"]',
    '.cx-card',
    '.surface-card',
  ].join(','))).filter((el) => el instanceof HTMLElement && isVisible(el));

  return candidates.sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    return (br.width * br.height) - (ar.width * ar.height);
  })[0] || null;
}

function markFullPageWorkspace(container) {
  if (!container || !(container instanceof HTMLElement)) return;
  if (container === document.body || container === document.documentElement) return;

  container.setAttribute('data-churvox-fullpage-workspace', 'true');

  const likelyPanel = findPanelInside(container);
  if (likelyPanel && likelyPanel !== container) {
    likelyPanel.setAttribute('data-churvox-fullpage-workspace-panel', 'true');
  }
}

function findNearestOverlay(node) {
  if (!node || !(node instanceof HTMLElement)) return null;
  const closest = node.closest(OVERLAY_SELECTOR);
  if (closest && closest !== document.body && closest !== document.documentElement) return closest;

  let current = node.parentElement;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const rect = current.getBoundingClientRect();
    const isFixedOrAbsolute = style.position === 'fixed' || style.position === 'absolute';
    const isLargePanel = rect.width > Math.min(420, window.innerWidth * 0.5) && rect.height > Math.min(260, window.innerHeight * 0.35);
    const isLayered = Number(style.zIndex || 0) >= 20;
    if ((isFixedOrAbsolute && isLargePanel) || (isLayered && isLargePanel)) return current;
    current = current.parentElement;
  }
  return null;
}

function hideOpenFullPageActions() {
  const elements = Array.from(document.querySelectorAll(`${CLICKABLE_SELECTOR}, span, div`));

  elements.forEach((el) => {
    if (!(el instanceof HTMLElement) || !isVisible(el)) return;

    const label = textOf(el);
    if (!label || !OPEN_FULL_PAGE_TEXT.test(label)) return;

    const directAction = el.closest(CLICKABLE_SELECTOR);
    const actionToHide = directAction && isSmallActionElement(directAction) ? directAction : el;
    const overlay = findNearestOverlay(actionToHide);

    if (overlay) markFullPageWorkspace(overlay);
    markHiddenOpenFullPageAction(actionToHide);
  });
}

function upgradeCustomOverlays() {
  const overlays = Array.from(document.querySelectorAll(OVERLAY_SELECTOR));

  overlays.forEach((overlay) => {
    if (!(overlay instanceof HTMLElement) || !isVisible(overlay)) return;

    const text = textOf(overlay);
    const rect = overlay.getBoundingClientRect();
    const hasWorkspaceHint = WORKSPACE_HINT_TEXT.test(text);
    const hasFormOrList = overlay.querySelector('input, textarea, select, table, [role="list"], [data-smart-hub-card="true"], .cx-card, .surface-card, form');
    const hasOpenFullPage = OPEN_FULL_PAGE_TEXT.test(text);
    const isUsefulSize = rect.width > 260 && rect.height > 180;

    if (hasOpenFullPage || (hasWorkspaceHint && hasFormOrList && isUsefulSize)) {
      markFullPageWorkspace(overlay);
    }
  });
}

function upgradeFullPageModalWorkspaces() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  hideOpenFullPageActions();
  upgradeCustomOverlays();
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
  window.addEventListener('keyup', run, true);
  window.addEventListener('focusin', run, true);

  const interval = window.setInterval(run, 750);
  window.addEventListener('beforeunload', () => window.clearInterval(interval), { once: true });

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'data-state', 'aria-hidden'],
  });
}
