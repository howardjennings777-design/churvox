// CHURVOX_COMMAND_FLOOR_BEEN_APPROVED_RUNTIME_20260526
// CHURVOX_COMMAND_FLOOR_FORCE_SCROLL_TALL_BOXES_20260526

const CARD_ID = "churvox-been-approved-page-card";
const SCROLL_STYLE_ID = "churvox-command-floor-scroll-tall-boxes";

function installScrollAndTallBoxStyle() {
  if (document.getElementById(SCROLL_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SCROLL_STYLE_ID;
  style.textContent = `
    html,
    body,
    #root {
      height: auto !important;
      min-height: 100% !important;
      overflow-y: auto !important;
    }

    body:has(.xcf-shell) {
      overflow-y: auto !important;
      overflow-x: hidden !important;
      height: auto !important;
    }

    .xcf-shell {
      height: auto !important;
      min-height: 100vh !important;
      max-height: none !important;
      overflow: visible !important;
      display: grid !important;
      grid-template-rows: auto auto auto auto !important;
      gap: 16px !important;
      padding-bottom: 116px !important;
    }

    .xcf-hero {
      min-height: 160px !important;
      height: auto !important;
    }

    .xcf-metrics {
      min-height: auto !important;
      grid-auto-rows: minmax(112px, auto) !important;
      gap: 14px !important;
    }

    .xcf-metric {
      min-height: 112px !important;
      height: auto !important;
      padding: 18px !important;
      border-radius: 26px !important;
    }

    .xcf-metric b {
      font-size: clamp(1.65rem, 2.6vw, 2.35rem) !important;
    }

    .xcf-main-grid {
      min-height: auto !important;
      height: auto !important;
      grid-template-rows: auto !important;
      grid-auto-rows: minmax(230px, auto) !important;
      align-items: stretch !important;
      gap: 16px !important;
      overflow: visible !important;
    }

    .xcf-card,
    #${CARD_ID} {
      min-height: 230px !important;
      height: auto !important;
      overflow: visible !important;
      border-radius: 30px !important;
    }

    .xcf-action-hub-card {
      min-height: 390px !important;
    }

    .xcf-action-box-grid {
      gap: 12px !important;
    }

    .xcf-action-box {
      min-height: 118px !important;
      height: auto !important;
      padding: 16px !important;
    }

    .xcf-live-card {
      min-height: 430px !important;
    }

    .xcf-map-card {
      min-height: 230px !important;
    }

    .xcf-money-card,
    .xcf-review-card {
      height: auto !important;
      min-height: 250px !important;
      align-self: stretch !important;
    }

    .xcf-money-hero {
      min-height: 128px !important;
    }

    #${CARD_ID} {
      min-height: 220px !important;
    }

    .xcf-bottom-nav {
      position: fixed !important;
      left: max(18px, env(safe-area-inset-left)) !important;
      right: max(18px, env(safe-area-inset-right)) !important;
      bottom: max(12px, env(safe-area-inset-bottom)) !important;
      z-index: 60 !important;
      max-width: 1280px !important;
      margin: 0 auto !important;
    }

    @media (max-height: 820px) and (min-width: 981px) {
      .xcf-shell { padding-bottom: 108px !important; }
      .xcf-hero { min-height: 145px !important; }
      .xcf-metric { min-height: 104px !important; }
      .xcf-card, #${CARD_ID} { min-height: 215px !important; }
      .xcf-action-hub-card { min-height: 360px !important; }
      .xcf-action-box { min-height: 108px !important; }
      .xcf-live-card { min-height: 390px !important; }
      .xcf-map-card { min-height: 205px !important; }
    }

    @media (max-width: 1220px) {
      .xcf-main-grid {
        grid-template-columns: 1fr !important;
      }
      .xcf-card,
      #${CARD_ID} {
        min-height: 220px !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function cleanText(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function readyToBillMetric() {
  return Array.from(document.querySelectorAll("button, .xcf-metric")).find((node) => /Ready to Bill/i.test(cleanText(node)));
}

function readReadyToBill(metric) {
  return {
    amount: metric?.querySelector("b")?.textContent?.trim() || "$0",
    note: metric?.querySelector("small")?.textContent?.trim() || "approved work",
  };
}

function makeLine(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function ensureBeenApprovedCard() {
  const shell = document.querySelector(".xcf-shell");
  const grid = document.querySelector(".xcf-main-grid");
  if (!shell || !grid) return;

  installScrollAndTallBoxStyle();

  const metric = readyToBillMetric();
  const data = readReadyToBill(metric);
  let card = document.getElementById(CARD_ID);

  if (!card) {
    card = document.createElement("button");
    card.id = CARD_ID;
    card.type = "button";
    card.className = "xcf-card xcf-approved-page-card";
    card.setAttribute("aria-label", "Open Been Approved work");
    card.addEventListener("click", () => {
      const ready = readyToBillMetric();
      if (ready) ready.click();
    });

    const header = document.createElement("header");
    const titleWrap = document.createElement("span");
    titleWrap.appendChild(makeLine("small", "Signed-off work ready for admin"));
    titleWrap.appendChild(makeLine("b", "Been Approved"));
    const count = makeLine("strong", "0");
    count.className = "xcf-been-approved-count";
    header.appendChild(titleWrap);
    header.appendChild(count);

    const hero = document.createElement("div");
    hero.className = "xcf-approved-page-hero";
    hero.appendChild(makeLine("span", "Approved work"));
    const amount = makeLine("b", data.amount);
    amount.className = "xcf-been-approved-amount";
    hero.appendChild(amount);
    const note = makeLine("small", data.note);
    note.className = "xcf-been-approved-note";
    hero.appendChild(note);

    const copy = makeLine("p", "Tap to open approved work and prepare the next step without leaving Command Floor.");
    copy.className = "xcf-been-approved-copy";

    card.appendChild(header);
    card.appendChild(hero);
    card.appendChild(copy);
    grid.appendChild(card);
  }

  const amount = card.querySelector(".xcf-been-approved-amount");
  const note = card.querySelector(".xcf-been-approved-note");
  const count = card.querySelector(".xcf-been-approved-count");
  if (amount) amount.textContent = data.amount;
  if (note) note.textContent = data.note;
  if (count) count.textContent = String((data.note.match(/\d+/) || ["0"])[0]);
}

function start() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const run = () => window.requestAnimationFrame(ensureBeenApprovedCard);
  run();
  window.setInterval(run, 1200);
}

start();
