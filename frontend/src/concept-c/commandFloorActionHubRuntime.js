// CHURVOX_COMMAND_FLOOR_ACTION_HUB_RUNTIME_V2_20260526
// Presentation-only helper: creates real separate action boxes inside the existing Take Action card.
// No API calls, no backend changes, no auth/routes/data wiring changes.

const HUB_ID = "cv-action-hub";
const ROOT_SELECTOR = "main.cc-app .cc-actions";

function getText(el) {
  return (el && el.textContent ? el.textContent : "").trim();
}

function getStatValue(label) {
  const wanted = String(label || "").toLowerCase();
  const cards = Array.from(document.querySelectorAll("main.cc-app .cc-stat"));
  const card = cards.find((node) => getText(node.querySelector("span")).toLowerCase() === wanted);
  return getText(card && card.querySelector("b")) || "0";
}

function getPanelValue(selector) {
  return getText(document.querySelector(selector + " header strong")) || "0";
}

function makeEl(tag, className, textValue) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textValue !== undefined) el.textContent = textValue;
  return el;
}

function makeBox({ title, value, note, href, tone }) {
  const a = makeEl("a", "cv-action-hub-box " + tone);
  a.href = href;
  a.setAttribute("aria-label", title + " actions");
  a.appendChild(makeEl("span", "", title));
  a.appendChild(makeEl("b", "", value));
  a.appendChild(makeEl("small", "", note));
  return a;
}

function renderHub() {
  const panel = document.querySelector(ROOT_SELECTOR);
  if (!panel) return false;

  const body = panel.querySelector(".cc-action-list") || panel;
  let hub = panel.querySelector("#" + HUB_ID);
  if (!hub) {
    hub = makeEl("section", "cv-action-hub");
    hub.id = HUB_ID;
    body.prepend(hub);
  }

  const readyToBill = getStatValue("Ready To Bill");
  const unassigned = getStatValue("Unassigned Jobs");
  const review = getStatValue("Work Review");
  const follow = getStatValue("Take Action");
  const fix = getPanelValue(".cc-risks") || "0";

  hub.replaceChildren();

  const head = makeEl("div", "cv-action-hub-head");
  const eyebrow = makeEl("span", "", "Take Action");
  const title = makeEl("strong", "", "Pick what type of work needs doing");
  head.appendChild(eyebrow);
  head.appendChild(title);
  hub.appendChild(head);

  const grid = makeEl("div", "cv-action-hub-grid");
  [
    { title: "Invoices", value: readyToBill, note: "ready to prepare", href: "/invoices", tone: "blue" },
    { title: "Assign Worker", value: unassigned, note: "jobs need crew", href: "/dispatch", tone: "green" },
    { title: "Review Work", value: review, note: "finished jobs", href: "/jobs", tone: "purple" },
    { title: "Customer Follow-up", value: follow, note: "messages & reminders", href: "/ai-operator/approvals", tone: "amber" },
    { title: "Fix Issues", value: fix, note: "risks & missing info", href: "/notifications", tone: "red" },
  ].forEach((item) => grid.appendChild(makeBox(item)));

  hub.appendChild(grid);
  panel.classList.add("cv-action-hub-ready");
  return true;
}

function bootActionHub() {
  try {
    renderHub();
  } catch (err) {
    console.warn("Churvox Action Hub polish skipped:", err);
  }
}

if (typeof window !== "undefined") {
  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      bootActionHub();
    });
  };

  window.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("load", schedule);
  window.addEventListener("popstate", schedule);

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  [0, 250, 700, 1400, 2600, 5000].forEach((ms) => setTimeout(schedule, ms));
}
