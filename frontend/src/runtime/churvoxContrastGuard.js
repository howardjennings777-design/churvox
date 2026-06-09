(function churvoxContrastGuard() {
  if (typeof window === 'undefined') return;
  if (window.__CHURVOX_CONTRAST_GUARD__) return;
  window.__CHURVOX_CONTRAST_GUARD__ = true;

  const TEXT_SELECTOR = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'span', 'small', 'label', 'strong', 'em',
    'li', 'td', 'th', 'button', 'a', 'div'
  ].join(',');

  function parseRgb(value) {
    if (!value || value === 'transparent') return null;
    const match = value.match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;

    const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
    if (parts.length < 3) return null;

    const alpha = parts.length >= 4 ? parts[3] : 1;
    if (!Number.isFinite(alpha) || alpha <= 0.05) return null;

    return {
      r: parts[0],
      g: parts[1],
      b: parts[2],
      a: alpha
    };
  }

  function luminance(rgb) {
    const channel = (value) => {
      const s = value / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };

    return (0.2126 * channel(rgb.r)) + (0.7152 * channel(rgb.g)) + (0.0722 * channel(rgb.b));
  }

  function contrastRatio(a, b) {
    const l1 = luminance(a);
    const l2 = luminance(b);
    const light = Math.max(l1, l2);
    const dark = Math.min(l1, l2);
    return (light + 0.05) / (dark + 0.05);
  }

  function effectiveBackground(element) {
    let node = element;

    while (node && node !== document.documentElement) {
      const style = window.getComputedStyle(node);
      const bg = parseRgb(style.backgroundColor);
      if (bg) return bg;
      node = node.parentElement;
    }

    return { r: 244, g: 239, b: 231, a: 1 };
  }

  function hasDirectText(element) {
    if (!element || !element.childNodes) return false;

    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        return true;
      }
    }

    return false;
  }

  function shouldSkip(element) {
    if (!element || !element.matches) return true;
    if (element.closest('script, style, svg, canvas, img, video')) return true;
    if (element.closest('[data-no-contrast-guard="true"]')) return true;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return true;

    return false;
  }

  function setReadableColor(element, color) {
    element.style.setProperty('color', color, 'important');
    element.style.setProperty('-webkit-text-fill-color', color, 'important');
    element.style.setProperty('opacity', '1', 'important');
  }

  function fixTextElement(element) {
    if (shouldSkip(element)) return;
    if (!hasDirectText(element)) return;

    const style = window.getComputedStyle(element);
    const foreground = parseRgb(style.color);
    const background = effectiveBackground(element);

    if (!foreground || !background) return;

    const currentContrast = contrastRatio(foreground, background);
    const currentOpacity = Number.parseFloat(style.opacity || '1');

    if (currentContrast >= 4.5 && currentOpacity >= 0.55) return;

    const backgroundIsLight = luminance(background) > 0.48;
    setReadableColor(element, backgroundIsLight ? '#111827' : '#f9fafb');
  }

  function fixFormElement(element) {
    if (shouldSkip(element)) return;

    const background = effectiveBackground(element);
    const backgroundIsLight = luminance(background) > 0.48;
    const color = backgroundIsLight ? '#111827' : '#f9fafb';

    element.style.setProperty('color', color, 'important');
    element.style.setProperty('-webkit-text-fill-color', color, 'important');
    element.style.setProperty('opacity', '1', 'important');
  }

  function runContrastGuard() {
    if (!document.body) return;

    document.querySelectorAll(TEXT_SELECTOR).forEach(fixTextElement);
    document.querySelectorAll('input, textarea, select').forEach(fixFormElement);
  }

  let queued = false;

  function scheduleContrastGuard() {
    if (queued) return;

    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      runContrastGuard();
    });
  }

  function patchHistoryMethod(name) {
    const original = window.history[name];
    if (typeof original !== 'function') return;

    window.history[name] = function patchedHistoryMethod() {
      const result = original.apply(this, arguments);
      setTimeout(scheduleContrastGuard, 80);
      return result;
    };
  }

  patchHistoryMethod('pushState');
  patchHistoryMethod('replaceState');

  window.addEventListener('load', scheduleContrastGuard);
  window.addEventListener('popstate', scheduleContrastGuard);
  window.addEventListener('resize', scheduleContrastGuard);
  document.addEventListener('click', () => setTimeout(scheduleContrastGuard, 80), true);
  document.addEventListener('input', scheduleContrastGuard, true);

  const startObserver = () => {
    if (!document.documentElement) return;

    const observer = new MutationObserver(scheduleContrastGuard);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  };

  startObserver();

  setTimeout(scheduleContrastGuard, 50);
  setTimeout(scheduleContrastGuard, 400);
  setTimeout(scheduleContrastGuard, 1200);
  setTimeout(scheduleContrastGuard, 2500);
})();
