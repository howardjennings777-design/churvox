// Owner recovery action slip runtime.
// Gives recovery action buttons a filled slip when they are not direct navigation buttons.

const ACTION_SLIP_ID = 'churvox-owner-action-slip-runtime';
const ACTION_STYLE_ID = 'churvox-owner-action-slip-style';

function pageKey() {
  const hash = String(window.location.hash || '').replace('#', '').toLowerCase();
  if (hash === 'help') return 'support';
  if (hash === 'inbox') return 'messages';
  if (hash === 'sync' || hash === 'accounting') return 'xero';
  return hash || 'aiguide';
}

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function installStyle() {
  if (document.getElementById(ACTION_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = ACTION_STYLE_ID;
  style.textContent = `
    #${ACTION_SLIP_ID}{position:fixed;inset:0;z-index:1000001;display:none;place-items:center;background:rgba(16,21,19,.48);padding:18px}
    #${ACTION_SLIP_ID}.open{display:grid}
    #${ACTION_SLIP_ID} .slip{width:min(900px,96vw);max-height:90vh;overflow:auto;border-radius:24px;background:#f7f8f4;color:#111815;box-shadow:0 30px 90px rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.6)}
    #${ACTION_SLIP_ID} header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:18px 20px;background:linear-gradient(115deg,#101513,#202a26 70%,#ef553c);color:#fff}
    #${ACTION_SLIP_ID} small{display:block;color:#ffd7c6;font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
    #${ACTION_SLIP_ID} h2{margin:4px 0;color:#fff;font-size:26px;line-height:1;font-weight:950}
    #${ACTION_SLIP_ID} p{margin:0;color:rgba(255,255,255,.82);font-weight:850}
    #${ACTION_SLIP_ID} .close{border:0;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;width:34px;height:34px;font-size:22px}
    #${ACTION_SLIP_ID} .body{padding:18px 20px;display:grid;gap:14px}
    #${ACTION_SLIP_ID} .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    #${ACTION_SLIP_ID} label{display:grid;gap:5px;font-size:10px;text-transform:uppercase;color:#52605a;font-weight:950}
    #${ACTION_SLIP_ID} input,#${ACTION_SLIP_ID} textarea{width:100%;border:1px solid rgba(16,21,19,.12);border-radius:12px;background:#fff;color:#111815;padding:10px;font-weight:850;text-transform:none}
    #${ACTION_SLIP_ID} .actions{display:flex;gap:8px;flex-wrap:wrap}
    #${ACTION_SLIP_ID} .actions button{border:0;border-radius:999px;min-height:36px;padding:8px 14px;background:#111815;color:#fff;font-weight:950}
    #${ACTION_SLIP_ID} .actions button:nth-child(2){background:#ef553c}
    #${ACTION_SLIP_ID} .actions button:nth-child(3){background:#e4e7e7;color:#111815}
    @media(max-width:720px){#${ACTION_SLIP_ID} .grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function fieldRows(page, action) {
  const rows = [
    ['Page', page],
    ['Action', action],
    ['Prepared status', 'Ready for owner review'],
    ['Owner decision', 'Approve, edit, park or send to Command'],
    ['What Churvox prepared', `${action} has been prepared as an owner review item.`],
    ['Owner rule', 'Churvox does the admin. You approve.'],
  ];
  return rows.map(([label, value]) => {
    const long = /prepared|rule|decision/i.test(label);
    return `<label>${esc(label)}${long ? `<textarea rows="3">${esc(value)}</textarea>` : `<input value="${esc(value)}" />`}</label>`;
  }).join('');
}

function openActionSlip(action) {
  installStyle();
  const page = pageKey();
  let node = document.getElementById(ACTION_SLIP_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = ACTION_SLIP_ID;
    document.body.appendChild(node);
    node.addEventListener('click', (event) => {
      if (event.target === node || event.target.closest('[data-action-slip-close]')) node.classList.remove('open');
      const choice = event.target.closest('[data-action-slip-choice]');
      if (!choice) return;
      if (choice.dataset.actionSlipChoice === 'command') {
        node.classList.remove('open');
        window.history.replaceState({}, document.title, '/dashboard#command');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return;
      }
      node.classList.remove('open');
    });
  }
  node.innerHTML = `<section class="slip"><header><div><small>${esc(page)}</small><h2>${esc(action)}</h2><p>Review the prepared owner action before deciding.</p></div><button type="button" class="close" data-action-slip-close>×</button></header><div class="body"><div class="grid">${fieldRows(page, action)}</div><div class="actions"><button type="button" data-action-slip-choice="save">Save review</button><button type="button" data-action-slip-choice="command">Send to Command</button><button type="button" data-action-slip-choice="park">Park</button><button type="button" data-action-slip-close>Close</button></div></div></section>`;
  node.classList.add('open');
}

function clickHandler(event) {
  const button = event.target?.closest?.('#churvox-owner-page-recovery [data-churvox-recovery-action]');
  if (!button) return;
  const label = String(button.textContent || '').replace(/\s+/g, ' ').trim();
  const lower = label.toLowerCase();
  if (/add job|add client|new quote|new invoice|email support|open command/i.test(label)) return;
  event.preventDefault();
  event.stopPropagation();
  openActionSlip(label || 'Owner action');
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_ACTION_SLIP__) {
  window.__CHURVOX_OWNER_ACTION_SLIP__ = true;
  document.addEventListener('click', clickHandler, true);
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') document.getElementById(ACTION_SLIP_ID)?.classList.remove('open'); });
  window.addEventListener('load', installStyle);
}

export {};
