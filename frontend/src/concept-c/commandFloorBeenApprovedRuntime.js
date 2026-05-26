// CHURVOX_COMMAND_FLOOR_BEEN_APPROVED_RUNTIME_20260526
// CHURVOX_COMMAND_FLOOR_FORCE_SCROLL_TALL_BOXES_20260526
// CHURVOX_COMMAND_FLOOR_BEEN_APPROVED_CARD_POLISH_20260526

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
      padding-bottom: 148px !important;
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
      grid-auto-rows: minmax(250px, auto) !important;
      align-items: stretch !important;
      gap: 16px !important;
      overflow: visible !important;
    }

    .xcf-card,
    #${CARD_ID} {
      min-height: 250px !important;
      height: auto !important;
      overflow: visible !important;
      border-radius: 30px !important;
    }

    .xcf-action-hub-card {
      min-height: 410px !important;
    }

    .xcf-action-box-grid {
      gap: 12px !important;
    }

    .xcf-action-box {
      min-height: 126px !important;
      height: auto !important;
      padding: 16px !important;
    }

    .xcf-live-card {
      min-height: 450px !important;
    }

    .xcf-map-card {
      min-height: 240px !important;
    }

    .xcf-money-card,
    .xcf-review-card {
      height: auto !important;
      min-height: 270px !important;
      align-self: stretch !important;
    }

    .xcf-money-hero {
      min-height: 138px !important;
    }

    #${CARD_ID} {
      min-height: 245px !important;
      display: grid !important;
      align-content: stretch !important;
      gap: 14px !important;
      padding: 18px !important;
      text-align: left !important;
      cursor: pointer !important;
      color: #ecfdf5 !important;
      background: linear-gradient(135deg, #052e16 0%, #166534 58%, #22c55e 100%) !important;
      border: 1px solid rgba(22, 163, 74, .36) !important;
      box-shadow: 0 24px 60px rgba(22, 163, 74, .24), inset 0 1px 0 rgba(255, 255, 255, .18) !important;
    }

    #${CARD_ID} header {
      min-height: auto !important;
      display: flex !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      gap: 12px !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
    }

    #${CARD_ID} header small,
    #${CARD_ID} .xcf-approved-page-hero span {
      display: block !important;
      color: #bbf7d0 !important;
      font-size: .68rem !important;
      font-weight: 950 !important;
      letter-spacing: .13em !important;
      text-transform: uppercase !important;
      line-height: 1.15 !important;
    }

    #${CARD_ID} header b {
      display: block !important;
      margin-top: 4px !important;
      color: #fff !important;
      font-size: 1.2rem !important;
      line-height: 1 !important;
      font-weight: 950 !important;
      letter-spacing: -.04em !important;
    }

    #${CARD_ID} header strong {
      min-width: 42px !important;
      height: 34px !important;
      display: grid !important;
      place-items: center !important;
      border-radius: 999px !important;
      color: #fff !important;
      background: rgba(255, 255, 255, .16) !important;
      border: 1px solid rgba(255, 255, 255, .18) !important;
      font-size: .86rem !important;
      font-weight: 950 !important;
    }

    #${CARD_ID} .xcf-approved-page-hero {
      display: grid !important;
      align-content: center !important;
      gap: 6px !important;
      min-height: 105px !important;
      padding: 14px !important;
      border-radius: 22px !important;
      background: rgba(255, 255, 255, .12) !important;
      border: 1px solid rgba(255, 255, 255, .14) !important;
    }

    #${CARD_ID} .xcf-approved-page-hero b {
      display: block !important;
      color: #fff !important;
      font-size: clamp(2rem, 3vw, 3rem) !important;
      line-height: .92 !important;
      font-weight: 950 !important;
      letter-spacing: -.07em !important;
    }

    #${CARD_ID} .xcf-approved-page-hero small,
    #${CARD_ID} .xcf-been-approved-copy {
      display: block !important;
      color: #dcfce7 !important;
      font-size: .82rem !important;
      line-height: 1.35 !important;
      font-weight: 850 !important;
      margin: 0 !important;
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
      .xcf-shell { padding-bottom: 140px !important; }
      .xcf-hero { min-height: 150px !important; }
      .xcf-metric { min-height: 110px !important; }
      .xcf-card, #${CARD_ID} { min-height: 238px !important; }
      .xcf-action-hub-card { min-height: 385px !important; }
      .xcf-action-box { min-height: 118px !important; }
      .xcf-live-card { min-height: 420px !important; }
      .xcf-map-card { min-height: 220px !important; }
    }

    @media (max-width: 1220px) {
      .xcf-main-grid {
        grid-template-columns: 1fr !important;
      }
      .xcf-card,
      #${CARD_ID} {
        min-height: 240px !important;
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
