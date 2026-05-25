// CHURVOX_COMMAND_FLOOR_ACTION_HUB_RUNTIME_20260526
// Presentation-only helper: groups existing dashboard actions into clear owner sections.
// No API calls, no backend changes, no auth/routes/data wiring changes.

const HUB_ID = "cv-action-hub";

function getText(el) {
  return (el && el.textContent ? el.textContent : "").trim();
}

function getStatValue(label) {
  const cards = Array.from(document.querySelectorAll("main.cc-app .cc-stat"));
  const wanted = String(label || "").toLowerCase();
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

function renderHub() {
  const list = document.querySelector("main.cc-app .cc-actions .cc-action-list");
  if (!list) return;

  let hub = document.getElementById(HUB_ID);
  if (!hub) {
    hub = makeEl("section", "cv-action-hub");
    hub.id = HUB_ID;
    list.prepend(hub);
  }

  hub.replaceChildren();

  const head = makeEl("div", "cv-action-hub-head");
  head.appendChild(makeEl("span", "", "Action Hub"));
  head.appendChild(makeEl("strong", "", "Choose the job type first"));
  hub.appendChild(head);

  const grid = makeEl("div", "cv-action-hub-grid");
  const sections = [
    ["Invoices", getStatValue("Ready To Bill"), "prepare and send", "/invoices", "blue"],
    ["Assign", getStatValue("Unassigned Jobs"), "jobs need crew", "/dispatch", "green"],
    ["Review", getStatValue("Work Review"), "finished work", "/jobs", "lime"],
    ["Follow up", getStatValue("Take Action"), "customers and admin", "/ai-operator/approvals", "red"],
    ["Fix", getPanelValue(".cc-risks"), "risks and missing info", "/notifications", "amber"],
  ];

  sections.forEach(([title, value, note, href, tone]) => {
    const card = makeEl("a", "cv-action-hub-card " + tone);
    card.setAttribute("href", href);
    card.appendChild(makeEl("span", "", title));
    card.appendChild(makeEl("b", "", value));
    card.appendChild(makeEl("small", "", note));
    grid.appendChild(card);
  });

  hub.appendChild(grid);
}

function bootActionHub() {
  try {
    renderHub();
  } catch (err) {
    console.warn("Churvox Action Hub polish skipped:", err);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", bootActionHub);
  window.addEventListener("load", bootActionHub);
  window.addEventListener("popstate", bootActionHub);
  setTimeout(bootActionHub, 0);
  setTimeout(bootActionHub, 450);
  setTimeout(bootActionHub, 1200);
  setTimeout(bootActionHub, 2400);
}
