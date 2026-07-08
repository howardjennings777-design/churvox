const FLAG = '__CHURVOX_DATE_INPUT_ISO_GUARD__';

function clipDate(value) {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text.slice(0, 10);
  return value;
}

function patchValueSetter() {
  if (typeof window === 'undefined' || !window.HTMLInputElement) return;
  const proto = window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  if (!descriptor || typeof descriptor.set !== 'function' || typeof descriptor.get !== 'function') return;
  Object.defineProperty(proto, 'value', {
    configurable: true,
    enumerable: descriptor.enumerable,
    get: function getValue() {
      return descriptor.get.call(this);
    },
    set: function setValue(next) {
      let value = next;
      try {
        if (this && this.type === 'date') value = clipDate(next);
      } catch {}
      return descriptor.set.call(this, value);
    },
  });
}

function cleanExistingDateInputs() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    try {
      const clean = clipDate(input.value || input.getAttribute('value') || '');
      if (clean && clean !== input.value) input.value = clean;
      if (clean && clean !== input.getAttribute('value')) input.setAttribute('value', clean);
    } catch {}
  });
}

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  patchValueSetter();
  cleanExistingDateInputs();
  window.addEventListener('load', cleanExistingDateInputs);
  window.addEventListener('churvox:data-refresh', cleanExistingDateInputs);
  window.addEventListener('churvox-owner-app-ready', cleanExistingDateInputs);
  if (typeof MutationObserver !== 'undefined') {
    const start = () => {
      try {
        const root = document.getElementById('root') || document.body;
        if (!root) return;
        const observer = new MutationObserver(cleanExistingDateInputs);
        observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] });
      } catch {}
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
}

export {};
