(function churvoxContrastGuard() {
  if (typeof window === 'undefined') return;
  if (window.__CHURVOX_CONTRAST_GUARD_V4__) return;
  window.__CHURVOX_CONTRAST_GUARD_V4__ = true;

  const TEXT_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,span,small,label,strong,em,li,td,th,button,a,b,div';
  const FORM_SELECTOR = 'input,textarea,select,option';

  function forceColor(el, color) {
    if (!el || !el.style) return;
    el.style.setProperty('color', color, 'important');
    el.style.setProperty('-webkit-text-fill-color', color, 'important');
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('text-shadow', 'none', 'important');
    el.style.setProperty('mix-blend-mode', 'normal', 'important');
  }

  function forceSelectBox(el) {
    if (!el || !el.style) return;
    el.style.setProperty('background', '#ffffff', 'important');
    el.style.setProperty('background-color', '#ffffff', 'important');
    el.style.setProperty('background-image', 'none', 'important');
    el.style.setProperty('color', '#111827', 'important');
    el.style.setProperty('-webkit-text-fill-color', '#111827', 'important');
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('text-shadow', 'none', 'important');
    el.style.setProperty('mix-blend-mode', 'normal', 'important');
  }

  function parseRgb(value) {
    if (!value || value === 'transparent') return null;
    const match = String(value).match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;

    const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
    if (parts.length < 3) return null;

    const alpha = parts.length >= 4 ? parts[3] : 1;
    if (!Number.isFinite(alpha) || alpha <= 0.08) return null;

    return { r: parts[0], g: parts[1], b: parts[2], a: alpha };
  }

  function parseHex(value) {
    const hex = String(value).replace('#', '').trim();

    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1
      };
    }

    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1
      };
    }

    return null;
  }

  function colorsFromBackgroundImage(value) {
    const text = String(value || '');
    if (!text || text === 'none') return [];

    const out = [];

    (text.match(/rgba?\([^)]+\)/gi) || []).forEach((item) => {
      const rgb = parseRgb(item);
      if (rgb) out.push(rgb);
    });

    (text.match(/#[0-9a-f]{3,6}\b/gi) || []).forEach((item) => {
      const rgb = parseHex(item);
      if (rgb) out.push(rgb);
    });

    return out;
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

  function effectiveBackground(el) {
    let node = el;

    while (node && node !== document.documentElement) {
      const style = window.getComputedStyle(node);

      const imageColors = colorsFromBackgroundImage(style.backgroundImage);
      if (imageColors.length) {
        const darkest = imageColors.slice().sort((a, b) => luminance(a) - luminance(b))[0];
        if (luminance(darkest) < 0.42) return darkest;
      }

      const bg = parseRgb(style.backgroundColor);
      if (bg) return bg;

      node = node.parentElement;
    }

    return { r: 244, g: 239, b: 231, a: 1 };
  }

  function hasText(el) {
    if (!el || !el.childNodes) return false;

    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) return true;
    }

    return false;
  }

  function skip(el) {
    if (!el || !el.matches) return true;
    if (el.closest('script,style,svg,canvas,img,video')) return true;

    const style = window.getComputedStyle(el);
    return style.display === 'none' || style.visibility === 'hidden';
  }

  function fixText(el) {
    if (skip(el) || !hasText(el)) return;

    const style = window.getComputedStyle(el);
    const fg = parseRgb(style.color) || { r: 17, g: 24, b: 39, a: 1 };
    const bg = effectiveBackground(el);
    const ratio = contrastRatio(fg, bg);
    const opacity = Number.parseFloat(style.opacity || '1');
    const bgIsLight = luminance(bg) > 0.48;

    if (ratio < 4.5 || opacity < 0.75) {
      forceColor(el, bgIsLight ? '#111827' : '#f9fafb');
    }
  }

  function forceKnownShell() {
    const light = '#f9fafb';
    const soft = '#e5e7eb';
    const dark = '#111827';
    const amber = '#fbbf24';

    document.querySelectorAll('.cv-industrial-sidebar,.cv-industrial-sidebar *,.cv-clean-command-nav,.cv-clean-command-nav *').forEach((el) => forceColor(el, light));
    document.querySelectorAll('.cv-industrial-group p').forEach((el) => forceColor(el, '#cbd5e1'));
    document.querySelectorAll('.cv-industrial-group a.active,.cv-industrial-group a.active *,.cv-industrial-group a:hover,.cv-industrial-group a:hover *,.cv-clean-command-nav a.active,.cv-clean-command-nav a.active *').forEach((el) => forceColor(el, '#020617'));
    document.querySelectorAll('.cv-industrial-mark,.cv-industrial-mark *,.cxBrandMark,.cxBrandMark *').forEach((el) => forceColor(el, dark));

    document.querySelectorAll('.cxHero,.cxHero *,.cxStat,.cxStat *,.cxBox,.cxBox *,.cxContextCard,.cxContextCard *,.cxDeliverySummary,.cxDeliverySummary *,.cxMiniDelivery,.cxMiniDelivery *').forEach((el) => forceColor(el, light));
    document.querySelectorAll('.cxHero p,.cxHero span,.cxStat span,.cxBox p,.cxContextCard span,.cxDeliverySummary li,.cxMiniDelivery em').forEach((el) => forceColor(el, soft));
    document.querySelectorAll('.cxStat small,.cxStatus,.cxStatus *,.cxSlipType,.cxContextCard b,.cxDeliverySummary small,.cxDeliverySummary li b,.cxMiniDelivery b').forEach((el) => forceColor(el, amber));
    document.querySelectorAll('.cxPill,.cxPill *,.cxBox em,.cxBox em *').forEach((el) => forceColor(el, dark));

    document.querySelectorAll('.cxUrgent,.cxUrgent *,.cxFormPanel,.cxFormPanel *,.cxControls,.cxControls *,.cxField,.cxField *').forEach((el) => forceColor(el, dark));
    document.querySelectorAll('.cxUrgent span,.cxUrgent span *').forEach((el) => forceColor(el, amber));
    document.querySelectorAll('.cxUrgentActions button,.cxUrgentActions button *,.cxControls p,.cxControls p *,.cxControls .dark,.cxControls .dark *').forEach((el) => forceColor(el, light));
  }

  function fixForms() {
    document.querySelectorAll(FORM_SELECTOR).forEach((el) => {
      if (skip(el)) return;
      if (el.tagName && String(el.tagName).toLowerCase() === 'select') {
        forceSelectBox(el);
        return;
      }
      if (el.tagName && String(el.tagName).toLowerCase() === 'option') {
        forceSelectBox(el);
        return;
      }
      forceColor(el, '#f9fafb');
    });
  }

  function run() {
    if (!document.body) return;
    document.querySelectorAll(TEXT_SELECTOR).forEach(fixText);
    forceKnownShell();
    fixForms();
  }

  let queued = false;

  function schedule() {
    if (queued) return;

    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      run();
    });
  }

  ['pushState', 'replaceState'].forEach((name) => {
    const original = window.history[name];
    if (typeof original !== 'function') return;

    window.history[name] = function patchedHistoryMethod() {
      const result = original.apply(this, arguments);
      setTimeout(schedule, 80);
      return result;
    };
  });

  window.addEventListener('load', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('resize', schedule);
  document.addEventListener('click', () => setTimeout(schedule, 80), true);
  document.addEventListener('input', schedule, true);

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });

  [30, 120, 400, 900, 1800, 3000].forEach((ms) => setTimeout(schedule, ms));
  window.setInterval(schedule, 1000);
})();