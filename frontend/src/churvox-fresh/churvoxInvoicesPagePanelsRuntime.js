function isInvoicesPage() {
  const hash = String(window.location.hash || '').replace('#', '').toLowerCase();
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return hash === 'invoices' || /invoices/i.test(active?.textContent || '') || Boolean(document.querySelector('.churvoxOptionC .invoicesPage'));
}

function usefulInvoiceCount(page) {
  if (!page) return 0;
  return page.querySelectorAll('.cocRow, .jobCard, .workerCard, .workCard, .cocField, .miniStat, .action, .toolbar button, .cocPanel button, input, textarea, select').length;
}

function row(title, meta, tone = 'blue') {
  return `<button type="button" class="cocRow ${tone} churvoxInvoiceRestoreRow"><i></i><span><b>${title}</b><small>${meta}</small></span></button>`;
}

function panel(title, tone, html) {
  return `<section class="cocPanel ${tone} churvoxInvoiceRestorePanel"><h2>${title}</h2>${html}</section>`;
}

function ensureInvoicePanels() {
  if (!isInvoicesPage()) {
    document.querySelectorAll('.churvoxInvoiceRestorePanel').forEach((node) => node.remove());
    return;
  }

  const page = document.querySelector('.churvoxOptionC .invoicesPage') || document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!page) return;
  if (page.querySelector('.churvoxInvoiceRestorePanel')) return;
  if (usefulInvoiceCount(page) >= 3) return;

  page.insertAdjacentHTML('beforeend', panel(
    'Invoice Controls',
    'blue wide',
    `<div class="toolbar invoiceRestoreToolbar">
      <button type="button" class="action">Create draft invoice</button>
      <button type="button" class="action dark">Review in Command</button>
      <button type="button" class="action quiet">Refresh accounting state</button>
    </div>`
  ));

  page.insertAdjacentHTML('beforeend', panel(
    'Draft Queue',
    'amber',
    `${row('Draft invoice waiting', 'Owner review happens in Command', 'amber')}
     ${row('Payment status check', 'Only mark paid after accounting refresh confirms paid', 'amber')}
     ${row('Sync guardrail', 'Draft sync only, no automatic sending', 'amber')}`
  ));

  page.insertAdjacentHTML('beforeend', panel(
    'Invoice Proof',
    'coral',
    `${row('Job proof attached', 'Photos, notes, time and extras stay with the invoice record', 'coral')}
     ${row('Customer record linked', 'Client memory and invoice history stay together', 'coral')}
     ${row('Accounting safe', 'No tax filing and no bank payout files', 'coral')}`
  ));
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(ensureInvoicePanels, 120));
  window.addEventListener('hashchange', () => setTimeout(ensureInvoicePanels, 120));
  window.addEventListener('popstate', () => setTimeout(ensureInvoicePanels, 120));
  document.addEventListener('click', () => setTimeout(ensureInvoicePanels, 180), true);
  setInterval(ensureInvoicePanels, 900);
}

export {};
