// CHURVOX_OS_PLANS_COUNTRY_RUNTIME_20260629
// Keeps plan-region display aligned with Stripe. US and UK amounts are Stripe-managed.

const COUNTRIES = {
  NZ: { label: "New Zealand", currency: "NZD", symbol: "$", tax: "+ GST", taxName: "GST", taxRate: 0.15, plans: [39, 89, 149, 299], accounting: 39, growth: 99 },
  AU: { label: "Australia", currency: "AUD", symbol: "A$", tax: "+ GST", taxName: "GST", taxRate: 0.10, plans: [39, 89, 149, 299], accounting: 39, growth: 99 },
  US: { label: "United States", currency: "USD", symbol: "US$", tax: "", taxName: "tax", taxRate: 0, stripeManaged: true },
  UK: { label: "United Kingdom", currency: "GBP", symbol: "£", tax: "+ VAT", taxName: "VAT", taxRate: 0.20, stripeManaged: true },
};

const PLAN_NAMES = ["Start", "Crew", "Operator", "Command"];
const STORAGE_KEY = "churvox:billing-country";
let updateQueued = false;

function normalizeCountry(value) {
  const raw = String(value || "").trim().toUpperCase();
  const aliases = {
    NZ: "NZ", NZL: "NZ", "NEW ZEALAND": "NZ",
    AU: "AU", AUS: "AU", AUSTRALIA: "AU",
    US: "US", USA: "US", "UNITED STATES": "US", "UNITED STATES OF AMERICA": "US",
    UK: "UK", GB: "UK", GBR: "UK", "UNITED KINGDOM": "UK",
  };
  return aliases[raw] || "NZ";
}

function detectCountry() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const paramCountry = params.get("country");
    if (paramCountry) return normalizeCountry(paramCountry);
  } catch {}
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizeCountry(saved);
  } catch {}
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (/auckland|chatham/i.test(tz)) return "NZ";
    if (/sydney|melbourne|brisbane|perth|adelaide|hobart|darwin/i.test(tz)) return "AU";
    if (/london|belfast|guernsey|jersey|isle_of_man/i.test(tz)) return "UK";
    if (/america\//i.test(tz)) return "US";
  } catch {}
  try {
    const locale = String(navigator.language || navigator.userLanguage || "").toUpperCase();
    if (locale.includes("-NZ")) return "NZ";
    if (locale.includes("-AU")) return "AU";
    if (locale.includes("-GB") || locale.includes("-UK")) return "UK";
    if (locale.includes("-US")) return "US";
  } catch {}
  return "NZ";
}

function money(meta, amount) {
  const value = Math.round(Number(amount || 0) * 100) / 100;
  return `${meta.symbol}${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

function priceLabel(meta, amount) {
  if (meta?.stripeManaged) return `${meta.currency} price set in Stripe`;
  return `${meta.symbol}${amount}/month${meta.tax ? ` ${meta.tax}` : ""}`;
}

function taxBreakout(meta, amount) {
  if (!amount || meta?.stripeManaged || !meta.taxRate) return "";
  const tax = Math.round(Number(amount) * Number(meta.taxRate) * 100) / 100;
  const total = Math.round((Number(amount) + tax) * 100) / 100;
  return `<div class="churvoxPlanTaxBreakout" data-churvox-tax-breakout="1"><b>${money(meta, total)}/month incl. ${meta.taxName || "tax"}</b><span>${money(meta, amount)}/month ex ${meta.taxName || "tax"} · <em>${meta.taxName || "tax"} ${money(meta, tax)}</em></span></div>`;
}

function priceNote(meta) {
  if (meta?.stripeManaged) return "Final amount is shown in Stripe Checkout from your configured Price ID.";
  return "Prices show ex-tax, tax amount, and inclusive monthly total before checkout.";
}

function setCountry(country) {
  try {
    if (window.localStorage.getItem(STORAGE_KEY) !== country) window.localStorage.setItem(STORAGE_KEY, country);
  } catch {}
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("country") !== country) {
      url.searchParams.set("country", country);
      window.history.replaceState({}, document.title, url.toString());
    }
  } catch {}
}

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function ensureStyle() {
  if (document.getElementById("churvox-plans-country-runtime-style")) return;
  const style = document.createElement("style");
  style.id = "churvox-plans-country-runtime-style";
  style.textContent = `
    .churvoxOS .osPlanCountryBar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin-top: 14px;
      border: 1px solid rgba(23,21,18,.12);
      border-radius: 8px;
      padding: 10px;
      background: rgba(255,255,255,.62);
    }
    .churvoxOS .osPlanCountryBar span {
      color: #171512;
      font-size: 12px;
      font-weight: 950;
    }
    .churvoxOS .osPlanCountryBar select {
      min-height: 38px;
      border: 1px solid rgba(23,21,18,.16);
      border-radius: 8px;
      background: #fff;
      color: #171512;
      padding: 0 10px;
      font-weight: 900;
    }
    .churvoxOS .osPlanCountryBar small {
      color: #6f665b;
      font-size: 12px;
      font-weight: 850;
    }
    .churvoxPlanTaxBreakout {
      display: grid;
      gap: 4px;
      margin-top: 10px;
      padding: 10px 12px;
      border: 1px solid rgba(249,115,22,.28);
      border-radius: 16px;
      background: linear-gradient(135deg,#fff7ed,#ffffff);
      color: #0f172a !important;
      line-height: 1.25;
      text-align: left;
    }
    .churvoxPlanTaxBreakout b {
      display: block;
      color: #0f172a !important;
      font-size: 13px !important;
      font-weight: 1000 !important;
      letter-spacing: -.01em !important;
    }
    .churvoxPlanTaxBreakout span {
      display: block;
      color: #64748b !important;
      font-size: 12px !important;
      font-weight: 850 !important;
    }
    .churvoxPlanTaxBreakout em {
      color: #c2410c !important;
      font-style: normal;
      font-weight: 950 !important;
    }
    .cv-price .churvoxPlanTaxBreakout { min-width: 190px; }
    .cvxPlanGrid article .churvoxPlanTaxBreakout { margin-bottom: 10px; }
  `;
  document.head.appendChild(style);
}

function isPlansRoute() {
  const path = window.location.pathname || "";
  const hash = (window.location.hash || "").toLowerCase();
  return path.includes("plans") || hash === "#plans" || hash === "plans";
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cardPrice(card) {
  const text = clean(card?.innerText || "").toLowerCase();
  if (text.includes("command growth pack") || text.includes("growth pack")) return 99;
  if (text.includes("accounting sync")) return 39;
  if (text.includes("operator")) return 149;
  if (text.includes("command")) return 299;
  if (text.includes("start")) return 39;
  if (text.includes("crew")) return 89;
  const match = text.match(/\$\s*(39|89|99|149|299)(?:\.00)?/);
  return match ? Number(match[1]) : 0;
}

function hasTaxLanguage(card) {
  const text = clean(card?.innerText || "").toLowerCase();
  return text.includes("+ gst") || text.includes("+ vat") || text.includes("ex gst") || text.includes("ex vat") || text.includes("exclude");
}

function addBreakout(card, meta) {
  if (!card || card.querySelector(".churvoxPlanTaxBreakout") || !hasTaxLanguage(card)) return;
  const amount = cardPrice(card);
  const html = taxBreakout(meta, amount);
  if (!html) return;
  const holder = document.createElement("div");
  holder.innerHTML = html;
  const node = holder.firstElementChild;
  const target = card.querySelector(".cv-price") || card.querySelector("strong") || card.querySelector("button") || card.querySelector("h2") || card.querySelector("h3");
  if (!target) return;
  if (target.classList?.contains("cv-price")) target.appendChild(node);
  else target.insertAdjacentElement("afterend", node);
}

function updateModernPlanTaxBreakouts(meta) {
  document.querySelectorAll(".cv-tier-card, .cv-card, .cvxPlanGrid article, .cv-user-blocks article, .cv-myob-addon").forEach((card) => addBreakout(card, meta));
}

function updatePlansPage() {
  if (!isPlansRoute()) return;

  ensureStyle();
  const country = normalizeCountry(detectCountry());
  const meta = COUNTRIES[country] || COUNTRIES.NZ;
  setCountry(country);

  const root = document.querySelector(".churvoxOS .plansPage");
  if (root) {
    const header = root.querySelector(".plansHeader");
    if (header && !header.querySelector(".osPlanCountryBar")) {
      const bar = document.createElement("label");
      bar.className = "osPlanCountryBar";
      bar.innerHTML = `<span>Pricing region</span><select aria-label="Pricing region">${Object.entries(COUNTRIES).map(([code, item]) => `<option value="${code}">${item.label} - ${item.currency}</option>`).join("")}</select><small>${priceNote(meta)}</small>`;
      header.appendChild(bar);
      bar.querySelector("select")?.addEventListener("change", (event) => {
        setCountry(event.target.value);
        scheduleUpdate();
      });
    }

    const select = header?.querySelector(".osPlanCountryBar select");
    if (select && select.value !== country) select.value = country;
    const note = header?.querySelector(".osPlanCountryBar small");
    setText(note, priceNote(meta));

    root.querySelectorAll(".planCards article").forEach((card, index) => {
      const strong = card.querySelector("strong");
      const label = priceLabel(meta, meta.plans?.[index]);
      setText(strong, label);
      addBreakout(card, meta);
      const title = card.querySelector("h2")?.textContent?.trim() || PLAN_NAMES[index];
      const dataValue = `${title} ${label}`;
      if (card.getAttribute("data-country-price") !== dataValue) card.setAttribute("data-country-price", dataValue);
    });

    root.querySelectorAll(".planMatrix tbody tr").forEach((row) => {
      const first = row.querySelector("td:first-child")?.textContent || "";
      const cells = row.querySelectorAll("td");
      if (/Accounting Sync Add-on/i.test(first) && cells.length >= 5) {
        const label = priceLabel(meta, meta.accounting);
        setText(cells[1], label);
        setText(cells[2], label);
        setText(cells[3], label);
        setText(cells[4], "Included option");
      }
      if (/Command Growth Pack/i.test(first) && cells.length >= 5) {
        setText(cells[4], priceLabel(meta, meta.growth));
      }
    });
  }

  updateModernPlanTaxBreakouts(meta);
}

function scheduleUpdate() {
  if (updateQueued) return;
  updateQueued = true;
  window.requestAnimationFrame(() => {
    updateQueued = false;
    updatePlansPage();
    setTimeout(updatePlansPage, 80);
    setTimeout(updatePlansPage, 400);
  });
}

if (typeof window !== "undefined" && !window.__CHURVOX_PLANS_COUNTRY_RUNTIME__) {
  window.__CHURVOX_PLANS_COUNTRY_RUNTIME__ = true;
  scheduleUpdate();
  window.addEventListener("hashchange", scheduleUpdate);
  window.addEventListener("popstate", scheduleUpdate);

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;
  window.history.pushState = function churvoxPlansPushState(...args) {
    const result = originalPushState.apply(this, args);
    scheduleUpdate();
    return result;
  };
  window.history.replaceState = function churvoxPlansReplaceState(...args) {
    const result = originalReplaceState.apply(this, args);
    scheduleUpdate();
    return result;
  };

  const observer = new MutationObserver(() => {
    if (isPlansRoute()) scheduleUpdate();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
