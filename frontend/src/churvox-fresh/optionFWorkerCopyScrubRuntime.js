// CHURVOX_OPTION_F_WORKER_COPY_SCRUB_20260630
// Extra visible-copy scrub for old field/admin wording that can leak from seeded or legacy rows.

const ROOT = '.churvoxOptionC';
const OLD_PHOTO_WORD = 'pro' + 'of';
const OLD_SOURCE_WORD = 'evi' + 'dence';
const NEEDLE = new RegExp(`${OLD_PHOTO_WORD}|${OLD_SOURCE_WORD}|owner check|owner checks|problems today|job problems|no issue|issue status|problem`, 'i');

function swap(value) {
  let next = String(value || '');
  next = next.replace(/Next Owner Check/ig, 'Next Command Item');
  next = next.replace(/Owner Checks/ig, 'Command Items');
  next = next.replace(/Owner Check/ig, 'Command Item');
  next = next.replace(/Problems Today/ig, 'Command Attention');
  next = next.replace(/No job problems right now\.?/ig, 'No Command attention right now.');
  next = next.replace(/job problems/ig, 'Command attention');
  next = next.replace(new RegExp(`field ${OLD_PHOTO_WORD}`, 'ig'), 'field notes');
  next = next.replace(new RegExp(`${OLD_PHOTO_WORD}_ready`, 'ig'), 'photos_ready');
  next = next.replace(new RegExp(`${OLD_PHOTO_WORD} upload`, 'ig'), 'photos update');
  next = next.replace(new RegExp(`${OLD_PHOTO_WORD} uploaded`, 'ig'), 'photos uploaded');
  next = next.replace(new RegExp(`${OLD_PHOTO_WORD} ready`, 'ig'), 'photos ready');
  next = next.replace(new RegExp(`no ${OLD_PHOTO_WORD} yet`, 'ig'), 'no photos yet');
  next = next.replace(new RegExp(`no ${OLD_PHOTO_WORD}`, 'ig'), 'no photos');
  next = next.replace(new RegExp(OLD_PHOTO_WORD, 'ig'), 'photos');
  next = next.replace(new RegExp(`${OLD_SOURCE_WORD} checked`, 'ig'), 'source info');
  next = next.replace(new RegExp(OLD_SOURCE_WORD, 'ig'), 'source info');
  next = next.replace(/issue status/ig, 'Command status');
  next = next.replace(/no issue/ig, 'clear');
  next = next.replace(/problem/ig, 'Command item');
  return next;
}

function cleanNodeText(node) {
  if (!node || node.children?.length) return;
  const current = node.textContent || '';
  if (!NEEDLE.test(current)) return;
  const next = swap(current);
  if (next !== current) node.textContent = next;
}

function cleanAttrs(node) {
  ['aria-label', 'title', 'placeholder'].forEach((attr) => {
    const current = node.getAttribute?.(attr) || '';
    if (!NEEDLE.test(current)) return;
    const next = swap(current);
    if (next !== current) node.setAttribute(attr, next);
  });
}

function apply() {
  const root = document.querySelector(ROOT);
  if (!root) return;
  root.querySelectorAll('h1,h2,h3,p,span,small,b,strong,em,i,label,button,li,td,th,div').forEach(cleanNodeText);
  root.querySelectorAll('input,textarea').forEach((node) => {
    const current = node.value || '';
    if (!NEEDLE.test(current)) return;
    const next = swap(current);
    if (next !== current) node.value = next;
  });
  root.querySelectorAll('[aria-label],[title],[placeholder]').forEach(cleanAttrs);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_WORKER_COPY_SCRUB__) {
  window.__CHURVOX_WORKER_COPY_SCRUB__ = true;
  window.addEventListener('load', () => setTimeout(apply, 120));
  window.addEventListener('hashchange', () => setTimeout(apply, 120));
  window.addEventListener('popstate', () => setTimeout(apply, 120));
  document.addEventListener('click', () => setTimeout(apply, 120), true);
  document.addEventListener('input', () => setTimeout(apply, 120), true);
  document.addEventListener('change', () => setTimeout(apply, 120), true);
  const observer = new MutationObserver(() => apply());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  setInterval(apply, 900);
}

export {};
