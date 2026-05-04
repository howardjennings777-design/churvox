/*
  Churvox modal workspace upgrader.
  Some older Smart Hub/workspace popups are custom overlays instead of Radix dialogs,
  so CSS-only dialog rules do not catch them. This upgrades any popup that offers
  an "open full page" escape action into a full-page in-place workspace and hides
  that redundant action.
*/

const OPEN_FULL_PAGE_TEXT = /(open|view)\s+(the\s+)?(full\s+)?page|open\s+full\s+(page|view|workspace)|full\s+page/i;
const OVERLAY_SELECTOR = [
  '[role="dialog"]',
  '[data-radix-dialog-content]',
  '[data-radix-alert-dialog-content]',
  '[data-vaul-drawer]',
  '[class*="fixed"][class*="inset-0"]',
  '[class*="fixed"][class*="right-0"]',
  '[class*="fixed"][class*="bottom-0"]',
  '[class*="fixed"][class*="inset-y-0"]',
].join(',');

function textOf(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function markFullPageWorkspace(container) {
  if (!container || container === document.body || container === document.documentElement) return;
  container.setAttribute('data-churvox-fullpage-workspace', 'true');

  const likelyPanel = container.querySelector(
    '[role="dialog"], [data-radix-dialog-content], [class*="rounded-3xl"], [class*="rounded-2xl"], [class*="max-w"], [class*="w-full"]'
  );

  if (likelyPanel && likelyPanel !== container) {
    likelyPanel.setAttribute('data-churvox-fullpage-workspace-panel', 'true');
  }
}

function upgradeFullPageModalWorkspaces() {
  if (typeof document === 'undefined') return;

  const buttonsAndLinks = Array.from(document.querySelectorAll('button, a'));

  buttonsAndLinks.forEach((el) => {
    const label = textOf(el);
    if (!OPEN_FULL_PAGE_TEXT.test(label)) return;

    const overlay = el.closest(OVERLAY_SELECTOR);
    if (overlay) {
      markFullPageWorkspace(overlay);
    }

    el.setAttribute('data-churvox-open-full-page-hidden', 'true');
    el.setAttribute('aria-hidden', 'true');
    el.style.display = 'none';
  });

  const customOverlays = Array.from(document.querySelectorAll(OVERLAY_SELECTOR));
  customOverlays.forEach((overlay) => {
    const text = textOf(overlay);
    const hasWorkspaceHint = /workspace|drawer|details|review|approval|invoice|quote|client|job|worker|crew|dispatch|settings/i.test(text);
    const hasFormOrList = overlay.querySelector('input, textarea, select, table, [role="list"], [data-smart-hub-card="true"], .cx-card, .surface-card');
    const hasOpenFullPage = OPEN_FULL_PAGE_TEXT.test(text);

    if (hasOpenFullPage || (hasWorkspaceHint && hasFormOrList && text.length > 80)) {
      markFullPageWorkspace(overlay);
    }
  });
}

if (typeof window !== 'undefined') {
  const run = () => window.requestAnimationFrame(upgradeFullPageModalWorkspaces);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}
