const STYLE_ID = 'churvox-decision-slip-style';
const FLAG = '__CHURVOX_DECISION_SLIP_RUNTIME__';

const css = `
  .cv3Drawer.approval {
    background: #fbf7ef !important;
    border: 1px solid rgba(16,21,19,.12) !important;
  }
  .cv3Drawer.approval > small,
  .cv3Drawer.approval > h2,
  .cv3Drawer.approval > p {
    display: none !important;
  }
  .cv3DecisionSlip {
    display: grid;
    gap: 12px;
    margin: 0 0 16px;
    padding: 14px;
    border-radius: 24px;
    background:
      radial-gradient(circle at 100% 0%, rgba(243,107,33,.16), transparent 34%),
      linear-gradient(135deg, rgba(255,255,255,.96), rgba(255,247,236,.82));
    border: 1px solid rgba(16,21,19,.1);
    box-shadow: 0 18px 42px rgba(37,28,17,.08), inset 0 1px 0 rgba(255,255,255,.75);
    position: relative;
    overflow: hidden;
  }
  .cv3DecisionSlip::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: .45;
    background: repeating-linear-gradient(135deg, rgba(16,21,19,.035) 0 1px, transparent 1px 18px);
    mask-image: linear-gradient(90deg, transparent 0%, #000 36%, #000 100%);
  }
  .cv3DecisionSlip > * { position: relative; z-index: 1; }
  .cv3DecisionHead {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
  }
  .cv3DecisionHead small {
    display: block;
    color: #af4f17;
    text-transform: uppercase;
    letter-spacing: .13em;
    font-size: 10px;
    font-weight: 900;
  }
  .cv3DecisionHead h3 {
    margin: 5px 0 0;
    color: #101513;
    font-size: clamp(26px, 3.4vw, 42px);
    line-height: .95;
    letter-spacing: -.065em;
    font-weight: 760;
  }
  .cv3DecisionHead p {
    margin: 7px 0 0;
    color: #47534d;
    font-size: 13px;
    line-height: 1.35;
    font-weight: 620;
  }
  .cv3DecisionBadge {
    border-radius: 999px;
    padding: 8px 10px;
    color: #fff;
    background: #101513;
    font-size: 11px;
    font-weight: 900;
    white-space: nowrap;
  }
  .cv3DecisionOutcome {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .cv3DecisionOutcome article,
  .cv3DecisionChecks article {
    border: 1px solid rgba(16,21,19,.08);
    border-radius: 18px;
    background: rgba(255,255,255,.74);
    padding: 12px;
  }
  .cv3DecisionOutcome small,
  .cv3DecisionChecks small {
    display: block;
    color: #7a857f;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .11em;
    text-transform: uppercase;
  }
  .cv3DecisionOutcome b,
  .cv3DecisionChecks b {
    display: block;
    margin-top: 5px;
    color: #101513;
    font-size: 14px;
    line-height: 1.2;
    font-weight: 760;
    overflow-wrap: anywhere;
  }
  .cv3DecisionChecks {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }
  .cv3DecisionWarning {
    border-left: 4px solid #f36b21;
    border-radius: 16px;
    padding: 10px 12px;
    background: rgba(243,107,33,.1);
    color: #533018;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 700;
  }
  .cv3DecisionFormLabel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin: 4px 0 -4px;
    padding: 9px 11px;
    border-radius: 16px;
    background: rgba(16,21,19,.06);
    color: #101513;
    font-size: 12px;
    font-weight: 850;
  }
  .cv3DecisionFormLabel span { color: #66736d; font-weight: 700; }
  .cv3Drawer.approval .cv3RealSlip { display: none !important; }
  .cv3Drawer.approval .cv3Form {
    border: 1px solid rgba(16,21,19,.08) !important;
    border-radius: 22px !important;
    padding: 12px !important;
    background: rgba(255,255,255,.58) !important;
  }
  .cv3Drawer.approval .cv3Field span { font-size: 10px !important; letter-spacing: .12em !important; color: #7a4b2c !important; }
  .cv3Drawer.approval .cv3Field input,
  .cv3Drawer.approval .cv3Field textarea,
  .cv3Drawer.approval .cv3Field select {
    background: rgba(255,255,255,.78) !important;
    border-color: rgba(16,21,19,.11) !important;
    font-weight: 650 !important;
  }
  .cv3Drawer.approval .cv3DrawerActions {
    position: sticky !important;
    bottom: 0 !important;
    padding-top: 12px !important;
    background: linear-gradient(180deg, transparent, #fbf7ef 40%) !important;
  }
  @media(max-width: 760px) {
    .cv3DecisionHead, .cv3DecisionOutcome, .cv3DecisionChecks { grid-template-columns: 1fr; }
    .cv3DecisionBadge { justify-self: start; }
  }
`;

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
}
function fieldValue(root, label) {
  const fields = Array.from(root.querySelectorAll('.cv3Field,label'));
  const found = fields.find((field) => lower(field.querySelector('span,small,b')?.textContent).includes(lower(label)));
  const control = found?.querySelector('input,textarea,select');
  return clean(control?.value || control?.textContent || '');
}
function actionFrom(text, type) {
  const hay = lower(`${type} ${text}`);
  if (/invoice/.test(hay)) return 'Create or update an invoice draft for owner review.';
  if (/quote/.test(hay)) return 'Prepare a quote so it can be checked before sending.';
  if (/message|reply/.test(hay)) return 'Prepare a reply linked to the right message or job.';
  if (/client|customer/.test(hay)) return 'Update the client file or customer memory.';
  if (/worker|staff|team/.test(hay)) return 'Update worker, team or field information.';
  if (/run|schedule|recurring/.test(hay)) return 'Build or adjust the run plan before jobs are sent.';
  return 'Update the linked record after owner approval.';
}
function checkFrom(text, type) {
  const hay = lower(`${type} ${text}`);
  if (/invoice/.test(hay)) return ['Amount', 'Client', 'Due date'];
  if (/quote/.test(hay)) return ['Scope', 'Price', 'Client'];
  if (/message|reply/.test(hay)) return ['Tone', 'Client', 'Job context'];
  if (/run|schedule|job|recurring/.test(hay)) return ['Client', 'Worker', 'Date/time'];
  if (/client|customer/.test(hay)) return ['Name', 'Site notes', 'Service'];
  return ['Record', 'Details', 'Owner decision'];
}
function badgeFor(type, record) {
  const hay = lower(`${type} ${record}`);
  if (/invoice/.test(hay)) return 'Invoice check';
  if (/quote/.test(hay)) return 'Quote check';
  if (/message|reply/.test(hay)) return 'Reply check';
  if (/run|schedule|job|recurring/.test(hay)) return 'Job/run check';
  if (/client|customer/.test(hay)) return 'Client check';
  return 'Owner check';
}
function slipTitle(type, record) {
  const hay = lower(`${type} ${record}`);
  if (/invoice/.test(hay)) return 'Invoice draft needs approval';
  if (/quote/.test(hay)) return 'Quote needs approval';
  if (/message|reply/.test(hay)) return 'Reply needs approval';
  if (/run|schedule|job|recurring/.test(hay)) return 'Run plan needs approval';
  if (/client|customer/.test(hay)) return 'Client change needs approval';
  return 'Owner decision needed';
}
function insertDecisionSlip(drawer) {
  if (!drawer || !/approval|command slip|approval slip/i.test(drawer.textContent || '')) return;
  ensureStyle();
  const type = fieldValue(drawer, 'Approval type') || 'Owner check';
  const record = fieldValue(drawer, 'Record') || 'Linked record';
  const client = fieldValue(drawer, 'Client') || 'Business';
  const amount = fieldValue(drawer, 'Amount') || 'Not money related';
  const prepared = fieldValue(drawer, 'What Churvox prepared') || fieldValue(drawer, 'Owner check') || 'Details are ready for owner review.';
  const evidence = fieldValue(drawer, 'Evidence checked') || 'Matched against available Churvox records.';
  const ownerCheck = fieldValue(drawer, 'Owner check') || 'Approve if correct. Edit if needed. Park if not ready.';
  const action = actionFrom(`${record} ${prepared}`, type);
  const checks = checkFrom(`${record} ${ownerCheck}`, type);
  let slip = drawer.querySelector('.cv3DecisionSlip');
  if (!slip) {
    slip = document.createElement('section');
    slip.className = 'cv3DecisionSlip';
    const form = drawer.querySelector('.cv3Form');
    if (form) form.insertAdjacentElement('beforebegin', slip);
    else drawer.insertAdjacentElement('afterbegin', slip);
  }
  slip.innerHTML = `
    <header class="cv3DecisionHead"><div><small>${escapeHtml(badgeFor(type, record))}</small><h3>${escapeHtml(slipTitle(type, record))}</h3><p>${escapeHtml(action)}</p></div><em class="cv3DecisionBadge">Waiting for owner</em></header>
    <section class="cv3DecisionOutcome"><article><small>Linked record</small><b>${escapeHtml(record)}</b></article><article><small>Client / amount</small><b>${escapeHtml(client)} · ${escapeHtml(amount)}</b></article></section>
    <section class="cv3DecisionChecks">${checks.map((item) => `<article><small>Check</small><b>${escapeHtml(item)}</b></article>`).join('')}</section>
    <div class="cv3DecisionWarning">${escapeHtml(ownerCheck)}</div>
    <section class="cv3DecisionOutcome"><article><small>Evidence</small><b>${escapeHtml(evidence)}</b></article><article><small>If approved</small><b>${escapeHtml(action)}</b></article></section>
  `;
  if (!drawer.querySelector('.cv3DecisionFormLabel')) {
    const form = drawer.querySelector('.cv3Form');
    if (form) {
      const label = document.createElement('div');
      label.className = 'cv3DecisionFormLabel';
      label.innerHTML = '<b>Edit details before approving</b><span>These fields are the slip, not a sales pitch.</span>';
      form.insertAdjacentElement('beforebegin', label);
    }
  }
}
function run() {
  document.querySelectorAll('.cv3Drawer.approval,.cv3Drawer,[role="dialog"]').forEach((drawer) => {
    if (/approval slip|command slip|what churvox prepared|evidence checked|owner check/i.test(drawer.textContent || '')) insertDecisionSlip(drawer);
  });
}
function schedule(delay = 80) { setTimeout(run, delay); }
if (typeof window !== 'undefined' && !window[FLAG]) {
  window[FLAG] = true;
  [80, 220, 600, 1200, 2500].forEach(schedule);
  window.addEventListener('load', () => schedule(160));
  window.addEventListener('hashchange', () => schedule(160));
  window.addEventListener('popstate', () => schedule(160));
  document.addEventListener('click', () => [90, 300].forEach(schedule), true);
  const observer = new MutationObserver(() => schedule(90));
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
export {};
