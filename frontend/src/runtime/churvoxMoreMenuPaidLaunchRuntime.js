const VERSION = "CHURVOX_MORE_MENU_PAID_LAUNCH_20260712";
const DESKTOP_PREF_KEY = "churvox:more-tools-open:v1";
const MOBILE_BREAKPOINT = "(max-width: 900px)";

let observer = null;
let scanQueued = false;
let lastMobileTrigger = null;

function readDesktopPreference() {
  try { return window.sessionStorage.getItem(DESKTOP_PREF_KEY) === "true"; } catch { return false; }
}

function writeDesktopPreference(open) {
  try { window.sessionStorage.setItem(DESKTOP_PREF_KEY, open ? "true" : "false"); } catch {}
}

function isMobile() {
  try { return window.matchMedia(MOBILE_BREAKPOINT).matches; } catch { return window.innerWidth <= 900; }
}

function nextFrame(callback) {
  try { window.requestAnimationFrame(callback); } catch { window.setTimeout(callback, 0); }
}

function injectStyles() {
  if (document.getElementById("churvox-more-menu-paid-launch-style")) return;
  const style = document.createElement("style");
  style.id = "churvox-more-menu-paid-launch-style";
  style.textContent = `
    .freshNavMore > summary {
      position: relative;
      cursor: pointer;
      list-style: none;
      outline: none;
    }
    .freshNavMore > summary::-webkit-details-marker { display: none; }
    .freshNavMore > summary::after {
      content: "+";
      margin-left: auto;
      font-size: 16px;
      font-weight: 1000;
      line-height: 1;
      transition: transform .18s ease;
    }
    .freshNavMore[open] > summary::after { transform: rotate(45deg); }
    .freshNavMore > summary:focus-visible,
    .freshMobileNav button[aria-label="More"]:focus-visible,
    .freshMobileMore button:focus-visible {
      outline: 3px solid rgba(249, 115, 22, .65) !important;
      outline-offset: 2px !important;
    }
    .freshMobileMoreBackdrop { display: none; }
    @media (max-width: 900px) {
      body[data-churvox-more-open="true"] { overflow: hidden !important; }
      .freshMobileMoreBackdrop {
        position: fixed;
        inset: 0;
        z-index: 2147481880;
        display: block;
        border: 0;
        background: rgba(2, 6, 23, .54);
        backdrop-filter: blur(3px);
        cursor: default;
      }
      .freshMobileMore {
        z-index: 2147481890 !important;
        overscroll-behavior: contain;
      }
      .freshMobileMoreHeader {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 48px;
        padding: 2px 2px 4px;
      }
      .freshMobileMoreHeader div {
        display: grid;
        gap: 2px;
        min-width: 0;
      }
      .freshMobileMoreHeader strong {
        color: #111827;
        font-size: 16px;
        font-weight: 1000;
        line-height: 1.1;
      }
      .freshMobileMoreHeader span {
        color: #64748b;
        font-size: 11px;
        font-weight: 850;
        line-height: 1.2;
      }
      .freshMobileMoreHeader .freshMobileMoreClose {
        min-width: 72px !important;
        min-height: 42px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 1px solid rgba(127, 29, 29, .18) !important;
        border-radius: 999px !important;
        background: #7f1d1d !important;
        color: #fffaf0 !important;
        -webkit-text-fill-color: #fffaf0 !important;
        font-size: 12px !important;
        font-weight: 1000 !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function currentMoreItemIsActive(details) {
  return Boolean(details?.querySelector(".freshNavMoreItems button.active"));
}

function setupDesktopMore(details) {
  if (!details) return;
  const summary = details.querySelector(":scope > summary");
  const items = details.querySelector(":scope > .freshNavMoreItems");
  if (!summary || !items) return;

  if (!items.id) items.id = "churvox-desktop-more-items";
  summary.setAttribute("role", "button");
  summary.setAttribute("aria-controls", items.id);
  summary.setAttribute("aria-haspopup", "true");

  const activeInside = currentMoreItemIsActive(details);
  const preferredOpen = readDesktopPreference();
  const shouldOpen = activeInside || preferredOpen;
  if (details.open !== shouldOpen) details.open = shouldOpen;
  summary.setAttribute("aria-expanded", details.open ? "true" : "false");
  details.dataset.churvoxMoreVersion = VERSION;

  if (summary.dataset.churvoxMoreBound === "true") return;
  summary.dataset.churvoxMoreBound = "true";
  summary.addEventListener("click", (event) => {
    event.preventDefault();
    const opening = !details.open;
    details.open = opening;
    writeDesktopPreference(opening);
    summary.setAttribute("aria-expanded", opening ? "true" : "false");
  });
  summary.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    summary.click();
  });
}

function mobileTrigger() {
  return document.querySelector('.freshMobileNav button[aria-label="More"], .freshMobileNav button[title="More"]');
}

function clickTriggerToClose() {
  const trigger = mobileTrigger() || lastMobileTrigger;
  if (trigger && trigger.getAttribute("aria-expanded") === "true") trigger.click();
}

function removeMobileChrome() {
  document.querySelectorAll(".freshMobileMoreBackdrop").forEach((node) => node.remove());
  document.body.removeAttribute("data-churvox-more-open");
  const trigger = mobileTrigger() || lastMobileTrigger;
  if (trigger) trigger.setAttribute("aria-expanded", "false");
}

function focusableInside(menu) {
  return Array.from(menu.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    .filter((node) => !node.hidden && node.getClientRects().length > 0);
}

function setupMobileMenu(menu) {
  const trigger = mobileTrigger();
  if (!menu || !trigger || !isMobile()) {
    removeMobileChrome();
    return;
  }

  lastMobileTrigger = trigger;
  if (!menu.id) menu.id = "churvox-mobile-more-menu";
  trigger.setAttribute("aria-controls", menu.id);
  trigger.setAttribute("aria-expanded", "true");
  trigger.setAttribute("aria-haspopup", "dialog");
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-modal", "true");
  menu.setAttribute("aria-label", "More Churvox tools");
  menu.dataset.churvoxMoreVersion = VERSION;
  document.body.dataset.churvoxMoreOpen = "true";

  let backdrop = document.querySelector(".freshMobileMoreBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "freshMobileMoreBackdrop";
    backdrop.setAttribute("aria-label", "Close More tools");
    backdrop.addEventListener("click", clickTriggerToClose);
    menu.parentNode?.insertBefore(backdrop, menu);
  }

  let header = menu.querySelector(":scope > .freshMobileMoreHeader");
  if (!header) {
    header = document.createElement("header");
    header.className = "freshMobileMoreHeader";
    header.innerHTML = '<div><strong>More tools</strong><span>Only tools included in this plan are shown.</span></div>';
    const close = document.createElement("button");
    close.type = "button";
    close.className = "freshMobileMoreClose";
    close.textContent = "Close";
    close.setAttribute("aria-label", "Close More tools");
    close.addEventListener("click", clickTriggerToClose);
    header.appendChild(close);
    menu.insertBefore(header, menu.firstChild);
  }

  if (menu.dataset.churvoxKeyboardBound !== "true") {
    menu.dataset.churvoxKeyboardBound = "true";
    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        clickTriggerToClose();
        nextFrame(() => trigger.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusableInside(menu);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  if (menu.dataset.churvoxFocused !== "true") {
    menu.dataset.churvoxFocused = "true";
    nextFrame(() => {
      const close = menu.querySelector(".freshMobileMoreClose");
      const first = close || focusableInside(menu)[0];
      first?.focus?.();
    });
  }
}

function setupMobileTrigger(trigger, menu) {
  if (!trigger) return;
  if (!menu) trigger.setAttribute("aria-expanded", "false");
  if (trigger.dataset.churvoxMoreTriggerBound === "true") return;
  trigger.dataset.churvoxMoreTriggerBound = "true";
  trigger.addEventListener("click", () => {
    nextFrame(() => scan());
  });
}

function scan() {
  scanQueued = false;
  if (!document.querySelector(".freshApp")) {
    removeMobileChrome();
    return;
  }
  injectStyles();
  setupDesktopMore(document.querySelector(".freshNavMore"));
  const trigger = mobileTrigger();
  const menu = document.querySelector(".freshMobileMore");
  setupMobileTrigger(trigger, menu);
  if (menu) setupMobileMenu(menu);
  else removeMobileChrome();
}

function queueScan() {
  if (scanQueued) return;
  scanQueued = true;
  nextFrame(scan);
}

function start() {
  if (typeof document === "undefined" || observer) return;
  injectStyles();
  observer = new MutationObserver(queueScan);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "open"] });
  window.addEventListener("resize", queueScan, { passive: true });
  window.addEventListener("popstate", queueScan);
  window.addEventListener("hashchange", queueScan);
  window.addEventListener("churvox:plan-updated", queueScan);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.querySelector(".freshMobileMore")) {
      clickTriggerToClose();
      nextFrame(() => (mobileTrigger() || lastMobileTrigger)?.focus?.());
    }
  });
  scan();
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

export { VERSION, scan };
