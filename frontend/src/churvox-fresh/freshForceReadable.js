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

export function forceFreshReadable() {
  if (typeof document === "undefined") return;

  const root = document.querySelector(".freshApp");
  if (!root) return;

  const elements = root.querySelectorAll("*");

  elements.forEach((el) => {
    const hero = closestClassContains(el, "Hero");
    const stats = closestClassContains(el, "Stats");
    const listHeader = el.closest('[class*="List"] header, aside header, .freshWorkerPhone header');
    const button = el.closest("button");

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

    if (button) {
      const bg = window.getComputedStyle(button).backgroundColor;
      const color = rgbIsDark(bg) ? "#ffffff" : "#111827";
      paint(el, color);
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
