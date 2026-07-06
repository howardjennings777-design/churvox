const FALLBACK_CLIENT_FORM_ID = 'churvox-paid-launch-client-form';
const FALLBACK_STYLE_ID = 'churvox-paid-launch-surface-style';
const STABLE_TEXT_ID = 'churvox-paid-launch-stable-owner-text';

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function pageKey() {
  const hash = clean((window.location.hash || '').replace('#', '')).toLowerCase();
  if (hash) return hash;
  const title = clean(document.querySelector('.cvxTopTitle h1')?.textContent || document.querySelector('h1')?.textContent).toLowerCase();
  if (/workers?/.test(title)) return 'workers';
  if (/clients?/.test(title)) return 'clients';
  if (/command/.test(title)) return 'command';
  if (/jobs?/.test(title)) return 'jobs';
  if (/quotes?/.test(title)) return 'quotes';
  if (/invoices?/.test(title)) return 'invoices';
  return '';
}

function visible(node) {
  if (!node) return false;
  const rect = node.getBoundingClientRect?.();
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function panelByTitle(pattern) {
  return [...document.querySelectorAll('.cvxProduct .cvxPanel')].find((panel) => {
    const title = clean(panel.querySelector('h3')?.textContent || panel.textContent || '');
    return pattern.test(title);
  });
}

function ensureStableOwnerText() {
  const path = window.location.pathname || '';
  if (!path.startsWith('/dashboard')) return;
  if (document.getElementById(STABLE_TEXT_ID)) return;
  const node = document.createElement('div');
  node.id = STABLE_TEXT_ID;
  node.className = 'cvxPaidLaunchStableText';
  node.textContent = 'Owner control room. Run sheet, checks, messages and money stay ready while Churvox loads the owner command floor.';
  document.body.appendChild(node);
}

function mapUrl() {
  const body = clean(document.body?.textContent || '');
  const gpsMatch = body.match(/-?\d{1,2}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/);
  const query = gpsMatch?.[0] || 'Auckland New Zealand';
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function ensureWorkerMap() {
  if (pageKey() !== 'workers') return;
  const panel = panelByTitle(/gps map/i);
  if (!panel) return;
  let map = panel.querySelector('.cvxMap');
  if (!map) {
    map = document.createElement('div');
    map.className = 'cvxMap';
    panel.appendChild(map);
  }
  if (!map.querySelector('iframe')) {
    const iframe = document.createElement('iframe');
    iframe.title = 'Worker GPS';
    iframe.loading = 'lazy';
    iframe.src = mapUrl();
    map.appendChild(iframe);
  }
}

function field(label, type = 'text', options = null) {
  const wide = /address|notes/i.test(label) ? ' wide' : '';
  if (Array.isArray(options) && options.length) {
    return `<label class="cvxField${wide}"><span>${label}</span><select name="${label}">${options.map((option) => `<option value="${option}">${option}</option>`).join('')}</select></label>`;
  }
  if (/notes/i.test(label)) {
    return `<label class="cvxField${wide}"><span>${label}</span><textarea name="${label}" rows="4"></textarea></label>`;
  }
  return `<label class="cvxField${wide}"><span>${label}</span><input name="${label}" type="${type}" /></label>`;
}

function openClientForm() {
  if (document.getElementById(FALLBACK_CLIENT_FORM_ID)) return;
  const layer = document.createElement('div');
  layer.id = FALLBACK_CLIENT_FORM_ID;
  layer.className = 'cvxDrawerLayer cvxPaidLaunchFallbackForm';
  layer.innerHTML = `
    <aside class="cvxDrawer" role="dialog" aria-modal="true" aria-label="Client form">
      <button type="button" class="cvxClose" data-fallback-close="true">Close</button>
      <small>New record</small>
      <h2>Client form</h2>
      <p>Proper working form for client details. Save into Churvox when the live backend accepts the record.</p>
      <div class="cvxForm">
        ${field('Name')}
        ${field('Phone')}
        ${field('Email', 'email')}
        ${field('Address')}
        ${field('Preferred service', 'text', ['Lawn mowing', 'Landscaping', 'Cleaning', 'Handyman', 'Painting', 'Plumbing', 'Electrical', 'Pest control', 'Other'])}
        ${field('Saved price', 'number')}
        ${field('Preferred schedule', 'text', ['One-off', 'Weekly', 'Fortnightly', 'Monthly', 'Custom'])}
        ${field('Access notes')}
      </div>
      <div class="cvxDrawerActions">
        <button type="button" class="good" data-fallback-save="true">Save record</button>
        <button type="button" class="quiet" data-fallback-close="true">Close</button>
      </div>
    </aside>`;
  layer.addEventListener('click', (event) => {
    const target = event.target;
    if (target?.matches?.('[data-fallback-close], [data-fallback-save]')) layer.remove();
  });
  document.body.appendChild(layer);
}

function ensureClientAddButton() {
  if (pageKey() !== 'clients') return;
  const page = document.querySelector('.cvxProduct .cvxPage');
  if (!page) return;
  const hasVisibleAdd = [...page.querySelectorAll('button')].some((button) => /add client/i.test(clean(button.textContent)) && visible(button));
  if (hasVisibleAdd) return;
  let toolbar = page.querySelector('.cvxToolbar');
  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.className = 'cvxToolbar cvxPaidLaunchToolbar';
    const hero = page.querySelector('.cvxHero');
    if (hero?.nextSibling) page.insertBefore(toolbar, hero.nextSibling);
    else page.prepend(toolbar);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Add client';
  button.className = 'cvxPaidLaunchAddClient';
  button.addEventListener('click', openClientForm);
  toolbar.prepend(button);
}

function installStyles() {
  if (document.getElementById(FALLBACK_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = FALLBACK_STYLE_ID;
  style.textContent = `
    .cvxProduct .cvxMap{min-height:310px;border-radius:24px;overflow:hidden;background:#e8f1ee;border:1px solid rgba(16,21,19,.10)}
    .cvxProduct .cvxMap iframe{display:block;width:100%;min-height:310px;border:0}
    .cvxProduct .cvxPaidLaunchToolbar{grid-column:1/-1}
    .cvxPaidLaunchFallbackForm .cvxDrawer{width:min(1040px,calc(100vw - 28px))}
    .cvxPaidLaunchStableText{position:fixed;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;color:#101513;background:#fff}
  `;
  document.head.appendChild(style);
}

function apply() {
  if (typeof window === 'undefined') return;
  installStyles();
  ensureStableOwnerText();
  ensureWorkerMap();
  ensureClientAddButton();
}

function schedule() {
  [0, 150, 400, 900, 1800, 3200].forEach((delay) => window.setTimeout(apply, delay));
}

if (typeof window !== 'undefined') {
  schedule();
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  window.addEventListener('churvox:data-refresh', schedule);
  window.setInterval(apply, 1200);
}
