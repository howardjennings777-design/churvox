// CHURVOX_SAFE_SLIP_CLOSE_RUNTIME_20260704
// Do not remove React-owned drawer nodes manually. Let React close slips itself.

const STYLE_ID = 'option-f-drawer-persistence-style';
const TOAST_ID = 'option-f-drawer-persistence-toast';

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function html(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${TOAST_ID}{position:fixed;left:18px;bottom:72px;z-index:999999;max-width:380px;padding:12px 14px;border-radius:14px;background:#101513;color:#fff;box-shadow:0 18px 44px rgba(16,21,19,.24);font:900 13px/1.35 Inter,system-ui,sans-serif;opacity:0;transform:translateY(12px);transition:.18s ease;pointer-events:none}
    #${TOAST_ID}.show{opacity:1;transform:translateY(0)}
    #${TOAST_ID} small{display:block;margin-top:4px;color:rgba(255,255,255,.72);font-weight:800}
    .churvoxOptionC .cocDrawer[data-saved-state="saved"]{box-shadow:0 30px 90px rgba(22,101,52,.22)!important}
    .churvoxOptionC .cocDrawer[data-saved-state="command"]{box-shadow:0 30px 90px rgba(234,88,12,.28)!important}
    body.churvoxSlipOpen{overflow:hidden!important}
    @media(max-width:760px){#${TOAST_ID}{left:10px;right:10px;bottom:70px;max-width:none}}
  `;
  document.head.appendChild(style);
}

function toast(title, detail = '') {
  ensureStyle();
  let node = document.getElementById(TOAST_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = TOAST_ID;
    document.body.appendChild(node);
  }
  node.innerHTML = `<b>${html(title)}</b>${detail ? `<small>${html(detail)}</small>` : ''}`;
  node.classList.add('show');
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove('show'), 2200);
}

function drawer() {
  return document.querySelector('.churvoxOptionC .cocDrawer');
}

function updateSlipBodyState() {
  document.body.classList.toggle('churvoxSlipOpen', Boolean(drawer()));
}

function closeThroughReact(reason = 'closed') {
  const node = drawer();
  if (!node) return false;
  node.dataset.closingReason = reason;
  try { window.dispatchEvent(new CustomEvent('churvox:close-slip', { detail: { reason } })); } catch (_) {}
  try { document.dispatchEvent(new CustomEvent('churvox:close-slip', { detail: { reason } })); } catch (_) {}

  const closeButton = Array.from(node.querySelectorAll('button')).find((button) => /^close$/i.test(clean(button.textContent)) || /close/i.test(clean(button.textContent)));
  if (closeButton && !closeButton.__churvoxClosingClick) {
    closeButton.__churvoxClosingClick = true;
    closeButton.click();
    window.setTimeout(() => { closeButton.__churvoxClosingClick = false; updateSlipBodyState(); }, 60);
    return true;
  }

  updateSlipBodyState();
  return false;
}

function handleDrawerButton(event) {
  const button = event.target?.closest?.('button');
  const node = button?.closest?.('.churvoxOptionC .cocDrawer');
  if (!button || !node) return;

  const label = lower(button.textContent);
  if (button.__churvoxClosingClick) return;

  if (/close|cancel|done|back/.test(label)) {
    window.setTimeout(updateSlipBodyState, 80);
    return;
  }

  if (/approve|park|save|update access/.test(label)) {
    node.dataset.savedState = /park/.test(label) ? 'command' : 'saved';
    toast(/park/.test(label) ? 'Parked' : /approve/.test(label) ? 'Approved' : 'Saved', 'Closing slip.');
    window.setTimeout(() => closeThroughReact(label), 450);
    window.setTimeout(() => window.dispatchEvent(new Event('hashchange')), 650);
  }
}

function handleEscape(event) {
  if (event.key !== 'Escape') return;
  if (!drawer()) return;
  event.preventDefault();
  closeThroughReact('escape');
}

function handleOutsideClick(event) {
  const node = drawer();
  if (!node || node.contains(event.target)) return;
  if (!event.target?.closest?.('.churvoxOptionC')) return;
  closeThroughReact('outside_click');
}

if (typeof window !== 'undefined' && !window.__CHURVOX_SAFE_SLIP_CLOSE_RUNTIME__) {
  window.__CHURVOX_SAFE_SLIP_CLOSE_RUNTIME__ = true;
  window.addEventListener('load', ensureStyle);
  document.addEventListener('click', handleDrawerButton, false);
  document.addEventListener('keydown', handleEscape, true);
  document.addEventListener('pointerdown', handleOutsideClick, false);
  const observer = new MutationObserver(updateSlipBodyState);
  window.addEventListener('DOMContentLoaded', () => {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    updateSlipBodyState();
  });
}

export {};
