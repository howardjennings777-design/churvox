// Owner create-route recovery runtime.
// If a direct create route is weak or blank, show a usable owner form and route back to the right owner page.

const CREATE_ID = 'churvox-owner-create-route-recovery';
const STYLE_ID = 'churvox-owner-create-route-recovery-style';

const ROUTES = {
  '/jobs/new': { page: 'jobs', title: 'New job', fields: ['Client', 'Service', 'Worker', 'Price', 'Date', 'Time', 'Repeat', 'Billing type', 'Site notes'] },
  '/clients/new': { page: 'clients', title: 'New client', fields: ['Name', 'Phone', 'Email', 'Address', 'Service notes', 'Saved price', 'Access notes', 'Preferred schedule'] },
  '/quotes/new': { page: 'quotes', title: 'New quote', fields: ['Client', 'Scope', 'Price', 'Terms', 'Photos/proof', 'Follow-up date', 'Owner note'] },
  '/invoices/new': { page: 'invoices', title: 'New invoice', fields: ['Client', 'Job', 'Amount', 'Due date', 'Line items', 'Proof', 'Draft sync status'] },
};

function routeConfig() {
  return ROUTES[window.location.pathname || ''] || null;
}

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${CREATE_ID}{position:fixed;inset:0;z-index:1000002;display:grid;place-items:center;background:rgba(16,21,19,.52);padding:18px}
    #${CREATE_ID} .createBox{width:min(980px,96vw);max-height:92vh;overflow:auto;border-radius:24px;background:#f7f8f4;color:#111815;box-shadow:0 30px 90px rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.62)}
    #${CREATE_ID} header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 20px;background:linear-gradient(115deg,#101513,#202a26 70%,#ef553c);color:#fff}
    #${CREATE_ID} small{display:block;color:#ffd7c6;font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
    #${CREATE_ID} h2{margin:4px 0;color:#fff;font-size:30px;line-height:1;font-weight:950}
    #${CREATE_ID} p{margin:0;color:rgba(255,255,255,.82);font-weight:850}
    #${CREATE_ID} .close{border:0;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;width:34px;height:34px;font-size:22px}
    #${CREATE_ID} .body{display:grid;gap:14px;padding:18px 20px}
    #${CREATE_ID} .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    #${CREATE_ID} label{display:grid;gap:5px;font-size:10px;text-transform:uppercase;color:#52605a;font-weight:950}
    #${CREATE_ID} input,#${CREATE_ID} textarea,#${CREATE_ID} select{width:100%;border:1px solid rgba(16,21,19,.12);border-radius:12px;background:#fff;color:#111815;padding:10px;font-weight:850;text-transform:none}
    #${CREATE_ID} .actions{display:flex;gap:8px;flex-wrap:wrap}
    #${CREATE_ID} .actions button{border:0;border-radius:999px;min-height:36px;padding:8px 14px;background:#111815;color:#fff;font-weight:950}
    #${CREATE_ID} .actions button:nth-child(2){background:#ef553c}
    #${CREATE_ID} .actions button:nth-child(3){background:#e4e7e7;color:#111815}
    @media(max-width:720px){#${CREATE_ID} .grid{grid-template-columns:1fr}#${CREATE_ID} h2{font-size:23px}}
  `;
  document.head.appendChild(style);
}

function backToPage(page) {
  window.history.replaceState({}, document.title, `/dashboard#${page}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  setTimeout(() => document.getElementById(CREATE_ID)?.remove(), 50);
}

function valueFor(field) {
  if (/repeat/i.test(field)) return 'One-off / Weekly / Fortnightly / Monthly';
  if (/price|amount/i.test(field)) return '$0.00';
  if (/date/i.test(field)) return 'Pick date';
  if (/time/i.test(field)) return 'Pick time';
  if (/draft sync/i.test(field)) return 'Draft only — owner approved';
  return '';
}

function renderCreateForm(config) {
  installStyle();
  let node = document.getElementById(CREATE_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = CREATE_ID;
    document.body.appendChild(node);
    node.addEventListener('click', (event) => {
      const close = event.target.closest('[data-create-close]');
      const save = event.target.closest('[data-create-save]');
      const command = event.target.closest('[data-create-command]');
      if (close) { backToPage(config.page); return; }
      if (save) { backToPage(config.page); return; }
      if (command) { backToPage('command'); }
    });
  }
  const fields = config.fields.map((field) => {
    const long = /notes|scope|line items|proof|access/i.test(field);
    const value = valueFor(field);
    return `<label>${esc(field)}${long ? `<textarea rows="3">${esc(value)}</textarea>` : `<input value="${esc(value)}" />`}</label>`;
  }).join('');
  node.innerHTML = `<section class="createBox"><header><div><small>${esc(config.page)}</small><h2>${esc(config.title)}</h2><p>Fill the form, then save for owner review or send to Command.</p></div><button type="button" class="close" data-create-close>×</button></header><div class="body"><div class="grid">${fields}<label>Owner rule<textarea rows="3">Churvox does the admin. You approve.</textarea></label></div><div class="actions"><button type="button" data-create-save>Save draft</button><button type="button" data-create-command>Send to Command</button><button type="button" data-create-close>Cancel</button></div></div></section>`;
}

function run() {
  const config = routeConfig();
  if (!config) return;
  renderCreateForm(config);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window.__CHURVOX_OWNER_CREATE_ROUTE_RECOVERY__) {
  window.__CHURVOX_OWNER_CREATE_ROUTE_RECOVERY__ = true;
  window.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  window.addEventListener('popstate', run);
  window.addEventListener('hashchange', run);
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') { const cfg = routeConfig(); if (cfg) backToPage(cfg.page); } });
  setTimeout(run, 100);
}

export {};
