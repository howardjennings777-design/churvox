// CHURVOX_14_DAY_TRIAL_PLANS_PATCH_20260601
// Visual/copy patch only. Trial logic already runs through /billing/start-trial.

function ensureStyle() {
  if (document.getElementById("churvox-14-day-trial-plans-style")) return;
  const style = document.createElement("style");
  style.id = "churvox-14-day-trial-plans-style";
  style.textContent = `
    .cv-trial-banner,
    .cxp-trial-banner {
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      gap:14px;
      align-items:center;
      border:1px solid rgba(34,197,94,.20);
      border-radius:24px;
      padding:16px 18px;
      background:linear-gradient(135deg, rgba(220,252,231,.98), rgba(224,242,254,.92));
      color:#0f172a;
      box-shadow:0 16px 38px rgba(15,23,42,.07);
    }
    .cv-trial-banner b,
    .cxp-trial-banner b {
      display:block;
      margin:0 0 4px;
      color:#052e16;
      font-size:20px;
      line-height:1.05;
      font-weight:950;
      letter-spacing:-.04em;
    }
    .cv-trial-banner span,
    .cxp-trial-banner span {
      display:block;
      color:#335044;
      font-size:13px;
      line-height:1.4;
      font-weight:800;
    }
    .cv-trial-pill,
    .cxp-trial-pill {
      white-space:nowrap;
      border-radius:999px;
      padding:10px 13px;
      background:#052e16;
      color:#bbf7d0;
      font-size:11px;
      font-weight:950;
      letter-spacing:.12em;
      text-transform:uppercase;
    }
    .cv-trial-mini,
    .cxp-trial-mini {
      margin:6px 0 10px;
      width:fit-content;
      border:1px solid rgba(34,197,94,.22);
      border-radius:999px;
      padding:6px 9px;
      background:rgba(220,252,231,.92);
      color:#166534;
      font-size:10px;
      font-weight:950;
      letter-spacing:.10em;
      text-transform:uppercase;
    }
    .cv-card.featured .cv-trial-mini,
    .cxp-plan.is-featured .cxp-trial-mini {
      background:rgba(34,197,94,.16);
      border-color:rgba(187,247,208,.26);
      color:#bbf7d0;
    }
    @media (max-width:720px){
      .cv-trial-banner,
      .cxp-trial-banner{grid-template-columns:1fr;}
      .cv-trial-pill,
      .cxp-trial-pill{width:fit-content;}
    }
  `;
  document.head.appendChild(style);
}

function addBanner(container, className) {
  if (!container || container.querySelector(`.${className}`)) return;
  const banner = document.createElement("section");
  banner.className = className;
  banner.innerHTML = `<div><b>Start with a 14-day free trial.</b><span>Try Churvox first. No card needed to start the trial — choose a plan, set up your business, then upgrade when you are ready.</span></div><div class="${className === "cv-trial-banner" ? "cv-trial-pill" : "cxp-trial-pill"}">14 days free</div>`;
  const hero = container.querySelector(".cv-plans-hero") || container.querySelector(".cxp-hero");
  if (hero) hero.insertAdjacentElement("afterend", banner);
  else container.prepend(banner);
}

function addMiniBadges() {
  document.querySelectorAll(".cv-card").forEach((card) => {
    if (card.querySelector(".cv-trial-mini")) return;
    const price = card.querySelector(".cv-price");
    const mini = document.createElement("div");
    mini.className = "cv-trial-mini";
    mini.textContent = "14-day free trial";
    if (price) price.insertAdjacentElement("afterend", mini);
  });

  document.querySelectorAll(".cxp-plan").forEach((card) => {
    if (card.querySelector(".cxp-trial-mini")) return;
    const price = card.querySelector(".cxp-price");
    const mini = document.createElement("div");
    mini.className = "cxp-trial-mini";
    mini.textContent = "14-day free trial";
    if (price) price.insertAdjacentElement("afterend", mini);
  });
}

function updateButtons() {
  document.querySelectorAll(".cxp-plan .cxp-btn").forEach((btn) => {
    const text = btn.textContent || "";
    if (text.includes("14-day")) return;
    btn.textContent = text.replace("Choose ", "Start 14-day free trial — ");
  });

  document.querySelectorAll(".cv-card button").forEach((btn) => {
    const text = btn.textContent || "";
    if (text.includes("Start free trial") && !text.includes("14-day")) {
      btn.textContent = text.replace("Start free trial", "Start 14-day free trial");
    }
  });
}

function patchTrialCopy() {
  if (typeof document === "undefined") return;
  ensureStyle();
  const appPlans = document.querySelector(".cv-plans-shell");
  if (appPlans) addBanner(appPlans, "cv-trial-banner");
  const pricingPage = document.querySelector(".cxp-page");
  if (pricingPage) addBanner(pricingPage, "cxp-trial-banner");
  addMiniBadges();
  updateButtons();
}

if (typeof window !== "undefined") {
  patchTrialCopy();
  window.addEventListener("DOMContentLoaded", patchTrialCopy);
  window.addEventListener("load", patchTrialCopy);
  const observer = new MutationObserver(patchTrialCopy);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export default null;
