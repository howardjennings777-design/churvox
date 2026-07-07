const GST_BREAKOUT_FLAG = '__CHURVOX_PLAN_GST_BREAKOUT__';
const GST_BREAKOUT_CLASS = 'churvoxPlanGstBreakout';
const GST_BREAKOUT_STYLE = 'churvox-plan-gst-breakout-style';
const GST_RATE = 0.15;

const BASE_PRICES = [
  ['Command Growth Pack', 99],
  ['Accounting Sync Add-on', 39],
  ['Accounting Sync', 39],
  ['Operator', 149],
  ['Command', 299],
  ['Start', 39],
  ['Crew', 89],
];

function money(value) {
  const rounded = Math.round(Number(value || 0) * 100) / 100;
  return `$${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}`;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isPlansSurface() {
  const path = String(window.location.pathname || '').toLowerCase();
  const hash = String(window.location.hash || '').toLowerCase();
  return path === '/plans' || hash.includes('plans') || Boolean(document.querySelector('.cv-plans, .cvxPlanGrid'));
}

function priceFor(card) {
  const text = clean(card?.innerText || '');
  const matchByName = BASE_PRICES.find(([label]) => text.toLowerCase().includes(label.toLowerCase()));
  if (matchByName) return matchByName[1];
  const match = text.match(/\$\s*(39|89|99|149|299)(?:\.00)?/);
  return match ? Number(match[1]) : 0;
}

function hasGstPrice(card) {
  const text = clean(card?.innerText || '').toLowerCase();
  return text.includes('+ gst') || text.includes('ex gst') || text.includes('exclude gst') || text.includes('excludes gst');
}

function installStyle() {
  if (document.getElementById(GST_BREAKOUT_STYLE)) return;
  const style = document.createElement('style');
  style.id = GST_BREAKOUT_STYLE;
  style.textContent = `
    .${GST_BREAKOUT_CLASS}{display:grid;gap:4px;margin-top:10px;padding:10px 12px;border:1px solid rgba(249,115,22,.28);border-radius:16px;background:linear-gradient(135deg,#fff7ed,#ffffff);color:#0f172a!important;line-height:1.25;text-align:left}
    .${GST_BREAKOUT_CLASS} b{display:block;color:#0f172a!important;font-size:13px!important;font-weight:1000!important;letter-spacing:-.01em!important}
    .${GST_BREAKOUT_CLASS} span{display:block;color:#64748b!important;font-size:12px!important;font-weight:850!important}
    .${GST_BREAKOUT_CLASS} em{font-style:normal;color:#c2410c!important;font-weight:950!important}
    .cv-price .${GST_BREAKOUT_CLASS}{min-width:190px}
    .cvxPlanGrid article .${GST_BREAKOUT_CLASS}{margin-bottom:10px}
  `;
  document.head.appendChild(style);
}

function gstHtml(price) {
  const gst = Math.round(price * GST_RATE * 100) / 100;
  const total = Math.round((price + gst) * 100) / 100;
  return `<div class="${GST_BREAKOUT_CLASS}" data-churvox-gst-breakout="1"><b>${money(total)}/month incl. GST</b><span>${money(price)}/month ex GST · <em>GST ${money(gst)}</em></span></div>`;
}

function addBreakout(card) {
  if (!card || card.querySelector(`.${GST_BREAKOUT_CLASS}`) || !hasGstPrice(card)) return;
  const price = priceFor(card);
  if (!price) return;
  const holder = document.createElement('div');
  holder.innerHTML = gstHtml(price);
  const node = holder.firstElementChild;
  const target = card.querySelector('.cv-price') || card.querySelector('strong') || card.querySelector('button') || card.querySelector('h3');
  if (!target) return;
  if (target.classList?.contains('cv-price')) target.appendChild(node);
  else target.insertAdjacentElement('afterend', node);
}

function apply() {
  if (!isPlansSurface()) return;
  installStyle();
  document.querySelectorAll('.cv-tier-card, .cv-card, .cvxPlanGrid article, .cv-user-blocks article, .cv-myob-addon').forEach(addBreakout);
}

function schedule() {
  [0, 150, 500, 1200, 2400].forEach((delay) => setTimeout(apply, delay));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[GST_BREAKOUT_FLAG]) {
  window[GST_BREAKOUT_FLAG] = true;
  schedule();
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('churvox-owner-app-ready', schedule);
  window.addEventListener('churvox-auth-refresh', schedule);
  document.addEventListener('click', () => setTimeout(apply, 120));
  setInterval(() => { if (isPlansSurface()) apply(); }, 2000);
}
