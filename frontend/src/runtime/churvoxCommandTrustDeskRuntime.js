import API_BASE from '../lib/apiBase';

(function commandTrustDeskRuntime() {
  if (typeof window === 'undefined' || window.__CHURVOX_COMMAND_TRUST_DESK__) return;
  window.__CHURVOX_COMMAND_TRUST_DESK__ = true;

  const STYLE_ID = 'churvox-command-trust-desk-style';
  const PANEL_ID = 'churvox-command-trust-desk';
  const apiRoot = `${String(API_BASE || '').replace(/\/$/, '')}/api`;
  let cache = [];
  let lastFetch = 0;

  function clean(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function list(value) {
    if (Array.isArray(value)) return value.map(clean).filter(Boolean);
    if (clean(value)) return [clean(value)];
    return [];
  }

  function currentPageKey() {
    const hash = clean((window.location.hash || '').replace(/^#/, '')).toLowerCase();
    const path = clean(window.location.pathname || '').toLowerCase();
    if (hash.includes('command') || path.includes('command')) return 'command';
    const h1 = document.querySelector('.cvxTopTitle h1, h1');
    return /command/i.test(clean(h1?.textContent)) ? 'command' : '';
  }

  function confidence(item) {
    return clean(item.confidence || item.confidence_label || (item.needs_owner_input ? 'Boss must complete' : 'Ready to approve'));
  }

  function bucket(item) {
    const c = confidence(item).toLowerCase();
    if (c.includes('must')) return 'must';
    if (c.includes('check')) return 'check';
    return 'ready';
  }

  function titleOf(item) {
    return clean(item.title || item.action || item.summary || item.type || 'Command slip');
  }

  function reasonOf(item) {
    return clean(item.why_here || item.check || item.reason || item.summary || 'Owner approval required.');
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}{grid-column:1/-1;background:#101114;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:18px;box-shadow:0 18px 55px rgba(0,0,0,.22);margin:0 0 18px;position:relative;overflow:hidden}
      #${PANEL_ID}::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at top left,rgba(249,115,22,.24),transparent 36%),linear-gradient(135deg,rgba(249,115,22,.10),transparent 48%);pointer-events:none}
      .cvxTrustInner{position:relative;display:grid;gap:14px}.cvxTrustHead{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}.cvxTrustHead small{color:#fb923c;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.cvxTrustHead h3{margin:3px 0 4px;font-size:22px}.cvxTrustHead p{margin:0;color:#d1d5db;max-width:780px}.cvxTrustCounts{display:flex;gap:8px;flex-wrap:wrap}.cvxTrustCounts span{display:grid;gap:2px;min-width:118px;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:10px 12px;background:rgba(255,255,255,.06)}.cvxTrustCounts b{font-size:20px}.cvxTrustCounts small{color:#cbd5e1;text-transform:none;letter-spacing:0}.cvxTrustList{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}.cvxTrustSlip{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);border-radius:18px;padding:12px;display:grid;gap:8px}.cvxTrustSlip.ready{border-color:rgba(34,197,94,.48)}.cvxTrustSlip.check{border-color:rgba(251,146,60,.55)}.cvxTrustSlip.must{border-color:rgba(248,113,113,.58)}.cvxTrustSlip header{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.cvxTrustSlip strong{font-size:14px}.cvxTrustBadge{font-size:11px;font-weight:900;text-transform:uppercase;border-radius:999px;padding:5px 8px;background:rgba(255,255,255,.12);white-space:nowrap}.cvxTrustSlip.ready .cvxTrustBadge{background:rgba(34,197,94,.16);color:#bbf7d0}.cvxTrustSlip.check .cvxTrustBadge{background:rgba(251,146,60,.16);color:#fed7aa}.cvxTrustSlip.must .cvxTrustBadge{background:rgba(248,113,113,.17);color:#fecaca}.cvxTrustSlip p{margin:0;color:#d1d5db;font-size:12px;line-height:1.45}.cvxTrustTags{display:flex;gap:6px;flex-wrap:wrap}.cvxTrustTags em{font-style:normal;font-size:11px;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:4px 7px;color:#e5e7eb}.cvxTrustEmpty{color:#d1d5db;border:1px dashed rgba(255,255,255,.18);border-radius:16px;padding:14px}.cvxTrustMini{font-size:11px;color:#9ca3af}.cvxTrustAudit{font-size:11px;color:#cbd5e1;border-left:2px solid rgba(249,115,22,.65);padding-left:8px}.cvxDrawer.approval .cvxDrawerActions button.good[data-cvx-unsafe="true"]{opacity:.55;filter:grayscale(.25)}
    `;
    document.head.appendChild(style);
  }

  function getRoot() {
    return document.querySelector('.cvxApp main, main, #root');
  }

  function removePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  async function fetchActions(force = false) {
    const now = Date.now();
    if (!force && now - lastFetch < 45000 && cache.length) return cache;
    lastFetch = now;
    try {
      const res = await fetch(`${apiRoot}/ai/actions`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const rows = Array.isArray(payload?.actions) ? payload.actions : Array.isArray(payload?.items) ? payload.items : [];
      cache = rows;
    } catch (_) {
      cache = cache || [];
    }
    return cache;
  }

  function renderPanel(actions) {
    if (currentPageKey() !== 'command') { removePanel(); return; }
    ensureStyle();
    const root = getRoot();
    if (!root) return;
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('section');
      panel.id = PANEL_ID;
      const hero = document.querySelector('.cvxHero');
      if (hero?.parentNode) hero.parentNode.insertBefore(panel, hero.nextSibling);
      else root.prepend(panel);
    }
    const ready = actions.filter((item) => bucket(item) === 'ready').length;
    const check = actions.filter((item) => bucket(item) === 'check').length;
    const must = actions.filter((item) => bucket(item) === 'must').length;
    const worker = actions.filter((item) => clean(item.worker_slip_type)).length;
    const duplicates = actions.filter((item) => item.possible_duplicate || clean(item.duplicate_warning)).length;
    const blockedInvoices = actions.filter((item) => /cannot invoice/i.test(clean(item.invoice_guard))).length;
    const top = actions.slice(0, 5);

    panel.innerHTML = `
      <div class="cvxTrustInner">
        <div class="cvxTrustHead">
          <div><small>Command trust desk</small><h3>Churvox shows what it knows — and what the boss must finish.</h3><p>Unsafe slips stay boss-to-do. Ready slips still need owner approval before anything is sent, synced, invoiced or changed.</p></div>
          <div class="cvxTrustCounts">
            <span><b>${ready}</b><small>ready to approve</small></span>
            <span><b>${check}</b><small>needs boss check</small></span>
            <span><b>${must}</b><small>boss must complete</small></span>
            <span><b>${blockedInvoices}</b><small>invoice blocked</small></span>
          </div>
        </div>
        ${top.length ? `<div class="cvxTrustList">${top.map((item) => {
          const b = bucket(item);
          const missing = list(item.missing_fields).slice(0, 4);
          const tags = [clean(item.worker_slip_type), clean(item.job_health), clean(item.invoice_guard), clean(item.client_memory_warning), clean(item.duplicate_warning)].filter(Boolean).slice(0, 4);
          const audit = list(item.audit_trail).slice(-2).join(' · ');
          return `<article class="cvxTrustSlip ${b}"><header><strong>${escapeHtml(titleOf(item))}</strong><span class="cvxTrustBadge">${escapeHtml(confidence(item))}</span></header><p>${escapeHtml(reasonOf(item))}</p>${missing.length ? `<div class="cvxTrustTags">${missing.map((field) => `<em>Boss add/check: ${escapeHtml(field)}</em>`).join('')}</div>` : ''}${tags.length ? `<div class="cvxTrustTags">${tags.map((tag) => `<em>${escapeHtml(tag)}</em>`).join('')}</div>` : ''}${audit ? `<div class="cvxTrustAudit">${escapeHtml(audit)}</div>` : ''}</article>`;
        }).join('')}</div>` : `<div class="cvxTrustEmpty"><b>Command is clear.</b><br/>When slips appear, this desk will show confidence, missing fields, duplicate checks, invoice guard, worker triage and park reasons.</div>`}
        <div class="cvxTrustMini">Worker triage: ${worker}. Possible duplicates: ${duplicates}. Park reasons: Waiting for client, Need price, Need worker, Need photos/proof, Need job link, Not doing yet, Unsure.</div>
      </div>
    `;
  }

  function escapeHtml(value) {
    return clean(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  }

  function markUnsafeApproveButtons(actions) {
    const drawer = document.querySelector('.cvxDrawer.approval');
    if (!drawer) return;
    const title = clean(drawer.querySelector('h2')?.textContent || drawer.textContent || '').toLowerCase();
    const unsafe = actions.some((item) => {
      const itemTitle = titleOf(item).toLowerCase();
      return itemTitle && title.includes(itemTitle.slice(0, 24)) && (item.needs_owner_input || item.safe_to_complete === false || list(item.missing_fields).length);
    });
    const approve = Array.from(drawer.querySelectorAll('button')).find((button) => /^approve$/i.test(clean(button.textContent)));
    if (approve && unsafe) {
      approve.dataset.cvxUnsafe = 'true';
      approve.title = 'Boss must complete missing fields first. Backend safety will block unsafe completion.';
    }
  }

  async function refresh(force = false) {
    const actions = await fetchActions(force);
    renderPanel(actions);
    markUnsafeApproveButtons(actions);
  }

  const originalFetch = window.fetch;
  window.fetch = async function cvxCommandTrustFetch(input, init) {
    const response = await originalFetch.apply(this, arguments);
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      const method = clean(init?.method || 'GET').toUpperCase();
      if (/\/api\/command\/|\/api\/ai\/actions/.test(url) && method !== 'GET') {
        setTimeout(() => refresh(true), 700);
      }
    } catch (_) {}
    return response;
  };

  ['hashchange', 'popstate', 'churvox:data-refresh', 'churvox:command-refresh', 'churvox-owner-app-ready'].forEach((event) => {
    window.addEventListener(event, () => setTimeout(() => refresh(event !== 'hashchange'), 250));
  });

  const observer = new MutationObserver(() => {
    if (currentPageKey() === 'command') setTimeout(() => refresh(false), 120);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  [300, 900, 1800, 3500, 7000].forEach((delay) => setTimeout(() => refresh(true), delay));
})();
