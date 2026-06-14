const CUSTOMER_TEXT_REPLACEMENTS = [
  [/\bplaywright\b/gi, "launch audit"],
  [/\bplaceholder\b/gi, "setup needed"],
  [/\bcoming\s+soon\b/gi, "not enabled yet"],
  [/\btemporary\b/gi, "current"],
  [/\bdebug\b/gi, "support check"],
  [/\btodo\b/gi, "next step"],
  [/\bdummy\b/gi, "sample"],
  [/\bmock\b/gi, "sample"],
  [/\bfake\b/gi, "sample"],
  [/\blorem\b/gi, ""],
  [/\bdemo\b/gi, "preview"],
  [/\btest\b/gi, "check"],
  [/\bbuild\b/gi, "create"],
];

const INTERNAL_ONLY_SELECTOR = [
  '[data-dev-only="true"]',
  '[data-internal-only="true"]',
  '[data-test-only="true"]',
  '.dev-only',
  '.debug-only',
  '.test-only',
  '.demo-only',
  '.mock-only',
  '.placeholder-only',
  '.freshCommandDemoTools',
  '.freshCommandSyncBanner',
].join(",");

function setImportant(el, prop, value) {
  if (!el || !el.style) return;
  el.style.setProperty(prop, value, "important");
}

function rgbIsDark(value) {
  const match = String(value || "").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return false;

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);

  return (r + g + b) / 3 < 115;
}

function closestClassContains(el, word) {
  let node = el;

  while (node && node.nodeType === 1) {
    if (String(node.className || "").includes(word)) return node;
    node = node.parentElement;
  }

  return null;
}

function isHeading(el) {
  return ["H1", "H2", "H3", "H4", "H5", "H6", "B", "STRONG"].includes(el.tagName);
}

function isSoftText(el) {
  return ["P", "SPAN", "SMALL", "EM", "LI", "TD", "DD"].includes(el.tagName);
}

function isForm(el) {
  return ["INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(el.tagName);
}

function isOrangeLabel(el) {
  if (el.tagName === "LABEL") return false;
  if (el.parentElement?.tagName === "LABEL") return true;
  if (closestClassContains(el, "Form") && el.tagName === "SPAN") return true;
  if (closestClassContains(el, "Head") && el.tagName === "SPAN") return true;
  if (closestClassContains(el, "Conversation") && el.tagName === "SPAN") return true;
  return false;
}

function paint(el, color) {
  setImportant(el, "color", color);
  setImportant(el, "-webkit-text-fill-color", color);
  setImportant(el, "opacity", "1");
  setImportant(el, "text-shadow", "none");
  setImportant(el, "filter", "none");
  setImportant(el, "mix-blend-mode", "normal");
}

function customerSafeText(value) {
  let next = String(value || "");
  CUSTOMER_TEXT_REPLACEMENTS.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement);
  });
  return next.replace(/\s{2,}/g, " ").trimStart();
}

function scrubCustomerText(root) {
  if (!root) return;

  root.querySelectorAll(INTERNAL_ONLY_SELECTOR).forEach((el) => {
    setImportant(el, "display", "none");
    el.setAttribute("aria-hidden", "true");
  });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "OPTION"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest(INTERNAL_ONLY_SELECTOR)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("input, textarea, select")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    const current = node.nodeValue || "";
    const safe = customerSafeText(current);
    if (safe !== current) node.nodeValue = safe;
  });
}

export function forceFreshReadable() {
  if (typeof document === "undefined") return;

  const root = document.querySelector(".freshApp");
  if (!root) return;

  scrubCustomerText(root);

  const elements = root.querySelectorAll("*");

  elements.forEach((el) => {
    const hero = closestClassContains(el, "Hero");
    const stats = closestClassContains(el, "Stats");
    const listHeader = el.closest('[class*="List"] header, aside header, .freshWorkerPhone header');
    const button = el.closest("button, a");

    setImportant(el, "opacity", "1");
    setImportant(el, "text-shadow", "none");
    setImportant(el, "filter", "none");
    setImportant(el, "mix-blend-mode", "normal");

    if (isForm(el)) {
      paint(el, "#101827");
      setImportant(el, "background-color", "#ffffff");
      setImportant(el, "caret-color", "#101827");
      return;
    }

    // Buttons must be handled before hero panels. Otherwise white pill buttons inside a dark hero get white text.
    if (button) {
      const bg = window.getComputedStyle(button).backgroundColor;
      const color = rgbIsDark(bg) ? "#ffffff" : "#111827";
      paint(el, color);
      return;
    }

    if (hero) {
      if (el.tagName === "SPAN") paint(el, "#fed7aa");
      else if (isSoftText(el)) paint(el, "#e5e7eb");
      else paint(el, "#ffffff");
      return;
    }

    if (stats) {
      if (el.tagName === "B" || el.tagName === "STRONG") paint(el, "#fbbf24");
      else paint(el, "#ffffff");
      return;
    }

    if (listHeader) {
      if (el.tagName === "SPAN" || el.tagName === "SMALL" || el.tagName === "P") paint(el, "#fed7aa");
      else paint(el, "#ffffff");
      return;
    }

    if (isOrangeLabel(el)) {
      paint(el, "#9a3412");
      return;
    }

    if (isHeading(el)) {
      paint(el, "#101827");
      return;
    }

    if (isSoftText(el)) {
      paint(el, "#475569");
      return;
    }

    paint(el, "#101827");
  });
}

export function installFreshReadableRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  forceFreshReadable();

  const root = document.querySelector(".freshApp") || document.body;

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(forceFreshReadable);
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  const interval = window.setInterval(forceFreshReadable, 900);

  return () => {
    observer.disconnect();
    window.clearInterval(interval);
  };
}
