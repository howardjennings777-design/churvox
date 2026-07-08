const FLAG = '__CHURVOX_COMMAND_SLIP_POLISH_RUNTIME__';

function isOwnerApp() {
  const path = window.location.pathname || '';
  return path === '/dashboard' || path.startsWith('/dashboard');
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function ensureStyle() {
  if (document.getElementById('cvx-command-slip-polish-style')) return;
  const style = document.createElement('style');
  style.id = 'cvx-command-slip-polish-style';
  style.textContent = `
    .cvxDrawer.approval{max-width:min(980px,92vw)!important;border-radius:30px!important;background:linear-gradient(180deg,#fff,#fffaf6)!important;box-shadow:0 32px 90px rgba(15,23,42,.34)!important;border:1px solid rgba(15,23,42,.08)!important}
    .cvxDrawer.approval>small{display:inline-grid!important;width:max-content;border-radius:999px!important;padding:7px 10px!important;background:#fff7ed!important;color:#9a3412!important;font-weight:1000!important;letter-spacing:.12em!important;text-transform:uppercase!important}
    .cvxDrawer.approval>h2{font-size:clamp(30px,4vw,48px)!important;letter-spacing:-.075em!important;margin:.35rem 0 .15rem!important;color:#111827!important}
    .cvxDrawer.approval>p{max-width:760px!important;color:#475569!important;font-weight:850!important;line-height:1.45!important}
    .cvxCommandDecisionCard{display:grid!important;gap:12px!important;margin:16px 0!important;padding:18px!important;border-radius:24px!important;background:linear-gradient(135deg,#111827,#1f2937 58%,#f97316)!important;color:#fff!important;position:relative!important;overflow:hidden!important;box-shadow:0 18px 45px rgba(15,23,42,.24)!important}
    .cvxCommandDecisionCard:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 92% 8%,rgba(255,255,255,.24),transparent 23%),repeating-linear-gradient(135deg,rgba(255,255,255,.06) 0 1px,transparent 1px 18px)}
    .cvxCommandDecisionCard>*{position:relative;z-index:1}.cvxCommandDecisionCard small{color:#fed7aa!important;font-size:11px!important;font-weight:1000!important;letter-spacing:.14em!important;text-transform:uppercase!important}.cvxCommandDecisionCard b{font-size:22px!important;line-height:1.05!important;letter-spacing:-.04em!important}.cvxCommandDecisionCard p{margin:0!important;color:rgba(255,255,255,.82)!important;font-weight:800!important;line-height:1.35!important}
    .cvxDrawer.approval .cvxForm{gap:13px!important}.cvxDrawer.approval .cvxField span{font-size:10px!important;font-weight:1000!important;letter-spacing:.12em!important;color:#64748b!important;text-transform:uppercase!important}.cvxDrawer.approval .cvxField input,.cvxDrawer.approval .cvxField select,.cvxDrawer.approval .cvxField textarea{font-weight:850!important;color:#111827!important;background:#fff!important;border-color:rgba(15,23,42,.1)!important}.cvxDrawer.approval .cvxField.wide textarea{min-height:96px!important;line-height:1.5!important}
    .cvxDrawer.approval .cvxDrawerActions{position:sticky!important;bottom:0!important;background:linear-gradient(180deg,rgba(255,255,255,.72),#fff)!important;padding-top:14px!important;border-top:1px solid rgba(15,23,42,.08)!important}.cvxDrawer.approval .cvxDrawerActions .good{background:#16a34a!important}.cvxDrawer.approval .cvxDrawerActions button{min-height:46px!important;border-radius:999px!important;font-weight:1000!important}
  `;
  document.head.appendChild(style);
}

function labelValue(drawer, label) {
  const fields = Array.from(drawer.querySelectorAll('.cvxField'));
  const found = fields.find((field) => clean(field.querySelector('span')?.textContent).toLowerCase() === label.toLowerCase());
  return clean(found?.querySelector('input,textarea,select')?.value || found?.querySelector('input,textarea,select')?.textContent);
}

function polish() {
  if (!isOwnerApp()) return;
  ensureStyle();
  document.querySelectorAll('.cvxDrawer.approval').forEach((drawer) => {
    if (drawer.dataset.commandSlipPolished === 'true') return;
    drawer.dataset.commandSlipPolished = 'true';
    const type = labelValue(drawer, 'Approval type') || 'Owner decision';
    const record = labelValue(drawer, 'Record') || drawer.querySelector('h2')?.textContent || 'Command item';
    const filled = labelValue(drawer, 'What Churvox filled') || 'Churvox prepared this from live records.';
    const h2 = drawer.querySelector('h2');
    if (h2) h2.textContent = 'Command decision';
    const intro = drawer.querySelector('p');
    if (intro) intro.textContent = 'Review the reason, adjust anything wrong, then approve, save, or park it. Nothing leaves Churvox without the owner.';
    const card = document.createElement('section');
    card.className = 'cvxCommandDecisionCard';
    card.innerHTML = `<small>${type}</small><b>${record}</b><p>${filled}</p>`;
    const form = drawer.querySelector('.cvxForm');
    if (form) drawer.insertBefore(card, form);
    drawer.querySelectorAll('.cvxField span').forEach((label) => {
      const text = clean(label.textContent);
      const rename = {
        'What Churvox filled': 'What happened',
        'Evidence checked': 'Why this is here',
        'Owner check': 'Owner decision',
        'Recommended action': 'Next move',
        'Approval type': 'Decision type',
        'Record': 'Linked record',
      }[text];
      if (rename) label.textContent = rename;
    });
  });
}

function schedule() {
  if (!isOwnerApp()) return;
  [80, 220, 600, 1200].forEach((delay) => window.setTimeout(polish, delay));
}

if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();
  window.addEventListener('load', schedule);
  window.addEventListener('click', () => window.setTimeout(polish, 120), true);
  window.addEventListener('churvox-owner-app-ready', schedule);
}

export {};
