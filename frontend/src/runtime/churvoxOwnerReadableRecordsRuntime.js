// CHURVOX_OWNER_READABLE_RECORDS_20260704
// Small DOM readability guard. It does not change data or remove React nodes.
// It only gives sparse live records readable labels so pages do not look broken.

(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__CHURVOX_OWNER_READABLE_RECORDS__) return;
  window.__CHURVOX_OWNER_READABLE_RECORDS__ = true;

  const STYLE_ID = 'churvox-owner-readable-records-style';

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function emptyText(node) {
    return !clean(node?.textContent) || clean(node?.textContent) === '-' || clean(node?.textContent) === '/';
  }

  function setText(node, value) {
    if (node && emptyText(node)) node.textContent = value;
  }

  function looksZero(node) {
    return /^\$?0(?:\.00)?$/i.test(clean(node?.textContent));
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .churvoxOptionC {
        max-width: 100vw !important;
        overflow-x: hidden !important;
      }

      .churvoxOptionC .workspace,
      .churvoxOptionC .cocPage {
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
      }

      .churvoxOptionC .cocPanel,
      .churvoxOptionC .ledgerRow,
      .churvoxOptionC .cocRow,
      .churvoxOptionC .jobCard,
      .churvoxOptionC .workCard,
      .churvoxOptionC .workerCard {
        min-width: 0 !important;
      }

      .churvoxOptionC .ledgerRow > *,
      .churvoxOptionC .cocRow *,
      .churvoxOptionC .jobCard *,
      .churvoxOptionC .workCard *,
      .churvoxOptionC .workerCard * {
        min-width: 0 !important;
        overflow-wrap: anywhere !important;
      }

      .churvoxOptionC .ledgerRow b:empty::after,
      .churvoxOptionC .jobCard b:empty::after,
      .churvoxOptionC .workCard b:empty::after,
      .churvoxOptionC .workerCard b:empty::after,
      .churvoxOptionC .cocRow b:empty::after {
        content: 'Record needs details';
      }

      .churvoxOptionC .ledgerRow span:empty::after,
      .churvoxOptionC .jobCard small:empty::after,
      .churvoxOptionC .workCard small:empty::after,
      .churvoxOptionC .workerCard small:empty::after,
      .churvoxOptionC .cocRow small:empty::after {
        content: 'Details not set yet';
      }

      .churvoxOptionC .cocPanel .churvoxEmptyPageNote {
        display: grid;
        gap: 6px;
        margin-top: 10px;
        border: 1px dashed rgba(15,23,42,.18);
        border-radius: 16px;
        padding: 13px;
        background: rgba(255,255,255,.7);
        color: #334155;
        font-size: 13px;
        font-weight: 850;
      }

      .churvoxOptionC .cocField input::placeholder,
      .churvoxOptionC .cocField textarea::placeholder {
        color: #94a3b8 !important;
        -webkit-text-fill-color: #94a3b8 !important;
      }

      @media (max-width: 980px) {
        .churvoxOptionC .workspace .cocPage {
          grid-template-columns: 1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function fillLedger() {
    document.querySelectorAll('.churvoxOptionC .ledgerRow').forEach((row, index) => {
      const cells = row.children;
      setText(cells[0], `Invoice draft ${index + 1}`);
      setText(cells[1], 'Client not set');
      setText(cells[2], 'Draft');
      if (looksZero(cells[3])) cells[3].textContent = 'Needs price';
      setText(cells[4], 'Sync not ready');
      row.setAttribute('aria-label', clean(row.textContent) || `Invoice draft ${index + 1}`);
    });
  }

  function fillCards(selector, titleText, metaText, detailText, moneyText, statusText) {
    document.querySelectorAll(`.churvoxOptionC ${selector}`).forEach((card, index) => {
      setText(card.querySelector('b'), `${titleText} ${index + 1}`);
      setText(card.querySelector('small'), metaText);
      setText(card.querySelector('span'), detailText);
      const em = card.querySelector('em');
      if (em) {
        if (looksZero(em)) em.textContent = moneyText;
        else setText(em, moneyText);
      }
      setText(card.querySelector('i'), statusText);
    });
  }

  function fillRows() {
    document.querySelectorAll('.churvoxOptionC .cocRow').forEach((row, index) => {
      setText(row.querySelector('b'), `Record ${index + 1}`);
      setText(row.querySelector('small'), 'Details not set yet');
      setText(row.querySelector('em'), 'Check');
    });
  }

  function fillFormPlaceholders() {
    const placeholders = {
      invoice: 'Invoice number or draft name',
      client: 'Client name',
      job: 'Job this belongs to',
      amount: 'Price / amount',
      status: 'Draft, due, overdue or paid',
      'xero/myob status': 'Draft sync status',
      'line item': 'What the invoice is for',
      evidence: 'Time, photos, notes or payment source',
      name: 'Name',
      phone: 'Phone number',
      email: 'Email address',
      address: 'Site or billing address',
      notes: 'Useful notes',
      'job name': 'Job name',
      service: 'Service type',
      worker: 'Worker name',
    };

    document.querySelectorAll('.churvoxOptionC .cocDrawer .cocField').forEach((field) => {
      const label = clean(field.querySelector('span')?.textContent).toLowerCase();
      const input = field.querySelector('input, textarea');
      if (!input || input.placeholder) return;
      const key = Object.keys(placeholders).find((item) => label === item || label.includes(item));
      if (key) input.placeholder = placeholders[key];
    });
  }

  function fillEmptyPanels() {
    document.querySelectorAll('.churvoxOptionC .cocPanel').forEach((panel) => {
      if (panel.querySelector('.churvoxEmptyPageNote')) return;
      const meaningful = clean(panel.textContent.replace(clean(panel.querySelector('h2')?.textContent), ''));
      const rows = panel.querySelectorAll('.cocRow,.ledgerRow,.jobCard,.workCard,.workerCard,.chip').length;
      if (rows || meaningful.length > 12) return;
      const note = document.createElement('div');
      note.className = 'churvoxEmptyPageNote';
      note.innerHTML = '<b>No records here yet</b><span>Add a real record or import data. Churvox will show the working details here once saved.</span>';
      panel.appendChild(note);
    });
  }

  function enhance() {
    if (!document.querySelector('.churvoxOptionC')) return;
    ensureStyle();
    fillLedger();
    fillCards('.jobCard', 'Job', 'Client not set · worker not assigned', 'Date/time not set · repeat not set', 'Needs price', 'Needs status');
    fillCards('.workCard', 'Quote', 'Client not set · draft', 'Scope not set yet', 'Needs price', 'Next step not set');
    fillCards('.workerCard', 'Worker', 'Role not set · app not invited', 'Current job not assigned · GPS not active', 'Payroll review', 'Timesheet not started');
    fillRows();
    fillFormPlaceholders();
    fillEmptyPanels();
  }

  window.addEventListener('load', () => setTimeout(enhance, 600));
  window.addEventListener('hashchange', () => setTimeout(enhance, 250));
  window.addEventListener('popstate', () => setTimeout(enhance, 250));
  document.addEventListener('click', () => setTimeout(enhance, 180), true);
  const observer = new MutationObserver(() => {
    clearTimeout(window.__CHURVOX_OWNER_READABLE_TIMER__);
    window.__CHURVOX_OWNER_READABLE_TIMER__ = setTimeout(enhance, 180);
  });
  window.addEventListener('DOMContentLoaded', () => {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    enhance();
  });
})();

export {};
