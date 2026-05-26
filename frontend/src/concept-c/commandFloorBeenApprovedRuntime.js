// CHURVOX_COMMAND_FLOOR_BEEN_APPROVED_CLEAN_CARD_20260527
// CHURVOX_COMMAND_FLOOR_WORK_SLIP_FINAL_POLISH_20260527
// Small page-card enhancer plus final Work Slip visual polish. No backend/action wiring touched.

const CARD_ID = "churvox-been-approved-page-card";
const STYLE_ID = "churvox-been-approved-page-card-style";
const WORK_SLIP_STYLE_ID = "churvox-work-slip-final-polish-style";

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

function installWorkSlipPolishStyle() {
  if (document.getElementById(WORK_SLIP_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = WORK_SLIP_STYLE_ID;
  style.textContent = `
    /* Final Command Floor Work Slip polish for testing */
    body:has(.xcf-drawer) {
      overflow: hidden !important;
    }

    .xcf-drawer {
      inset: 10px !important;
      max-height: calc(100vh - 20px) !important;
      overflow: auto !important;
      grid-template-columns: minmax(250px, 310px) minmax(0, 1fr) !important;
      grid-template-rows: auto auto auto minmax(230px, auto) auto auto auto minmax(96px, auto) auto auto auto !important;
      gap: 12px 16px !important;
      padding: 18px !important;
      border-radius: 30px !important;
      background:
        radial-gradient(circle at 10% 0%, rgba(37, 99, 235, .13), transparent 30%),
        linear-gradient(135deg, #f8fbff 0%, #edf4fb 54%, #f8fafc 100%) !important;
      border: 1px solid rgba(15, 23, 42, .14) !important;
      box-shadow: 0 34px 100px rgba(2, 6, 23, .42), inset 0 1px 0 rgba(255, 255, 255, .9) !important;
    }

    .xcf-drawer::-webkit-scrollbar { width: 10px !important; }
    .xcf-drawer::-webkit-scrollbar-thumb { background: rgba(15,23,42,.22) !important; border-radius: 999px !important; }

    .xcf-close {
      position: sticky !important;
      top: 0 !important;
      justify-self: end !important;
      z-index: 30 !important;
      min-width: 96px !important;
      height: 42px !important;
      box-shadow: 0 14px 34px rgba(2, 6, 23, .22) !important;
    }

    .xcf-drawer > p,
    .xcf-drawer > h2,
    .xcf-drawer > span {
      padding-right: 112px !important;
    }

    .xcf-drawer > h2 {
      font-size: clamp(1.7rem, 3.1vw, 3rem) !important;
      line-height: .98 !important;
      letter-spacing: -.06em !important;
      max-width: 1180px !important;
    }

    .xcf-drawer > span {
      max-width: 980px !important;
      color: #475569 !important;
      font-size: .95rem !important;
      line-height: 1.35 !important;
      font-weight: 820 !important;
    }

    .xcf-drawer dl {
      grid-column: 1 !important;
      grid-row: 4 / 9 !important;
      display: grid !important;
      grid-template-rows: auto repeat(3, minmax(78px, auto)) 1fr !important;
      gap: 10px !important;
      margin: 0 !important;
    }

    .xcf-drawer dl div {
      min-height: 78px !important;
      padding: 15px !important;
      border-radius: 20px !important;
      background: rgba(255,255,255,.96) !important;
      border: 1px solid rgba(15,23,42,.08) !important;
      box-shadow: 0 12px 26px rgba(15,23,42,.055) !important;
    }

    .xcf-drawer dl:after {
      min-height: 120px !important;
      align-items: flex-end !important;
      color: #334155 !important;
      background: linear-gradient(135deg, rgba(255,255,255,.92), rgba(239,246,255,.8)) !important;
      border-color: rgba(37,99,235,.16) !important;
    }

    .xcf-approval-brief {
      min-height: 260px !important;
      padding: 18px !important;
      border-radius: 26px !important;
      background: linear-gradient(135deg, rgba(8,13,27,.98), rgba(13,35,61,.97)) !important;
      box-shadow: 0 22px 54px rgba(2, 6, 23, .22) !important;
    }

    .xcf-approval-brief header b {
      font-size: 1.22rem !important;
      text-align: right !important;
    }

    .xcf-approval-brief p {
      max-height: 185px !important;
      min-height: 118px !important;
      font-size: .92rem !important;
      line-height: 1.58 !important;
      padding: 14px !important;
      border-radius: 18px !important;
    }

    .xcf-approval-brief div {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 9px !important;
    }

    .xcf-approval-brief span b {
      white-space: normal !important;
      overflow: visible !important;
      text-overflow: clip !important;
      line-height: 1.25 !important;
    }

    .xcf-photo-evidence,
    .xcf-message-draft,
    .xcf-worker-assign {
      border-radius: 22px !important;
      padding: 14px !important;
      box-shadow: 0 12px 30px rgba(15,23,42,.06) !important;
    }

    .xcf-message-draft textarea {
      min-height: 118px !important;
      font-size: .9rem !important;
      line-height: 1.45 !important;
      border-radius: 18px !important;
    }

    .xcf-worker-assign select {
      min-height: 48px !important;
      border-radius: 18px !important;
    }

    .xcf-edit-field input,
    .xcf-edit-field textarea {
      border-radius: 18px !important;
      font-size: .9rem !important;
      line-height: 1.42 !important;
    }

    .xcf-edit-field textarea {
      min-height: 116px !important;
    }

    .xcf-photo-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      max-height: 170px !important;
    }

    .xcf-photo-preview img {
      max-height: 220px !important;
    }

    .xcf-drawer-actions {
      position: sticky !important;
      bottom: 0 !important;
      z-index: 25 !important;
      display: flex !important;
      align-items: center !important;
      flex-wrap: wrap !important;
      gap: 10px !important;
      padding: 12px !important;
      border-radius: 24px !important;
      background: rgba(255,255,255,.96) !important;
      border: 1px solid rgba(15,23,42,.09) !important;
      box-shadow: 0 -8px 30px rgba(15,23,42,.10), 0 14px 34px rgba(15,23,42,.08) !important;
    }

    .xcf-drawer-actions button,
    .xcf-drawer-actions a {
      min-height: 46px !important;
      padding: 0 17px !important;
      border-radius: 999px !important;
      font-size: .82rem !important;
      font-weight: 950 !important;
      white-space: nowrap !important;
    }

    .xcf-drawer-actions .xcf-action-primary,
    .xcf-drawer-actions button:nth-child(2) {
      background: #16a34a !important;
      color: #fff !important;
      box-shadow: 0 14px 34px rgba(22,163,74,.22) !important;
    }

    .xcf-drawer-actions .xcf-action-muted,
    .xcf-drawer-actions button:first-child {
      background: #0f172a !important;
      color: #fff !important;
    }

    .xcf-drawer-actions .xcf-action-danger {
      background: #ef4444 !important;
      color: #fff !important;
    }

    .xcf-drawer-actions a {
      margin-left: auto !important;
      background: rgba(15,23,42,.08) !important;
      color: #0f172a !important;
      box-shadow: none !important;
    }

    .xcf-drawer-notice {
      position: sticky !important;
      bottom: 76px !important;
      z-index: 24 !important;
      background: linear-gradient(135deg, #dcfce7, #bbf7d0) !important;
      border: 1px solid rgba(22,163,74,.24) !important;
      color: #052e16 !important;
    }

    @media (max-height: 820px) and (min-width: 981px) {
      .xcf-drawer {
        inset: 8px !important;
        max-height: calc(100vh - 16px) !important;
        grid-template-columns: minmax(230px, 285px) minmax(0, 1fr) !important;
        gap: 9px 12px !important;
        padding: 14px !important;
      }
      .xcf-drawer > h2 { font-size: clamp(1.35rem, 2.4vw, 2.25rem) !important; }
      .xcf-approval-brief { min-height: 220px !important; padding: 14px !important; }
      .xcf-approval-brief p { max-height: 132px !important; min-height: 96px !important; font-size: .84rem !important; }
      .xcf-message-draft textarea { min-height: 82px !important; }
      .xcf-edit-field textarea { min-height: 82px !important; }
      .xcf-photo-grid { max-height: 130px !important; }
      .xcf-photo-preview img { max-height: 155px !important; }
      .xcf-drawer-actions button,
      .xcf-drawer-actions a { min-height: 40px !important; padding: 0 13px !important; }
    }

    @media (max-width: 980px) {
      .xcf-drawer {
        inset: 8px !important;
        display: grid !important;
        grid-template-columns: 1fr !important;
        grid-template-rows: auto !important;
        overflow: auto !important;
        padding: 16px !important;
        border-radius: 26px !important;
      }
      .xcf-close { justify-self: start !important; }
      .xcf-drawer > p,
      .xcf-drawer > h2,
      .xcf-drawer > span { padding-right: 0 !important; }
      .xcf-drawer dl,
      .xcf-approval-brief,
      .xcf-photo-evidence,
      .xcf-message-draft,
      .xcf-worker-assign,
      .xcf-drawer-record .xcf-edit-field:nth-of-type(1),
      .xcf-drawer-record .xcf-edit-field:nth-of-type(2),
      .xcf-drawer-record .xcf-edit-field:nth-of-type(3),
      .xcf-drawer-actions,
      .xcf-drawer-notice {
        grid-column: 1 !important;
        grid-row: auto !important;
        width: 100% !important;
      }
      .xcf-approval-brief div { grid-template-columns: 1fr 1fr !important; }
      .xcf-approval-brief p { max-height: 240px !important; }
      .xcf-photo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; max-height: 260px !important; }
      .xcf-drawer-actions a { margin-left: 0 !important; }
    }
  `;
  document.head.appendChild(style);
}

function ensureBeenApprovedCard() {
  const grid = document.querySelector(".xcf-main-grid");
  if (!grid) return;

  installCardStyle();
  installWorkSlipPolishStyle();

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