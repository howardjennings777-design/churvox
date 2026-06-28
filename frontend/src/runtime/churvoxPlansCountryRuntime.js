// CHURVOX_OS_PLANS_COUNTRY_RUNTIME_20260628
// Keeps the logged-in Churvox OS Plans screen aligned with country-specific Stripe pricing.

const COUNTRIES = {
  NZ: { label: "New Zealand", currency: "NZD", symbol: "$", tax: "+ GST", plans: [39, 89, 149, 299], accounting: 39, growth: 99 },
  AU: { label: "Australia", currency: "AUD", symbol: "A$", tax: "+ GST", plans: [39, 89, 149, 299], accounting: 39, growth: 99 },
  US: { label: "United States", currency: "USD", symbol: "US$", tax: "", plans: [29, 69, 119, 249], accounting: 29, growth: 79 },
  UK: { label: "United Kingdom", currency: "GBP", symbol: "£", tax: "+ VAT", plans: [29, 69, 119, 249], accounting: 29, growth: 79 },
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

function priceLabel(meta, amount) {
  return `${meta.symbol}${amount}/month${meta.tax ? ` ${meta.tax}` : ""}`;
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
  `;
  document.head.appendChild(style);
}

function isPlansRoute() {
  const path = window.location.pathname || "";
  const hash = (window.location.hash || "").toLowerCase();
  return path.includes("plans") || hash === "#plans" || hash === "plans";
}

function updatePlansPage() {
  if (!isPlansRoute()) return;
  const root = document.querySelector(".churvoxOS .plansPage");
  if (!root) return;

  ensureStyle();
  const country = normalizeCountry(detectCountry());
  const meta = COUNTRIES[country] || COUNTRIES.NZ;
  setCountry(country);

  const header = root.querySelector(".plansHeader");
  if (header && !header.querySelector(".osPlanCountryBar")) {
    const bar = document.createElement("label");
    bar.className = "osPlanCountryBar";
    bar.innerHTML = `<span>Pricing region</span><select aria-label="Pricing region">${Object.entries(COUNTRIES).map(([code, item]) => `<option value="${code}">${item.label} - ${item.currency}</option>`).join("")}</select><small>Auto-detected. Change this if the country is wrong before checkout.</small>`;
    header.appendChild(bar);
    bar.querySelector("select")?.addEventListener("change", (event) => {
      setCountry(event.target.value);
      scheduleUpdate();
    });
  }

  const select = header?.querySelector(".osPlanCountryBar select");
  if (select && select.value !== country) select.value = country;

  root.querySelectorAll(".planCards article").forEach((card, index) => {
    const strong = card.querySelector("strong");
    if (strong && meta.plans[index] != null) setText(strong, priceLabel(meta, meta.plans[index]));
    const title = card.querySelector("h2")?.textContent?.trim() || PLAN_NAMES[index];
    const dataValue = `${title} ${priceLabel(meta, meta.plans[index] || 0)}`;
    if (card.getAttribute("data-country-price") !== dataValue) card.setAttribute("data-country-price", dataValue);
  });

  root.querySelectorAll(".planMatrix tbody tr").forEach((row) => {
    const first = row.querySelector("td:first-child")?.textContent || "";
    const cells = row.querySelectorAll("td");
    if (/Accounting Sync Add-on/i.test(first) && cells.length >= 5) {
      setText(cells[1], priceLabel(meta, meta.accounting));
      setText(cells[2], priceLabel(meta, meta.accounting));
      setText(cells[3], priceLabel(meta, meta.accounting));
      setText(cells[4], "Included option");
    }
    if (/Command Growth Pack/i.test(first) && cells.length >= 5) {
      setText(cells[4], priceLabel(meta, meta.growth));
    }
  });
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
