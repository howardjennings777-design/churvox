const PLANS_LAYER_ID = 'option-f-plans-pricing-desk';
const GST_RATE = 1.15;

const plans = [
  {
    name: 'Start',
    price: 39,
    note: 'For a small operator getting jobs, clients and invoices under control.',
    included: ['Jobs, clients, quotes and invoices', 'Today view for jobs and money due', 'Client notes, service memory and price memory', 'CSV client import and export', 'Basic records and history'],
  },
  {
    name: 'Crew',
    price: 89,
    note: 'For a business with workers and proof coming back from the field.',
    included: ['Everything in Start', 'Worker app records', 'Clocked-in and current job view', 'Proof/photos and worker messages', 'Timesheets and slips review'],
  },
  {
    name: 'Operator',
    price: 149,
    badge: 'Most Popular',
    note: 'For owners who want Churvox preparing the admin before they check it.',
    included: ['Everything in Crew', 'Churvox drafted quotes, invoices and replies', 'Follow-up ready queue', 'Job issue capture and admin preparation', 'Less manual admin before owner review'],
  },
  {
    name: 'Command',
    price: 299,
    note: 'For the full approval desk and accounting-ready operating system.',
    included: ['Everything in Operator', 'Command approval desk', 'Approve, edit and park workflow', 'One accounting sync option included', 'Owner-approved draft sync only'],
  },
];

const addOns = [
  { name: 'Command Growth Pack', price: 99, detail: 'Adds 50 active team members plus extra job, admin and payroll capacity.' },
  { name: 'Accounting Sync Add-on', price: 39, detail: 'For non-Command tiers where available. Covers Xero or MYOB sync option.' },
];

function money(value) {
  return `$${Number(value).toFixed(2).replace(/\.00$/, '')}`;
}

function incGst(value) {
  return money(value * GST_RATE);
}

function isPlansPage() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash === 'plans') return true;
  const active = document.querySelector('.churvoxOptionC .cocNav button.active');
  return active && active.textContent.trim().toLowerCase() === 'plans';
}

function card(plan) {
  return `
    <article class="ofPlanCard ${plan.badge ? 'featured' : ''}">
      ${plan.badge ? `<em>${plan.badge}</em>` : ''}
      <h3>${plan.name}</h3>
      <div class="ofPlanPrice"><b>$${plan.price}</b><span>/month + GST</span></div>
      <strong>${incGst(plan.price)} /month inc GST</strong>
      <p>${plan.note}</p>
      <ul>${plan.included.map((item) => `<li>${item}</li>`).join('')}</ul>
    </article>
  `;
}

function addOn(addon) {
  return `
    <article class="ofAddonCard">
      <h3>${addon.name}</h3>
      <div><b>$${addon.price}</b><span>/month + GST</span><strong>${incGst(addon.price)} inc GST</strong></div>
      <p>${addon.detail}</p>
    </article>
  `;
}

function styles() {
  return `
    .churvoxOptionC:has(#${PLANS_LAYER_ID}) .cocPage > .cocPanel{display:none!important}
    .churvoxOptionC:has(#${PLANS_LAYER_ID}) .optionFControlDepth[data-page="plans"]{display:none!important}
    #${PLANS_LAYER_ID}{display:grid;grid-column:1/-1;gap:16px;color:#111815}
    #${PLANS_LAYER_ID} .ofPlansHero{display:grid;grid-template-columns:minmax(260px,1fr) auto;gap:18px;align-items:end;padding:18px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:linear-gradient(135deg,#111815 0%,#222b26 54%,#ea580c 150%);color:#fff;box-shadow:0 18px 42px rgba(16,21,19,.14)}
    #${PLANS_LAYER_ID} .ofPlansHero h2{margin:0;font-size:30px;line-height:1.05;letter-spacing:0;color:#fff}
    #${PLANS_LAYER_ID} .ofPlansHero p{max-width:760px;margin:8px 0 0;color:rgba(255,255,255,.78);font-size:13px;font-weight:850}
    #${PLANS_LAYER_ID} .ofPlanTotals{display:grid;grid-template-columns:repeat(4,minmax(86px,1fr));gap:8px}
    #${PLANS_LAYER_ID} .ofPlanTotals span{display:grid;gap:3px;min-width:92px;padding:10px 12px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.1);backdrop-filter:blur(8px)}
    #${PLANS_LAYER_ID} .ofPlanTotals b{font-size:20px;line-height:1;color:#fff}
    #${PLANS_LAYER_ID} .ofPlanTotals small{font-size:10px;color:rgba(255,255,255,.72);font-weight:950;text-transform:uppercase;letter-spacing:.04em}
    #${PLANS_LAYER_ID} .ofPlanGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
    #${PLANS_LAYER_ID} .ofPlanCard{position:relative;display:grid;align-content:start;gap:10px;min-height:330px;padding:18px;border:1px solid rgba(16,21,19,.09);border-radius:16px;background:#fff;box-shadow:0 16px 36px rgba(16,21,19,.06)}
    #${PLANS_LAYER_ID} .ofPlanCard.featured{border-color:rgba(234,88,12,.4);box-shadow:0 20px 44px rgba(234,88,12,.14)}
    #${PLANS_LAYER_ID} .ofPlanCard em{position:absolute;right:14px;top:14px;border-radius:999px;padding:5px 8px;background:#ea580c;color:#fff;font-size:10px;font-style:normal;font-weight:950}
    #${PLANS_LAYER_ID} .ofPlanCard h3{margin:0;font-size:20px;letter-spacing:0;color:#111815}
    #${PLANS_LAYER_ID} .ofPlanPrice{display:flex;align-items:flex-end;gap:8px}
    #${PLANS_LAYER_ID} .ofPlanPrice b{font-size:42px;line-height:.95;color:#111815}
    #${PLANS_LAYER_ID} .ofPlanPrice span{padding-bottom:4px;color:#52605a;font-size:12px;font-weight:900}
    #${PLANS_LAYER_ID} .ofPlanCard strong{justify-self:start;border-radius:999px;padding:6px 9px;background:#f8faf9;color:#111815;font-size:12px;font-weight:950}
    #${PLANS_LAYER_ID} .ofPlanCard p{margin:0;color:#52605a;font-size:12px;font-weight:850;line-height:1.35}
    #${PLANS_LAYER_ID} .ofPlanCard ul{display:grid;gap:7px;margin:2px 0 0;padding:0;list-style:none}
    #${PLANS_LAYER_ID} .ofPlanCard li{position:relative;padding-left:16px;color:#28332e;font-size:12px;font-weight:850;line-height:1.28}
    #${PLANS_LAYER_ID} .ofPlanCard li::before{content:"";position:absolute;left:0;top:.45em;width:7px;height:7px;border-radius:999px;background:#ea580c}
    #${PLANS_LAYER_ID} .ofAddonGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    #${PLANS_LAYER_ID} .ofAddonCard{display:grid;gap:8px;padding:16px;border:1px solid rgba(16,21,19,.08);border-radius:16px;background:#fff7ed;box-shadow:0 14px 30px rgba(16,21,19,.05)}
    #${PLANS_LAYER_ID} .ofAddonCard h3{margin:0;font-size:16px;color:#111815}
    #${PLANS_LAYER_ID} .ofAddonCard div{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline}
    #${PLANS_LAYER_ID} .ofAddonCard b{font-size:28px;color:#111815}
    #${PLANS_LAYER_ID} .ofAddonCard span,#${PLANS_LAYER_ID} .ofAddonCard strong,#${PLANS_LAYER_ID} .ofAddonCard p{margin:0;color:#52605a;font-size:12px;font-weight:900}
    #${PLANS_LAYER_ID} .ofAddonCard strong{color:#9a3412}
    #${PLANS_LAYER_ID} .ofPlanNote{padding:12px 14px;border-radius:14px;background:#f8faf9;color:#52605a;font-size:12px;font-weight:900}
    @media(max-width:1120px){#${PLANS_LAYER_ID} .ofPlanGrid{grid-template-columns:repeat(2,minmax(0,1fr))}#${PLANS_LAYER_ID} .ofPlansHero{grid-template-columns:1fr}}
    @media(max-width:720px){#${PLANS_LAYER_ID} .ofPlanGrid,#${PLANS_LAYER_ID} .ofAddonGrid,#${PLANS_LAYER_ID} .ofPlanTotals{grid-template-columns:1fr}}
  `;
}

function renderPlans() {
  if (!isPlansPage()) {
    document.getElementById(PLANS_LAYER_ID)?.remove();
    return;
  }
  const root = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!root || document.getElementById(PLANS_LAYER_ID)) return;
  if (!document.getElementById(`${PLANS_LAYER_ID}-style`)) {
    const style = document.createElement('style');
    style.id = `${PLANS_LAYER_ID}-style`;
    style.textContent = styles();
    document.head.appendChild(style);
  }
  const layer = document.createElement('section');
  layer.id = PLANS_LAYER_ID;
  layer.innerHTML = `
    <div class="ofPlansHero">
      <div><h2>Plans and inclusions</h2><p>Each tier shows the locked monthly price, the actual GST-inclusive cost, and what the business gets.</p></div>
      <div class="ofPlanTotals">${plans.map((plan) => `<span><b>${incGst(plan.price)}</b><small>${plan.name} inc GST</small></span>`).join('')}</div>
    </div>
    <div class="ofPlanGrid">${plans.map(card).join('')}</div>
    <div class="ofAddonGrid">${addOns.map(addOn).join('')}</div>
    <div class="ofPlanNote">Pricing is unchanged: GST is shown separately and as an inclusive total for clarity.</div>
  `;
  root.appendChild(layer);
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', renderPlans);
  window.addEventListener('hashchange', () => setTimeout(renderPlans, 80));
  window.addEventListener('popstate', () => setTimeout(renderPlans, 80));
  document.addEventListener('click', () => setTimeout(renderPlans, 120));
  setInterval(renderPlans, 1000);
}
