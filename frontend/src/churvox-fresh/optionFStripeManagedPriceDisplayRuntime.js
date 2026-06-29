// CHURVOX_STRIPE_MANAGED_PRICE_DISPLAY_RUNTIME_20260629
// Prevents US/UK pricing screens from showing invented hard-coded amounts.
// Stripe Price IDs remain the source of truth for those regions.

const STORAGE_KEY = 'churvox:billing-country';
const MANAGED = {
  US: { currency: 'USD', label: 'USD price set in Stripe', note: 'Final monthly amount shown in Stripe Checkout' },
  UK: { currency: 'GBP', label: 'GBP price set in Stripe', note: 'Final monthly amount shown in Stripe Checkout' },
};

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function country() {
  try {
    const select = document.querySelector('[data-of-country], .publicCountrySelect select, .osPlanCountryBar select');
    if (select?.value) return clean(select.value).toUpperCase();
  } catch {}
  try {
    const urlCountry = new URLSearchParams(window.location.search || '').get('country');
    if (urlCountry) return clean(urlCountry).toUpperCase();
  } catch {}
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return clean(saved).toUpperCase();
  } catch {}
  return '';
}

function managedMeta() {
  return MANAGED[country()] || null;
}

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function applyAccountCentre(meta) {
  const root = document.getElementById('option-f-plans-pricing-desk');
  if (!root) return;

  root.querySelectorAll('.ofPlanLiveCard').forEach((card) => {
    setText(card.querySelector('.ofPlanPrice b'), 'Stripe');
    setText(card.querySelector('.ofPlanPrice span'), `${meta.currency} checkout`);
    setText(card.querySelector('strong'), meta.note);
  });

  root.querySelectorAll('.ofAddonLiveCard').forEach((card) => {
    setText(card.querySelector('div b'), 'Stripe');
    setText(card.querySelector('div span'), `${meta.currency} checkout`);
    setText(card.querySelector('strong'), meta.note);
  });

  const fine = root.querySelector('.ofPlanFinePrint');
  if (fine) setText(fine, 'NZ/AU prices are shown on the page. US/UK pricing is managed by Stripe Price IDs and the final monthly amount is shown in Stripe Checkout.');

  const regionNote = root.querySelector('.ofBillingRegion small');
  if (regionNote) setText(regionNote, `${meta.currency} pricing is managed by Stripe. Checkout shows the final monthly amount from the configured Stripe Price ID.`);
}

function applyPublicPricing(meta) {
  const root = document.querySelector('.publicSite');
  if (!root) return;

  root.querySelectorAll('.publicPlanGrid article').forEach((card) => {
    setText(card.querySelector('.publicPlanPrice'), meta.label);
    setText(card.querySelector('.publicPlanTax'), meta.note);
  });

  root.querySelectorAll('.publicAddOnGrid article').forEach((card) => {
    setText(card.querySelector('strong'), meta.label);
    const span = card.querySelector('span');
    if (span) setText(span, meta.note);
  });

  root.querySelectorAll('.publicFinePrint').forEach((node) => {
    setText(node, `Showing ${meta.currency}. Final monthly amounts are controlled by Stripe Price IDs and shown in Stripe Checkout.`);
  });
}

function applyManagedDisplay() {
  const meta = managedMeta();
  if (!meta) return;
  applyAccountCentre(meta);
  applyPublicPricing(meta);
}

function schedule() {
  window.setTimeout(applyManagedDisplay, 40);
  window.setTimeout(applyManagedDisplay, 180);
  window.setTimeout(applyManagedDisplay, 600);
}

if (typeof window !== 'undefined' && !window.__CHURVOX_STRIPE_MANAGED_PRICE_DISPLAY__) {
  window.__CHURVOX_STRIPE_MANAGED_PRICE_DISPLAY__ = true;
  window.addEventListener('load', schedule);
  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  document.addEventListener('change', schedule, true);
  document.addEventListener('click', schedule, true);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
