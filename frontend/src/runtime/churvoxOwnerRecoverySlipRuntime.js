// Owner recovery slip runtime.
// Adds a centered filled review slip when recovery cards or fields are tapped.

const SLIP_ID = 'churvox-owner-filled-slip-runtime';
const STYLE_ID = 'churvox-owner-filled-slip-style';

const FIELDS = {
  command: ['Record', 'Client', 'Job', 'Amount', 'Evidence', 'Recommended action', 'Owner note', 'Decision'],
  jobs: ['Client', 'Service', 'Worker', 'Price', 'Date', 'Time', 'Repeat', 'Billing type', 'Site notes', 'Proof status'],
  clients: ['Name', 'Phone', 'Email', 'Address', 'Service notes', 'Saved price', 'Access notes', 'Preferred schedule'],
  workers: ['Worker', 'Current job', 'GPS', 'Clock in', 'Clock out', 'Proof/photos', 'Worker message', 'Timesheet'],
  quotes: ['Client', 'Scope', 'Price', 'Terms', 'Status', 'Follow-up', 'Owner note', 'Convert to job'],
  invoices: ['Client', 'Job', 'Amount', 'Due date', 'Status', 'Proof', 'Sync state', 'Paid check'],
  messages: ['From', 'Client/job', 'Message', 'Prepared reply', 'Priority', 'Decision', 'Owner send'],
  team: ['Name', 'Role', 'Email', 'Phone', 'Access', 'Worker app', 'Active', 'Notes'],
  payroll: ['Worker', 'Period', 'Hours', 'Breaks', 'Adjustments', 'Slip status', 'Review note', 'Export status'],
  xero: ['Connection', 'Tenant', 'Scopes', 'Last sync', 'Draft invoice', 'Payment status', 'Export pack'],
  settings: ['Business name', 'Logo', 'Email', 'Country', 'GST rate', 'Notifications', 'Security', 'Exports'],
  plans: ['Current plan', 'Trial', 'Usage', 'Team count', 'Growth Pack', 'Accounting add-on', 'Billing email'],
  support: ['Topic', 'Page', 'Issue', 'Urgency', 'Contact email', 'Screenshot', 'Prepared note'],
  aiguide: ['Next job', 'Owner check', 'Money due', 'Worker update', 'Missing detail', 'Command handoff'],
};

function pageKey() {
  const hash = String(window.location.hash || '').replace('#', '').toLowerCase();
  if (FIELDS[hash]) return hash;
  if (hash === 'help') return 'support';
  if (hash === 'inbox') return 'messages';
  if (hash === 'sync' || hash === 'accounting') return 'xero';
  return 'aiguide';
}

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${SLIP_ID}{position:fixed;inset:0;z-index:1000000;display:none;place-items:center;background:rgba(16,21,19,.48);padding:18px}
    #${SLIP_ID}.open{display:grid}
    #${SLIP_ID} .slip{width:min(980px,96vw);max-height:90vh;overflow:auto;border-radius:24px;background:#f7f8f4;color:#111815;box-shadow:0 30px 90px rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.6)}
    #${SLIP_ID} header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:18px 20px;background:linear-gradient(115deg,#101513,#202a26 70%,#ef553c);color:#fff}
    #${SLIP_ID} small{display:block;color:#ffd7c6;font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
    #${SLIP_ID} h2{margin:4px 0;color:#fff;font-size:28px;line-height:1;font-weight:950}
    #${SLIP_ID} p{margin:0;color:rgba(255,255,255,.82);font-weight:850}
    #${SLIP_ID} .close{border:0;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;width:34px;height:34px;font-size:22px}
    #${SLIP_ID} .body{padding:18px 20px;display:grid;gap:14px}
    #${SLIP_ID} .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    #${SLIP_ID} label{display:grid;gap:5px;font-size:10px;text-transform:uppercase;color:#52605a;font-weight:950}
    #${SLIP_ID} input,#${SLIP_ID} textarea,#${SLIP_ID} select{width:100%;border:1px solid rgba(16,21,19,.12);border-radius:12px;background:#fff;color:#111815;padding:10px;font-weight:850;text-transform:none}
    #${SLIP_ID} .actions{display:flex;gap:8px;flex-wrap:wrap}
    #${SLIP_ID} .actions button{border:0;border-radius:999px;min-height:36px;padding:8px 14px;background:#111815;color:#fff;font-weight:950}
    #${SLIP_ID} .actions button:nth-child(2){background:#ef553c}
    #${SLIP_ID} .actions button:nth-child(3){background:#e4e7e7;color:#111815}
    @media(max-width:720px){#${SLIP_ID} .grid{grid-template-columns:1fr}#${SLIP_ID} h2{font-size:22px}}
  `;
  document.head.appendChild(style);
}

function valueFor(field, title) {
  if (/price|amount|usage/i.test(field)) return '$0 until record selected';
  if (/status|decision|review|sync|paid/i.test(field)) return 'Ready for owner review';
  if (/connection|tenant|scopes/i.test(field)) return 'Check live accounting status';
  if (/email/i.test(field)) return 'hello@churvox.com';
  if (/repeat/i.test(field)) return 'One-off / Weekly / Fortnightly / Monthly';
  if (/gps/i.test(field)) return 'Google Maps / GPS ready';
  return title || `${field} ready`;
}

function openSlip(title, note) {
  installStyle();
  const page = pageKey();
  const fields = FIELDS[page] || FIELDS.aiguide;
  let node = document.getElementById(SLIP_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = SLIP_ID;
    document.body.appendChild(node);
    node.addEventListener('click', (event) => {
      if (event.target === node || event.target.closest('[data-slip-close]')) node.classList.remove('open');
      const action = event.target.closest('[data-slip-action]');
      if (!action) return;
      if (action.dataset.slipAction === 'command') {
        node.classList.remove('open');
        window.history.replaceState({}, document.title, '/dashboard#command');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return;
      }
      node.classList.remove('open');
    });
  }
  const rows = fields.map((field) => {
    const val = valueFor(field, title);
    const long = /note|message|proof|prepared|issue|guard|scope/i.test(field);
    return `<label>${esc(field)}${long ? `<textarea rows="3">${esc(val)}</textarea>` : `<input value="${esc(val)}" />`}</label>`;
  }).join('') + `<label>Owner rule<textarea rows="3">Churvox does the admin. You approve.</textarea></label>`;
  node.innerHTML = `<section class="slip"><header><div><small>${esc(page)}</small><h2>${esc(title || 'Filled review slip')}</h2><p>${esc(note || 'Review the prepared details before deciding.')}</p></div><button class="close" type="button" data-slip-close>×</button></header><div class="body"><div class="grid">${rows}</div><div class="actions"><button type="button" data-slip-action="save">Save review</button><button type="button" data-slip-action="command">Send to Command</button><button type="button" data-slip-action="park">Park</button><button type="button" data-slip-close>Close</button></div></div></section>`;
  node.classList.add('open');
}

function clickHandler(event) {
  const target = event.target?.closest?.('#churvox-owner-page-recovery .recoveryCard, #churvox-owner-page-recovery .recoveryField');
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  const title = target.querySelector('b,label')?.textContent || target.dataset.slipTitle || 'Filled review slip';
  const note = target.querySelector('span,input')?.textContent || target.querySelector('input')?.value || 'Review the prepared Churvox slip.';
  openSlip(title, note);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_RECOVERY_SLIP__) {
  window.__CHURVOX_OWNER_RECOVERY_SLIP__ = true;
  document.addEventListener('click', clickHandler, true);
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') document.getElementById(SLIP_ID)?.classList.remove('open'); });
  window.addEventListener('load', installStyle);
}

export {};
