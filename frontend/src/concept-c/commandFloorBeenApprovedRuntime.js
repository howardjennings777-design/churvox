// CHURVOX_COMMAND_FLOOR_BEEN_APPROVED_CLEAN_CARD_20260527
// Small page-card enhancer only. Scroll/layout now lives in real CSS.

const CARD_ID = "churvox-been-approved-page-card";
const STYLE_ID = "churvox-been-approved-page-card-style";

function cleanText(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function readyToBillMetric() {
  return Array.from(document.querySelectorAll("button, .xcf-metric")).find((node) => /Ready to Bill/i.test(cleanText(node)));
}

function readReadyToBill(metric) {
  const amount = metric?.querySelector("b")?.textContent?.trim() || "$0";
  const note = metric?.querySelector("small")?.textContent?.trim() || "0 approved jobs";
  const count = Number((note.match(/\d+/) || ["0"])[0]);
  return { amount, note, count };
}

function makeLine(tag, text, className = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function installCardStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${CARD_ID} {
      min-height: 255px !important;
      display: grid !important;
      grid-template-rows: auto minmax(118px, auto) auto !important;
      align-content: stretch !important;
      gap: 14px !important;
      padding: 18px !important;
      border-radius: 30px !important;
      border: 1px solid rgba(22, 163, 74, .36) !important;
      color: #ecfdf5 !important;
      background:
        radial-gradient(circle at 14% 12%, rgba(187, 247, 208, .24), transparent 28%),
        linear-gradient(135deg, #052e16 0%, #166534 58%, #22c55e 100%) !important;
      box-shadow: 0 24px 60px rgba(22, 163, 74, .24), inset 0 1px 0 rgba(255, 255, 255, .18) !important;
      text-align: left !important;
      cursor: pointer !important;
      overflow: hidden !important;
    }

    #${CARD_ID}:hover {
      transform: translateY(-1px) !important;
      box-shadow: 0 30px 70px rgba(22, 163, 74, .30), inset 0 1px 0 rgba(255, 255, 255, .18) !important;
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
    #${CARD_ID} .xcf-been-approved-eyebrow {
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
      margin-top: 5px !important;
      color: #fff !important;
      font-size: 1.22rem !important;
      line-height: 1 !important;
      font-weight: 950 !important;
      letter-spacing: -.04em !important;
    }

    #${CARD_ID} header strong {
      min-width: 44px !important;
      height: 36px !important;
      display: grid !important;
      place-items: center !important;
      border-radius: 999px !important;
      color: #fff !important;
      background: rgba(255, 255, 255, .16) !important;
      border: 1px solid rgba(255, 255, 255, .18) !important;
      font-size: .9rem !important;
      font-weight: 950 !important;
    }

    #${CARD_ID} .xcf-been-approved-panel {
      display: grid !important;
      align-content: center !important;
      gap: 7px !important;
      min-height: 118px !important;
      padding: 16px !important;
      border-radius: 24px !important;
      background: rgba(255, 255, 255, .13) !important;
      border: 1px solid rgba(255, 255, 255, .16) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.12) !important;
    }

    #${CARD_ID} .xcf-been-approved-amount {
      display: block !important;
      color: #fff !important;
      font-size: clamp(2.1rem, 3.3vw, 3.25rem) !important;
      line-height: .9 !important;
      font-weight: 950 !important;
      letter-spacing: -.075em !important;
    }

    #${CARD_ID} .xcf-been-approved-note,
    #${CARD_ID} .xcf-been-approved-copy {
      display: block !important;
      color: #dcfce7 !important;
      font-size: .83rem !important;
      line-height: 1.35 !important;
      font-weight: 850 !important;
      margin: 0 !important;
    }

    #${CARD_ID} .xcf-been-approved-copy {
      padding-top: 2px !important;
    }

    @media (max-width: 1220px) {
      #${CARD_ID} { min-height: 240px !important; }
    }
  `;
  document.head.appendChild(style);
}

function ensureBeenApprovedCard() {
  const grid = document.querySelector(".xcf-main-grid");
  if (!grid) return;

  installCardStyle();

  const metric = readyToBillMetric();
  const data = readReadyToBill(metric);
  let card = document.getElementById(CARD_ID);

  if (!card) {
    card = document.createElement("button");
    card.id = CARD_ID;
    card.type = "button";
    card.className = "xcf-card xcf-been-approved-card";
    card.setAttribute("aria-label", "Open Been Approved work");
    card.addEventListener("click", () => {
      const ready = readyToBillMetric();
      if (ready) ready.click();
    });

    const header = document.createElement("header");
    const titleWrap = document.createElement("span");
    titleWrap.appendChild(makeLine("small", "Signed-off work ready for admin"));
    titleWrap.appendChild(makeLine("b", "Been Approved"));
    const count = makeLine("strong", "0", "xcf-been-approved-count");
    header.appendChild(titleWrap);
    header.appendChild(count);

    const panel = document.createElement("div");
    panel.className = "xcf-been-approved-panel";
    panel.appendChild(makeLine("span", "Approved work", "xcf-been-approved-eyebrow"));
    panel.appendChild(makeLine("b", data.amount, "xcf-been-approved-amount"));
    panel.appendChild(makeLine("small", data.note, "xcf-been-approved-note"));

    const copy = makeLine("p", "Open signed-off jobs and prepare the next admin step without leaving Command Floor.", "xcf-been-approved-copy");

    card.appendChild(header);
    card.appendChild(panel);
    card.appendChild(copy);
    grid.appendChild(card);
  }

  const amount = card.querySelector(".xcf-been-approved-amount");
  const note = card.querySelector(".xcf-been-approved-note");
  const count = card.querySelector(".xcf-been-approved-count");
  if (amount) amount.textContent = data.amount;
  if (note) note.textContent = data.note;
  if (count) count.textContent = String(data.count || 0);
}

function start() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  let raf = 0;
  const run = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      ensureBeenApprovedCard();
    });
  };
  run();
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  [300, 900, 1800, 3500].forEach((ms) => window.setTimeout(run, ms));
}

start();
