const BUILD = 'churvox-visible-control-text-runtime-20260726d';

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function rgba(value) {
  const match = String(value || '').match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1].split(',').map((part) => Number(String(part).trim()));
  if (parts.length < 3 || parts.some((part, index) => index < 3 && !Number.isFinite(part))) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: Number.isFinite(parts[3]) ? parts[3] : 1 };
}

function channel(value) {
  const next = Math.max(0, Math.min(255, Number(value || 0))) / 255;
  return next <= 0.03928 ? next / 12.92 : Math.pow((next + 0.055) / 1.055, 2.4);
}

function luminance(color) {
  return (0.2126 * channel(color.r)) + (0.7152 * channel(color.g)) + (0.0722 * channel(color.b));
}

function contrastRatio(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  const light = Math.max(first, second);
  const dark = Math.min(first, second);
  return (light + 0.05) / (dark + 0.05);
}

function effectiveBackground(element) {
  let node = element;
  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const color = rgba(style.backgroundColor);
    if (color && color.a > 0.35) return color;
    if (String(style.backgroundImage || 'none') !== 'none') {
      const hint = `${node.className || ''} ${node.id || ''}`;
      return /dark|hero|header|nav|sidebar|shell|command|hq|worker|owner/i.test(hint)
        ? { r: 17, g: 24, b: 39, a: 1 }
        : { r: 247, g: 243, b: 234, a: 1 };
    }
    node = node.parentElement;
  }
  return rgba(window.getComputedStyle(document.body).backgroundColor) || { r: 247, g: 243, b: 234, a: 1 };
}

function visibleColour(element) {
  return luminance(effectiveBackground(element)) < 0.42 ? '#ffffff' : '#111827';
}

function isVisible(element) {
  if (!element || element.closest('[hidden], [aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return rect.width > 2
    && rect.height > 2
    && style.display !== 'none'
    && style.visibility !== 'hidden'
    && Number(style.opacity || '1') > 0.01;
}

function isPillLike(element) {
  const classes = `${element.className || ''} ${element.parentElement?.className || ''}`;
  if (/pill|badge|chip|tag|status|filter|segment|tab|count|notice|current|health/i.test(classes)) return true;
  if (element.matches('button.active, button.selected, button.is-active, button[aria-pressed="true"], button[aria-current="true"]')) return true;
  return element.hasAttribute('data-cv-require-visible-label');
}

function accessibleLabel(element) {
  return clean(
    element.innerText
      || element.textContent
      || element.getAttribute('aria-label')
      || element.getAttribute('title')
      || element.getAttribute('data-label')
      || element.getAttribute('name')
  );
}

function wrappedControlLabel(element) {
  const labels = element?.labels ? [...element.labels] : [];
  if (!labels.length) {
    const closest = element?.closest?.('label');
    if (closest) labels.push(closest);
  }
  for (const label of labels) {
    const preferred = label.querySelector(':scope > span, :scope > strong, :scope > b');
    const text = clean(preferred?.innerText || preferred?.textContent || label.innerText || label.textContent);
    if (text) return text;
  }
  return '';
}

function ensureControlName(element) {
  if (!element.matches('input, select, textarea, button, [role="button"]')) return;
  const existing = clean(
    element.getAttribute('aria-label')
      || element.getAttribute('aria-labelledby')
      || element.getAttribute('title')
      || element.getAttribute('placeholder')
      || element.getAttribute('name')
      || element.innerText
      || element.textContent
  );
  if (existing) return;
  const label = wrappedControlLabel(element);
  if (label) {
    element.setAttribute('aria-label', label);
    element.dataset.cvControlNameSource = 'visible-label';
  }
}

function textLooksHidden(element) {
  const nodes = [element, ...element.querySelectorAll('span, small, strong, b, em, label')];
  return nodes.some((node) => {
    const text = clean(node.innerText || node.textContent);
    if (!text) return false;
    const style = window.getComputedStyle(node);
    const colour = rgba(style.color);
    const fontSize = Number.parseFloat(style.fontSize || '0');
    const indent = Number.parseFloat(style.textIndent || '0');
    const clipped = style.overflow === 'hidden'
      && node.scrollWidth > node.clientWidth + 6
      && node.clientWidth > 0;
    const lowContrast = colour
      && colour.a >= 0.35
      && contrastRatio(colour, effectiveBackground(node)) < 2.35;
    return style.display === 'none'
      || style.visibility === 'hidden'
      || Number(style.opacity || '1') < 0.35
      || (colour && colour.a < 0.35)
      || lowContrast
      || (Number.isFinite(fontSize) && fontSize > 0 && fontSize < 9)
      || (Number.isFinite(indent) && Math.abs(indent) > 120)
      || clipped;
  });
}

function repair(element) {
  if (!isVisible(element)) return;
  ensureControlName(element);
  if (!isPillLike(element)) return;
  const label = accessibleLabel(element);
  if (!label) return;

  const visibleText = clean(element.innerText || element.textContent);
  const colour = visibleColour(element);
  element.style.setProperty('--cv-control-text-colour', colour);

  if (!visibleText && /^(BUTTON|A|SPAN|DIV|SMALL|STRONG|B|EM)$/.test(element.tagName)) {
    element.dataset.cvVisibleLabel = label;
    element.classList.add('cvNeedsVisibleControlLabel');
  }

  if (textLooksHidden(element)) {
    element.classList.add('cvVisibleControlTextRepair');
  }
}

function installStyle() {
  if (document.getElementById('churvox-visible-control-text-style')) return;
  const style = document.createElement('style');
  style.id = 'churvox-visible-control-text-style';
  style.textContent = `
    html body .cvVisibleControlTextRepair,
    html body .cvVisibleControlTextRepair span,
    html body .cvVisibleControlTextRepair small,
    html body .cvVisibleControlTextRepair strong,
    html body .cvVisibleControlTextRepair b,
    html body .cvVisibleControlTextRepair em,
    html body .cvVisibleControlTextRepair label {
      color: var(--cv-control-text-colour, #111827) !important;
      -webkit-text-fill-color: var(--cv-control-text-colour, #111827) !important;
      opacity: 1 !important;
      visibility: visible !important;
      font-size: max(0.72rem, 11px) !important;
      line-height: 1.2 !important;
      text-indent: 0 !important;
      clip: auto !important;
      clip-path: none !important;
      filter: none !important;
      mix-blend-mode: normal !important;
    }

    html body .cvVisibleControlTextRepair {
      overflow: visible !important;
    }

    html body .cvNeedsVisibleControlLabel::after {
      content: attr(data-cv-visible-label);
      display: inline-block !important;
      color: var(--cv-control-text-colour, #111827) !important;
      -webkit-text-fill-color: var(--cv-control-text-colour, #111827) !important;
      opacity: 1 !important;
      visibility: visible !important;
      font-size: max(0.72rem, 11px) !important;
      font-weight: 800 !important;
      line-height: 1.2 !important;
      white-space: nowrap !important;
    }
  `;
  document.head.appendChild(style);
}

export function fixVisibleControlTextNow() {
  if (typeof document === 'undefined') return;
  installStyle();
  const selector = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[class*="Pill"]',
    '[class*="pill"]',
    '[class*="Badge"]',
    '[class*="badge"]',
    '[class*="Chip"]',
    '[class*="chip"]',
    '[class*="Tag"]',
    '[class*="tag"]',
    '[class*="Status"]',
    '[class*="status"]',
    '[class*="Filter"]',
    '[class*="filter"]',
    '[class*="Tab"]',
    '[class*="tab"]',
  ].join(',');
  document.querySelectorAll(selector).forEach(repair);
}

export function installVisibleControlTextRuntime() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  window.__CHURVOX_VISIBLE_CONTROL_TEXT_BUILD__ = BUILD;
  window.churvoxFixVisibleControlText = fixVisibleControlTextNow;

  let frame = 0;
  const run = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(fixVisibleControlTextNow);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  [100, 300, 700, 1400, 2600].forEach((delay) => window.setTimeout(run, delay));

  const observer = new MutationObserver(run);
  if (document.body) observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed', 'aria-current', 'aria-label'] });
  window.addEventListener('hashchange', run);
  window.addEventListener('popstate', run);
  window.addEventListener('churvox:fresh-data-updated', run);

  return () => {
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener('hashchange', run);
    window.removeEventListener('popstate', run);
    window.removeEventListener('churvox:fresh-data-updated', run);
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  installVisibleControlTextRuntime();
}
