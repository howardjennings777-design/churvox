// CHURVOX_WORK_SLIP_WORKSPACE_RUNTIME_20260527
// Rebuilds the existing Command Floor Work Slip DOM into a clearer approval workspace.
// Keeps existing React button handlers by moving DOM nodes instead of cloning them.

const MARKER = "data-cfa-workspace-ready";

function take(drawer, selector) {
  const node = drawer.querySelector(selector);
  if (node && node.parentElement) node.parentElement.removeChild(node);
  return node;
}

function takeAll(drawer, selector) {
  return Array.from(drawer.querySelectorAll(selector)).map((node) => {
    if (node.parentElement) node.parentElement.removeChild(node);
    return node;
  });
}

function make(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function append(parent, ...nodes) {
  nodes.filter(Boolean).forEach((node) => parent.appendChild(node));
}

function labelCard(label, text) {
  const card = make("section", "cfa-runtime-card cfa-runtime-info");
  const small = make("small");
  small.textContent = label;
  const strong = make("strong");
  strong.textContent = text || "Review before approving";
  append(card, small, strong);
  return card;
}

function rebuild(drawer) {
  if (!drawer || drawer.getAttribute(MARKER) === "yes") return;
  drawer.setAttribute(MARKER, "yes");
  drawer.classList.add("cfa-runtime-slip");

  const close = take(drawer, ".xcf-close");
  const eyebrow = take(drawer, ":scope > p");
  const title = take(drawer, ":scope > h2");
  const summary = take(drawer, ":scope > span");
  const facts = take(drawer, ":scope > dl");
  const groupSummary = take(drawer, ":scope > .xcf-group-summary");
  const list = take(drawer, ":scope > .xcf-slip-list");
  const brief = take(drawer, ":scope > .xcf-approval-brief");
  const photos = take(drawer, ":scope > .xcf-photo-evidence");
  const message = take(drawer, ":scope > .xcf-message-draft");
  const worker = take(drawer, ":scope > .xcf-worker-assign");
  const actions = take(drawer, ":scope > .xcf-drawer-actions");
  const notice = take(drawer, ":scope > .xcf-drawer-notice");
  const editFields = takeAll(drawer, ":scope > .xcf-edit-field");

  const header = make("header", "cfa-runtime-header");
  const headerText = make("div", "cfa-runtime-header-text");
  append(headerText, eyebrow, title, summary);
  append(header, headerText, close);

  const left = make("aside", "cfa-runtime-left");
  const main = make("main", "cfa-runtime-main");
  const right = make("aside", "cfa-runtime-right");
  const footer = make("footer", "cfa-runtime-actions");

  if (groupSummary || list) {
    drawer.classList.add("cfa-runtime-group");
    append(left, groupSummary || labelCard("Lane", "Open a waiting item to review the detail"));
    append(main, list || labelCard("Waiting items", "Nothing waiting in this lane"));
    append(right, labelCard("How to use this lane", "Open one row, review the Work Slip, then approve, assign, invoice or save the draft."));
  } else {
    append(left, facts || labelCard("Quick facts", "No facts found"), labelCard("Owner check", "Check the details before approving."));
    append(main, brief || labelCard("What you are approving", "No approval brief found"), photos || labelCard("Evidence", "No photos saved"));

    const editPanel = make("section", "cfa-runtime-card cfa-runtime-edit");
    const editHead = make("header");
    const small = make("small");
    small.textContent = "Editable details";
    const bold = make("b");
    bold.textContent = "Adjust before saving";
    append(editHead, small, bold);
    append(editPanel, editHead, ...editFields);
    append(main, editPanel);

    append(right, message || labelCard("Message draft", "No message draft found"), worker || labelCard("Worker assignment", "No worker decision needed"), labelCard("Next step", "Use the approval buttons below. Nothing sends without owner action."));
  }

  append(footer, actions);
  drawer.textContent = "";
  append(drawer, header, left, main, right, notice, footer);
}

function scan() {
  document.querySelectorAll(".xcf-drawer").forEach(rebuild);
}

if (typeof window !== "undefined") {
  window.__CHURVOX_WORK_SLIP_WORKSPACE_RUNTIME__ = "CHURVOX_WORK_SLIP_WORKSPACE_RUNTIME_20260527";
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", scan);
  window.addEventListener("click", () => setTimeout(scan, 0), true);
  setInterval(scan, 700);
}
