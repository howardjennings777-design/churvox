const MAP = {
  'Proof/photos': 'Photos / notes',
  'Proof photos ready': 'Photos ready',
  'proof photos ready': 'Photos ready',
  'No proof yet': 'No photos yet',
  'Evidence checked': 'Source info',
  'Owner check': 'Owner note',
  'Proof': 'Photos',
  'proof': 'photos',
};

function swap(value) {
  let next = String(value || '');
  Object.keys(MAP).forEach((key) => {
    next = next.split(key).join(MAP[key]);
  });
  return next;
}

function applyPlainLanguage() {
  const root = document.querySelector('.churvoxOptionC');
  if (!root) return;
  root.querySelectorAll('h1,h2,h3,p,span,small,b,strong,em,i,label,button,li,td,th,div').forEach((node) => {
    if (node.children.length) return;
    const current = node.textContent || '';
    if (!/proof|evidence checked|owner check/i.test(current)) return;
    const next = swap(current);
    if (next !== current) node.textContent = next;
  });
  root.querySelectorAll('input,textarea').forEach((node) => {
    const current = node.value || '';
    if (!/proof|evidence checked|owner check/i.test(current)) return;
    const next = swap(current);
    if (next !== current) node.value = next;
  });
}

function schedulePlainLanguage() {
  setTimeout(applyPlainLanguage, 120);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PLAIN_LANGUAGE_RUNTIME__) {
  window.__CHURVOX_PLAIN_LANGUAGE_RUNTIME__ = true;
  window.addEventListener('load', schedulePlainLanguage);
  window.addEventListener('hashchange', schedulePlainLanguage);
  window.addEventListener('popstate', schedulePlainLanguage);
  document.addEventListener('click', schedulePlainLanguage, true);
  document.addEventListener('input', schedulePlainLanguage, true);
  document.addEventListener('change', schedulePlainLanguage, true);
  setInterval(applyPlainLanguage, 1800);
}

export {};
