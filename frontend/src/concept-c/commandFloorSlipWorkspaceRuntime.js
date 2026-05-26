// CHURVOX_WORK_SLIP_WORKSPACE_RUNTIME_20260527
// Rebuilds the existing Command Floor Work Slip DOM into a clearer approval workspace.
// Keeps existing React button handlers by moving DOM nodes instead of cloning them.

const MARKER = "data-cfa-workspace-ready";
const STYLE_ID = "churvox-work-slip-workspace-style";

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
html:has(.cfa-runtime-slip),body:has(.cfa-runtime-slip),#root:has(.cfa-runtime-slip){height:100%!important;overflow:hidden!important}
.cfa-runtime-slip,.cfa-runtime-slip *{box-sizing:border-box!important}
.cfa-runtime-slip{position:fixed!important;inset:0!important;z-index:99999!important;width:100vw!important;height:100dvh!important;max-height:100dvh!important;overflow-y:auto!important;overflow-x:hidden!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto auto auto auto auto!important;grid-template-areas:"header" "left" "main" "right" "notice"!important;gap:7px!important;align-items:start!important;padding:7px 8px 78px!important;background:#eef4fb!important;color:#07111f!important}
.cfa-runtime-slip>*{position:relative!important;z-index:1!important;min-width:0!important}.cfa-runtime-header{grid-area:header!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:10px!important;align-items:center!important;padding:10px 12px!important;border-radius:18px!important;background:linear-gradient(135deg,#fff,#eff6ff)!important;border:1px solid rgba(37,99,235,.14)!important;box-shadow:0 10px 24px rgba(15,23,42,.07)!important}.cfa-runtime-header p{margin:0 0 3px!important;color:#2563eb!important;font-size:.54rem!important;font-weight:950!important;letter-spacing:.12em!important;text-transform:uppercase!important}.cfa-runtime-header h2{margin:0!important;color:#07111f!important;font-size:clamp(1.65rem,3.4vw,3.05rem)!important;line-height:.9!important;letter-spacing:-.07em!important}.cfa-runtime-header span{display:block!important;margin-top:4px!important;color:#475569!important;font-size:.78rem!important;line-height:1.2!important;font-weight:820!important}.cfa-runtime-header .xcf-close{position:relative!important;top:auto!important;right:auto!important;min-width:72px!important;height:32px!important;border:0!important;border-radius:999px!important;color:#fff!important;background:#07111f!important;font-size:.72rem!important;font-weight:950!important}
.cfa-runtime-left{grid-area:left!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(160px,220px)!important;gap:7px!important;position:static!important;min-width:0!important}.cfa-runtime-main{grid-area:main!important;display:grid!important;grid-template-columns:minmax(0,1.3fr) minmax(210px,.7fr)!important;grid-auto-rows:max-content!important;gap:7px!important;min-width:0!important}.cfa-runtime-right{grid-area:right!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important;position:static!important;min-width:0!important}
.cfa-runtime-card,.cfa-runtime-slip dl,.cfa-runtime-slip .xcf-approval-brief,.cfa-runtime-slip .xcf-message-draft,.cfa-runtime-slip .xcf-worker-assign,.cfa-runtime-slip .xcf-photo-evidence,.cfa-runtime-slip .xcf-edit-field,.cfa-runtime-slip .xcf-group-summary,.cfa-runtime-slip .xcf-slip-list{border-radius:13px!important;background:#fff!important;border:1px solid rgba(15,23,42,.08)!important;box-shadow:0 6px 16px rgba(15,23,42,.045)!important;padding:8px!important;min-width:0!important}.cfa-runtime-card{display:grid!important;gap:4px!important}.cfa-runtime-card small,.cfa-runtime-slip dt,.cfa-runtime-slip small{color:#2563eb!important;font-size:.5rem!important;font-weight:950!important;letter-spacing:.09em!important;text-transform:uppercase!important}.cfa-runtime-card strong,.cfa-runtime-card b,.cfa-runtime-slip dd,.cfa-runtime-slip b{margin:0!important;color:#07111f!important;font-size:.76rem!important;font-weight:950!important;line-height:1.1!important}.cfa-runtime-card p,.cfa-runtime-slip p{margin:0!important;color:#475569!important;line-height:1.2!important;font-size:.66rem!important;font-weight:760!important}
.cfa-runtime-slip dl{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px!important;margin:0!important}.cfa-runtime-slip dl:before{content:"Quick facts";grid-column:1/-1;color:#2563eb;font-size:.5rem;font-weight:950;letter-spacing:.09em;text-transform:uppercase}.cfa-runtime-slip dl div{min-height:38px!important;display:grid!important;align-content:center!important;gap:1px!important;padding:6px!important;border-radius:10px!important;background:#f8fafc!important;border:1px solid rgba(15,23,42,.065)!important}.cfa-runtime-left .cfa-runtime-info:last-child{background:linear-gradient(135deg,#07111f,#14315b)!important}.cfa-runtime-left .cfa-runtime-info:last-child small,.cfa-runtime-left .cfa-runtime-info:last-child strong,.cfa-runtime-left .cfa-runtime-info:last-child p{color:#fff!important}
.cfa-runtime-slip .xcf-approval-brief{grid-column:1!important;grid-row:1!important;min-height:145px!important;border-left:4px solid #2563eb!important;overflow:hidden!important}.cfa-runtime-slip .xcf-photo-evidence{grid-column:2!important;grid-row:1!important;min-height:145px!important}.cfa-runtime-slip .cfa-runtime-edit{grid-column:1/3!important;grid-row:2!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important}.cfa-runtime-slip .cfa-runtime-edit header{grid-column:1/-1!important}.cfa-runtime-slip .cfa-runtime-edit .xcf-edit-field:nth-of-type(2){grid-column:1/3!important}.cfa-runtime-slip .xcf-approval-brief header{margin-bottom:4px!important}.cfa-runtime-slip .xcf-approval-brief p{white-space:pre-line!important;color:#334155!important;font-size:.72rem!important;line-height:1.25!important;font-weight:800!important}.cfa-runtime-slip .xcf-approval-brief div{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:4px!important}.cfa-runtime-slip .xcf-approval-brief div span{min-height:38px!important;display:grid!important;align-content:center!important;gap:1px!important;padding:5px!important;border-radius:9px!important;background:#f8fafc!important;border:1px solid rgba(15,23,42,.065)!important}.cfa-runtime-slip .xcf-approval-brief strong{display:block!important;margin-top:5px!important;padding:6px 8px!important;border-radius:10px!important;background:#eef6ff!important;color:#0f172a!important;font-size:.66rem!important}
.cfa-runtime-slip textarea,.cfa-runtime-slip input,.cfa-runtime-slip select{width:100%!important;border-radius:9px!important;border:1px solid rgba(15,23,42,.12)!important;background:#fff!important;padding:6px 7px!important;box-shadow:none!important;font-size:.7rem!important}.cfa-runtime-slip textarea{min-height:64px!important;resize:vertical!important;line-height:1.25!important}.cfa-runtime-slip .xcf-message-draft textarea,.cfa-runtime-slip .xcf-edit-field textarea{min-height:64px!important}.cfa-runtime-slip .xcf-message-draft header,.cfa-runtime-slip .xcf-worker-assign header,.cfa-runtime-slip .xcf-photo-evidence header{margin-bottom:4px!important}.cfa-runtime-slip .xcf-message-draft,.cfa-runtime-slip .xcf-worker-assign,.cfa-runtime-right>.cfa-runtime-card{min-height:86px!important}.cfa-runtime-slip .xcf-photo-evidence img{max-height:115px!important;object-fit:cover!important}
.cfa-runtime-slip .xcf-slip-list{display:grid!important;gap:5px!important}.cfa-runtime-slip .xcf-slip-row{min-height:46px!important;display:grid!important;grid-template-columns:1fr auto!important;gap:7px!important;align-items:center!important;border:1px solid rgba(15,23,42,.075)!important;border-radius:11px!important;padding:7px 8px!important;background:#fff!important;text-align:left!important}.cfa-runtime-slip .xcf-slip-row b{display:block!important;color:#07111f!important;font-size:.72rem!important}.cfa-runtime-slip .xcf-slip-row small{display:block!important;color:#64748b!important;font-size:.62rem!important;line-height:1.15!important}.cfa-runtime-slip .xcf-slip-row em{color:#2563eb!important;font-style:normal!important;font-size:.66rem!important;font-weight:950!important;white-space:nowrap!important}
.cfa-runtime-actions{position:fixed!important;left:8px!important;right:8px!important;bottom:max(6px,env(safe-area-inset-bottom))!important;z-index:30!important}.cfa-runtime-actions .xcf-drawer-actions{width:100%!important;display:flex!important;flex-wrap:wrap!important;justify-content:flex-end!important;gap:6px!important;margin:0!important;padding:6px!important;border-radius:15px!important;background:rgba(255,255,255,.96)!important;border:1px solid rgba(15,23,42,.08)!important;box-shadow:0 -8px 22px rgba(15,23,42,.11)!important}.cfa-runtime-actions button,.cfa-runtime-actions a{min-height:30px!important;border-radius:999px!important;padding:0 9px!important;font-size:.66rem!important;font-weight:950!important}.cfa-runtime-slip .xcf-action-primary{color:#fff!important;background:#2563eb!important}.cfa-runtime-slip .xcf-action-danger{color:#fff!important;background:#dc2626!important}.cfa-runtime-slip .xcf-drawer-notice{grid-area:notice!important;padding:7px 8px!important;border-radius:11px!important;background:rgba(22,163,74,.10)!important;color:#166534!important;font-size:.7rem!important;font-weight:900!important}
@media(max-width:900px){.cfa-runtime-slip{height:100svh!important;padding:8px 7px 88px!important}.cfa-runtime-left,.cfa-runtime-main,.cfa-runtime-right{grid-template-columns:1fr!important}.cfa-runtime-slip .xcf-approval-brief,.cfa-runtime-slip .xcf-photo-evidence,.cfa-runtime-slip .cfa-runtime-edit{grid-column:1!important;grid-row:auto!important}.cfa-runtime-slip .cfa-runtime-edit{display:grid!important;grid-template-columns:1fr!important}.cfa-runtime-slip .cfa-runtime-edit .xcf-edit-field:nth-of-type(2){grid-column:1!important}.cfa-runtime-slip .xcf-approval-brief div{grid-template-columns:1fr!important}.cfa-runtime-actions .xcf-drawer-actions{justify-content:stretch!important}.cfa-runtime-actions button,.cfa-runtime-actions a{flex:1 1 auto!important}}`;
  document.head.appendChild(style);
}

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
  injectStyle();
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
  injectStyle();
  document.querySelectorAll(".xcf-drawer").forEach(rebuild);
}

if (typeof window !== "undefined") {
  window.__CHURVOX_WORK_SLIP_WORKSPACE_RUNTIME__ = "CHURVOX_WORK_SLIP_WORKSPACE_RUNTIME_20260527_SINGLE_SHEET";
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", scan);
  window.addEventListener("click", () => setTimeout(scan, 0), true);
  setInterval(scan, 700);
}
