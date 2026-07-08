const STYLE_ID = 'churvox-command-slip-final-style';
const FLAG = '__CHURVOX_COMMAND_SLIP_FINAL_RUNTIME__';

const css = `
  .cvxFinalCommandSlip {
    background: #fbf7ef !important;
    border: 1px solid rgba(16,21,19,.12) !important;
  }
  .cvxFinalCommandSlip > small,
  .cvxFinalCommandSlip > h2,
  .cvxFinalCommandSlip > p,
  .cvxFinalCommandSlip .cv3RealSlip,
  .cvxFinalCommandSlip .cv3DecisionSlip,
  .cvxFinalCommandSlip .cv3DecisionFormLabel {
    display: none !important;
  }
  .cvxFinalCommandSlip .cv3Form {
    position: relative !important;
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 12px !important;
    margin: 0 0 12px !important;
    padding: 16px !important;
    border-radius: 28px !important;
    border: 1px solid rgba(16,21,19,.11) !important;
    background:
      radial-gradient(circle at 100% 0%, rgba(243,107,33,.15), transparent 34%),
      linear-gradient(135deg, rgba(255,255,255,.97), rgba(255,247,236,.86)) !important;
    box-shadow: 0 18px 42px rgba(37,28,17,.075), inset 0 1px 0 rgba(255,255,255,.75) !important;
    overflow: hidden !important;
  }
  .cvxFinalCommandSlip .cv3Form::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: .36;
    background: repeating-linear-gradient(135deg, rgba(16,21,19,.03) 0 1px, transparent 1px 18px);
    mask-image: linear-gradient(90deg, transparent 0%, #000 38%, #000 100%);
  }
  .cvxFinalCommandSlip .cv3Form > * {
    position: relative;
    z-index: 1;
  }
  .cvxFinalSlipHeader {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: minmax(0,1fr) auto;
    gap: 12px;
    align-items: start;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(16,21,19,.08);
  }
  .cvxFinalSlipHeader small {
    display: block;
    color: #af4f17;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: .13em;
    text-transform: uppercase;
  }
  .cvxFinalSlipHeader h3 {
    margin: 5px 0 0;
    color: #101513;
    font-size: clamp(25px, 3vw, 38px);
    line-height: .98;
    letter-spacing: -.055em;
    font-weight: 720;
  }
  .cvxFinalSlipHeader p {
    margin: 7px 0 0;
    color: #47534d;
    font-size: 13px;
    line-height: 1.35;
    font-weight: 600;
  }
  .cvxFinalSlipHeader em {
    border-radius: 999px;
    padding: 8px 10px;
    background: #101513;
    color: #fff;
    font-style: normal;
    font-size: 11px;
    font-weight: 900;
    white-space: nowrap;
  }
  .cvxFinalSlipChecks {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .cvxFinalSlipChecks article {
    border: 1px solid rgba(16,21,19,.08);
    border-radius: 17px;
    padding: 10px 11px;
    background: rgba(255,255,255,.68);
  }
  .cvxFinalSlipChecks small {
    display: block;
    color: #7a857f;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .11em;
    text-transform: uppercase;
  }
  .cvxFinalSlipChecks b {
    display: block;
    margin-top: 5px;
    color: #101513;
    font-size: 13px;
    line-height: 1.2;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  .cvxFinalCommandSlip .cv3Field {
    margin: 0 !important;
  }
  .cvxFinalCommandSlip .cv3Field span {
    color: #7a4b2c !important;
    font-size: 9.5px !important;
    font-weight: 900 !important;
    letter-spacing: .12em !important;
    text-transform: uppercase !important;
  }
  .cvxFinalCommandSlip .cv3Field input,
  .cvxFinalCommandSlip .cv3Field textarea,
  .cvxFinalCommandSlip .cv3Field select {
    min-height: 48px !important;
    background: rgba(255,255,255,.72) !important;
    border-color: rgba(16,21,19,.1) !important;
    color: #101513 !important;
    font-weight: 650 !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.65) !important;
  }
  .cvxFinalCommandSlip .cv3Field textarea { min-height: 88px !important; }
  .cvxFinalCommandSlip .cv3Field.wide,
  .cvxFinalCommandSlip label:has(textarea) { grid-column: 1 / -1 !important; }
  .cvxFinalCommandSlip .cv3DrawerActions {
    position: sticky !important;
    bottom: 0 !important;
    margin-top: 6px !important;
    padding: 13px 0 2px !important;
    background: linear-gradient(180deg, transparent, #fbf7ef 42%) !important;
    z-index: 5 !important;
  }
  @media(max-width:760px){
    .cvxFinalCommandSlip .cv3Form,
    .cvxFinalSlipHeader,
    .cvxFinalSlipChecks { grid-template-columns: 1fr !important; }
    .cvxFinalSlipHeader em { justify-self: start; }
  }
`;

const LABELS = {
  'approval type': 'Slip type',
  record: 'What will change',
  client: 'Who it affects',
  amount: 'Money impact',
  'recommended action': 'Owner decision',
  'what churvox prepared': 'Proposed change',
  'evidence checked': 'Evidence used',
  'owner check': 'Check before approving',
};

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function escapeHtml(value) { return String(value || '').replace(/[&<>"]/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch])); }
function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
  if (style.parentNode === document.head && document.head.lastElementChild !== style) document.head.appendChild(style);
}
function isSlip(drawer) {
  return drawer && /approval slip|command slip|what churvox prepared|evidence checked|owner check|recommended action/i.test(drawer.textContent || '');
}
function fields(root) { return Array.from(root.querySelectorAll('.cv3Field,label')).filter((field) => field.querySelector('input,textarea,select')); }
function labelText(field) { return clean(field.querySelector('span,small,b')?.textContent); }
function control(field) { return field?.querySelector('input,textarea,select'); }
function fieldByOriginal(root, name) {
  const wanted = lower(name);
  return fields(root).find((field) => lower(control(field)?.name || '').includes(wanted) || lower(labelText(field)).includes(wanted));
}
function fieldValue(root, name) {
  const found = fieldByOriginal(root, name);
  const input = control(found);
  return clean(input?.value || input?.textContent || '');
}
function relabel(root) {
  fields(root).forEach((field) => {
    const input = control(field);
    const original = lower(input?.name || labelText(field));
    const hit = Object.entries(LABELS).find(([key]) => original.includes(key));
    const span = field.querySelector('span,small,b');
    if (span && hit) span.textContent = hit[1];
  });
}
function titleFor(type, record) {
  const hay = lower(`${type} ${record}`);
  if (/invoice/.test(hay)) return 'Invoice draft approval';
  if (/quote/.test(hay)) return 'Quote approval';
  if (/message|reply/.test(hay)) return 'Reply approval';
  if (/run|schedule|recurring/.test(hay)) return 'Run plan approval';
  if (/assign|worker/.test(hay)) return 'Worker assignment approval';
  if (/job/.test(hay)) return 'Job approval';
  if (/client|customer/.test(hay)) return 'Client record approval';
  return 'Owner approval';
}
function actionFor(type, record, proposed) {
  const hay = lower(`${type} ${record} ${proposed}`);
  if (/invoice/.test(hay)) return 'Approve only if the amount, client and due date are right.';
  if (/quote/.test(hay)) return 'Approve only if the scope and price are ready to send.';
  if (/message|reply/.test(hay)) return 'Approve only if the reply is clear and linked to the right job.';
  if (/client|customer/.test(hay)) return 'Approve only if this client file should change.';
  if (/worker|staff|team|assign/.test(hay)) return 'Approve only if this worker assignment is right.';
  if (/run|schedule|recurring|job/.test(hay)) return 'Approve only if this job or run plan should go ahead.';
  return 'Approve only if this owner decision is correct.';
}
function checksFor(type, record) {
  const hay = lower(`${type} ${record}`);
  if (/invoice/.test(hay)) return ['Amount', 'Client', 'Due date'];
  if (/quote/.test(hay)) return ['Scope', 'Price', 'Client'];
  if (/message|reply/.test(hay)) return ['Reply', 'Client', 'Job context'];
  if (/assign|worker/.test(hay)) return ['Worker', 'Job', 'Reason'];
  if (/run|schedule|job|recurring/.test(hay)) return ['Client', 'Worker', 'Date/time'];
  if (/client|customer/.test(hay)) return ['Name', 'Site notes', 'Service'];
  return ['Record', 'Details', 'Decision'];
}
function apply(drawer) {
  if (!isSlip(drawer)) return;
  ensureStyle();
  drawer.classList.add('cvxFinalCommandSlip');
  drawer.querySelectorAll('.cv3DecisionSlip,.cv3DecisionFormLabel,.cv3RealSlip').forEach((node) => node.remove());
  const form = drawer.querySelector('.cv3Form');
  if (!form) return;
  relabel(drawer);
  const type = fieldValue(drawer, 'Approval type') || 'Owner check';
  const record = fieldValue(drawer, 'Record') || 'Linked record';
  const client = fieldValue(drawer, 'Client') || 'Business';
  const amount = fieldValue(drawer, 'Amount') || 'Not money related';
  const proposed = fieldValue(drawer, 'What Churvox prepared') || fieldValue(drawer, 'Owner check') || '';
  let header = form.querySelector(':scope > .cvxFinalSlipHeader');
  if (!header) {
    header = document.createElement('section');
    header.className = 'cvxFinalSlipHeader';
    form.insertAdjacentElement('afterbegin', header);
  }
  header.innerHTML = `<div><small>${escapeHtml(type)}</small><h3>${escapeHtml(titleFor(type, record))}</h3><p>${escapeHtml(actionFor(type, record, proposed))}</p></div><em>Owner decision</em>`;
  let checks = form.querySelector(':scope > .cvxFinalSlipChecks');
  if (!checks) {
    checks = document.createElement('section');
    checks.className = 'cvxFinalSlipChecks';
    header.insertAdjacentElement('afterend', checks);
  }
  checks.innerHTML = `<article><small>Affects</small><b>${escapeHtml(client)}</b></article><article><small>Money</small><b>${escapeHtml(amount)}</b></article>${checksFor(type, record).map((item) => `<article><small>Check</small><b>${escapeHtml(item)}</b></article>`).join('')}`;
}
function run() {
  document.querySelectorAll('.cv3Drawer,.cvxDrawer,.recordWorkspacePopupPanel,.recordWorkspacePopup,[role="dialog"]').forEach(apply);
}
function schedule(delay = 80) { setTimeout(run, delay); }
if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  [80, 220, 600, 1200, 2500, 5200].forEach(schedule);
  window.addEventListener('load', () => schedule(160));
  window.addEventListener('hashchange', () => schedule(160));
  window.addEventListener('popstate', () => schedule(160));
  window.addEventListener('churvox:data-refresh', () => schedule(160));
  window.addEventListener('churvox-owner-app-ready', () => schedule(160));
  document.addEventListener('click', () => [90, 300].forEach(schedule), true);
  const observer = new MutationObserver(() => schedule(90));
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
export {};
