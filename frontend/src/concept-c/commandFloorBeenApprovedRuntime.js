// CHURVOX_COMMAND_FLOOR_BEEN_APPROVED_RUNTIME_20260526

const CARD_ID = "churvox-been-approved-page-card";

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
